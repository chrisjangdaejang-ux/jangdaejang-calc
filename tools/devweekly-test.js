/* 주간 현장 보고서 자동 발송(서버 v34 dwPut) 자동 확인 — 실행: node tools/devweekly-test.js </dev/null
   가짜 구글 시트·드라이브·메일 위에서: 신청 시트 이메일로 발송(제목 형식·PDF 링크·링크가 있는 사람만 보기), 같은 날 두 번 안 보냄,
   해지(다음 달부터)·취소 멈춤, PDF 없음·이메일 아님·발송 실패·신청 행 없음이면 운영자 알림, 기록 시트에 연락처 없음, 8주 지난 PDF 삭제.
   (실제 서버에는 접속하지 않습니다.) */
const fs = require('fs'), vm = require('vm'), path = require('path'), crypto = require('crypto');
let pass = 0, fail = 0;
function check(name, ok, info) { if (ok) pass++; else { fail++; console.log('XX ' + name, info === undefined ? '' : JSON.stringify(info).slice(0, 400)); } }

function makeSheet() {
  const rows = [];
  const sh = { rows, getDataRange: () => ({ getValues: () => rows.map(r => r.slice()) }), getLastRow: () => rows.length, appendRow: r => rows.push(r.slice()),
    deleteRow: i => rows.splice(i - 1, 1), setFrozenRows() {},
    getRange: (r, c, nr, nc) => { const rg = { setValues(v) { v.forEach((line, i) => line.forEach((x, j) => { (rows[r - 1 + i] = rows[r - 1 + i] || [])[c - 1 + j] = x; })); return rg; },
      setValue(x) { (rows[r - 1] = rows[r - 1] || [])[c - 1] = x; return rg; }, getValue: () => (rows[r - 1] || [])[c - 1], getValues: () => [[]],
      setFontWeight: () => rg, setBackground: () => rg, setFontColor: () => rg, setNumberFormat: () => rg }; return rg; } };
  return sh;
}
const sheets = {};
const book = { getSheetByName: n => sheets[n] || null, insertSheet: n => (sheets[n] = makeSheet()), getUrl: () => 'https://docs.google.com/spreadsheets/d/TEST', getSheets: () => Object.values(sheets), deleteSheet() {} };
const props = { BRIEF_PULL_TOKEN: 'pull-FAKE-123' };
const mails = [], drive = [];
let NOW = Date.parse('2026-11-23T07:00:00+09:00'), mailBoom = false;
const RealDate = Date;
class FakeDate extends RealDate { constructor(...a) { if (!a.length) super(NOW); else super(...a); } static now() { return NOW; } }
const mkFile = blob => { const id = 'F' + drive.length; const rec = { id, blob, share: null, trashed: false }; drive.push(rec); return { getId: () => id, setSharing(a, p) { rec.share = a + '/' + p; } }; };
const ctx = {
  console, Date: FakeDate, JSON, Math, Object, Array, String, Number, Boolean, RegExp, Error, isNaN, encodeURIComponent, decodeURIComponent,
  SpreadsheetApp: { getActive: () => book, openById: () => book },
  PropertiesService: { getScriptProperties: () => ({ getProperty: k => props[k] || null, setProperty: (k, v) => { props[k] = v; } }) },
  CacheService: { getScriptCache: () => { const m = new Map(); return { get: k => m.get(k) || null, put: (k, v) => m.set(k, v), remove: k => m.delete(k) }; } },
  LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
  MailApp: { sendEmail: (...a) => { if (mailBoom && typeof a[0] === 'object') throw new Error('Service invoked too many times'); mails.push(a); } },
  Session: { getEffectiveUser: () => ({ getEmail: () => 'owner@example.com' }) },
  ScriptApp: { getProjectTriggers: () => [], newTrigger: () => ({ timeBased: () => ({ everyDays: () => ({ atHour: () => ({ inTimezone: () => ({ create() {} }) }) }) }) }) },
  ContentService: { createTextOutput: s => ({ s, setMimeType() { return this; } }), MimeType: { JSON: 'json' } },
  HtmlService: { createHtmlOutput: s => ({ s }) },
  Utilities: {
    getUuid: () => crypto.randomUUID(),
    formatDate: (d, tz, f) => { const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(d).map(x => [x.type, x.value]));
      return f.replace('yyyy', p.year).replace('MM', p.month).replace('dd', p.day).replace('HH', p.hour === '24' ? '00' : p.hour).replace('mm', p.minute); },
    computeDigest: (alg, s) => Array.from(crypto.createHash('sha256').update(s, 'utf8').digest()).map(b => b > 127 ? b - 256 : b),
    computeHmacSha256Signature: (v, k) => Array.from(crypto.createHmac('sha256', k).update(v).digest()).map(b => b > 127 ? b - 256 : b),
    base64Encode: s => Buffer.from(s).toString('base64'), base64Decode: s => Array.from(Buffer.from(s, 'base64')),
    newBlob: (bytes, type, name) => ({ bytes, type, name }), sleep() {}, DigestAlgorithm: { SHA_256: 'sha256' }, Charset: { UTF_8: 'utf8' }
  },
  DriveApp: { Access: { ANYONE_WITH_LINK: 'any' }, Permission: { VIEW: 'view' }, createFolder: () => ({ getId: () => 'FOLDER1', createFile: mkFile }),
    getFolderById: () => ({ createFile: mkFile }), getFileById: id => ({ setTrashed() { const f = drive.find(x => x.id === id); if (f) f.trashed = true; } }) },
  UrlFetchApp: { fetch() { throw new Error('no network'); } }
};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, 'agent-backend.gs'), 'utf8') + '\n;globalThis.__T = { AQH, AQC, SH_AQ, SH_DW, DWH, DWC, dwStatus };', ctx);
const T = ctx.__T;
const post = b => JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify(b) } }).s);

