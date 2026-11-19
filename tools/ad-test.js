/* 분양 광고 서버 로직(tools/agent-backend.gs v12) 자동 검증 — 실행: node tools/ad-test.js
   구글 시트를 흉내 낸 가짜 객체 위에서 신청 검증 → 시트 저장 → 승인·기간 → 공개 목록(adList) 필드를 확인합니다.
   (실제 구글 서버에는 접속하지 않습니다.) */
const fs = require('fs'), vm = require('vm'), path = require('path'), crypto = require('crypto');

/* ---------- 가짜 구글 서비스 ---------- */
function makeSheet() {
  const rows = [];
  const sh = {
    rows,
    getDataRange() { return { getValues: () => rows.map(r => r.slice()) }; },
    getLastRow() { return rows.length; },
    appendRow(r) { rows.push(r.slice()); },
    setFrozenRows() {},
    getRange(r, c, nr, nc) {
      const rg = {
        setValues(v) { v.forEach((line, i) => line.forEach((x, j) => { (rows[r - 1 + i] = rows[r - 1 + i] || [])[c - 1 + j] = x; })); return rg; },
        setValue(x) { (rows[r - 1] = rows[r - 1] || [])[c - 1] = x; return rg; },
        getValue() { return (rows[r - 1] || [])[c - 1]; },
        getValues() { return [(rows[r - 1] || []).slice(c - 1, c - 1 + (nc || 1))]; },
        setFontWeight() { return rg; }, setBackground() { return rg; }, setFontColor() { return rg; },
        setNumberFormat() { return rg; }, insertCheckboxes() { return rg; }
      };
      return rg;
    }
  };
  return sh;
}
const sheets = {};
const book = {
  getSheetByName: n => sheets[n] || null,
  insertSheet: n => (sheets[n] = makeSheet()),
  getUrl: () => 'https://docs.google.com/spreadsheets/d/TEST',
  getSheets: () => Object.values(sheets), deleteSheet() {}
};
sheets['중개사'] = makeSheet(); sheets['로그'] = makeSheet();
const props = { TOSS_SECRET_KEY: 'test_sk_FAKE_FOR_UNIT_TEST' };
const cacheMap = new Map();
const mails = [];
let tossMode = 'ok', tossCalls = [];
const ctx = {
  console,
  SpreadsheetApp: { getActive: () => book, openById: () => book },
  PropertiesService: { getScriptProperties: () => ({ getProperty: k => props[k] || null, setProperty: (k, v) => { props[k] = v; } }) },
  CacheService: { getScriptCache: () => ({ get: k => cacheMap.has(k) ? cacheMap.get(k) : null, put: (k, v) => cacheMap.set(k, v), remove: k => cacheMap.delete(k), removeAll: ks => ks.forEach(k => cacheMap.delete(k)) }) },
  LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
  MailApp: { sendEmail: (...a) => mails.push(a) },
  Session: { getEffectiveUser: () => ({ getEmail: () => 'owner@example.com' }) },
  ContentService: { createTextOutput: s => ({ s, setMimeType() { return this; } }), MimeType: { JSON: 'json' } },
  Utilities: {
    getUuid: () => crypto.randomUUID(),
    formatDate: (d, tz, f) => {
      const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })
        .formatToParts(d).map(x => [x.type, x.value]));
      return f.replace('yyyy', p.year).replace('yy', p.year.slice(2)).replace('MM', p.month).replace('dd', p.day).replace('HH', p.hour === '24' ? '00' : p.hour).replace('hh', p.hour).replace('mm', p.minute);
    },
    computeDigest: (alg, s) => Array.from(crypto.createHash('sha256').update(s, 'utf8').digest()).map(b => b > 127 ? b - 256 : b),
    base64Encode: s => Buffer.from(s).toString('base64'),
    DigestAlgorithm: { SHA_256: 'sha256' }, Charset: { UTF_8: 'utf8' }
  },
  UrlFetchApp: {
    fetch(url, opt) {
      tossCalls.push({ url, opt });
      const body = opt.payload ? JSON.parse(opt.payload) : null;
      const send = (code, j) => ({ getResponseCode: () => code, getContentText: () => JSON.stringify(j) });
      if (tossMode === 'reject') return send(400, { code: 'REJECT_CARD_COMPANY', message: '카드사에서 거절했습니다.' });
      if (tossMode === 'already' && body) return send(400, { code: 'ALREADY_PROCESSED_PAYMENT', message: '이미 처리된 결제 입니다.' });
      if (tossMode === 'already' && !body) return send(200, { status: 'DONE', orderId: ctx.__lastOrder, totalAmount: ctx.__lastAmount, method: '카드', approvedAt: new Date().toISOString() });
      if (tossMode === 'wrongAmount') return send(200, { status: 'DONE', orderId: body.orderId, totalAmount: 100, method: '카드', approvedAt: new Date().toISOString() });
      return send(200, { status: 'DONE', orderId: body.orderId, totalAmount: body.amount, method: '카드', approvedAt: new Date().toISOString() });
    }
  }
};
vm.createContext(ctx);
const src = fs.readFileSync(path.join(__dirname, 'agent-backend.gs'), 'utf8');
vm.runInContext(src + '\n;globalThis.__T = { ADC, bizOk, adText, adUrl, SH_AD, AQC, SH_AQ };', ctx);
const T = ctx.__T;
const post = b => JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify(b) } }).s);
const get = p => JSON.parse(ctx.doGet({ parameter: p }).s);

