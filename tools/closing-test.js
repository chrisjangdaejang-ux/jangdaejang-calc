/* 세금·대출 1단계 묶음 테스트 — 실행: node tools/closing-test.js
   ① 집 살 때·팔 때 드는 돈(assets/closing-core.js): 공식 표 손계산 예시
   ② 잔금일 체크리스트 날짜·달력 파일(.ics)
   ③ 주택 수 판정 도우미(tax/house-count.js): 세목별 판정 예시(오피스텔 함정 포함)
   ④ 신뢰 배지 숫자(tax/tax-verified.js)는 테스트 산출물에서만 · '세무사 검수 전' 문구 없음
   ⑤ 세법 바뀌는 날(tax/changes-data.js) 공식 출처만 · 화면 연결(sw.js·back.js·sitemap) */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..'), rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const C = require('../assets/closing-core.js');
const H = require('../tax/house-count.js');
const rows = [];
const check = (name, got, want) => rows.push({ ok: JSON.stringify(got) === JSON.stringify(want), name, got, want });
const E = 1e8, M = 1e4;

/* ===== ① 국민주택채권(주택도시기금법 시행령 [부표] 15) ===== */
check('채권: 공시 5억 서울(특별시) → 1천분의 26 = 1,300만', C.bond(5 * E, true), { permil: 26, amount: 13000000, none: false });
check('채권: 공시 5억 그 밖의 지역 → 1천분의 21 = 1,050만', C.bond(5 * E, false).amount, 10500000);
check('채권: 1억 6천만 정확히 → 다음 구간(이상) 1천분의 23', C.bond(1.6 * E, true).permil, 23);
check('채권: 1억 5,999만 → 1천분의 21', C.bond(159990000, true).permil, 21);
check('채권: 6억 정확히 → 1천분의 31 = 1,860만', C.bond(6 * E, true).amount, 18600000);
check('채권: 2천만 원 미만 → 매입 대상 아님', C.bond(19990000, true).none, true);
check('채권: 5천만 미만 구간은 지역 구분 없이 1천분의 13', [C.bond(3e7, true).permil, C.bond(3e7, false).permil], [13, 13]);
check('채권 할인 부담: 1,300만 × 3.5% = 45만 5천', C.bondCost(13000000, 3.5), 455000);
check('채권 할인율 모르면 계산 안 함(null)', C.bondCost(13000000, null), null);
/* ===== 인지세(인지세법 제3조·제6조 제5호) ===== */
check('인지세: 주택 1억 정확히 → 비과세', C.stampTax(1 * E), 0);
check('인지세: 주택 1억+1원 → 15만', C.stampTax(1 * E + 1), 150000);
check('인지세: 10억 정확히 → 15만, 10억 초과 → 35만', [C.stampTax(10 * E), C.stampTax(10 * E + 1)], [150000, 350000]);
check('인지세: 주택 아닌 5천만 → 4만', C.stampTax(5e7, false), 40000);
/* ===== 등기신청수수료·법무사 기본보수 ===== */
check('등기신청수수료: 서면 1.8만·e-form 1.5만·전자 1만', [C.REG_FEE.paper, C.REG_FEE.eform, C.REG_FEE.e], [18000, 15000, 10000]);
check('법무사 기본보수: 5천만 → 21만', C.scrivener(5e7).fee, 210000);
check('법무사 기본보수: 1억 → 21만 + 5천만×10/10000 = 26만', C.scrivener(1 * E).fee, 260000);
check('법무사 기본보수: 3억 → 26만 + 2억×9/10000 = 44만', C.scrivener(3 * E).fee, 440000);
check('법무사 기본보수: 9억 → 60만 + 4억×7/10000 = 88만, 부가세 8.8만', [C.scrivener(9 * E).fee, C.scrivener(9 * E).max], [880000, 968000]);
check('법무사 기본보수: 15억 → 95만 + 5억×5/10000 = 120만', C.scrivener(15 * E).fee, 1200000);
/* ===== 사는 쪽 합계(손계산) ===== */
let b = C.buyCosts({ price: 9 * E, std: 6.3 * E, metro: true, own: 'none', discount: 3, method: 'e' });
const v = k => b.items.find(x => x.k === k).v;
check('9억 무주택 서울: 취득세 3% + 교육세 0.3% = 2,970만', v('acq'), 29700000);
check('  └ 중개보수 0.5% + 부가세 = 495만(JDJ_LOAN.brokerSale)', v('broker'), 4950000);
check('  └ 인지세 15만의 절반 7.5만', v('stamp'), 75000);
check('  └ 채권 6.3억×31/1000 = 1,953만 × 3% = 58만 5,900', v('bond'), 585900);
check('  └ 등기 전자신청 1만 · 법무사 96만 8천', [v('reg'), v('scr')], [10000, 968000]);
check('  └ 합계 3,628만 8,900', b.total, 36288900);
check('  └ 직접 등기 범위 아래쪽(법무사 0·인지세 절반)', b.lo, 36288900 - 968000);
b = C.buyCosts({ price: 9 * E, metro: true, own: 'none', method: 'e' });
check('공시가격 모르면 채권은 빠진 항목으로 알림', b.missing, ['국민주택채권']);
b = C.buyCosts({ price: 9 * E, std: 6.3 * E, metro: true, own: 'none', method: 'e' });
check('할인율 모르면 채권 할인 비용만 빠짐(매입액은 보여 줌)', [b.missing, b.items.find(x => x.k === 'bond').buy], [['채권 할인 비용'], 19530000]);
check('파는 쪽: 9억 → 중개보수 495만 + 인지세 절반 7.5만', C.sellCosts({ price: 9 * E }).total, 5025000);
const tc = C.totalCash({ price: 9 * E, std: 6.3 * E, metro: true, own: 'none', discount: 3, method: 'e', move: 200 * M, loan: 6 * E, cash: 3.5 * E });
check('총비용 한 장: 9억 + 3,628.89만 + 이사 200만 − 대출 6억 = 3억 3,828만 8,900', tc.need, 338288900);
check('  └ 현금 3.5억이면 1,171만 1,100 남음', tc.gap, 11711100);
check('취득세는 세금 계산 화면과 같은 엔진', C.buyCosts({ price: 7 * E, own: 'first' }).items[0].v, (t => t.acq - t.relief + t.edu + t.farm)(require('../tax/tax-engine.js').buyerAcqTax(7 * E, { own: 'first' })));

