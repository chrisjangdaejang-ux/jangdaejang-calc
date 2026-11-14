/**
 * 장대장 공인중개사 제휴 — 구글 시트 + Apps Script 백엔드 (1단계)
 *
 * 설치: 구글 시트 새로 만들기 → 확장 프로그램 → Apps Script → 이 코드 전체 붙여넣기 → 저장
 *       → 위쪽 함수 선택에서 setup 실행(권한 허용) → 배포 → 새 배포 → 유형: 웹 앱
 *       → 실행: 나, 액세스 권한: 모든 사용자 → 배포 → 웹 앱 URL 복사
 *
 * 운영: '중개사' 시트에서 입금 확인 후 [승인] 체크 + [만료일] 입력 → 5분 안에 리포트에 노출
 *       '로그' 시트에 노출·열람·전화·카톡 클릭이 쌓이고, 중개사는 관리 화면에서 본인 성과를 확인
 */

const SLOT = 9999;         // 한 구에 받을 수 있는 제휴 중개사 수 (9999 = 제한 없음, 선택한 중개사 전부 노출)
const MAX_EXTRA = 2;       // 사무소 구 외 추가 구 수
const MAX_DANJI = 10;      // 매물 보유 단지 최대 수
const CONFIRM_DAYS = 30;   // 매물 보유 재확인 주기(일)
const NOTIFY = true;       // 새 신청 시 시트 주인에게 메일 알림
/* 시트 메뉴에서 Apps Script를 열지 못해 script.google.com에서 따로 만든 경우에만,
   시트 주소의 /d/ 와 /edit 사이 문자열(시트 ID)을 아래 따옴표 안에 넣으세요. */
const SHEET_ID = '';
function book() { return SHEET_ID ? SpreadsheetApp.openById(SHEET_ID) : SpreadsheetApp.getActive(); }

const SH_A = '중개사', SH_L = '로그';
const H = ['id','등록번호','사무소명','대표자','전화','카카오','소개','시도','사무소구코드','사무소구','사무소동',
           '추가구','단지','관리코드','신청일','승인','만료일','메모','수정일','상품','사업자번호','계산서메일','노출지역'];
const PLAN = { basic: '기본', premium: '프리미엄' };   // 기본 월 29,000원 · 프리미엄 월 49,000원 (연간 결제, 부가세 별도)
const COL = Object.fromEntries(H.map((h, i) => [h, i]));

/* ---------- 최초 1회 실행 ---------- */
function setup() {
  const ss = book();
  let a = ss.getSheetByName(SH_A) || ss.insertSheet(SH_A);
  a.getRange(1, 1, 1, H.length).setValues([H]).setFontWeight('bold').setBackground('#3B3F22').setFontColor('#F5EFDC');
  a.setFrozenRows(1);
  a.getRange(2, COL['만료일'] + 1, 999, 1).setNumberFormat('yyyy-mm-dd');
  a.getRange(2, COL['신청일'] + 1, 999, 1).setNumberFormat('yyyy-mm-dd');
  a.getRange(2, COL['수정일'] + 1, 999, 1).setNumberFormat('yyyy-mm-dd hh:mm');
  let l = ss.getSheetByName(SH_L) || ss.insertSheet(SH_L);
  l.getRange(1, 1, 1, 6).setValues([['시각','유형','중개사id','구코드','단지','방문자']]).setFontWeight('bold');
  l.setFrozenRows(1);
  const s1 = ss.getSheetByName('Sheet1') || ss.getSheetByName('시트1');
  if (s1 && ss.getSheets().length > 2) ss.deleteSheet(s1);
}

