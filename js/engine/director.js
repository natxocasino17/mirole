// MIROLE — el Director. No hay guion infinito: hay un sistema que te lee.
// Lee tu dinero, tu estrés, las lealtades y los secretos de tu gente, y
// genera la siguiente escena de tu vida. La traición jamás sale de un
// dado: sale de un secreto que siempre estuvo ahí, más la ocasión.
import { G, queueEvent, onceDone, yearOf } from './state.js';
import { chance, pick } from './rng.js';
import { aliveSquad, player } from './chars.js';
import { DAILY_POOL, MYTHIC_POOL, EVENTS } from '../data/events.js';
import { pickSideQuest } from '../data/sidequests.js';
import { tomo1Check } from '../data/tomo1.js';
import { ensureTerritory, empireUnlocked, drift } from './empire.js';
import { ensureHearts, shouldIntroduce, heartsTick } from './hearts.js';

export function dailyTick() {
  const p = player();
  if (!p) return;

  // La novela avanza: ¿toca capítulo nuevo?
  tomo1Check();

  // El Tomo II: al cerrar el Tomo I, se abre la guerra de facciones.
  if (empireUnlocked()) {
    ensureTerritory();
    drift();
    if (!G.flags.t2intro) { G.flags.t2intro = true; queueEvent('t2_intro'); }
  }

  // 🎪 Cada dos semanas, el pueblo respira: día de feria.
  if (G.time.day % 14 === 0) queueEvent('feria');

  // 📰 El Courier sale cada mes: tu leyenda, mal escrita por otros.
  if (G.time.day % 7 === 6) queueEvent('periodico');

  // 📅 Aniversarios: el tiempo es circular para los que recuerdan.
  const doy = (G.time.day - 1) % 360 + 1;
  const yr = yearOf(G.time.day);
  const sam = G.cemetery.find(t => t.name === 'Sam Corddry');
  if (sam) {
    const sdoy = (sam.day - 1) % 360 + 1;
    if (doy === sdoy && G.time.day > sam.day + 30 && G.flags.anivSam !== yr) {
      G.flags.anivSam = yr;
      queueEvent('aniversario_sam');
    }
  }
  if (G.flags.bday === doy && G.flags.bdayYr !== yr && G.time.day > 30) {
    G.flags.bdayYr = yr;
    queueEvent('cumpleanos');
  }

  // 🔥 La fogata: la banda se pertenece también sin ti.
  if (aliveSquad().filter(c => c.id !== G.player).length >= 2 && chance(0.08)) queueEvent('fogata');

  // ❤ Vínculos abiertos: la gente aparece orgánicamente. Nadie escrito.
  ensureHearts();
  heartsTick();
  if (G.time.day > 10 && shouldIntroduce()) queueEvent('conoces_alguien');

  // ☠️ Las némesis vencen su plazo y vienen a cobrarlo.
  for (const nm of G.nemeses || []) {
    if (G.time.day >= nm.due && !nm.waiting) {
      nm.waiting = false; // se limpia al resolverse; el dedupe de pending evita duplicados
      queueEvent('nemesis:' + nm.id);
      nm.due = G.time.day + 5; // reintento suave si el evento no llegó a verse
    }
  }

  // Crisis interior: el estrés alto engendra pesadillas.
  if (p.stress >= 85) queueEvent('pesadilla');

  // Semillas de traición honesta: secreto + ocasión + resentimiento.
  for (const ch of aliveSquad()) {
    if (ch.id === G.player || !ch.secret) continue;
    const broke = G.money < 15;
    if (ch.secret === 'codicioso' && broke && ch.loyalty < 45 && chance(0.2)) {
      queueEvent(`codicia:${ch.id}`);
    }
    if (ch.secret === 'buscado' && G.fac.ley >= 15 && chance(0.1)) {
      queueEvent(`buscado:${ch.id}`);
    }
  }

  // Un día cualquiera en Red Marrow.
  if (chance(0.12)) {
    const pool = DAILY_POOL.filter(id => {
      const ev = EVENTS[id];
      return ev && !(ev.once && onceDone(id)) && (!ev.cond || ev.cond(G));
    });
    if (pool.length) queueEvent(pick(pool));
  }

  // El hilo de Dawson: la promesa no prescribe.
  if (!G.flags.dawson && G.time.day >= 18) {
    G.flags.dawson = 1;
    queueEvent('rumor_dawson');
  }

  // Historias del territorio: únicas, ofrecidas de tanto en tanto.
  if (!G.sideOffer && G.time.day - G.sideDay >= 6 && chance(0.4)) {
    const id = pickSideQuest();
    if (id) {
      G.sideOffer = id;
      G.sideDay = G.time.day;
      queueEvent('rumor_historia');
    }
  }

  // Telón de temporada: contenido de autor agotado → avisar, no adelgazar.
  if (!onceDone('fin_temporada') && G.flags.dawson === 3 && G.stats.jobs >= 25) {
    queueEvent('fin_temporada');
  }
}

// En los caminos vive lo imposible. Probabilidad ínfima a propósito:
// puede que tardes AÑOS en ver uno de estos. Ese día lo recordarás.
export function travelDay() {
  if (chance(0.004)) {
    const pool = MYTHIC_POOL.filter(id => !onceDone(id));
    if (pool.length) queueEvent(pick(pool));
  }
}

// Al volver tras días fuera del juego: el mundo se movió un poco.
// Nunca en tu contra — nadie muere sin ti. Pero llega correo.
export function awayCatchup() {
  const days = (Date.now() - G.meta.lastPlayed) / 86400000;
  if (days >= 2) queueEvent('mientras_fuera');
}
