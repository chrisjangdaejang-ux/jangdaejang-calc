/* v53 메일 보내는 곳(MAIL_PROVIDER) 자동 검증 — 실행: node tools/mail-provider-test.js
   가짜 UrlFetchApp(Amazon SES 응답 흉내)·MailApp·시트 위에서: 기본은 지메일 그대로 → 키가 다 있을 때만 SES → AWS 서명(SigV4) 값 →
   429·5xx 다시 시도 → 실패하면 지메일로 대신(한도까지) → 계속 실패하면 이번 실행은 지메일만 → 모아 보내기(초당 한도) → 한도 점검·09:07 용량 줄 → 반송·스팸 신고 알림.
   (실제 AWS 에는 접속하지 않습니다.) */
const fs = require('fs'), vm = require('vm'), path = require('path'), crypto = require('crypto');

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
        getValues() { const out = []; for (let i = 0; i < (nr || 1); i++) out.push((rows[r - 1 + i] || []).slice(c - 1, c - 1 + (nc || 1))); return out; },
        setFontWeight() { return rg; }, setBackground() { return rg; }, setFontColor() { return rg; }, setNumberFormat() { return rg; }
      };
      return rg;
    }
  };
  return sh;
}
const sheets = {};
const book = { getSheetByName: n => sheets[n] || null, insertSheet: n => (sheets[n] = makeSheet()), getUrl: () => 'https://docs.google.com/spreadsheets/d/TEST', getSheets: () => Object.values(sheets), deleteSheet() {} };
let props = {};
const cacheMap = new Map(), mails = [], reqs = [], sleeps = [];
let gmailQuota = 100;
const signed = a => a.map(b => b > 127 ? b - 256 : b);
const buf = v => Array.isArray(v) ? Buffer.from(v.map(b => b & 255)) : Buffer.from(String(v), 'utf8');

