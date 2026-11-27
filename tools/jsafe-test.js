/* 전세 안전 점검(jeonse/safety/) 점검 · 실행: node tools/jsafe-test.js </dev/null
   ① 계산(assets/jsafe-core.js): 신호등 선(전세가율 80·90% · 깡통전세 10·30% · 흐름 ±0.5%·5% · 같은 동 범위 4분위) · 자료 없으면 '확인 필요'(숫자 안 만듦)
   ② 깡통전세: 과거 검증에 못 붙은 확률(kk.json status 'ref')은 숫자로 보여 주지 않고 실제 횟수(과거 비슷한 계약 n건 중 k건), 'ok'면 확률
   ③ HUG: assets/hug-core.js 그대로(공시가격 × 140% × 90% = 126%) · 출처·확인일
   ④ 길잡이(고민 찾기 deposit_safe) ↔ 이 화면 같은 결과: 길잡이 단지 정보(assets/guide.js danjiFacts 를 떼어 돌림)와 화면 saleOf 가 같은 시세를 고르고,
      '같은 조건으로 전세 안전 점검 보기' 주소 + 이 탭에 넘긴 금액으로 연 화면의 입력이 길잡이와 같아, 신호·값·글자가 모두 같은지(아파트·빌라·오피스텔·단독 여러 조건)
   ⑤ 금액은 주소·공유·집계에 들어가지 않음 ⑥ 들어오는 길(홈·전월세·전체·찾기·길잡이) ⑦ 권유 문구·경쟁 서비스 이름 없음 ⑧ 파일 번호
   ⑨ 주소·출처
   자료: tools/jsafe-fixture.json(공개 jangdaejang-data gh-pages 2026-11-27 마포구 일부) */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..'), read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const JS = require('../assets/jsafe-core.js'), H = require('../assets/hug-core.js'), KK = require('../assets/kk-core.js'), M = require('../assets/mine-core.js'), A = require('../assets/ask-core.js');
const G = require('../assets/guide-core.js'), D = require('../assets/diag.js');
let pass = 0, fail = 0;
const check = (n, c, x) => { if (/④/.test(n) && c) console.log('  ', n); if (c) pass++; else { fail++; console.log('  실패:', n, x !== undefined ? JSON.stringify(x).slice(0, 600) : ''); } };
const FX = JSON.parse(read('tools/jsafe-fixture.json'));
const E0 = { H, KK };
const item = (rep, id) => rep.items.find(i => i.id === id);

/* ---------- ① 신호등 선 ---------- */
const sale = p => ({ price: p, at: '202610', ch1: null });
const jrAt = (dep, sen, p) => JS.itemJr({ kind: 'a', dep, senior: sen, sale: sale(p) });
check('전세가율 79% 괜찮아요 · 80% 주의 · 89.9% 주의 · 90% 위험', [jrAt(7900, 0, 10000).lv, jrAt(8000, 0, 10000).lv, jrAt(8990, 0, 10000).lv, jrAt(9000, 0, 10000).lv].join() === 'g,y,y,r');
check('전세가율: 선순위 채권을 더해 계산 · 값은 정수 %', jrAt(7000, 2000, 10000).v === '90%' && jrAt(7000, 2000, 10000).lv === 'r' && /9억원|9,000만원/.test(jrAt(7000, 2000, 10000).s));
check('전세가율: 시세가 없으면 확인 필요 · 숫자 없음', (() => { const i = JS.itemJr({ kind: 'a', dep: 30000, sale: { none: true } }); return i.lv === 'n' && !/%/.test(i.v) && /최근 3개월 매매 거래가 없어/.test(i.s); })());
check('전세가율: 단독·다가구는 계산하지 않음(건물 정보 없음)', JS.itemJr({ kind: 'd', dep: 10000 }).lv === 'n');
check('전세가율: 선순위 채권을 모르면 0으로 본다고 적음', jrAt(5000, null, 10000).why.some(w => /0으로 계산/.test(w)) && !jrAt(5000, 0, 10000).why.some(w => /0으로 계산/.test(w)));
const tr = p => JS.itemTrend({ kind: 'a', sale: { price: 1, ch1: { pct: p, fromAt: '202510', toAt: '202610' } } });
check('흐름: −0.4% 거의 같음(괜찮아요) · −0.6% 주의 · −5% 위험 · +3% 괜찮아요', [tr(-0.004).lv, tr(-0.006).lv, tr(-0.05).lv, tr(0.03).lv].join() === 'g,y,r,g' && tr(-0.004).v === '거의 같음' && tr(-0.06).v === '−6.0% 내렸어요' && tr(0.03).v === '+3.0% 올랐어요');
check('흐름: 빌라·오피스텔·단독은 전셋값으로 · 없으면 확인 필요', JS.itemTrend({ kind: 'v', rent: { ch1: { pct: -0.02, fromAt: '202510', toAt: '202610' } } }).t === '최근 1년 전셋값 흐름' && JS.itemTrend({ kind: 'v' }).lv === 'n');

