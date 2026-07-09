// MIROLE — interfaz. Cinco pestañas, un HUD, escenas modales y el
// combate a pantalla completa. Todo HTML plano: sin frameworks que
// mueran, sin dependencias que caduquen.
import * as S from '../engine/state.js';
import * as T from '../engine/time.js';
import * as CB from '../engine/combat.js';
import * as JB from '../engine/jobs.js';
import * as PK from '../engine/poker.js';
import * as D from '../engine/director.js';
import { EVENTS } from '../data/events.js';
import { WEAPONS, GOODS, SHOP, mkWeapon, mkGood, itemName } from '../data/items.js';
import { HERO_NAMES } from '../data/names.js';
import { INTIM_LINES, ELI_TALKS, RECRUIT_TALKS, RUMORS, PET_LINES } from '../data/dialogs.js';
import { startPrologue } from '../data/prologue.js';
import {
  player, aliveSquad, ageOf, describeHp, addStress, addXp,
  SKILLS, SKILL_NAMES, xpNeed, TRAUMAS
} from '../engine/chars.js';
import { pick, chance } from '../engine/rng.js';

let tab = 'cantina';
let combatMode = null;   // null | 'shoot' | 'aim' | 'melee'
let pk = null;           // estado de la mesa de póker
let detailChar = null;   // ficha abierta en BANDA

const $ = id => document.getElementById(id);

export function init() {
  $('nav').addEventListener('click', e => {
    const b = e.target.closest('button[data-tab]');
    if (!b || CB.C) return;
    tab = b.dataset.tab;
    pk = null; detailChar = null;
    renderAll();
  });
  CB.setOnUpdate(renderAll);
}

// ==================== pantalla de título ====================
export function title() {
  $('hud').classList.add('hidden');
  $('nav').classList.add('hidden');
  $('ticker').innerHTML = '';
  $('screen').innerHTML = `
    <div class="titlescreen">
      <img src="assets/portraits/vane.png" alt="" onerror="this.style.display='none'">
      <h1>MIROLE</h1>
      <div class="sub">Un western personal.<br>Un juego para toda una vida.</div>
      <button id="btnNew">Nueva partida</button>
      <button id="btnImport">Importar partida (.json)</button>
      <input type="file" id="fileImp" accept=".json" class="hidden">
    </div>`;
  $('btnNew').onclick = newGameForm;
  $('btnImport').onclick = () => $('fileImp').click();
  $('fileImp').onchange = async e => {
    try {
      await S.importSave(e.target.files[0]);
      boot();
    } catch (err) { alert('No se pudo leer: ' + err.message); }
  };
}

function newGameForm() {
  const sug = HERO_NAMES.map((h, i) =>
    `<button data-i="${i}">${h.name} «${h.alias}»</button>`).join('');
  $('screen').innerHTML = `
    <div class="titlescreen">
      <h1>MIROLE</h1>
      <div class="sub">Bautiza al primer nombre de tu dinastía.<br>Lo verás durante décadas: elige con el estómago.</div>
      <div style="width:280px; display:flex; flex-direction:column; gap:8px;">${sug}</div>
      <label>...o escribe el tuyo</label>
      <div style="width:280px;">
        <input type="text" id="inName" placeholder="Nombre (p.ej. John Vane)">
        <label>Apodo / alias</label>
        <input type="text" id="inAlias" placeholder="Alias (p.ej. Vane)">
      </div>
      <button id="btnGo">Empezar desde el barro</button>
    </div>`;
  $('screen').querySelectorAll('button[data-i]').forEach(b => {
    b.onclick = () => {
      const h = HERO_NAMES[+b.dataset.i];
      $('inName').value = h.name;
      $('inAlias').value = h.alias;
    };
  });
  $('btnGo').onclick = () => {
    const name = ($('inName').value || 'John Vane').trim();
    const alias = ($('inAlias').value || name.split(' ').pop()).trim();
    S.newGame((Date.now() ^ (Math.random() * 0xffffffff)) >>> 0);
    startPrologue(name, alias, showScene, () => boot());
  };
}

export function boot() {
  $('hud').classList.remove('hidden');
  $('nav').classList.remove('hidden');
  tab = 'cantina';
  renderAll();
  pump();
}

// ==================== render maestro ====================
export function renderAll() {
  if (!S.G) return;
  resetDaily();
  hud();
  ticker();
  if (CB.C) { renderCombat(); return; }
  $('nav').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
  const r = { cantina, mapa, banda, diario, menu }[tab];
  if (r) r();
}

function resetDaily() {
  if (S.G.daily.day !== S.G.time.day) {
    S.G.daily = { day: S.G.time.day, whisky: 0, talks: [], clean: false, rumor: false, pet: false };
  }
}

