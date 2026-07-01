#!/usr/bin/env python3
"""Build the self-contained DID-review HTML from an ambiguous-cases TSV +
pre-grabbed video frames.

Expects, alongside this script:
  ./work/ambiguous-grabs.clean.tsv       tab-separated: eid, word_idx, start_time, vodAtUri, ctx
  ./work/did-shots/<eid>_<sec>.jpg       ffmpeg-grabbed frame per case
  ./atmosphereconf-site/src/content/transcripts/<eid>.json  the canonical TranscriptJson

Writes:
  ~/Desktop/did-review.html              self-contained review UI (~1.4 MB)

The generated page inlines images as base64 and loads hls.js from a CDN to
play the phrase span from stream.place. Serve from a plain HTTP origin
(any localhost server) — file:// won't work due to CORS.
"""
import base64, html, json, os, re

WS = './work'
DIR = './atmosphereconf-site/src/content/transcripts'
OUT = os.path.expanduser('~/Desktop/did-review.html')
CONTEXT_BEFORE = 10
CONTEXT_AFTER  = 10

rows = [line.rstrip('\n').split('\t')
        for line in open(f'{WS}/ambiguous-grabs.clean.tsv')]

cache = {}
def js(eid):
    if eid not in cache:
        cache[eid] = json.load(open(f'{DIR}/{eid}.json'))
    return cache[eid]

cases = []
for eid, idx, t, vod, _ in rows:
    idx = int(idx); t = float(t)
    j = js(eid)
    words = j['words']
    lo = max(0, idx - CONTEXT_BEFORE)
    hi = min(len(words), idx + CONTEXT_AFTER + 1)
    parts = []
    for k in range(lo, hi):
        wt = html.escape(words[k]['text'])
        parts.append(f'<b>{wt}</b>' if k == idx else wt)
    phrase_html = ' '.join(parts)

    # A ~5s-before → paragraph-end audio window sounds most natural.
    phrase_start = max(0.0, words[lo]['start'] - 0.3)
    phrase_end   = words[hi-1]['end'] + 0.5

    shot_path = f'{WS}/did-shots/{eid}_{int(t):05d}.jpg'
    img_b64 = ''
    if os.path.exists(shot_path):
        img_b64 = base64.b64encode(open(shot_path,'rb').read()).decode()

    cases.append({
        'eid': eid, 'idx': idx, 'time': t, 'vod': vod,
        'phrase_start': phrase_start, 'phrase_end': phrase_end,
        'word_start': words[idx]['start'], 'word_end': words[idx]['end'],
        'phrase_html': phrase_html, 'shot_b64': img_b64,
        'orig_text': words[idx]['text'],
    })

