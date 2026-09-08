// Batch transcription harness:
//   - Reads events-to-transcribe.jsonl ({id, vodAtUri}) and skips ones whose
//     latest/src/content/transcripts/{id}.json already exists (resumable).
//   - Single long-lived Playwright Chrome with persistent profile so Parakeet
//     ONNX models stay in Cache Storage across talks.
//   - 1-deep pipeline: while talk N transcribes on the GPU, talk N+1's HLS
//     audio downloads in parallel on the CPU/network.
//   - Per-talk failures (HLS or transcribe) log and continue; never aborts.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { downloadAndRemux } from './hls-to-mp4.mjs';

const HAL_EDITOR_ROOT  = './hyperaudio-lite-editor';
const TRANSCRIPTS_DIR  = './atmosphereconf-site/src/content/transcripts';
const TMP_DIR          = './work/audio-tmp';
const PROFILE_DIR      = './work/chrome-profile';
const JOBS_FILE        = './work/events-to-transcribe.jsonl';
const STATUS_FILE      = './work/batch-status.jsonl';

await fsp.mkdir(TMP_DIR, { recursive: true });

function audioPlaylistUrlFor(vodAtUri) {
  // Resolve master → audio variant once at use-time (avoids stashing port-bound URLs).
  // The master playlist always has the audio variant as the first EXT-X-MEDIA URI.
  return `https://stream.place/xrpc/place.stream.playback.getVideoPlaylist?uri=${encodeURIComponent(vodAtUri)}`;
}

async function fetchAudioPlaylistUrl(vodAtUri) {
  const masterUrl = audioPlaylistUrlFor(vodAtUri);
  const r = await fetch(masterUrl);
  if (!r.ok) throw new Error(`master ${r.status}`);
  const text = await r.text();
  if (text.includes('VideoNotFound')) throw new Error('VideoNotFound');
  const m = text.match(/URI="([^"]+)"/);
  if (!m) throw new Error('no audio variant URI');
  return m[1].startsWith('http') ? m[1] : `https://stream.place${m[1]}`;
}

