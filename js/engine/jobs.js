// MIROLE — trabajos. El tablón de Marrow Creek: escoltas, deudas,
// recompensas, contrabando. Cada trabajo es una sesión: viaje, decisión,
// a veces plomo, y volver a casa con algo — o sin alguien.
import { G, log, journal, save, choice, markOnce } from './state.js';
import { OUTLAWS } from '../data/names.js';
import { rint, pick, chance } from './rng.js';
import { mkFoe, foesForRisk } from '../data/enemies.js';
import { addXp, addStress, player, activeSquad } from './chars.js';
import * as CB from './combat.js';
import * as T from './time.js';

const RISK_TXT = ['', 'bajo', 'serio', 'sangriento'];

export function maybeRefreshJobs() {
  if (G.time.day - G.jobsDay >= 4 || !G.jobs.length) genJobs();
}

export function genJobs() {
  // Las recompensas viven ahora en el tablón WANTED, no aquí.
  const pool = ['escolta', 'deuda', 'guardia', 'contrabando', 'nido'];
  G.jobs = [];
  for (let i = 0; i < 3 && pool.length; i++) {
    const idx = rint(0, pool.length - 1);
    G.jobs.push(genJob(pool.splice(idx, 1)[0]));
  }
  G.jobsDay = G.time.day;
}

// ---------- el tablón WANTED ----------
// Carteles con nombre y apellido. Cada forajido muere UNA vez: el tablón
// no recicla muertos. Cada tantos días, el territorio produce uno nuevo.
const CRIMES = ['asalto al correo de Blackvein', 'triple asesinato en Dry Creek',
  'incendio del rancho Whitlock', 'robo de ganado a punta de rifle',
  'la masacre de la diligencia del norte', 'asesinato de un ayudante del sheriff',
  'secuestro de la hija del ferroviario', 'desvalijar la iglesia de Bent Fork'];

export function maybeRefreshWanted() {
  if (G.wanted.length >= 3) return;
  if (G.time.day - G.wantedDay < 8 && G.wanted.length > 0) return;
  const used = G.wanted.map(w => w.name);
  const names = OUTLAWS.filter(n => !used.includes(n) && !G.once.includes('w_' + n));
  if (!names.length) return;
  const name = pick(names);
  const tier = G.rep.fama >= 30 ? rint(2, 3) : rint(1, 2) + 1;
  G.wanted.push({
    id: rint(1000, 999999), name, tier,
    crime: pick(CRIMES),
    bounty: 50 + tier * 20 + rint(0, 30) + Math.floor(G.rep.fama / 2)
  });
  G.wantedDay = G.time.day;
}

export function startWanted(poster, sceneFn) {
  G.wanted = G.wanted.filter(w => w.id !== poster.id);
  sceneFn({
    title: `WANTED: ${poster.name}`,
    text: `El cartel lo acusa de ${poster.crime}. $${poster.bounty}, vivo o muerto. Vivo paga la mitad extra.\n\nLo vieron por las tierras malas del este. Los carteles nunca mienten en eso: los forajidos siempre están donde nadie quiere ir.`,
    opts: [{ t: 'Salir a cazar' }]
  }, () => {
    travel(1);
    const boss = mkFoe('veterano', poster.name);
    boss.sk.voluntad = 85;
    boss.hp = boss.hpMax = 7;
    const foes = poster.tier >= 3
      ? [boss, mkFoe('pistolero'), mkFoe('matarife')]
      : [boss, mkFoe('maton')];
    dogWarning(foes);
    CB.startCombat({
      title: `Caza: ${poster.name}`, foes,
      intro: 'Su campamento apesta a whisky malo y a gente que ya no espera vivir mucho. Te ven llegar.',
      onEnd: (res) => {
        travel(1);
        if (res !== 'win') {
          G.wanted.push(poster); // el cartel vuelve al tablón, burlándose
          log(`${poster.name} sigue respirando. El cartel sigue en el tablón.`);
          save();
          return;
        }
        markOnce('w_' + poster.name);
        sceneFn({
          title: 'Está en el suelo',
          text: `${poster.name} respira sangre, apoyado en su silla de montar. Te mira sin pedir nada.\n\n«Acaba o cárgame en el caballo, muchacho. Pero decide tú, que para eso ganaste.»`,
          opts: [
            { t: `Llevarlo vivo (+$${Math.round(poster.bounty * 0.5)} extra)`, fx() {
                G.money += Math.round(poster.bounty * 1.5);
                G.stats.earned += Math.round(poster.bounty * 1.5);
                G.stats.jobs++;
                G.fac.ley += 5;
                G.rep.humanidad = Math.min(100, G.rep.humanidad + 2);
                choice(`Entregué vivo a ${poster.name}.`);
                save();
                return 'Cruza el pueblo atado y erguido, saludando a las señoras como si fuera un desfile. El juez paga el extra. Casi te cae bien el desgraciado.';
              } },
            { t: 'Rematarlo aquí', fx() {
                G.money += poster.bounty;
                G.stats.earned += poster.bounty;
                G.stats.jobs++;
                G.rep.humanidad = Math.max(0, G.rep.humanidad - 8);
                G.rep.fama = Math.min(100, G.rep.fama + 3);
                addStress(player(), 4);
                choice(`Rematé a ${poster.name} en el suelo.`);
                save();
                return 'Un disparo. Los cuervos aplauden. El cuerpo pesa menos que la cifra del cartel, y tú pesas un poco más por dentro.';
              } }
          ]
        }, () => {});
      }
    });
  });
}

