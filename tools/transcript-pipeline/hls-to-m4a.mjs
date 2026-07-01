// Download fMP4 audio from a stream.place HLS audio sub-playlist into a
// single .m4a file. Audio segments are byte-ranged into a few large blobs,
// so we issue parallel HTTP/2 ranged GETs to keep wall-clock low. The
// result = init segment + media segments concatenated in playlist order,
// which is a valid fragmented MP4 that browsers and ffmpeg can play.
import fs from 'node:fs/promises';
import { setTimeout as wait } from 'node:timers/promises';

const STREAM_PLACE = 'https://stream.place';
const CONCURRENCY = 16;

const abs = (u) => u.startsWith('http') ? u : STREAM_PLACE + u;

async function fetchPlaylist(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`playlist ${url}: ${r.status}`);
  return await r.text();
}

function parseAudioPlaylist(text) {
  const segs = [];
  let init = null;
  let pendingRange = null;
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) { pendingRange = null; continue; }
    if (line.startsWith('#EXT-X-MAP:')) {
      const m = line.match(/URI="([^"]+)"/);
      if (m) init = { url: m[1] };
    } else if (line.startsWith('#EXT-X-BYTERANGE:')) {
      const m = line.match(/^#EXT-X-BYTERANGE:(\d+)(?:@(\d+))?$/);
      if (m) pendingRange = { length: +m[1], offset: m[2] !== undefined ? +m[2] : null };
    } else if (!line.startsWith('#')) {
      segs.push({ url: line, byterange: pendingRange });
      pendingRange = null;
    }
  }
  if (!init) throw new Error('no EXT-X-MAP init segment in playlist');
  return { init, segs };
}

async function fetchBytes(url, byterange, attempt = 1) {
  const headers = {};
  if (byterange) {
    const start = byterange.offset;
    const end = start + byterange.length - 1;
    headers.Range = `bytes=${start}-${end}`;
  }
  try {
    const r = await fetch(url, { headers });
    if (!r.ok && r.status !== 206) throw new Error(`HTTP ${r.status}`);
    return Buffer.from(await r.arrayBuffer());
  } catch (e) {
    if (attempt >= 4) throw e;
    await wait(500 * attempt);
    return fetchBytes(url, byterange, attempt + 1);
  }
}

async function pool(items, concurrency, worker) {
  const results = new Array(items.length);
  let next = 0, done = 0;
  let lastLog = Date.now();
  async function run() {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await worker(items[i], i);
      done++;
      if (Date.now() - lastLog > 1500) {
        process.stderr.write(`\r  ${done}/${items.length} segments...`);
        lastLog = Date.now();
      }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, run));
  process.stderr.write(`\r  ${done}/${items.length} segments done    \n`);
  return results;
}

export async function downloadHlsAudio(audioPlaylistUrl, outPath) {
  process.stderr.write(`[hls] fetch playlist\n`);
  const text = await fetchPlaylist(audioPlaylistUrl);
  const { init, segs } = parseAudioPlaylist(text);
  process.stderr.write(`[hls] init + ${segs.length} segments\n`);

  const initBuf = await fetchBytes(abs(init.url));
  process.stderr.write(`[hls] init: ${initBuf.length} bytes\n`);

  const t0 = Date.now();
  const segBufs = await pool(segs, CONCURRENCY, (s) => fetchBytes(abs(s.url), s.byterange));
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  const totalBytes = segBufs.reduce((a, b) => a + b.length, 0);
  process.stderr.write(`[hls] fetched ${(totalBytes / 1e6).toFixed(1)} MB in ${elapsed}s\n`);

  await fs.writeFile(outPath, Buffer.concat([initBuf, ...segBufs]));
  process.stderr.write(`[hls] wrote ${outPath}\n`);
}

// CLI entry
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const [, , playlistUrl, outPath] = process.argv;
  if (!playlistUrl || !outPath) {
    console.error('usage: node hls-to-m4a.mjs <audio-playlist-url> <out.m4a>');
    process.exit(1);
  }
  await downloadHlsAudio(playlistUrl, outPath);
}
