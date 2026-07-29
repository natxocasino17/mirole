// MIROLE — las escenas de LAS TRAMAS. Cada latido de un hilo abierto:
// el aviso, el aprieto y el desenlace. Aquí las decisiones cuestan algo
// de verdad — dinero, sangre, gente o conciencia. Nunca las cuatro
// gratis a la vez.
import { G, log, journal, choice } from '../engine/state.js';
import { pick, chance, rint } from '../engine/rng.js';
import { player, aliveSquad, addStress } from '../engine/chars.js';
import * as TR from '../engine/tramas.js';
import { mkFoe } from './enemies.js';
import * as CB from '../engine/combat.js';

const find = (id) => (G.tramas || []).find(t => String(t.id) === String(id) && !t.done);
const dias = (t) => TR.diasPara(t);

function reloj(t) {
  const d = dias(t);
  if (d <= 0) return 'Se acabó el plazo.';
  if (d === 1) return 'Mañana vence.';
  return `Quedan ${d} días.`;
}

export const TRAMAS_EV = {

  // ---------- el latido: el hilo se hace notar ----------
  trama: {
    build(arg) {
      const t = find(arg);
      if (!t) return null;
      const d = dias(t);

      if (t.tipo === 'deuda') {
        const opts = [];
        if (G.money >= t.monto) opts.push({ t: `Pagar los $${t.monto} y acabar`, fx() {
          TR.pagarDeuda(t);
          return `Cuentas el dinero sobre la mesa, moneda a moneda, y ${t.who} lo recoge sin mirarte.\n\n«Un placer hacer negocios», dice, y lo dice en serio: para gente así, el placer es exactamente esto — que le paguen sin tener que romper nada.\n\nSales a la calle más pobre y más ligero. Merece la pena.`;
        } });
        opts.push({ t: 'Pedir más tiempo (Labia)', fx() {
          const p = player();
          if (p.skills.labia + rint(0, 30) >= 58) {
            t.due += rint(6, 10);
            return `Hablas despacio, sin excusas — las excusas son sangre en el agua con esta gente. Solo un plan y una fecha.\n\n${t.who} te escucha entero. «Me gusta que no me llores», concede al fin. «Días, no semanas.»\n\nHas comprado tiempo. El tiempo es lo único que no se puede robar.`;
          }
          t.monto += rint(5, 12);
          return `${t.who} te deja hablar hasta que te oyes a ti mismo pedir clemencia. Entonces sonríe.\n\n«Los plazos se alargan», dice. «Los números también.» La deuda sube. Debiste callarte.`;
        } });
        opts.push({ t: 'No decir nada y seguir con lo tuyo' });
        return {
          title: `⏳ ${t.title}`,
          text: `${reloj(t)}\n\n${d <= 1
            ? `${t.who} te espera en la puerta de «El Cuervo» sin entrar. No entra nunca: entrar sería una visita, y esto no es una visita.\n\n«Mañana», dice, y se toca el sombrero con una educación que hiela.`
            : d <= 3
              ? `Uno de los hombres de ${t.who} lleva dos días sentado en el porche de enfrente. No hace nada. Está ahí para que lo veas, y funciona.`
              : `${t.who} te manda recado con un crío: «Que no se me olvide, dice, no vaya a olvidársele a usted.» El crío repite la frase de memoria, orgulloso, sin entender ni una palabra.`}\n\nDebes $${t.monto}. Tienes $${G.money}.`,
          opts
        };
      }

      if (t.tipo === 'marcado') {
        const opts = [];
        opts.push({ t: 'Adelantarte: buscarlos tú primero', fx() {
          const foes = [mkFoe('pistolero', `Hombre de ${t.who.split(' ')[0]}`), mkFoe('maton')];
          CB.startCombat({ title: `Adelantarse a ${t.who}`, foes,
            intro: 'El que espera sentado elige el sitio pero no la hora. Tú prefieres al revés.',
            onEnd: (res) => {
              if (res === 'win') {
                TR.cerrarTrama(t, `Te adelantaste a ${t.who} y le rompiste el plan.`);
                journal(`No los esperé. Fui yo. ${t.who} tendrá que empezar de cero — y ahora sabe que lo sé.`);
              } else {
                journal(`Fui a por ${t.who} y volví peor de lo que salí. Adelantarse también es una apuesta.`);
              }
            } });
        } });
        opts.push({ t: 'Comprar la paz ($40)', fx() {
          if (G.money < 40) return 'Cuentas lo que tienes y no llega ni para la mitad de una paz. Habrá que pagarlo en la otra moneda.';
          G.money -= 40;
          if (chance(0.65)) {
            TR.cerrarTrama(t, `Compraste la paz con ${t.who}. Cara, pero limpia.`);
            journal(`Pagué a ${t.who} para que se le pasara el enfado. Funcionó. Lo malo de comprar la paz es que enseñas que tienes con qué.`);
            return `El dinero cambia de manos en un callejón y el asunto se cierra sin un disparo.\n\n«Esto no me hace tu amigo», avisa. «Solo deja de hacerme tu problema.»`;
          }
          return `Coge el dinero, lo cuenta, se lo guarda... y no dice que sí.\n\n«Gracias», dice. «Sigo viniendo.» Acabas de financiar a tus propios verdugos. Lección cara.`;
        } });
        opts.push({ t: 'Esperarlos. Que vengan.', fx() {
          t.esperando = true;
          return 'Avisas a los tuyos, revisas los hierros y eliges el sitio donde te encontrarán.\n\nSi han de venir, que vengan a donde tú sabes dónde están las piedras.';
        } });
        return {
          title: `⏳ ${t.title}`,
          text: `${reloj(t)}\n\n${d <= 1
            ? `Ya están en el pueblo. Tres caballos que no son de aquí, atados a la sombra, con las alforjas llenas y la paciencia corta.`
            : `Te llega por tres bocas distintas: ${t.who} ha juntado gente y ha puesto fecha. En este territorio los planes se filtran solos — la gente habla porque el silencio da más miedo que hablar.`}\n\n${t.stakes}`,
          opts
        };
      }

      if (t.tipo === 'favor') {
        const opts = [];
        if (!t.coste || G.money >= t.coste) opts.push({ t: t.coste ? `Resolverlo ($${t.coste})` : 'Resolverlo', fx() {
          TR.hacerFavor(t);
          return `No preguntas mucho: preguntar de más es otra forma de cobrar.\n\nLo resuelves y te vas antes de que ${t.who} encuentre las palabras. Hay gente a la que ayudar delante de testigos le duele más que el problema.`;
        } });
        opts.push({ t: 'Decir que no puedes', fx() {
          const p = G.relations && G.relations.people ? G.relations.people[t.pkey] : null;
          if (p) p.rel = Math.max(-100, p.rel - 8);
          TR.cerrarTrama(t, `Le dijiste que no a ${t.who}.`);
          return `Lo dices a la cara, que es lo mínimo. ${t.who} asiente demasiado rápido.\n\n«Claro. Faltaría más.» Y ahí queda: no un enemigo, pero tampoco lo de antes. Las amistades no se rompen, se descuentan.`;
        } });
        opts.push({ t: 'Dejarlo para más adelante' });
        return {
          title: `⏳ ${t.title}`,
          text: `${reloj(t)}\n\n${t.who} no te lo pide dos veces — esa es la clase de persona que es, y por eso duele.\n\n${d <= 2 ? 'Se le acaba el tiempo y lo sabe. Hoy ni siquiera te ha mirado al pasar: no quiere que te sientas obligado. Precisamente por eso te sientes obligado.' : 'Lo mencionó una vez, de pasada, como quien no quiere la cosa. Lleva días sin repetirlo.'}\n\n${t.stakes}`,
          opts
        };
      }

      if (t.tipo === 'sospecha') {
        const ch = G.chars[t.chId];
        if (!ch || !ch.alive) { TR.cerrarTrama(t, null); return null; }
        const nombre = ch.alias || ch.name;
        return {
          title: `⏳ ${t.title}`,
          text: `${reloj(t)}\n\n${d <= 2
            ? `${nombre} ha hecho el petate esta mañana y lo ha deshecho al verte entrar. Ya no disimula bien: los que van a irse dejan de fingir unos días antes.`
            : `${nombre} lleva una semana rara. Llega tarde, se calla al entrar tú, y ayer volvió con dinero que no le pagaste.\n\nNo es un dado: es un hombre con un secreto al que alguien le ha puesto precio. Siempre hay señales.`}\n\n${t.stakes}`,
          opts: [
            { t: 'Hablarle claro, de hombre a hombre', fx() {
                const p = player();
                const ok = p.skills.labia + (100 - ch.stress) / 4 + rint(0, 30) >= 75 || ch.loyalty >= 45;
                if (ok) {
                  ch.loyalty = Math.min(100, ch.loyalty + 25);
                  ch.secret = null;
                  TR.atajarSospecha(t, `Cogiste a ${ch.name} a tiempo y lo trajiste de vuelta.`);
                  journal(`Hablé con ${ch.name} antes de que fuera tarde. Me lo contó todo — lo que le ofrecían y por qué le tentaba. Le dije que aquí también se come. Se quedó. La lealtad no se compra: se pregunta a tiempo.`);
                  return `Le pones dos vasos y esperas. Tarda en arrancar, y cuando arranca no para.\n\nLe habían ofrecido dinero y una salida. Te lo cuenta mirando la mesa. Cuando termina, levanta la vista por primera vez en diez minutos.\n\n«¿Y ahora qué?» Le llenas el vaso otra vez. Eso es el «ahora qué».`;
                }
                ch.loyalty = Math.max(0, ch.loyalty - 5);
                return `${nombre} te escucha con la mandíbula apretada y contesta lo que hay que contestar.\n\n«No sé de qué me hablas.» Y se levanta antes de terminar el vaso.\n\nLo has puesto sobre aviso. Ahora irá con más cuidado — y más rápido.`;
              } },
            { t: 'Subirle la paga (+$15 y lealtad)', fx() {
                if (G.money < 15) return 'Miras la caja y la caja te mira a ti. No hay con qué comprar lealtad esta semana.';
                G.money -= 15;
                ch.loyalty = Math.min(100, ch.loyalty + 15);
                if (chance(0.55)) {
                  TR.atajarSospecha(t, `Le subiste la paga a ${ch.name} y se quedó.`);
                  return `El dinero no compra la lealtad, pero compra el margen para ganársela. ${nombre} coge la paga, cuenta, asiente.\n\nEsta noche duerme en el catre de siempre. Mañana ya se verá — pero mañana también es una victoria.`;
                }
                return `Coge el dinero y da las gracias. Demasiadas gracias.\n\nEl que va a marcharse siempre acepta la última paga. No has arreglado nada; has pagado la despedida.`;
              } },
            { t: 'Vigilarlo sin decir nada', fx() {
                addStress(player(), 5);
                t.due += 3;
                return `Decides mirar y callar. Le pones ojos encima sin que lo note y te aguantas las ganas de preguntar.\n\nGanas unos días de margen y pierdes unas noches de sueño. En esta mesa, desconfiar cuesta lo mismo que equivocarse. (+5 estrés)`;
              } }
          ]
        };
      }

      if (t.tipo === 'oportunidad') {
        return {
          title: `⏳ ${t.title}`,
          text: `${reloj(t)}\n\nSe habla de ${t.who}. Un golpe limpio si se hace pronto y un suicidio si se hace tarde: la información caduca antes que el pan.\n\nEn el tablón del MAPA hay trabajos honrados. Esto no es uno. Esto es de los que dan de comer un año o de comer a los cuervos.`,
          opts: [
            { t: `Ir a por ello (${aliveSquad().length} en la mesa)`, fx() {
                const foes = [mkFoe('veterano', 'Guardia'), mkFoe('pistolero'), mkFoe('maton')];
                CB.startCombat({ title: t.who, foes, canFlee: true,
                  intro: 'La ventana está abierta. Lo que entre por ella, entra ahora.',
                  onEnd: (res) => {
                    if (res === 'win') {
                      G.money += t.bote; G.stats.earned += t.bote;
                      G.rep.fama = Math.min(100, G.rep.fama + 3);
                      TR.cerrarTrama(t, `Diste el golpe de ${t.who}: $${t.bote}.`);
                      journal(`Salió. $${t.bote} y ni un muerto de los míos. Estas son las noches que uno recuerda cuando el invierno aprieta y la caja está vacía.`);
                    } else {
                      TR.cerrarTrama(t, `El golpe de ${t.who} salió mal.`);
                      journal(`Salió mal. Ni dinero ni gloria, y alguien tendrá que explicarle a la banda por qué sangramos gratis.`);
                    }
                  } });
              } },
            { t: 'Dejarlo pasar. No todo lo que brilla.', fx() {
                TR.cerrarTrama(t, null);
                return 'Lo dejas correr. Otro lo hará y quizá salga rico, o quizá salga en el Courier de la semana que viene, en la sección equivocada.\n\nNo todos los días hay que ser el más valiente de la comarca.';
              } }
          ]
        };
      }
      return null;
    }
  },

  // ---------- el cobro: no pagaste, y vinieron ----------
  trama_cobro: {
    build(arg) {
      const t = find(arg);
      if (!t) return null;
      const opts = [];
      if (G.money >= t.monto) opts.push({ t: `Pagar ahora mismo ($${t.monto})`, fx() {
        TR.pagarDeuda(t);
        return 'Sacas el dinero antes de que nadie saque nada más. Lo cuentan en el sitio, despacio, para que la escena dure.\n\n«Ves qué fácil», dice el grandote guardándose el fajo. Se van. La calle vuelve a ser una calle.';
      } });
      opts.push({ t: 'Que cobren si pueden', fx() {
        const foes = [mkFoe('veterano', `Cobrador de ${t.who.split(' ')[0]}`), mkFoe('maton'), mkFoe('maton')];
        CB.startCombat({ title: `El cobro de ${t.who}`, foes, canFlee: false,
          intro: 'Hay deudas que se pagan en oro y deudas que se pagan en plomo. El acreedor acepta las dos.',
          onEnd: (res) => {
            if (res === 'win') {
              TR.cerrarTrama(t, `Saldaste la deuda con ${t.who} a tiros.`);
              G.rep.fama = Math.min(100, G.rep.fama + 4);
              G.rep.humanidad = Math.max(0, G.rep.humanidad - 5);
              journal(`${t.who} mandó a cobrar y le devolví a los cobradores en un carro. La deuda queda saldada por la vía que él eligió. Dormiré mal, pero dormiré en mi cama.`);
            } else {
              const roba = Math.min(G.money, t.monto);
              G.money -= roba;
              TR.cerrarTrama(t, `Los hombres de ${t.who} cobraron por la fuerza.`);
              journal(`Cobraron. Se llevaron $${roba} y algo más que no se puede contar en monedas. Uno aprende que hay facturas que es más barato pagar en dinero.`);
            }
          } });
      } });
      return {
        title: `☠️ Vienen a cobrar`,
        text: `Se acabó el plazo. Tres hombres de ${t.who} entran en «El Cuervo» y la conversación se apaga sola, mesa por mesa, como una vela que alguien va soplando.\n\nEl que manda deja los nudillos sobre tu mesa. No dice nada durante un rato largo.\n\n«$${t.monto}», dice al fin. «O empezamos.»`,
        opts
      };
    }
  },

  // ---------- el golpe: te marcaron y venció el plazo ----------
  trama_golpe: {
    build(arg) {
      const t = find(arg);
      if (!t) return null;
      const listo = !!t.esperando;
      return {
        title: `☠️ ${t.who} viene a por ti`,
        text: listo
          ? `Vinieron, como estaba escrito. Pero tú elegiste el sitio: la calle estrecha, con el sol de cara para ellos y las piedras a tu espalda.\n\nEsperar bien también es una forma de atacar.`
          : `No los viste llegar. Te encuentran donde te encuentran — sin sol a favor, sin piedra donde meterse, con el vaso todavía en la mano.\n\nAsí es como se cobra un plazo vencido.`,
        opts: [{ t: 'Que empiece', fx() {
          const foes = [mkFoe('veterano', t.who), mkFoe('pistolero'), mkFoe('maton')];
          if (!listo) for (const f of foes) f.sk.punteria += 6; // te pillaron a pie cambiado
          CB.startCombat({ title: `${t.who}`, foes, canFlee: !listo,
            intro: listo ? 'Elegiste el terreno. Ahora hay que merecerlo.' : 'Te pillaron sin elegir nada. Se juega con las cartas que hay.',
            onEnd: (res) => {
              if (res === 'win') {
                TR.cerrarTrama(t, `${t.who} vino a por ti y no volvió.`);
                G.rep.fama = Math.min(100, G.rep.fama + 5);
                journal(`${t.who} cumplió su amenaza y yo cumplí la mía, que nunca llegué a decir en voz alta. Se acabó el asunto. Empezará otro: siempre empieza otro.`);
              } else {
                TR.cerrarTrama(t, `${t.who} cobró su amenaza sobre tu piel.`);
                journal(`Vinieron y cobraron. Sigo respirando, que es más de lo que esperaban dejarme. Pero el territorio ha tomado nota de quién manda hoy en esta calle, y no soy yo.`);
              }
            } });
        } }]
      };
    }
  }
};
