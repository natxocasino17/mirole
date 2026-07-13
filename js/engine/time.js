// MIROLE — el tiempo pasa de verdad. Los días curan despacio, las
// semanas cuestan dinero y los años pasan factura a los huesos.
import { G, save, log, journal, yearOf } from './state.js';
import { aliveSquad, player, ageOf } from './chars.js';
import * as D from './director.js';

export function advanceDays(n, opts = {}) {
  for (let i = 0; i < n; i++) {
    G.time.day++;
    G.stats.days++;
    for (const ch of aliveSquad()) {
      ch.hp = Math.min(ch.hpMax, ch.hp + (opts.rest ? 2 : 1));
      if (opts.rest) {
        const heal = ch.traits.includes('insomne') ? 4 : 8;
        ch.stress = Math.max(0, ch.stress - heal);
      }
      if (ch.recoverUntil && G.time.day >= ch.recoverUntil) {
        ch.recoverUntil = 0;
        log(`${ch.id === G.player ? 'Vuelves' : (ch.alias || ch.name) + ' vuelve'} a estar en pie. Más o menos.`);
      }
    }
    if (G.time.day - G.time.lastUpkeep >= 7) upkeep();
    if ((G.time.day - 1) % 360 === 0) newYear();
    if (opts.travel) D.travelDay();
    D.dailyTick();
  }
  save();
}

export function restDay() {
  advanceDays(1, { rest: true });
  log('Duermes. El techo tiene goteras, pero es TU gotera.');
}

// Sumidero de dinero: mantener gente viva es caro. Así debe ser.
function upkeep() {
  G.time.lastUpkeep = G.time.day;
  const squad = aliveSquad();
  const wages = squad.filter(c => c.id !== G.player).reduce((n, c) => n + c.salario, 0)
    + (G.flags.ward_tobias ? 1 : 0);
  const food = squad.length * 2 + G.pets.length + (G.horse ? G.horse.tier : 0);
  const total = wages + food;
  if (G.money >= total) {
    G.money -= total;
    log(`Pagas la semana: $${wages} en soldadas, $${food} en comida.`);
  } else {
    G.money = 0;
    log('No hay para pagar la semana. Las miradas en la mesa pesan.');
    for (const c of squad) {
      if (c.id !== G.player) c.loyalty = Math.max(0, c.loyalty - 8);
    }
    G.flags.hambre = (G.flags.hambre || 0) + 1;
  }
}

function newYear() {
  const y = yearOf(G.time.day);
  log(`Cambia el año. ${y}. El territorio no se da ni cuenta.`);
  journal(`Empieza ${y}. Seguimos aquí. No todos, pero seguimos.`);
  for (const ch of aliveSquad()) {
    const age = ageOf(ch);
    if (age >= 45) {
      ch.skills.reflejos = Math.max(15, ch.skills.reflejos - 1);
      if (age >= 55) {
        ch.skills.vigor = Math.max(15, ch.skills.vigor - 1);
        if (age % 2 === 0) ch.skills.punteria = Math.max(15, ch.skills.punteria - 1);
      }
      if (ch.id === G.player) log('Al levantarte, los huesos opinan. Ninguno a favor.');
    }
  }
  // El mundo avanza aunque nadie se lo pida: progreso, año a año.
  const era = y - G.time.startYear;
  if (era === 3) journal('Dicen que en Blackvein ya hay teléfono en el banco. Un cable que lleva voces. Brujería con acciones.');
  if (era === 6) journal('Ha llegado el primer automóvil al territorio. Los caballos no están impresionados. Tú tampoco. (Un poco sí.)');
  if (era === 10) journal('El ferrocarril cruza ya el desierto entero. El Oeste que conociste se está muriendo con elegancia.');
}
