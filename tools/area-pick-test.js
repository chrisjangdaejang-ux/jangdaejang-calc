/* 평형 안 전용면적 고르기 자동 확인 — 실행: node tools/area-pick-test.js </dev/null
   ① assets/mine-core.js: 공개 칸 13(엔진 build_site.type_list) 읽기·고르기·고른 면적 기준 행(areaUnit) — 시세는 엔진 값 그대로(웹에서 다시 계산하지 않음)
   ② 내 집 저장: cleanHome 이 고른 전용면적(ar)을 지키고, 없으면 키를 만들지 않음(예전 저장 자료와 글자 그대로 같음)
   ③ assets/auth.js syncHomes: 서버가 ar 칸을 아직 안 받으면(재배포 전) 이 기기 값을 지키고, 하루 한 번만 다시 올림
   ④ assets/report-core.js + tools/agent-backend.gs: 성적표 카드·메일이 고른 면적 시세를 쓰고, 서버 cleanPlace 가 ar 를 저장
   ⑤ 화면: mine/·my/report/ 에 고르기 칸, 공개 화면·코드에 기준 숫자(엔진 기준 건수·배율) 없음 */
const fs = require('fs'), vm = require('vm'), path = require('path');
const ROOT = path.join(__dirname, '..'), read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const M = require('../assets/mine-core.js'), RC = require('../assets/report-core.js');
let pass = 0, fail = 0;
function check(name, cond, extra) { if (cond) pass++; else { fail++; console.log('  실패:', name, extra !== undefined ? JSON.stringify(extra).slice(0, 600) : ''); } }

/* ---------- ① 칸 13 ---------- */
const months = []; for (let i = 0; i < 36; i++) { const y = 2023 + Math.floor((10 + i) / 12), m = (10 + i) % 12 + 1; months.push(`${y}${String(m).padStart(2, '0')}`); }
const z = n => Array(n).fill(0);
const s32 = z(33).concat([4100, 4200, 4287]), s37 = z(33).concat([4500, 4600, 4731]), s41 = z(34).concat([4402, 0]);
// 상계주공2(고층) 40㎡ 이하형: 32.4㎡(대표, 거래 많음) · 37.5㎡(37·38 한 타입) · 41.3㎡
const T = [[20261016, 38.0, 9, 55000, 0, 0], [20261016, 32.39, 14, 41000, 0, 0], [20261014, 41.3, 4, 60000, 0, 0], [20261009, 32.39, 1, 39500, 1, 0],
  [20260813, 37.46, 5, 53000, 0, 0], [20260811, 37.46, 7, 50000, 1, 0], [20250101, 37.46, 3, 40000, 0, 0]];
const cnt = z(36); cnt[35] = 2; cnt[33] = 1;
const u = ['11350', '상계동', '상계주공2(고층)', '40㎡ 이하', 32.4, 50, s32, cnt.map(n => String.fromCharCode(48 + n)).join(''), '740', 1, [4000, 4287], T, { hi: [60000, 20261014, 41.3] },
  [[32.4, 50, 32, 32, 0], [37.5, 11, 37, 38, s37], [41.3, 41, 41, 41, s41]]];
