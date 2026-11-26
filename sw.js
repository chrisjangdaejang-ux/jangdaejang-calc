/* 집예보 서비스 워커: 항상 최신(네트워크 우선), 끊기면 저장해 둔 화면으로
   주소는 모두 이 파일 위치 기준(./) — 예전 주소(github.io/jangdaejang-calc/)와 새 도메인 첫 화면(/) 모두 같은 파일로 동작 */
const BASE = new URL('./', self.location).pathname;   // 예전 주소에선 jangdaejang-calc 폴더, 새 도메인에선 맨 앞(/)
const DATA_PATH = '/jangdaejang-data/';               // 예전 주소에서만 같은 주소(새 도메인에서는 다른 사이트라 캐시 안 함)
const V = 'jdj-v321';
const SHELL = ['./', './all/', './buy/', './switch/', './switch/rent/', './assets/switch-pick.js?v=1', './buy/report/', './villa/', './villa/zone/', './assets/redev-core.js?v=3', './chungyak/', './bunyang/', './bunyang/agency/', './partner/', './tax/', './tax/transfer/', './premium/', './premium/r/', './mine/', './ask/', './map/', './rank/', './jeonse/', './jeonse/checklist/', './terms/', './refund/', './privacy/', './about/', './track/', './guide/method/', './ad/', './login/', './brief/', './brief/subscribe/', './brief/manage/', './weekly/', './press/',
  './tax/tax-engine.js?v=4', './tax/tax-trust.js?v=1', './tax/adjusted-areas.js', './tax/tax-ui.js?v=9', './tax/transfer-engine.js?v=3', './tax/transfer/transfer-ui.js?v=4', './assets/gongsi.js?v=4', './assets/tax-box.js?v=8', './switch/switch-core.js?v=8', './assets/tswitch-core.js?v=3', './assets/rec-core.js?v=5', './assets/rent-core.js?v=6', './assets/hug-core.js?v=1', './assets/kk-core.js?v=1', './assets/mine-core.js?v=23', './assets/ask-core.js?v=8', './assets/ask.js?v=6', './assets/price-sheet.js?v=24', './assets/offi-core.js?v=6', './assets/offi-view.js?v=16', './assets/comm-core.js?v=5', './assets/comm-view.js?v=11', './assets/villa-core.js?v=1', './assets/villa-view.js?v=7', './assets/community.js?v=5', './assets/counsel-core.js?v=5', './assets/counsel.js?v=6', './assets/dongne-core.js?v=2', './assets/dongne.js?v=2', './assets/savefb.js?v=1', './tax/offi-tax.js?v=1', './assets/plain-words.js?v=19', './chungyak/cy-engine.js?v=7',
  './assets/agents.js', './assets/lead.js?v=4', './assets/config.js?v=11', './assets/auth.js?v=11', './assets/area-watch.js?v=9', './assets/ads.js?v=6', './assets/kchat.js?v=4', './assets/vendor/qrcode-generator.js?v=1.4.4', './assets/region-notes.js', './assets/policy-view.js?v=3', './assets/devproj-view.js?v=4', './assets/narrative.js?v=25', './assets/track.js?v=2', './assets/stat.js?v=8', './assets/brief-core.js?v=12', './assets/weekly-core.js?v=6', './assets/weekly-view.js?v=9', './assets/weekly.css?v=4', './assets/press-view.js?v=3', './assets/broker-tools.js?v=7', './agent/listing/', './agent/content/', './agent/pro/', './agent/pro/report/', './agent/pro/post/', './assets/pro-tools-core.js?v=3', './assets/pro-tools.css?v=3',
  './assets/pwa.js?v=3', './assets/pay.js?v=7', './assets/pay.css?v=5', './chungyak/price/', './assets/cy-price.js?v=7', './assets/cy-price.css?v=4', './assets/biz.js?v=3', './track/detail/', './assets/trackrec-core.js?v=2', './assets/track-core.js?v=5', './assets/sale-status.js?v=1', './assets/og/default.png', './loan/', './assets/loan-rules.js?v=3', './assets/loan-core.js?v=6', './assets/share.js?v=14', './assets/share-head.js?v=2', './assets/client-brief.js?v=7', './assets/aplus.css?v=48', './assets/ad-slot.js?v=7', './assets/brief-cta.js?v=2', './assets/ad-prices.js?v=3', './assets/ad-plan-core.js?v=8', './ad/plan/', './assets/nw.js?v=1', './assets/map-core.js?v=5', './assets/mapjump.js?v=4', './assets/region-core.js?v=3', './assets/map-engine.js?v=3', './assets/devmap-view.js?v=3', './assets/tabbar.js?v=7', './assets/layout.css?v=4', './assets/layout.js?v=1', './assets/result.css?v=1', './assets/result.js?v=1', './assets/back.js?v=1', './assets/chiprow.js?v=2', './assets/rank-core.js?v=8', './assets/home-core.js?v=6', './assets/today-core.js?v=1', './assets/quiz-core.js?v=1', './assets/watch-core.js?v=2', './assets/watch.js?v=9', './my/watch/', './assets/alerts-core.js?v=5', './mine/calendar/', './assets/cal-core.js?v=3', './assets/predict-core.js?v=3', './quiz/hall/', './my/alerts/', './my/memory/', './alerts/', './assets/proactive.js?v=2', './solve/', './assets/guide-core.js?v=10', './assets/guide.js?v=11', './assets/guide-next.js?v=6', './assets/guide-redev.js?v=1', './data/redev-budget.json', './assets/guide/scenarios.json?v=7', './assets/guide/lexicon.json?v=2', './assets/guide/features.json?v=1', './my/report/', './assets/report-core.js?v=5', './quiz/', './assets/strength.js?v=5', './assets/conf.js?v=4', './assets/life-view.js?v=3', './assets/fac-view.js?v=1', './assets/pro-report.js?v=7', './assets/pro.css?v=5', './assets/src-box.js?v=3', './assets/map-geo.json', './assets/leaflet/leaflet.js', './assets/leaflet/leaflet.css', './assets/icons/icon-192.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin) return;           // 구글 시트·GA·지도 타일·카카오맵 SDK 등 외부는 그대로(캐시 안 함)
  if (!u.pathname.startsWith(BASE) && !u.pathname.startsWith(DATA_PATH)) return;
  if (u.pathname.startsWith(BASE + 'premium/') && u.search) return;   // 결제·열람 주소(결제키·열람 토큰)는 기기 캐시에 남기지 않음
  if (u.pathname.startsWith(BASE + 'login/') && u.search) return;     // 카카오 인가 코드가 담긴 주소는 기기 캐시에 남기지 않음
  if (u.pathname.startsWith(BASE + 'brief/paid/') && u.search) return;   // 결제키가 담긴 주소는 기기 캐시에 남기지 않음
  if (u.pathname.startsWith(BASE + 'counsel/heart/') && u.search) return;   // 하트 결제키가 담긴 주소는 기기 캐시에 남기지 않음
  e.respondWith((async () => {
    const c = await caches.open(V);
    try {
      const res = await fetch(r, { cache: 'no-cache' });   // 휴대폰 브라우저에 남은 옛 파일 대신 항상 새로 확인
      if (res.ok) c.put(r, res.clone());
      return res;
    } catch (err) {
      const hit = await c.match(r, { ignoreSearch: r.mode === 'navigate' });
      if (hit) return hit;
      if (r.mode === 'navigate') return (await c.match(new URL('./', self.location).href)) || Response.error();
      throw err;
    }
  })());
});