/* 가짜 SES: plan 에 응답 코드를 차례로 넣어 두면 그대로, 비면 200 */
let plan = [], account = { Max24HourSend: 50000, SentLast24Hours: 1200, MaxSendRate: 14 }, prod = true, accountCode = 200;
function resp(code, j, hdr) { return { getResponseCode: () => code, getContentText: () => JSON.stringify(j), getHeaders: () => hdr || {} }; }
function sesAnswer(q) {
  reqs.push(q);
  if (/\/v2\/email\/account$/.test(q.url)) return accountCode === 200 ? resp(200, { SendQuota: account, ProductionAccessEnabled: prod, EnforcementStatus: 'HEALTHY' }) : resp(accountCode, { message: 'x' });
  if (/sns\.[a-z0-9-]+\.amazonaws\.com/.test(q.url)) return resp(200, {});
  const code = plan.length ? plan.shift() : 200;
  if (code === 'throw') throw new Error('Address unavailable');
  if (code === 200) return resp(200, { MessageId: 'm' + reqs.length });
  const type = code === 4001 ? 'MessageRejected' : code === 429 ? 'TooManyRequestsException' : code >= 500 ? 'InternalFailure' : 'AccountSuspendedException';
  return resp(code === 4001 ? 400 : code, { message: code === 4001 ? 'Illegal address' : 'nope' }, { 'x-amzn-ErrorType': type + ':http://x' });
}
const ctx = {
  console, Date, JSON, Math, Object, Array, String, Number, Boolean, RegExp, Error, isNaN, encodeURIComponent, decodeURIComponent,
  SpreadsheetApp: { getActive: () => book, openById: () => book },
  PropertiesService: { getScriptProperties: () => ({ getProperty: k => (k in props ? props[k] : null), setProperty: (k, v) => { props[k] = v; } }) },
  CacheService: { getScriptCache: () => ({ get: k => cacheMap.has(k) ? cacheMap.get(k) : null, put: (k, v) => cacheMap.set(k, v), remove: k => cacheMap.delete(k) }) },
  LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
  MailApp: { sendEmail: (...a) => { if (gmailQuota <= 0) throw new Error('Service invoked too many times for one day: email.'); gmailQuota--; mails.push(a); }, getRemainingDailyQuota: () => gmailQuota },
  Session: { getEffectiveUser: () => ({ getEmail: () => 'owner@example.com' }) },
  ScriptApp: { getProjectTriggers: () => [], getService: () => ({ getUrl: () => 'https://script.google.com/macros/s/TEST/exec' }) },
  ContentService: { createTextOutput: s => ({ s, setMimeType() { return this; } }), MimeType: { JSON: 'json' } },
  HtmlService: { createHtmlOutput: s => ({ s }) },
  Utilities: {
    getUuid: () => crypto.randomUUID(),
    formatDate: (d, tz, f) => {
      const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })
        .formatToParts(d).map(x => [x.type, x.value]));
      return f.replace('yyyy', p.year).replace('MM', p.month).replace('dd', p.day).replace('HH', p.hour === '24' ? '00' : p.hour).replace('mm', p.minute);
    },
    newBlob: s => ({ getBytes: () => signed(Array.from(Buffer.from(String(s), 'utf8'))) }),
    computeDigest: (alg, v) => signed(Array.from(crypto.createHash('sha256').update(buf(v)).digest())),
    computeHmacSha256Signature: (v, k) => signed(Array.from(crypto.createHmac('sha256', buf(k)).update(buf(v)).digest())),
    base64Encode: (s) => Buffer.from(String(s), 'utf8').toString('base64'),
    sleep: ms => { sleeps.push(ms); }, DigestAlgorithm: { SHA_256: 'sha256' }, Charset: { UTF_8: 'utf8' }
  },
  UrlFetchApp: {
    fetch: (url, q) => sesAnswer(Object.assign({}, q, { url })),
    fetchAll: qs => { fetchAllSizes.push(qs.length); return qs.map(q => { try { return sesAnswer(q); } catch (e) { throw e; } }); }
  }
};
const fetchAllSizes = [];
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, 'agent-backend.gs'), 'utf8')
  + '\n;globalThis.__T = { mailCfg, mailSend, mailBatchBegin, mailBatchEnd, mailLeftNow, mailProvInfo, sesSign, sesHmac, sesFrom, sesBody, hex, capStatus, mailLeft, MAIL_RT, SH_BL, SH_MX, hashOf, briefMail };', ctx);
const T = ctx.__T;

let pass = 0, fail = 0;
function check(name, cond, extra) { if (cond) pass++; else { fail++; console.log('  실패:', name, extra !== undefined ? JSON.stringify(extra).slice(0, 400) : ''); } }
function reset(p) {
  props = Object.assign({}, p || {}); mails.length = 0; reqs.length = 0; sleeps.length = 0; fetchAllSizes.length = 0; plan = []; gmailQuota = 100; accountCode = 200; prod = true;
  account = { Max24HourSend: 50000, SentLast24Hours: 1200, MaxSendRate: 14 };
  Object.assign(T.MAIL_RT, { q: null, sent: 0, fails: 0, down: false, last: 0, supp: null, acc: null });
  Object.keys(sheets).forEach(k => delete sheets[k]); cacheMap.clear();
}
const SES = { MAIL_PROVIDER: 'ses', MAIL_API_KEY: 'AKIDEXAMPLE', MAIL_API_SECRET: 'wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY', MAIL_FROM: 'brief@zipyebo.com', MAIL_FROM_NAME: '집예보' };
const MSG = { to: 'a@naver.com', name: '집예보', subject: '(광고) [집예보] 11/25 집예보 모닝 브리핑 — 송파구', htmlBody: '<p>본문</p><a href="https://x/manage/">수신 거부</a>', unsub: 'https://chrisjangdaejang-ux.github.io/jangdaejang-calc/brief/manage/' };
const sends = () => reqs.filter(q => /outbound-emails$/.test(q.url));
const blRows = () => (sheets[T.SH_BL] ? sheets[T.SH_BL].rows.slice(1) : []);

