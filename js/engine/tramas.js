// MIROLE — LAS TRAMAS. El motor de la presión.
//
// Un juego sin reloj no es un drama: es un catálogo. Aquí viven los
// HILOS ABIERTOS — cosas que te persiguen, con fecha. Cada trama tiene
// un deseo o una amenaza, unos latidos que ESCALAN solos aunque tú no
// hagas nada, y un desenlace que cambia el mundo. Si la ignoras, se
// cobra sola. Esa es la diferencia entre «puedes hacer cosas» y
// «tienes que decidir hoy».
//
// Doctrina: las tramas se ABREN y se CIERRAN, pero nunca se acaban
// todas. Siempre hay 1-3 vivas. La historia no termina; cambia de dueño.
import { G, log, journal, choice, queueEvent, yearOf } from './state.js';
import { pick, chance, rint } from './rng.js';
import { player, aliveSquad, ageOf } from './chars.js';
import { FIRST, LAST } from '../data/names.js';
import { GANGS } from '../data/gangs.js';

const nm = () => `${pick(FIRST)} ${pick(LAST)}`;
const MAX_ACTIVAS = 3;

export function ensureTramas() {
  if (!Array.isArray(G.tramas)) G.tramas = [];
  if (!G.flags.tramaId) G.flags.tramaId = 1;
}
export function activeTramas() { ensureTramas(); return G.tramas.filter(t => !t.done); }
export function diasPara(t) { return t.due - G.time.day; }
// La que más aprieta primero: el reloj manda el orden.
export function tramasOrdenadas() { return activeTramas().sort((a, b) => diasPara(a) - diasPara(b)); }

function nuevaTrama(o) {
  ensureTramas();
  const t = Object.assign({ id: G.flags.tramaId++, born: G.time.day, beat: 0, done: false }, o);
  G.tramas.push(t);
  log(`⏳ ${t.title}`);
  return t;
}
export function cerrarTrama(t, comoTxt) {
  t.done = true;
  t.closedDay = G.time.day;
  if (comoTxt) choice(comoTxt);
  // Al cerrar una, el territorio no te deja respirar mucho: otra se abrirá.
  G.flags.tramaCooldown = G.time.day + rint(2, 6);
}

// ═══════════════ LOS TIPOS DE HILO ═══════════════
// Cada uno: un deseo o una amenaza, un reloj, y latidos que escalan.

// 1. LA DEUDA — con la que empieza todo. Debes dinero a alguien que
//    cobra con los dedos. Desde el minuto uno, cada día cuenta.
function abrirDeuda(monto, acreedor, dias) {
  return nuevaTrama({
    tipo: 'deuda',
    title: `Le debes $${monto} a ${acreedor}`,
    who: acreedor,
    monto, due: G.time.day + dias,
    stakes: 'Si no pagas, vienen a cobrar en carne.'
  });
}

// 2. MARCADO — una banda o un enemigo te ha señalado. Vienen. Puedes
//    esperarlos, adelantarte, o comprar la paz.
function abrirMarcado(quien, dias, gangKey) {
  return nuevaTrama({
    tipo: 'marcado',
    title: `${quien} te ha marcado`,
    who: quien, gang: gangKey || null,
    due: G.time.day + dias,
    stakes: 'Cuando venza el plazo, vendrán a por ti donde estés.'
  });
}

// 3. EL FAVOR — alguien que te importa necesita algo, y tiene fecha.
//    No hay recompensa en oro. La hay en gente.
function abrirFavor(persona, que, coste, dias) {
  return nuevaTrama({
    tipo: 'favor',
    title: `${persona.name} necesita ${que}`,
    who: persona.name, pkey: persona.key,
    coste, due: G.time.day + dias,
    stakes: 'Si le fallas, lo recordará. La gente recuerda lo que no hiciste.'
  });
}

// 4. LA SOSPECHA — uno de los tuyos, con su secreto, está siendo
//    tentado. La traición nunca sale de un dado: sale de esto, y tienes
//    días para verlo venir. (Doctrina: traición solo por lore.)
function abrirSospecha(ch, dias) {
  return nuevaTrama({
    tipo: 'sospecha',
    title: `Algo pasa con ${ch.alias || ch.name}`,
    who: ch.alias || ch.name, chId: ch.id,
    due: G.time.day + dias,
    stakes: 'Si no lo atajas, se irá — y no se irá con las manos vacías.'
  });
}

// 5. LA OPORTUNIDAD — una ventana que se cierra. Dinero de verdad,
//    riesgo de verdad. El único hilo que puedes dejar pasar sin castigo,
//    aparte del de la conciencia.
function abrirOportunidad(dias) {
  const donde = pick(['el correo de Dry Creek', 'la nómina de la Blackvein', 'un cargamento del río', 'la caja fuerte del hotel de Redwater']);
  const bote = rint(60, 180);
  return nuevaTrama({
    tipo: 'oportunidad',
    title: `Un golpe: ${donde}`,
    who: donde, bote,
    due: G.time.day + dias,
    stakes: `Se habla de $${bote}. La ventana se cierra sola.`
  });
}

