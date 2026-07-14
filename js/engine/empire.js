// MIROLE — TOMO II: la guerra de facciones. Lenta, de años. La corona
// no se gana matando: se gana pueblo a pueblo, con tratos (humanidad
// arriba → patrón querido) o con sangre (humanidad abajo → tirano
// temido). Los dos caminos llevan a la silla; solo cambia quién te
// defiende cuando ya estás en ella.
import { G, log, journal, choice, queueEvent } from './state.js';
import { rint, pick, chance } from './rng.js';
import { player, addXp } from './chars.js';
import { TOWNS, GANGS, TOWN_ORDER, START_INFLUENCE } from '../data/gangs.js';

const THRESHOLD = 55;   // por encima de esto, y siendo el mayor, controlas
const ACTION_DAYS = 3;  // cada maniobra política consume días: la guerra es lenta

export function empireUnlocked() { return G.flags.t1done >= 8; }

export function ensureTerritory() {
  if (G.territory && G.territory.init) return;
  const towns = {};
  for (const id of TOWN_ORDER) {
    towns[id] = { inf: Object.assign({ player: 0 }, START_INFLUENCE[id] || {}) };
  }
  const gangs = {};
  for (const id in GANGS) gangs[id] = { rel: 0 };
  // Semillas del Tomo I: lo vivido inclina la balanza inicial.
  if (G.flags.dawsonFate === 'vivo' || G.rep.humanidad >= 60) gangs.law.rel += 10;
  if (G.once.includes('sq_viuda')) gangs.redwater.rel += 20; // respetaste a Rose
  if (G.flags.pemberton === 'enemigo') gangs.blackvein.rel -= 20;
  if (G.flags.pemberton === 'complice') gangs.blackvein.rel += 15;
  G.territory = { init: true, towns, gangs, lastDrift: G.time.day, crowned: false };
  journal('Con Grey bajo tierra, el territorio entero es una silla vacía. Y yo, de pronto, el que tiene las manos suficientemente sucias para sentarse. Empieza otra guerra. Esta se pelea despacio.');
}

export function controllerOf(townId) {
  const inf = G.territory.towns[townId].inf;
  let best = null, bestV = THRESHOLD;
  for (const k in inf) { if (inf[k] > bestV) { bestV = inf[k]; best = k; } }
  return best; // 'player', gangId, o null (nadie manda)
}
export function playerTownCount() {
  return TOWN_ORDER.filter(t => controllerOf(t) === 'player').length;
}

// El camino: querido (humanidad alta) o temido (humanidad baja).
export function path() {
  if (G.rep.humanidad >= 60) return 'querido';
  if (G.rep.humanidad <= 35) return 'temido';
  return 'mixto';
}

function shift(townId, who, n) {
  const inf = G.territory.towns[townId].inf;
  inf[who] = Math.max(0, Math.min(100, (inf[who] || 0) + n));
}
function rivalsIn(townId) {
  const inf = G.territory.towns[townId].inf;
  return Object.keys(inf).filter(k => k !== 'player' && inf[k] > 0);
}

// Deriva semanal: si desatiendes un pueblo, sus bandas empujan solas.
// El control por MIEDO se erosiona sin ti; el control QUERIDO aguanta.
export function drift() {
  if (!G.territory || !G.territory.init) return;
  if (G.time.day - G.territory.lastDrift < 7) return;
  G.territory.lastDrift = G.time.day;
  for (const id of TOWN_ORDER) {
    const ctrl = controllerOf(id);
    const inf = G.territory.towns[id].inf;
    // Las bandas fuertes de su propio hogar recuperan terreno.
    for (const g in GANGS) {
      if (GANGS[g].home === id && inf[g] > 0 && ctrl !== g) shift(id, g, rint(1, 3));
    }
    // Tu control se desgasta si es por miedo; se sostiene si es por cariño.
    if (ctrl === 'player') {
      const decay = path() === 'querido' ? 0 : path() === 'temido' ? 2 : 1;
      if (decay) shift(id, 'player', -decay);
    }
  }
}

