/* 중개사 업무 도구(v19) 자동 검증 — 실행: node tools/agent-tools-test.js
   ① 매수·매도 문의 연결(동의·연락처 암호화·고른 곳/순번 배정·취소·보관 기간) ② 적정 가격 근거표 계산(assets/agent-tools-core.js)
   ③ 고객 관심 단지 변화 알림(별칭 검사·새 거래/신고가/큰 하락 판정·매일 점검) + 화면 모듈(assets/lead.js) 입력 검사.
   구글 시트·메일·URL 가져오기는 가짜 객체로 흉내 냅니다(실제 서버에 접속하지 않음). */
const fs = require('fs'), vm = require('vm'), path = require('path'), crypto = require('crypto');

function makeSheet() {
  const rows = [];
  const sh = {
    rows,
    getDataRange() { return { getValues: () => rows.map(r => r.slice()) }; },
    getLastRow() { return rows.length; },
    appendRow(r) { rows.push(r.slice()); },
    deleteRow(r) { rows.splice(r - 1, 1); },
    setFrozenRows() {},
    getRange(r, c, nr, nc) {
      const rg = {
        setValues(v) { v.forEach((line, i) => line.forEach((x, j) => { (rows[r - 1 + i] = rows[r - 1 + i] || [])[c - 1 + j] = x; })); return rg; },
        setValue(x) { (rows[r - 1] = rows[r - 1] || [])[c - 1] = x; return rg; },
        getValue() { return (rows[r - 1] || [])[c - 1]; },
        getValues() { return [(rows[r - 1] || []).slice(c - 1, c - 1 + (nc || 1))]; },
        setFontWeight() { return rg; }, setBackground() { return rg; }, setFontColor() { return rg; }, setNumberFormat() { return rg; }, insertCheckboxes() { return rg; }
      };
      return rg;
    }
  };
  return sh;
}
const sheets = {};
const book = { getSheetByName: n => sheets[n] || null, insertSheet: n => (sheets[n] = makeSheet()), getUrl: () => 'https://docs.google.com/spreadsheets/d/TEST', getSheets: () => Object.values(sheets), deleteSheet() {} };
sheets['중개사'] = makeSheet(); sheets['로그'] = makeSheet();
const props = {};
const cacheMap = new Map();
const mails = [], fetched = [];
let priceJson = {};
const signed = b => Array.from(b).map(x => x > 127 ? x - 256 : x);
const unsigned = a => Buffer.from(a.map(x => x & 255));
const ctx = {
  console,
  SpreadsheetApp: { getActive: () => book, openById: () => book },
  PropertiesService: { getScriptProperties: () => ({ getProperty: k => props[k] || null, setProperty: (k, v) => { props[k] = v; } }) },
  CacheService: { getScriptCache: () => ({ get: k => cacheMap.has(k) ? cacheMap.get(k) : null, put: (k, v) => cacheMap.set(k, v), remove: k => cacheMap.delete(k) }) },
  LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
  MailApp: { sendEmail(o) { mails.push(o); }, getRemainingDailyQuota: () => 100 },
  Session: { getEffectiveUser: () => ({ getEmail: () => 'owner@example.com' }) },
  ContentService: { createTextOutput: s => ({ s, setMimeType() { return this; } }), MimeType: { JSON: 'json' } },
  HtmlService: { createHtmlOutput: h => ({ html: h }) },
  ScriptApp: { getProjectTriggers: () => [], newTrigger: () => ({ timeBased: () => ({ everyDays: () => ({ atHour: () => ({ inTimezone: () => ({ create() {} }) }) }) }) }), getService: () => ({ getUrl: () => 'https://script.google.com/x/exec' }) },
  Utilities: {
    getUuid: () => crypto.randomUUID(),
    formatDate: (d, tz, f) => {
      const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(d).map(x => [x.type, x.value]));
      return f.replace('yyyy', p.year).replace('MM', p.month).replace('dd', p.day).replace('HH', p.hour).replace('hh', p.hour).replace('mm', p.minute);
    },
    computeDigest: (alg, s) => signed(crypto.createHash('sha256').update(s, 'utf8').digest()),
    computeHmacSha256Signature: (v, k) => signed(crypto.createHmac('sha256', k).update(v, 'utf8').digest()),
    base64EncodeWebSafe: a => unsigned(a).toString('base64').replace(/\+/g, '-').replace(/\//g, '_'),
    base64DecodeWebSafe: s => signed(Buffer.from(String(s).replace(/-/g, '+').replace(/_/g, '/'), 'base64')),
    newBlob: x => typeof x === 'string' ? { getBytes: () => signed(Buffer.from(x, 'utf8')) } : { getDataAsString: () => unsigned(x).toString('utf8') },
    DigestAlgorithm: { SHA_256: 'sha256' }, Charset: { UTF_8: 'utf8' }, sleep() {}
  },
  UrlFetchApp: {
    fetch(url, opt) {
      fetched.push(url);
      if (/api\.solapi\.com/.test(url)) { fetched.push(JSON.parse(opt.payload)); return { getResponseCode: () => 200, getContentText: () => '{}' }; }
      const g = (url.match(/price\/(\d{5})\.json$/) || [])[1];
      if (g && priceJson[g]) return { getContentText: () => JSON.stringify(priceJson[g]), getResponseCode: () => 200 };
      throw new Error('404 ' + url);
    }
  }
};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, 'agent-backend.gs'), 'utf8') + '\n;globalThis.__T = { sendNotice, COL, AGQC, WC, AGQH, sealText, openText, turnPick, watchScan, agentDaily, leadCancel, listPublic, LEAD_CONSENT_V };', ctx);
const T = ctx.__T;
const post = b => JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify(b) } }).s);
const rows = [];
function check(name, got, want) { const ok = JSON.stringify(got) === JSON.stringify(want); rows.push({ ok, name, got, want }); }
const allCells = () => JSON.stringify(Object.values(sheets).map(s => s.rows));