// ═══════════════ EL LATIDO DIARIO ═══════════════
export function tramasTick() {
  ensureTramas();
  const p = player();
  if (!p) return;

  // El primer hilo: la deuda de arranque. Nace con la partida y hace
  // que el día 1 ya importe. Sin esto, el juego es un catálogo.
  if (!G.flags.deudaIni && G.time.day >= 2) {
    G.flags.deudaIni = 1;
    const acre = pick(['Rufus Hale', 'la Viuda Ackley', 'Dutch Salomon']);
    const t = abrirDeuda(rint(35, 55), acre, rint(16, 24));
    journal(`${acre} me ha recordado, con esa educación que da miedo, que le debo dinero desde antes del desfiladero. Me da unas semanas. No hará falta que me lo recuerde otra vez.`);
    queueEvent('trama:' + t.id);
  }

  // Vencimientos: lo que ignoras, se cobra solo.
  for (const t of activeTramas()) {
    if (diasPara(t) <= 0) { vence(t); continue; }
    // Latidos de aviso: el hilo se hace notar según se acerca la fecha.
    const d = diasPara(t);
    if ((d === 7 || d === 3 || d === 1) && t.lastBeat !== d) {
      t.lastBeat = d;
      queueEvent('trama:' + t.id);
    }
  }

  // ¿Hay sitio para otro hilo? El territorio NUNCA deja el aire vacío:
  // esto no se deja a un dado. Sin hilos vivos, el juego es un catálogo,
  // así que la presión se garantiza — solo se negocia el ritmo.
  const act = activeTramas();
  const libre = G.time.day > (G.flags.tramaCooldown || 0);
  if (act.length < MAX_ACTIVAS && libre) {
    // Sin nada que te persiga: el territorio te busca en días, no en meses.
    if (act.length === 0) {
      if (!G.flags.vacioDesde) G.flags.vacioDesde = G.time.day;
      if (G.time.day - G.flags.vacioDesde >= 2 || chance(0.5)) { G.flags.vacioDesde = 0; abrirAlgo(); }
    } else if (act.length === 1 && chance(0.12)) abrirAlgo();
    else if (chance(0.05)) abrirAlgo();
  } else if (act.length) G.flags.vacioDesde = 0;
}

// Elige qué hilo abrir LEYENDO tu vida. Nada es aleatorio de verdad:
// nace de tus enemigos, tu gente, tu dinero y tus secretos.
function abrirAlgo() {
  const act = activeTramas();
  const tiene = (tipo) => act.some(t => t.tipo === tipo);
  const opciones = [];

  // Un enemigo tuyo, de verdad, con nombre.
  const ene = G.relations && G.relations.people
    ? Object.values(G.relations.people).filter(p => p.stage !== 'ended' && p.rel <= -45) : [];
  if (ene.length && !tiene('marcado')) opciones.push(() => {
    const e = pick(ene);
    const t = abrirMarcado(e.name, rint(8, 14));
    journal(`Me llega que ${e.name} ha dejado de hablar y ha empezado a organizar. Conmigo de asunto. Tengo días, no semanas.`);
    return t;
  });
  // Una banda a la que has tocado las narices.
  if (G.territory && G.territory.init && !tiene('marcado')) opciones.push(() => {
    const k = pick(Object.keys(GANGS));
    const g = GANGS[k];
    return abrirMarcado(g.leader, rint(9, 16), k);
  });
  // Alguien que te aprecia y necesita algo.
  const amigos = G.relations && G.relations.people
    ? Object.values(G.relations.people).filter(p => p.stage !== 'ended' && p.rel >= 45) : [];
  if (amigos.length && !tiene('favor')) opciones.push(() => {
    const a = pick(amigos);
    const que = pick(['dinero para no perder lo suyo', 'que alguien le quite un problema de encima', 'un acompañante para un camino peligroso']);
    return abrirFavor(a, que, rint(20, 45), rint(10, 18));
  });
  // Uno de los tuyos con un secreto y poca lealtad: la semilla honesta.
  const flojo = aliveSquad().find(c => c.id !== G.player && c.secret && c.loyalty < 55);
  if (flojo && !tiene('sospecha')) opciones.push(() => abrirSospecha(flojo, rint(9, 15)));
  // Siempre puede aparecer un golpe.
  if (!tiene('oportunidad')) opciones.push(() => abrirOportunidad(rint(7, 12)));
  // Y siempre hay alguien a quien le quitaste algo: los muertos tienen
  // hermanos. Cuanta más sangre llevas, más probable que vengan por ella.
  if (!tiene('marcado') && G.stats.kills >= 3) opciones.push(() => {
    const quien = nm();
    const t = abrirMarcado(quien, rint(9, 15));
    journal(`Un tal ${quien} anda diciendo mi nombre por ahí con demasiado cariño. Hermano, primo o socio de alguno de los que dejé en el polvo. Nunca preguntas cuál: la respuesta no cambia lo que hay que hacer.`);
    return t;
  });
  // Y siempre puede caer una deuda nueva: en este oficio se vive fiado.
  if (!tiene('deuda') && G.money < 40) opciones.push(() => {
    const acre = pick(['Rufus Hale', 'la Viuda Ackley', 'Dutch Salomon', 'el prestamista de Blackvein']);
    const t = abrirDeuda(rint(30, 60), acre, rint(14, 20));
    journal(`He tenido que pedir fiado a ${acre}. Se firma con un apretón de manos y se cobra con lo que haga falta. Todo el mundo en este territorio debe algo a alguien; el truco es no deberlo a los que cobran en huesos.`);
    return t;
  });

  if (!opciones.length) return null;
  const t = pick(opciones)();
  if (t) queueEvent('trama:' + t.id);
  return t;
}

