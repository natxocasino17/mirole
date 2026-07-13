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

// ═══════════ EL PISO DE ARRIBA — Madame Vergne y Miss Lily ═══════════
// El Oeste era crudo y esto también existía. Se cuenta como todo aquí:
// con dignidad, melancolía y la puerta cerrándose antes de lo demás.
// Y arriba vive también otra cosa: una relación DE VERDAD, que se
// construye visita a visita, con memoria — si eliges quedarte a hablar.
import { rint, chance } from '../engine/rng.js';
import { player, addStress, addXp } from '../engine/chars.js';
import { journal, choice, log } from '../engine/state.js';

export function upstairsScene() {
  G.relations.lily = G.relations.lily || { af: 0, visits: 0, name: 'Miss Lily', courting: false };
  const L = G.relations.lily;
  const p = player();

  // La primera vez: Madame Vergne y la casa
  if (L.visits === 0) {
    L.visits = 1;
    return {
      title: '🌹 El piso de arriba',
      text: 'Madame Vergne regenta el piso de arriba de «El Cuervo» con la contabilidad de un banco y la diplomacia de un tratado de paz. Cortinas granates, un piano que alguien afina de verdad, y la única alfombra sin agujeros de bala del territorio.\n\n«Caballero nuevo», te tasa con un vistazo, «las reglas son tres: se paga antes, se trata a mis chicas como a señoras, y lo que pasa arriba pesa menos que una pluma al bajar la escalera. ¿Le sirve?»\n\nJunto a la ventana, una mujer pelirroja lee un libro — LEE, aquí — y levanta la vista lo justo para archivarte.',
      opts: [
        { t: 'Pagar la velada ($8)', fx() {
            if (G.money < 8) return 'Madame Vergne mira tus bolsillos con rayos X de tasadora. «Vuelva cuando pese más, caballero. La casa no fía romance.»';
            G.money -= 8;
            addStress(p, -14);
            return 'La velada es amable y la cama, la mejor del territorio, lo cual dice más del territorio que de la cama.\n\nAl bajar, la pelirroja del libro sigue leyendo. «Dickens», dice sin que preguntes, sin levantar la vista. «Se lo digo porque tiene usted cara de ir a preguntarlo mal.»\n\n(−14 estrés)';
          } },
        { t: 'Solo un whisky y curiosidad', fx() {
            return 'Te tomas el whisky en el saloncito. Madame Vergne conversa contigo de negocios como cualquier comerciante — porque lo es.\n\nLa pelirroja del libro resulta llamarse Lily. Miss Lily para ti. Juega al ajedrez contra sí misma y va perdiendo, dice, «lo cual es matemáticamente ofensivo».\n\nEl piso de arriba, descubres, es el único sitio del pueblo donde nadie pregunta qué has hecho hoy.';
          } }
      ]
    };
  }

  // Visitas siguientes: pagar y poco hablar, o quedarse la velada con Lily
  const opts = [
    { t: 'La velada de siempre ($8)', fx() {
        if (G.money < 8) return 'La casa no fía. Madame Vergne lo dice con una ceja. La ceja es suficiente.';
        G.money -= 8;
        addStress(p, -14);
        L.visits++;
        return 'Una velada sin preguntas en el único cuarto del territorio donde el mundo se calla un rato.\n\n(−14 estrés)';
      } },
    { t: `Pagar la velada de Miss Lily... para hablar ($10)`, fx() {
        if (G.money < 10) return '«¿Conversación a crédito?» Madame Vergne casi sonríe. «Esas son las deudas más caras, caballero. Aquí no.»';
        G.money -= 10;
        L.visits++;
        L.af++;
        addStress(p, -10);
        addXp(p, 'labia', 2);
        // La relación se construye: cada tramo de afinidad abre su historia
        if (L.af === 3) {
          journal('Miss Lily se llama Delia. Delia Hart. Me lo dijo como quien presta algo valioso: esperando que lo devuelva intacto.');
          return 'Esta vez el ajedrez es contra ti. Te gana en once movimientos y se disculpa por tardar tanto.\n\n«Delia», dice de pronto, moviendo un alfil. «Hart. Ese es el nombre de verdad. Lily es... el uniforme.»\n\nNo le preguntas por qué te lo cuenta. Hay regalos que se estropean al preguntarles el motivo.';
        }
        if (L.af === 6) {
          journal('Delia ahorra cada dólar para comprarle a Madame Vergne su propia escritura. Y luego: una librería en Blackvein. Una LIBRERÍA. En este territorio de analfabetos con revólver. Ojalá el mundo pierda esa apuesta contra ella.');
          return 'Te enseña una caja de latón, escondida bajo una tabla que cruje distinto.\n\n«Mi escritura. Madame Vergne compró mi deuda hace seis años; yo la recompro moneda a moneda. Faltan $214.» Lo dice sin drama, como quien informa del tiempo. «Y después: una librería. En Blackvein. Ríase.»\n\nNo te ríes. Ella lo apunta a tu favor en algún libro interno.';
        }
        if (L.af === 10) {
          return 'Esta noche no hay ajedrez. Delia mira por la ventana el pueblo entero y te cuenta de dónde viene: una granja de Ohio, un tren equivocado, un prometido que resultó ser otro uniforme más.\n\n«¿Sabes qué es lo raro de ti?», dice al final. «Que escuchas como si esto no lo hubieras pagado.»\n\nY por primera vez en seis años — te lo dice después — se guarda tu dinero en el bolsillo izquierdo, el suyo, no en el derecho, el de la casa. No sabes qué significa exactamente. Significa exactamente eso.';
        }
        return [
          'Ajedrez, whisky del bueno y la conversación más afilada del territorio. Delia colecciona palabras raras como otros coleccionan balas: hoy te regala «petricor». Llévala contigo.',
          'Le lees el periódico en voz alta y ella corrige la sintaxis del editor en tiempo real. «Este hombre le hace a la gramática lo que la Blackvein al agua.»',
          'Te cuenta los secretos del pueblo SIN nombres — ética profesional — y es mejor que cualquier rumor con nombre: «cierto casado», «cierta beata», «cierto ayudante del sheriff que borda».',
          'Media velada en silencio, cada uno con su libro. Descubres que el silencio acompañado es un idioma, y que ella lo habla nativo.'
        ][rint(0, 3)] + '\n\n(La afinidad crece. Las cosas de verdad crecen despacio.)';
      } }
  ];
  // Con afinidad alta: cortejar en serio
  if (L.af >= 12 && !L.courting) {
    opts.push({ t: '💍 Hablarle claro: esto ya no es la casa, es ella', fx() {
        L.courting = true;
        choice('Le hablé claro a Delia Hart: la quiero a ella, no al piso de arriba. Dijo que soy un problema. No dijo que no.');
        journal('Se lo dije a Delia. Sin adornos, que con ella no funcionan. Me miró un rato largo, cerró el libro — CERRÓ EL LIBRO — y dijo: «Los hombres de tu oficio no llegan a viejos.» Y luego: «Tráeme flores el jueves. Del camino, no compradas. Veremos.» Hay victorias que se miden en flores silvestres.');
        return 'Delia escucha entera, sin interrumpir, con el libro cerrándose despacio sobre su dedo índice.\n\n«Los hombres de tu oficio no llegan a viejos», dice al fin. No es un no. Es un dato, puesto sobre la mesa, para ver qué haces con él.\n\n«Tráeme flores el jueves. Del camino, no compradas. Y no le digas nada a Vergne, que me sube el alquiler del corazón.»\n\nBajas la escalera pisando raro. Los peldaños no han cambiado. Tú sí.';
      } });
  }
  if (L.courting) {
    opts.push({ t: '🌾 Pasar la tarde con Delia (flores del camino)', fx() {
        L.af++;
        addStress(p, -16);
        if (chance(0.3)) journal('Tarde con Delia. ' + ['Me está enseñando ajedrez de verdad; pierdo mejor cada semana.', 'Leímos a medias un libro sobre ballenas. Ninguno de los dos ha visto el mar. Por eso.', 'Hicimos cuentas de la librería. Faltan menos dólares y menos excusas.'][rint(0, 2)]);
        return 'Las flores del camino duran dos días y valen más que las de invernadero, por la aritmética secreta de las cosas que se buscan a pie.\n\nLa tarde pasa como pasan las buenas: sin enterarte y dejando marca.\n\n(−16 estrés. Esto ya no se paga.)';
      } });
  }
  return {
    title: L.courting ? '🌹 Delia' : '🌹 El piso de arriba',
    text: L.courting
      ? 'Delia te espera junto a la ventana de siempre, con el ajedrez a medias y una opinión nueva sobre algo. Madame Vergne os ignora con una elegancia que cobra aparte.'
      : `El piso de arriba huele a cera, granate y paréntesis. Madame Vergne te saluda por tu nombre — mala señal para tu bolsillo, buena para tu semana.\n\nMiss Lily ${L.af >= 3 ? '— Delia —' : ''} levanta la vista de su libro exactamente un segundo. ${L.af >= 6 ? 'Te guarda la silla de enfrente con el pie.' : ''}`,
    opts
  };
}