/* ===== ② 잔금일 체크리스트 ===== */
let L = C.checklist({ mode: 'buy', balance: '2027-05-20', contract: '2027-03-01', loan: true, moveIn: true });
const at = t => (L.find(x => x.t.indexOf(t) === 0) || {}).d;
check('매수: 거래 신고 = 계약일 + 30일', at('부동산 거래 신고'), '2027-03-31');
check('매수: 대출 신청(권장) = 잔금 30일 전', [at('주택담보대출'), L.find(x => x.t.indexOf('주택담보대출') === 0).kind], ['2027-04-20', 'tip']);
check('매수: 취득세·등기 = 잔금일 + 60일(법정)', [at('취득세'), L.find(x => x.t.indexOf('취득세') === 0).kind], ['2027-07-19', 'law']);
check('매수: 전입신고 마감 = 잔금일 + 14일', at('전입신고'), '2027-06-03');
check('매수: 잔금이 6월 1일 앞뒤면 과세기준일 안내', at('6월 1일'), '2027-06-01');
check('매수: 날짜순 정렬', L.map(x => x.d).join() === L.map(x => x.d).sort().join(), true);
check('매수: 잔금이 6월 1일과 멀면 과세기준일 안내 없음', C.checklist({ mode: 'buy', balance: '2027-09-20' }).some(x => /6월 1일/.test(x.t)), false);
check('매수: 계약일이 잔금보다 늦으면 계약일 기한 빼고', C.checklist({ mode: 'buy', balance: '2027-01-10', contract: '2027-02-01' }).some(x => /거래 신고/.test(x.t)), false);
L = C.checklist({ mode: 'rent', balance: '2027-02-01', contract: '2026-12-20', loan: true });
check('전세: 전월세 신고 = 계약일 + 30일', at('전월세 신고'), '2027-01-19');
check('전세: 잔금 당일 전입신고 + 확정일자(법정)', [at('잔금 당일'), L.find(x => x.t.indexOf('잔금 당일') === 0).kind], ['2027-02-01', 'law']);
check('전세: 전입 마감 14일', at('전입신고 마감'), '2027-02-15');
check('잘못된 날짜 → 빈 목록', C.checklist({ balance: '2027-02-30' }), []);
const ics = C.ics([{ d: '2027-01-19', t: '전월세 신고, 기한', s: '줄1\n줄2;끝', url: 'https://www.law.go.kr/x' }], '집예보');
check('ics: 달력 머리·꼬리, 줄바꿈 CRLF', [ics.indexOf('BEGIN:VCALENDAR\r\n') === 0, /END:VCALENDAR\r\n$/.test(ics)], [true, true]);
check('ics: 하루 종일 일정(다음 날 끝)', [/DTSTART;VALUE=DATE:20270119/.test(ics), /DTEND;VALUE=DATE:20270120/.test(ics)], [true, true]);
check('ics: 쉼표·세미콜론·줄바꿈 이스케이프', [/SUMMARY:전월세 신고\\, 기한/.test(ics), /줄1\\n줄2\\;끝/.test(ics.replace(/\r\n /g, ''))], [true, true]);
check('ics: 한 줄 75바이트 이하(접기)', ics.split('\r\n').every(l => Buffer.byteLength(l, 'utf8') <= 75), true);
check('ics: 하루 전 알림', /TRIGGER:-P1D/.test(ics), true);

