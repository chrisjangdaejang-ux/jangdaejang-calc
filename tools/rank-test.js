/* 순위 화면(rank/) 계산 자동 검증 — 실행: node tools/rank-test.js [자료 폴더(선택, 예: /tmp/dchk/data)]
   assets/rank-core.js 의 구별 시세 변동률·상승/하락/보합 수·거래 적은 곳 빼기·등수, 구별 미래가치 실제 등수·검증 통과 여부,
   점수 변화 자료(rank.json) 읽기와 주소·표시 형식을 손으로 계산한 값과 맞춰 본다.
   자료 폴더를 주면 실제 index.json·sNN.json 으로 '숫자를 지어내지 않는지'(평당가 = 자료 값, 변동률 = 두 달 자료 비율)도 확인한다. 금액 단위: 만원. */
const fs = require('fs'), path = require('path');
const R = require('../assets/rank-core.js');
const rows = [];
function check(name, got, want, basis) { rows.push({ ok: JSON.stringify(got) === JSON.stringify(want), name, got, want, basis }); }
const months = []; for (let y = 2023, m = 11; months.length < 36; m++) { if (m > 12) { m = 1; y++; } months.push(String(y) + String(m).padStart(2, '0')); }
const ser = (last, prev) => months.map((_, i) => i === 35 ? last : i === 34 ? prev : prev);
const cnt = v => months.map(() => v);

/* ---------- 구별 시세 ---------- */
const IX = { months, sido: [{ id: 's00', name: '서울특별시', short: '서울' }], sgg: {
  '1': { sido: '서울특별시', name: '가구', s: ser(5500, 5000), c: cnt(10) },   // +10.0%
  '2': { sido: '서울특별시', name: '나구', s: ser(4950, 5000), c: cnt(10) },   // −1.0%
  '3': { sido: '서울특별시', name: '다구', s: ser(5001, 5000), c: cnt(10) },   // +0.02% → 0.0% 보합
  '4': { sido: '서울특별시', name: '라구', s: ser(9000, 5000), c: cnt(2) },    // 거래 3개월 6건 → 뺌
  '5': { sido: '서울특별시', name: '마구', s: ser(5500, 5000), c: cnt(10) },   // +10.0% (가구와 같은 등수)
  '9': { sido: '부산광역시', name: '바구', s: ser(3000, 2000), c: cnt(10) } } };
const up = R.price(IX, '서울특별시', 1, 'up');
check('기준 달·비교 달', [up.at, up.from], ['202610', '202609'], '마지막 달과 1개월 전');
check('상승·하락·보합·뺀 곳 수', [up.up, up.down, up.flat, up.skip], [2, 1, 1, 1], '+10·+10·−1·0.0, 라구는 3개월 거래 6건(<10)');
check('상승 순서(같은 변동률은 평당가·이름 순)', up.rows.map(x => x.name), ['가구', '마구', '다구', '나구'], '변동률 큰 순');
check('같은 변동률은 같은 등수', up.rows.map(x => x.r), [1, 1, 3, 4], '공동 1위 다음은 3위');
check('변동률 = 두 달 평당가 비율(소수 1자리)', up.rows.map(x => x.ch), [10, 10, 0, -1], '5500/5000−1 = 10.0%');
check('평당가 = 그 달 자료 값', up.rows[0].p, 5500, 'sgg.s 마지막 값');
check('스파크라인은 최근 12개월', up.rows[0].spark.length, 12, '');
const dn = R.price(IX, '서울특별시', 1, 'down');
check('하락 순서', dn.rows.map(x => x.name), ['나구', '다구', '가구', '마구'], '변동률 작은 순');
check('다른 시·도는 섞지 않음', up.rows.some(x => x.name === '바구'), false, 'sgg.sido');
check('12개월 비교', R.price(IX, '서울특별시', 12, 'up').from, '202510', '12달 전');
check('자료가 모자라면 빈 결과', R.price({ months: ['202610'], sgg: {} }, '서울특별시', 1, 'up').rows, [], '');
{
  const IX2 = JSON.parse(JSON.stringify(IX)); IX2.sgg['1'].c[34] = 0; IX2.sgg['1'].c[33] = 0; IX2.sgg['1'].c[32] = 0;
  check('비교 달 거래가 적어도 뺌', R.price(IX2, '서울특별시', 1, 'up').rows.some(x => x.name === '가구'), false, '두 시점 모두 10건 이상');
}

