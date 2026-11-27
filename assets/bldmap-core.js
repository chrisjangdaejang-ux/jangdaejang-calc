/* 상가·건물·땅 실거래 지도(map/?k=bld · ?k=land) 계산 규칙 — 화면(assets/bldmap.js)과 검사(tools/bldmap-test.js)가 같이 쓴다.
   자료: jangdaejang-data data/bmap/index.json, bmap/{구}.json (엔진 scripts/bldmap.py — 최근 5년, 지번 없음)
     c 구분상가·사무실 줄 [동, 계약일, 용도, 용도지역, 전용㎡, 층, 금액(만원), 표시(1 직거래·2 지분·4 공장·창고 자료)]
     b 통건물 줄         [동, 계약일, 용도, 용도지역, 연면적㎡, 대지㎡, 금액, 표시(, 추정 위치 번호)]
     e 추정 위치 [경도, 위도, 등급, p|m] · dc 동 가운데 대신 값 · l 땅 묶음 {e:{읍·면·동: [1·3·5년 거래, 1·3·5년 지분거래, {지목: [건수, 25%, 가운데, 75%]}]}}
   위치 원칙: 지번은 자료에 없고 되살리지 않는다. 거래는 '동네 위치'(동 가운데 둘레)에 모아 놓고, 통건물 추정 위치(공개 건축물대장 대조, 약 100m)만 그 점에 둔다.
   window.JDJ_BMAPC */
