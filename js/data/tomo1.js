// MIROLE — TOMO I: «Todos los caminos cobran peaje».
// La historia principal, servida como una novela por entregas: capítulos
// que se desbloquean con días de vida de por medio, para que el relleno
// respire y las preguntas duelan. El prólogo es el Capítulo 1; la caza
// de Dawson, el Capítulo 3. Aquí viven los demás.
//
// Regla de la casa: cada giro está sembrado antes. Relee y verás.
import { G, log, journal, save, choice, queueEvent } from '../engine/state.js';
import { rint, pick, chance } from '../engine/rng.js';
import { player, addStress, addXp, aliveSquad } from '../engine/chars.js';
import { mkFoe } from './enemies.js';
import * as CB from '../engine/combat.js';
import * as T from '../engine/time.js';

function travel(d) { T.advanceDays(d, { travel: true }); }
function endCap(n, jtxt) {
  G.flags.t1done = n;
  G.flags.t1 = 0;
  G.flags.t1wait = 0;
  if (jtxt) journal(jtxt);
  save();
}

// El Director llama a esto cada día: decide cuándo llega el siguiente capítulo.
export function tomo1Check() {
  const f = G.flags;
  if (f.t1done === undefined) f.t1done = 1;             // el prólogo fue el Capítulo 1
  if (f.dawson === 3 && f.t1done === 2) f.t1done = 3;   // Dawson fue el Capítulo 3
  if (f.t1) return;                                     // ya hay un capítulo esperando
  const next = f.t1done + 1;
  if (next === 3 || !TOMO1[next]) return;               // el 3 vive en su propia carta del mapa
  const waits = { 2: 0, 4: 8, 5: 10, 6: 4, 7: 7, 8: 5 };
  if (next === 2) {
    if (G.time.day < 12) return;
  } else {
    if (!f.t1wait) { f.t1wait = G.time.day + waits[next]; return; }
    if (G.time.day < f.t1wait) return;
  }
  f.t1 = next;
  f.t1wait = 0;
  queueEvent('capitulo');
}

