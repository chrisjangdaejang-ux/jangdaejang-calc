/* 모닝 브리핑 운영자(대표) 모드(tools/agent-backend.gs v48) 자동 검증 — 실행: node tools/brief-admin-test.js </dev/null
   가짜 시트·메일·공개 데이터 위에서: 일반 회원은 요금제 최대(20곳)까지만 저장 → [운영자 모드 켜기] 메일(시트 주인에게만, 1회용)
   → 다른 계정·틀린 링크·두 번째 사용 거절 → 운영자는 지역 수백 곳·단지 100개 저장 → 아침 발송은 다른 구독자 먼저, 운영자는 20곳씩 나눠 여러 통
   → 메일 한도가 모자라면 멈췄다가 다음 실행에서 이어서(중복 없음) → 엔진 집계·광고 통계에는 앞 3곳만 → 결제 잠금(PAID_OPEN)·요금제 내용은 그대로 → 끄기.
   (실제 서버에는 접속하지 않습니다.) */
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
sheets['중개사'] = makeSheet(); sheets['로그'] = makeSheet();
const props = { TOSS_SECRET_KEY: 'test_sk_FAKE', BRIEF_PULL_TOKEN: 'pull-FAKE-123' };
const cacheMap = new Map(), mails = [], fetches = [], fetchAlls = [];
let QUOTA = 100; const logs = [];
const area = g => ({ g, name: '구' + g, date: '2026-11-21', trades: [{ d: '동' + g, a: '단지' + g, b: '84㎡대', p: 100000, hi: 1 }], lines: { '': { fact: g + ' 새 거래 1건' } }, pro: {} });
let NOW = Date.parse('2026-11-21T07:10:00+09:00');
const RealDate = Date;
class FakeDate extends RealDate { constructor(...a) { if (!a.length) super(NOW); else super(...a); } static now() { return NOW; } }
const BRIEF = {
  '11710': { g: '11710', name: '송파구', trades: [{ d: '잠실동', a: '리센츠', b: '84㎡대', p: 333000, dr: -9.9 }, { d: '가락동', a: '헬리오시티', b: '49㎡대', p: 247000, hi: 1 }],
    urgent: [{ d: '가락동', a: '급매단지', b: '84㎡대', p: 150000, med: 172000, disc: -12.8, n3: 4, dt: 20261101 }], urgent_lo: [{ d: '가락동', a: '얕은급매', b: '59㎡대', p: 94000, med: 100000, disc: -6.0, n3: 3, dt: 20261102 }],
    lines: { '': { fact: '송파구에서 새로 올라온 매매 거래는 2건이에요.' }, '잠실동': { fact: '잠실동에서 새로 올라온 매매 거래는 1건이에요.' } }, pro: { '': ['"한 줄"'], '잠실동': ['"잠실 한 줄"'] } },
  '11320': { g: '11320', name: '도봉구', trades: [], lines: { '': { fact: '도봉구 새 거래 없음' } }, pro: {},
    pnews: { n: 1, note: { 공급: '공급 고정 문장' }, items: [{ t: '도봉구 창동 재개발 정비구역 지정', d: '2026-11-20', org: '서울특별시', u: 'https://news.seoul.go.kr/citybuild/archives/1', c: '공급', rg: '서울 도봉구', terms: [['정비구역', '재개발·재건축을 해도 된다고 공식으로 정한 구역이에요.']] }] } }
};
const ctx = {
  console, Date: FakeDate, JSON, Math, Object, Array, String, Number, Boolean, RegExp, Error, isNaN, encodeURIComponent, decodeURIComponent,
  SpreadsheetApp: { getActive: () => book, openById: () => book },
  PropertiesService: { getScriptProperties: () => ({ getProperty: k => props[k] || null, setProperty: (k, v) => { props[k] = v; } }) },
  CacheService: { getScriptCache: () => ({ get: k => cacheMap.has(k) ? cacheMap.get(k) : null, put: (k, v) => cacheMap.set(k, v), remove: k => cacheMap.delete(k) }) },
  LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
  MailApp: { sendEmail: (...a) => mails.push(a), getRemainingDailyQuota: () => QUOTA }, Logger: { log: x => logs.push(String(x)) },
  Session: { getEffectiveUser: () => ({ getEmail: () => 'owner@example.com' }) },
  ScriptApp: { getProjectTriggers: () => [], newTrigger: () => ({ timeBased: () => ({ everyDays: () => ({ atHour: () => ({ inTimezone: () => ({ create() {} }) }) }) }) }) },
  ContentService: { createTextOutput: s => ({ s, setMimeType() { return this; } }), MimeType: { JSON: 'json' } },
  HtmlService: { createHtmlOutput: s => ({ s }) },
  Utilities: {
    getUuid: () => crypto.randomUUID(),
    formatDate: (d, tz, f) => {
      const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })
        .formatToParts(d).map(x => [x.type, x.value]));
      return f.replace('yyyy', p.year).replace('yy', p.year.slice(2)).replace('MM', p.month).replace('dd', p.day).replace('HH', p.hour === '24' ? '00' : p.hour).replace('hh', p.hour).replace('mm', p.minute);
    },
    computeDigest: (alg, s) => Array.from(crypto.createHash('sha256').update(s, 'utf8').digest()).map(b => b > 127 ? b - 256 : b),
    computeHmacSha256Signature: (v, k) => Array.from(crypto.createHmac('sha256', k).update(v).digest()).map(b => b > 127 ? b - 256 : b),
    base64Encode: s => Buffer.from(s).toString('base64'),
    sleep() {}, DigestAlgorithm: { SHA_256: 'sha256' }, Charset: { UTF_8: 'utf8' }
  },
  UrlFetchApp: {
    fetchAll(reqs) { fetchAlls.push(reqs.length); return reqs.map(q => ctx.UrlFetchApp.fetch(q.url, q)); },
    fetch(url, opt) {
      opt = opt || {};
      fetches.push({ url, opt });
      const send = (code, j) => ({ getResponseCode: () => code, getContentText: () => JSON.stringify(j) });
      const wk = url.match(/data\/brief\/wk\/(\w+)\.json/);                 // v41 지난주 우리 지역은?(7시 공개분)
      if (wk) return WK[wk[1]] ? send(200, WK[wk[1]]) : send(404, {});
      const m = url.match(/data\/brief\/(\w+)\.json/);
      if (m && m[1] === 'market') return send(200, MARKET);
      if (m) return m[1] === 'index' ? send(200, { date: new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new RealDate(NOW)) }) : BRIEF[m[1]] ? send(200, BRIEF[m[1]]) : /^\d{5}$/.test(m[1]) ? send(200, area(m[1])) : send(404, {});
      if (url.indexOf('api.solapi.com') >= 0) return send(200, { groupInfo: { count: { total: 1 } } });
      const body = opt.payload ? JSON.parse(opt.payload) : null;
      return send(200, { status: 'DONE', orderId: body.orderId, totalAmount: body.amount, method: '카드', approvedAt: new FakeDate().toISOString() });
    }
  }
};
const WK = {   // 송파구는 오늘 날짜(실림), 도봉구는 지난 날짜(빠짐), 전국 문장은 오늘
  '11710': { date: '2026-11-21', w: '2026-46', from: '2026-11-09', to: '2026-11-15', ver: 1, status: 'prov', asof: '2026-11-19', url: 'https://chrisjangdaejang-ux.github.io/jangdaejang-calc/weekly/2026-46/', lines: ['송파구 주간 문장', '서울 주간 문장'] },
  '11320': { date: '2026-11-14', w: '2026-45', from: '2026-11-02', to: '2026-11-08', ver: 1, status: 'prov', asof: '2026-11-12', url: 'https://x', lines: ['도봉구 지난주 묵은 문장'] },
  market: { date: '2026-11-21', w: '2026-46', from: '2026-11-09', to: '2026-11-15', ver: 1, status: 'prov', asof: '2026-11-19', url: 'https://chrisjangdaejang-ux.github.io/jangdaejang-calc/weekly/2026-46/', line: '전국 주간 문장' } };
