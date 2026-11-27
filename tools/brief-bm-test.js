/* 모닝 브리핑 카카오톡 브랜드 메시지(v76, 대표 결정 2026-11-27 '가안') 검증 — 실행: node tools/brief-bm-test.js </dev/null
   가짜 구글 시트·솔라피·공개 데이터 위에서 확인합니다(실제 서버·카카오에는 접속하지 않음).
   ① 시간 잠금: 08:00 전·20:50 이후 광고 메시지 절대 안 보냄 ② 동의 나누기: 광고 동의 + 브랜드 메시지 동의 + 채널 친구 확인 → 08:05 브랜드 메시지,
   나머지 → 7시대 알림톡(광고 없음) ③ 08:05 실패 → 10분마다 다시, 25분 뒤 광고 없는 알림톡으로 대신, 12:00 뒤 건너뜀 ④ 광고 1건·관심 지역만·7일 2번 제한·예시 광고 안 씀
   ⑤ 수신 거부·2년 확인 안내(카톡만 받는 분) ⑥ 스위치 꺼진 기본값 ⑦ 화면 시안 규칙(assets/ads-proto.js briefPick)과 서버 규칙 같음 */
'use strict';
const fs = require('fs'), vm = require('vm'), path = require('path'), crypto = require('crypto');
const ROOT = path.join(__dirname, '..');
const SRC = fs.readFileSync(path.join(__dirname, 'agent-backend.gs'), 'utf8');
const AP = require('../assets/ads-proto.js');

let pass = 0, fail = 0;
function check(name, cond, extra) { if (cond) pass++; else { fail++; console.log('  실패:', name, extra !== undefined ? JSON.stringify(extra).slice(0, 400) : ''); } }

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

const BRIEF = {
  '11710': { g: '11710', name: '송파구', trades: [{ d: '잠실동', a: '리센츠', b: '84㎡대', p: 333000 }, { d: '가락동', a: '헬리오시티', b: '49㎡대', p: 247000, hi: 1 }],
    lines: { '': { fact: '송파구에서 새로 올라온 매매 거래는 2건이에요.' } }, pro: {} },
  '11500': { g: '11500', name: '강서구', trades: [{ d: '마곡동', a: '마곡엠밸리', b: '84㎡대', p: 150000 }], lines: { '': { fact: '강서구 새 거래 1건' } }, pro: {} }
};
const CAT = { ads: [
  { id: 'real_gangseo', advertiser: '테스트 시행사', name: '테스트 마곡 현장', sido: '서울특별시', sgg: '강서구', code: '11500', line: '역까지 걸어서 8분', price: '분양가 6억~', url: 'https://example.com/ad1', verified: true,
    target: { codes: ['11500'], sido: ['11'], pages: ['brief'] } },
  { id: 'real_unverified', advertiser: '확인 전 시행사', name: '확인 안 된 현장', code: '11710', verified: false, target: { codes: ['11710'], pages: ['brief'] } },
  { id: 'real_noslot', advertiser: '화면 전용', name: '화면 전용 현장', code: '11710', verified: true, target: { codes: ['11710'], pages: ['home'] } },
  { id: 'ex_fake', example: true, advertiser: '예시(가상)', name: '예시 현장(가상)', code: '11710', verified: true, target: { codes: ['11710'], pages: ['brief'] } }
] };

