// Rete prima (così vedi subito scheda/dieta aggiornate), cache se sei offline.
const CACHE = "palestra-v4";
const FILES = ["./", "index.html", "styles.css", "app.js", "data.js", "manifest.webmanifest", "icon-180.png", "icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)));
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    // "no-cache": chiede sempre al server se il file è cambiato, così le modifiche arrivano subito
    fetch(e.request.url, { cache: "no-cache" })
      .then(r => { const copia = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copia)); return r; })
      .catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