/* ===== ③ 주택 수 판정 ===== */
const J = (items, o) => { const r = H.judge(items, o), by = {}; r.taxes.forEach(t => by[t.k] = t); return by; };
const apt = { kind: 'house', area: 'metro', price: 'gt3', inh: 'no' };
let r = J([apt, { kind: 'offi', since: 'y2021', area: 'metro', price: 'le3', live: 'y', taxHome: 'n' }]);
check('오피스텔 함정: 자녀가 사는 업무용 오피스텔 → 양도세 비과세 판정 2채', [r.cgt.n, r.cgt.rows[1].st], [2, 'in']);
check('  └ 같은 오피스텔이 취득세·종부세에선 빠짐(재산세를 업무용으로 냄)', [r.acq.n, r.cpt.n], [1, 1]);
check('  └ 함정 예시 문장에 지어낸 금액 없음(조문만)', /\d[\d,.]*\s*(천|만|억)?\s*원/.test(H.TRAP.story.join('') + H.TRAP.tip), false);
r = J([apt, { kind: 'presale', since: 'h2020', area: 'metro', price: 'gt3', inh: 'no' }]);
check('분양권 2020.10 취득: 취득세 들어감 · 양도세 비과세·중과 빠짐 · 종부세 빠짐', [r.acq.rows[1].st, r.cgt.rows[1].st, r.heavy.rows[1].st, r.cpt.rows[1].st], ['in', 'out', 'out', 'out']);
r = J([apt, { kind: 'presale', since: 'y2021', area: 'metro', price: 'gt3', inh: 'no' }]);
check('분양권 2021 이후: 취득세·양도세 모두 들어감, 종부세만 빠짐', [r.acq.n, r.cgt.n, r.heavy.n, r.cpt.n], [2, 2, 2, 1]);
r = J([apt, { kind: 'ticket', since: 'pre0812', area: 'metro', price: 'gt3', inh: 'no' }]);
check('입주권 2020.8.11 이전: 취득세 빠짐 · 양도세 들어감 · 종부세 빠짐', [r.acq.rows[1].st, r.cgt.rows[1].st, r.heavy.rows[1].st, r.cpt.rows[1].st], ['out', 'in', 'in', 'out']);
r = J([apt, { kind: 'house', area: 'metro', price: 'le1', inh: 'no', redev: false }]);
check('공시 1억 이하 집: 취득세만 빠짐, 양도세·종부세는 셈', [r.acq.rows[1].st, r.cgt.rows[1].st, r.heavy.rows[1].st, r.cpt.rows[1].st], ['out', 'in', 'in', 'in']);
check('  └ 정비구역 안이면 취득세도 셈', J([apt, { kind: 'house', area: 'metro', price: 'le1', inh: 'no', redev: true }]).acq.rows[1].st, 'in');
r = J([apt, { kind: 'house', area: 'metro', price: 'gt3', inh: 'in5' }]);
check('상속 5년 안: 취득세 빠짐 · 양도세 비과세는 확인 필요 · 중과는 셈(이 집 팔 때 제외) · 종부세 세율 빠짐', [r.acq.rows[1].st, r.cgt.rows[1].st, r.heavy.rows[1].st, r.cpt.rows[1].st], ['out', 'check', 'in', 'out']);
check('  └ 확인 필요는 범위로(1~2채)', [r.cgt.n, r.cgt.nMax], [1, 2]);
r = J([apt, { kind: 'house', area: 'rural', price: 'le3', inh: 'no' }]);
check('지방 3억 이하 집: 중과 판정에서만 빠짐, 비과세 판정엔 들어감', [r.heavy.n, r.cgt.n], [1, 2]);
check('  └ 종부세: 다른 집 1채 + 지방 저가 1채 → 1세대 1주택 특례(1채)', [r.cpt.n, r.cpt.special], [1, true]);
check('  └ 취득세에선 그대로 셈(공시 1억 넘음)', r.acq.n, 2);
r = J([apt, { kind: 'house', area: 'rural', price: 'le3' }, { kind: 'house', area: 'rural', price: 'le3' }]);
check('지방 저가주택 2채면 종부세 특례 없음', [r.cpt.n, !!r.cpt.special], [3, false]);
r = J([apt, { kind: 'house', area: 'metro', price: 'gt3', rent: true }]);
check('임대 등록·합산배제: 종부세 빠짐 · 취득세 확인 필요 · 비과세 확인 필요', [r.cpt.rows[1].st, r.acq.rows[1].st, r.cgt.rows[1].st], ['out', 'check', 'check']);
r = J([apt, { kind: 'offi', since: 'y2021', live: '?', taxHome: '?', price: 'le3', area: 'metro' }]);
check('오피스텔 모름 → 세 세금 모두 확인 필요', [r.acq.rows[1].st, r.cgt.rows[1].st, r.cpt.rows[1].st], ['check', 'check', 'check']);
check('오피스텔 시가표준액 1억 이하(주택분 재산세) → 취득세만 빠짐', J([{ kind: 'offi', since: 'y2021', live: 'y', taxHome: 'y', price: 'le1', area: 'metro' }]).acq.rows[0].st, 'out');
check('오피스텔 2020.8.11 이전 취득 → 취득세 빠짐', J([{ kind: 'offi', since: 'pre0812', live: 'y', taxHome: 'y', price: 'gt3', area: 'metro' }]).acq.rows[0].st, 'out');
r = J([apt], { buying: true });
check('새로 살 집 더하면 취득세 2번째 집', [r.acq.after, /2번째 집/.test(r.acq.note)], [2, true]);
check('모든 판정에 조문 링크(주택 수 들어감·빠짐)', H.judge([apt, { kind: 'presale', since: 'y2021' }, { kind: 'ticket', since: 'y2021' }, { kind: 'offi', since: 'y2021', live: 'y', taxHome: 'y' }]).taxes.every(t => t.rows.every(x => x.law.length && x.law.every(l => /^https:\/\/(www\.)?law\.go\.kr\//.test(l.url)))), true);

/* ===== ④ 신뢰 배지 ===== */
const V = require('../tax/tax-verified.js');
check('배지 숫자 파일: 계산기 7개 · 합계 = 계산기별 합', [Object.keys(V.by).sort().join(), V.ntsTotal === Object.keys(V.by).reduce((s, k) => s + V.by[k].nts, 0)], ['acq,cgt,cpt,gift,order,prop,xfer', true]);
check('배지 숫자 파일은 공식 사례 테스트가 만듦', /tax-verified\.js/.test(rd('tools/tax-official-test.js')) && /자동 생성/.test(rd('tax/tax-verified.js')), true);
check('배지 숫자를 화면에 손으로 적지 않음(tax-trust는 파일 값만)', /V\.ntsTotal|b\.nts/.test(rd('tax/tax-trust.js')) && !/사례 \d+건/.test(rd('tax/tax-trust.js') + rd('tax/index.html') + rd('tax/transfer/index.html') + rd('assets/tax-box.js')), true);
check("'세무사 검수 전' 문구 없음(세금 화면·단지 세금 칸)", ['tax/index.html', 'tax/transfer/index.html', 'assets/tax-box.js', 'tax/tax-trust.js'].some(f => /세무사 검수 전/.test(rd(f))), false);
check('배지 파일을 tax-trust·tax-box보다 먼저 불러옴', ['tax/index.html', 'tax/transfer/index.html'].every(f => { const s = rd(f); return s.indexOf('tax-verified.js') > 0 && s.indexOf('tax-verified.js') < s.indexOf('tax-trust.js'); }) &&
  ['mine/index.html', 'buy/report/index.html', 'tax/transfer/index.html'].every(f => { const s = rd(f); return s.indexOf('tax-verified.js') > 0 && s.indexOf('tax-verified.js') < s.indexOf('tax-box.js'); }), true);

/* ===== ⑤ 세법 바뀌는 날 · 화면 연결 ===== */
const D = require('../tax/changes-data.js');
const OK_HOST = /^https:\/\/((www\.)?law\.go\.kr|www\.korea\.kr|opinion\.lawmaking\.go\.kr|www\.geumcheon\.go\.kr)\//;
check('세법 바뀌는 날: 모든 출처가 공식 누리집', Object.keys(D.SRC).filter(k => !OK_HOST.test(D.SRC[k].url)), []);
check('세법 바뀌는 날: 날짜·상태·출처 형식', D.LIST.filter(x => !(/^\d{4}-\d{2}(-\d{2})?$/.test(x.d) && ['law', 'bill', 'done'].includes(x.status) && x.src.length && x.src.every(k => D.SRC[k]))).map(x => x.id), []);
check('세법 바뀌는 날: 확정 아닌 것은 제목에 "확정 아님"', D.LIST.filter(x => x.status === 'bill' && !/확정 아님/.test(x.title)).map(x => x.id), []);
const sw = rd('sw.js'), bk = require('../assets/back.js');
['tax/count/', 'tax/cost/', 'tax/changes/', 'loan/checklist/'].forEach(p => {
  check(p + ' 화면 있음 · sw 캐시 · 사이트맵 · 이름표', [fs.existsSync(path.join(ROOT, p, 'index.html')), sw.indexOf("'./" + p + "'") > 0, rd('sitemaps/pages.xml').indexOf('/jangdaejang-calc/' + p + '<') > 0, !!(bk.info ? bk.info(p, '').name : 1)], [true, true, true, true]);
});
['tax/house-count.js?v=1', 'tax/changes-data.js?v=1', 'assets/closing-core.js?v=1', 'assets/buy-total.js?v=1', 'assets/loan-rates.js?v=1', 'tax/tax-verified.js?v=1', 'tax/tax-trust.js?v=2', 'assets/tax-box.js?v=9'].forEach(f =>
  check('sw 캐시 목록 ' + f, sw.indexOf("'./" + f + "'") > 0, true));
check('내 집 마련: 총비용 칸·공용 계산 불러옴', [/id="totalCard"/.test(rd('buy/index.html')), /closing-core\.js\?v=1/.test(rd('buy/index.html')), /buy-total\.js\?v=1/.test(rd('buy/index.html'))], [true, true, true]);
check('총비용 한 장: 금액을 주소·서버로 보내지 않음', /fetch\(|location\.href\s*=|\?p=/.test(rd('assets/buy-total.js')), false);
check('공시 금리표: 꺼진 채로(자료·키 없음)', /var ENABLED = false;/.test(rd('assets/loan-rates.js')) && /id="rateTable" hidden/.test(rd('loan/index.html')), true);

const bad = rows.filter(x => !x.ok);
rows.forEach(x => console.log((x.ok ? 'PASS ' : 'FAIL ') + x.name + (x.ok ? '' : ' | 결과 ' + JSON.stringify(x.got) + ' | 기대 ' + JSON.stringify(x.want))));
console.log(`\n부대비용·주택 수·세법 바뀌는 날 테스트 ${rows.length - bad.length}/${rows.length} 통과`);
process.exit(bad.length ? 1 : 0);