/* 스크립트 하나를 새 가짜 환경에 올림. on = 두 스위치를 켠 상태로 */
function boot(on) {
  const sheets = {}, props = { SOLAPI_API_KEY: 'k', SOLAPI_API_SECRET: 's', SOLAPI_PFID: 'PF1', SOLAPI_TPL_BRIEF: 'TPLBRIEF', SOLAPI_TPL_EXPIRE: 'TPLEXP' };
  const book = { getSheetByName: n => sheets[n] || null, insertSheet: n => (sheets[n] = makeSheet()), getUrl: () => 'https://docs.google.com/spreadsheets/d/TEST', getSheets: () => Object.values(sheets), deleteSheet() {} };
  sheets['중개사'] = makeSheet(); sheets['로그'] = makeSheet();
  const cacheMap = new Map(), mails = [], fetches = [], E = { NOW: Date.parse('2026-12-01T07:10:00+09:00'), bmCode: 200, bmFail: false };
  const RealDate = Date;
  class FakeDate extends RealDate { constructor(...a) { if (!a.length) super(E.NOW); else super(...a); } static now() { return E.NOW; } }
  const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new RealDate(E.NOW));
  const triggers = [];
  const ctx = {
    console, Date: FakeDate, JSON, Math, Object, Array, String, Number, Boolean, RegExp, Error, isNaN, encodeURIComponent, decodeURIComponent,
    SpreadsheetApp: { getActive: () => book, openById: () => book },
    PropertiesService: { getScriptProperties: () => ({ getProperty: k => props[k] || null, setProperty: (k, v) => { props[k] = v; } }) },
    CacheService: { getScriptCache: () => ({ get: k => cacheMap.has(k) ? cacheMap.get(k) : null, put: (k, v) => cacheMap.set(k, v), remove: k => cacheMap.delete(k) }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, tryLock() { return true; }, releaseLock() {} }) },
    MailApp: { sendEmail: (...a) => mails.push(a), getRemainingDailyQuota: () => 1000 },
    Session: { getEffectiveUser: () => ({ getEmail: () => 'owner@example.com' }) },
    ScriptApp: { getProjectTriggers: () => triggers.slice(), deleteTrigger() {}, getService: () => ({ getUrl: () => 'https://script.google.com/macros/s/TEST/exec' }),
      newTrigger: fn => ({ timeBased: () => ({ everyMinutes: n => ({ create() { triggers.push({ fn, n }); } }), everyDays: () => ({ atHour: () => ({ inTimezone: () => ({ create() {} }) }) }) }) }) },
    ContentService: { createTextOutput: s => ({ s, setMimeType() { return this; } }), MimeType: { JSON: 'json' } },
    HtmlService: { createHtmlOutput: s => ({ s }) },
    Utilities: {
      getUuid: () => crypto.randomUUID(),
      formatDate: (d, tz, f) => {
        const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })
          .formatToParts(d).map(x => [x.type, x.value]));
        const wd = String(((new RealDate(d.getTime() + 9 * 3600e3).getUTCDay() + 6) % 7) + 1);
        return f.replace('yyyy', p.year).replace('yy', p.year.slice(2)).replace('MM', p.month).replace('dd', p.day).replace('HH', p.hour === '24' ? '00' : p.hour).replace('hh', p.hour).replace('mm', p.minute).replace(/^u$/, wd);
      },
      computeDigest: (alg, s) => Array.from(crypto.createHash('sha256').update(s, 'utf8').digest()).map(b => b > 127 ? b - 256 : b),
      computeHmacSha256Signature: (v, k) => Array.from(crypto.createHmac('sha256', k).update(v).digest()).map(b => b > 127 ? b - 256 : b),
      base64Encode: s => Buffer.from(s).toString('base64'),
      sleep() {}, DigestAlgorithm: { SHA_256: 'sha256' }, Charset: { UTF_8: 'utf8' }
    },
    UrlFetchApp: {
      fetch(url, opt) {
        opt = opt || {};
        fetches.push({ url, opt, at: E.NOW });
        const send = (code, j) => ({ getResponseCode: () => code, getContentText: () => JSON.stringify(j) });
        if (/data\/ad-catalog\.json/.test(url)) return send(200, E.catalog || CAT);
        if (/data\/brief\/wk\//.test(url)) return send(404, {});
        const m = url.match(/data\/brief\/(\w+)\.json/);
        if (m && m[1] === 'market') return send(404, {});
        if (m) return m[1] === 'index' ? send(200, { date: today() }) : BRIEF[m[1]] ? send(200, BRIEF[m[1]]) : send(404, {});
        if (url.indexOf('api.solapi.com') >= 0) {
          const msg = JSON.parse(opt.payload).messages[0];
          if (msg.type === 'BMS_FREE') return E.bmFail ? send(E.bmCode, { errorMessage: 'down' }) : send(200, { failedMessageList: [] });
          return send(200, { failedMessageList: [] });
        }
        return send(404, {});
      }
    }
  };
  let src = SRC;
  if (on) {
    if (src.indexOf('const KAKAO_BRAND_MSG_ENABLED = false;') < 0 || src.indexOf('const ADS_IN_BRIEF = false;') < 0) throw new Error('스위치 줄을 못 찾음');
    src = src.replace('const KAKAO_BRAND_MSG_ENABLED = false;', 'const KAKAO_BRAND_MSG_ENABLED = true;').replace('const ADS_IN_BRIEF = false;', 'const ADS_IN_BRIEF = true;');
  }
  vm.createContext(ctx);
  vm.runInContext(src + '\n;globalThis.__T = { BC, UC, SC, UH, SSH, hashOf, bAmToken, briefDaily, bmDaily, bmSend, bmWindowAt, bmWindowOk, bmOn, bmAdPick, bmCompose, bmEligibleRow, bmInstall, bConsentOf, briefAmRecheck, briefAdOff, briefChannels, BM_FC, KAKAO_BRAND_MSG_ENABLED, ADS_IN_BRIEF };', ctx);
  const T = ctx.__T;
  sheets['회원'] = makeSheet(); sheets['세션'] = makeSheet(); sheets['회원'].appendRow(T.UH); sheets['세션'].appendRow(T.SSH);
  const member = id => {
    const s = crypto.randomBytes(32).toString('hex'), r = [], q = [];
    r[T.UC['카카오id']] = 'k' + id; r[T.UC['닉네임']] = '회원' + id; r[T.UC['저장자료']] = ''; sheets['회원'].appendRow(r);
    q[T.SC['세션해시']] = T.hashOf('ses|' + s); q[T.SC['카카오id']] = 'k' + id; q[T.SC['만든날']] = new FakeDate(); q[T.SC['만료일']] = new FakeDate(E.NOW + 90 * 86400000);
    sheets['세션'].appendRow(q);
    return s;
  };
  const post = b => JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify(b) } }).s);
  const get = p => JSON.parse(ctx.doGet({ parameter: p }).s);
  const at = iso => { E.NOW = Date.parse(iso); };
  const sub = () => (sheets['브리핑구독'] ? sheets['브리핑구독'].rows.slice(1) : []);
  const rowOf = k => sub().filter(r => r[T.BC['카카오id']] === k);
  const solapi = () => fetches.filter(f => f.url.indexOf('api.solapi.com') >= 0).map(f => Object.assign(JSON.parse(f.opt.payload).messages[0], { _at: f.at }));
  const log = () => (sheets['발송기록'] ? sheets['발송기록'].rows : []);
  return { T, ctx, E, sheets, props, mails, fetches, triggers, member, post, get, at, sub, rowOf, solapi, log };
}

