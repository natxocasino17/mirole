// MIROLE — personajes. Cada uno es una persona: skills que suben POR
// USARLAS (no por menús), estrés que deja traumas, heridas que dejan
// secuelas permanentes, edad que pasa factura, y secretos que un día
// pueden costarte caro. El arco de mejora es largo: de don nadie a
// leyenda hay años, no semanas.
import { G, log, journal, yearOf, queueEvent } from './state.js';
import { rint, pick, chance } from './rng.js';
import { mkWeapon, ROPA } from '../data/items.js';
import { FIRST, LAST, APODOS, TRAITS, SECRETS, BIO_ORIGIN, BIO_WOUND, BIO_QUIRK } from '../data/names.js';

export const SKILLS = ['punteria', 'reflejos', 'voluntad', 'vigor', 'labia', 'sigilo'];
export const SKILL_NAMES = {
  punteria: 'Puntería', reflejos: 'Reflejos', voluntad: 'Voluntad',
  vigor: 'Vigor', labia: 'Labia', sigilo: 'Sigilo'
};
export const SKILL_CAP = 90;

function nid() { return G.meta.nextId++; }

function makeChar(o) {
  return Object.assign({
    id: nid(), name: '', alias: '', role: 'pistolero',
    birthYear: 1873, hp: 6, hpMax: 6, stress: 0,
    skills: { punteria: 30, reflejos: 30, voluntad: 35, vigor: 35, labia: 25, sigilo: 25 },
    xp: {}, traits: [], wounds: [], secret: null,
    loyalty: 50, salario: 0, bioTier: 0,
    gear: { weapon: null, blanca: null },
    ropa: { sombrero: null, gabardina: null, botas: null, accesorio: null },
    recoverUntil: 0, alive: true, portrait: '', sprite: ''
  }, o);
}

export function makeProtagonist(name, alias) {
  return makeChar({
    name, alias, role: 'líder',
    birthYear: G.time.startYear - 26,
    hp: 8, hpMax: 8,
    skills: { punteria: 42, reflejos: 44, voluntad: 40, vigor: 42, labia: 32, sigilo: 30 },
    gear: { weapon: mkWeapon('colt_oxidado'), blanca: mkWeapon('navaja') },
    portrait: 'assets/portraits/vane.png',
    sprite: 'assets/sprites/vane_full.png'
  });
}

export function makeEli() {
  const eli = makeChar({
    name: 'Eli Marsh', alias: 'el Diácono', role: 'escopeta',
    birthYear: G.time.startYear - 48,
    hp: 7, hpMax: 7,
    skills: { punteria: 45, reflejos: 32, voluntad: 72, vigor: 52, labia: 55, sigilo: 20 },
    traits: ['fe rota'], loyalty: 55, salario: 10,
    gear: { weapon: mkWeapon('recortada'), blanca: mkWeapon('navaja') },
    portrait: 'assets/portraits/eli.png'
  });
  eli.gear.weapon.customName = '«La Viuda»';
  return eli;
}

export function genRecruit() {
  const name = `${pick(FIRST)} ${pick(LAST)}`;
  const r = makeChar({
    name, alias: chance(0.5) ? pick(APODOS) : '',
    role: pick(['pistolero', 'rastreador', 'matón', 'tahúr']),
    birthYear: G.time.startYear + Math.floor((G.time.day - 1) / 360) - rint(20, 44),
    hp: rint(5, 7),
    skills: {
      punteria: rint(25, 55), reflejos: rint(25, 55), voluntad: rint(20, 60),
      vigor: rint(25, 55), labia: rint(15, 50), sigilo: rint(15, 55)
    },
    traits: [pick(TRAITS)], loyalty: rint(35, 55),
    gear: { weapon: mkWeapon('colt_oxidado'), blanca: null }
  });
  r.hpMax = r.hp;
  r.salario = 6 + Math.floor((r.skills.punteria + r.skills.reflejos) / 20);
  // Retratos por convención: sube assets/portraits/recruit_1.png … _8.png
  // con nano banana y las caras aparecen solas. Si falta el archivo, la
  // interfaz muestra un emoji y no pasa nada.
  r.portrait = `assets/portraits/recruit_${rint(1, 8)}.png`;
  // La traición nunca es aleatoria: nace de un secreto que siempre estuvo ahí.
  if (chance(0.25)) r.secret = pick(SECRETS);
  // Cada recluta es una novela corta: origen, herida y manía.
  // Se descubren hablando, no leyendo fichas.
  r.bio = [pick(BIO_ORIGIN), pick(BIO_WOUND), pick(BIO_QUIRK)];
  r.bioKnown = 0;
  return r;
}

// El heredero: cuando el mayor toma la gabardina. Nace con lo que le
// enseñaron — algo de la sangre, algo del apellido, todo el peso.
export function makeHeir(name, birthYear, inheritWeapon) {
  const h = makeChar({
    name, alias: '', role: 'líder',
    birthYear, hp: 8, hpMax: 8,
    skills: { punteria: 40, reflejos: 42, voluntad: 42, vigor: 42, labia: 34, sigilo: 32 },
    gear: { weapon: inheritWeapon || mkWeapon('colt_saa'), blanca: mkWeapon('bowie') },
    portrait: 'assets/portraits/vane.png', sprite: 'assets/sprites/vane_full.png'
  });
  return h;
}

