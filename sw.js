// Monitor RIC — Service Worker v4.2
// Cache-first do shell. Não cacheia chamadas a APIs externas.
const CACHE_NAME = "monitor-ric-v4-2";
const SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-512-maskable.png",
  "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(c => c.addAll(SHELL).catch(err => {
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
  // Não interceptar chamadas a APIs externas — passa direto pra rede
  const apisExternas = [
    "dadosabertos.camara.leg.br",
    "legis.senado.leg.br",
    "generativelanguage.googleapis.com",
    "corsproxy.io",
    "allorigins.win"
  ];
  if (apisExternas.some(d => url.hostname.includes(d))) return;
  if (e.request.method !== "GET") return;
  // stale-while-revalidate para o shell
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