/* 제휴 중개사 4곳: 강남구 3곳(대표 2, 소속 1) + 송파구 1곳 + 승인 안 된 강남구 1곳 */
const H = vm.runInContext('H', ctx);
const addAgent = o => { const r = H.map(() => ''); Object.keys(o).forEach(k => r[T.COL[k]] = o[k]); sheets['중개사'].rows.push(r); };
sheets['중개사'].rows.push(H.slice());
const far = new Date(Date.now() + 200 * 86400000);
addAgent({ id: 'A1111111', 등록번호: '11680-2020-00001', 사무소명: '대치공인', 대표자: '김대표', 전화: '02-111-1111', 사무소구코드: '11680', 사무소구: '강남구', 사무소동: '대치동', 추가구: '[]', 단지: '[]', 관리코드: 'CODE1111', 승인: true, 만료일: far, 상품: '프리미엄', 유형: '대표', 계산서메일: 'a1@example.com' });
addAgent({ id: 'A2222222', 등록번호: '11680-2020-00002', 사무소명: '도곡공인', 대표자: '이대표', 전화: '02-222-2222', 사무소구코드: '11680', 사무소구: '강남구', 사무소동: '도곡동', 추가구: '[]', 단지: '[]', 관리코드: 'CODE2222', 승인: true, 만료일: far, 상품: '기본', 유형: '대표' });
addAgent({ id: 'A3333333', 등록번호: '11650-2020-00003', 사무소명: '서초공인', 대표자: '박대표', 전화: '02-333-3333', 사무소구코드: '11650', 사무소구: '서초구', 사무소동: '반포동', 추가구: '["11680"]', 단지: '[]', 관리코드: 'CODE3333', 승인: true, 만료일: far, 상품: '기본', 유형: '대표' });
addAgent({ id: 'A4444444', 등록번호: '11710-2020-00004', 사무소명: '송파공인', 대표자: '최대표', 전화: '02-444-4444', 사무소구코드: '11710', 사무소구: '송파구', 사무소동: '잠실동', 추가구: '[]', 단지: '[]', 관리코드: 'CODE4444', 승인: true, 만료일: far, 상품: '기본', 유형: '대표' });
addAgent({ id: 'A5555555', 등록번호: '11680-2020-00005', 사무소명: '대기공인', 대표자: '정대표', 전화: '02-555-5555', 사무소구코드: '11680', 사무소구: '강남구', 사무소동: '역삼동', 추가구: '[]', 단지: '[]', 관리코드: 'CODE5555', 승인: false, 만료일: '', 상품: '기본', 유형: '대표' });

