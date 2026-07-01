"""Surface likely transcription errors for human review.

Three signals, none perfect:
  A) Tokens occurring only ONCE across the whole corpus AND looking unusual
     (mixed-case in the middle, weird consonant clusters, very long, contains digits adjacent to letters)
  B) Triple+ consecutive identical tokens (real disfluencies are 2x; 3+ is usually a stutter+error pattern)
  C) Suspected miscapitalized/mis-split atproto-ecosystem terms (PDS, DID, OAuth, AppView, etc.)

Output is a markdown-style table per file, with timestamps so you can jump in HAL Editor.
"""
import json, os, re
from collections import Counter, defaultdict

DIR = './atmosphereconf-site/src/content/transcripts'

# --- ecosystem terms with their canonical spelling. Anything that LOOKS like
#     a variant of these gets flagged.
KNOWN = {
    'pds': 'PDS', 'did': 'DID', 'oauth': 'OAuth', 'appview': 'AppView',
    'lexicon': 'lexicon', 'firehose': 'firehose', 'relay': 'relay',
    'atmosphere conference': 'AtmosphereConf', 'atmosphereconf': 'AtmosphereConf',
    'mastodon': 'Mastodon', 'fediverse': 'fediverse', 'nostr': 'Nostr',
    'activitypub': 'ActivityPub', 'github': 'GitHub', 'streamplace': 'Streamplace',
    'ipfs': 'IPFS', 'ietf': 'IETF', 'dns': 'DNS', 'tls': 'TLS', 'https': 'HTTPS',
    'json': 'JSON', 'xrpc': 'XRPC', 'rkey': 'rkey', 'cid': 'CID',
    'plc': 'PLC', 'webrtc': 'WebRTC', 'webgpu': 'WebGPU', 'wasm': 'WebAssembly',
    'whisperx': 'WhisperX', 'parakeet': 'Parakeet', 'safesocial': 'SafeSocial',
}

def core(s): return re.sub(r'^[^A-Za-z0-9]+|[^A-Za-z0-9]+$', '', s).lower()

def looks_weird(token):
    """Heuristic: True if this token's shape suggests transcription noise."""
    if len(token) < 3: return False
    # Mixed case in middle (e.g., "atProto" — but we already fixed those)
    if re.search(r'[a-z][A-Z]', token): return True
    # Digit adjacent to letter (e.g., "API2" "2X" — usually noise unless in known set)
    if re.search(r'[0-9][A-Za-z]|[A-Za-z][0-9]', token): return True
    # 4+ consonants in a row (unusual in English)
    if re.search(r'[bcdfghjklmnpqrstvwxz]{5,}', token.lower()): return True
    return False

# Pass 1: token frequency across corpus
freq = Counter()
positions = defaultdict(list)
for fn in sorted(os.listdir(DIR)):
    if not fn.endswith('.json'): continue
    j = json.load(open(os.path.join(DIR, fn)))
    for i, w in enumerate(j['words']):
        c = core(w['text'])
        if not c: continue
        freq[c] += 1
        if freq[c] <= 3:  # keep first 3 positions of any token
            positions[c].append((fn, i, w['start']))

# Pass 2: per-file suspect findings
per_file = defaultdict(list)
known_misses = Counter()

for fn in sorted(os.listdir(DIR)):
    if not fn.endswith('.json'): continue
    j = json.load(open(os.path.join(DIR, fn)))
    words = j['words']
    for i, w in enumerate(words):
        text = w['text']
        c = core(text)

        # (A) once-in-corpus AND weird-looking AND not a number
        if freq.get(c, 0) == 1 and looks_weird(text) and not c.isdigit():
            ctx = ' '.join(words[k]['text'] for k in range(max(0,i-3), min(len(words),i+4)))
            mm, ss = divmod(w['start'], 60)
            per_file[fn].append(('rare-weird', int(mm), ss, text, ctx))

        # (B) triple-or-more consecutive identical tokens
        if i >= 2 and core(words[i-1]['text']) == c and core(words[i-2]['text']) == c and c:
            ctx = ' '.join(words[k]['text'] for k in range(max(0,i-4), min(len(words),i+3)))
            mm, ss = divmod(words[i-2]['start'], 60)
            per_file[fn].append(('triple-repeat', int(mm), ss, text, ctx))

        # (C) miscapitalized known terms (case-insensitive match, but stored form differs from canonical)
        if c in KNOWN:
            canonical = KNOWN[c]
            stored_core = re.sub(r'^[^A-Za-z0-9]+|[^A-Za-z0-9]+$', '', text)
            if stored_core != canonical and stored_core.lower() == canonical.lower():
                # capitalization mismatch only
                punct = text[len(stored_core):] if text.endswith(stored_core[-1] + text[len(stored_core):]) else ''
                # simpler: any non-canonical form
                known_misses[(canonical, stored_core)] += 1

# Print findings
print('=== A) miscapitalized known ecosystem terms (raw → canonical, count) ===')
for (canonical, stored), n in known_misses.most_common(30):
    print(f'  {stored!r:<22} → {canonical:<14} ({n})')

print('\n=== B) per-file rare-weird / triple-repeat findings ===')
total = sum(len(v) for v in per_file.values())
print(f'(total {total} findings across {len(per_file)} files)\n')
for fn in sorted(per_file):
    rows = per_file[fn]
    if not rows: continue
    print(f'\n--- /event/{fn[:-5]} ---')
    for kind, mm, ss, tok, ctx in rows[:10]:
        print(f'  {kind:<14} {mm:02d}:{ss:05.2f}  «{tok}»  …{ctx}…')
    if len(rows) > 10:
        print(f'  … and {len(rows)-10} more')