const AT = M.areaTypes(u);
check('칸 13 읽기: 세 타입, 대표 = 32.4㎡(시세는 칸 6)', AT.length === 3 && AT[0].rep && AT[0].s === s32 && !AT[1].rep && AT[1].s === s37 && AT[2].n === 41, AT.map(x => [x.a, x.n, x.rep]));
check('칸 13 없거나 타입 하나면 고르기 없음', M.areaTypes(u.slice(0, 13)).length === 0 && M.areaTypes(u.slice(0, 13).concat([[[59.9, 10, 60, 60, 0]]])).length === 0);
check('칸 13 모양이 이상하면(대표 표시 없음) 고르기 없음', M.areaTypes(u.slice(0, 13).concat([[[32.4, 5, 32, 32, s32], [37.5, 5, 37, 38, s37]]])).length === 0);
check('고르기: 값 없으면 대표 타입', M.areaPick(AT, 0) === AT[0] && M.areaPick(AT, null) === AT[0]);
check('고르기: 정수 범위 안(37.46·38.0 → 37.5㎡ 타입)', M.areaPick(AT, 37.46) === AT[1] && M.areaPick(AT, 38) === AT[1] && M.areaPick(AT, 37.5) === AT[1]);
check('고르기: 범위 밖이면 가장 가까운 타입(42.0 → 41.3)', M.areaPick(AT, 42.4) === AT[2]);
check('고른 면적 = 대표면 행 그대로', M.areaUnit(u, 32.4, months) === u && M.areaUnit(u, 0, months) === u && M.areaUnit(u.slice(0, 13), 37.5, months).length === 13);
const v = M.areaUnit(u, 37.5, months);
check('고른 면적 행: 전용·3년 거래 수·월별 시세는 엔진 칸 13 값 그대로', v !== u && v[4] === 37.5 && v[5] === 11 && v[6] === s37 && v.base === u && v.ar === 37.5, [v[4], v[5]]);
check('고른 면적 행: 개별 거래는 그 타입만(직거래 포함, 목록용)', v[11].length === 4 && v[11].every(t => Math.round(t[1]) >= 37 && Math.round(t[1]) <= 38));
const vc = M.counts(v[7]);
check('고른 면적 행: 월별 건수는 그 타입·직거래 뺀 거래', vc.length === 36 && vc[35] === 1 && vc[33] === 1 && vc[14] === 1 && vc.reduce((a, b) => a + b, 0) === 3, vc);
const sm = M.bandSummary(v, months);
check('최근 시세 = 그 면적 월별 시세 마지막 값 × 그 면적 ÷ 3.3058', sm.price === M.toPrice(4731, 37.5) && sm.price === 53700 && sm.area === 37.5, sm.price);
check('대표 면적과 다른 값(32.4㎡ 기준 3억 9,500만 → 37.5㎡ 5억 3,700만)', M.bandSummary(u, months).price !== sm.price);
check('1년 변동도 그 면적 시세로', sm.ch1 === null || sm.ch1.to === 4731);
check('거래 달 값: 칸 10 없음 → 3개월 시세(own=false)로 보여 줌', M.lastDeal(v, months).own === false && M.lastDeal(v, months).ppy === 4731);
const v41 = M.areaUnit(u, 41.3, months), sm41 = M.bandSummary(v41, months);
check('마지막 달 시세가 0 이면 앞 달 값(3개월 안) — 기존 규칙 그대로', sm41.ppy === 4402 && sm41.stale === true, [sm41.ppy, sm41.at]);
check('원래 행은 바뀌지 않음', u[4] === 32.4 && u[6] === s32 && u[11].length === 7);

/* ---------- ② 내 집 저장 ---------- */
const H = { sd: 's00', code: '11350', dong: '상계동', jibun: '740', apt: '상계주공2(고층)', band: '40㎡ 이하', bp: 40000, bd: '2020-05', t: '2026-11-22' };
check('저장: 고른 전용면적(소수 첫째 자리)', M.cleanHome(Object.assign({ ar: 37.46 }, H)).ar === 37.5);
check('저장: 없거나 이상한 값이면 키 없음(예전 자료와 같은 글자)', !('ar' in M.cleanHome(H)) && !('ar' in M.cleanHome(Object.assign({ ar: 'x' }, H))) && !('ar' in M.cleanHome(Object.assign({ ar: 999 }, H)))
  && M.dumpStore([M.cleanHome(H)]) === JSON.stringify({ v: 1, list: [{ sd: 's00', code: '11350', dong: '상계동', jibun: '740', apt: '상계주공2(고층)', band: '40㎡ 이하', bp: 40000, bd: '2020-05', t: '2026-11-22' }] }));