/* ---------- 공통 ---------- */
function out(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function today() { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }
function ymd(d) { return Utilities.formatDate(d, 'Asia/Seoul', 'yyyy-MM-dd'); }
function str(v, n) { return String(v == null ? '' : v).trim().slice(0, n || 200); }
function parseJ(v, d) { try { return v ? JSON.parse(v) : d; } catch (e) { return d; } }

function agents() {
  const sh = book().getSheetByName(SH_A);
  const vals = sh.getDataRange().getValues();
  const list = [];
  for (let i = 1; i < vals.length; i++) {
    const r = vals[i];
    if (!r[COL['id']]) continue;
    list.push({
      row: i + 1, id: String(r[COL['id']]), reg: String(r[COL['등록번호']]), office: String(r[COL['사무소명']]),
      ceo: String(r[COL['대표자']]), phone: String(r[COL['전화']]), kakao: String(r[COL['카카오']]), intro: String(r[COL['소개']]),
      sido: String(r[COL['시도']]), og: String(r[COL['사무소구코드']]), ogName: String(r[COL['사무소구']]), dong: String(r[COL['사무소동']]),
      extras: parseJ(r[COL['추가구']], []), danji: parseJ(r[COL['단지']], []), code: String(r[COL['관리코드']]),
      applied: r[COL['신청일']], approved: r[COL['승인']] === true, expires: r[COL['만료일']], memo: String(r[COL['메모']]),
      plan: String(r[COL['상품']] || PLAN.premium), biz: String(r[COL['사업자번호']] || ''), mail: String(r[COL['계산서메일']] || '')
    });
  }
  return list;
}
function isActive(a) {
  if (!a.approved) return false;
  if (a.expires instanceof Date && a.expires < today()) return false;
  return true;
}
function regionsOf(a) { return [a.og].concat(a.extras || []); }
function freshDanji(a) {
  const lim = today().getTime() - CONFIRM_DAYS * 86400000;
  return (a.danji || []).filter(d => d.at && new Date(d.at).getTime() >= lim);
}
function slotCount(gu, exceptId, list) {
  return list.filter(a => a.id !== exceptId && isActive(a) && regionsOf(a).indexOf(gu) >= 0).length;
}
function statusOf(a) {
  if (!a.approved) return '승인 대기';
  if (a.expires instanceof Date && a.expires < today()) return '기간 만료';
  return '노출 중';
}

/* ---------- 요청 처리 ---------- */
function doGet(e) {
  const act = (e.parameter || {}).action;
  if (act === 'list') return out(listPublic());
  if (act === 'unsub') return unsubscribe(e.parameter);
  return out({ ok: false, err: 'unknown' });
}

/* 예전 시트에 새 열 제목(상품·사업자번호·계산서메일·노출지역)이 없으면 채움 */
function ensureHeader() {
  const sh = book().getSheetByName(SH_A);
  const cur = sh.getRange(1, 1, 1, H.length).getValues()[0];
  if (cur[H.length - 1] !== H[H.length - 1]) sh.getRange(1, 1, 1, H.length).setValues([H]).setFontWeight('bold').setBackground('#3B3F22').setFontColor('#F5EFDC');
}

function doPost(e) {
  let b;
  try { b = JSON.parse(e.postData.contents); } catch (x) { return out({ ok: false, err: '요청 형식 오류' }); }
  if (b.action === 'log') return out(logEvents(b));
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    ensureHeader();
    if (b.action === 'alert_sub') return out(alertSub(b));
    if (b.action === 'apply') return out(apply(b));
    if (b.action === 'login') return out(login(b));
    if (b.action === 'update') return out(update(b));
    return out({ ok: false, err: 'unknown' });
  } catch (x) {
    return out({ ok: false, err: String(x.message || x) });
  } finally {
    lock.releaseLock();
  }
}

/* 리포트용 공개 목록: 승인·기간 내 중개사만, 공개 정보만 */
function listPublic() {
  const cache = CacheService.getScriptCache();
  const hit = cache.get('list');
  if (hit) return JSON.parse(hit);
  const res = {
    ok: true, slot: SLOT, at: ymd(new Date()),
    agents: agents().filter(isActive).map(a => ({
      id: a.id, n: a.office, ceo: a.ceo, ph: a.phone, kk: a.kakao, intro: a.intro, reg: a.reg,
      og: a.og, ogn: a.ogName, dong: a.dong, r: regionsOf(a), dj: a.plan === PLAN.premium ? freshDanji(a).map(d => d.k) : [], pl: a.plan === PLAN.premium ? 'p' : 'b'
    }))
  };
  cache.put('list', JSON.stringify(res), 300);
  return res;
}