/* ---------- ① 시간 잠금(순수 함수) ---------- */
{
  const S = boot(true), T = S.T;
  check('창: 07:59 안 됨', T.bmWindowAt(7 * 60 + 59) === false);
  check('창: 08:00 됨', T.bmWindowAt(8 * 60) === true);
  check('창: 20:49 됨', T.bmWindowAt(20 * 60 + 49) === true);
  check('창: 20:50 안 됨', T.bmWindowAt(20 * 60 + 50) === false);
  check('창: 자정·23:59·00:00 안 됨', !T.bmWindowAt(0) && !T.bmWindowAt(23 * 60 + 59) && !T.bmWindowAt(3 * 60));
  const tryAt = iso => { S.at(iso); const n = S.solapi().length; const r = T.bmSend('01011112222', '(광고) 시험', []); return { r, sent: S.solapi().length > n }; };
  let x = tryAt('2026-12-01T07:59:30+09:00');
  check('bmSend 07:59 → 잠금, 솔라피 안 부름', x.r.ok === false && x.r.guard === true && !x.sent, x);
  x = tryAt('2026-12-01T20:50:00+09:00');
  check('bmSend 20:50 → 잠금', x.r.guard === true && !x.sent, x);
  x = tryAt('2026-12-01T23:30:00+09:00');
  check('bmSend 23:30 → 잠금', x.r.guard === true && !x.sent, x);
  x = tryAt('2026-12-01T02:00:00+09:00');
  check('bmSend 새벽 2시 → 잠금', x.r.guard === true && !x.sent, x);
  x = tryAt('2026-12-01T08:00:00+09:00');
  const m = S.solapi().pop();
  check('bmSend 08:00 → 보냄(BMS_FREE·채널 친구 I·텍스트형·문자 대체 끔)', x.r.ok && x.sent && m.type === 'BMS_FREE' && m.kakaoOptions.bms.targeting === 'I' && m.kakaoOptions.bms.chatBubbleType === 'TEXT' && m.kakaoOptions.disableSms === true && m.kakaoOptions.pfId === 'PF1', m);
  /* 시간대가 서버 기준(UTC)이어도 한국 시각으로 봄: UTC 23:30 = KST 08:30 */
  S.at('2026-11-30T23:30:00Z');
  check('UTC 23:30(= KST 08:30)은 열림', T.bmWindowOk(new Date(Date.parse('2026-11-30T23:30:00Z'))) === true);
  check('UTC 11:55(= KST 20:55)은 잠김', T.bmWindowOk(new Date(Date.parse('2026-12-01T11:55:00Z'))) === false);
}

