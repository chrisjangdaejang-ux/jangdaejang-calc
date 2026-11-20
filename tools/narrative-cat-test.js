/* 카테고리별 '분석 설명'(assets/narrative.js cat.*) 문장 규칙 검증 — 실행: node tools/narrative-cat-test.js [자료 폴더(선택, 기본 ../../jangdaejang-data/data)]
   아파트(tools/narrative-test.js)와 같은 규칙: 한 줄 결론(숫자) → 핵심 요약(줄마다 숫자) → 펼친 문단 4단계(사실·비교·과거 흐름·그래서),
   금지어·방어적 면책 없음, 같은 문장 반복 없음, undefined/NaN 없음. 자료 폴더가 있으면 전국 실제 자료 전체에 돌려 위반 0건이어야 통과. */
const fs = require('fs'), path = require('path');
global.JDJ_MINE = require('../assets/mine-core.js');
require('../assets/plain-words.js');
const PL = globalThis.JDJ_PLAIN;
const N = require('../assets/narrative.js'), C = N.cat;
const R = require('../assets/rent-core.js'), O = require('../assets/offi-core.js'), SW = require('../switch/switch-core.js'), E = require('../chungyak/cy-engine.js');
let ok = 0, bad = 0;
const eq = (a, b, m) => { if (JSON.stringify(a) === JSON.stringify(b)) ok++; else { bad++; console.log('실패:', m, '\n  받음:', JSON.stringify(a), '\n  기대:', JSON.stringify(b)); } };
const has = (t, s, m) => eq(String(t).includes(s), true, m + ` — '${s}' 없음: ${t}`);
const txt = X => [X.head].concat(...X.lines.map(x => [x.t].concat(x.d))).join(' ');
const ruleProbs = (X, tag) => { const L = N.lint(X); const p = L.map(x => `${tag}: ${x}`); if (/undefined|NaN|null|Infinity|\[object/.test(txt(X))) p.push(`${tag}: undefined/NaN — ${txt(X).slice(0, 200)}`);
  if (X.head && X.lines.length > 5) p.push(`${tag}: 요약 줄 수 ${X.lines.length}`);   /* 확인된 자료가 한 줄뿐이면 한 줄만(숫자를 지어내지 않음) */ return p; };

/* ---------- 합성 자료: 문장 모양 ---------- */
{ /* 전월세 */
  const months = []; for (let y = 2023, m = 10; months.length < 37; m++) { if (m > 12) { m = 1; y++; } months.push(`${y}${String(m).padStart(2, '0')}`); }
  const j = months.map((_, i) => 100000 + i * 700), meta = { m0: '202310', to: '202610', rm: '202310' };
  const u = ['가락동', '헬리오시티', '84㎡대', '913', 85, 1426, 1214, [0].concat(j), [0], [0], [], { jr: { r: 0.428, at: '202610', s: 292200, j: 125100, b: 'a' }, jrs: [0].concat(months.map((_, i) => 400 + i)) }];
  const IX = { sgg: { '11710': { sido: '서울특별시', name: '송파구' }, '11680': { sido: '서울특별시', name: '강남구' }, '11650': { sido: '서울특별시', name: '서초구' } }, sido: [{ name: '서울특별시', short: '서울', ngs: 25 }] };
  const RX = { sgg: { '11710': { jr: [0.403, 256], sup: { n: 3200, rows: [['잠실르엘', 1865, '202612'], ['잠실래미안아이파크', 1335, '202707']] }, mig: { n: 4943, rows: [['마천4', '재개발', 1219, '202401', '202409'], ['가락프라자', '재건축', 672, '202503', null]] } },
    '11680': { sup: { n: 5000 } }, '11650': { sup: { n: 900 } } } };
  const c = C.jeonseFrom({ IX, RX, R, PL, code: '11710', kind: 'a', name: '헬리오시티', dong: '가락동', band: '84㎡대', u, meta });
  const X = C.jeonse(c);
  eq(X.head, '헬리오시티 84㎡대 전세 시세 12억 5,200만 원은 1년 전보다 7.2% 올랐고, 매매 시세의 43%예요(전세가율). HUG 보증은 보증금 7억 원까지 돼요(수도권 상한) — 지금 전세 시세(12억 5,200만 원)로는 가입이 어려워요.', '전월세 결론: 시세·1년 변화·전세가율·HUG');
  eq(X.lines.map(x => x.k), ['jr', 'jflow', 'jsup', 'jmig', 'hug'], '전월세 요약 줄 종류(HUG 는 결론에 있어 마지막)');
  has(X.lines[0].t, '송파구 아파트 중간값(40%)보다 2.5%p 높아요', '전세가율 위치: 구 중간값 비교');
  has(X.lines.find(x => x.k === 'jsup').t, '서울 3개 구 중 2번째로 많아요', '입주 물량 순위');
  has(X.lines.find(x => x.k === 'hug').d[0], '수도권 보증금 상한 7억 원에 걸려 7억 원까지예요', 'HUG 보증금 상한(수도권 7억)');
  has(X.lines[0].d[3], '그래서 집값이 지금보다 57% 넘게 내리면', '전세가율 → 그래서(여유 폭)');
  eq(ruleProbs(X, '전월세 합성'), [], '전월세 문장 규칙');
  const Xd = C.jeonse(Object.assign({}, c, { dep: 132000 }));
  eq(Xd.head.split(' HUG')[0], '이 집 전세 13억 2,000만 원은 같은 평형 최근 전세 중간값(12억 5,200만 원)보다 5% 높고, 매매 시세의 45%예요(전세가율).', '전월세 결론: 내가 넣은 보증금');
  const Xh = C.jeonse(Object.assign({}, c, { dep: 280000 }));
  has(Xh.head, '이 보증금은 한도보다 21억 원 많아 가입이 어려워 위험해요', '보증금이 HUG 한도 초과');
  eq(ruleProbs(Xh, '전월세 보증금'), [], '보증금 넣은 결론 규칙');
}
{ /* 빌라 */
  const zones = [{ n: '아현1', t: '재개발', lv: 3, st: '정비구역 지정', b: '202301', src: 's' }, { n: 'A', t: '재개발', lv: 3, st: '정비구역 지정', b: '202001' }, { n: 'B', t: '재개발', lv: 3, st: '정비구역 지정', b: '201901' }, { n: 'C', t: '재개발', lv: 3, st: '정비구역 지정', b: '202101' }, { n: 'D', t: '재개발', lv: 6, st: '건축심의', b: '201501' }];
  const b = { n: '효창목타워빌', d: '공덕동', j: '111-4', y: 2002, t: '다세대', p: 96000, a: 72.18, l: 31.97, dt: '20260919', pp: 9927, dm: -8, z: [[0, 0, 'o']] };
  const dongB = [b].concat([1980, 1985, 1990, 1995, 2010].map(y => ({ d: '공덕동', y, pp: 9000, l: 30, a: 60 })));
  const X = C.villa({ b, zones, dm: { '공덕동': { m: 10835, c: 11 } }, dongB, allB: dongB, sgg: '마포구', ym: '202610', PL });
  eq(X.head, '효창목타워빌은 구역 안인 아현1 재개발(10단계 중 3단계, 정비구역 지정)과 연결돼 있고, 첫 공식 단계(2023년 1월) 뒤 4년째예요(마포구 같은 단계 구역 중간값 7년). 대지지분 평당가 9,927만 원은 공덕동 빌라 중간값보다 8% 싸고, 2002년에 지은 24년 된 건물이에요.', '빌라 결론');
  eq(X.lines.map(x => x.k), ['zone', 'land', 'age', 'right', 'deal'], '빌라 요약 줄 종류');
  has(X.lines[3].t, '첫 공식 단계(2023년 1월)보다 21년 먼저 지어 입주권을 받을 가능성이 높아요', '입주권 줄');
  eq(ruleProbs(X, '빌라 합성'), [], '빌라 문장 규칙');
  const X0 = C.villa({ b: Object.assign({}, b, { z: [] }), zones, dm: {}, dongB: [], sgg: '마포구', ym: '202610', PL });
  eq(X0.head, '효창목타워빌은 같은 동에 연결된 재개발 정비구역이 0곳이에요. 2002년에 지은 24년 된 건물이에요.', '빌라: 구역·비교 자료 없으면 그 문장 생략');
}
{ /* 오피스텔: 건물 자료 준비 중이면 지역 결론, 건물이 생기면 수익률 결론(자동) */
  const OX = { status: { trade: 'ok', rent: 'ok' }, rate: { mort: { '202609': 4.05 }, base: { '202610': 2.5 } }, bt: { '2': { status: 'pass', oos_all: [{ t0: '202210', top20: 2.1, bottom20: -1 }, { t0: '202310', top20: 0.4, bottom20: 0.1 }], oos_hit: 2, oos_avg: 1.2 } },
    sgg: { '11680': { y: [0.041, 120], dem: { job: { v: 900.7, at: '202606', c1: 0.0405, c3: 0.046, grp: 1, rk: [14, 87, 204] }, hh: { p12: 0.62, at: '202609', d3: 0.021 } }, sup: { o: 320, apt: 87, rows: [['A오피스텔', 320, '202707', '오피스텔']] } } } };
  const Xr = C.offi(C.offiFrom({ u: null, OX, g: '11680', O, sggName: '강남구', sidoShort: '서울' }));
  eq(Xr.head, '강남구에서 일하는 사람(오피스텔 임대수요)은 90.1만 명으로 1년 전보다 4.1% 늘었고(늘어난 폭 전국 204개 시·군·구 중 상위 14%), 앞으로 2년 새 오피스텔 입주 예정은 320실이에요.', '오피스텔 지역 결론');
  eq(ruleProbs(Xr, '오피스텔 지역'), [], '오피스텔 지역 규칙');
  const u = { d: '역삼동', j: '600', n: '테스트오피스텔', a: 25, ys: [0, 40, 45, 41, 42, 43, 44, 45, 46, 47, 48, 49, 46, 48], y: { r: 0.048, p: 800, ns: 5, nw: 4, dep: 1000, mr: 76, at: '202610' }, rk: { d: [20, 85, 8], g: [30, 71, 40] }, sc: { '2': 81 } };
  const Xu = C.offi(C.offiFrom({ u, OX, g: '11680', O, sggName: '강남구', sidoShort: '서울' }));
  eq(Xu.head, '테스트오피스텔은 임대수익률 4.8%로 강남구 오피스텔 중간값(4.1%)보다 0.7%p 높고, 주택담보대출 금리(4.05%)보다 0.8%p 높아요.', '오피스텔 수익률 결론');
  eq(Xu.lines.map(x => x.k), ['yield', 'rate', 'dem', 'osup', 'score'], '오피스텔 요약 줄');
  eq(Xu.trust.map(t => [t.h, t.n, t.hit, t.ok]), [[2, 2, 2, true]], '오피스텔 검증 카드(점수 있을 때)');
  eq(ruleProbs(Xu, '오피스텔 건물'), [], '오피스텔 건물 규칙');
  has(N.html(Xu, { id: 'o1' }), '같은 시·군·구 평균보다 더 많이 올랐어요', '오피스텔 검증 카드 비교 기준');
}
{ /* 갈아타기 */
  const S = SW.sell({ sale: 130000, acq: 70000, exp: null, acqDate: '2017-01-01', saleDate: '2026-12-01', residMonths: 120, houses: 1, acqAdj: true, saleAdj: false, oldLoan: 20000 });
  const o = { income: 9000, debt: 0, rate: 4, term: 30, rtype: 'cyc', houses: 1, etc: 1000, cash: S.net + 5000 };
  const c = SW.ctx('reg', o), dsr = SW.dsrMax(c), oo = Object.assign({}, o, { large: false }), P = SW.maxPrice(c, dsr, oo), nd = SW.need(P, c, dsr, oo);
  const L = { sale: 130000, oldLoan: 20000, extra: 5000, etc: 1000, cash: S.net + 5000, P, ld: nd.loan, c, S, o, dsr, oo, T: 0 };
  const X = C.sw(C.swFrom({ L, SW, acq: 70000, why: '보유 9년·거주 10년으로 12억 초과분만 과세돼요.' }));
  has(X.head, '지금 집을 13억 원에 팔면 양도세', '갈아타기 결론');
  has(X.head, '집까지 갈아탈 수 있어요 — 지금 집보다', '갈아타기 결론: 지금 집 대비');
  eq(X.lines.map(x => x.k), ['cgt', 'loan', 'cost'], '갈아타기 요약 줄');
  eq(ruleProbs(X, '갈아타기'), [], '갈아타기 규칙');
}
{ /* 청약 */
  const items = [{ name: '○○단지', sido: '서울', sgg: '강동구', band: '60~85㎡', lo: 48, hi: 58, g: 'mid', need: 6 }, { name: '△△단지', sido: '경기', sgg: '화성시', band: '60㎡ 이하', lo: 30, hi: 40, g: 'hi', need: 0 }];
  const X = C.cy({ my: 52, h: 22, d: 20, cc: 10, items, cnt: { hi: 1, mid: 1, lo: 0 }, scope: '전국', nNotice: 2, hist: { sido: '서울', span: '최근 1년', n: 200, hit: 60, pct: 30, med: 61 }, years: { y: 3, target: 58, name: '○○단지' } });
  eq(X.head, '내 가점 52점은 △△단지 60㎡ 이하 예상 커트라인(30~40점)보다 높아요 — 당첨 가능성 높은 단지 1곳.', '청약 결론');
  eq(X.lines.map(x => x.k), ['pick', 'cut', 'past', 'time'], '청약 요약 줄');
  eq(ruleProbs(X, '청약'), [], '청약 규칙');
  const Xm = C.cy({ my: 52, h: 22, d: 20, cc: 10, items: [items[0]], cnt: { hi: 0, mid: 1, lo: 0 }, scope: '서울', nNotice: 1 });
  eq(Xm.head, '내 가점 52점은 ○○단지 60~85㎡ 예상 커트라인(48~58점)에 들어가요 — 경합인 단지 1곳.', '청약 결론: 경합');
}
eq(C ? N.CKINDS.every(k => fs.readFileSync(path.join(__dirname, '..', 'assets', 'stat.js'), 'utf8').includes(`'${k}'`)) : false, true, 'stat.js 카테고리 줄 종류 허용');

/* ---------- 실제 자료 전체 ---------- */
const D = process.argv[2] || path.join(__dirname, '..', '..', 'jangdaejang-data', 'data');
if (fs.existsSync(path.join(D, 'index.json'))) {
  const rd = f => { try { return JSON.parse(fs.readFileSync(path.join(D, f))); } catch (e) { return null; } };
  const IX = rd('index.json'), probs = [], cnt = {};
  const add = (k, X, tag) => { cnt[k] = (cnt[k] || 0) + 1; if (X.head) cnt[k + '_head'] = (cnt[k + '_head'] || 0) + 1; probs.push(...ruleProbs(X, tag)); };
  /* 전월세: 아파트·빌라·오피스텔 모든 평형 × (보증금 없음 / 시세 그대로 / 시세의 1.3배) */
  const RX = rd('rent/index.json'), pol = rd('policy.json');
  global.window = {}; require('../assets/policy-view.js'); const PV = global.window.JDJPolicy; delete global.window;
  if (RX) for (const code of Object.keys(RX.sgg)) for (const [kind, sub] of [['a', ''], ['v', 'v/'], ['o', 'o/']]) {
    const meta = rd(`rent/${sub}${code}.json`); if (!meta) continue;
    for (const u of meta.units) {
      const base = C.jeonseFrom({ IX, RX, R, PL, code, kind, name: kind === 'a' ? u[1] : R.bldName({ name: u[1], dong: u[0], jibun: u[3] }), dong: u[0], band: u[2], u, meta, pol, PV });
      const j = (base.sm.j || {}).v;
      for (const dep of [null, j, j ? Math.round(j * 1.3) : null]) { if (dep === undefined) continue; add('jeonse', C.jeonse(Object.assign({}, base, { dep })), `전월세 ${code} ${u[1]} ${u[2]} 보증금 ${dep}`); }
    }
  }
  /* 빌라: 모든 구·건물 */
  const VI = rd('villa/index.json');
  for (const f of fs.existsSync(path.join(D, 'villa')) ? fs.readdirSync(path.join(D, 'villa')).filter(f => /^\d{5}\.json$/.test(f)) : []) {
    const CUR = rd('villa/' + f); CUR.meta = CUR.meta || { n: f.slice(0, 5) };
    for (const b of CUR.b) add('villa', C.villa(C.villaFrom({ b, CUR, IDX: VI, PL })), `빌라 ${f} ${b.n} ${b.j}`);
  }
  /* 오피스텔: 모든 시·군·구(건물 자료가 생기면 건물마다) */
  const OX = rd('offi/index.json');
  if (OX) for (const g of Object.keys(OX.sgg)) {
    const nm = (IX.sgg[g] || {}).name || g, sd = PL.regionInfo(IX, g).short;
    add('offi', C.offi(C.offiFrom({ u: null, OX, g, O, sggName: nm, sidoShort: sd })), `오피스텔 ${g}`);
    const uf = rd(`offi/${g}.json`); for (const u of (uf && uf.units) || []) add('offi', C.offi(C.offiFrom({ u, OX, g, O, sggName: nm, sidoShort: sd })), `오피스텔 ${g} ${u.n}`);
  }
  /* 청약: 진행·예정 민영 공고 전체 × 가점 0~84 */
  const NT = rd('chungyak/notices.json');
  if (NT) {
    const list = (NT.rows || NT.notices || []).filter(n => n && n.k === '민영' && Array.isArray(n.cut));
    const its = []; list.forEach(n => (n.cut || []).forEach(cx => { const p = E.cutOf(n, +cx.band); if (p && p.ok) its.push({ ok: true, name: n.n, sido: E.noticeSido(n), sgg: n.g || '', band: ['60㎡ 이하', '60~85㎡', '85㎡ 초과'][+cx.band], lo: p.lo, hi: p.hi }); }));
    for (let my = 0; my <= 84; my += 3) {
      const items = its.map(x => { const d = E.diag(my, x); return Object.assign({}, x, { g: d.g, need: d.need }); }).sort((a, b) => ({ hi: 0, mid: 1, lo: 2 }[a.g] - { hi: 0, mid: 1, lo: 2 }[b.g]) || a.need - b.need);
      const cn = { hi: 0, mid: 0, lo: 0 }; items.forEach(x => cn[x.g]++);
      add('cy', C.cy({ my, h: Math.min(32, Math.round(my * 0.4)), d: Math.min(35, Math.round(my * 0.4)), cc: my - Math.min(32, Math.round(my * 0.4)) - Math.min(35, Math.round(my * 0.4)), items, cnt: cn, scope: '전국', nNotice: list.length,
        hist: { sido: '서울', span: '최근 1년', n: 100, hit: my, pct: Math.min(100, my), med: 60 }, years: my < 60 ? { y: 2, target: 60, name: '○○단지' } : null }), `청약 ${my}점`);
    }
  }
  /* 갈아타기: 매도가·취득가·주택 수·지역 조합 */
  for (const sale of [30000, 90000, 130000, 250000]) for (const acq of [20000, 60000, 120000]) for (const houses of [1, 2]) for (const g of ['reg', 'capfree', 'local']) {
    const S = SW.sell({ sale, acq, exp: null, acqDate: '2018-06-01', saleDate: '2026-12-01', residMonths: 36, houses, acqAdj: true, saleAdj: houses >= 2, oldLoan: Math.round(sale * 0.3) });
    const o = { income: 9000, debt: 0, rate: 4, term: 30, rtype: 'cyc', houses, etc: 1000, cash: Math.max(0, S.net + 5000) };
    const c = SW.ctx(g, o), dsr = SW.dsrMax(c), oo = Object.assign({}, o, { large: false }), P = SW.maxPrice(c, dsr, oo), nd = SW.need(P, c, dsr, oo);
    const L = { sale, oldLoan: Math.round(sale * 0.3), extra: 5000, etc: 1000, cash: o.cash, P, ld: nd.loan, c, S, o, dsr, oo, T: 0 };
    add('sw', C.sw(C.swFrom({ L, SW, acq, keepMonthly: 120 })), `갈아타기 ${sale}/${acq}/${houses}/${g}`);
  }
  if (probs.length) console.log(probs.slice(0, 15).join('\n'));
  if (process.env.NAR_DUMP) fs.writeFileSync(process.env.NAR_DUMP, probs.join('\n'));
  console.log('실제 자료 검사 건수:', JSON.stringify(cnt));
  eq([Object.keys(cnt).length >= 5, probs.length], [true, 0], '실제 자료 전체 문장 규칙(카테고리별)');
} else console.log('(실제 자료 저장소가 옆에 없어 전국 검사는 건너뜀)');

console.log(`카테고리 분석 설명 검증: ${ok}개 통과, ${bad}개 실패`);
process.exit(bad ? 1 : 0);