/* 구 코드 → 이름 (신청 화면이 보내 준 이름 사용, 없으면 코드 그대로) */
function regionNames(codes, names) {
  names = names || {};
  return codes.map(c => str(names[c], 20) || c).join(', ');
}

function validRegions(og, extras) {
  if (!/^\d{5}$/.test(og)) throw new Error('사무소 구를 선택해 주세요.');
  extras = (extras || []).map(String).filter(x => /^\d{5}$/.test(x));
  extras = extras.filter((x, i) => extras.indexOf(x) === i && x !== og);
  if (extras.length > MAX_EXTRA) throw new Error(`추가 지역은 ${MAX_EXTRA}개 구까지 고를 수 있습니다.`);
  if (extras.some(x => x.slice(0, 2) !== og.slice(0, 2))) throw new Error('추가 지역은 사무소와 같은 시·도 안에서 고를 수 있습니다.');
  return extras;
}
function validDanji(list, regions, prev) {
  list = (list || []).slice(0, MAX_DANJI + 5).map(d => ({ k: str(d.k, 120), n: str(d.n, 60) }))
    .filter(d => d.k.split('|').length === 3);
  const seen = {};
  list = list.filter(d => (seen[d.k] ? false : (seen[d.k] = true)));
  if (list.length > MAX_DANJI) throw new Error(`매물 보유 단지는 ${MAX_DANJI}개까지 등록할 수 있습니다.`);
  if (list.some(d => regions.indexOf(d.k.split('|')[0]) < 0)) throw new Error('매물 보유 단지는 선택한 3개 구 안의 단지만 등록할 수 있습니다.');
  const old = {}; (prev || []).forEach(d => old[d.k] = d.at);
  return list.map(d => ({ k: d.k, n: d.n, at: old[d.k] || ymd(new Date()) }));
}

function apply(b) {
  const reg = str(b.reg, 40), office = str(b.office, 40), ceo = str(b.ceo, 20), phone = str(b.phone, 20);
  if (!reg || !office || !ceo || !phone) throw new Error('등록번호·사무소명·대표자·전화번호는 꼭 입력해 주세요.');
  if (!b.agree) throw new Error('유의사항 동의가 필요합니다.');
  const list = agents();
  if (list.some(a => a.reg.replace(/\s/g, '') === reg.replace(/\s/g, ''))) throw new Error('이미 신청된 등록번호입니다. [내 관리]에서 로그인해 수정해 주세요.');
  const og = str(b.og, 5), extras = validRegions(og, b.extras);
  const regions = [og].concat(extras);
  const plan = b.plan === 'premium' ? PLAN.premium : PLAN.basic;
  const danji = plan === PLAN.premium ? validDanji(b.danji, regions, []) : [];
  const full = regions.filter(g => slotCount(g, '', list) >= SLOT);
  const id = 'A' + Utilities.getUuid().replace(/-/g, '').slice(0, 7).toUpperCase();
  const code = Utilities.getUuid().replace(/-/g, '').slice(0, 8).toUpperCase();
  const row = [];
  row[COL['id']] = id; row[COL['등록번호']] = reg; row[COL['사무소명']] = office; row[COL['대표자']] = ceo;
  row[COL['전화']] = phone; row[COL['카카오']] = str(b.kakao, 200); row[COL['소개']] = str(b.intro, 120);
  row[COL['시도']] = str(b.sido, 20); row[COL['사무소구코드']] = og; row[COL['사무소구']] = str(b.ogName, 30);
  row[COL['사무소동']] = str(b.dong, 30); row[COL['추가구']] = JSON.stringify(extras); row[COL['단지']] = JSON.stringify(danji);
  row[COL['관리코드']] = code; row[COL['신청일']] = new Date(); row[COL['승인']] = false; row[COL['만료일']] = '';
  row[COL['메모']] = full.length ? '대기(자리 마감): ' + full.join(',') : ''; row[COL['수정일']] = new Date();
  row[COL['상품']] = plan; row[COL['사업자번호']] = str(b.biz, 20); row[COL['계산서메일']] = str(b.mail, 80);
  const rname = regionNames(regions, b.names);
  row[COL['노출지역']] = rname;
  const sh = book().getSheetByName(SH_A);
  sh.appendRow(row);
  sh.getRange(sh.getLastRow(), COL['승인'] + 1).insertCheckboxes();   // 승인 칸을 체크박스로
  if (NOTIFY) {
    try {
      MailApp.sendEmail(Session.getEffectiveUser().getEmail(), `[장대장 제휴] 새 신청: ${office}`,
        `${office} (${ceo}) ${phone}\n상품 ${plan}\n등록번호 ${reg}\n사업자번호 ${str(b.biz, 20)} / 계산서 ${str(b.mail, 80)}\n지역 ${rname} (사무소 ${str(b.ogName, 30)} ${str(b.dong, 30)})\n시트에서 확인 후 승인 체크와 만료일을 입력하세요.\n${book().getUrl()}`);
    } catch (e) {}
  }
  return { ok: true, id: id, code: code, waitlist: full };
}

