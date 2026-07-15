// MIROLE — núcleo de estado. TODO el juego vive en G: un único objeto
// serializable a JSON plano. Regla de oro: nada de clases ni funciones
// dentro de G. Un guardado de 2026 debe poder abrirse en 2060, y las
// migraciones de esquema viven aquí para siempre.
import { seedRng, rngState, setRngState } from './rng.js';

export const SCHEMA = 5;
export const VERSION = '0.8.1';
const KEY = 'mirole_save';

export let G = null;
export function setG(v) { G = v; }

export function baseState() {
  return {
    schema: SCHEMA, ver: VERSION, rng: 1,
    meta: { created: Date.now(), lastPlayed: Date.now(), nextId: 1 },
    time: { day: 1, startYear: 1899, lastUpkeep: 1 },
    player: 0,
    chars: {}, squad: [],
    stash: [], money: 0, ammo: { balas: 0, cartuchos: 0 },
    rep: { fama: 0, humanidad: 55 },
    fac: { ley: 0, mineros: 0, forajidos: 0, pueblo: 0 },
    jobs: [], jobsDay: -99,
    wanted: [], wantedDay: -99,
    sideOffer: null, sideDay: -99,
    choices: [],
    bonds: {}, nemeses: [], relations: {}, territory: null,
    daily: { day: 0, whisky: 0, talks: [], clean: false, rumor: false, pet: false },
    pets: [], horse: null,
    cemetery: [], journal: [], log: [],
    flags: {}, pending: [], once: [],
    stats: { kills: 0, jobs: 0, days: 0, shots: 0, pokerWon: 0, pokerLost: 0, earned: 0 }
  };
}

export function newGame(seed) {
  G = baseState();
  G.rng = seed >>> 0;
  seedRng(G.rng);
  return G;
}

export function save() {
  if (!G) return;
  G.rng = rngState();
  G.meta.lastPlayed = Date.now();
  try { localStorage.setItem(KEY, JSON.stringify(G)); } catch (e) { console.error(e); }
}

export function load() {
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    G = migrate(JSON.parse(raw));
    setRngState(G.rng);
    return G;
  } catch (e) { console.error('Partida ilegible', e); return null; }
}

export function wipe() { localStorage.removeItem(KEY); G = null; }

export function migrate(s) {
  // Aquí viven las migraciones. Una partida de 2026 abre en 2060.
  if (s.schema === 1) {
    s.wanted = []; s.wantedDay = -99;
    s.sideOffer = null; s.sideDay = -99;
    s.choices = []; s.horse = null;
    for (const id in s.chars) {
      const c = s.chars[id];
      if (!c.ropa) c.ropa = { sombrero: null, gabardina: null, botas: null, accesorio: null };
      for (const slot of ['weapon', 'blanca']) {
        if (c.gear && c.gear[slot] && !c.gear[slot].up) c.gear[slot].up = [];
      }
    }
    for (const it of s.stash || []) if (it.kind === 'weapon' && !it.up) it.up = [];
    s.schema = 2;
  }
  if (s.schema === 2) {
    s.bonds = {};
    s.nemeses = [];
    // Cumpleaños del protagonista: determinista desde la creación de la partida.
    if (!s.flags.bday) s.flags.bday = (s.meta.created % 360) + 1;
    s.schema = 3;
  }
  if (s.schema === 3) {
    // Relaciones con la gente del pueblo: afinidad que se construye.
    s.relations = {};
    s.schema = 4;
  }
  if (s.schema === 4) {
    // La guerra de facciones del Tomo II: se activa al cerrar el Tomo I.
    s.territory = null;
    s.schema = 5;
  }
  return s;
}

// Las decisiones que pesan: el registro estilo diagrama de una vida.
export function choice(t) { G.choices.push({ d: G.time.day, t }); }

// ---------- calendario ----------
export const SEASONS = ['Primavera', 'Verano', 'Otoño', 'Invierno'];
export function yearOf(day) { return G.time.startYear + Math.floor((day - 1) / 360); }
export function seasonOf(day) { return SEASONS[Math.floor(((day - 1) % 360) / 90)]; }
export function dateStr(day) {
  day = day ?? G.time.day;
  return `Día ${((day - 1) % 90) + 1} de ${seasonOf(day)}, ${yearOf(day)}`;
}

// ---------- registro ----------
export function log(t) {
  G.log.push({ d: G.time.day, t });
  if (G.log.length > 80) G.log.splice(0, G.log.length - 80);
}
export function journal(t) { G.journal.push({ d: G.time.day, t }); }
export function queueEvent(id) { if (!G.pending.includes(id)) G.pending.push(id); }
export function onceDone(id) { return G.once.includes(id); }
export function markOnce(id) { if (!G.once.includes(id)) G.once.push(id); }

// ---------- extracción / importación (la inmortalidad del juego) ----------
export function exportSave() {
  save();
  const blob = new Blob([JSON.stringify(G, null, 1)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `mirole_${yearOf(G.time.day)}_dia${G.time.day}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

export async function importSave(file) {
  const s = migrate(JSON.parse(await file.text()));
  if (typeof s.schema !== 'number' || !s.chars) throw new Error('No parece una partida de MIROLE');
  G = s;
  setRngState(G.rng);
  save();
  return G;
}