function hud() {
  const p = player();
  if (!p) return;
  const face = p.portrait
    ? `<img class="face" src="${p.portrait}" onerror="this.outerHTML='<div class=face>🤠</div>'">`
    : `<div class="face">🤠</div>`;
  $('hud').innerHTML = `
    ${face}
    <div class="stats">
      <div class="nameline"><span class="name">${p.name.toUpperCase()}</span><span class="cash">$${S.G.money}</span></div>
      <div class="bar hp"><i style="width:${p.hp / p.hpMax * 100}%"></i><span>${p.hp}/${p.hpMax}</span></div>
      <div class="bar st"><i style="width:${p.stress}%"></i><span>${p.stress}</span></div>
      <div class="date">${S.dateStr()} · Fama ${S.G.rep.fama} · Humanidad ${S.G.rep.humanidad}</div>
    </div>`;
}

function ticker() {
  const last = S.G.log.slice(-3);
  $('ticker').innerHTML = last.map((l, i) =>
    `<div class="${i === last.length - 1 ? 'last' : ''}">› ${l.t}</div>`).join('');
}

// ==================== escenas modales ====================
export function showScene(sc, after) {
  if (!sc) { if (after) after(); pump(); return; }
  const wrap = $('modalWrap');
  wrap.classList.remove('hidden');
  const m = $('modal');
  m.innerHTML = `
    ${sc.title ? `<h2>${sc.title}</h2>` : ''}
    <div class="scenetext">${(sc.text || '').split('\n').filter(x => x.trim()).map(p => `<p>${p}</p>`).join('')}</div>
    <div class="opts"></div>`;
  const box = m.querySelector('.opts');
  (sc.opts && sc.opts.length ? sc.opts : [{ t: 'Continuar' }]).forEach(o => {
    const b = document.createElement('button');
    b.textContent = o.t;
    b.onclick = () => {
      let res = null;
      if (o.fx) res = o.fx();
      const rtxt = o.r || (typeof res === 'string' ? res : null);
      if (CB.C) { closeModal(); return; } // la opción abrió un combate
      if (rtxt) {
        showScene({ title: sc.title, text: rtxt }, after);
      } else {
        closeModal();
        if (after) after(o);
      }
    };
    box.appendChild(b);
  });
}

function closeModal() {
  $('modalWrap').classList.add('hidden');
  S.save();
  renderAll();
  setTimeout(pump, 60);
}

// La cola del Director: eventos pendientes se muestran cuando hay calma.
export function pump() {
  if (!S.G || CB.C) return;
  if (!$('modalWrap').classList.contains('hidden')) return;
  if (!S.G.pending.length) return;
  const raw = S.G.pending.shift();
  const [id, arg] = raw.split(':');
  const ev = EVENTS[id];
  if (!ev) { pump(); return; }
  if (ev.once) S.markOnce(id);
  const sc = ev.build(arg);
  if (sc) showScene(sc, () => {});
  else pump();
}

// ==================== CANTINA ====================
function cantina() {
  const g = S.G, p = player();
  const squad = aliveSquad().filter(c => c.id !== g.player);
  const mood = p.stress > 70 ? 'El humo se te pega a los pulmones y los ruidos, a la nuca.'
    : p.stress > 40 ? 'La cantina huele a serrín, sebo y conversaciones a medias.'
    : 'Hoy «El Cuervo» casi parece un hogar. Casi.';
  let html = `<h2>«EL CUERVO» — Marrow Creek</h2><div class="flavor">${mood}</div><div class="grid">`;
  html += `<button data-a="rest">🛏️ Descansar<br><span class="dim small">Dormir hasta mañana. Cura y calma.</span></button>`;
  html += `<button data-a="whisky" ${g.daily.whisky >= 3 || g.money < 3 ? 'disabled' : ''}>🥃 Whisky ($3)<br><span class="dim small">−12 estrés. ${3 - g.daily.whisky} restantes hoy.</span></button>`;
  html += `<button data-a="poker" ${g.money < 5 ? 'disabled' : ''}>🃏 Póker<br><span class="dim small">Cinco cartas contra la casa.</span></button>`;
  html += `<button data-a="clean" ${g.daily.clean ? 'disabled' : ''}>🔧 Limpiar armas<br><span class="dim small">+6 estado a todos los hierros.</span></button>`;
  html += `<button data-a="rumor" ${g.daily.rumor || g.money < 2 ? 'disabled' : ''}>👂 Rumores ($2)<br><span class="dim small">Invita a alguien. Escucha.</span></button>`;
  for (const c of squad) {
    const done = g.daily.talks.includes(c.id);
    html += `<button data-a="talk" data-id="${c.id}" ${done ? 'disabled' : ''}>💬 Hablar con ${c.alias || c.name}<br><span class="dim small">${done ? 'Ya hablasteis hoy.' : 'Lealtad ' + c.loyalty}</span></button>`;
  }
  for (const pet of g.pets) {
    html += `<button data-a="pet" ${g.daily.pet ? 'disabled' : ''}>🐕 Acariciar a ${pet.name}<br><span class="dim small">El único que nunca duda.</span></button>`;
  }
  html += `</div>`;
  if (pk) { renderPoker(); return; }
  $('screen').innerHTML = html;
  $('screen').querySelectorAll('button[data-a]').forEach(b => b.onclick = () => cantinaAct(b.dataset));
}

