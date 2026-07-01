// Drive HAL Editor's Parakeet workflow headlessly for a single MP4.
// Outputs the canonical TranscriptJson { words, paragraphs } shape.
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';

const HAL_EDITOR_ROOT = './hyperaudio-lite-editor';
const PROFILE_DIR = './work/chrome-profile';

const [, , mp4Path, outJsonPath] = process.argv;
if (!mp4Path || !outJsonPath) { console.error('usage: node transcribe-one.mjs <mp4> <out.json>'); process.exit(1); }

const MIME = {
  '.html': 'text/html; charset=utf-8', '.htm': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8', '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.wasm': 'application/wasm', '.onnx': 'application/octet-stream', '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
};

// Minimal static server. COOP/COEP enable cross-origin isolation, which some
// Web Worker / WASM SIMD paths require.
const server = http.createServer(async (req, res) => {
  try {
    let url = req.url.split('?')[0];
    if (url === '/') url = '/index.html';
    const filePath = path.join(HAL_EDITOR_ROOT, decodeURIComponent(url));
    if (!filePath.startsWith(HAL_EDITOR_ROOT)) { res.writeHead(403); return res.end(); }
    const stat = await fsp.stat(filePath).catch(() => null);
    if (!stat || !stat.isFile()) { res.writeHead(404); return res.end('not found'); }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'content-type': MIME[ext] ?? 'application/octet-stream',
    });
    fs.createReadStream(filePath).pipe(res);
  } catch (e) { res.writeHead(500); res.end(String(e)); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
console.error(`[harness] serving HAL Editor on http://127.0.0.1:${port}/`);

const ctx = await chromium.launchPersistentContext(PROFILE_DIR, {
  channel: 'chrome',
  headless: false,
  viewport: { width: 1400, height: 900 },
});
const page = await ctx.newPage();
page.on('console', msg => {
  const t = msg.text();
  if (/parakeet|error|fail|complete|loaded|webgpu|cpu|gpu|model|download/i.test(t)) console.error(`[page] ${t}`);
});

await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'load' });
console.error('[harness] page loaded');

await page.locator('label[for="transcribe-modal"]').first().click();
await page.locator('#parakeet-file-input').waitFor({ state: 'attached', timeout: 10000 });
console.error('[harness] modal open');

await page.locator('#parakeet-file-input').setInputFiles(mp4Path);
console.error(`[harness] uploaded ${mp4Path}`);

await page.waitForFunction(() => {
  const b = document.querySelector('#parakeet-form-submit-btn');
  return b && !b.classList.contains('btn-disabled') && b.getAttribute('aria-disabled') !== 'true';
}, { timeout: 30000 });
console.error('[harness] TRANSCRIBE enabled — clicking');

await page.locator('#parakeet-form-submit-btn').click();
console.error('[harness] clicked TRANSCRIBE — waiting (first-run downloads ~600 MB of ONNX models)');

await page.locator('#hypertranscript span[data-m]').first().waitFor({ state: 'attached', timeout: 1800_000 });
console.error('[harness] transcript populated');

// htmlToJson lives in hyperaudio-lite-editor-export.js but isn't reliably
// exposed on window. Inline the equivalent parse: HAL emits
// <article><section><p><span data-m="ms" data-d="ms">word </span>...</p></section></article>
const json = await page.evaluate(() => {
  const root = document.getElementById('hypertranscript');
  const wordsFromP = (p) => [...p.querySelectorAll('span[data-m]')];
  const words = [];
  const paragraphs = [];
  for (const p of root.querySelectorAll('p')) {
    const ps = wordsFromP(p);
    if (!ps.length) continue;
    for (const s of ps) {
      const start = +s.dataset.m / 1000;
      const dur = +s.dataset.d / 1000;
      words.push({ start, end: start + dur, text: s.textContent.trim() });
    }
    const first = ps[0], last = ps[ps.length - 1];
    paragraphs.push({
      start: +first.dataset.m / 1000,
      end: (+last.dataset.m + +last.dataset.d) / 1000,
    });
  }
  return { words, paragraphs };
});
console.error(`[harness] extracted ${json.words?.length ?? 0} words, ${json.paragraphs?.length ?? 0} paragraphs`);

await fsp.writeFile(outJsonPath, JSON.stringify(json, null, 2));
console.error(`[harness] wrote ${outJsonPath}`);

await ctx.close();
server.close();
