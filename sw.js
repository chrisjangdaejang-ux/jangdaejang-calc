/* 장대장 계산기 서비스 워커: 항상 최신(네트워크 우선), 끊기면 저장해 둔 화면으로 */
const V = 'jdj-v10';
const SHELL = ['/jangdaejang-calc/', '/jangdaejang-calc/buy/', '/jangdaejang-calc/switch/', '/jangdaejang-calc/buy/report/',
  '/jangdaejang-calc/assets/agents.js', '/jangdaejang-calc/assets/region-notes.js', '/jangdaejang-calc/assets/track.js',
  '/jangdaejang-calc/assets/pwa.js', '/jangdaejang-calc/assets/icons/icon-192.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin) return;           // 구글 시트·GA 등 외부는 그대로
  if (!u.pathname.startsWith('/jangdaejang-calc/') && !u.pathname.startsWith('/jangdaejang-timing/')) return;
  e.respondWith((async () => {
    const c = await caches.open(V);
    try {
      const res = await fetch(r);
      if (res.ok) c.put(r, res.clone());
      return res;
    } catch (err) {
      const hit = await c.match(r, { ignoreSearch: r.mode === 'navigate' });
      if (hit) return hit;
      if (r.mode === 'navigate') return (await c.match('/jangdaejang-calc/')) || Response.error();
      throw err;
    }
  })());
});