/* 같은 동 범위: 손으로 센 4분위와 같은지 · 12개월 밖 계약·월세 계약 빼기 · 5건 미만 숨김 */
const VU = FX.villa.units, TO = FX.villa.to;
const naive = (dong, band) => { const st = (+TO.slice(0, 4) - 1) * 10000 + (+TO.slice(4) + 1) * 100; const v = []; VU.forEach(u => { if (u[0] === dong && u[2] === band) u[10].forEach(t => { if (t[0] > st && !(t[4] > 0) && t[3] > 0) v.push(t[3]); }); }); return v.sort((a, b) => a - b); };
const rg = JS.dongRange(VU, '망원동', '40㎡ 이하', TO), nv = naive('망원동', '40㎡ 이하');
const q = p => { const i = (nv.length - 1) * p, lo = Math.floor(i), hi = Math.ceil(i); return Math.round(nv[lo] + (nv[hi] - nv[lo]) * (i - lo)); };
check(`같은 동 범위: 손으로 센 값과 같음(${nv.length}건)`, rg.n === nv.length && rg.q1 === q(0.25) && rg.q2 === q(0.5) && rg.q3 === q(0.75) && rg.p90 === q(0.9) && rg.from === '202511', rg);
check('같은 동 범위: 예전 계약(12개월 밖)·월세 계약은 빼요', VU.some(u => u[10].some(t => t[0] <= 20251100)) && rg.n < VU.reduce((a, u) => a + (u[0] === '망원동' && u[2] === '40㎡ 이하' ? u[10].length : 0), 0));
const few = JS.dongRange([['가동', 'x', '49㎡대', '1', 40, 1, 0, [], [], [], [[20260901, 40, 2, 20000, 0, 0], [20260801, 40, 2, 21000, 0, 0], [20260701, 40, 2, 22000, 0, 0], [20260601, 40, 2, 23000, 0, 0]], {}]], '가동', '49㎡대', '202610');
check('같은 동 범위: 5건 미만이면 범위 숫자 없음 → 확인 필요', few.n === 4 && few.q1 == null && JS.itemRange({ kind: 'v', dep: 20000, range: few }).lv === 'n' && !/~/.test(JS.itemRange({ kind: 'v', dep: 20000, range: few }).v));
const rr = dep => JS.itemRange({ kind: 'v', dep, range: rg }).lv;
check('같은 동 범위: 75% 자리 이하 괜찮아요 · 90% 자리 이하 주의 · 그 위 위험', rr(rg.q3) === 'g' && rr(rg.q3 + 1) === (rg.p90 > rg.q3 ? 'y' : 'r') && rr(rg.p90 + 1) === 'r');
check('단독·다가구: 개별 계약이 없어 중간값만 · 판단 안 함', JS.itemRange({ kind: 'd', dep: 9000, range: { med: 10000, at: '202610', dong: '망원동', band: '30~50㎡' } }).lv === 'n');

