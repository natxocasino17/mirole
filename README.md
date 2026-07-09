# MIROLE

**Un western personal. Un juego para toda una vida.**

Territorio de Red Marrow, 1899. Empiezas desde el barro: 26 años, un revólver
oxidado, una tumba recién cavada y una promesa. Lo que construyas encima —
la banda, la fama, las cicatrices, las tumbas — es cosa tuya y de las décadas.

Este juego está hecho para **una sola persona** y diseñado para durar
**80 años de vida real** sin romperse.

---

## Cómo jugarlo

Es una **PWA** (web app instalable). Sin tiendas, sin servidores, sin motores
que caduquen. HTML + CSS + JS puros, cero dependencias.

### Publicarlo (una sola vez)

1. Fusiona esta rama en `main`.
2. En GitHub: **Settings → Pages → Source: Deploy from a branch → `main` / root**.
3. En un minuto tendrás tu juego en `https://<tu-usuario>.github.io/mirole/`.

### Instalarlo en el teléfono

Abre esa URL en el navegador del móvil → menú → **«Añadir a pantalla de
inicio»**. Queda como una app: pantalla completa, icono propio y **funciona
sin internet** (en el avión, en el baño, en 2060).

## Tu partida es TUYA (extracción y traspaso)

- Todo el progreso vive en **un único archivo JSON**.
- **MENÚ → Extraer partida**: descarga `mirole_<año>_dia<N>.json`. Guárdalo
  donde quieras (Drive, correo a ti mismo, un pendrive enterrado en el desierto).
- **MENÚ → Importar partida** en cualquier otro dispositivo (Android, iPhone,
  PC) y sigues exactamente donde estabas.
- Extrae la partida de vez en cuando. Las tumbas no se cavan dos veces.

## Reglas de la casa

- Las balas cuestan dinero y las armas se rompen. Cada disparo es una decisión.
- Si alguien de tu banda muere, **muere para siempre**. Queda su tumba en el
  DIARIO.
- La traición nunca es aleatoria: siempre hubo señales. Aprende a mirar.
- Hay cosas en los caminos con probabilidades ínfimas. Quizá tardes años en
  ver una. Ese día lo recordarás.
- El juego está pensado para sesiones de 10–60 minutos. Entra, vive un poco,
  guarda y vete. El territorio espera.

## ⚠️ NO ABRAS `docs/world-bible.b64`

Ese archivo contiene la biblia secreta del mundo: lo que va a pasar, por qué,
y quién es realmente cada cual. Está codificado a propósito para que no puedas
leerlo por accidente. **Leerlo es hacerle spoiler a tu propia vida.**

Su función: cuando dentro de meses o años quieras una expansión, ábrele una
sesión a Claude y dile *«lee la biblia y continúa mi historia»* junto con tu
JSON de guardado. Él sabrá qué hacer.

## Para futuras expansiones (arquitectura modular)

- `js/engine/` — el motor: combate, tiempo, personajes, Director. Estable.
- `js/data/` — el contenido: eventos, trabajos, enemigos, diálogos, objetos.
  Aquí se añaden capítulos nuevos como parches, sin tocar el motor.
- El guardado lleva `schema`: las migraciones en `state.js` garantizan que
  una partida de 2026 abra en cualquier versión futura.

Ver `DESIGN.md` para las matemáticas del combate y los pilares de diseño.
