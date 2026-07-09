// MIROLE — esquema de armas y objetos. Las armas son instancias con
// durabilidad propia: se desgastan con cada disparo, se encasquillan
// según su estado y pueden ROMPERSE. Los objetos secretos existen,
// pero casi nadie los verá jamás. Así debe ser.
//
// dmg: [min,max] · mods: bonus de precisión por distancia [corta,media,larga]
// jam: prob. base de encasquillarse · mag: cargador · ammo: tipo de munición

export const WEAPONS = {
  navaja:       { name: 'Navaja',            type: 'blanca',   dmg: [1, 3], acc: 46, dur: 60,  price: 4,
                  desc: 'Silenciosa. Íntima. Fea de usar.' },
  bowie:        { name: 'Cuchillo Bowie',    type: 'blanca',   dmg: [2, 4], acc: 46, dur: 85,  price: 12,
                  desc: 'Un cuchillo con ambiciones de machete.' },
  colmillos:    { name: 'Colmillos',         type: 'blanca',   dmg: [1, 3], acc: 52, dur: 100, price: 0,
                  desc: 'No se compran. Se sufren.' },
  colt_oxidado: { name: 'Revólver oxidado',  type: 'revolver', dmg: [2, 4], mods: [10, 0, -20], acc: 32,
                  mag: 6, jam: 0.05, dur: 55, ammo: 'balas', price: 16,
                  desc: 'Dispara. Casi siempre.' },
  colt_saa:     { name: 'Colt SAA',          type: 'revolver', dmg: [2, 5], mods: [10, 0, -15], acc: 45,
                  mag: 6, jam: 0.02, dur: 90, ammo: 'balas', price: 48,
                  desc: 'El pacificador. Irónico, ¿verdad?' },
  recortada:    { name: 'Escopeta recortada', type: 'escopeta', dmg: [3, 6], mods: [20, -10, -45], acc: 40,
                  mag: 2, jam: 0.03, dur: 80, ammo: 'cartuchos', price: 40,
                  desc: 'A dos metros, es un argumento irrefutable.' },
  winchester:   { name: 'Winchester 1873',   type: 'rifle',    dmg: [3, 5], mods: [-10, 5, 15], acc: 42,
                  mag: 8, jam: 0.02, dur: 85, ammo: 'balas', price: 62,
                  desc: 'El arma que conquistó el Oeste. Pregunta a los conquistados.' },
  el_juez:      { name: '«El Juez»',         type: 'revolver', dmg: [3, 6], mods: [12, 5, -10], acc: 60,
                  mag: 6, jam: 0.004, dur: 100, ammo: 'balas', price: 0, unique: true,
                  desc: 'El revólver del gobernador muerto. Nunca se encasquilla. Nunca perdona.' }
};

export const GOODS = {
  whisky:       { name: 'Botella de whisky', price: 3,  desc: 'Anestesia del alma. −12 de estrés.' },
  vendas:       { name: 'Vendas',            price: 5,  heal: 2, desc: 'Para seguir sangrando por dentro.' },
  botiquin:     { name: 'Botiquín',          price: 14, heal: 5, desc: 'Aguja, hilo, láudano y suerte.' },
  kit_limpieza: { name: 'Kit de limpieza',   price: 8,  uses: 3, desc: 'Un arma limpia es un amigo fiel. +25 de estado.' },
  balas:        { name: 'Caja de balas (12)',  price: 4, ammo: 'balas', n: 12, desc: 'Cada una cuesta lo que vale una vida.' },
  cartuchos:    { name: 'Cartuchos (8)',     price: 5, ammo: 'cartuchos', n: 8, desc: 'Truenos envasados.' },
  // ---- objetos secretos: probabilidades ínfimas, para dentro de años ----
  moneda_marcada: { name: 'Moneda marcada',  price: 0, secret: true,
                    desc: 'Cara: vives. Cruz: también, pero peor. Alguien la marcó por algo.' },
  fotografia:     { name: 'Fotografía descolorida', price: 0, secret: true,
                    desc: 'Nadie sonríe en ella. Aun así, duele mirarla.' },
  botella_niebla: { name: 'Botella sin etiqueta',   price: 0, secret: true,
                    desc: 'De la taberna que no existe. Sabe a un recuerdo bueno.' }
};

export function mkWeapon(id) {
  const d = WEAPONS[id];
  return { kind: 'weapon', def: id, dur: d.dur, load: d.mag || 0, broken: false };
}
export function mkGood(id) {
  return { kind: 'good', def: id, uses: GOODS[id].uses || 1 };
}
export function itemName(it) {
  return it.kind === 'weapon' ? WEAPONS[it.def].name : GOODS[it.def].name;
}

// Inventario del Almacén de Marrow Creek (los precios respiran un poco).
export const SHOP = ['balas', 'cartuchos', 'vendas', 'botiquin', 'kit_limpieza', 'whisky',
                     'bowie', 'colt_oxidado', 'colt_saa', 'recortada', 'winchester'];

// Botín corriente que puede caer tras un tiroteo.
export const LOOT_GOODS = ['vendas', 'whisky', 'kit_limpieza', 'botiquin'];