// ---------- static server for HAL Editor ----------
const MIME = {
  '.html':'text/html; charset=utf-8','.htm':'text/html; charset=utf-8',
  '.js':'application/javascript; charset=utf-8','.mjs':'application/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8',
  '.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg',
  '.wasm':'application/wasm','.onnx':'application/octet-stream','.txt':'text/plain; charset=utf-8',
  '.webmanifest':'application/manifest+json',
};
const server = http.createServer(async (req, res) => {
  try {
    let url = req.url.split('?')[0];
    if (url === '/') url = '/index.html';
    const fp = path.join(HAL_EDITOR_ROOT, decodeURIComponent(url));
    if (!fp.startsWith(HAL_EDITOR_ROOT)) { res.writeHead(403); return res.end(); }
    const st = await fsp.stat(fp).catch(() => null);
    if (!st || !st.isFile()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': MIME[path.extname(fp).toLowerCase()] ?? 'application/octet-stream' });
    fs.createReadStream(fp).pipe(res);
  } catch (e) { res.writeHead(500); res.end(String(e)); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
console.error(`[batch] HAL Editor at http://127.0.0.1:${port}/`);

// ---------- jobs ----------
const allJobs = (await fsp.readFile(JOBS_FILE, 'utf8'))
  .trim().split('\n').map(JSON.parse);
const existing = new Set((await fsp.readdir(TRANSCRIPTS_DIR)).filter(f => f.endsWith('.json')).map(f => f.replace('.json','')));
const jobs = allJobs.filter(j => !existing.has(j.id));
console.error(`[batch] ${allJobs.length} total, ${allJobs.length - jobs.length} already done, ${jobs.length} to do`);

// Append-only status log
const statusOut = fs.createWriteStream(STATUS_FILE, { flags: 'a' });
const logStatus = (rec) => statusOut.write(JSON.stringify({ ts: new Date().toISOString(), ...rec }) + '\n');

// ---------- Playwright ----------
const ctx = await chromium.launchPersistentContext(PROFILE_DIR, {
  channel: 'chrome', headless: false, viewport: { width: 1400, height: 900 },
});

async function transcribeOne(mp4Path) {
  const page = await ctx.newPage();
  try {
    await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'load' });
    await page.locator('label[for="transcribe-modal"]').first().click();
    await page.locator('#parakeet-file-input').waitFor({ state: 'attached', timeout: 10000 });
    await page.locator('#parakeet-file-input').setInputFiles(mp4Path);
    await page.waitForFunction(() => {
      const b = document.querySelector('#parakeet-form-submit-btn');
      return b && !b.classList.contains('btn-disabled') && b.getAttribute('aria-disabled') !== 'true';
    }, null, { timeout: 30000 });
    await page.locator('#parakeet-form-submit-btn').click();
    await page.locator('#hypertranscript span[data-m]').first().waitFor({ state: 'attached', timeout: 1800_000 });
    const json = await page.evaluate(() => {
      const root = document.getElementById('hypertranscript');
      const words = [], paragraphs = [];
      for (const p of root.querySelectorAll('p')) {
        const ps = [...p.querySelectorAll('span[data-m]')];
        if (!ps.length) continue;
        for (const s of ps) {
          const start = +s.dataset.m / 1000;
          const dur = +s.dataset.d / 1000;
          words.push({ start, end: start + dur, text: s.textContent.trim() });
        }
        const first = ps[0], last = ps[ps.length - 1];
        paragraphs.push({ start: +first.dataset.m / 1000, end: (+last.dataset.m + +last.dataset.d) / 1000 });
      }
      return { words, paragraphs };
    });
    return json;
  } finally {
    await page.close().catch(() => {});
  }
}

async function downloadAudio(job) {
  const audioUrl = await fetchAudioPlaylistUrl(job.vodAtUri);
  const out = path.join(TMP_DIR, `${job.id}.mp4`);
  await downloadAndRemux(audioUrl, out);
  return out;
}

// ---------- 1-deep pipeline ----------
let stats = { ok: 0, vodNotFound: 0, downloadErr: 0, transcribeErr: 0 };
let prefetch = jobs.length > 0 ? downloadAudio(jobs[0]).catch(e => ({ __err: e })) : null;

for (let i = 0; i < jobs.length; i++) {
  const job = jobs[i];
  const t0 = Date.now();
  console.error(`\n[${i+1}/${jobs.length}] ${job.id}`);

  // Resolve current talk's download (it was prefetched in parallel with last iter's transcribe)
  const downloaded = await prefetch;
  // Kick off next iteration's download immediately so it overlaps this one's transcribe.
  prefetch = i + 1 < jobs.length ? downloadAudio(jobs[i+1]).catch(e => ({ __err: e })) : null;

  if (downloaded && downloaded.__err) {
    const msg = String(downloaded.__err.message || downloaded.__err);
    if (msg.includes('VideoNotFound')) {
      console.error(`  download skipped: VideoNotFound`); stats.vodNotFound++;
      logStatus({ id: job.id, status: 'video-not-found' });
    } else {
      console.error(`  download FAILED: ${msg}`); stats.downloadErr++;
      logStatus({ id: job.id, status: 'download-error', error: msg });
    }
    continue;
  }

  try {
    const json = await transcribeOne(downloaded);
    const outJson = path.join(TRANSCRIPTS_DIR, `${job.id}.json`);
    await fsp.writeFile(outJson, JSON.stringify(json, null, 2));
    const secs = ((Date.now() - t0) / 1000).toFixed(1);
    console.error(`  OK: ${json.words.length} words, ${secs}s wall`);
    stats.ok++;
    logStatus({ id: job.id, status: 'ok', words: json.words.length, durSec: +secs });
  } catch (e) {
    const msg = String(e.message || e);
    console.error(`  transcribe FAILED: ${msg.slice(0, 200)}`); stats.transcribeErr++;
    logStatus({ id: job.id, status: 'transcribe-error', error: msg.slice(0, 500) });
  } finally {
    await fsp.unlink(downloaded).catch(() => {});
  }
}

console.error(`\n[batch] DONE. ok=${stats.ok} vodNotFound=${stats.vodNotFound} downloadErr=${stats.downloadErr} transcribeErr=${stats.transcribeErr}`);
statusOut.end();
await ctx.close();
server.close();