export const TOMO1 = {

  // ═════════════ CAPÍTULO 2 — El hombre del bombín ═════════════
  2: {
    title: 'El hombre del bombín',
    run(scene) {
      scene({
        title: 'Capítulo 2 — El hombre del bombín',
        text: 'Se sienta a tu mesa sin preguntar, deja el bombín sobre la madera como quien planta una bandera, y limpia sus lentes con un pañuelo que vale más que tu silla.\n\n«Pemberton. Contable de la Blackvein Mining, división de... asuntos delicados.» Sonríe con exactamente la mitad de la boca. «La compañía admira cómo sobrevivió usted a lo del desfiladero. Sobrevivir es un talento infravalorado.»\n\nDesliza un contrato y sesenta dólares en billetes nuevos.\n\n«Escoltar un reparto de documentos a los ranchos del valle. Papeleo aburrido. Nada de preguntas — esa cláusula es la que mejor pagamos.»',
        opts: [{ t: 'Aceptar el reparto (por ahora)' }]
      }, () => {
        travel(1);
        scene({
          title: 'El papeleo aburrido',
          text: 'En el tercer rancho, la mujer que recibe el sobre lo lee delante de ti y se le doblan las rodillas contra el marco de la puerta.\n\nAbres uno de los sobres que quedan. «NOTIFICACIÓN DE DESALOJO — Proyecto Veta Norte. 30 días.» Catorce ranchos. Catorce familias. Y tú, el cartero.\n\nA lo lejos, en la loma, un jinete os observa sin esconderse. Lleva algo rojo en el sombrero. Cuando Eli levanta la vista, ya no está.',
          opts: [
            { t: 'Terminar el reparto: un contrato es un contrato ($60)', fx() {
                choice('Repartí los desalojos de la Blackvein en el valle. Un contrato es un contrato. Eso me dije en cada porche.');
                G.money += 60; G.stats.earned += 60;
                G.fac.mineros += 8; G.fac.pueblo -= 6;
                G.rep.humanidad = Math.max(0, G.rep.humanidad - 8);
                G.flags.pemberton = 'complice';
                addStress(player(), 6);
                return 'Repartes los once que faltan. Aprendes que hay muchas maneras de doblarse contra un marco de puerta y que ninguna hace ruido.\n\nPemberton paga puntual y añade una tarjeta: «La compañía recuerda a sus amigos.»\n\nEli no te habla en dos días. El dinero, en cambio, no calla.';
              } },
            { t: 'Quemar los sobres en mitad del camino', fx() {
                choice('Quemé los desalojos de la Blackvein sin repartir. Pemberton apuntó mi nombre en su libreta.');
                G.fac.pueblo += 8; G.fac.mineros -= 10; G.rep.fama += 3;
                G.rep.humanidad = Math.min(100, G.rep.humanidad + 5);
                G.flags.pemberton = 'enemigo';
                return 'La pequeña hoguera huele a papel caro y a problema serio.\n\nDevuelves los $60 en la oficina, billete a billete, delante de todos. Pemberton los recoge sin dejar de sonreír su media sonrisa.\n\n«Qué gesto tan... caro», dice, y anota algo en su libreta. Tu nombre cabe en muy pocas letras. Le sobra libreta.';
              } },
            { t: 'Terminar el reparto... y avisar a cada familia (Labia)', fx() {
                const p = player();
                addXp(p, 'labia', 4);
                choice('Repartí los desalojos, pero avisé a cada familia de sus derechos y sus plazos. Pemberton no debe saberlo. Aún.');
                G.money += 60; G.stats.earned += 60;
                G.fac.pueblo += 4;
                G.rep.humanidad = Math.min(100, G.rep.humanidad + 3);
                G.flags.pemberton = 'doble';
                return 'Entregas cada sobre con un consejo susurrado: el plazo legal real, el nombre del juez que no está comprado, el error de forma en la página dos.\n\nCobras los $60 de la compañía por repartir sus papeles, y cada rancho gana meses para pelear.\n\nJuego peligroso, jugado bien. De momento.';
              } }
          ]
        }, () => {
          travel(1);
          scene({
            title: 'La pluma roja',
            text: 'De vuelta en Marrow Creek, encuentras algo clavado con una navaja en la puerta de la cantina, a la altura de tu cara:\n\nUna pluma roja. Solo eso.\n\nOtis, el tabernero, la mira sin tocarla. «Eso no es de por aquí», dice, y por primera vez desde que lo conoces, baja la voz. «Y si te la dejaron a ti... yo dormiría con la escopeta a este lado de la cama, hijo.»',
            opts: [{ t: 'Guardar la pluma', fx() {
              endCap(2, 'Capítulo 2 cerrado. La Blackvein me puso precio y alguien me dejó una pluma roja clavada en la puerta. Empiezo a echar de menos cuando mis problemas solo me disparaban de frente.');
            } }]
          }, () => {});
        });
      });
    }
  },

  // ═════════════ CAPÍTULO 4 — Plumas rojas ═════════════
  4: {
    title: 'Plumas rojas',
    run(scene) {
      const fate = G.flags.dawsonFate;
      const msg = fate === 'muerto'
        ? '«Enterraste al pagador de rodillas. El pagador nos debía. Los muertos no pagan, así que ahora nos debes tú. Las deudas de sangre se heredan hacia arriba. — E.G.»'
        : fate === 'entregado'
          ? '«La horca de Blackvein nos robó una deuda que era nuestra. Tú se la vendiste al juez. Los intermediarios responden por la mercancía. — E.G.»'
          : '«Dejaste vivo al pagador. Sentimental. Nosotros no lo fuimos: cantó tu nombre entero antes del amanecer. Las deudas de Sam Corddry se heredan. Pregúntale a tu tumba favorita. — E.G.»';
      scene({
        title: 'Capítulo 4 — Plumas rojas',
        text: `Amanece con tres puertas marcadas en Marrow Creek: la del almacén, la del establo y la de «El Cuervo». Una pluma roja en cada una, clavada con el mismo cuidado.\n\nY en tu mesa de siempre, sin que nadie viera entrar a nadie, una nota doblada:\n\n${msg}\n\nE.G. Dos letras. Y el nombre de Sam en medio, como una bala en una herida vieja.\n\n¿Qué sabía Sam que tú no sabes?`,
        opts: [
          { t: 'Rastrear al mensajero con Eli (Sigilo)', fx() {
              const p = player();
              addXp(p, 'sigilo', 4);
              if (p.skills.sigilo + rint(0, 30) >= 40) {
                G.flags.t1intel = true;
                return 'Dos noches de paciencia en los tejados con Eli y su tabaco de mascar.\n\nA la tercera lo veis: un jinete joven que marca la puerta del forjador y sale al galope hacia el este. Lo seguís hasta el filo de las tierras malas.\n\nUn campamento en un arroyo seco. Una docena de hombres, quizá más. Y junto al fuego grande, quieto como una piedra, un hombre mayor con el ala del sombrero baja.\n\n«Ese», susurra Eli, y la voz le sale rara, «ese se sienta como se sentaba la gente que ya se murió una vez.»';
              }
              return 'Dos noches de tejados y frío para nada: los que marcan puertas conocen el pueblo mejor que tú.\n\nLo único que ganas es la certeza incómoda de que ELLOS sí saben exactamente dónde duermes.';
            } },
          { t: 'Atrapar a uno: montar guardia en la calle', fx() { G.flags.t1trap = true; } }
        ]
      }, (opt) => {
        if (!G.flags.t1trap) {
          scene({
            title: 'Lo que dice el fuego',
            text: 'Vuelves al pueblo con más preguntas que balas.\n\nEli cabalga callado un rato largo y luego lo suelta, sin mirarte: «Muchacho... ¿cuánto sabes de la vida de Sam ANTES de ti?»\n\nY tú caes en la cuenta, con un frío nuevo, de que la respuesta es: nada. Sam empezaba todas sus historias ya siendo bueno.',
            opts: [{ t: 'Capítulo cerrado', fx() {
              endCap(4, 'Capítulo 4 cerrado. E.G. Las iniciales me esperan al este, en un arroyo seco, con una docena de rifles. Y una pregunta peor que todos ellos: ¿quién fue Sam antes de ser Sam?');
            } }]
          }, () => {});
          return;
        }
        delete G.flags.t1trap;
        const foes = [mkFoe('cuervo'), mkFoe('maton')];
        CB.startCombat({
          title: 'El marcador de puertas', foes, canPay: false,
          intro: 'Medianoche. El chico de la pluma roja llega con un guardaespaldas y una navaja. Tu calle, tus reglas.',
          onEnd: (res) => {
            if (res !== 'win') {
              log('Se escurrieron entre los callejones. Las plumas rojas seguirán apareciendo.');
              save();
              return; // el capítulo se puede reintentar desde el mapa
            }
            scene({
              title: 'El interrogatorio',
              text: 'El chico sobrevive, sangrando de sitios que se curan. No tendrá veinte años. Aguanta tu mirada con más miedo que orgullo, mitad y mitad.\n\n«No sé nada», miente primero. Luego, cuando entiende que la noche va larga: «Grey. Ezekiel Grey. Solo sé que lleva veinte años esperando algo y que ese algo tiene que ver contigo... no. Con tu muerto. Con Corddry.»\n\nEscupe sangre y casi sonríe: «El jefe dice que Sam Corddry fue el mejor socio y la peor bala de su vida. Que le preguntes al arroyo seco qué significa.»',
              opts: [
                { t: 'Soltarlo con un mensaje para Grey', fx() {
                    choice('Solté al mensajero de las plumas rojas con una respuesta para Ezekiel Grey: «Aquí me encuentra».');
                    G.rep.humanidad = Math.min(100, G.rep.humanidad + 3);
                    G.rep.fama += 2;
                    return '«Dile a Grey que no hace falta marcar más puertas. Que la mía la conoce. Que aquí me encuentra.»\n\nEl chico asiente tantas veces que parece que se le va a caer la cabeza, y desaparece cojeando en la oscuridad.\n\nHas mandado un mensaje. También has confirmado dónde vives. Las dos cosas eran verdad ya.';
                  } },
                { t: 'Entregarlo al sheriff', fx() {
                    choice('Entregué al mensajero de Grey al sheriff. Que la ley guarde lo que la ley pueda.');
                    G.fac.ley += 4;
                    return 'El sheriff lo encierra sin hacer preguntas, que es su especialidad más honda.\n\nDos días después, la celda amanece vacía y el candado, entero. Nadie vio nada. En el catre: una pluma roja.\n\nMensaje recibido: los muros de este pueblo son de papel para esta gente.';
                  } }
              ]
            }, () => {
              scene({
                title: 'Lo que queda en la mesa',
                text: 'Ezekiel Grey. Ya tiene nombre entero.\n\nEli lo repite en voz baja esa noche, dos veces, como quien palpa un diente roto con la lengua. «Grey... Corddry y Grey.» Sacude la cabeza. «No. No puede ser el mismo.»\n\nNo te mira al decirlo. Es la primera vez que Eli Marsh no te mira.',
                opts: [{ t: 'Capítulo cerrado', fx() {
                  endCap(4, 'Capítulo 4 cerrado. Ezekiel Grey. Eli murmuró «Corddry y Grey» como quien recuerda una canción prohibida. Todo el mundo sabe algo de mi muerto menos yo.');
                } }]
              }, () => {});
            });
          }
        });
      });
    }
  },

  // ═════════════ CAPÍTULO 5 — La noche que sangró «El Cuervo» ═════════════
  5: {
    title: 'La noche que sangró «El Cuervo»',
    run(scene) {
      scene({
        title: 'Capítulo 5 — La noche que sangró «El Cuervo»',
        text: 'Lo hueles antes de verlo: demasiados caballos entrando al pueblo a la hora en que solo llegan los problemas.\n\nOtis ya está bajando la tranca cuando entras. «Esta noche no abro», dice, y le tiemblan las manos alrededor de toda esa calma. «Me han "invitado" a dejar la puerta sin llave. Los de las plumas.»\n\nTe mira. Todo el pueblo lleva semanas mirándote así: como se mira al pararrayos cuando truena.\n\n«No tienes por qué quedarte, hijo.»\n\nTe quedas. Claro que te quedas. Es TU cantina, aunque el papel diga que es suya.',
        opts: [{ t: 'Apagar las lámparas y repartir posiciones' }]
      }, () => {
        const foes = [mkFoe('cuervo'), mkFoe('cuervo'), mkFoe('pistolero'), mkFoe('matarife')];
        if (G.flags.t1intel) for (const f of foes) f.shaken = 1; // sabías cómo vienen
        CB.startCombat({
          title: 'La defensa de «El Cuervo»', foes, canFlee: false,
          intro: G.flags.t1intel
            ? 'Vienen como los viste venir en el campamento: dos por delante, dos por el corral. Pero esta vez los esperas tú. La sorpresa cambia de bando.'
            : 'Revientan la puerta y la noche entra con ellos. Botas, cañones recortados y plumas rojas en los sombreros.',
          onEnd: (res) => {
            if (res !== 'win') {
              log('«El Cuervo» amaneció saqueado. Volverán. Y tú también.');
              save();
              return;
            }
            scene({
              title: 'Lo que dijo el que quedó',
              text: 'El humo se asienta entre mesas volcadas. Otis sangra de un hombro — feo, no mortal — y sigue empuñando una escopeta que no llegó a disparar, con una dignidad que te rompe un poco.\n\nUno de los caídos respira todavía. Lo levantas por la pechera.\n\n«¿Por qué? ¿Qué quiere Grey de este pueblo?»\n\nY el hombre se ríe, con sangre entre los dientes, y dice la frase que te va a quitar el sueño:\n\n«¿Del pueblo? Nada. Grey no quiere el pueblo. Te quiere a TI mirando cómo pierde todo el que te dé cobijo. Dice que se lo debes. Que las deudas de Sam Corddry las hereda quien hereda su silla en la mesa... y que ya va siendo hora de que sepas QUÉ silla es.»',
              opts: [{ t: 'Cerrar el capítulo con el amanecer', fx() {
                addStress(player(), 8);
                for (const c of aliveSquad()) if (c.id !== G.player) c.loyalty = Math.min(100, c.loyalty + 4);
                G.fac.pueblo += 8;
                endCap(5, 'Capítulo 5 cerrado. Defendimos «El Cuervo». Otis herido, cuatro plumas rojas bajo tierra, y una frase clavada donde más duele: Grey no quiere el pueblo. Me quiere a mí, mirando. Por una deuda de Sam. Mañana Eli me va a contar lo que lleva días sin poder contarme. Se le ve en la espalda.');
              } }]
            }, () => {});
          }
        });
      });
    }
  },

  // ═════════════ CAPÍTULO 6 — El nombre del muerto ═════════════
  6: {
    title: 'El nombre del muerto',
    run(scene) {
      scene({
        title: 'Capítulo 6 — El nombre del muerto',
        text: 'Eli te espera en la mesa del fondo con dos vasos servidos y la botella entera al lado, que en su idioma significa velatorio.\n\n«Siéntate, muchacho. Esto se cuenta una sola vez.»\n\nBebe. Empieza.\n\n«Hace veinticinco años, antes del alzacuellos, yo cobraba deudas en el norte. Y en el norte todo el mundo conocía a los cobradores buenos de verdad: Corddry y Grey. Sam y Ezekiel. Veinte años antes de conocerte, tu Sam era la mitad de la pareja de pistoleros más temida entre aquí y la frontera.»',
        opts: [{ t: '«Sigue.»' }]
      }, () => {
        scene({
          title: 'El arroyo seco, 1874',
          text: '«La nómina de la Territorial, año 74. El golpe de sus vidas: doce mil dólares en un solo carro. Salió limpio. Y esa noche, en un arroyo seco, algo pasó entre ellos que solo saben dos hombres, y uno lleva un cuarto de siglo muerto para el mundo.»\n\nEli gira el vaso despacio.\n\n«La versión que corrió: Sam le metió dos balas a Grey, se llevó hasta el último dólar y desapareció. Grey se arrastró medio muerto hasta un puesto del ejército... que lo colgó de una condena de veinte años por TODO lo que habían hecho juntos. Veinte años, muchacho. En Yuma. Pensando en un solo nombre.»\n\n«Y Sam... Sam apareció al año siguiente aquí, en el oeste, siendo el hombre más recto que conocimos tú y yo. Como si hubiera nacido aquella noche, ya bueno.»\n\nDeja la pregunta caer sola: ¿qué clase de hombre nace de una traición?',
          opts: [
            { t: '«Mientes. Sam no era ese hombre.»', fx() {
                choice('Cuando Eli me contó el pasado de Sam, elegí defender su memoria. Sam no era ese hombre. No PARA MÍ.');
                G.flags.t1sam = 'fe';
                player().skills.voluntad = Math.min(90, player().skills.voluntad + 2);
                return 'Eli te deja terminar. Luego asiente despacio.\n\n«Puede. Yo también conocí al Sam de después, y era el mejor hombre de este territorio podrido. Pero escúchame bien: los dos Sams caben en un solo cuerpo. Esa es la noticia. Esa es siempre la noticia, muchacho.»\n\n(+2 VOLUNTAD: la fe también es un músculo)';
              } },
            { t: 'Callar y beber. Los dos vasos.', fx() {
                choice('Cuando Eli me contó el pasado de Sam, no dije nada. Bebí por los dos Sams: el que fue y el que yo conocí.');
                G.flags.t1sam = 'silencio';
                addStress(player(), -5);
                return 'Bebes el tuyo. Luego el de Eli, y él te deja hacerlo.\n\nAfuera ladra un perro, pasa un carro, el mundo sigue siendo el mundo.\n\n«Eso es», dice Eli al rato, sirviendo otros dos. «Hay verdades que solo se pueden tragar. Masticarlas mata.»';
              } },
            { t: '«Entonces todo esto... Dawson, la emboscada, Sam muerto... fue Grey cobrándose el 74.»', fx() {
                choice('Cuando supe la verdad, la miré de frente: la muerte de Sam fue la venganza de Grey, veinte años fría. Y yo heredé la guerra.');
                G.flags.t1sam = 'frio';
                return 'Eli te sostiene la mirada y por fin asiente.\n\n«Dawson solo fue el dedo. La mano lleva veinticinco años apuntando. Grey no quería la nómina de la mina, muchacho: quería que Sam muriera TRAICIONADO por dinero, igual que él. Simetría. Los hombres que esperan veinte años se vuelven poetas de lo peor.»\n\n«Y ahora el poema te necesita a ti para el último verso.»';
              } }
          ]
        }, () => {
          scene({
            title: 'Lo que Eli no dijo',
            text: 'Ya de madrugada, con la botella muerta, Eli dice la última cosa, la que costaba más que todas:\n\n«Yo supe quién era Sam desde el primer día que lo vi en Marrow Creek. Nos reconocimos, como se reconocen los que vienen del mismo barro. Ninguno dijo nada en veinte años. Esa fue nuestra amistad entera: dos hombres callando el mismo pasado en mesas distintas.»\n\nSe levanta, recoge «La Viuda» y se para en la puerta, de espaldas.\n\n«Cuando vayas a por Grey — porque vas a ir, te lo veo en los hombros — yo cargo la escopeta. Se lo debo a Sam. Y a lo mejor... a lo mejor me lo debo a mí.»',
            opts: [{ t: 'Fin del capítulo', fx() {
              const eli = aliveSquad().find(c => c.name === 'Eli Marsh');
              if (eli) eli.loyalty = Math.min(100, eli.loyalty + 10);
              endCap(6, 'Capítulo 6 cerrado. Sam Corddry tuvo dos vidas y yo solo conocí la segunda. Ezekiel Grey salió de veinte años de Yuma para cobrarle la primera... y la cobró en el desfiladero. Ahora el arroyo seco me espera a mí. Eli viene conmigo. Dice que se lo debe a Sam. Yo ya no sé quién le debe qué a quién en esta tierra. Solo sé quién va a pagar.');
            } }]
          }, () => {});
        });
      });
    }
  },

  // ═════════════ CAPÍTULO 7 — Los aliados del alba ═════════════
  7: {
    title: 'Los aliados del alba',
    run(scene) {
      const g = G;
      const opts = [];
      opts.push({
        t: g.fac.ley >= 5 ? 'La ley: el sheriff y sus placas' : 'La ley (te falta su confianza)',
        dis: g.fac.ley < 5,
        fx() {
          choice('Para el asalto al arroyo seco elegí a la ley: placas, rifles y papeles en regla.');
          g.flags.t1aliado = 'ley';
          g.fac.ley += 5;
          return 'El sheriff escucha, escupe y firma. «Grey es un fugado de Yuma con causas abiertas. Esto hasta es legal, para variar.»\n\nDos ayudantes con rifles largos cabalgarán tus flancos. La ley llega tarde casi siempre; esta vez llega contigo.';
        }
      });
      opts.push({
        t: g.fac.pueblo >= 5 ? 'El pueblo: los que te deben las puertas sin marcar' : 'El pueblo (aún no te debe tanto)',
        dis: g.fac.pueblo < 5,
        fx() {
          choice('Para el asalto al arroyo seco elegí al pueblo: granjeros, el forjador y todas las deudas buenas.');
          g.flags.t1aliado = 'pueblo';
          g.fac.pueblo += 5;
          return 'No son soldados: son el forjador, dos granjeros del valle y el chico del establo con el rifle de su padre.\n\nPero pelean por sus puertas, y eso no se compra. Otis, con el brazo en cabestrillo, os llena las cantimploras de café y de algo que no es café.';
        }
      });
      opts.push({
        t: g.fac.forajidos >= 5 ? 'Los forajidos: fuego contra fuego' : 'Los forajidos (no confían en ti)',
        dis: g.fac.forajidos < 5,
        fx() {
          choice('Para el asalto al arroyo seco contraté forajidos: fuego contra fuego, y que Dios no mire.');
          g.flags.t1aliado = 'forajidos';
          g.rep.humanidad = Math.max(0, g.rep.humanidad - 4);
          return 'Gente sin nombre y con precio. Cabalgan mal, huelen peor y disparan como demonios.\n\n«Media paga ahora, media después», gruñe el que manda. «Y si mueres, la media de después nos la cobramos del muerto.» Trato justo, según de dónde se mire.';
        }
      });
      opts.push({
        t: 'Nadie. Esto es entre Grey, Sam y yo.',
        fx() {
          choice('Al arroyo seco fuimos solos: mi banda, mis muertos y yo. Algunas deudas no aceptan testigos.');
          g.flags.t1aliado = 'solos';
          g.rep.fama = Math.min(100, g.rep.fama + 5);
          return 'Eli asiente despacio cuando se lo dices, como si hubiera apostado consigo mismo y hubiera ganado.\n\n«Los funerales de familia», dice, «se celebran en familia.»\n\n(+5 FAMA: el territorio entero hablará de esto)';
        }
      });
      scene({
        title: 'Capítulo 7 — Los aliados del alba',
        text: 'El mapa está sobre la mesa: el arroyo seco, el campamento, una docena de rifles de Grey contra lo que tú puedas juntar.\n\nMarrow Creek entero sabe que vas a ir. La única pregunta que queda es con quién cabalgas al alba.\n\nElige. Esta puerta no se abre dos veces.',
        opts: opts.filter(o => !o.dis)
      }, () => {
        scene({
          title: 'La víspera',
          text: 'La última noche antes del arroyo seco nadie duerme bien y todos fingen que sí.\n\nLimpia tus hierros. Cuenta tus balas. Escribe en el diario si tienes algo que dejarle a alguien.\n\nEl capítulo final espera en el MAPA cuando estés listo. Grey no se va a ir: lleva veinticinco años sin irse.',
          opts: [{ t: 'Que amanezca', fx() {
            endCap(7, 'Capítulo 7 cerrado. Los aliados están elegidos, las balas contadas, las cartas escritas. El arroyo seco espera. Sam, si me oyes: voy a terminar tu historia. La de los DOS Sams.');
          } }]
        }, () => {});
      });
    }
  },

  // ═════════════ CAPÍTULO 8 — El arroyo seco ═════════════
  8: {
    title: 'El arroyo seco (FINAL DEL TOMO I)',
    run(scene) {
      const aliado = G.flags.t1aliado || 'solos';
      const intro = {
        ley: 'Los ayudantes del sheriff toman las rocas altas. Placas al sol: Grey sabrá que hoy hasta la ley vino a verle.',
        pueblo: 'El forjador y los granjeros cierran el paso del arroyo con un carro volcado. Manos de trabajar, hoy de aguantar.',
        forajidos: 'Tus mercenarios se despliegan sin que nadie lo ordene. Esto lo han hecho antes. Mejor no preguntar dónde.',
        solos: 'Solo el viento, tu banda y veinticinco años de deuda ajena esperando cobrarse. Como debe ser.'
      }[aliado];
      scene({
        title: 'Capítulo 8 — El arroyo seco',
        text: `Cabalgáis con la primera luz. El arroyo seco aparece a media mañana: una cicatriz de grava blanca donde hace un cuarto de siglo murió una amistad y nació todo lo demás.\n\n${intro}\n\nY en el centro del cauce, de pie, solo, con el rifle apoyado en el hombro como quien lleva una pala: Ezekiel Grey.\n\n«Puntual», dice, sin levantar la voz, y el arroyo entero se la lleva hasta ti. «Sam también lo era. Es lo único que no le perdoné nunca: ni un solo defecto pequeño que odiar. Todo lo suyo era grande. Hasta lo que me hizo.»`,
        opts: [
          { t: '«Cuenta tu versión. Te la debo escuchar.»', fx() {
              G.flags.t1oyo = true;
              return '«¿Mi versión?» Casi sonríe. «Doce mil dólares en un carro. Y mi socio, mi hermano, el padrino de la boda que nunca tuve... me miró sobre el fuego y dijo: "Zeke, este dinero nos va a matar. Lo he visto." Y yo me reí.»\n\n«Por la mañana tenía dos balas dentro y el carro no estaba. Veinte años en Yuma me aprendí de memoria esa risa mía. Cada noche. Mi propia risa, muchacho. Esa fue mi celda de verdad.»\n\nAlza por fin la cabeza y ves sus ojos: no hay locura. Hay algo mucho peor: orden.\n\n«Sam te crió para heredarlo todo. Enhorabuena: esto es todo.»';
            } },
          { t: '«Sam está muerto. Tu guerra murió con él.»', fx() {
              return '«¿Muerto?» Grey menea la cabeza despacio. «Sam no está muerto, muchacho. Sam eres tú. Él te hizo a su imagen: el arma, la palabra justa, esa manera de plantarte que tienes. Yo lo veo desde aquí.»\n\n«Por eso no acabé contigo en el desfiladero, ni en la cantina, ni las otras cuatro veces que pude. Necesito que Sam esté MIRANDO cuando cobre. Y Sam mira por tus ojos.»\n\nLevanta el rifle sin prisa.\n\n«Dile hola de mi parte.»';
            } }
        ]
      }, () => {
        scene({
          title: 'La forma del final',
          text: 'Sus hombres asoman entre las rocas del cauce — menos de los que eran: tus aliados, tu fama o el propio Grey han ido podando. Los que quedan no apuntan todavía. Esperan la palabra.\n\nGrey te ofrece la elección con un gesto, como quien ofrece la silla buena:\n\n«¿Cómo lo hacemos, heredero? ¿A la vieja usanza — tú y yo, treinta pasos, el arroyo de juez — o a la moderna, todos contra todos, y que el desierto haga recuento?»',
          opts: [
            { t: 'A la vieja usanza: duelo, treinta pasos', fx() {
                choice('En el arroyo seco elegí el duelo: Grey y yo, treinta pasos, el arroyo de juez. Como en el 74.');
                const grey = mkFoe('grey');
                CB.startCombat({
                  title: 'Duelo en el arroyo seco', foes: [grey], canFlee: false, soloPlayer: true,
                  intro: 'Treinta pasos de grava blanca. Sus hombres y los tuyos forman el pasillo, rifles bajos, un tribunal de sombreros. Grey se quita el abrigo y lo dobla con cuidado, como para un viaje.',
                  onEnd: (res) => finalGrey(scene, res, true)
                });
              } },
            { t: 'A la moderna: que hable el plomo de todos', fx() {
                choice('En el arroyo seco no hubo duelo: hubo batalla. Todos contra todos y el desierto de notario.');
                const foes = [mkFoe('grey'), mkFoe('cuervo'), mkFoe('veterano')];
                if (aliado !== 'solos') { for (const f of foes) f.shaken = 1; }
                else foes.push(mkFoe('cuervo'));
                CB.startCombat({
                  title: 'La batalla del arroyo seco', foes, canFlee: false,
                  intro: aliado === 'solos'
                    ? 'Nadie más que vosotros y ellos. El cauce se convierte en un pasillo de pólvora.'
                    : 'Tus aliados abren fuego desde los flancos: los hombres de Grey pelean mirando a tres sitios a la vez.',
                  onEnd: (res) => finalGrey(scene, res, false)
                });
              } }
          ]
        }, () => {});
      });
    }
  }
};

