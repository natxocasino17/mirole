// MIROLE — esquema de armas, mejoras, ropa, talismanes y objetos.
// Las armas son instancias con durabilidad propia: se desgastan, se
// encasquillan según su estado y pueden ROMPERSE. En el armero se
// mejoran (muelles, miras, cargadores, culatas) y las mejoras viven en
// la instancia: tu Colt mejorado es TU Colt, no un Colt cualquiera.
//
// dmg: [min,max] · mods: precisión por distancia [corta,media,larga]
// jam: prob. base de encasquillarse · mag: cargador · ammo: munición

export const WEAPONS = {
  navaja:       { name: 'Navaja',            type: 'blanca',   dmg: [1, 3], acc: 46, dur: 60,  price: 4,
                  desc: 'Silenciosa. Íntima. Fea de usar.' },
  bowie:        { name: 'Cuchillo Bowie',    type: 'blanca',   dmg: [2, 4], acc: 46, dur: 85,  price: 12,
                  desc: 'Un cuchillo con ambiciones de machete.' },
  machete:      { name: 'Machete',           type: 'blanca',   dmg: [3, 5], acc: 42, dur: 90,  price: 22,
                  desc: 'Abre caminos. Y otras cosas.' },
  colmillos:    { name: 'Colmillos',         type: 'blanca',   dmg: [1, 3], acc: 52, dur: 100, price: 0,
                  desc: 'No se compran. Se sufren.' },
  derringer:    { name: 'Derringer',         type: 'revolver', dmg: [2, 4], mods: [15, -25, -60], acc: 38,
                  mag: 2, jam: 0.03, dur: 70, ammo: 'balas', price: 14,
                  desc: 'Cabe en una manga. Los funerales que ha causado, no.' },
  colt_oxidado: { name: 'Revólver oxidado',  type: 'revolver', dmg: [2, 4], mods: [10, 0, -20], acc: 32,
                  mag: 6, jam: 0.05, dur: 55, ammo: 'balas', price: 16,
                  desc: 'Dispara. Casi siempre.' },
  schofield:    { name: 'Schofield',         type: 'revolver', dmg: [2, 5], mods: [10, 0, -12], acc: 42,
                  mag: 6, jam: 0.025, dur: 85, ammo: 'balas', price: 38,
                  desc: 'Recarga rápida, conciencia lenta.' },
  colt_saa:     { name: 'Colt SAA',          type: 'revolver', dmg: [2, 5], mods: [10, 0, -15], acc: 45,
                  mag: 6, jam: 0.02, dur: 90, ammo: 'balas', price: 48,
                  desc: 'El pacificador. Irónico, ¿verdad?' },
  remington:    { name: 'Remington 1875',    type: 'revolver', dmg: [3, 5], mods: [8, 2, -12], acc: 47,
                  mag: 6, jam: 0.018, dur: 95, ammo: 'balas', price: 68,
                  desc: 'El revólver de los que planean llegar a viejos.' },
  recortada:    { name: 'Escopeta recortada', type: 'escopeta', dmg: [3, 6], mods: [20, -10, -45], acc: 40,
                  mag: 2, jam: 0.03, dur: 80, ammo: 'cartuchos', price: 40,
                  desc: 'A dos metros, es un argumento irrefutable.' },
  doble:        { name: 'Escopeta de dos caños', type: 'escopeta', dmg: [4, 7], mods: [18, -8, -40], acc: 42,
                  mag: 2, jam: 0.02, dur: 95, ammo: 'cartuchos', price: 75,
                  desc: 'Dos opiniones, las dos definitivas.' },
  winchester:   { name: 'Winchester 1873',   type: 'rifle',    dmg: [3, 5], mods: [-10, 5, 15], acc: 42,
                  mag: 8, jam: 0.02, dur: 85, ammo: 'balas', price: 62,
                  desc: 'El arma que conquistó el Oeste. Pregunta a los conquistados.' },
  sharps:       { name: 'Sharps «Big Fifty»', type: 'rifle',   dmg: [5, 9], mods: [-25, 0, 25], acc: 40,
                  mag: 1, jam: 0.015, dur: 90, ammo: 'balas', price: 110,
                  desc: 'Un solo tiro. Suele bastar. Tiene que bastar.' },
  el_juez:      { name: '«El Juez»',         type: 'revolver', dmg: [3, 6], mods: [12, 5, -10], acc: 60,
                  mag: 6, jam: 0.004, dur: 100, ammo: 'balas', price: 0, unique: true,
                  desc: 'El revólver del gobernador muerto. Nunca se encasquilla. Nunca perdona.' }
};