/* ---------- 구별 미래가치 ---------- */
const IXf = { sgg: { a: { sido: 'X', name: '갑구' }, b: { sido: 'X', name: '을구' }, c: { sido: 'X', name: '병구' }, d: { sido: 'X', name: '정구' }, e: { sido: 'Y', name: '무구' } } };
const fu = R.future(IXf, 'X', { a: 10, b: 90, c: 50, d: 90, e: 99 });
check('점수 높은 순 실제 등수(같은 점수 같은 등수)', fu.rows.map(x => x.name + x.r), ['을구1', '정구1', '병구3', '갑구4'], 'gs 내림차순');
check('곳 수 = 점수가 있는 같은 시·도 구', fu.n, 4, '다른 시·도 무구 제외');
check('상위권·중위권·하위권(3등분)', fu.rows.map(x => x.pos), ['상위권', '상위권', '하위권', '하위권'], '4곳: 1위 ≤ 4/3 상위권, 3위 > 8/3 하위권');
check('3곳 미만이면 순위 없음', R.future(IXf, 'Y', { e: 99 }).rows, [], '');
check('점수 없는 구는 뺌', R.future(IXf, 'X', { a: 10, b: 90, c: 50 }).n, 3, '');
check('단지 자료 → 구 점수', R.gsFromUnits([['a', 0, 0, 0, 0, 0, 0, 0, 0, { gs: 30 }], ['a', 0, 0, 0, 0, 0, 0, 0, 0, { gs: 30 }], ['b', 0, 0, 0, 0, 0, 0, 0, 0, null]]), { a: 30 }, '10번째 칸 fx.gs');
check('검증 미통과 → 순위 숨김', [R.check(null), R.check({ region: { used: false, periods: [{ t0: '202410', top20: 3 }] } })], [null, null], 'model.json region.used');
check('검증 통과 요약', R.check({ region: { used: true, periods: [{ t0: '202410', top20: 3.6 }, { t0: '201910', top20: -1 }], oos: { top20: 3.97 } } }), { n: 2, hit: 1, y0: 2019, y1: 2024, oos: 3.97 }, '시험 수·통과 수·연도');

/* ---------- 점수 많이 바뀐 단지 ---------- */
check('rank.json 없거나 준비 전 → null(다음 달부터 공개)', [R.moves(null, 's00'), R.moves({ ready: false }, 's00')], [null, null], '');
const mv = R.moves({ ready: true, from: '202610', to: '202611', sido: { s00: { up: [['k1', '갑아파트', '11110', '갑동', '84㎡대', 60, 72]], down: [] } } }, 's00');
check('점수 변화 = 이번 달 − 지난달', [mv.up[0].d, mv.up[0].apt, mv.down.length], [12, '갑아파트', 0], '');
check('없는 시·도 → 빈 목록', R.moves({ ready: true, sido: {} }, 's01').up, [], '');

/* ---------- 주소·표시 ---------- */
check('구 → 지도 주소', R.mapUrl({ sgg: { '11110': [126.98564, 37.57527] } }, '11110', 'fv'), '/jangdaejang-calc/map/?lat=37.57527&lng=126.98564&z=13&m=fv', 'map-geo.json 구 가운데, 줌 13');
check('좌표 없는 구 → 지도 첫 화면', R.mapUrl(null, '1', 'price'), '/jangdaejang-calc/map/', '');
check('단지 → 내 집 시세 주소', R.mineUrl('s00', 'k1', '84㎡대'), '/jangdaejang-calc/mine/?sd=s00&d=k1&b=84%E3%8E%A1%EB%8C%80', 'mine/ ?sd·d·b');
check('금액 표시', [R.won(12782), R.won(9850), R.won(20000)], ['1억 2,782만', '9,850만', '2억'], '만원');
check('변동률 표시', [R.pct(7), R.pct(-0.4), R.pct(0)], ['+7.0%', '−0.4%', '0.0%'], '');
check('달 표시', R.ym('202610'), '2026년 10월', '');
check('스파크라인 값 2개 미만이면 없음', R.spark([0, 5], 56, 24), '', '');

