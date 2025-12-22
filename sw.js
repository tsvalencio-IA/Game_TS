const CACHE_NAME = 'ts-game-v1.0.0';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './style.css',
    './manifest.json',
    './js/game-logic.js',
    './assets/models/thiaguinho_animado.glb'
];

// Instalação: Salva arquivos no cache
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('SW: Cache aberto');
                return cache.addAll(ASSETS_TO_CACHE);
            })
    );
});

// Ativação: Limpa caches antigos
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME) {
                        console.log('SW: Limpando cache antigo');
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
});

// Busca: Serve do cache se disponível, senão vai para a rede
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    return response;
                }
                return fetch(event.request);
            })
    );
});
