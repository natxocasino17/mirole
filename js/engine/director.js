// MIROLE — el Director. No hay guion infinito: hay un sistema que te lee.
// Lee tu dinero, tu estrés, las lealtades y los secretos de tu gente, y
// genera la siguiente escena de tu vida. La traición jamás sale de un
// dado: sale de un secreto que siempre estuvo ahí, más la ocasión.
import { G, queueEvent, onceDone } from './state.js';
import { chance, pick } from './rng.js';
import { aliveSquad, player } from './chars.js';
import { DAILY_POOL, MYTHIC_POOL, EVENTS } from '../data/events.js';
import { pickSideQuest, SIDEQUESTS } from '../data/sidequests.js';

export function dailyTick() {
  const p = player();
  if (!p) return;

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