const PHONE = '010-1234-5678', PH = '01012345678';
const base = { action: 'leadCreate', src: 'report', kind: 'buy', g: '11680', gn: '강남구', k: '11680|대치동|은마', apt: '은마', band: '84㎡대', when: '평일 저녁', memo: '내년 봄 입주', cv: T.LEAD_CONSENT_V };

// 1. 공개 목록에 문의 연결 정보
const L0 = T.listPublic();
check('공개 목록: lead 칸(동의 문구 판·최대 3곳·순번 2곳·90일)', [L0.lead.v, L0.lead.pick, L0.lead.turn, L0.lead.keep], [T.LEAD_CONSENT_V, 3, 2, 90]);
check('공개 목록: 승인 안 된 중개사는 빠짐', L0.agents.map(a => a.id).sort(), ['A1111111', 'A2222222', 'A3333333', 'A4444444']);

// 2. 문의 만들기 — 동의·입력 검사
check('문의: 동의 없으면 거절', post(Object.assign({}, base, { phone: PHONE, mode: 'pick', ids: ['A1111111'] })).ok, false);
check('문의: 옛 동의 문구 판이면 거절', post(Object.assign({}, base, { phone: PHONE, mode: 'pick', ids: ['A1111111'], agree: true, cv: 'old' })).ok, false);
check('문의: 휴대폰 아닌 번호 거절', post(Object.assign({}, base, { phone: '02-123-4567', mode: 'pick', ids: ['A1111111'], agree: true })).ok, false);
check('문의: 그 구 중개사가 아니면 거절(송파 중개사)', /이 지역 문의를 받지 않는/.test(post(Object.assign({}, base, { phone: PHONE, mode: 'pick', ids: ['A4444444'], agree: true })).err), true);
check('문의: 승인 안 된 중개사 거절', post(Object.assign({}, base, { phone: PHONE, mode: 'pick', ids: ['A5555555'], agree: true })).ok, false);
check('문의: 4곳 고르면 거절', post(Object.assign({}, base, { phone: PHONE, mode: 'pick', ids: ['A1111111', 'A2222222', 'A3333333', 'A4444444'], agree: true })).ok, false);
check('문의: 구와 단지 키가 다르면 거절', post(Object.assign({}, base, { k: '11710|잠실동|엘스', phone: PHONE, mode: 'pick', ids: ['A1111111'], agree: true })).ok, false);
check('문의: 제휴 중개사 없는 구는 안내', /아직 제휴 중개사가 없/.test(post(Object.assign({}, base, { g: '26110', k: '', phone: PHONE, mode: 'turn', agree: true })).err), true);

// 3. 고른 곳에 보내기
mails.length = 0;
const Q1 = post(Object.assign({}, base, { phone: PHONE, mode: 'pick', ids: ['A1111111', 'A3333333'], agree: true }));
check('문의(고름): 성공 + 고른 2곳 이름 반환', [Q1.ok, Q1.to.map(x => x.id)], [true, ['A1111111', 'A3333333']]);
check('문의: 시트 어디에도 전화번호 원값 없음', [allCells().includes(PH), allCells().includes(PHONE), allCells().includes('1234-5678')], [false, false, false]);
check('문의: 가린 번호·해시·암호문만 저장', (() => { const r = sheets['중개문의'].rows[1]; return [r[T.AGQC['연락처가림']], /^h[0-9a-f]{64}$/.test(r[T.AGQC['연락처해시']]), /^e1\./.test(r[T.AGQC['연락처암호']])]; })(), ['010-****-5678', true, true]);
check('문의: 취소 열쇠 원값 저장 안 함', allCells().includes(Q1.cancel), false);
check('문의: 동의 판·동의 시각 기록', (() => { const r = sheets['중개문의'].rows[1]; return [r[T.AGQC['동의문구']], Object.prototype.toString.call(r[T.AGQC['동의시각']]) === '[object Date]']; })(), [T.LEAD_CONSENT_V, true]);
check('문의: 고른 중개사 2곳에만 메일, 메일에 번호 없음', [mails.map(m => m.to).sort(), mails.some(m => JSON.stringify(m).includes('5678'))], [['a1@example.com'], false]);

