/* '내 집 시세' 집계 로직 자동 검증 — 실행: node tools/mine-test.js [자료 폴더(선택, 예: /tmp/dchk/data)]
   assets/mine-core.js 의 단순 집계(중앙값·최저·최고·합계·변동률)와 환산, 내 집 저장 형식을 손으로 계산한 값과 맞춰 본다.
   금액 단위: 만원. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const M = require('../assets/mine-core.js');
const rows = [];
const near = (a, b, tol) => Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol);
function check(name, got, want, basis, tol) {
  const ok = (typeof want === 'number' && typeof got === 'number') ? near(got, want, tol) : JSON.stringify(got) === JSON.stringify(want);
  rows.push({ ok, name, got, want, basis });
}
const months = []; for (let y = 2023, m = 11; months.length < 36; m++) { if (m > 12) { m = 1; y++; } months.push(String(y) + String(m).padStart(2, '0')); }
const cstr = a => a.map(n => String.fromCharCode(48 + n)).join('');

// 가짜 단지: 36개월 평당가 4000 → 매달 +10, 마지막 달만 거래 없음(0)
const s1 = months.map((_, i) => 4000 + i * 10); s1[35] = 0;
const c1 = months.map((_, i) => i % 3); c1[35] = 0;          // 0,1,2 반복
const u1 = ['11710', '가락동', '테스트아파트', '84㎡대', 84.9, 36, s1, cstr(c1), '100', { fv: 70, gs: 50, fvg: 80, by: 2000, hh: 1200 }];

check('월별 건수 해독', M.counts('0129'), [0, 1, 2, 9], "'0'=0 … '9'=9 (글자 코드 − 48)");
check('중앙값(홀수)', M.median([3, 1, 2]), 2, '1,2,3의 가운데');
check('중앙값(짝수)', M.median([4, 1, 3, 2]), 2.5, '(2+3)/2');
check('평당가 → 금액 환산', M.toPrice(10000, 84.9), 256800, '10,000 × 84.9 ÷ 3.3058 = 256,821 → 100만 원 단위 256,800');
check('만원 표시', M.won(256800), '25억 6,800만원', '');
check('만원 표시(억 딱 떨어짐)', M.won(90000), '9억원', '');
check('만원 표시(음수)', M.won(-1500), '-1,500만원', '');

let b = M.bandSummary(u1, months);
check('최근 시세: 마지막 달 거래 없으면 앞 달 값', b.ppy, 4340, 's[34] = 4000 + 34×10');
check('  └ 기준 월', b.at, months[34], '');
check('  └ 이후 거래 없음 표시', b.stale, true, '');
check('  └ 환산 시세', b.price, M.r100(4340 * 84.9 / 3.3058), '4,340 × 84.9 ÷ 3.3058 → 100만 원 단위');
check('최근 3개월 거래 합', b.recent3, c1[33] + c1[34] + c1[35], 'c[33]+c[34]+c[35] = 0+1+0');
check('1년 거래 합', b.cnt12, c1.slice(24).reduce((a, x) => a + x, 0), '마지막 12개월 합');
check('1년 범위 최저 평당가', b.range.loPpy, 4240, '최근 12개월 중 값 있는 달(24~34) 최저 = 4000+24×10');
check('1년 범위 최고 평당가', b.range.hiPpy, 4340, '최고 = 4000+34×10');
check('1년 범위 값 있는 달 수', b.range.months, 11, '12개월 중 마지막 달 0 제외');
check('1년 변동률', b.ch1.pct, (4340 - 4220) / 4220, 's[34] vs s[22] = (4340−4220)/4220');
check('  └ 비교 월', [b.ch1.fromAt, b.ch1.toAt], [months[22], months[34]], '');
check('3년 변동률(자료 처음 대비)', b.ch3, null, '마지막 값 위치 34 − 35 < 0 → 비교 불가(null)');
const b3 = M.changeBack(s1, months, 34);
check('34개월 전 대비 변동률', b3.pct, (4340 - 4000) / 4000, 's[34] vs s[0]');

// 비교 달 값이 0이면 그 뒤 2개월 안 첫 값, 없으면 null (추정으로 메우지 않음)
const s2 = s1.slice(); s2[22] = 0;
check('비교 달 거래 없음 → 다음 달 값', M.changeBack(s2, months, 12).fromAt, months[23], 's[22]=0 → s[23]');
const s3 = s1.slice(); s3[22] = s3[23] = s3[24] = 0;
check('비교 달 앞뒤 3개월 모두 없음 → null', M.changeBack(s3, months, 12), null, '');
check('최근 3개월 거래 전혀 없음 → 시세 없음', M.bandSummary(['1', 'd', 'a', 'b', 50, 12, months.map((_, i) => i < 30 ? 3000 : 0), cstr(months.map(() => 0)), 'j', null], months).price, 0, 'lastIdx 는 최근 3개월 안만 본다');

// 같은 동 비교: 같은 평형대 3개 이상이면 같은 평형끼리
const mk = (apt, band, p, dong) => ['11710', dong || '가락동', apt, band, 84, 20, months.map(() => p), cstr(months.map(() => 1)), apt, null];
const units = [u1, mk('A', '84㎡대', 4000), mk('B', '84㎡대', 5000), mk('C', '84㎡대', 3000), mk('D', '59㎡대', 9000), mk('E', '84㎡대', 9999, '문정동')];
let dp = M.dongPosition(units, u1);
check('같은 동·같은 평형 비교 대상 수', dp.n, 4, '테스트·A·B·C (59㎡대 D, 문정동 E 제외)');
check('  └ 동 중앙값', dp.med, 4170, '3000·4000·4340·5000 → (4000+4340)/2');
check('  └ 중앙값 대비', dp.diff, (4340 - 4170) / 4170, '');
check('  └ 순위(높은 순)', dp.rank, 2, '5000 > 4340 > 4000 > 3000');
check('  └ 같은 평형 비교 여부', dp.sameBand, true, '');
dp = M.dongPosition([u1, mk('A', '84㎡대', 4000), mk('D', '59㎡대', 9000)], u1);
check('같은 평형 3개 미만 → 동 전체 평형', [dp.sameBand, dp.n, dp.med], [false, 3, 4340], '4000·4340·9000 중앙값 4340');

// 구 비교: 같은 달 값끼리
const sgg = { s: months.map(() => 5000), c: months.map((_, i) => i < 12 ? 10 : i < 24 ? 20 : 30) };
const gp = M.sggPosition(sgg, u1, months);
check('구 대비(같은 달)', gp.diff, (4340 - 5000) / 5000, 's[34] vs sgg.s[34]');
check('구 거래량 최근 12개월 vs 그 전', M.volumeCounts(sgg.c), { last12: 360, prev12: 240, pct: 0.5 }, '30×12 vs 20×12');
const v = M.volume(u1);
check('단지 거래량 최근 12개월', v.last12, c1.slice(24).reduce((a, x) => a + x, 0), '');
const t = M.trend(u1, sgg, months, 12);
check('1년 추이 구간 길이', [t.months.length, t.ppy.length, t.sgg.length, t.cnt.length], [12, 12, 12, 12], '');
check('1년 추이 첫 달', t.months[0], months[24], '');

// 단지 묶기·검색
const g = M.groupDanji([u1, ['11710', '가락동', '테스트아파트', '59㎡대', 59.9, 20, s1, cstr(c1), '100', null], mk('헬리오시티', '84㎡대', 1)]);
check('같은 단지 평형 묶기', g.get('11710|가락동|100|테스트아파트').bands.map(x => x[3]), ['59㎡대', '84㎡대'], '전용면적 순');
check('단지 이름 검색(공백 무시)', M.searchDanji(g, '헬리 오').map(d => d.apt), ['헬리오시티'], '');
check('단지 이름 검색(앞부분 일치 우선)', M.searchDanji(g, '아파트').map(d => d.apt), ['테스트아파트'], '');

// 시세 확인용 자료(price/): 청담 e편한세상 사례 — 검색 별칭·묶기·저거래 표시
const CD = ['청담대림이-편한세상', '청담2차이-편한세상(201동,202동,203동)', '청담2차이-편한세상(204동)', '청담2차이-편한세상(205동)', '청담3차이-편한세상(301동)', '청담4차이-편한세상', '청담자이'];
const hitsOf = q => CD.filter(n => M.matchName(n, q) >= 0);
check('별칭: e편한세상 = 이-편한세상 = 이편한세상', M.normName('청담 e-편한세상'), M.normName('청담이편한세상'), '하이픈·공백 제거, e→이');
check('별칭: 원래 이름은 그대로(정규화는 검색에만)', CD[0], '청담대림이-편한세상', '');
check("검색 '청담 e편한세상' → 1~4차 모두(청담자이 제외)", hitsOf('청담 e편한세상'), CD.slice(0, 6), "'대림' 표기 무시, 낱말별 포함");
check("검색 '청담이편한세상 4차' → 4차만", hitsOf('청담이편한세상 4차'), ['청담4차이-편한세상'], "'4차'는 이름의 차수와 맞춤");
check("검색 '청담4차' → 4차만", hitsOf('청담4차'), ['청담4차이-편한세상'], '');
check("검색 '청담 e편한세상 2차' → 2차 세 곳", hitsOf('청담 e편한세상 2차'), CD.slice(1, 4), '괄호 동 표기만 다른 2차 이름들');
check("검색 '청담 e편한세상 1차' → 차수 없는 1차 이름", hitsOf('청담 e편한세상 1차'), ['청담대림이-편한세상'], "이름에 '차'가 없으면 1차로 봄");
check("검색 '청담대림' → 대림 이름만", hitsOf('청담대림'), ['청담대림이-편한세상'], "검색어의 '대림'은 그대로 비교");
check("검색 '청담 e편한세상 5차' → 없음", hitsOf('청담 e편한세상 5차'), [], '');
const PL = [['11680', '청담동', '청담4차이-편한세상', '84㎡대', 84.6, 8, '28-20', 0], ['11680', '청담동', '청담4차이-편한세상', '135㎡대', 136.4, 3, '28-20', 0],
  ['11680', '청담동', '청담대림이-편한세상', '84㎡대', 81.8, 23, '30-33', 1], ['11680', '청담동', '청담2차이-편한세상(204동)', '99㎡대', 98, 3, '15', 0]].map(M.listRow);
const pg = M.groupDanji(PL);
check('시세 목록 행 → 단지 묶기(지번 기준)', [...pg.values()].map(d => d.apt + ':' + d.bands.map(b => b[3]).join(',')), ['청담4차이-편한세상:84㎡대,135㎡대', '청담대림이-편한세상:84㎡대', '청담2차이-편한세상(204동):99㎡대'], '');
check("시세 목록 검색 '청담 e편한세상' 거래 많은 순", M.searchDanji(pg, '청담 e편한세상').map(d => d.apt), ['청담대림이-편한세상', '청담4차이-편한세상', '청담2차이-편한세상(204동)'], '1차 23건 > 4차 11건 > 2차 3건');
check('점수 자료 표시: 1 → 있음, 0 → 없음, fx 객체 → 있음', [M.hasScore(PL[2]), M.hasScore(PL[0]), M.hasScore(u1)], [true, false, true], '');
const smap = new Map([[M.unitKey(PL[2]), { fv: 61 }]]);
check('점수 묶음: 시세 행(1) → 점수용 Map 에서', M.scoreOf(PL[2], smap), { fv: 61 }, 'unitKey = 구|동|지번|단지|평형');
check('점수 묶음: 점수 자료 없는 행 → 없음', M.scoreOf(PL[0], smap), null, '');
const cz = months.map(() => 0); cz[20] = 1; cz[33] = 2;
const lowU = ['11680', '청담동', '청담4차이-편한세상', '135㎡대', 136.4, 3, months.map((_, i) => i >= 20 && i <= 22 ? 7658 : i >= 33 ? 8361 : 0), cstr(cz), '28-20', 0, [7658, 8361],
  [[Number(months[33] + '15'), 136.4, 9, 345000, 0], [Number(months[33] + '02'), 136.4, 4, 343000, 1], [Number(months[20] + '07'), 136.4, 12, 316000, 0]]];
check('저거래 판정: 3건 → 범위 표시(3건 미만만 목록 요약)', [M.isFew(lowU), M.isFew(Object.assign(lowU.slice(), { 5: 2 }))], [false, true], 'FEW = 3');
check('거래 있는 달(최신순, 그 달 중앙 평당가)', M.monthDeals(lowU, months).map(x => [x.at, x.n, x.ppy]), [[months[33], 2, 8361], [months[20], 1, 7658]], 'u[10] 은 오래된 달부터');
check('마지막 거래 환산', M.lastDeal(lowU, months).price, M.toPrice(8361, 136.4), '');
const tr = M.trades(lowU);
check('개별 거래 해독', [tr[0].date, tr[0].floor, tr[0].amt, tr[0].type, tr[1].type], [`${months[33].slice(0, 4)}.${months[33].slice(4)}.15`, 9, 345000, '중개', '직거래'], '유형 0 중개·1 직거래');
check('개별 거래 평당가', tr[0].ppy, Math.round(345000 / 136.4 * 3.3058), '');
check('개별 거래 없는 자료 → 빈 목록', M.trades(u1), [], '점수용 sNN 대신 쓸 때');
const PS = require('../assets/price-sheet.js');
check('시트: 괄호 동 표기 뗀 이름', PS.baseName('청담2차이-편한세상(201동,202동,203동)'), '청담2차이-편한세상', '엔진 base_name 과 같은 규칙');
check('시트: 단지 찾기(이름·평형·지번)', PS.findUnit([lowU, PL[0]], { sgg: '11680', dong: '청담동', apt: '청담4차이-편한세상', band: '135㎡대' }) === lowU, true, '');
check('시트: 괄호 동 표기 다른 이름으로도 찾기', PS.findUnit([PL[3]], { sgg: '11680', dong: '청담동', apt: '청담2차이-편한세상', band: '99㎡대' }) === PL[3], true, '');
const th = PS.tradesHtml(lowU, months, { show: 2 });
check('시트: 거래 표 최신 2건 + 더보기', [(th.match(/<tr>/g) || []).length, /더보기 \(1건 더\)/.test(th), /직거래/.test(th)], [3, true, true], '머리행 1 + 보이는 2행, 1건 숨김');
check('공개 화면 문구에 내부 기준값 없음', /12건/.test(fs.readFileSync(path.join(__dirname, '../mine/index.html'), 'utf8')), false, '점수용 최소 거래 수는 노출하지 않음');

// 프리미엄 리포트 단지 키 = assets/pay.js JDJ_PAY.keyOf
const ctx = { window: {}, localStorage: { getItem: () => null, setItem() {} }, document: { readyState: 'loading', addEventListener() {} }, console };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../assets/pay.js'), 'utf8'), ctx);
const P = ctx.window.JDJ_PAY;
const kp = { sd: 's00', code: '11710', dong: '가락동', apt: '헬리오시티~1!', band: '84㎡대' };
check('프리미엄 단지 키 = JDJ_PAY.keyOf', M.premiumKey(kp), P.keyOf(kp), 'pay.js 와 같은 형식');
check('프리미엄 단지 키 되읽기', P.keyParse(M.premiumKey(kp)), kp, 'pay.js keyParse');

// 내 집 저장 형식
let list = [];
for (let i = 0; i < 6; i++) { const r = M.addHome(list, { sd: 's00', code: '11710', dong: '가락동', jibun: String(i), apt: 'A' + i, band: '84㎡대', bp: 90000 + i, bd: '2020-05' }); if (r.ok) list = r.list; else check('6번째 저장 → 가득 참', r.full, true, '최대 5개'); }
check('최대 5개 저장', list.length, 5, '');
check('최근 저장이 맨 앞', list[0].apt, 'A4', '');
const r2 = M.addHome(list, { sd: 's00', code: '11710', dong: '가락동', jibun: '1', apt: 'A1', band: '84㎡대', bp: 100000 });
check('같은 집 다시 저장 → 고쳐서 맨 앞(가득 차도 가능)', [r2.ok, r2.list.length, r2.list[0].apt, r2.list[0].bp, r2.list[0].bd], [true, 5, 'A1', 100000, ''], '');
check('저장 → 읽기 그대로', M.parseStore(M.dumpStore(list)), list, '단순 JSON {v:1, list:[…]}');
check('깨진 저장값 → 빈 목록', M.parseStore('{oops'), [], '');
check('잘못된 항목 거름', M.parseStore(JSON.stringify({ v: 1, list: [{ sd: 'x', code: '1' }, { sd: 's01', code: '26110', dong: '중앙동', jibun: '1', apt: 'B', band: '59㎡대', bp: -5, bd: '2020-13' }] })).map(h => [h.apt, h.bp, h.bd]), [['B', null, '']], '시도·구 코드 형식, 음수 매수가, 13월 거름');
check('삭제', M.removeHome(list, M.homeId(list[0])).length, 4, '');
check('저장 키(서버 전송 없음, 브라우저 저장소 이름)', M.STORE_KEY, 'jdj_myhome', '');
check('매수가 대비 변동', M.vsBuy(110000, 100000), { diff: 10000, pct: 0.1 }, '11억 − 10억 = +1억, +10%');
check('매수가 없으면 변동 없음', M.vsBuy(110000, null), null, '');
check('보유 기간(개월)', M.heldMonths('2020-05', '202610'), 77, '2026.10 − 2020.05 = 6년 5개월');
check('미래 매수일 → 보유 기간 없음', M.heldMonths('2027-01', '202610'), null, '');
check('단지 키에서 단지 찾기', M.findUnit(units, { code: '11710', dong: '가락동', jibun: '100', apt: '테스트아파트', band: '84㎡대' }) === u1, true, '');

// 근거 요약: 공개 점수 그대로, 계산식·가중치 문구 없음
const rs = M.reasons({ fv: 70, gs: 50, fvg: 80, by: 2000, hh: 1200, why: { '2': ['liq+', 'dd-'] } }, { apt: 'X', dong: '가락동', sgg: '송파구', sido: '서울특별시', label: { liq: '거래 활발도', dd: '하락기 방어력' }, year: 2026 });
check('근거: 미래가치 점수 문구', rs[0], '미래가치 70점 — 서울특별시 전체 단지 중 상위 30%, 송파구 안에서는 상위 20% (실제 이후 시세로 채점해 검증한 점수)', '리포트와 같은 문구');
check('근거: 점수를 움직인 요인', rs[1], '2년 예측에서 점수를 움직인 요인 — 올린 요인: 거래 활발도 / 내린 요인: 하락기 방어력', '');
check('근거: 준공·세대', rs[2], '2000년 준공(26년차) · 1,200세대 — 4년 뒤 재건축 연한(30년) 도래 · 대단지', '26년차 → 30−26=4년 뒤');
check('근거에 가중치 숫자 없음', rs.some(x => /가중|weight|0\.\d{2}/.test(x)), false, '');

// 실제 공개 자료로 확인 (선택)
const DIR = process.argv[2];
if (DIR && fs.existsSync(path.join(DIR, 'index.json'))) {
  const IX = JSON.parse(fs.readFileSync(path.join(DIR, 'index.json'), 'utf8'));
  const S = JSON.parse(fs.readFileSync(path.join(DIR, 's00.json'), 'utf8')).units;
  const hel = S.find(u => u[2] === '헬리오시티' && u[3] === '84㎡대');
  const bs = M.bandSummary(hel, IX.months), li = M.lastIdx(hel[6]);
  check('[실자료] 헬리오시티 84㎡대 최근 시세 = rec-core unitPrice', bs.price, require('../assets/rec-core.js').unitPrice(hel), '리포트·갈아타기와 같은 환산');
  check('[실자료] 최근 3개월 거래 = rec-core recentCnt', bs.recent3, require('../assets/rec-core.js').recentCnt(hel[7]), '');
  check('[실자료] 월별 건수 합 = 자료 기간 거래수', M.counts(hel[7]).reduce((a, x) => a + x, 0), hel[5], 'u[5] 와 일치');
  check('[실자료] 기준 월', bs.at, IX.months[li], '');
  const sp = M.sggPosition(IX.sgg[hel[0]], hel, IX.months);
  check('[실자료] 구 비교 같은 달 값', sp.sggPpy, IX.sgg[hel[0]].s[li], '');
  const grp = M.groupDanji(S);
  check('[실자료] 단지 묶기 후 평형 수 합 = 단지·평형 수', [...grp.values()].reduce((a, d) => a + d.bands.length, 0), S.length, '');
  const PDIR = path.join(DIR, 'price');
  if (fs.existsSync(path.join(PDIR, 's00.json'))) {
    const L = JSON.parse(fs.readFileSync(path.join(PDIR, 's00.json'), 'utf8')).units.map(M.listRow), pgr = M.groupDanji(L);
    const hit = M.searchDanji(pgr, '청담 e편한세상', 20).filter(d => d.dong === '청담동').map(d => d.apt).sort();
    check('[실자료] 시세 목록 검색 청담 e편한세상 → 1~4차', ['청담대림이', '청담2차', '청담3차', '청담4차'].every(k => hit.some(a => a.startsWith(k))), true, hit.join(', '));
    check('[실자료] 점수용 단지·평형은 시세 목록에 모두 있음', S.every(u => pgr.has(M.danjiKey(u))), true, '');
    check('[실자료] 시세 목록 점수 표시 수 = 점수용 단지·평형 수', L.filter(u => u[9] === 1).length, S.length, '');
    const G = JSON.parse(fs.readFileSync(path.join(PDIR, '11680.json'), 'utf8')).units;
    const c4 = G.find(u => u[2] === '청담4차이-편한세상' && u[3] === '84㎡대');
    check('[실자료] 청담4차 84㎡대 있음, 점수 자료 없음', !!c4 && c4[9], 0, '');
    check('[실자료] 월별 건수 합 = 거래 수', M.counts(c4[7]).reduce((a, x) => a + x, 0), c4[5], '');
    check('[실자료] 그 달 중앙 평당가 수 = 거래 있는 달 수', c4[10].length, M.counts(c4[7]).filter(x => x > 0).length, '');
    check('[실자료] 개별 거래(직거래 제외) 수 = 거래 수', c4[11].filter(t => t[4] !== 1).length, c4[5], '');
    const hu = G.find(u => u[9] === 1), su = S.find(x => M.unitKey(x) === M.unitKey(hu));
    check('[실자료] 점수 자료 있는 행의 시세 = 점수용 자료와 같음', [hu[5], hu[6], hu[7]], su && [su[5], su[6], su[7]], '같은 계산');
  }
}

let bad = 0;
for (const r of rows) { if (!r.ok) bad++; console.log((r.ok ? 'OK  ' : 'FAIL') + ' ' + r.name + (r.ok ? '' : `\n     got ${JSON.stringify(r.got)}\n    want ${JSON.stringify(r.want)}  (${r.basis})`)); }
console.log(`\n${rows.length - bad}/${rows.length} 통과`);
process.exit(bad ? 1 : 0);
