/* 첫 화면 호기심 카드·단지 순위·데이터 출처 상자 자동 검증 — 실행: node tools/home-test.js [자료 폴더(선택, 예: /tmp/dchk/data)] </dev/null
   assets/home-core.js(하락·신고가 레이스 읽기, 시세 정확도 한 줄, 처음 지역), rank-core.js danji·vcheck(첫 화면 TOP 3 = /rank/ 단지별 같은 파일·같은 등수),
   src-box.js(쓴 자료만 출처로, 기준일은 공개 index.json 값만)를 손으로 계산한 값과 맞춰 본다.
   자료 폴더에 home/sNN.json 이 있으면 '숫자를 지어내지 않는지'(레이스 숫자 = price/{구}.json 실거래로 다시 계산한 값)도 확인한다. 금액 단위: 만원. */
const fs = require('fs'), path = require('path');
const HC = require('../assets/home-core.js'), R = require('../assets/rank-core.js'), SRC = require('../assets/src-box.js');
const rows = [];
function check(name, got, want, basis) { rows.push({ ok: JSON.stringify(got) === JSON.stringify(want), name, got, want, basis }); }

/* ---------- 단지 미래가치 TOP (home/sNN.json top) ---------- */
const H = { v: 1, top: { min: 10, n: { all: 4, g1: 2 }, cols: [], rows: [
  ['g1', '갑동', '1', '가아파트', '84㎡대', 100, 99, 40], ['g2', '을동', '2', '나아파트', '59㎡대', 100, 90, 30],
  ['g1', '갑동', '3', '다아파트', '74㎡대', 97, 95, 12], ['g2', '을동', '4', '라아파트', '84㎡대', 90, 80, 50]],
  lists: { all: [[0, 1], [1, 1], [2, 3], [3, 4]], g1: [[0, 1], [2, 2]] } } };
const t = R.danji(H, 'all', 3);
check('TOP 3 = 파일 순서·등수 그대로', t.rows.map(x => x.apt + x.r), ['가아파트1', '나아파트1', '다아파트3'], 'home_pulse.py 가 매긴 등수');
check('같은 등수가 있으면 공동 표시(예전 파일)', t.rows.map(x => x.tie), [true, true, false], '');
check('기준 한 줄(새 기준)', R.danjiRule({ min: { y1: 3, hh: 100, danji3y: 30 }, order: 'rank' }), '100세대 이상(세대수 자료가 없으면 단지 전체 최근 3년 거래 30건 이상), 그 평형 최근 1년 거래 3건 이상인 단지만, 단지마다 순위가 가장 높은 평형으로 줄 세웠어요. 같은 점수는 엔진이 매긴 실제 등수 순이에요.', 'home_pulse.py min·order');
check('기준 한 줄(예전 자료 순서)', /구 안 점수·최근 1년 거래가 많은 순/.test(R.danjiRule({ min: { y1: 3, hh: 100, danji3y: 30 }, order: 'score' })), true, '');
check('기준값 없으면 빈 문장', R.danjiRule({}), '', '');
check('비교한 단지 수', [t.n, t.min], [4, 10], 'top.n·min');
check('구 목록', R.danji(H, 'g1').rows.map(x => x.apt), ['가아파트', '다아파트'], 'lists[구]');
check('내 집 시세 키 = 시군구|동|지번|단지', t.rows[0].key, 'g1|갑동|1|가아파트', 'mine-core danjiKey');
check('자료 없으면 null', R.danji(null, 'all'), null, '');
check('목록 없는 구 → 빈 줄', R.danji(H, 'g9').rows, [], '');
const MH = { 2: { oos_all: [{ top20: 1 }, { top20: 0.8 }, { top20: 1.2 }, { top20: -0.2 }], oos_hit: 3, oos_avg: 0.7 } };
check('검증 성적(전국)', R.vcheck(MH, '서울특별시'), { n: 4, hit: 3, ok: true, where: '전국' }, 'model_h 2 oos_all·oos_hit');
check('시·도 성적이 있으면 그것', R.vcheck({ 2: Object.assign({ reg: { 서울특별시: { name: '서울', oos_all: [{}, {}], hit: 1, ok: false } } }, MH[2]) }, '서울특별시'), { n: 2, hit: 1, ok: false, where: '서울' }, 'reg');
check('절반 미만이면 통과 아님', R.vcheck({ 2: { oos_all: [{ top20: -1 }, { top20: -1 }, { top20: 1 }], oos_hit: 1, oos_avg: 0.1 } }, 'x').ok, false, '');
check('성적 없으면 null', R.vcheck({}, 'x'), null, '');

