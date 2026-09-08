"""Apply consistent spellings across all transcript JSONs.

Rules:
  - Word pair: blue + sky*   → merge to "Bluesky" + trailing punctuation
  - Word pair: black + sky*  → merge to "BlackSky" + trailing punct
  - Word pair: at + proto*   → merge to "ATProto" + trailing punct
  - Word pair: at + protocol* → case-fix to AT + Protocol* (DO NOT merge — keep two words)
  - Single token: AtProto/atProto → ATProto
  - Single token: lowercase atmosphere* (except 'atmospheric*') → Atmosphere*

Merges preserve timing: merged word.start = first.start, .end = second.end.
"""
import json, os, re, sys

DIR = './atmosphereconf-site/src/content/transcripts'

def trailing_punct(s):
    m = re.search(r'[^A-Za-z0-9]+$', s)
    return m.group() if m else ''

def core(s):
    return re.sub(r'^[^A-Za-z0-9]+|[^A-Za-z0-9]+$', '', s).lower()

def fix_words(words):
    """Walk words, emit a new list with merges + case fixes. Returns (new_words, counts)."""
    out = []
    counts = {'bluesky':0, 'blacksky':0, 'atproto-merge':0, 'at-protocol':0,
              'atproto-single':0, 'atmosphere-cap':0}
    i = 0
    while i < len(words):
        w = words[i]
        t = w['text']
        c = core(t)
        # Check 2-word patterns first
        if i + 1 < len(words):
            n = words[i+1]
            nc = core(n['text'])
            punct = trailing_punct(n['text'])
            if c == 'blue' and nc == 'sky':
                out.append({'start': w['start'], 'end': n['end'], 'text': 'Bluesky' + punct})
                counts['bluesky'] += 1
                i += 2; continue
            if c == 'black' and nc == 'sky':
                out.append({'start': w['start'], 'end': n['end'], 'text': 'BlackSky' + punct})
                counts['blacksky'] += 1
                i += 2; continue
            if c == 'at' and nc == 'proto':
                out.append({'start': w['start'], 'end': n['end'], 'text': 'ATProto' + punct})
                counts['atproto-merge'] += 1
                i += 2; continue
            if c == 'at' and nc in ('protocol', 'protocols'):
                # Case-fix only — keep two separate words
                out.append({**w, 'text': 'AT' + trailing_punct(t)})
                fixed_second = ('Protocol' if nc == 'protocol' else 'Protocols') + punct
                out.append({**n, 'text': fixed_second})
                counts['at-protocol'] += 1
                i += 2; continue
        # Single-token rules
        if t in ('AtProto', 'atProto'):
            out.append({**w, 'text': 'ATProto'})
            counts['atproto-single'] += 1
            i += 1; continue
        # atmosphere capitalisation: lowercase 'a' on a word that starts with 'atmosphere'
        # (but skip 'atmospheric*' — different word)
        if re.match(r'^atmosphere', t) and not re.match(r'^atmospheric', t.lower()):
            out.append({**w, 'text': 'A' + t[1:]})
            counts['atmosphere-cap'] += 1
            i += 1; continue
        out.append(w)
        i += 1
    return out, counts

dry = '--apply' not in sys.argv
totals = {'bluesky':0,'blacksky':0,'atproto-merge':0,'at-protocol':0,'atproto-single':0,'atmosphere-cap':0}
per_file = []

for fn in sorted(os.listdir(DIR)):
    if not fn.endswith('.json'): continue
    path = os.path.join(DIR, fn)
    j = json.load(open(path))
    new_words, counts = fix_words(j['words'])
    changed = sum(counts.values())
    if changed:
        per_file.append((fn, changed, counts))
        for k,v in counts.items(): totals[k] += v
        if not dry:
            j['words'] = new_words
            with open(path,'w') as f: json.dump(j, f, indent=2)

print(f"{'DRY RUN' if dry else 'APPLIED'} — files touched: {len(per_file)} / 91")
print('\ntotals:')
for k,v in totals.items(): print(f'  {k:<18} {v:>5}')
print('\ntop 10 files by edits:')
for fn, n, c in sorted(per_file, key=lambda x:-x[1])[:10]:
    parts = ' '.join(f'{k}={v}' for k,v in c.items() if v)
    print(f'  {fn:<22} {n:>4} edits  ({parts})')