doc = ['''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>DID review</title>
<script src="https://cdn.jsdelivr.net/npm/hls.js@1.5.13/dist/hls.min.js"></script>
<style>
  body{font:14px/1.5 system-ui;max-width:980px;margin:1rem auto;padding:0 1rem;background:#fafafa}
  h1{font-size:1.3rem;margin:0 0 .5rem 0}
  .intro{color:#555;margin-bottom:1.2rem}
  audio{display:none}
  #toolbar{position:sticky;top:0;background:#fafafa;padding:.6rem 0;border-bottom:1px solid #ddd;z-index:10}
  #toolbar button{padding:.4rem .8rem;font:inherit;cursor:pointer;margin-right:.5rem}
  #counter{margin-right:1rem;color:#555}
  .case{background:#fff;border:1px solid #ddd;border-radius:8px;padding:1rem;margin:1rem 0}
  .case.changed{border-color:#0a58ca;background:#f4f9ff}
  .head{display:flex;justify-content:space-between;align-items:center;gap:.5rem;flex-wrap:wrap}
  .meta{color:#666;font-size:.85rem}
  .meta a{color:#0a58ca;text-decoration:none;margin-left:.5em}
  .meta a:hover{text-decoration:underline}
  .ctrls button{padding:.3rem .7rem;cursor:pointer;border:1px solid #ccc;background:#fff;border-radius:4px;margin-left:.25rem}
  .ctrls button:hover{background:#eee}
  .ctrls .play{background:#0a58ca;color:#fff;border-color:#0a58ca}
  .ctrls .did{background:#fffacd}
  .phrase{background:#f5f5f5;padding:.6rem .8rem;border-radius:4px;margin:.6rem 0;font:13px/1.6 ui-monospace,Menlo,monospace}
  .phrase b{background:#fff3a3;padding:1px 4px;border-radius:3px;font-weight:600}
  img{max-width:480px;border:1px solid #ddd;border-radius:4px;display:block;margin:.5rem 0}
  .override{display:flex;align-items:center;gap:.5rem;margin-top:.4rem}
  .override input{font:13px ui-monospace,Menlo,monospace;padding:.3rem .5rem;border:1px solid #ccc;border-radius:4px;width:240px}
  .badge{display:inline-block;background:#0a58ca;color:#fff;padding:.1rem .5rem;border-radius:3px;font-size:.75rem;font-weight:600;margin-left:.4rem}
</style>
</head>
<body>
<h1>DID review — ''' + str(len(cases)) + ''' ambiguous cases</h1>
<div class="intro">
Default = ignore. Click <b>DID</b> for the common case, or type a custom replacement in the override field for anything else.
Keyboard (focus a card by clicking): <code>Space</code> = play, <code>d</code> = DID, <code>r</code> = reset.
</div>

<div id="toolbar">
  <span id="counter">0 marked</span>
  <button id="export-btn">Submit</button>
  <button id="next-btn">Next unmarked ↓</button>
</div>

<audio id="player" preload="auto"></audio>

<div id="cases">
''']

