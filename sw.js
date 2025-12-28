/**
 * thIAguinho Arcade - Service Worker v1.0
 * Estratégia: Cache First (Assets) + Network First (Lógica)
 */

const CACHE_NAME = 'thiaguinho-arcade-v1-static';

// Lista de ativos críticos para o jogo funcionar
// Inclui arquivos locais e bibliotecas CDN essenciais
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './jogos.html',
    './js/app.js',
    './manifest.json',
    './assets/estrada.jpg',
    './assets/mascote.glb',
    'https://cdn.tailwindcss.com',
    'https://cdn.jsdelivr.net/npm/boxicons@2.1.4/css/boxicons.min.css',
    'https://cdn.jsdelivr.net/npm/three@0.146.0/build/three.min.js',
    'https://cdn.jsdelivr.net/npm/three@0.146.0/examples/js/loaders/GLTFLoader.js',
    'https://cdn.jsdelivr.net/npm/three@0.146.0/examples/js/loaders/DRACOLoader.js'
];

// 1. INSTALAÇÃO: Cachear todos os arquivos estáticos
self.addEventListener('install', (event) => {
    console.log('[SW] Instalando Service Worker...');
    
    // Força o SW a assumir controle imediatamente, não espera fechar a aba
    self.skipWaiting();

    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SW] Cacheando arquivos do App Shell');
            return cache.addAll(ASSETS_TO_CACHE);
        }).catch((err) => {
            console.error('[SW] Falha no pré-cache:', err);
        })
    );
});

// 2. ATIVAÇÃO: Limpar caches antigos se houver atualização de versão
self.addEventListener('activate', (event) => {
    console.log('[SW] Ativando e limpando caches antigos...');
    
    event.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                if (key !== CACHE_NAME) {
                    console.log('[SW] Removendo cache antigo:', key);
                    return caches.delete(key);
                }
            }));
        })
    );
    // Garante que o SW controle todas as abas abertas imediatamente
    return self.clients.claim();
});

// 3. INTERCEPTAÇÃO (FETCH): Servir do cache, senão buscar na rede
self.addEventListener('fetch', (event) => {
    // Ignora requisições que não sejam GET (ex: analytics, posts)
    if (event.request.method !== 'GET') return;

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            // Se achou no cache, retorna o cache
            if (cachedResponse) {
                return cachedResponse;
            }

            // Se não, busca na rede
            return fetch(event.request).then((networkResponse) => {
                // Verifica se a resposta é válida
                if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic' && networkResponse.type !== 'cors') {
                    return networkResponse;
                }

                // Clona a resposta para salvar no cache para a próxima vez
                const responseToCache = networkResponse.clone();

                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseToCache);
                });

                return networkResponse;
            }).catch(() => {
                // Se estiver offline e não tiver no cache
                // Aqui poderíamos retornar uma página de "Você está offline" customizada
                console.log('[SW] Offline e sem cache para:', event.request.url);
            });
        })
    );
});