function findMe(b, list) {
  const reg = str(b.reg, 40).replace(/\s/g, ''), code = str(b.code, 20).toUpperCase();
  const me = list.find(a => a.reg.replace(/\s/g, '') === reg && a.code.toUpperCase() === code);
  if (!me) throw new Error('등록번호 또는 관리코드가 맞지 않습니다.');
  return me;
}
function slotsFor(prefix, me, list) {
  const gus = {};
  list.filter(isActive).forEach(a => regionsOf(a).forEach(g => {
    if (g.slice(0, 2) === prefix && a.id !== me.id) gus[g] = (gus[g] || 0) + 1;
  }));
  return gus;
}
function meOut(me, list) {
  const fresh = freshDanji(me).map(d => d.k);
  return {
    ok: true, slot: SLOT, maxExtra: MAX_EXTRA, maxDanji: MAX_DANJI, confirmDays: CONFIRM_DAYS,
    me: {
      id: me.id, reg: me.reg, office: me.office, ceo: me.ceo, phone: me.phone, kakao: me.kakao, intro: me.intro,
      sido: me.sido, og: me.og, ogName: me.ogName, dong: me.dong, extras: me.extras,
      danji: (me.danji || []).map(d => ({ k: d.k, n: d.n, at: d.at, fresh: fresh.indexOf(d.k) >= 0 })),
      status: statusOf(me), expires: me.expires instanceof Date ? ymd(me.expires) : '', waitMemo: me.memo,
      plan: me.plan, biz: me.biz, mail: me.mail
    },
    used: slotsFor(me.og.slice(0, 2), me, list),
    stats: statsFor(me.id)
  };
}
function login(b) { const list = agents(); return meOut(findMe(b, list), list); }

function update(b) {
  const list = agents();
  const me = findMe(b, list);
  const extras = validRegions(me.og, b.extras);
  const regions = [me.og].concat(extras);
  if (isActive(me)) {
    const added = extras.filter(g => (me.extras || []).indexOf(g) < 0);
    const full = added.filter(g => slotCount(g, me.id, list) >= SLOT);
    if (full.length) throw new Error('선택한 구 중 자리가 마감된 곳이 있습니다: ' + full.join(', '));
  }
  let danji = me.plan === PLAN.premium ? validDanji(b.danji, regions, me.danji) : [];
  if (b.reconfirm) danji = danji.map(d => ({ k: d.k, n: d.n, at: ymd(new Date()) }));
  const sh = book().getSheetByName(SH_A);
  const set = (h, v) => sh.getRange(me.row, COL[h] + 1).setValue(v);
  set('추가구', JSON.stringify(extras));
  set('단지', JSON.stringify(danji));
  if (b.phone) set('전화', str(b.phone, 20));
  set('카카오', str(b.kakao, 200));
  set('소개', str(b.intro, 120));
  if (b.names) set('노출지역', regionNames(regions, b.names));
  if (b.biz != null) set('사업자번호', str(b.biz, 20));
  if (b.mail != null) set('계산서메일', str(b.mail, 80));
  set('수정일', new Date());
  CacheService.getScriptCache().remove('list');
  const list2 = agents();
  return meOut(list2.find(a => a.id === me.id), list2);
}

