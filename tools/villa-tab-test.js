/* 내 집 시세 '빌라' 탭 계산 규칙 자동 검증 — 실행: node tools/villa-tab-test.js [자료 폴더(선택, 예: /tmp/dchk/data)]
   assets/villa-core.js(검색·지번 정리·도로명 판별·전체/일부 거래·신고가·대표 전용·시세 추이·최고가·동 요약·동 비교선·전월세 행·전세 선·점수 머리 문장),
   화면 문구(주어·경쟁사 이름 없음), (자료 폴더를 주면) villa/index.json·villa/h 모양과 가중치·임계값 이름이 없는지. 금액 단위: 만원. */
const fs = require('fs'), path = require('path');
global.JDJ_MINE = require('../assets/mine-core.js');
global.JDJ_RENT = require('../assets/rent-core.js');
const V = require('../assets/villa-core.js');
const rows = [];
function check(name, got, want) { rows.push({ ok: JSON.stringify(got) === JSON.stringify(want), name, got, want }); }

/* 검색 */
const B = [
  { n: '신원빌라', d: '망원동', j: '459-15', t: '다세대', tr: [['20260101', 30000, 30, 18, '2']] },
  { n: '신원빌라', d: '합정동', j: '12', t: '다세대', tr: [] },
  { n: '(459-1)', d: '망원동', j: '459-1', t: '다세대', tr: [] },
  { n: '대명이튼캐슬', d: '망원동', j: '519', t: '다세대', tr: [] },
  { n: '산호빌라', d: '성산동', j: '산12', t: '연립', tr: [] }
];
check('지번 정리', [V.jibunOf(' 459 - 15 번지'), V.jibunOf('0459-015'), V.jibunOf('산 12'), V.jibunOf('신원빌라')], ['459-15', '459-15', '산12', '']);
check('검색어 나누기: 동 + 지번', V.parseQ('망원동 459-15'), { dong: '망원동', jibun: '459-15', text: '' });
check('검색어 나누기: 지번만', V.parseQ('459번지'), { dong: '', jibun: '459', text: '' });
check('검색어 나누기: 이름', V.parseQ('신원 빌라'), { dong: '', jibun: '', text: '신원 빌라' });
check('지번 정확히 맞는 건물이 먼저(459-1 ≠ 459-15)', V.search(B, '459-1').map(b => b.j), ['459-1']);
check('본번만 넣으면 부번 있는 건물도(거래 많은 건물 먼저)', V.search(B, '459').map(b => b.j), ['459-15', '459-1']);
check('동 + 지번', V.search(B, '합정동 12').map(b => b.d), ['합정동']);
check('이름(같은 이름 여러 동)', V.search(B, '신원빌라').map(b => b.d).sort(), ['망원동', '합정동']);
check('이름 띄어쓰기 무시', V.search(B, '대명 이튼캐슬').map(b => b.j), ['519']);
check('산 지번', V.search(B, '산12').map(b => b.n), ['산호빌라']);
check('이름이 지번 꼴이면 동·지번 표시', V.nameOf(B[2]), '망원동 459-1 빌라');
check('도로명 주소 판별', [V.isRoad('월드컵로12길 34'), V.isRoad('성미산로 17길 50-3'), V.isRoad('양화로 45'), V.isRoad('망원동 459-15'), V.isRoad('신원빌라')], [true, true, true, false, false]);
check('동 이름 숫자 차이', [V.dongEq('신월5동', '신월동'), V.dongEq('망원동', '합정동')], [true, false]);