// 4. 남용 막기
check('같은 번호·같은 단지는 7일에 한 번', /7일에 한 번/.test(post(Object.assign({}, base, { phone: PHONE, mode: 'pick', ids: ['A2222222'], agree: true })).err), true);
post(Object.assign({}, base, { k: '11680|대치동|래미안', apt: '래미안', phone: PHONE, mode: 'pick', ids: ['A2222222'], agree: true }));
post(Object.assign({}, base, { k: '11680|도곡동|타워팰리스', apt: '타워팰리스', phone: PHONE, mode: 'pick', ids: ['A2222222'], agree: true }));
check('같은 번호는 하루 3건까지', /하루 3건/.test(post(Object.assign({}, base, { k: '11680|역삼동|역삼', apt: '역삼', phone: PHONE, mode: 'pick', ids: ['A2222222'], agree: true })).err), true);

// 5. 순번 배정 — 공개 규칙(가장 오래전에 순번 문의를 받은 곳부터 2곳)
const T1 = post(Object.assign({}, base, { k: '', apt: '', band: '', phone: '010-2000-0001', mode: 'turn', agree: true }));
const T2 = post(Object.assign({}, base, { k: '', apt: '', band: '', phone: '010-2000-0002', mode: 'turn', agree: true }));
check('순번: 2곳씩 배정', [T1.to.length, T2.to.length], [2, 2]);
check('순번: 첫 배정에서 빠진 곳이 다음 배정에 꼭 들어감', ['A1111111', 'A2222222', 'A3333333'].filter(id => !T1.to.some(x => x.id === id)).every(id => T2.to.some(x => x.id === id)), true);
check('순번 규칙 함수: 받은 지 오래된 곳 먼저, 같으면 무작위 순', T.turnPick([{ id: 'x' }, { id: 'y' }, { id: 'z' }], { x: 300, y: 100 }, 2, () => 0.5).map(a => a.id), ['z', 'y']);
check('순번: 상품(프리미엄)과 무관 — 규칙에 상품 칸을 쓰지 않음', /plan|상품/.test(T.turnPick.toString()), false);

// 6. 암호화
const sealed = T.sealText('01099998888');
check('암호화: 풀면 원래 값', T.openText(sealed), '01099998888');
check('암호화: 한 글자만 바꿔도 못 풂', T.openText(sealed.slice(0, -1) + (sealed.slice(-1) === 'a' ? 'b' : 'a')), '');
check('암호화: 같은 값도 매번 다른 암호문', T.sealText('01099998888') !== sealed, true);

// 7. 중개사 로그인·받은 문의
check('중개사 로그인: 관리코드 틀리면 거절', post({ action: 'agentLogin', reg: '11680-2020-00001', code: 'WRONG' }).ok, false);
const S1 = post({ action: 'agentLogin', reg: '11680-2020-00001', code: 'code1111' });
const S3 = post({ action: 'agentLogin', reg: '11650-2020-00003', code: 'CODE3333' });
const S4 = post({ action: 'agentLogin', reg: '11710-2020-00004', code: 'CODE4444' });
check('중개사 로그인: 세션 발급(64자리)', [S1.ok, /^[0-9a-f]{64}$/.test(S1.s), S1.me.id], [true, true, 'A1111111']);
check('중개사 로그인: 세션 원값은 시트에 없음', allCells().includes(S1.s), false);
check('세션 없으면 받은 문의 못 봄', post({ action: 'agentInbox', s: 'f'.repeat(64) }).code, 'auth');
const I1 = post({ action: 'agentInbox', s: S1.s });
const q1 = I1.leads.find(x => x.id === Q1.id);
check('받은 문의: 받은 중개사는 번호를 봄', [q1.phone, q1.kind, q1.apt, q1.memo, q1.when, q1.step, q1.others], [PH, '매수 문의', '은마', '내년 봄 입주', '평일 저녁', 'new', 1]);
check('받은 문의: 안 받은 중개사(송파)는 그 문의가 안 보임', post({ action: 'agentInbox', s: S4.s }).leads.some(x => x.id === Q1.id), false);
const U1 = post({ action: 'agentLeadUpdate', s: S1.s, id: Q1.id, step: 'contacted' });
check('응답 처리: 연락했어요', [U1.ok, U1.lead.step], [true, 'contacted']);
check('응답 처리: 다른 중개사 진행 상태는 그대로', post({ action: 'agentInbox', s: S3.s }).leads.find(x => x.id === Q1.id).step, 'new');
check('응답 처리: 못 맡아요 누르면 그 중개사 화면에서 번호 숨김', post({ action: 'agentLeadUpdate', s: S3.s, id: Q1.id, step: 'pass' }).lead.phone, '');
check('응답 처리: 받지 않은 문의는 못 바꿈', post({ action: 'agentLeadUpdate', s: S4.s, id: Q1.id, step: 'done' }).ok, false);
check('응답 처리: 없는 상태값 거절', post({ action: 'agentLeadUpdate', s: S1.s, id: Q1.id, step: 'hack' }).ok, false);

