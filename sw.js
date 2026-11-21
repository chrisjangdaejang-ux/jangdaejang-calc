/* 집예보 서비스 워커: 항상 최신(네트워크 우선), 끊기면 저장해 둔 화면으로 */
const V = 'jdj-v180';
const SHELL = ['/jangdaejang-calc/', '/jangdaejang-calc/buy/', '/jangdaejang-calc/switch/', '/jangdaejang-calc/buy/report/', '/jangdaejang-calc/villa/', '/jangdaejang-calc/chungyak/', '/jangdaejang-calc/bunyang/', '/jangdaejang-calc/bunyang/agency/', '/jangdaejang-calc/partner/', '/jangdaejang-calc/tax/', '/jangdaejang-calc/tax/transfer/', '/jangdaejang-calc/premium/', '/jangdaejang-calc/premium/r/', '/jangdaejang-calc/mine/', '/jangdaejang-calc/ask/', '/jangdaejang-calc/map/', '/jangdaejang-calc/rank/', '/jangdaejang-calc/jeonse/', '/jangdaejang-calc/jeonse/checklist/', '/jangdaejang-calc/terms/', '/jangdaejang-calc/refund/', '/jangdaejang-calc/privacy/', '/jangdaejang-calc/about/', '/jangdaejang-calc/track/', '/jangdaejang-calc/guide/method/', '/jangdaejang-calc/ad/', '/jangdaejang-calc/login/', '/jangdaejang-calc/brief/', '/jangdaejang-calc/brief/subscribe/', '/jangdaejang-calc/brief/manage/',
  '/jangdaejang-calc/tax/tax-engine.js?v=4', '/jangdaejang-calc/tax/tax-trust.js?v=1', '/jangdaejang-calc/tax/adjusted-areas.js', '/jangdaejang-calc/tax/tax-ui.js?v=4', '/jangdaejang-calc/tax/transfer-engine.js?v=3', '/jangdaejang-calc/tax/transfer/transfer-ui.js?v=3', '/jangdaejang-calc/assets/gongsi.js?v=1', '/jangdaejang-calc/assets/tax-box.js?v=3', '/jangdaejang-calc/switch/switch-core.js?v=4', '/jangdaejang-calc/assets/rec-core.js?v=1', '/jangdaejang-calc/assets/rent-core.js?v=1', '/jangdaejang-calc/assets/mine-core.js?v=15', '/jangdaejang-calc/assets/ask-core.js?v=3', '/jangdaejang-calc/assets/ask.js?v=1', '/jangdaejang-calc/assets/price-sheet.js?v=13', '/jangdaejang-calc/assets/offi-core.js?v=3', '/jangdaejang-calc/assets/offi-view.js?v=5', '/jangdaejang-calc/tax/offi-tax.js?v=1', '/jangdaejang-calc/assets/plain-words.js?v=13', '/jangdaejang-calc/chungyak/cy-engine.js?v=2',
  '/jangdaejang-calc/assets/agents.js', '/jangdaejang-calc/assets/lead.js?v=1', '/jangdaejang-calc/assets/config.js?v=4', '/jangdaejang-calc/assets/auth.js?v=5', '/jangdaejang-calc/assets/area-watch.js?v=3', '/jangdaejang-calc/assets/ads.js?v=2', '/jangdaejang-calc/assets/kchat.js?v=2', '/jangdaejang-calc/assets/vendor/qrcode-generator.js?v=1.4.4', '/jangdaejang-calc/assets/region-notes.js', '/jangdaejang-calc/assets/policy-view.js?v=2', '/jangdaejang-calc/assets/devproj-view.js?v=3', '/jangdaejang-calc/assets/narrative.js?v=12', '/jangdaejang-calc/assets/track.js?v=2', '/jangdaejang-calc/assets/stat.js?v=7', '/jangdaejang-calc/assets/brief-core.js?v=7', '/jangdaejang-calc/assets/broker-tools.js?v=3', '/jangdaejang-calc/agent/listing/', '/jangdaejang-calc/agent/content/',
  '/jangdaejang-calc/assets/pwa.js', '/jangdaejang-calc/assets/pay.js?v=1', '/jangdaejang-calc/assets/pay.css?v=2', '/jangdaejang-calc/chungyak/price/', '/jangdaejang-calc/assets/cy-price.js?v=2', '/jangdaejang-calc/assets/cy-price.css?v=2', '/jangdaejang-calc/assets/biz.js', '/jangdaejang-calc/assets/track-core.js?v=1', '/jangdaejang-calc/assets/sale-status.js?v=1', '/jangdaejang-calc/assets/og/default.png', '/jangdaejang-calc/assets/loan-core.js?v=2', '/jangdaejang-calc/assets/share.js?v=8', '/jangdaejang-calc/assets/client-brief.js?v=1', '/jangdaejang-calc/assets/aplus.css?v=43', '/jangdaejang-calc/assets/ad-slot.js?v=1', '/jangdaejang-calc/assets/nw.js?v=1', '/jangdaejang-calc/assets/map-core.js?v=3', '/jangdaejang-calc/assets/region-core.js?v=1', '/jangdaejang-calc/assets/map-engine.js?v=1', '/jangdaejang-calc/assets/tabbar.js?v=2', '/jangdaejang-calc/assets/rank-core.js?v=5', '/jangdaejang-calc/assets/home-core.js?v=2', '/jangdaejang-calc/assets/strength.js?v=1', '/jangdaejang-calc/assets/pro-report.js?v=5', '/jangdaejang-calc/assets/pro.css?v=2', '/jangdaejang-calc/assets/src-box.js?v=1', '/jangdaejang-calc/assets/map-geo.json', '/jangdaejang-calc/assets/leaflet/leaflet.js', '/jangdaejang-calc/assets/leaflet/leaflet.css', '/jangdaejang-calc/assets/icons/icon-192.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin) return;           // 구글 시트·GA·지도 타일·카카오맵 SDK 등 외부는 그대로(캐시 안 함)
  if (!u.pathname.startsWith('/jangdaejang-calc/') && !u.pathname.startsWith('/jangdaejang-data/')) return;
  if (u.pathname.startsWith('/jangdaejang-calc/premium/') && u.search) return;   // 결제·열람 주소(결제키·열람 토큰)는 기기 캐시에 남기지 않음
  if (u.pathname.startsWith('/jangdaejang-calc/login/') && u.search) return;     // 카카오 인가 코드가 담긴 주소는 기기 캐시에 남기지 않음
  if (u.pathname.startsWith('/jangdaejang-calc/brief/paid/') && u.search) return;   // 결제키가 담긴 주소는 기기 캐시에 남기지 않음
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