(function (root) {
  'use strict';
  const PY = 3.3058;
  const TYPES = {
    c: { id: 'c', name: '구분상가·사무실', short: '구분상가', color: '#7B3FC4', area: '전용' },
    g: { id: 'g', name: '통건물', short: '통건물', color: '#1F4E8C', area: '연면적' },
    l: { id: 'l', name: '땅', short: '땅', color: '#2E7D4F', area: '토지' }
  };
  /* 용도(원자료 건물 주용도) → 거르기 묶음 */
  const USES = [{ id: '', t: '모든 용도' }, { id: 'n', t: '근린생활' }, { id: 'o', t: '업무' }, { id: 's', t: '판매' }, { id: 'h', t: '숙박' }, { id: 'f', t: '공장·창고' }, { id: 'x', t: '그 밖' }];
  /* 공장·창고 = 국토교통부 '공장 및 창고 등 매매' 자료에서 온 거래(엔진 표시 비트 4) — 지식산업센터·창고·자동차 관련 시설 등 */
  const isInd = d => !!(d && (+d.flag & 4));
  function useGroup(u) {
    if (u && typeof u === 'object') return isInd(u) ? 'f' : useGroup(u.use);
    u = String(u || '');
    if (/근린생활/.test(u)) return 'n';
    if (/업무/.test(u)) return 'o';
    if (/판매/.test(u)) return 's';
    if (/숙박/.test(u)) return 'h';
    return 'x';
  }
  /** 말풍선 위 작은 이름표(용도 줄임) — 근린·업무·판매·숙박, 그 밖은 구분상가 '상가' · 통건물 '기타' */
  const useTag = d => isInd(d) ? (/창고/.test(d.use || '') ? '창고' : /공장/.test(d.use || '') ? '공장' : '공장 등')
    : ({ n: '근린', o: '업무', s: '판매', h: '숙박' })[useGroup(d.use)] || (d.k === 'c' ? '상가' : '기타');
  /** 계약일 → 'YY.MM' (말풍선 아래 줄) */
  const ymShort = v => { const s = String(v || ''); return s.length >= 6 ? s.slice(2, 4) + '.' + s.slice(4, 6) : ''; };
  const YEARS = [1, 3, 5];
  /* 금액 범위(만원) — 총액 기준 */
  const PRICES = [{ id: '', t: '모든 금액' }, { id: 'p1', t: '3억 이하', lo: 0, hi: 30000 }, { id: 'p2', t: '3억~10억', lo: 30000, hi: 100000 },
    { id: 'p3', t: '10억~30억', lo: 100000, hi: 300000 }, { id: 'p4', t: '30억~100억', lo: 300000, hi: 1000000 }, { id: 'p5', t: '100억 넘게', lo: 1000000, hi: Infinity }];
  /* 면적 범위(㎡) — 구분상가 = 전용, 통건물 = 고른 기준(대지·연면적) */
  const AREAS = [{ id: '', t: '모든 면적' }, { id: 'a1', t: '50㎡ 이하', lo: 0, hi: 50 }, { id: 'a2', t: '50~165㎡', lo: 50, hi: 165 },
    { id: 'a3', t: '165~330㎡', lo: 165, hi: 330 }, { id: 'a4', t: '330~1,000㎡', lo: 330, hi: 1000 }, { id: 'a5', t: '1,000㎡ 넘게', lo: 1000, hi: Infinity }];

  const ymd = v => String(v || '');
  const fmtDate = v => { const s = ymd(v); return s.length === 8 ? `${s.slice(0, 4)}.${s.slice(4, 6)}.${s.slice(6, 8)}` : s; };
  const ymAdd = (ym, n) => { let y = +String(ym).slice(0, 4), m = +String(ym).slice(4, 6) + n; while (m > 12) { m -= 12; y++; } while (m < 1) { m += 12; y--; } return '' + y + String(m).padStart(2, '0'); };
  /** 기간 시작(계약일 YYYYMMDD 숫자) — 자료 끝 달 to 포함 최근 y년 */
  const since = (to, y) => +(ymAdd(to, -(12 * y - 1)) + '00');
  function median(a) {
    const s = a.filter(v => v != null && isFinite(v)).sort((x, y) => x - y), n = s.length;
    if (!n) return null; return n % 2 ? s[n >> 1] : (s[n / 2 - 1] + s[n / 2]) / 2;
  }

  /** 구 파일 → 거래 목록(화면에서 쓰기 좋은 꼴). 지번은 원래 없음 */
  function decode(doc) {
    if (!doc) return [];
    const D = doc.d || [], U = doc.u || [], Z = doc.z || [], E = doc.e || [], out = [];
    (doc.c || []).forEach((r, i) => out.push({ id: 'c' + i, k: 'c', dong: D[r[0]] || '', date: r[1], use: U[r[2]] || '', zone: Z[r[3]] || '', area: r[4], land: null, floor: r[5], amt: r[6], flag: r[7] || 0, est: null }));
    (doc.b || []).forEach((r, i) => { const e = r.length > 8 ? E[r[8]] : null;
      out.push({ id: 'g' + i, k: 'g', dong: D[r[0]] || '', date: r[1], use: U[r[2]] || '', zone: Z[r[3]] || '', area: r[4], land: r[5], floor: null, amt: r[6], flag: r[7] || 0,
        est: e ? { lng: e[0], lat: e[1], grade: e[2], src: e[3] } : null }); });
    return out;
  }
  /** 단가(만원/㎡ 또는 만원/3.3㎡). unit 'm'|'p', basis 'l' 대지 | 'b' 연면적(통건물만) — 계산할 수 없으면 null */
  function unitPrice(d, unit, basis) {
    let a = d.k === 'g' ? (basis === 'b' ? d.area : d.land) : d.area;
    if (!(a > 0) || !(d.amt > 0)) return null;
    const v = d.amt / a; return unit === 'p' ? v * PY : v;
  }
  /** 면적 거르기 기준 값 */
  const areaOf = (d, basis) => d.k === 'g' ? (basis === 'b' ? d.area : d.land) : d.area;
  /** F = {types:{c,g}, years, price, area, use, basis, to} */
  function filter(list, F) {
    const t0 = since(F.to, F.years || 5), pr = PRICES.find(p => p.id === F.price) || PRICES[0], ar = AREAS.find(a => a.id === F.area) || AREAS[0];
    return list.filter(d => {
      if (F.types && !F.types[d.k]) return false;
      if (d.date < t0) return false;
      if (pr.id && !(d.amt > pr.lo && d.amt <= pr.hi)) return false;
      if (ar.id) { const a = areaOf(d, F.basis); if (!(a > ar.lo && a <= ar.hi)) return false; }
      if (F.use && useGroup(d) !== F.use) return false;
      return true;
    });
  }
  /** 시세에 쓰는 거래 = 직거래·지분 거래가 아닌 것(상가·건물 탭과 같은 기준) */
  const plain = d => !(d.flag & 3);

  /* ---------- 글자 ---------- */
  /** 만원 → 지도 말풍선용 짧은 금액: 125000 → '12.5억', 9500 → '9,500만' */
  function shortWon(man) {
    man = Math.round(+man || 0);
    if (man >= 10000) { const e = man / 10000; return (e >= 100 ? Math.round(e).toLocaleString('ko-KR') : (Math.round(e * 10) / 10).toString()) + '억'; }
    return man.toLocaleString('ko-KR') + '만';
  }
  /** 만원 → '12억 3,400만 원' */
  function won(man) {
    man = Math.round(+man || 0); const e = Math.floor(man / 10000), r = man % 10000;
    return man ? (e ? e.toLocaleString('ko-KR') + '억' : '') + (r ? (e ? ' ' : '') + r.toLocaleString('ko-KR') + '만' : '') + ' 원' : '0원';
  }
  /** 말풍선 값: mode 't' 총액 · 'm' ㎡당 · 'p' 평당 */
  function label(d, mode, basis) {
    if (mode === 't') return shortWon(d.amt);
    const v = unitPrice(d, mode, basis); return v == null ? '-' : shortWon(v);
  }
  const modeName = (mode, basis, k) => mode === 't' ? '총액' : (k === 'g' ? (basis === 'b' ? '연면적 ' : '대지 ') : '') + (mode === 'p' ? '3.3㎡당' : '㎡당');
  const flagText = f => [f & 1 ? '직거래' : '', f & 2 ? '지분 거래' : ''].filter(Boolean).join(' · ');
  const areaText = d => d.k === 'g' ? `연면적 ${fmtArea(d.area)}${d.land ? ` · 대지 ${fmtArea(d.land)}` : ''}` : `전용 ${fmtArea(d.area)}`;
  function fmtArea(a) { return a == null ? '-' : (Math.round(a * 10) / 10).toLocaleString('ko-KR') + '㎡'; }

  /* ---------- 묶기 ---------- */
  /** 동별 묶음: [{dong, n, nk:{c,g}, med(단가 가운데 — 직거래·지분 제외), tmed(총액 가운데), last, list}] — 거래 많은 순 */
  function byDong(list, mode, basis) {
    const M = new Map();
    list.forEach(d => { let o = M.get(d.dong); if (!o) M.set(d.dong, o = { dong: d.dong, n: 0, nk: { c: 0, g: 0 }, list: [], last: 0 }); o.n++; o.nk[d.k]++; o.list.push(d); if (d.date > o.last) o.last = d.date; });
    const out = [...M.values()];
    out.forEach(o => { o.list.sort((a, b) => b.date - a.date || b.amt - a.amt); o.med = stat(o.list, mode, basis); });
    return out.sort((a, b) => b.n - a.n || (a.dong < b.dong ? -1 : 1));
  }
  /** 가운데값(말풍선·카드): 총액이면 총액 가운데, 단가면 단가 가운데 — 직거래·지분 거래는 뺌. 3건 미만이면 null(한두 건 값이 그대로 드러나 대표값으로 쓰기 어려움) */
  function stat(list, mode, basis) {
    const v = list.filter(plain).map(d => mode === 't' ? d.amt : unitPrice(d, mode, basis));
    const ok = v.filter(x => x != null);
    return ok.length >= 3 ? median(ok) : null;
  }
  /** 같은 동 가운데 둘레 자리(해바라기 꼴, 겹치지 않게) — i번째/n개, 반지름은 거래 수에 따라 120~450m. 같은 입력이면 늘 같은 자리 */
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; }
  function ring(c, key, i, n, rMax) {
    const R = rMax || Math.min(450, 120 + 28 * Math.sqrt(n)), a = i * 2.399963 + hash(key) * 6.283185, r = R * Math.sqrt((i + 0.6) / (n + 0.6));
    const dLat = r * Math.cos(a) / 111320, dLng = r * Math.sin(a) / (111320 * Math.cos(c.lat * Math.PI / 180));
    return { lat: c.lat + dLat, lng: c.lng + dLng };
  }
  /** 동 가운데: ① 공동주택 동 가운데 점(assets/dong/{시·도}.json) ② 구 파일 dc(행정동 경계 가운데·추정 위치 가운데) ③ 없으면 null(구 가운데 둘레) */
  function dongCenter(g, dong, rows, dc) {
    const f = String(dong || '').split(' ')[0], a = rows && rows[g + '|' + f];
    if (Array.isArray(a)) return { lng: a[0], lat: a[1], src: 'apt' };
    const b = dc && dc[dong];
    if (Array.isArray(b)) return { lng: b[0], lat: b[1], src: b[2] === 'e' ? 'est' : 'adm' };
    return null;
  }

  /** 단가 분포 점 그림(SVG 글자): 가로 = 계약일, 세로 = 단가 — 거래 한 점씩, 색 = 종류. 직거래·지분 거래는 뺌. 점이 3개보다 적으면 '' */
  function scatter(list, mode, basis, W, H) {
    W = W || 340; H = H || 170;
    const pts = list.filter(plain).map(d => ({ d, v: unitPrice(d, mode === 't' ? 'm' : mode, basis) })).filter(o => o.v != null);
    if (pts.length < 3) return '';
    const tx = v => { const s = String(v); return +s.slice(0, 4) + (+s.slice(4, 6) - 1) / 12 + (+s.slice(6, 8) || 1) / 365; };
    const xs = pts.map(o => tx(o.d.date)), vs = pts.map(o => o.v).sort((a, b) => a - b);
    const x0 = Math.min(...xs), x1 = Math.max(...xs, x0 + 0.5), hi = vs[Math.min(vs.length - 1, Math.floor(vs.length * 0.97))] * 1.08 || 1;
    const L = 44, B = 20, px = x => L + (x - x0) / (x1 - x0) * (W - L - 8), py = v => 6 + (1 - Math.min(v, hi) / hi) * (H - B - 6);
    let g = '';
    [0, 0.5, 1].forEach(f => { const v = hi * f, y = py(v); g += `<line x1="${L}" x2="${W - 4}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}" stroke="#E5E8EB"/><text x="${L - 4}" y="${(y + 4).toFixed(1)}" text-anchor="end" font-size="10.5" fill="#6B7684">${shortWon(v)}</text>`; });
    for (let y = Math.ceil(x0); y <= Math.floor(x1); y++) g += `<text x="${px(y).toFixed(1)}" y="${H - 4}" text-anchor="middle" font-size="10.5" fill="#6B7684">${String(y).slice(2)}년</text>`;
    pts.forEach((o, i) => { g += `<circle cx="${px(xs[i]).toFixed(1)}" cy="${py(o.v).toFixed(1)}" r="3.6" fill="${TYPES[o.d.k].color}" fill-opacity=".75"${o.v > hi ? ' stroke="#191F28"' : ''}/>`; });
    return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="거래 ${pts.length}건의 단가 분포">${g}</svg>`;
  }

  /* ---------- 땅(읍·면·동 묶음 숫자만) ---------- */
  const YI = { 1: 0, 3: 1, 5: 2 };
  /** 땅 묶음 → [{dong, n, h, r(지분 비율), pj:{지목: [건수, 25%, 가운데, 75%]}}] (기간 y년) — 지목을 고르면 그 지목 3년 거래가 있는 곳만 */
  function landRows(l, y, jimok) {
    if (!l || !l.e) return [];
    const i = YI[y] == null ? 2 : YI[y];
    return Object.keys(l.e).map(k => { const v = l.e[k]; return { dong: k, n: v[i], h: v[3 + i], r: v[i] ? v[3 + i] / v[i] : null, pj: v[6] || {} }; })
      .filter(o => o.n > 0 && (!jimok || (o.pj[jimok] && o.pj[jimok][0] > 0)))
      .sort((a, b) => b.n - a.n || (a.dong < b.dong ? -1 : 1));
  }
  /** 땅 지목 목록(이 구 3년 거래 많은 순) */
  function jimoks(l) {
    const c = {}; Object.values((l && l.e) || {}).forEach(v => Object.keys(v[6] || {}).forEach(j => { c[j] = (c[j] || 0) + ((v[6][j] || [])[0] || 0); }));
    return Object.keys(c).sort((a, b) => c[b] - c[a]);
  }
  /** 원/㎡ → 지도·표 글자(㎡당 or 3.3㎡당) */
  function landPrice(wonPerM2, unit) {
    if (wonPerM2 == null) return null;
    const man = wonPerM2 / 10000 * (unit === 'p' ? PY : 1);
    return man >= 1 ? shortWon(man) : Math.round(man * 10000).toLocaleString('ko-KR') + '원';
  }

  /* ---------- 주소 ---------- */
  const KS = ['k', 'ty', 'lb', 'bs', 'yr', 'pr', 'ar', 'us', 'jm'];
  /** 지도 상태 → 주소 뒤 값(공유·새로 고침). 지번·이름 같은 값은 없음 */
  function toQuery(S, view) {
    const q = new URLSearchParams();
    q.set('k', S.k === 'land' ? 'land' : 'bld');
    const ty = (S.types.c ? 'c' : '') + (S.types.g ? 'g' : ''); if (S.k !== 'land' && ty !== 'cg') q.set('ty', ty || 'c');
    if (S.lb !== 't') q.set('lb', S.lb); if (S.bs === 'b') q.set('bs', 'b'); if (S.yr !== 3) q.set('yr', String(S.yr));
    if (S.pr) q.set('pr', S.pr); if (S.ar) q.set('ar', S.ar); if (S.us) q.set('us', S.us); if (S.jm) q.set('jm', S.jm);
    if (view) { q.set('lat', view.lat.toFixed(4)); q.set('lng', view.lng.toFixed(4)); q.set('z', String(view.zoom)); }
    if (S.sel) q.set('sel', S.sel);
    return q.toString();
  }
  function fromQuery(q) {
    if (typeof q === 'string') q = new URLSearchParams(q);
    const k = q.get('k') === 'land' ? 'land' : 'bld', ty = q.get('ty') || 'cg';
    const pick = (v, arr) => arr.some(x => x.id === v) ? v : '';
    const yr = +q.get('yr');
    const g = q.get('g') || '';
    const sel = q.get('sel') || '';
    return { k, types: { c: ty.indexOf('c') >= 0 || !/[cg]/.test(ty), g: ty.indexOf('g') >= 0 }, lb: ['t', 'm', 'p'].includes(q.get('lb')) ? q.get('lb') : 't',
      bs: q.get('bs') === 'b' ? 'b' : 'l', yr: YEARS.includes(yr) ? yr : 3, pr: pick(q.get('pr'), PRICES), ar: pick(q.get('ar'), AREAS), us: pick(q.get('us'), USES),
      jm: (q.get('jm') || '').slice(0, 10), g: /^\d{5}$/.test(g) ? g : '', sel: /^\d{5}\|[^|<>"]{1,30}$/.test(sel) ? sel : '' };
  }

  const API = { PY, TYPES, USES, YEARS, isInd, useTag, ymShort, scatter, PRICES, AREAS, KS, useGroup, since, ymAdd, median, decode, unitPrice, areaOf, filter, plain, shortWon, won, label, modeName, flagText, areaText, fmtArea,
    fmtDate, byDong, stat, ring, hash, dongCenter, landRows, jimoks, landPrice, toQuery, fromQuery };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.JDJ_BMAPC = API;
})(typeof window !== 'undefined' ? window : globalThis);