// ---- mejoras del armero: una vez cada una, viven en la instancia ----
export const UPGRADES = {
  muelles:  { name: 'Muelles pulidos',    price: 15, desc: 'Se encasquilla menos.' },
  mira:     { name: 'Mira ajustada',      price: 20, desc: '+5 de precisión.' },
  cargador: { name: 'Cargador ampliado',  price: 25, desc: '+2 balas por carga.' },
  culata:   { name: 'Refuerzo de culata', price: 18, desc: '+20 de durabilidad máxima. Bien duradera.' }
};

// Estadísticas efectivas de una instancia (base + mejoras).
export function effAcc(w)    { const d = WEAPONS[w.def]; return d.acc + ((w.up || []).includes('mira') ? 5 : 0); }
export function effMag(w)    { const d = WEAPONS[w.def]; return (d.mag || 0) + ((w.up || []).includes('cargador') ? 2 : 0); }
export function effJam(w)    { const d = WEAPONS[w.def]; return Math.max(0.002, (d.jam || 0) - ((w.up || []).includes('muelles') ? 0.012 : 0)); }
export function effDurMax(w) { const d = WEAPONS[w.def]; return d.dur + ((w.up || []).includes('culata') ? 20 : 0); }

export const GOODS = {
  whisky:       { name: 'Botella de whisky', price: 3,  desc: 'Anestesia del alma. −12 de estrés.' },
  vendas:       { name: 'Vendas',            price: 5,  heal: 3, desc: 'Para seguir sangrando por dentro.' },
  botiquin:     { name: 'Botiquín',          price: 14, heal: 5, desc: 'Aguja, hilo, láudano y suerte.' },
  kit_limpieza: { name: 'Kit de limpieza',   price: 8,  uses: 3, desc: 'Un arma limpia es un amigo fiel. +25 de estado.' },
  balas:        { name: 'Caja de balas (12)',  price: 4, ammo: 'balas', n: 12, desc: 'Cada una cuesta lo que vale una vida.' },
  cartuchos:    { name: 'Cartuchos (8)',     price: 5, ammo: 'cartuchos', n: 8, desc: 'Truenos envasados.' },
  // ---- objetos secretos y de historia ----
  moneda_marcada: { name: 'Moneda marcada',  price: 0, secret: true,
                    desc: 'Cara: vives. Cruz: también, pero peor. Alguien la marcó por algo.' },
  fotografia:     { name: 'Fotografía descolorida', price: 0, secret: true,
                    desc: 'Nadie sonríe en ella. Aun así, duele mirarla.' },
  botella_niebla: { name: 'Botella sin etiqueta',   price: 0, secret: true,
                    desc: 'De la taberna que no existe. Sabe a un recuerdo bueno.' },
  foto_banda:     { name: 'Fotografía de la banda', price: 0, secret: true, uses: 999, look: 8,
                    desc: 'Todos salís serios. Todos estabais contentos. −8 de estrés al mirarla.' }
};