let pass = 0, fail = 0;
function check(name, cond, extra) { if (cond) pass++; else { fail++; console.log('  실패:', name, extra !== undefined ? JSON.stringify(extra) : ''); } }
const ymd = d => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
const day = n => ymd(new Date(Date.now() + n * 86400000));
/* 검증식을 만족하는 사업자등록번호 만들기 */
function mkBiz(p9) { const w = [1, 3, 7, 1, 3, 7, 1, 3, 5]; let s = 0; for (let i = 0; i < 9; i++) s += +p9[i] * w[i]; s += Math.floor(+p9[8] * 5 / 10); return p9 + ((10 - s % 10) % 10); }
const BIZ = mkBiz('123456789'), BIZ2 = mkBiz('220812345');
const base = () => ({ action: 'adApply', company: '(주)테스트개발', biz: BIZ, manager: '홍길동', phone: '010-1234-5678', danji: '테스트 더샵 1단지',
  sido: '서울특별시', sgg: '강동구', kind: '아파트', hh: '420', pmin: '65000', pmax: '98000', approved: true, pdate: day(-3),
  url: 'https://www.applyhome.co.kr/test', img: 'https://example.com/a.jpg', pos: ['bunyang', 'villa'], start: day(0), end: day(30),
  agree: { label: true, score: true, stop: true } });
const sheet = () => sheets[T.SH_AD];
const rows = () => sheet().rows.slice(1);
const C = T.ADC;

// 1. 도우미
check('사업자번호 검증식 통과', T.bizOk(BIZ) === BIZ.slice(0, 3) + '-' + BIZ.slice(3, 5) + '-' + BIZ.slice(5));
check('사업자번호 검증식 실패(끝자리 다름)', T.bizOk(BIZ.slice(0, 9) + ((+BIZ[9] + 1) % 10)) === '');
check('사업자번호 자릿수', T.bizOk('12345') === '');
let thrown = false; try { T.adText('=HYPERLINK("x")', 60, '회사명', true); } catch (e) { thrown = true; }
check('수식 주입(=) 거절', thrown);
thrown = false; try { T.adUrl('http://example.com', '주소', true); } catch (e) { thrown = true; }
check('http 주소 거절', thrown);
thrown = false; try { T.adUrl('javascript:alert(1)', '주소', true); } catch (e) { thrown = true; }
check('javascript: 주소 거절', thrown);
check('꺾쇠 제거', T.adText('<b>단지</b>', 60, '단지명', true).indexOf('<') < 0);

