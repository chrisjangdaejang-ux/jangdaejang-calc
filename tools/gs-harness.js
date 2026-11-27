/* 서버(tools/agent-backend.gs)를 가짜 시트·메일·공개 자료 위에서 돌리는 시험 도구 — tools/cal-test.js · tools/predict-test.js 가 씀.
   실제 서버·구글 계정에는 접속하지 않아요. 사용: const E = require('./gs-harness')({ now: '2026-11-30T07:10:00+09:00', data: { 'quiz/week.json': {...} } }) */
'use strict';
const fs = require('fs'), vm = require('vm'), path = require('path'), crypto = require('crypto');
const ROOT = path.join(__dirname, '..');
module.exports = function makeEnv(o) {
  o = o || {};
  let gs = fs.readFileSync(path.join(ROOT, 'tools', 'agent-backend.gs'), 'utf8');
  if (o.patch) gs = o.patch(gs);                         // 시험용으로 상수 하나를 바꿀 때(예: 유료 열림)
  function makeSheet() {
    const rows = [];
    const sh = { rows, getDataRange() { return { getValues: () => rows.map(r => r.slice()) }; }, getLastRow() { return rows.length; },
      appendRow(r) { rows.push(r.slice()); }, deleteRow(i) { rows.splice(i - 1, 1); }, clear() { rows.length = 0; }, setFrozenRows() {},
      getRange(r, c, nr, nc) { const rg = {
        setValues(v) { v.forEach((line, i) => line.forEach((x, j) => { (rows[r - 1 + i] = rows[r - 1 + i] || [])[c - 1 + j] = x; })); return rg; },
        setValue(x) { (rows[r - 1] = rows[r - 1] || [])[c - 1] = x; return rg; }, getValue() { return (rows[r - 1] || [])[c - 1]; },
        getValues() { const out = []; for (let i = 0; i < (nr || 1); i++) out.push((rows[r - 1 + i] || []).slice(c - 1, c - 1 + (nc || 1))); return out; },
        setFontWeight() { return rg; }, setBackground() { return rg; }, setFontColor() { return rg; }, setNumberFormat() { return rg; } }; return rg; } };
    return sh;
  }
  const sheets = {};
  const book = { getSheetByName: n => sheets[n] || null, insertSheet: n => (sheets[n] = makeSheet()), getUrl: () => 'https://docs.google.com/spreadsheets/d/TEST', getSheets: () => Object.values(sheets), deleteSheet() {} };
  sheets['중개사'] = makeSheet(); sheets['로그'] = makeSheet();
  const props = {}, mails = [], cache = {};
  const E = { sheets, mails, props, data: Object.assign({}, o.data || {}), now: Date.parse(o.now || '2026-11-30T07:10:00+09:00'), quota: 100 };
  const RealDate = Date;
  class FakeDate extends RealDate { constructor(...a) { if (!a.length) super(E.now); else super(...a); } static now() { return E.now; } }
  E.kday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new RealDate(E.now));
  const ctx = {
    console, Date: FakeDate, JSON, Math, Object, Array, String, Number, Boolean, RegExp, Error, isNaN, isFinite, encodeURIComponent, decodeURIComponent, parseInt, parseFloat,
    SpreadsheetApp: { getActive: () => book, openById: () => book },
    PropertiesService: { getScriptProperties: () => ({ getProperty: k => props[k] || null, setProperty: (k, v) => { props[k] = v; }, deleteProperty: k => { delete props[k]; } }) },
    CacheService: { getScriptCache: () => ({ get: k => (o.cache ? cache[k] || null : null), put: (k, v) => { if (o.cache) cache[k] = v; }, remove: k => { delete cache[k]; } }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    MailApp: { sendEmail: m => { E.quota--; mails.push(m); }, getRemainingDailyQuota: () => E.quota },
    Session: { getEffectiveUser: () => ({ getEmail: () => 'owner@example.com' }) },
    ScriptApp: { getProjectTriggers: () => [], deleteTrigger() {}, getService: () => ({ getUrl: () => 'https://script.example/exec' }), WeekDay: { MONDAY: 'MONDAY' },
      newTrigger: () => ({ timeBased: () => ({ onWeekDay: () => ({ atHour: () => ({ inTimezone: () => ({ create() {} }) }) }), everyDays: () => ({ atHour: () => ({ inTimezone: () => ({ create() {} }) }) }) }) }) },
    ContentService: { createTextOutput: s => ({ s, setMimeType() { return this; } }), MimeType: { JSON: 'json' } },
    HtmlService: { createHtmlOutput: s => ({ s }) },
    Utilities: {
      getUuid: () => crypto.randomUUID(),
      formatDate: (d, tz, f) => {
        const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false, weekday: 'short' }).formatToParts(d).map(x => [x.type, x.value]));
        const u = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 }[p.weekday];
        return f.replace("'T'", 'T').replace('yyyy', p.year).replace('yy', p.year.slice(2)).replace('MM', p.month).replace('dd', p.day).replace('HH', p.hour === '24' ? '00' : p.hour).replace('hh', p.hour).replace('mm', p.minute).replace(/^u$/, String(u));
      },
      computeDigest: (alg, s) => Array.from(crypto.createHash('sha256').update(s, 'utf8').digest()).map(b => b > 127 ? b - 256 : b),
      computeHmacSha256Signature: (v, k) => Array.from(crypto.createHmac('sha256', k).update(v).digest()).map(b => b > 127 ? b - 256 : b),
      base64Encode: s => Buffer.from(s).toString('base64'), sleep() {}, DigestAlgorithm: { SHA_256: 'sha256' }, Charset: { UTF_8: 'utf8' },
      newBlob: v => { const buf = Array.isArray(v) ? Buffer.from(v.map(b => b & 255)) : Buffer.from(String(v), 'utf8'); return { getBytes: () => Array.from(buf).map(b => b > 127 ? b - 256 : b), getDataAsString: () => buf.toString('utf8') }; },
      base64EncodeWebSafe: a => Buffer.from(a.map(b => b & 255)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_'),
      base64DecodeWebSafe: s => Array.from(Buffer.from(String(s).replace(/-/g, '+').replace(/_/g, '/'), 'base64')).map(b => b > 127 ? b - 256 : b)
    },
    UrlFetchApp: { fetch(url, opt) {
      if (o.fetch) { const r = o.fetch(url, opt || {}, E); if (r) return r; }   // 시험용 가짜 외부 응답(예: AI 서버) — 없으면 아래 공개 자료
      const send = (code, j) => ({ getResponseCode: () => code, getContentText: () => JSON.stringify(j) });
      const u = url.replace(/[?&]v=\d+$/, ''), m = u.match(/jangdaejang-data\/data\/(.+)$/);
      if (m && E.data[m[1]] !== undefined) { const v = typeof E.data[m[1]] === 'function' ? E.data[m[1]]() : E.data[m[1]]; return v ? send(200, v) : send(404, {}); }
      return send(404, {});
    } }
  };
  vm.createContext(ctx);
  vm.runInContext(gs + '\n;globalThis.__T = { UC, SC, UH, SSH, AXC, BH: typeof BH !== "undefined" ? BH : null, BC: typeof BC !== "undefined" ? BC : null, hashOf, axTok, alertsDaily, briefDaily, axMorning, qzUid, qzSettle, qzSeasonClose, quizMeetExport, quizVoucherUse, PAID_OPEN, calUserMap, calItemsFor, calWeekKey, reportWeekly };', ctx);
  const T = ctx.__T;
  E.T = T; E.ctx = ctx; E.gs = gs;
  E.post = b => JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify(b) } }).s);
  E.get = p => ctx.doGet({ parameter: p });
  sheets['회원'] = makeSheet(); sheets['세션'] = makeSheet(); sheets['회원'].appendRow(T.UH); sheets['세션'].appendRow(T.SSH);
  E.member = (id, data) => {
    const s = crypto.randomBytes(32).toString('hex'), r = [], q = [];
    r[T.UC['카카오id']] = 'k' + id; r[T.UC['닉네임']] = '회원' + id; r[T.UC['저장자료']] = JSON.stringify(data || {}); sheets['회원'].appendRow(r);
    q[T.SC['세션해시']] = T.hashOf('ses|' + s); q[T.SC['카카오id']] = 'k' + id; q[T.SC['만든날']] = new FakeDate(); q[T.SC['만료일']] = new FakeDate(E.now + 90 * 86400000);
    sheets['세션'].appendRow(q);
    return s;
  };
  return E;
};