/* 기록: rec = 추천 단지 카드에 표시(펼치기 전, 한 줄에 여러 중개사 id), imp = [공인중개사 연결하기]로 목록 펼침,
   view = 정보 창 열람, call = 전화 버튼, kakao = 카톡 버튼 */
const TYPES = ['rec', 'imp', 'view', 'call', 'kakao'];
const ID_RE = /^A[0-9A-F]{7}$/;
function logEvents(b) {
  const ev = (b.events || []).slice(0, 40);
  const vid = str(b.vid, 40), now = new Date();
  const rows = [];
  ev.forEach(x => {
    if (TYPES.indexOf(x.t) < 0 || !/^\d{5}$/.test(x.g)) return;
    const ids = String(x.a || '').split(',').filter(id => ID_RE.test(id)).slice(0, 80);
    if (!ids.length || (x.t !== 'rec' && ids.length > 1)) return;
    rows.push([now, x.t, ids.join(','), x.g, str(x.k, 120), vid]);
  });
  if (rows.length) {
    const sh = book().getSheetByName(SH_L);
    sh.getRange(sh.getLastRow() + 1, 1, rows.length, 6).setValues(rows);
  }
  return { ok: true, n: rows.length };
}

/* 이번 달·지난 달 성과 */
function zero() { return { rec: 0, imp: 0, view: 0, call: 0, kakao: 0 }; }
function statsFor(id) {
  const sh = book().getSheetByName(SH_L);
  const n = sh.getLastRow();
  const res = {};
  const now = new Date();
  const keep = [Utilities.formatDate(now, 'Asia/Seoul', 'yyyy-MM'),
                Utilities.formatDate(new Date(now.getFullYear(), now.getMonth() - 1, 15), 'Asia/Seoul', 'yyyy-MM')];
  keep.forEach(m => res[m] = { tot: zero(), gu: {}, dj: {} });
  if (n < 2) return res;
  const vals = sh.getRange(2, 1, n - 1, 5).getValues();
  for (const r of vals) {
    if (!(r[0] instanceof Date)) continue;
    if (String(r[2]).split(',').indexOf(id) < 0) continue;
    const m = Utilities.formatDate(r[0], 'Asia/Seoul', 'yyyy-MM');
    if (!res[m]) continue;
    const t = String(r[1]), g = String(r[3]), k = String(r[4] || '');
    res[m].tot[t] = (res[m].tot[t] || 0) + 1;
    const G = res[m].gu[g] = res[m].gu[g] || zero();
    G[t] = (G[t] || 0) + 1;
    if (k && (t === 'rec' || t === 'imp')) {
      const D = res[m].dj[k] = res[m].dj[k] || { rec: 0, imp: 0 };
      D[t]++;
    }
  }
  return res;
}


/* =====================================================================
   갈아타기 갭 알림 (이메일)
   - 고객이 갈아타기 계산기에서 '지금 집'과 '갈아탈 집'(단지·평형)을 고르고 조건을 정하면 '알림' 시트에 저장
   - checkAlerts()가 매일 실거래 데이터로 두 단지 가격 차이(갭)를 다시 계산해 조건을 만족하면 메일 발송
   - 최초 1회: 편집기에서 setupAlerts 실행 → 매일 오전 10시 자동 점검 트리거 생성
   ===================================================================== */
