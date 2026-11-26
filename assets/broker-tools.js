/* 중개사·전문가 도구 공통 계산 (JDJ_BT) — agent/listing/(매물 설명서) · agent/content/(주간 블로그·인스타 글) · tools/broker-tools-test.js
   DOM 없음(카드 그림·압축 파일 만들기만 브라우저 전용 함수).
   원칙
   - 숫자는 공개 자료(price/{구}.json 실거래·시세, sNN.json 점수, sNN_xy.json·poi/{시도}.json 위치, data/brief/kit/{구}.json 주간 재료)와
     세금 계산기(tax/tax-engine.js) 결과만 쓴다. 자료가 없으면 숫자를 채우지 않고 '자료가 없어요'라고 쓴다(miss).
   - 칸마다 출처와 기준일을 붙인다(src·asOf).
   - 공인중개사(개업·소속)는 공인중개사법 제18조의2·시행령 제17조의2 표시 항목(중개사무소 명칭·소재지·연락처·등록번호·개업공인중개사 성명)을
     모든 결과물에 넣는다. 그 밖의 전문가(분양대행·컨설팅·자격사)는 이름·소속과 연락 방법 하나만(assets/pro-report.js 와 같은 규칙).
   - 수익 보장·무조건 같은 단정·보장 표현은 만들지도, 메모로 받지도 않는다(BAN).
   - 글 문장은 여러 문장 틀 중 주마다(씨앗 seed) 다르게 골라 매주 같은 글처럼 읽히지 않게 한다. LLM 없음.
   이용 횟수: 모닝 브리핑 요금제 표(assets/brief-core.js TIERS · 서버 BRIEF_TIERS)의 listing(매물 설명서 한 달 장수)·kitAreas(주간 글 지역 수).
     표에 칸이 아직 없으면 아래 FALLBACK 을 써요(서버 표와 같은 값). */
