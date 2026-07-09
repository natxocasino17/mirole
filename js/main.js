// MIROLE — arranque. Carga la partida si existe; si no, la pantalla de
// título. Registra el service worker para que el juego viva sin internet.
import * as S from './engine/state.js';
import * as D from './engine/director.js';
import * as UI from './ui/ui.js';

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

UI.init();

const g = S.load();
if (g) {
  D.awayCatchup();   // el mundo se movió un poco mientras no estabas
  S.save();
  UI.boot();
} else {
  UI.title();
}
