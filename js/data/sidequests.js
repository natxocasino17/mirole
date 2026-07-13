// MIROLE — Historias del territorio. Misiones secundarias ÚNICAS: cada
// una ocurre una sola vez en toda tu vida de juego, tiene vueltas de
// tuerca y decisiones que quedan grabadas en el registro para siempre.
// El Director ofrece una de vez en cuando; ignorarla la deja volver,
// completarla la entierra: el territorio no repite sus historias.
import { G, log, journal, save, choice, markOnce } from '../engine/state.js';
import { rint, pick, chance } from '../engine/rng.js';
import { player, addStress, addXp, aliveSquad } from '../engine/chars.js';
import { mkFoe } from './enemies.js';
import { mkGood, mkRopa } from './items.js';
import * as CB from '../engine/combat.js';
import * as T from '../engine/time.js';

function travel(d) { T.advanceDays(d, { travel: true }); }
function done(id) { markOnce('sq_' + id); G.sideOffer = null; save(); }

export const SIDEQUESTS = {

  // ---------------------------------------------------------------
  dry_wells: {
    title: 'El silencio de Dry Wells',
    hook: 'Dicen que en Dry Wells ya no queda nadie. Los que fueron a ver por qué, tampoco. El almacén paga por saber la verdad.',
    cond: () => G.time.day > 30,
    run(scene) {
      done('dry_wells');
      scene({
        title: 'El silencio de Dry Wells',
        text: 'Medio día de camino y ni un pájaro. Dry Wells aparece tras la loma: casas enteras, ropa tendida ya rígida, mesas puestas con polvo encima.\n\nNo hay cuerpos. No hay sangre. Solo un pueblo que se levantó de la mesa y no volvió.',
        opts: [{ t: 'Registrar el pueblo' }]
      }, () => {
        travel(1);
        scene({
          title: 'El pozo',
          text: 'Lo encuentras en el pozo mayor: un olor químico, dulzón, que no debería estar ahí. Y clavado bajo la polea, un maletín con papeles de la Blackvein Mining.\n\n«Compensación por realojo — Proyecto Veta Sur.» Cifras miserables. Y una nota interna: «El agua hará el resto del argumento.»\n\nEnvenenaron el pozo para comprar el valle por centavos. Los que enfermaron se fueron. Los que no... firmaron.\n\nUn ruido a tu espalda: una chica flaca con un rifle más grande que ella. «Mara», dice. «La única que no firmó. ¿Y tú de quién eres?»',
          opts: [{ t: '«De nadie. Eso me hace peligroso.»' }]
        }, () => {
          const foes = [mkFoe('maton'), mkFoe('pistolero')];
          CB.startCombat({
            title: 'Los cobradores de la Veta Sur', foes,
            intro: 'No eres el único visitante: dos hombres de la compañía vienen a «recoger papeles». Mara amartilla el rifle a tu lado.',
            onEnd: (res) => {
              travel(1);
              if (res !== 'win') {
                journal('Dry Wells me escupió. Los papeles se quedaron allí, y la verdad, enterrada con el pueblo.');
                return;
              }
              scene({
                title: 'Los papeles queman',
                text: 'Tienes en la mano la ruina de un pueblo entero, con sello y firma. Mara te mira. El maletín pesa como un muerto.\n\n¿Qué haces con la verdad?',
                opts: [
                  { t: 'Llevarla al juez de Blackvein', fx() {
                      choice('Entregué las pruebas de Dry Wells a la justicia. La Blackvein me lo apuntará en su libro.');
                      G.fac.ley += 8; G.fac.mineros -= 15; G.rep.fama += 5;
                      G.rep.humanidad = Math.min(100, G.rep.humanidad + 6);
                      journal('El caso Dry Wells salió en el periódico de Blackvein. Dos capataces presos, la compañía «lamenta el malentendido». Mara declaró sin temblar. Algo es algo. A veces algo lo es todo.');
                      return 'El juez lee dos páginas y envejece cinco años. «¿Sabe lo que me trae, muchacho?»\n\nLo sabes. Por eso lo traes.\n\nSemanas después, dos capataces caen. La compañía sobrevive — siempre sobreviven — pero el territorio entero sabe ya cómo huele su dinero. Y sabe quién lo contó.';
                    } },
                  { t: 'Vendérsela a la propia Blackvein ($90)', fx() {
                      choice('Vendí el silencio de Dry Wells a la Blackvein por $90.');
                      G.money += 90; G.stats.earned += 90;
                      G.fac.mineros += 8;
                      G.rep.humanidad = Math.max(0, G.rep.humanidad - 12);
                      addStress(player(), 6);
                      journal('Vendí Dry Wells. El del bombín pagó sin regatear, que es lo que hacen cuando compran algo que vale mil veces más. Mara no dijo nada. Su cara lo dijo todo.');
                      return 'El hombre del bombín cuenta los billetes sin mirarte, como quien paga una letrina.\n\n«La compañía valora la discreción», dice.\n\nMara desaparece esa noche sin despedirse. El dinero pesa poco. Lo otro, ya veremos.';
                    } },
                  { t: 'Dárselos a Mara: es su guerra', fx() {
                      choice('Le di las pruebas de Dry Wells a Mara. La guerra es suya; yo solo cargué el rifle.');
                      G.rep.humanidad = Math.min(100, G.rep.humanidad + 4);
                      G.fac.pueblo += 6;
                      journal('Mara se fue al este con el maletín y una lista de nombres. Me dio las gracias sin dar las gracias, como hacen los que ya no esperan nada. Volveremos a oír de ella. Estoy casi seguro. Casi es mucho en este territorio.');
                      G.stash.push(mkRopa('totem_cuervo'));
                      return '«¿Y si te matan?», le preguntas.\n\n«Ya me mataron el pueblo. Lo demás es papeleo.»\n\nCarga el maletín en la mula y se va hacia el este sin mirar atrás. En el brocal del pozo, dejó algo para ti: un tótem pequeño de madera negra.\n\n«Era de mi abuelo. Decía que el cuervo avisa. Ojalá te avise a ti.»';
                    } }
                ]
              }, () => save());
            }
          });
        });
      });
    }
  },

  // ---------------------------------------------------------------
  viuda: {
    title: 'La última diligencia de la viuda',
    hook: 'La viuda Thatcher paga el doble de lo normal por una escolta al cruce de Blackvein. No dice qué carga. Las viudas ricas nunca lo dicen.',
    cond: () => G.rep.fama >= 8,
    run(scene) {
      done('viuda');
      scene({
        title: 'La viuda Thatcher',
        text: 'Sesenta años, luto perfecto, y una forma de subir a la diligencia que no aprendió en ningún salón de té.\n\n«Al cruce de Blackvein, joven. Sin preguntas. Las preguntas las cobro aparte y usted no puede pagármelas.»\n\nEl baúl que sube su criado pesa como un pecado.',
        opts: [{ t: 'Partir con la diligencia' }]
      }, () => {
        travel(1);
        const foes = [mkFoe('pistolero'), mkFoe('pistolero'), mkFoe('maton')];
        CB.startCombat({
          title: 'Los jinetes del arroyo', foes, canFlee: false,
          intro: 'Tres jinetes cortan el camino. El que manda saluda... a la viuda. «Hola, Rose. Bonito luto. ¿Es por nosotros?»',
          onEnd: (res) => {
            travel(1);
            if (res !== 'win') {
              journal('La diligencia de la viuda Thatcher acabó en desastre. Ella desapareció en el tumulto. El baúl también. Sospecho que lo uno explica lo otro.');
              return;
            }
            scene({
              title: 'Rose',
              text: 'La viuda baja de la diligencia, mira los cuerpos y suspira como quien revisa una cosecha mediocre.\n\n«Mi antigua cuadrilla», dice, quitándose el guante. Bajo el luto, una culata gastada de revólver. «Veinte años robando ferrocarriles de punta a punta del territorio. "La Reina Rose", me decían. El baúl es mi retiro: hasta el último dólar, y créame que me lo gané.»\n\nTe estudia con ojos de tasadora.\n\n«Y ahora usted decide qué hace con una anciana rica y con un pasado pesado. Decida bien.»',
              opts: [
                { t: 'Entregarla: hay recompensa vieja ($80)', fx() {
                    choice('Entregué a Rose Thatcher, la Reina Rose, a la ley. Su retiro terminó en Blackvein.');
                    G.money += 80; G.stats.earned += 80;
                    G.fac.ley += 8;
                    G.rep.humanidad = Math.max(0, G.rep.humanidad - 8);
                    journal('La Reina Rose cruzó el pueblo esposada saludando como una emperatriz. Me maldijo con mucha elegancia. El dinero de la recompensa gasta igual que el otro, me digo. Me lo digo mucho.');
                    return '«Veinte años sin que me toque un sheriff», dice mientras la atan, «y me caza un mocoso con buenos modales.»\n\nTe mira sin odio, que es peor.\n\n«Cuando llegues a viejo, muchacho — si llegas — acuérdate de mí.»';
                  } },
                { t: 'Guardar su secreto y acabar la escolta', fx() {
                    choice('Descubrí que la viuda Thatcher era la Reina Rose. Guardé su secreto y la llevé a su retiro.');
                    G.rep.humanidad = Math.min(100, G.rep.humanidad + 6);
                    G.fac.forajidos += 5;
                    G.stash.push(mkRopa('gabardina_cuero'));
                    journal('Dejé que la Reina Rose se retirara en paz. Me pagó el doble, me regaló la gabardina de su difunto — «le quedará mejor que a la percha» — y me hizo prometer que no llegaré viejo haciendo esto. Prometido quedó. Ja.');
                    return '«Un hombre que sabe callar», asiente, «vale más que uno que sabe disparar. Usted, por lo visto, sabe las dos cosas.»\n\nEn el cruce de Blackvein la espera un carruaje fino. Antes de subir te lanza un bulto: una gabardina de cuero magnífica.\n\n«De mi difunto. Él tampoco hizo preguntas. Por eso llegó a difunto de viejo y en la cama.»';
                  } },
                { t: '«¿Y si su retiro necesita un socio?»', fx() {
                    choice('Me asocié con la Reina Rose para su último golpe: el pago del ferrocarril.');
                    G.money += 120; G.stats.earned += 120;
                    G.fac.forajidos += 10; G.rep.fama += 4;
                    G.rep.humanidad = Math.max(0, G.rep.humanidad - 4);
                    addXp(player(), 'sigilo', 5);
                    journal('El último golpe de la Reina Rose: la nómina del ferrocarril, sin un solo disparo, con planos dibujados de memoria veinte años después. $120 mi parte. «El crimen perfecto es aburrido», me dijo. «Por eso lo dejo.» Aprendí más en una noche que en un año de tiroteos.');
                    return 'La sonrisa que se le pone no ha sido de viuda jamás.\n\n«Sabía que me caía usted bien.»\n\nUna semana después: la nómina del ferrocarril cambia de dueño sin que nadie amartille un arma. Todo cronómetro, sobornos viejos y puertas que ella dejó engrasadas hace veinte años.\n\nTu parte: $120. Su consejo de despedida: «Retírese antes de que el territorio le ponga apodo.»';
                  } }
              ]
            }, () => save());
          }
        });
      });
    }
  },

  // ---------------------------------------------------------------
  fotografo: {
    title: 'El hombre de la caja de luz',
    hook: 'Un fotógrafo ambulante ofrece retratar a tu banda. Los de la Blackvein le siguen los pasos, y no por amor al arte.',
    run(scene) {
      done('fotografo');
      scene({
        title: 'El hombre de la caja de luz',
        text: 'Elias Boone, fotógrafo, sombrero de copa abollado y un carromato lleno de placas de cristal.\n\n«Un retrato de su cuadrilla, señor. Gratis. Solo pido que me dejen acampar junto a su fuego esta noche: los caminos andan... complicados para la gente de mi oficio.»\n\nDispara la cámara como quien celebra un funeral: con solemnidad y magnesio.',
        opts: [{ t: 'Posar con la banda' }]
      }, () => {
        G.stash.push(mkGood('foto_banda'));
        journal('Un fotógrafo nos retrató a todos frente a «El Cuervo». Salimos serios como jueces. Guardo la placa. Algún día esta foto va a doler y a curar a la vez, lo sé desde ya.');
        scene({
          title: 'La noche complicada',
          text: 'La foto queda solemne y magnífica: tu banda entera, viva, junta, seria. Un momento congelado que ya vale más de lo que sabes.\n\nDe madrugada, botas. Tres hombres de la Blackvein rodean el carromato de Boone.\n\n«Las placas, fotógrafo. Todas. La compañía compra tu archivo entero... o lo quema contigo dentro.»\n\nBoone te mira. En su archivo, entiendes de pronto, hay más que retratos de bodas: pozos, capataces, desalojos. El hombre lleva años fotografiando lo que la Blackvein entierra.',
          opts: [
            { t: 'Ponerte delante del carromato', fx() {
                choice('Defendí al fotógrafo Boone y su archivo de la Blackvein.');
              } },
            { t: 'Apartarte: no es tu guerra', fx() {
                G.flags._skipBoone = true;
                choice('Dejé que la Blackvein quemara el archivo del fotógrafo Boone. No era mi guerra, me dije.');
                G.rep.humanidad = Math.max(0, G.rep.humanidad - 10);
                G.fac.mineros += 5;
                addStress(player(), 5);
                journal('Vi arder veinte años de verdad en placas de cristal y no moví un dedo. Boone no me lo reprochó, que fue su manera de reprochármelo. La foto de la banda me la dejó igual. La miro distinto.');
                return 'Te haces a un lado. Boone no corre ni suplica: mira arder su carromato con la dignidad de quien ya lo ha perdido todo otras veces.\n\nAl irse, te deja la foto de tu banda en el porche, sin una palabra.\n\nLa culpa, resulta, también sale bien enfocada.';
              } }
          ]
        }, () => {
          if (G.flags._skipBoone) { delete G.flags._skipBoone; save(); return; }
          const foes = [mkFoe('maton'), mkFoe('maton'), mkFoe('pistolero')];
          CB.startCombat({
            title: 'El carromato de Boone', foes,
            intro: '«Última oportunidad, vaquero», dice el del medio. Boone carga su cámara detrás de ti como si fuera un rifle. Quizá lo es.',
            onEnd: (res) => {
              if (res === 'win') {
                G.fac.pueblo += 5; G.fac.mineros -= 8; G.rep.fama += 3;
                G.rep.humanidad = Math.min(100, G.rep.humanidad + 5);
                journal('Defendimos el archivo de Boone. Veinte años de placas: pozos envenenados, desalojos, capataces sonriendo donde no debían. «Algún día esto será historia», dijo. «Y la historia, muchacho, es la única bala que la Blackvein no puede esquivar.»');
                log('Boone se fue al alba, carromato entero, archivo entero.');
              } else {
                journal('No pudimos salvar el carromato de Boone. Las placas ardieron. Él sobrevivió, que ya es más de lo que la Blackvein quería.');
              }
              save();
            }
          });
        });
      });
    }
  },

  // ---------------------------------------------------------------
  cartas: {
    title: 'La carta del soldado',
    hook: 'Un viejo soldado agoniza en la trastienda del almacén. Pregunta por alguien con botas de camino y cara de saber callar.',
    cond: () => G.time.day > 40,
    run(scene) {
      done('cartas');
      scene({
        title: 'La carta del soldado',
        text: 'El viejo tiene la guerra escrita en la cara y la muerte sentada a los pies del catre, esperando su turno con educación.\n\n«Corporal Amos Reilly», se presenta, y tose medio apellido. «Llevo una carta veinte años en el macuto. Para Eleanor Voss, de Bent Fork. No tuve... el valor. Ahora no tengo el tiempo.»\n\nTe tiende un sobre amarillento y un anillo envuelto en un pañuelo.\n\n«Dígale que nunca hubo otra. Ni una sola noche de estos veinte años.»\n\nMuere antes del amanecer, con la mano ya vacía y la cara en paz.',
        opts: [{ t: 'Cabalgar a Bent Fork' }]
      }, () => {
        travel(1);
        scene({
          title: 'Bent Fork',
          text: 'La casa de Eleanor Voss tiene el jardín cuidado y las contraventanas cerradas.\n\nTe abre una mujer de tu edad con los ojos exactos que el viejo describió sin describir.\n\n«¿Eleanor Voss? Era mi madre. Murió hace tres años.» Mira el sobre en tu mano y algo le cambia en la cara. «¿Eso es... de quién es eso?»\n\nSe llama Rosa. Y por cómo mira el anillo, entiendes de golpe la aritmética: veinte años, la edad de ella, el valor que al corporal nunca le alcanzó.\n\nNo le llevó una carta a un amor viejo. Le llevaste un padre a una hija.',
          opts: [
            { t: 'Darle la carta y la verdad entera', fx() {
                choice('Le entregué a Rosa Voss la carta de su padre, el corporal Reilly, con la verdad entera.');
                G.rep.humanidad = Math.min(100, G.rep.humanidad + 8);
                G.fac.pueblo += 4;
                journal('Rosa Voss leyó la carta de su padre en el porche, dos veces, sin llorar hasta la segunda. «Mamá esperó toda la vida», dijo. «Al menos ahora sé a quién.» Me quedé hasta que dejó de temblar. Hay trabajos que no pagan y son los mejores que he hecho.');
                return 'Rosa lee de pie, luego sentada, luego con la mano de una desconocida — la tuya — en el hombro.\n\nLa carta dice lo que veinte años de silencio no supieron: nombres, fechas, un amor entero y el miedo que lo pudrió.\n\n«¿Sufrió?», pregunta al final.\n\n«Murió en paz, con la carta ya en camino.»\n\nEso último es casi verdad. Las mejores verdades son casi.';
              } },
            { t: 'Solo la carta. La verdad que la diga el papel', fx() {
                choice('Le dejé la carta del corporal a Rosa Voss y me fui sin explicar nada. El papel sabría mejor que yo.');
                G.rep.humanidad = Math.min(100, G.rep.humanidad + 3);
                return 'Le pones el sobre y el anillo en las manos y te tocas el sombrero.\n\n«¿Quién era?», alcanza a preguntar.\n\n«Alguien que nunca la olvidó. El resto lo cuenta mejor él.»\n\nTe vas antes de que abra el sobre. Hay lecturas que necesitan estar solas.';
              } },
            { t: 'Quedarte el anillo. Los muertos no cobran ($25)', fx() {
                choice('Me quedé el anillo del corporal Reilly y vendí el oro. La carta la entregué. A medias todo, como siempre.');
                G.money += 25; G.stats.earned += 25;
                G.rep.humanidad = Math.max(0, G.rep.humanidad - 12);
                addStress(player(), 8);
                journal('Vendí el anillo de un muerto por $25. La carta la entregué, eso sí, como si una cosa lavara la otra. No la lava. El prestamista ni preguntó. Los prestamistas nunca preguntan, por eso huelen así.');
                return 'Entregas la carta. El anillo se queda en tu bolsillo, pesando lo que pesan esas cosas.\n\n$25 en el prestamista de la calle mayor.\n\nEsa noche sueñas con el corporal. No dice nada. Tose medio apellido y te mira la mano.';
              } }
          ]
        }, () => save());
      });
    }
  },

  // ---------------------------------------------------------------
  nino: {
    title: 'El ratero del mercado',
    hook: 'Un crío te ha robado la bolsa en el mercado. Corre como una liebre y el sheriff ya afila la vara.',
    run(scene) {
      done('nino');
      const stolen = Math.min(G.money, 8);
      G.money -= stolen;
      scene({
        title: 'El ratero del mercado',
        text: `Un roce, un tirón, y $${stolen} menos: un crío de once años vuela entre los puestos con tu bolsa y media docena de maldiciones ajenas detrás.\n\nLo alcanzas en el callejón del forjador — o más bien, él se queda sin callejón. Se gira con la barbilla alta y los ojos aterrados, que es la mezcla exacta del que roba por primera vez y por necesidad.\n\n«Tobias», dice, como si el nombre fuera una defensa. «Y no lo devuelvo.»`,
        opts: [
          { t: 'Preguntarle para qué era (Labia)', fx() {
              addXp(player(), 'labia', 3);
              const p = player();
              if (p.skills.labia + rint(0, 30) >= 35) {
                return 'Te agachas a su altura y no dices nada del dinero. Preguntas por su casa.\n\nSe le desmonta la barbilla: la abuela, la tos de la abuela, el boticario que no fía. Todo verdad — lo ves en cómo le da vergüenza cada palabra.\n\nEl dinero era para la medicina. Los $8 exactos que cuesta, de hecho. Robó con lista de la compra.';
              }
              return 'El crío ladra tres mentiras seguidas, tan malas que casi son honestas. Algo de una abuela, algo de una tos. Vete a saber.';
            } }
        ]
      }, () => {
        scene({
          title: 'La sentencia del callejón',
          text: 'El chaval espera tu veredicto apretando la bolsa contra el pecho. A la boca del callejón ya asoma el ayudante del sheriff, vara en mano y ganas de usarla.\n\nTuya es la sentencia.',
          opts: [
            { t: 'Dejarle el dinero y el doble encima', fx() {
                choice('Al ratero Tobias: le dejé lo robado y otro tanto para la medicina de su abuela.');
                const extra = Math.min(G.money, 8);
                G.money -= extra;
                G.rep.humanidad = Math.min(100, G.rep.humanidad + 5);
                G.fac.pueblo += 3;
                journal('Un crío llamado Tobias me robó $8 para la medicina de su abuela. Le di otros $8 y una colleja de mentira para la galería del sheriff. Invertir, le llaman en Blackvein.');
                return 'Le cierras los dedos sobre la bolsa y añades lo tuyo encima.\n\n«La próxima vez pide trabajo, no limosna con prisas.»\n\nAl ayudante del sheriff le dices que era un malentendido. Tobias desaparece por el tejado del forjador como si tuviera práctica. La tiene.';
              } },
            { t: 'Entregarlo al sheriff: la ley es la ley', fx() {
                choice('Entregué al ratero Tobias al sheriff. La ley es la ley, hasta cuando muerde pequeño.');
                G.fac.ley += 5;
                G.rep.humanidad = Math.max(0, G.rep.humanidad - 6);
                journal('Entregué a un crío de once años por $8. La ley me dio las gracias. El callejón entero me miró como se mira a la ley: por encima del hombro y con razón.');
                return 'El ayudante lo agarra del cuello con oficio. Tobias no llora: te mira, memoriza tu cara con una atención que no es de niño, y se deja llevar.\n\nRecuperas tus $8.\n\nSalen caros.';
              } },
            { t: 'Darle trabajo: recadero de la banda', fx() {
                choice('Al ratero Tobias lo hice recadero de la banda. Todo imperio empieza con un espía de once años.');
                G.flags.ward_tobias = true;
                G.rep.humanidad = Math.min(100, G.rep.humanidad + 4);
                journal('La banda tiene recadero: Tobias, once años, ladrón reformado a medio reformar. Lleva recados, escucha en los mercados y come caliente. Eli dice que le recuerdo a alguien cuando lo miro. No pregunté a quién. Sé a quién.');
                return '«¿Sabes callar?», le preguntas.\n\n«Mejor que correr, y ya has visto cómo corro.»\n\nTrato hecho: un dólar por semana, recados, oídos abiertos en el mercado y NADA de bolsillos ajenos. La abuela tendrá su medicina.\n\nEli, al enterarse, limpia «La Viuda» y sonríe para dentro. «Todo imperio», murmura, «empieza robándole a alguien.»';
              } }
          ]
        }, () => save());
      });
    }
  },

  // ---------------------------------------------------------------
  duelo: {
    title: 'El chico del duelo',
    hook: 'Un pistolero joven pregunta por ti en la cantina. Dice tu nombre entero, sin apodo, como se dicen los nombres en los duelos.',
    cond: () => G.rep.fama >= 15,
    run(scene) {
      done('duelo');
      scene({
        title: 'El chico del duelo',
        text: 'No tendrá ni veinte años. Chaleco nuevo, revólver caro, y esa quietud ensayada frente al espejo que solo tienen los que nunca han visto morir a nadie.\n\n«Cassidy Ray», anuncia, alto, para que lo oiga la cantina. «Y tú eres el que dicen. Mañana al alba, en la calle mayor. O el territorio sabrá que la fama se te ha puesto vieja.»\n\nLa cantina contiene el aliento. Eli, sin girarse, mueve despacio la cabeza: no.',
        opts: [
          { t: 'Intentar quitárselo de la cabeza (Labia)', fx() {
              addXp(player(), 'labia', 4);
              const p = player();
              if (p.skills.labia + rint(0, 30) >= 45) {
                choice('Convencí al chico Cassidy Ray de no batirse conmigo. Perdí un poco de fama y gané un muerto menos.');
                G.rep.fama = Math.max(0, G.rep.fama - 2);
                G.rep.humanidad = Math.min(100, G.rep.humanidad + 6);
                G.flags.cassidy = 'convencido';
                journal('Cassidy Ray, diecinueve años, quiso comprarse un nombre con mi funeral. Le conté cómo huele la calle mayor después de un duelo y a quién le toca fregarla. Se fue al este, a buscar un oficio con menos espejo. La cantina murmuró que me ablando. La cantina friega poco.');
                return 'No levantas la voz. Le cuentas el después: el agujero, las moscas, la madre de alguien, el fregado.\n\nLe cuentas los nombres de los tres últimos chicos rápidos del territorio. No los recuerda nadie: ese es el chiste.\n\nCassidy traga saliva de diecinueve años. Al alba, su caballo ya no está en el pueblo.\n\nPierdes un pellizco de fama. Duermes como un juez honrado, si existiera.';
              }
              choice('Intenté disuadir al chico Cassidy Ray. No hubo palabras: hubo alba y calle mayor.');
              return 'Las palabras te salen bien, pero él las necesita mal: cada frase tuya le suena a miedo tuyo, y eso lo envalentona.\n\n«Al alba», repite, y se va dormir su última noche tranquila.\n\nNo hay vuelta: la calle mayor te espera.';
            } },
          { t: '«Al alba, entonces.»', fx() {
              choice('Acepté el duelo del chico Cassidy Ray sin gastar saliva.');
              return 'Asientes una vez, te terminas el vaso y subes a dormir.\n\nLa cantina entera exhala. Cassidy Ray descubre que la parte difícil del duelo no es el alba: es la noche de antes.';
            } }
        ]
      }, (opt) => {
        if (G.flags.cassidy === 'convencido') { save(); return; }
        const kid = mkFoe('pistolero', 'Cassidy Ray');
        kid.sk.punteria = 50; kid.sk.reflejos = 60; kid.sk.voluntad = 55;
        kid.hp = kid.hpMax = 5;
        CB.startCombat({
          title: 'Duelo al alba', foes: [kid], canFlee: false, soloPlayer: true,
          intro: 'La calle mayor, vacía y larga. Un perro se aparta con criterio. Cassidy Ray ocupa su extremo con la solemnidad de quien lleva semanas ensayando este momento y ni un segundo el siguiente.',
          onEnd: (res) => {
            if (res !== 'win') {
              journal('El chico Cassidy Ray me ganó el alba. Sobreviví de milagro y él cabalgó al este con mi derrota de trofeo. El territorio ya silba su nombre. Que le aproveche: ese nombre cobra intereses.');
              G.rep.fama = Math.max(0, G.rep.fama - 5);
              save();
              return;
            }
            scene({
              title: 'El polvo del alba',
              text: 'Cassidy Ray está en el suelo con un agujero donde planeaba llevar la fama, respirando a sorbos, el revólver caro a un metro que ya no existe para él.\n\nTe mira desde abajo. Diecinueve años otra vez, de golpe: todos.\n\n«Mi padre decía...», empieza, y no le sale el resto.\n\nLa calle espera tu último movimiento.',
              opts: [
                { t: 'Rematarlo: los duelos acaban así', fx() {
                    choice('Rematé al chico Cassidy Ray en la calle mayor. Los duelos acaban así. Eso me digo.');
                    G.rep.fama = Math.min(100, G.rep.fama + 6);
                    G.rep.humanidad = Math.max(0, G.rep.humanidad - 12);
                    addStress(player(), 10);
                    journal('Maté a Cassidy Ray, diecinueve años, en la calle mayor al alba. La fama subió como la espuma. Lo otro bajó a donde bajan esas cosas. Su chaleco era nuevo. Eso es lo que recuerdo: lo nuevo que era todo él.');
                    return 'El disparo suena a puerta cerrándose.\n\nLa cantina te paga los whiskys una semana entera. El espejo, en cambio, te los cobra todos.\n\nEl chaleco era nuevo. Te acordarás del chaleco más que de la cara. Así funciona.';
                  } },
                { t: 'Bajar el arma y pedir al matasanos', fx() {
                    choice('Perdoné al chico Cassidy Ray tras vencerle al alba. Que viva. Que cuente cómo perdió.');
                    G.rep.fama = Math.min(100, G.rep.fama + 2);
                    G.rep.humanidad = Math.min(100, G.rep.humanidad + 8);
                    G.flags.cassidy = 'perdonado';
                    journal('Vencí a Cassidy Ray y lo dejé vivo. El matasanos le sacó la bala; yo le pagué la cuenta y el pasaje al este. «¿Por qué?», me preguntó. «Porque alguien lo hizo por mí una vez.» No es verdad. Nadie lo hizo. Por eso.');
                    return 'Enfundas y gritas por el matasanos.\n\n«¿Por qué?», balbucea el chico mientras lo cargan.\n\n«Porque muerto no aprendes, y el territorio anda corto de gente que aprenda.»\n\nSemanas después llega una carta desde el este: dos líneas torcidas. «Trabajo en un rancho. El revólver lo vendí. Gracias por el peor día de mi vida.»\n\nLa guardas.';
                  } }
              ]
            }, () => save());
          }
        });
      });
    }
  }
};

// El Director ofrece historias: una cada tanto, jamás repetida.
export function pickSideQuest() {
  const pool = Object.keys(SIDEQUESTS).filter(id => {
    if (G.once.includes('sq_' + id)) return false;
    const q = SIDEQUESTS[id];
    return !q.cond || q.cond();
  });
  return pool.length ? pick(pool) : null;
}
