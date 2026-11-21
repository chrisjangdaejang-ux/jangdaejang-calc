/* 장대장TV 주간 유튜브 키트(tools/agent-backend.gs v30) 자동 검증 — 실행: node tools/ytkit-test.js
   가짜 시트·메일·공개 그림 위에서: 토큰 확인 → 키트 저장(큰 글은 나눠 저장) → 월요일 발송(받는 주소는 스크립트 속성 YT_KIT_EMAIL) → 한 번만 → 키트 없는 주 안내. */
const fs = require('fs'), vm = require('vm'), path = require('path'), crypto = require('crypto');
function makeSheet() {
  const rows = [];
  const sh = { rows, getDataRange() { return { getValues: () => rows.map(r => r.slice()) }; }, getLastRow() { return rows.length; }, appendRow(r) { rows.push(r.slice()); }, setFrozenRows() {},
    getRange(r, c, nr, nc) { const rg = { setValues(v) { v.forEach((line, i) => line.forEach((x, j) => { (rows[r - 1 + i] = rows[r - 1 + i] || [])[c - 1 + j] = x; })); return rg; },
      setValue(x) { (rows[r - 1] = rows[r - 1] || [])[c - 1] = x; return rg; }, setFontWeight() { return rg; }, setBackground() { return rg; }, setFontColor() { return rg; } }; return rg; } };
  return sh;
}
const sheets = {};
const book = { getSheetByName: n => sheets[n] || null, insertSheet: n => (sheets[n] = makeSheet()), getUrl: () => 'x', getSheets: () => Object.values(sheets), deleteSheet() {} };
const props = { BRIEF_PULL_TOKEN: 'pull-FAKE-123' }, mails = [], fetches = [], triggers = [];
let NOW = Date.parse('2026-11-23T06:10:00+09:00');
const RealDate = Date;
class FakeDate extends RealDate { constructor(...a) { if (!a.length) super(NOW); else super(...a); } static now() { return NOW; } }
const blob = (s, type, name) => ({ s, type, name, setName(n) { this.name = n; return this; }, getName() { return this.name; } });
const ctx = {
  console: { log() {} }, Date: FakeDate, JSON, Math, Object, Array, String, Number, Boolean, RegExp, Error, isNaN, encodeURIComponent, decodeURIComponent,
  SpreadsheetApp: { getActive: () => book, openById: () => book },
  PropertiesService: { getScriptProperties: () => ({ getProperty: k => props[k] || null, setProperty: (k, v) => { props[k] = v; } }) },
  CacheService: { getScriptCache: () => ({ get: () => null, put() {}, remove() {} }) },
  LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
  MailApp: { sendEmail: (...a) => mails.push(a), getRemainingDailyQuota: () => 100 },
  Session: { getEffectiveUser: () => ({ getEmail: () => 'owner@example.com' }) },
  ScriptApp: { getProjectTriggers: () => [], deleteTrigger() {}, WeekDay: { MONDAY: 'MONDAY' },
    newTrigger: h => ({ timeBased: () => ({ onWeekDay: d => ({ atHour: hr => ({ inTimezone: tz => ({ create() { triggers.push([h, d, hr, tz]); } }) }) }), everyDays: () => ({ atHour: () => ({ inTimezone: () => ({ create() {} }) }) }) }) }) },
  ContentService: { createTextOutput: s => ({ s, setMimeType() { return this; } }), MimeType: { JSON: 'json' } },
  HtmlService: { createHtmlOutput: s => ({ s }) },
  Utilities: {
    getUuid: () => crypto.randomUUID(),
    formatDate: (d, tz, f) => { const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(d).map(x => [x.type, x.value]));
      return f.replace('yyyy', p.year).replace('MM', p.month).replace('dd', p.day).replace('HH', p.hour).replace('mm', p.minute); },
    computeDigest: (alg, s) => Array.from(crypto.createHash('sha256').update(s, 'utf8').digest()).map(b => b > 127 ? b - 256 : b),
    newBlob: (s, type, name) => blob(s, type, name), zip: (bs, name) => blob(bs.map(b => b.name).join(','), 'application/zip', name),
    DigestAlgorithm: { SHA_256: 'sha256' }, Charset: { UTF_8: 'utf8' }, sleep() {}
  },
  UrlFetchApp: { fetch(url) { fetches.push(url); const ok = !/short_05/.test(url); return { getResponseCode: () => ok ? 200 : 404, getBlob: () => blob('png', 'image/png', '') }; } }
};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, 'agent-backend.gs'), 'utf8') + '\n;globalThis.__T = { ytKitSend, ytKitSendLatest, ytKitInstall, ytIsoWeek, ytRows, SH_YT };', ctx);
const T = ctx.__T;
const post = b => JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify(b) } }).s);
let pass = 0, fail = 0;
function check(name, cond, extra) { if (cond) pass++; else { fail++; console.log('  실패:', name, extra !== undefined ? JSON.stringify(extra) : ''); } }