const SH_AL = '알림';
const AL_H = ['id','이메일','지금집','지금집키','지금집시도','지금집면적','갈아탈집','갈아탈집키','갈아탈집시도','갈아탈집면적',
              '조건','조건값','기준갭','최근갭','등록일','최근점검','최근알림','상태','토큰','마케팅동의','마케팅동의일'];
const AC = Object.fromEntries(AL_H.map((h, i) => [h, i]));
const DATA_URL = 'https://chrisjangdaejang-ux.github.io/jangdaejang-timing/data/';
const SITE_URL = 'https://chrisjangdaejang-ux.github.io/jangdaejang-calc/switch/';
const MAX_ALERTS_PER_EMAIL = 5;

function alertSheet() {
  const ss = book();
  let sh = ss.getSheetByName(SH_AL);
  if (!sh) {
    sh = ss.insertSheet(SH_AL);
    sh.getRange(1, 1, 1, AL_H.length).setValues([AL_H]).setFontWeight('bold').setBackground('#3B3F22').setFontColor('#F5EFDC');
    sh.setFrozenRows(1);
  }
  if (sh.getRange(1, AL_H.length).getValue() !== AL_H[AL_H.length - 1])     // 예전 시트면 새 열 제목 채움
    sh.getRange(1, 1, 1, AL_H.length).setValues([AL_H]).setFontWeight('bold').setBackground('#3B3F22').setFontColor('#F5EFDC');
  return sh;
}

/* 최초 1회 실행: '알림' 시트 + 매일 점검 트리거 */
function setupAlerts() {
  alertSheet();
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'checkAlerts').forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('checkAlerts').timeBased().everyDays(1).atHour(10).inTimezone('Asia/Seoul').create();
}

function eok(man) {
  man = Math.round(man);
  const sign = man < 0 ? '-' : '';
  man = Math.abs(man);
  const e = Math.floor(man / 10000), r = man % 10000;
  return sign + (e ? e + '억' + (r ? ' ' + r.toLocaleString() + '만' : '') : r.toLocaleString() + '만') + '원';
}

function alertSub(b) {
  const email = str(b.email, 80).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('이메일 주소를 확인해 주세요.');
  if (!b.agree) throw new Error('개인정보 수집·이용 동의가 필요합니다.');
  const m = b.mine || {}, t = b.target || {};
  const okUnit = u => u && /^\d{5}\|[^|]+\|[^|]+\|[^|]+$/.test(str(u.key, 160)) && str(u.sido, 20) && Number(u.area) > 0;
  if (!okUnit(m) || !okUnit(t)) throw new Error('지금 집과 갈아탈 집을 모두 골라 주세요.');
  if (m.key === t.key) throw new Error('두 집이 같습니다.');
  const cond = b.cond === 'below' ? 'below' : 'change';
  const val = Number(b.val);
  if (!(val > 0)) throw new Error('알림 조건 값을 입력해 주세요.');
  const sh = alertSheet();
  const rows = sh.getDataRange().getValues().slice(1);
  if (rows.filter(r => String(r[AC['이메일']]) === email && r[AC['상태']] === '활성').length >= MAX_ALERTS_PER_EMAIL)
    throw new Error(`한 이메일로 알림은 ${MAX_ALERTS_PER_EMAIL}개까지 받을 수 있습니다.`);
  const id = 'L' + Utilities.getUuid().replace(/-/g, '').slice(0, 9).toUpperCase();
  const token = Utilities.getUuid().replace(/-/g, '').slice(0, 16);
  const base = Number(b.baseGap) || 0;
  const row = [];
  row[AC['id']] = id; row[AC['이메일']] = email;
  row[AC['지금집']] = str(m.name, 80); row[AC['지금집키']] = str(m.key, 160); row[AC['지금집시도']] = str(m.sido, 20); row[AC['지금집면적']] = Number(m.area);
  row[AC['갈아탈집']] = str(t.name, 80); row[AC['갈아탈집키']] = str(t.key, 160); row[AC['갈아탈집시도']] = str(t.sido, 20); row[AC['갈아탈집면적']] = Number(t.area);
  row[AC['조건']] = cond; row[AC['조건값']] = val; row[AC['기준갭']] = base; row[AC['최근갭']] = base;
  row[AC['등록일']] = new Date(); row[AC['최근점검']] = ''; row[AC['최근알림']] = ''; row[AC['상태']] = '활성'; row[AC['토큰']] = token;
  row[AC['마케팅동의']] = b.marketing ? 'Y' : 'N'; row[AC['마케팅동의일']] = b.marketing ? new Date() : '';
  sh.appendRow(row);
  const condTxt = cond === 'below' ? `갭이 ${eok(val)} 이하로 좁혀지면` : `갭이 지금보다 ${val}% 이상 줄거나 늘면`;
  try {
    MailApp.sendEmail({
      to: email, name: '장대장 갈아타기 알림',
      subject: '[장대장] 갈아타기 갭 알림이 등록되었습니다',
      htmlBody: mailHtml('갭 알림 등록 완료',
        `<p><b>${str(m.name, 80)}</b> → <b>${str(t.name, 80)}</b></p>
         <p>지금 갭 <b>${eok(base)}</b> · 조건: ${condTxt} 메일을 보내 드립니다.</p>
         <p style="color:#6B6A58;font-size:13px">국토교통부 실거래가(최근 3개월 중앙값)로 매일 오전 다시 계산합니다.</p>`, id, token)
    });
  } catch (x) {}
  return { ok: true, id: id };
}