const st = M.parseStore(M.dumpStore([Object.assign({ ar: 37.5 }, H)]));
check('저장 → 읽기에서 그대로, 내 집 id 는 면적과 상관없음', st[0].ar === 37.5 && M.homeId(st[0]) === M.homeId(H));
const ad = M.addHome([Object.assign({ ar: 37.5 }, H)], Object.assign({}, H, { ar: 41.3 }));
check('같은 집 다시 저장하면 면적만 바뀜(개수 그대로)', ad.ok && ad.list.length === 1 && ad.list[0].ar === 41.3);

/* ---------- ③ 계정 맞추기(auth.js syncHomes) ---------- */
function authEnv(serverHomes, opts) {
  const store = new Map(), sess = new Map(), sent = [];
  const srv = { homes: serverHomes, keepAr: !!(opts && opts.keepAr) };
  const clean = h => { const o = Object.assign({}, h); if (!srv.keepAr) delete o.ar; return o; };
  const ctx = {
    console, JSON, Promise, Date, Object, Array, Math, String, Number, Error, setTimeout,
    JDJ_SITE: { KAKAO_JS_KEY: 'k', API: 'https://srv.example' }, JDJ_MINE: M,
    localStorage: { getItem: k => store.has(k) ? store.get(k) : null, setItem: (k, x) => store.set(k, String(x)), removeItem: k => store.delete(k) },
    sessionStorage: { getItem: k => sess.has(k) ? sess.get(k) : null, setItem: (k, x) => sess.set(k, String(x)), removeItem: k => sess.delete(k) },
    fetch: (url, o) => {
      const b = JSON.parse(o.body); sent.push(b.action);
      if (b.action === 'userLoad') return Promise.resolve({ json: () => ({ ok: true, nick: 'n', data: { homes: srv.homes.map(clean), favs: [], reports: [] } }) });
      if (b.action === 'userSave') { srv.homes = (b.data.homes || []).map(clean); return Promise.resolve({ json: () => ({ ok: true, data: Object.assign({}, b.data, { homes: srv.homes }) }) }); }
      return Promise.resolve({ json: () => ({ ok: true }) });
    }
  };
  ctx.window = undefined; vm.createContext(ctx);
  vm.runInContext(read('assets/auth.js').replace(/\}\)\(typeof window !== 'undefined' \? window : this\);\s*$/, '})(globalThis);'), ctx);
  store.set('jdj_auth', JSON.stringify({ s: 'a'.repeat(64), nick: 'n', exp: '2099-01-01' }));
  return { A: ctx.JDJ_AUTH, store, sent, srv };
}
(async () => {
  const base = M.cleanHome(H);
  // 재배포 전 서버(ar 를 버림): 이 기기 값 지킴, 첫 맞추기에서 한 번 올리고 같은 날 다시 맞춰도 안 올림
  let E = authEnv([base]);
  E.store.set('jdj_myhome', M.dumpStore([Object.assign({ ar: 37.5 }, H)]));
  await E.A.syncHomes();
  let loc = M.parseStore(E.store.get('jdj_myhome'));
  check('맞추기(재배포 전): 서버 목록을 따르되 이 기기의 고른 면적은 지킴', loc.length === 1 && loc[0].ar === 37.5, loc);
  check('맞추기(재배포 전): 한 번 올려 봄', E.sent.filter(x => x === 'userSave').length === 1, E.sent);
  const n1 = E.sent.length; await E.A.load(true); await E.A.syncHomes();
  check('맞추기(재배포 전): 같은 날 다시 맞춰도 또 올리지 않음', E.sent.slice(n1).filter(x => x === 'userSave').length === 0, E.sent.slice(n1));
  check('맞추기(재배포 전): 면적 기록은 서버가 안 받음(ok=false)', JSON.parse(E.store.get('jdj_myhome_ar')).ok === false);
  // 재배포 뒤 서버(ar 저장): 올리면 계정에 남고 그 뒤로는 안 올림
  E = authEnv([base], { keepAr: true });
  E.store.set('jdj_myhome', M.dumpStore([Object.assign({ ar: 37.5 }, H)]));
  await E.A.syncHomes();
  check('맞추기(재배포 뒤): 계정에 고른 면적 저장', E.srv.homes[0].ar === 37.5 && JSON.parse(E.store.get('jdj_myhome_ar')).ok === true, E.srv.homes);
  const n2 = E.sent.length; await E.A.load(true); await E.A.syncHomes();
  check('맞추기(재배포 뒤): 계정과 같으면 다시 안 올림', E.sent.slice(n2).filter(x => x === 'userSave').length === 0);
  // 다른 기기에서 고른 면적(계정에 있음)이 이 기기로 옴
  E = authEnv([Object.assign({ ar: 41.3 }, base)], { keepAr: true });
  E.store.set('jdj_myhome', M.dumpStore([base]));
  await E.A.syncHomes();
  check('맞추기: 계정에 있는 고른 면적이 이 기기로', M.parseStore(E.store.get('jdj_myhome'))[0].ar === 41.3 && E.sent.filter(x => x === 'userSave').length === 0);
  // 고른 면적이 없는 사람은 예전과 똑같이(올리기 없음)
  E = authEnv([base]); E.store.set('jdj_myhome', M.dumpStore([base]));
  await E.A.syncHomes();
  check('맞추기: 면적을 안 고른 사람은 예전 그대로(올리기 없음, 기록 없음)', E.sent.filter(x => x === 'userSave').length === 0 && !E.store.has('jdj_myhome_ar'));

  /* ---------- ④ 성적표 ---------- */
  const key = '상계동|740|상계주공2(고층)|40㎡ 이하';
  const R = { date: '2026-11-30', pd: '2026-11-23', u: { [key]: [39500, 3, 60, 55.0, 9, 1, '202610', 40, [], [[32.4, 39500, '202610'], [37.5, 53700, '202610'], [41.3, 57900, '202609']]] },
    p: { [key]: [39000, 3, 60, 55.0, [[32.4, 39000], [37.5, 52000], [41.3, null]]] }, d: {} };
  const c0 = RC.card(H, R), c1 = RC.card(Object.assign({ ar: 37.5 }, H), R), c2 = RC.card(Object.assign({ ar: 41.3 }, H), R), c3 = RC.card(Object.assign({ ar: 84.9 }, H), R);
  check('성적표: 면적을 안 골랐으면 예전 그대로(대표 면적 시세)', c0.price.v === 39500 && c0.price.v0 === 39000 && !c0.price.ar);
  check('성적표: 고른 면적 시세·지난 값', c1.price.v === 53700 && c1.price.v0 === 52000 && c1.price.ar === 37.5 && c1.price.at === '202610', c1.price);
  check('성적표: 지난 값이 없으면 차이 안 냄', c2.price.v === 57900 && c2.price.v0 === null && c2.price.at === '202609');
  check('성적표: 목록에 없는 면적이면 대표 면적 시세', c3.price.v === 39500 && !c3.price.ar);
  const pl = RC.lines(c1, '노원구').find(l => l.k === 'price');
  check('성적표 문장: 고른 면적을 밝힘, 지난번보다 차이', /전용 37\.5㎡\(내가 고른 면적\)/.test(pl.s) && /지난번보다 1,700만 원 올랐어요/.test(pl.t), pl);
  check('성적표 문장: 기준 숫자 없음', !/\d건|배율|0\.5|2\.0/.test(pl.s));
  const mail = RC.mailHtml([{ c: c1, g: '노원구', mine: true }], { web: 'https://x.example/' });
  check('성적표 메일: 크게 보기 링크에 고른 면적(a=)', /my\/report\/\?[^"]*&amp;a=37\.5|my\/report\/\?[^"]*&a=37\.5/.test(mail.html), mail.html.match(/my\/report[^"]*/));
  const R2 = { date: '2026-11-30', u: { [key]: [null, null, null, null, null, 0, '', null, [], [[32.4, null, ''], [37.5, null, '']]] }, p: {}, d: {} };
  check('성적표: 고른 면적도 최근 거래가 없으면 시세 없음', RC.card(Object.assign({ ar: 37.5 }, H), R2).price === null);
  check('면적 찾기: 2㎡ 넘게 떨어지면 없음', RC.area([[32.4, 1], [37.5, 2]], 40) === null && RC.area([[32.4, 1], [37.5, 2]], 38.9)[0] === 37.5 && RC.area(null, 37) === null);
  // 서버 사본이 같고, cleanPlace 가 ar 를 지킴
  const gs = read('tools/agent-backend.gs'), blk = t => t.slice(t.indexOf('/* REPORT-CORE BEGIN'), t.indexOf('/* REPORT-CORE END */'));
  check('서버: 성적표 계산 블록이 화면과 글자 그대로 같음', blk(gs) === blk(read('assets/report-core.js')));
  const cp = gs.slice(gs.indexOf('function cleanPlace('), gs.indexOf('function cleanReport('));
  const sb = { UD_SD: /^s\d{2}$/, UD_CODE: /^\d{5}$/, uText: (x, n) => String(x == null ? '' : x).slice(0, n), Math, Number, isFinite, String };
  vm.createContext(sb); vm.runInContext(cp + ';globalThis.cp = cleanPlace;', sb);
  check('서버 cleanPlace: 고른 면적 저장(내 집·메일용 모두)', sb.cp(Object.assign({ ar: 37.46 }, H), true).ar === 37.5 && sb.cp(Object.assign({ ar: 37.5 }, H), false).ar === 37.5);
  check('서버 cleanPlace: 없거나 이상한 값은 키 없음', !('ar' in sb.cp(H, true)) && !('ar' in sb.cp(Object.assign({ ar: '<b>' }, H), true)) && !('ar' in sb.cp(Object.assign({ ar: 1000 }, H), true)));
  check('서버: v49 변경 요약에 전용면적 줄(재배포 안내)', /내 집 전용면적\(homes\[\]\.ar/.test(gs));

  /* ---------- ⑤ 화면 ---------- */
  const mine = read('mine/index.html'), rep = read('my/report/index.html');
  check('내 집 시세: 평형 아래 전용면적 고르기(누르면 다시 그리고 저장한 내 집도 바꿈)', /data-ar="\$\{t\.a\}"/.test(mine) && /우리 집 전용면적/.test(mine) && /function pickArea/.test(mine) && /h\.ar = ap\.a/.test(mine));
  check('내 집 카드: 면적 고르기 칸·안 골랐으면 안내', /class="hareas"/.test(mine) && /골라 주세요/.test(mine) && /가장 많이 거래된 \$\{AP\.a\}㎡ 기준이에요/.test(mine));
  check('내 집 시세: 주소에 고른 면적(a=)', /searchParams\.set\('a', S\.ar\)/.test(mine) && /ar: \+q\.get\('a'\)/.test(mine));
  check('성적표 화면: 내 집이면 전용면적 고르기', /function areaPanel/.test(rep) && /id="arSel"/.test(rep) && /AU\.pushHomes/.test(rep));
  const core = read('assets/mine-core.js');
  const pub = [mine, rep, core.slice(core.indexOf('평형 안 전용면적 고르기'), core.indexOf('/* ---------- 내 집 (브라우저 저장)'))].join('\n');
  check('공개 코드·문구에 엔진 기준값(SAME_MIN·ADJ_CLAMP·ADJ_LONG·배율 숫자) 없음', !/SAME_MIN|ADJ_CLAMP|ADJ_LONG|배율 \d|\b0\.5\s*~\s*2/.test(pub));
  check('화면 문구 ~요 말투(고르기 안내)', /그 면적 시세로 바꿔 보여 드려요/.test(mine) && /그 면적 기준으로 보여 드려요/.test(rep));
  check('웹은 면적별 시세를 다시 계산하지 않음(중간값·배율 계산 없음)', !/median|ratio/.test(core.slice(core.indexOf('function areaTypes'), core.indexOf('/* ---------- 내 집 (브라우저 저장)'))));

  console.log(`전용면적 고르기 확인: ${pass}개 통과, ${fail}개 실패`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