function cantinaAct(d) {
  const g = S.G, p = player();
  if (d.a === 'rest') { T.restDay(); JB.maybeRefreshJobs(); }
  if (d.a === 'whisky') {
    g.money -= 3; g.daily.whisky++;
    addStress(p, p.traits.includes('bebedor') ? -16 : -12);
    S.log('El whisky raspa bajando. Lo demás raspa siempre.');
    if (g.daily.whisky === 3 && chance(0.1) && !p.traits.includes('bebedor')) {
      p.traits.push('bebedor');
      S.log('Últimamente la botella te encuentra demasiado rápido.');
    }
  }
  if (d.a === 'poker') { pk = { stage: 'bet' }; }
  if (d.a === 'clean') {
    g.daily.clean = true;
    for (const c of aliveSquad()) {
      for (const slot of ['weapon', 'blanca']) {
        const w = c.gear[slot];
        if (w && !w.broken) w.dur = Math.min(WEAPONS[w.def].dur, w.dur + 6);
      }
    }
    S.log('Aceite, trapo y paciencia. Los hierros lo agradecen.');
  }
  if (d.a === 'rumor') {
    g.money -= 2; g.daily.rumor = true;
    S.log('Rumor: ' + pick(RUMORS));
  }
  if (d.a === 'talk') talk(+d.id);
  if (d.a === 'pet') {
    g.daily.pet = true;
    addStress(p, -2);
    S.log(`${g.pets[0].name} ${pick(PET_LINES)}`);
  }
  S.save();
  renderAll();
  pump();
}

function talk(id) {
  const c = S.G.chars[id];
  S.G.daily.talks.push(id);
  c.loyalty = Math.min(100, c.loyalty + 2);
  let line;
  if (c.name === 'Eli Marsh') {
    const tiers = ELI_TALKS.filter(t => c.loyalty >= t.min);
    line = pick(tiers[tiers.length - 1].lines);
  } else {
    const pool = c.loyalty >= 75 ? RECRUIT_TALKS.high : c.loyalty >= 50 ? RECRUIT_TALKS.mid : RECRUIT_TALKS.low;
    line = pick(pool);
  }
  showScene({ title: c.alias || c.name, text: line }, () => {});
}

// ==================== PÓKER ====================
function renderPoker() {
  const g = S.G;
  let html = `<h2>🃏 PÓKER — mesa del fondo</h2>`;
  if (pk.stage === 'bet') {
    html += `<div class="flavor">La casa juega limpio. Es lo único limpio de esta mesa.</div><div class="grid">`;
    for (const v of [5, 10, 25, 50]) {
      html += `<button data-bet="${v}" ${g.money < v ? 'disabled' : ''}>Apostar $${v}</button>`;
    }
    html += `<button class="wide" data-bet="out">Levantarse de la mesa</button></div>`;
    $('screen').innerHTML = html;
    $('screen').querySelectorAll('button[data-bet]').forEach(b => b.onclick = () => {
      if (b.dataset.bet === 'out') { pk = null; renderAll(); return; }
      const bet = +b.dataset.bet;
      g.money -= bet;
      const d = PK.deal();
      pk = { stage: 'draw', bet, deck: d.deck, p: d.p, a: d.a, sel: [] };
      renderAll();
    });
    return;
  }
  if (pk.stage === 'draw') {
    html += `<div class="flavor">Apuesta: $${pk.bet}. Toca las cartas que quieras cambiar.</div>`;
    html += `<h3>La casa</h3><div class="pkhand">${pk.a.map(() => `<div class="pcard back">?</div>`).join('')}</div>`;
    html += `<h3>Tu mano</h3><div class="pkhand">${pk.p.map((c, i) =>
      `<div class="pcard ${PK.cardRed(c) ? 'red' : ''} ${pk.sel.includes(i) ? 'sel' : ''}" data-i="${i}">${PK.cardTxt(c)}</div>`).join('')}</div>`;
    html += `<div class="grid"><button data-pk="draw">Cambiar ${pk.sel.length} carta(s)</button><button data-pk="stand">Plantarse</button></div>`;
    $('screen').innerHTML = html;
    $('screen').querySelectorAll('.pcard[data-i]').forEach(el => el.onclick = () => {
      const i = +el.dataset.i;
      pk.sel = pk.sel.includes(i) ? pk.sel.filter(x => x !== i) : [...pk.sel, i];
      renderAll();
    });
    $('screen').querySelectorAll('button[data-pk]').forEach(b => b.onclick = () => {
      if (b.dataset.pk === 'draw') PK.draw(pk.p, pk.sel, pk.deck);
      PK.draw(pk.a, PK.aiDiscards(pk.a), pk.deck);
      const sp = PK.score(pk.p), sa = PK.score(pk.a);
      const d = PK.cmp(sp, sa);
      pk.result = d > 0 ? 'win' : d < 0 ? 'lose' : 'tie';
      pk.sp = sp; pk.sa = sa;
      const g2 = S.G;
      if (pk.result === 'win') { g2.money += pk.bet * 2; g2.stats.pokerWon += pk.bet; addStress(player(), -4); }
      else if (pk.result === 'tie') { g2.money += pk.bet; }
      else { g2.stats.pokerLost += pk.bet; addStress(player(), 2); }
      addXp(player(), 'labia', 1);
      pk.stage = 'done';
      S.save();
      renderAll();
    });
    return;
  }
  // stage done
  const msg = pk.result === 'win' ? `Ganas $${pk.bet * 2}. La casa te mira con respeto contable.`
    : pk.result === 'tie' ? 'Empate. Recuperas lo tuyo. Emoción administrativa.'
    : `Pierdes $${pk.bet}. La casa no sonríe. La casa nunca sonríe.`;
  html += `<h3>La casa — ${PK.handName(pk.sa)}</h3><div class="pkhand">${pk.a.map(c =>
    `<div class="pcard ${PK.cardRed(c) ? 'red' : ''}">${PK.cardTxt(c)}</div>`).join('')}</div>`;
  html += `<h3>Tu mano — ${PK.handName(pk.sp)}</h3><div class="pkhand">${pk.p.map(c =>
    `<div class="pcard ${PK.cardRed(c) ? 'red' : ''}">${PK.cardTxt(c)}</div>`).join('')}</div>`;
  html += `<div class="panel">${msg}</div><div class="grid"><button data-x="again">Otra mano</button><button data-x="out">Dejar la mesa</button></div>`;
  $('screen').innerHTML = html;
  $('screen').querySelectorAll('button[data-x]').forEach(b => b.onclick = () => {
    pk = b.dataset.x === 'again' ? { stage: 'bet' } : null;
    renderAll();
  });
}

