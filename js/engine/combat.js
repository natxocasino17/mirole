// MIROLE — combate por turnos. La violencia pesa: dos balas bien puestas
// matan a cualquiera, las armas se encasquillan según su estado real,
// el miedo desarma a los flojos y las heridas dejan secuelas de por vida.
// El primer nombre de la dinastía no muere de una bala perdida: se
// convierte en mito (malherido o coma). Los demás... los demás sí.
import { G, log, save, journal } from './state.js';
import { rand, rint, chance, pick } from './rng.js';
import { WEAPONS, GOODS, LOOT_GOODS, mkGood, mkWeapon } from '../data/items.js';
import { addXp, addStress, applyWound, activeSquad, buryChar } from './chars.js';
import { INTIM_LINES, FAREWELLS } from '../data/dialogs.js';

export let C = null;
let onUpdate = () => {};
export function setOnUpdate(fn) { onUpdate = fn; }

function pcUnit(ch) {
  return {
    kind: 'pc', id: ch.id, name: ch.alias || ch.name, ch,
    hp: ch.hp, hpMax: ch.hpMax, sk: ch.skills,
    w: ch.gear.weapon, blanca: ch.gear.blanca,
    rank: 'f', cover: false, shaken: 0, jam: false,
    out: false, fled: false, dead: false
  };
}

export function startCombat(opts) {
  // soloPlayer: duelos. Un hombre, un camino, ningún testigo que ayude.
  const roster = opts.soloPlayer
    ? activeSquad().filter(c => c.id === G.player)
    : activeSquad();
  const pcs = roster.map(pcUnit);
  const foes = opts.foes;
  // Nombres repetidos se numeran: "Matón" y "Matón II" mueren distinto.
  const seen = {};
  for (const f of foes) {
    seen[f.name] = (seen[f.name] || 0) + 1;
    if (seen[f.name] > 1) f.name += ' ' + 'II III IV V'.split(' ')[seen[f.name] - 2];
  }
  C = {
    title: opts.title || 'Tiroteo', units: [...pcs, ...foes],
    nFoes0: foes.length, round: 0, order: [], idx: -1, active: null,
    log: [], onEnd: opts.onEnd || null,
    canFlee: opts.canFlee !== false, canPay: !!opts.canPay,
    intim: false, over: false, result: null,
    loot: 0, kills: 0, deaths: [], lootItems: []
  };
  C.units.forEach((u, i) => u.uid = i);
  if (opts.intro) clog(opts.intro);
  nextRound();
  proceed();
}

function clog(t) { C.log.push(t); if (C.log.length > 60) C.log.shift(); }
export const foesAlive = () => C.units.filter(u => u.kind === 'en' && !u.dead && !u.fled);
export const pcsAlive = () => C.units.filter(u => u.kind === 'pc' && !u.dead && !u.out && !u.fled);
const dist = (a, b) => (a.rank === 'b' ? 1 : 0) + (b.rank === 'b' ? 1 : 0);

function nextRound() {
  C.round++;
  C.order = C.units
    .filter(u => !u.dead && !u.out && !u.fled)
    .map(u => ({ u, i: u.sk.reflejos + rint(0, 20) }))
    .sort((a, b) => b.i - a.i)
    .map(o => o.u);
  C.idx = -1;
}

function proceed() {
  for (;;) {
    if (checkEnd()) { onUpdate(); return; }
    C.idx++;
    if (C.idx >= C.order.length) { nextRound(); continue; }
    const u = C.order[C.idx];
    if (u.dead || u.out || u.fled) continue;
    if (u.kind === 'en') { foeAct(u); continue; }
    C.active = u;
    onUpdate();
    return;
  }
}

function endTurn() {
  const u = C.active;
  if (u && u.shaken > 0) u.shaken--;
  C.active = null;
  proceed();
}

function checkEnd() {
  if (C.over) return true;
  if (!foesAlive().length) { winCombat(); return true; }
  if (!pcsAlive().length) { loseCombat(); return true; }
  return false;
}

