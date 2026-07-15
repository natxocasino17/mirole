// MIROLE — el elenco vivo del corazón. Vínculos ABIERTOS (Doctrina del
// Hilo Abierto §2): nadie está predestinado. La gente aparece en la
// taberna, la feria y los pueblos; los cortejas, te rechazan, cuajan,
// se rompen o mueren — y siempre, siempre aparece alguien más. El amor
// aquí es un sistema, no un raíl.
import { rint, pick, chance } from '../engine/rng.js';

// Semillas de autor: personas con historia propia. Se mezclan con las
// generadas. Cada una tiene deseo, herida y un motivo para dudar de ti.
export const SEEDED = [
  { key: 'delia', name: 'Delia Hart', pron: 'ella', where: 'el piso de arriba',
    tag: 'lee a Dickens donde nadie lee', deseo: 'una librería propia en Blackvein',
    herida: 'seis años pagando su libertad moneda a moneda', reto: 'no cree en hombres de gatillo fácil' },
  { key: 'rourke', name: 'Adeline Rourke', pron: 'ella', where: 'Bent Fork', minFama: 20,
    tag: 'la Marshal que no se compra', deseo: 'una frontera donde un niño no aprenda a disparar',
    herida: 'perdió a un hermano a manos de un hombre como tú', reto: 'tu forma de vida es todo lo que ella combate' },
  { key: 'cole', name: 'Cole Ferris', pron: 'él', where: 'la feria',
    tag: 'herrero de manos anchas y risa fácil', deseo: 'una fragua sin deudas y una casa con porche',
    herida: 'enviudó joven; guarda el delantal de su marido', reto: 'ya perdió a uno; le aterra volver a querer' }
];

const NAMES_F = ['Ruth', 'Clara', 'Mabel', 'Josephine', 'Ada', 'Winnie', 'Esther', 'Lucille', 'Vera', 'Opal'];
const NAMES_M = ['Wade', 'Silas', 'Amos', 'Levi', 'Roy', 'Gus', 'Hollis', 'Emmett', 'Cyrus', 'Del'];
const LAST = ['Ainsley', 'Bratcher', 'Cobb', 'Doyle', 'Frost', 'Hale', 'Merton', 'Pyle', 'Ruddick', 'Voss'];
const WHERE = ['la cantina', 'la feria', 'el almacén', 'Bent Fork', 'Redwater', 'un baile de granero'];
const TAGS = ['toca el violín en las fiestas', 'trae correo a caballo entre pueblos', 'cura animales y a veces personas',
  'canta en el coro y jura entre dientes', 'lleva las cuentas de medio pueblo', 'dibuja a la gente sin permiso',
  'apuesta fuerte y pierde con elegancia', 'planta manzanos que no verá crecer'];
const DESEOS = ['salir de este territorio antes de que la mate', 'una familia, aunque sea prestada',
  'que alguien la mire como se mira algo que dura', 'un negocio propio y las manos limpias',
  'dejar de tener miedo por las noches', 'un motivo para quedarse en vez de huir'];
const HERIDAS = ['perdió a los suyos en la fiebre', 'un amor que se fue con el ferrocarril',
  'un padre que pegaba y una madre que callaba', 'enviudó y no lo cuenta', 'huyó de un altar y aún guarda el vestido',
  'creció en un orfanato de Blackvein'];
const RETOS = ['no se fía de los hombres armados', 'ya la traicionaron una vez', 'antepone su gente a cualquiera',
  'cree que la felicidad se cobra cara', 'no quiere querer a quien puede morir mañana'];

export function genPerson() {
  const she = chance(0.62);
  const name = `${pick(she ? NAMES_F : NAMES_M)} ${pick(LAST)}`;
  return {
    key: 'p' + rint(100000, 999999), name, pron: she ? 'ella' : 'él',
    where: pick(WHERE), tag: pick(TAGS), deseo: pick(DESEOS),
    herida: pick(HERIDAS), reto: pick(RETOS)
  };
}