// ==================== MAPA ====================
function mapa() {
  JB.maybeRefreshJobs();
  const g = S.G;
  let html = `<h2>🗺️ MARROW CREEK</h2><div class="flavor">${S.dateStr()} · El tablón cruje de trabajo feo.</div>`;
  if (g.flags.dawson === 2) {
    html += `<div class="card special"><div class="title">★ La pista de Dawson</div>
      <div>Las colinas del norte. El hombre que enterró a Sam. Esto no es un trabajo.</div>
      <div class="row"><span class="dim">2 días · sangriento</span><button data-dawson="1">Cabalgar</button></div></div>`;
  }
  for (const j of g.jobs) {
    html += `<div class="card"><div class="title">${j.title}</div><div class="small">${j.desc}</div>
      <div class="row"><span class="dim">${j.days} día(s) · riesgo ${'☠'.repeat(j.risk)}${j.pay ? ` · $${j.pay}` : ''}</span>
      <button data-job="${j.id}">Aceptar</button></div></div>`;
  }
  html += `<h3>🏪 Almacén</h3><div class="panel small">Munición: ${g.ammo.balas} balas, ${g.ammo.cartuchos} cartuchos.</div><div class="grid">`;
  for (const id of SHOP) {
    const def = WEAPONS[id] || GOODS[id];
    html += `<button data-buy="${id}" ${g.money < def.price ? 'disabled' : ''}>${def.name} — $${def.price}<br><span class="dim small">${def.desc || ''}</span></button>`;
  }
  html += `</div><h3>Vender / reparar</h3><div class="grid">`;
  g.stash.forEach((it, i) => {
    const def = it.kind === 'weapon' ? WEAPONS[it.def] : GOODS[it.def];
    if (it.kind === 'weapon' && it.broken) {
      html += `<button data-fix="${i}" ${g.money < Math.ceil(def.price / 3) ? 'disabled' : ''}>Reparar ${def.name} — $${Math.ceil(def.price / 3)}</button>`;
    } else if (def.price > 0) {
      html += `<button data-sell="${i}">Vender ${itemName(it)} — $${Math.ceil(def.price / 2)}</button>`;
    }
  });
  html += `</div>`;
  $('screen').innerHTML = html;
  $('screen').querySelectorAll('button[data-job]').forEach(b => b.onclick = () => {
    const j = g.jobs.find(x => x.id === +b.dataset.job);
    if (j) JB.startJob(j, showScene);
  });
  const dawsonBtn = $('screen').querySelector('button[data-dawson]');
  if (dawsonBtn) dawsonBtn.onclick = () => {
    g.flags.dawson = 2.5;
    JB.startJob({ tpl: 'dawson', id: -1, title: 'La pista de Dawson', days: 2, risk: 3, pay: 0 }, showScene);
  };
  $('screen').querySelectorAll('button[data-buy]').forEach(b => b.onclick = () => buy(b.dataset.buy));
  $('screen').querySelectorAll('button[data-sell]').forEach(b => b.onclick = () => {
    const it = g.stash[+b.dataset.sell];
    const def = it.kind === 'weapon' ? WEAPONS[it.def] : GOODS[it.def];
    g.money += Math.ceil(def.price / 2);
    g.stash.splice(+b.dataset.sell, 1);
    S.log(`Vendes ${itemName(it)}.`);
    S.save(); renderAll();
  });
  $('screen').querySelectorAll('button[data-fix]').forEach(b => b.onclick = () => {
    const it = g.stash[+b.dataset.fix];
    const def = WEAPONS[it.def];
    g.money -= Math.ceil(def.price / 3);
    it.broken = false; it.dur = Math.floor(def.dur * 0.7);
    S.log(`${def.name} reparado. Casi como nuevo. Casi.`);
    S.save(); renderAll();
  });
}

