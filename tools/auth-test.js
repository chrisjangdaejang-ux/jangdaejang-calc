/* 카카오 로그인 회원 서버 로직(tools/agent-backend.gs v14) 자동 검증 — 실행: node tools/auth-test.js
   구글 시트·카카오 API를 흉내 낸 가짜 객체 위에서 로그인 → 저장·불러오기 → 알림 신청 → 로그아웃 → 탈퇴를 확인합니다.
   (실제 카카오·구글 서버에는 접속하지 않습니다. 키 값도 가짜 문자열을 씁니다.) */
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
const props = { KAKAO_REST_KEY: 'FAKE_REST_KEY', KAKAO_CLIENT_SECRET: 'FAKE_SECRET' };
const cacheMap = new Map();
const ACCESS = 'FAKE_ACCESS_TOKEN_' + crypto.randomBytes(8).toString('hex');
let kakaoUser = { id: 4012345678, kakao_account: { profile: { nickname: '장대장', profile_image_url: 'x' }, email: 'should-not-be-saved@example.com' } };
let tokenMode = 'ok';
const calls = [];
const ctx = {
  console,
  SpreadsheetApp: { getActive: () => book, openById: () => book },
  PropertiesService: { getScriptProperties: () => ({ getProperty: k => props[k] || null, setProperty: (k, v) => { props[k] = v; } }) },
  CacheService: { getScriptCache: () => ({ get: k => cacheMap.has(k) ? cacheMap.get(k) : null, put: (k, v) => cacheMap.set(k, v), remove: k => cacheMap.delete(k), removeAll: ks => ks.forEach(k => cacheMap.delete(k)) }) },
  LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
  MailApp: { sendEmail() {} },
  Session: { getEffectiveUser: () => ({ getEmail: () => 'owner@example.com' }) },
  ContentService: { createTextOutput: s => ({ s, setMimeType() { return this; } }), MimeType: { JSON: 'json' } },
  Utilities: {
    getUuid: () => crypto.randomUUID(),
    formatDate: (d, tz, f) => {
      const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(d).map(x => [x.type, x.value]));
      return f.replace('yyyy', p.year).replace('MM', p.month).replace('dd', p.day).replace('HH', p.hour).replace('hh', p.hour).replace('mm', p.minute);
    },
    computeDigest: (alg, s) => Array.from(crypto.createHash('sha256').update(s, 'utf8').digest()).map(b => b > 127 ? b - 256 : b),
    DigestAlgorithm: { SHA_256: 'sha256' }, Charset: { UTF_8: 'utf8' }
  },
  UrlFetchApp: {
    fetch(url, opt) {
      calls.push({ url, opt });
      const send = (code, j) => ({ getResponseCode: () => code, getContentText: () => JSON.stringify(j) });
      if (url === 'https://kauth.kakao.com/oauth/token') return tokenMode === 'ok' ? send(200, { access_token: ACCESS, token_type: 'bearer', refresh_token: 'FAKE_REFRESH' }) : send(400, { error: 'invalid_grant', error_code: 'KOE320' });
      if (url === 'https://kapi.kakao.com/v2/user/me') return (opt.headers || {}).Authorization === 'Bearer ' + ACCESS ? send(200, kakaoUser) : send(401, {});
      if (url === 'https://kapi.kakao.com/v1/user/logout') return send(200, { id: kakaoUser.id });
      if (url === 'https://kapi.kakao.com/v1/user/unlink') return send(200, { id: kakaoUser.id });
      return send(404, {});
    }
  }
};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, 'agent-backend.gs'), 'utf8') + '\n;globalThis.__T = { UC, SC, ALC, KAKAO_REDIRECTS, cleanUserData };', ctx);
const T = ctx.__T;
const post = b => JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify(b) } }).s);
const R = T.KAKAO_REDIRECTS[0];

const rows = [];
function check(name, got, want) { const ok = JSON.stringify(got) === JSON.stringify(want); rows.push({ ok, name, got, want }); }
const allCells = () => JSON.stringify(Object.values(sheets).map(s => s.rows));
const CODE = 'abcDEF1234567890_-xyz';

// 1. 잘못된 요청
check('로그인: 등록 안 된 리다이렉트 주소 거절', post({ action: 'kakaoLogin', code: CODE, redirectUri: 'https://evil.example/login/' }).ok, false);
check('로그인: 형식이 이상한 인가 코드 거절', post({ action: 'kakaoLogin', code: '<script>', redirectUri: R }).ok, false);
tokenMode = 'bad';
check('로그인: 카카오가 토큰을 안 주면 실패', post({ action: 'kakaoLogin', code: CODE, redirectUri: R }).ok, false);
tokenMode = 'ok';