// 8. 이용자 취소 링크
check('취소: 열쇠가 틀리면 그대로', /찾지 못했어요/.test(T.leadCancel({ id: Q1.id, t: '0'.repeat(32) }).html), true);
check('취소: 맞는 열쇠면 연락처 삭제', /지웠어요/.test(T.leadCancel({ id: Q1.id, t: Q1.cancel }).html), true);
const q1b = post({ action: 'agentInbox', s: S1.s }).leads.find(x => x.id === Q1.id);
check('취소 뒤: 중개사 화면 번호·메모 사라짐, 상태 취소', [q1b.phone, q1b.mask, q1b.memo, q1b.state], ['', '', '', '취소']);
check('취소 뒤: 시트 암호문도 지움', sheets['중개문의'].rows.find(r => r[0] === Q1.id)[T.AGQC['연락처암호']], '');

// 9. 보관 기간(90일) 지나면 매일 점검에서 지움
{
  const r = sheets['중개문의'].rows.find(x => x[0] === T1.id); r[T.AGQC['삭제예정일']] = vm.runInContext('new Date(Date.now() - 86400000)', ctx);
  T.agentDaily();
  const r2 = sheets['중개문의'].rows.find(x => x[0] === T1.id);
  check('보관 기간 지난 문의: 연락처 지우고 보관 끝', [r2[T.AGQC['연락처암호']], r2[T.AGQC['상태']]], ['', '보관 끝']);
}

// 10. 고객 관심 단지
check('관심: 별칭에 전화번호 넣으면 거절', /전화번호/.test(post({ action: 'watchSave', s: S1.s, alias: '김씨 01012345678', ref: 'a'.repeat(24), keys: [{ k: '11680|대치동|은마|', n: '은마' }] }).err), true);
check('관심: 단지 없으면 거절', post({ action: 'watchSave', s: S1.s, alias: '고객 A', ref: 'a'.repeat(24), keys: [] }).ok, false);
check('관심: 11곳이면 거절', post({ action: 'watchSave', s: S1.s, alias: '고객 A', ref: 'a'.repeat(24), keys: Array.from({ length: 11 }, (_, i) => ({ k: `11680|대치동|단지${i}|`, n: '단지' + i })) }).ok, false);
const W1 = post({ action: 'watchSave', s: S1.s, alias: '고객 A', ref: 'b'.repeat(24), name: '김철수', keys: [{ k: '11680|대치동|은마|', n: '은마' }, { k: '11710|잠실동|엘스|84㎡대', n: '엘스' }], kinds: { trade: true, high: true, drop: true } });
check('관심: 저장 성공', [W1.ok, W1.watches.length, W1.watches[0].alias], [true, 1, '고객 A']);
check('관심: 고객 이름·구분값 원값은 서버에 없음', [allCells().includes('김철수'), allCells().includes('b'.repeat(24))], [false, false]);
check('관심: 다른 중개사에게는 안 보임', post({ action: 'watchList', s: S4.s }).watches.length, 0);

