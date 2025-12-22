const CACHE_NAME = 'thiaguinho-arcade-final-v1';
const ASSETS = [
    './',
    './index.html',
    './jogos.html',
    './js/app.js',
    './manifest.json',
    './assets/mascote.glb',
    './assets/mascote_perfil.jpg'
];

self.addEventListener('install', e => {
    e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)));
});

self.addEventListener('fetch', e => {
    e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});