function unsubscribe(p) {
  const sh = alertSheet();
  const vals = sh.getDataRange().getValues();
  let done = false;
  for (let i = 1; i < vals.length; i++) {
    if (String(vals[i][AC['id']]) === String(p.id) && String(vals[i][AC['토큰']]) === String(p.t)) {
      sh.getRange(i + 1, AC['상태'] + 1).setValue('해지'); done = true;
    }
  }
  return HtmlService.createHtmlOutput(`<div style="font-family:sans-serif;padding:40px;text-align:center">
    <h2>${done ? '알림이 해지되었습니다' : '알림을 찾지 못했습니다'}</h2>
    <p><a href="${SITE_URL}">장대장 갈아타기 계산기로 가기</a></p></div>`);
}

function mailHtml(title, body, id, token) {
  const unsub = ScriptApp.getService().getUrl() + `?action=unsub&id=${id}&t=${token}`;
  return `<div style="font-family:'Noto Sans KR',sans-serif;max-width:560px;margin:auto;background:#F5EFDC;border-radius:12px;overflow:hidden">
    <div style="background:#3B3F22;color:#F5EFDC;padding:14px 18px;font-weight:900">★ 장대장 <span style="color:#D9B85A">갈아타기 알림</span></div>
    <div style="padding:20px 22px;color:#23241A"><h2 style="margin:0 0 10px">${title}</h2>${body}
      <p style="margin-top:18px"><a href="${SITE_URL}" style="background:#B8942A;color:#23241A;padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:900">갈아타기 계산기에서 다시 계산하기</a></p>
      <p style="font-size:11px;color:#6B6A58;margin-top:20px">추정 시세는 같은 단지·평형대 최근 3개월 실거래 중앙값이며 호가와 다를 수 있습니다. 매수·매도 권유가 아닙니다.<br>
      <a href="${unsub}" style="color:#6B6A58">알림 해지</a></p></div></div>`;
}