const aq = sheets[T.SH_AQ] = makeSheet(); aq.appendRow(T.AQH);
function addApp(id, contact, st, day, remail) { const r = []; r[T.AQC['보고서 이메일']] = remail || ''; r[T.AQC['id']] = id; r[T.AQC['회사명']] = '가나분양대행'; r[T.AQC['담당자']] = '김담당'; r[T.AQC['연락처']] = contact;
  r[T.AQC['관심상품']] = '주간 현장 보고서(기본)'; r[T.AQC['처리상태']] = st || '진행'; r[T.AQC['처리일']] = day || ''; aq.appendRow(T.AQH.map((h, i) => r[i] === undefined ? '' : r[i])); }
addApp('AQ1A2B3C4D', 'agency@example.com');
addApp('AQ00000011', 'cancel@example.com', '해지', new RealDate('2026-11-10T10:00:00+09:00'));
addApp('AQ00000012', 'stop@example.com', '취소');
addApp('AQ00000013', 'nodate@example.com', '해지', '');
addApp('AQ00000014', '010-1234-5678');
addApp('AQ00000015', '010-9999-8888', '', '', 'report@company.co.kr');
addApp('AQ00000016', 'contact@company.co.kr', '', '', 'report@company.co.kr');
const PDF = Buffer.from('%PDF-1.4 fake').toString('base64');
const put = (o) => post(Object.assign({ action: 'dwPut', k: 'pull-FAKE-123', date: '2026-11-23', site: '중화역 라온프라이빗 센트로', lines: ['첫 보고서라 지난주와 견줄 기록이 없습니다.', '전용 60~85㎡: 분양가 3.3㎡당 5,246만 원'], b64: PDF }, o));
const owner = () => mails.filter(m => m[0] === 'owner@example.com');

// 권한·형식
check('토큰 없으면 거절', put({ k: 'wrong', aq: 'AQ1A2B3C4D' }).err === 'auth');
check('신청 id 형식이 아니면 거절', put({ aq: 'kim@example.com' }).err === 'bad');

// 정상 발송
let r = put({ aq: 'AQ1A2B3C4D' });
const m = mails.find(x => typeof x[0] === 'object');
check('발송: 신청 시트 이메일로 1통', r.ok && r.sent && m && m[0].to === 'agency@example.com', [r, m && m[0].to]);
check('제목: [현장 이름] 주간 현장 보고서 · M/D', m && m[0].subject === '[중화역 라온프라이빗 센트로] 주간 현장 보고서 · 11/23', m && m[0].subject);
check('본문: 요약 줄 + PDF 링크(드라이브)', m && m[0].htmlBody.includes('전용 60~85㎡: 분양가 3.3㎡당 5,246만 원') && /https:\/\/drive\.google\.com\/file\/d\/F0\/view/.test(m[0].body) && m[0].body.includes('다음 달부터 멈춰요'));
check('드라이브: 링크가 있는 사람만 보기, PDF 이름에 현장·날짜', drive[0].share === 'any/view' && drive[0].blob.name === '중화역 라온프라이빗 센트로_주간현장보고서_2026-11-23.pdf', drive[0]);
const log = sheets[T.SH_DW].rows;
check('기록 시트: 보냄 한 줄, 연락처 없음', log.length === 2 && log[1][T.DWC['결과']] === '보냄' && !JSON.stringify(log).includes('@'), log);
const n1 = mails.length;
r = put({ aq: 'AQ1A2B3C4D' });
check('같은 신청·같은 날짜는 다시 보내지 않음', r.ok && !r.sent && r.why === 'already' && mails.length === n1, r);

