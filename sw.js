const CACHE_NAME = 'thiaguinho-kinet-v7';
const ASSETS = [
    './',
    './index.html',
    './jogos.html',
    './js/app.js',
    './manifest.json',
    './assets/mascote_perfil.jpg'
];

self.addEventListener('install', (e) => {
    self.skipWaiting();
    e.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(ASSETS)));
});

self.addEventListener('activate', (e) => {
    e.waitUntil(caches.keys().then((ks) => Promise.all(ks.map(k => k !== CACHE_NAME && caches.delete(k)))));
    self.clients.claim();
});

self.addEventListener('fetch', (e) => {
    if (!e.request.url.startsWith(self.location.origin)) return;
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});