/* ---------- ② 깡통전세 ---------- */
const kkRef = FX.kk, kkOk = Object.assign({}, FX.kk, { status: 'ok' });
const kA = (kk, dep, price) => JS.itemKk({ kind: 'a', code: '11440', dep, senior: 0, sale: sale(price), kk, place: { gu: '마포구' } }, KK);
const e1 = KK.estimate({ kk: kkRef, code: '11440', dep: 46000, senior: 0, price: 50700 });
const i1 = kA(kkRef, 46000, 50700);
check(`깡통전세(검증 못 붙은 확률): 확률 숫자 대신 실제 횟수 '${i1.v}'`, FX.kk.status === 'ref' && i1.v === `${e1.sim.n.toLocaleString()}건 중 ${e1.sim.k.toLocaleString()}건` && !/%$/.test(i1.v) && i1.lv === (e1.sim.k / e1.sim.n >= 0.3 ? 'r' : e1.sim.k / e1.sim.n >= 0.1 ? 'y' : 'g') && i1.why.some(w => /확률 대신 실제로 있었던 횟수/.test(w)));
const i2 = kA(kkOk, 46000, 50700);
check('깡통전세(검증 통과 status ok): 확률(kk-core pText)', i2.v === KK.pText(e1.p) && /확률/.test(i2.s));
const small = JS.itemKk({ kind: 'a', code: '11440', dep: 50700 * 1.05, senior: 0, sale: sale(50700), kk: Object.assign({}, kkRef, { sim: { '11440': [[0, 100, 0], [60, 10, 0], [70, 10, 0], [80, 10, 0], [90, 10, 0], [100, 12, 3]] } }), place: { gu: '마포구' } }, KK);
check('깡통전세: 비슷한 계약 30건 미만이면 판단 안 함(확인 필요)', small.lv === 'n' && /적어요/.test(small.v));
check('깡통전세: 아파트만(빌라 등은 같은 동 범위로)', JS.itemKk({ kind: 'v' }, KK) === null && JS.itemRange({ kind: 'a' }) === null);
check('깡통전세: 시세·자료가 없으면 확인 필요', kA(kkRef, 30000, 0).lv === 'n' && JS.itemKk({ kind: 'a', dep: 1 }, KK).lv === 'n');

/* ---------- ③ HUG ---------- */
const hv = JS.itemHug({ kind: 'v', code: '11440', metro: true, dep: 25200, senior: 0, pub: 20000 }, H), hv2 = JS.itemHug({ kind: 'v', code: '11440', metro: true, dep: 25201, senior: 0, pub: 20000 }, H);
check('HUG: 공시 2억 × 126% = 2억 5,200만까지 괜찮아요 · 1만 원만 넘어도 위험', hv.lv === 'g' && hv2.lv === 'r' && /2억 5,200만원까지/.test(hv.s) && /2억 5,200만원 이하면/.test(hv2.s));
check('HUG: 공시가격이 없으면 확인 필요(보증금 한도만)', JS.itemHug({ kind: 'v', code: '11440', metro: true, dep: 25000 }, H).lv === 'n');
check('HUG: 수도권 밖 보증금 한도 5억', JS.itemHug({ kind: 'v', code: '26110', metro: false, dep: 50001, pub: 90000 }, H).lv === 'r' && JS.itemHug({ kind: 'v', code: '26110', metro: false, dep: 50000, pub: 90000 }, H).lv === 'g');
check('HUG: 출처(HUG 상품개요 + 확인일) · 126% 유지 보도(2026-10-09)', hv.src[0].u === H.SRC.url && hv.src[0].at === H.SRC.checked && hv.src[1].at === '2026-10-09' && hv.why.some(w => /126%/.test(w)));
check('지역 코드 → 수도권(서울 11·인천 28·경기 41)', JS.metroOf('11440') && JS.metroOf('28237') && JS.metroOf('41135') && !JS.metroOf('26110') && JS.metroOf(''));

