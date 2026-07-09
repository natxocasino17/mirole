// MIROLE — póker de cinco cartas contra la casa. El bucle de descanso:
// cinco minutos, una apuesta tensa y a seguir con tu vida. La baraja
// usa el RNG del juego: hasta las cartas son honestas aquí.
import { rint, shuffle } from './rng.js';

export const SUITS = ['♠', '♥', '♦', '♣'];
export const RANK_TXT = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };

export function newDeck() {
  const d = [];
  for (let s = 0; s < 4; s++) for (let r = 2; r <= 14; r++) d.push({ r, s });
  return shuffle(d);
}

export function deal() {
  const deck = newDeck();
  return { deck, p: deck.splice(0, 5), a: deck.splice(0, 5) };
}

export function draw(hand, discardIdx, deck) {
  for (const i of discardIdx) hand[i] = deck.pop();
  return hand;
}

// La casa juega simple: guarda parejas o mejor; si no, guarda las dos altas.
export function aiDiscards(hand) {
  const counts = {};
  for (const c of hand) counts[c.r] = (counts[c.r] || 0) + 1;
  const keepRanks = Object.keys(counts).filter(r => counts[r] >= 2).map(Number);
  const out = [];
  if (keepRanks.length) {
    hand.forEach((c, i) => { if (!keepRanks.includes(c.r)) out.push(i); });
  } else {
    const sorted = [...hand].sort((a, b) => b.r - a.r);
    const keep = new Set([sorted[0], sorted[1]]);
    hand.forEach((c, i) => { if (!keep.has(c)) out.push(i); });
  }
  return out;
}

// Devuelve [categoría, desempates...] comparables lexicográficamente.
export function score(hand) {
  const rs = hand.map(c => c.r).sort((a, b) => b - a);
  const counts = {};
  for (const r of rs) counts[r] = (counts[r] || 0) + 1;
  const groups = Object.entries(counts)
    .map(([r, n]) => ({ r: +r, n }))
    .sort((a, b) => b.n - a.n || b.r - a.r);
  const flush = hand.every(c => c.s === hand[0].s);
  const uniq = [...new Set(rs)];
  let straightHigh = 0;
  if (uniq.length === 5) {
    if (uniq[0] - uniq[4] === 4) straightHigh = uniq[0];
    else if (uniq.join() === '14,5,4,3,2') straightHigh = 5; // la rueda
  }
  const kick = groups.flatMap(g => Array(g.n).fill(g.r));
  if (flush && straightHigh) return [8, straightHigh];
  if (groups[0].n === 4) return [7, ...kick];
  if (groups[0].n === 3 && groups[1]?.n === 2) return [6, ...kick];
  if (flush) return [5, ...rs];
  if (straightHigh) return [4, straightHigh];
  if (groups[0].n === 3) return [3, ...kick];
  if (groups[0].n === 2 && groups[1]?.n === 2) return [2, ...kick];
  if (groups[0].n === 2) return [1, ...kick];
  return [0, ...rs];
}

export function cmp(a, b) {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (a[i] || 0) - (b[i] || 0);
    if (d) return d;
  }
  return 0;
}

const NAMES = ['carta alta', 'pareja', 'doble pareja', 'trío', 'escalera',
               'color', 'full', 'póker', 'escalera de color'];
export function handName(sc) { return NAMES[sc[0]]; }

export function cardTxt(c) { return (RANK_TXT[c.r] || c.r) + SUITS[c.s]; }
export function cardRed(c) { return c.s === 1 || c.s === 2; }