function buy(id) {
  const g = S.G;
  const def = WEAPONS[id] || GOODS[id];
  if (g.money < def.price) return;
  g.money -= def.price;
  if (GOODS[id] && GOODS[id].ammo) {
    g.ammo[GOODS[id].ammo] += GOODS[id].n;
    S.log(`Compras ${def.name}. Cada bala, un jornal.`);
  } else if (WEAPONS[id]) {
    g.stash.push(mkWeapon(id));
    S.log(`Compras ${def.name}.`);
  } else {
    g.stash.push(mkGood(id));
    S.log(`Compras ${def.name}.`);
  }
  S.save(); renderAll();
}

// ==================== BANDA ====================
function banda() {
  const g = S.G;
  if (detailChar != null) { charDetail(detailChar); return; }
  let html = `<h2>🤠 LA BANDA</h2><div class="flavor">${aliveSquad().length} a la mesa. Cada silla vacía tiene nombre.</div>`;
  for (const c of aliveSquad()) {
    const isP = c.id === g.player;
    const w = c.gear.weapon;
    const rec = c.recoverUntil && g.time.day < c.recoverUntil;
    html += `<div class="card" data-ch="${c.id}" style="cursor:pointer">
      <div class="title">${c.name}${c.alias ? ' «' + c.alias + '»' : ''} ${isP ? '· TÚ' : ''}</div>
      <div class="row"><span>${c.role} · ${ageOf(c)} años</span><span>${describeHp(c.hp, c.hpMax)}${rec ? ' · convaleciente' : ''}</span></div>
      <div class="row"><span class="dim">${w ? WEAPONS[w.def].name + (w.broken ? ' (ROTA)' : ` · ${w.dur}%`) : 'desarmado'}</span>
      <span class="dim">${isP ? 'Estrés ' + c.stress : 'Lealtad ' + c.loyalty}</span></div>
    </div>`;
  }
  html += `<h3>📦 Alforjas comunes</h3><div class="panel small">${
    g.stash.length ? g.stash.map(it => itemName(it) + (it.kind === 'weapon' ? ` (${it.broken ? 'ROTA' : it.dur + '%'})` : '')).join(' · ') : 'Vacías. Como las promesas de la Blackvein.'
  }</div>`;
  $('screen').innerHTML = html;
  $('screen').querySelectorAll('[data-ch]').forEach(el => el.onclick = () => { detailChar = +el.dataset.ch; renderAll(); });
}