// Un amigo del alma puede unirse a la banda: su vínculo se vuelve escuadra.
export function recruitFromPerson(p) {
  const r = genRecruit();
  r.name = p.name;
  r.alias = '';
  r.loyalty = 70; // ya te quieren; por eso vienen
  r.fromPerson = p.key;
  r.bio = [
    `lo conociste en ${p.where} y os hicisteis amigos antes que compañeros`,
    p.herida ? `arrastra que ${p.herida}` : 'no cuenta de dónde viene',
    p.tag || 'tiene su propia forma de mirar el mundo'
  ];
  r.bioKnown = 1; // a un amigo ya lo conoces un poco
  return r;
}

// ---------- arco de mejora: aprender haciendo ----------
export function addXp(ch, sk, n) {
  if (!ch.alive) return;
  ch.xp[sk] = (ch.xp[sk] || 0) + n;
  const need = xpNeed(ch, sk);
  if (ch.xp[sk] >= need && ch.skills[sk] < SKILL_CAP) {
    ch.xp[sk] -= need;
    ch.skills[sk]++;
    if (ch.id === G.player) log(`Tu ${SKILL_NAMES[sk].toLowerCase()} ha mejorado (${ch.skills[sk]}).`);
    else if (chance(0.4)) log(`${ch.alias || ch.name} se mueve mejor que antes.`);
  }
}
export function xpNeed(ch, sk) { return 4 + Math.floor(ch.skills[sk] / 8); }

// ---------- estrés y traumas ----------
export const TRAUMAS = [
  { id: 'mano_temblorosa', name: 'Mano temblorosa', desc: '−5 puntería. El pulso recuerda lo que la mente calla.' },
  { id: 'insomne',         name: 'Insomne',          desc: 'Descansar repara menos. Las noches son largas.' },
  { id: 'bebedor',         name: 'Bebedor',          desc: 'El whisky ayuda más… y hace más falta.' },
  { id: 'corazon_frio',    name: 'Corazón frío',     desc: 'Siente la mitad. Lo bueno y lo malo.' }
];

export function addStress(ch, n) {
  if (!ch.alive) return;
  if (ch.traits.includes('corazon_frio') && n > 0) n = Math.ceil(n / 2);
  ch.stress = Math.max(0, Math.min(100, ch.stress + n));
  if (ch.stress >= 100) crisis(ch);
}

function crisis(ch) {
  const owned = ch.traits;
  const options = TRAUMAS.filter(t => !owned.includes(t.id));
  ch.stress = 60;
  if (!options.length) return;
  const t = pick(options);
  ch.traits.push(t.id);
  if (t.id === 'mano_temblorosa') ch.skills.punteria = Math.max(15, ch.skills.punteria - 5);
  const who = ch.id === G.player ? 'Algo se ha roto dentro de ti' : `Algo se ha roto dentro de ${ch.alias || ch.name}`;
  log(`${who}: ${t.name}.`);
  journal(`${ch.name} ya no es el mismo. ${t.name}: ${t.desc}`);
}

// ---------- heridas con secuelas permanentes ----------
export function applyWound(ch, where) {
  let w;
  if (where.includes('pierna')) { w = 'Cojera (pierna)'; ch.skills.reflejos = Math.max(15, ch.skills.reflejos - 5); }
  else if (where.includes('brazo') || where.includes('hombro')) { w = 'Brazo rígido'; ch.skills.punteria = Math.max(15, ch.skills.punteria - 5); }
  else { w = 'Cicatriz profunda'; ch.skills.vigor = Math.max(15, ch.skills.vigor - 3); }
  if (!ch.wounds.includes(w)) {
    ch.wounds.push(w);
    log(`${ch.id === G.player ? 'Cargarás' : (ch.alias || ch.name) + ' cargará'} con esa herida para siempre: ${w.toLowerCase()}.`);
  }
}

// La ropa y los talismanes suman bonos pasivos pequeños pero reales.
export function bonus(ch, key) {
  let n = 0;
  if (!ch.ropa) return 0;
  for (const slot of ['sombrero', 'gabardina', 'botas', 'accesorio']) {
    const it = ch.ropa[slot];
    if (it && ROPA[it.def] && ROPA[it.def].fx) n += ROPA[it.def].fx[key] || 0;
  }
  return n;
}

// ---------- consultas ----------
export function aliveSquad() { return G.squad.map(id => G.chars[id]).filter(c => c && c.alive); }
export function activeSquad() { return aliveSquad().filter(c => !c.recoverUntil || G.time.day >= c.recoverUntil); }
export function player() { return G.chars[G.player]; }
export function ageOf(ch) { return yearOf(G.time.day) - ch.birthYear; }

export function describeHp(hp, max) {
  const r = hp / max;
  if (r >= 1) return 'Ileso';
  if (r > 0.7) return 'Rozado';
  if (r > 0.45) return 'Herido';
  if (r > 0.2) return 'Malherido';
  return 'Al borde';
}

// ---------- la muerte de verdad ----------
export function buryChar(ch, cause, epitaph) {
  ch.alive = false;
  G.cemetery.push({
    name: ch.name, alias: ch.alias,
    born: ch.birthYear, died: yearOf(G.time.day),
    cause, epitaph: epitaph || '', day: G.time.day
  });
  journal(`Hoy hemos enterrado a ${ch.name}${ch.alias ? ' «' + ch.alias + '»' : ''}. ${cause}.`);
  // Si era de la mesa, se le despide como se debe: el funeral llega
  // en cuanto se asiente el polvo.
  if (ch.id && G.chars[ch.id]) {
    G.flags.funeralFor = { id: ch.id, name: ch.name, alias: ch.alias, bio: ch.bio || [], trait: (ch.traits || [])[0] || '' };
    queueEvent('funeral');
  }
}
