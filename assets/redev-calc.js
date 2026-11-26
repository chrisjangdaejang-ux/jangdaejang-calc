/* 재개발·재건축 분담금·수익 계산기 + 실거주 의무·조합원 지위 양도 판정 + 구역 페이지 공용 함수
   (화면: villa/calc/ · villa/z/ — node tools/redev-calc-test.js 로 확인)
   원칙: 집예보가 가정값을 넣지 않아요. 계산은 사용자가 넣은 숫자로만 하고, 완공 뒤 가치 범위는
         가까운 새 아파트의 실제 거래(국토교통부 실거래, data/price/{구}.json)로만 만들어요(거래가 없으면 범위 없음).
   금액 단위: 만원. window.JDJ_RCALC = { money, calc, sens, comps, afterRange, rights, slug, slugs, monthsIn, won } */
(function (root) {
  'use strict';
  var LAW = {
    r39: { nm: '도시 및 주거환경정비법 제39조(조합원 지위 양도 제한과 예외)', url: 'https://www.law.go.kr/법령/도시및주거환경정비법/제39조' },
    r39d: { nm: '도시 및 주거환경정비법 시행령 제37조(지위 양도 제한의 예외)', url: 'https://www.law.go.kr/법령/도시및주거환경정비법시행령/제37조' },
    r72: { nm: '도시 및 주거환경정비법 제72조 제6항(투기과열지구 재당첨 제한)', url: 'https://www.law.go.kr/법령/도시및주거환경정비법/제72조' },
    r74: { nm: '도시 및 주거환경정비법 제74조(관리처분계획 — 비례율·권리가액의 근거)', url: 'https://www.law.go.kr/법령/도시및주거환경정비법/제74조' },
    r77: { nm: '도시 및 주거환경정비법 제77조(권리산정기준일)', url: 'https://www.law.go.kr/법령/도시및주거환경정비법/제77조' },
    t11: { nm: '부동산 거래신고 등에 관한 법률 제11조(토지거래허가)', url: 'https://www.law.go.kr/법령/부동산거래신고등에관한법률/제11조' },
    t17: { nm: '부동산 거래신고 등에 관한 법률 제17조(허가 목적대로 이용 — 실거주)', url: 'https://www.law.go.kr/법령/부동산거래신고등에관한법률/제17조' },
    small: { nm: '빈집 및 소규모주택 정비에 관한 특례법', url: 'https://www.law.go.kr/법령/빈집및소규모주택정비에관한특례법' }
  };

  /** 금액 글자 → 만원: '3억' 30000 · '3억 2,000' 32000 · '2억5천' 25000 · '30,000' 30000 · '1.5억' 15000. 못 읽으면 null */
  function money(v) {
    if (v == null) return null; if (typeof v === 'number') return isFinite(v) ? v : null;
    var s = String(v).replace(/[,\s원]/g, ''); if (!s) return null;
    var neg = /^[-−]/.test(s); s = s.replace(/^[-−]/, '');
    var m = /^(?:(\d+(?:\.\d+)?)억)?(?:(\d+(?:\.\d+)?)천)?(?:(\d+(?:\.\d+)?)만?)?$/.exec(s);
    if (!m || !(m[1] || m[2] || m[3])) return null;
    var r = (m[1] ? +m[1] * 10000 : 0) + (m[2] ? +m[2] * 1000 : 0) + (m[3] ? +m[3] : 0);
    return neg ? -r : r;
  }
  function num(v) { if (v == null || v === '') return null; var n = typeof v === 'number' ? v : +String(v).replace(/[,\s]/g, ''); return isFinite(n) ? n : null; }
  /** 만원 → '3억 2,000만 원' / 음수는 '−' */
  function won(m) {
    if (m == null || !isFinite(m)) return '-';
    var neg = m < 0, a = Math.round(Math.abs(m)), e = Math.floor(a / 10000), r = a % 10000;
    var s = e ? e.toLocaleString('ko-KR') + '억' + (r ? ' ' + r.toLocaleString('ko-KR') + '만' : '') : r.toLocaleString('ko-KR') + '만';
    return (neg ? '−' : '') + s + ' 원';
  }

  /* ---------------- 계산기 ----------------
     입력 i: appr 종전자산 감정평가액 · ratio 비례율(%) · mem 조합원 분양가 · buy 매수가 | prem 프리미엄(P, 매수가 대신)
            loan 대출 · rate 대출 연 이자율(%) · months 입주까지 기간(개월) · dep 끼고 사는 전세 보증금 · tax 취득세 등(사용자가 넣은 값)
     돌려줌: {ok, miss:[칸 이름], right 권리가액, prem, buy, burden 분담금(음수=환급), interest 기간 이자, total 총 투입금, cash 처음 필요한 현금, steps:[{k, f(식), v}]} */
  var NEED = [['appr', '감정평가액'], ['ratio', '비례율'], ['mem', '조합원 분양가']];
  function calc(i) {
    i = i || {};
    var appr = num(i.appr), ratio = num(i.ratio), mem = num(i.mem), buy = num(i.buy), prem = num(i.prem);
    var loan = num(i.loan) || 0, rate = num(i.rate) || 0, months = num(i.months) || 0, dep = num(i.dep) || 0, tax = num(i.tax) || 0;
    var miss = NEED.filter(function (k) { var v = num(i[k[0]]); return v == null || v <= 0; }).map(function (k) { return k[1]; });
    if (buy == null && prem == null) miss.push('매수가 또는 프리미엄');
    if (miss.length) return { ok: false, miss: miss };
    var right = appr * ratio / 100;
    if (buy == null) buy = right + prem; else prem = buy - right;
    var burden = mem - right;
    var interest = loan * rate / 100 * months / 12;
    var total = buy + burden + interest + tax;
    var cash = buy - loan - dep + tax;
    var steps = [
      { k: '권리가액', f: '감정평가액 ' + won(appr) + ' × 비례율 ' + ratio + '%', v: right },
      { k: i.buy != null && i.buy !== '' ? '프리미엄(P)' : '매수가', f: i.buy != null && i.buy !== '' ? '매수가 ' + won(buy) + ' − 권리가액 ' + won(right) : '권리가액 ' + won(right) + ' + 프리미엄 ' + won(prem), v: i.buy != null && i.buy !== '' ? prem : buy },
      { k: burden >= 0 ? '분담금' : '환급금', f: '조합원 분양가 ' + won(mem) + ' − 권리가액 ' + won(right), v: burden },
      { k: '기간 이자', f: '대출 ' + won(loan) + ' × 연 ' + rate + '% × ' + months + '개월 ÷ 12', v: interest },
      { k: '총 투입금', f: '매수가 ' + won(buy) + ' + 분담금 ' + won(burden) + ' + 기간 이자 ' + won(interest) + (tax ? ' + 취득세 등 ' + won(tax) : ''), v: total },
      { k: '처음 필요한 현금', f: '매수가 ' + won(buy) + ' − 대출 ' + won(loan) + (dep ? ' − 전세 보증금 ' + won(dep) : '') + (tax ? ' + 취득세 등 ' + won(tax) : ''), v: cash }
    ];
    return { ok: true, miss: [], right: right, prem: prem, buy: buy, burden: burden, interest: interest, total: total, cash: cash, steps: steps };
  }
  /** 민감도: 비례율 ±10%p, 조합원 분양가 ±10% → [{t, burden, total}] (입력값 그대로 바꿔 다시 계산) */
  function sens(i) {
    var base = calc(i); if (!base.ok) return [];
    var o = function (t, ch) { var j = {}; for (var k in i) j[k] = i[k]; ch(j); var r = calc(j); return { t: t, burden: r.burden, total: r.total }; };
    var rt = num(i.ratio), m = num(i.mem);
    return [o('비례율 ' + (rt - 10) + '%', function (j) { j.ratio = rt - 10; }), { t: '넣은 값 그대로', burden: base.burden, total: base.total },
      o('비례율 ' + (rt + 10) + '%', function (j) { j.ratio = rt + 10; }), o('조합원 분양가 10% 오르면', function (j) { j.mem = m * 1.1; }), o('조합원 분양가 10% 내리면', function (j) { j.mem = m * 0.9; })];
  }

  /* ---------------- 완공 뒤 가치 범위(실거래로만) ----------------
     units: data/price/{구}.json 의 units 행 — [구코드, 동, 단지, 평형대, 전용, 거래수, 월별…, …, 지번, …, …, [[계약일 YYYYMMDD, 전용, 층, 금액(만원), 유형(1 직거래), 신고가]]]
     nb: 재개발 지도 가까운 새 아파트 [{g, d, j, n, b, by, km}] · today 'YYYYMMDD' · 최근 12개월 거래만
     → [{n, d, by, km, cnt, med(㎡당 만원), from, to}] (거래 3건 미만 단지는 뺌) */
  function trades(u) {
    for (var k = u.length - 1; k >= 0; k--) { var t = u[k]; if (Array.isArray(t) && t.length && Array.isArray(t[0]) && /^\d{8}$/.test(String(t[0][0]))) return t; }
    return [];
  }
  function median(a) { a = a.slice().sort(function (x, y) { return x - y; }); var n = a.length; return n ? (n % 2 ? a[(n - 1) / 2] : (a[n / 2 - 1] + a[n / 2]) / 2) : null; }
  /* area(선택, ㎡)를 주면 받을 집과 비슷한 크기(±20%) 거래만 — 큰 평형 고가 단지가 범위를 넓히지 않게 */
  function comps(units, nb, today, area) {
    var A = num(area);
    var t0 = String(today || '').replace(/-/g, '').slice(0, 8);
    if (!/^\d{8}$/.test(t0)) return [];
    var from = String(+t0.slice(0, 4) - 1) + t0.slice(4);
    var out = [];
    (nb || []).forEach(function (x) {
      var per = [], dates = [];
      (units || []).forEach(function (u) {
        if (String(u[0]) !== String(x.g) || u[1] !== x.d || u[2] !== x.n) return;
        trades(u).forEach(function (t) {
          var d = String(t[0]), a = +t[1], p = +t[3];
          if (d < from || d > t0 || !(a > 0) || !(p > 0) || t[4] === 1) return;
          if (A > 0 && (a < A * 0.8 || a > A * 1.2)) return;   // 직거래(칸 4 = 1)는 뺌 — 시세 기준과 같음(해제 거래는 원자료 단계에서 빠짐)
          per.push(p / a); dates.push(d);
        });
      });
      if (per.length < 3) return;
      dates.sort();
      out.push({ n: x.n, d: x.d, g: x.g, by: x.by, km: x.km, cnt: per.length, med: Math.round(median(per) * 10) / 10, from: dates[0], to: dates[dates.length - 1] });
    });
    return out;
  }
  /** 받을 집 전용(㎡) × 단지별 ㎡당 중간값의 가장 낮은~높은 값 → {lo, hi, n} | null */
  function afterRange(cs, area) {
    area = num(area);
    if (!cs || !cs.length || !(area > 0)) return null;
    var m = cs.map(function (c) { return c.med; });
    return { lo: Math.min.apply(null, m) * area, hi: Math.max.apply(null, m) * area, n: cs.length, cnt: cs.reduce(function (s, c) { return s + c.cnt; }, 0) };
  }

  /* ---------------- 실거주 의무·조합원 지위 양도 판정 ----------------
     pol: data/policy.json · z: {t 유형 코드, lv 지금 단계(1~11|null), g 시군구 코드, dong 법정동(선택), kind 'apt'|'villa'}
     규칙(법령 링크와 함께, 예외·시점은 '확인 필요' — 엔진 docs/legal_review.md 재개발 판정 카드 항목) */
  var act = function (p) { return p && p.status === 'active' && (p.stage === '시행' || !p.stage); };
  var inArea = function (p, g, dong) { return (p.in || []).some(function (x) { return x === 'all' || x === String(g).slice(0, 2) || x === g || (dong && x === g + ':' + dong); }) && (p.not || []).indexOf(g) < 0; };
  function polSrc(p) { var s = (p && p.src && p.src[0]) || null; return s ? { nm: s[0], url: s[1] } : null; }
  var RB = { rb: 1, dd: 1 }, RD = { rd: 1, ct: 1, pr: 1 }, SKIP = { nt: '노후계획도시 특별법(1기 신도시)', moa: '소규모주택정비법(모아타운)', garo: '소규모주택정비법(가로주택정비)', sr: '소규모주택정비법(소규모 재건축)', sd: '소규모주택정비법(소규모 재개발)', ja: '소규모주택정비법(자율주택정비)', re: '도시정비법(주거환경개선 — 공공 시행 위주)' };
  function rights(pol, z) {
    z = z || {}; var P = (pol && pol.policies) || [], g = String(z.g || ''), lv = +z.lv || 0;
    var oh = P.find(function (x) { return act(x) && (x.types || []).indexOf('규제지역') >= 0 && x.dir === 'tight' && /투기과열/.test((x.name || '') + (x.plain || '')) && !/해제/.test(x.name || '') && inArea(x, g, ''); });
    var tohL = P.filter(function (p) { return act(p) && (p.types || []).indexOf('토허') >= 0 && p.dir === 'tight'; });
    var tohDong = z.dong ? tohL.find(function (p) { return (p.in || []).indexOf(g + ':' + z.dong) >= 0; }) : null;
    var tohApt = tohL.find(function (p) { return inArea(p, g, '') && /아파트/.test((p.plain || '') + (p.name || '')) && !(p.in || []).some(function (x) { return x.indexOf(':') > 0; }); });
    var ease = P.find(function (p) { return act(p) && (p.types || []).indexOf('토허') >= 0 && p.dir === 'ease' && /유예/.test(p.name || '') && inArea(p, g, ''); });
    var out = { asof: (pol && (pol.v || pol.updated || pol.built)) || '', cards: [] };
    // ① 조합원 지위 양도
    var c1 = { k: 'transfer', t: '조합원 지위 양도', law: [LAW.r39, LAW.r39d] };
    if (SKIP[z.t]) { c1.v = 'skip'; c1.head = '판정하지 않았어요'; c1.body = SKIP[z.t] + ' 사업이라 도시정비법 제39조 규칙을 그대로 쓰지 않아요. 조합·구청에 확인해 주세요.'; c1.law = z.t === 'nt' ? [] : [LAW.small]; }
    else if (!oh) { c1.v = 'free'; c1.head = '투기과열지구가 아니라 이 규칙으로는 제한이 없어요'; c1.body = '정책 표 기준이에요. 지정은 바뀔 수 있으니 계약 전 다시 확인해 주세요.'; }
    else {
      c1.src = polSrc(oh);
      var isRb = !!RB[z.t], gate = isRb ? 5 : 8, gateNm = isRb ? '조합설립인가' : '관리처분계획인가';
      if (!lv) { c1.v = 'chk'; c1.head = '지금 단계를 몰라 판정하지 못했어요'; }
      else if (lv >= gate) { c1.v = 'on'; c1.head = '지금 사면 원칙적으로 조합원이 될 수 없어요'; }
      else { c1.v = 'pre'; c1.head = '지금은 제한 전이에요 — ' + gateNm + ' 뒤부터 제한돼요'; }
      c1.body = '투기과열지구에서 ' + (isRb ? '재건축은 조합설립인가' : '재개발은 관리처분계획인가') + ' 뒤 산 사람은 조합원이 될 수 없어요(도시정비법 제39조 제2항). 예외: 10년 보유·5년 거주한 1세대 1주택, 상속·이혼, 근무·질병·취학으로 이사, 해외 이주, 사업이 오래 늦어진 경우 등(시행령 제37조).' +
        (isRb ? '' : ' 재개발은 2018년 1월 24일 뒤 처음 사업시행계획인가를 신청한 구역부터 적용돼요(부칙) — 이 구역이 해당하는지 확인이 필요해요.') + ' 지정 전에 샀는지 등 시점에 따라 달라질 수 있어요.';
      if (!RB[z.t] && !RD[z.t]) c1.body += ' 이 사업 유형의 적용 여부는 확인이 필요해요.';
    }
    out.cards.push(c1);
    // ② 실거주 의무(토지거래허가)
    var c2 = { k: 'live', t: '실거주 의무(토지거래허가)', law: [LAW.t11, LAW.t17] };
    var tp = tohDong || (z.kind === 'apt' || RB[z.t] ? tohApt : null);
    if (tp) { c2.v = 'on'; c2.src = polSrc(tp); c2.head = '허가를 받고 사야 하고, 허가 뒤 직접 살아야 해요'; c2.body = '토지거래허가구역 안 주택은 구청 허가를 받아 사고, 허가받은 목적대로 직접 거주해야 해요(부동산 거래신고법 제11조·제17조, 기간은 시행령으로 정해요). 세입자를 둔 채 사기 어려워요.' + (ease ? ' 세입자가 있는 집을 산 무주택자 유예 특례가 있어요(정책 표: ' + (ease.name || '') + ').' : ''); if (ease) c2.src2 = polSrc(ease); }
    else if (tohApt && !(z.kind === 'apt' || RB[z.t])) { c2.v = 'chk'; c2.src = polSrc(tohApt); c2.head = '이 구의 지정은 아파트 대상이에요 — 빌라·단독은 확인이 필요해요'; c2.body = '정책 표에는 구·동 단위 지정만 있어요. 정비구역 단위 지정은 토지이음(eum.go.kr)에서 주소로 확인해 주세요.'; }
    else { c2.v = 'none'; c2.head = '정책 표에 이 지역 지정이 없어요'; c2.body = '정비구역 단위로 따로 지정된 곳은 정책 표에 없을 수 있어요. 토지이음(eum.go.kr)에서 주소로 확인해 주세요.'; }
    out.cards.push(c2);
    // ③ 재당첨 제한
    if (oh && !SKIP[z.t]) out.cards.push({ k: 'again', v: 'chk', t: '재당첨 제한', law: [LAW.r72], src: polSrc(oh), head: '투기과열지구라 분양 대상이 되면 5년 동안 다른 정비사업 분양 신청이 제한될 수 있어요', body: '조합원 분양이나 일반분양 대상자로 정해진 세대는 5년 안에 투기과열지구 정비사업 분양을 다시 신청할 수 없어요(도시정비법 제72조 제6항). 내 경우에 해당하는지는 확인이 필요해요.' });
    return out;
  }

  /* ---------------- 구역 페이지 공용 ---------------- */
  /** 구역 id → 주소 조각(엔진 seo_pages.zone_slug 와 같은 규칙) */
  function slug(id) { var s = String(id).replace(/[^0-9A-Za-z가-힣]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40).replace(/^-+|-+$/g, ''); return s || 'zone'; }
  /** 목록 순서대로 주소 조각을 정함 — 겹치면 '-2', '-3' (엔진 zone_slugs 와 같은 규칙) */
  function slugs(ids) { var seen = {}, out = {}; (ids || []).forEach(function (id) { if (out[id]) return; var b = slug(id), s = b, k = 1; while (seen[s]) { k += 1; s = b + '-' + k; } seen[s] = 1; out[id] = s; }); return out; }
  /** 'YYYYMM' | 'YYYY-MM-DD' 부터 today('YYYY-MM-DD')까지 개월 수(내림), 날짜가 아니면 null */
  function monthsIn(d, today) {
    var a = String(d || '').replace(/-/g, ''), b = String(today || '').replace(/-/g, '');
    if (!/^\d{6}/.test(a) || !/^\d{6}/.test(b)) return null;
    var m = (+b.slice(0, 4) - +a.slice(0, 4)) * 12 + (+b.slice(4, 6) - +a.slice(4, 6));
    if (a.length >= 8 && b.length >= 8 && +b.slice(6, 8) < +a.slice(6, 8)) m -= 1;
    return m >= 0 ? m : null;
  }

  var api = { money: money, calc: calc, sens: sens, comps: comps, afterRange: afterRange, rights: rights, slug: slug, slugs: slugs, monthsIn: monthsIn, won: won, num: num, LAW: LAW, median: median, trades: trades };
  root.JDJ_RCALC = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