function charDetail(id) {
  const g = S.G, c = g.chars[id];
  if (!c || !c.alive) { detailChar = null; renderAll(); return; }
  const isP = c.id === g.player;
  let html = `<button data-back="1">← Volver a la banda</button>
    <h2 style="margin-top:10px">${c.name}${c.alias ? ' «' + c.alias + '»' : ''}</h2>
    <div class="flavor">${c.role} · ${ageOf(c)} años · ${describeHp(c.hp, c.hpMax)} (${c.hp}/${c.hpMax})</div>
    <div class="panel">`;
  for (const sk of SKILLS) {
    const xp = c.xp[sk] || 0, need = xpNeed(c, sk);
    html += `<div class="skillbar"><b>${SKILL_NAMES[sk]}</b><div class="bar"><i style="width:${c.skills[sk]}%"></i></div><em>${c.skills[sk]}</em><span class="dim small">${xp}/${need}</span></div>`;
  }
  html += `</div>`;
  const traumaTxt = c.traits.map(t => {
    const tr = TRAUMAS.find(x => x.id === t);
    return tr ? `${tr.name} — ${tr.desc}` : t;
  });
  if (traumaTxt.length) html += `<h3>Rasgos y cicatrices del alma</h3><div class="panel small">${traumaTxt.join('<br>')}</div>`;
  if (c.wounds.length) html += `<h3>Secuelas</h3><div class="panel small red">${c.wounds.join(' · ')}</div>`;
  const w = c.gear.weapon;
  html += `<h3>Armamento</h3><div class="panel small">
    Arma: ${w ? `${w.customName || WEAPONS[w.def].name} · estado ${w.broken ? '<span class="red">ROTA</span>' : w.dur + '%'} · cargada ${w.load}/${WEAPONS[w.def].mag || 0}` : 'ninguna'}<br>
    Acero: ${c.gear.blanca ? WEAPONS[c.gear.blanca.def].name : 'ninguno'}</div><div class="grid">`;
  g.stash.forEach((it, i) => {
    if (it.kind === 'weapon' && !it.broken && WEAPONS[it.def].type !== 'blanca') {
      html += `<button data-eq="${i}">Equipar ${WEAPONS[it.def].name} (${it.dur}%)</button>`;
    }
    if (it.kind === 'weapon' && !it.broken && WEAPONS[it.def].type === 'blanca') {
      html += `<button data-eqb="${i}">Acero: ${WEAPONS[it.def].name}</button>`;
    }
    if (it.kind === 'good' && GOODS[it.def].heal && c.hp < c.hpMax) {
      html += `<button data-heal="${i}">Usar ${GOODS[it.def].name} (+${GOODS[it.def].heal})</button>`;
    }
    if (it.kind === 'good' && it.def === 'kit_limpieza' && w && !w.broken) {
      html += `<button data-kit="${i}">Kit de limpieza (+25 estado, ${it.uses} usos)</button>`;
    }
    if (it.kind === 'good' && it.def === 'whisky') {
      html += `<button data-wsk="${i}">Whisky de alforja (−12 estrés)</button>`;
    }
  });
  html += `</div>`;
  if (!isP) html += `<div class="panel small dim">Soldada: $${c.salario}/semana · Lealtad ${c.loyalty} · Estrés ${c.stress}</div>`;
  $('screen').innerHTML = html;
  $('screen').querySelector('[data-back]').onclick = () => { detailChar = null; renderAll(); };
  $('screen').querySelectorAll('button[data-eq]').forEach(b => b.onclick = () => {
    const i = +b.dataset.eq, it = g.stash[i];
    g.stash.splice(i, 1);
    if (c.gear.weapon) g.stash.push(c.gear.weapon);
    c.gear.weapon = it;
    S.log(`${c.alias || c.name} enfunda ${WEAPONS[it.def].name}.`);
    S.save(); renderAll();
  });
  $('screen').querySelectorAll('button[data-eqb]').forEach(b => b.onclick = () => {
    const i = +b.dataset.eqb, it = g.stash[i];
    g.stash.splice(i, 1);
    if (c.gear.blanca) g.stash.push(c.gear.blanca);
    c.gear.blanca = it;
    S.save(); renderAll();
  });
  $('screen').querySelectorAll('button[data-heal]').forEach(b => b.onclick = () => {
    const i = +b.dataset.heal, it = g.stash[i];
    c.hp = Math.min(c.hpMax, c.hp + GOODS[it.def].heal);
    g.stash.splice(i, 1);
    S.save(); renderAll();
  });
  $('screen').querySelectorAll('button[data-kit]').forEach(b => b.onclick = () => {
    const i = +b.dataset.kit, it = g.stash[i];
    w.dur = Math.min(WEAPONS[w.def].dur, w.dur + 25);
    it.uses--;
    if (it.uses <= 0) g.stash.splice(i, 1);
    S.save(); renderAll();
  });
  $('screen').querySelectorAll('button[data-wsk]').forEach(b => b.onclick = () => {
    const i = +b.dataset.wsk;
    g.stash.splice(i, 1);
    addStress(c, -12);
    S.save(); renderAll();
  });
}

// ==================== DIARIO ====================
function diario() {
  const g = S.G;
  let html = `<h2>📜 EL DIARIO</h2>`;
  html += `<h3>⚰️ El cementerio</h3>`;
  if (!g.cemetery.length) html += `<div class="panel small dim">Aún no has enterrado a nadie. Disfrútalo mientras dure.</div>`;
  for (const t of [...g.cemetery].reverse()) {
    html += `<div class="grave"><div class="gname">${t.name}${t.alias ? ' «' + t.alias + '»' : ''} (${t.born}–${t.died})</div>
      <div class="small">${t.cause}</div>${t.epitaph ? `<div class="gep">${t.epitaph}</div>` : ''}</div>`;
  }
  html += `<h3>Memorias</h3>`;
  for (const j of [...g.journal].reverse().slice(0, 30)) {
    html += `<div class="panel small"><span class="dim">${S.dateStr(j.d)}</span><br>${j.t}</div>`;
  }
  html += `<h3>Cuentas de una vida</h3><div class="panel small">
    Días en el territorio: ${g.stats.days} · Trabajos: ${g.stats.jobs} · Disparos: ${g.stats.shots} · Muertes a tu cuenta: ${g.stats.kills}<br>
    Ganado: $${g.stats.earned} · Póker: +$${g.stats.pokerWon} / −$${g.stats.pokerLost}</div>`;
  $('screen').innerHTML = html;
}

