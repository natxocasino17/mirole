// MIROLE — EL CRONISTA. El motor que hace que el territorio hable de TU
// partida, no de una partida cualquiera. No hay frases enlatadas sueltas:
// hay piezas que se ensamblan leyendo el estado real — tus muertos, tus
// rencores, tus pueblos, la estación, tu fama — y una memoria corta
// (G.flags.cron) para no contarte dos veces el mismo cuento.
//
// Regla de la casa: cada candidato lleva una CLAVE por tema. La memoria
// guarda claves, no textos: aunque el texto varíe, el tema descansa unas
// cuantas escenas antes de volver a salir.
import { G, seasonOf, yearOf } from './state.js';
import { pick, chance, rint } from './rng.js';
import { aliveSquad, player, ageOf } from './chars.js';
import { GANGS, TOWNS, TOWN_ORDER } from '../data/gangs.js';

// ---------- memoria anticontracción ----------
function mem() { if (!G.flags.cron) G.flags.cron = []; return G.flags.cron; }
function remember(k) { const m = mem(); m.push(k); if (m.length > 70) m.splice(0, m.length - 70); }
function fresh(cands) {
  const norm = cands.filter(c => c && c.t);
  if (!norm.length) return null;
  const m = mem();
  const unused = norm.filter(c => !m.includes(c.k));
  const c = pick(unused.length ? unused : norm);
  remember(c.k);
  return c.t;
}
const C = (k, t) => ({ k, t });

// ---------- lecturas del mundo ----------
function deadFolk() { return (G.cemetery || []).filter(t => !t.animal); }
function season() { return seasonOf(G.time.day); }
function winter() { return season() === 'Invierno'; }
function knownPeople() {
  const r = G.relations;
  return r && r.people ? Object.values(r.people).filter(p => p.stage !== 'ended') : [];
}
function myEnemies() { return knownPeople().filter(p => p.rel <= -40); }
function myFriends() { return knownPeople().filter(p => p.rel >= 50); }
function gangTowns() {
  // ¿Quién manda de verdad en cada pueblo? El que más influencia tiene.
  const out = [];
  if (!G.territory || !G.territory.init) return out;
  for (const id of TOWN_ORDER) {
    const inf = G.territory.towns[id].inf;
    let best = null, n = -1;
    for (const k in inf) if (inf[k] > n) { n = inf[k]; best = k; }
    out.push({ town: TOWNS[id].name, boss: best, n });
  }
  return out;
}

