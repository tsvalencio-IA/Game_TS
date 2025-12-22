// sw.js - Service Worker Especialista Kinet

const CACHE_NAME = 'thiaguinho-kinet-v1.2.0';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './jogos.html',
  './js/app.js',
  './manifest.json',
  './assets/mascote_perfil.jpg'
];

// INSTALAÇÃO E CACHE INICIAL
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] A criar novo cache de sistema');
        return cache.addAll(ASSETS_TO_CACHE);
      })
  );
});

// ATIVAÇÃO E LIMPEZA DE LIXO
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME) {
          console.log('[SW] A remover cache obsoleto:', key);
          return caches.delete(key);
        }
      }));
    })
  );
  self.clients.claim();
});

// ESTRATÉGIA DE REDE: Tenta Rede, senão Cache
self.addEventListener('fetch', (event) => {
  if (!event.request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') return response;
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
