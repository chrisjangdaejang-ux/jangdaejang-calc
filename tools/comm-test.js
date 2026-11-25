/* 상가·건물 탭 계산 규칙 자동 확인 — 실행: node tools/comm-test.js [자료 폴더(선택, 예: /tmp/comm-out)] </dev/null
   assets/comm-core.js(시계열 해독·㎡당 표기·거래 줄 해독·점수 상태 문장·임대동향·상권·수요 행)와 화면 문구 규칙,
   mine/index.html 탭·스크립트·광고 칸, (자료 폴더를 주면) 공개 자료 comm/index.json 모양과 가중치·기준값이 없는지. 금액 단위: 만원. */
const fs = require('fs'), path = require('path');
global.JDJ_MINE = require('../assets/mine-core.js');
const K = require('../assets/comm-core.js');
const rows = [];
function check(name, got, want) { rows.push({ ok: JSON.stringify(got) === JSON.stringify(want), name, got, want }); }
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

check('[시작 칸, 값…] 해독', K.arr([1, 5, 0, 7], 5), [0, 5, 0, 7, 0]);
check('㎡당 표기', K.perM2(1366.1), '1,366만 원');
check('3.3㎡(1평)당', K.perPy(1000), '3,306만 원');
const doc = { hm: '202607', to: '202610', ser: { c: { all: [1, 900, 0, 950], com: [0, 800] } }, n: { c: [0, 3, 4, 0, 5] } };
const rs = K.regionSeries(doc, 'c');
check('구 추이: 달 목록', rs.months, ['202607', '202608', '202609', '202610']);
check('구 추이: 선별 값', [rs.lines.all, rs.lines.com], [[0, 900, 0, 950], [800, 0, 0, 0]]);
check('최근 시세: 최근 3개월 안 마지막 값', K.latest(rs.lines.all, rs.months), { v: 950, at: '202610', stale: false });
const tr = K.trades([[20261029, '신사동', '5**', '업무', '제3종일반주거', 4293.55, 1947.4, null, 2000000, 1 | 2, 2004],
                     [20261028, '역삼동', '837-36', '업무', '일반상업', 98.08, null, 14, 133883, 4, 2004]]);
check('거래 줄: 가려진 지번·직거래·지분', [tr[0].masked, tr[0].direct, tr[0].share, tr[0].hi], [true, true, true, false]);
check('거래 줄: 신고가', [tr[1].masked, tr[1].hi], [false, true]);
check('통건물 ㎡당 = 금액 ÷ 대지', Math.round(K.tradePpm(tr[0], 'g')), 1027);
check('구분상가 ㎡당 = 금액 ÷ 전용', Math.round(K.tradePpm(tr[1], 'c')), 1365);
const units = [{ d: '역삼동', j: '828-10', t: [1, 2] }, { d: '역삼동', j: '828-1', t: [1] }, { d: '역삼동', j: '8', t: [] }, { d: '논현동', j: '828', t: [] }];
check('지번 찾기: 앞자리 같은 지번', K.findJibun(units, '828').map(u => u.d + u.j), ['역삼동828-10', '역삼동828-1', '논현동828']);
check('지번 찾기: 부번까지', K.findJibun(units, '828-10').map(u => u.j), ['828-10']);
check('동별 건물: 거래 많은 순', K.inDong(units, '역삼동').map(u => u.j), ['828-10', '828-1', '8']);

