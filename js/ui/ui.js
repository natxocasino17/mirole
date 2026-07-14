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
import { SIDEQUESTS } from '../data/sidequests.js';
import { TOMO1 } from '../data/tomo1.js';
import { otisLine, fitchLine, quillLine, curlyLine, upstairsScene } from '../data/npcs.js';
import { bjDeal, bjHit, bjStand, bjValue, bjResult, genFight, simFight } from '../engine/casino.js';
import { practice, quickdraw } from '../engine/range.js';
import * as EMP from '../engine/empire.js';
import { TOWNS, GANGS, TOWN_ORDER } from '../data/gangs.js';
import { WEAPONS, GOODS, ROPA, UPGRADES, HORSES, SHOP_ALMACEN, SHOP_ARMERO, SHOP_SASTRE,
         mkWeapon, mkGood, mkRopa, itemName, itemDef, effAcc, effMag, effJam, effDurMax } from '../data/items.js';
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
let mapaView = null;     // null | 'almacen' | 'armero' | 'sastre' | 'establo' | 'terr'
let cantinaView = null;  // null | 'bj' | 'gallera' | 'range'
let bjS = null;          // mesa de blackjack
let gfS = null;          // pelea de gallos en curso

const $ = id => document.getElementById(id);

export function init() {
  $('nav').addEventListener('click', e => {
    const b = e.target.closest('button[data-tab]');
    if (!b || CB.C) return;
    tab = b.dataset.tab;
    pk = null; detailChar = null; mapaView = null; cantinaView = null; bjS = null; gfS = null;
    renderAll();
  });
  CB.setOnUpdate(renderAll);
  // La UI presta su minijuego de cabalgata a las misiones (fase 4).
  JB.setChaseRunner((seconds, cb) => {
    $('screen').innerHTML = `<h2>🐎 LA CABALGATA</h2><div class="flavor">Toca los 🌵 y 🪨 para saltarlos y los 🤠 para abatirlos. Lo que llega a ti, te golpea. Tres golpes y caes.</div><div id="chaseBox"></div>`;
    chase($('chaseBox'), seconds, (r) => {
      showScene({ title: 'Fin de la cabalgata', text: `${r.hits} blancos alcanzados${r.survived ? '' : ', pero llegasteis molidos'}. ${r.hits >= 4 ? 'Cabalgas como Sam te enseñó.' : 'El polvo casi puede contigo.'}` }, () => cb(r));
    });
  });
  // El ticker se corta por diseño; tocarlo abre el registro entero.
  $('ticker').addEventListener('click', () => {
    if (!S.G || CB.C) return;
    const lines = S.G.log.slice(-14).reverse().map(l => '› ' + l.t).join('\n\n');
    showScene({ title: '📋 El registro', text: lines || 'Nada aún. El polvo espera.' }, () => {});
  });
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
    S.G.daily = { day: S.G.time.day, whisky: 0, talks: [], clean: false, rumor: false, pet: false, otis: false, rose: false, gallo: false, range: false };
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

// Escenas de interfaz en espera (p.ej. la convalecencia tras un combate):
// jamás pisan un modal abierto — esperan su turno en la cola.
let uiQueue = [];
function queueScene(sc) { uiQueue.push(sc); }

// La cola del Director: eventos pendientes se muestran cuando hay calma.
export function pump() {
  if (!S.G || CB.C) return;
  if (!$('modalWrap').classList.contains('hidden')) return;
  if (uiQueue.length) { showScene(uiQueue.shift(), () => {}); return; }
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
  if (cantinaView === 'bj') { renderBJ(); return; }
  if (cantinaView === 'gallera') { renderGallera(); return; }
  if (cantinaView === 'range') { renderRange(); return; }
  // El calendario semanal: no todo abre todos los días. El póker y el
  // blackjack, siempre — la casa nunca cierra. Lo demás, va por días.
  const DOW = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const dow = (g.time.day - 1) % 7;
  const galleraOpen = dow === 3 || dow === 6;         // gallera: miércoles y sábado
  const roseOpen = dow === 0 || dow === 2 || dow === 5; // el piso: domingo, martes, viernes
  const rangeOpen = dow === 1 || dow === 4;            // práctica: lunes y jueves
  let html = `<h2>«EL CUERVO» — Marrow Creek</h2><div class="flavor">${DOW[dow]}. ${mood}</div><div class="grid">`;
  html += `<button data-a="rest">🛏️ Descansar<br><span class="dim small">Dormir hasta mañana. Cura y calma.</span></button>`;
  html += `<button data-a="whisky" ${g.daily.whisky >= 3 || g.money < 3 ? 'disabled' : ''}>🥃 Whisky ($3)<br><span class="dim small">−12 estrés. ${3 - g.daily.whisky} restantes hoy.</span></button>`;
  html += `<button data-a="poker" ${g.money < 5 ? 'disabled' : ''}>🃏 Póker<br><span class="dim small">Siempre abierto. Cinco cartas.</span></button>`;
  html += `<button data-a="bj" ${g.money < 5 ? 'disabled' : ''}>🂡 Blackjack<br><span class="dim small">Siempre abierto. Veintiuno.</span></button>`;
  const lily = g.relations.lily;
  html += `<button data-a="rose" ${!roseOpen || g.daily.rose ? 'disabled' : ''}>🌹 ${lily && lily.courting ? 'Ver a Delia' : 'El piso de arriba'}<br><span class="dim small">${!roseOpen ? 'Abre dom · mar · vie.' : lily && lily.courting ? 'Te guarda la silla.' : 'Madame Vergne regenta.'}</span></button>`;
  html += `<button data-a="gallo" ${!galleraOpen || g.daily.gallo || g.money < 5 ? 'disabled' : ''}>🐓 La gallera<br><span class="dim small">${!galleraOpen ? 'Solo miér · sáb.' : g.daily.gallo ? 'Ya apostaste hoy.' : 'Apuesta y mira volar plumas.'}</span></button>`;
  html += `<button data-a="range" ${!rangeOpen || g.daily.range || g.ammo.balas < 1 ? 'disabled' : ''}>🎯 Práctica de tiro<br><span class="dim small">${!rangeOpen ? 'Solo lun · jue.' : g.ammo.balas < 1 ? 'Sin balas.' : 'Botellas en la cerca.'}</span></button>`;
  html += `<button data-a="clean" ${g.daily.clean ? 'disabled' : ''}>🔧 Limpiar armas<br><span class="dim small">+6 estado a todos los hierros.</span></button>`;
  html += `<button data-a="rumor" ${g.daily.rumor || g.money < 2 ? 'disabled' : ''}>👂 Rumores ($2)<br><span class="dim small">Invita a alguien. Escucha.</span></button>`;
  html += `<button data-a="otis" ${g.daily.otis ? 'disabled' : ''}>🍺 Charlar con Otis<br><span class="dim small">El tabernero lo sabe casi todo.</span></button>`;
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
  if (d.a === 'rest') {
    T.restDay();
    JB.maybeRefreshJobs();
    // El cementerio también habla: a veces, dormir es visitarlo.
    if (chance(0.12) && g.cemetery.some(t => !t.animal)) S.queueEvent('sueno');
  }
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
        if (w && !w.broken) w.dur = Math.min(effDurMax(w), w.dur + 6);
      }
    }
    S.log('Aceite, trapo y paciencia. Los hierros lo agradecen.');
  }
  if (d.a === 'rumor') {
    g.money -= 2; g.daily.rumor = true;
    const r = pick(RUMORS);
    S.log('Pagaste un whisky por un rumor.');
    showScene({ title: '👂 Lo que se cuenta', text: r }, () => {});
  }
  if (d.a === 'otis') {
    g.daily.otis = true;
    showScene({ title: 'Otis, «El Cuervo»', text: otisLine() }, () => {});
  }
  if (d.a === 'rose') {
    g.daily.rose = true;
    showScene(upstairsScene(), () => {});
  }
  if (d.a === 'bj') { bjS = { stage: 'bet' }; cantinaView = 'bj'; }
  if (d.a === 'gallo') { gfS = { fight: genFight(), stage: 'bet' }; cantinaView = 'gallera'; }
  if (d.a === 'range') { cantinaView = 'range'; }
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
  } else if (c.bio && c.bioKnown < 3 && c.loyalty >= 40 && chance(0.6)) {
    // La confianza abre la novela corta que cada uno lleva dentro.
    line = `Baja la voz, gira el vaso, y te cuenta algo de verdad: ${c.bio[c.bioKnown]}.`;
    c.bioKnown++;
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

// ==================== MAPA: el pueblo entero ====================
function mapa() {
  JB.maybeRefreshJobs();
  JB.maybeRefreshWanted();
  const g = S.G;
  if (mapaView) { renderShop(mapaView); return; }
  let html = `<h2>🗺️ MARROW CREEK</h2><div class="flavor">${S.dateStr()} · Barro, tablones y oportunidades feas.</div>`;

  // La novela por entregas: el capítulo del Tomo, si espera
  if (g.flags.t1 && TOMO1[g.flags.t1]) {
    const cap = TOMO1[g.flags.t1];
    html += `<div class="card special"><div class="title">📖 Capítulo ${g.flags.t1} — ${cap.title}</div>
      <div class="small">TOMO I: «Todos los caminos cobran peaje». La historia principal. Sin prisa: los capítulos no caducan.</div>
      <div class="row"><span class="dim">historia principal</span><button data-cap="1">Vivirlo</button></div></div>`;
  }

  // El hilo principal
  if (g.flags.dawson === 2) {
    html += `<div class="card special"><div class="title">★ La pista de Dawson</div>
      <div class="small">Las colinas del norte. El hombre que enterró a Sam. Esto no es un trabajo.</div>
      <div class="row"><span class="dim">2 días · sangriento · lleva a tu gente</span><button data-dawson="1">Cabalgar</button></div></div>`;
  }

  // Historias únicas del territorio
  if (g.sideOffer && SIDEQUESTS[g.sideOffer]) {
    const q = SIDEQUESTS[g.sideOffer];
    html += `<div class="card special"><div class="title">★ ${q.title}</div>
      <div class="small">${q.hook}</div>
      <div class="row"><span class="dim">historia única · no se repetirá</span>
      <span><button data-sq="go">Escuchar</button> <button data-sq="skip">Ignorar</button></span></div></div>`;
  }

  // El tablón de trabajos
  html += `<h3>📋 El tablón</h3>`;
  for (const j of g.jobs) {
    html += `<div class="card"><div class="title">${j.title}</div><div class="small">${j.desc}</div>
      <div class="row"><span class="dim">${j.days} día(s) · riesgo ${'☠'.repeat(j.risk)}${j.pay ? ` · $${j.pay}` : ''}</span>
      <button data-job="${j.id}">Aceptar</button></div></div>`;
  }

  // WANTED
  html += `<h3>🤠 Se busca — WANTED</h3>`;
  if (!g.wanted.length) html += `<div class="panel small dim">El tablón de recompensas está vacío. El territorio anda tranquilo. Desconfía.</div>`;
  for (const w of g.wanted) {
    html += `<div class="card wanted"><div class="wtop">WANTED — VIVO O MUERTO</div>
      <div class="wname">${w.name}</div>
      <div class="small dim">Buscado por ${w.crime}.</div>
      <div class="row"><span class="amber">Recompensa: $${w.bounty} (+50% vivo)</span>
      <button data-wanted="${w.id}">Cazar</button></div></div>`;
  }

  // El territorio, dibujado
  html += `<div class="grid"><button class="wide" data-shop="terr">🗺️ Ver el mapa del territorio<br><span class="dim small">Lo conocido, lo rumoreado y lo que mejor no visitar.</span></button></div>`;

  // TOMO II: la guerra de facciones, si ya cerraste el Tomo I
  if (EMP.empireUnlocked() && g.territory && g.territory.init) {
    const n = EMP.playerTownCount();
    html += `<div class="grid"><button class="wide special" data-shop="empire">👑 EL TERRITORIO — guerra de facciones<br><span class="dim small">Pueblos bajo tu control: ${n}/${TOWN_ORDER.length}. La corona se gana despacio.</span></button></div>`;
  }

  // Los comercios
  html += `<h3>🏘️ El pueblo</h3><div class="grid">
    <button data-shop="almacen">🏪 Almacén<br><span class="dim small">Munición, vendas, whisky.</span></button>
    <button data-shop="armero">🔧 Armería de Fitch<br><span class="dim small">Hierros, mejoras y reparaciones.</span></button>
    <button data-shop="sastre">🎩 Sastrería Quill<br><span class="dim small">Sombreros, gabardinas, botas.</span></button>
    <button data-shop="establo">🐎 Establo<br><span class="dim small">${g.horse ? g.horse.name + ' te espera dentro.' : 'Un caballo cambia la vida. Y la huida.'}</span></button>
  </div>
  <div class="panel small dim">Munición: ${g.ammo.balas} balas · ${g.ammo.cartuchos} cartuchos · $${g.money}</div>`;

  $('screen').innerHTML = html;
  $('screen').querySelectorAll('button[data-job]').forEach(b => b.onclick = () => {
    const j = g.jobs.find(x => x.id === +b.dataset.job);
    if (j) JB.startJob(j, showScene);
  });
  $('screen').querySelectorAll('button[data-wanted]').forEach(b => b.onclick = () => {
    const w = g.wanted.find(x => x.id === +b.dataset.wanted);
    if (w) JB.startWanted(w, showScene);
  });
  const capBtn = $('screen').querySelector('button[data-cap]');
  if (capBtn) capBtn.onclick = () => {
    const cap = TOMO1[g.flags.t1];
    if (cap) cap.run(showScene);
  };
  const dawsonBtn = $('screen').querySelector('button[data-dawson]');
  if (dawsonBtn) dawsonBtn.onclick = () => {
    g.flags.dawson = 2.5;
    JB.startJob({ tpl: 'dawson', id: -1, title: 'La pista de Dawson', days: 2, risk: 3, pay: 0 }, showScene);
  };
  $('screen').querySelectorAll('button[data-sq]').forEach(b => b.onclick = () => {
    if (b.dataset.sq === 'skip') {
      g.sideOffer = null; g.sideDay = g.time.day;
      S.log('Dejas pasar la historia. Quizá vuelva. Quizá.');
      S.save(); renderAll();
      return;
    }
    const q = SIDEQUESTS[g.sideOffer];
    if (q) q.run(showScene);
  });
  $('screen').querySelectorAll('button[data-shop]').forEach(b => b.onclick = () => {
    mapaView = b.dataset.shop; renderAll();
  });
}

// ---------- comercios ----------
function shopHeader(title, flavor) {
  return `<button data-back="1">← Volver al pueblo</button>
    <h2 style="margin-top:10px">${title}</h2><div class="flavor">${flavor}</div>`;
}

function renderShop(view) {
  const g = S.G;
  let html = '';

  if (view === 'terr') { renderTerritory(); return; }
  if (view === 'empire') { renderEmpire(); return; }

  if (view === 'almacen') {
    html = shopHeader('🏪 ALMACÉN', 'Huele a grano, cuerda y pólvora. Como debe ser.');
    html += `<div class="panel small dim">Munición: ${g.ammo.balas} balas · ${g.ammo.cartuchos} cartuchos · Caja: $${g.money}</div><div class="grid">`;
    for (const id of SHOP_ALMACEN) {
      const d = GOODS[id];
      html += `<button data-buy="good:${id}" ${g.money < d.price ? 'disabled' : ''}>${d.name} — $${d.price}<br><span class="dim small">${d.desc || ''}</span></button>`;
    }
    html += `</div><h3>Vender</h3><div class="grid">`;
    g.stash.forEach((it, i) => {
      if (it.kind !== 'weapon') {
        const d = itemDef(it);
        if (d.price > 0) html += `<button data-sell="${i}">Vender ${itemName(it)} — $${Math.ceil(d.price / 2)}</button>`;
      }
    });
    html += `</div>`;
  }

  if (view === 'armero') {
    html = shopHeader('🔧 ARMERÍA DE FITCH', fitchLine());
    html += `<h3>Comprar hierros</h3><div class="grid">`;
    for (const id of SHOP_ARMERO) {
      const d = WEAPONS[id];
      html += `<button data-buy="weapon:${id}" ${g.money < d.price ? 'disabled' : ''}>${d.name} — $${d.price}<br><span class="dim small">${d.desc}</span></button>`;
    }
    html += `</div><h3>Mejorar (el arma es tuya para siempre)</h3>`;
    const armas = [];
    for (const c of aliveSquad()) {
      if (c.gear.weapon && WEAPONS[c.gear.weapon.def].type !== 'blanca') armas.push({ w: c.gear.weapon, who: c.alias || c.name });
    }
    g.stash.forEach(it => { if (it.kind === 'weapon' && WEAPONS[it.def].type !== 'blanca') armas.push({ w: it, who: 'alforjas' }); });
    if (!armas.length) html += `<div class="panel small dim">Nada que mejorar. Fitch bosteza.</div>`;
    for (let ai = 0; ai < armas.length; ai++) {
      const { w, who } = armas[ai];
      w.up = w.up || [];
      html += `<div class="card"><div class="title">${w.customName || WEAPONS[w.def].name} <span class="dim small">(${who})</span></div>
        <div class="small dim">precisión ${effAcc(w)} · cargador ${effMag(w)} · estado ${w.broken ? '<span class="red">ROTA</span>' : w.dur + '/' + effDurMax(w)}${w.up.length ? ' · ' + w.up.map(u => UPGRADES[u].name).join(', ') : ''}</div>
        <div class="grid" style="margin-top:6px">`;
      for (const uid in UPGRADES) {
        if (w.up.includes(uid)) continue;
        const u = UPGRADES[uid];
        html += `<button data-up="${ai}:${uid}" ${g.money < u.price ? 'disabled' : ''}>${u.name} — $${u.price}<br><span class="dim small">${u.desc}</span></button>`;
      }
      if (w.broken) {
        const fix = Math.ceil(WEAPONS[w.def].price / 3) || 5;
        html += `<button class="wide" data-fixw="${ai}" ${g.money < fix ? 'disabled' : ''}>Reparar — $${fix}</button>`;
      }
      html += `</div></div>`;
    }
    html += `<h3>Vender hierros</h3><div class="grid">`;
    g.stash.forEach((it, i) => {
      if (it.kind === 'weapon' && WEAPONS[it.def].price > 0) {
        html += `<button data-sell="${i}">Vender ${itemName(it)} — $${Math.ceil(WEAPONS[it.def].price / 2)}</button>`;
      }
    });
    html += `</div>`;
    // guardar referencia para los handlers
    renderShop._armas = armas;
  }

  if (view === 'sastre') {
    html = shopHeader('🎩 SASTRERÍA QUILL', quillLine());
    html += `<div class="grid">`;
    for (const id of SHOP_SASTRE) {
      const d = ROPA[id];
      const fx = Object.entries(d.fx || {}).map(([k, v]) => `+${v} ${k}`).join(', ');
      html += `<button data-buy="ropa:${id}" ${g.money < d.price ? 'disabled' : ''}>${d.name} — $${d.price}<br><span class="dim small">${d.desc}${fx ? ' (' + fx + ')' : ''}</span></button>`;
    }
    html += `</div><div class="panel small dim">Para vestir a tu gente: BANDA → toca a alguien → Vestimenta.</div>`;
  }

  if (view === 'establo') {
    html = shopHeader('🐎 EL ESTABLO', curlyLine());
    if (g.horse) {
      html += `<div class="card"><div class="title">🐎 ${g.horse.name}</div>
        <div class="small">${HORSES[g.horse.def].name} · come $${g.horse.tier}/semana</div>
        <div class="small dim">${g.horse.tier >= 3 ? 'Esquiva emboscadas y vuela en la huida.' : g.horse.tier >= 2 ? 'Da ventaja real al huir.' : 'Te lleva. Con eso basta, a veces.'}</div></div>`;
      html += `<div class="panel small dim">Un jinete, un caballo. Si quieres otro, primero véndelo (mitad de precio) — o cuídalo hasta el final.</div>
        <div class="grid"><button data-sellhorse="1">Vender a ${g.horse.name} — $${Math.ceil(HORSES[g.horse.def].price / 2)}</button></div>`;
    } else {
      html += `<div class="grid">`;
      for (const id in HORSES) {
        const h = HORSES[id];
        html += `<button data-horse="${id}" ${g.money < h.price ? 'disabled' : ''}>${h.name} — $${h.price}<br><span class="dim small">${h.desc} Come $${h.tier}/semana.</span></button>`;
      }
      html += `</div>`;
    }
  }

  $('screen').innerHTML = html;
  const back = $('screen').querySelector('[data-back]');
  if (back) back.onclick = () => { mapaView = null; renderAll(); };

  $('screen').querySelectorAll('button[data-buy]').forEach(b => b.onclick = () => {
    const [kind, id] = b.dataset.buy.split(':');
    const d = kind === 'weapon' ? WEAPONS[id] : kind === 'ropa' ? ROPA[id] : GOODS[id];
    if (g.money < d.price) return;
    g.money -= d.price;
    if (kind === 'good' && d.ammo) { g.ammo[d.ammo] += d.n; }
    else if (kind === 'weapon') g.stash.push(mkWeapon(id));
    else if (kind === 'ropa') g.stash.push(mkRopa(id));
    else g.stash.push(mkGood(id));
    S.log(`Compras ${d.name}.`);
    S.save(); renderAll();
  });
  $('screen').querySelectorAll('button[data-sell]').forEach(b => b.onclick = () => {
    const it = g.stash[+b.dataset.sell];
    const d = itemDef(it);
    g.money += Math.ceil(d.price / 2);
    g.stash.splice(+b.dataset.sell, 1);
    S.log(`Vendes ${itemName(it)}.`);
    S.save(); renderAll();
  });
  $('screen').querySelectorAll('button[data-up]').forEach(b => b.onclick = () => {
    const [ai, uid] = b.dataset.up.split(':');
    const entry = renderShop._armas[+ai];
    if (!entry || g.money < UPGRADES[uid].price) return;
    g.money -= UPGRADES[uid].price;
    entry.w.up.push(uid);
    if (uid === 'culata') entry.w.dur = Math.min(effDurMax(entry.w), entry.w.dur + 20);
    S.log(`Fitch instala ${UPGRADES[uid].name.toLowerCase()} sin decir palabra. El arma respira distinto.`);
    S.save(); renderAll();
  });
  $('screen').querySelectorAll('button[data-fixw]').forEach(b => b.onclick = () => {
    const entry = renderShop._armas[+b.dataset.fixw];
    const fix = Math.ceil(WEAPONS[entry.w.def].price / 3) || 5;
    if (g.money < fix) return;
    g.money -= fix;
    entry.w.broken = false;
    entry.w.dur = Math.floor(effDurMax(entry.w) * 0.7);
    S.log(`${WEAPONS[entry.w.def].name} reparado. Casi como nuevo. Casi.`);
    S.save(); renderAll();
  });
  $('screen').querySelectorAll('button[data-horse]').forEach(b => b.onclick = () => {
    const id = b.dataset.horse;
    const h = HORSES[id];
    if (g.money < h.price) return;
    const name = (prompt('¿Cómo se va a llamar?', ['Trueno', 'Canela', 'Fantasma', 'Domingo'][Math.floor(Math.random() * 4)]) || 'Caballo').trim().slice(0, 20);
    g.money -= h.price;
    g.horse = { name, tier: h.tier, def: id };
    S.log(`${name} es tuyo. Un ${h.name.toLowerCase()} con nombre ya no es un caballo: es familia.`);
    S.journal(`Compré un ${h.name.toLowerCase()}. Se llama ${name}. Eli lo aprobó con un gruñido, que en su idioma es un abrazo.`);
    S.save(); renderAll();
  });
  const sh = $('screen').querySelector('button[data-sellhorse]');
  if (sh) sh.onclick = () => {
    showScene({
      title: '¿Vender a ' + g.horse.name + '?',
      text: 'El del establo ya está contando el dinero. ' + g.horse.name + ' te mira por encima de la cerca, sin sospechar nada, que es lo peor.',
      opts: [
        { t: 'Venderlo', fx() {
            g.money += Math.ceil(HORSES[g.horse.def].price / 2);
            S.log(`Vendes a ${g.horse.name}. No miras atrás. Mentira: miras.`);
            g.horse = null;
            S.save();
          } },
        { t: 'No. Ni hablar.' }
      ]
    }, () => renderAll());
  };
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
      ${c.portrait ? `<img class="mini" src="${c.portrait}" onerror="this.remove()">` : ''}
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
    ${c.portrait ? `<img class="bigface" src="${c.portrait}" onerror="this.remove()">` : ''}
    <h2 style="margin-top:10px">${c.name}${c.alias ? ' «' + c.alias + '»' : ''}</h2>
    <div class="flavor">${c.role} · ${ageOf(c)} años · ${describeHp(c.hp, c.hpMax)} (${c.hp}/${c.hpMax})</div>
    <div class="panel">`;
  for (const sk of SKILLS) {
    const xp = c.xp[sk] || 0, need = xpNeed(c, sk);
    html += `<div class="skillbar"><b>${SKILL_NAMES[sk]}</b><div class="bar"><i style="width:${c.skills[sk]}%"></i></div><em>${c.skills[sk]}</em><span class="dim small">${xp}/${need}</span></div>`;
  }
  html += `</div>`;
  if (c.bio && c.bioKnown > 0) {
    html += `<h3>Su historia</h3><div class="panel small">${c.bio.slice(0, c.bioKnown).map(b => '· ' + cap0(b)).join('<br>')}${c.bioKnown < 3 ? '<br><span class="dim">(hay más: sigue hablando con él en la cantina)</span>' : ''}</div>`;
  }
  const traumaTxt = c.traits.map(t => {
    const tr = TRAUMAS.find(x => x.id === t);
    return tr ? `${tr.name} — ${tr.desc}` : t;
  });
  if (traumaTxt.length) html += `<h3>Rasgos y cicatrices del alma</h3><div class="panel small">${traumaTxt.join('<br>')}</div>`;
  if (c.wounds.length) html += `<h3>Secuelas</h3><div class="panel small red">${c.wounds.join(' · ')}</div>`;
  const w = c.gear.weapon;
  html += `<h3>Armamento</h3><div class="panel small">
    Arma: ${w ? `${w.customName || WEAPONS[w.def].name} · estado ${w.broken ? '<span class="red">ROTA</span>' : w.dur + '/' + effDurMax(w)} · cargada ${w.load}/${effMag(w)}${(w.up || []).length ? ' · ' + w.up.map(u => UPGRADES[u].name).join(', ') : ''}` : 'ninguna'}<br>
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

  // ---- vestimenta: el espejo del sastre ----
  const SLOTS = { sombrero: 'Sombrero', gabardina: 'Gabardina', botas: 'Botas', accesorio: 'Accesorio' };
  c.ropa = c.ropa || { sombrero: null, gabardina: null, botas: null, accesorio: null };
  html += `<h3>Vestimenta</h3><div class="espejo">`;
  if (c.sprite) html += `<img src="${c.sprite}" onerror="this.remove()">`;
  html += `<div class="slots">`;
  for (const slot in SLOTS) {
    const it = c.ropa[slot];
    const d = it ? ROPA[it.def] : null;
    const fx = d && d.fx ? Object.entries(d.fx).map(([k, v]) => `+${v} ${k.slice(0, 4)}`).join(' ') : '';
    html += `<div class="slotrow"><b>${SLOTS[slot]}</b><span>${d ? d.name + (fx ? ` <em class="dim">${fx}</em>` : '') : '<span class="dim">—</span>'}</span>
      ${it ? `<button data-unrop="${slot}">Quitar</button>` : ''}</div>`;
  }
  html += `</div></div><div class="grid">`;
  g.stash.forEach((it, i) => {
    if (it.kind === 'ropa') {
      const d = ROPA[it.def];
      html += `<button data-rop="${i}">Ponerse ${d.name}</button>`;
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
    w.dur = Math.min(effDurMax(w), w.dur + 25);
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
  $('screen').querySelectorAll('button[data-rop]').forEach(b => b.onclick = () => {
    const i = +b.dataset.rop, it = g.stash[i];
    const slot = ROPA[it.def].slot;
    g.stash.splice(i, 1);
    if (c.ropa[slot]) g.stash.push(c.ropa[slot]);
    c.ropa[slot] = it;
    S.log(`${c.alias || c.name} estrena ${ROPA[it.def].name.toLowerCase()}.`);
    S.save(); renderAll();
  });
  $('screen').querySelectorAll('button[data-unrop]').forEach(b => b.onclick = () => {
    const slot = b.dataset.unrop;
    if (c.ropa[slot]) { g.stash.push(c.ropa[slot]); c.ropa[slot] = null; }
    S.save(); renderAll();
  });
}

// ==================== DIARIO ====================
function diario() {
  const g = S.G;
  let html = `<h2>📜 EL DIARIO</h2>`;
  // 🧵 EL HILO: dónde estás en la historia y qué viene ahora. Para que
  // nunca pierdas el sentido, por muchos días de relleno que pasen.
  html += `<h3>🧵 El Hilo — dónde estás</h3><div class="panel">${storyThread()}</div>`;
  html += `<h3>⚰️ El cementerio</h3>`;
  if (!g.cemetery.length) html += `<div class="panel small dim">Aún no has enterrado a nadie. Disfrútalo mientras dure.</div>`;
  for (const t of [...g.cemetery].reverse()) {
    html += `<div class="grave"><div class="gname">${t.animal ? t.animal + ' ' : ''}${t.name}${t.alias ? ' «' + t.alias + '»' : ''}${t.born ? ` (${t.born}–${t.died})` : ''}</div>
      <div class="small">${t.cause}</div>${t.epitaph ? `<div class="gep">${t.epitaph}</div>` : ''}</div>`;
  }
  html += `<h3>Memorias</h3>`;
  for (const j of [...g.journal].reverse().slice(0, 30)) {
    html += `<div class="panel small"><span class="dim">${S.dateStr(j.d)}</span><br>${j.t}</div>`;
  }
  html += `<h3>🎯 Decisiones que pesan</h3>`;
  if (!g.choices.length) html += `<div class="panel small dim">Todavía no has tomado ninguna de las grandes. Llegarán. Siempre llegan.</div>`;
  for (const ch of [...g.choices].reverse().slice(0, 25)) {
    html += `<div class="panel small"><span class="dim">${S.dateStr(ch.d)}</span><br>${ch.t}</div>`;
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

// ==================== BLACKJACK ====================
function renderBJ() {
  const g = S.G;
  const card = c => `<div class="pcard ${PK.cardRed(c) ? 'red' : ''}">${PK.cardTxt(c)}</div>`;
  let html = `<button data-back="1">← A la barra</button><h2 style="margin-top:10px">🂡 BLACKJACK</h2>`;
  if (bjS.stage === 'bet') {
    html += `<div class="flavor">La casa pide hasta 17 y paga el blackjack 3 a 2. Otis reparte con cara de notario.</div><div class="grid">`;
    for (const v of [5, 10, 25, 50]) html += `<button data-bet="${v}" ${g.money < v ? 'disabled' : ''}>Apostar $${v}</button>`;
    html += `</div>`;
  } else {
    const done = bjS.stage === 'done';
    const dShow = done ? bjS.d : [bjS.d[0]];
    html += `<h3>La casa ${done ? '— ' + bjValue(bjS.d) : ''}</h3><div class="pkhand">${dShow.map(card).join('')}${done ? '' : '<div class="pcard back">?</div>'}</div>`;
    html += `<h3>Tu mano — ${bjValue(bjS.p)}</h3><div class="pkhand">${bjS.p.map(card).join('')}</div>`;
    if (!done) {
      html += `<div class="grid"><button data-bj="hit">Otra carta</button><button data-bj="stand">Plantarse</button></div>`;
    } else {
      const mult = bjResult(bjS);
      const win = Math.floor(bjS.bet * mult);
      const msg = mult === 0 ? `La casa se queda tus $${bjS.bet}. Otis no disfruta. Mucho.`
        : mult === 1 ? 'Empate. Cada cual con lo suyo, como los buenos vecinos.'
        : mult === 2.5 ? `¡BLACKJACK! $${win}. Otis revisa la baraja por principio.`
        : `Ganas $${win}. La casa aplaude por dentro, muy adentro.`;
      html += `<div class="panel">${msg}</div><div class="grid"><button data-bj="again">Otra mano</button><button data-bj="out">Dejar la mesa</button></div>`;
    }
  }
  $('screen').innerHTML = html;
  const back = $('screen').querySelector('[data-back]');
  if (back) back.onclick = () => { cantinaView = null; bjS = null; renderAll(); };
  $('screen').querySelectorAll('button[data-bet]').forEach(b => b.onclick = () => {
    const bet = +b.dataset.bet;
    g.money -= bet;
    bjS = Object.assign(bjDeal(), { bet });
    if (bjValue(bjS.p) === 21) { bjStand(bjS); settleBJ(); }
    renderAll();
  });
  $('screen').querySelectorAll('button[data-bj]').forEach(b => b.onclick = () => {
    const a = b.dataset.bj;
    if (a === 'hit') { bjHit(bjS); if (bjS.stage === 'done') settleBJ(); }
    if (a === 'stand') { bjStand(bjS); settleBJ(); }
    if (a === 'again') bjS = { stage: 'bet' };
    if (a === 'out') { cantinaView = null; bjS = null; }
    renderAll();
  });
}
function settleBJ() {
  const mult = bjResult(bjS);
  const win = Math.floor(bjS.bet * mult);
  if (win > 0) S.G.money += win;
  if (mult >= 2) { S.G.stats.pokerWon += win - bjS.bet; addStress(player(), -3); }
  else if (mult === 0) { S.G.stats.pokerLost += bjS.bet; addStress(player(), 2); }
  S.save();
}

// ==================== LA GALLERA ====================
function renderGallera() {
  const g = S.G, f = gfS.fight;
  let html = `<button data-back="1">← A la barra</button><h2 style="margin-top:10px">🐓 LA GALLERA</h2>`;
  if (gfS.stage === 'bet') {
    html += `<div class="flavor">Serrín, humo y gritos. Los stats no mienten; las plumas, a veces.</div>
      <div class="grid">
        <div class="panel"><b class="amber">🐓 ${f.a.name}</b><br><span class="small">Ataque ${f.a.ataque} · Aguante ${f.a.aguante}<br>paga ×${f.payA}</span></div>
        <div class="panel"><b class="amber">🐓 ${f.b.name}</b><br><span class="small">Ataque ${f.b.ataque} · Aguante ${f.b.aguante}<br>paga ×${f.payB}</span></div>
      </div><h3>Tu apuesta</h3><div class="grid">`;
    for (const side of ['a', 'b']) {
      for (const v of [5, 15, 30]) {
        html += `<button data-gbet="${side}:${v}" ${g.money < v ? 'disabled' : ''}>$${v} a ${f[side].name}</button>`;
      }
    }
    html += `</div>`;
    $('screen').innerHTML = html;
    $('screen').querySelector('[data-back]').onclick = () => { cantinaView = null; gfS = null; renderAll(); };
    $('screen').querySelectorAll('button[data-gbet]').forEach(b => b.onclick = () => {
      const [side, v] = b.dataset.gbet.split(':');
      g.money -= +v;
      g.daily.gallo = true;
      gfS.bet = { side, v: +v };
      gfS.sim = simFight(f);
      gfS.stage = 'fight';
      gfS.shown = 0;
      S.save();
      renderAll();
      animateFight();
    });
    return;
  }
  // pelea en curso / terminada
  const done = gfS.shown >= gfS.sim.rounds.length;
  html += `<div class="gallera-arena">
      <div class="gallo-wrap"><span id="gA" class="gallo faceR">🐓</span><b class="dim small">${f.a.name}</b></div>
      <div class="gallo-wrap"><span id="gB" class="gallo faceL">🐓</span><b class="dim small">${f.b.name}</b></div></div>
    <div class="clog" id="gLog">${gfS.sim.rounds.slice(0, gfS.shown).map(r => `<div>${r.txt}${r.dmg ? ` <span class="red">(−${r.dmg})</span>` : ''}</div>`).join('')}</div>`;
  if (done) {
    const won = gfS.bet.side === 'a' ? gfS.sim.winner === f.a.name : gfS.sim.winner === f.b.name;
    const pay = won ? Math.floor(gfS.bet.v * (gfS.bet.side === 'a' ? f.payA : f.payB)) : 0;
    if (!gfS.settled) {
      gfS.settled = true;
      if (pay > 0) { S.G.money += pay; S.G.stats.pokerWon += pay - gfS.bet.v; }
      else S.G.stats.pokerLost += gfS.bet.v;
      S.save();
    }
    html += `<div class="panel">🏆 <b class="amber">${gfS.sim.winner}</b> se queda la arena. ${won ? `Cobras $${pay}. El gallero te mira con nuevo respeto.` : `Tus $${gfS.bet.v} vuelan con las plumas. El gallero te mira con viejo cariño.`}</div>
      <div class="grid"><button class="wide" data-back="1">Volver a la barra</button></div>`;
  }
  $('screen').innerHTML = html;
  const back2 = $('screen').querySelector('[data-back]');
  if (back2) back2.onclick = () => { cantinaView = null; gfS = null; renderAll(); };
  const lg = $('gLog');
  if (lg) lg.scrollTop = lg.scrollHeight;
}
function animateFight() {
  if (!gfS || gfS.stage !== 'fight') return;
  if (gfS.shown >= gfS.sim.rounds.length) { renderAll(); return; }
  gfS.shown++;
  renderAll();
  const r = gfS.sim.rounds[gfS.shown - 1];
  const el = r.att === gfS.fight.a.name ? $('gA') : $('gB');
  if (el) el.classList.add('peck');
  setTimeout(animateFight, 650);
}

// ==================== PRÁCTICA DE TIRO ====================
function renderRange() {
  const g = S.G;
  const maxShots = Math.min(8, g.ammo.balas);
  $('screen').innerHTML = `<button data-back="1">← A la barra</button>
    <h2 style="margin-top:10px">🎯 LA CERCA DE LAS BOTELLAS</h2>
    <div class="flavor">15 segundos, ${maxShots} balas. Toca las botellas: cada acierto entrena tu puntería DE VERDAD.</div>
    <div id="rangeBox"></div>`;
  $('screen').querySelector('[data-back]').onclick = () => { cantinaView = null; renderAll(); };
  practice($('rangeBox'), 15, maxShots, (hits, shots) => {
    g.ammo.balas = Math.max(0, g.ammo.balas - shots);
    g.stats.shots += shots;
    g.daily.range = true;
    const p = player();
    addXp(p, 'punteria', hits);
    S.log(`Práctica: ${hits}/${shots} botellas. ${hits >= shots * 0.7 && shots > 3 ? 'Fitch estaría casi orgulloso.' : 'La cerca sobrevivió con dignidad.'}`);
    S.save();
    cantinaView = null;
    renderAll();
    showScene({ title: '🎯 Resultado', text: `${hits} botellas de ${shots} disparos.\n\n${hits > 5 ? 'El pueblo entero oyó el ritmo. Eso también es fama.' : hits > 2 ? 'Mano firme. La leyenda se fabrica bala a bala.' : 'Las botellas ganaron hoy. Mañana es otro duelo.'}\n\n(+${hits} XP de puntería)` }, () => {});
  });
}

// ==================== LA GUERRA DE FACCIONES (TOMO II) ====================
function renderEmpire() {
  const g = S.G;
  EMP.ensureTerritory();
  const path = EMP.path();
  const pathTxt = path === 'querido' ? '<span class="green">Camino del patrón querido</span> — tu control se sostiene solo.'
    : path === 'temido' ? '<span class="red">Camino del amo temido</span> — el miedo se erosiona sin sangre fresca.'
    : 'Camino mixto — ni del todo querido, ni del todo temido.';
  let html = `<button data-back="1">← Volver al pueblo</button>
    <h2 style="margin-top:10px">👑 EL TERRITORIO</h2>
    <div class="flavor">${pathTxt}<br>Humanidad ${g.rep.humanidad} · Pueblos tuyos: ${EMP.playerTownCount()}/${TOWN_ORDER.length}</div>`;

  for (const tid of TOWN_ORDER) {
    const town = TOWNS[tid];
    const inf = g.territory.towns[tid].inf;
    const ctrl = EMP.controllerOf(tid);
    const ctrlName = ctrl === 'player' ? 'TÚ' : ctrl ? GANGS[ctrl].name : 'nadie manda aún';
    const ctrlCls = ctrl === 'player' ? 'green' : ctrl ? 'red' : 'dim';
    // barras de influencia
    const parts = Object.keys(inf).filter(k => inf[k] > 0).sort((a, b) => inf[b] - inf[a]);
    let bars = '';
    for (const k of parts) {
      const nm = k === 'player' ? 'Tú' : GANGS[k].name;
      const col = k === 'player' ? 'var(--green)' : (GANGS[k] ? GANGS[k].color : 'var(--dim)');
      bars += `<div class="infrow"><span class="infname">${nm}</span><div class="infbar"><i style="width:${inf[k]}%;background:${col}"></i></div><em>${inf[k]}</em></div>`;
    }
    html += `<div class="card"><div class="row"><span class="title">${town.name}</span><span class="${ctrlCls} small">${ctrlName}</span></div>
      <div class="small dim">${town.sub}</div>
      <div class="infbars">${bars}</div>
      <div class="grid" style="margin-top:8px">
        <button data-emp="parley:${tid}">🤝 Parlamentar<br><span class="dim small">Labia. Lento, limpio.</span></button>
        <button data-emp="favor:${tid}">🎁 Hacer un favor<br><span class="dim small">Dinero. +humanidad.</span></button>
        <button data-emp="blood:${tid}" class="danger">🩸 Apretar<br><span class="dim small">Miedo. Rápido, −humanidad.</span></button>
      </div></div>`;
  }
  html += `<div class="panel small dim">Cada maniobra consume días: esta guerra se libra en años, no en tardes. Controla los cinco pueblos para reclamar la corona — y elige con qué mano la reclamas.</div>`;
  $('screen').innerHTML = html;
  $('screen').querySelector('[data-back]').onclick = () => { mapaView = null; renderAll(); };
  $('screen').querySelectorAll('button[data-emp]').forEach(b => b.onclick = () => {
    const [kind, tid] = b.dataset.emp.split(':');
    EMP.maneuver(tid, kind, showScene);
  });
}

// ==================== EL MAPA DEL TERRITORIO ====================
function renderTerritory() {
  const f = S.G.flags, once = S.G.once;
  // Cada lugar: coords, nombre, subtítulo, tipo, ¿descubierto?, e historia.
  const LOCS = [
    { id: 'marrow', x: 175, y: 175, r: 6, cls: 'home', name: 'MARROW CREEK', sub: 'tu casa',
      known: true, desc: 'Barro, tablones y «El Cuervo». Aquí tienes mesa, gente y una silla que aún no está caliente. Todo lo demás en este mapa gira alrededor de este punto.' },
    { id: 'blackvein', x: 322, y: 78, r: 6, cls: 'city', name: 'BLACKVEIN CITY', sub: 'humo y libretas',
      known: true, desc: 'La ciudad del carbón: doce mil almas, luz eléctrica en tres calles, y la Compañía Blackvein contándolo todo desde una oficina con demasiados papeles. El futuro vive aquí. No parece contento de vivir.' },
    { id: 'desfiladero', x: 60, y: 118, r: 4, cls: 'grave', name: 'El Desfiladero', sub: 'donde empezó todo',
      known: true, desc: 'Rocas rojas y un camino que se estrecha. Aquí murió Sam Corddry, traicionado por Dawson. Vuelves a veces, en sueños. Él te dice que dejes de venir.' },
    { id: 'dry_creek', x: 300, y: 215, r: 5, cls: 'gang', name: 'Dry Creek', sub: 'las tierras malas',
      known: f.t1done >= 4, desc: 'El feudo de los Kettle, forajidos a la antigua. Boone Kettle heredó el rencor de Ezekiel Grey. Aquí no se entra sin motivo, y del motivo casi nunca se vuelve.' },
    { id: 'redwater', x: 120, y: 250, r: 5, cls: 'gang', name: 'Redwater', sub: 'el río del sur',
      known: f.t1done >= 8 || once.includes('sq_viuda'), desc: 'Contrabando, barcazas y la Reina Sable, que heredó el oficio de Rose Thatcher. En el río se compra todo — hasta la paz, si sabes con quién hablar.' },
    { id: 'bent_fork', x: 152, y: 58, r: 5, cls: 'town', name: 'Bent Fork', sub: 'campos e iglesia',
      known: once.includes('sq_cartas') || f.t1done >= 8, desc: 'Trigo, una iglesia quemada y el silencio del norte. Bajo el altar de esa iglesia hay una historia que Sam se llevó a la tumba. La Marshal Rourke pone aquí su placa.' },
    { id: 'dry_wells', x: 58, y: 235, r: 4, cls: 'grave', name: 'Dry Wells', sub: 'el pueblo del silencio',
      known: once.includes('sq_dry_wells'), desc: 'Un pueblo entero que se levantó de la mesa y no volvió. La Blackvein envenenó su pozo para comprarlo por centavos. No queda nadie. Casi nadie.' },
    { id: 'arroyo', x: 285, y: 150, r: 4, cls: 'grave', name: 'El Arroyo Seco', sub: 'dos tumbas',
      known: f.t1done >= 8, desc: 'Una cicatriz de grava blanca. Aquí, en 1874, murió una amistad. Y aquí, un cuarto de siglo después, la enterraste del todo. Dos socios, dos tumbas, una historia cerrada.' },
    { id: 'niebla', x: 40, y: 175, r: 3, cls: 'myth', name: '¿?', sub: '',
      known: once.includes('taberna_niebla'), desc: 'Una luz donde nunca hubo nada. Una taberna que solo aparece con la niebla cerrada y sirve un whisky que sabe a tu mejor recuerdo. Nadie la encuentra dos veces. Tú sí la encontraste una.' }
  ];
  const node = (l) => l.known ? `
    <circle cx="${l.x}" cy="${l.y}" r="${l.r}" class="tmark ${l.cls} tnode" data-loc="${l.id}"/>
    <text x="${l.x}" y="${l.y - l.r - 3}" class="tlabel" data-loc="${l.id}">${l.name}</text>
    ${l.sub ? `<text x="${l.x}" y="${l.y + l.r + 10}" class="tsub">${l.sub}</text>` : ''}`
    : `<circle cx="${l.x}" cy="${l.y}" r="3" class="tmark unknown"/><text x="${l.x}" y="${l.y - 6}" class="tlabel dim">?</text>`;
  $('screen').innerHTML = `<button data-back="1">← Volver al pueblo</button>
    <h2 style="margin-top:10px">🗺️ TERRITORIO DE RED MARROW</h2>
    <div class="flavor">Toca un lugar para recordar su historia. Los sitios aparecen cuando los vives.</div>
    <div class="tmap"><svg viewBox="0 0 360 300" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="360" height="300" fill="#1b1712"/>
      <path d="M0 40 Q90 20 180 45 T360 40 L360 0 L0 0 Z" fill="#221c14" opacity="0.6"/>
      <path d="M0 260 Q120 285 240 265 T360 270 L360 300 L0 300 Z" fill="#241d12" opacity="0.6"/>
      <path d="M175 175 L322 78 M175 175 L300 215 M175 175 L120 250 M175 175 L152 58 M175 175 L60 118 M175 175 L58 235 M175 175 L285 150" class="trail"/>
      <path d="M90 250 Q140 240 180 255 Q230 272 300 250" class="river"/>
      <path d="M40 100 l7 -11 l7 11 M56 96 l7 -11 l7 11 M130 44 l7 -11 l7 11 M146 40 l7 -11 l7 11 M162 44 l7 -11 l7 11" class="tmount"/>
      <text x="150" y="20" class="tsub">colinas del norte</text>
      <text x="300" y="245" class="tsub">tierras malas</text>
      <text x="45" y="290" class="tsub">el desierto grande</text>
      <text x="240" y="285" class="tsub">～ el río rojo ～</text>
      ${LOCS.map(node).join('')}
    </svg></div>
    <div class="panel small dim">☠ tumbas · ● pueblos · ◆ ciudad · ✦ leyendas. El territorio se gana a pie.</div>`;
  $('screen').querySelector('[data-back]').onclick = () => { mapaView = null; renderAll(); };
  $('screen').querySelectorAll('[data-loc]').forEach(el => el.addEventListener('click', () => {
    const l = LOCS.find(x => x.id === el.getAttribute('data-loc'));
    if (l && l.known) showScene({ title: `📍 ${l.name}`, text: l.desc }, () => {});
  }));
}

// ==================== COMBATE ====================
function renderCombat() {
  const C = CB.C;
  $('nav').querySelectorAll('button').forEach(b => b.classList.remove('on'));
  // Duelo: el desenfunde se juega con el dedo, no con el dado.
  if (C.quickdraw && !C.qdDone && C.active && C.active.ch && C.active.ch.id === S.G.player) {
    const foe = C.units.find(u => u.kind === 'en' && !u.dead);
    $('screen').innerHTML = `<div class="combat"><div class="c-title">⚔ ${C.title}</div>
      <div class="flavor">Tus reflejos (${C.active.sk.reflejos}) contra los suyos (${foe ? foe.sk.reflejos : '?'}). Espera la señal. Toca la silueta. Reza después.</div>
      <div id="qdBox"></div></div>`;
    quickdraw($('qdBox'), C.active.sk.reflejos, foe ? foe.sk.reflejos : 50, foe ? foe.name : 'el otro',
      (win) => { CB.applyQuickdraw(win); });
    return;
  }
  let html = `<div class="combat"><div class="c-title">⚔ ${C.title}</div><div class="round">Ronda ${C.round}</div>`;

  html += `<div class="foes">`;
  for (const u of C.units) {
    if (u.kind !== 'en') continue;
    const cls = ['unit foe'];
    if (u.dead || u.fled) cls.push('down');
    if (combatMode && !u.dead && !u.fled) cls.push('targetable');
    // Con un objetivo en la mira, los números mandan: % real de acierto.
    const showPct = combatMode && (combatMode === 'shoot' || combatMode === 'aim') && !u.dead && !u.fled && C.active;
    const pct = showPct ? CB.hitChance(C.active, u, combatMode === 'aim') : 0;
    html += `<div class="${cls.join(' ')}" data-tgt="${u.uid}">
      <div class="uname">${u.name}${showPct ? ` <span class="amber">${pct}%</span>` : ''}</div>
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
      ${w ? ` · ${w.load}/${effMag(w)}${w.broken ? ' ROTA' : u.jam ? ' ⚙ENCASQ.' : ''}` : ''}` : ''}</div></div>`;
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
      if (u.w && !u.w.broken && wd && u.w.load < effMag(u.w)) html += `<button data-c="reload">↻ Recargar (${S.G.ammo[wd.ammo] || 0} ${wd.ammo})</button>`;
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

function cap0(t) { return t.charAt(0).toUpperCase() + t.slice(1); }

// El Hilo: resume la historia principal y señala el siguiente paso.
// Así el modo historia solo «avanza» cuando TÚ juegas la misión principal.
function storyThread() {
  const g = S.G, f = g.flags;
  const TITLES = { 1: 'El camino de Marrow Creek', 2: 'El hombre del bombín', 3: 'La pista de Dawson',
    4: 'Plumas rojas', 5: 'La noche que sangró «El Cuervo»', 6: 'El nombre del muerto',
    7: 'Los aliados del alba', 8: 'El arroyo seco' };
  const done = f.t1done || 1;
  // ¿Tomo II activo?
  if (done >= 8) {
    if (!g.territory || !g.territory.init) return '<b class="amber">TOMO II — «El precio de una corona»</b><br>La guerra de facciones está por comenzar. Ve al MAPA → EL TERRITORIO.';
    const n = EMP.playerTownCount();
    if (g.territory.crowned) return '<b class="amber">TOMO II — completado</b><br>Reinas sobre Red Marrow. El Tomo III (el traspaso) llegará con una futura actualización. Mientras: el territorio es tuyo. Vívelo.';
    const p = EMP.path();
    return `<b class="amber">TOMO II — «El precio de una corona»</b><br>Controlas <b>${n}/5</b> pueblos. Camino: ${p === 'querido' ? 'el patrón <span class="green">querido</span>' : p === 'temido' ? 'el amo <span class="red">temido</span>' : 'mixto'}.<br><span class="dim">Siguiente: gana influencia en el MAPA → EL TERRITORIO. Controla los cinco pueblos para reclamar la corona.</span>`;
  }
  // Tomo I en curso
  let next;
  if (f.t1) next = `Te espera el <b>Capítulo ${f.t1}: ${TITLES[f.t1]}</b> en el MAPA (marcado 📖).`;
  else if (done === 2 && f.dawson === 2) next = 'Sigue <b>la pista de Dawson</b> en el MAPA (★), cuando estés listo.';
  else if (done === 2) next = 'Un rumor sobre Dawson llegará pronto. Vive tu vida mientras tanto.';
  else next = `El siguiente capítulo llegará con los días. La historia solo avanza cuando tú das el paso.`;
  return `<b class="amber">TOMO I — «Todos los caminos cobran peaje»</b><br>Último capítulo cerrado: <b>${done}. ${TITLES[done] || '—'}</b>.<br><span class="dim">${next}</span>`;
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
  // OJO: en cola, nunca directamente — podría pisar una escena de historia
  // abierta por el onEnd del combate (p.ej. el entierro de Sam).
  const p = player();
  if (p && p.recoverUntil && p.recoverUntil > S.G.time.day) {
    const days = p.recoverUntil - S.G.time.day;
    T.advanceDays(days, { rest: true });
    queueScene({
      title: 'Los días perdidos',
      text: `Fiebre, vendas, caras que entran y salen del catre. ${days} días se caen del calendario como páginas arrancadas.\n\nCuando por fin te sostienen las piernas, el espejo te devuelve a alguien un poco más parecido a Sam. No sabes si eso te gusta.`,
      opts: [{ t: 'Volver a la mesa' }]
    });
  }
  pump();
}