// ═══════════════ CUANDO EL RELOJ LLEGA A CERO ═══════════════
function vence(t) {
  switch (t.tipo) {
    case 'deuda': {
      // No pagaste. Vienen. Esto NO se resuelve solo: se encola el cobro.
      queueEvent('trama_cobro:' + t.id);
      t.due = G.time.day + 3; // por si no llegas a ver la escena hoy
      break;
    }
    case 'marcado': {
      queueEvent('trama_golpe:' + t.id);
      t.due = G.time.day + 3;
      break;
    }
    case 'favor': {
      // Le fallaste. La gente recuerda lo que no hiciste.
      const p = G.relations && G.relations.people ? G.relations.people[t.pkey] : null;
      if (p) p.rel = Math.max(-100, p.rel - 30);
      G.rep.humanidad = Math.max(0, G.rep.humanidad - 4);
      journal(`Se acabó el plazo de ${t.who} y yo no aparecí. No hubo reproche: eso es lo peor. La gente que te importa no te grita, solo deja de contar contigo.`);
      log(`${t.who} ya no cuenta contigo.`);
      cerrarTrama(t, `Le fallaste a ${t.who} cuando te necesitaba.`);
      break;
    }
    case 'sospecha': {
      // No lo viste venir. Se va, y se lleva algo.
      const ch = G.chars[t.chId];
      if (ch && ch.alive) {
        const robo = Math.min(G.money, rint(15, 60));
        G.money -= robo;
        ch.alive = false;
        const i = G.squad.indexOf(ch.id);
        if (i >= 0) G.squad.splice(i, 1);
        journal(`${ch.name} se fue esta noche, y con él $${robo} de la caja. Llevaba semanas raro y yo tenía otras cosas en la cabeza. Siempre hay señales. Siempre las hay.`);
        log(`${ch.alias || ch.name} se ha ido. Y no solo.`);
        cerrarTrama(t, `${ch.name} te traicionó — y las señales llevaban semanas ahí.`);
      } else cerrarTrama(t, null);
      break;
    }
    case 'oportunidad': {
      journal(`La ventana de ${t.who} se cerró. Otro se lo llevó. Así se pierden los golpes: no por miedo, por dejarlo para mañana.`);
      log('La oportunidad se cerró. Otros fueron más rápidos.');
      cerrarTrama(t, null);
      break;
    }
    default: cerrarTrama(t, null);
  }
}

// ═══════════════ ACCIONES DEL JUGADOR ═══════════════
export function pagarDeuda(t) {
  if (G.money < t.monto) return false;
  G.money -= t.monto;
  journal(`Pagué a ${t.who} hasta el último centavo. No hay recibo ni apretón de manos: en este territorio pagar solo compra que no vengan. Ya es bastante.`);
  cerrarTrama(t, `Pagaste tu deuda con ${t.who}. Limpio.`);
  return true;
}
export function hacerFavor(t) {
  if (t.coste && G.money < t.coste) return false;
  if (t.coste) G.money -= t.coste;
  const p = G.relations && G.relations.people ? G.relations.people[t.pkey] : null;
  if (p) { p.rel = Math.min(100, p.rel + 25); if (p.af != null) p.af += 2; }
  G.rep.humanidad = Math.min(100, G.rep.humanidad + 3);
  journal(`Le resolví lo suyo a ${t.who}. No me lo agradeció mucho — la gente digna se avergüenza de necesitar. Pero lo apuntó donde se apuntan estas cosas.`);
  cerrarTrama(t, `Estuviste ahí cuando ${t.who} lo necesitaba.`);
  return true;
}
export function atajarSospecha(t, comoTxt) { cerrarTrama(t, comoTxt); }