// ---------- las maniobras políticas (la carne de la guerra) ----------
// kind: 'parley' | 'favor' | 'blood'. sceneFn la aporta la UI.
export function maneuver(townId, kind, sceneFn) {
  const T = TOWNS[townId], p = player();
  const rivals = rivalsIn(townId);
  const rival = rivals.length ? pick(rivals) : null;
  const gname = rival ? GANGS[rival].name : 'los que quedan';

  if (kind === 'parley') {
    sceneFn({
      title: `Parlamento en ${T.name}`,
      text: `Te sientas a la mesa con la gente que importa en ${T.name}. Sin armas a la vista — esa es la mitad del mensaje. La otra mitad la pones tú, con la lengua.`,
      opts: [{ t: `Convencer (Labia ${p.skills.labia})`, fx() {
        addXp(p, 'labia', 3);
        advance();
        const win = p.skills.labia + G.rep.fama / 3 + rint(0, 30) >= 55;
        if (win) {
          shift(townId, 'player', rint(6, 10));
          if (rival) G.territory.gangs[rival].rel += 2;
          G.rep.humanidad = Math.min(100, G.rep.humanidad + 1);
          journal(`Gané terreno en ${T.name} sin desenfundar. Palabra a palabra, el pueblo se inclina.`);
          return `Hablas de futuro, de calles seguras, de negocios que crecen bajo tu sombra en vez de a pesar de ella.\n\nAsienten. No todos, no del todo — pero en ${T.name} hay ahora gente que dice tu nombre sin escupir. Así se empieza.`;
        }
        shift(townId, 'player', rint(1, 3));
        return `${gname} ha llegado antes con mejores promesas o peores amenazas. Ganas un palmo de terreno, no la sala. La próxima, ven con más peso en la voz.`;
      } }]
    }, () => {});
    return;
  }

  if (kind === 'favor') {
    const cost = 20 + playerTownCount() * 10;
    if (G.money < cost) { sceneFn({ title: 'Sin fondos', text: `Ganarse a ${T.name} cuesta $${cost} en favores: tejados, deudas perdonadas, un pozo nuevo. No los tienes. El cariño, resulta, también se compra.`, opts: [{ t: 'Volver' }] }, () => {}); return; }
    sceneFn({
      title: `Un favor a ${T.name}`,
      text: `$${cost} bien puestos: se arreglan tejados, se perdonan deudas al almacén, se paga el médico de quien no llega. La gente no olvida quién estuvo cuando el invierno apretaba.`,
      opts: [{ t: `Pagar los favores ($${cost})`, fx() {
        G.money -= cost;
        advance();
        shift(townId, 'player', rint(7, 12));
        G.rep.humanidad = Math.min(100, G.rep.humanidad + 3);
        G.rep.fama = Math.min(100, G.rep.fama + 1);
        choice(`Compré el cariño de ${T.name} con favores, no con miedo.`);
        journal(`${T.name} me debe favores de los que se pagan con lealtad. El camino del patrón querido es caro y lento. Es el que elijo hoy.`);
        return `Semanas después, cuando pasas a caballo por ${T.name}, un crío te saluda con la mano y una vieja te guarda pan.\n\nEsto no sale en ningún cartel. Vale más que todos.`;
      } }]
    }, () => {});
    return;
  }

  if (kind === 'blood') {
    sceneFn({
      title: `Apretar ${T.name}`,
      text: `Hay una forma rápida: que ${T.name} entienda qué le conviene. Una visita nocturna, un aviso que no se olvida, la clase de mensaje que se manda con los nudillos.\n\nRápido. Efectivo. Y el espejo te va a cobrar la factura.`,
      opts: [
        { t: 'Mandar el mensaje (sangre y miedo)', fx() {
            advance();
            shift(townId, 'player', rint(12, 18));
            G.rep.humanidad = Math.max(0, G.rep.humanidad - 8);
            G.rep.fama = Math.min(100, G.rep.fama + 3);
            if (rival) G.territory.gangs[rival].rel -= 8;
            choice(`Sometí a ${T.name} por miedo. Fue rápido. Fue feo. Funcionó.`);
            journal(`${T.name} ya no discute mis decisiones. No porque me quieran: porque saben lo que pasa si no. El miedo es un terreno que hay que regar con sangre cada temporada.`);
            // El miedo engendra enemigos: a veces la banda rival contraataca.
            if (rival && chance(0.4)) queueEvent('faccion_guerra:' + rival);
            return `El mensaje llega. ${T.name} baja la cabeza.\n\nDe camino a casa, Eli cabalga en silencio un buen rato. Luego, sin mirarte: «Grey también empezó así, ¿sabes? Convenciendo a puñetazos. Solo digo eso.»\n\nNo dice más. No hace falta.`;
          } },
        { t: 'No. Hoy no.', fx() { return 'Das media vuelta. Hay noches en que la parte más dura de un hombre duro es la que decide no serlo.'; } }
      ]
    }, () => {});
    return;
  }

  function advance() {
    // Importado perezosamente para no crear ciclo con time.js
    import('./time.js').then(m => { m.advanceDays(ACTION_DAYS, { travel: true }); checkCrown(sceneFn); });
  }
}

