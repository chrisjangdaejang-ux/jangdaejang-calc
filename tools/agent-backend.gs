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
           '추가구','단지','관리코드','신청일','승인','만료일','메모','수정일'];
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
      applied: r[COL['신청일']], approved: r[COL['승인']] === true, expires: r[COL['만료일']], memo: String(r[COL['메모']])
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
  return out({ ok: false, err: 'unknown' });
}

function doPost(e) {
  let b;
  try { b = JSON.parse(e.postData.contents); } catch (x) { return out({ ok: false, err: '요청 형식 오류' }); }
  if (b.action === 'log') return out(logEvents(b));
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
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
      og: a.og, ogn: a.ogName, dong: a.dong, r: regionsOf(a), dj: freshDanji(a).map(d => d.k)
    }))
  };
  cache.put('list', JSON.stringify(res), 300);
  return res;
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
  const danji = validDanji(b.danji, regions, []);
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
  const sh = book().getSheetByName(SH_A);
  sh.appendRow(row);
  sh.getRange(sh.getLastRow(), COL['승인'] + 1).insertCheckboxes();   // 승인 칸을 체크박스로
  if (NOTIFY) {
    try {
      MailApp.sendEmail(Session.getEffectiveUser().getEmail(), `[장대장 제휴] 새 신청: ${office}`,
        `${office} (${ceo}) ${phone}\n등록번호 ${reg}\n지역 ${regions.join(', ')}\n시트에서 확인 후 승인 체크와 만료일을 입력하세요.\n${book().getUrl()}`);
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
      status: statusOf(me), expires: me.expires instanceof Date ? ymd(me.expires) : '', waitMemo: me.memo
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
  let danji = validDanji(b.danji, regions, me.danji);
  if (b.reconfirm) danji = danji.map(d => ({ k: d.k, n: d.n, at: ymd(new Date()) }));
  const sh = book().getSheetByName(SH_A);
  const set = (h, v) => sh.getRange(me.row, COL[h] + 1).setValue(v);
  set('추가구', JSON.stringify(extras));
  set('단지', JSON.stringify(danji));
  if (b.phone) set('전화', str(b.phone, 20));
  set('카카오', str(b.kakao, 200));
  set('소개', str(b.intro, 120));
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