// ==================== MENÚ ====================
function menu() {
  $('screen').innerHTML = `<h2>⚙️ MENÚ</h2>
    <div class="flavor">Tu partida es un archivo JSON. Es tuya. Llévatela a donde vayas, hasta 2060.</div>
    <div class="grid">
      <button class="wide" data-m="export">💾 Extraer partida (descargar .json)</button>
      <button class="wide" data-m="import">📂 Importar partida</button>
      <button class="wide" data-m="reset">🔥 Nueva partida (borra la actual)</button>
    </div>
    <input type="file" id="fileImp2" accept=".json" class="hidden">
    <h3>Acerca de MIROLE</h3>
    <div class="panel small dim">
      MIROLE v${S.VERSION} · esquema de guardado ${S.SCHEMA}<br>
      Un western personal. Hecho para una sola persona y para toda una vida.<br><br>
      Instalar en el teléfono: menú del navegador → «Añadir a pantalla de inicio».<br>
      Funciona sin internet una vez instalado.
    </div>`;
  $('screen').querySelectorAll('button[data-m]').forEach(b => b.onclick = () => {
    if (b.dataset.m === 'export') S.exportSave();
    if (b.dataset.m === 'import') $('fileImp2').click();
    if (b.dataset.m === 'reset') {
      showScene({
        title: '¿Quemar esta vida?',
        text: 'Se borrará la partida actual de este dispositivo. Si no la has extraído antes, se pierde para siempre: las tumbas, las cicatrices, todo.',
        opts: [
          { t: 'Extraer primero (recomendado)', fx() { S.exportSave(); } },
          { t: 'Borrar y empezar de cero', fx() { S.wipe(); location.reload(); } },
          { t: 'Cancelar' }
        ]
      }, () => {});
    }
  });
  $('fileImp2').onchange = async e => {
    try { await S.importSave(e.target.files[0]); location.reload(); }
    catch (err) { alert('No se pudo leer: ' + err.message); }
  };
}

