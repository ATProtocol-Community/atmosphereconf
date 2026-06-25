// Convert a tv.ionosphere.talk's records into our TranscriptJson shape.
//
// Inputs (all fetched from the talk's repo PDS):
//   tv.ionosphere.talk/{rkey}                                     — speakerUris[], etc.
//   pub.layers.expression.expression/{rkey}-expression            — raw text
//   pub.layers.segmentation.segmentation/{rkey}-segmentation-{N}  — word byte ranges
//   pub.layers.segmentation.segmentation/{rkey}-temporal-{N}      — word time ranges
//   pub.layers.annotation.annotationLayer/{rkey}-paragraphs       — paragraph byte ranges
//   tv.ionosphere.speaker/{rkey}  (once per speakerUri)            — { name, handle }
//
// Byte ranges and temporal ranges are independent layers stored under the
// same segmentation collection but addressed by different rkey suffixes; we
// join them by a shared `tokenIndex`. Each is sharded across multiple
// records (-1, -2, …) because atproto record values cap around 1 MB and a
// long talk's token list won't fit in one. The shard count isn't known
// upfront, so listRecordsByPrefix discovers them by paging the collection.
//
// Paragraphs are byte ranges over the expression text; we walk the word
// list to find which words fall inside each range and use those words'
// start/end to derive the paragraph's time bounds.

import type {
  TranscriptJson,
  TranscriptParagraph,
  TranscriptWord,
} from "./transcript-json";

interface AtUriParts {
  did: string;
  collection: string;
  rkey: string;
}

function parseAtUri(uri: string): AtUriParts {
  // at://did/{collection}/{rkey}
  const m = uri.match(/^at:\/\/([^/]+)\/([^/]+)\/(.+)$/);
  if (!m) throw new Error(`Invalid AT URI: ${uri}`);
  return { did: m[1], collection: m[2], rkey: m[3] };
}

async function resolvePds(did: string): Promise<string> {
  if (did.startsWith("did:plc:")) {
    const r = await fetch(`https://plc.directory/${did}`);
    if (!r.ok) throw new Error(`PLC lookup failed for ${did}: ${r.status}`);
    const doc = await r.json();
    const svc = (doc.service ?? []).find(
      (s: { id?: string; type?: string }) =>
        s.id === "#atproto_pds" || s.type === "AtprotoPersonalDataServer",
    );
    if (!svc?.serviceEndpoint)
      throw new Error(`No PDS endpoint in DID doc for ${did}`);
    return svc.serviceEndpoint as string;
  }
  if (did.startsWith("did:web:")) {
    const host = did.slice("did:web:".length).replace(/:/g, "/");
    const r = await fetch(`https://${host}/.well-known/did.json`);
    if (!r.ok) throw new Error(`did:web lookup failed for ${did}: ${r.status}`);
    const doc = await r.json();
    const svc = (doc.service ?? []).find(
      (s: { id?: string }) => s.id === "#atproto_pds",
    );
    if (!svc?.serviceEndpoint)
      throw new Error(`No PDS endpoint in DID doc for ${did}`);
    return svc.serviceEndpoint as string;
  }
  throw new Error(`Unsupported DID method: ${did}`);
}

async function getRecord<T = unknown>(
  pds: string,
  did: string,
  collection: string,
  rkey: string,
): Promise<T> {
  const url =
    `${pds}/xrpc/com.atproto.repo.getRecord` +
    `?repo=${encodeURIComponent(did)}` +
    `&collection=${encodeURIComponent(collection)}` +
    `&rkey=${encodeURIComponent(rkey)}`;
  const r = await fetch(url);
  if (!r.ok)
    throw new Error(`getRecord ${collection}/${rkey} → ${r.status} ${r.statusText}`);
  const j = (await r.json()) as { value: T };
  return j.value;
}

// listRecords has no native prefix query, so we page the entire collection
// and filter client-side. Cheap as long as the collection isn't huge —
// each talk only shards into a handful of segmentation/temporal records.
async function listRecordsByPrefix<T = unknown>(
  pds: string,
  did: string,
  collection: string,
  rkeyPrefix: string,
): Promise<Array<{ rkey: string; value: T }>> {
  const results: Array<{ rkey: string; value: T }> = [];
  let cursor: string | undefined;
  do {
    const u = new URL(`${pds}/xrpc/com.atproto.repo.listRecords`);
    u.searchParams.set("repo", did);
    u.searchParams.set("collection", collection);
    u.searchParams.set("limit", "100");
    if (cursor) u.searchParams.set("cursor", cursor);
    const r = await fetch(u.toString());
    if (!r.ok)
      throw new Error(`listRecords ${collection} → ${r.status} ${r.statusText}`);
    const j = (await r.json()) as {
      records: Array<{ uri: string; value: T }>;
      cursor?: string;
    };
    for (const rec of j.records ?? []) {
      const rkey = rec.uri.split("/").pop()!;
      if (rkey.startsWith(rkeyPrefix))
        results.push({ rkey, value: rec.value });
    }
    cursor = j.cursor;
  } while (cursor);
  return results;
}

interface TalkRecord {
  speakerUris?: string[];
  startsAt?: string;
  endsAt?: string;
  title?: string;
}

interface SpeakerRecord {
  name: string;
  handle?: string;
}

interface ExpressionRecord {
  text: string;
}

