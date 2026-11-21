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
    deleteRow(i) { rows.splice(i - 1, 1); },
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
  dev: '(주)테스트개발', bld: '테스트건설(주)', agree: { label: true, score: true, stop: true, legal: true } });
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
  ['기간 1년 초과', { start: day(1), end: day(400) }], ['동의 하나 빠짐', { agree: { label: true, score: true, stop: false, legal: true } }], ['법정 표기 동의 없음', { agree: { label: true, score: true, stop: true } }],
  ['사업주체 없음', { dev: '' }], ['아파트 시공사 없음', { bld: '' }], ['상품 엉뚱', { prod: ['vip'] }], ['청약홈 번호 9자리', { no: '202600037' }],
  ['상담 연결인데 이메일 없음', { prod: ['top', 'lead'], agree: { label: true, score: true, stop: true, legal: true, lead: true } }],
  ['상담 연결 동의 없음', { prod: ['lead'], leadMail: 'sales@example.com' }],
  ['오피스텔 분양신고번호 없음', { kind: '오피스텔', vat: '별도', gt: '○○신탁' }], ['오피스텔 VAT 미선택', { kind: '오피스텔', dn: '강동-2026-1', dd: day(-5), gt: '○○신탁' }],
  ['추가 노출 구 3곳', { gx: ['송파구', '광진구', '하남시'] }], ['동의 없음', { agree: null }],
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


// 4-2. v16 분양 광고 상품·필수 표기·상담 연결·기록
cacheMap.clear();
const prodBase = () => Object.assign(base(), { biz: mkBiz('444444444'), danji: '프리미엄 현장', prod: ['top', 'pin', 'lead', 'lead'], no: '2026000373', agc: '(주)분양대행',
  leadMail: 'Sales@Example.com', gx: ['송파구', '강동구'], founding: true, partner: true, agree: { label: true, score: true, stop: true, legal: true, lead: true } });
r = post(prodBase());
check('v16 신청: 상품·필수 표기', r.ok, r);
const idP = r.id, rowP = sheet().rows.find(x => x[0] === idP);
check('상품 한글·중복 제거', rowP[C['상품']] === '목록 상단 카드·추천 현장,지도 프리미엄 마커,분양 상담 연결', rowP[C['상품']]);
check('사업주체·시공사·대행사·청약홈 번호(문자 보관)', rowP[C['사업주체']] === '(주)테스트개발' && rowP[C['시공사']] === '테스트건설(주)' && rowP[C['분양대행사']] === '(주)분양대행' && rowP[C['청약홈공고번호']] === "'2026000373");
check('추가 노출 구(자기 구 제외)·이메일 소문자·창립·파트너', rowP[C['추가노출구']] === '송파구' && rowP[C['상담받을이메일']] === 'sales@example.com' && rowP[C['창립광고주']] === '신청' && rowP[C['판매파트너모집']] === '희망');
check('제목줄 v16 열 포함(기존 25열 뒤)', sheet().rows[0].length === Object.keys(C).length && C['상품'] === 25 && C['승인'] === 21);
r = post(Object.assign(base(), { biz: mkBiz('555555555'), danji: '오피 현장', kind: '오피스텔', bld: '', dn: '강동구-분양-2026-3', dd: day(-5), gt: '○○자산신탁', vat: '별도' }));
check('오피스텔: 분양신고·신탁·VAT 저장', r.ok && sheet().rows.find(x => x[0] === r.id)[C['분양가VAT']] === '별도', r);
const idO = r.id;
r = post(Object.assign(base(), { biz: mkBiz('666666666'), danji: '소규모 상가', kind: '기타', bld: '', dnNa: true, vat: '포함' }));
check('건축물분양법 대상 아님 선택', r.ok && sheet().rows.find(x => x[0] === r.id)[C['분양신고번호']] === '신고 대상 아님', r);
const idN = r.id;
r = post(Object.assign(base(), { biz: mkBiz('777777777'), danji: '승인 전 아파트', approved: false, pdate: '' }));
const idQ = r.id;
const live = (id, extra) => { setRow(id, '승인', true); setRow(id, '시작일', day(-1)); setRow(id, '종료일', day(10)); if (extra) for (const k in extra) setRow(id, k, extra[k]); };
live(idP, { '좌표': '37.5512, 127.1468', '노출반경km': '8' }); live(idO); live(idN); live(idQ);
cacheMap.delete('adlist');
L = get({ action: 'adList' });
const byId = id => L.ads.find(a => a.id === id);
check('주택은 모집공고 승인 전이면 운영자가 승인해도 노출 안 함', !byId(idQ));
check('오피스텔·신고 대상 아님 노출', !!byId(idO) && !!byId(idN));
const P = byId(idP) || {};
check('공개: 상품·표기·좌표·반경·상담·파트너', P.prod && P.prod.join() === 'top,pin,lead' && P.dev === '(주)테스트개발' && P.bld === '테스트건설(주)' && P.agc === '(주)분양대행' && P.no === '2026000373'
  && P.xy && Math.abs(P.xy[0] - 127.1468) < 1e-6 && Math.abs(P.xy[1] - 37.5512) < 1e-6 && P.rk === 8 && P.lead === true && P.pr === true && P.gx.join() === '송파구', P);