// 11. 새 거래 판정(watchScan)
const today0 = new Date(2026, 10, 21);
const ppySeries = Array(35).fill(0).concat([10000]);                 // 최근 3개월 평당 시세 1억(평당)
const unit = (trades) => ['11680', '대치동', '은마', '84㎡대', 84, 30, ppySeries, '', '316', 1, [], trades, {}];
const tOld = [[20261001, 84, 10, 254000, 0, 0]];
const seed = T.watchScan([unit(tOld)], '11680|대치동|은마|', { seed: 1, f: [] }, today0, {});
check('판정: 첫 점검은 알림 없이 지금 거래만 기억', [seed.events.length, seed.state.f.length], [0, 1]);
const tNew = [[20261110, 84, 15, 280000, 0, 1], [20261105, 84, 3, 220000, 0, 0], [20261103, 84, 2, 150000, 1, 0], [20261102, 84, 8, 255000, 0, 0]].concat(tOld);
const sc = T.watchScan([unit(tNew)], '11680|대치동|은마|', seed.state, today0, {});
check('판정: 신고가·큰 하락(−13.4%)·직거래는 하락 아님·보통 새 거래', sc.events.map(e => [e.kind, e.floor, e.pct]), [['high', 15, 10.2], ['drop', 3, -13.4], ['trade', 2, -41], ['trade', 8, 0.4]]);
check('판정: 한 번 본 거래는 다시 알리지 않음', T.watchScan([unit(tNew)], '11680|대치동|은마|', sc.state, today0, {}).events.length, 0);
check('판정: 끈 종류(새 실거래)는 알리지 않음', T.watchScan([unit(tNew)], '11680|대치동|은마|', seed.state, today0, { trade: false }).events.map(e => e.kind), ['high', 'drop']);
check('판정: 평형을 정하면 다른 평형 거래는 제외', T.watchScan([unit(tNew)], '11680|대치동|은마|59㎡대', { f: [] }, today0, {}).events.length, 0);
check('판정: 150일보다 오래된 계약은 무시', T.watchScan([unit([[20250101, 84, 5, 200000, 0, 0]])], '11680|대치동|은마|', { f: [] }, today0, {}).events.length, 0);

// 12. 매일 점검(agentDaily): 자료 가져와 첫날은 기억만, 다음 날 새 거래 → 알림 시트 + 메일(번호·고객 이름 없음)
priceJson = { '11680': { units: [unit(tOld)] }, '11710': { units: [] } };
mails.length = 0; T.agentDaily();
check('매일 점검: 첫날은 알림 없음', [(sheets['고객알림'] ? sheets['고객알림'].rows.length - 1 : 0), mails.length], [0, 0]);
priceJson['11680'] = { units: [unit(tNew)] };
mails.length = 0; T.agentDaily();
const WL = post({ action: 'watchList', s: S1.s });
check('매일 점검: 새 거래 4건이 대시보드 알림에', [WL.events.length, WL.events.map(e => e.kind).sort()], [4, ['drop', 'high', 'trade', 'trade']]);
check('매일 점검: 중개사 알림 메일 1통(별칭으로), 고객 이름 없음', [mails.length, /고객 A/.test(mails[0].htmlBody), /김철수/.test(mails[0].htmlBody)], [1, true, false]);
check('매일 점검: 구마다 자료 한 번씩만 가져옴', fetched.filter(u => /11680/.test(u)).length, 2);
check('메일 알림 끄기: 다음부터 안 보냄', (() => { post({ action: 'agentPrefs', s: S1.s, set: true, mail: 'me@example.com', on: false }); priceJson['11680'] = { units: [unit([[20261115, 84, 20, 300000, 0, 1]].concat(tNew))] }; mails.length = 0; T.agentDaily(); return mails.length; })(), 0);
check('관심 지우기', post({ action: 'watchRemove', s: S1.s, id: W1.saved }).watches.length, 0);
check('로그아웃 뒤 세션 못 씀', (() => { post({ action: 'agentLogout', s: S1.s }); return post({ action: 'agentInbox', s: S1.s }).code; })(), 'auth');

