// MIROLE — el casino de «El Cuervo»: blackjack contra la casa y la
// gallera de los sábados. Todo con el RNG del juego: hasta las trampas
// serían honestas aquí, si las hubiera. No las hay. Probablemente.
import { rint, pick, shuffle, chance } from './rng.js';
import { newDeck } from './poker.js';

// ---------- BLACKJACK ----------
export function bjValue(hand) {
  let v = 0, aces = 0;
  for (const c of hand) {
    if (c.r >= 11 && c.r <= 13) v += 10;
    else if (c.r === 14) { v += 11; aces++; }
    else v += c.r;
  }
  while (v > 21 && aces > 0) { v -= 10; aces--; }
  return v;
}

export function bjDeal() {
  const deck = newDeck();
  return { deck, p: [deck.pop(), deck.pop()], d: [deck.pop(), deck.pop()], stage: 'play' };
}

export function bjHit(bj) {
  bj.p.push(bj.deck.pop());
  if (bjValue(bj.p) > 21) bj.stage = 'done';
  return bj;
}

// La casa pide hasta 17, como manda la tradición y el reglamento de Otis.
export function bjStand(bj) {
  while (bjValue(bj.d) < 17) bj.d.push(bj.deck.pop());
  bj.stage = 'done';
  return bj;
}

// Devuelve el multiplicador del pago: 0 pierde, 1 empate, 2 gana, 2.5 blackjack.
export function bjResult(bj) {
  const pv = bjValue(bj.p), dv = bjValue(bj.d);
  const pBJ = pv === 21 && bj.p.length === 2;
  const dBJ = dv === 21 && bj.d.length === 2;
  if (pv > 21) return 0;
  if (pBJ && !dBJ) return 2.5;
  if (dBJ && !pBJ) return 0;
  if (dv > 21) return 2;
  if (pv > dv) return 2;
  if (pv === dv) return 1;
  return 0;
}

// ---------- LA GALLERA ----------
const ROOSTER_NAMES = ['Trueno', 'Napoleón', 'El Sultán', 'Puñales', 'Café',
  'Dinamita', 'El Obispo', 'Relámpago', 'Ceniza', 'El Juez Chico', 'Furia', 'Domingo'];

export function mkRooster(usedName) {
  let name = pick(ROOSTER_NAMES);
  while (name === usedName) name = pick(ROOSTER_NAMES);
  return {
    name,
    ataque: rint(35, 70),
    aguante: rint(35, 70),
    hp: 10
  };
}

export function genFight() {
  const a = mkRooster();
  const b = mkRooster(a.name);
  // Cuotas honestas según los stats: apostar al débil paga más.
  const powerA = a.ataque + a.aguante, powerB = b.ataque + b.aguante;
  const favA = powerA >= powerB;
  return {
    a, b,
    payA: favA ? 1.6 : 2.4,
    payB: favA ? 2.4 : 1.6
  };
}

// Simula la pelea entera y devuelve la lista de asaltos para animarla.
// Los stats mandan; el azar solo despeina.
export function simFight(f) {
  const rounds = [];
  const A = { ...f.a }, B = { ...f.b };
  let turn = A.ataque >= B.ataque ? 0 : 1;
  while (A.hp > 0 && B.hp > 0 && rounds.length < 20) {
    const att = turn === 0 ? A : B;
    const def = turn === 0 ? B : A;
    const hitP = 0.35 + (att.ataque - def.aguante) * 0.005;
    if (chance(Math.max(0.15, Math.min(0.8, hitP)))) {
      const dmg = rint(1, 3) + (att.ataque > 60 ? 1 : 0);
      def.hp -= dmg;
      rounds.push({ att: att.name, def: def.name, dmg, txt: pick([
        `${att.name} entra como un cuchillo: ${def.name} pierde plumas y orgullo`,
        `¡Espolonazo de ${att.name}! ${def.name} retrocede trastabillando`,
        `${att.name} salta por encima y castiga a la bajada`,
        `${att.name} finta, ${def.name} pica el aire, y el castigo llega por el costado`
      ]) });
    } else {
      rounds.push({ att: att.name, def: def.name, dmg: 0, txt: pick([
        `${att.name} ataca y ${def.name} lo esquiva con un quiebro de bailarín`,
        `${att.name} se lanza, pero ${def.name} aguanta el tipo sin perder pluma`,
        `Intercambio de amagos: la arena contiene el aliento`
      ]) });
    }
    turn = 1 - turn;
  }
  return { rounds, winner: A.hp > 0 ? f.a.name : f.b.name };
}