// ¿Ya controlas todo el territorio? La corona espera — en dos formas.
export function checkCrown(sceneFn) {
  if (!G.territory || G.territory.crowned) return;
  if (playerTownCount() < TOWN_ORDER.length) return;
  G.territory.crowned = true;
  const querido = path() === 'querido';
  choice(querido ? 'Me convertí en el patrón querido de todo Red Marrow.' : 'Me convertí en el amo temido de todo Red Marrow.');
  journal(querido
    ? 'Controlo el territorio entero. No con miedo: con favores, con palabra, con inviernos en que estuve. Nadie me puso una corona. Me la ganaron ellos por mí, pueblo a pueblo. Sam no lo habría creído. Puede que sí.'
    : 'Controlo el territorio entero. Cada pueblo agacha la cabeza cuando cruzo. Tengo la corona que quería y el silencio que no. Grey tenía razón en una cosa: la silla es fría. Pero es mía.');
  G.rep.fama = Math.min(100, G.rep.fama + 15);
  if (sceneFn) sceneFn({
    title: querido ? '👑 EL PATRÓN DE RED MARROW' : '👑 EL AMO DE RED MARROW',
    text: querido
      ? 'Cinco pueblos. Ni una guerra que no cerraras hablando, ni un invierno en que no estuvieras.\n\nNo hay ceremonia — la gente como tú no se corona en catedrales. Pero un domingo, sin avisar, los cinco pueblos mandan a alguien a Marrow Creek: un pan, una manta, una botella del bueno, un dibujo torcido de un niño. Ofrendas de gente libre a un hombre en quien confían.\n\nEli, ya viejo, mira la mesa llena y por fin lo dice: «Lo hiciste. Y lo hiciste bien, muchacho. Sam está presumiendo en alguna parte.»\n\nHas ganado el territorio sin perder el alma. Poca gente puede decir las dos cosas.\n\n(El Tomo III — el traspaso — llegará con una futura actualización. Tu reino, tus decisiones y tus muertos viajarán contigo.)'
      : 'Cinco pueblos bajo tu bota. Ni uno se resiste ya: aprendieron.\n\nCruzas Red Marrow y las calles se vacían con respeto de funeral. Tienes todo lo que un hombre puede tomar por la fuerza, que resulta ser todo menos lo único que importaba.\n\nEli hace años que casi no habla. Esta noche lo hace: «Te seguí hasta aquí porque se lo debía a Sam. Ya está pagado.» Deja «La Viuda» sobre la mesa, limpia. «Me voy a Bent Fork a oficiar bodas, muchacho. A ver si me acuerdo de cómo se bendice algo.»\n\nTienes el territorio entero. Y la mesa, esta noche, tiene una silla menos.\n\n(El Tomo III — el traspaso — llegará con una futura actualización. Tu reino, tus decisiones y tus muertos viajarán contigo.)',
    opts: [{ t: 'Sentarte en la silla' }]
  }, () => {});
}