// 2. 로그인
calls.length = 0;
const L = post({ action: 'kakaoLogin', code: CODE, redirectUri: R });
check('로그인 성공', L.ok, true);
check('로그인: 닉네임 돌려줌', L.nick, '장대장');
check('로그인: 첫 로그인 = 새 회원', L.isNew, true);
check('로그인: 세션 토큰 64자리', /^[0-9a-f]{64}$/.test(L.s), true);
const tokCall = calls.find(c => c.url.endsWith('/oauth/token'));
check('토큰 요청: REST API 키·리다이렉트·시크릿 사용', [tokCall.opt.payload.client_id, tokCall.opt.payload.redirect_uri, tokCall.opt.payload.client_secret], ['FAKE_REST_KEY', R, 'FAKE_SECRET']);
check('카카오 토큰 바로 만료(로그아웃 호출)', calls.some(c => c.url.endsWith('/v1/user/logout')), true);
check('시트에 카카오 토큰 원문 없음', allCells().includes(ACCESS) || allCells().includes('FAKE_REFRESH'), false);
check('시트에 세션 토큰 원문 없음(해시만)', allCells().includes(L.s), false);
check('시트에 이메일 없음', allCells().includes('should-not-be-saved'), false);
check('회원 시트 = 카카오id·닉네임만(프로필 사진 없음)', allCells().includes('profile_image') || allCells().includes('"x"'), false);
const urow = sheets['회원'].rows[1];
check('회원 시트: 카카오id 앞에 k(시트 숫자 변환 방지)', urow[T.UC['카카오id']], 'k4012345678');
check('회원 시트 행 1개', sheets['회원'].rows.length - 1, 1);

// 3. 다시 로그인 = 같은 회원
const L2 = post({ action: 'kakaoLogin', code: CODE, redirectUri: R });
check('다시 로그인: 새 회원 아님', L2.isNew, false);
check('다시 로그인: 회원 행 그대로 1개', sheets['회원'].rows.length - 1, 1);
check('다시 로그인: 세션 2개(기기 2대)', sheets['세션'].rows.length - 1, 2);

// 4. 저장·불러오기 (다른 기기)
const data = {
  homes: [{ sd: '11', code: '11710', dong: '가락동', jibun: '913', apt: '헬리오시티', band: '84㎡대', bp: 150000, bd: '2021-05', t: '2026-11-20', email: 'x@y.z', phone: '010-1111-2222' },
          { sd: '11', code: 'ABCDE', dong: '가락동', jibun: '1', apt: '잘못된 구코드', band: '84㎡대' }],
  favs: [{ sd: '11', code: '11680', dong: '대치동', jibun: '316', apt: '=HYPERLINK("x")', band: '84㎡대', t: '2026-11-20' }],
  reports: [{ id: 'r1', t: '2026-11-20 10:00', title: '서울 · 8억 이하', q: 'sd=%EC%84%9C%EC%9A%B8&o=none&hz=2', picks: [{ apt: '헬리오시티', band: '84㎡대', P: 180000, fv: 82 }] },
            { id: 'r2', t: '2026-11-20', title: '개인값 포함', q: 'sd=x&i=7000&c=40000', picks: [] }],
  secret: 'drop me'
};
const S1 = post({ action: 'userSave', s: L.s, data });
check('저장 성공', S1.ok, true);
const LD = post({ action: 'userLoad', s: L2.s });
check('다른 세션(기기)에서 불러오기 성공', LD.ok, true);
check('내 집 1개만(구 코드 틀린 것 버림)', LD.data.homes.length, 1);
check('내 집: 허용 칸만 저장(이메일·전화 버림)', Object.keys(LD.data.homes[0]).sort(), ['apt', 'band', 'bd', 'bp', 'code', 'dong', 'jibun', 'sd', 't']);
check('내 집 매수가 유지', LD.data.homes[0].bp, 150000);
check('관심 단지 1개', LD.data.favs.length, 1);
check('리포트: 연소득·현금이 들어간 조건은 저장 안 함', LD.data.reports.map(r => r.id), ['r1']);
check('모르는 칸(secret) 버림', JSON.stringify(LD.data).includes('drop me'), false);
check('셀 수식 주입: 단지명이 =로 시작해도 JSON 문자열 안에만 저장', String(sheets['회원'].rows[1][T.UC['저장자료']]).startsWith('{'), true);
const BIG = post({ action: 'userSave', s: L.s, data: { reports: Array.from({ length: 14 }, (_, i) => ({ id: 'r' + i, title: 'x', q: '', picks: Array.from({ length: 10 }, () => ({ apt: '가'.repeat(60), area: '나'.repeat(40), band: 'b'.repeat(20), P: 1 })) })), favs: Array.from({ length: 35 }, (_, i) => ({ sd: '11', code: '11710', dong: '가'.repeat(30), jibun: String(i), apt: '다'.repeat(60), band: '84㎡대' })) } });
check('개수 제한: 리포트 10개·관심 단지 30개까지', [BIG.ok, BIG.data.reports.length, BIG.data.favs.length, BIG.data.reports[0].picks.length], [true, 10, 30, 10]);
post({ action: 'userSave', s: L.s, data });