interface WordToken {
  tokenIndex: number;
  textSpan: { byteStart: number; byteEnd: number };
}

interface TemporalToken {
  tokenIndex: number;
  temporalSpan: { start: number; ending: number };
}

interface SegmentationRecord {
  tokenizations?: Array<{
    kind: string;
    tokens: Array<WordToken | TemporalToken>;
  }>;
}

interface AnnotationLayerRecord {
  annotations?: Array<{
    label: string;
    anchor: { textSpan: { byteStart: number; byteEnd: number } };
  }>;
}

// Trailing chunk-index from rkeys like "{base}-segmentation-7" / "{base}-temporal-3".
function chunkIndex(rkey: string): number {
  const m = rkey.match(/-(\d+)$/);
  return m ? parseInt(m[1], 10) : 0;
}

export async function ionosphereTalkToTranscriptJson(
  talkUri: string,
): Promise<TranscriptJson> {
  const { did, rkey } = parseAtUri(talkUri);
  const pds = await resolvePds(did);

  const talk = await getRecord<TalkRecord>(pds, did, "tv.ionosphere.talk", rkey);

  const expression = await getRecord<ExpressionRecord>(
    pds,
    did,
    "pub.layers.expression.expression",
    `${rkey}-expression`,
  );
  const textBytes = new TextEncoder().encode(expression.text);
  const decoder = new TextDecoder("utf-8");

  // Word byte-range tokens (chunked: "{rkey}-segmentation-{N}").
  const wordSegs = await listRecordsByPrefix<SegmentationRecord>(
    pds,
    did,
    "pub.layers.segmentation.segmentation",
    `${rkey}-segmentation-`,
  );
  wordSegs.sort((a, b) => chunkIndex(a.rkey) - chunkIndex(b.rkey));

  // Word temporal-span tokens (chunked: "{rkey}-temporal-{N}").
  const tempSegs = await listRecordsByPrefix<SegmentationRecord>(
    pds,
    did,
    "pub.layers.segmentation.segmentation",
    `${rkey}-temporal-`,
  );
  tempSegs.sort((a, b) => chunkIndex(a.rkey) - chunkIndex(b.rkey));

  // Build tokenIndex → byte range / time range maps.
  const wordByIdx = new Map<number, { byteStart: number; byteEnd: number }>();
  for (const seg of wordSegs) {
    for (const layer of seg.value.tokenizations ?? []) {
      if (layer.kind !== "word") continue;
      for (const t of layer.tokens as WordToken[])
        wordByIdx.set(t.tokenIndex, t.textSpan);
    }
  }

  const temporalByIdx = new Map<number, { start: number; ending: number }>();
  for (const seg of tempSegs) {
    for (const layer of seg.value.tokenizations ?? []) {
      if (layer.kind !== "word-temporal") continue;
      for (const t of layer.tokens as TemporalToken[])
        temporalByIdx.set(t.tokenIndex, t.temporalSpan);
    }
  }

  const orderedIdx = [...wordByIdx.keys()].sort((a, b) => a - b);

  // Build the flat word list. Skip tokens that have no temporal mate
  // (shouldn't happen, but we don't want to fabricate timings).
  const wordEntries: Array<TranscriptWord & {
    byteStart: number;
    byteEnd: number;
  }> = [];
  for (const ti of orderedIdx) {
    const w = wordByIdx.get(ti)!;
    const t = temporalByIdx.get(ti);
    if (!t) continue;
    const slice = textBytes.slice(w.byteStart, w.byteEnd);
    const text = decoder.decode(slice).trim();
    if (!text) continue;
    // ionosphere stores temporal spans in ms; TranscriptJson is seconds.
    wordEntries.push({
      start: t.start / 1000,
      end: t.ending / 1000,
      text,
      byteStart: w.byteStart,
      byteEnd: w.byteEnd,
    });
  }

  const words: TranscriptWord[] = wordEntries.map(({ start, end, text }) => ({
    start,
    end,
    text,
  }));

  // Paragraph annotations.
  const paragraphLayer = await getRecord<AnnotationLayerRecord>(
    pds,
    did,
    "pub.layers.annotation.annotationLayer",
    `${rkey}-paragraphs`,
  );

  // Resolve speakers (we don't yet have a per-paragraph speaker mapping for
  // multi-speaker talks; assign the sole speaker if there's exactly one).
  const speakers: SpeakerRecord[] = await Promise.all(
    (talk.speakerUris ?? []).map((uri) => {
      const p = parseAtUri(uri);
      return getRecord<SpeakerRecord>(pds, p.did, p.collection, p.rkey);
    }),
  );
  const soleSpeakerName =
    speakers.length === 1
      ? speakers[0].name || speakers[0].handle
      : undefined;

  const paragraphs: TranscriptParagraph[] = [];
  for (const ann of paragraphLayer.annotations ?? []) {
    const { byteStart, byteEnd } = ann.anchor.textSpan;
    if (byteEnd <= byteStart) continue;
    const inside = wordEntries.filter(
      (w) => w.byteStart >= byteStart && w.byteEnd <= byteEnd,
    );
    if (inside.length === 0) continue;
    paragraphs.push({
      start: inside[0].start,
      end: inside[inside.length - 1].end,
      ...(soleSpeakerName ? { speaker: soleSpeakerName } : {}),
    });
  }

  return { words, paragraphs };
}