/* ---------- 하락·신고가 레이스 ---------- */
const HR = { race: { prior: ['202408', '202607'], recent: ['202608', '202610'], hiFrom: 20261002, hiTo: 20261031, rule: { minRecent: 2, minPrior: 5, minAmt: 10000, minArea: 30 },
  units: [['g1', '갑동', '1', '가아파트', '84㎡대', 85, [100, null, 110, 120, 125, 130, 128, 126, 100]]],
  dcols: ['u', 'peak', 'peakD', 'med', 'nRecent', 'last', 'lastD', 'rate'], hcols: ['u', 'amt', 'd', 'prevMax', 'prevMaxD', 'nHigh', 'rise'],
  drop: { all: { a: [12, [[0, 130000, 20260301, 100000, 3, 99000, 20261020, -23.1]]] } }, high: { all: { l: [1, [[0, 150000, 20261015, 130000, 20260301, 1, 15.4]]] } } } };
const d = HC.race(HR, 'drop', 'all', 'a');
check('하락 줄 = 파일 값', [d.n, d.rows[0].apt, d.rows[0].peak, d.rows[0].med, d.rows[0].rate, d.rows[0].area], [12, '가아파트', 130000, 100000, -23.1, 85], 'dcols');
check('하락률 = 중간값 ÷ 최고가 − 1 (파일 값과 일치)', Math.round((d.rows[0].med / d.rows[0].peak - 1) * 1000) / 10, d.rows[0].rate, '100000/130000−1');
const hh = HC.race(HR, 'high', 'all', 'l');
check('신고가 줄 = 파일 값', [hh.rows[0].amt, hh.rows[0].prevMax, hh.rows[0].rise], [150000, 130000, 15.4], 'hcols');
check('없는 평형대 → 0곳', HC.race(HR, 'high', 'all', 's'), { n: 0, rows: [] }, '');
check('자료 없으면 null', HC.race({}, 'drop', 'all', 'a'), null, '');
check('기준 기간 문구', HC.rule(HR), { prior: '2024년 8월~2026년 7월', recent: '2026년 8~10월', hiFrom: '10월 2일', hiTo: '10월 31일', minRecent: 2, minPrior: 5, minAmt: 10000, minArea: 30 }, '');
check('평형대 다섯 칸', HC.SIZES.map(x => x[1]), ['전체', '20평 미만', '20평대', '30평대', '40평 이상'], '');
const sp = HC.qSpark([100, null, 110, 120], 50, 26);
check('추세선: 빈 분기 건너뜀, 마지막 점 = 최근 3개월', [sp.d.split(/[ML]/).filter(Boolean).length, sp.lastIsRecent], [3, true], '');
check('추세선: 값 2개 미만 → 없음', HC.qSpark([null, 5], 50, 26), null, '');
check('금액 짧게', [HC.eok(130000), HC.eok(93000), HC.eok(9850), HC.eok(1280000)], ['13억', '9.3억', '9,850만', '128억'], '');
check('날짜', HC.md(20261002), '10월 2일', '');

/* ---------- 시세 추정 정확도 한 줄 ---------- */
check('track.json 없으면 null(카드 숨김)', [HC.acc(null, '서울특별시'), HC.acc({ acc: {}, acc_snap: {} }, '서울특별시')], [null, null], '없는 숫자 만들지 않음');
const TR = { acc: { 전국: [['202609', 4.3, 55.8, 82.2, 26222], ['202610', 4.21, 56.7, 82.4, 31692]], 서울특별시: [['202610', 3.9, 60, 87, 5000]] }, acc_snap: {} };
check('과거 재계산(시·도)', HC.acc(TR, '서울특별시'), { kind: 're', m: '202610', med: 3.9, w5: 60, w10: 87, n: 5000, where: '서울특별시' }, 'acc 마지막 달');
check('시·도 없으면 전국', HC.acc(TR, '제주특별자치도').where, '전국', '');
TR.acc_snap = { '2026-11': { m: '202611', by: { 전국: [4.5, 50, 80, 30000] } } };
check('스냅숏 성적이 있으면 그것(그때 공개한 시세)', [HC.acc(TR, '서울특별시').kind, HC.acc(TR, '서울특별시').med, HC.acc(TR, '서울특별시').where], ['snap', 4.5, '전국'], 'acc_snap');

/* ---------- 처음 지역 ---------- */
const IX = { sido: [{ id: 's00', name: '서울특별시' }, { id: 's01', name: '부산광역시' }], sgg: { 11680: { sido: '서울특별시', name: '강남구' }, 26350: { sido: '부산광역시', name: '해운대구' } } };
check('저장 없으면 서울 전체', HC.regionPick(IX, null, null), { sd: 's00', g: 'all' }, '');
check('첫 화면에서 고른 지역', HC.regionPick(IX, { sd: 's01', g: '26350' }, null), { sd: 's01', g: '26350' }, 'jdj_home_region');
check('다른 화면 지역(jdj_region)', HC.regionPick(IX, null, { sido: '서울특별시', sgg: '11680' }), { sd: 's00', g: '11680' }, '');
check('시·도와 안 맞는 구는 전체로', HC.regionPick(IX, { sd: 's00', g: '26350' }, null), { sd: 's00', g: 'all' }, '');