const MARKET = { date: '2026-11-21', name: '집예보 모닝 브리핑', win: { from: '2026-11-20', to: '2026-11-21' },
  kr: { n: 812, nhi: 40, hi: [{ sd: '서울', gn: '강남구', d: '압구정동', a: '현대7차', b: '245㎡대', p: 1150000, pm: 1050000, pmd: 20260301, up: 9.5 }], drop: [{ sd: '경기', gn: '화성시', d: '청계동', a: '예시', b: '84㎡대', p: 60000, m2: 80000, m2d: 20250501, dr: -25 }, { sd: '경기', gn: '화성시', d: '청계동', a: '의심거래', b: '84㎡대', p: 30000, m2: 80000, m2d: 20250501, dr: -62, sus: 1 }] },
  seoul: { n: 120, nhi: 12, hi: [], drop: [] }, policy: [{ name: '주담대 한도 조정', stage: '시행', d: '2026-11-17', scope: '전국' }], rate: null,
  cy: { n: 3, rows: [{ n: '이번 주 단지', sd: '서울', gn: '송파구', sp: ['20261117', ''], rc: ['20261118', '20261119'] }] }, lines: ['전국에서 어제 새로 올라온 아파트 매매는 812건이에요.'],
  pnews: { n: 2, by: { 정책: 1, 교통: 1 }, note: { 정책: '정책 고정 문장', 교통: '교통이 좋아지면 보통 주변 집값과 수요에 영향을 줘요.' }, items: [
    { t: "[참고] '27년 부동산 공시가격 시세반영률은 전년 수준 유지", d: '2026-11-20', org: '국토교통부', u: 'https://www.korea.kr/briefing/pressReleaseView.do?newsId=156790000', c: '정책', sub: '세금', terms: [['공시가격', '정부가 세금 계산에 쓰려고 해마다 정해 발표하는 집값이에요.']] },
    { t: '경인선 철도지하화 종합계획 반영', d: '2026-11-19', org: '인천광역시', u: 'javascript:alert(1)', c: '교통', rg: '인천' }] } };