const BASE = 'https://chrisjangdaejang-ux.github.io/jangdaejang-data/data/yt/' + 'a'.repeat(32) + '/';
const KIT = { week: '2026-W48', made: '2026-11-22', script: '안녕하세요, 장대장입니다.\n'.repeat(4000) + '=SUM(A1)', script_chars: 3000,
  candidates: [{ rank: 1, name: '이번 주 서울 신고가·하락', hook: '서울 아파트 신고가 616건, 어디서 나왔을까요?', why: '왜', points: [{ t: '서울 신고가: 616건', src: '국토부', per: '10/19~11/17' }] }],
  shorts: [1, 2, 3, 4, 5].map(i => ({ i, label: '쇼츠' + i, text: '쇼츠 대본 <b>' + i, sec: 50 })), titles: ['제목1', '제목2', '제목3', '제목4', '제목5'], thumbs: ['신고가 616건', 'b', 'c', 'd', 'e'],
  description: '설명 ?utm_source=youtube&utm_campaign=2026-W48', description_ads: '설명 ?utm_source=youtube_ads&utm_campaign=2026-W48', pinned: '고정',
  community: [{ i: 1, when: '화요일', poll: ['가', '나'], text: '커뮤니티1' }, { i: 2, when: '목요일', poll: [], text: '커뮤니티2' }],
  ads: { line: '이번 주 광고 추천: 긴 영상', url: 'https://x/?utm_source=youtube_ads' },
  img: { base: BASE, long: ['long_01.png', 'long_02.png'], short: ['short_01.png', 'short_05.png'], community: ['community_01.png'], thumb: ['thumb_01.png', '../evil.png'] } };

check('ISO 주(월요일)', T.ytIsoWeek(new FakeDate()) === '2026-W48', T.ytIsoWeek(new FakeDate()));
check('ISO 주(연말)', T.ytIsoWeek(new RealDate('2026-12-31T12:00:00+09:00')) === '2026-W53' && T.ytIsoWeek(new RealDate('2027-01-04T12:00:00+09:00')) === '2027-W01');
check('토큰 없으면 거절', post({ action: 'ytKitPut', k: 'nope', kit: KIT }).err === 'auth');
check('주차 형식', post({ action: 'ytKitPut', k: props.BRIEF_PULL_TOKEN, kit: Object.assign({}, KIT, { week: 'x' }) }).err === 'week');
check('그림 주소는 난수 폴더만', post({ action: 'ytKitPut', k: props.BRIEF_PULL_TOKEN, kit: Object.assign({}, KIT, { img: { base: 'https://evil.example/' } }) }).err === 'img');
const r = post({ action: 'ytKitPut', k: props.BRIEF_PULL_TOKEN, kit: KIT });
check('저장', r.ok && r.week === '2026-W48', r);
const row = sheets['유튜브키트'].rows[1];
check('긴 글은 여러 칸에 나눠 저장(칸마다 J 머리)', row[4].length <= 45001 && row[5].startsWith('J') && String(row[4]).charAt(0) === 'J');
post({ action: 'ytKitPut', k: props.BRIEF_PULL_TOKEN, kit: KIT });
check('같은 주는 덮어쓰기', sheets['유튜브키트'].rows.length === 2);
check('나눠 저장한 글 그대로 복원', T.ytRows()[0].kit.script === KIT.script);

check('받는 주소 없으면 안 보냄', T.ytKitSend().err === 'YT_KIT_EMAIL' && mails.length === 0);
props.YT_KIT_EMAIL = 'owner-kit@example.com';
const s1 = T.ytKitSend();
check('월요일 발송', s1.ok && mails.length === 1, s1);
const m = mails[0][0];
check('받는 사람 = 스크립트 속성', m.to === 'owner-kit@example.com');
check('제목에 주차·1위 주제', /2026-W48/.test(m.subject) && /신고가 616건/.test(m.subject));
check('본문: 광고 추천·대본·광고용 설명란', m.htmlBody.indexOf('이번 주 광고 추천') >= 0 && m.htmlBody.indexOf('utm_source=youtube_ads') >= 0 && m.htmlBody.indexOf('커뮤니티 글 2') >= 0);
check('본문 이스케이프', m.htmlBody.indexOf('쇼츠 대본 <b>') < 0 && m.htmlBody.indexOf('쇼츠 대본 &lt;b&gt;1') >= 0);
const names = m.attachments.map(a => a.name);
check('글 파일 첨부', ['script.txt', 'shorts_1.txt', 'shorts_5.txt', 'description.txt', 'description_ads.txt', 'pinned.txt', 'community_1.txt', 'titles.txt'].every(n => names.indexOf(n) >= 0), names);
const z = m.attachments.find(a => a.name === 'broll_2026-W48.zip');
check('그림 zip(받은 것만, 이상한 이름 제외)', z && z.s === 'long_01.png,long_02.png,short_01.png,community_01.png,thumb_01.png' && fetches.every(u => u.indexOf(BASE) === 0 && u.indexOf('evil') < 0), z && z.s);
check('한 번만 보냄', T.ytKitSend().already === true && mails.length === 1);
check('미리 보기는 다시 보냄', T.ytKitSendLatest().ok && mails.length === 2);
NOW = Date.parse('2026-11-30T06:10:00+09:00');
const s3 = T.ytKitSend();
check('키트 없는 주는 안내 한 번', s3.err === 'no kit' && mails.length === 3 && /W49/.test(mails[2][0].subject));
T.ytKitSend();
check('안내도 한 번만', mails.length === 3);
T.ytKitInstall();
check('트리거: 월요일 6시 한국 시각', triggers.some(t => t[0] === 'ytKitSend' && t[1] === 'MONDAY' && t[2] === 6 && t[3] === 'Asia/Seoul'));

console.log(`유튜브 키트 검증: 통과 ${pass} · 실패 ${fail}`);
process.exit(fail ? 1 : 0);
