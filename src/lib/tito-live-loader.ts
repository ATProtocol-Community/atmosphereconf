import type { LiveLoader } from "astro/loaders";
import type { LiveDataCollection, LiveDataEntry } from "astro";

interface TitoAnswer {
  id: number;
  question_id: number;
  ticket_id: number;
  ticket_reference: string;
  ticket_slug: string;
  ticket_email: string;
  ticket_name: string;
  response: string;
  primary_response: string;
  alternate_response: string | null;
  question_title: string;
}

interface TitoTicket {
  slug: string;
  release_title: string;
  [key: string]: unknown;
}

export interface TitoAnswerData {
  ticketReference: string;
  ticketSlug: string;
  ticketEmail: string;
  ticketName: string;
  handle: string;
  releaseTitle: string;
}

interface TitoAnswerLoaderOptions {
  accountSlug: string;
  eventSlug: string;
  questionId: number;
  apiToken: string | undefined;
  cacheTtl?: number;
}

const TITO_API_BASE = "https://api.tito.io/v3";

async function titoFetch<T>(path: string, apiToken: string): Promise<T> {
  const res = await fetch(`${TITO_API_BASE}${path}`, {
    headers: {
      Authorization: `Token token=${apiToken}`,
      Accept: "application/json",
    },
  });
  if (!res.ok) {
    throw new Error(`Tito API error ${res.status}: ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

interface TitoAnswersResponse {
  answers: TitoAnswer[];
  meta: {
    current_page: number;
    next_page: number | null;
    total_pages: number;
    total_count: number;
  };
}

interface TitoTicketsResponse {
  tickets: TitoTicket[];
  meta: {
    current_page: number;
    next_page: number | null;
    total_pages: number;
    total_count: number;
  };
}

function normalizeHandle(raw: string): string {
  return raw.trim().replace(/^@/, "");
}

function answerToEntry(
  answer: TitoAnswer,
  releaseMap: Map<string, string>,
): LiveDataEntry<TitoAnswerData> {
  return {
    id: answer.ticket_slug,
    data: {
      ticketReference: answer.ticket_reference,
      ticketSlug: answer.ticket_slug,
      ticketEmail: answer.ticket_email,
      ticketName: answer.ticket_name,
      handle: normalizeHandle(answer.response),
      releaseTitle: releaseMap.get(answer.ticket_slug) ?? "",
    },
  };
}

async function fetchAllTickets(
  accountSlug: string,
  eventSlug: string,
  apiToken: string,
): Promise<Map<string, string>> {
  const releaseMap = new Map<string, string>();
  let page = 1;

  do {
    const data = await titoFetch<TitoTicketsResponse>(
      `/${accountSlug}/${eventSlug}/tickets?page[number]=${page}&page[size]=100`,
      apiToken,
    );
    for (const ticket of data.tickets) {
      releaseMap.set(ticket.slug, ticket.release_title);
    }
    if (!data.meta.next_page) break;
    page = data.meta.next_page;
  } while (true);

  return releaseMap;
}

async function fetchAllAnswers(
  accountSlug: string,
  eventSlug: string,
  questionId: number,
  apiToken: string,
): Promise<LiveDataEntry<TitoAnswerData>[]> {
  const releaseMap = await fetchAllTickets(accountSlug, eventSlug, apiToken);
  const entries: LiveDataEntry<TitoAnswerData>[] = [];
  let page = 1;

  do {
    const data = await titoFetch<TitoAnswersResponse>(
      `/${accountSlug}/${eventSlug}/questions/${questionId}/answers?page[number]=${page}&page[size]=100`,
      apiToken,
    );
    for (const answer of data.answers) {
      if (answer.response) {
        entries.push(answerToEntry(answer, releaseMap));
      }
    }
    if (!data.meta.next_page) break;
    page = data.meta.next_page;
  } while (true);

  return entries;
}

export function titoAnswerLoader(
  options: TitoAnswerLoaderOptions,
): LiveLoader<TitoAnswerData> {
  const {
    accountSlug,
    eventSlug,
    questionId,
    apiToken,
    cacheTtl = 60_000,
  } = options;

  if (!apiToken) {
    console.warn("[tito-loader] TITO_API_TOKEN not set, skipping answer loading");
    return {
      name: "tito-answer-loader",
      async loadCollection(): Promise<LiveDataCollection<TitoAnswerData>> {
        return { entries: [] };
      },
      async loadEntry() {
        return undefined;
      },
    };
  }

  let cachedEntries: LiveDataEntry<TitoAnswerData>[] = [];
  let cacheTime = 0;
  let refreshing = false;

  const triggerRefresh = async () => {
    if (refreshing) return;
    refreshing = true;
    try {
      cachedEntries = await fetchAllAnswers(accountSlug, eventSlug, questionId, apiToken);
      cacheTime = Date.now();
    } catch (err) {
      console.error("[tito-loader] refresh failed:", err);
    } finally {
      refreshing = false;
    }
  };

  const getEntries = async (): Promise<LiveDataEntry<TitoAnswerData>[]> => {
    if (cacheTime === 0) {
      cachedEntries = await fetchAllAnswers(accountSlug, eventSlug, questionId, apiToken);
      cacheTime = Date.now();
      return cachedEntries;
    }
    if (Date.now() - cacheTime > cacheTtl) {
      triggerRefresh();
    }
    return cachedEntries;
  };

  return {
    name: "tito-answer-loader",

    async loadCollection(): Promise<LiveDataCollection<TitoAnswerData>> {
      return { entries: await getEntries() };
    },

    async loadEntry({ filter: entryFilter }) {
      const id =
        typeof entryFilter === "string"
          ? entryFilter
          : (entryFilter as { id: string }).id;

      const entries = await getEntries();
      return entries.find((e) => e.id === id);
    },
  };
}