// Líneas de cortejo por nivel de afinidad. La conversación se gana; el
// afecto no se compra. Cada tramo abre una capa más honda de la persona.
export const COURT_LINES = {
  frio: [
    (p) => `${firstName(p)} te mide con cuidado. «${p.reto === 'no se fía de los hombres armados' ? 'He visto lo que hacen las manos como las tuyas.' : 'No te conozco de nada, forastero.'}» Pero no se va.`,
    (p) => `Hablan de nada — el tiempo, el precio del grano — que es como habla la gente que aún se estudia. Al irse, ${p.pron === 'ella' ? 'ella' : 'él'} sonríe medio segundo. Cuenta.`,
    (p) => `«Dicen cosas de ti», dice ${firstName(p)}. «Algunas malas.» Pausa. «Las malas suelen ser las ciertas, así que hablemos de las otras.»`
  ],
  tibio: [
    (p) => `${firstName(p)} te cuenta, sin que preguntes, que ${p.herida}. Lo suelta como quien deja una carga en el suelo un momento, para descansar el brazo.`,
    (p) => `«¿Sabes qué quiero de verdad?», dice bajito. «${cap(p.deseo)}.» Te mira a ver qué haces con eso. No haces nada tonto. Bien.`,
    (p) => `Os reís de algo que no tiene gracia contado después. Esas risas son las que atan. ${firstName(p)} lo sabe, y por cómo aparta la mirada, le da un poco de miedo.`
  ],
  calido: [
    (p) => `${firstName(p)} te busca la mano sobre la mesa y no la suelta. «Esto es un problema», dice, «tú eres un problema.» No lo dice como un no.`,
    (p) => `«Prométeme una cosa», te pide. «Que si esto sale mal, será por la vida y no por mentiras.» Se lo prometes. Es la clase de promesa que sí piensas cumplir.`,
    (p) => `Hay un silencio largo, del bueno. ${firstName(p)} apoya la cabeza en tu hombro. El territorio, por un rato, deja de deberte nada.`
  ]
};

// Cuando algo se rompe (rechazo, celos, tu vida cruel): frases de cierre
// que dejan cicatriz — y la puerta abierta a que llegue otra persona.
export const BREAK_LINES = [
  (p) => `${firstName(p)} recoge sus cosas sin drama, que es lo que más duele. «No es que no te quiera. Es que quererte cuesta más de lo que me queda.» La puerta se cierra despacio.`,
  (p) => `«Me voy con el ferrocarril el jueves», dice ${firstName(p)}. «Ven, o no vengas. Pero decide como un hombre y no como una emboscada.» No fuiste. Los dos lo sabíais.`,
  (p) => `Lo tuyo con ${firstName(p)} se apaga como se apagan las cosas de verdad: sin portazo, a base de noches en que uno de los dos ya no vino. El territorio está lleno de eso.`
];

// Relación general (no romántica): amistad que se forja compartiendo.
export const FRIEND_LINES = [
  (p) => `${firstName(p)} te invita a la mesa sin que lo pidas. «Los que caen bien escasean por aquí», dice. «Aprovecho.»`,
  (p) => `Compartís silencio y tabaco en el porche. Con ${firstName(p)} no hace falta llenar el aire. Eso, en un amigo, vale oro.`,
  (p) => `${firstName(p)} te cuenta un secreto del pueblo que no debía. «Porque me fío de ti. No me hagas quedar por tonto.»`,
  (p) => `Os reís de los mismos desgraciados. La amistad, al final, es coincidir en a quién despreciar.`,
  (p) => `«Si alguna vez lo necesitas», dice ${firstName(p)} sin mirarte, «sabes dónde vivo.» No lo dice a cualquiera. Lo sabes.`
];

// Y la rivalidad, que también se cultiva — a veces sin querer.
export const RIVAL_LINES = [
  (p) => `${firstName(p)} te aguanta la mirada más de la cuenta. «No me caes bien, forastero. Y no soy de fingir.»`,
  (p) => `Cada palabra con ${firstName(p)} es un pulso. Ninguno de los dos parpadea. El aire se pone denso.`,
  (p) => `${firstName(p)} escupe cerca de tu bota. No encima — todavía. «Ándate con ojo. El pueblo tiene memoria, y yo más.»`,
  (p) => `«He oído lo que haces», dice ${firstName(p)} con desprecio de los baratos. «Y no me impresiona. Los tipos como tú duran poco.»`
];

// Umbrales de estanding: de enemigo declarado a amigo del alma.
export function standingLabel(rel) {
  if (rel <= -60) return { t: 'enemigo', cls: 'red' };
  if (rel <= -20) return { t: 'te la tiene jurada', cls: 'red' };
  if (rel < 20) return { t: 'neutral', cls: 'dim' };
  if (rel < 50) return { t: 'cordial', cls: '' };
  if (rel < 80) return { t: 'amigo', cls: 'green' };
  return { t: 'amigo del alma', cls: 'green' };
}

export function firstName(p) { return p.name.split(' ')[0]; }
function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
