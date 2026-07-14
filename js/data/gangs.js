// MIROLE — TOMO II: las bandas y los pueblos del Territorio de Red Marrow.
// La corona no se gana matando: se gana decidiendo, pueblo a pueblo, año
// a año. Cada banda es una novela con un líder que tiene un DESEO, un
// SECRETO y una CONTRADICCIÓN — los tres ejes de todo personaje que
// merece un nombre. Esto es el esqueleto; la carne la ponen las
// temporadas futuras según el Protocolo de la biblia.

// Orden en que se muestran; 'marrow' es tu casa y punto de partida.
export const TOWN_ORDER = ['marrow', 'dry_creek', 'redwater', 'bent_fork', 'blackvein'];

export const TOWNS = {
  marrow:    { name: 'Marrow Creek',  sub: 'tu casa: barro y tablones' },
  dry_creek: { name: 'Dry Creek',     sub: 'las tierras malas del este' },
  redwater:  { name: 'Redwater',      sub: 'el río y el contrabando del sur' },
  bent_fork: { name: 'Bent Fork',     sub: 'campos, iglesia y silencio, al norte' },
  blackvein: { name: 'Blackvein City',sub: 'humo de carbón y dinero nuevo' }
};

// Cada banda: hogar, disposición inicial hacia ti, y su líder-novela.
export const GANGS = {
  ashgrove: {
    name: 'Los Ashgrove', color: '#7a9b4e', home: 'marrow',
    leader: 'Cornelia Ashgrove',
    tag: 'la vieja guardia del pueblo — comerciantes con rifles',
    deseo: 'orden y calles seguras para que su comercio prospere',
    secreto: 'financió a los forajidos que combate, hace años, para crear el miedo que la hizo necesaria',
    contradiccion: 'predica la ley y solo la respeta cuando le conviene'
  },
  kettle: {
    name: 'Los Kettle', color: '#b6432e', home: 'dry_creek',
    leader: 'Boone Kettle',
    tag: 'forajidos puros — heredaron lo que dejó Grey',
    deseo: 'que el viejo Oeste no muera, aunque haya que matarlo defendiéndolo',
    secreto: 'Boone era el aprendiz más joven de Ezekiel Grey; te odia porque tú cerraste la historia que él quería terminar',
    contradiccion: 'mata por lealtad a un código que él mismo rompe cada semana'
  },
  redwater: {
    name: 'Los Redwater', color: '#4a7c9b', home: 'redwater',
    leader: 'Delphine «la Reina» Sable',
    tag: 'contrabandistas del río — la gente de Rose, ahora crecida',
    deseo: 'un imperio de mercancía sin sangre, comprando en vez de disparar',
    secreto: 'aprendió el oficio de Rose Thatcher; si respetaste a Rose en el Tomo I, ya sabe tu nombre y te respeta',
    contradiccion: 'sueña con paz pero la construye sobre negocios que la impiden'
  },
  blackvein: {
    name: 'La Compañía Blackvein', color: '#8a8072', home: 'blackvein',
    leader: 'Cornelius Wray',
    tag: 'no una banda: un sistema — compra lo que no puede matar',
    deseo: 'progreso a cualquier precio; el futuro pavimentado sobre el presente',
    secreto: 'Pemberton, su contable, lleva un libro paralelo — y algún día tendrá que elegir a quién servirlo',
    contradiccion: 'construye el mundo del mañana enterrando a quien lo habita hoy'
  },
  law: {
    name: 'La Ley', color: '#c9b06a', home: 'bent_fork',
    leader: 'Marshal Adeline Rourke',
    tag: 'la placa nueva — la única que no se compra',
    deseo: 'una frontera donde un niño pueda crecer sin aprender a disparar',
    secreto: 'perdió a su hermano a manos de un hombre igual que tú, y lo sabe cada vez que te mira',
    contradiccion: 'cree en la ley en una tierra que solo entiende la fuerza'
  }
};

// Influencia inicial de cada banda en cada pueblo (0–100). El resto,
// hasta 100, es «nadie manda aquí» — el vacío que dejó la muerte de Grey.
export const START_INFLUENCE = {
  marrow:    { player: 30, ashgrove: 45, kettle: 10 },
  dry_creek: { kettle: 60, player: 5 },
  redwater:  { redwater: 55, ashgrove: 10 },
  bent_fork: { law: 40, blackvein: 20 },
  blackvein: { blackvein: 70, law: 15 }
};