// ---------- el disparo: cada bala es una decisión ----------
function fireShot(att, tgt, aimed) {
  const w = att.w, wd = WEAPONS[w.def];
  // Encasquillamiento: el porcentaje de estado del arma decide, a mitad de turno.
  const jamP = wd.jam + Math.max(0, 70 - w.dur) * 0.004;
  if (chance(jamP)) {
    att.jam = true;
    w.dur = Math.max(0, w.dur - 2);
    clog(`✦ ¡El arma de ${att.name} se encasquilla!`);
    return;
  }
  w.load--;
  w.dur = Math.max(0, w.dur - 1);
  if (w.dur === 0 && !w.broken) { w.broken = true; clog(`✦ ${wd.name} de ${att.name} se ROMPE con un chasquido feo.`); return; }
  if (att.kind === 'pc') { G.stats.shots++; addXp(att.ch, 'punteria', 1); }

  const d = dist(att, tgt);
  let acc = wd.acc + att.sk.punteria * 0.5 + (aimed ? 15 : 0) + (wd.mods ? wd.mods[d] : 0)
          - (tgt.cover ? 20 : 0) - (att.shaken ? 20 : 0);
  if (att.kind === 'pc') {
    if (att.ch.stress > 70) acc -= 10;
    if (att.ch.wounds.some(x => x.includes('Brazo'))) acc -= 5;
  }
  acc = Math.max(5, Math.min(95, acc));

  if (rand() * 100 > acc) {
    clog(`${att.name} dispara a ${tgt.name}. La bala astilla madera.`);
    return;
  }
  const r = rint(1, 100);
  let dmg = rint(wd.dmg[0], wd.dmg[1]);
  let where = 'el torso';
  if (r > 85) { dmg *= 2; where = 'la cabeza'; }
  else if (r > 50) { dmg = Math.max(1, dmg - 1); where = pick(['el brazo', 'la pierna', 'el hombro']); }
  hit(att, tgt, dmg, where);
}

function meleeHit(att, tgt) {
  const bd = WEAPONS[att.blanca.def];
  let acc = bd.acc + att.sk.punteria * 0.4 - (tgt.cover ? 10 : 0) - (att.shaken ? 15 : 0);
  acc = Math.max(10, Math.min(95, acc));
  if (att.kind === 'pc') addXp(att.ch, 'reflejos', 1);
  if (rand() * 100 > acc) { clog(`${att.name} lanza el acero. ${tgt.name} se aparta.`); return; }
  hit(att, tgt, rint(bd.dmg[0], bd.dmg[1]), pick(['el costado', 'el brazo', 'el vientre']));
}

function hit(att, tgt, dmg, where) {
  tgt.hp -= dmg;
  clog(`● ${att.name} alcanza a ${tgt.name} en ${where} (−${dmg}).`);
  if (tgt.kind === 'pc') {
    tgt.ch.hp = Math.max(0, tgt.hp);
    addStress(tgt.ch, 4);
  }
  if (tgt.hp <= 0) { down(att, tgt); return; }
  // Secuelas: sobrevivir a un tiro en la pierna se paga toda la vida.
  if (tgt.kind === 'pc' && dmg >= 3 && (where.includes('pierna') || where.includes('brazo') || where.includes('hombro')) && chance(0.35)) {
    applyWound(tgt.ch, where);
  }
}

function down(att, tgt) {
  if (tgt.kind === 'en') {
    tgt.dead = true;
    C.kills++;
    C.loot += rint(tgt.loot[0], tgt.loot[1]);
    clog(`✝ ${tgt.name} cae. No se levanta.`);
    if (att.kind === 'pc') { G.stats.kills++; addStress(att.ch, 2); }
    // Moral: ver caer a los tuyos rompe a los flojos.
    const fallen = C.nFoes0 - foesAlive().length;
    if (fallen >= Math.ceil(C.nFoes0 / 2)) {
      for (const f of foesAlive()) {
        if (f.sk.voluntad < 40 && chance(0.35)) { f.fled = true; clog(`${f.name} huye entre el polvo.`); }
      }
    }
    return;
  }
  // Un PC cae: el destino decide, con reglas.
  destino(tgt);
}

