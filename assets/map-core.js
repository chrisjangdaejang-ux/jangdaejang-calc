/* 집코드 '지도' 화면(map/) 공통 계산 — 화면과 tools/map-test.js 가 함께 쓴다. 지도 엔진(카카오·Leaflet)과는 상관없는 순수 계산만.
   자료: jangdaejang-data data/sNN.json units (assets/mine-core.js 설명과 같은 모양) + sNN_xy.json {xy: {'구코드|동|지번': [경도, 위도]}}
   - 단지 묶기는 mine-core 의 groupDanji(같은 키 규칙)를 그대로 쓴다 → [시세·전망 보기] 주소가 내 집 시세 화면과 맞는다.
   - 숫자는 공개 자료 값을 그대로(최근 평당가 = 그 달까지 3개월 실거래 평당가 중간값, 미래가치 점수 fx.fv, 전세가율 fx.jr)
     또는 단순 평균만 쓴다. 자료가 없으면 빈칸(추정으로 메우지 않음).
   window.JDJ_MAPC = { ... } (아래 API) */
(function (root) {
  'use strict';
  var JB = (typeof window !== 'undefined' && window.JDJ_BASE) || (function (p) { var g = p.indexOf('/jangdaejang-calc/') === 0, b = { SITE: g ? '/jangdaejang-calc/' : '/', DATA: g ? '/jangdaejang-data/' : 'https://chrisjangdaejang-ux.github.io/jangdaejang-data/' }; if (typeof window !== 'undefined') window.JDJ_BASE = b; return b; })((typeof location !== 'undefined' && location.pathname) || '/jangdaejang-calc/');
  const M = () => root.JDJ_MINE || (typeof require === 'function' ? require('./mine-core.js') : null);

  /* ---------- 확대 단계 (Leaflet 줌 숫자 기준, 카카오는 20 − 레벨로 바꿔서 같은 숫자) ---------- */
  const LV = { sido: 8, sgg: 12, dong: 13 };   // 이 줌 이하이면 그 단계
  function level(z) { return z <= LV.sido ? 'sido' : z <= LV.sgg ? 'sgg' : z <= LV.dong ? 'dong' : 'danji'; }
  const kakaoToZoom = lv => 20 - lv;
  const zoomToKakao = z => Math.max(1, Math.min(14, Math.round(20 - z)));

  /* ---------- 평형·가격 필터 ---------- */
  const SIZES = [{ id: '', t: '전체 평형' }, { id: 's', t: '소형', d: '전용 60㎡ 미만' }, { id: 'm', t: '중형', d: '전용 60~85㎡' }, { id: 'l', t: '대형', d: '전용 85㎡ 초과' }];
  /** 전용㎡ → 's'|'m'|'l'. 84㎡대(전용 84.x~85.0㎡)는 중형 */
  const sizeOf = a => !(a > 0) ? '' : a < 60 ? 's' : a <= 85.99 ? 'm' : 'l';
  /* 가격대(만원). 15억·25억은 주택담보대출 한도가 바뀌는 금액 */
  const PRICES = [{ id: '', t: '전체 가격' }, { id: 'p6', t: '6억 이하', lo: 0, hi: 60000 }, { id: 'p9', t: '6억~9억', lo: 60000, hi: 90000 },
    { id: 'p15', t: '9억~15억', lo: 90000, hi: 150000 }, { id: 'p25', t: '15억~25억', lo: 150000, hi: 250000 }, { id: 'p99', t: '25억 초과', lo: 250000, hi: Infinity }];
  function priceOk(id, man) {
    const p = PRICES.find(x => x.id === id); if (!p || !p.id) return true;
    return man > 0 && man > p.lo && man <= p.hi;     // 경계 금액은 아래 칸(예: 정확히 9억 → 6억~9억)
  }
  const MODES = [{ id: 'price', t: '시세' }, { id: 'fv', t: '미래가치' }, { id: 'jr', t: '전세가율' }, { id: 'reg', t: '지역 분석' }];   // reg: 구별 지표(assets/region-core.js)

  /* ---------- 단지 목록 ---------- */
  /** sNN.json units + xy → 지도에 올릴 단지 [{key, sd, code, dong, apt, jibun, lat, lng, bands, n, by, hh}] (좌표 없는 단지는 뺌) */
  function danjiList(units, xy, sd) {
    const out = [], g = M().groupDanji(units || []);
    for (const d of g.values()) {
      const p = xy && xy[[d.code, d.dong, d.jibun].join('|')];
      if (!Array.isArray(p) || !isFinite(p[0]) || !isFinite(p[1])) continue;
      const f = (d.bands.find(u => u[9] && typeof u[9] === 'object') || [])[9] || {};
      out.push({ key: d.key, sd, code: d.code, dong: d.dong, apt: d.apt, jibun: d.jibun, lng: p[0], lat: p[1], bands: d.bands, n: d.n,
        by: f.by || null, hh: f.hh || null });
    }
    return out;
  }
  /** 한 평형의 지도용 숫자: {u, band, area, ppy, price, at, fv, jr} — 최근 3개월 안 실거래가 없으면 ppy·price = 0 */
  function bandInfo(u, months) {
    const s = u[6] || [], li = M().lastIdx(s), ppy = li >= 0 ? s[li] : 0, f = (u[9] && typeof u[9] === 'object') ? u[9] : {};
    return { u, band: u[3], area: u[4], ppy, price: M().toPrice(ppy, u[4]), at: li >= 0 && months ? months[li] : '',
      fv: f.fv != null ? f.fv : null, jr: f.jr != null ? f.jr : null, n: u[5] || 0 };
  }
  /** 단지에서 지금 필터에 맞는 대표 평형 하나. opt = {size, price, band(이 평형을 먼저)} — 맞는 평형이 없으면 null
      대표: 고른 평형 → (전체 평형이면) 최근 시세 있는 평형 중 전용 84㎡에 가장 가까운 것 → 거래 많은 것 */
  function pick(d, months, opt) {
    opt = opt || {};
    let c = d.bands.map(u => bandInfo(u, months));
    if (opt.size) c = c.filter(b => sizeOf(b.area) === opt.size);
    if (opt.price) c = c.filter(b => priceOk(opt.price, b.price));
    if (!c.length) return null;
    if (opt.band) { const b = c.find(x => x.band === opt.band); if (b) return b; }
    const priced = c.filter(b => b.price > 0), pool = priced.length ? priced : c;
    const score = b => opt.size ? -b.n : Math.abs(b.area - 84);
    return pool.slice().sort((a, b) => score(a) - score(b) || b.n - a.n)[0];
  }

  /* ---------- 묶음(구·동) ---------- */
  const mean = a => { const v = a.filter(x => typeof x === 'number' && isFinite(x)); return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null; };
  /** 단지 + 대표 평형 목록 [{d, b}] → 묶음 [{k, name, n, lat, lng, ppy(평균 평당가), fv(평균 점수), jr(평균 전세가율), gs}]
      by = 'dong' | 'sgg' — 평균은 값이 있는 단지만으로(단순 평균) */
  function groups(items, by) {
    const m = new Map();
    for (const it of items) {
      const k = by === 'dong' ? it.d.code + '|' + it.d.dong : it.d.code;
      let g = m.get(k); if (!g) { g = { k, code: it.d.code, dong: by === 'dong' ? it.d.dong : '', items: [] }; m.set(k, g); }
      g.items.push(it);
    }
    return [...m.values()].map(g => {
      const f0 = g.items.map(x => x.b.u[9]).find(f => f && typeof f === 'object' && f.gs != null);
      return { k: g.k, code: g.code, dong: g.dong, n: g.items.length,
        lat: mean(g.items.map(x => x.d.lat)), lng: mean(g.items.map(x => x.d.lng)),
        ppy: mean(g.items.map(x => x.b.ppy > 0 ? x.b.ppy : null)), fv: mean(g.items.map(x => x.b.fv)),
        jr: mean(g.items.map(x => x.b.jr)), gs: f0 ? f0.gs : null };
    });
  }

  /* ---------- 겹침 묶기(화면 좌표 칸 나누기) ---------- */
  /** pts = [{x, y, w(무게: 거래 수 등), ...}] → [{x, y, list}] 칸(cw×ch px)마다 하나. 칸 안이 1개면 단지, 여러 개면 묶음 */
  function cluster(pts, cw, ch) {
    const cells = new Map();
    for (const p of pts) {
      const k = Math.floor(p.x / cw) + ',' + Math.floor(p.y / ch);
      let c = cells.get(k); if (!c) { c = { list: [] }; cells.set(k, c); }
      c.list.push(p);
    }
    return [...cells.values()].map(c => {
      c.list.sort((a, b) => (b.w || 0) - (a.w || 0));
      c.x = mean(c.list.map(p => p.x)); c.y = mean(c.list.map(p => p.y));
      return c;
    });
  }

  /** 겹치는 말풍선 숨기기: boxes = [{x, y(가운데), w, h, p(높을수록 먼저)}] → 겹치지 않게 남길 것만(우선순위 순서로 자리 차지) */
  function declutter(boxes, gap) {
    gap = gap == null ? 4 : gap;
    const kept = [];
    for (const b of boxes.slice().sort((a, c) => (c.p || 0) - (a.p || 0))) {
      const hit = kept.some(k => Math.abs(k.x - b.x) * 2 < k.w + b.w + gap * 2 && Math.abs(k.y - b.y) * 2 < k.h + b.h + gap * 2);
      if (!hit) kept.push(b);
    }
    return kept;
  }
  /** 겹침 묶기(욕심 방식): pts = [{x, y, w(무게)}] 무게 큰 것부터 자리를 잡고, 이미 잡은 상자(bw×bh px)와 겹치면 그 상자에 들어간다.
      → [{x, y, list(첫째 = 대표)}]. 칸 나누기와 달리 칸 경계에서 말풍선끼리 겹치지 않는다 */
  function gather(pts, bw, bh) {
    const out = [];
    for (const p of pts.slice().sort((a, b) => (b.w || 0) - (a.w || 0))) {
      let best = null, bd = Infinity;
      for (const g of out) { const dx = Math.abs(g.x - p.x), dy = Math.abs(g.y - p.y); if (dx < bw && dy < bh) { const dd = dx * dx + dy * dy; if (dd < bd) { bd = dd; best = g; } } }
      if (best) best.list.push(p); else out.push({ x: p.x, y: p.y, list: [p] });
    }
    return out;
  }
  /** 묶음 말풍선 크기 어림(px): 글자 수 × 글자 폭 + 여백 */
  const boxSize = (lines, fs) => ({ w: Math.max(...lines.map(t => String(t || '').length)) * (fs || 13) * 0.95 + 20, h: lines.filter(Boolean).length * (fs || 13) * 1.35 + 12 });
  /** 글자 폭 어림(px, 굵은 Noto Sans KR): 한글 1글자 = 글자 크기, 숫자·영문은 약 0.56, 빈칸·쉼표·점은 약 0.3 */
  function textW(s, fs) {
    let w = 0;
    for (const ch of String(s == null ? '' : s)) w += /[ᄀ-ᇿ㄰-㆏가-힯㎡]/.test(ch) ? fs : /[\s.,·:]/.test(ch) ? fs * 0.32 : /[%~+\-]/.test(ch) ? fs * 0.7 : fs * 0.56;
    return w;
  }
  const hit = (a, b, gap) => a.l - gap < b.r && b.l - gap < a.r && a.t - gap < b.b && b.t - gap < a.b;
  /** 말풍선 겹침 정리: items = [{box:{l,t,r,b}(화면 px), p(높을수록 먼저), list?}], walls = 말풍선을 두면 안 되는 칸(조작 버튼·안내·지도 로고 등).
      우선순위 순서로 자리를 잡고, 벽에 걸리면 숨김, 이미 자리 잡은 말풍선과 겹치면 숨기고 그 list 를 자리 잡은 쪽 list 뒤에 붙인다(+N 으로 보이게). → 남길 것만 */
  function settle(items, walls, gap) {
    gap = gap == null ? 4 : gap; walls = walls || [];
    const kept = [];
    for (const it of items.slice().sort((a, b) => (b.p || 0) - (a.p || 0))) {
      if (walls.some(w => hit(w, it.box, gap))) continue;
      const k = kept.find(k => hit(k.box, it.box, gap));
      if (k) { if (k.list && it.list) k.list.push(...it.list); continue; }
      kept.push(it);
    }
    return kept;
  }

  /* ---------- 보이는 시·도 ---------- */
  /** geo = map-geo.json, bb = {w, s, e, n} → 상자가 겹치는 시·도 id (geo 가 없으면 null = 모름) */
  function sidosIn(geo, bb) {
    if (!geo || !geo.sido) return null;
    return Object.keys(geo.sido).filter(id => { const b = geo.sido[id].b; return !(b[2] < bb.w || b[0] > bb.e || b[3] < bb.s || b[1] > bb.n); });
  }
  const inBox = (bb, lat, lng, pad) => { pad = pad || 0; const dx = (bb.e - bb.w) * pad, dy = (bb.n - bb.s) * pad;
    return lat >= bb.s - dy && lat <= bb.n + dy && lng >= bb.w - dx && lng <= bb.e + dx; };

  /* ---------- 말 ---------- */
  const n0 = v => Math.round(v).toLocaleString('ko-KR');
  /** 만원 → 말풍선용 짧은 금액: 11.4억, 9,800만 */
  function eokShort(man) {
    if (!(man > 0)) return '';
    if (man < 10000) return n0(Math.round(man / 100) * 100) + '만';
    const e = man / 10000; return (e >= 100 ? Math.round(e) : Math.round(e * 10) / 10).toString() + '억';
  }
  /** 평당가(만원/3.3㎡) → '평당 4,520만' */
  const ppyText = ppy => ppy > 0 ? `평당 ${n0(ppy)}만` : '';
  const pct = v => v == null ? '' : Math.round(v * 100) + '%';
  /** 미래가치 점수 → 색 단계 (assets/narrative.js 의 말과 같은 구간: 70·55·45·30) */
  function tone(fv) { return fv == null ? 'na' : fv >= 70 ? 't5' : fv >= 55 ? 't4' : fv > 45 ? 't3' : fv > 30 ? 't2' : 't1'; }
  const TONES = [['t5', '평균보다 더 오를 가능성이 커요', '70점 이상'], ['t4', '평균보다 더 오를 쪽', '55~69점'], ['t3', '평균과 비슷', '46~54점'],
    ['t2', '평균보다 덜 오를 쪽', '31~45점'], ['t1', '평균보다 덜 오를 가능성이 커요', '30점 이하']];
  /** 말풍선 큰 글자(모드별) — 자료 없으면 '' */
  function mainText(mode, b) {
    if (!b) return '';
    if (mode === 'fv') return b.fv != null ? b.fv + '점' : '';
    if (mode === 'jr') return b.jr != null ? '전세 ' + pct(b.jr) : '';
    return eokShort(b.price);
  }
  function groupText(mode, g) {
    if (mode === 'fv') return g.fv != null ? `평균 ${Math.round(g.fv)}점` : '';
    if (mode === 'jr') return g.jr != null ? `전세 ${pct(g.jr)}` : '';
    return ppyText(g.ppy);
  }

  /* ---------- 주소 ---------- */
  const BASE = JB.SITE;
  /** 내 집 시세 화면 주소 (mine/ 의 ?sd=&d=&b=) */
  function mineUrl(d, band) {
    const q = new URLSearchParams(); q.set('sd', d.sd); q.set('d', d.key); if (band) q.set('b', band);
    return BASE + 'mine/?' + q.toString();
  }
  /* 비교함: 최대 3곳(단지 비교 화면 한도). 저장은 이 기기 sessionStorage 만 */
  const CMP_KEY = 'jdj_map_cmp', CMP_MAX = 3;
  const cmpId = x => [x.sd, x.code, x.dong, x.jibun, x.apt].join('|');
  function cmpAdd(list, x) {
    const id = cmpId(x), l = (list || []).filter(y => cmpId(y) !== id);
    l.push({ sd: x.sd, code: x.code, dong: x.dong, jibun: x.jibun, apt: x.apt, band: x.band || '' });
    return l.slice(-CMP_MAX);
  }
  /** 단지 비교 화면 주소 (ask/ 의 ?k=…&b=…, assets/ask-core.js packList·keyOf 와 같은 형식) */
  function askUrl(list) {
    const pk = a => a.map(x => String(x == null ? '' : x).replace(/%/g, '%25').replace(/!/g, '%21')).join('!');
    const q = new URLSearchParams(); q.set('k', pk(list.map(cmpId)));
    if (list.some(x => x.band)) q.set('b', pk(list.map(x => x.band || '')));
    return BASE + 'ask/?' + q.toString();
  }

  /** 지역 분석 구 동그라미 자리(지도 좌표 px): 지름 d — 겹침 정리(settle)용 */
  const circleBox = (x, y, d) => ({ l: x - d / 2, t: y - d / 2, r: x + d / 2, b: y + d / 2 });
  /** 동그라미 안 구 이름: '수원시 장안구' → '장안구'(같은 시·도 안에서 보므로) */
  const shortGu = n => { const t = String(n || '').split(' '); return t.length > 1 ? t[t.length - 1] : t[0]; };

  const API = { circleBox, shortGu, gather, declutter, settle, textW, boxSize, LV, level, kakaoToZoom, zoomToKakao, SIZES, sizeOf, PRICES, priceOk, MODES, danjiList, bandInfo, pick, groups, cluster, sidosIn, inBox,
    eokShort, ppyText, pct, tone, TONES, mainText, groupText, mineUrl, CMP_KEY, CMP_MAX, cmpId, cmpAdd, askUrl, mean };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.JDJ_MAPC = API;
})(typeof window !== 'undefined' ? window : globalThis);
