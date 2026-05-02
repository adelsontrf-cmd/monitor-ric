// Monitor RIC — Service Worker v4
// Cache-first do shell do app. Não cacheia chamadas às APIs externas
// (camara.leg.br, senado.leg.br, generativelanguage.googleapis.com),
// para garantir dados sempre frescos.

const CACHE_NAME = "monitor-ric-v4-2";
const SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(c => c.addAll(SHELL).catch(err => {
      // Falha em algum item não impede instalação
      console.warn("SW: falha em pré-cache parcial:", err);
    }))
  );
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  // Não interceptar chamadas a APIs e proxies — passa direto pra rede
  const apisExternas = [
    "dadosabertos.camara.leg.br",
    "legis.senado.leg.br",
    "generativelanguage.googleapis.com",
    "corsproxy.io",
    "allorigins.win"
  ];
  if (apisExternas.some(d => url.hostname.includes(d))) {
    return; // Default behavior: passa direto pra rede
  }
  // Não interceptar requisições POST/PUT/DELETE
  if (e.request.method !== "GET") return;
  // Strategy: stale-while-revalidate para o shell
  e.respondWith(
    caches.match(e.request).then(cached => {
      const networkFetch = fetch(e.request).then(resp => {
        if (resp && resp.status === 200) {
          const respClone = resp.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, respClone));
        }
        return resp;
      }).catch(() => cached);
      return cached || networkFetch;
    })
  );
});