// 2. 신청 검증 (하나씩 틀리게)
const bad = [
  ['회사명 없음', { company: '' }], ['회사명 수식', { company: '+cmd' }], ['회사명 61자', { company: '가'.repeat(61) }],
  ['사업자번호 틀림', { biz: BIZ.slice(0, 9) + ((+BIZ[9] + 1) % 10) }], ['연락처 틀림', { phone: '12' }],
  ['단지명 @ 시작', { danji: '@SUM(A1)' }], ['시도 아님', { sido: '광주광역시' }], ['시군구 영문', { sgg: 'Gangdong' }],
  ['유형 아님', { kind: '상가' }], ['세대수 0', { hh: '0' }], ['세대수 글자', { hh: '많음' }], ['분양가 최저>최고', { pmin: '99000', pmax: '50000' }],
  ['승인인데 공고일 없음', { pdate: '' }], ['공고일 형식', { pdate: '2026/11/01' }], ['없는 날짜', { pdate: '2026-02-30' }],
  ['공고 URL http', { url: 'http://x.com' }], ['공고 URL 없음', { url: '' }], ['이미지 URL data:', { img: 'data:image/png;base64,AAA' }],
  ['노출 위치 없음', { pos: [] }], ['노출 위치 엉뚱', { pos: ['admin'] }], ['시작일 과거', { start: day(-2) }], ['종료<시작', { end: day(-1), start: day(0) }],
  ['기간 1년 초과', { start: day(1), end: day(400) }], ['동의 하나 빠짐', { agree: { label: true, score: true, stop: false } }], ['동의 없음', { agree: null }],
  ['숨은 칸 입력(봇)', { hp: 'x' }]
];
for (const [name, patch] of bad) { const r = post(Object.assign(base(), patch)); check('거절: ' + name, !r.ok && typeof r.err === 'string', r); }
check('잘못된 신청은 시트에 저장 안 됨', !sheet() || rows().length === 0);

// 3. 정상 신청
let r = post(base());
check('정상 신청 성공', r.ok && /^AD[0-9A-F]{8}$/.test(r.id), r);
const id1 = r.id;
check('분양광고 탭 자동 생성 + 제목줄', !!sheet() && sheet().rows[0][0] === 'id' && sheet().rows[0].length === Object.keys(C).length);
let row = rows()[0];
check('승인 대기(승인 false)·기간 빈칸', row[C['승인']] === false && row[C['시작일']] === '' && row[C['종료일']] === '');
check('사업자번호·연락처 정리 저장', row[C['사업자등록번호']] === T.bizOk(BIZ) && row[C['연락처']] === '010-1234-5678');
check('노출 위치 한글로 저장', row[C['노출위치']] === '분양,재개발·빌라');
check('시트 주인에게 메일 1통', mails.length === 1);
r = post(base());
check('같은 단지 승인 대기 중 중복 신청 거절', !r.ok, r);
r = post(Object.assign(base(), { biz: BIZ2, danji: '승인전 단지', approved: false, pdate: '', pos: ['buy', 'buy', 'tax'], img: '', pmin: '', pmax: '' }));
check('모집공고 승인 전 신청도 접수(운영자 검토), 위치 중복 제거', r.ok && rows()[1][C['노출위치']] === '내집마련,세금' && rows()[1][C['모집공고승인']] === '승인 전', r);
const id2 = r.id;
r = post(Object.assign(base(), { biz: BIZ2, danji: '수식 \u0000단지 ', phone: '02-3444-5008' }));
check('제어문자 제거·02 번호 정리', r.ok && rows()[2][C['단지명']] === '수식 단지' && rows()[2][C['연락처']] === '02-3444-5008', r);
const id3 = r.id;

// 4. 공개 목록: 승인 전에는 비어 있음
let L = get({ action: 'adList' });
check('승인 전 공개 목록 비어 있음', L.ok && L.ads.length === 0, L);
// 승인 + 기간 입력 (운영자가 시트에서 하는 일 흉내)
cacheMap.clear();
const setRow = (id, h, v) => { const x = sheet().rows.find(rr => rr[0] === id); x[C[h]] = v; };
setRow(id1, '승인', true); setRow(id1, '시작일', new Date(Date.now() - 86400000)); setRow(id1, '종료일', new Date(Date.now() + 10 * 86400000));
setRow(id2, '승인', true); setRow(id2, '시작일', day(3)); setRow(id2, '종료일', day(20));          // 아직 시작 전
setRow(id3, '승인', true); setRow(id3, '시작일', day(-20)); setRow(id3, '종료일', day(-1));        // 기간 끝남
L = get({ action: 'adList' });
check('승인·기간 내 광고만 공개', L.ok && L.ads.length === 1 && L.ads[0].id === id1, L);
const ad = L.ads[0] || {};
check('공개 필드', ad.co === '(주)테스트개발' && ad.n === '테스트 더샵 1단지' && ad.sd === '서울특별시' && ad.k === '아파트' && ad.hh === 420
  && ad.pmin === 65000 && ad.pmax === 98000 && ad.ap === true && ad.u === 'https://www.applyhome.co.kr/test' && ad.pos.join() === 'bunyang,villa', ad);
