// MIROLE — Prólogo: «El camino de Marrow Creek», primavera de 1899.
// Aquí nace todo: la herida, la promesa, la primera tumba y el hombre
// que te acompañará. Empiezas desde el barro. Como las buenas historias.
import { G, save, log, journal } from '../engine/state.js';
import { makeProtagonist, makeEli, buryChar, addStress, player } from '../engine/chars.js';
import { mkFoe } from './enemies.js';
import { genJobs } from '../engine/jobs.js';
import * as CB from '../engine/combat.js';

// scene(sceneObj, after) y done() los aporta la UI.
export function startPrologue(name, alias, scene, done) {
  const hero = makeProtagonist(name, alias);
  G.chars[hero.id] = hero;
  G.player = hero.id;
  G.squad.push(hero.id);
  G.money = 12;
  G.ammo.balas = 10;
  G.ammo.cartuchos = 4;

  scene({
    title: 'Primavera de 1899',
    text: `Territorio de Red Marrow. Al oeste, desierto y pueblos que se aguantan de milagro. Al este, Blackvein City: humo de carbón, dinero nuevo y callejones viejos.\n\nTú eres ${name}. Veintiséis años, un revólver oxidado y ninguna propiedad que no quepa en una alforja.\n\nDelante cabalga Sam Corddry — el hombre que te enseñó todo: a disparar, a callar y a distinguir cuándo hacer cada cosa. Detrás, el carro con la paga mensual de la mina y un pagador de la Blackvein llamado Silas Dawson que suda demasiado para lo fresco que está el día.`,
    opts: [{ t: 'Seguir el camino' }]
  }, () => scene2(scene, done));
}

function scene2(scene, done) {
  scene({
    title: 'Sam',
    text: 'Sam iguala el paso de su caballo con el tuyo y te mira de esa forma suya, como quien revisa una cerca.\n\n«Cuando cobremos esta, muchacho, me retiro. Un porche, un café y ver pasar a los idiotas. Tú deberías pensar en qué te dejó el camino a ti.»\n\n¿Qué te dejó el camino?',
    opts: [
      { t: '«La fiebre se llevó a los míos. El camino fue lo que quedó.»', fx() {
          G.flags.herida = 'fiebre';
          player().skills.voluntad += 3;
          return 'Sam asiente despacio. «Los que pierden todo de niños aprenden a no soltar lo poco que agarran. Eso te hará duro. Procura que no te haga solo eso.» (+3 VOLUNTAD)';
        } },
      { t: '«La guerra de los ranchos. Disparé antes de afeitarme.»', fx() {
          G.flags.herida = 'guerra';
          player().skills.punteria += 3;
          return '«Lo sé. Te vi disparar antes de verte sonreír.» Escupe al polvo. «La guerra enseña rápido y cobra despacio. Aún te quedan plazos.» (+3 PUNTERÍA)';
        } },
      { t: '«Nunca conocí otra cosa. Nací en el camino.»', fx() {
          G.flags.herida = 'camino';
          player().skills.reflejos += 3;
          return '«Los hijos del camino no echan raíces: echan reflejos.» Se ríe con esa risa de grava. «Cuando me retire, el camino será todo tuyo. Trátalo mal, que él hará lo mismo.» (+3 REFLEJOS)';
        } }
    ]
  }, () => scene3(scene, done));
}

function scene3(scene, done) {
  scene({
    title: 'El desfiladero',
    text: 'El camino se estrecha entre rocas rojas. Los pájaros llevan un minuto sin cantar y a Sam se le ha borrado la sonrisa.\n\n«Muchacho...», empieza.\n\nEl primer disparo le arranca el sombrero a Dawson. El segundo no es de aviso.',
    opts: [{ t: '¡A las rocas!' }]
  }, () => {
    CB.startCombat({
      title: 'Emboscada en el desfiladero',
      foes: [mkFoe('maton'), mkFoe('maton')],
      canFlee: false,
      intro: 'Dos hombres bajan disparando entre las rocas. Sam grita órdenes a tu espalda. Cúbrete, apunta, y que cada bala cuente: llevas diez.',
      onEnd: () => scene4(scene, done)
    });
  });
}

function scene4(scene, done) {
  scene({
    title: 'El polvo se asienta',
    text: 'Se acaba el plomo y empieza el silencio, ese silencio gordo de después.\n\nEl carro no está. Dawson no está. Y entonces entiendes el sudor, los pájaros callados, el camino estrecho: el pagador vendió su propia carga y os vendió de propina.\n\nSam está sentado contra una roca, con las dos manos sobre el vientre y esa cara de estar haciendo cuentas.\n\n«Vaya», dice. «Al final el porche va a ser esto.»',
    opts: [{ t: 'Arrodillarte a su lado' }]
  }, () => scene5(scene, done));
}