// El perro huele el plomo antes de que hable: los emboscadores llegan nerviosos.
function dogWarning(foes) {
  if (G.pets.length && chance(0.3)) {
    for (const f of foes) f.shaken = 1;
    log(`${G.pets[0].name} gruñó a tiempo. Llegan nerviosos.`);
  }
}

function genJob(tpl) {
  const j = { tpl, id: rint(1000, 999999) };
  if (tpl === 'escolta') Object.assign(j, {
    title: 'Escolta de carga', days: 2, risk: rint(1, 2), pay: rint(30, 45),
    desc: 'La Blackvein Mining paga por llevar una carga «aburrida» hasta el paso. Nada aburrido paga tan bien.'
  });
  if (tpl === 'deuda') Object.assign(j, {
    title: 'Cobrar una deuda', days: 1, risk: 1, pay: rint(20, 32),
    desc: 'El viejo Hobb debe dinero al almacén. El almacén te debe la comisión. Hobb tiene escopeta y opiniones.'
  });
  if (tpl === 'recompensa') Object.assign(j, {
    title: 'Cartel de recompensa', days: 2, risk: rint(2, 3), pay: rint(55, 90),
    outlaw: pick(['"Bloody" Tom Harker', 'Mad Dog McCane', 'Faroe Jack', 'Vernon "Halfsmile" Price']),
    desc: 'Vivo o muerto, dice el cartel. Vivo paga más. Muerto pesa menos.'
  });
  if (tpl === 'guardia') Object.assign(j, {
    title: 'Noche de guardia', days: 1, risk: 2, pay: rint(35, 50),
    desc: 'La cantina «El Cuervo» espera visita fea esta noche. Prefieren que la visita fea seas tú.'
  });
  if (tpl === 'contrabando') Object.assign(j, {
    title: 'Contrabando', days: 2, risk: 1, pay: 0,
    desc: 'Cajas sin preguntas cruzando el paso. Inviertes tú, cobras tú. Si sale mal, corres tú.'
  });
  if (tpl === 'nido') Object.assign(j, {
    title: 'Nido de forajidos', days: 2, risk: 3, pay: rint(20, 35),
    desc: 'Una cuadrilla se ha hecho fuerte en un rancho quemado. El pueblo junta lo que puede. El botín es tuyo.'
  });
  if (tpl === 'dawson') Object.assign(j, {
    title: '★ La pista de Dawson', days: 2, risk: 3, pay: 0,
    desc: 'Las colinas del norte. Una cabaña, humo, y el hombre que enterró a Sam contigo mirando. Esto no es un trabajo.'
  });
  return j;
}

// sceneFn(scene, after) la aporta la UI. Sin ciclos, sin dramas.
export function startJob(job, sceneFn) {
  G.jobs = G.jobs.filter(j => j.id !== job.id);
  const run = RUNNERS[job.tpl];
  if (run) run(job, sceneFn);
}

function travel(days) { T.advanceDays(days, { travel: true }); }

function payOut(job, mult, extraTxt) {
  const pay = Math.round(job.pay * mult);
  if (pay > 0) { G.money += pay; G.stats.earned += pay; }
  G.stats.jobs++;
  log(`Trabajo cerrado: ${job.title}${pay ? ` (+$${pay})` : ''}.`);
  if (extraTxt) journal(extraTxt);
  for (const c of activeSquad()) if (c.id !== G.player) c.loyalty = Math.min(100, c.loyalty + 1);
  save();
}