// ---------- 👂 RUMORES: lo que se cuenta en la barra ----------
export function rumor() {
  const cands = [];
  const f = G.flags;
  const p = player();

  // Tus némesis respiran ahí fuera.
  for (const nm of (G.nemeses || []).slice(0, 2)) {
    cands.push(C('nem:' + nm.name, pick([
      `Un arriero jura que vio a ${nm.name} comprando balas en Dry Creek. Pagó sin regatear, y eso siempre es mala señal.`,
      `Dicen que ${nm.name} pregunta por ti en las cantinas del este. Pregunta bajito. Los que preguntan a gritos no son los peligrosos.`,
      `Cuentan que ${nm.name} anda juntando gente. Poca y mala — pero para lo que quiere hacer no hace falta buena.`
    ])));
  }
  // Tus muertos siguen en boca de la gente.
  const dead = deadFolk();
  if (dead.length) {
    const d = pick(dead);
    cands.push(C('muerto:' + d.name, pick([
      `Alguien menciona a ${d.name} en la otra mesa, sin saber que lo conociste. Cuentan su muerte mal, con más pólvora de la que hubo. Así se hacen las leyendas: con errores.`,
      `El sepulturero comenta que la tumba de ${d.name} siempre tiene flores. Nadie sabe quién las deja. Tú tampoco... aunque tienes una sospecha.`,
      `Un viajante pregunta si es verdad lo que se cuenta de ${d.name}. Otis le sirve otro whisky y contesta lo que contesta siempre: «Aquí los muertos invitan a callar».`
    ])));
  }
  // La guerra de facciones, si está encendida.
  const gt = gangTowns();
  if (gt.length) {
    const t = pick(gt);
    if (t.boss && t.boss !== 'player' && GANGS[t.boss]) {
      const g = GANGS[t.boss];
      cands.push(C('fac:' + t.town, pick([
        `En ${t.town} mandan ${g.name}, digan lo que digan los papeles. ${g.leader} cobra «protección» hasta al cura.`,
        `Dos carreteros discuten sobre quién manda en ${t.town}. Uno dice que la ley. El otro se ríe tanto que se cae del taburete. Manda ${g.leader}.`
      ])));
    }
    if (t.boss === 'player') {
      cands.push(C('facp:' + t.town, `Un forastero pregunta a quién hay que pagar para trabajar tranquilo en ${t.town}. Todos los ojos de la barra te miran a ti, discretamente. Casi todos los ojos.`));
    }
  }
  // Tus enemigos personales envenenan; tus amigos defienden.
  const ene = myEnemies();
  if (ene.length) {
    const e = pick(ene);
    cands.push(C('ene:' + e.key, `Te llega que ${e.name} sigue contando su versión de lo vuestro por ${e.where}. La cuenta cada vez mejor. La verdad, en cambio, no mejora nunca.`));
  }
  const ami = myFriends();
  if (ami.length) {
    const a = pick(ami);
    cands.push(C('ami:' + a.key, `Parece que anoche alguien habló mal de ti en ${a.where} y ${a.name} le paró los pies. No te lo contará. Los amigos de verdad hacen esas cosas a tu espalda.`));
  }
  // La estación pesa.
  if (winter()) {
    cands.push(C('rum:invierno', pick([
      'Dicen que el paso del norte ya está cerrado por la nieve. Lo que tenga que entrar al territorio, entrará por el río — y el río tiene dueños.',
      'El almacenista sube el precio del tocino «por la estación». La estación, curiosamente, se lo lleva él.'
    ])));
  }
  // Tu fama tiene su propio eco.
  if (G.rep.fama >= 40) cands.push(C('rum:fama2', 'Un crío te señala desde la puerta y le susurra algo a otro. Ya eres eso: alguien a quien se señala. Cuídate de que no pase a ser alguien a quien se apunta.'));
  else if (G.rep.fama >= 15) cands.push(C('rum:fama1', 'Alguien pregunta tu nombre al tabernero, con disimulo. Otis, bendito sea, contesta el nombre de otro.'));
  // La familia también da que hablar.
  if (G.family && G.family.spouse) cands.push(C('rum:boda', `Las señoras del porche siguen comentando tu boda con ${G.family.spouse.name}. Le dan seis meses. Llevan dándole seis meses desde el primer día.`));
  if (G.family && G.family.children.filter(c => c.alive !== false).length) {
    cands.push(C('rum:crios', 'La comadrona te manda saludos y una advertencia: «Los hijos de pistolero salen o santos o peores. Prepárate para las dos cosas».'));
  }
  // El dinero habla, y la falta de dinero grita.
  if (G.money >= 200) cands.push(C('rum:rico', 'En la mesa del fondo calculan cuánto tienes. Se equivocan por mucho — pero el rumor de tu dinero viaja más rápido que tu dinero.'));
  if (f.hambre >= 2) cands.push(C('rum:hambre', 'Se comenta que tu mesa lleva días comiendo sopa aguada. Cuando los tuyos pasan hambre, tus enemigos comen esperanza.'));
  // El caballo, el perro: el territorio se fija en todo.
  if (G.horse) cands.push(C('rum:caballo', `El del establo dice que ${G.horse.name} es mejor persona que tú. No te ofendes: es la opinión general, y el caballo no la desmiente.`));
  if (G.pets.length) cands.push(C('rum:perro', `${G.pets[0].name} tiene más amigos en el pueblo que tú. Le guardan huesos. A ti te guardan cuentas.`));
  // Tu leyenda negra crece con los muertos.
  if (G.stats.kills >= 15) cands.push(C('rum:kills', 'Un borracho jura que te ha visto desenfundar «más rápido que el arrepentimiento». La frase es mejor que su puntería contando muertos, pero se repetirá.'));
  // La edad no perdona ni en los rumores.
  if (p && ageOf(p) >= 45) cands.push(C('rum:viejo', 'Los jóvenes de la mesa del rincón discuten si sigues siendo tan rápido como cuentan. Ninguno se ofrece a comprobarlo, que es lo que importa.'));
  // Siempre hay territorio de fondo: relleno con carácter.
  cands.push(
    C('rum:mina', 'La Blackvein ha vuelto a bajar los jornales. El capataz lo llama «ajuste». Los mineros lo llaman de otra manera, y lo llaman bajito.'),
    C('rum:tren', 'El agrimensor del ferrocarril ha estado midiendo tierras que no son suyas. Midiendo, dice él. Eligiendo, dicen los que ya han visto esto antes.'),
    C('rum:predicador', 'Hay un predicador nuevo en Bent Fork que promete la salvación a plazos. En este territorio los plazos se entienden mejor que la salvación.'),
    C('rum:sable', 'Dicen que la Reina Sable ha comprado dos barcazas nuevas. Nadie compra barcazas para ir a misa.'),
    C('rum:sheriff', 'El sheriff lleva una semana sin salir de la oficina. Los optimistas dicen que está enfermo. Los demás cuentan quién ha entrado a verle.')
  );
  return fresh(cands);
}