/* 전체 결론 */
const b0 = JS.build({ kind: 'a' }, E0);
check('보증금 전에는 안내 한 줄 · 모든 칸 확인 필요', b0.lv === 'n' && /보증금을 넣으면/.test(b0.head) && b0.items.every(i => i.lv === 'n'));
const bR = JS.build({ kind: 'a', code: '11440', metro: true, dep: 46000, pub: 30000, sale: { price: 50700, at: '202610', ch1: { pct: -0.001, fromAt: '202510', toAt: '202610' } }, kk: FX.kk, place: { gu: '마포구' } }, E0);
check('위험 신호가 있으면 결론이 위험(개수·이름)', bR.lv === 'r' && /^위험 신호 2개/.test(bR.head) && /전세가율 · HUG 전세보증 가입/.test(bR.sub), [bR.head, bR.sub]);
check('다음 할 일: 등기부(인터넷등기소)·세금 체납·전입신고·확정일자·HUG 안심전세·체크리스트·만기 알림·갈아타기', ['reg', 'tax', 'move', 'hug', 'ck', 'alert', 'switch'].every(id => bR.todo.some(t => t.id === id)) && bR.todo[0].href === 'https://www.iros.go.kr/' && bR.todo.find(t => t.id === 'hug').alt.u === 'https://apps.apple.com/kr/app/id1633013098');
check('다가구는 먼저 들어온 세입자 보증금 확인을 할 일에', JS.build({ kind: 'd', dep: 1 }, E0).todo.some(t => t.id === 'prior') && !bR.todo.some(t => t.id === 'prior'));
check('진단 리포트 틀(diag.js)로 그려짐', /dg-head dg-r/.test(D.html(bR, {})) && (D.html(bR, {}).match(/class="dg-card /g) || []).length === bR.items.length);

/* ---------- ④ 길잡이 ↔ 화면 같은 결과 ---------- */
/* 길잡이 단지 정보(assets/guide.js danjiFacts) 떼어 돌리기 */
function fnSrc(src, name) { const i = src.indexOf('function ' + name + '('); let j = src.indexOf('{', i), d = 0; for (let k = j; k < src.length; k++) { if (src[k] === '{') d++; else if (src[k] === '}') { d--; if (!d) return src.slice(i, k + 1); } } }
const GJ = read('assets/guide.js');
const facts = (() => { const code = 'async ' + fnSrc(GJ, 'danjiFacts') + '\nOUT.f = danjiFacts;';
  const OUT = {}; vm.runInNewContext(code, { OUT, root: { JDJ_MINE: M, JDJ_ASK_CORE: A, JDJ_PRICE: { loadSgg: async () => ({ units: FX.price }), scoreUnits: async () => [] } }, getJ: async () => null, DATA: '', BASE: '/', ix: async () => ({ months: FX.months, sido: [] }), Math, String, Promise, Object }); return OUT.f; })();
/* 화면(jeonse/safety/)이 주소 + 이 탭 금액으로 만드는 입력 — 화면 코드 inputs() 와 같은 순서(아래 ⑧에서 화면 글자로 확인) */
function pageX(url, ss, data) {
  const qs = new URLSearchParams(url.split('?')[1]), k = qs.get('k'), g = qs.get('g') || '', d = qs.get('d') || '', b = qs.get('b') || '';
  const h = JS.take(ss) || {};
  const x = { kind: k, code: g, metro: JS.metroOf(g), dep: h.dep || 0, senior: h.sen == null ? null : h.sen, pub: h.pub || 0, kb: k === 'a' || k === 'o' ? h.kb || 0 : 0,
    sale: null, rent: null, range: null, kk: null, place: { gu: data.gu[g] || '', band: '', dong: '' } };
  if (k === 'a') { x.kk = data.kk; if (d) { const p = d.split('|'); x.sale = JS.saleOf(data.price, data.months, { code: p[0], dong: p[1], apt: p[3], jibun: p[2], band: b }, M); if (x.sale) { x.place.name = p[3]; x.place.dong = p[1]; x.place.band = x.sale.band; } } }
  return x;
}
(async () => {
  const IXg = { sgg: { '11440': { name: '마포구', sido: '서울특별시' } }, months: FX.months };
  const data = { price: FX.price, months: FX.months, kk: FX.kk, gu: { '11440': '마포구' } };
  const dj = new Map(); FX.price.forEach(u => { const key = [u[0], u[1], u[8], u[2]].join('|'); if (!dj.has(key)) dj.set(key, { sd: 's00', code: u[0], dong: u[1], jibun: u[8], apt: u[2], bands: [] }); dj.get(key).bands.push(u[3]); });
  let nSale = 0, okSale = 0, nCase = 0, okCase = 0, bad = null, lvSeen = new Set();
  for (const d of dj.values()) for (const band of [undefined].concat(d.bands)) {
    const f = await facts(Object.assign({}, d, band ? { band } : {}), IXg, { fast: true });
    const p = d.bands.length ? JS.saleOf(FX.price, FX.months, { code: d.code, dong: d.dong, apt: d.apt, jibun: d.jibun, band: f ? f.band : band }, M) : null;
    nSale++; if (f && p && (p.none ? !f.price : f.price === p.price && f.at === p.at && JSON.stringify(f.ch1) === JSON.stringify(p.ch1)) && f.band === p.band) okSale++; else if (!bad) bad = { d, band, f, p };
    if (!f) continue;
    for (const dep of [12000, 30000, 46000, 70000, 70001].concat(f.price ? [Math.round(f.price * 0.85), Math.round(f.price * 0.95)] : [])) for (const senior of [null, 0, 8000]) for (const [pub, kb] of [[0, f.price || 0], [25000, 0], [40000, 0], [0, 0]]) {
      const a = { htype: 'apt', danji: d, facts: f, dep, senior, pub, kb, region: { code: '11440', name: '마포구' } };
      const r = G.solve({ id: 'deposit_safe', solve: 'depositSafe', src: [] }, a, { H, KK, JS, kkData: FX.kk, IX: IXg });
      if (r.need) { check('길잡이: 공시가격·시세가 둘 다 없으면 더 묻기', pub === 0 && kb === 0, r.need); continue; }
      nCase++;
      const x = pageX(r.same.href, JSON.stringify(r.same.ss[1]), data), rep = JS.build(x, E0);
      const same = JSON.stringify(rep.items.map(i => [i.id, i.lv, i.v, i.s, i.why])) === JSON.stringify(r.jsafe.items.map(i => [i.id, i.lv, i.v, i.s, i.why]))
        && rep.head === r.head && rep.lv === r.jsafe.lv && JSON.stringify(r.nums) === JSON.stringify(rep.items.map(i => ({ k: `${i.t} · ${i.lvT}`, v: i.v, s: i.s })));
      rep.items.forEach(i => lvSeen.add(i.id + i.lv));
      if (same) okCase++; else if (!bad) bad = { a: { dep, senior, pub, kb, apt: d.apt, band: f.band }, g: r.nums, p: rep.items.map(i => [i.v, i.s]) };
      const u = r.same.href;
      if (!/^jeonse\/safety\/\?k=a&sd=s00&g=11440&d=[^&]+&b=[^&]+&from=guide$/.test(u) || /dep|sen=|pub=|kb=/.test(u) || u.indexOf(String(dep)) >= 0 && String(dep).length > 4 && decodeURIComponent(u).indexOf(String(dep)) >= 0) { check('길잡이 주소에 금액 없음', false, u); }
    }
  }
  check(`④ 같은 시세 고르기: 길잡이 단지 정보(danjiFacts) = 화면 saleOf (${okSale}/${nSale}, 평형 안 고름 포함)`, okSale === nSale && nSale > 10, bad);
  check(`④ 길잡이 deposit_safe ↔ 전세 안전 점검 아파트 ${nCase}가지 모두 같은 신호·값·글자(${okCase}/${nCase})`, okCase === nCase && nCase > 200, bad);
  check('④ 시험 조건에 괜찮아요·주의·위험 신호가 모두 나옴', ['jrg', 'jry', 'jrr', 'hugg', 'hugr', 'kkg', 'kky'].every(k => lvSeen.has(k)), [...lvSeen]);
  /* 빌라·오피스텔·단독: 길잡이는 동·건물을 묻지 않아요 → 화면도 같은 구만 고른 상태로 열려 같은 결과 */
  let nV = 0, okV = 0;
  for (const htype of ['villa', 'offi', 'house']) for (const dep of [15000, 25200, 25201, 52000, 70001]) for (const senior of [null, 0, 3000]) for (const [pub, kb, code] of [[20000, 0, '11440'], [0, 30000, '11440'], [30000, 0, '26110'], [20000, 0, '']]) {
    const a = { htype, dep, senior, pub, kb, region: code ? { code, name: code === '11440' ? '마포구' : '중구' } : null };
    const r = G.solve({ id: 'deposit_safe', solve: 'depositSafe', src: [] }, a, { H, KK, JS, IX: IXg });
    if (r.need) continue; nV++;
    const x = pageX(r.same.href, JSON.stringify(r.same.ss[1]), Object.assign({}, data, { gu: { '11440': '마포구', '26110': '중구' } })), rep = JS.build(x, E0);
    const same = JSON.stringify(rep.items) === JSON.stringify(r.jsafe.items.map(i => Object.assign({}, i))) && rep.head === r.head;
    if (same && r.same.href.startsWith('jeonse/safety/?k=' + JS.FROM_HT[htype])) okV++; else if (!bad) bad = { htype, dep, senior, pub, kb, code, g: r.nums, p: rep.items.map(i => i.s) };
  }
  check(`④ 길잡이 ↔ 화면 빌라·오피스텔·단독 ${nV}가지 같은 결과(${okV}/${nV})`, nV > 80 && okV === nV, bad);
  check('④ 이 탭에 넘긴 금액은 30분 뒤 쓰지 않음', JS.take(JSON.stringify(JS.hand({ dep: 1 }, Date.now() - 1801e3))) === null && JS.take(JSON.stringify(JS.hand({ dep: 1 }, Date.now() - 60e3))).dep === 1 && JS.take('x') === null);

  /* ---------- ⑤ 금액은 기기 안에서만 ---------- */
  const PG = read('jeonse/safety/index.html');
  const pq = fnSrc(PG, 'placeQs');
  check('⑤ 공유·주소(placeQs)에는 고른 집만(보증금·선순위·공시가격·시세 없음)', !/dep|sen|pub|kb/.test(pq) && /shareNote: '공유 주소에는 고른 집만 들어가고, 넣은 금액은 들어가지 않아요\.'/.test(PG));
  check('⑤ 집계(jdjStat)에는 기능 이름만 · 서버로 보내는 코드 없음', /jdjStat\('feature_use', \{ feature: 'jsafe' \}\)/.test(PG) && !/sendBeacon|XMLHttpRequest/.test(PG) && (PG.match(/method:\s*'POST'/g) || []).length === 1 && /function regInit\(\)[^]*method: 'POST'/.test(PG) && !/post\('(guardOrder|readRegistry)', \{[^}]*(num\(|\$\('(dep|sen|pub|kb)'\))[^}]*\}\)/.test(PG.replace(/sessionStorage\.setItem\([^\n]*\n/g, '')) && !/fetch\(|XMLHttpRequest/.test(read('assets/jsafe-core.js')));
  check('⑤ 길잡이 금액은 이 탭에만(sessionStorage jdj_jsafe, ?from=guide 일 때만 읽음)', /q\.get\('from'\) === 'guide'/.test(PG) && /JS\.take\(sessionStorage\.getItem\(JS\.SS_KEY\)\)/.test(PG) && /data-ssk/.test(GJ) && /root\.sessionStorage\.setItem\(x\.dataset\.ssk, x\.dataset\.ssv\)/.test(GJ) && JS.SS_KEY === 'jdj_jsafe');
  /* 화면 입력 만들기가 이 시험의 pageX 와 같은 규칙인지(글자로) */
  const inp = fnSrc(PG, 'inputs');
  check('⑧ 화면 입력 = 길잡이와 같은 규칙(metroOf(구) · saleOf(price/{구}, index months, 평형) · kk.json · 선순위 모르면 null)', /metro: JS\.metroOf\(S\.code\)/.test(inp) && /JS\.saleOf\(g\.units, IX\.months, \{ code: p\[0\], dong: p\[1\], apt: p\[3\], jibun: p\[2\], band: S\.band \}, M\)/.test(inp) && /x\.kk = await kkData\(\)/.test(inp) && /senior: senRaw == null \? null : senRaw/.test(inp) && /place: \{ gu: sggName\(S\.code\)/.test(inp)
    && /fromGuide/.test(read('assets/jsafe-core.js')) && /JS\.build\(x, \{ H, KK \}\)/.test(PG));
  check('⑧ 길잡이 단지 정보에 1년 변화(ch1)', /ch1: sm && sm\.ch1 \? \{ pct: sm\.ch1\.pct, fromAt: sm\.ch1\.fromAt, toAt: sm\.ch1\.toAt \} : null/.test(GJ));

  /* ---------- ⑥ 들어오는 길 ---------- */
  const SC = JSON.parse(read('assets/guide/scenarios.json')).sc, ds = SC.find(s => s.id === 'deposit_safe');
  check('⑥ 고민 찾기 시나리오(보증금·전세 사기 걱정) → 첫 다음 단계 = 전세 안전 점검 · jsafe 계산 불러오기', ds.next[0].href === 'jeonse/safety/' && ds.next[0].k === 'calc' && ds.need.includes('jsafe') && ds.kw.some(k => k[0] === '전세사기') && /전세 사기/.test(ds.sub)
    && /need\.indexOf\('jsafe'\) >= 0\) \{ if \(!root\.JDJ_JSAFE\) await script\('assets\/jsafe-core\.js\?v=4'\)/.test(GJ));
  const GD = { sc: SC, lex: JSON.parse(read('assets/guide/lexicon.json')) }, cl = t => ((G.classify(t, GD, { today: '2026-11-26' }) || {}).top || {}).id;
  check('⑥ 고민 찾기(길잡이)에서 전세 사기·깡통 걱정 문장 → deposit_safe', ['전세 사기 당할까봐 걱정돼요', '깡통전세인지 확인하고 싶어요', '보증금 못 받으면 어떡해요', '전세보증보험 가입 되나요'].every(t => cl(t) === 'deposit_safe'), ['전세 사기 당할까봐 걱정돼요', '깡통전세인지 확인하고 싶어요'].map(cl));
  const IXa = { sido: [{ id: 's00', name: '서울특별시', short: '서울' }], sgg: { '11440': { sido: '서울특별시', name: '마포구' } } };
  check('⑥ 고민 찾기(첫 화면 찾기 칸): 전세 사기·깡통 걱정 → 전세 안전 점검', ['마포구 전세 사기 걱정돼요', '깡통전세 걱정', '전세보증보험 될까요'].every(t => (A.topic(t, IXa) || {}).id === 'jsafe') && /jeonse\/safety\/\?sd=s00&g=11440$/.test(A.topic('마포구 전세 사기 걱정돼요', IXa).url));
  check('⑥ 첫 화면 전세·월세 묶음 · 전체 기능 · 전월세 화면 위 · 전월세 결과에서 같은 집으로', /href="jeonse\/safety\/" data-track="home_svc_jsafe"/.test(read('index.html')) && /href="\.\.\/jeonse\/safety\/" data-track="all_jsafe"/.test(read('all/index.html'))
    && /class="jsc" id="jsCta" href="safety\/"/.test(read('jeonse/index.html')) && /jsafeHref\(c\)/.test(read('jeonse/index.html')) && read('jeonse/index.html').indexOf('id="jsCta"') < read('jeonse/index.html').indexOf('id="tswCta"'));
  check('⑥ 기능 찾기 색인·사이트맵', JSON.parse(read('assets/guide/features.json')).items.some(x => x.id === 'jsafe' && x.url === 'jeonse/safety/') && /jeonse\/safety\//.test(read('sitemaps/pages.xml')));
  check('⑥ 전월세 화면 → 안전 점검 주소에도 금액 없음', !/dep|senV|pubV|ksKb/.test(fnSrc(read('jeonse/index.html'), 'jsafeHref')));

  /* ---------- ⑦ 문구 ---------- */
  const txt = [PG, read('assets/jsafe-core.js'), read('assets/diag.js')].join('\n');
  check('⑦ 권유 문구 없음', !G.BAD.test(txt) && !/(계약하세요|계약하지\s*마세요|사세요|파세요)/.test(txt));
  check('⑦ 경쟁 서비스 이름 없음', !/(직방|다방|호갱노노|아실|리치고|네이버\s*부동산|네이버페이|KB부동산|피터팬|한방|부동산114|밸류맵|디스코|토스|뱅크샐러드|카카오페이|핀다)/.test(txt));
  check('⑦ 쉬운 말 ~요체(결론·안내)', /다시 확인하세요/.test(read('assets/jsafe-core.js')) && !/합니다\.|입니다\./.test(txt.replace(/<!--[^]*?-->/g, '')));
  check('⑦ 기준일·출처 표시(실거래 기준 연월 · HUG 확인일 · 판단 선 설명)', /실거래 기준/.test(read('assets/jsafe-core.js')) && /H\.SRC\.checked/.test(read('assets/jsafe-core.js')) && /판단 선/.test(read('assets/jsafe-core.js')));

  /* ---------- ⑧ 파일 번호 ---------- */
  const SW = read('sw.js');
  check('⑧ 서비스 워커: 화면·jsafe-core v2·diag v1 · 길잡이 파일 새 번호', /'\.\/jeonse\/safety\/'/.test(SW) && /'\.\/assets\/jsafe-core\.js\?v=4'/.test(SW) && /jsafe-core\.js\?v=4/.test(PG)
    && /guide-core\.js\?v=15/.test(SW) && /guide\.js\?v=23/.test(SW) && /guide-next\.js\?v=11/.test(SW) && /scenarios\.json\?v=14/.test(read('solve/admin/index.html')) && /scenarios\.json\?v=14/.test(SW) && /features\.json\?v=3/.test(SW) && /ask-core\.js\?v=11/.test(SW)
    && /guide-core\.js\?v=15/.test(read('index.html')) && /guide-core\.js\?v=15/.test(read('solve/index.html')) && /scenarios\.json\?v=14/.test(GJ) && /scenarios\.json\?v=14/.test(read('assets/guide-next.js')) && /features\.json\?v=3/.test(GJ));

  /* ⑨ 실제 공개 자료(빌라 망원동)로 범위가 그려지는지 · 화면이 금액을 주소에 쓰지 않는지 */
  check('⑨ 화면 주소 쓰기(placeQs·history)는 고른 집만 · 금액 칸 id(dep·sen·pub·kb)는 주소 함수에 없음', !/'dep'|'sen'|'pub'|'kb'/.test(fnSrc(PG, 'placeQs')) && /history\.replaceState\(null, '', url\)/.test(PG));
  check('⑨ 화면 첫 계산은 보증금이 있어야(없으면 안내)', /보증금을 넣어 주세요/.test(PG));
  check('⑨ HUG 126% 기준 출처·날짜(상품 안내 확인일 + 2026-10-09 유지 보도 + 2026-11-27 다시 확인)', /2026-11-27/.test(read('assets/jsafe-core.js')) && /imaeil\.com/.test(read('assets/jsafe-core.js')) && /2026-11-27 다시 확인/.test(PG));
  console.log(`\n전세 안전 점검(계산·길잡이와 같은 결과·들어오는 길): ${pass} 통과 · ${fail} 실패`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('오류', e); process.exit(1); });
