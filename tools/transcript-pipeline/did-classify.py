"""Classify each 'did'/'Did' token as atproto-acronym vs verb-of-do.

Strategy: a token is acronym if its ±5-word window contains atproto tech
context; verb if its immediate predecessor is a typical verb-subject
(I/we/you/he/she/they/who/what/where/when/why/how/that/nobody/etc.) or it
sits inside a "did + bare-infinitive" pattern. Anything else → ambiguous.

The strict verb check is on the previous word; the acronym check is broader.
Verb takes precedence (because it's the more frequent overall use) only when
no tech terms appear in the window.
"""
import json, os, re, sys
from collections import Counter, defaultdict

DIR = './atmosphereconf-site/src/content/transcripts'

TECH_TERMS = {
    'plc', 'web', 'key', 'document', 'identity', 'identifier', 'handle',
    'pds', 'repo', 'repository', 'atproto', 'lexicon', 'collection', 'record',
    'rkey', 'cid', 'uri', 'namespace', 'method', 'resolution', 'resolver',
    'decentralized', 'decentralised', 'ats', 'at-proto', 'didn',  # 'didn' captures didn't via core()
    'methods', 'document', 'documents',
    # Names of the form did:* — show up surrounding the word
    'didplc', 'didweb', 'didkey',
}
# Strong: firm subject pronouns / question words — almost always verb context
VERB_PREDECESSORS_STRONG = {
    'i','we','you','they','he','she','who','what','where','when','why','how',
    'someone','nobody','anybody','everyone','everybody','never','always',
    'people','users','user','team','company',
}
# Weak: usually verb but can introduce DID acronym ("this DID document", "the DID")
# So weak predecessors only get verb classification if window has NO tech terms.
VERB_PREDECESSORS_WEAK = {
    'that','which','it','one','and','but','so','or',
    'what.','what?','how?','why?','so,','but,','and,',
}
# Words *following* 'did' that strongly signal verb usage
VERB_FOLLOWERS = {
    'not', "n't", 'you', 'i', 'we', 'they', 'he', 'she',
    'something', 'anything', 'nothing', 'some',
}

def core(s): return re.sub(r'^[^A-Za-z0-9]+|[^A-Za-z0-9]+$', '', s).lower()

def classify(words, i):
    """Return ('acronym', 'verb', or 'ambiguous')."""
    w = words[i]
    text = w['text']
    if core(text) != 'did': return None

    prev = core(words[i-1]['text']) if i > 0 else ''
    nxt  = core(words[i+1]['text']) if i + 1 < len(words) else ''

    # Wider window first — acronym signal can override anything weaker
    lo, hi = max(0, i-5), min(len(words), i+6)
    window = [core(words[k]['text']) for k in range(lo, hi) if k != i]
    has_tech = any(t in window for t in TECH_TERMS)
    has_did_prefix = any(words[k]['text'].lower().startswith('did:') for k in range(lo, hi))

    # Strong verb signals always win UNLESS clear tech context (e.g. "I did
    # a thing with the DID" is still verb; "We did need a DID document" is
    # awkward and the next-token heuristic catches it).
    if prev in VERB_PREDECESSORS_STRONG:
        return 'verb'
    if nxt in VERB_FOLLOWERS:
        return 'verb'

    # Tech context wins next — even if weak predecessor like "this"/"that".
    if has_tech or has_did_prefix:
        return 'acronym'

    # Determiner-style predecessors with no tech context: usually acronym ("the DID")
    if prev in ('the', 'your', 'my', 'their', 'a', 'this', 'each', 'every'):
        return 'acronym'

    # Weak verb predecessor + no tech context: lean verb
    if prev in VERB_PREDECESSORS_WEAK:
        return 'verb'

    return 'ambiguous'

# Tally + sample
counts = Counter()
samples = defaultdict(list)
per_file = defaultdict(lambda: Counter())

for fn in sorted(os.listdir(DIR)):
    if not fn.endswith('.json'): continue
    j = json.load(open(os.path.join(DIR, fn)))
    words = j['words']
    for i, w in enumerate(words):
        if core(w['text']) != 'did': continue
        kind = classify(words, i)
        if kind is None: continue
        counts[kind] += 1
        per_file[fn][kind] += 1
        if len(samples[kind]) < 8:
            lo, hi = max(0, i-5), min(len(words), i+6)
            ctx = ' '.join(words[k]['text'] for k in range(lo, hi))
            samples[kind].append(f'{fn[:-5]:<20} «{w["text"]}» → ...{ctx}...')

print(f'Counts: {dict(counts)}\n')
for kind in ('acronym', 'verb', 'ambiguous'):
    print(f'\n=== {kind.upper()} samples ({counts[kind]} total) ===')
    for s in samples[kind][:8]:
        print(f'  {s}')

print('\n=== files with most ambiguous (need manual review) ===')
amb_per_file = [(fn, per_file[fn]['ambiguous']) for fn in per_file if per_file[fn]['ambiguous']]
for fn, n in sorted(amb_per_file, key=lambda x:-x[1])[:8]:
    print(f'  {fn:<22} {n:>3} ambiguous')
