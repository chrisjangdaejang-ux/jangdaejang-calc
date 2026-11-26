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
check('엔진이 안 쓰는 점수 → 순위 숨김', [R.check(null), R.check({ region: { used: false, periods: [{ t0: '202410', top20: 3 }] } })], [null, null], 'model.json region.used');
check('검증 통과 요약', R.check({ region: { used: true, periods: [{ t0: '202410', top20: 3.6 }, { t0: '201910', top20: -1 }], oos: { top20: 3.97 } } }), { n: 2, hit: 1, y0: 2019, y1: 2024, oos: 3.97, t0: null }, '써 본 횟수·맞은 횟수·연도');

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
  check('세 탭 이름', ['구별 시세', '미래가치 순위', '점수 많이 바뀐 단지'].every(t => html.includes(`>${t}</button>`)), true, '');
  check('공유 모듈 tool rank', /JDJ_SHARE\.setup\(\{ tool: 'rank'/.test(html), true, 'assets/share.js');
  check('sw 첫 화면 목록에 rank/·rank-core', sw.includes("'./rank/'") && sw.includes('rank-core.js?v='), true, '');
  const m = html.match(/rank-core\.js\?v=(\d+)/);
  check('화면·sw 의 rank-core 버전 같음', m && sw.includes('rank-core.js?v=' + m[1]), true, '');
  const tabs = (tab.match(/^\s*\['[^']*', '[^']+', '/gm) || []).length;
  /* 대표 결정 2026-11-26: 하단 탭 = 홈·고민 찾기·지도·내 집·전체 — 순위는 '전체'(all/)·첫 화면에서 */
  check('하단 탭 5개 이하, 순위는 전체 기능에서', [tabs <= 5, tab.includes("'all/', '전체'"), fs.readFileSync(path.join(root, 'all', 'index.html'), 'utf8').includes('href="../rank/"')], [true, true, true], 'assets/tabbar.js · all/');
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
  /* 등수 통일: 순위 화면(future)·지도·내 집 시세·리포트(plain-words regionPlace) 가 모든 시·도에서 같은 'N곳 중 N위' */
  require('../assets/plain-words.js'); const P = globalThis.JDJ_PLAIN, NR = require('../assets/narrative.js');
  let nb = 0, nr = 0, ex = '';
  for (const sd of X.sido) {
    const sf = path.join(dir, sd.id + '.json'); if (!fs.existsSync(sf)) continue;
    const ff = R.future(X, sd.name, R.gsFromUnits(JSON.parse(fs.readFileSync(sf, 'utf8')).units));
    for (const x of ff.rows) { nr++; const rp = P.regionPlace(X, x.code, x.gs); if (!rp || rp.r !== x.r || rp.n !== ff.n || rp.pos !== x.pos || /약 /.test(rp.text) !== !(sd.ngs > 0)) { nb++; ex = ex || `${x.name} ${x.r}/${ff.n} vs ${rp && rp.text}`; } }
  }
  check(`실제 자료: 구 ${nr}곳 순위 화면 등수 = 다른 화면 등수(regionPlace)`, nb, 0, ex || 'gs = round(100·(i+0.5)/ngs) 되돌림');
  /* 구 이유 문장(공용 guWhy): 과거 사례가 있으면 사실 → 비교 → 과거 사례 → 그래서, 없으면 그래서 없이 '가장 큰 이유:' (숫자를 지어내지 않음) */
  const evf = path.join(dir, 'evidence.json');
  if (fs.existsSync(evf) && fs.existsSync(s0)) {
    const EV = JSON.parse(fs.readFileSync(evf, 'utf8')), gm = R.gsFromUnits(JSON.parse(fs.readFileSync(s0, 'utf8')).units);
    let bad2 = 0, wp = 0, ex2 = '';
    for (const sd of X.sido) {
      const sf = path.join(dir, sd.id + '.json'); if (!fs.existsSync(sf)) continue;
      for (const x of R.future(X, sd.name, R.gsFromUnits(JSON.parse(fs.readFileSync(sf, 'utf8')).units)).rows) {
        const w = NR.guWhy({ IX: X, code: x.code, gs: x.gs, EV, PL: P }); if (!w) continue;
        if (w.past) wp++;
        const okw = w.past ? (!!w.so && w.text.indexOf(w.fact) === 0 && w.text.indexOf(w.past) > w.text.indexOf(w.fact) && w.text.endsWith(w.so) && /사례 [\d,]+건 중 [\d,]+건/.test(w.past))
          : (!w.so && /^점수를 (올린|낮춘) 가장 큰 이유: /.test(w.line) && !/그래서|과거/.test(w.line));
        const e = w.ev; if (w.past && !(e && Math.sign(e.ex) === (w.up ? 1 : -1))) bad2++;
        if (!okw) { bad2++; ex2 = ex2 || x.name + ': ' + w.line; }
      }
    }
    check('실제 자료: 구 이유 문장 순서(사실 → 비교 → 과거 사례 → 그래서), 사례 없으면 그래서 없음', bad2, 0, ex2);
    check('실제 자료: 과거 사례 문장이 붙은 구가 있음', wp > 0, true, 'evidence.json region');
    const sdb = Object.keys(X.sgg).find(k => X.sgg[k].name === '도봉구' && X.sgg[k].sido === '서울특별시');
    const wd = sdb && gm[sdb] != null ? NR.guWhy({ IX: X, code: sdb, gs: gm[sdb], EV, PL: P }) : null;
    if (wd && wd.k === 'mom' && wd.past) check('실제 자료: 도봉구 문장 = 사실·비교·과거 사례·그래서', /^도봉구 전체 시세가 최근 1년 .+%로 (내렸어요|올랐어요)\. 서울 구 중간값\(.+\)보다 .+%p (낮아요|높아요)\. 과거 서울에서 1년 상승률이 .+였던 구는 이후 2년 서울 평균보다 평균 .+%p (더|덜) 올랐어요\(사례 \d+건 중 \d+건\)\. 그래서 도봉구 점수를 (높게|낮게) 봤어요\.$/.test(wd.text), true, wd.text);
  }
  const mj = path.join(dir, 'model.json');
  if (fs.existsSync(mj)) { const M = JSON.parse(fs.readFileSync(mj, 'utf8')); check('실제 자료: 검증 결과 읽기', !!R.check(M) === !!(M.region && M.region.used), true, 'model.json region'); }
}

/* 2026-11-26 결정: '점수 많이 바뀐 단지' 탭은 rank.json 자료가 그 시·도에 생길 때까지 숨김(빈 '다음 달부터 공개해요' 탭을 보이지 않게) */
{
  const RP = require('fs').readFileSync(require('path').join(__dirname, '..', 'rank', 'index.html'), 'utf8');
  check('순위: 점수 변화 탭은 처음엔 숨김', /id="tb-move"[^>]*hidden/.test(RP), true, 'rank/index.html');
  check('순위: 자료가 생기면 자동으로 보이고, 없으면 시세 탭으로', [/function moveOk\(\)\{ return !!\(RK && R\.moves\(RK, S\.sd\)\); \}/.test(RP), /if \(S\.t === 'move' && RK !== undefined && !moveOk\(\)\) S\.t = 'price'/.test(RP)], [true, true], 'rank/index.html syncMove');
}

const fail = rows.filter(r => !r.ok);
for (const r of rows) console.log((r.ok ? 'ok   ' : 'FAIL ') + r.name + (r.ok ? '' : `\n      got ${JSON.stringify(r.got)}\n      want ${JSON.stringify(r.want)}  (${r.basis})`));
console.log(`\n${rows.length - fail.length}/${rows.length} 통과`);
process.exit(fail.length ? 1 : 0);