// 4-1. 관심 지역(v15)
const AR = post({ action: 'userSave', s: L.s, data: Object.assign({}, data, { areas: { list: [{ sd: '서울특별시', g: '11740', gn: '강동구' }, { sd: '경기도', g: '', gn: '' }, { sd: '서울특별시', g: '11740', gn: '강동구' }, { sd: '<script>', g: '' }, { sd: '경기도', g: '41117', gn: '' }, ...Array.from({ length: 15 }, (_, i) => ({ sd: '부산광역시', g: String(26000 + i), gn: '구' + i }))], kinds: { notice: true, mu: false }, email: 'x@y' } }) });
const ARL = post({ action: 'userLoad', s: L.s }).data.areas;
check('관심 지역: 중복·잘못된 값 빼고 10곳까지', [AR.ok, ARL.list.length, ARL.list[0].gn, ARL.list[1].g], [true, 10, '강동구', '']);
check('관심 지역: 알림 종류 저장, 모르는 칸 버림', [ARL.kinds, 'email' in ARL], [{ notice: true, mu: false }, false]);
check('관심 지역 없는 예전 자료도 기본값으로', post({ action: 'userSave', s: L.s, data }).data.areas, { list: [], kinds: { notice: true, mu: true }, t: '' });

// 5. 알림 신청
const A1 = post({ action: 'alertSubscribe', s: L.s, items: [{ kind: 'trade', key: '11710|가락동|913|헬리오시티', name: '헬리오시티' }, { kind: 'area', key: '11710', name: '송파구' }, { kind: 'spam', key: '1', name: 'x' }] });
check('알림 신청 2개(모르는 종류 버림)', [A1.ok, A1.added, A1.alerts.length], [true, 2, 2]);
const A2 = post({ action: 'alertSubscribe', s: L.s, items: [{ kind: 'trade', key: '11710|가락동|913|헬리오시티', name: '헬리오시티' }] });
check('같은 알림 다시 신청하면 중복 없음', [A2.added, A2.alerts.length], [0, 2]);
check('알림 신청: 잘못된 대상 거절', post({ action: 'alertSubscribe', s: L.s, items: [{ kind: 'area', key: '서울', name: '서울' }] }).ok, false);
const A3 = post({ action: 'alertSubscribe', s: L.s, op: 'remove', ids: [A1.alerts[0].id] });
check('알림 취소', A3.alerts.length, 1);
check('불러오기에 알림 목록 포함', post({ action: 'userLoad', s: L.s }).alerts.length, 1);

// 6. 세션 검사
check('가짜 세션 거절', post({ action: 'userLoad', s: 'f'.repeat(64) }).code, 'auth');
check('형식 틀린 세션 거절', post({ action: 'userSave', s: 'abc', data: {} }).code, 'auth');
const shs = sheets['세션'];
shs.rows[2][T.SC['만료일']] = new Date(Date.now() - 1000);
check('만료된 세션 거절', post({ action: 'userLoad', s: L2.s }).code, 'auth');
check('만료된 세션 행은 지움', shs.rows.length - 1, 1);
const L3 = post({ action: 'kakaoLogin', code: CODE, redirectUri: R });
check('로그아웃 성공', post({ action: 'userLogout', s: L3.s }).ok, true);
check('로그아웃한 세션은 못 씀', post({ action: 'userLoad', s: L3.s }).code, 'auth');
check('다른 기기 세션은 그대로', post({ action: 'userLoad', s: L.s }).ok, true);

// 7. 다른 회원과 섞이지 않음
kakaoUser = { id: 999, kakao_account: { profile: { nickname: '=cmd' } } };
const O = post({ action: 'kakaoLogin', code: CODE, redirectUri: R });
check('다른 회원: 저장 자료 비어 있음', post({ action: 'userLoad', s: O.s }).data.homes.length, 0);
check('닉네임이 =로 시작하면 시트에는 작은따옴표를 붙여 저장', sheets['회원'].rows[2][T.UC['닉네임']], "'=cmd");
check('불러올 때는 원래 닉네임', post({ action: 'userLoad', s: O.s }).nick, '=cmd');

