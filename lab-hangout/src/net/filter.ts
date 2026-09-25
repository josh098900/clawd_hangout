// A small client-side word filter for everything people type (names, chat, kanban notes).
// It is a first line of defence only: anyone can bypass client code. Chat and names are also
// filtered on the server (0002_security.sql); notes and the whiteboard only get this one. Matches
// are masked, not dropped.

// Stems, with common look-alike swaps handled below. Kept short on purpose: false positives
// ("Scunthorpe") are worse than misses in a friendly room, so only whole-word-ish matches.
const STEMS = [
  'fuck', 'shit', 'cunt', 'bitch', 'whore', 'slut', 'pussy', 'bastard', 'wank', 'twat', 'asshole',
  'nigg', 'fag', 'retard', 'tranny', 'kike', 'dyke', 'nazi',
];
const SWAP: Record<string, string> = { a: '[a@4]', e: '[e3]', i: '[i1!|]', o: '[o0]', s: '[s$5]', t: '[t7]', g: '[g9]' };
const RX = new RegExp('\\b(' + STEMS.map((w) => [...w].map((c) => (SWAP[c] ?? c) + '+').join('[\\W_]*')).join('|') + ')\\w*', 'gi');

/** Mask anything on the list with asterisks. */
const ALLOW = new Set(['shiitake', 'shiitakes', 'fagioli']);
export function scrub(s: string): string {
  return s.replace(RX, (m) => (ALLOW.has(m.toLowerCase()) ? m : '*'.repeat(Math.min(m.length, 8))));
}

/** Token bucket per (sender, kind): drop floods from any one client. */
const buckets = new Map<string, { t: number; n: number }>();
export function allow(id: string, kind: string, perSec: number, burst: number): boolean {
  const k = id + '|' + kind, now = performance.now() / 1000, b = buckets.get(k) ?? { t: now, n: burst };
  b.n = Math.min(burst, b.n + (now - b.t) * perSec); b.t = now;
  if (b.n < 1) { buckets.set(k, b); return false; }
  b.n -= 1; buckets.set(k, b); return true;
}
