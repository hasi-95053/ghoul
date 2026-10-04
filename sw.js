/* 東京喰種カウンターを電波が無くても開けるようにする（Service Worker）。
   ghoul.html と同じ場所に置く。
   ・電波があるときは毎回ネットから最新版を取り、端末にも保存する
   ・電波が無い／3秒以内に返事が無いときは、端末に保存した版で開く */
const CACHE = "ghoul-v1";
const PAGE = "./ghoul.html";
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.add(PAGE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const key = url.origin + url.pathname;
    const net = fetch(req, { cache: "no-store" }).then(res => {
      if (res && res.ok) cache.put(key, res.clone());
      return res;
    });
    const timeout = new Promise(res => setTimeout(() => res(null), 3000));
    try {
      const r = await Promise.race([net, timeout]);
      if (r) return r;
    } catch (err) {}
    const hit = await cache.match(key) || await cache.match(PAGE);
    if (hit) return hit;
    return net;
  })());
});