// 8. 탈퇴
props.KAKAO_ADMIN_KEY = 'FAKE_ADMIN';
calls.length = 0;
const D = post({ action: 'userDelete', s: L.s });
check('탈퇴 성공 + 카카오 연결 끊기', [D.ok, D.unlinked], [true, true]);
const ul = calls.find(c => c.url.endsWith('/v1/user/unlink'));
check('연결 끊기: 어드민 키 + 회원번호', [ul.opt.headers.Authorization, ul.opt.payload.target_id], ['KakaoAK FAKE_ADMIN', '4012345678']);
check('탈퇴: 회원 행 삭제', sheets['회원'].rows.slice(1).some(r => r[T.UC['카카오id']] === 'k4012345678'), false);
check('탈퇴: 세션 행 삭제', sheets['세션'].rows.slice(1).some(r => r[T.SC['카카오id']] === 'k4012345678'), false);
check('탈퇴: 알림 행 삭제', sheets['관심알림'].rows.slice(1).some(r => r[T.ALC['카카오id']] === 'k4012345678'), false);
check('탈퇴 뒤 세션 못 씀', post({ action: 'userLoad', s: L.s }).code, 'auth');
check('다른 회원은 그대로', post({ action: 'userLoad', s: O.s }).ok, true);

// 9. 서버 설정이 없을 때
delete props.KAKAO_REST_KEY;
const N = post({ action: 'kakaoLogin', code: CODE, redirectUri: R });
check('REST 키가 없으면 로그인 안 됨(안내 문구)', [N.ok, /설정/.test(N.err)], [false, true]);

// 10. 화면: 실거래 목록 잠금 (assets/price-sheet.js) — 키 없음 / 로그인 전 / 로그인 뒤
{
  const MC = require('../assets/mine-core.js');
  let st = { on: false, user: null };
  const fakeAuth = { on: () => st.on, user: () => st.user, gate: (t, l, f) => `<div class="jdj-gate" data-f="${f}">${t}<button>${l}</button></div>` };
  const sb = { JDJ_MINE: MC, JDJ_AUTH: fakeAuth };
  const c2 = vm.createContext({ self: sb, console });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'assets', 'price-sheet.js'), 'utf8'), c2);
  const PS = sb.JDJ_PRICE;
  const tr = Array.from({ length: 23 }, (_, i) => [20261100 - i * 100 + 15, 84.9, 10, 150000 + i, 0, 0]);
  const u = ['11710', '가락동', '테스트', '84㎡대', 84.9, 23, [], '', '1', null, [], tr];
  const rowsOf = h => (h.match(/<tr(?: [^>]*)?>/g) || []).length - 1;
  let h = PS.tradesHtml(u, [], { show: 10 });
  check('잠금: 카카오 키가 없으면 예전 그대로(10건 + 더보기)', [/jdj-gate/.test(h), /data-jps-more/.test(h), rowsOf(h)], [false, true, 23]);
  st = { on: true, user: null };
  h = PS.tradesHtml(u, [], { show: 10 });
  check('잠금: 로그인 전엔 5건 + 로그인 단추(더보기 없음)', [/jdj-gate/.test(h), /data-jps-more/.test(h), rowsOf(h), /나머지 <b>18건/.test(h), /카카오로 3초 로그인하고 전체 보기/.test(h)], [true, false, 5, true, true]);
  check('잠금: 거래가 5건 이하면 잠금 없음', /jdj-gate/.test(PS.tradesHtml(Object.assign([], u, { 11: tr.slice(0, 4) }), [], { show: 10 })), false);
  const t = { months: ['202001', '202002', '202101', '202312'], s: [100000, 110000, 120000, 130000], j: [50000, 0, 60000, 70000] };
  check('3년 이전 시세: 로그인 전엔 안 보임', PS.pastYearsHtml(t, '202311'), '');
  st = { on: true, user: { nick: '장대장' } };
  h = PS.tradesHtml(u, [], { show: 10 });
  check('잠금: 로그인 뒤엔 10건 + 더보기(전체 23건)', [/jdj-gate/.test(h), /data-jps-more/.test(h), rowsOf(h)], [false, true, 23]);
  const ph = PS.pastYearsHtml(t, '202311');
  check('3년 이전 시세: 로그인 뒤 연도별(2020·2021), 기준 달 이후는 뺌', [/2020년/.test(ph), /2021년/.test(ph), /2023년/.test(ph), /10억 5,000만원/.test(ph)], [true, true, false, true]);
}

const bad = rows.filter(r => !r.ok);
rows.forEach(r => console.log((r.ok ? 'PASS ' : 'FAIL ') + r.name + (r.ok ? '' : `  got=${JSON.stringify(r.got)} want=${JSON.stringify(r.want)}`)));
console.log(`\n${rows.length - bad.length}/${rows.length} 통과`);
process.exit(bad.length ? 1 : 0);