function destino(u) {
  const isPlayer = u.ch.id === G.player;
  const r = rand();
  u.hp = 0;
  u.ch.hp = 1;
  for (const p of pcsAlive()) if (p !== u) addStress(p.ch, 8);
  if (isPlayer && !G.flags.mythBroken) {
    // El primer nombre no muere de una bala perdida. Se convierte en mito.
    u.out = true;
    if (r < 0.55) {
      u.ch.recoverUntil = G.time.day + rint(8, 18);
      applyWound(u.ch, pick(['pierna', 'brazo', 'torso']));
      clog(`✦ ${u.name} cae. Malherido. Pero los tipos como él no mueren así.`);
    } else {
      u.ch.recoverUntil = G.time.day + rint(18, 35);
      clog(`✦ ${u.name} cae y no se mueve. Respirará. Algún día despertará.`);
      journal('Caíste. El mundo siguió sin ti unos días. Cuando despertaste, ya eras una historia que se cuenta bajito.');
      G.rep.fama = Math.min(100, G.rep.fama + 4);
    }
    return;
  }
  if (r < 0.3) {
    u.dead = true;
    const line = pick(FAREWELLS);
    clog(`✝ ${u.name} cae. ${line}`);
    C.deaths.push({ ch: u.ch, line });
    buryChar(u.ch, `Tiroteo — ${C.title}`, line);
    for (const p of pcsAlive()) addStress(p.ch, 12);
  } else if (r < 0.75) {
    u.out = true;
    u.ch.recoverUntil = G.time.day + rint(7, 21);
    applyWound(u.ch, pick(['pierna', 'brazo', 'torso']));
    clog(`${u.name} cae malherido. Fuera del baile, pero respira.`);
  } else {
    u.out = true;
    u.ch.recoverUntil = G.time.day + rint(2, 5);
    clog(`${u.name} cae inconsciente. Tiene la cabeza dura.`);
  }
}

// ---------- IA enemiga ----------
function foeAct(u) {
  if (u.shaken > 0) u.shaken--;
  const targets = pcsAlive();
  if (!targets.length) return;
  if (u.jam) { u.jam = false; clog(`${u.name} pelea con el mecanismo de su arma.`); return; }
  const wd = WEAPONS[u.w.def];
  if (wd.type === 'blanca') {
    if (u.rank === 'b') { u.rank = 'f'; u.cover = false; clog(`${u.name} se abalanza.`); return; }
    const front = targets.filter(t => t.rank === 'f');
    if (!front.length) { clog(`${u.name} ronda buscando un hueco.`); return; }
    meleeHit(u, pick(front));
    return;
  }
  if (u.w.broken) { clog(`${u.name} tira su arma rota y maldice a su madre.`); u.fled = chance(0.5); return; }
  if (u.w.load <= 0) { u.w.load = wd.mag; clog(`${u.name} recarga a toda prisa.`); return; }
  if (!u.cover && chance(0.3)) { u.cover = true; clog(`${u.name} se pone a cubierto.`); return; }
  const open = targets.filter(t => !t.cover);
  const tgt = (open.length && chance(0.7)) ? pick(open) : pick(targets);
  fireShot(u, tgt, false);
}

// ---------- acciones del jugador ----------
function isPcTurn() { return C && !C.over && C.active && C.active.kind === 'pc'; }