vm.createContext(ctx);
const SRC = fs.readFileSync(path.join(__dirname, 'agent-backend.gs'), 'utf8');
vm.runInContext(SRC + '\n;globalThis.__T = { BC, UC, SC, UH, SSH, BRIEF_ADMIN_LIM, BRIEF_MAX, PAID_OPEN, hashOf, briefDaily, briefState, bRows, briefAreas, briefAgg, bIsAdmin };', ctx);
const T = ctx.__T;
const post = b => JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify(b) } }).s);
const get = p => JSON.parse(ctx.doGet({ parameter: p }).s);
let pass = 0, fail = 0;
function check(name, cond, extra) { if (cond) pass++; else { fail++; console.log('  실패:', name, extra !== undefined ? JSON.stringify(extra).slice(0, 300) : ''); } }

sheets['회원'] = makeSheet(); sheets['세션'] = makeSheet();
sheets['회원'].appendRow(T.UH); sheets['세션'].appendRow(T.SSH);
function member(id) {
  const s = crypto.randomBytes(32).toString('hex'), r = [], q = [];
  r[T.UC['카카오id']] = 'k' + id; r[T.UC['닉네임']] = '회원' + id; r[T.UC['저장자료']] = ''; sheets['회원'].appendRow(r);
  q[T.SC['세션해시']] = T.hashOf('ses|' + s); q[T.SC['카카오id']] = 'k' + id; q[T.SC['만든날']] = new FakeDate(); q[T.SC['만료일']] = new FakeDate(NOW + 90 * 86400000);
  sheets['세션'].appendRow(q);
  return s;
}
const sOwner = member(1), sOther = member(2);
const codes = n => Array.from({ length: n }, (_, i) => String(10000 + 10 * i + 5));
const areasOf = n => codes(n).map(g => ({ g, gn: '구' + g, sd: '시도' + g.slice(0, 2), dn: '' }));
const aptsOf = n => Array.from({ length: n }, (_, i) => '단지' + i);
const mailTo = to => mails.filter(a => a[0] && a[0].to === to);

// 1. 일반 회원: 요금제 최대(20곳·30개)까지만 저장
let r = post({ action: 'userSave', s: sOther, data: { brief: { areas: areasOf(25), apts: aptsOf(40) } } });
check('일반 회원: 지역은 요금제 최대 20곳까지만 저장', r.ok && r.data.brief.areas.length === T.BRIEF_MAX.areas && r.data.brief.apts.length === T.BRIEF_MAX.apts, r.data && r.data.brief.areas.length);
r = post({ action: 'briefMine', s: sOther });
check('일반 회원: briefMine adm=false', r.ok && r.adm === false && r.admLim === null);

