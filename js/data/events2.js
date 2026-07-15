// MIROLE — «El mundo te recuerda»: el periódico, los sueños con tus
// muertos, los aniversarios, la fogata de la banda y las némesis.
// Nada de esto es contenido: es MEMORIA. El territorio lleva la cuenta.
import { G, log, journal, yearOf, dateStr } from '../engine/state.js';
import { rint, pick, chance } from '../engine/rng.js';
import { player, aliveSquad, addStress } from '../engine/chars.js';
import { mkFoe } from './enemies.js';
import { GANGS } from './gangs.js';
import { introduce, breakup } from '../engine/hearts.js';
import { firstName } from './people.js';
import * as CB from '../engine/combat.js';

const bondKey = (a, b) => `${Math.min(a, b)}-${Math.max(a, b)}`;

// ---------- el periódico: tu leyenda, mal escrita por otros ----------
const CLASSIFIEDS = [
  'SE VENDE: mula tuerta, ve la mitad, trabaja el doble. Preguntar por Amos en el establo.',
  'PERDIDO: dentadura postiza en la pelea del sábado. Recompensa: la otra mitad de la pelea.',
  'La Sra. Fairbanks recuerda a los caballeros que su hija NO está en edad de merecer. La escopeta de la Sra. Fairbanks opina igual.',
  'CLASES DE LECTURA los domingos. Los que firman con una X, media tarifa.',
  'El barbero informa: las sanguijuelas nuevas llegaron. Las viejas, en paz descansen, dieron todo.',
  'CAMBIO: banjo casi afinado por escopeta en cualquier estado. Urge, por votación de mis vecinos.',
  'El sepulturero comunica que los adelantos no son mal fario, sino previsión. Descuentos por familia.'
];
const ERA_NEWS = {
  1899: ['El telégrafo llegará a Marrow Creek «antes de dos inviernos», jura el agente territorial. Los cuervos ya se pelean por el sitio en el cable.',
         'Blackvein City supera los doce mil habitantes. Los que se fueron de aquí escriben que se come mal pero a horas fijas.'],
  1900: ['UN SIGLO NUEVO: el Courier promete a sus lectores que el siglo XX será «igual de duro, pero mejor iluminado».',
         'La Blackvein Mining anuncia «un año de prosperidad compartida». El Courier no ha sabido confirmar con quién la comparte.'],
  1901: ['Dicen que en el este ya hay carruajes SIN CABALLO. Este periódico se niega a publicar semejante borrachera... pero lo publica, por si acaso.',
         'El ferrocarril estudia un ramal hacia el territorio. Los especuladores ya compraron hasta el polvo.']
};

function paperHeadline() {
  const lines = [];
  const f = G.flags;
  if (f.t1done >= 8) lines.push('SIGUE EL MISTERIO DEL ARROYO SECO: nadie confirma qué pasó entre las rocas, pero los forajidos del este han dejado de cantar en las cantinas.');
  if (G.rep.fama >= 40) lines.push(`EL PISTOLERO DE MARROW CREEK: nuestra redacción confirma que ${player().name} existe y que las otras once cosas que cuentan de él son «probablemente exageradas».`);
  else if (G.rep.fama >= 15) lines.push('UN FORASTERO PROSPERA EN MARROW CREEK: el tablón de trabajos se queda corto para cierta cuadrilla nueva. El sheriff declina comentar, que es su manera de comentar.');
  const wantedDone = G.once.filter(x => x.startsWith('w_')).length;
  if (wantedDone >= 2) lines.push(`LA LEY (AJENA) FUNCIONA: ${wantedDone} carteles de recompensa cobrados este año en la comarca. El juez de paz felicita «al sector privado».`);
  if (G.stats.kills >= 25) lines.push('EL SEPULTURERO PIDE AYUDANTE: «no doy abasto y no pienso preguntar por qué», declara.');
  if (f.dawsonFate === 'entregado') lines.push('SILAS DAWSON, EX-PAGADOR DE LA BLACKVEIN, murió en su celda «de causas naturales». La celda era nueva. Las causas, también.');
  if (G.choices.length) {
    const last = G.choices[G.choices.length - 1];
    if (G.time.day - last.d < 30) lines.push('RUMORES DE LA COMARCA: se comenta cierto asunto reciente que este periódico no puede publicar entero. Los implicados saben quiénes son. El Courier también.');
  }
  if (!lines.length) lines.push('SEMANA TRANQUILA EN EL TERRITORIO. El Courier desconfía profundamente y les recomienda hacer lo mismo.');
  return pick(lines);
}

