// MIROLE — palabras. Las que congelan una cantina, las que se dicen
// junto a una tumba y las que se sueltan con dos whiskys de más.

// Líneas de intimidación (el Factor Miedo). Solo funcionan si tu fama
// las respalda: los hombres con voluntad floja fallan el pulso 2 turnos.
export const INTIM_LINES = [
  '«¿Quién es el dueño de esta pocilga?»',
  '«Contad las balas que lleváis encima. Yo ya conté las mías.»',
  '«Habéis elegido un mal día para tener agallas.»'
];

// Eli Marsh, «el Diácono». Su historia se abre con la confianza, no con menús.
export const ELI_TALKS = [
  { min: 0, lines: [
    'Eli limpia «La Viuda» sin mirarte. «¿Sabes por qué le puse ese nombre? Mejor. No lo sabes.»',
    '«Sam era de los buenos. Y los buenos duran poco por aquí. Tú decides qué vas a ser.»',
    '«No rezo desde hace años, muchacho. Pero a veces muevo los labios por costumbre.»',
    '«Come algo. Un hombre flaco apunta mal y muere feo.»'
  ]},
  { min: 60, lines: [
    '«Tuve una congregación, ¿sabes? Allá en Blackvein. Cuarenta almas los domingos.» Se sirve otro. No sigue.',
    '«Un hombre entró un domingo en mi iglesia buscando sangre. La encontró. La suya.» Mira la escopeta. «Dios no volvió a dirigirme la palabra.»',
    '«Tú me recuerdas a alguien que fui. Procura no recordarme a alguien que enterré.»'
  ]},
  { min: 80, lines: [
    '«El hombre al que maté en mi iglesia... venía por mí. Por deudas mías, de antes del alzacuellos. Esa es la verdad entera, y ahora la cargas tú también.»',
    '«Si un día caigo, no me reces. Cántame algo alegre y gasta mi paga en whisky del bueno. Es una orden, muchacho.»'
  ]}
];

// Charla genérica de reclutas, según lealtad.
export const RECRUIT_TALKS = {
  low: [
    '«Mientras pagues, disparo donde digas.» No es poesía, pero es honesto.',
    'Te mira de reojo. «¿Siempre invitas tú, jefe, o solo cuando quieres algo?»',
    '«He tenido jefes peores. Uno me pagó con gallinas. Vivas.»'
  ],
  mid: [
    '«Cuando esto se ponga feo — y se pondrá — quiero estar en tu lado de la calle.»',
    '«Anoche soñé con mi pueblo. Hacía años. Debe ser que ya no duermo con un ojo abierto.»',
    'Levanta el vaso. «Por los que cavan y por los que aún no.» Bebe sin esperar respuesta.'
  ],
  high: [
    '«Te seguiría hasta el infierno, jefe. Aunque conociendo nuestros trabajos, será literal.»',
    '«Nunca te lo dije: gracias. Por lo de aquella vez. Tú sabes.» No sabes. Asientes igual.'
  ]
};

// Pistas de secretos: la traición se anuncia, si sabes mirar.
export const SECRET_HINTS = {
  codicioso: 'Lo pillas contando las monedas de la caja. Dos veces. Sonríe demasiado rápido.',
  buscado:   'Cada vez que entra un desconocido en la cantina, su mano baja al cinto.',
  informante: 'Dice que va «a estirar las piernas» cada vez que llega el correo. Nadie estira tanto las piernas.'
};

// Despedidas de moribundos. Que duelan.
export const FAREWELLS = [
  '«No llores... aún me debes veinte dólares.»',
  '«Dile a mi madre que morí sobrio. Miéntele bien.»',
  '«Al final... el desierto siempre cobra.»',
  '«¿Sabes qué? Nunca me gustó este maldito oficio.»',
  '«Entiérrame mirando al oeste. Siempre quise ir... más al oeste.»',
  '«No fue culpa tuya, jefe. Bueno... un poco sí.»'
];

// Rumores de cantina. Algunos son mentira. Otros, todavía no son verdad.
export const RUMORS = [
  'Dicen que el ferrocarril llegará a Marrow Creek antes de cinco años. Los que lo dicen ya están comprando tierra.',
  'Un arriero jura que hay una taberna que solo aparece con la niebla cerrada. Que sirven un whisky que sabe a tu mejor recuerdo. Nadie la encuentra dos veces.',
  'Hablan de un forastero pálido que desafía a duelo a quien le sostiene la mirada. Nadie cuenta cómo termina.',
  'La Blackvein Mining Company está comprando sheriffs como quien compra clavos.',
  'Dicen que un espadachín ciego cruzó el desierto a pie. Sin cantimplora. Silbando.',
  'La viuda Thatcher paga bien por escoltas. Y dispara mejor que la mitad de sus escoltas.',
  'En Dry Wells ya no queda nadie. Los que fueron a ver por qué, tampoco.',
  'El barbero asegura que en Blackvein hay luz eléctrica en tres calles. Eléctrica. Como si el fuego ya no fuera bastante.',
  'Un borracho jura que vio a Dawson en las colinas del norte. Nadie le paga otra copa por decirlo.',
  'Dicen que si un hombre entierra a todos sus amigos, el desierto le habla. Y que lo peor es que da buenos consejos.'
];

// El perro. Porque hasta en Red Marrow hay cosas buenas.
export const PET_LINES = [
  'te mira como si fueras mejor persona de lo que eres. No lo saques de su error.',
  'persigue su propia cola con la determinación de un cazarrecompensas. Fracasa con dignidad.',
  'se ha comido algo en el callejón. Prefieres no saber qué. Él prefiere repetir.',
  'apoya la cabeza en tu bota. El mundo, por un minuto, deja de deberte nada.',
  'le gruñe al retrato del alcalde. Buen chico.'
];