// 2. 운영자 모드 켜기 메일 — 시트 주인 메일로만, 링크는 해시만 저장
mails.length = 0;
r = post({ action: 'briefAdminMail', s: 'f'.repeat(64) });
check('로그인 없으면 거절', !r.ok && r.code === 'auth', r);
r = post({ action: 'briefAdminMail', s: sOwner });
const am = mails.find(a => a[0] && a[0].to === 'owner@example.com');
const tok = am && (am[0].body.match(/#adm=([0-9a-f]{64})/) || [])[1];
check('운영자 켜기 메일: 시트 주인에게만, 구독 관리 링크·닉네임', r.ok && r.sent && !!tok && /brief\/manage\/#adm=/.test(am[0].body) && /회원1/.test(am[0].body) && mails.length === 1, am && am[0]);
check('링크 원문은 저장하지 않음(해시만)', !String(props.BRIEF_ADM_LINK).includes(tok));
check('운영자 켜기 메일에 결제·요금제가 열린다는 말 없음', /요금제·결제와는 상관없어요/.test(am[0].body));

// 3. 다른 계정·틀린 링크 거절, 같은 계정이면 켜짐, 1회용
r = post({ action: 'briefAdminEnter', s: sOther, t: tok });
check('다른 카카오 계정으로 열면 거절', !r.ok && /그 계정으로 카카오 간편 로그인/.test(r.err) && !T.bIsAdmin('k2'), r);
r = post({ action: 'briefAdminEnter', s: sOwner, t: 'a'.repeat(64) });
check('틀린 링크 거절', !r.ok && !T.bIsAdmin('k1'), r);
r = post({ action: 'briefAdminEnter', s: sOwner, t: tok });
check('같은 계정 + 맞는 링크 → 운영자 켜짐', r.ok && r.adm && T.bIsAdmin('k1') && JSON.parse(props.BRIEF_ADMIN_IDS).join() === 'k1', r);
r = post({ action: 'briefAdminEnter', s: sOwner, t: tok });
check('링크는 한 번만', !r.ok, r);
r = post({ action: 'briefAdminMail', s: sOwner });
check('이미 운영자면 메일 다시 안 보냄', r.ok && r.already && mails.length === 1);
(() => { const P = JSON.parse(JSON.stringify(props)); props.BRIEF_ADM_LINK = JSON.stringify({ h: T.hashOf('bral|' + 'b'.repeat(64)), k: 'k2', exp: NOW - 1 });
  const x = post({ action: 'briefAdminEnter', s: sOther, t: 'b'.repeat(64) }); check('시간 지난 링크 거절', !x.ok && !T.bIsAdmin('k2'), x); props.BRIEF_ADM_LINK = P.BRIEF_ADM_LINK; })();

// 4. 운영자: 지역 수백 곳·단지 100개 저장, 화면용 adm
r = post({ action: 'userSave', s: sOwner, data: { brief: { areas: areasOf(260), apts: aptsOf(120) } } });
check('운영자: 전국 시·군·구(260곳) 저장', r.ok && r.data.brief.areas.length === 260, r.err || (r.data && r.data.brief.areas.length));
check('운영자: 관심 단지 100개까지', r.ok && r.data.brief.apts.length === T.BRIEF_ADMIN_LIM.apts);
check('운영자 상한 300곳', post({ action: 'userSave', s: sOwner, data: { brief: { areas: areasOf(320), apts: [] } } }).data.brief.areas.length === T.BRIEF_ADMIN_LIM.areas);
r = post({ action: 'userSave', s: sOwner, data: { brief: { areas: areasOf(45), apts: aptsOf(50) } } });
r = post({ action: 'briefMine', s: sOwner });
check('briefMine: adm=true·한도·저장된 45곳 그대로', r.ok && r.adm === true && r.admLim.areas === 300 && r.brief.areas.length === 45 && r.brief.apts.length === 50, r);
check('userLoad 도 45곳 그대로', post({ action: 'userLoad', s: sOwner }).data.brief.areas.length === 45);

// 5. 결제 잠금·요금제 내용은 그대로
check('PAID_OPEN 은 그대로 false', T.PAID_OPEN === false && get({ action: 'briefConfig' }).paid === false);
r = post({ action: 'briefOrder', s: sOwner, product: 'brief_pro_plus', broker: '11710-2019-00123', channel: 'email', contact: 'boss@example.com', privacy: true, agree: true });
check('운영자도 유료 주문은 잠금 그대로', !r.ok && r.code === 'paid_closed', r);
r = post({ action: 'briefTrial', s: sOwner, channel: 'email', contact: 'boss@example.com', privacy: true });
check('운영자 무료 체험 시작', r.ok && r.sub.active, r);
check('운영자 구독: 지역·단지 수만 늘고 중개사 내용·손님 브리핑·주간 리포트는 그대로', r.sub.adm === true && r.sub.areas === 300 && r.sub.apts === 100 && r.sub.pro === false && r.sub.customers === 0 && r.sub.weekly === false && r.sub.urgPick === false && r.sub.tier === 'trial', r.sub);
post({ action: 'userSave', s: sOther, data: { brief: { areas: areasOf(5), apts: [] } } });
r = post({ action: 'briefTrial', s: sOther, channel: 'email', contact: 'other@example.com', privacy: true });
check('일반 회원 체험 시작', r.ok && r.sub.adm === false && r.sub.areas === 3, r.sub);
// 운영자 행을 시트 맨 위로(발송 순서는 서버가 정함)
(() => { const rows = sheets['브리핑구독'].rows, i = rows.findIndex(x => x[T.BC['카카오id']] === 'k1'); const [x] = rows.splice(i, 1); rows.splice(1, 0, x); })();

// 6. 엔진 집계·광고 통계: 운영자는 앞 3곳만
r = get({ action: 'briefAreas', k: 'pull-FAKE-123' });
const tot = r.areas.reduce((n, a) => n + a.n, 0);
check('briefAreas: 운영자 3곳 + 일반 3곳만(엔진 호출 예산 보호)', r.ok && tot === 6 && r.areas.length <= 6, r);
const AG = T.briefAgg(new FakeDate());
check('광고 통계: 운영자가 모든 시·도를 부풀리지 않음', Object.values(AG.sido || {}).reduce((n, v) => n + v, 0) <= 6, AG.sido);

// 7. 아침 발송: 일반 구독자 먼저, 운영자는 20곳씩 3통(45곳)
mails.length = 0; fetchAlls.length = 0;
let sent = T.briefDaily();
const om = mailTo('boss@example.com');
check('발송: 2명', sent === 2, sent);
check('일반 구독자 먼저(운영자 행이 시트 위에 있어도)', mails.findIndex(a => a[0].to === 'other@example.com') < mails.findIndex(a => a[0].to === 'boss@example.com'));
check('운영자: 45곳 → 3통(20·20·5)', om.length === 3 && /3통 중 1번째/.test(om[0][0].htmlBody) && /3통 중 3번째/.test(om[2][0].htmlBody), om.length);
check('운영자: 모든 지역이 한 번씩', codes(45).every(g => om.filter(a => a[0].htmlBody.includes('구' + g + ' ')).length === 1));
check('운영자: 지역 자료는 한꺼번에 받음(fetchAll)', fetchAlls.length >= 2);
check('일반 구독자: 3곳만', mailTo('other@example.com').length === 1 && !mailTo('other@example.com')[0][0].htmlBody.includes('구' + codes(5)[3]));
check('같은 날 다시 돌려도 안 보냄', T.briefDaily() === undefined && mailTo('boss@example.com').length === 3);

// 8. 메일 한도가 모자라면 멈췄다가 다음 실행에서 이어서(중복 없음)
NOW += 86400000; mails.length = 0;
post({ action: 'userSave', s: sOwner, data: { brief: { areas: areasOf(60), apts: [] } } });
ctx.MailApp.getRemainingDailyQuota = () => (mailTo('boss@example.com').length >= 1 ? 5 : 100);   // 운영자 첫 통을 보낸 뒤 한도 부족
sent = T.briefDaily();
check('한도 부족: 일반 구독자는 보내고 운영자는 1통 뒤 멈춤', mailTo('other@example.com').length === 1 && mailTo('boss@example.com').length === 1 && sent === 1, [sent, mailTo('boss@example.com').length]);
check('멈춘 날은 BRIEF_SENT 를 적지 않음(9시 실행이 이어 보냄)', props.BRIEF_SENT !== ymdK(NOW));
check('어디까지 보냈는지 기록', JSON.parse(props.BRIEF_ADM_PROG).i === 1);
ctx.MailApp.getRemainingDailyQuota = () => 100;
sent = T.briefDaily();
check('다음 실행: 운영자 2·3통째만 이어서(첫 통 다시 안 보냄), 일반 구독자 두 번 안 받음', mailTo('boss@example.com').length === 3 && mailTo('other@example.com').length === 1 && /3통 중 2번째/.test(mailTo('boss@example.com')[1][0].htmlBody), mailTo('boss@example.com').length);
check('이어 보낸 뒤 BRIEF_SENT 기록', props.BRIEF_SENT === ymdK(NOW));

// 9. 끄기 → 요금제 수(체험 3곳)로 돌아감
r = post({ action: 'briefAdminOff', s: sOwner });
check('운영자 모드 끄기', r.ok && !T.bIsAdmin('k1') && post({ action: 'briefMine', s: sOwner }).adm === false);
NOW += 86400000; mails.length = 0; T.briefDaily();
check('끈 뒤: 한 통·3곳만', mailTo('boss@example.com').length === 1 && !/통 중/.test(mailTo('boss@example.com')[0][0].htmlBody) && !mailTo('boss@example.com')[0][0].htmlBody.includes('구' + codes(60)[3]));

// 10. 화면 표(brief-core.js)와 서버 숫자 같음
const coreSrc = fs.readFileSync(path.join(__dirname, '..', 'assets', 'brief-core.js'), 'utf8');
const ca = (coreSrc.match(/const ADMIN = \{ areas: (\d+), apts: (\d+) \}/) || []).slice(1).map(Number);
check('화면 ADMIN 한도 = 서버 BRIEF_ADMIN_LIM', ca[0] === T.BRIEF_ADMIN_LIM.areas && ca[1] === T.BRIEF_ADMIN_LIM.apts, ca);
const man = fs.readFileSync(path.join(__dirname, '..', 'brief', 'manage', 'index.html'), 'utf8'), sub = fs.readFileSync(path.join(__dirname, '..', 'brief', 'subscribe', 'index.html'), 'utf8');
check('구독 관리 화면: 운영자: 제한 없음·켜기/끄기 버튼', /운영자: 제한 없음/.test(man) && /운영자 모드 켜기/.test(man) && /운영자 모드 끄기/.test(man) && /briefAdminEnter/.test(man));
check('구독 신청 화면: 운영자: 제한 없음', /운영자: 제한 없음/.test(sub) && /B\.ADMIN/.test(sub));
check('화면 문구에 회사명 없음', !/장대장부동산그룹/.test(man + sub));

// 11. 엔진 연결 비밀값 새로 만들기(pullTokenNew): 스크립트 속성에 넣고 로그에만 보여 줌(메일로 안 보냄)
mails.length = 0; const oldTok = props.BRIEF_PULL_TOKEN;
ctx.pullTokenNew();
check('pullTokenNew: 64자리 새 값을 속성에, 로그에 표시, 메일 없음', /^[0-9a-f]{64}$/.test(props.BRIEF_PULL_TOKEN) && props.BRIEF_PULL_TOKEN !== oldTok && logs.some(x => x.includes(props.BRIEF_PULL_TOKEN)) && mails.length === 0);
check('새 값으로 엔진 집계 열림·옛 값 거절', get({ action: 'briefAreas', k: props.BRIEF_PULL_TOKEN }).ok === true && get({ action: 'briefAreas', k: oldTok }).ok === false);

function ymdK(t) { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new RealDate(t)); }
console.log(`운영자 모드 검증: ${pass}개 통과, ${fail}개 실패`);
process.exit(fail ? 1 : 0);