// ---------- 💬 CHARLAS: lo que tu gente te cuenta de verdad ----------
export function talkLine(c) {
  const cands = [];
  const dead = deadFolk();
  const nm = c.alias || c.name;
  // Habla de vuestros muertos: la banda no olvida.
  if (dead.length && chance(0.8)) {
    const d = pick(dead);
    if (d.name !== c.name) cands.push(C('t:muerto:' + d.name, pick([
      `Se queda mirando la silla vacía. «${d.name} siempre se sentaba torcido, ¿te acuerdas? Decía que así vigilaba dos puertas.» Levanta el vaso un dedo. Lo bajas tú con el tuyo.`,
      `«Anoche soñé con ${d.name}», dice sin mirarte. «Estaba bien. Me pidió que no te dejáramos hacer tonterías.» Sonríe torcido. «Le mentí, claro.»`
    ])));
  }
  // Habla del día, de la estación, del oficio.
  if (winter()) cands.push(C('t:frio', `${nm} escupe al fuego y mira la ventana escarchada. «Odio el invierno. En invierno hasta las balas van con frío.»`));
  if (G.time.day % 7 >= 5) cands.push(C('t:paga', `«¿Sabes qué haría yo con una paga doble?», empieza. Lo que sigue es un plan detalladísimo y completamente idiota. Te lo escuchas entero: para eso está la mesa.`));
  // Habla de sí: heridas, traumas, edad.
  if (c.wounds && c.wounds.length) cands.push(C('t:herida:' + c.id, `Se frota la vieja herida sin darse cuenta. «Va a llover», dice. Es su barómetro y su recordatorio: el cuerpo lleva el diario mejor que nadie.`));
  if (c.stress >= 60) cands.push(C('t:estres:' + c.id, `${nm} tiene esa mirada de cuerda demasiado tensa. «Estoy bien», dice antes de que preguntes. Los que están bien no lo dicen antes de que preguntes.`));
  if (ageOf(c) >= 45) cands.push(C('t:viejo:' + c.id, `«Cuando esto acabe», dice ${nm}, «me compro un porche y un perro tonto.» Todos los del oficio tienen ese porche imaginario. Casi ninguno llega a barrerlo.`));
  // Habla de ti y de cómo te ve.
  if (G.rep.humanidad <= 30) cands.push(C('t:frio_tu', `${nm} te mira un momento de más. «Antes preguntabas los nombres», dice al fin. «De la gente, digo. Antes de.» No termina la frase. No hace falta.`));
  if (G.rep.fama >= 30) cands.push(C('t:fama_tu', `«En el almacén me han preguntado si es verdad lo tuyo del duelo», dice ${nm}. «Les he contado una versión peor. Tu leyenda me sale más barata que invitar.»`));
  // Habla del futuro del jugador: familia.
  if (G.family && G.family.children && G.family.children.filter(k => k.alive !== false).length && chance(0.5)) {
    cands.push(C('t:crios_tu', `${nm} talla algo pequeño en madera. «Para tu cría», gruñe, como quien confiesa un delito. Es un caballito. Le faltan dos patas. Es perfecto.`));
  }
  return fresh(cands); // puede ser null: el que llama tira del pozo clásico
}

// ---------- 🔫 COMBATE: coletillas que no se gastan ----------
// Frases cortas. En combate el ritmo manda: nada de párrafos.
export function missTail() {
  return fresh([
    C('m1', 'La bala astilla madera.'),
    C('m2', 'El plomo levanta polvo a un palmo.'),
    C('m3', 'El disparo se lleva un sombrero que no era el suyo.'),
    C('m4', 'La bala silba y se pierde camino del desierto.'),
    C('m5', 'El tiro muerde la piedra y sale rezumbando.'),
    C('m6', 'Demasiado alto. El susto, en cambio, da en el blanco.'),
    C('m7', 'La ventana de la cantina paga la fiesta.'),
    winter() ? C('m8', 'El vaho le delató el pulso: la bala pasa de largo.') : null
  ]);
}
export function killTail(name) {
  return fresh([
    C('k1', 'No se levanta.'),
    C('k2', 'El polvo lo recibe sin ceremonia.'),
    C('k3', 'Se acabó su parte de la historia.'),
    C('k4', 'Cae como caen todos: sorprendido.'),
    C('k5', 'El territorio suma uno más a su cuenta.'),
    C('k6', 'Queda mirando un cielo que ya no ve.'),
    C('k7', 'Su revólver escupe al suelo la bala que no llegó a usar.')
  ]);
}
export function meleeMissTail(tgtName) {
  return fresh([
    C('mm1', `${tgtName} se aparta.`),
    C('mm2', `${tgtName} lo ve venir y el acero corta aire.`),
    C('mm3', `${tgtName} baila hacia atrás. El filo pasa silbando.`)
  ]);
}

// ---------- ⚔ GUERRA: cada represalia con su propia cara ----------
export function warFlavor(g) {
  return fresh([
    C('w:jinetes:' + g.name, `${g.leader} manda un mensaje de vuelta — con jinetes, no con palabras. Te esperan a las afueras.`),
    C('w:fuego:' + g.name, `Esta noche ardió un granero de los tuyos. Nadie vio nada; todos saben quién. ${g.name} no manda cartas: manda cerillas. Sus hombres te esperan para rematar la lección.`),
    C('w:plaza:' + g.name, `${g.leader} ha hecho correr la voz: te espera a plena luz, en el camino, «como los hombres». Las emboscadas se preparan justamente así.`),
    C('w:soborno:' + g.name, `Primero probaron a comprarte a la gente. Al no venderse nadie — todavía te dura la lealtad — ${g.name} ha pasado al método clásico: plomo a domicilio.`)
  ]);
}