function scene5(scene, done) {
  scene({
    title: 'Lo que se dice al final',
    text: 'Le abres el abrigo y los dos veis lo mismo y ninguno lo dice.\n\n«Escúchame, muchacho. Rápido, que tengo prisa.» Tose. Sonríe torcido. «Fue Dawson. Que eso no te pudra. Y una cosa más...»\n\nTe agarra la muñeca con la fuerza que le queda. ¿Qué le prometes?',
    opts: [
      { t: '«Encontraré a Dawson. Lo juro.»', fx() {
          G.flags.promSam = 'venganza';
          journal('Se lo juré a Sam con su sangre en mis manos: encontraré a Dawson.');
          return '«...sabía que dirías eso.» Cierra los ojos y los abre a medias. «Cuando lo encuentres... decide despierto. No dormido de rabia. Prométeme las dos cosas.»\n\nSe va antes de que puedas prometer la segunda.';
        } },
      { t: '«Cuidaré de tu hija. Tiene mi palabra.»', fx() {
          G.flags.promSam = 'hija';
          G.rep.humanidad += 4;
          journal('Le prometí a Sam cuidar de Ada, su hija de Blackvein. No sé ni cómo es su cara. Da igual: la palabra ya está dada.');
          return 'Algo se le afloja en la cara, como si soltara un peso que llevaba años cargando en secreto.\n\n«Ada. Lavandería de Hoyt Street, en Blackvein. No sabe... nada de esta vida. Que no lo sepa nunca por las malas.»\n\nSonríe de verdad por última vez. «Buen chico. Siempre fuiste...»\n\nNo termina la frase. Te la deja de herencia.';
        } },
      { t: 'No decir nada. Sostenerle la mano.', fx() {
          G.flags.promSam = 'silencio';
          G.rep.humanidad += 2;
          player().skills.voluntad += 2;
          return 'No hay palabras a la altura y los dos lo sabéis. Le sostienes la mano como él te sostuvo a ti todos estos años: sin ruido, sin soltarla.\n\n«Eso es», murmura. «Eso es...»\n\nEl desierto se lo lleva sin prisa. (+2 VOLUNTAD)';
        } }
    ]
  }, () => scene6(scene, done));
}

function scene6(scene, done) {
  const p = player();
  buryChar(mkSam(), 'Emboscada del desfiladero — traicionado por Silas Dawson',
    'Enseñó todo lo que sabía. Menos a vivir sin él.');
  addStress(p, 25);
  scene({
    title: 'La primera tumba',
    text: 'Cavas hasta que duelen las manos, porque mientras duelen las manos no duele lo otro.\n\nCuando terminas, hay un hombre esperando a diez pasos, sombrero en mano: uno de los jinetes de refuerzo que la mina mandó tarde. Cincuenta y tantos, cara de púlpito abandonado y una escopeta con nombre de mujer.\n\n«Eli Marsh», dice. «Llegué tarde a la pólvora. Deja al menos que llegue a tiempo al responso.»\n\nY reza sobre la tumba de un desconocido como si le fuera la vida. Puede que le vaya.',
    opts: [
      { t: 'Rezar con él', fx() {
          G.rep.humanidad += 2;
          return 'No recuerdas las palabras, así que mueves los labios y aprietas los ojos, y descubres que eso es el noventa por ciento de rezar.\n\nAl acabar, Eli te mira: «¿Y ahora, muchacho?»';
        } },
      { t: 'Escuchar en silencio, sombrero en mano', fx() {
          return 'Las palabras de Eli caen sobre la tierra removida como lluvia fina. No crees en casi nada, pero crees en enterrar bien a la gente.\n\nAl acabar, Eli te mira: «¿Y ahora, muchacho?»';
        } }
    ]
  }, () => scene7(scene, done));
}

function mkSam() {
  // Sam existe solo para morir bien. La primera piedra del cementerio.
  return {
    name: 'Sam Corddry', alias: 'Sam',
    birthYear: G.time.startYear - 55,
    alive: true, wounds: [], traits: []
  };
}

function scene7(scene, done) {
  scene({
    title: 'Marrow Creek',
    text: 'Dos días después, Marrow Creek: calle mayor de barro, una cantina llamada «El Cuervo», un almacén, una oficina de la Blackvein con la pintura demasiado nueva.\n\nEl capataz paga la mitad — «la carga no llegó, muchacho, sé razonable» — y no te sostiene la mirada al decirlo. De Dawson, ni rastro: como si el territorio se lo hubiera tragado. Los territorios hacen eso, si les pagas.\n\nEli te espera fuera, con los caballos.\n\n«Yo ya no tengo parroquia y tú ya no tienes maestro. Dos vacantes que se parecen. Cabalgo contigo, si me aceptas la escopeta... $10 a la semana, y rezo gratis.»',
    opts: [
      { t: 'Estrecharle la mano', fx() {
          const eli = makeEli();
          G.chars[eli.id] = eli;
          G.squad.push(eli.id);
          G.money += 18;
          log('Eli Marsh «el Diácono» cabalga contigo.');
          journal('Marrow Creek. La mitad de la paga, ninguna justicia y un ex-predicador con escopeta. Con menos se han levantado imperios. Creo.');
          return 'Su apretón es de los que arreglan tratos y rompen nudillos.\n\n«Primera lección de esta sociedad», dice mirando el pueblo, «aquí nadie te va a regalar nada. Segunda lección: por eso mismo, todo lo que consigas será tuyo.»\n\nEl Cuervo tiene mesas libres y el tablón de anuncios está lleno de trabajo feo.\n\nTu historia empieza aquí, desde el barro. Como las buenas.';
        } }
    ]
  }, () => {
    genJobs();
    save();
    done();
  });
}
