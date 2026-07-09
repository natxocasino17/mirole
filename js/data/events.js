// MIROLE — eventos del Director. Cada uno es una escena con opciones.
// Los cotidianos dan textura; los de secreto anuncian traiciones que
// siempre estuvieron ahí; los MÍTICOS son la razón por la que dentro de
// tres años el corazón te dará un vuelco en una parada de autobús.
import { G, log, journal } from '../engine/state.js';
import { rint, pick } from '../engine/rng.js';
import { genRecruit, player, aliveSquad, addStress, addXp } from '../engine/chars.js';
import { mkGood, mkWeapon } from './items.js';
import { mkFoe } from './enemies.js';
import { DOG_NAMES } from './names.js';
import { SECRET_HINTS } from './dialogs.js';
import * as CB from '../engine/combat.js';

export const DAILY_POOL = ['forastero', 'tormenta', 'predicador', 'recuerdo_sam',
                           'soborno', 'borracho', 'perro_flaco', 'carta_ada'];
export const MYTHIC_POOL = ['espadachin', 'taberna_niebla', 'palido'];

export const EVENTS = {
  // ---------- cotidianos ----------
  forastero: {
    build() {
      const r = genRecruit();
      const full = G.squad.length >= 5;
      return {
        title: 'Un forastero busca trabajo',
        text: `Se llama ${r.name}${r.alias ? ' — «' + r.alias + '»' : ''}. ${cap(r.role)}, ${G.time.startYear + Math.floor((G.time.day - 1) / 360) - r.birthYear} años, rasgo: ${r.traits[0]}.\n\n«He oído que aquí se come caliente y se dispara con motivo. Pido $${r.salario} a la semana y no pregunto de más.»`,
        opts: full ? [
          { t: 'La mesa está llena', fx() { return 'Asiente sin rencor. «Guardadme un sitio para cuando el desierto os haga hueco.» Ojalá no tenga razón.'; } }
        ] : [
          { t: `Contratar ($${r.salario}/semana)`, fx() {
              G.chars[r.id] = r;
              G.squad.push(r.id);
              log(`${r.name} se une a la banda.`);
              journal(`Contratamos a ${r.name}. ${cap(r.traits[0])}. Veremos qué trae debajo del sombrero.`);
              return `${r.name} escupe en la palma y estrecha tu mano. Ya sois uno más en la mesa. Y una boca más la semana que viene.`;
            } },
          { t: 'Rechazarlo', fx() { return 'Se toca el ala del sombrero y sale al polvo. Hay miles como él. Ninguno igual.'; } }
        ]
      };
    }
  },

  tormenta: {
    build() {
      return {
        title: 'Tormenta de polvo',
        text: 'El cielo se pone del color del café malo y el mundo se encoge a diez pasos. Hoy no se trabaja: se aguanta.',
        opts: [{ t: 'Atrancar puertas y esperar', fx() {
          for (const c of aliveSquad()) c.stress = Math.max(0, c.stress - 4);
          log('La tormenta pasó de largo, gruñendo.');
          return 'La banda juega a las cartas con judías secas y se cuenta mentiras magníficas. A veces la tormenta es el descanso.';
        } }]
      };
    }
  },

  predicador: {
    build() {
      return {
        title: 'El predicador ambulante',
        text: 'Un hombre de negro predica sobre un cajón de manzanas frente al almacén. Habla del fin del Oeste, del hierro que viene, del juicio.\n\nTe señala. Cómo no.',
        opts: [
          { t: 'Escuchar un rato', fx() {
              const p = player();
              addStress(p, -5);
              return '«...y los últimos jinetes verán morir su mundo y cabalgarán igual, porque no saben hacer otra cosa.» No sabes por qué, pero se te queda dentro.';
            } },
          { t: 'Darle un dólar y seguir', fx() {
              if (G.money > 0) G.money--;
              G.rep.humanidad = Math.min(100, G.rep.humanidad + 1);
              return 'Muerde la moneda, te bendice con prisa y sigue con el apocalipsis. Profesionales, los dos.';
            } }
        ]
      };
    }
  },

  recuerdo_sam: {
    build() {
      return {
        title: 'Un recuerdo',
        text: 'Alguien silba en la calle la canción que Sam tarareaba siempre mal. Se te olvida respirar un segundo.',
        opts: [
          { t: 'Dejar que duela', fx() { addStress(player(), 4); G.rep.humanidad = Math.min(100, G.rep.humanidad + 1); return 'El dolor es el alquiler que cobra la memoria. Lo pagas. Sigue caminando.'; } },
          { t: 'Un whisky rápido', fx() {
              if (G.money >= 3) { G.money -= 3; addStress(player(), -6); return 'El whisky no arregla nada. Pero desafina el recuerdo lo justo para seguir.'; }
              addStress(player(), 4);
              return 'No hay ni para whisky. El recuerdo se bebe solo.';
            } }
        ]
      };
    }
  },

  soborno: {
    cond: () => G.time.day > 15,
    build() {
      return {
        title: 'El hombre del sindicato',
        text: 'Un tipo con bombín y libreta te encuentra en la cantina. «La Blackvein aprecia la... estabilidad. Diez dólares al mes la garantizan. Para todos.»',
        opts: [
          { t: 'Pagar $10', fx() {
              if (G.money < 10) return 'Te palpas los bolsillos. El del bombín anota algo. No parece bueno.';
              G.money -= 10; G.fac.mineros += 5;
              return 'El bombín asiente y desaparece. Has comprado un mes de nada. Así funciona la civilización, parece.';
            } },
          { t: 'Negarte, despacio y claro', fx() {
              G.fac.mineros -= 5; G.rep.fama = Math.min(100, G.rep.fama + 2);
              return '«Dile a la compañía que la estabilidad de esta mesa la garantizo yo.» El bombín anota. La cantina entera lo oye. Eso valía más de diez dólares.';
            } }
        ]
      };
    }
  },

  borracho: {
    build() {
      const p = player();
      return {
        title: 'Un borracho con opiniones',
        text: 'Un minero enorme y empapado en whisky decide que tu cara le debe dinero. La cantina hace sitio con la naturalidad de la costumbre.',
        opts: [
          { t: `Calmarlo con labia (${p.skills.labia})`, fx() {
              addXp(p, 'labia', 3);
              if (p.skills.labia + rint(0, 30) >= 40) { G.rep.fama = Math.min(100, G.rep.fama + 1); return 'Dos frases y una invitación después, el gigante llora sobre tu hombro por una mula que tuvo. Se llama a esto diplomacia.'; }
              addStress(p, 3);
              return 'Tus palabras le llegan tarde y mal. Te encaja una antes de que lo sienten entre cuatro. Mañana ni lo recordará. Tu pómulo sí.';
            } },
          { t: 'Mirarlo hasta que se siente', fx() {
              if (G.rep.fama >= 20) return 'Le sostienes la mirada. Algo en ella le recuerda historias que ha oído. Se sienta solo, de repente muy interesado en su vaso.';
              addStress(p, 3);
              return 'Tu mirada aún no pesa lo suficiente en este territorio. Te encaja una. La fama se cocina despacio.';
            } }
        ]
      };
    }
  },

  perro_flaco: {
    once: true,
    cond: () => !G.pets.length,
    build() {
      return {
        title: 'Un perro flaco',
        text: 'Lleva tres días siguiéndote un perro color polvo, flaco como un contrato de la Blackvein. Se sienta a distancia prudente y espera, profesional.',
        opts: [
          { t: 'Darle de comer', fx() {
              const name = pick(DOG_NAMES);
              G.pets.push({ type: 'perro', name });
              journal(`Un perro nos adoptó. Se llama ${name}. Nadie votó, pero se llama ${name}.`);
              return `Come como si fuera su último día y luego te mira como si fueras su primer día bueno. Ya tienes perro. Se llama ${name}. No has opinado tú: estas cosas se deciden solas.`;
            } },
          { t: 'Espantarlo', fx() { G.rep.humanidad = Math.max(0, G.rep.humanidad - 1); return 'Se va sin rencor, con la dignidad intacta. Más de la que te queda a ti esta noche.'; } }
        ]
      };
    }
  },

  carta_ada: {
    once: true,
    cond: () => G.flags.promSam === 'hija' && G.time.day > 40,
    build() {
      return {
        title: 'Una carta de Blackvein',
        text: 'Letra redonda, tinta barata:\n\n«Sr. desconocido: el abogado dice que usted estuvo con mi padre al final. Yo trabajo en la lavandería de Hoyt St. No necesito dinero. Necesito saber si sufrió. Escriba la verdad. — Ada Corddry»',
        opts: [
          { t: 'Escribir la verdad', fx() {
              G.flags.ada = 'verdad';
              journal('Escribiste a Ada Corddry. La verdad, sin adornos. Sam merecía eso y ella también.');
              G.rep.humanidad = Math.min(100, G.rep.humanidad + 4);
              return 'Tardas tres noches y ocho borradores. La verdad, resulta, pesa más escrita. La envías antes de arrepentirte.';
            } },
          { t: 'Escribir una mentira piadosa', fx() {
              G.flags.ada = 'mentira';
              journal('Escribiste a Ada que su padre murió en paz, rápido, hablando de ella. Dos de tres cosas eran mentira.');
              return '«Murió en paz, sin dolor, con su nombre en los labios.» La primera es mentira. La segunda es mentira. La tercera, no.';
            } },
          { t: 'No contestar aún', fx() { G.flags.adaPending = true; return 'Guardas la carta en el forro del abrigo. Hay deudas que no se saben cobrar ni pagar. Todavía.'; } }
        ]
      };
    }
  },

  // ---------- crisis y secretos ----------
  pesadilla: {
    build() {
      return {
        title: 'La pesadilla',
        text: 'Despiertas con la mano buscando el revólver. Otra vez el camino, otra vez la pólvora, otra vez esa cara que no llega a girarse para mirarte.\n\nLa vela tiembla. O tu mano. Una de las dos.',
        opts: [
          { t: 'Escribir en el diario hasta el alba', fx() {
              addStress(player(), -12);
              journal('Mala noche. Las escribo para sacarlas de la cabeza y meterlas en el papel, donde no disparan.');
              return 'Escribes. Torcido, furioso, verdad. Al alba, la mano ya no tiembla. El papel aguanta lo que el corazón no.';
            } },
          { t: 'Whisky hasta dormir', fx() {
              if (G.money >= 3) { G.money -= 3; addStress(player(), -8); return 'Funciona. Esa es la trampa: siempre funciona.'; }
              return 'La botella está vacía, como el bolsillo. Cuenta las vigas del techo. Hay cuarenta y dos.';
            } },
          { t: 'Salir a mirar la noche', fx() {
              addStress(player(), -5);
              return 'El frío te muerde y el cielo no te debe nada, y en esa indiferencia enorme hay algo parecido al descanso.';
            } }
        ]
      };
    }
  },

  // La codicia se anuncia. La traición nunca es un dado: es un secreto más una ocasión.
  codicia: {
    build(arg) {
      const ch = G.chars[arg];
      if (!ch || !ch.alive) return null;
      if (!G.flags['codicia1_' + ch.id]) {
        G.flags['codicia1_' + ch.id] = true;
        return {
          title: 'Algo no cuadra',
          text: `${SECRET_HINTS.codicioso}\n\nEs ${ch.name}. Las semanas flacas hacen estas cosas... o las destapan.`,
          opts: [
            { t: 'Hablarlo de frente', fx() {
                const p = player();
                addXp(p, 'labia', 2);
                if (p.skills.labia + rint(0, 30) >= 45) { ch.loyalty = Math.min(100, ch.loyalty + 12); ch.secret = null; return `Lo sueltas sin acusar. ${ch.name} aguanta la mirada, luego la baja. «Las deudas de antes, jefe. Ya no.» A veces la lealtad se fabrica en una conversación incómoda.`; }
                ch.loyalty = Math.max(0, ch.loyalty - 5);
                return `Lo niega demasiado rápido y demasiadas veces. La mesa se queda fría. Habrá que vigilar la caja... y la espalda.`;
              } },
            { t: 'Subirle la paga (+$5/semana)', fx() { ch.salario += 5; ch.loyalty = Math.min(100, ch.loyalty + 10); return 'El dinero no compra lealtad, pero alquila paciencia. A veces basta con eso hasta que lleguen tiempos mejores.'; } },
            { t: 'No decir nada y vigilar', fx() { return 'Guardas lo visto donde guardas todo lo demás. La próxima vez que cuente monedas, habrá dos personas contando.'; } }
          ]
        };
      }
      // Segunda vez: la ocasión encontró al secreto.
      const stolen = Math.min(G.money, rint(15, 30));
      G.money -= stolen;
      const i = G.squad.indexOf(ch.id);
      if (i >= 0) G.squad.splice(i, 1);
      ch.alive = false;
      journal(`${ch.name} se fue de noche con $${stolen} de la caja. La codicia siempre estuvo ahí; nosotros pusimos la ocasión.`);
      return {
        title: 'La silla vacía',
        text: `${ch.name} no está. Su catre, recogido. La caja, $${stolen} más ligera.\n\nEli sirve café sin comentarios. Algunos hombres son un préstamo, no un ahorro.`,
        opts: [{ t: 'Que el desierto lo cobre', fx() { log(`${ch.name} desapareció con $${stolen}.`); return 'No lo perseguirás. El territorio es grande y la gente como él siempre acaba encontrando una bala sin tu ayuda. Casi siempre.'; } }]
      };
    }
  },

  buscado: {
    build(arg) {
      const ch = G.chars[arg];
      if (!ch || !ch.alive || G.flags['buscado_' + ch.id]) return null;
      G.flags['buscado_' + ch.id] = true;
      return {
        title: 'Papel viejo, cara conocida',
        text: `En la oficina del sheriff, medio tapado por carteles nuevos: un cartel viejo. La cara es más joven, el nombre es otro, pero es ${ch.name}.\n\n$40 de recompensa. Vivo.`,
        opts: [
          { t: 'Arrancar el cartel', fx() { ch.loyalty = Math.min(100, ch.loyalty + 15); ch.secret = null; journal(`Arranqué un cartel viejo con la cara de ${ch.name}. Lo que fuera que hizo, lo pagará trabajando para mí.`); return `Esa noche dejas el cartel doblado sobre su catre, sin una palabra. Al alba lo encuentras quemado y a ${ch.name} limpiando tu arma sin que nadie se lo pidiera. Hay gratitudes que no usan palabras.`; } },
          { t: 'Guardarte la información', fx() { return 'Cuarenta dólares, vivo. Lo archivas. Un buen jefe conoce el precio de toda su gente. Un mal jefe lo cobra.'; } }
        ]
      };
    }
  },

  mientras_fuera: {
    build() {
      const lines = [
        'Se acumuló el correo: dos catálogos, una amenaza mal escrita y una postal de un pueblo donde no conoces a nadie.',
        'El territorio siguió sin ti: un incendio pequeño, dos bodas, un pleito por una mula. Lo de siempre.',
        'La banda mató el tiempo jugando a las cartas. Nadie confiesa quién va ganando, lo cual significa que va ganando Eli.'
      ];
      if (G.pets.length) lines.push(`${G.pets[0].name} montó guardia en la puerta cada noche. El único que nunca duda.`);
      return {
        title: 'Mientras estabas fuera',
        text: pick(lines) + '\n\nEl polvo esperó. El polvo siempre espera.',
        opts: [{ t: 'Retomar las riendas' }]
      };
    }
  },

  rumor_dawson: {
    once: true,
    build() {
      G.flags.dawson = 2;
      journal('Un arriero borracho juró haber visto a Silas Dawson en las colinas del norte. El nombre me cruzó el pecho como un caballo desbocado.');
      return {
        title: 'Un nombre en la cantina',
        text: 'Un arriero con más whisky que sangre lo suelta sin saber lo que suelta:\n\n«...una cabaña en las colinas del norte, y os juro que era ese Dawson, el que trabajaba de pagador para la Blackvein...»\n\nLa cantina sigue con su ruido. Para ti se ha quedado muda.',
        opts: [{ t: 'Pagar su siguiente whisky y escuchar', fx() {
          if (G.money >= 3) G.money -= 3;
          return 'Detalles: la cabaña, el arroyo seco, los dos hombres armados que lo acompañan siempre.\n\nEn el MAPA hay ahora un destino nuevo marcado con ★. No es un trabajo. Nunca lo fue.';
        } }]
      };
    }
  },

  // ---------- MÍTICOS: los del 0.4% por día de camino ----------
  espadachin: {
    once: true,
    build() {
      return {
        title: '✦ El espadachín ciego',
        text: 'Cruza el desierto a pie, sin cantimplora, con una espada envainada a la espalda y los ojos velados de blanco. Silba.\n\nSe detiene exactamente a tres pasos. «Caminas como quien carga muertos. Eso desequilibra. ¿Quieres que te enseñe a cargarlos mejor?»',
        opts: [
          { t: 'Aceptar la lección', fx() {
              const p = player();
              p.skills.reflejos = Math.min(90, p.skills.reflejos + 5);
              journal('Un espadachín ciego me enseñó a moverme en mitad del desierto. Tres horas. Ni una gota de sudor en él. Nunca supe su nombre. (+5 reflejos)');
              return 'Tres horas bajo el sol. No toca la espada ni una vez: solo corrige tu peso, tu respiración, tu silencio.\n\n«Los muertos no pesan», dice al irse. «Pesa el no soltarlos.»\n\nDesaparece silbando. Tus pies ya no hacen ruido. (+5 REFLEJOS)';
            } },
          { t: 'Seguir tu camino', fx() { journal('Vi al espadachín ciego del que hablan los rumores. Pasé de largo. A veces me pregunto qué habría enseñado.'); return 'Os cruzáis en silencio. Diez pasos después, su voz: «Otra vez será. O no.» Cuando te giras, ya es un punto en la distancia.'; } }
        ]
      };
    }
  },

  taberna_niebla: {
    once: true,
    build() {
      return {
        title: '✦ La taberna en la niebla',
        text: 'La niebla se cierra de golpe, cosa rara en el desierto, y de pronto: luz de ventanas donde nunca hubo nada. Un cartel sin nombre. Dentro, música de un piano que suena a domingo antiguo.\n\nEl tabernero te saluda por tu nombre de pila.',
        opts: [
          { t: 'Entrar y beber', fx() {
              for (const c of aliveSquad()) c.stress = Math.max(0, c.stress - 40);
              G.stash.push(mkGood('botella_niebla'));
              journal('Bebimos en una taberna que no existe. El whisky sabía al mejor día de cada uno. Al salir, la niebla se llevó el edificio. Guardo una botella que no pienso abrir.');
              return 'El whisky sabe — exactamente — a tu mejor recuerdo. A cada uno el suyo: Eli llora sin ruido y sonríe a la vez.\n\nNadie cobra. «Ya pagasteis», dice el tabernero, «solo que aún no.»\n\nAl salir, la niebla se traga el edificio. En tu alforja hay una botella sin etiqueta que tú no metiste. (−40 ESTRÉS a todos)';
            } },
          { t: 'No fiarse. Rodear la luz', fx() { journal('Vimos la taberna de la niebla. No entramos. La banda no me lo perdona del todo, y puede que yo tampoco.'); return 'Rodeáis la luz en silencio. Cien pasos después la niebla se abre y no hay nada detrás: ni taberna, ni luz, ni música.\n\nNadie habla del tema en tres días. Los rumores no dicen si la taberna aparece dos veces en una misma vida.'; } }
        ]
      };
    }
  },

  palido: {
    once: true,
    build() {
      return {
        title: '✦ El Forastero Pálido',
        text: 'Está de pie en mitad del camino, quieto como una fecha en una lápida. Abrigo gris de polvo, cara sin edad, y un revólver de cañón largo que parece más antiguo que el territorio.\n\n«Me sostuviste la mirada», dice, aunque acabas de verlo. «Uno de los dos se lleva el arma del otro. Es la regla.»',
        opts: [
          { t: 'Aceptar el duelo (solo tú)', fx() {
              const p = player();
              CB.startCombat({
                title: 'El duelo del camino', foes: [mkFoe('palido')], canFlee: false, soloPlayer: true,
                intro: 'El mundo se reduce a treinta pasos de polvo y un silencio que zumba.',
                onEnd: (res) => {
                  if (res === 'win') {
                    G.stash.push(mkWeapon('el_juez'));
                    journal('Vencí al Forastero Pálido. Su cuerpo no estaba donde cayó. Su revólver sí: «El Juez». Nunca se encasquilla. Nunca perdona.');
                  } else {
                    journal('El Forastero Pálido me venció. Me dejó vivo y me quitó el arma, como quien recoge fruta. «Otra vida será», dijo. Espero que no.');
                  }
                }
              });
            } },
          { t: 'Bajar la mirada y pasar', fx() { journal('Me crucé con el Forastero Pálido y bajé la mirada. Sigo vivo. No sé si me alegro del todo.'); return 'Bajas los ojos. Al pasar a su lado, frío de bodega en pleno sol.\n\n«Prudente», dice. Y ya no está.'; } }
        ]
      };
    }
  }
};

function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