check('공개 목록에 상담 이메일·창립 여부 없음', !JSON.stringify(L).includes('sales@example.com') && !JSON.stringify(L).includes('창립'));
check('예전 광고(상품 칸 비어 있음) = 상단 카드', (byId(idO) || {}).prod.join() === 'top');
setRow(idP, '좌표', '0,0'); cacheMap.delete('adlist');
check('좌표가 한국 밖이면 지도 위치 없음', get({ action: 'adList' }).ads.find(a => a.id === idP).xy === null);
// 상담 신청
const lead = () => ({ action: 'adLead', ad: idP, name: '김예보', phone: '010-2222-3333', time: '저녁(18~21시)', memo: '84타입 문의', agree: { collect: true, third: true } });
const mb = mails.length;
for (const [name, patch] of [['광고 id 엉뚱', { ad: 'AD00000000' }], ['상담 미사용 광고', { ad: idO }], ['이름 숫자', { name: '1234' }], ['유선 번호', { phone: '02-3444-5008' }],
  ['시간 엉뚱', { time: '새벽' }], ['제3자 제공 동의 없음', { agree: { collect: true } }], ['수집 동의 없음', { agree: { third: true } }], ['봇', { hp: '1' }], ['문의 수식', { memo: '=1+1' }]]) {
  const x = post(Object.assign(lead(), patch)); check('상담 거절: ' + name, !x.ok && typeof x.err === 'string', x);
}
r = post(lead());
check('상담 신청 성공 + 광고주 회사명 응답', r.ok && /^LD[0-9A-F]{8}$/.test(r.id) && r.co === '(주)테스트개발', r);
const ld = sheets['분양상담'].rows[1];
check('분양상담 시트: 동의 기록·메일 전달·파기예정일', /제3자 제공 동의\(받는 자 \(주\)테스트개발/.test(ld[6 + 3]) && ld[10] === '메일 전달' && /^\d{4}-\d{2}-\d{2}$/.test(ld[12]), ld);
const toAdv = mails.slice(mb).find(m => m[0] === 'sales@example.com'), toOwn = mails.slice(mb).find(m => m[0] === 'owner@example.com');
check('광고주 메일에 연락처·목적 외 사용 금지·야간 연락 금지', toAdv && /010-2222-3333/.test(toAdv[2]) && /목적 외/.test(toAdv[2]) && /오후 9시/.test(toAdv[2]));
check('시트 주인 메일에는 연락처 없음', toOwn && !/2222-3333/.test(JSON.stringify(toOwn)));
post(lead()); post(lead());
r = post(lead());
check('같은 번호 하루 3번까지', !r.ok && /이 번호/.test(r.err), r);
sheets['분양상담'].rows[1][12] = day(-1);
check('파기예정일 지난 신청 삭제', ctx.cleanLeads() === 1 && sheets['분양상담'].rows.length === 3);
// 기록·보고서
if (!sheets['로그'].rows.length) sheets['로그'].rows.push(['시각', '종류', 'id', '구', '단지', '방문자']);
r = post({ action: 'log', vid: 'v1', events: [{ t: 'adv', a: idP, g: '' }, { t: 'adm', a: idP, g: '11740' }, { t: 'adc', a: idP, g: '' }, { t: 'adc', a: 'A1234567', g: '' }, { t: 'adv', a: idP, g: 'x' }] });
check('광고 기록: 광고 id 형식만, 잘못된 구 코드 거절', r.ok && r.n === 3, r);
check('광고 보고서: 노출·마커·클릭·상담', ctx.adReport() >= 1 && (() => { const x = sheets['광고보고서'].rows.find(q => q[0] === idP); return x && x[4] === 1 && x[5] === 1 && x[6] === 1 && x[7] === 2; })(), sheets['광고보고서'] && sheets['광고보고서'].rows);

check('관심 지역 광고성 정보 동의: 동의일 있을 때만 저장', ctx.cleanAreas({ list: [], mkt: { at: '2026-11-20', x: 1 } }).mkt.at === '2026-11-20' && !('mkt' in ctx.cleanAreas({ list: [], mkt: { at: 'yes' } })) && !('mkt' in ctx.cleanAreas({ list: [] })));

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
r = post(Object.assign(aq(), { products: ['home_top', 'cat_top', 'native'], period: '8주(2개월)' }));
check('v38: 희망 기간 8주(2개월)·상단 배너 상품 그대로 저장', r.ok && aqRows()[3][AQ['희망기간']] === '8주(2개월)' && aqRows()[3][AQ['관심상품']] === '홈 상단 배너,카테고리 상단 배너,결과 하단 카드', r.ok ? aqRows()[3][AQ['희망기간']] : r);
check('분양 광고 시트에는 문의가 섞이지 않음', rows().every(x => !String(x[0]).startsWith('AQ')));
check('공개 광고 목록에 문의 정보 없음', !JSON.stringify(get({ action: 'adList' })).includes('테스트이사'));
cacheMap.set('aqday:' + ymd(new Date()), '40');
r = post(aq());
check('하루 문의 상한', !r.ok && /카카오톡/.test(r.err), r);


// 8. 광고 단가(assets/ad-prices.js, ad/ 와 ad/plan/ 이 같이 읽음)·기간 계산 — PRICE-CORE 구간만 떼어 검증
{
  const html = fs.readFileSync(path.join(__dirname, '..', 'ad', 'index.html'), 'utf8');
  const m = fs.readFileSync(path.join(__dirname, '..', 'assets', 'ad-prices.js'), 'utf8').match(/\/\* PRICE-CORE:START[\s\S]*?\/\* PRICE-CORE:END \*\//);   // 단가 한 곳: assets/ad-prices.js
  check('PRICE-CORE 구간 있음(assets/ad-prices.js) · ad/ 가 그 파일을 읽음', !!m && /assets\/ad-prices\.js\?v=\d+/.test(html));
  const pc = {}; vm.createContext(pc);
  vm.runInContext(m[0] + '\n;globalThis.__P = { PRICES, PERIODS, rnd, man, rateOf, periodPrice, weekKey, passPrice, firstWeekPrice, extendPrice, launchWeek };', pc);
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
  const BP = P.PRICES;
  check('분양 프리미엄 정가·런칭가: 마커 150→49만, 알림 60→19만(카톡 300→150원), 상담 150→49만(건당 5→2만), 리포트 99→29만, 패키지 400→129만',
    BP.bunyang_pin.tiers[0].month === 1500000 && BP.bunyang_pin.launch === 490000 && BP.bunyang_alert.tiers[0].month === 600000 && BP.bunyang_alert.launch === 190000 && BP.bunyang_alert.per.list === 300 && BP.bunyang_alert.per.launch === 150
    && BP.bunyang_lead.tiers[0].month === 1500000 && BP.bunyang_lead.launch === 490000 && BP.bunyang_lead.per.list === 50000 && BP.bunyang_lead.per.launch === 20000
    && BP.bunyang_report.once.list === 990000 && BP.bunyang_report.once.launch === 290000 && BP.pkg_found.tiers[0].month === 4000000 && BP.pkg_found.launch === 1290000);
  check('런칭가는 정가보다 낮음', ['bunyang_pin', 'bunyang_alert', 'bunyang_lead', 'pkg_found'].every(k => BP[k].launch < BP[k].tiers[0].month) && BP.bunyang_report.once.launch < BP.bunyang_report.once.list);
  check('창립 광고주 분양 단지 광고 50%: 4주 90만 → 45만', P.launchWeek(900000) === 450000);
  check('런칭가에도 기간 할인: 마커 49만 × 3개월 10% = 132.3만', pp(490000, 'm3').total === 1323000);
  check('분양 프리미엄 상품 카드·단가표 칸', ['bunyang_pin', 'bunyang_alert', 'bunyang_lead', 'bunyang_report', 'pkg_found'].every(k => html.includes(`data-price="${k}"`) || html.includes(`data-pk="${k}"`)) && ['bunyang_pin', 'bunyang_alert', 'bunyang_lead', 'bunyang_report'].every(k => html.includes(`data-pp="${k}"`)));
  check('광고 상품 페이지: 광고성 정보·야간 발송·점수 무관 문구', /제50조/.test(html) && /오후 9시~오전 8시에는 보내지 않아요/.test(html) && /미래가치 점수·추천·순위에 반영되지 않아요/.test(html));
  /* QA 2026-11-21: 단가표 금액 칸 — 주 단위 상품(브리핑 지면·상단 배너)이 '기간과 관계없는 고정 요금'으로 나오던 문제 */
  {
    const fn = html.match(/function cellHtml\(key, pid\) \{[\s\S]*?\n\}\n/);
    const cc = {}; vm.createContext(cc);
    vm.runInContext(m[0] + '\nconst ASK = "문의 시 안내"; const esc = s => String(s); const PL = id => (PERIODS.find(x => x.id === id) || {}).label || "";\n' + (fn ? fn[0] : 'function cellHtml(){return ""}') + '\n;globalThis.__C = cellHtml;', cc);
    const C = (k, id) => cc.__C(k, id).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const wk = ['brief_ad', 'home_top', 'cat_top', 'cat_top_bun', 'bunyang'];
    check('단가표: 주 단위 상품은 기간마다 금액이 바뀌고 고정 요금 문구 없음', wk.every(k => P.PERIODS.every(x => !/기간과 관계없는/.test(C(k, x.id)))), wk.map(k => C(k, 'w2')));
    check('단가표: 브리핑 지면 1주 25만·2주 50만(1주×2)·1개월 80만', /^1주 25만 원/.test(C('brief_ad', 'w1')) && /^2주 50만 원/.test(C('brief_ad', 'w2')) && /^4주 80만 원/.test(C('brief_ad', 'm1')), [C('brief_ad', 'w1'), C('brief_ad', 'w2'), C('brief_ad', 'm1')]);
    check('단가표: 홈 상단 1주 50만·4주 150만, 카테고리 상단 4주 80만, 분양·청약 상단 4주 90만', /^1주 50만 원/.test(C('home_top', 'w1')) && /^4주 150만 원/.test(C('home_top', 'm1')) && /^4주 80만 원/.test(C('cat_top', 'm1')) && /^4주 90만 원/.test(C('cat_top_bun', 'm1')));
    check('목록 사이 카드 월 시·도 30만 · 페이지 끝 카드 월 전국 50만·시·도 30만·중개사 화면 15만(ad-prices.js 한 곳)', P.PRICES.list_card.tiers.map(t => t.month).join() === '300000' && P.PRICES.end_card.tiers.map(t => t.month).join() === '500000,300000,150000');
    check('목록 사이·페이지 끝 카드: 상품 소개·단가표·문의 폼에 모두 있음', ['list_card', 'end_card'].every(k => html.includes(`data-price="${k}"`) && html.includes(`data-pp="${k}"`) && html.includes(`value="${k}"`)) && /PRICES\.list_card\.tiers/.test(html) && /PRICES\.end_card\.tiers/.test(html));
    check('목록 사이·페이지 끝 카드: 재배포 전 서버에도 기타·제휴로 함께 접수', /\['brief_ad', 'home_top', 'cat_top', 'list_card', 'end_card'\]/.test(html));
    check('서버 v39: 관심 상품 목록 사이·페이지 끝 카드', /AQ_PROD\.list_card = '목록 사이 카드'; AQ_PROD\.end_card = '페이지 끝 카드'/.test(fs.readFileSync(path.join(__dirname, 'agent-backend.gs'), 'utf8')));
    check('단가표 장기 할인: 홈 상단 3개월 12주 405만·1년 52주 1,560만, 브리핑 1년 832만, 분양·청약 3개월 243만', /^12주 405만 원/.test(C('home_top', 'm3')) && /^52주 1,560만 원/.test(C('home_top', 'y1')) && /^52주 832만 원/.test(C('brief_ad', 'y1')) && /^12주 243만 원/.test(C('cat_top_bun', 'm3')) && /^26주 829만 원/.test(C('home_top', 'm6')) && /15%/.test(C('home_top', 'm6')), [C('home_top', 'm3'), C('home_top', 'y1')]);
    check("단가표: 어느 상품·기간에도 '문의 시 안내' 없음", Object.keys(P.PRICES).filter(k => html.includes(`data-pp="${k}"`)).every(k => P.PERIODS.every(x => !/문의 시 안내/.test(C(k, x.id)) && C(k, x.id))), Object.keys(P.PRICES).filter(k => html.includes(`data-pp="${k}"`)).flatMap(k => P.PERIODS.filter(x => /문의 시 안내/.test(C(k, x.id)) || !C(k, x.id)).map(x => k + ':' + x.id)));
    check('2주 상단 배너 = 1주 × 2', /^2주 100만 원/.test(C('home_top', 'w2')) && /^2주 50만 원/.test(C('cat_top', 'w2')));
    check('단가표에 상단 배너 3줄(홈·카테고리·분양·청약)', ['home_top', 'cat_top', 'cat_top_bun'].every(k => html.includes(`data-pp="${k}"`)));
    const vis = html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ');
    check("광고 안내 화면 글에 '장대장'은 법적 표기(상호·운영사)에만", !/왜 장대장|WHY 장대장|장대장 쪽/.test(vis) && !/네이티브/.test(vis));
  }
  check('예전 최소 집행 50만 원 문구 없음', !/최소 집행[^<]{0,20}50만/.test(html) && !/minSpend:\s*500000/.test(html));
}

// 9. 화면 공용(assets/ads.js) — 지면별 고르기·지도 마커·관심 지역·카드 표기
{
  const F = require(path.join(__dirname, '..', 'assets', 'ads.js'));
  const A = (id, o) => Object.assign({ id, co: '(주)광고', n: '현장' + id, sd: '서울특별시', sg: '강동구', k: '아파트', hh: 300, ap: true, pd: '2026-11-01', u: 'https://x.kr/' + id, pos: ['bunyang'], s: '2026-11-0' + id.slice(-1), e: '2026-12-31', prod: ['top'], gx: [] }, o || {});
  const all = [A('AD00000001'), A('AD00000002', { sg: '송파구' }), A('AD00000003', { sd: '경기도', sg: '하남시', gx: ['송파구'] }), A('AD00000004', { prod: ['pin'] }), A('AD00000005', { pos: ['villa'] }),
    A('AD00000006', { sg: '송파구', no: '2026000999' }), A('AD00000007', { sd: '부산광역시', sg: '해운대구' })];
  const ids = l => l.map(a => a.id.slice(-1)).join('');
  check('목록 상단: 전국이면 3칸, 상단 카드 상품·분양 화면만', ids(F.pick(all, 'bunyang', {})) === '123', ids(F.pick(all, 'bunyang', {})));
  check('목록 상단: 시·도 고르면 그 시·도만', ids(F.pick(all, 'bunyang', { sido: '서울특별시' })) === '126');
  check('목록 상단: 시·군·구 고르면 그 구 광고 먼저', ids(F.pick(all, 'bunyang', { sido: '서울특별시', sgg: '송파구' })) === '261', ids(F.pick(all, 'bunyang', { sido: '서울특별시', sgg: '송파구' })));
  check('추가 노출 구(하남 현장이 송파에 노출)는 같은 시·도 안에서만', ids(F.pick(all, 'bunyang', { sido: '경기도', sgg: '송파구' })) === '3');
  check('옛 시·도 이름도 같은 지역', ids(F.pick([A('AD00000008', { sd: '전라남도' })], 'bunyang', { sido: '전남광주통합특별시' })) === '8');
  check('추천 현장: 같은 시·도 2칸, 보고 있는 공고와 같은 현장 제외', ids(F.pick(all, 'bunyang_rec', { sido: '서울특별시', sgg: '송파구', no: '2026000999' })) === '21');
  check('추천 현장: 시·도 모르면 없음', F.pick(all, 'bunyang_rec', {}).length === 0);
  check('예전 지면(villa)', ids(F.pick(all, 'villa', {})) === '5');
  check('광고 없으면 빈 목록', F.pick([], 'bunyang', {}).length === 0 && F.pick(null, 'bunyang', {}).length === 0);
  check('상품 칸 없는 예전 광고 = 상단 카드', F.pick([Object.assign(A('AD00000009'), { prod: undefined })], 'bunyang', {}).length === 1);
  // 지도 마커
  const rowsN = [{ id: 'apt-1', no: '2026000999', xy: [127.10, 37.51], n: '공고 현장', ty: [['084A', 84, 10, 98000], ['059A', 59, 5, 72000]], hh: 512, k: '아파트', dev: '공식사업주체', bld: '공식시공', pb: '20261110', rc: ['20261124', '20261126'] }];
  const pin = [A('AD0000000A', { prod: ['pin'], xy: [127.14, 37.55], rk: 5 }), A('AD0000000B', { prod: ['pin', 'top'], no: '2026000999' }), A('AD0000000C', { prod: ['pin'] }), A('AD0000000D', { prod: ['top'], xy: [127.14, 37.55] })];
  const v = (z, lat, lng) => ({ s: 37.3, n: 37.7, w: 126.8, e: 127.4, lat, lng, z });
  check('지도 마커: 확대 11 미만이면 없음', F.pinPick(pin, rowsN, v(10, 37.55, 127.14)).length === 0);
  const near = F.pinPick(pin, rowsN, v(12, 37.53, 127.12));
  check('지도 마커: 반경 안·좌표(직접 또는 공고) 있는 마커 상품만, 최대 2', ids(near.map(p => p.a)) === 'AB' && near[1].xy[0] === 127.10, ids(near.map(p => p.a)));
  check('지도 마커: 확대 14 미만에서 반경 밖이면 숨김', F.pinPick(pin, rowsN, v(12, 37.40, 126.90)).length === 0);
  check('지도 마커: 확대 14 이상이면 화면 안 전부(반경 무관)', F.pinPick(pin, rowsN, v(14, 37.40, 126.90)).length === 2);
  check('지도 마커: 화면 밖 제외', F.pinPick(pin, rowsN, { s: 35, n: 35.5, w: 129, e: 129.5, lat: 35.2, lng: 129.2, z: 15 }).length === 0);
  check('거리 계산(강동↔송파 약 3.6km)', Math.abs(F.km([127.1468, 37.5512], [127.1059, 37.5145]) - 5.4) < 1.5, F.km([127.1468, 37.5512], [127.1059, 37.5145]));
  // 관심 지역 알림
  const al = [A('AD0000000E', { prod: ['alert'] }), A('AD0000000F', { prod: ['alert'], sd: '경기도', sg: '하남시', gx: ['송파구'] }), A('AD00000010', { prod: ['top'] })];
  check('관심 지역 알림: 시·도 전체·구 이름·추가 노출 구', ids(F.areaPick(al, [{ sd: '서울특별시', g: '', gn: '' }])) === 'E' && ids(F.areaPick(al, [{ sd: '경기도', g: '41450', gn: '송파구' }])) === 'F' && F.areaPick(al, [{ sd: '서울특별시', g: '11710', gn: '송파구' }]).length === 0);
  check('판매 파트너 모집: 모집 광고만, 중개사 노출 구(추가 노출 구 포함)', ids(F.partnerPick([A('AD00000013', { pr: true }), A('AD00000014', { pr: false }), A('AD00000015', { pr: true, sd: '경기도', sg: '하남시', gx: ['강동구'] })], [{ sd: '서울특별시', gn: '강동구' }])) === '3');
  // 카드 표기
  const h = F.cardHtml(pin[1], rowsN[0], { open: true });
  check('카드: 광고 표시·공고 기준 분양가·세대수·일정·사업주체(공고 값 우선)', /광고<\/span>/.test(h) && /7억 2,000만원 ~ 9억 8,000만원/.test(h) && /512세대/.test(h) && /청약 접수 2026\.11\.24/.test(h) && /사업주체 공식사업주체/.test(h) && /청약홈 공고 기준/.test(h) && /data-ad-open="apt-1"/.test(h), h);
  const ho = F.cardHtml(A('AD00000011', { k: '오피스텔', dn: '강동-2026-1', dd: '2026-10-01', gt: '○○신탁', vat: '별도', pmin: 30000, pmax: 45000, lead: true, agc: '(주)대행' }), null, {});
  check('카드: 오피스텔은 분양신고·신탁·부가세, 상담 버튼, 대행사·광고주', /분양신고 강동-2026-1 \(2026\.10\.01\) · ○○신탁/.test(ho) && /부가세 별도/.test(ho) && /data-ad-lead/.test(ho) && /분양대행 \(주\)대행 · 광고주 \(주\)광고/.test(ho), ho);
  const hx = F.cardHtml(A('AD00000012', { n: '<img src=x onerror=1>', u: 'javascript:alert(1)', img: 'http://x/a.jpg' }), null, {});
  check('카드: 글자 이스케이프·https 아닌 주소·이미지 버림', !/<img src=x/.test(hx) && !/javascript:/.test(hx) && !/http:\/\/x/.test(hx));
  check('카드: 과장 문구 없음', !/(최고의|확정 수익|마감 임박|프리미엄 보장|무조건)/.test(h + ho));
  const src = fs.readFileSync(path.join(__dirname, '..', 'assets', 'ads.js'), 'utf8');
  check('ads.js: 미래가치 점수·순위에 쓰는 값(fv·score·rank) 안 건드림', !/\.(fv|score|rank)\b/.test(src));
  const bun = fs.readFileSync(path.join(__dirname, '..', 'bunyang', 'index.html'), 'utf8'), mp = fs.readFileSync(path.join(__dirname, '..', 'map', 'index.html'), 'utf8');
  check('분양 화면: 목록 상단·추천 현장 칸, ads.js?v=5', /id="adTop" data-jdj-ads="bunyang"/.test(bun) && /data-jdj-ads="bunyang_rec"/.test(bun) && /ads\.js\?v=5/.test(bun));
  check('지도: 광고 마커는 겹침 정리(walls) 안에서, 카카오 로고 자리 유지', /adPins\(z\)/.test(mp) && /카카오 로고·축척/.test(mp) && /ads\.js\?v=5/.test(mp));
  const ap = fs.readFileSync(path.join(__dirname, '..', 'bunyang', 'apply', 'index.html'), 'utf8'), pv = fs.readFileSync(path.join(__dirname, '..', 'privacy', 'index.html'), 'utf8');
  check('신청 폼: 상품 5종·필수 표기(사업주체·시공사·대행사·청약홈 번호·분양신고·신탁·VAT)·상담 이메일·창립·파트너', ['value="top"', 'value="pin"', 'value="alert"', 'value="lead"', 'value="report"', 'id="dev"', 'id="bld"', 'id="agc"', 'id="no"', 'id="dn"', 'id="dd"', 'id="gt"', 'name="vat"', 'id="leadMail"', 'id="founding"', 'id="partner"', 'id="ag4"', 'id="ag5"'].every(x => ap.includes(x)));
  check('처리방침: 분양 상담 신청·제3자 제공(받는 자·목적·항목·기간)·광고성 정보', /id="lead"/.test(pv) && /id="third"/.test(pv) && /받는 자<\/th><th>목적<\/th><th>항목<\/th><th>보유·이용 기간/.test(pv) && /id="ad-consent"/.test(pv));
  const sw = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');
  check('sw.js 에 ads.js?v=5', sw.includes("'./assets/ads.js?v=5'") && !sw.includes("'./assets/ads.js'"));
}

console.log(`분양 광고 서버 로직 검증: ${pass}개 통과, ${fail}개 실패`);
process.exit(fail ? 1 : 0);
