// Canonical JSON shape for interactive transcripts in this repo.
// Same shape we'll propose for the AT Proto / Standard.site lexicon —
// see ../../content/transcripts/README.md for context.

export interface TranscriptWord {
  start: number; // seconds
  end: number; // seconds
  text: string; // word as it should render (punctuation kept; whitespace trimmed)
}

export interface TranscriptParagraph {
  start: number; // seconds
  end: number; // seconds
  speaker?: string; // free-form id or name; omit when unknown
}

export interface TranscriptJson {
  words: TranscriptWord[];
  paragraphs: TranscriptParagraph[];
}

const escapeHtml = (s: string): string =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const toMs = (s: number): number => Math.round(s * 1000);

/**
 * Render a JSON transcript to HAL-compatible HTML.
 *
 * Output shape: <article><section><p data-speaker?>...</p>...</section></article>
 * Word spans carry data-m (start ms) and data-d (duration ms) — the only
 * attributes HAL parses.
 *
 * Words are bucketed into paragraphs by `word.start` falling within
 * [paragraph.start, paragraph.end]. Words outside all paragraph ranges are
 * dropped silently (with a one-line warning at build time so authors notice).
 */
export function transcriptJsonToHtml(data: TranscriptJson): string {
  const { words, paragraphs } = data;
  if (!Array.isArray(words) || !Array.isArray(paragraphs)) {
    throw new Error("Transcript JSON must have words[] and paragraphs[]");
  }

  // Bucket words into paragraphs in a single pass (assumes both arrays are
  // chronologically sorted, which is the natural authoring order).
  // For a word at time T, pick the latest paragraph whose [start, end]
  // contains T — when two paragraphs touch at a boundary (e.g. a speaker
  // change at exactly T), the boundary word belongs to the new speaker.
  const buckets: TranscriptWord[][] = paragraphs.map(() => []);
  let pIdx = 0;
  let dropped = 0;

  for (const w of words) {
    // Advance to the first paragraph whose end is at or after the word.
    while (pIdx < paragraphs.length && w.start > paragraphs[pIdx].end) {
      pIdx++;
    }
    if (pIdx >= paragraphs.length) {
      dropped++;
      continue;
    }
    // Prefer the latest paragraph whose start is at or before the word.
    while (
      pIdx + 1 < paragraphs.length &&
      paragraphs[pIdx + 1].start <= w.start
    ) {
      pIdx++;
    }
    if (w.start < paragraphs[pIdx].start) {
      dropped++;
      continue;
    }
    buckets[pIdx].push(w);
  }

  if (dropped > 0 && typeof console !== "undefined") {
    console.warn(
      `[transcript] ${dropped} word(s) fell outside paragraph ranges and were dropped.`,
    );
  }

  const parts: string[] = ["<article>", "<section>"];
  for (let i = 0; i < paragraphs.length; i++) {
    const bucket = buckets[i];
    if (bucket.length === 0) continue;
    const p = paragraphs[i];

    const speakerAttr = p.speaker
      ? ` data-speaker="${escapeHtml(p.speaker)}"`
      : "";
    parts.push(`<p${speakerAttr}>`);
    if (p.speaker) {
      parts.push(`<strong class="speaker">${escapeHtml(p.speaker)}</strong> `);
    }
    for (const w of bucket) {
      const m = toMs(w.start);
      const d = Math.max(0, toMs(w.end) - m);
      parts.push(
        `<span data-m="${m}" data-d="${d}">${escapeHtml(w.text)} </span>`,
      );
    }
    parts.push("</p>");
  }
  parts.push("</section>", "</article>");
  return parts.join("");
}