/* 거래·시세 */
const b = { n: 'A', d: '망원동', j: '1', a: 30, tr: [['20260905', 33000, 30, 15.5, '3'], ['20250105', 30000, 30, 15.5, '2']] };
const part = V.tradesOf(b, null);
check('일부 거래(tr): 대지권 붙음·직거래 모름', [part.full, part.list[0].land, part.list[0].direct, part.list[0].floor], [false, 15.5, null, 3]);
check('일부 거래에는 신고가 표시 안 함', V.markHighs(part).list.some(t => t.hi), false);
const h = { hm: '202401', to: '202610', ta: { '망원동|1|A': [[20260905, 30, 3, 33000, 0], [20260601, 30, 2, 40000, 1], [20250105, 30, 2, 30000, 0], [20240310, 30, 4, 31000, 0]] } };
const full = V.markHighs(V.tradesOf(b, h));
check('전체 거래(ta): 신고가 = 같은 전용 이전 최고가보다 비쌈(직거래 제외)', full.list.map(t => !!t.hi), [true, false, false, false]);
check('최고가는 직거래 제외', V.highs(full, '202610').hi.amt, 33000);
check('최근 1년 최고가', V.highs(full, '202610').hi1.amt, 33000);
check('최근 1년 매매 수(직거래 포함)', V.n12(full, '202610'), 2);
check('대표 전용 = 최근 3년 거래 전용 중간값', V.repArea({ a: 99 }, { list: [{ ymd: '20260101', area: 30 }, { ymd: '20250101', area: 50 }, { ymd: '20240101', area: 40 }] }, '202610'), 40);
const months = ['202608', '202609', '202610'];
const ps = V.priceSeries(full, months, 30);
check('시세 = 3개월 ㎡당 중간값 × 대표 전용(직거래 제외)', ps.s, [0, 33000, 33000]);
check('달별 신고 건수', [...ps.cnt.values()], [0, 1, 0]);
check('최근 시세: 3개월 안', V.latest(ps.s, months), { v: 33000, at: '202610' });

/* 동 */
const doc = { dm: { 망원동: { m: 5000, c: 12 } }, djl: { 망원동: { r: 0.72, at: '202609', nj: 20, ns: 15 } } };
check('동 요약(지금: 대지지분 평당가·동 전세가율만)', V.dongSum(doc, null, '망원동'), { n: null, ppm: null, price: null, nb: null, landPy: { m: 5000, c: 12 }, jr: { r: 0.72, at: '202609', nj: 20, ns: 15 } });
check('동 요약(다음 갱신: ds)', V.dongSum(doc, { ds: { 망원동: [30, 1500.5, 45000, 21] } }, '망원동').n, 30);
const dl = V.dongLine({ hm: '202608', to: '202610', dss: { 망원동: [1, 1000] } }, '망원동', 30);
check('동 비교선: ㎡당 → 평당(차트가 전용으로 환산)', [dl.s, dl.name, dl.me], [[0, 3305.8, 0], '망원동 빌라', '이 건물']);

/* 전월세 */
const rd = { m0: '202608', to: '202610', units: [['망원동', 'A', '40㎡ 이하', '1', 30, 2, 1, [1, 20000, 21000], [], [], [[20261001, 30, 2, 21000, 0, 0], [20260905, 30, 3, 1000, 60, 1]]], ['망원동', 'B', '40㎡ 이하', '1', 30, 1, 0, [], [], [], []]] };
const rr = V.rentRows(rd, b);
check('전월세 행 = 같은 동·지번·이름', rr.length, 1);
const cc = V.contracts(rr);
check('전세·월세 나누기', [cc.j.length, cc.w.length, cc.w[0].rent], [1, 1, 60]);
check('전세 선: 3개월 보증금 중간값을 대표 전용으로 환산', V.jeonseLine(rr, rd, null, months, 30).a, [0, 20000, 21000]);

/* 점수·채우는 중 */
check('통과 기간 없으면 점수 준비 중(날짜 약속 없음)', V.scoreHead({ fill: { trade: false, rent: false } }, {}).ok, false);
check('채우는 중 문장에 날짜 없음', /\d+월|\d+일|까지/.test(V.scoreHead({ fill: { trade: true } }, {}).text), false);
check('통과 기간만 점수', V.scoreHead({ bt: { 1: { status: 'pass' }, 3: { status: 'fail' } } }, { sc: { 1: 70, 3: 40 } }).hs, ['1']);
check('채우는 중 표시는 fill 이 끝나면 사라짐', [V.fillNote({ fill: { trade: true, rent: false } }), V.fillNote({ fill: { trade: false, rent: false } })], [true, false]);