/* ---------- 데이터 출처 상자 ---------- */
const IXs = { updated: '2026-11-19', dataTo: '202610', price: { to: '202610' } };
const r0 = SRC.rows({ IX: IXs, f: null });
check('점수 없는 단지: 매매 실거래만', r0.map(x => x.k), ['매매 실거래가'], '쓴 자료만');
check('기준일 = 공개 index.json 값', r0[0].at, '2026년 10월 계약분까지 · 2026.11.19 반영', 'dataTo·updated');
const r1 = SRC.rows({ IX: IXs, f: { hh: 900, sub: 5, sl: [], sch: 0.01, sup: 0, pg: 0.002, jb: -0.01, un: 0, jr: 0.4, rz: null }, jeonse: true });
check('점수 묶음에 값이 있는 항목만(빈 신설역·재건축 없음)', r1.map(x => x.k), ['매매 실거래가', '전세 실거래가(전세가율)', '세대수·준공 연도', '가까운 지하철역', '학군(중학교 전·출입 학생 수)', '입주 예정 물량', '인구·세대 변화', '일자리 변화', '미분양'], '');
check('기관 이름', r1.map(x => x.org).filter(o => /교육부|통계청|한국부동산원|K-apt/.test(o)).length, 6, 'K-apt 2·교육부·부동산원·통계청 2');
check('갱신일 없으면 지어내지 않음', SRC.rows({ IX: { dataTo: '202610' }, f: { hh: 1 } })[1].at, '', '');
check('표 HTML: 접는 상자·세 칸', /<details class="jsrc"><summary>데이터 출처 보기<\/summary>/.test(SRC.html(r1)) && (SRC.html(r1).match(/<tr>/g) || []).length === r1.length + 1, true, '');

/* ---------- 화면 연결 ---------- */
{
  const root = path.join(__dirname, '..'), rd = f => fs.readFileSync(path.join(root, f), 'utf8');
  const home = rd('index.html'), sw = rd('sw.js'), rank = rd('rank/index.html'), mine = rd('mine/index.html'), rep = rd('buy/report/index.html');
  check('홈: 카드 자리·공용 계산 파일', [home.includes('id="pulse"'), home.includes('id="accl"'), /home-core\.js\?v=\d+/.test(home), /rank-core\.js\?v=\d+/.test(home)], [true, true, true, true], '');
  check('홈: 자료 없으면 숨김으로 시작', /id="pulse" hidden/.test(home) && /id="accl" hidden/.test(home), true, '');
  check('홈: 전체 순위 보기 → /rank/ 단지별', home.includes('rank/?t=fv&amp;v=apt'), true, '');
  check("홈: '과거에 써 봤더니 N번 중 M번 맞음' 문구", home.includes('과거에 써 봤더니 ${v.n}번 중 ${v.hit}번 맞음'), true, '');
  check("새 화면에 '시험·통과' 대신 '검증·맞음'", /시험|통과/.test(home.slice(home.indexOf('우리 지역 지금 (assets'), home.indexOf('<footer'))) || /시험|통과/.test(rank.slice(rank.indexOf('function drawApt'), rank.indexOf('/* ---------- 점수 많이 바뀐'))), false, '');
  check("가격 단정 문구 없음('N% 오른다')", /% 오른다|% 오를 거|오를 것입니다/.test(home + rank), false, '');
  const vh = (home.match(/rank-core\.js\?v=(\d+)/) || [])[1], vr = (rank.match(/rank-core\.js\?v=(\d+)/) || [])[1];
  check('홈·순위·sw 의 rank-core 버전 같음', vh === vr && sw.includes('rank-core.js?v=' + vh), true, '');
  const vc = (home.match(/home-core\.js\?v=(\d+)/) || [])[1];
  check('sw 에 home-core·src-box', sw.includes('home-core.js?v=' + vc) && /src-box\.js\?v=\d+/.test(sw), true, '');
  const vs = (mine.match(/src-box\.js\?v=(\d+)/) || [])[1];
  check('내 집 시세·리포트에 출처 상자(같은 버전)', [!!vs, rep.includes('src-box.js?v=' + vs), sw.includes('src-box.js?v=' + vs), mine.includes('JDJ_SRC.rows('), rep.includes('JDJ_SRC.rows(')], [true, true, true, true, true], '');
  check('순위: 단지별 보기', [rank.includes('function drawApt'), rank.includes("'home/' + S.sd + '.json'"), rank.includes('R.danji(h, S.g)')], [true, true, true], '');
}

