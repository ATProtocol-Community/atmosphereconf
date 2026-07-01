"""Apply the high-confidence batch + dump ambiguous DID cases for review."""
import json, os, re, sys
import importlib.util
spec = importlib.util.spec_from_file_location('did_classify', './work/did-classify.py')
did_mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(did_mod)
classify = did_mod.classify
core = did_mod.core

DIR = './atmosphereconf-site/src/content/transcripts'
DRY = '--apply' not in sys.argv

# Single-token replacements (with optional preserved trailing punctuation).
# Keys are core() form; values are canonical capitalization.
SINGLE_TOKEN_FIXES = {
    'nechmag':   'NCMEC',
    'necmac':    'NCMEC',
    'w2c':       'W3C',
    'htdps':     'HTTPS',
    'quen3':     'Qwen3',
    'xhtml':     'XHTML',
    'swift2i':   'SwiftUI',
    'g10':       'GTIN',
    'streamplace': 'Streamplace',
    'pds':       'PDS',
    'github':    'GitHub',
}
# Domain typo: only "GraphL.org" → "GraphQL.org" — anchor on full string
DOMAIN_FIXES = {
    'graphl.org':  'GraphQL.org',
    'graphl.org,': 'GraphQL.org,',
    'graphl.org.': 'GraphQL.org.',
}

def trailing_punct(s):
    m = re.search(r'[^A-Za-z0-9]+$', s)
    return m.group() if m else ''

def fix_words(words):
    out_changes = 0
    did_changes = 0
    ambiguous = []   # collect for review
    for i, w in enumerate(words):
        text = w['text']
        low = text.lower()
        c = core(text)

        # Domain (must precede single-token check to take precedence)
        if low in DOMAIN_FIXES:
            new = DOMAIN_FIXES[low]
            if new != text:
                w['text'] = new
                out_changes += 1
            continue

        # Single-token fixes
        if c in SINGLE_TOKEN_FIXES:
            new = SINGLE_TOKEN_FIXES[c] + trailing_punct(text)
            if new != text:
                w['text'] = new
                out_changes += 1
            continue

        # DID classifier
        if c == 'did':
            kind = classify(words, i)
            if kind == 'acronym':
                new = 'DID' + trailing_punct(text)
                if new != text:
                    w['text'] = new
                    did_changes += 1
            elif kind == 'ambiguous':
                ambiguous.append(i)
    return out_changes, did_changes, ambiguous

# Process all files
totals_other = 0
totals_did = 0
ambiguous_dump = []  # (file, idx, context-with-marker)

for fn in sorted(os.listdir(DIR)):
    if not fn.endswith('.json'): continue
    path = os.path.join(DIR, fn)
    j = json.load(open(path))
    other, did, amb = fix_words(j['words'])
    totals_other += other
    totals_did += did
    for i in amb:
        lo, hi = max(0, i-6), min(len(j['words']), i+7)
        ctx = ' '.join(('[' + w['text'] + ']') if k == i else w['text'] for k, w in enumerate(j['words'][lo:hi], start=lo))
        ambiguous_dump.append((fn[:-5], i, ctx))
    if not DRY and (other or did):
        with open(path, 'w') as f: json.dump(j, f, indent=2)

print(f"{'DRY' if DRY else 'APPLIED'} — single-token/domain fixes: {totals_other}, DID acronym fixes: {totals_did}, ambiguous to review: {len(ambiguous_dump)}")

# Always dump ambiguous list to a file the user can scan
out = './work/did-ambiguous-review.txt'
with open(out, 'w') as f:
    f.write('# Ambiguous "did" cases — please mark each with [k] (keep as verb) or [d] (change to DID)\n')
    f.write('# Format:  event_id @word_index  context (target marked with [brackets])\n\n')
    for ev, i, ctx in ambiguous_dump:
        f.write(f'/event/{ev} @{i}  ...{ctx}...\n')
print(f'ambiguous dump → {out}')