/* ---------- ⑥ 스위치 꺼진 기본값 ---------- */
{
  const S = boot(false), T = S.T;
  check('기본값: KAKAO_BRAND_MSG_ENABLED=false · ADS_IN_BRIEF=false', T.KAKAO_BRAND_MSG_ENABLED === false && T.ADS_IN_BRIEF === false);
  check('기본값: 키가 있어도 브랜드 메시지 꺼짐', T.bmOn() === false && T.briefChannels().bm === false && T.briefChannels().chUrl === '');
  check('기본값: bmDaily 바로 끝남', T.bmDaily() === 'off');
  S.at('2026-12-01T09:00:00+09:00');
  check('기본값: bmSend 도 안 보냄', T.bmSend('01011112222', 'x', []).ok === false && S.solapi().length === 0);
  const s1 = S.member(1);
  S.post({ action: 'userSave', s: s1, data: { brief: { areas: [{ g: '11710', gn: '송파구', sd: '서울특별시', dn: '' }] } } });
  const r = S.post({ action: 'briefTrial', s: s1, channel: 'kakao', contact: '01011112222', privacy: true, ad: true, bm: true, fr: true });
  check('기본값: 브랜드 메시지 신청은 준비 중으로 거절', !r.ok && /준비 중/.test(r.err), r);
  const r2 = S.post({ action: 'briefTrial', s: s1, channel: 'kakao', contact: '01011112222', privacy: true, ad: true });
  check('기본값: 알림톡 신청은 그대로 됨', r2.ok, r2);
  S.at('2026-12-02T07:10:00+09:00'); S.props.BRIEF_SENT = '';
  T.briefDaily();
  const m = S.solapi().filter(x => x.to === '01011112222');
  check('기본값: 광고 동의자도 오전 7시대 알림톡(브랜드 메시지 없음)', m.length === 1 && m[0].kakaoOptions.templateId === 'TPLBRIEF' && !m[0].type, m);
}

