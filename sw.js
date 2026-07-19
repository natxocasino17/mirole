/* MIROLE — service worker. Cache-first: el juego debe abrir sin internet
   en mitad del desierto, de un vuelo o del año 2060. Sube la versión al
   desplegar cambios. */
const V = 'mirole-v0.12.1';
const CORE = [
  './', 'index.html', 'css/style.css', 'manifest.webmanifest',
  'js/main.js',
  'js/engine/rng.js', 'js/engine/state.js', 'js/engine/chars.js',
  'js/engine/time.js', 'js/engine/director.js', 'js/engine/combat.js',
  'js/engine/jobs.js', 'js/engine/poker.js', 'js/engine/casino.js', 'js/engine/range.js', 'js/engine/empire.js',
  'js/data/items.js', 'js/data/names.js', 'js/data/enemies.js',
  'js/data/dialogs.js', 'js/data/events.js', 'js/data/prologue.js',
  'js/data/sidequests.js', 'js/data/tomo1.js', 'js/data/npcs.js', 'js/data/events2.js', 'js/data/gangs.js', 'js/data/people.js',
  'js/engine/hearts.js', 'js/engine/family.js', 'js/engine/cronista.js',
  'js/ui/ui.js',
  'assets/portraits/vane.png', 'assets/sprites/vane_full.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(V).then(c => Promise.allSettled(CORE.map(u => c.add(u)))).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
      const copy = res.clone();
      caches.open(V).then(c => c.put(e.request, copy));
      return res;
    }).catch(() => hit))
  );
});
