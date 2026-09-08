// Resolve a transcript for an event page.
//
// Priority order:
//   1. Local JSON in src/content/transcripts/{rkey}.json (lets us ship a
//      Parakeet/WhisperX-authored version when timings matter — see
//      transcripts/README.md).
//   2. Live fetch from the ionosphere PDS via
//      ionosphereTalkToTranscriptJson().
//
// Results (including null-on-failure) are memoized for the lifetime of the
// process so a hot path doesn't hammer the PDS.

import { IONOSPHERE_OWNER_DID_OR_HANDLE } from "astro:env/server";
import { ionosphereTalkToTranscriptJson } from "./transcript-from-ionosphere";
import type { TranscriptJson } from "./transcript-json";

const localTranscripts = import.meta.glob<TranscriptJson>(
  "/src/content/transcripts/*.json",
  { import: "default", eager: false },
);

const cache = new Map<string, TranscriptJson | null>();

async function resolveOwnerDid(input: string): Promise<string> {
  if (input.startsWith("did:")) return input;
  // Treat anything else as a handle — resolve via the standard XRPC.
  const r = await fetch(
    `https://public.api.bsky.app/xrpc/com.atproto.identity.resolveHandle?handle=${encodeURIComponent(input)}`,
  );
  if (!r.ok) throw new Error(`resolveHandle ${input} → ${r.status}`);
  const j = (await r.json()) as { did: string };
  return j.did;
}

export async function loadTranscript(
  rkey: string,
): Promise<TranscriptJson | null> {
  if (cache.has(rkey)) return cache.get(rkey)!;

  const localLoader = localTranscripts[`/src/content/transcripts/${rkey}.json`];
  if (localLoader) {
    const json = await localLoader();
    cache.set(rkey, json);
    return json;
  }

  try {
    const did = await resolveOwnerDid(IONOSPHERE_OWNER_DID_OR_HANDLE);
    const talkUri = `at://${did}/tv.ionosphere.talk/${rkey}`;
    const json = await ionosphereTalkToTranscriptJson(talkUri);
    // Some talks have a tv.ionosphere.talk record but no expression layer
    // yet (transcription not run). Treat zero words as "no transcript" so
    // the event page renders without a transcript pane.
    const usable = json.words.length > 0 ? json : null;
    cache.set(rkey, usable);
    return usable;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[transcript-loader] ${rkey}: ${msg}`);
    cache.set(rkey, null);
    return null;
  }
}