// El final de Grey y del Tomo I: la última verdad y la última decisión.
function finalGrey(scene, res, duel) {
  if (res !== 'win') {
    journal('El arroyo seco me escupió vivo. Grey también sigue respirando. Esto no ha terminado: los dos lo sabemos. Volveré cuando las heridas me dejen.');
    log('El arroyo seco queda pendiente. El capítulo final espera en el MAPA.');
    save();
    return;
  }
  scene({
    title: 'Lo que guarda el arroyo',
    text: `Ezekiel Grey está sentado contra la grava blanca, exactamente — te das cuenta con un escalofrío — en la misma postura en que murió Sam contra la roca del desfiladero. El desierto tiene un sentido del humor viejísimo.\n\n${duel ? 'Fue rápido y limpio, como quería. Sus hombres, cumplida la ley del duelo, ya cabalgan lejos: el contrato murió con él.' : 'Sus últimos hombres huyen cauce abajo. Él no huyó: los hombres que esperan veinticinco años no saben.'}\n\nTe hace un gesto para que te acerques. Ya no queda amenaza en él: solo la prisa serena de los que se van.\n\n«Escucha... la última. El dinero del 74. Doce mil.» Tose. «Bajo el altar de la iglesia quemada de Bent Fork. Lo escondimos juntos la misma noche... antes de lo de las balas.»\n\nY entonces suelta la que llevaba veinticinco años guardando:\n\n«Sam nunca volvió a por él. NUNCA. Veinte años yo en Yuma odiándolo por ladrón... y el maldito no tocó un dólar. Me disparó para quedarse con el dinero y luego no... no lo quiso.» Se ríe, y la risa se le rompe en algo más viejo. «Dime tú qué significa eso, heredero. Yo me muero sin saberlo.»`,
    opts: [{ t: 'Quedarte con él hasta el final' }]
  }, () => {
    scene({
      title: 'FIN DEL TOMO I — La herencia',
      text: 'Grey muere con la última luz, sin pedir nada más. Lo entierras en el arroyo seco, donde empezó todo. Eli reza entero, por primera vez en años, y no se le rompe la voz hasta el amén.\n\nQueda una sola cosa en el mundo: doce mil dólares bajo un altar quemado. El dinero que mató a Sam dos veces — la noche que lo escondió y la mañana del desfiladero.\n\n¿Qué haces con la herencia maldita del 74?',
      opts: [
        { t: 'Ir a por él. El oro no tiene memoria. ($200 recuperables)', fx() {
            choice('Desenterré el dinero del 74 de la iglesia quemada. El oro no tiene memoria. La mía ya veremos.');
            G.money += 200; G.stats.earned += 200;
            G.rep.humanidad = Math.max(0, G.rep.humanidad - 6);
            addStress(player(), 5);
            return 'Del escondite solo quedan $200 en monedas buenas — el tiempo, la humedad y quizá otras manos se llevaron el resto. Los cargas en las alforjas y pesan lo que pesan.\n\nEli no dice nada. Lleva sin decir nada un rato largo. Los dos sabéis que Sam tampoco diría nada.\n\nDiría nada MUY fuerte.';
          } },
        { t: 'Dejarlo bajo el altar. Que lo guarde la ceniza.', fx() {
            choice('Dejé el dinero del 74 bajo el altar quemado, donde Sam lo dejó. Hay herencias que se honran no cobrándolas.');
            G.rep.humanidad = Math.min(100, G.rep.humanidad + 8);
            return 'Ni siquiera cabalgas a Bent Fork. ¿Para qué?\n\nSam pudo volver a por ese dinero durante veinticinco años y eligió, cada día de todos esos años, no hacerlo. Esa fue su penitencia y su victoria secreta: morir pobre teniendo doce mil dólares.\n\nQue la ceniza guarde lo suyo. Tú ya tienes tu herencia: la silla en la mesa, la gente alrededor, el nombre limpio... más o menos limpio.\n\nSuficientemente limpio.';
          } },
        { t: G.flags.promSam === 'hija'
            ? 'Desenterrarlo y enviárselo a Ada Corddry, sin nombre'
            : 'Desenterrarlo y repartirlo por los ranchos del valle, sin nombre', fx() {
            if (G.flags.promSam === 'hija') {
              choice('El dinero del 74 viajó, anónimo, a la lavandería de Hoyt Street. La hija de Sam heredó lo que su padre no pudo tocar. La deuda del apellido queda en paz.');
              G.flags.adaMoney = true;
              G.rep.humanidad = Math.min(100, G.rep.humanidad + 10);
              return 'Un giro postal anónimo desde una oficina de Blackvein, en cuatro envíos discretos para no levantar al mundo: todo lo que quedaba bajo el altar, hasta la última moneda.\n\nAda Corddry no sabrá nunca de dónde vino. Solo tú y dos muertos conocéis el chiste completo: el dinero que Sam robó, escondió y jamás tocó acaba pagando la vida de su hija.\n\nEn algún sitio, en dos tumbas distintas, dos viejos socios por fin están de acuerdo en algo.';
            }
            choice('El dinero del 74 amaneció repartido en los porches del valle, sin nombre. El oro maldito acabó comprando semillas.');
            G.fac.pueblo += 10;
            G.rep.humanidad = Math.min(100, G.rep.humanidad + 10);
            return 'Catorce ranchos amanecen con un paquete en el porche y ninguna explicación.\n\nEl valle entero habla durante meses del "ángel del alba". Algunos sospechan de ti. Otis sonríe cuando lo oye y te sirve sin cobrar.\n\nEl dinero que nació de un robo y mató una amistad termina comprando semillas, tejados y un invierno tranquilo. Los caminos del oro son retorcidos, pero a veces — muy de tanto en tanto — llegan a buen puerto.';
          } }
      ]
    }, () => {
      scene({
        title: 'Epílogo',
        text: 'Días después, la vida vuelve a su ruido: el tablón, la cantina, la paga de la semana.\n\nPero algo cambió. Lo notas en cómo te saludan por la calle mayor, en cómo Otis te guarda la mesa del fondo, en cómo Eli limpia «La Viuda» silbando — SILBANDO, Eli.\n\nYa no eres el chico que sobrevivió al desfiladero. Eres el hombre del arroyo seco. El territorio entero cuenta ya la historia, y cada cantina la mejora un poco.\n\nY lejos, al este, en una oficina de Blackvein City con demasiados papeles y un bombín en el perchero, alguien subraya tu nombre en una libreta y escribe al lado una sola palabra:\n\n«Interesante.»\n\nFIN DEL TOMO I\n\n(El Tomo II — «La ciudad del humo» — llegará con una futura actualización. Tu historia, tus decisiones y tus muertos viajarán contigo.)',
        opts: [{ t: 'Cerrar el libro. Por ahora.', fx() {
          G.rep.fama = Math.min(100, G.rep.fama + 8);
          endCap(8, 'FIN DEL TOMO I: «Todos los caminos cobran peaje». Grey descansa en el arroyo seco donde empezó su guerra. Sam descansa entero por fin: conocí sus dos vidas y lo quiero igual — puede que más. El territorio me llama el hombre del arroyo seco. Y en Blackvein City, alguien acaba de subrayar mi nombre. Que subrayen. Aquí estaré.');
          journal('El Tomo II me espera en el este, con humo de carbón y un bombín en un perchero. Cuando llegue la actualización, estaré listo. O no. Pero estaré.');
        } }]
      }, () => {});
    });
  });
}