const RUNNERS = {
  escolta(job, scene) {
    scene({
      title: job.title,
      text: 'El carro cruje bajo cajas selladas con el hierro de la Blackvein. El capataz no te mira a los ojos al pagar la señal.\n\nDos días de polvo hasta el paso.',
      opts: [{ t: 'Partir al alba' }]
    }, () => {
      travel(1);
      // Un buen caballo esquiva problemas; un buen perro los anuncia;
      // y un líder sigiloso elige caminos que las emboscadas no conocen.
      let ambushP = G.horse && G.horse.tier >= 3 ? 0.5 : 0.65;
      ambushP -= player().skills.sigilo * 0.002;
      if (chance(ambushP)) {
        const foes = foesForRisk(job.risk);
        dogWarning(foes);
        CB.startCombat({
          title: 'Emboscada en el camino', foes, canPay: true,
          intro: 'Salen de detrás de las rocas como si el desierto los pariera. Quieren la carga.',
          onEnd: (res) => {
            travel(1);
            if (res === 'win') { payOut(job, 1); scene({ title: 'Entrega', text: 'La carga llega entera. El pagador cuenta los billetes dos veces. Tú también.', opts: [{ t: 'Cobrar' }] }, () => {}); }
            else if (res === 'paid') { payOut(job, 0.4, null); scene({ title: 'Entrega a medias', text: 'Llegas con la carga y sin honra. La compañía paga menos. Las miradas cuestan más.', opts: [{ t: 'Tragar y cobrar' }] }, () => {}); }
            else { log('La carga se perdió en el camino. La Blackvein no paga derrotas.'); save(); }
          }
        });
      } else {
        travel(1);
        payOut(job, 1);
        scene({ title: 'Camino tranquilo', text: 'Dos días de polvo, chistes malos de la banda y un atardecer que casi te reconcilia con el territorio.\n\nLa carga llega. Cobras. Nadie sangra. Guarda este día en la memoria: escasean.', opts: [{ t: 'Cobrar' }] }, () => {});
      }
    });
  },

  deuda(job, scene) {
    const p = player();
    scene({
      title: job.title,
      text: 'El rancho de Hobb huele a grasa y a miedo. El viejo sale con la escopeta baja pero los nudillos blancos.\n\n«Sé a qué vienes, muchacho. No lo tengo. Tengo hijos.»',
      opts: [
        { t: `Convencerlo con palabras (Labia ${p.skills.labia})`, fx() {
            addXp(p, 'labia', 3);
            if (p.skills.labia + rint(0, 30) >= 40) {
              T.advanceDays(1); payOut(job, 1); G.rep.humanidad = Math.min(100, G.rep.humanidad + 2);
              return 'Hablas de plazos, de cosechas, de hombres que empiezan de nuevo. Hobb paga la mitad hoy y firma el resto. El almacén acepta. Nadie sangra.';
            }
            T.advanceDays(1); payOut(job, 0.5);
            return 'Las palabras se te quedan cortas. Hobb paga una miseria y cierra la puerta. Cobras la mitad.';
          } },
        { t: 'Amenazarlo (que tu fama hable)', fx() {
            T.advanceDays(1);
            G.rep.humanidad = Math.max(0, G.rep.humanidad - 4);
            if (G.rep.fama + rint(0, 20) >= 15) { payOut(job, 1.2); return 'No levantas la voz. No hace falta. Hobb vacía una lata enterrada bajo el porche. Sales con el dinero y con algo menos, también.'; }
            payOut(job, 1); addXp(p, 'voluntad', 2);
            return 'Hobb duda... y su hijo mayor sale con un rifle. Hay un minuto largo en que el mundo se aguanta la respiración. Al final pagan. Nadie dispara. Esta vez.';
          } },
        { t: 'Perdonar la deuda', fx() {
            T.advanceDays(1);
            G.rep.humanidad = Math.min(100, G.rep.humanidad + 6);
            G.fac.pueblo += 5;
            G.stats.jobs++;
            journal('Perdonaste la deuda de Hobb. El almacén te lo descontará. El espejo, no.');
            return '«Dile al almacén que Hobb no estaba», dices. El viejo no da las gracias: se le doblan las rodillas y disimula. Cobras $0. Duermes bien.';
          } }
      ]
    }, () => {});
  },

  recompensa(job, scene) {
    scene({
      title: job.title,
      text: `El cartel muestra una cara mal dibujada y una cifra bien clara: ${job.outlaw}.\n\nLo vieron en las tierras malas, al este. Vivo paga un extra. Muerto, pesa menos.`,
      opts: [{ t: 'Salir a cazar' }]
    }, () => {
      travel(1);
      const boss = mkFoe('veterano', job.outlaw);
      boss.sk.voluntad = 80;
      const foes = job.risk >= 3 ? [boss, mkFoe('pistolero'), mkFoe('maton')] : [boss, mkFoe('maton')];
      CB.startCombat({
        title: `Caza: ${job.outlaw}`, foes,
        intro: 'El campamento apesta a carne quemada y a gente que ya no espera vivir mucho. Te ven llegar.',
        onEnd: (res) => {
          travel(1);
          if (res !== 'win') { log('La caza terminó mal. El cartel sigue en la pared, burlándose.'); save(); return; }
          scene({
            title: 'Está en el suelo',
            text: `${job.outlaw} respira sangre, apoyado en su silla de montar. Te mira sin pedir nada.\n\n«Acaba o cárgame en el caballo, muchacho. Pero decide tú, que para eso ganaste.»`,
            opts: [
              { t: 'Llevarlo vivo (paga extra)', fx() {
                  payOut(job, 1.5); G.fac.ley += 5; G.rep.humanidad = Math.min(100, G.rep.humanidad + 2);
                  return 'Cruza el pueblo atado y erguido, saludando a las señoras como si fuera un desfile. El juez paga el extra. Casi te cae bien el desgraciado.';
                } },
              { t: 'Rematarlo aquí', fx() {
                  payOut(job, 1); G.rep.humanidad = Math.max(0, G.rep.humanidad - 8); G.rep.fama = Math.min(100, G.rep.fama + 3);
                  addStress(playerRef(), 4);
                  return 'Un disparo. Los cuervos aplauden. El cuerpo pesa menos que la cifra del cartel, y tú pesas un poco más por dentro.';
                } }
            ]
          }, () => {});
        }
      });
    });
  },

  guardia(job, scene) {
    scene({
      title: job.title,
      text: 'El dueño de «El Cuervo» limpia el mostrador que ya estaba limpio. «Vienen esta noche. Los del arroyo. Dicen que este local ahora es suyo.»\n\nLa noche cae despacio, como si tampoco quisiera entrar.',
      opts: [{ t: 'Apagar las lámparas y esperar' }]
    }, () => {
      CB.startCombat({
        title: 'La cantina, de noche', foes: foesForRisk(job.risk),
        intro: 'La puerta se abre de una patada. Botas, cañones y mala educación.',
        onEnd: (res) => {
          T.advanceDays(1);
          if (res === 'win') {
            payOut(job, 1); G.fac.pueblo += 3;
            scene({ title: 'Amanece', text: 'El dueño barre cristales silbando. Te paga sin contar, que es la mayor muestra de respeto que existe en el territorio.', opts: [{ t: 'Un último trago y a casa' }] }, () => {});
          } else { log('La cantina amaneció con dueños nuevos. Tú, con moretones nuevos.'); save(); }
        }
      });
    });
  },

  contrabando(job, scene) {
    const p = player();
    const opts = [10, 20, 40].filter(v => v <= G.money).map(v => ({
      t: `Invertir $${v}`, fx() {
        G.money -= v;
        travel(2);
        addXp(p, 'sigilo', 3);
        const bonus = p.skills.sigilo / 200;
        if (chance(0.68 + bonus - G.fac.ley * 0.005)) {
          const win = Math.round(v * (1.6 + rint(0, 8) / 10));
          G.money += win; G.stats.earned += win; G.stats.jobs++; G.fac.forajidos += 2;
          save();
          return `Las cajas cruzan el paso bajo lonas y estrellas. Nadie pregunta. Vuelves con $${win}. El dinero fácil existe: solo cuesta el sueño.`;
        }
        G.fac.ley = Math.max(-50, G.fac.ley - 5);
        save();
        return 'Una patrulla. Una zanja. Las cajas se quedan en la zanja y tú te quedas sin inversión y con una carrera nocturna que contarás mejor de lo que fue.';
      }
    }));
    if (!opts.length) { scene({ title: job.title, text: 'No tienes ni para invertir en problemas. El contacto se toca el sombrero y se esfuma.', opts: [{ t: 'Maldecir en dos idiomas' }] }, () => {}); return; }
    scene({
      title: job.title,
      text: 'Un hombre con acento del sur y sonrisa de naipe marcado te ofrece el trato: tú pones el dinero y las agallas, él pone la ruta.\n\n«Doble o nada, amigo. Como todo en la vida.»',
      opts
    }, () => {});
  },

  nido(job, scene) {
    scene({
      title: job.title,
      text: 'El rancho quemado humea a lo lejos. Dentro: risas, botellas rotas y gente que ha confundido crueldad con libertad.\n\nEl pueblo juntó poco dinero. El botín de dentro es otra historia.',
      opts: [{ t: 'Entrar con la primera luz' }]
    }, () => {
      travel(1);
      const foes = foesForRisk(3);
      dogWarning(foes);
      CB.startCombat({
        title: 'El rancho quemado', foes,
        intro: 'El centinela bosteza. Es lo último aburrido que va a pasar aquí.',
        onEnd: (res) => {
          travel(1);
          if (res === 'win') {
            const extra = rint(30, 60);
            G.money += extra; G.stats.earned += extra;
            payOut(job, 1, 'Limpiamos el rancho quemado. El pueblo durmió tranquilo. Nosotros contamos billetes con manos que olían a pólvora.');
            scene({ title: 'El botín', text: `Bajo un tablón suelto: $${extra} y el silencio espeso de las casas donde ya no vive nadie.`, opts: [{ t: 'Cargar y no mirar atrás' }] }, () => {});
          } else { log('El nido sigue ahí. Vosotros, de milagro.'); save(); }
        }
      });
    });
  },

  // ---- el hilo de Sam: esto no es un trabajo ----
  dawson(job, scene) {
    scene({
      title: 'La pista de Dawson',
      text: 'Dos años de nada y ahora esto: una cabaña en las colinas del norte, humo en la chimenea, y un rumor con nombre y apellido.\n\nSilas Dawson. El hombre que compró la emboscada. El hombre por el que Sam está bajo tierra.\n\nEli te mira ensillar. «Sea lo que sea que vayas a hacer allí... hazlo tú. No dejes que lo haga el whisky.»',
      opts: [{ t: 'Cabalgar al norte' }]
    }, () => {
      travel(1);
      CB.startCombat({
        title: 'Los perros de Dawson', foes: [mkFoe('pistolero'), mkFoe('maton'), mkFoe('matarife')], canFlee: false,
        intro: 'Dawson compró guardaespaldas con tu dinero. Con el dinero de Sam.',
        onEnd: (res) => {
          if (res !== 'win') { travel(1); G.flags.dawson = 2; log('Las colinas te escupieron de vuelta. Dawson sigue respirando. Por ahora.'); save(); return; }
          scene({
            title: 'Silas Dawson',
            text: 'Está de rodillas junto a la chimenea, más viejo de lo que lo recordabas, sosteniendo las manos como si rezara a un dios que no conoce.\n\n«Fue un negocio, muchacho. Nada personal. Sam entendía de negocios...»\n\nSe calla. Hasta él sabe que eso fue un error.',
            opts: [
              { t: 'Matarlo a sangre fría', fx() {
                  choice('Maté a Silas Dawson a sangre fría, de rodillas junto a su chimenea.');
                  G.flags.dawson = 3; G.flags.dawsonFate = 'muerto';
                  G.rep.humanidad = Math.max(0, G.rep.humanidad - 15);
                  G.rep.fama = Math.min(100, G.rep.fama + 6);
                  addStress(playerRef(), 6);
                  journal('Dawson está muerto. La promesa está cumplida. La habitación sigue igual de fría.');
                  return 'El disparo suena a punto final. Te quedas mirando la chimenea hasta que el fuego se acaba.\n\nCreías que esto pesaría menos. Pesa distinto, que no es lo mismo.';
                } },
              { t: 'Entregarlo a la ley ($120)', fx() {
                  choice('Entregué a Silas Dawson vivo a la justicia de Blackvein.');
                  G.flags.dawson = 3; G.flags.dawsonFate = 'entregado';
                  G.money += 120; G.stats.earned += 120; G.fac.ley += 10;
                  journal('Dawson colgará en Blackvein, con papeles y jueces. Sam habría dicho que la horca ajena no abriga. Pero pagaron bien.');
                  return 'Cruza el territorio atado, lloriqueando sobre negocios. El juez de Blackvein paga la recompensa completa.\n\nLa horca hará el resto. Tú ya hiciste bastante.';
                } },
              { t: 'Dejarlo ir, vivo y avisado', fx() {
                  choice('Dejé vivo a Silas Dawson. La promesa quedó rota; yo, entero.');
                  G.flags.dawson = 3; G.flags.dawsonFate = 'vivo';
                  G.rep.humanidad = Math.min(100, G.rep.humanidad + 10);
                  journal('Dejaste vivo a Dawson. No por él. Por ti. Sam lo entendería... probablemente. Ojalá.');
                  return '«Si vuelvo a oír tu nombre en este territorio, lo próximo que oigas tú será mi caballo.»\n\nSe va corriendo colina abajo, cayéndose dos veces. Y tú te quedas con la promesa rota y el alma entera. Extraño trato.';
                } }
            ]
          }, () => { travel(1); save(); });
        }
      });
    });
  }
};

function playerRef() { return player(); }