const pub = JSON.stringify(L);
check('공개 목록에 연락처·사업자번호·담당자 없음', !pub.includes('010-1234-5678') && !pub.includes('1234-5678') && !pub.includes(BIZ.slice(5)) && !pub.includes('홍길동') && !pub.includes('02-3444'));
check('공개 목록 5분 캐시', cacheMap.has('adlist'));
setRow(id1, '승인', false);
check('캐시 중에는 그대로(5분 안에 반영)', get({ action: 'adList' }).ads.length === 1);
cacheMap.delete('adlist');
check('승인 해제 → 목록에서 빠짐', get({ action: 'adList' }).ads.length === 0);
setRow(id1, '승인', true); setRow(id1, '공고문URL', 'javascript:alert(1)'); cacheMap.delete('adlist');
check('시트에서 주소가 바뀌어도 https 아니면 공개 안 함', get({ action: 'adList' }).ads.length === 0);

// 5. 하루 신청 상한
cacheMap.set('adday:' + ymd(new Date()), '30');
r = post(Object.assign(base(), { biz: mkBiz('333333333'), danji: '상한 테스트' }));
check('하루 신청 상한', !r.ok && /내일/.test(r.err), r);

// 6. 기존 기능 영향 없음
check('알 수 없는 action', post({ action: 'nope' }).err === 'unknown');
check('중개사 목록(list) 동작', get({ action: 'list' }).ok === true);

// 7. 광고 문의(ad/ 페이지, v13 adInquiry)
cacheMap.clear();
const mailsBefore = mails.length;
const aq = () => ({ action: 'adInquiry', type: 'inquiry', company: '(주)테스트이사', manager: '김담당', contact: '010-9876-5432',
  products: ['native', 'jeonse'], region: '서울 강동구', period: '3개월', memo: '이사 업체입니다.\n견적 부탁드려요.', agree: { privacy: true } });
const aqBad = [
  ['회사명 없음', { company: '' }], ['회사명 수식', { company: '=1+1' }], ['담당자 없음', { manager: ' ' }],
  ['연락처 없음', { contact: '' }], ['연락처 엉뚱', { contact: '12345' }], ['이메일 형식', { contact: 'a@b' }], ['영문 섞인 번호', { contact: '010-1234-567a' }],
  ['관심 상품 없음', { products: [] }], ['관심 상품 엉뚱', { products: ['admin'] }], ['기간 엉뚱', { period: '10년' }],
  ['문의 내용 1001자', { memo: '가'.repeat(1001) }], ['문의 내용 수식', { memo: '@SUM(A1)' }], ['지역 수식', { region: '+cmd' }],
  ['동의 없음', { agree: null }], ['동의 false', { agree: { privacy: false } }], ['유형 엉뚱', { type: 'spam' }], ['숨은 칸(봇)', { hp: 'x' }]
];
for (const [name, patch] of aqBad) { const r2 = post(Object.assign(aq(), patch)); check('문의 거절: ' + name, !r2.ok && typeof r2.err === 'string', r2); }
check('잘못된 문의는 시트 안 만듦', !sheets[T.SH_AQ]);
r = post(aq());
check('문의 접수 성공', r.ok && /^AQ[0-9A-F]{8}$/.test(r.id), r);
const AQ = T.AQC, aqRows = () => sheets[T.SH_AQ].rows.slice(1);
check('광고문의 탭 자동 생성 + 제목줄', sheets[T.SH_AQ] && sheets[T.SH_AQ].rows[0][0] === 'id' && sheets[T.SH_AQ].rows[0].length === Object.keys(AQ).length);
let q = aqRows()[0];
check('문의 저장: 상품 한글·연락처 정리·접수 상태', q[AQ['관심상품']] === '결과 하단 카드,전세사기 예방 체크리스트 스폰서' && q[AQ['연락처']] === '010-9876-5432' && q[AQ['처리상태']] === '접수' && /동의/.test(q[AQ['동의']]));
check('문의 내용 줄바꿈 유지', q[AQ['문의내용']] === '이사 업체입니다.\n견적 부탁드려요.');
check('알림 메일 1통 + 연락처 없음', mails.length === mailsBefore + 1 && !JSON.stringify(mails[mails.length - 1]).includes('9876'));
r = post(Object.assign(aq(), { contact: 'Ad@Example.COM', products: ['bunyang', 'bunyang', 'etc'], period: '', memo: '', region: '' }));
check('이메일 연락처·상품 중복 제거·선택 칸 비움', r.ok && aqRows()[1][AQ['연락처']] === 'ad@example.com' && aqRows()[1][AQ['관심상품']] === '분양 단지 광고,기타·제휴', r);
r = post(Object.assign(aq(), { contact: '070 1234 5678' }));
check('070 번호 정리', r.ok && aqRows()[2][AQ['연락처']] === '070-1234-5678', r);
check('분양 광고 시트에는 문의가 섞이지 않음', rows().every(x => !String(x[0]).startsWith('AQ')));
check('공개 광고 목록에 문의 정보 없음', !JSON.stringify(get({ action: 'adList' })).includes('테스트이사'));
cacheMap.set('aqday:' + ymd(new Date()), '40');
r = post(aq());
check('하루 문의 상한', !r.ok && /카카오톡/.test(r.err), r);