// ---- ropa y accesorios: estilo con consecuencias pequeñas ----
// fx aplica bonus pasivos: punteria, reflejos, voluntad.
export const ROPA = {
  stetson:        { name: 'Stetson gris',        slot: 'sombrero',  price: 12, fx: { punteria: 1 }, desc: 'Sombra para los ojos, ventaja para el gatillo.' },
  sombrero_negro: { name: 'Sombrero negro',      slot: 'sombrero',  price: 15, fx: { voluntad: 1 }, desc: 'Nadie pregunta dos veces a un sombrero negro.' },
  bombin:         { name: 'Bombín de ciudad',    slot: 'sombrero',  price: 10, fx: {}, desc: 'En Blackvein abre puertas. Aquí abre apuestas.' },
  gabardina_cuero:{ name: 'Gabardina de cuero',  slot: 'gabardina', price: 30, fx: { voluntad: 2 }, desc: 'Pesa como una coraza. A veces lo es.' },
  gabardina_gris: { name: 'Gabardina gris de polvo', slot: 'gabardina', price: 22, fx: { reflejos: 1 }, desc: 'El color exacto del camino. Cuesta verte llegar.' },
  poncho:         { name: 'Poncho del sur',      slot: 'gabardina', price: 16, fx: { punteria: 1 }, desc: 'Esconde la mano. Y lo que la mano sostiene.' },
  botas_montar:   { name: 'Botas de montar',     slot: 'botas',     price: 14, fx: { reflejos: 2 }, desc: 'Suela gastada en el estribo, no en la iglesia.' },
  botas_serpiente:{ name: 'Botas de piel de víbora', slot: 'botas', price: 28, fx: { voluntad: 1, reflejos: 1 }, desc: 'La víbora perdió. Que se sepa.' },
  panuelo_rojo:   { name: 'Pañuelo rojo',        slot: 'accesorio', price: 6,  fx: { punteria: 1 }, desc: 'Para el polvo, el sudor y los adioses.' },
  reloj_plata:    { name: 'Reloj de plata',      slot: 'accesorio', price: 20, fx: { voluntad: 2 }, desc: 'Se paró hace años. Sigues mirándolo.' },
  // ---- talismanes: no se compran; se encuentran, si el territorio quiere ----
  colmillo_lobo:  { name: '☽ Colmillo de lobo',  slot: 'accesorio', price: 0, secret: true, fx: { voluntad: 3 },
                    desc: 'El tratante juró que protege. El lobo opinaría distinto.' },
  totem_cuervo:   { name: '☽ Tótem del cuervo',  slot: 'accesorio', price: 0, secret: true, fx: { reflejos: 2, voluntad: 1 },
                    desc: 'Madera negra, más vieja que el territorio. Susurra. O es el viento. O no.' },
  moneda_ahorcado:{ name: '☽ Moneda del ahorcado', slot: 'accesorio', price: 0, secret: true, fx: {}, luck: true,
                    desc: 'Pagó una soga y sobró esto. Dicen que la muerte no cobra dos veces la misma moneda.' }
};

export function mkWeapon(id) {
  const d = WEAPONS[id];
  return { kind: 'weapon', def: id, dur: d.dur, load: d.mag || 0, broken: false, up: [] };
}
export function mkGood(id) {
  return { kind: 'good', def: id, uses: GOODS[id].uses || 1 };
}
export function mkRopa(id) {
  return { kind: 'ropa', def: id, spent: false };
}
export function itemName(it) {
  if (it.kind === 'weapon') return WEAPONS[it.def].name;
  if (it.kind === 'ropa') return ROPA[it.def].name;
  return GOODS[it.def].name;
}
export function itemDef(it) {
  return it.kind === 'weapon' ? WEAPONS[it.def] : it.kind === 'ropa' ? ROPA[it.def] : GOODS[it.def];
}

// ---- los comercios de Marrow Creek ----
export const SHOP_ALMACEN = ['balas', 'cartuchos', 'vendas', 'botiquin', 'kit_limpieza', 'whisky'];
export const SHOP_ARMERO  = ['derringer', 'bowie', 'machete', 'colt_oxidado', 'schofield', 'colt_saa',
                             'remington', 'recortada', 'doble', 'winchester', 'sharps'];
export const SHOP_SASTRE  = ['stetson', 'sombrero_negro', 'bombin', 'gabardina_gris', 'poncho',
                             'gabardina_cuero', 'botas_montar', 'botas_serpiente', 'panuelo_rojo', 'reloj_plata'];

export const HORSES = {
  jamelgo:    { name: 'Jamelgo',    price: 25,  tier: 1, desc: 'Feo, lento y vivo. Dos de tres cambian con los años.' },
  mustang:    { name: 'Mustang',    price: 60,  tier: 2, desc: 'Medio salvaje. La mitad buena.' },
  purasangre: { name: 'Purasangre', price: 130, tier: 3, desc: 'Corre como una deuda. Come como dos.' }
};

// Botín corriente que puede caer tras un tiroteo.
export const LOOT_GOODS = ['vendas', 'whisky', 'kit_limpieza', 'botiquin'];
// Talismanes: rarísimos. Puede que pasen años. Así debe ser.
export const LOOT_TALISMANS = ['colmillo_lobo', 'totem_cuervo', 'moneda_ahorcado'];