export const EVENTS2 = {

  periodico: {
    build() {
      const y = yearOf(G.time.day);
      const era = ERA_NEWS[y] || ['El territorio sigue girando. Despacio, como todo lo que dura.'];
      return {
        title: `📰 The Marrow Creek Courier`,
        text: `${dateStr()} · Dos centavos, y los vale casi siempre.\n\n★ ${paperHeadline()}\n\n★ ${pick(era)}\n\n★ LA BLACKVEIN MINING COMUNICA: «Los rumores sobre la compañía son infundados.» No especifica cuáles. Todos, se entiende.\n\n★ CLASIFICADOS: ${pick(CLASSIFIEDS)}`,
        opts: [{ t: 'Doblar el periódico', fx() {
            addStress(player(), -3);
            return null;
          } }]
      };
    }
  },

  // ---------- los sueños: el cementerio también habla ----------
  sueno: {
    build() {
      const dead = G.cemetery.filter(t => !t.animal);
      if (!dead.length) return null;
      const d = pick(dead);
      let text;
      if (d.name === 'Sam Corddry') {
        text = pick([
          'Sueñas con el porche que Sam nunca tuvo.\n\nEstá sentado en una mecedora que no cruje, con un café que no humea, viendo pasar a los idiotas como siempre quiso. Te ve llegar y no se sorprende: en los sueños nadie llega, todo el mundo ya estaba.\n\n«¿Qué tal la mesa?», pregunta, como si la mesa fuera lo único que importa.\n\nPuede que lo sea.',
          'El desfiladero otra vez, pero sin pólvora: solo Sam, de pie, entero, mirando las rocas rojas como quien revisa una cerca.\n\n«Aquí fue», dice, sin drama, y luego te mira de esa forma suya. «Deja de venir tanto, muchacho. Este sitio es mío. Búscate los tuyos más bonitos.»',
          'Sam te enseña a disparar. Tienes diez años, o veinte, o los de ahora — los sueños no hacen esas cuentas.\n\n«Respira. Aprieta. No cierres los ojos.» Lo de siempre. Pero esta vez añade algo que nunca dijo despierto:\n\n«Lo hiciste bien. Todo. Hasta lo que hiciste mal, lo hiciste bien.»\n\nDespiertas antes de poder contestar. Siempre se despierta antes.'
        ]);
      } else {
        text = pick([
          `Sueñas con ${d.name}. Está en la mesa de siempre de «El Cuervo», en su silla, con su vaso, quejándose de algo con esa voz que ya casi no recordabas — y el sueño te la devuelve entera, nítida, injusta.\n\n«¿Y a ti qué te pasa?», te dice al verte la cara. «Ni que hubiera muerto alguien.»\n\nY se ríe. Y tú también, maldita sea.`,
          `${d.name} camina a tu lado por un camino que no reconoces. No habla. En vida tampoco hablaba tanto, y el sueño respeta los caracteres.\n\nAl llegar a ninguna parte, se toca el sombrero: el saludo entero de los que se entienden.\n\nDespiertas con la mano medio levantada, devolviéndolo.`,
          `En el sueño, ${d.name} sigue en la banda y nadie recuerda por qué eso te parece raro. Repartes la paga y le das la suya y sus manos no llegan a tocarla nunca.\n\n«Guárdamela», dice. «Donde guardas lo demás.»\n\nTe despiertas sabiendo exactamente dónde es.`
        ]);
      }
      return {
        title: '💤 Un sueño',
        text,
        opts: [
          { t: 'Despertar despacio', fx() { addStress(player(), -6); return null; } },
          { t: 'Quedarte un rato más con el sueño', fx() {
              addStress(player(), -4);
              if (chance(0.5)) journal(`Anoche soñé con ${d.name}. No lo escribo para no olvidarlo — esas cosas no se olvidan. Lo escribo para que quede en algún sitio además de en mí.`);
              return null;
            } }
        ]
      };
    }
  },

  // ---------- aniversarios: el tiempo circular ----------
  aniversario_sam: {
    build() {
      const eli = aliveSquad().find(c => c.name === 'Eli Marsh');
      const years = yearOf(G.time.day) - G.time.startYear;
      return {
        title: '📅 Un año más',
        text: `Hoy hace ${years === 1 ? 'un año' : years + ' años'} del desfiladero.\n\nNadie lo dice en voz alta, pero la mesa lo sabe: se nota en cómo ${eli ? 'Eli desapareció antes del alba y su catre está hecho con esa pulcritud rara de los días malos' : 'el café sabe a poco y el silencio a mucho'}.\n\nEl territorio no pone lápidas en el calendario. La gente sí.`,
        opts: [
          { t: eli ? 'Buscar a Eli en el cementerio' : 'Ir al cementerio', fx() {
              if (eli) eli.loyalty = Math.min(100, eli.loyalty + 5);
              addStress(player(), -5);
              return eli
                ? 'Está donde sabías, sombrero en mano, hablando bajito con la tierra.\n\nNo interrumpes: te pones a su lado y dejas que el silencio haga de misa. Al rato, sin mirarte: «Le estaba contando lo del arroz de anoche. A Sam le habría dado la semana entera de risa.»\n\nY os quedáis ahí, contándole el año al muerto, que es la forma más vieja que existe de seguir queriendo a alguien.'
                : 'Le cuentas el año a la tierra: lo bueno, lo malo, lo que él habría sabido hacer mejor. La tierra escucha como escuchaba él: sin interrumpir y sin dejarte mentir.';
            } },
          { t: 'Trabajar el doble y no pensar', fx() {
              addStress(player(), 3);
              return 'Llenas el día hasta los bordes para que no quepa nada más.\n\nCasi funciona. Lo que se hace con las manos calla lo que hace ruido por dentro... hasta la noche, que no tiene manos.';
            } },
          { t: 'Ronda en su nombre en «El Cuervo» ($3)', fx() {
              if (G.money >= 3) {
                G.money -= 3;
                for (const c of aliveSquad()) c.stress = Math.max(0, c.stress - 4);
                return 'Otis sirve la ronda y deja un vaso de más en la esquina de la barra, lleno, sin que nadie lo pida.\n\n«Costumbre de la casa», gruñe. «Los ausentes beben primero.»\n\nLa banda brinda sin decir por quién. No hace falta. Sobra.';
              }
              return 'No hay ni para la ronda. Otis, que lo ve todo, sirve una «por error de inventario» y mira para otro lado.\n\nHay taberneros que son mejores personas que la mitad de los santos.';
            } }
        ]
      };
    }
  },

  cumpleanos: {
    build() {
      const p = player();
      const age = yearOf(G.time.day) - p.birthYear;
      return {
        title: '📅 Tu cumpleaños',
        text: `${age} años. En este territorio, cada uno es una estadística ganada a pulso.\n\nNo se lo dijiste a nadie... pero en la mesa hay un pastel torcido con un cartucho de escopeta plantado en el centro a modo de vela.\n\n«No la enciendas», advierte Eli, muy serio. «Es de verdad. El presupuesto no dio para las dos cosas.»`,
        opts: [
          { t: 'Reírte por primera vez en semanas', fx() {
              for (const c of aliveSquad()) { c.stress = Math.max(0, c.stress - 6); if (c.id !== G.player) c.loyalty = Math.min(100, c.loyalty + 2); }
              journal(`Cumplí ${age}. Pastel torcido, cartucho de vela y mi gente alrededor. Que los años vengan como quieran: así se les recibe.`);
              return 'El pastel sabe a harina de guerra y a mejor día del año.\n\nAlguien pregunta qué has deseado. «Munición», mientes. La verdad no se dice ni en cumpleaños: que sigáis todos aquí el que viene.\n\n(−6 estrés a todos, la banda te quiere un poco más)';
            } },
          { t: 'Ronda para todos ($5)', fx() {
              if (G.money < 5) return 'Prometes la ronda «a cuenta del año que viene». La mesa acepta la deuda con más fe que el banco.';
              G.money -= 5;
              for (const c of aliveSquad()) c.stress = Math.max(0, c.stress - 8);
              return 'La ronda se convierte en dos, la segunda la pone Otis «por redondear», y la noche acaba con la banda cantando algo que ninguno se sabe entero.\n\nLos años así no se cumplen: se celebran. (−8 estrés a todos)';
            } }
        ]
      };
    }
  },

  // ---------- la fogata: la banda se pertenece ----------
  fogata: {
    build() {
      const others = aliveSquad().filter(c => c.id !== G.player);
      if (others.length < 2) return null;
      const a = pick(others);
      let b = pick(others.filter(x => x.id !== a.id));
      const an = a.alias || a.name, bn = b.alias || b.name;
      const key = bondKey(a.id, b.id);
      G.bonds[key] = (G.bonds[key] || 0) + 1;
      a.loyalty = Math.min(100, a.loyalty + 1);
      b.loyalty = Math.min(100, b.loyalty + 1);
      a.stress = Math.max(0, a.stress - 3);
      b.stress = Math.max(0, b.stress - 3);
      const vignettes = [
        `${an} le enseña a ${bn} a hacer trampas al gin rummy. ${bn} pierde igualmente la paga de mañana. La educación cuesta.`,
        `${an} y ${bn} discuten media hora sobre cuál es la mejor manera de morir. Empatan en «viejo y debiendo dinero». Brindan por ello.`,
        `${bn} le arregla a ${an} el sombrero con hilo de sutura. Queda torcido para el lado contrario. ${an} jura que así lo quería.`,
        `${an} cuenta la historia del oso. ${bn} jura que la semana pasada era un lobo. El animal crece con la audiencia: es su naturaleza.`,
        `Turno de guardia doble: ${an} y ${bn} se pasan la noche arreglando el territorio de palabra. Al alba está igual, pero ellos mejor.`,
        `${bn} descubre que ${an} canta bien. ${an} lo niega con la vehemencia de los que cantan bien. La fogata guarda el secreto a medias.`
      ];
      if (a.bio && a.bioKnown < 3 && chance(0.4)) {
        vignettes.push(`Junto al fuego, ${an} le cuenta a ${bn} algo en voz baja que a ti nunca te ha contado. No te ofendes: las fogatas tienen su propia jerarquía de confianzas.`);
      }
      let extra = '';
      if (G.bonds[key] === 3) {
        extra = `\n\nEn algún momento de la noche, sin ceremonia, ${an} y ${bn} pasaron de compañeros a amigos. Esas cosas se ven desde fuera antes que desde dentro.`;
        journal(`${a.name} y ${b.name} se han hecho amigos de los de verdad. En este oficio, eso es un lujo y una hipoteca: lo sabremos el día que uno de los dos falte.`);
      }
      return {
        title: '🔥 La fogata',
        text: `${pick(vignettes)}${extra}\n\nTú miras desde tu manta y no intervienes. Una banda no se manda a todas horas: a veces solo se cuida desde lejos.`,
        opts: [{ t: 'Dejar que la noche haga su trabajo' }]
      };
    }
  },

  // ---------- TOMO II: la apertura de la guerra de facciones ----------
  t2_intro: {
    build() {
      return {
        title: '📖 TOMO II — «El precio de una corona»',
        text: 'Con Grey bajo tierra, algo ha cambiado en el aire del territorio.\n\nDurante veinticinco años, el miedo a Grey mantuvo un equilibrio: cada banda en su rincón, cada pueblo en su sitio. Tú rompiste ese equilibrio de un disparo. Ahora Red Marrow es una silla vacía, y todos los buitres lo huelen.\n\nCinco poderes se disputan el territorio: los Ashgrove de tu propio pueblo, los Kettle de las tierras malas, la Reina Sable y su río, la Compañía Blackvein con su humo y su dinero, y la Ley nueva que no se compra.\n\nEli lo dice mirando el fuego: «Un hombre que mata a un rey se queda con dos opciones, muchacho: huir muy lejos... o sentarse en la silla. Y tú nunca fuiste de huir.»\n\nEn el MAPA hay ahora un tablero nuevo: EL TERRITORIO. Cinco pueblos que se ganan despacio — con tratos y favores, o con sangre y miedo. Los dos caminos llevan a la corona. Solo cambia quién te defiende cuando ya la llevas puesta.',
        opts: [{ t: 'Mirar el tablero', fx() {
          journal('Empieza el Tomo II. Cinco pueblos, cinco bandas, una silla vacía. Voy a por ella. La pregunta que Eli no hace en voz alta: ¿a por ella cómo?');
        } }]
      };
    }
  },

  faccion_guerra: {
    build(arg) {
      const g = GANGS[arg];
      if (!g) return null;
      return {
        title: `⚔ ${g.name} responde`,
        text: `No les ha gustado tu método. ${g.leader} manda un mensaje de vuelta — con jinetes, no con palabras. Te esperan a las afueras.\n\n«${g.tag}.» El que manda escupe en el polvo. «Aquí no todo se toma a golpes, forastero. Algunos todavía sabemos defender lo nuestro.»`,
        opts: [{ t: 'Recibirlos', fx() {
          const foes = [mkFoe('veterano', `Hombre de ${g.leader.split(' ')[0]}`), mkFoe('pistolero'), mkFoe('maton')];
          CB.startCombat({
            title: `Represalia de ${g.name}`, foes,
            intro: 'El miedo que siembras también cosecha balas. Así funciona el terreno regado con sangre.',
            onEnd: (res) => {
              if (res === 'win') journal(`${g.name} me midió y perdió. Por ahora el miedo aguanta. Pero el miedo siempre presenta otra factura.`);
              else journal(`${g.name} me dio una lección. El poder tomado a la fuerza se defiende a la fuerza, cada semana, para siempre. Grey lo sabía. Yo lo aprendo.`);
            }
          });
        } }]
      };
    }
  },

  // ---------- ❤ vínculos abiertos: conocer gente orgánicamente ----------
  conoces_alguien: {
    build() {
      const p = introduce();
      if (!p) return null;
      return {
        title: '❤ Alguien nuevo',
        text: `En ${p.where} te cruzas con ${p.name}. ${cap(p.tag)}. No es un flechazo de novela barata — es solo una cara que, por algún motivo, se te queda.\n\nHablan un rato. ${cap(firstName(p))} ${p.pron === 'ella' ? 'tiene' : 'tiene'} una forma de mirar el mundo que te hace querer volver a ${p.where}.\n\n(En BANDA → Vínculos puedes cortejar a quien conozcas. O no. El territorio es ancho.)`,
        opts: [{ t: 'Guardarse el nombre' }]
      };
    }
  },

  vinculo_roto: {
    build(arg) {
      const p = G.relations && G.relations.people && G.relations.people[arg];
      if (!p || p.stage === 'ended') return null;
      return {
        title: '❤ Se enfría',
        text: `${firstName(p)} lleva días distinta. Esta noche lo dice: «No puedo con esto. Con lo que te has vuelto. Te miro y ya no te encuentro.»\n\nLa vida que llevas tiene un precio, y a veces lo paga quien no debía.`,
        opts: [
          { t: 'Dejarla ir', fx() { return breakup(arg); } },
          { t: 'Rogarle que se quede (Labia)', fx() {
              const pl = player();
              if (pl.skills.labia + rint(0, 30) >= 55) { p.af = Math.max(4, p.af - 2); return `Hablas como no sueles hablar: sin armas. ${firstName(p)} llora un poco y se queda. «Una más», dice. «La última que te fío.» Ganaste tiempo. No absolución.`; }
              return breakup(arg);
            } }
        ]
      };
    }
  },

  // ---------- némesis: los que escapan, vuelven ----------
  nemesis: {
    build(arg) {
      const nm = (G.nemeses || []).find(n => String(n.id) === String(arg));
      if (!nm) return null;
      return {
        title: `☠️ ${nm.name}`,
        text: `Te está esperando a la salida del pueblo, a caballo, con ${nm.lvl > 1 ? 'más hombres que la última vez y' : ''} una sonrisa que se ha estado ensayando.\n\n«¿Te acuerdas de mí? De ${nm.origin.toLowerCase()}.» Se señala la cara, la marca. «Yo me acuerdo de ti cada mañana, en el espejo. Me pareció justo devolver la visita.»\n\nLos que escapan no siempre huyen. Algunos solo van a buscar motivos.`,
        opts: [{ t: 'Terminar lo que quedó a medias', fx() {
            const boss = mkFoe(nm.tpl, nm.name);
            boss.hp = boss.hpMax = boss.hp + 1 + nm.lvl;
            boss.sk.punteria += 4 * nm.lvl;
            boss.sk.voluntad = 80;
            const foes = [boss];
            for (let i = 0; i < Math.min(nm.lvl, 2); i++) foes.push(mkFoe('maton'));
            CB.startCombat({
              title: `La revancha de ${nm.name}`, foes, canFlee: false, noNemesis: true,
              intro: 'Esta vez no hay carga que proteger ni paga que cobrar. Esto es personal, que es la peor moneda del territorio.',
              onEnd: (res) => {
                if (res === 'win') {
                  G.nemeses = G.nemeses.filter(n => n.id !== nm.id);
                  const bounty = 10 + 10 * nm.lvl + rint(0, 10);
                  G.money += bounty;
                  G.stats.earned += bounty;
                  G.rep.fama = Math.min(100, G.rep.fama + 2);
                  journal(`${nm.name} vino a cobrarse su rencor y pagó con todo. Llevaba $${bounty} encima: el precio exacto de no saber retirarse.`);
                  log(`${nm.name} no volverá. Nadie vuelve dos veces.`);
                } else {
                  nm.lvl++;
                  nm.due = G.time.day + rint(15, 30);
                  journal(`${nm.name} volvió, cobró y me dejó vivo a propósito. «Así duele más tiempo», dijo. Está aprendiendo. Yo también: la próxima vez no habrá próxima vez.`);
                }
              }
            });
          } }]
      };
    }
  }
};