/* ---------- 화면 연결 ---------- */
{
  const root = path.join(__dirname, '..');
  const html = fs.readFileSync(path.join(root, 'rank', 'index.html'), 'utf8');
  const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
  const tab = fs.readFileSync(path.join(root, 'assets', 'tabbar.js'), 'utf8');
  check('세 탭 이름', ['구별 시세', '구별 미래가치', '점수 많이 바뀐 단지'].every(t => html.includes(`>${t}</button>`)), true, '');
  check('공유 모듈 tool rank', /JDJ_SHARE\.setup\(\{ tool: 'rank'/.test(html), true, 'assets/share.js');
  check('sw 첫 화면 목록에 rank/·rank-core', sw.includes("'/jangdaejang-calc/rank/'") && sw.includes('rank-core.js?v='), true, '');
  const m = html.match(/rank-core\.js\?v=(\d+)/);
  check('화면·sw 의 rank-core 버전 같음', m && sw.includes('rank-core.js?v=' + m[1]), true, '');
  const tabs = (tab.match(/^\s*\['[^']*', '[^']+', '/gm) || []).length;
  check('하단 탭 5개 이하, 순위 포함', [tabs <= 5, tab.includes("'rank/', '순위'")], [true, true], 'assets/tabbar.js');
  check('홈에 순위 진입', fs.readFileSync(path.join(root, 'index.html'), 'utf8').includes('href="rank/"'), true, '');
  check('방어적 면책 문구 없음', /투자 권유가 아니|책임지지 않|참고용으로만/.test(html), false, '');
}

/* ---------- 실제 자료 ---------- */
const dir = process.argv[2];
if (dir && fs.existsSync(path.join(dir, 'index.json'))) {
  const X = JSON.parse(fs.readFileSync(path.join(dir, 'index.json'), 'utf8'));
  let bad = 0, n = 0;
  for (const sd of X.sido) for (const k of R.PERIODS) {
    const o = R.price(X, sd.name, k, 'up'), i = X.months.length - 1;
    if (o.up + o.down + o.flat !== o.rows.length) bad++;
    for (const r of o.rows) {
      n++;
      const g = X.sgg[r.code];
      if (r.p !== g.s[i] || r.ch !== Math.round((g.s[i] / g.s[i - k] - 1) * 1000) / 10) bad++;
    }
  }
  check(`실제 자료: 구별 시세 ${n.toLocaleString()}줄의 평당가·변동률 = 자료 값`, bad, 0, 'index.json sgg.s');
  const s0 = path.join(dir, 's00.json');
  if (fs.existsSync(s0)) {
    const gm = R.gsFromUnits(JSON.parse(fs.readFileSync(s0, 'utf8')).units);
    const f = R.future(X, '서울특별시', gm);
    check('실제 자료: 서울 구별 미래가치 25개 구, 등수 1~25', [f.n, f.rows[0].r, f.rows[f.n - 1].r], [25, 1, 25], 's00.json fx.gs');
    check('실제 자료: 점수 = 단지 자료 gs', f.rows.every(x => x.gs === gm[x.code]), true, '');
  }
  const mj = path.join(dir, 'model.json');
  if (fs.existsSync(mj)) { const M = JSON.parse(fs.readFileSync(mj, 'utf8')); check('실제 자료: 검증 결과 읽기', !!R.check(M) === !!(M.region && M.region.used), true, 'model.json region'); }
}

const fail = rows.filter(r => !r.ok);
for (const r of rows) console.log((r.ok ? 'ok   ' : 'FAIL ') + r.name + (r.ok ? '' : `\n      got ${JSON.stringify(r.got)}\n      want ${JSON.stringify(r.want)}  (${r.basis})`));
console.log(`\n${rows.length - fail.length}/${rows.length} 통과`);
process.exit(fail.length ? 1 : 0);