/* ---------- 실제 자료 ---------- */
const dir = process.argv[2];
if (dir && fs.existsSync(path.join(dir, 'home', 's00.json'))) {
  const X = JSON.parse(fs.readFileSync(path.join(dir, 'index.json'), 'utf8'));
  const Hs = JSON.parse(fs.readFileSync(path.join(dir, 'home', 's00.json'), 'utf8'));
  const S0 = JSON.parse(fs.readFileSync(path.join(dir, 's00.json'), 'utf8')).units;
  /* TOP: 점수 = 공개 sNN.json 점수, 점수 높은 순, 등수 = 줄 순서, 기준(세대수·거래) 충족 */
  const fx = new Map(S0.filter(u => u[9] && typeof u[9] === 'object').map(u => [[u[0], u[1], u[8], u[2], u[3]].join('|'), u[9].fv]));
  const tp = R.danji(Hs, 'all');
  let bad = 0; tp.rows.forEach((x, i) => { if (fx.get([x.code, x.dong, x.jibun, x.apt, x.band].join('|')) !== x.fv) bad++; if (x.r !== i + 1 || (i && tp.rows[i - 1].fv < x.fv)) bad++; });
  const T0 = Hs.top, okc = T0.rows.every(r => (r[9] || 0) >= T0.min.y1 && (r[8] == null || r[8] >= T0.min.hh));
  check('실제 자료: TOP 후보 = 최근 1년 거래·세대수 기준 충족', okc, true, 'home_pulse.py MIN_Y1·MIN_HH');
  check(`실제 자료: 서울 TOP ${tp.rows.length}곳 점수 = s00.json, 등수 규칙`, bad, 0, '');
  /* 레이스: 하락률·신고가를 price/{구}.json 실거래로 다시 계산 */
  const R0 = Hs.race, med = a => { const s = a.slice().sort((x, y) => x - y), n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };
  const P = {}, unit = x => { if (!P[x.code]) P[x.code] = JSON.parse(fs.readFileSync(path.join(dir, 'price', x.code + '.json'), 'utf8')).units; return P[x.code].find(u => u[0] === x.code && u[1] === x.dong && u[8] === x.jibun && u[2] === x.apt && u[3] === x.band); };
  let bd = 0, nd = 0, ex = '';
  for (const k of ['a', 'l', 'm']) for (const x of HC.race(Hs, 'drop', 'all', k).rows) {
    nd++; const u = unit(x), ts = (u[11] || []).filter(t => t[4] !== 1 && Math.floor(t[1] + 0.5) === x.area), m = t => String(Math.floor(t[0] / 100));
    const rec = ts.filter(t => m(t) >= R0.recent[0]), pri = ts.filter(t => m(t) >= R0.prior[0] && m(t) < R0.recent[0]);
    const pk = Math.max(...pri.map(t => t[3])), md2 = med(rec.map(t => t[3]));
    if (pk !== x.peak || Math.round(md2) !== x.med || rec.length !== x.nRecent || Math.round((md2 / pk - 1) * 1000) / 10 !== x.rate || x.rate >= 0) { bd++; ex = ex || x.apt; }
  }
  check(`실제 자료: 하락 레이스 ${nd}줄 = 실거래로 다시 계산한 값`, bd, 0, ex || 'price/{구}.json');
  let bh = 0, nh = 0; ex = '';
  for (const x of HC.race(Hs, 'high', 'all', 'a').rows) {
    nh++; const u = unit(x), hit = (u[11] || []).find(t => t[0] === x.d && t[3] === x.amt && t[5] === 1 && t[4] !== 1);
    if (!hit || x.d < R0.hiFrom || x.d > R0.hiTo || x.amt <= x.prevMax || Math.round((x.amt / x.prevMax - 1) * 1000) / 10 !== x.rise) { bh++; ex = ex || x.apt; }
  }
  check(`실제 자료: 신고가 레이스 ${nh}줄 = 신고가 표시 거래, 최근 30일`, bh, 0, ex);
  check('실제 자료: 기준 달 = index.json dataTo', R0.recent[1], X.dataTo, '');
}

const fail = rows.filter(r => !r.ok);
for (const r of rows) console.log((r.ok ? 'ok   ' : 'FAIL ') + r.name + (r.ok ? '' : `\n      got ${JSON.stringify(r.got)}\n      want ${JSON.stringify(r.want)}  (${r.basis})`));
console.log(`\n${rows.length - fail.length}/${rows.length} 통과`);
process.exit(fail.length ? 1 : 0);
