// Service worker: guarda o app no aparelho para abrir mesmo sem internet.
// Estratégia: rede primeiro, cópia guardada se estiver offline.
// Só guarda arquivos do próprio app e das bibliotecas/fontes (nunca dados financeiros
// nem respostas de outros domínios, como o Google Sheets).
// Ao mudar arquivos do app, troque o número da versão abaixo.
const VERSAO = "pdd-v15";
const BASE = ["./", "index.html", "css/style.css", "js/captura.js", "js/dados.js", "js/app.js", "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png", "icons/maskable-512.png"];
const EXTERNOS = ["cdnjs.cloudflare.com", "fonts.googleapis.com", "fonts.gstatic.com"];

self.addEventListener("install", e => {
  // allSettled: um arquivo faltando não impede a instalação inteira.
  e.waitUntil(caches.open(VERSAO).then(c => Promise.allSettled(BASE.map(u => c.add(u)))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSAO).map(k => caches.delete(k)))).then(() => clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin && !EXTERNOS.includes(url.hostname)) return; // deixa passar direto
  e.respondWith(
    fetch(req)
      .then(r => {
        if (r.ok || r.type === "opaque") { const copia = r.clone(); caches.open(VERSAO).then(c => c.put(req, copia)).catch(() => { }); }
        return r;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then(m => m || (req.mode === "navigate" ? caches.match("index.html") : Response.error())))
  );
});
