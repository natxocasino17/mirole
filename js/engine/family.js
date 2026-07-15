// MIROLE — familia y dinastía. El juego sobrevive al personaje: te casas,
// tienes hijos (varios, con hermanos entre ellos), envejeces y un día
// caes o te retiras — y el MAYOR hereda la gabardina, el nombre, las
// deudas y las tumbas. Así el western dura 80 años de vida real.
import { G, journal, choice, log, yearOf } from './state.js';
import { rint, pick, chance } from './rng.js';
import { player, makeHeir, buryChar } from './chars.js';
import { partner } from './hearts.js';

const NAMES_G = { m: ['Samuel', 'Eli', 'Jonah', 'Wyatt', 'Colt', 'Roy', 'Levi', 'Abel'],
                  f: ['Ada', 'Rose', 'Clara', 'Mabel', 'Della', 'June', 'Etta', 'Nell'] };

export function ensureFamily() {
  if (!G.family) G.family = { spouse: null, children: [], generation: 1 };
  if (!G.family.children) G.family.children = [];
  if (!G.family.generation) G.family.generation = 1;
}

export function married() { ensureFamily(); return !!G.family.spouse; }
export function childrenAlive() { ensureFamily(); return G.family.children.filter(c => c.alive !== false); }
export function childAge(c) { return yearOf(G.time.day) - c.birthYear; }
export function grownHeirs() { return childrenAlive().filter(c => childAge(c) >= 16).sort((a, b) => a.birthYear - b.birthYear); }
export function eldestHeir() { return grownHeirs()[0] || null; }

// Casarse: solo si tienes pareja estable. El apellido se une al tuyo.
export function marry() {
  ensureFamily();
  const pt = partner();
  if (!pt || G.family.spouse) return null;
  G.family.spouse = { key: G.relations.partner, name: pt.name, sinceDay: G.time.day };
  choice(`Me casé con ${pt.name}. En Red Marrow, prometer «hasta la muerte» es más literal que en otras partes.`);
  journal(`Boda. ${pt.name} y yo, ante quien quisiera mirar. Eli ofició — se acordaba de cómo se bendice algo, después de todo. Hoy el territorio me debe una cosa buena y, por una vez, me la pagó.`);
  return pt;
}

// Tener un hijo. Se pueden tener varios: hermanos entre sí.
export function haveChild(sex, name) {
  ensureFamily();
  sex = sex || (chance(0.5) ? 'm' : 'f');
  name = name || pick(NAMES_G[sex]);
  const kid = { name, sex, birthYear: yearOf(G.time.day), birthDay: G.time.day, alive: true };
  G.family.children.push(kid);
  const n = childrenAlive().length;
  journal(`Ha nacido ${name}. ${n === 1 ? 'El primero. El que un día llevará todo esto.' : `Ya somos ${n} de sangre. ${name} tendrá quien le enseñe a caerse: sus hermanos.`} Que el territorio sea más amable con ella de lo que fue conmigo.`);
  choice(`Nació ${name}${n === 1 ? ' — mi primogénit@, mi hereder@.' : ` — herman@ de los otros.`}`);
  return kid;
}

export function canTraspaso() {
  return !!eldestHeir();
}

// EL TRASPASO: el mayor toma el mando. Hereda dinero, alforjas, media
// fama, TODAS las enemistades y el cementerio entero. Nace una generación.
export function doTraspaso(heirRef, cause) {
  ensureFamily();
  const old = player();
  const heir = heirRef || eldestHeir();
  if (!heir) return false;
  const inheritW = old && old.gear && old.gear.weapon ? old.gear.weapon : null;
  const nh = makeHeir(heir.name, heir.birthYear, inheritW);
  nh.portrait = ''; // el heredero tiene su propia cara (o el emoji, hasta que subas una)
  G.chars[nh.id] = nh;
  // El viejo protagonista sale de la escena.
  const oldId = G.player;
  const idx = G.squad.indexOf(oldId);
  if (idx >= 0) G.squad.splice(idx, 1);
  if (old && old.alive) { old.alive = false; }
  if (old && !G.cemetery.find(t => t.name === old.name && t.died === yearOf(G.time.day))) {
    buryChar(old, cause || 'Se retiró, por fin, del oficio de sobrevivir', 'Enterró a sus amigos, crió a su sangre y pasó la gabardina. Pocos pueden decir las tres cosas.');
  }
  G.player = nh.id;
  G.squad.unshift(nh.id);
  // La herencia.
  G.rep.fama = Math.floor(G.rep.fama / 2);
  G.rep.humanidad = 50;
  G.family.generation = (G.family.generation || 1) + 1;
  // El heredero deja de ser "hijo" y pasa a ser el jugador; sus hermanos
  // siguen siendo familia.
  G.family.children = G.family.children.filter(c => c !== heir);
  G.family.spouse = null; // nueva generación, nuevo corazón por escribir
  // El cumpleaños del nuevo se recalcula; los vínculos viejos se archivan.
  G.flags.bday = (G.time.day % 360) || 1;
  G.flags.bdayYr = yearOf(G.time.day);
  if (G.relations) { G.relations.partner = null; }
  journal(`GENERACIÓN ${G.family.generation}. Hoy ${nh.name} tomó la gabardina. Todo lo que fui — el nombre, las deudas, los enemigos, las tumbas — es suyo ahora. Yo ya soy una de las historias que se cuentan bajito en «El Cuervo». No es un mal sitio para acabar.`);
  choice(`EL TRASPASO: ${nh.name} hereda. Empieza la generación ${G.family.generation} de la dinastía.`);
  log(`${nh.name} toma el mando. La sangre continúa.`);
  return nh;
}
