// MIROLE — el motor de vínculos abiertos (Doctrina §2). Nadie está
// predestinado: conoces gente, la cortejas, te rechaza o cuaja, se
// rompe o muere, y SIEMPRE aparece alguien más. El amor es un sistema.
import { G, journal, choice, log, yearOf } from './state.js';
import { rint, pick, chance } from './rng.js';
import { player, addStress, aliveSquad, recruitFromPerson } from './chars.js';
import { SEEDED, genPerson, COURT_LINES, BREAK_LINES, FRIEND_LINES, RIVAL_LINES, standingLabel, firstName } from '../data/people.js';

// Estructura: G.relations.people[key] = { ...persona, af, stage, met }
// G.relations.partner = key | null. Convive con relations.lily (el piso).
export function ensureHearts() {
  const r = G.relations = G.relations || {};
  if (!r.people) r.people = {};
  if (r.partner === undefined) r.partner = null;
  if (r.metSeeds === undefined) r.metSeeds = [];
}

export function candidates() {
  ensureHearts();
  return Object.values(G.relations.people).filter(p => p.stage !== 'ended');
}
export function partner() {
  ensureHearts();
  return G.relations.partner ? G.relations.people[G.relations.partner] : null;
}

// El Director decide si HOY aparece alguien — más si estás solo. La
// presentación real (crear + narrar) ocurre en el evento 'conoces_alguien'.
export function shouldIntroduce() {
  ensureHearts();
  if (candidates().length >= 3) return false;
  return chance(partner() ? 0.05 : 0.14);
}

export function introduce(forceKey) {
  ensureHearts();
  const r = G.relations;
  let base = null;
  // Primero agotamos las semillas de autor que cumplan condición.
  const seed = SEEDED.find(s => (forceKey ? s.key === forceKey : true)
    && !r.metSeeds.includes(s.key)
    && !(s.minFama && G.rep.fama < s.minFama)
    && !r.people[s.key]);
  if (seed) { base = { ...seed }; r.metSeeds.push(seed.key); }
  else { base = genPerson(); }
  // rel = estanding general (-100 enemigo .. +100 amigo del alma).
  // af = afinidad romántica (0..20), solo relevante si hay romance.
  // No todo el mundo es romanceable: la mayoría sí, algunos no.
  r.people[base.key] = Object.assign(base, {
    rel: 0, af: 0, stage: 'met', metDay: G.time.day,
    romanceable: base.romanceable !== false && chance(0.7)
  });
  return r.people[base.key];
}

function tier(af) { return af >= 9 ? 'calido' : af >= 4 ? 'tibio' : 'frio'; }

// Etiqueta de estanding para la UI (pareja tiene prioridad visual).
export function standing(p) {
  if (p.stage === 'partner') return { t: 'pareja', cls: 'green' };
  return standingLabel(p.rel || 0);
}

