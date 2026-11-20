/* 집예보 서비스 워커: 항상 최신(네트워크 우선), 끊기면 저장해 둔 화면으로 */
const V = 'jdj-v106';
const SHELL = ['/jangdaejang-calc/', '/jangdaejang-calc/buy/', '/jangdaejang-calc/switch/', '/jangdaejang-calc/buy/report/', '/jangdaejang-calc/villa/', '/jangdaejang-calc/chungyak/', '/jangdaejang-calc/bunyang/', '/jangdaejang-calc/tax/', '/jangdaejang-calc/premium/', '/jangdaejang-calc/mine/', '/jangdaejang-calc/ask/', '/jangdaejang-calc/jeonse/', '/jangdaejang-calc/jeonse/checklist/', '/jangdaejang-calc/terms/', '/jangdaejang-calc/refund/', '/jangdaejang-calc/privacy/', '/jangdaejang-calc/about/', '/jangdaejang-calc/ad/', '/jangdaejang-calc/login/',
  '/jangdaejang-calc/tax/tax-engine.js', '/jangdaejang-calc/tax/adjusted-areas.js', '/jangdaejang-calc/tax/tax-ui.js', '/jangdaejang-calc/switch/switch-core.js?v=1', '/jangdaejang-calc/assets/rec-core.js?v=1', '/jangdaejang-calc/assets/rent-core.js?v=1', '/jangdaejang-calc/assets/mine-core.js?v=11', '/jangdaejang-calc/assets/ask-core.js?v=2', '/jangdaejang-calc/assets/ask.js?v=1', '/jangdaejang-calc/assets/price-sheet.js?v=10', '/jangdaejang-calc/assets/offi-core.js?v=2', '/jangdaejang-calc/assets/offi-view.js?v=2', '/jangdaejang-calc/tax/offi-tax.js?v=1', '/jangdaejang-calc/assets/plain-words.js?v=6', '/jangdaejang-calc/chungyak/cy-engine.js?v=2',
  '/jangdaejang-calc/assets/agents.js', '/jangdaejang-calc/assets/config.js?v=1', '/jangdaejang-calc/assets/auth.js?v=1', '/jangdaejang-calc/assets/area-watch.js?v=1', '/jangdaejang-calc/assets/ads.js', '/jangdaejang-calc/assets/kchat.js?v=1', '/jangdaejang-calc/assets/vendor/qrcode-generator.js?v=1.4.4', '/jangdaejang-calc/assets/region-notes.js', '/jangdaejang-calc/assets/policy-view.js?v=1', '/jangdaejang-calc/assets/track.js', '/jangdaejang-calc/assets/stat.js?v=3',
  '/jangdaejang-calc/assets/pwa.js', '/jangdaejang-calc/assets/pay.js?v=1', '/jangdaejang-calc/assets/pay.css?v=1', '/jangdaejang-calc/assets/biz.js', '/jangdaejang-calc/assets/sale-status.js?v=1', '/jangdaejang-calc/assets/og/default.png', '/jangdaejang-calc/assets/loan-core.js?v=1', '/jangdaejang-calc/assets/share.js?v=3', '/jangdaejang-calc/assets/aplus.css?v=41', '/jangdaejang-calc/assets/icons/icon-192.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin) return;           // 구글 시트·GA 등 외부는 그대로
  if (!u.pathname.startsWith('/jangdaejang-calc/') && !u.pathname.startsWith('/jangdaejang-data/')) return;
  if (u.pathname.startsWith('/jangdaejang-calc/premium/') && u.search) return;   // 결제·열람 주소(결제키·열람 토큰)는 기기 캐시에 남기지 않음
  if (u.pathname.startsWith('/jangdaejang-calc/login/') && u.search) return;     // 카카오 인가 코드가 담긴 주소는 기기 캐시에 남기지 않음
  e.respondWith((async () => {
    const c = await caches.open(V);
    try {
      const res = await fetch(r, { cache: 'no-cache' });   // 휴대폰 브라우저에 남은 옛 파일 대신 항상 새로 확인
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
