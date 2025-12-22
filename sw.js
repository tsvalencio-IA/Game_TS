// sw.js - Service Worker com estratégia Network First

const CACHE_NAME = 'thiaguinho-arcade-v2';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './jogos.html',
  './js/app.js',
  './assets/mascote_perfil.jpg'
  // Nota: Não colocamos o .glb aqui para evitar travar o cache inicial se for muito grande.
  // O navegador fará o cache dele automaticamente após o primeiro uso.
];

// 1. Instalação: Salva os arquivos iniciais
self.addEventListener('install', (event) => {
  self.skipWaiting(); // Força o SW a assumir o controle imediatamente
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching arquivos do Arcade');
        return cache.addAll(ASSETS_TO_CACHE);
      })
  );
});

// 2. Ativação: Limpa caches antigos (importante para quem já usou a versão antiga)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME) {
          console.log('[Service Worker] Removendo cache antigo:', key);
          return caches.delete(key);
        }
      }));
    })
  );
  self.clients.claim();
});

// 3. Interceptação (Fetch): Tenta Rede primeiro, se falhar usa Cache (Modo Offline)
self.addEventListener('fetch', (event) => {
  // Ignora requisições externas (CDNs, Google Fonts, etc) para não dar erro de CORS no cache
  if (!event.request.url.startsWith(self.location.origin)) {
      return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Se a resposta for válida, clonamos e atualizamos o cache
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const responseToCache = response.clone();
        caches.open(CACHE_NAME)
          .then((cache) => {
            cache.put(event.request, responseToCache);
          });
        return response;
      })
      .catch(() => {
        // Se der erro na rede (offline), tenta pegar do cache
        return caches.match(event.request);
      })
  );
});
