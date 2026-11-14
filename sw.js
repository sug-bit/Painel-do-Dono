// Service worker: guarda o app no aparelho para abrir mesmo sem internet.
// Estratégia: tenta a rede primeiro e usa a cópia guardada se estiver offline.
// Ao mudar arquivos do app, troque o número da versão abaixo.
const VERSAO = "pdd-v4";
const BASE = ["./", "index.html", "css/style.css", "js/app.js", "manifest.webmanifest", "icons/icon-192.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSAO).then(c => c.addAll(BASE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSAO).map(k => caches.delete(k)))).then(() => clients.claim()));
});
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    fetch(e.request)
      .then(r => { const copia = r.clone(); caches.open(VERSAO).then(c => c.put(e.request, copia)).catch(() => {}); return r; })
      .catch(() => caches.match(e.request))
  );
});