// ==================== COMBATE ====================
function renderCombat() {
  const C = CB.C;
  $('nav').querySelectorAll('button').forEach(b => b.classList.remove('on'));
  let html = `<div class="combat"><div class="c-title">⚔ ${C.title}</div><div class="round">Ronda ${C.round}</div>`;

  html += `<div class="foes">`;
  for (const u of C.units) {
    if (u.kind !== 'en') continue;
    const cls = ['unit foe'];
    if (u.dead || u.fled) cls.push('down');
    if (combatMode && !u.dead && !u.fled) cls.push('targetable');
    html += `<div class="${cls.join(' ')}" data-tgt="${u.uid}">
      <div class="uname">${u.name}</div>
      <div class="tags">${u.dead ? '✝ muerto' : u.fled ? 'huyó' : describeHp(u.hp, u.hpMax)}
      ${!u.dead && !u.fled ? ` · ${u.rank === 'f' ? 'cerca' : 'lejos'}${u.cover ? ' · 🪨' : ''}${u.shaken ? ' · 😨' : ''}${u.jam ? ' · ⚙' : ''}` : ''}</div></div>`;
  }
  html += `</div><div class="allies">`;
  for (const u of C.units) {
    if (u.kind !== 'pc') continue;
    const cls = ['unit'];
    if (u.dead || u.out || u.fled) cls.push('down');
    if (C.active === u) cls.push('active');
    const w = u.w;
    html += `<div class="${cls.join(' ')}">
      <div class="uname">${u.name}</div>
      <div class="tags">${u.dead ? '✝' : u.out ? 'caído' : `${u.hp}/${u.hpMax}`}
      ${!u.dead && !u.out ? ` · ${u.rank === 'f' ? 'delante' : 'atrás'}${u.cover ? ' · 🪨' : ''}${u.shaken ? ' · 😨' : ''}
      ${w ? ` · ${w.load}/${WEAPONS[w.def].mag || 0}${w.broken ? ' ROTA' : u.jam ? ' ⚙ENCASQ.' : ''}` : ''}` : ''}</div></div>`;
  }
  html += `</div><div class="clog">${C.log.slice(-12).map(l => `<div>${l}</div>`).join('')}</div>`;

  if (C.over) {
    const msg = { win: 'El polvo se asienta. Estáis de pie.', lose: 'Oscuridad.', fled: 'Vivís. Ya es algo.', paid: 'Pagado y humillado. Pero entero.' }[C.result] || '';
    html += `<div class="panel">${msg}</div>`;
    if (C.deaths.length) {
      for (const d of C.deaths) {
        html += `<div class="panel red">✝ ${d.ch.name} ha muerto. ${d.line}</div>`;
      }
    }
    if (C.lootItems && C.lootItems.length) html += `<div class="panel small amber">Botín: ${C.lootItems.join(', ')}</div>`;
    html += `<div class="actions"><button class="wide" data-c="finish">Continuar</button></div>`;
  } else if (C.active) {
    const u = C.active;
    const wd = u.w ? WEAPONS[u.w.def] : null;
    html += `<div class="panel small">Turno de <b class="amber">${u.name}</b></div><div class="actions">`;
    if (combatMode) {
      html += `<div class="panel small wide">Elige objetivo arriba ☝ ${combatMode === 'aim' ? '(disparo apuntado)' : combatMode === 'melee' ? '(acero)' : ''}</div>
        <button class="wide" data-c="cancel">Cancelar</button>`;
    } else {
      const canShoot = u.w && !u.w.broken && !u.jam && u.w.load > 0;
      html += `<button data-c="shoot" ${canShoot ? '' : 'disabled'}>🔫 Disparar</button>`;
      html += `<button data-c="aim" ${canShoot ? '' : 'disabled'}>🎯 Apuntar y disparar</button>`;
      if (u.jam) html += `<button data-c="unjam">⚙ Desencasquillar</button>`;
      if (u.w && !u.w.broken && wd && u.w.load < (wd.mag || 0)) html += `<button data-c="reload">↻ Recargar (${S.G.ammo[wd.ammo] || 0} ${wd.ammo})</button>`;
      if (u.blanca && u.rank === 'f') html += `<button data-c="melee">🔪 Acero</button>`;
      if (!u.cover) html += `<button data-c="cover">🪨 Cubrirse</button>`;
      html += `<button data-c="move">${u.rank === 'f' ? '↩ Retroceder' : '↪ Avanzar'}</button>`;
      const heals = S.G.stash.map((it, i) => ({ it, i })).filter(x => x.it.kind === 'good' && GOODS[x.it.def].heal);
      if (heals.length && u.hp < u.hpMax) html += `<button data-c="item" data-i="${heals[0].i}">✚ ${GOODS[heals[0].it.def].name}</button>`;
      if (C.round === 1 && !C.intim && u.id === S.G.player && S.G.rep.fama >= 8) {
        html += `<button class="wide" data-c="intim">🗣 Intimidar (que tu fama hable)</button>`;
      }
      if (C.canFlee) html += `<button class="danger" data-c="flee">🏃 Huir</button>`;
      if (C.canPay && S.G.money > 0) html += `<button class="danger" data-c="pay">💰 Pagar (mitad: $${Math.ceil(S.G.money / 2)})</button>`;
    }
    html += `</div>`;
  }
  html += `</div>`;
  $('screen').innerHTML = html;

  $('screen').querySelectorAll('[data-tgt]').forEach(el => el.onclick = () => {
    if (!combatMode) return;
    const uid = +el.dataset.tgt;
    const mode = combatMode;
    combatMode = null;
    if (mode === 'melee') CB.actMelee(uid);
    else CB.actShoot(uid, mode === 'aim');
  });
  $('screen').querySelectorAll('button[data-c]').forEach(b => b.onclick = () => {
    const a = b.dataset.c;
    if (a === 'finish') { CB.finish(); combatMode = null; renderAll(); afterCombat(); return; }
    if (a === 'cancel') { combatMode = null; renderAll(); return; }
    if (a === 'shoot') { combatMode = 'shoot'; renderAll(); return; }
    if (a === 'aim') { combatMode = 'aim'; renderAll(); return; }
    if (a === 'melee') { combatMode = 'melee'; renderAll(); return; }
    if (a === 'cover') CB.actCover();
    if (a === 'move') CB.actMove();
    if (a === 'reload') CB.actReload();
    if (a === 'unjam') CB.actUnjam();
    if (a === 'item') CB.actItem(+b.dataset.i);
    if (a === 'intim') showIntim();
    if (a === 'flee') CB.actFlee();
    if (a === 'pay') CB.actPay();
  });
}

function showIntim() {
  showScene({
    title: 'Las palabras antes del plomo',
    text: 'La cantina — el camino, el mundo — se queda en silencio. Todos esperan a ver qué sale de tu boca.',
    opts: INTIM_LINES.map((l, i) => ({ t: l, fx() { CB.actIntim(i); } }))
  }, () => {});
}

function afterCombat() {
  // Si el protagonista quedó fuera mucho tiempo, el mundo siguió: nárralo.
  const p = player();
  if (p && p.recoverUntil && p.recoverUntil > S.G.time.day) {
    const days = p.recoverUntil - S.G.time.day;
    T.advanceDays(days, { rest: true });
    showScene({
      title: 'Los días perdidos',
      text: `Fiebre, vendas, caras que entran y salen del catre. ${days} días se caen del calendario como páginas arrancadas.\n\nCuando por fin te sostienen las piernas, el espejo te devuelve a alguien un poco más parecido a Sam. No sabes si eso te gusta.`,
      opts: [{ t: 'Volver a la mesa' }]
    }, () => {});
  }
  pump();
}
