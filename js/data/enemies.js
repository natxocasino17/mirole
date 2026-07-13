// MIROLE — enemigos. Plantillas ligeras: el combate las convierte en
// unidades con arma propia (durabilidad aleatoria: sus hierros también
// se encasquillan).
import { rint } from '../engine/rng.js';
import { WEAPONS } from './items.js';

export const FOES = {
  maton:     { name: 'Matón',              hp: 4, punteria: 30, reflejos: 35, voluntad: 30, weapon: 'colt_oxidado', loot: [2, 8] },
  pistolero: { name: 'Pistolero',          hp: 5, punteria: 42, reflejos: 45, voluntad: 45, weapon: 'colt_saa',     loot: [5, 14] },
  matarife:  { name: 'Matarife',           hp: 6, punteria: 35, reflejos: 40, voluntad: 50, weapon: 'recortada',    loot: [4, 12] },
  veterano:  { name: 'Forajido veterano',  hp: 6, punteria: 52, reflejos: 48, voluntad: 62, weapon: 'winchester',   loot: [8, 20] },
  perro:     { name: 'Perro de presa',     hp: 3, punteria: 40, reflejos: 60, voluntad: 25, weapon: 'colmillos',    loot: [0, 0] },
  palido:    { name: 'El Forastero Pálido', hp: 8, punteria: 72, reflejos: 65, voluntad: 95, weapon: 'el_juez',     loot: [0, 0] },
  cuervo:    { name: 'Cuervo Rojo',         hp: 5, punteria: 44, reflejos: 46, voluntad: 55, weapon: 'colt_saa',    loot: [4, 12] },
  grey:      { name: 'Ezekiel Grey',        hp: 8, punteria: 60, reflejos: 50, voluntad: 92, weapon: 'winchester',  loot: [0, 0] }
};

export function mkFoe(id, name) {
  const t = FOES[id];
  const wd = WEAPONS[t.weapon];
  return {
    kind: 'en', tpl: id, name: name || t.name,
    hp: t.hp, hpMax: t.hp,
    sk: { punteria: t.punteria, reflejos: t.reflejos, voluntad: t.voluntad },
    w: { kind: 'weapon', def: t.weapon, dur: id === 'palido' ? 100 : rint(35, 80), load: wd.mag || 0, broken: false },
    rank: wd.type === 'rifle' ? 'b' : 'f',
    cover: false, shaken: 0, jam: false,
    dead: false, fled: false, out: false,
    loot: t.loot
  };
}

// Grupos según el riesgo del trabajo (1 a 3).
export function foesForRisk(risk) {
  if (risk <= 1) return [mkFoe('maton'), mkFoe('maton')];
  if (risk === 2) return [mkFoe('maton'), mkFoe('pistolero'), mkFoe('matarife')];
  return [mkFoe('pistolero'), mkFoe('pistolero'), mkFoe('matarife'), mkFoe('veterano')];
}