// 12-2. 알림톡: 아침 브리핑 발송 모듈(solapiSend) 재사용 — 템플릿 키 없으면 건너뜀
check('알림톡: 템플릿 없으면 안 보냄(메일만)', T.sendNotice({ mail: 'x@example.com', kakao: '01011112222' }, { title: 't', lines: ['a'] }), { mail: true, kakao: false });
Object.assign(props, { SOLAPI_API_KEY: 'k', SOLAPI_API_SECRET: 's', SOLAPI_PFID: 'pf', SOLAPI_TPL_AGENT: 'TPL_AG' });
fetched.length = 0;
check('알림톡: 키·템플릿 있으면 solapiSend 로 발송', T.sendNotice({ kakao: '01011112222' }, { title: '새 문의', lines: ['은마'] }).kakao, true);
check('알림톡: 중개사 템플릿·받는 번호', (() => { const m = fetched.find(x => x && x.messages); return m ? [m.messages[0].to, m.messages[0].kakaoOptions.templateId] : null; })(), ['01011112222', 'TPL_AG']);
['SOLAPI_API_KEY', 'SOLAPI_API_SECRET', 'SOLAPI_PFID', 'SOLAPI_TPL_AGENT'].forEach(k => delete props[k]);

// 13. 화면 모듈: assets/lead.js 입력 검사
{
  const LD = require('../assets/lead.js');
  const c = { g: '11680', src: 'report', k: '11680|대치동|은마', apt: '은마' };
  check('lead.js: 동의 문구 판이 서버와 같음', LD.CONSENT_V, T.LEAD_CONSENT_V);
  check('lead.js: 동의 안 하면 못 보냄', LD.payload(c, { kind: 'buy', mode: 'pick', ids: ['A1111111'], phone: PHONE, agree: false }).ok, false);
  check('lead.js: 고른 곳 없으면 못 보냄', LD.payload(c, { kind: 'buy', mode: 'pick', ids: [], phone: PHONE, agree: true }).ok, false);
  check('lead.js: 4곳이면 못 보냄', LD.payload(c, { kind: 'buy', mode: 'pick', ids: ['A1111111', 'A2222222', 'A3333333', 'A4444444'], phone: PHONE, agree: true }, { pick: 3, turn: 2 }).ok, false);
  const p = LD.payload(c, { kind: 'sell', mode: 'turn', ids: ['A1111111'], phone: PHONE, agree: true, memo: '<b>안녕</b>' });
  check('lead.js: 순번이면 ids 비우고 번호 숫자만·꺾쇠 제거', [p.ok, p.body.ids, p.body.phone, p.body.memo, p.body.cv], [true, [], PH, 'b 안녕 /b', T.LEAD_CONSENT_V]);
  check('lead.js: 후보 = 그 구를 고른 중개사', LD.candidates(L0.agents, '11680').map(a => a.id).sort(), ['A1111111', 'A2222222', 'A3333333']);
}

