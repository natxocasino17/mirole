// MIROLE — el motor de vínculos abiertos (Doctrina §2). Nadie está
// predestinado: conoces gente, la cortejas, te rechaza o cuaja, se
// rompe o muere, y SIEMPRE aparece alguien más. El amor es un sistema.
import { G, journal, choice, log, yearOf } from './state.js';
import { rint, pick, chance } from './rng.js';
import { player, addStress } from './chars.js';
import { SEEDED, genPerson, COURT_LINES, BREAK_LINES, firstName } from '../data/people.js';

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
  r.people[base.key] = Object.assign(base, { af: 0, stage: 'met', metDay: G.time.day });
  return r.people[base.key];
}

function tier(af) { return af >= 9 ? 'calido' : af >= 4 ? 'tibio' : 'frio'; }

// Una escena de cortejo. Devuelve el objeto scene para la UI.
export function courtScene(key) {
  ensureHearts();
  const p = G.relations.people[key];
  const pl = player();
  const opts = [];
  opts.push({ t: `Pasar un rato con ${firstName(p)} (Labia)`, fx() {
    const gain = pl.skills.labia + G.rep.fama / 4 + rint(0, 30) >= 40 ? rint(2, 3) : 1;
    p.af = Math.min(15, p.af + gain);
    addStress(pl, -6);
    const line = pick(COURT_LINES[tier(p.af)])(p);
    // El reto de cada persona: tu humanidad baja enfría a los buenos.
    if (G.rep.humanidad < 30 && p.reto && p.reto.includes('armados') && chance(0.4)) {
      p.af = Math.max(0, p.af - 2);
      return line + `\n\nPero al despedirse, ${firstName(p)} te mira las manos un segundo de más. Hay cosas que la fama no lava.`;
    }
    return line;
  } });
  // Declararse: solo con afinidad alta y sin pareja actual.
  if (p.af >= 10 && !partner() && p.stage !== 'partner') {
    opts.push({ t: `💍 Hablarle claro a ${firstName(p)}`, fx() {
      // Puede aceptar... o no. Su reto pesa. Nada está escrito.
      const chanceYes = 0.55 + p.af * 0.03 + G.rep.humanidad * 0.003;
      if (chance(chanceYes)) {
        p.stage = 'partner';
        G.relations.partner = key;
        choice(`Me uní a ${p.name}. En Red Marrow, hasta el amor lleva revólver.`);
        journal(`Lo hicimos oficial, ${firstName(p)} y yo. ${cap(p.deseo)}, dice que quiere. Le dije que la ayudaría a conseguirlo. Ojalá el territorio nos deje.`);
        return `${firstName(p)} tarda en contestar. El silencio dura lo que dura una vida pequeña. Luego: «Está bien. Pero si me fallas, no habrá segunda. Aquí no hay segundas.»\n\nY sonríe como si acabara de apostar todo lo que tiene. Porque lo hizo.`;
      }
      p.af = Math.max(3, p.af - 4);
      p.stage = 'rechazo';
      journal(`Le hablé claro a ${firstName(p)}. No salió. «${p.reto ? cap(p.reto) + '.' : 'Ahora no.'}» A veces el valor no basta. Volveré a intentarlo, o no. El territorio es ancho.`);
      return `${firstName(p)} baja la mirada. «No es no para siempre... pero es no ahora. ${cap(p.reto || 'necesito tiempo')}.»\n\nDuele con dignidad, que es la única forma decente de doler. La puerta no se cierra. Pero hoy no se abre.`;
    } });
  }
  if (p.stage === 'partner') {
    opts.push({ t: `Una tarde con ${firstName(p)}`, fx() {
      addStress(pl, -14);
      p.af = Math.min(20, p.af + 1);
      if (chance(0.3)) journal(`Tarde con ${firstName(p)}. ${pick(['Hablamos de irnos lejos. Ninguno de los dos se irá. Pero hablarlo abriga.', 'Me enseña a leer mejor. Pierdo menos cada semana.', 'Discutimos por una tontería y lo arreglamos por otra. Eso también es amor.'])}`);
      return `Una tarde robada al territorio. ${pick(COURT_LINES.calido)(p)}\n\n(−14 estrés. Esto ya no se paga con monedas.)`;
    } });
    opts.push({ t: `Terminar con ${firstName(p)}`, fx() { return breakup(key); } });
  }
  opts.push({ t: 'Despedirte por hoy', fx() { return null; } });

  return {
    title: `❤ ${p.name}`,
    text: `${firstName(p)} — ${p.tag}. La conociste en ${p.where}.\n\n${p.stage === 'partner' ? 'Vuestra vida cabe en las noches que el territorio os deja.' : `Afinidad: ${'♥'.repeat(Math.ceil(p.af / 3)) || '·'}`}`,
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

// La vida cruel puede romper un vínculo sin que tú lo elijas: humanidad
// muy baja, o el peligro constante, enfrían hasta lo bueno.
export function heartsTick() {
  ensureHearts();
  const pt = partner();
  if (!pt) return;
  if (G.rep.humanidad <= 20 && chance(0.02)) {
    G.pending.push('vinculo_roto:' + G.relations.partner);
  }
}

function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