/* 매일 실행: 실거래 데이터로 갭 재계산 → 조건 만족 시 메일 */
function checkAlerts() {
  const sh = alertSheet();
  const vals = sh.getDataRange().getValues();
  if (vals.length < 2) return;
  const ix = JSON.parse(UrlFetchApp.fetch(DATA_URL + 'index.json').getContentText());
  const sidoId = {}; ix.sido.forEach(x => sidoId[x.name] = x.id);
  const cache = {};
  const unitMap = sido => {
    if (cache[sido]) return cache[sido];
    const id = sidoId[sido]; const map = {};
    if (id) {
      const j = JSON.parse(UrlFetchApp.fetch(DATA_URL + id + '.json').getContentText());
      j.units.forEach(u => { map[[u[0], u[1], u[2], u[3]].join('|')] = u; });
    }
    return cache[sido] = map;
  };
  const priceOf = (sido, key, area) => {
    const u = unitMap(sido)[key]; if (!u) return null;
    const s = u[6]; let ppy = 0;
    for (let i = s.length - 1; i >= Math.max(0, s.length - 3); i--) if (s[i] > 0) { ppy = s[i]; break; }
    return ppy ? Math.round(ppy * (Number(area) || u[4]) / 3.3058) : null;
  };
  const now = new Date();
  let sent = 0;
  for (let i = 1; i < vals.length; i++) {
    const r = vals[i];
    if (r[AC['상태']] !== '활성') continue;
    const pm = priceOf(r[AC['지금집시도']], r[AC['지금집키']], r[AC['지금집면적']]);
    const pt = priceOf(r[AC['갈아탈집시도']], r[AC['갈아탈집키']], r[AC['갈아탈집면적']]);
    sh.getRange(i + 1, AC['최근점검'] + 1).setValue(now);
    if (pm == null || pt == null) continue;
    const gap = pt - pm, base = Number(r[AC['기준갭']]) || gap, prev = Number(r[AC['최근갭']]);
    const val = Number(r[AC['조건값']]);
    let hit = false, why = '';
    if (r[AC['조건']] === 'below') {
      hit = gap <= val && !(prev <= val);          // 조건선을 새로 넘을 때 한 번
      why = `갭이 설정하신 ${eok(val)} 이하로 좁혀졌습니다.`;
    } else {
      const pct = base ? (gap - base) / Math.abs(base) * 100 : 0;
      hit = Math.abs(pct) >= val;
      why = `갭이 기준(${eok(base)}) 대비 ${pct > 0 ? '+' : ''}${pct.toFixed(1)}% ${pct < 0 ? '좁혀졌습니다' : '벌어졌습니다'}.`;
    }
    sh.getRange(i + 1, AC['최근갭'] + 1).setValue(gap);
    if (!hit || sent >= 80) continue;
    try {
      MailApp.sendEmail({
        to: r[AC['이메일']], name: '장대장 갈아타기 알림',
        subject: `[장대장] ${r[AC['지금집']]} → ${r[AC['갈아탈집']]} 갭 ${eok(gap)}`,
        htmlBody: mailHtml(why,
          `<table style="width:100%;border-collapse:collapse;font-size:15px">
            <tr><td style="padding:6px 0">지금 집 · ${r[AC['지금집']]}</td><td style="text-align:right"><b>${eok(pm)}</b></td></tr>
            <tr><td style="padding:6px 0">갈아탈 집 · ${r[AC['갈아탈집']]}</td><td style="text-align:right"><b>${eok(pt)}</b></td></tr>
            <tr><td style="padding:8px 0;border-top:1px solid #DCCFA8"><b>가격 차이(갭)</b></td><td style="text-align:right;border-top:1px solid #DCCFA8;color:#A23B2A"><b>${eok(gap)}</b></td></tr>
            <tr><td style="color:#6B6A58;font-size:13px">등록할 때 갭</td><td style="text-align:right;color:#6B6A58;font-size:13px">${eok(base)}</td></tr>
          </table>`, r[AC['id']], r[AC['토큰']])
      });
      sent++;
      sh.getRange(i + 1, AC['최근알림'] + 1).setValue(now);
      if (r[AC['조건']] === 'change') sh.getRange(i + 1, AC['기준갭'] + 1).setValue(gap);   // 다음 알림은 지금 갭 기준
    } catch (x) {}
  }
}