// 14. 적정 가격 근거표 계산: assets/agent-tools-core.js (mine-core 재사용)
{
  global.self = global; require('../assets/mine-core.js');
  const AG = require('../assets/agent-tools-core.js');
  const months = Array.from({ length: 36 }, (_, i) => { const t = 2023 * 12 + 10 + i; return String(Math.floor(t / 12)) + String(t % 12 + 1).padStart(2, '0'); });
  const IX = { months, dataTo: months[35], sgg: { '11680': { name: '강남구', sido: '서울특별시', s: Array(35).fill(0).concat([8000]), c: [] } } };
  const s6 = Array(24).fill(0).concat(Array(11).fill(9000)).concat([10000]);
  const trades = [[20261020, 84, 15, 260000, 0, 1], [20261012, 84, 3, 240000, 0, 0], [20260905, 84, 12, 250000, 0, 0], [20260801, 84, 2, 230000, 0, 0], [20260715, 84, 18, 255000, 0, 0], [20260601, 84, 7, 245000, 1, 0]];
  const u = ['11680', '대치동', '은마', '84㎡대', 84, 30, s6, '0'.repeat(30) + '111111', '316', 1, [], trades, { f: '201206', hi: [260000, 20261020, 84], hi1: [260000, 20261020, 84] }];
  const sh = AG.sheet({ u, IX, fx: { fv: 77, fvg: 64 }, vc: { n: 4, hit: 4, ok: true, where: '서울특별시' }, hist: { cover: '201206' }, ask: 255000 });
  check('근거표: 시세 = 3개월 평당가 1억 × 84㎡ ÷ 3.3058 (100만 단위)', sh.price, Math.round(10000 * 84 / 3.3058 / 100) * 100);
  check('근거표: 1년 변동(평당가 9,000→10,000만)', sh.ch1, 11.1);
  check('근거표: 같은 구 평균 대비(10,000 vs 8,000)', sh.vsGu, 25);
  check('근거표: 최고가·최근 1년 최고가', [sh.hi.amt, sh.hi1.amt], [260000, 260000]);
  check('근거표: 층 정보 있음 + 최근 거래 6건', [sh.hasFloor, sh.trades.length, sh.trades[0].floor], [true, 6, 15]);
  check('근거표: 층별 평당가(직거래 빼고 2건 이상만 값)', sh.floors.map(f => [f.k, f.n, f.ppy > 0]), [['lo', 2, true], ['mid', 2, true], ['hi', 1, false]]);
  check('근거표: 중개사 입력 호가 → 시세·최고가 대비', [sh.ask.amt, sh.ask.vsHi], [255000, -1.9]);
  check('근거표: 호가를 안 넣으면 비움(지어내지 않음)', AG.sheet({ u, IX, fx: null, vc: null }).ask, null);
  check('근거표: 점수 자료 없으면 점수 비움', AG.sheet({ u, IX, fx: null, vc: null }).fv, null);
  check('근거표: 미래가치·과거 성적은 자료 값 그대로', [sh.fv, sh.fvg, sh.vc.hit], [77, 64, 4]);
  const q = AG.encode({ sd: 's00', g: '11680', dong: '대치동', jibun: '316', apt: '은마', band: '84㎡대', ask: 255000, ag: 'A1111111', note: '로열동 기준' });
  check('공유 주소: 되돌리면 같은 값', AG.decode(q), { sd: 's00', g: '11680', dong: '대치동', jibun: '316', apt: '은마', band: '84㎡대', ask: 255000, ag: 'A1111111', note: '로열동 기준' });
  check('공유 주소: 개인 정보 칸 없음(번호·이름)', /phone|name|010/.test(q), false);
  check('한마디: 보장 표현 거절', AG.cleanNote('무조건 오릅니다').ok, false);
  check('한마디: 연락처 거절', AG.cleanNote('문의 010-1234-5678').ok, false);
  check('공유 주소: 보장 표현이 든 한마디는 주소에 안 실림', /n=/.test(AG.encode({ sd: 's00', g: '11680', apt: 'x', note: '확실히 오름' })), false);
  check('별칭 검사: 화면과 서버 규칙 같음', [AG.aliasOk('고객 A').ok, AG.aliasOk('a@b.c').ok, AG.aliasOk('1234567').ok, AG.aliasOk('').ok], [true, false, false, false]);
  const mem = { d: {}, getItem(k) { return this.d[k] || null; }, setItem(k, v) { this.d[k] = v; } };
  const cs = AG.clientStore(mem, 'A1111111'); cs.set('W1', { name: '김철수', ref: 'abc' });
  check('고객 이름: 이 기기 저장소에만(중개사별 칸)', [cs.get('W1').name, Object.keys(mem.d)], ['김철수', ['jdj_agt_clients_A1111111']]);
  check('알림 한 줄', AG.eventLine({ kind: 'drop', n: '은마', d: { band: '84㎡대', floor: 3, amt: 220000, d: 20261105, type: 0, pct: -13.4 } }), '은마 84㎡대 · 3층 · 22억원 · 2026.11.05 계약 · 그 평형 최근 3개월 시세보다 13.4% 낮음');
}

const bad = rows.filter(r => !r.ok);
rows.forEach(r => console.log((r.ok ? 'PASS ' : 'FAIL ') + r.name + (r.ok ? '' : `  got=${JSON.stringify(r.got)} want=${JSON.stringify(r.want)}`)));
console.log(`\n${rows.length - bad.length}/${rows.length} 통과`);
process.exit(bad.length ? 1 : 0);