// 1. 기본(속성 없음) = 지메일 그대로, 인터넷 안 씀
reset();
check('기본: MAIL_PROVIDER 없으면 gmail', T.mailCfg().prov === 'gmail');
let r = T.mailSend(Object.assign({}, MSG));
check('기본: MailApp 으로 한 통, 서비스 호출 없음', mails.length === 1 && reqs.length === 0 && r.via === 'gmail');
check('기본: MailApp 에는 지금과 같은 칸만(unsub 빠짐)', !('unsub' in mails[0][0]) && mails[0][0].subject === MSG.subject && mails[0][0].htmlBody === MSG.htmlBody && mails[0][0].name === '집예보');
check('기본: 한도 점검은 지메일 남은 수', T.mailLeftNow() === 99 && T.mailProvInfo() === null);
reset({ MAIL_PROVIDER: 'gmail', MAIL_API_KEY: 'x', MAIL_API_SECRET: 'y', MAIL_FROM: 'a@b.co' });
T.mailSend(Object.assign({}, MSG));
check("'gmail' 이면 키가 있어도 지메일", mails.length === 1 && reqs.length === 0);
reset(Object.assign({}, SES, { MAIL_API_SECRET: '' }));
T.mailSend(Object.assign({}, MSG));
check("'ses' 라도 비밀 키가 없으면 지메일(안전하게)", mails.length === 1 && reqs.length === 0 && T.mailCfg().prov === 'gmail');
reset(Object.assign({}, SES, { MAIL_FROM: 'not-an-address' }));
check("'ses' 라도 보내는 주소가 이상하면 지메일", T.mailCfg().prov === 'gmail');
reset({ MAIL_PROVIDER: 'gmail' });
let threw = false; gmailQuota = 0; try { T.mailSend(Object.assign({}, MSG)); } catch (e) { threw = true; }
check('기본: 지메일 실패는 지금처럼 오류를 던짐(호출한 곳의 try/catch 가 처리)', threw);

// 2. AWS 서명(SigV4): 공개 예시 값으로 서명 키 만들기 + 서명 전체를 따로 계산한 값과 비교
{
  let k = T.sesHmac(ctx.Utilities.newBlob('AWS4wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY').getBytes(), '20120215');
  k = T.sesHmac(k, 'us-east-1'); k = T.sesHmac(k, 'iam'); k = T.sesHmac(k, 'aws4_request');
  check('서명 키 만들기(AWS 문서 예시 값과 같음)', T.hex(k) === 'f4780e2d9f65fa895f9c67b32ce1baf0b0d8a43505a000a1a9e090d414db404d', T.hex(k));
  const c = Object.assign(T.mailCfg(), { key: 'AKIDEXAMPLE', secret: 'wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY', region: 'ap-northeast-2' });
  const body = Buffer.from(JSON.stringify({ a: '한글' }), 'utf8');
  const h = T.sesSign(c, 'POST', '/v2/email/outbound-emails', signed(Array.from(body)), '20261125T053000Z');
  const H = (s, k2) => crypto.createHmac('sha256', k2).update(s).digest();
  const sha = b => crypto.createHash('sha256').update(b).digest('hex');
  const creq = ['POST', '/v2/email/outbound-emails', '', 'host:email.ap-northeast-2.amazonaws.com', 'x-amz-date:20261125T053000Z', '', 'host;x-amz-date', sha(body)].join('\n');
  const sts = ['AWS4-HMAC-SHA256', '20261125T053000Z', '20261125/ap-northeast-2/ses/aws4_request', sha(Buffer.from(creq))].join('\n');
  const key = H('aws4_request', H('ses', H('ap-northeast-2', H('20261125', 'AWS4' + c.secret))));
  const want = `AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE/20261125/ap-northeast-2/ses/aws4_request, SignedHeaders=host;x-amz-date, Signature=${H(sts, key).toString('hex')}`;
  check('요청 서명(한글 본문 포함)이 직접 계산한 값과 같음', h.Authorization === want && h['X-Amz-Date'] === '20261125T053000Z', h);
}

