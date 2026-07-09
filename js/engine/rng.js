// MIROLE — RNG con semilla (mulberry32). Toda la aleatoriedad del juego
// pasa por aquí: drops del 0.05%, encasquillamientos, destino. El estado
// del RNG viaja dentro del guardado, así el azar es honesto y portable.
let s = 88675123;

export function seedRng(v) { s = (v >>> 0) || 88675123; }
export function rngState() { return s >>> 0; }
export function setRngState(v) { s = (v >>> 0) || 88675123; }

export function rand() {
  s |= 0; s = (s + 0x6D2B79F5) | 0;
  let t = Math.imul(s ^ (s >>> 15), 1 | s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export const rint = (a, b) => a + Math.floor(rand() * (b - a + 1));
export const chance = (p) => rand() < p;
export const pick = (arr) => arr[Math.floor(rand() * arr.length)];

export function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