// La escena de relación: buenas Y malas. El romance es solo una rama que
// exige que primero os llevéis bien. Con la gente se puede construir
// amistad, alianza, rivalidad o enemistad — o el amor, si cuaja.
export function courtScene(key) {
  ensureHearts();
  const p = G.relations.people[key];
  if (p.rel === undefined) p.rel = 0;
  const pl = player();
  const opts = [];

  if (p.stage === 'partner') {
    opts.push({ t: `Una tarde con ${firstName(p)}`, fx() {
      addStress(pl, -14);
      p.af = Math.min(20, p.af + 1); p.rel = Math.min(100, p.rel + 1);
      if (chance(0.3)) journal(`Tarde con ${firstName(p)}. ${pick(['Hablamos de irnos lejos. Ninguno de los dos se irá. Pero hablarlo abriga.', 'Me enseña a leer mejor. Pierdo menos cada semana.', 'Discutimos por una tontería y lo arreglamos por otra. Eso también es amor.'])}`);
      return `Una tarde robada al territorio. ${pick(COURT_LINES.calido)(p)}\n\n(−14 estrés. Esto ya no se paga con monedas.)`;
    } });
    opts.push({ t: `Terminar con ${firstName(p)}`, fx() { return breakup(key); } });
    opts.push({ t: 'Despedirte por hoy', fx() { return null; } });
    return { title: `❤ ${p.name}`, text: `${firstName(p)} — ${p.tag}. Vuestra vida cabe en las noches que el territorio os deja.`, opts, _key: key };
  }

  // ----- acción BUENA: acercarte -----
  opts.push({ t: `Compartir un rato con ${firstName(p)}`, fx() {
    const good = pl.skills.labia + G.rep.fama / 5 + rint(0, 30) >= 38;
    p.rel = Math.max(-100, Math.min(100, p.rel + (good ? rint(6, 10) : rint(2, 4))));
    if (p.romanceable && p.rel >= 30) p.af = Math.min(15, p.af + (good ? 2 : 1));
    addStress(pl, -5);
    // Tu crueldad enfría a los decentes.
    if (G.rep.humanidad < 30 && p.reto && p.reto.includes('armados') && chance(0.4)) {
      p.rel = Math.max(-100, p.rel - 4);
      return pick(RIVAL_LINES)(p) + `\n\nHay cosas que la fama no lava, por mucho whisky que pongas encima.`;
    }
    return p.rel >= 45 ? pick(FRIEND_LINES)(p)
      : p.rel >= 20 ? pick(COURT_LINES.tibio)(p)
      : pick(COURT_LINES.frio)(p);
  } });

  // ----- ayuda/favor: cimenta amistad de verdad (cuesta dinero) -----
  opts.push({ t: `Echarle una mano a ${firstName(p)} ($8)`, fx() {
    if (G.money < 8) return `Querrías ayudar, pero no te llega ni para ti. ${firstName(p)} lo nota y no lo dice, que es peor.`;
    G.money -= 8;
    p.rel = Math.min(100, p.rel + rint(8, 12));
    G.rep.humanidad = Math.min(100, G.rep.humanidad + 1);
    return `Le resuelves un problema — una deuda, un tejado, un mal día — sin cobrar y sin sermón. ${firstName(p)} te lo apunta en el único libro que importa: el de los que estuvieron.\n\n${p.rel >= 50 ? pick(FRIEND_LINES)(p) : ''}`;
  } });

  // ----- acción MALA: pincharle / despreciar -----
  opts.push({ t: `Pincharle a ${firstName(p)}`, fx() {
    p.rel = Math.max(-100, p.rel - rint(6, 12));
    if (p.rel <= -40) return pick(RIVAL_LINES)(p) + `\n\nAcabas de ganarte un enemigo. En Red Marrow eso rinde intereses.`;
    return pick(RIVAL_LINES)(p);
  } });

  // ----- intimidar: útil, pero cava enemistad -----
  opts.push({ t: `Amenazar a ${firstName(p)} (que tu fama hable)`, fx() {
    const cede = G.rep.fama + rint(0, 30) >= 25 && (p.reto ? true : true);
    p.rel = Math.max(-100, p.rel - rint(4, 8));
    G.rep.humanidad = Math.max(0, G.rep.humanidad - 2);
    if (cede) return `${firstName(p)} traga saliva y agacha la cabeza. Consigues lo que querías por hoy. Pero el miedo no es lealtad: es una deuda que se cobra tarde y con intereses.`;
    return `${firstName(p)} te sostiene la mirada sin ceder. «No me das miedo, forastero. Y ahora, además, no me caes bien.» Enemigo nuevo, cero beneficio. Bravo.`;
  } });

  // ----- romance: solo si os lleváis bien y es romanceable -----
  if (p.romanceable && p.rel >= 45 && p.af >= 8 && !partner() && p.stage !== 'rechazo') {
    opts.push({ t: `💍 Hablarle claro a ${firstName(p)} (romance)`, fx() {
      const chanceYes = 0.5 + p.af * 0.03 + p.rel * 0.003 + G.rep.humanidad * 0.002;
      if (chance(chanceYes)) {
        p.stage = 'partner'; G.relations.partner = key;
        choice(`Me uní a ${p.name}. En Red Marrow, hasta el amor lleva revólver.`);
        journal(`Lo hicimos oficial, ${firstName(p)} y yo. ${cap(p.deseo)}, dice que quiere. Le dije que le ayudaría a conseguirlo. Ojalá el territorio nos deje.`);
        return `${firstName(p)} tarda en contestar. El silencio dura lo que dura una vida pequeña. Luego: «Está bien. Pero si me fallas, no habrá segunda. Aquí no hay segundas.»\n\nY sonríe como quien apuesta todo lo que tiene. Porque lo hizo.`;
      }
      p.af = Math.max(3, p.af - 3);
      journal(`Le hablé claro a ${firstName(p)}. No salió, pero seguimos siendo lo que éramos. «${p.reto ? cap(p.reto) + '.' : 'Ahora no.'}»`);
      return `${firstName(p)} sonríe con pena. «Te quiero cerca... pero no así. ${cap(p.reto || 'necesito tiempo')}.»\n\nLa amistad sobrevive. El amor, hoy, no. Duele con dignidad.`;
    } });
  }
  // ----- reclutar a un amigo del alma: el vínculo se vuelve banda -----
  if (p.rel >= 78 && p.stage !== 'partner' && aliveSquad().filter(c => c.id !== G.player).length < 5) {
    opts.push({ t: `🤝 Proponerle a ${firstName(p)} unirse a la banda`, fx() {
      const r = recruitFromPerson(p);
      G.chars[r.id] = r;
      G.squad.push(r.id);
      p.stage = 'joined';
      choice(`${p.name} pasó de amigo a compañero de armas. Los mejores fichajes se hacen en una mesa, no en un tablón.`);
      journal(`${p.name} se une a la banda. No por dinero — por lo que hay entre nosotros. Esos son los que no te fallan... y los que más duele enterrar.`);
      return `${firstName(p)} no lo piensa mucho. «Ya me juego el pellejo por ti gratis», dice. «Al menos ahora cobraré.»\n\nAprieta tu mano como se aprieta la de un hermano. La banda tiene un miembro más — y tú, una razón más para volver vivo a casa.`;
    } });
  }
  // ----- pedir un favor a un amigo -----
  if (p.rel >= 55) {
    opts.push({ t: `Pedirle un favor a ${firstName(p)}`, fx() {
      p.rel = Math.max(0, p.rel - 8); // los favores gastan crédito
      const roll = pick(['info', 'money', 'item']);
      if (roll === 'info') { G.rep.fama = Math.min(100, G.rep.fama + 1); return `${firstName(p)} te suelta algo que sabe y tú no: quién trama qué, dónde no meterse, a quién no fiarse. La amistad, bien usada, es la mejor arma sin pólvora.`; }
      if (roll === 'money') { const m = rint(10, 25); G.money += m; return `«Te lo presto, pero porque sé que vuelve.» ${firstName(p)} te pasa $${m} sin papeles ni intereses. Devuélveselo o deja de llamarte su amigo.`; }
      G.rep.fama = Math.min(100, G.rep.fama + 1); return `${firstName(p)} mueve un par de hilos por ti en el pueblo. No preguntas cómo. Los amigos son eso: puertas que se abren sin que toques.`;
    } });
  }
  opts.push({ t: 'Despedirte por hoy', fx() { return null; } });

  const st = standingLabel(p.rel);
  const romInfo = p.romanceable && p.rel >= 30 && p.af > 0 ? ` · afinidad ${'♥'.repeat(Math.ceil(p.af / 3)) || '·'}` : '';
  return {
    title: `👤 ${p.name}`,
    text: `${firstName(p)} — ${p.tag}. Lo/la conociste en ${p.where}.\n\nRelación: <b class="${st.cls}">${st.t}</b>${romInfo}`,
    opts,
    _key: key
  };
}