// 점수 상태
const sb0 = { status: 'short', from: '202407', bf: 'run', bf_from: '201101', eta: '2026-11-26' };
const filling = { bt: { 1: sb0, 2: sb0, 3: sb0 } };
const today = new Date(2026, 10, 22);
check('과거 자료 채우는 중: 머리 문장(날짜 약속 없음)', K.scoreHead(filling, today), '점수 준비 중 — 과거 자료를 채우는 중이에요. 자료가 다 모이면 자동으로 점수가 나와요.');
check('해가 다르면 연도까지', K.etaText('2027-01-05', today), '2027년 1월 5일');
check('채우기 끝났는데 짧으면', K.scoreHead({ bt: { 1: { status: 'short', bf: 'done' } } }), '점수 준비 중 — 과거 자료 기간이 아직 짧아요');
check('자료 없으면', K.scoreHead({ bt: { 1: { status: 'nodata' } } }), '점수 준비 중 — 상가·건물 실거래 자료를 받는 중이에요');
check('통과 기간 있으면 준비 문장 없음', K.scoreHead({ bt: { 1: { status: 'fail', oos_all: [] }, 2: { status: 'pass' } } }), '');
check('통과 기간 목록', K.passed({ bt: { 1: { status: 'fail' }, 2: { status: 'pass' }, 3: { status: 'pass' } } }), ['2', '3']);
const bl = K.btLines(filling.bt);
check('세 기간 문장이 같으면 한 줄로', bl.length, 1);
check('짧은 기간 문장: 언제부터 쌓였는지·언제까지 채우는지', /2024년 7월부터.*2011년 1월 자료까지/.test(bl[0]), true);
check('미통과 문장: 몇 번 중 몇 번', K.btText({ status: 'fail', oos_all: [{ top20: 1 }, { top20: -1 }, { top20: 2 }], oos_hit: 1 }, '2'), '2년 보유: 이 예측 방법을 과거에 그대로 써 봤더니 3번 중 1번만 맞아 점수를 보여 드리지 않아요.');
check('점수 순위 문구', [K.scoreRank(92), K.scoreRank(2), K.scoreRank(50)], ['상위 8%', '하위 3%', '중간쯤']);

// 임대동향·상권
const rr = K.roneRows([['서울>강남>논현역', 'dong', { '중대형상가|vac': [8.5, '20262', '%', '2026년 2분기'], '중대형상가|rent': [52.1, '20262', '천원/㎡', '2026년 2분기'] }]]);
check('임대동향: 지역 경로 표기', rr[0].area, '서울 › 강남 › 논현역');
check('임대동향: 지표 이름·값·단위·시점', rr[0].items.map(i => [i.label, i.v, i.unit, i.at]), [['중대형상가 공실률', 8.5, '%', '2026년 2분기'], ['중대형상가 임대료', 52.1, '천원/㎡', '2026년 2분기']]);
check('상권 요약', K.skSummary([['A', '발달상권', '20262', 1e11, 0.03], ['B', '골목상권', '20262', 5e10, -0.01], ['C', '골목상권', '20262', 1e9, null]]), { n: 2, up: 1, down: 1, q: '20262' });
check('분기 표기', K.qLabel('20262'), '2026년 2분기');
check('억 원 표기', K.eokWon(143831158436), '1,438억 원');

// 수요·공급 행: 없는 자료는 확인 불가
const ix = { avail: { job: true, sub: true }, src: { job: 'KOSIS' } };
const dr = K.demandRows({ dem: { job: { v: 900.7, at: '202606', c1: -0.003, c3: -0.001, grp: 1 } } }, ix, { sub: [['선릉', 128398, 0.012]] });
check('수요: 일자리 있음', [dr[0].ok, dr[0].value], [true, '901천 명']);
check('수요: 종사자 없음 → 확인 불가', dr[1].ok, false);
check('수요: 지하철 합계', dr[3].value, '하루 약 128,398명');
check('공급: 신축 자료 없음 → 확인 불가', K.supplyRow({}, ix).ok, false);

// 통건물 추정 위치(12번째 칸)
const te = K.trades([[20261029, '논현동', '2**', '제2종근린생활', '제2종일반주거', 399.63, 225.7, null, 460000, 0, 1996, [127.029, 37.511, 1, '제2종근린생활시설', 400, 1996, 'm']],
  [20261020, '논현동', '3**', '업무', '일반상업', 900, 400, null, 300000, 0, 1999], [20261001, '논현동', '1**', '업무', '일반상업', 900, 400, null, 300000, 0, 1999, [0, 0, 1]]]);
check('추정 위치 해독', te[0].est, { lng: 127.029, lat: 37.511, band: 1, use: '제2종근린생활시설', tot: 400, year: 1996, src: 'm' });
check('좌표 출처 문구(업체 이름 없음)', [K.estSrc('m'), K.estSrc('p')], ['위치는 지도 서비스 좌표 기준 추정이에요', '위치는 행정안전부 주소정보 좌표 기준이에요']);
check('추정 위치 없음·좌표 이상하면 null', [te[1].est, te[2].est], [null, null]);
check('건축물대장 사실 한 줄', K.estFacts(te[0].est), '제2종근린생활시설 · 연면적 400㎡ · 1996년 준공');
check('추정 위치 안내 문구', K.EST_LABEL, '추정 위치 · 공개 자료(건축물대장)로 맞춰 본 결과예요');