// 8. 광고 안내 페이지(ad/index.html) 단가·기간 계산 — PRICE-CORE 구간만 떼어 검증
{
  const html = fs.readFileSync(path.join(__dirname, '..', 'ad', 'index.html'), 'utf8');
  const m = html.match(/\/\* PRICE-CORE:START[\s\S]*?\/\* PRICE-CORE:END \*\//);
  check('PRICE-CORE 구간 있음', !!m);
  const pc = {}; vm.createContext(pc);
  vm.runInContext(m[0] + '\n;globalThis.__P = { PRICES, PERIODS, rnd, man, rateOf, periodPrice, weekKey, passPrice, firstWeekPrice, extendPrice };', pc);
  const P = pc.__P, pp = (mo, id) => P.periodPrice(mo, id);
  check('기간 6개(1주~1년)', P.PERIODS.map(x => x.label).join() === '1주,2주,1개월,3개월,6개월,1년');
  check('분양 광고 1·2·4주 = 30·50·90만', P.PRICES.bunyang.weeks[1] === 300000 && P.PRICES.bunyang.weeks[2] === 500000 && P.PRICES.bunyang.weeks[4] === 900000);
  check('3회 이용권 10%: 4주×3 = 243만', P.passPrice(900000).total === 2430000 && P.passPrice(900000).list === 2700000);
  check('분양 광고 기간 매핑(1주→1, 2주→2, 그 외→4, 패키지는 4주)', P.weekKey(P.PRICES.bunyang, 'w1') === 1 && P.weekKey(P.PRICES.bunyang, 'w2') === 2 && P.weekKey(P.PRICES.bunyang, 'y1') === 4 && P.weekKey(P.PRICES.pkg_bunyang, 'w1') === 4);
  const nat = P.PRICES.native.tiers.map(t => t.month).join(), top = P.PRICES.agent_top.tiers.map(t => t.month).join();
  check('결과 하단 카드 50·30·15만, 우선 노출 1·2·3등급 15·9·5만, 체크리스트 80만', nat === '500000,300000,150000' && top === '150000,90000,50000' && P.PRICES.jeonse.tiers[0].month === 800000);
  check('패키지 150만(4주)·20만·110만', P.PRICES.pkg_bunyang.weeks[4] === 1500000 && P.PRICES.pkg_local.tiers[0].month === 200000 && P.PRICES.pkg_jeonse.tiers[0].month === 1100000);
  check('중개사는 공개 요금 문구(기본 29,000·프리미엄 49,000원)', /29,000원/.test(P.PRICES.agent.text) && /49,000원/.test(P.PRICES.agent.text) && /29,000원/.test(fs.readFileSync(path.join(__dirname, '..', 'agent', 'index.html'), 'utf8')) && /19,000원/.test(fs.readFileSync(path.join(__dirname, '..', 'agent', 'index.html'), 'utf8')) && /49,000원/.test(fs.readFileSync(path.join(__dirname, '..', 'agent', 'index.html'), 'utf8')));
  const want = { w1: 150000, w2: 275000, m1: 500000, m3: 1350000, m6: 2550000, y1: 4500000 };
  for (const id in want) check(`50만 원 ${id} = ${want[id]}`, pp(500000, id).total === want[id], pp(500000, id));
  check('1년 할인액 150만·월 37.5만 꼴', pp(500000, 'y1').off === 1500000 && pp(500000, 'y1').perMonth === 375000 && pp(500000, 'y1').rate === 25);
  check('3개월 10%·6개월 15% 할인율', pp(500000, 'm3').rate === 10 && pp(500000, 'm6').rate === 15 && pp(500000, 'm1').rate === 0);
  check('9만 원: 2주 49,500 → 천 원 반올림 50,000', pp(90000, 'w2').total === 50000);
  check('9만 원: 1주 27,000 · 1년 81만(월 67,500 꼴)', pp(90000, 'w1').total === 27000 && pp(90000, 'y1').total === 810000 && pp(90000, 'y1').perMonth === 67500);
  check('모든 기간 금액은 천 원 단위', P.PERIODS.every(x => [90000, 150000, 200000, 300000, 500000, 800000, 1100000, 123456].every(mo => pp(mo, x.id).total % 1000 === 0)));
  check('긴 기간일수록 월 꼴 금액이 같거나 작음', ['m1', 'm3', 'm6', 'y1'].map(id => pp(800000, id).perMonth).every((v, i, a) => !i || v <= a[i - 1]));
  check('잘못된 입력', pp(0, 'm1') === null && pp(500000, 'x') === null);
  check('첫 주 50% 할인: 9만 → 4.5만', P.firstWeekPrice(90000) === 45000);
  check('연장 차감: 시·도 1년 270만 − 4.5만 = 265.5만', P.extendPrice(300000, 'y1', 45000) === 2655000);
  check('연장 차감은 1개월 이상만', P.extendPrice(300000, 'w2', 45000) === null && P.extendPrice(300000, 'm1', 45000) === 255000);
  check('취소·환불 불가 안내', /결제 후에는 취소·중도 해지·환불이 되지 않아요/.test(html) && !/cancelEx/.test(html));
  check('표시: 450만 원·37.5만 원·6.75만 원·5,000원·1억 2,000만 원', P.man(4500000) === '450만 원' && P.man(375000) === '37.5만 원' && P.man(67500) === '6.75만 원' && P.man(5000) === '5,000원' && P.man(120000000) === '1억 2,000만 원', [P.man(4500000), P.man(375000), P.man(67500), P.man(120000000)]);
  check('할증: 서비스·종류 +10, 단지 주변 +20, 지역 0', P.PRICES.surcharge.service === 10 && P.PRICES.surcharge.kind === 10 && P.PRICES.surcharge.near === 20 && P.PRICES.surcharge.region === 0);
  check('최소 집행 금액 없음·최소 1주·첫 주 50%', P.PRICES.guide.minSpend === 0 && P.PRICES.guide.minWeeks === 1 && P.PRICES.guide.firstWeekOff === 50);
  const keys = [...html.matchAll(/data-(?:price|pp|pk)="([a-z_0-9]+)"/g)].map(x => x[1]);
  check('페이지의 금액 칸이 모두 PRICES 에 있음', keys.length > 10 && keys.every(k => P.PRICES[k]), keys.filter(k => !P.PRICES[k]));
  check('예전 최소 집행 50만 원 문구 없음', !/최소 집행[^<]{0,20}50만/.test(html) && !/minSpend:\s*500000/.test(html));
}

console.log(`분양 광고 서버 로직 검증: ${pass}개 통과, ${fail}개 실패`);
process.exit(fail ? 1 : 0);