for c in cases:
    img = f'<img src="data:image/jpeg;base64,{c["shot_b64"]}" alt="frame">' if c['shot_b64'] else ''
    mm = int(c['time'] // 60); ss = c['time'] % 60
    case_id = f'{c["eid"]}_{c["idx"]}'
    clip_url = f'http://localhost:4321/event/{c["eid"]}#clip={c["word_start"]:.2f},{c["word_end"]:.2f}'
    doc.append(f'''
<div class="case" id="case_{case_id}" tabindex="0"
     data-eid="{c["eid"]}" data-idx="{c["idx"]}" data-vod="{c["vod"]}"
     data-pstart="{c["phrase_start"]:.2f}" data-pend="{c["phrase_end"]:.2f}"
     data-orig="{html.escape(c["orig_text"])}">
  <div class="head">
    <div class="meta">/event/{c["eid"]} @ {mm:02d}:{ss:05.2f} (word #{c["idx"]})
      <a href="{clip_url}" target="_blank">open in dev →</a>
      <span class="badge" style="display:none">CHANGED</span>
    </div>
    <div class="ctrls">
      <button class="play" data-action="play">▶ play</button>
      <button class="did" data-action="did">DID</button>
      <button data-action="reset">reset</button>
    </div>
  </div>
  <div class="phrase">{c["phrase_html"]}</div>
  {img}
  <div class="override">
    <label>override:</label>
    <input type="text" placeholder="(custom replacement, e.g. DIDs)" data-action="override">
  </div>
</div>
''')

doc.append('''
</div>

<div style="text-align:center;padding:2rem 1rem 4rem">
  <button id="submit-btn-bottom"
          style="padding:0.8rem 1.6rem;font-size:1.05rem;font-weight:600;background:#0a58ca;color:#fff;border:none;border-radius:6px;cursor:pointer">
    Submit changes
  </button>
  <div id="submit-status" style="margin-top:0.8rem;color:#555"></div>
</div>

<script>
const audio = document.getElementById('player');
let hls = null;
let currentVod = null;
let stopAt = null;
let pendingSeek = null;
const changes = new Map();

audio.addEventListener('timeupdate', () => {
  if (stopAt !== null && audio.currentTime >= stopAt) {
    audio.pause();
    stopAt = null;
  }
});
function applyPendingSeek() {
  if (!pendingSeek) return;
  try { audio.currentTime = pendingSeek.start; } catch {}
  stopAt = pendingSeek.end;
  audio.play().catch(e => console.warn('play err', e));
  pendingSeek = null;
}
audio.addEventListener('canplay', applyPendingSeek);
audio.addEventListener('loadedmetadata', applyPendingSeek);

function setSource(vod) {
  if (vod === currentVod) return false;
  if (hls) { hls.destroy(); hls = null; }
  const master = 'https://stream.place/xrpc/place.stream.playback.getVideoPlaylist?uri=' + encodeURIComponent(vod);
  if (audio.canPlayType('application/vnd.apple.mpegurl')) {
    audio.src = master;
  } else if (window.Hls && Hls.isSupported()) {
    hls = new Hls({ enableWorker: false });
    hls.loadSource(master);
    hls.attachMedia(audio);
  } else {
    alert('No HLS support in this browser');
    return false;
  }
  currentVod = vod;
  return true;
}

function playPhrase(vod, start, end) {
  pendingSeek = { start, end };
  const wasSwitched = setSource(vod);
  if (!wasSwitched && audio.readyState >= 1) applyPendingSeek();
  else if (audio.canPlayType('application/vnd.apple.mpegurl') && currentVod === vod) audio.load();
}

function setChange(caseEl, newText) {
  const key = caseEl.id;
  if (!newText || newText === caseEl.dataset.orig) {
    changes.delete(key);
    caseEl.classList.remove('changed');
    caseEl.querySelector('.badge').style.display = 'none';
    caseEl.querySelector('.override input').value = '';
  } else {
    changes.set(key, { eid: caseEl.dataset.eid, idx: caseEl.dataset.idx,
                       orig: caseEl.dataset.orig, new: newText });
    caseEl.classList.add('changed');
    const b = caseEl.querySelector('.badge');
    b.style.display = ''; b.textContent = `→ ${newText}`;
    caseEl.querySelector('.override input').value = newText;
  }
  document.getElementById('counter').textContent = `${changes.size} marked`;
}

document.querySelectorAll('.case').forEach(caseEl => {
  caseEl.addEventListener('click', e => {
    const action = e.target.dataset.action;
    if (!action) return;
    if (action === 'play') playPhrase(caseEl.dataset.vod, +caseEl.dataset.pstart, +caseEl.dataset.pend);
    else if (action === 'did') setChange(caseEl, 'DID');
    else if (action === 'reset') setChange(caseEl, null);
  });
  caseEl.querySelector('.override input').addEventListener('input', e => setChange(caseEl, e.target.value));
});

document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  const focused = document.querySelector('.case:focus');
  if (!focused) return;
  if (e.code === 'Space') { e.preventDefault(); playPhrase(focused.dataset.vod, +focused.dataset.pstart, +focused.dataset.pend); }
  else if (e.key === 'd') setChange(focused, 'DID');
  else if (e.key === 'r') setChange(focused, null);
});

async function submitChanges() {
  const payload = { changes: [...changes.values()] };
  const status = document.getElementById('submit-status');
  if (status) status.textContent = `Submitting ${payload.changes.length}…`;
  try {
    const r = await fetch('/submit', { method:'POST', headers:{'content-type':'application/json'},
                                       body: JSON.stringify(payload) });
    if (!r.ok) throw new Error(await r.text());
    if (status) status.textContent = `Submitted ${payload.changes.length} changes ✓`;
    alert(`Submitted ${payload.changes.length} changes.`);
  } catch (e) {
    if (status) status.textContent = `Submit failed: ${e.message}`;
    alert(`Submit failed: ${e.message}`);
  }
}
document.getElementById('export-btn').addEventListener('click', submitChanges);
const _bot = document.getElementById('submit-btn-bottom');
if (_bot) _bot.addEventListener('click', submitChanges);

document.getElementById('next-btn').addEventListener('click', () => {
  const all = [...document.querySelectorAll('.case')];
  const idx = all.indexOf(document.querySelector('.case:focus'));
  for (let i = idx + 1; i < all.length; i++) {
    if (!all[i].classList.contains('changed')) { all[i].focus(); all[i].scrollIntoView({block:'center'}); return; }
  }
});
</script>
</body></html>
''')

open(OUT, 'w').write(''.join(doc))
print(f'wrote {OUT}  ({os.path.getsize(OUT)//1024} KB)')