// 화면 문구 규칙
const view = read('assets/comm-view.js'), core = read('assets/comm-core.js');
const noCm = t => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const strs = (noCm(view) + noCm(core)).match(/(['`])(?:(?!\1)[^\\]|\\.)*?[가-힣](?:(?!\1)[^\\]|\\.)*?\1/g) || [];
const vis = strs.join('\n');
for (const w of ['시험', '검증', '채점', '통과', '백테스트', '가중치']) check(`화면 문구 금지어 '${w}' 없음`, vis.includes(w), false);
for (const w of ['리치고', '호갱노노', '직방', '밸류맵', '디스코', '부동산플래닛', '아실']) check(`경쟁 서비스 이름 '${w}' 없음`, vis.includes(w), false);
check('서비스 이름은 집예보(회사명 아님)', !vis.includes('장대장부동산그룹') && vis.includes('집예보'), true);
check('없는 자료는 확인 불가로', (vis.match(/확인 불가/g) || []).length >= 5, true);
check('출처 표시', (vis.match(/출처: /g) || []).length >= 4, true);

check('결과 화면: 접는 칸(자세히 보기) 사용', (view.match(/det\('/g) || []).length >= 6, true);
check('결과 화면: 동별·최근 거래는 5개만 먼저(더보기)', (view.match(/moreBox\([^]*?, 5\)/g) || []).length >= 3 && view.includes('더보기'), true);
// 페이지 연결
const mine = read('mine/index.html'), sw = read('sw.js');
check('탭 3개(아파트·오피스텔·상가·건물)', (mine.match(/<button type="button" role="tab" data-t="(a|o|c)"/g) || []).length, 3);
check('상가·건물 칸', /<section id="commSec" hidden><\/section>/.test(mine), true);
const vc = (mine.match(/comm-core\.js\?v=(\d+)/) || [])[1], vv = (mine.match(/comm-view\.js\?v=(\d+)/) || [])[1];
check('스크립트 포함', !!(vc && vv), true);
check('sw.js 미리 저장 버전이 화면과 같음', sw.includes(`./assets/comm-core.js?v=${vc}`) && sw.includes(`./assets/comm-view.js?v=${vv}`), true);
check('광고 칸: 결과가 보일 때만(상가·건물 결과 포함)', /data-ad-slot="mine_end"[^>]*data-ad-after="[^"]*#cmRes:not\(\[hidden\]\)/.test(mine), true);
check('오피스텔 탭과 숨김 기록 같이 씀', read('assets/offi-view.js').includes('JDJ_TABWAS') && view.includes('JDJ_TABWAS'), true);

// 공개 자료(선택)
const dir = process.argv[2];
if (dir && fs.existsSync(path.join(dir, 'comm', 'index.json'))) {
  const j = JSON.parse(fs.readFileSync(path.join(dir, 'comm', 'index.json'), 'utf8'));
  check('자료: status·bt·src', ['status', 'bt', 'src', 'sgg'].every(k => k in j), true);
  const t = JSON.stringify(j);
  check('자료: 가중치·기준값 없음', /"w"|"stats"|"lo"|"sd"|MIN_/.test(t), false);
  const g = Object.keys(j.sgg)[0], d = fs.existsSync(path.join(dir, 'comm', g + '.json')) ? JSON.parse(fs.readFileSync(path.join(dir, 'comm', g + '.json'), 'utf8')) : null;
  if (d && d.tr && d.tr.g && d.tr.g.length) check('자료: 통건물 지번은 가려진 그대로', d.tr.g.every(r => /\*/.test(r[2]) || !r[2]), true);
  if (d && d.tr && d.tr.g) check('자료: 추정 위치 칸은 [경도, 위도(셋째 자리), 등급, 용도, 연면적, 준공]만', d.tr.g.filter(r => r.length > 11).every(r => r.length === 12 && r[11].length === 7 && ['p', 'm'].includes(r[11][6])
    && [r[11][0], r[11][1]].every(v => Math.abs(v * 1000 - Math.round(v * 1000)) < 1e-6)), true);
}

const bad = rows.filter(r => !r.ok);
rows.forEach(r => console.log((r.ok ? 'OK   ' : 'FAIL ') + r.name + (r.ok ? '' : `\n      got  ${JSON.stringify(r.got)}\n      want ${JSON.stringify(r.want)}`)));
console.log(`\n${rows.length - bad.length}/${rows.length} 통과`);
process.exit(bad.length ? 1 : 0);