/* ---------- ② 동의 나누기 · ③ 재시도 · ④ 광고 ---------- */
{
  const S = boot(true), T = S.T, P = S.post;
  S.props.KAKAO_CHANNEL_URL = 'https://pf.kakao.com/_test';
  check('켜짐: 채널 설정에 bm·채널 주소', T.briefChannels().bm === true && T.briefChannels().chUrl === 'https://pf.kakao.com/_test');
  S.props.KAKAO_CHANNEL_URL = 'javascript:alert(1)';
  check('켜짐: 이상한 채널 주소는 버림', T.briefChannels().chUrl === '');
  const A = S.member(1), B = S.member(2), C = S.member(3), D = S.member(4), F = S.member(5);
  [A, B, C, D, F].forEach((s, i) => P({ action: 'userSave', s, data: { brief: { areas: [{ g: i === 0 ? '11500' : '11710', gn: i === 0 ? '강서구' : '송파구', sd: '서울특별시', dn: '' }] } } }));
  let r = P({ action: 'briefTrial', s: C, channel: 'kakao', contact: '01033333333', privacy: true, ad: true, bm: true });
  check('채널 친구 확인 없이 브랜드 메시지 → 거절', !r.ok && /채널을 친구로 추가/.test(r.err), r);
  r = P({ action: 'briefTrial', s: D, channel: 'kakao', contact: '01044444444', privacy: true, ad: false, bm: true, fr: true });
  check('광고성 정보 동의 없이 브랜드 메시지 → 거절', !r.ok && /광고성 정보 받기/.test(r.err), r);
  r = P({ action: 'briefTrial', s: A, channel: 'kakao', contact: '01011111111', privacy: true, ad: true, bm: true, fr: true });
  check('A: 광고 동의 + 브랜드 메시지 + 채널 친구 → 체험 시작', r.ok, r);
  r = P({ action: 'briefTrial', s: B, channel: 'kakao', contact: '01022222222', privacy: true, ad: false });
  check('B: 광고 동의 없음(알림톡) → 체험 시작', r.ok, r);
  r = P({ action: 'briefTrial', s: F, channel: 'kakao', contact: '01055555555', privacy: true, ad: true });
  check('F: 광고 동의만(브랜드 메시지 안 고름) → 체험 시작', r.ok, r);
  const ca = T.bConsentOf('k1'), cb = T.bConsentOf('k2'), cf = T.bConsentOf('k5');
  check('동의 기록: A 는 ad·bm 켜짐, 채널 친구 확인 시각', ca.ad.on && ca.bm.on && !!ca.fr && !!ca.bm.at, ca);
  check('동의 기록: B 는 모두 꺼짐 · F 는 광고만(브랜드 메시지 꺼짐)', !cb.ad.on && !cb.bm.on && cf.ad.on && !cf.bm.on, { cb, cf });
  check('행 단위 대상: A 만 08:05 대상', T.bmEligibleRow(S.rowOf('k1')[0]) && !T.bmEligibleRow(S.rowOf('k2')[0]) && !T.bmEligibleRow(S.rowOf('k5')[0]));
  const mine = P({ action: 'briefMine', s: A });
  check('briefMine: bm·fr·channels.bm 내려줌', mine.ok && mine.bm.on === true && !!mine.fr && mine.channels.bm === true, { bm: mine.bm, fr: mine.fr });

  /* 하루 1: 7시대 → B·F 알림톡, A 는 건너뜀 */
  S.at('2026-12-02T07:10:00+09:00'); S.props.BRIEF_SENT = '';
  T.briefDaily();
  let m = S.solapi();
  check('07:10 알림톡: B·F 받음(정보성 템플릿)', ['01022222222', '01055555555'].every(t => m.some(x => x.to === t && x.kakaoOptions.templateId === 'TPLBRIEF')), m.map(x => x.to));
  check('07:10: A 는 아무것도 안 받음', !m.some(x => x.to === '01011111111'));
  check('07:10: 브랜드 메시지(BMS)는 한 통도 없음', !m.some(x => x.type === 'BMS_FREE'));
  check('알림톡 변수에 광고 없음', m.filter(x => x.kakaoOptions.templateId === 'TPLBRIEF').every(x => !/광고/.test(JSON.stringify(x.kakaoOptions.variables))));
  S.at('2026-12-02T07:58:00+09:00');
  check('07:58 bmDaily → early(안 보냄)', T.bmDaily() === 'early' && !S.solapi().some(x => x.type === 'BMS_FREE'));
  S.at('2026-12-02T08:03:00+09:00');
  check('08:03 bmDaily → early(08:05 전)', T.bmDaily() === 'early');
  S.at('2026-12-02T08:06:00+09:00');
  let out = T.bmDaily();
  m = S.solapi().filter(x => x.type === 'BMS_FREE');
  check('08:06 브랜드 메시지: A 한 통', out.sent === 1 && m.length === 1 && m[0].to === '01011111111', { out, n: m.length });
  const tx = m[0].text;
  check('광고 표기: 맨 앞 (광고) + 보낸 사람 이름·전화', /^\(광고\) 집예보\(\(주\)장대장부동산그룹\) 02-3444-5008/.test(tx), tx.slice(0, 80));
  check('광고 1건: 관심 지역(강서구) 현장 · 광고주 표시', /테스트 마곡 현장/.test(tx) && /광고주: 테스트 시행사/.test(tx) && (tx.match(/\[광고\]/g) || []).length === 1, tx);
  check('끝에 무료 수신 거부 방법', /무료 수신 거부/.test(tx.slice(-160)) && m[0].kakaoOptions.buttons.some(b => b.name === '광고 수신 거부' && /action=briefAdOff/.test(b.linkMobile)));
  check('버튼 이름 14자 이하·https', m[0].kakaoOptions.buttons.every(b => b.name.length <= 14 && /^https:\/\//.test(b.linkMobile)) && m[0].kakaoOptions.buttons.length <= 5);
  check('글 길이 1,000자 이하 · 연락처·카카오 회원번호 없음', tx.length <= 1000 && !/01011111111|k1\b/.test(tx));
  check('발송 시각은 08:05 이후', m[0]._at >= Date.parse('2026-12-02T08:05:00+09:00'));
  check('발송기록: 보냄(브랜드 메시지 · 광고 id)', S.log().some(x => x[2] === 'kakao-bm' && /보냄\(브랜드 메시지 · 광고 real_gangseo\)/.test(x[3])));
  check('노출 기록: 회원 해시·광고 id(카카오 id 원문 없음)', S.sheets['브랜드광고노출'].rows.length === 2 && S.sheets['브랜드광고노출'].rows[1][2] === 'real_gangseo' && S.sheets['브랜드광고노출'].rows[1][1] !== 'k1');
  check('같은 날 다시 → done', T.bmDaily() === 'done');
  S.at('2026-12-02T09:10:00+09:00'); T.briefDaily();
  check('9시 briefDaily 다시 돌아도 A 에게 알림톡 안 감', !S.solapi().some(x => x.to === '01011111111' && x.kakaoOptions.templateId === 'TPLBRIEF'));

  /* 하루 2: 08:06 실패 → 08:10 기다림 → 08:17 다시(성공, 같은 광고 2번째) */
  S.E.bmFail = true; S.E.bmCode = 500;
  S.at('2026-12-03T08:06:00+09:00'); out = T.bmDaily();
  check('실패: fails 1, 오늘 끝 표시 안 함', out.fails === 1 && S.props.BM_SENT !== '2026-12-03' && S.log().some(x => /못 보냄\(브랜드 메시지\): http 500 — 10분 뒤 다시/.test(x[3])), out);
  S.E.bmFail = false;
  S.at('2026-12-03T08:10:00+09:00');
  check('10분 안에는 다시 안 보냄', T.bmDaily() === 'wait-retry');
  S.at('2026-12-03T08:17:00+09:00'); out = T.bmDaily();
  check('10분 뒤 다시 → 보냄', out.sent === 1 && S.props.BM_SENT === '2026-12-03', out);
  check('같은 광고 2번째(7일 2번까지)', /테스트 마곡 현장/.test(S.solapi().filter(x => x.type === 'BMS_FREE').pop().text));

  /* 하루 3: 7일 안 3번째 → 광고 빠짐 → (광고) 머리 없음 */
  S.at('2026-12-04T08:06:00+09:00'); T.bmDaily();
  let last = S.solapi().filter(x => x.type === 'BMS_FREE').pop();
  check('7일에 2번 넘으면 광고 빠짐 · (광고) 머리도 없음', !/테스트 마곡 현장/.test(last.text) && !/^\(광고\)/.test(last.text) && !last.kakaoOptions.buttons.some(b => b.name === '분양 소식 보기'), last.text.slice(0, 60));

  /* 하루 4: 브랜드 메시지가 계속 실패 → 08:31 광고 없는 알림톡으로 대신(저녁까지 미루지 않음) */
  S.E.bmFail = true;
  for (const t of ['08:06', '08:16', '08:26']) { S.at(`2026-12-05T${t}:00+09:00`); T.bmDaily(); }
  check('08:26 까지는 아직 브랜드 메시지로 다시', S.props.BM_SENT !== '2026-12-05' && !S.solapi().some(x => x._at >= Date.parse('2026-12-05T08:00:00+09:00') && x.kakaoOptions && x.kakaoOptions.templateId === 'TPLBRIEF'));
  S.at('2026-12-05T08:31:00+09:00'); out = T.bmDaily();
  const alt = S.solapi().filter(x => x._at === S.E.NOW && x.kakaoOptions && x.kakaoOptions.templateId === 'TPLBRIEF');
  check('08:31 → 알림톡(광고 없음)으로 대신 보냄', out.sent === 1 && alt.length === 1 && S.props.BM_SENT === '2026-12-05' && S.log().some(x => /알림톡으로 대신/.test(x[3])), out);
  check('대신 보낸 알림톡에 광고 없음', alt.every(x => x.type !== 'BMS_FREE' && !/광고|분양/.test(JSON.stringify(x.kakaoOptions.variables))));
  const nBefore = S.solapi().length;
  S.at('2026-12-05T08:45:00+09:00');
  check('보낸 뒤 → done(두 번 안 감)', T.bmDaily() === 'done' && S.solapi().length === nBefore);

  /* 하루 5: 알림톡 키까지 없으면 12:00 에 건너뜀 + 운영자 메일 */
  const keep = S.props.SOLAPI_TPL_BRIEF; delete S.props.SOLAPI_TPL_BRIEF;
  for (const t of ['08:06', '08:31', '09:40', '11:50']) { S.at(`2026-12-06T${t}:00+09:00`); T.bmDaily(); }
  S.at('2026-12-06T12:01:00+09:00');
  check('12:01 → 오늘은 건너뜀', T.bmDaily() === 'skip' && S.props.BM_SENT === '2026-12-06' && S.log().some(x => /12:00까지 브랜드 메시지·알림톡 모두 실패/.test(x[3])));
  check('건너뛸 때 운영자 메일', S.mails.some(a => typeof a[1] === 'string' && /아침 브리핑 1명 못 보냄/.test(a[1])));
  S.props.SOLAPI_TPL_BRIEF = keep;
  ['BM_SENT', 'BM_FIRST_D', 'BM_TRY_D', 'BM_SWAP_D'].forEach(k => { delete S.props[k]; });   // 아래 송파 시험이 같은 날 아침을 다시 씀
  check('모든 브랜드 메시지가 08:00~20:50 사이', S.solapi().filter(x => x.type === 'BMS_FREE').every(x => { const h = new Date(x._at + 9 * 3600e3); const mm = h.getUTCHours() * 60 + h.getUTCMinutes(); return mm >= 480 && mm < 1250; }));
  S.E.bmFail = false;

  /* 예시 광고·확인 안 된 현장·화면 전용 광고는 안 실림(송파 = 11710 구독자 F 를 브랜드 메시지로 바꿔 봄) */
  r = P({ action: 'briefAdPref', s: F, ad: true, bm: true });
  check('구독 관리: 채널 친구 확인 없이 bm → 거절', !r.ok && /채널을 친구로/.test(r.err), r);
  r = P({ action: 'briefAdPref', s: F, ad: true, bm: true, fr: true });
  check('구독 관리: 채널 친구 확인 + bm 켜기', r.ok && r.bm.on === true && !!r.fr, r);
  S.at('2026-12-06T08:06:00+09:00'); T.bmDaily();
  const fm = S.solapi().filter(x => x.type === 'BMS_FREE' && x.to === '01055555555').pop();
  check('송파 구독자: 예시·확인 전·화면 전용 광고는 안 실림(같은 시·도 서울 현장만)', fm && !/예시|확인 안 된|화면 전용/.test(fm.text) && /테스트 마곡 현장/.test(fm.text), fm && fm.text.slice(0, 80));

  /* ⑤ 수신 거부: 카톡 버튼 링크 → 세 동의 모두 꺼짐 → 다음 날 7시대 알림톡으로 */
  const ida = S.rowOf('k1')[0][T.BC['id']];
  const off = T.briefAdOff({ id: ida, t: T.bAmToken(ida) });
  const c1 = T.bConsentOf('k1');
  check('수신 거부 → 광고·이른 아침·브랜드 메시지 모두 꺼짐, 철회 시각', /처리했어요/.test(off.s) && !c1.ad.on && !c1.bm.on && S.rowOf('k1').every(x => x[T.BC['브랜드메시지동의']] === false && x[T.BC['브랜드메시지철회시각']] instanceof Date));
  check('수신 거부 결과 알림(카톡만 받는 분, 템플릿 없으면 기록만)', S.log().some(x => /광고 동의 처리 결과 \(SOLAPI_TPL_ADRES 템플릿 없음\)/.test(x[3])));
  S.at('2026-12-07T07:10:00+09:00'); S.props.BRIEF_SENT = ''; T.briefDaily();
  const brf = S.solapi().filter(x => x._at === S.E.NOW && x.kakaoOptions.templateId === 'TPLBRIEF').map(x => x.to);
  check('F(브랜드 메시지 동의)는 7시대 알림톡 브리핑에서 빠짐', brf.indexOf('01055555555') < 0, brf);
  check('수신 거부 다음 날: A 는 7시대 알림톡(광고 없음)', brf.indexOf('01011111111') >= 0, brf);
  S.at('2026-12-07T08:06:00+09:00'); T.bmDaily();
  const bms = S.solapi().filter(x => x.type === 'BMS_FREE' && x._at === S.E.NOW).map(x => x.to);
  check('수신 거부 다음 날: A 에게 브랜드 메시지 없음 · F 는 받음', bms.indexOf('01011111111') < 0 && bms.indexOf('01055555555') >= 0, bms);
  check('잘못된 토큰 수신 거부 → 처리 안 함', /처리하지 못했어요/.test(T.briefAdOff({ id: S.rowOf('k5')[0][T.BC['id']], t: 'bad' }).s) && T.bConsentOf('k5').bm.on === true);
  r = P({ action: 'briefAdPref', s: F, ad: false });
  check('광고성 정보 끄면 브랜드 메시지도 함께 꺼짐', r.ok && r.bm.on === false && r.adc.on === false, r);

  /* ⑤ 2년 확인 안내: 카톡만 받는 분 → 정보성 알림톡(SOLAPI_TPL_ADCHK) */
  P({ action: 'briefAdPref', s: F, ad: true, bm: true });
  S.props.SOLAPI_TPL_ADCHK = 'TPLCHK';
  const n0 = S.solapi().length;
  S.at('2027-12-01T09:00:00+09:00'); T.briefAmRecheck(new Date(S.E.NOW));
  check('2년 전에는 안내 안 함', S.solapi().length === n0);
  S.at('2029-01-15T09:00:00+09:00'); T.briefAmRecheck(new Date(S.E.NOW));
  const ck = S.solapi().filter(x => x.kakaoOptions && x.kakaoOptions.templateId === 'TPLCHK');
  check('2년 지나면 카톡 확인 안내(보낸 곳·동의 날짜·브랜드 메시지 줄·관리 링크)', ck.length === 1 && ck[0].to === '01055555555' && /집예보/.test(ck[0].kakaoOptions.variables['#{보낸곳}'])
    && /브랜드 메시지로 받기.*에 동의/.test(ck[0].kakaoOptions.variables['#{내용}']) && /brief\/manage\//.test(ck[0].kakaoOptions.variables['#{링크}']), ck.map(x => x.kakaoOptions.variables));
  check('안내 뒤 확인 시각 기록(다음 안내는 또 2년 뒤)', S.rowOf('k5').every(x => x[T.BC['광고확인시각']] instanceof Date));
  T.briefAmRecheck(new Date(S.E.NOW));
  check('같은 날 다시 돌려도 한 번만', S.solapi().filter(x => x.kakaoOptions && x.kakaoOptions.templateId === 'TPLCHK').length === 1);

  /* 설치: 5분마다 */
  T.bmInstall();
  check('bmInstall: 5분마다 bmDaily', S.triggers.some(t => t.fn === 'bmDaily' && t.n === 5));
}

/* ---------- ④·⑦ 광고 고르기: 서버 규칙 = 화면 시안 규칙 ---------- */
{
  const S = boot(true), T = S.T;
  const E = AP.EXAMPLES, D = '2026-12-02';
  const cases = [[['11500'], {}], [['11710'], {}], [['41450'], {}], [['26110'], {}], [['11500', '41450'], {}], [[], {}], [['bad'], {}],
    [['11500'], { ex_gangseo: 2 }], [['11500'], { ex_gangseo: 1 }], [['11470'], {}], [['11000'], {}]];
  cases.forEach(([codes, fc]) => {
    const a = AP.briefPick(E, codes, fc, D, { examples: true }), b = T.bmAdPick(E, codes, fc, D, { examples: true });
    check(`같은 규칙: ${codes.join(',') || '(없음)'} ${JSON.stringify(fc)}`, (a && a.id) === (b && b.id), { web: a && a.id, server: b && b.id });
  });
  check('예시 광고는 실제 발송에서 늘 빠짐(서버·화면 둘 다)', T.bmAdPick(E, ['11500'], {}, D) === null && AP.briefPick(E, ['11500'], {}, D) === null);
  check('강서구 관심 → 강서 시안', AP.briefPick(E, ['11500'], {}, D, { examples: true }).id === 'ex_gangseo');
  check('부산 관심 → 없음(지역 조건 없는 소형 광고도 안 실림)', AP.briefPick(E, ['26110'], {}, D, { examples: true }) === null);
  check('게재 기간 밖 → 없음', T.bmAdPick([Object.assign({}, CAT.ads[0], { start: '2026-12-10' })], ['11500'], {}, D) === null && T.bmAdPick([Object.assign({}, CAT.ads[0], { end: '2026-12-01' })], ['11500'], {}, D) === null);
  check('관심 지역 말고 다른 값은 안 씀(함수 인자가 지역 코드·노출 수·날짜뿐)', T.bmAdPick.length === 5 && /codes, fc, day/.test(T.bmAdPick.toString().split('\n')[0]));
  check('제한 수 서버 = 화면', T.BM_FC.max === AP.BRIEF_FC.max && T.BM_FC.days === AP.BRIEF_FC.days);
  const s = { id: 'B0000000001' }, pc = [{ nm: '강서구', n: 1, hi: 0, fact: '강서구 새 거래 1건', url: 'https://x/brief/?d=11500' }];
  const c = T.bmCompose('2026-12-02', pc, s, null);
  check('광고 없는 날: (광고) 없음, 수신 거부 안내는 그대로', !/^\(광고\)/.test(c.text) && /무료 수신 거부/.test(c.text) && c.ad === false);
  S.props.BM_OPTOUT_080 = '080-123-4567';
  check('080 무료 수신 거부 번호를 넣으면 끝에 표기', /무료 수신 거부: 080-123-4567 · /.test(T.bmCompose('2026-12-02', pc, s, CAT.ads[0]).text));
  S.props.BM_OPTOUT_080 = '02-1234-5678';
  check('080 이 아닌 번호는 표기 안 함', !/02-1234-5678/.test(T.bmCompose('2026-12-02', pc, s, CAT.ads[0]).text));
  delete S.props.BM_OPTOUT_080;
  const long = Array.from({ length: 10 }, (x, i) => ({ nm: '아주 긴 동네 이름 ' + i, n: 100, hi: 10, fact: '가'.repeat(200), url: 'https://x/' }));
  const c2 = T.bmCompose('2026-12-02', long, s, CAT.ads[0]);
  check('길어도 1,000자 안에서 광고·수신 거부는 남음', c2.text.length <= 1000 && /테스트 마곡 현장/.test(c2.text) && /무료 수신 거부/.test(c2.text) && /^\(광고\)/.test(c2.text), c2.text.length);
}

/* ---------- 화면 문구·연결 ---------- */
{
  const sub = fs.readFileSync(path.join(ROOT, 'brief/subscribe/index.html'), 'utf8'), man = fs.readFileSync(path.join(ROOT, 'brief/manage/index.html'), 'utf8');
  check('신청 화면: 브랜드 메시지 칸은 서버가 켜졌을 때만(st.bm)', /id="bmBox"/.test(sub) && /st\.bm\b/.test(sub) && /bm: /.test(sub) && /fr: /.test(sub));
  check('구독 관리: 브랜드 메시지 칸은 channels.bm 일 때만', /id="bmOn"/.test(man) && /channels && r\.channels\.bm/.test(man));
  check('화면 문구: 8시 5분·알림톡(광고 없음) 안내', /오전 8시 5분/.test(sub) && /광고 없음/.test(sub) && /오전 8시 5분/.test(man));
  const lr = fs.readFileSync(path.join(__dirname, '..', 'data', 'ad-catalog.json'), 'utf8');
  check('공개 광고 목록 파일: ads 배열(지금은 비어 있음)', Array.isArray(JSON.parse(lr).ads));
}

console.log(`카카오톡 브랜드 메시지 브리핑 검증: ${pass}개 통과, ${fail}개 실패`);
process.exit(fail ? 1 : 0);