(function (root) {
  'use strict';
  const SITE = (((root.JDJ_SITE || {}).SITE_NAME) || '').trim() || '집예보';
  const PRO = () => root.JDJ_PRO || (typeof require === 'function' ? require('./pro-report.js') : null);
  const DISCLAIM = '이 자료는 참고용이며 법정 서류인 중개대상물 확인·설명서를 대신하지 않습니다.';
  const DANJI_NOTE = '특정 매물 광고(호가·동호수)는 개업공인중개사만 할 수 있어 공인중개사가 아니면 단지 분석 자료로 만들어져요.';
  /** 표시 정보 유형 → 만들 자료 종류: 공인중개사 'listing'(매물 설명서), 그 밖 'danji'(단지 분석 자료) */
  const kindOf = p => PRO().BROKER(PRO().cleanProfile(p || {}).role) ? 'listing' : 'danji';
  const PY = 3.3058;

  /* ---------- 이용 횟수 ---------- */
  const FALLBACK = {
    brief: { listing: 0, kitAreas: 0 }, brief_plus: { listing: 10, kitAreas: 1 },
    brief_pro: { listing: 30, kitAreas: 1 }, brief_pro_plus: { listing: 150, kitAreas: 5 }
  };
  function limitsFor(tier) {
    const B = root.JDJ_BRIEF, t = B && B.tier ? B.tier(tier) : null;
    const f = FALLBACK[tier] || { listing: 0, kitAreas: 0 };
    return { listing: t && t.listing != null ? t.listing : f.listing, kitAreas: t && t.kitAreas != null ? t.kitAreas : f.kitAreas };
  }
  /** 이번 달 남은 수 — q = 서버 toolQuota 결과({tier, used:{listing, kit:[구]}}) */
  function left(q, tool, g) {
    if (!q || !q.tier) return { ok: false, why: 'nosub', limit: 0, used: 0 };
    const L = limitsFor(q.tier), used = (q.used || {});
    if (tool === 'listing') { const u = used.listing || 0; return { ok: u < L.listing, why: u < L.listing ? '' : 'limit', limit: L.listing, used: u }; }
    const ks = used.kit || [], has = ks.indexOf(g) >= 0;
    return { ok: has || ks.length < L.kitAreas, why: has || ks.length < L.kitAreas ? '' : 'limit', limit: L.kitAreas, used: ks.length };
  }

  /* ---------- 공용 ---------- */
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function J(w, a, b) {
    w = String(w); const c = w.trim().slice(-1).charCodeAt(0);
    if (c >= 0xAC00 && c <= 0xD7A3) return w + ((c - 0xAC00) % 28 ? a : b);
    const d = w.trim().slice(-1);
    if (/[0-9]/.test(d)) return w + ('013678'.includes(d) ? a : b);
    if (d === '㎡') return w + b;
    return w + a;
  }
  /** 만원 → '42억 7,500만 원' */
  function won(m) {
    m = Math.round(Number(m) || 0); if (!(m > 0)) return '';
    const e = Math.floor(m / 10000), r = m % 10000;
    return e && r ? `${e}억 ${r.toLocaleString('ko-KR')}만 원` : e ? `${e}억 원` : `${r.toLocaleString('ko-KR')}만 원`;
  }
  /** 원 → '1,234만 원'(만 원 아래 버림 표시는 '약') */
  const wonW = v => { v = Math.round(Number(v) || 0); if (v <= 0) return '0원'; const m = Math.round(v / 10000); return m >= 1 ? won(m) : v.toLocaleString('ko-KR') + '원'; };
  const pct = x => (x > 0 ? '+' : x < 0 ? '−' : '') + Math.abs(x).toFixed(1) + '%';
  const md = s => { s = String(s || '').replace(/-/g, ''); return s.length >= 8 ? `${+s.slice(4, 6)}월 ${+s.slice(6, 8)}일` : ''; };
  const mdS = s => { s = String(s || '').replace(/-/g, ''); return s.length >= 8 ? `${+s.slice(4, 6)}/${+s.slice(6, 8)}` : ''; };
  const ymd = s => { s = String(s || '').replace(/-/g, ''); return s.length >= 8 ? `${s.slice(0, 4)}.${s.slice(4, 6)}.${s.slice(6, 8)}` : s.length >= 6 ? `${s.slice(0, 4)}.${s.slice(4, 6)}` : ''; };
  const ymK = s => { s = String(s || '').replace(/-/g, ''); return s.length >= 6 ? `${s.slice(0, 4)}년 ${+s.slice(4, 6)}월` : ''; };
  const today = () => { const d = new Date(Date.now() + 9 * 3600000); return d.toISOString().slice(0, 10); };

  /* 단정·보장 표현(표시·광고 규정) */
  const BAN = /(수익\s*보장|보장\s*수익|원금\s*보장|무조건|확실히\s*오|반드시\s*오|틀림없|100\s*%\s*(수익|상승|오)|손해\s*(없|안\s*)|최고의\s*투자|대박)/;
  const banHit = t => { const m = BAN.exec(String(t || '')); return m ? m[0] : ''; };
  /** 중개사 메모(설명서 한마디) — 120자, 단정·보장·연락처·링크 금지 */
  function cleanMemo(v) {
    const s = String(v == null ? '' : v).replace(/[\u0000-\u001F\u007F<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120);
    if (!s) return { ok: true, v: '' };
    if (banHit(s)) return { ok: false, v: s, err: "'수익 보장·무조건' 같은 단정·보장 표현은 쓸 수 없어요(표시·광고 규정)." };
    if (/0\d{1,2}[\s.\-)]*\d{3,4}[\s.\-]*\d{4}|1[5-9]\d{2}[\s.\-]*\d{4}|\d{9,}|@|https?:|www\.|\.kr\b|\.com\b/i.test(s.replace(/\d{1,3}(,\d{3})+/g, ''))) return { ok: false, v: s, err: '메모에는 전화번호·메일·링크를 넣지 않아요. 사무소 연락처는 아래에 자동으로 나와요.' };
    return { ok: true, v: s };
  }

  /* ---------- 표시 정보(광고 표시) ---------- */
  /** profile(assets/pro-report.js cleanProfile 형식) → { broker, err, lines:[[이름표, 값]], one(한 줄) } */
  function adBlock(p) {
    const R = PRO(); p = R.cleanProfile(p || {});
    const broker = R.BROKER(p.role), err = R.profileError(p);
    const L = [];
    if (broker) {
      L.push(['중개사무소', p.office]); L.push(['소재지', p.addr]); L.push(['등록번호', p.reg]);
      L.push(['대표 공인중개사', p.ceo]);
      if (p.role === 'member' && p.name) L.push(['소속공인중개사', p.name]);
      L.push(['전화', p.phone]);
    } else {
      const ttl = p.role === 'licensed' ? (p.title || '') : p.title;
      L.push([p.role === 'licensed' && p.title ? p.title : '이름', (p.name || p.office) + (ttl && p.role !== 'licensed' ? ` (${ttl})` : '')]);
      if (p.name && p.office) L.push([p.role === 'seller' ? '분양대행사' : p.role === 'licensed' ? '사무소' : '소속', p.office]);
      if (p.phone) L.push(['전화', p.phone]);
      if (p.kakao) L.push(['카카오톡', p.kakao]);
    }
    const lines = L.filter(x => x[1]);
    return { broker, err, p, lines, one: lines.map(x => `${x[0]} ${x[1]}`).join(' · '),
      text: (broker ? '[중개사무소 정보]\n' : '[작성자 정보]\n') + lines.map(x => `${x[0]}: ${x[1]}`).join('\n') };
  }
  /* 공유 주소 # 뒤에 싣는 표시 정보(로고 제외 — 주소가 너무 길어짐). # 뒤는 서버·통계로 가지 않아요. */
  function packProfile(p) {
    const R = PRO(), c = R.cleanProfile(p || {}); delete c.logo;
    Object.keys(c).forEach(k => { if (!c[k]) delete c[k]; });
    const s = JSON.stringify(c);
    const b = typeof btoa === 'function' ? btoa(unescape(encodeURIComponent(s))) : Buffer.from(s, 'utf8').toString('base64');
    return b.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function unpackProfile(t) {
    try {
      const b = String(t || '').replace(/-/g, '+').replace(/_/g, '/');
      const s = typeof atob === 'function' ? decodeURIComponent(escape(atob(b))) : Buffer.from(b, 'base64').toString('utf8');
      return PRO().cleanProfile(JSON.parse(s));
    } catch (e) { return null; }
  }

  /* ---------- 위치 ---------- */
  function distM(a, b) {
    const lat = (a[1] + b[1]) / 2 * Math.PI / 180;
    return Math.hypot((a[0] - b[0]) * 111320 * Math.cos(lat), (a[1] - b[1]) * 110540);
  }
  /** 가까운 순 n개(max m 안) — list: [[이름, x, y]] */
  function nearest(xy, list, max, n) {
    if (!xy || !Array.isArray(list)) return [];
    return list.map(r => ({ nm: r[0], m: Math.round(distM(xy, [r[1], r[2]]) / 10) * 10 })).filter(r => r.m <= max).sort((a, b) => a.m - b.m).slice(0, n);
  }
  const mText = m => m >= 1000 ? `${(m / 1000).toFixed(1)}km` : `${m}m`;
  /** 걷는 시간 참고(직선 거리 ÷ 분당 67m, 실제 길은 더 김) */
  const walkMin = m => Math.max(1, Math.round(m / 67));

  /* ---------- 매물 설명서 ---------- */
  const GLOSS = [
    ['실거래가', '실제로 계약한 가격을 국토교통부에 신고한 값이에요. 계약 뒤 30일 안에 신고해서 최근 거래는 늦게 보일 수 있어요.'],
    ['전용면적', '현관 안쪽, 우리 집만 쓰는 넓이예요. 계단·복도 같은 공용 부분은 빠져요. 84㎡는 흔히 말하는 34평형이에요.'],
    ['평당가', '전용면적 3.3㎡(1평)당 가격이에요. 크기가 다른 집을 같은 기준으로 비교할 때 써요.'],
    ['신고가', '같은 단지·같은 크기에서 그전까지 가장 높았던 거래 가격을 넘은 거래예요.'],
    ['직거래', '중개사 없이 당사자끼리 한 거래예요. 가족 간 거래 등이 섞일 수 있어 시세 계산에서 뺐어요.'],
    ['직선 거리', '지도에서 두 점을 곧게 이은 거리예요. 실제로 걷는 길은 이보다 길어요.'],
    ['호가', '집주인이 팔겠다고 부르는 가격이에요. 실제 거래 가격과 다를 수 있어요.'],
    ['취득세', '집을 살 때 한 번 내는 지방세예요. 집값·보유 주택 수·지역에 따라 세율이 달라요. 지방교육세·농어촌특별세가 함께 붙어요.'],
    ['조정대상지역', '집값이 많이 오른 곳으로 정부가 정한 지역이에요. 여러 채를 가진 사람이 사면 취득세가 더 무거워요.'],
    ['미래가치 점수', '같은 시·도 아파트와 비교해 앞으로 2년 동안 같은 지역 평균보다 더 오를 쪽인지 나타낸 점수예요(100점 만점, 50점이 가운데).']
  ];
  /** 취득세 예상 4가지(무주택·생애최초·일시적 2주택·2주택 이상) — 세금 계산기와 같은 엔진 TAX.buyerAcqTax. price 만원 */
  function taxRows(price, area, regulated, TAX) {
    if (!(price > 0) || !TAX || !TAX.buyerAcqTax) return null;
    const large = area > 85, reg = regulated === true;
    const C = [['none', '집이 없는 분(첫 집이 아님)'], ['first', '생애 첫 집(본인·배우자 모두 집을 가진 적 없음)'],
      ['one', '집 1채가 있고 기존 집을 기한 안에 파는 분'], ['multi', '집이 2채 이상 있는 분(3번째 집)']];
    return { base: price, large, regulated, asOf: (TAX.CONST && TAX.CONST.CHECKED) || TAX.AS_OF || '',
      rows: C.map(([own, who]) => { const t = TAX.buyerAcqTax(price * 10000, { own, regulated: reg, large }); return { own, who, rate: t.rate, total: t.total, acq: t.acq - t.relief, edu: t.edu, farm: t.farm, heavy: t.heavy, relief: t.relief }; }) };
  }
  /** 미래가치 설명(화면에서 쓰는 문장 그대로) + 과거 성적(VOK: 2번 이상·평균 +·절반 이상 맞을 때만 결론처럼, 아니면 '참고로만') */
  function fvText(fv, fvg, vc, gu) {
    const out = { has: fv != null };
    out.head = fv != null ? `미래가치 점수 ${fv}점(100점 만점, 같은 시·도 단지와 비교)` + (fvg != null ? ` · ${gu || '같은 구'} 안 점수 ${fvg}점` : '') : '';
    out.what = '미래가치 점수는 과거 여러 때에 그때까지의 자료만으로 예측한 뒤 실제 시세와 맞춰 본 방법으로 매긴 점수예요. 같은 지역 평균 대비 순위라, 시장 전체가 내리면 점수가 높은 단지도 내릴 수 있어요.';
    out.past = vc ? (vc.ok ? `이 점수 방법을 과거에 그대로 써 봤더니 ${vc.n}번 중 ${vc.hit}번 맞았어요(${vc.where} 기준).`
      : `이 점수 방법을 과거에 그대로 써 봤더니 ${vc.n}번 중 ${vc.hit}번 맞아, 참고로만 보세요(${vc.where} 기준).`) : '과거에 써 본 기록 자료를 불러오지 못했어요.';
    out.miss = fv == null ? '이 단지·평형은 거래가 적어 미래가치 점수를 매기지 않았어요.' : '';
    return out;
  }
  /** 같은 구 안 다른 단지 같은 평형(직선 max m 안) 최근 거래 1건씩 — units: price/{구}.json, xy: sNN_xy.json xy */
  function nearTrades(u, units, xy, max, n, M) {
    const key = r => `${r[0]}|${r[1]}|${r[8]}`, me = xy[key(u)];
    if (!me) return { miss: '이 단지 위치 자료가 없어 주변 단지를 고르지 못했어요.', rows: [] };
    const rows = [];
    for (const r of units) {
      if (r === u || r[3] !== u[3] || (r[2] === u[2] && r[1] === u[1])) continue;
      const p = xy[key(r)]; if (!p) continue;
      const m = distM(me, p); if (m > max) continue;
      const t = M.trades(r).filter(x => x.type !== '직거래')[0]; if (!t) continue;
      rows.push({ apt: r[2], dong: r[1], band: r[3], m: Math.round(m / 10) * 10, date: t.date, ymd: t.ymd, amt: t.amt, floor: t.floor, area: t.area });
    }
    rows.sort((a, b) => b.ymd - a.ymd || a.m - b.m);
    return { miss: rows.length ? '' : `직선 ${mText(max)} 안에 같은 평형 다른 단지 거래가 없어요.`, rows: rows.slice(0, n) };
  }
  /** 매물 설명서 한 장의 사실값.
      c = { u(price/{구}.json 행), IX(index.json), M(mine-core), fx(점수 묶음|null), vc(rank-core vcheck|null), units(같은 구 행), xy(sNN_xy.json xy|null),
            poi(poi/{시도}.json|null), TAX(tax-engine|null), ADJ(adjusted-areas|null), ask(만원), memo, bd(동), fl(층), date('YYYY-MM-DD') } */
  function listing(c) {
    const M = c.M, u = c.u, IX = c.IX; if (!u || !IX || !M) return null;
    const months = IX.months, sm = M.bandSummary(u, months), last = M.lastDeal(u, months);
    const sg = (IX.sgg || {})[u[0]] || {}, gu = sg.name || u[0], sido = sg.sido || '';
    const sdo = (IX.sido || []).find(s => s.name === sido) || {};
    const list = M.trades(u), alt = (!sm.price || M.isFew(u)) && last;
    const price = alt ? last.price : sm.price;
    const asOfT = { to: IX.dataTo || months[months.length - 1], at: String(IX.updated || '').slice(0, 10) };
    /* 공인중개사가 아니면(c.kind 'danji') 특정 매물 표시(호가·동·층·메모)를 싣지 않는 '단지 분석 자료' — 공인중개사법 제18조의2 제2항 */
    const danji = c.kind === 'danji';
    if (danji) c = Object.assign({}, c, { ask: 0, bd: '', fl: '', memo: '' });
    const S = { kind: danji ? 'danji' : 'listing', title: danji ? '단지 분석 자료' : '매물 설명서', apt: u[2], dong: u[1], gu, sido, short: sdo.short || sido, band: u[3], area: u[4], code: u[0], date: c.date || today(),
      bd: String(c.bd || '').slice(0, 12), fl: String(c.fl || '').slice(0, 8), memo: c.memo || '', disclaim: DISCLAIM };
    S.ask = c.ask > 0 ? { amt: c.ask, vs: price > 0 ? Math.round((c.ask - price) / price * 1000) / 10 : null } : null;
    /* 1) 같은 단지 같은 평형 실거래 */
    S.trades = { src: '국토교통부 아파트 매매 실거래가 공개 자료', asOf: asOfT, rows: list.slice(0, 6),
      miss: list.length ? '' : '이 단지·평형의 개별 실거래 목록이 아직 없어요.' };
    /* 2) 주변 같은 평형 */
    S.near = c.xy ? Object.assign({ src: '국토교통부 아파트 매매 실거래가 공개 자료 · 단지 위치는 국토교통부 공개 주소를 좌표로 바꾼 값', asOf: asOfT, max: 1000 }, nearTrades(u, c.units || [], c.xy, 1000, 5, M))
      : { rows: [], miss: '단지 위치 자료를 불러오지 못해 주변 단지 거래를 고르지 못했어요.', src: '', asOf: asOfT };
    /* 3) 가격 흐름 */
    const ser = (u[6] || []).map((v, i) => ({ ym: months[i], v: v > 0 ? v : 0 }));
    S.trend = { src: '국토교통부 아파트 매매 실거래가 공개 자료(직거래 제외) · 월별 최근 3개월 평당가 중간값', asOf: asOfT, ser,
      price, priceAt: alt ? last.at : sm.at, kind: alt ? 'last' : 'median', ppy: alt ? last.ppy : sm.ppy,
      ch1: sm.ch1 ? Math.round(sm.ch1.pct * 1000) / 10 : null, ch3: sm.ch3 ? Math.round(sm.ch3.pct * 1000) / 10 : null, ch3From: sm.ch3 ? sm.ch3.fromAt : '',
      cnt12: sm.cnt12, miss: ser.filter(x => x.v > 0).length >= 2 ? '' : '가격 흐름을 그릴 만큼 거래가 없어요.' };
    /* 4) 학교·역 */
    const me = c.xy ? c.xy[`${u[0]}|${u[1]}|${u[8]}`] : null, P = c.poi;
    const st = me && P ? nearest(me, P.st, 1500, 3) : [], sc = me && P ? nearest(me, P.sc, 1500, 3) : [];
    S.poi = { me: !!me, st, sc, src: P ? P.src : null, asOf: P ? P.at : null,
      stMiss: !me ? '이 단지 위치 자료가 없어 거리를 재지 못했어요.' : !P ? '역 위치 자료를 불러오지 못했어요.' : st.length ? '' : (P.st || []).length ? '직선 1.5km 안에 지하철역이 없어요.' : '이 지역은 지하철역 위치 자료가 아직 없어요.',
      scMiss: !me ? '이 단지 위치 자료가 없어 거리를 재지 못했어요.' : !P ? '학교 위치 자료를 불러오지 못했어요.' : sc.length ? '' : '직선 1.5km 안에 중학교가 없어요.',
      elem: '초등학교 배정은 교육청 통학구역으로 정해져 거리만으로 알 수 없어요. 관할 교육지원청 학구도 안내에서 확인해 주세요.' };
    /* 5) 미래가치 */
    const fx = c.fx || null;
    S.fv = Object.assign(fvText(fx && fx.fv != null ? fx.fv : null, fx && fx.fvg != null ? fx.fvg : null, c.vc, gu),
      { src: `${SITE} 미래가치 점수(국토교통부 실거래가·인구·공급 등 공공 자료로 계산)`, asOf: { to: asOfT.to } });
    /* 6) 취득세 예상 */
    const base = S.ask ? S.ask.amt : price;
    const adj = c.ADJ && c.ADJ.isAdjusted ? c.ADJ.isAdjusted(S.short, gu, S.date) : 'ask';
    const tx = taxRows(base, u[4], adj, c.TAX);
    S.tax = tx ? Object.assign(tx, { baseKind: S.ask ? 'ask' : danji ? 'band' : 'price', adj, src: `지방세법·지방세특례제한법 기준 · ${SITE} 세금 계산기와 같은 계산`, asOf: tx.asOf,
      note: adj === 'ask' ? '이 지역이 조정대상지역인지 자료로 정하지 못해 조정대상지역이 아닌 것으로 계산했어요. 집이 여러 채면 세금이 더 나올 수 있어요.' : '' })
      : { miss: '가격 자료가 없어 취득세를 계산하지 못했어요.', rows: [] };
    S.gloss = danji ? GLOSS.filter(g => g[0] !== '호가') : GLOSS;
    return S;
  }

  /* ---------- 공유 주소 ---------- */
  function encodeListing(o) {
    const q = new URLSearchParams();
    ['sd', 'g', 'd', 'j', 'a', 'b'].forEach(k => { if (o[k]) q.set(k, String(o[k]).slice(0, 80)); });
    const ask = Math.round(Number(o.ask) || 0); if (ask > 0 && ask < 10000000) q.set('ask', String(ask));
    if (o.bd) q.set('bd', String(o.bd).replace(/[^0-9A-Za-z가-힣-]/g, '').slice(0, 12));
    if (o.fl) q.set('fl', String(o.fl).replace(/[^0-9A-Za-z가-힣-]/g, '').slice(0, 8));
    const m = cleanMemo(o.memo); if (m.ok && m.v) q.set('m', m.v);
    return q.toString();
  }
  function decodeListing(search) {
    const q = new URLSearchParams(search || ''), s = k => String(q.get(k) || '').slice(0, 80);
    const o = { sd: s('sd'), g: s('g'), d: s('d'), j: s('j'), a: s('a'), b: s('b'), ask: 0, bd: s('bd').replace(/[^0-9A-Za-z가-힣-]/g, '').slice(0, 12), fl: s('fl').replace(/[^0-9A-Za-z가-힣-]/g, '').slice(0, 8), memo: '' };
    if (!/^s\d{2}$/.test(o.sd)) o.sd = ''; if (!/^\d{5}$/.test(o.g)) o.g = '';
    const ask = Math.round(Number(q.get('ask')) || 0); if (ask > 0 && ask < 10000000) o.ask = ask;
    const m = cleanMemo(q.get('m')); if (m.ok) o.memo = m.v;
    return o;
  }

  /* ---------- 주간 글: 씨앗으로 문장 틀 고르기 ---------- */
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const hashS = s => { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
  function picker(seed) { return (slot, arr) => arr[Math.floor(rng((seed ^ hashS(slot)) >>> 0)() * arr.length)]; }
  const tAt = t => ymd(t.dt);
  /** 같은 단지·같은 평형은 한 번만(예시가 한 단지로 몰리지 않게) */
  const uniq = a => { const seen = {}; return (a || []).filter(t => { const k = t.a + '|' + t.b; return seen[k] ? false : (seen[k] = 1); }); };
  const isWeek = K => (K.wk || {}).basis === 'new';
  const tName = t => `${t.d} ${t.a} ${t.b}`;
  /** 기간 문구 */
  function period(K) {
    const w = K.wk || {};
    if (w.basis === 'new') return { short: `${mdS(w.from)}~${mdS(w.to)} 공개분`, long: `국토교통부 실거래가 공개 자료에 ${md(w.from)}부터 ${md(w.to)}까지 새로 올라온 거래`, lag: '' };
    return { short: `계약일 ${mdS(w.p0)}~${mdS(w.p1)}`, long: `계약일 기준 최근 30일(${md(w.p0)}~${md(w.p1)}) 국토교통부 실거래가 공개 자료`, lag: '실거래 신고 기한이 계약 뒤 30일이라 이 기간 숫자는 앞으로 조금 늘 수 있다.' };
  }
  const wkLabel = K => { const d = new Date(String((K.wk || {}).to || K.built) + 'T00:00:00Z'); const n = Math.floor((d.getUTCDate() - 1) / 7) + 1; return `${d.getUTCMonth() + 1}월 ${n}째 주`; };

  /** 블로그 글(다체 칼럼) — K: data/brief/kit/{구}.json, o = { profile, seed(선택, 기본 K.seed), site } → { title, body, text, md, len } */
  function blog(K, o) {
    o = o || {};
    const pick = picker((o.seed != null ? o.seed : K.seed) >>> 0), N = K.name, P = period(K), out = [];
    const span = isWeek(K) ? '이번 주' : '최근 30일';
    const title = pick('title', [
      `${N} 아파트 실거래 ${isWeek(K) ? '주간' : '최근 30일'} 정리 — 신고가 ${K.nhi}건·하락 ${K.ndrop}건`,
      `[${wkLabel(K)}] ${N} 아파트, 실거래로 본 ${span} 흐름`,
      `${N} 실거래 ${K.n}건 살펴보기: 신고가·하락 거래와 청약 일정`,
      `${span} ${N} 아파트 시장 — 숫자로 정리한 실거래·청약·정책`]);
    out.push(pick('intro', [
      `이번 주도 ${J(N, '을', '를')} 공개 자료로만 정리했다. 예상이나 소문이 아니라 실제로 신고된 거래와 공식 일정만 담았다.`,
      `${N}에서 어떤 거래가 있었는지 숫자로 짚어 본다. 모든 숫자는 국토교통부 실거래가 공개 자료와 청약홈 공고에서 가져왔다.`,
      `집을 사고팔 계획이 있다면 가장 먼저 볼 것은 실제 거래 가격이다. ${N} 아파트의 최근 실거래를 한 번에 정리했다.`,
      `호가보다 먼저 확인해야 할 것은 실제로 계약된 가격이다. ${N} 아파트 실거래를 기간·단지별로 정리했다.`]));
    /* 거래 수 */
    if (K.n > 0) {
      out.push(`${P.long}를 모아 보니 ${N} 아파트 매매는 ${K.n}건이다.` + (K.nx ? ` 이 가운데 ${K.nx}건은 직거래(중개 없이 당사자끼리 한 거래)라 신고가·하락 판단에서 뺐다.` : '') + (P.lag ? ' ' + P.lag : ''));
      const ds = (K.dongs || []).slice(0, 3).filter(x => x[1] > 0);
      if (ds.length >= 2) out.push(pick('dong', [
        `동별로는 ${ds.map(x => `${x[0]} ${x[1]}건`).join(', ')} 순으로 거래가 많았다.`,
        `거래가 가장 많았던 곳은 ${J(ds[0][0], '으로', '로')} ${ds[0][1]}건이고, ${ds.slice(1).map(x => `${x[0]} ${x[1]}건`).join(', ')}이 뒤를 이었다.`,
        `동네별로 나눠 보면 ${ds[0][0]}(${ds[0][1]}건)에 거래가 가장 많이 몰렸다. 그다음은 ${ds.slice(1).map(x => `${x[0]}(${x[1]}건)`).join('·')}이다.`]));
      const b = (K.bands || [])[0];
      if (b) out.push(pick('band', [
        `가장 많이 거래된 크기는 전용 ${b[0]}(${b[1]}건)이고, 이 크기 거래 가격의 중간값은 ${won(b[2])}이다. 중간값은 가격을 크기순으로 늘어놓았을 때 가운데 값이라 아주 비싸거나 싼 몇 건에 덜 흔들린다.`,
        `크기별로는 전용 ${b[0]} 거래가 ${b[1]}건으로 가장 많았다. 이 크기의 중간 거래 가격은 ${won(b[2])}이다(중간값: 가격을 크기순으로 늘어놓았을 때 가운데 값).`]));
    } else {
      out.push(`${P.long}에서 ${N} 아파트 매매는 아직 보이지 않는다.` + (P.lag ? ' ' + P.lag : ' 공개 자료가 늦게 올라오는 주도 있어 다음 주에 함께 정리한다.'));
    }
    /* 신고가 */
    if (K.nhi > 0) {
      const ex = uniq((K.hi || []).filter(t => !t.sus).slice().sort((a, b) => b.p - a.p)).slice(0, 3);   // 특수 거래 의심 신고가는 예시에서 뺌   // 예시는 금액이 큰 거래부터, 단지마다 한 번
      out.push(pick('hiHead', [`신고가는 ${K.nhi}건이다. 신고가는 같은 단지·같은 크기에서 그전까지 가장 높았던 가격을 넘은 거래를 말한다.`,
        `그전 최고 가격을 넘어선 신고가 거래가 ${K.nhi}건 나왔다(같은 단지·같은 크기 기준).`,
        `눈여겨볼 것은 신고가 ${K.nhi}건이다. 같은 단지·같은 크기에서 이전 최고 가격보다 높게 계약된 거래다.`])
        + ' ' + ex.map(t => `${J(tName(t), '은', '는')} ${tAt(t)}에 ${t.f ? t.f + '층이 ' : ''}${won(t.p)}에 계약돼 이전 최고가(${ymd(t.pmd)}) ${J(won(t.pm), '을', '를')} 넘었다.`).join(' '));
    } else out.push(pick('hi0', [`이번 기간에 신고가 거래는 없었다.`, `같은 단지·같은 크기의 이전 최고 가격을 넘은 거래(신고가)는 이번에 나오지 않았다.`]));
    /* 하락 */
    if (K.ndrop > 0) {
      const ex = uniq(K.drop).slice(0, 2);
      out.push(pick('drHead', [`반대로 최근 2년 최고가보다 10% 넘게 낮게 계약된 거래는 ${K.ndrop}건이다.`, `최근 2년 최고가와 비교해 10% 넘게 낮은 거래도 ${K.ndrop}건 있었다.`])
        + ' ' + ex.map(t => `${J(tName(t), '은', '는')} ${t.f ? t.f + '층이 ' : ''}${J(won(t.p), '으로', '로')} 계약돼 최근 2년 최고가(${ymd(t.m2d)}) ${won(t.m2)}보다 ${Math.abs(t.dr).toFixed(1)}% 낮았다.`).join(' ')
        + ' ' + pick('drNote', ['층·향·수리 상태에 따라 가격 차이가 크기 때문에 한두 건만으로 시세가 내렸다고 보기는 어렵다.', '다만 같은 단지라도 층과 향, 수리 상태가 다르면 가격이 크게 달라진다.']));
    } else out.push(`최근 2년 최고가보다 10% 넘게 낮은 거래는 없었다.`);
    /* 급매 */
    if (K.nurg > 0) {
      const t = (K.urg || [])[0];
      out.push(`같은 단지·같은 크기의 최근 3개월 거래 중간값보다 10% 넘게 싸게 계약된 거래(흔히 급매로 보는 거래)는 ${K.nurg}건이다.` + (t ? ` 예를 들어 ${J(tName(t), '은', '는')} ${J(won(t.p), '으로', '로')} 계약돼 최근 3개월 중간값 ${won(t.med)}보다 ${Math.abs(t.disc).toFixed(1)}% 낮았다${t.x ? '(직거래)' : ''}.` : ''));
    } else out.push(pick('urg0', [`최근 3개월 같은 단지 거래 중간값보다 10% 넘게 싼 거래(급매로 볼 만한 거래)는 보이지 않았다.`, `급매로 볼 만한 거래, 즉 같은 단지 최근 3개월 중간값보다 10% 넘게 싼 거래는 없었다.`]));
    /* 최근 30일 같은 집끼리 비교 */
    const m = K.m30;
    if (m && m.n) out.push(pick('m30', [
      `흐름을 조금 넓혀 보면, 최근 30일(${md(m.from)}~${md(m.to)}) 계약 ${m.n}건을 같은 단지·같은 크기의 직전 3개월 중간값과 비교했을 때 중간 ${pct(m.chg)}이다. ${m.n}건 중 ${m.up}건이 직전보다 비싸게 거래됐다.`,
      `같은 집끼리 비교한 흐름도 함께 본다. 최근 30일 계약 ${m.n}건을 같은 단지·같은 크기의 직전 3개월 중간값과 견주면 중간 ${pct(m.chg)}이고, 그중 ${m.up}건은 더 비싸게 계약됐다.`]) + ' 서로 다른 단지를 섞어 평균 내면 비싼 단지가 많이 팔린 주에 값이 오른 것처럼 보이는데, 같은 집끼리 비교하면 그런 착시가 줄어든다.');
    /* 청약 */
    const cy = (K.cy || []).slice(0, 3);
    if (cy.length) out.push(pick('cyHead', ['청약 일정도 챙겨 볼 만하다.', '이번 주 청약 일정도 정리했다.', `${N} 청약 일정은 다음과 같다.`]) + ' '
      + cy.map(n => `${n.d ? n.d + ' ' : ''}${n.n}(${n.k})${n.rc && n.rc[0] ? `는 ${md(n.rc[0])}${n.rc[1] && n.rc[1] !== n.rc[0] ? '~' + md(n.rc[1]) : ''}에 접수를 받는다` : n.pb ? `는 ${md(n.pb)}에 공고가 났다` : ''}${n.hh ? `(${n.hh}세대)` : ''}.`).join(' ')
      + ' 자세한 자격과 일정은 청약홈 공고 원문에서 확인해야 한다.');
    else out.push(`이번 기간 ${N}에 접수가 잡힌 청약 공고는 없다.`);
    /* 정책 */
    const pol = (K.pol || []).slice(0, 2), pn = ((K.pnews || {}).items || []).slice(0, 2);
    if (pol.length || pn.length) out.push(pick('polHead', ['새로 확인된 정책 소식도 있다.', '정책 쪽에서도 확인할 내용이 있다.']) + ' '
      + pol.map(p => `${J(p.name, '은', '는')} ${md(p.d)}에 '${p.stage}' 단계가 됐다.`).concat(pn.map(x => `${x.org ? x.org + '는 ' : ''}${md(x.d)}에 '${x.t}'를 발표했다.`)).join(' ')
      + ' 실제 적용 시점과 대상은 발표 원문으로 확인하는 것이 좋다.');
    else out.push(pick('pol0', [`최근 2주 안에 ${J(N, '과', '와')} 관련해 새로 확인된 정책 단계 변화는 없다.`, `정책 쪽에서는 최근 2주 동안 ${N}에 적용되는 새 단계 변화가 확인되지 않았다.`]));
    /* 맺음 — 독자에게 말을 거는 문장은 존칭 */
    out.push(pick('close', [
      '숫자는 흐름을 보는 출발점일 뿐이고, 실제 매물 가격은 동·층·향·수리 상태에 따라 다르다. 관심 있는 단지가 있다면 최근 거래와 지금 나온 매물을 함께 비교해 보세요.',
      '실거래는 이미 끝난 계약의 기록이다. 지금 사거나 팔 집의 가격은 같은 단지 최근 거래와 지금 나온 매물을 나란히 놓고 판단해 보세요.',
      '한 주의 숫자만으로 시장 방향을 단정하기는 어렵다. 몇 주 흐름을 이어서 보면 판단에 도움이 됩니다.']));
    /* 길이 맞추기(공백 포함 1,200~1,800자): 짧으면 '숫자 읽는 법'을 더하고, 길면 예시 문장을 줄임 */
    const len = () => out.join('\n\n').length;
    if (len() < 1200) out.splice(out.length - 1, 0, pick('howto', [
      '이 글의 숫자를 읽는 법도 덧붙인다. 실거래가는 실제로 계약한 가격을 신고한 값이고, 계약 뒤 30일 안에 신고하기 때문에 최근 거래는 늦게 보일 수 있다. 신고가는 같은 단지·같은 크기의 이전 최고 가격을 넘은 거래이고, 직거래는 중개 없이 당사자끼리 한 거래라 가족 간 거래 등이 섞일 수 있어 판단에서 뺐다.',
      '숫자를 볼 때 알아 두면 좋은 점이 있다. 실거래 신고는 계약 뒤 30일 안에 하면 되기 때문에 가장 최근 거래는 아직 다 보이지 않는다. 또 직거래는 가족 간 거래처럼 시세와 다른 가격이 섞일 수 있어 신고가·하락을 셀 때 뺐다. 중간값은 가격을 크기순으로 늘어놓았을 때 가운데 값이라 아주 비싸거나 싼 몇 건에 덜 흔들린다.']));
    for (let k = 0; len() > 1800 && k < out.length; k++) {
      const i = out.findIndex(x => / 예를 들어 /.test(x) || /이전 최고가\(/.test(x) && (x.match(/넘었다\./g) || []).length > 1 || /최근 2년 최고가\(/.test(x) && (x.match(/낮았다\./g) || []).length > 1);
      if (i < 0) break;
      out[i] = out[i].replace(/( [^.]*?넘었다\.)(?=[^.]*넘었다\.)/, '').replace(/( [^.]*?낮았다\.)(?=[^.]*낮았다\.)/, '').replace(/ 예를 들어 .*?낮았다(\(직거래\))?\./, '');
    }
    const asof = K.asof || {};
    const src = `자료: 국토교통부 아파트 매매 실거래가 공개 자료(${P.short}${asof.t ? `, ${mdS(asof.t)} 수집분` : ''})` + (cy.length ? `, 청약홈 분양 공고(${mdS(asof.cy)} 확인)` : '') + (pol.length || pn.length ? ', 정부·지자체 공식 발표' : '') + '. 신고가·하락 판단에서 직거래는 뺐다.';
    const body = out.join('\n\n');
    const ad = o.profile ? adBlock(o.profile) : null;
    const tail = [src, ad && !ad.err ? ad.text : ''].filter(Boolean).join('\n\n');
    const text = `${title}\n\n${body}\n\n${tail}\n`;
    const mdTxt = `# ${title}\n\n${body}\n\n---\n\n${tail.replace(/\n/g, '  \n')}\n`;
    return { title, body, src, ad, text, md: mdTxt, len: body.length, lenNoSp: body.replace(/\s/g, '').length };
  }
  /** 인스타 설명글 + 해시태그 */
  function caption(K, o) {
    o = o || {};
    const pick = picker(((o.seed != null ? o.seed : K.seed) ^ 0x51) >>> 0), N = K.name, P = period(K);
    const L = [pick('cap', [`${N} 아파트 실거래 정리 (${P.short})`, `[${wkLabel(K)}] ${N} 실거래 한눈에`, `${N} ${isWeek(K) ? '이번 주' : '최근 30일'} 실거래, 숫자로 정리했어요`])];
    L.push(`· 매매 ${K.n}건` + (K.nx ? `(직거래 ${K.nx}건 포함)` : ''));
    L.push(`· 신고가 ${K.nhi}건 · 최근 2년 최고가보다 10% 넘게 낮은 거래 ${K.ndrop}건`);
    L.push(`· 최근 3개월 중간값보다 10% 넘게 싼 거래 ${K.nurg}건`);
    const cy = (K.cy || [])[0]; if (cy) L.push(`· 청약: ${cy.n}${cy.rc && cy.rc[0] ? ` ${mdS(cy.rc[0])} 접수` : ''}`);
    L.push(pick('capGo', ['카드를 넘겨 단지별 거래를 확인해 보세요.', '자세한 단지별 거래는 카드에 정리했어요.', '단지 이름과 가격은 카드에서 확인해 주세요.']));
    L.push(`자료: 국토교통부 실거래가 공개 자료(${P.short})${cy ? ', 청약홈 공고' : ''}`);
    const ad = o.profile ? adBlock(o.profile) : null;
    if (ad && !ad.err) L.push('', ad.text);
    const tag = s => '#' + String(s).replace(/[^0-9A-Za-z가-힣]/g, '');
    const base = N.replace(/(특별|광역)?시$|군$/, '');
    const tags = [tag(N), tag(N + '아파트'), tag(base + '부동산')].concat((K.dongs || []).slice(0, 3).map(d => tag(d[0] + '아파트')))
      .concat(['#아파트실거래가', '#실거래가', K.nhi ? '#신고가' : '', cy ? '#청약' : '', '#부동산시장', '#내집마련']).filter(Boolean);
    const uniq = tags.filter((t, i) => tags.indexOf(t) === i);
    return { text: L.join('\n') + '\n\n' + uniq.join(' '), tags: uniq };
  }
  /** 카드 4~6장 설계(그리기는 drawCard) */
  function cards(K, o) {
    o = o || {};
    const N = K.name, P = period(K), ad = o.profile ? adBlock(o.profile) : null;
    const foot = `자료: 국토교통부 실거래가 공개 자료 · ${P.short}`;
    const C = [{ k: 'cover', kicker: `${N} 아파트`, title: isWeek(K) ? '이번 주 실거래 정리' : '최근 30일 실거래 정리', sub: P.short,
      stats: [['매매', `${K.n}건`], ['신고가', `${K.nhi}건`], ['2년 최고가보다 10% 넘게 낮은 거래', `${K.ndrop}건`]],
      lines: [`급매로 볼 만한 거래 ${K.nurg}건 (같은 단지 최근 3개월 중간값보다 10% 넘게 쌈)`].concat(K.nx ? [`직거래 ${K.nx}건은 신고가·하락 판단에서 뺐어요`] : []).concat(P.lag ? ['신고 기한(30일)이 남아 숫자가 늘 수 있어요'] : []), foot }];
    if ((K.hi || []).length) C.push({ k: 'list', kicker: '신고가', title: `신고가 ${K.nhi}건`, sub: '같은 단지·같은 크기 이전 최고가를 넘은 거래',
      rows: uniq(K.hi.filter(t => !t.sus).slice().sort((a, b) => b.p - a.p)).slice(0, 4).map(t => [`${t.a} ${t.b}`, won(t.p).replace(' 원', ''), `${t.d} · ${tAt(t)}${t.f ? ` · ${t.f}층` : ''} · 이전 최고 ${won(t.pm).replace(' 원', '')}`]), foot });
    if ((K.drop || []).length) C.push({ k: 'list', kicker: '하락', title: `최근 2년 최고가보다 10% 넘게 낮은 거래 ${K.ndrop}건`, sub: '층·향·수리 상태에 따라 가격 차이가 있어요',
      rows: uniq(K.drop).slice(0, 4).map(t => [`${t.a} ${t.b}`, won(t.p).replace(' 원', ''), `${t.d} · ${tAt(t)}${t.f ? ` · ${t.f}층` : ''} · 2년 최고 대비 ${pct(t.dr)}`]), foot });
    if ((K.dongs || []).length >= 2) C.push({ k: 'bars', kicker: '동별 거래', title: '어느 동에서 많이 거래됐을까', sub: P.short,
      bars: K.dongs.slice(0, 6).map(d => [d[0], d[1]]), foot });
    if ((K.cy || []).length || (K.bands || []).length) C.push((K.cy || []).length ? { k: 'list', kicker: '청약 일정', title: '청약 접수 일정', sub: '자격·일정은 청약홈 공고 원문으로 확인해 주세요',
      rows: K.cy.slice(0, 4).map(n => [n.n, n.rc && n.rc[0] ? `${mdS(n.rc[0])}${n.rc[1] && n.rc[1] !== n.rc[0] ? '~' + mdS(n.rc[1]) : ''}` : '', `${n.d || ''} · ${n.k}${n.hh ? ` · ${n.hh}세대` : ''}`]), foot: `자료: 청약홈 분양 공고 · ${mdS((K.asof || {}).cy)} 확인` }
      : { k: 'list', kicker: '크기별 가격', title: '크기별 거래 가격 중간값', sub: '가격을 크기순으로 늘어놓았을 때 가운데 값',
        rows: K.bands.slice(0, 4).map(b => [`전용 ${b[0]}`, won(b[2]).replace(' 원', ''), `${b[1]}건`]), foot });
    C.push({ k: 'end', kicker: ad && !ad.err ? (ad.broker ? '중개사무소 정보' : '작성자 정보') : SITE, title: ad && !ad.err ? ad.p.office : '숫자로 보는 우리 동네',
      lines: ad && !ad.err ? ad.lines.map(x => `${x[0]} ${x[1]}`) : ['공개 자료로 정리했어요'], sub: '단지별 자세한 거래는 문의해 주세요', foot });
    while (C.length < 4) C.splice(C.length - 1, 0, { k: 'note', kicker: '읽는 법', title: '숫자 읽는 법', lines: ['신고가: 이전 최고 가격을 넘은 거래', '직거래: 중개 없이 한 거래(판단에서 뺌)', '중간값: 크기순으로 늘어놓았을 때 가운데 값'], foot });
    return C.slice(0, 6).map(c => Object.assign(c, { ad: ad && !ad.err ? ad.one : '' }));
  }

  /* ---------- 카드 그리기(브라우저) — A+ 테마: 흰 바탕·파랑 #2560E8·금색 점 ---------- */
  const TH = { bg: '#FFFFFF', ink: '#191F28', sub: '#4E5968', blue: '#2560E8', blue2: '#E8F0FF', gold: '#B8942A', line: '#E5E8EB', soft: '#F2F6FF' };
  /* 줄 바꿈: 띄어쓰기에서 먼저 끊고, 한 낱말이 한 줄보다 길 때만 글자 단위로 */
  function wrap(ctx, text, w) {
    const out = []; let cur = '';
    for (const word of String(text).split(/(\s+)/)) {
      if (!word) continue;
      if (ctx.measureText(cur + word).width <= w) { cur += word; continue; }
      if (cur.trim()) out.push(cur.trimEnd());
      cur = word.trim() ? word : '';
      while (ctx.measureText(cur).width > w) { let k = cur.length; while (k > 1 && ctx.measureText(cur.slice(0, k)).width > w) k--; out.push(cur.slice(0, k)); cur = cur.slice(k); }
    }
    if (cur.trim()) out.push(cur.trimEnd()); return out;
  }
  function fit(ctx, text, w, size, weight, min) {
    let s = size; ctx.font = `${weight} ${s}px 'Noto Sans KR', sans-serif`;
    while (ctx.measureText(text).width > w && s > (min || 20)) { s -= 2; ctx.font = `${weight} ${s}px 'Noto Sans KR', sans-serif`; }
    return s;
  }
  function drawCard(cv, c, i, n) {
    const W = 1080, ctx = cv.getContext('2d'); cv.width = W; cv.height = W;
    const F = (s, w) => { ctx.font = `${w || 700} ${s}px 'Noto Sans KR', sans-serif`; };
    ctx.fillStyle = TH.bg; ctx.fillRect(0, 0, W, W);
    ctx.fillStyle = TH.blue; ctx.fillRect(0, 0, W, 14);
    /* 머리: 작은 금색 집 표시 + 서비스 이름 · 쪽 번호 */
    ctx.fillStyle = TH.gold; ctx.beginPath(); ctx.arc(84, 82, 11, 0, Math.PI * 2); ctx.fill();
    F(28, 700); ctx.fillStyle = TH.sub; ctx.textBaseline = 'middle'; ctx.fillText(c.kicker, 108, 84);
    F(26, 500); ctx.textAlign = 'right'; ctx.fillText(`${i + 1} / ${n}`, W - 72, 84); ctx.textAlign = 'left';
    let y = 170;
    ctx.textBaseline = 'alphabetic'; ctx.fillStyle = TH.ink;
    const ts = fit(ctx, c.title, W - 144, c.k === 'cover' ? 84 : 58, 900, 34);
    const tl = wrap(ctx, c.title, W - 144).slice(0, 2);
    tl.forEach(l => { ctx.fillText(l, 72, y + ts * 0.85); y += ts * 1.25; });
    if (c.sub) { F(30, 500); ctx.fillStyle = TH.sub; wrap(ctx, c.sub, W - 144).slice(0, 2).forEach(l => { ctx.fillText(l, 72, y + 30); y += 44; }); }
    y += 26;
    if (c.k === 'cover') {
      const bw = (W - 144 - 40) / 3;
      c.stats.forEach((s, k) => {
        const x = 72 + k * (bw + 20);
        ctx.fillStyle = k === 0 ? TH.blue : TH.soft; roundRect(ctx, x, y + 40, bw, 300, 28); ctx.fill();
        ctx.fillStyle = k === 0 ? '#fff' : TH.sub; F(28, 700); wrap(ctx, s[0], bw - 48).slice(0, 2).forEach((l, q) => ctx.fillText(l, x + 26, y + 100 + q * 38));
        ctx.fillStyle = k === 0 ? '#fff' : TH.ink; fit(ctx, s[1], bw - 52, 96, 900, 40); ctx.fillText(s[1], x + 26, y + 300);
      });
      let yy = y + 410;
      (c.lines || []).forEach(l => { F(29, 500); ctx.fillStyle = TH.sub; wrap(ctx, '· ' + l, W - 144).slice(0, 2).forEach(t => { ctx.fillText(t, 72, yy); yy += 42; }); yy += 4; });
    } else if (c.k === 'list') {
      const rh = Math.min(150, (W - 180 - y) / Math.max(1, c.rows.length));
      c.rows.forEach((r, k) => {
        const yy = y + k * rh;
        ctx.fillStyle = k % 2 ? TH.bg : TH.soft; roundRect(ctx, 60, yy, W - 120, rh - 14, 20); ctx.fill();
        ctx.fillStyle = TH.ink; const vs = fit(ctx, r[1], 300, 42, 900, 24); const vw = ctx.measureText(r[1]).width;
        ctx.fillStyle = TH.blue; ctx.textAlign = 'right'; ctx.fillText(r[1], W - 92, yy + rh / 2 + vs * 0.1); ctx.textAlign = 'left';
        ctx.fillStyle = TH.ink; fit(ctx, r[0], W - 220 - Math.max(220, vw), 36, 800, 22); ctx.fillText(r[0], 92, yy + rh / 2 - 14);
        F(25, 500); ctx.fillStyle = TH.sub; const sl = wrap(ctx, r[2], W - 220 - Math.max(220, vw))[0] || ''; ctx.fillText(sl, 92, yy + rh / 2 + 26);
      });
    } else if (c.k === 'bars') {
      const max = Math.max(...c.bars.map(b => b[1]), 1), bh = Math.min(96, (W - 190 - y) / c.bars.length);
      c.bars.forEach((b, k) => {
        const yy = y + k * bh, bw = (W - 420) * b[1] / max;
        F(32, 700); ctx.fillStyle = TH.ink; ctx.fillText(b[0], 72, yy + bh / 2 + 4);
        ctx.fillStyle = k === 0 ? TH.blue : '#9DB8FF'; roundRect(ctx, 250, yy + bh * 0.18, Math.max(8, bw), bh * 0.58, 12); ctx.fill();
        F(32, 900); ctx.fillStyle = TH.ink; ctx.fillText(`${b[1]}건`, 270 + Math.max(8, bw), yy + bh / 2 + 4);
      });
    } else {
      (c.lines || []).forEach((l, k) => { F(k === 0 && c.k === 'end' ? 38 : 34, k === 0 && c.k === 'end' ? 800 : 500); ctx.fillStyle = TH.ink; wrap(ctx, l, W - 144).slice(0, 2).forEach(t => { ctx.fillText(t, 72, y + 40); y += 54; }); y += 8; });
    }
    /* 바닥: 출처 + 중개사 표시(모든 장) */
    ctx.fillStyle = TH.line; ctx.fillRect(72, W - 150, W - 144, 2);
    F(23, 500); ctx.fillStyle = TH.sub; ctx.fillText(wrap(ctx, c.foot, W - 144)[0] || '', 72, W - 112);
    if (c.ad && c.k !== 'end') { F(21, 500); wrap(ctx, c.ad, W - 144).slice(0, 2).forEach((t, q) => ctx.fillText(t, 72, W - 78 + q * 30)); }
    else { F(22, 700); ctx.fillStyle = TH.blue; ctx.fillText(SITE, 72, W - 72); }
  }
  function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

  /* ---------- 표시 정보 입력 칸(브라우저) — premium/pro 와 같은 저장 칸 'jdj_pro_profile' 을 함께 씀 ---------- */
  const PKEY = 'jdj_pro_profile';
  function loadProfile() { try { return PRO().cleanProfile(JSON.parse(root.localStorage.getItem(PKEY) || '{}')); } catch (e) { return PRO().cleanProfile({}); } }
  function saveProfile(p) { try { const old = JSON.parse(root.localStorage.getItem(PKEY) || '{}') || {}; const c = PRO().cleanProfile(Object.assign({}, p, { logo: old.logo || '' })); root.localStorage.setItem(PKEY, JSON.stringify(c)); } catch (e) {} }
  /** box 안에 유형·이름·등록번호 칸을 그리고 바뀔 때마다 on(profile).
      유형을 고르면 꼭 필요한 칸만 먼저 보이고(칸마다 왜 필요한지 작은 글씨), 선택 칸은 [선택 칸 더 보기]로 펼침. 빠진 칸은 한 줄씩 이유와 함께 안내. */
  function mountProfile(box, on) {
    const R = PRO(); let p = loadProfile(), more = false;
    const K = ['name', 'office', 'ceo', 'title', 'reg', 'addr', 'phone', 'kakao', 'biz'];
    const ph = { office: '예: 잠실한빛공인중개사사무소', ceo: '예: 홍길동', name: '예: 김민수', reg: '예: 11710-2020-00123', biz: '숫자 10자리', addr: '예: 서울 송파구 올림픽로 000, 1층', phone: '예: 02-000-0000', kakao: 'https://pf.kakao.com/…' };
    const PH = { seller: { office: '예: ○○분양대행(주)', title: '예: ○○역 ○○아파트 분양 상담', name: '예: 김민수 또는 활동명' }, consult: { office: '예: ○○부동산연구소, ○○TV', title: '예: ○○대 교수', name: '예: 김민수 또는 활동명' }, licensed: { office: '예: ○○세무회계', name: '예: 김민수' } };
    box.innerHTML = `<label class="bt-l" for="btRole">나는</label><select id="btRole">${Object.keys(R.ROLE).map(k => `<option value="${k}">${esc(R.ROLE[k].t)}</option>`).join('')}</select>
      <p class="bt-h" id="btRule"></p>
      <div class="bt-two">${K.map(k => `${k === 'phone' ? '<p class="bt-cn" id="btCn"></p>' : ''}<div data-f="${k}"><label class="bt-l" for="bt_${k}"></label>${k === 'title' ? `<input id="bt_${k}" list="btQuals">` : `<input id="bt_${k}"${k === 'phone' ? ' inputmode="tel"' : ''}>`}<p class="bt-h bt-why"></p></div>`).join('')}</div>
      <datalist id="btQuals">${R.QUALS.map(q => `<option value="${q}">`).join('')}</datalist>
      <button type="button" class="bt-more" id="btMore"></button>
      <ul class="bt-e" id="btErr" role="alert"></ul>`;
    if (root.document && !root.document.getElementById('bt-css')) {
      const st = root.document.createElement('style'); st.id = 'bt-css';
      st.textContent = '.bt-why{font-size:12.5px;color:#5F6B7A;margin:3px 0 4px}.bt-cn{grid-column:1/-1;font-size:13.5px;font-weight:700;color:#191F28;margin:12px 0 0}.bt-more{font:inherit;font-size:14px;font-weight:700;color:#2560E8;background:none;border:0;padding:8px 0;min-height:44px;cursor:pointer}.bt-e{list-style:none;padding:0;margin:6px 0 0;color:#8A6A12!important;font-weight:500!important}.tried .bt-e{color:#C2410C!important;font-weight:700!important}.bt-e li{margin:2px 0}.bt-e li:before{content:"· "}.bt-l .opt{font-weight:500;color:#5F6B7A}';
      (root.document.head || root.document.documentElement).appendChild(st);
    }
    const $ = id => box.querySelector('#' + id);
    const spec = () => Object.assign({}, R.fieldsOf(p.role) || {}, R.contactOf(p.role));
    const paint = () => {
      const f = spec(); let opt = 0;
      K.forEach(k => {
        const d = box.querySelector(`[data-f="${k}"]`), def = f[k];
        const req = def && def[1] > 0, show = !!def && (req || more || !!p[k]);
        if (def && !req && !p[k]) opt++;
        d.hidden = !show; if (!def) return;
        d.querySelector('label').innerHTML = esc(def[0].replace(/ \(선택[^)]*\)$/, '')) + (req ? '' : ' <span class="opt">(선택)</span>');
        d.querySelector('.bt-why').textContent = def[2] || '';
        d.querySelector('input').placeholder = ((PH[p.role] || {})[k]) || ph[k] || '';
      });
      const cn = $('btCn'); cn.hidden = !(f.phone && f.phone[1] === 2); cn.textContent = R.CONTACT_NOTE;
      $('btMore').hidden = !opt; $('btMore').textContent = more ? '선택 칸 접기' : `선택 칸 더 보기 (${opt}개)`;
      $('btRule').textContent = R.BROKER(p.role) ? '공인중개사는 중개사무소 이름·소재지·등록번호·대표 이름·전화번호가 모든 자료에 함께 나와요(공인중개사법 표시 규정).'
        : '공인중개사가 아니면 이름 또는 활동명과 연락처 하나만 있으면 돼요. \'공인중개사\'·\'중개사무소\' 같은 이름은 쓸 수 없어요.';
      const e = R.profileErrors(p); $('btErr').innerHTML = e.map(x => `<li>${esc(x)}</li>`).join(''); box.classList.toggle('bad', e.length > 0);
    };
    $('btRole').value = p.role; K.forEach(k => { $('bt_' + k).value = p[k] || ''; });
    const read = () => { const raw = { role: $('btRole').value }; K.forEach(k => { raw[k] = $('bt_' + k).value; }); return raw; };
    const upd = () => { p = R.cleanProfile(read()); saveProfile(p); paint(); on && on(p); };
    $('btRole').onchange = () => { more = false; upd(); };
    $('btMore').onclick = () => { more = !more; paint(); };
    K.forEach(k => { $('bt_' + k).oninput = upd; });
    paint(); on && on(p);
    return { get: () => p, err: () => R.profileError(p), errs: () => R.profileErrors(p), broker: () => R.BROKER(p.role), tried: () => box.classList.add('tried') };
  }

  /* ---------- 이용 확인(브라우저): 서버 toolQuota·toolUse ----------
     로그인 기능이 꺼진 환경이거나 서버가 아직 이 기능을 모르면(재배포 전) {soft:true} — 화면은 막지 않음. */
  function sessS() { try { const j = JSON.parse(root.localStorage.getItem('jdj_auth') || 'null'); return j && /^[0-9a-f]{64}$/.test(String(j.s || '')) ? j.s : ''; } catch (e) { return ''; } }
  async function server(action, body) {
    const A = root.JDJ_AGENTS, AU = root.JDJ_AUTH;
    if (!A || !A.ready || !AU || !AU.on()) return { soft: true };
    const s = sessS(); if (!s) return { login: true };
    try { return await A.post(Object.assign({ action, s }, body || {})); }
    catch (e) { const m = String(e && e.message || ''); if (/^unknown$/.test(m)) return { soft: true }; if (/로그인/.test(m)) return { login: true }; return { err: m || '확인하지 못했어요. 잠시 뒤 다시 해 주세요.' }; }
  }
  const quota = () => server('toolQuota');
  const use = (tool, g) => server('toolUse', { tool, g: g || '' });

  /* ---------- 압축 파일(zip, 압축 없이 묶기만) ---------- */
  let CRC = null;
  function crc32(b) {
    if (!CRC) { CRC = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; CRC[n] = c >>> 0; } }
    let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0;
  }
  /** files: [{name, data(Uint8Array)}] → Uint8Array(zip) */
  function zip(files) {
    const enc = s => new TextEncoder().encode(s), parts = [], cen = []; let off = 0;
    const u16 = v => [v & 255, (v >>> 8) & 255], u32 = v => [v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255];
    files.forEach(f => {
      const nm = enc(f.name), d = f.data, c = crc32(d);
      const h = [].concat(u32(0x04034b50), u16(20), u16(0x0800), u16(0), u16(0), u16(0), u32(c), u32(d.length), u32(d.length), u16(nm.length), u16(0));
      parts.push(new Uint8Array(h), nm, d);
      cen.push(new Uint8Array([].concat(u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(0), u16(0), u16(0), u32(c), u32(d.length), u32(d.length), u16(nm.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(off))), nm);
      off += h.length + nm.length + d.length;
    });
    const cs = cen.reduce((a, b) => a + b.length, 0);
    const end = new Uint8Array([].concat(u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length), u32(cs), u32(off), u16(0)));
    const all = parts.concat(cen, [end]), out = new Uint8Array(all.reduce((a, b) => a + b.length, 0)); let p = 0;
    all.forEach(b => { out.set(b, p); p += b.length; });
    return out;
  }

  const API = { SITE, DISCLAIM, DANJI_NOTE, kindOf, FALLBACK, limitsFor, left, esc, J, won, wonW, pct, md, mdS, ymd, ymK, BAN, banHit, cleanMemo, adBlock, packProfile, unpackProfile,
    distM, nearest, mText, walkMin, GLOSS, taxRows, fvText, nearTrades, listing, encodeListing, decodeListing,
    rng, picker, period, blog, caption, cards, drawCard, zip, crc32, TH, loadProfile, saveProfile, mountProfile, quota, use };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.JDJ_BT = API;
})(typeof window !== 'undefined' ? window : globalThis);
