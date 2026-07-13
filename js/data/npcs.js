// MIROLE — la gente del pueblo. NPCs con memoria: sus frases leen tu
// partida (tu fama, tus muertos, tus decisiones) y cambian con la
// historia. Un pueblo que te conoce es un pueblo que importa.
import { G } from '../engine/state.js';
import { pick } from '../engine/rng.js';

// Otis, el tabernero de «El Cuervo». Cincuenta y tantos, media oreja
// menos, memoria de elefante y la filosofía de barra más barata y más
// exacta del territorio.
export function otisLine() {
  const lines = [];
  const f = G.flags;

  // Otis después de la noche que sangró la cantina (Tomo I, cap. 5)
  if (f.t1done >= 5) {
    lines.push(
      '«¿El hombro? Mejora.» Se lo toca con orgullo mal disimulado. «Primera cicatriz interesante de mi vida. Mi mujer, en paz descanse, decía que yo era aburridamente entero.»',
      'Limpia el mostrador donde cayó uno de las plumas rojas. «Lijé la mancha tres veces. La dejo ya. Un bar sin historia es una lechería.»',
      '«Aquella noche disparé cero balas y pasé más miedo que en toda mi guerra. No sirvo para héroe. Sirvo whisky, que dura más.»'
    );
  }
  if (f.t1done >= 8) {
    lines.push(
      'Te señala con la barbilla la mesa del fondo. «Reservada. Del hombre del arroyo seco. No discutas con la dirección.»',
      '«Ya vino otro forastero preguntando por "el del arroyo seco". Cobro un whisky por señalarte. Vas a acabar dándome de comer tú solo.»'
    );
  }
  if (f.dawsonFate === 'muerto') lines.push('«¿Sabes qué se dice de lo de Dawson? Nada. En este pueblo sabemos exactamente cuándo no preguntar. Es nuestro único deporte.»');
  if (f.dawsonFate === 'vivo') lines.push('«Un arriero jura que vio a Dawson de contable en el este, flaco como un rezo. Hay hombres a los que perdonar les sienta peor que la horca.»');
  if (G.cemetery.length >= 3) lines.push('Sirve sin que pidas y señala el vaso: «Ese va por los tuyos. La casa invita a los que cargan cementerio propio.»');
  if (G.money < 10) lines.push('«¿Fiar? Otis no fía.» Pausa. Te sirve igual. «Otis apunta. Que es fiar con memoria.»');
  if (G.rep.fama >= 40) lines.push('«Un viajante me ofreció dinero por EL VASO en el que bebes. Lo vendí, obvio. Este es otro. No le digas nada.»');
  if (G.rep.humanidad <= 30) lines.push('Te mira un rato largo mientras seca un vaso. «Yo a los que se les enfrían los ojos les cobro por adelantado. Sin ofender.» Cobra por adelantado.');
  if (G.rep.humanidad >= 75) lines.push('«¿Sabes qué eres tú? Raro. En el buen sentido. Aquí lo raro bueno dura poco, así que bebe despacio.»');
  if (G.pets.length) lines.push(`«Tu perro entró ayer solo, se sentó en TU mesa y me miró hasta que le puse agua. ${G.pets[0].name} entiende este negocio mejor que tú.»`);
  if (G.horse) lines.push(`«El del establo dice que ${G.horse.name} muerde a todo el mundo menos a ti. Los caballos y los taberneros sabemos de gente, hijo.»`);

  // El fondo de armario de Otis: filosofía de barra, siempre disponible
  lines.push(
    '«Mi padre fundó este bar con una mula y una mentira. La mula murió. El resto sigue en pie.»',
    '«¿Consejo del día? El whisky de la izquierda. El de la derecha es el mismo, pero la etiqueta miente con menos arte.»',
    '«Llevo veintidós años detrás de esta barra. He visto morir a tres sheriffs y a cero taberneros. Elige oficio con cabeza, hijo.»',
    '«La gente cree que el tabernero escucha secretos. Falso: los secretos me esquivan. Lo que escucho son las mentiras, que son mejores.»',
    '«¿Ves esa marca de bala en la viga? Cada año le cuento a alguien una historia distinta de cómo llegó. La verdadera es la más aburrida: se me cayó la escopeta.»'
  );
  return pick(lines);
}

// Los tenderos: cada visita, una línea. Con memoria.
export function fitchLine() {
  const lines = [
    'Fitch te saluda con media ceja. En su idioma es un discurso.',
    'Fitch engrasa un cerrojo con la ternura que le niega a los humanos.',
    '«Un arma limpia», dice Fitch sin que nadie pregunte, «es una carta de amor al futuro.» Luego se avergüenza de haberlo dicho y cobra de más.'
  ];
  if (G.stats.shots > 100) lines.push('«Gastas más balas que un pelotón», gruñe Fitch. Es lo más parecido a un cumplido que tiene en el catálogo.');
  if (G.flags.t1done >= 8) lines.push('Fitch te mira el cinto. «El hierro del arroyo seco.» Asiente despacio. Hoy no te cobra la grasa.');
  return pick(lines);
}

export function quillLine() {
  const lines = [
    'Quill te mide con la cinta sin pedir permiso. «Por si acaso», dice. Nunca aclara por si acaso qué.',
    '«La moda de Blackvein este año es el gris humo. Aquí seguimos con el clásico marrón polvo. Somos atemporales por pobreza.»',
    'Quill cepilla un sombrero ajeno con devoción religiosa. «Las cabezas van y vienen. El fieltro bueno queda.»'
  ];
  if (G.rep.fama >= 30) lines.push('«¿Puedo decir que visto yo al hombre del que hablan? Media palabra en el escaparate. Te descuento un dólar por la publicidad.»');
  return pick(lines);
}

export function curlyLine() {
  const lines = [
    'Curly, el del establo, habla con los caballos de corrido y con las personas a trompicones. Prioridades.',
    '«¿Sabes por qué los caballos no juegan al póker?» Curly espera. «Porque siempre enseñan las cartas con las orejas.» Se ríe solo. Los caballos también, jurarías.'
  ];
  if (G.horse) lines.push(`«${G.horse.name} come mejor que yo», dice Curly, orgulloso como un abuelo. «Como debe ser.»`);
  else lines.push('«Un jinete sin caballo», filosofa Curly, «es un peatón con sombrero caro.» Señala el corral con la horca. Sutileza no le sobra.');
  return pick(lines);
}