export function actShoot(uid, aimed) {
  if (!isPcTurn()) return;
  const u = C.active, t = C.units[uid];
  if (!t || t.dead || t.fled || !u.w || u.w.broken || u.jam || u.w.load <= 0) return;
  fireShot(u, t, aimed);
  endTurn();
}
export function actMelee(uid) {
  if (!isPcTurn()) return;
  const u = C.active, t = C.units[uid];
  if (!t || t.dead || t.fled || !u.blanca || dist(u, t) !== 0) return;
  meleeHit(u, t);
  endTurn();
}
export function actCover() { if (!isPcTurn()) return; C.active.cover = true; clog(`${C.active.name} se pone a cubierto.`); endTurn(); }
export function actMove() {
  if (!isPcTurn()) return;
  const u = C.active;
  u.rank = u.rank === 'f' ? 'b' : 'f';
  u.cover = false;
  clog(`${u.name} ${u.rank === 'b' ? 'retrocede buscando distancia' : 'avanza hacia el plomo'}.`);
  endTurn();
}
export function actReload() {
  if (!isPcTurn()) return;
  const u = C.active, wd = WEAPONS[u.w.def];
  const need = wd.mag - u.w.load;
  const have = G.ammo[wd.ammo] || 0;
  const put = Math.min(need, have);
  if (put <= 0) { clog(`${u.name} palpa el cinto: no quedan ${wd.ammo}.`); endTurn(); return; }
  G.ammo[wd.ammo] -= put;
  u.w.load += put;
  clog(`${u.name} recarga (${u.w.load}/${wd.mag}).`);
  endTurn();
}
export function actUnjam() {
  if (!isPcTurn()) return;
  C.active.jam = false;
  clog(`${C.active.name} desencasquilla el arma con un golpe seco.`);
  endTurn();
}
export function actItem(stashIdx) {
  if (!isPcTurn()) return;
  const it = G.stash[stashIdx];
  if (!it || it.kind !== 'good' || !GOODS[it.def].heal) return;
  const u = C.active;
  u.hp = Math.min(u.hpMax, u.hp + GOODS[it.def].heal);
  u.ch.hp = u.hp;
  G.stash.splice(stashIdx, 1);
  clog(`${u.name} se venda a lo bruto (+${GOODS[it.def].heal}).`);
  endTurn();
}
export function actIntim(lineIdx) {
  if (!isPcTurn() || C.intim || C.round > 1) return;
  C.intim = true;
  const line = INTIM_LINES[lineIdx] || INTIM_LINES[0];
  const threshold = 35 + G.rep.fama / 4 + (G.rep.humanidad < 30 ? 10 : 0);
  clog(`${C.active.name}: ${line}`);
  let hitAny = false;
  for (const f of foesAlive()) {
    if (f.sk.voluntad < threshold) { f.shaken = 2; hitAny = true; }
  }
  clog(hitAny ? 'El aire se congela. Algunas manos empiezan a temblar.' : 'Nadie pestañea. Mal público.');
  addXp(C.active.ch, 'labia', 2);
  endTurn();
}
export function actFlee() {
  if (!isPcTurn() || !C.canFlee) return;
  const team = pcsAlive();
  const avg = team.reduce((n, p) => n + p.sk.reflejos, 0) / team.length;
  if (avg + rint(0, 20) >= 50) {
    clog('Os fundís entre el polvo y los callejones.');
  } else {
    clog('La huida es torpe. El plomo os despide.');
    for (const f of foesAlive()) { const t = pick(pcsAlive()); if (t) fireShot(f, t, false); }
  }
  for (const p of pcsAlive()) p.fled = true;
  G.rep.fama = Math.max(0, G.rep.fama - 2);
  C.over = true; C.result = 'fled';
  syncBack();
  onUpdate();
}
export function actPay() {
  if (!isPcTurn() || !C.canPay) return;
  const cut = Math.ceil(G.money / 2);
  G.money -= cut;
  clog(`Levantas las manos. Pagas $${cut}. Nadie muere hoy. Nadie olvida hoy.`);
  G.rep.fama = Math.max(0, G.rep.fama - 4);
  for (const c of activeSquad()) if (c.id !== G.player) c.loyalty = Math.max(0, c.loyalty - 3);
  C.over = true; C.result = 'paid';
  syncBack();
  onUpdate();
}

// ---------- final ----------
function syncBack() {
  for (const u of C.units) if (u.kind === 'pc' && !u.dead) u.ch.hp = Math.max(1, u.hp);
}

function winCombat() {
  C.over = true; C.result = 'win';
  syncBack();
  G.money += C.loot;
  G.stats.earned += C.loot;
  const scav = rint(2, 7);
  G.ammo.balas += scav;
  clog(`Registráis los cuerpos: $${C.loot} y ${scav} balas.`);
  if (chance(0.12)) {
    const g = pick(LOOT_GOODS);
    G.stash.push(mkGood(g));
    C.lootItems.push(GOODS[g].name);
  }
  // El drop del 0.05%: quizá tardes años. Ese día temblará el pulso.
  if (chance(0.0005)) {
    G.stash.push(mkGood('moneda_marcada'));
    C.lootItems.push('★ Moneda marcada');
    journal('En el bolsillo de un muerto: una moneda marcada. El dedo te pide guardarla. La guardas.');
  }
  G.rep.fama = Math.min(100, G.rep.fama + 1 + Math.floor(C.kills / 2));
}

function loseCombat() {
  C.over = true; C.result = 'lose';
  syncBack();
  const cut = Math.ceil(G.money / 2);
  G.money -= cut;
  clog(`Todo se vuelve negro. Despertáis desplumados: −$${cut}.`);
}

export function finish() {
  const result = C.result, cb = C.onEnd, deaths = C.deaths, kills = C.kills, lootItems = C.lootItems;
  C = null;
  save();
  if (cb) cb(result, { deaths, kills, lootItems });
}