/* 화면 문구: 경쟁사 이름·날짜 약속 없음 */
const viewSrc = fs.readFileSync(path.join(__dirname, '..', 'assets', 'villa-view.js'), 'utf8') + fs.readFileSync(path.join(__dirname, '..', 'assets', 'villa-core.js'), 'utf8');
check('경쟁 앱 이름 없음', /호갱노노|직방|다방|네이버\s*부동산|리치고|아실|밸류맵|부동산플래닛/.test(viewSrc), false);
check('채우는 중 문구에 완료 날짜 약속 없음', /채우는 중[^`'"]*\d+월\s*\d+일/.test(viewSrc), false);
check('공개 파일에 가중치·임계값 이름 없음', /\b(weights?|coef|threshold|importance)\b/i.test(viewSrc.replace(/font-weight/g, '')), false);

/* 평형이 여러 개: 다른 평형도 세입자 보호 안내 */
const RC = global.JDJ_RENT;
global.JDJ_PRICE = require('../assets/price-sheet.js');
const top = RC.bandTop([{ bd: '59㎡대', r: 0.7 }, { bd: '83㎡대', r: 0.92, at: '202610' }, { bd: '74㎡대', r: 0.85 }]);
check('맨 위: 90% 이상 평형 이름과 문구', top.includes('83㎡대 평형은 전세가율 92% · 보증금 반환 위험을 꼭 확인하세요'), true);
check('맨 위: 80~90% 평형 안내 한 칸', top.includes('74㎡대 평형은 전세가율 85% · 주의해서 살펴보세요'), true);
check('맨 위: 80% 아래 평형은 안내 없음', top.includes('59㎡대'), false);
check('높은 평형부터', top.indexOf('83㎡대') < top.indexOf('74㎡대'), true);
check('80~90% 안내에 선순위채권 여유(90 − 85 = 5%)', top.includes('집값의 5%보다'), true);
check('줄 표시', [RC.bandTag(0.92).includes('보증금 반환 위험 확인'), RC.bandTag(0.85).includes('주의해서 살펴보세요'), RC.bandTag(0.7)], [true, true, '']);
const viewAll = ['assets/villa-view.js', 'villa/index.html', 'jeonse/index.html', 'mine/index.html'].map(f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8'));
check('빌라 탭·재개발·빌라·전월세·아파트 화면 모두 다른 평형 안내', viewAll.map(t => t.includes('bandTop(') && t.includes('bandTag(')), [true, true, true, true]);

/* 자료 폴더 */
const dir = process.argv[2];
if (dir) {
  const ix = JSON.parse(fs.readFileSync(path.join(dir, 'villa', 'index.json'), 'utf8'));
  check('villa/index.json: to·fill·sido', [!!ix.to, typeof (ix.fill || {}).trade, Array.isArray(ix.sido)], [true, 'boolean', true]);
  const hd = path.join(dir, 'villa', 'h');
  if (fs.existsSync(hd)) {
    const f = fs.readdirSync(hd).filter(x => /^\d{5}\.json$/.test(x))[0];
    const j = JSON.parse(fs.readFileSync(path.join(hd, f), 'utf8'));
    const t = Object.values(j.ta || {})[0] || [];
    check('villa/h: hm·to·ta 줄 모양[계약일, 전용, 층, 금액, 직거래]', [!!j.hm, !!j.to, t.length ? t[0].length : 5], [true, true, 5]);
    check('villa/h: 기준 건수 이름 없음', /DSS_MIN|TA_MAX|threshold/.test(JSON.stringify(j).slice(0, 200000)), false);
  }
}

const bad = rows.filter(r => !r.ok);
rows.forEach(r => console.log((r.ok ? 'PASS ' : 'FAIL ') + r.name + (r.ok ? '' : `\n   got  ${JSON.stringify(r.got)}\n   want ${JSON.stringify(r.want)}`)));
console.log(`빌라 탭 테스트 ${rows.length - bad.length}/${rows.length} 통과`);
process.exit(bad.length ? 1 : 0);