// 해지·취소
r = put({ aq: 'AQ00000011' });
check('해지: 처리일이 속한 달(11월)까지는 보냄', r.sent === true && mails.some(x => x[0].to === 'cancel@example.com'), r);
NOW = Date.parse('2026-12-07T07:00:00+09:00');
let before = mails.length;
r = put({ aq: 'AQ00000011', date: '2026-12-07' });
check('해지: 다음 달(12월)부터 안 보냄', r.ok && !r.sent && r.why === '해지' && mails.length === before, r);
r = put({ aq: 'AQ00000012', date: '2026-12-07' });
check('취소: 바로 안 보냄', !r.sent && r.why === '취소' && mails.length === before, r);
r = put({ aq: 'AQ00000013', date: '2026-12-07' });
check('해지인데 처리일이 없으면 바로 멈춤', !r.sent && /처리일 없음/.test(r.why) && mails.length === before, r);
check('해지·취소 업체 주소로는 12월 메일 없음', !mails.slice(n1).some(x => typeof x[0] === 'object' && x[0].subject.endsWith('12/7')));

// 실패 → 운영자 알림
let o0 = owner().length;
r = put({ aq: 'AQ1A2B3C4D', date: '2026-12-07', b64: undefined, fail: '공고 상세 파일이 없습니다' });
check('PDF 못 만듦(엔진 fail) → 운영자 알림, 업체엔 안 보냄', r.ok && !r.sent && owner().length === o0 + 1 && /PDF 못 만듦/.test(owner().slice(-1)[0][1]) && !mails.some(x => typeof x[0] === 'object' && x[0].subject.endsWith('12/7')), owner().slice(-1));
o0 = owner().length;
r = put({ aq: 'AQ1A2B3C4D', date: '2026-12-08', b64: '' });
check('PDF가 비었으면 → 운영자 알림', r.err === 'size' && owner().length === o0 + 1);
o0 = owner().length;
r = put({ aq: 'AQ00000014', date: '2026-12-07' });
check('[연락처]가 이메일이 아니면 → 운영자 알림(알림에도 전화번호 원문 없음)', r.err === 'no-email' && owner().length === o0 + 1 && !owner().slice(-1)[0][2].includes('010-1234-5678'), owner().slice(-1));
o0 = owner().length;
r = put({ aq: 'AQ99999999', date: '2026-12-07' });
check('신청 행이 없으면 → 운영자 알림', r.err === 'no-row' && owner().length === o0 + 1);
o0 = owner().length; mailBoom = true;
r = put({ aq: 'AQ1A2B3C4D', date: '2026-12-09' });
mailBoom = false;
check('메일 발송 실패 → 운영자 알림·기록 "발송 실패"', !r.ok && r.err === 'mail' && owner().length === o0 + 1 && sheets[T.SH_DW].rows.some(x => x[T.DWC['결과']] === '발송 실패'), r);
r = put({ aq: 'AQ1A2B3C4D', date: '2026-12-09' });
check('발송 실패한 날짜는 다시 돌리면 보냄', r.sent === true, r);

r = put({ aq: 'AQ00000015', date: '2026-12-07' });
check('[보고서 이메일]이 있으면 그 주소로(연락처가 전화번호여도)', r.sent === true && mails.some(x => x[0].to === 'report@company.co.kr' && x[0].subject.endsWith('12/7')), r);
before = mails.length; r = put({ aq: 'AQ00000016', date: '2026-12-07' });
check('[보고서 이메일]이 [연락처]보다 먼저', r.sent === true && mails.length === before + 1 && mails.slice(-1)[0][0].to === 'report@company.co.kr', mails.slice(-1));
// 8주 지난 PDF 삭제
NOW = Date.parse('2027-02-01T07:00:00+09:00');
r = put({ aq: 'AQ1A2B3C4D', date: '2027-02-01' });
check('8주 지난 보고서 파일은 휴지통·줄 삭제', r.sent && drive[0].trashed === true && !sheets[T.SH_DW].rows.some(x => String(x[T.DWC['날짜']]) === '2026-11-23'), drive.slice(0, 2));
check('서버 코드에 업체 이메일을 받는 칸이 없음(엔진은 신청 id만 보냄)', !/b\.(to|email|contact)\b/.test(fs.readFileSync(path.join(__dirname, 'agent-backend.gs'), 'utf8').split('function dwPut')[1].split('\n}\n')[0]));

console.log(`\n주간 현장 보고서 자동 발송: ${pass}개 맞음, ${fail}개 틀림`);
process.exit(fail ? 1 : 0);
