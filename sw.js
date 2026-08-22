/* TurnoLibre · trabajador de servicio
   Se instala con copia fresca y sirve de la copia cuando no hay red.
   El nombre del deposito sube en cada despliegue: asi el navegador
   tira lo viejo en vez de servir una version a medias. */
const CACHE = 'turnolibre-v1';

const FICHEROS = [
  './',
  'index.html',
  'css/style.css',
  'js/dominio.js',
  'js/almacen.js',
  'js/estado.js',
  'js/interfaz.js',
  'js/exportar.js',
  'js/vistas/mes.js',
  'js/vistas/horas.js',
  'js/vistas/ajustes.js',
  'js/vistas/bienvenida.js',
  'js/app.js',
  'manifest.json',
  'icono-192.png',
  'icono-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(FICHEROS.map((f) => new Request(f, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then((r) => r || fetch(e.request).catch(() => caches.match('index.html')))
  );
});
