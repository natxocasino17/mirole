# MIROLE — Documento de diseño (sin spoilers)

## Los cuatro pilares anti-aburrimiento

1. **Peso emocional real.** Permadeath con despedidas. Cementerio permanente.
   Traumas que cambian a la gente. Perder a alguien tras años debe doler.
2. **Escasez absoluta.** Eventos míticos a ~0.4% por día de viaje; objetos
   secretos a 0.05% por tiroteo. El hype se cocina en años, no en semanas.
3. **Arquitectura modular.** Motor (`js/engine/`) separado del contenido
   (`js/data/`). Las expansiones son datos nuevos, no reescrituras.
4. **Ritual diario.** Sesiones de 10–60 min: una visita a la cantina + un
   trabajo = una sesión completa con progreso visible.

## La regla de oro de ingeniería

- **Inmortalidad tecnológica:** PWA sin dependencias. Todo el estado en un
  JSON plano (`schema` versionado + migraciones en `state.js`).
- **Legado y generaciones:** el protagonista envejece (decadencia física
  desde los 45). El primer nombre no muere de bala perdida: cae malherido o
  en coma («el mito»). El traspaso generacional llegará como módulo cuando
  la primera generación esté madura.
- **Narrativa emergente:** el Director (`director.js`) lee variables (dinero,
  estrés, lealtades, secretos) y genera escenas. La traición requiere
  secreto oculto + ocasión + resentimiento: nunca es un dado suelto.

## Esqueleto matemático del combate

**Turnos:** iniciativa = `reflejos + 1d20`, recalculada por ronda.

**Posición:** cada unidad está `delante` o `atrás`. Distancia entre tirador
y blanco = suma de "atrás" de ambos → corta (0), media (1), larga (2).
El acero (melee) exige distancia 0.

**Precisión de disparo:**
```
acc = acc_arma + punteria×0.5 + apuntado(+15) + mod_distancia_del_arma
    − cobertura_blanco(20) − intimidado(20) − estrés>70(10) − brazo_herido(5)
clamp [5, 95]
```

**Encasquillamiento** (por disparo, antes de resolver):
```
p_jam = jam_base_del_arma + max(0, 70 − durabilidad) × 0.004
```
Cada disparo: durabilidad −1. A 0%: el arma se ROMPE (reparación en el
almacén a ⅓ del precio).

**Daño y localización:** 1d100 → 51–85 extremidad (daño −1, riesgo de
secuela permanente si daño ≥3: cojera −5 reflejos, brazo rígido −5 puntería),
86–100 cabeza (daño ×2), resto torso. HP humanos: 4–8. Dos balas bien
puestas matan a cualquiera.

**Factor miedo:** una línea de intimidación (solo ronda 1, requiere fama ≥8)
aplica −20 de precisión durante 2 turnos a enemigos con
`voluntad < 35 + fama/4 (+10 si humanidad < 30)`.

**Moral enemiga:** con la mitad de su grupo caído, voluntad <40 → 35% de huir.

**El destino al caer (PC a 0 HP):**
- Protagonista (1ª generación): 55% malherido (8–18 días + secuela),
  45% coma (18–35 días, +4 fama: el mito crece). No muere de bala perdida.
- Resto: 30% muerte permanente (despedida + tumba), 45% malherido
  (7–21 días + secuela), 25% inconsciente (2–5 días).

**Salidas alternativas:** huir (chequeo de reflejos medio del grupo; fallar
= disparos gratis enemigos; −2 fama) o pagar (mitad del dinero, −4 fama,
−3 lealtad de toda la banda).

## Economía (sumidero tenso)

Semanal: soldadas + $2/cabeza de comida (+1 por animal). No pagar: −8
lealtad a todos y contador de hambre para el Director. Balas $4/12.
Trabajos $20–90. La riqueza no debe llegar nunca a ser aburrida.

## Skills (aprender haciendo)

`punteria, reflejos, voluntad, vigor, labia, sigilo` (15–90). XP por uso
real: disparar, esquivar, negociar, contrabandear. Umbral creciente:
`4 + skill/8`. La vejez descuenta: −1 reflejos/año desde los 45; vigor y
puntería desde los 55.

## Estrés y traumas

Estrés 0–100. A 100: crisis → trauma permanente (mano temblorosa, insomne,
bebedor, corazón frío) y baja a 60. Se drena con descanso, whisky (con
riesgo), el perro, y eventos.

## Hoja de ruta por temporadas (módulos futuros)

- **T2 — Blackvein City:** la ciudad industrial como segundo mapa; facciones
  urbanas; negocios propios (sumidero + ingreso pasivo arriesgado).
- **T3 — El traspaso:** muerte/retiro del protagonista; heredero; el mito
  fundacional afecta a la 2ª generación.
- **T4 — La guerra del ferrocarril:** el evento que parte la historia del
  territorio en dos.
- **Siempre:** más eventos al pool del Director, más míticos, más secretos.
  Cada parche = archivos nuevos en `js/data/`.