export function breakup(key, reasonIdx) {
  ensureHearts();
  const p = G.relations.people[key];
  if (!p) return '';
  if (G.relations.partner === key) G.relations.partner = null;
  p.stage = 'ended';
  addStress(player(), 10);
  const line = BREAK_LINES[reasonIdx ?? rint(0, BREAK_LINES.length - 1)](p);
  journal(`Se acabó lo de ${firstName(p)}. ${line.replace(/\s+/g, ' ').slice(0, 90)}...`);
  log(`Lo tuyo con ${firstName(p)} llegó a su final.`);
  return line + `\n\nEl territorio es ancho y la gente, muchas. Ya llegará otra. Siempre llega otra. Esa es la única promesa que Red Marrow cumple.`;
}

// La vida cruel puede romper un vínculo sin que tú lo elijas; y los
// enemigos que te ganaste no se quedan de brazos cruzados.
export function heartsTick() {
  ensureHearts();
  const pt = partner();
  if (pt && G.rep.humanidad <= 20 && chance(0.02)) {
    G.pending.push('vinculo_roto:' + G.relations.partner);
  }
  // Los enemigos declarados (rel muy negativo) actúan de tanto en tanto.
  for (const p of Object.values(G.relations.people)) {
    if (p.stage === 'ended' || p.rel > -55) continue;
    if (p.lastActed && G.time.day - p.lastActed < 20) continue;
    if (chance(0.08)) {
      p.lastActed = G.time.day;
      if (!G.pending.includes('enemigo_actua:' + p.key)) G.pending.push('enemigo_actua:' + p.key);
    }
  }
}

function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