// 3. SES 켜짐: 한 통 보내기 — 주소·본문·제목 (광고)·수신 거부·보내는 이름
reset(SES);
r = T.mailSend(Object.assign({}, MSG));
const q0 = sends()[0], b0 = q0 && JSON.parse(Buffer.from(q0.payload.map(x => x & 255)).toString('utf8'));
check('SES: 서울 리전 v2 주소로 POST, MailApp 안 씀', r.ok && r.via === 'ses' && q0.url === 'https://email.ap-northeast-2.amazonaws.com/v2/email/outbound-emails' && q0.method === 'post' && mails.length === 0, q0 && q0.url);
check('SES: 키는 Authorization 머리글로만(본문·주소에 없음)', /Credential=AKIDEXAMPLE\//.test(q0.headers.Authorization) && JSON.stringify(b0).indexOf(SES.MAIL_API_SECRET) < 0 && q0.url.indexOf('AKID') < 0);
check('SES: 제목 (광고) 그대로·본문 수신 거부 링크 그대로', b0.Content.Simple.Subject.Data === MSG.subject && b0.Content.Simple.Body.Html.Data === MSG.htmlBody && /수신 거부/.test(b0.Content.Simple.Body.Html.Data));
check('SES: List-Unsubscribe 머리글(구독 관리 주소)', JSON.stringify(b0.Content.Simple.Headers) === JSON.stringify([{ Name: 'List-Unsubscribe', Value: '<' + MSG.unsub + '>' }]));
check('SES: 한글 보내는 이름은 =?UTF-8?B?…?= 로', b0.FromEmailAddress === '=?UTF-8?B?' + Buffer.from('집예보').toString('base64') + '?= <brief@zipyebo.com>' && b0.Destination.ToAddresses[0] === 'a@naver.com', b0.FromEmailAddress);
check('SES: 영문 이름은 따옴표', T.sesFrom(Object.assign(T.mailCfg(), { fromName: 'Zipyebo' })) === '"Zipyebo" <brief@zipyebo.com>');
check('SES: 받는 사람 답장 주소·구성 세트(속성 있을 때만)', (() => { props.MAIL_REPLY_TO = 'chris938@naver.com'; props.MAIL_SES_CONFIG_SET = 'zy'; const b = T.sesBody(T.mailCfg(), MSG); delete props.MAIL_REPLY_TO; delete props.MAIL_SES_CONFIG_SET; return b.ReplyToAddresses[0] === 'chris938@naver.com' && b.ConfigurationSetName === 'zy'; })());

// 4. 429 → 다시 시도해서 성공
reset(SES); plan = [429, 200];
r = T.mailSend(Object.assign({}, MSG));
check('429: 쉬었다 다시 보내 성공(지메일 안 씀)', r.ok && r.via === 'ses' && sends().length === 2 && mails.length === 0 && sleeps.some(ms => ms >= 1000), { n: sends().length, sleeps });
// 5. 5xx 세 번 → 지메일로 대신 + 발송기록
reset(SES); plan = [500, 503, 502];
r = T.mailSend(Object.assign({}, MSG));
check('5xx 세 번: 지메일로 대신 보냄', r.ok && r.via === 'gmail-fallback' && sends().length === 3 && mails.length === 1 && !('unsub' in mails[0][0]), r);
check("5xx: '발송기록' 시트에 실패·대신 보냄(주소는 가림)", blRows().some(x => /메일 서비스 실패\(ses 50\d/.test(x[3]) && /지메일로 대신/.test(x[3]) && /a\*\*\*@naver\.com/.test(x[3]) && !/a@naver/.test(x[3])), blRows());
// 6. 연결 오류도 다시 시도
reset(SES); plan = ['throw', 200];
r = T.mailSend(Object.assign({}, MSG));
check('연결 오류: 다시 시도해서 성공', r.ok && r.via === 'ses', r);
// 7. 지메일 한도도 없으면 못 보냄 — 오류를 던져 호출한 곳이 '못 보냄' 처리
reset(SES); plan = [500, 500, 500]; gmailQuota = 5;
threw = false; try { T.mailSend(Object.assign({}, MSG)); } catch (e) { threw = /지메일 한도 없음/.test(e.message); }
check('지메일 예비 5통은 대표 알림 몫으로 남김 → 못 보냄(오류)', threw && mails.length === 0 && blRows().some(x => /지메일 하루 한도도 없어/.test(x[3])));
// 8. 계정 문제(400 AccountSuspended) 세 번 연속 → 이번 실행은 지메일로만
reset(SES); plan = [400, 400, 400];
for (let i = 0; i < 4; i++) T.mailSend(Object.assign({}, MSG, { to: `u${i}@daum.net` }));
check('연속 3번 실패 → 서비스 멈춤, 4번째는 서비스에 묻지도 않고 지메일', T.MAIL_RT.down && sends().length === 3 && mails.length === 4 && blRows().some(x => /3번 연달아 실패/.test(x[3])), { s: sends().length, m: mails.length });
// 9. 주소 문제(MessageRejected Illegal address)는 연속 실패로 세지 않음
reset(SES); plan = [4001, 4001, 4001, 4001];
for (let i = 0; i < 4; i++) T.mailSend(Object.assign({}, MSG, { to: `bad${i}@x.kr` }));
check('주소 문제는 서비스 멈춤으로 안 셈(다시 시도도 안 함)', !T.MAIL_RT.down && sends().length === 4 && T.MAIL_RT.fails === 0, { s: sends().length, f: T.MAIL_RT.fails });

// 10. 모아 보내기: 25통, 초당 14 → 14 + 11 묶음, 묶음 사이 1초 쉼, 결과는 콜백으로
reset(SES);
T.mailBatchBegin();
const got = [];
for (let i = 0; i < 25; i++) T.mailSend(Object.assign({}, MSG, { to: `s${i}@gmail.com` }), x => got.push(x));
check('모아 보내기: 묶음이 차면 바로 보냄(14통)', fetchAllSizes[0] === 14 && got.length === 14, fetchAllSizes);
T.mailBatchEnd();
check('모아 보내기: 끝에 남은 11통', JSON.stringify(fetchAllSizes) === '[14,11]' && got.length === 25 && got.every(x => x.ok && x.via === 'ses') && mails.length === 0, fetchAllSizes);
check('모아 보내기: 묶음 사이 쉼(초당 한도)', sleeps.length >= 1);
reset(Object.assign({}, SES, { MAIL_RATE: '5' }));
T.mailBatchBegin(); for (let i = 0; i < 12; i++) T.mailSend(Object.assign({}, MSG, { to: `t${i}@gmail.com` }), () => {}); T.mailBatchEnd();
check('MAIL_RATE 로 초당 수 줄이기(5)', JSON.stringify(fetchAllSizes) === '[5,5,2]', fetchAllSizes);
reset(SES); plan = [200, 500, 200, 500, 500];   // 묶음 3통 중 2번째만 5xx → 그 한 통만 다시
T.mailBatchBegin(); const g2 = []; for (let i = 0; i < 3; i++) T.mailSend(Object.assign({}, MSG, { to: `w${i}@gmail.com` }), x => g2.push(x)); T.mailBatchEnd();
check('묶음 안에서 실패한 것만 다시 → 끝내 안 되면 그 한 통만 지메일', g2.filter(x => x.via === 'ses').length === 2 && g2.filter(x => x.via === 'gmail-fallback').length === 1 && mails.length === 1, g2);
reset({});
T.mailBatchBegin(); const g3 = []; T.mailSend(Object.assign({}, MSG), x => g3.push(x)); T.mailBatchEnd();
check('지메일이면 모아 보내기 중에도 바로 한 통(지금과 같음)', mails.length === 1 && g3.length === 1 && g3[0].via === 'gmail');

// 11. 서비스 하루 한도가 바닥이면 지메일로
reset(SES); account = { Max24HourSend: 200, SentLast24Hours: 200, MaxSendRate: 1 }; prod = false;
r = T.mailSend(Object.assign({}, MSG));
check('SES 하루 한도 다 씀 → 서비스 안 부르고 지메일', r.via === 'gmail-fallback' && sends().length === 0 && mails.length === 1, r);

// 12. 한도 점검·09:07 용량 줄
reset(SES);
check('한도 점검: SES 남은 수(50,000-1,200) + 지메일 예비(100-5)', T.mailLeftNow() === 48800 + 95, T.mailLeftNow());
let pv = T.mailProvInfo();
check('용량: 서비스 이름·하루 한도·남은 수·초당·정식(시험 모드 아님)', pv.name === 'Amazon SES' && pv.max === 50000 && pv.left === 48800 && pv.rate === 14 && pv.sandbox === false && pv.region === 'ap-northeast-2', pv);
sheets['브리핑구독'] = makeSheet();
let cap = T.capStatus(new Date());
check('용량(briefAreas cap): 켜져 있으면 mailMax·mailLeft 가 서비스 값 + prov·지메일 예비', cap.mailMax === 50000 && cap.mailLeft === 48800 && cap.prov && cap.prov.gmailMax === 100 && cap.prov.gmailLeft === 100, cap);
reset(SES); accountCode = 403;
pv = T.mailProvInfo();
check('용량: 계정 한도를 못 읽으면 err(엔진이 경고) · 한도 점검은 지메일 남은 수', pv.err === true && T.mailLeftNow() === 100 && T.mailLeft() === null, pv);
reset(SES); prod = false; account = { Max24HourSend: 200, SentLast24Hours: 3, MaxSendRate: 1 };
check('용량: 시험 모드(샌드박스) 표시', T.mailProvInfo().sandbox === true);
reset({});
sheets['브리핑구독'] = makeSheet();
cap = T.capStatus(new Date());
check('용량: 지메일이면 지금과 같은 모양(prov 없음, 하루 100)', cap.mailMax === 100 && cap.mailLeft === 100 && !('prov' in cap), cap);

// 13. 반송·스팸 신고(선택)
reset(Object.assign({}, SES, { MAIL_HOOK_TOKEN: 'hook-secret-123' }));
const hook = (tok, body) => JSON.parse(ctx.doPost({ parameter: { mailhook: tok }, postData: { contents: JSON.stringify(body) } }).s);
check('알림: 토큰이 틀리면 거절', hook('wrong', { Type: 'Notification' }).err === 'auth');
r = hook('hook-secret-123', { Type: 'SubscriptionConfirmation', MessageId: 'c1', TopicArn: 'arn:aws:sns:ap-northeast-2:1:zy', SubscribeURL: 'https://sns.ap-northeast-2.amazonaws.com/?Action=ConfirmSubscription&Token=t' });
check('알림: SNS 구독 확인 주소를 한 번 엶', r.confirmed && reqs.some(q => /sns\.ap-northeast-2\.amazonaws\.com/.test(q.url)));
check('알림: 이상한 확인 주소는 열지 않음', hook('hook-secret-123', { Type: 'SubscriptionConfirmation', MessageId: 'c2', SubscribeURL: 'https://evil.example.com/' }).err === 'topic');
const note = (id, n) => hook('hook-secret-123', { Type: 'Notification', MessageId: id, Message: JSON.stringify(n) });
note('n1', { notificationType: 'Bounce', bounce: { bounceType: 'Permanent', bounceSubType: 'NoEmail', bouncedRecipients: [{ emailAddress: 'Gone@Hanmail.net' }] } });
note('n2', { notificationType: 'Complaint', complaint: { complainedRecipients: [{ emailAddress: 'angry@naver.com' }] } });
note('n3', { notificationType: 'Bounce', bounce: { bounceType: 'Transient', bouncedRecipients: [{ emailAddress: 'full@gmail.com' }] } });
check('알림: 같은 알림이 다시 오면 한 번만', note('n1', {}).dup === true);
const mx = sheets[T.SH_MX] ? sheets[T.SH_MX].rows.slice(1) : [];
check("알림: 영구 반송·스팸 신고만 '메일수신불가'(주소 원문 없음)", mx.length === 2 && mx.every(x => !/@hanmail\.net$|angry@/.test(x[1]) && /\*\*\*/.test(x[3])) && mx.map(x => x[2]).join() === '반송(영구),스팸 신고', mx);
check("알림: '발송기록' 시트에 반송·신고·일시 반송 기록", ['반송(영구)', '스팸 신고', '반송(일시)'].every(k => blRows().some(x => x[3].indexOf(k) === 0)));
T.MAIL_RT.supp = null;
threw = false; try { T.mailSend(Object.assign({}, MSG, { to: 'gone@hanmail.net' })); } catch (e) { threw = /받을 수 없는 주소/.test(e.message); }
check('알림: 반송된 주소는 다시 보내지 않음(지메일 대신 보내기도 안 함)', threw && sends().length === 0 && mails.length === 0);
r = T.mailSend(Object.assign({}, MSG, { to: 'full@gmail.com' }));
check('알림: 일시 반송 주소는 계속 보냄', r.ok && r.via === 'ses');
reset({ MAIL_HOOK_TOKEN: '' });
check('알림: 토큰을 안 넣었으면 꺼져 있음', hook('', { Type: 'x' }).err === 'unknown' || hook('x', {}).err === 'auth');

// 14. 모닝 브리핑 메일(briefMail)이 같은 길로 — 지메일이면 지금과 같은 칸, SES 면 List-Unsubscribe
reset({});
const S = { product: '모닝 브리핑', start: '2026-11-21', end: '2026-12-20', id: 'B1' };
const P1 = [{ nm: '송파구', n: 2, hi: 1, fact: '사실', items: [], pro: [], url: 'https://x/brief/?g=11710' }];
T.briefMail('me@example.com', '2026-11-25', P1, S, false, null, {}, '', { id: 'AD1', title: '광고', desc: 'd', url: 'https://ad.example.com/' }, '');
check('브리핑(지메일): 칸 4개 그대로 · 광고 날 제목 (광고)', mails.length === 1 && Object.keys(mails[0][0]).sort().join() === 'htmlBody,name,subject,to' && /^\(광고\) \[집예보\]/.test(mails[0][0].subject), mails[0] && Object.keys(mails[0][0]));
reset(SES);
T.briefMail('me@example.com', '2026-11-25', P1, S, false, null, {}, '', null, '');
const bb = JSON.parse(Buffer.from(sends()[0].payload.map(x => x & 255)).toString('utf8'));
check('브리핑(SES): 광고 없는 날 제목에 (광고) 없음 · 구독 관리 링크 · List-Unsubscribe', !/\(광고\)/.test(bb.Content.Simple.Subject.Data) && /manage\//.test(bb.Content.Simple.Body.Html.Data) && /brief\/manage\/>$/.test(bb.Content.Simple.Headers[0].Value), bb.Content.Simple.Headers);

console.log(`메일 보내는 곳(MAIL_PROVIDER) 검증: ${pass}개 통과, ${fail}개 실패`);
process.exit(fail ? 1 : 0);
