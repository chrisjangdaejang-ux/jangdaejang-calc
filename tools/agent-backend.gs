/**
 * 장대장 공인중개사 제휴 — 구글 시트 + Apps Script 백엔드 (v15.1: 관심 지역 저장 + 카카오 로그인 재시도·오류 코드 표시)
 *
 * v15 변경 요약
 *  - 회원 저장 자료(userSave·userLoad)에 관심 지역(areas) 추가: 시·도/시·군·구 최대 10곳 + 알림 종류(새 분양 공고·무순위/잔여세대).
 *    관심 지역 저장 = 알림 신청. 카카오톡 발송은 카카오 비즈 인증 뒤 '회원' 시트 저장자료의 areas 로 보냄. 기존 기능은 그대로입니다.
 *
 * v14 변경 요약
 *  - 카카오 로그인 회원 기능 추가. 기존 기능은 그대로입니다. (검증: node tools/auth-test.js)
 *  - 새 요청(action, 모두 POST): kakaoLogin(인가 코드 → 로그인) · userLoad(저장 자료 불러오기) · userSave(저장)
 *                                · alertSubscribe(관심 단지·지역 알림 신청/취소) · userLogout(로그아웃) · userDelete(탈퇴)
 *  - 카카오에서 받는 정보는 회원번호(id)와 닉네임뿐입니다. 이메일·전화번호는 요청하지도 저장하지도 않습니다.
 *  - 카카오 토큰은 서버에서 /v2/user/me 확인에만 쓰고 바로 만료(로그아웃) 처리하며, 시트에 저장하지 않습니다.
 *    로그인 유지는 서버가 만든 무작위 세션 토큰으로 하고, 시트에는 그 해시만 저장합니다(90일 뒤 만료).
 *  - 스크립트 속성(프로젝트 설정 → 스크립트 속성): KAKAO_REST_KEY(필수, REST API 키) · KAKAO_CLIENT_SECRET(클라이언트 시크릿을 켰으면)
 *    · KAKAO_ADMIN_KEY(선택: 탈퇴 때 카카오 연결 끊기까지 하려면 어드민 키)
 *  - '회원'·'세션'·'관심알림' 시트(탭)는 첫 로그인 때 자동으로 만들어집니다. 탈퇴하면 세 시트에서 그 회원 행을 바로 지웁니다.
 *
 * v13 변경 요약
 *  - 광고 상품 안내 페이지(ad/)의 문의 접수 추가. 기존 기능은 그대로입니다.
 *  - 새 요청(action): adInquiry(POST, type:'inquiry') → '광고문의' 시트(첫 문의 때 자동 생성)에 저장 + 시트 주인에게 메일
 *  - 연락처는 시트에만 저장하고, 알림 메일·로그·통계에는 넣지 않습니다(메일에는 '시트에서 확인'만).
 *  - 입력 검증: 길이 제한, 전화번호 또는 이메일 형식, 관심 상품 허용 목록, 개인정보 동의 필수, 셀 수식 주입 차단, 하루 상한.
 *  - 보관: 문의 처리 완료 후 1년(개인정보처리방침과 같음) — '처리상태'·'처리일' 열로 관리
 *
 * v12 변경 요약
 *  - 분양 광고(시행사·분양대행사) 신청·노출 기능 추가. 기존 제휴·알림·리뷰·결제(v11) 기능은 그대로입니다.
 *  - 새 요청(action): adApply(POST, 광고 신청) · adList(GET, 승인 + 시작일≤오늘≤종료일 인 광고만 공개 필드로)
 *  - '분양광고' 시트(탭)는 첫 신청 때 자동으로 만들어집니다. 운영자가 [승인] 체크 + [시작일]·[종료일] 입력 → 5분 안에 노출.
 *  - 연락처·사업자등록번호·담당자는 시트에만 저장하고 공개 목록(adList)에는 절대 넣지 않습니다.
 *  - 입력 검증: 길이 제한, https 주소만, 사업자등록번호 검증, 셀 수식 주입 차단(=,+,-,@ 로 시작하는 글 거절), 꺾쇠(<>) 제거.
 *  - 광고는 어떤 점수·추천 순위에도 반영하지 않습니다(화면에는 항상 '광고' 표시).
 *  - 검증: node tools/ad-test.js (광고) · node tools/pay-test.js (결제, 49개)
 *
 * v11 변경 요약
 *  - 프리미엄 리포트 유료 결제(토스페이먼츠 결제위젯) 서버 기능 추가. 기존 제휴·알림·리뷰 기능은 그대로입니다.
 *  - 새 요청(action): createOrder(주문 만들기) · confirmPayment(결제 승인) · openReport(리포트 열람/상태 확인)
 *                    · refundRequest(환불 요청 접수, 자동 환불 없음) · findOrder(주문번호+연락처로 다시 보기)
 *  - '주문' 시트(탭)는 첫 주문 때 자동으로 만들어집니다. 금액은 아래 PRICE 표(서버 기준)와 대조하고,
 *    토스 시크릿 키는 코드가 아니라 스크립트 속성 TOSS_SECRET_KEY 에서 읽습니다.
 *  - 연락처는 가린 형태(010-****-1234)와 확인용 해시만, 열람 토큰은 해시만 시트에 저장합니다.
 *  - 운영 안내: tools/payment-setup.md
 *  - 카카오톡 채팅 링크 서버 검증 kakaoUrl(): 제휴 신청·정보 수정 저장 때 open.kakao.com / pf.kakao.com 주소만 저장(tools/chat-backend-patch.md)
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
           '추가구','단지','관리코드','신청일','승인','만료일','메모','수정일','상품','사업자번호','계산서메일','노출지역',
           '유형','중개사명','자격증번호'];
/* 대표(개업공인중개사): 기본 월 29,000원 · 프리미엄 월 49,000원 / 소속공인중개사: 상담 월 19,000원 (연간 결제, 부가세 별도) */
const PLAN = { basic: '기본', premium: '프리미엄', member: '소속 상담' };
const TYPE = { owner: '대표', member: '소속' };
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
/* 카카오톡 채팅 링크: 오픈채팅(open.kakao.com) 또는 채널(pf.kakao.com)만, 아니면 빈 값 */
function kakaoUrl(v) {
  const s = str(v, 200).trim();
  return /^https:\/\/(open|pf)\.kakao\.com\/[^\s"'<>\\`]+$/.test(s) ? s : '';
}
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
      plan: String(r[COL['상품']] || PLAN.premium), biz: String(r[COL['사업자번호']] || ''), mail: String(r[COL['계산서메일']] || ''),
      type: String(r[COL['유형']] || TYPE.owner), name: String(r[COL['중개사명']] || ''), lic: String(r[COL['자격증번호']] || '')
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
  if (act === 'adList') return out(adList());
  if (act === 'reviews') return out(reviewsPublic(e.parameter.a));
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
  if (PAY_ACTIONS[b.action]) return out(payDispatch(b));
  if (b.action === 'adApply' || b.action === 'adInquiry') return out(adDispatch(b));
  if (USER_ACTIONS[b.action]) return out(userDispatch(b));
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    ensureHeader();
    if (b.action === 'alert_sub') return out(alertSub(b));
    if (b.action === 'apply') return out(apply(b));
    if (b.action === 'review') return out(addReview(b));
    if (b.action === 'flag') return out(flagReview(b));
    if (b.action === 'reply') return out(replyReview(b));
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
  const RS = reviewStats();
  const res = {
    ok: true, slot: SLOT, at: ymd(new Date()),
    agents: agents().filter(isActive).map(a => ({
      id: a.id, n: a.office, ceo: a.ceo, ph: a.phone, kk: a.kakao, intro: a.intro, reg: a.reg,
      og: a.og, ogn: a.ogName, dong: a.dong, r: regionsOf(a), dj: a.plan === PLAN.premium ? freshDanji(a).map(d => d.k) : [], pl: a.plan === PLAN.premium ? 'p' : 'b',
      t: a.type === TYPE.member ? 'm' : 'o', nm: a.type === TYPE.member ? a.name : a.ceo,
      rv: RS[a.id] || null
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
  ensureHeader();
  const type = b.type === 'member' ? TYPE.member : TYPE.owner;
  const reg = str(b.reg, 40), office = str(b.office, 40), ceo = str(b.ceo, 20), phone = str(b.phone, 20);
  const name = str(b.name, 20), lic = str(b.lic, 30);
  if (!reg || !office || !ceo || !phone) throw new Error('등록번호·사무소명·대표자·전화번호는 꼭 입력해 주세요.');
  if (type === TYPE.member && (!name || !lic)) throw new Error('소속공인중개사는 본인 이름과 공인중개사 자격증 번호를 꼭 입력해 주세요.');
  if (!b.agree) throw new Error('유의사항 동의가 필요합니다.');
  const list = agents(), R = x => x.replace(/\s/g, '');
  if (type === TYPE.owner && list.some(a => a.type !== TYPE.member && R(a.reg) === R(reg))) throw new Error('이미 신청된 등록번호입니다. [내 관리]에서 로그인해 수정해 주세요.');
  if (type === TYPE.member && list.some(a => a.type === TYPE.member && R(a.reg) === R(reg) && R(a.name) === R(name))) throw new Error('이 사무소에서 같은 이름으로 이미 신청되었습니다. [내 관리]에서 로그인해 수정해 주세요.');
  const og = str(b.og, 5), extras = validRegions(og, b.extras);
  const regions = [og].concat(extras);
  const plan = type === TYPE.member ? PLAN.member : (b.plan === 'premium' ? PLAN.premium : PLAN.basic);
  const danji = plan === PLAN.premium ? validDanji(b.danji, regions, []) : [];
  const full = regions.filter(g => slotCount(g, '', list) >= SLOT);
  const id = 'A' + Utilities.getUuid().replace(/-/g, '').slice(0, 7).toUpperCase();
  const code = Utilities.getUuid().replace(/-/g, '').slice(0, 8).toUpperCase();
  const row = [];
  row[COL['id']] = id; row[COL['등록번호']] = reg; row[COL['사무소명']] = office; row[COL['대표자']] = ceo;
  row[COL['전화']] = phone; row[COL['카카오']] = kakaoUrl(b.kakao); row[COL['소개']] = str(b.intro, 120);
  row[COL['시도']] = str(b.sido, 20); row[COL['사무소구코드']] = og; row[COL['사무소구']] = str(b.ogName, 30);
  row[COL['사무소동']] = str(b.dong, 30); row[COL['추가구']] = JSON.stringify(extras); row[COL['단지']] = JSON.stringify(danji);
  row[COL['관리코드']] = code; row[COL['신청일']] = new Date(); row[COL['승인']] = false; row[COL['만료일']] = '';
  row[COL['메모']] = full.length ? '대기(자리 마감): ' + full.join(',') : ''; row[COL['수정일']] = new Date();
  row[COL['상품']] = plan; row[COL['사업자번호']] = str(b.biz, 20); row[COL['계산서메일']] = str(b.mail, 80);
  const rname = regionNames(regions, b.names);
  row[COL['노출지역']] = rname;
  row[COL['유형']] = type; row[COL['중개사명']] = type === TYPE.member ? name : ''; row[COL['자격증번호']] = lic;
  const sh = book().getSheetByName(SH_A);
  sh.appendRow(row);
  sh.getRange(sh.getLastRow(), COL['승인'] + 1).insertCheckboxes();   // 승인 칸을 체크박스로
  if (NOTIFY) {
    try {
      MailApp.sendEmail(Session.getEffectiveUser().getEmail(), `[장대장 제휴] 새 신청: ${office}`,
        `[${type}] ${type === TYPE.member ? name + ' (소속) · ' : ''}${office} (대표 ${ceo}) ${phone}\n상품 ${plan}\n등록번호 ${reg}${lic ? ' · 자격증번호 ' + lic : ''}\n`
        + `확인: 사무소 등록·영업 상태는 국가공간정보포털(부동산중개업 조회), ${type === TYPE.member ? '소속 여부·자격은 같은 조회 화면의 소속공인중개사 목록과 큐넷 자격증 진위확인으로 ' : ''}확인하세요.\n`
        + `사업자번호 ${str(b.biz, 20)} / 계산서 ${str(b.mail, 80)}\n지역 ${rname} (사무소 ${str(b.ogName, 30)} ${str(b.dong, 30)})\n시트에서 확인 후 승인 체크와 만료일을 입력하세요.\n${book().getUrl()}`);
    } catch (e) {}
  }
  return { ok: true, id: id, code: code, waitlist: full };
}

function findMe(b, list) {
  const reg = str(b.reg, 40).replace(/\s/g, ''), code = str(b.code, 20).toUpperCase();
  const me = list.find(a => a.reg.replace(/\s/g, '') === reg && a.code.toUpperCase() === code);   // 소속은 같은 등록번호가 여럿 → 관리코드로 구분
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
      id: me.id, reg: me.reg, office: me.office, ceo: me.ceo, type: me.type, name: me.name, phone: me.phone, kakao: me.kakao, intro: me.intro,
      sido: me.sido, og: me.og, ogName: me.ogName, dong: me.dong, extras: me.extras,
      danji: (me.danji || []).map(d => ({ k: d.k, n: d.n, at: d.at, fresh: fresh.indexOf(d.k) >= 0 })),
      reviews: reviews().filter(r => r.a === me.id).reverse().slice(0, 50).map(r => ({ id: r.id, at: ymd(r.at), s: r.s, tags: r.tags, text: r.text, show: r.show, reply: r.reply })),
      rv: reviewStats()[me.id] || null,
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
  set('카카오', kakaoUrl(b.kakao));
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
    if (hit && (sent >= 80 || MailApp.getRemainingDailyQuota() < 5)) continue;   // 한도 초과분은 최근갭을 그대로 둬서 내일 다시 보냄
    sh.getRange(i + 1, AC['최근갭'] + 1).setValue(gap);
    if (!hit) continue;
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


/* ================= 상담 리뷰 =================
   · 우리 사이트에서 그 중개사에게 [전화하기]·[카카오톡 문의]를 누른 기록(로그 시트, 같은 방문자 id)이 있고
     12시간이 지난 방문자만 리뷰를 남길 수 있다 — 상담하지 않은 사람의 리뷰·자작 리뷰를 막는 장치
   · 중개사 1명당 방문자 1명은 리뷰 1개(수정은 새로 쓰면 덮어씀)
   · 별점과 상관없이 모든 리뷰를 공개. 욕설·개인정보·허위 비방은 신고를 받아 시트 '공개' 칸을 FALSE로 바꿔 숨김
   · 순서 점수: 리뷰 수를 반영한 보정 별점(리뷰가 적으면 전체 평균 쪽으로 당김) + 답글 응답률 가산 */
const SH_R = '리뷰';
const RH = ['시각', 'id', '중개사id', '방문자', '별점', '태그', '내용', '공개', '신고', '답글', '답글시각'];
const RTAGS = ['친절해요', '설명이 자세해요', '연락이 빨라요', '전문적이에요', '부담 없이 상담해요'];
const RC = Object.fromEntries(RH.map((h, i) => [h, i]));
function reviewSheet() {
  const ss = book();
  let sh = ss.getSheetByName(SH_R);
  if (!sh) {
    sh = ss.insertSheet(SH_R);
    sh.getRange(1, 1, 1, RH.length).setValues([RH]).setFontWeight('bold').setBackground('#3B3F22').setFontColor('#F5EFDC');
    sh.setFrozenRows(1);
  }
  return sh;
}
function reviews() {
  const v = reviewSheet().getDataRange().getValues(), out = [];
  for (let i = 1; i < v.length; i++) {
    const r = v[i]; if (!r[RC['id']]) continue;
    out.push({ row: i + 1, at: r[RC['시각']], id: String(r[RC['id']]), a: String(r[RC['중개사id']]), vid: String(r[RC['방문자']]),
      s: Number(r[RC['별점']]) || 0, tags: parseJ(r[RC['태그']], []), text: String(r[RC['내용']] || ''),
      show: r[RC['공개']] !== false, flags: Number(r[RC['신고']]) || 0, reply: String(r[RC['답글']] || '') });
  }
  return out;
}
function reviewStats() {
  const cache = CacheService.getScriptCache(), hit = cache.get('rstats');
  if (hit) return JSON.parse(hit);
  const all = reviews().filter(r => r.show), by = {};
  const M = all.length ? all.reduce((t, r) => t + r.s, 0) / all.length : 4.3, C = 5;   // 전체 평균, 보정 강도
  all.forEach(r => { (by[r.a] = by[r.a] || []).push(r); });
  const res = {};
  Object.keys(by).forEach(a => {
    const L = by[a], n = L.length, sum = L.reduce((t, r) => t + r.s, 0), rep = L.filter(r => r.reply).length;
    const rr = n ? rep / n : 0;
    res[a] = { n: n, avg: Math.round(sum / n * 10) / 10, sc: Math.round(((C * M + sum) / (C + n) + (n >= 3 && rr >= .8 ? .1 : 0)) * 100) / 100,
      rr: Math.round(rr * 100), good: n >= 3 && rr >= .8 };
  });
  cache.put('rstats', JSON.stringify(res), 300);
  return res;
}
function reviewsPublic(a) {
  a = str(a, 10); if (!ID_RE.test(a)) return { ok: false, err: 'bad id' };
  const L = reviews().filter(r => r.a === a && r.show).reverse().slice(0, 20)
    .map(r => ({ id: r.id, at: ymd(r.at), s: r.s, tags: r.tags, text: r.text, reply: r.reply }));
  return { ok: true, reviews: L, rv: reviewStats()[a] || null, tags: RTAGS };
}
function contacted(a, vid) {
  const sh = book().getSheetByName(SH_L), last = sh.getLastRow();
  if (last < 2) return false;
  const from = Math.max(2, last - 30000), v = sh.getRange(from, 1, last - from + 1, 6).getValues();
  const limit = new Date(Date.now() - 12 * 3600 * 1000);
  return v.some(r => (r[1] === 'call' || r[1] === 'kakao') && String(r[2]) === a && String(r[5]) === vid && r[0] instanceof Date && r[0] <= limit);
}
function addReview(b) {
  const a = str(b.a, 10), vid = str(b.vid, 40), s = Math.round(Number(b.s));
  if (!ID_RE.test(a) || vid.length < 8) throw new Error('잘못된 요청입니다.');
  if (!(s >= 1 && s <= 5)) throw new Error('별점을 골라 주세요.');
  const tags = (b.tags || []).filter(t => RTAGS.indexOf(t) >= 0).slice(0, 5);
  const text = str(b.text, 300).replace(/\d{2,3}-?\d{3,4}-?\d{4}/g, '***');   // 전화번호 같은 개인정보는 가림
  if (!contacted(a, vid)) throw new Error('이 공인중개사에게 장대장 리포트에서 전화·카카오톡으로 문의한 뒤 12시간이 지나야 리뷰를 남길 수 있어요.');
  const sh = reviewSheet(), prev = reviews().find(r => r.a === a && r.vid === vid);
  const row = [new Date(), prev ? prev.id : 'R' + Utilities.getUuid().replace(/-/g, '').slice(0, 7).toUpperCase(), a, vid, s, JSON.stringify(tags), text, true, prev ? prev.flags : 0, prev ? prev.reply : '', ''];
  if (prev) sh.getRange(prev.row, 1, 1, RH.length).setValues([row]); else sh.appendRow(row);
  CacheService.getScriptCache().removeAll(['rstats', 'list']);
  if (NOTIFY && s <= 2) { try { MailApp.sendEmail(Session.getEffectiveUser().getEmail(), '[장대장 제휴] 낮은 별점 리뷰 확인', `중개사 ${a} · 별점 ${s}\n${text}\n${book().getUrl()}`); } catch (e) {} }
  return { ok: true, id: row[1] };
}
function flagReview(b) {
  const id = str(b.id, 10), why = str(b.why, 100);
  const r = reviews().find(x => x.id === id); if (!r) throw new Error('리뷰를 찾지 못했습니다.');
  reviewSheet().getRange(r.row, RC['신고'] + 1).setValue(r.flags + 1);
  if (NOTIFY) { try { MailApp.sendEmail(Session.getEffectiveUser().getEmail(), '[장대장 제휴] 리뷰 신고', `리뷰 ${id} (중개사 ${r.a})\n사유: ${why}\n내용: ${r.text}\n숨기려면 리뷰 시트의 '공개' 칸을 FALSE로 바꾸세요.\n${book().getUrl()}`); } catch (e) {} }
  return { ok: true };
}
function replyReview(b) {
  const list = agents(), me = findMe(b, list), id = str(b.id, 10), text = str(b.text, 300);
  const r = reviews().find(x => x.id === id && x.a === me.id); if (!r) throw new Error('리뷰를 찾지 못했습니다.');
  const sh = reviewSheet();
  sh.getRange(r.row, RC['답글'] + 1, 1, 2).setValues([[text, new Date()]]);
  CacheService.getScriptCache().removeAll(['rstats', 'list']);
  return login(b);
}


/* =====================================================================
   프리미엄 리포트 결제 (토스페이먼츠 결제위젯) — v11
   흐름: 사이트 checkout 에서 createOrder(서버가 주문번호·금액 결정) → 토스 결제창 → success 페이지가
         confirmPayment(금액을 서버 가격표·주문과 대조 → 토스 승인 API) → 열람 토큰 발급
         → view 페이지가 openReport 로 확인(처음 열 때 '최초열람시각' 기록 = 환불 기준)
   · 시크릿 키: 스크립트 속성 TOSS_SECRET_KEY (코드에 쓰지 않음)
   · 연락처: 가린 값 + 확인용 해시만 저장 / 열람 토큰: 해시만 저장(다시 보기 때 새 토큰 발급)
   · 환불: 자동으로 하지 않음. 요청을 시트에 기록하고 시트 주인에게 메일 → 운영자가 토스 상점관리자에서 취소
   ===================================================================== */
const SH_O = '주문';
const OH = ['주문번호','생성시각','상품','단지키','단지명','금액','상태','연락처','연락처확인값','결제키','결제수단','승인시각',
            '열람토큰','최초열람시각','최근열람시각','열람횟수','환불상태','환불요청시각','환불사유','메모'];
const OC = Object.fromEntries(OH.map((h, i) => [h, i]));
/* 서버 기준 가격표 — 사이트에 보이는 가격과 반드시 같게. 결제 금액은 항상 이 표와 대조합니다. */
const PRICE = {
  single: { name: '단지 리포트', amount: 9900, min: 1, max: 1 },
  pack:   { name: '비교 패키지', amount: 29000, min: 2, max: 3 }
};
const REFUND_DAYS = 7;       // 열람 전 전액 환불 가능 기간(결제일부터)
const VIEW_DAYS = 365;       // 열람 기간
const TOSS_API = 'https://api.tosspayments.com/v1/payments/';
const PAY_ACTIONS = { createOrder: 1, confirmPayment: 1, openReport: 1, refundRequest: 1, findOrder: 1 };
const ST = { wait: '결제대기', paid: '결제완료', fail: '승인실패', bad: '금액불일치', vbank: '입금대기' };

function payDispatch(b) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    if (b.action === 'createOrder') return createOrder(b);
    if (b.action === 'confirmPayment') return confirmPayment(b);
    if (b.action === 'openReport') return openReport(b);
    if (b.action === 'refundRequest') return refundRequest(b);
    if (b.action === 'findOrder') return findOrder(b);
    return { ok: false, err: 'unknown' };
  } catch (x) {
    return { ok: false, err: String(x.message || x) };
  } finally {
    lock.releaseLock();
  }
}

function orderSheet() {
  const ss = book();
  let sh = ss.getSheetByName(SH_O);
  if (!sh) {
    sh = ss.insertSheet(SH_O);
    sh.getRange(1, 1, 1, OH.length).setValues([OH]).setFontWeight('bold').setBackground('#3B3F22').setFontColor('#F5EFDC');
    sh.setFrozenRows(1);
  }
  return sh;
}
function orderRows() {
  const v = orderSheet().getDataRange().getValues(), list = [];
  for (let i = 1; i < v.length; i++) if (v[i][OC['주문번호']]) list.push({ row: i + 1, r: v[i] });
  return list;
}
function findRow(id) {
  id = str(id, 40);
  if (!/^JDJ\d{6}-[0-9A-F]{10}$/.test(id)) return null;
  return orderRows().find(x => String(x.r[OC['주문번호']]) === id) || null;
}
function setO(row, h, v) { orderSheet().getRange(row, OC[h] + 1).setValue(v); }

/* 해시·비교 */
function hex(bytes) { return bytes.map(b => ('0' + (b & 255).toString(16)).slice(-2)).join(''); }
function salt() {
  const P = PropertiesService.getScriptProperties();
  let s = P.getProperty('ORDER_SALT');
  if (!s) { s = Utilities.getUuid() + Utilities.getUuid(); P.setProperty('ORDER_SALT', s); }
  return s;
}
function hashOf(s) { return 'h' + hex(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, salt() + '|' + s, Utilities.Charset.UTF_8)); }   // 앞의 h: 시트가 숫자로 바꾸지 않도록
/* 길이가 같으면 끝까지 다 비교(상수시간 흉내) */
function safeEq(a, b) {
  a = String(a == null ? '' : a); b = String(b == null ? '' : b);
  let d = a.length ^ b.length;
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) d |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return d === 0;
}
function newToken() { return (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, ''); }
function newOrderId() {
  return 'JDJ' + Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyMMdd') + '-' + Utilities.getUuid().replace(/-/g, '').slice(0, 10).toUpperCase();
}

/* 연락처: 휴대폰 또는 이메일 1개 */
function parseContact(c) {
  c = str(c, 100);
  const d = c.replace(/[^0-9]/g, '');
  if (/^01[016789]\d{7,8}$/.test(d) && !/@/.test(c)) return { kind: 'phone', norm: d, mask: d.slice(0, 3) + '-****-' + d.slice(-4), last4: d.slice(-4) };
  const e = c.toLowerCase();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
    const [u, dom] = e.split('@');
    return { kind: 'email', norm: e, mask: u.slice(0, Math.min(2, u.length)) + '***@' + dom, last4: '' };
  }
  return null;
}

/* 단지 키: 사이트 단지 비교와 같은 형식 (시도id~구코드~동~단지~평형, 각 칸 URL 인코딩) */
function parseKey(k) {
  k = str(k, 300);
  const a = k.split('~');
  if (a.length !== 5) return null;
  let p;
  try { p = a.map(decodeURIComponent); } catch (e) { return null; }
  if (!/^s\d{2}$/.test(p[0]) || !/^\d{5}$/.test(p[1]) || !p[2] || !p[3] || p[3].length > 80 || !p[4] || p[4].length > 20) return null;
  return { k: k, name: p[3] + ' ' + p[4] };
}

/* ---------- 1) 주문 만들기: 서버가 주문번호와 금액을 정함 ---------- */
function createOrder(b) {
  const P = PRICE[b.product];
  if (!P) throw new Error('상품을 다시 선택해 주세요.');
  const seen = {};
  const keys = (Array.isArray(b.keys) ? b.keys : []).slice(0, 5).map(parseKey).filter(x => x && !seen[x.k] && (seen[x.k] = true));
  if (keys.length < P.min || keys.length > P.max)
    throw new Error(P.min === P.max ? `${P.name}는 단지 ${P.min}곳을 골라 주세요.` : `${P.name}는 단지 ${P.min}~${P.max}곳을 골라 주세요.`);
  const ct = parseContact(b.contact);
  if (!ct) throw new Error('휴대폰 번호 또는 이메일을 정확히 입력해 주세요.');
  if (!b.agree) throw new Error('청약철회 제한 안내에 동의해 주세요.');
  const cache = CacheService.getScriptCache(), ck = 'co:' + Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyyMMddHHmm');
  const n = Number(cache.get(ck) || 0);
  if (n >= 30) throw new Error('잠시 후 다시 시도해 주세요.');
  cache.put(ck, String(n + 1), 120);
  const id = newOrderId();
  const names = keys.map(x => x.name).join(', ');
  const row = [];
  row[OC['주문번호']] = id; row[OC['생성시각']] = new Date(); row[OC['상품']] = P.name;
  row[OC['단지키']] = JSON.stringify(keys.map(x => x.k)); row[OC['단지명']] = names.slice(0, 300);
  row[OC['금액']] = P.amount; row[OC['상태']] = ST.wait;
  row[OC['연락처']] = ct.mask; row[OC['연락처확인값']] = hashOf(ct.norm);
  ['결제키','결제수단','승인시각','열람토큰','최초열람시각','최근열람시각','환불상태','환불요청시각','환불사유','메모'].forEach(h => row[OC[h]] = '');
  row[OC['열람횟수']] = 0;
  orderSheet().appendRow(row);
  return { ok: true, orderId: id, amount: P.amount, orderName: ('장대장 ' + P.name + ' · ' + names).slice(0, 100) };
}

function productKeyOf(name) { return Object.keys(PRICE).find(k => PRICE[k].name === String(name)) || ''; }

/* 토스 API 호출 (테스트에서는 UrlFetchApp 을 바꿔 끼워 검증) */
function tossCall(path, payload, idem) {
  const secret = PropertiesService.getScriptProperties().getProperty('TOSS_SECRET_KEY');
  if (!secret) throw new Error('결제 서버 설정이 아직 끝나지 않았습니다. 운영자에게 문의해 주세요.');
  const opt = { method: payload ? 'post' : 'get', muteHttpExceptions: true,
    headers: { Authorization: 'Basic ' + Utilities.base64Encode(secret + ':') } };
  if (payload) { opt.contentType = 'application/json'; opt.payload = JSON.stringify(payload); }
  if (idem) opt.headers['Idempotency-Key'] = idem;
  const res = UrlFetchApp.fetch(TOSS_API + path, opt);
  let j = {}; try { j = JSON.parse(res.getContentText()); } catch (e) {}
  return { code: res.getResponseCode(), j: j };
}

/* ---------- 2) 결제 승인 ---------- */
function confirmPayment(b) {
  const paymentKey = str(b.paymentKey, 200), amount = Number(b.amount);
  if (!paymentKey || !/^[A-Za-z0-9_\-=.]+$/.test(paymentKey)) throw new Error('결제 정보가 올바르지 않습니다.');
  const o = findRow(b.orderId);
  if (!o) throw new Error('주문을 찾지 못했습니다.');
  const r = o.r, P = PRICE[productKeyOf(r[OC['상품']])];
  const status = String(r[OC['상태']]);
  /* 이미 승인된 주문: 같은 결제키면 새 열람 토큰을 다시 발급(성공 화면 새로고침 대비) */
  if (status === ST.paid) {
    if (!safeEq(r[OC['결제키']], paymentKey)) throw new Error('이미 처리된 주문입니다.');
    return paidOut(o);
  }
  if (status !== ST.wait && status !== ST.fail) throw new Error('처리할 수 없는 주문 상태입니다: ' + status);
  /* 위변조 방지: 요청 금액 = 주문 금액 = 서버 가격표 */
  if (!P || !(amount === Number(r[OC['금액']]) && amount === P.amount)) {
    setO(o.row, '상태', ST.bad); setO(o.row, '메모', `요청 금액 ${amount} / 주문 금액 ${r[OC['금액']]}`);
    throw new Error('결제 금액이 주문 금액과 달라 승인하지 않았습니다. 결제는 진행되지 않았습니다.');
  }
  let res = tossCall('confirm', { paymentKey: paymentKey, orderId: o.r[OC['주문번호']], amount: amount }, 'confirm-' + o.r[OC['주문번호']]);
  if (res.code !== 200 && res.j && res.j.code === 'ALREADY_PROCESSED_PAYMENT') res = tossCall(encodeURIComponent(paymentKey));   // 이전 승인 응답을 못 받은 경우 조회로 확인
  const j = res.j || {};
  if (res.code !== 200) {
    setO(o.row, '상태', ST.fail); setO(o.row, '메모', str(j.code + ' ' + j.message, 200));
    return { ok: false, code: str(j.code, 60), err: str(j.message, 200) || '결제 승인에 실패했습니다.' };
  }
  if (String(j.orderId) !== String(r[OC['주문번호']]) || Number(j.totalAmount) !== P.amount) {
    setO(o.row, '상태', ST.bad); setO(o.row, '메모', '승인 응답 금액/주문번호 불일치 — 토스 상점관리자에서 확인·취소 필요');
    throw new Error('결제 확인 중 문제가 생겼습니다. 운영자가 확인 후 연락드리거나 취소해 드립니다.');
  }
  setO(o.row, '결제키', paymentKey);
  setO(o.row, '결제수단', str(j.method, 30));
  if (j.status === 'WAITING_FOR_DEPOSIT') {
    setO(o.row, '상태', ST.vbank);
    return { ok: false, code: 'WAITING_FOR_DEPOSIT', err: '가상계좌 입금 확인 후 리포트를 열 수 있습니다.' };
  }
  if (j.status !== 'DONE') {
    setO(o.row, '상태', ST.fail); setO(o.row, '메모', '승인 상태 ' + str(j.status, 30));
    return { ok: false, code: str(j.status, 40), err: '결제가 완료되지 않았습니다.' };
  }
  setO(o.row, '상태', ST.paid);
  setO(o.row, '승인시각', j.approvedAt ? new Date(j.approvedAt) : new Date());
  setO(o.row, '메모', '');
  return paidOut(findRow(o.r[OC['주문번호']]));
}
function paidOut(o) {
  const t = newToken();
  setO(o.row, '열람토큰', hashOf(t));
  const r = o.r;
  return { ok: true, orderId: String(r[OC['주문번호']]), token: t, product: String(r[OC['상품']]), amount: Number(r[OC['금액']]),
    names: String(r[OC['단지명']]), paidAt: r[OC['승인시각']] instanceof Date ? ymd(r[OC['승인시각']]) : ymd(new Date()) };
}

/* 주문번호 + 토큰 검증 (실패 이유는 구분하지 않음) */
function authOrder(b) {
  const o = findRow(b.o);
  const t = str(b.t, 100);
  const ok = !!o && t.length >= 32 && safeEq(String(o.r[OC['열람토큰']]), hashOf(t));
  if (!ok) throw new Error('주문 정보를 확인할 수 없습니다. 링크를 다시 확인하시거나 [구매한 리포트 다시 보기]를 이용해 주세요.');
  if (String(o.r[OC['상태']]) !== ST.paid) throw new Error('결제가 완료된 주문이 아닙니다.');
  return o;
}
function orderState(o, now) {
  const r = o.r, paid = r[OC['승인시각']] instanceof Date ? r[OC['승인시각']] : new Date(r[OC['승인시각']]);
  const first = r[OC['최초열람시각']] instanceof Date ? r[OC['최초열람시각']] : null;
  const refund = String(r[OC['환불상태']] || '');
  const until = new Date(paid.getTime() + REFUND_DAYS * 86400000), exp = new Date(paid.getTime() + VIEW_DAYS * 86400000);
  return {
    orderId: String(r[OC['주문번호']]), product: String(r[OC['상품']]), amount: Number(r[OC['금액']]), names: String(r[OC['단지명']]),
    paidAt: ymd(paid), viewed: !!first, firstViewAt: first ? Utilities.formatDate(first, 'Asia/Seoul', 'yyyy-MM-dd HH:mm') : '',
    refund: refund, refundUntil: ymd(until), refundable: !first && !refund && now <= until,
    expires: ymd(exp), expired: now > exp
  };
}

/* ---------- 3) 리포트 열람 / 상태 확인 ----------
   open:false → 상태만(열람 기록 안 함) / open:true → 최초 열람 시각 기록 후 단지 키 반환 */
function openReport(b) {
  const o = authOrder(b), now = new Date(), s = orderState(o, now);
  if (!b.open) return { ok: true, order: s };
  if (s.refund) throw new Error('환불 요청이 접수된 주문이라 열람할 수 없습니다. 요청을 취소하시려면 고객문의로 연락해 주세요.');
  if (s.expired) throw new Error('열람 기간(결제일부터 1년)이 지났습니다.');
  if (!s.viewed) setO(o.row, '최초열람시각', now);
  setO(o.row, '최근열람시각', now);
  setO(o.row, '열람횟수', (Number(o.r[OC['열람횟수']]) || 0) + 1);
  const s2 = orderState(findRow(s.orderId), now);
  return { ok: true, order: s2, keys: parseJ(o.r[OC['단지키']], []) };
}

/* ---------- 4) 환불 요청 (기록 + 운영자 메일, 자동 환불 없음) ---------- */
function refundRequest(b) {
  const o = authOrder(b), now = new Date(), s = orderState(o, now);
  if (s.refund) return { ok: true, order: s, already: true };
  const reason = str(b.reason, 300);
  const label = s.refundable ? '요청(열람 전·7일 이내 — 전액 환불 대상)' : '요청(검토 필요 — 열람 후 또는 7일 경과)';
  setO(o.row, '환불상태', label);
  setO(o.row, '환불요청시각', now);
  setO(o.row, '환불사유', reason);
  try {
    MailApp.sendEmail(Session.getEffectiveUser().getEmail(), `[장대장 결제] 환불 요청 ${s.orderId}`,
      `주문번호 ${s.orderId}\n상품 ${s.product} · ${s.amount.toLocaleString()}원 · 결제일 ${s.paidAt}\n단지 ${s.names}\n`
      + `열람 여부: ${s.viewed ? '열람함(' + s.firstViewAt + ')' : '열람 전'}\n구분: ${label}\n사유: ${reason || '(없음)'}\n\n`
      + `처리 방법: 토스페이먼츠 상점관리자 → 결제 내역에서 주문번호로 찾아 결제 취소 → '주문' 시트의 환불상태를 '환불완료'로 바꿔 주세요.\n`
      + `(영업일 3일 이내 처리 약속)\n${book().getUrl()}`);
  } catch (e) {}
  return { ok: true, order: orderState(findRow(s.orderId), now) };
}

/* ---------- 5) 다시 보기: 주문번호 + 휴대폰 뒤 4자리(또는 이메일) → 새 열람 토큰 ---------- */
function findOrder(b) {
  const id = str(b.o, 40).toUpperCase(), c = str(b.c, 100);
  const cache = CacheService.getScriptCache(), ck = 'fo:' + id;
  const tries = Number(cache.get(ck) || 0);
  if (tries >= 5) throw new Error('확인 시도가 많아 1시간 뒤에 다시 시도해 주세요.');
  const o = findRow(id);
  let ok = false;
  if (o && String(o.r[OC['상태']]) === ST.paid) {
    const mask = String(o.r[OC['연락처']]), d = c.replace(/[^0-9]/g, '');
    if (/^\d{4}$/.test(d) && !/@/.test(c)) ok = /^\d{3}-\*{4}-\d{4}$/.test(mask) && safeEq(mask.slice(-4), d);
    else { const ct = parseContact(c); ok = !!ct && safeEq(String(o.r[OC['연락처확인값']]), hashOf(ct.norm)); }
  }
  if (!ok) {
    cache.put(ck, String(tries + 1), 3600);
    throw new Error('주문번호 또는 연락처가 맞지 않습니다.');
  }
  cache.remove(ck);
  const t = newToken();
  setO(o.row, '열람토큰', hashOf(t));
  return { ok: true, orderId: id, token: t };
}


/* =====================================================================
   분양 광고 (시행사·분양대행사) — v12
   흐름: 사이트 bunyang/apply/ 에서 adApply → '분양광고' 시트에 [승인 대기]로 저장 + 시트 주인에게 메일
         → 운영자가 입주자모집공고·사업자 확인 후 [승인] 체크, [시작일]·[종료일] 입력
         → 사이트(assets/ads.js)가 adList 로 승인·기간 내 광고만 받아 '광고' 표시와 함께 노출
   · 공개 목록에는 회사명·단지·지역·유형·세대수·분양가 범위·공고 정보·URL·이미지·노출 위치·기간만 (연락처·사업자번호·담당자 제외)
   ===================================================================== */
const SH_AD = '분양광고';
const ADH = ['id','신청일','회사명','사업자등록번호','담당자','연락처','단지명','시도','시군구','유형','세대수',
             '분양가최저(만원)','분양가최고(만원)','모집공고승인','모집공고일','공고문URL','노출위치','희망시작일','희망종료일',
             '대표이미지URL','동의','승인','시작일','종료일','메모'];
const ADC = Object.fromEntries(ADH.map((h, i) => [h, i]));
const AD_SIDO = ['서울특별시','부산광역시','대구광역시','인천광역시','전남광주통합특별시','대전광역시','울산광역시','세종특별자치시','경기도',
                 '강원특별자치도','충청북도','충청남도','전북특별자치도','경상북도','경상남도','제주특별자치도'];
const AD_KIND = ['아파트','오피스텔','도시형생활주택','민간임대','무순위·잔여세대','기타'];
const AD_POS = { bunyang: '분양', buy: '내집마련', switch: '갈아타기', villa: '재개발·빌라', chungyak: '청약', tax: '세금' };
const AD_MAX_DAYS = 366;      // 한 번에 신청할 수 있는 최대 노출 기간(일)
const AD_DAILY = 30;          // 하루 전체 신청 상한(스팸 방지)

function adDispatch(b) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    if (b.action === 'adApply') return adApply(b);
    if (b.action === 'adInquiry') return adInquiry(b);
    return { ok: false, err: 'unknown' };
  } catch (x) {
    return { ok: false, err: String(x.message || x) };
  } finally {
    lock.releaseLock();
  }
}
function adSheet() {
  const ss = book();
  let sh = ss.getSheetByName(SH_AD);
  if (!sh) {
    sh = ss.insertSheet(SH_AD);
    sh.getRange(1, 1, 1, ADH.length).setValues([ADH]).setFontWeight('bold').setBackground('#3B3F22').setFontColor('#F5EFDC');
    sh.setFrozenRows(1);
    sh.getRange(2, ADC['시작일'] + 1, 999, 2).setNumberFormat('yyyy-mm-dd');
  }
  return sh;
}
/* 글자 정리: 제어문자·꺾쇠 제거, 길이 제한, 셀 수식으로 읽힐 수 있는 시작 문자(= + - @) 거절 */
function adText(v, max, label, need) {
  let x = String(v == null ? '' : v).replace(/[\u0000-\u001F\u007F<>]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!x) { if (need) throw new Error(label + '을(를) 입력해 주세요.'); return ''; }
  if (x.length > max) throw new Error(`${label}은(는) ${max}자 이내로 입력해 주세요.`);
  if (/^[=+\-@\t\r]/.test(x)) throw new Error(`${label}은(는) = + - @ 기호로 시작할 수 없습니다.`);
  return x;
}
function adUrl(v, label, need) {
  const x = String(v == null ? '' : v).trim();
  if (!x) { if (need) throw new Error(label + '을(를) 입력해 주세요.'); return ''; }
  if (x.length > 300 || !/^https:\/\/[A-Za-z0-9.-]+\.[A-Za-z]{2,}(:\d{2,5})?(\/[^\s"'<>\\`]*)?$/.test(x)) throw new Error(label + '은(는) https:// 로 시작하는 올바른 주소만 입력할 수 있습니다.');
  return x;
}
function adDate(v, label, need) {
  const x = String(v == null ? '' : v).trim();
  if (!x) { if (need) throw new Error(label + '을(를) 입력해 주세요.'); return ''; }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(x)) throw new Error(label + ' 형식이 올바르지 않습니다(예: 2026-12-01).');
  const d = new Date(x + 'T00:00:00');
  if (isNaN(d.getTime()) || ymd(d) !== x) throw new Error(label + '이(가) 올바른 날짜가 아닙니다.');
  return x;
}
function adInt(v, label, lo, hi, need) {
  const s = String(v == null ? '' : v).replace(/,/g, '').trim();
  if (!s) { if (need) throw new Error(label + '을(를) 입력해 주세요.'); return ''; }
  if (!/^\d{1,9}$/.test(s) || +s < lo || +s > hi) throw new Error(`${label}은(는) ${lo.toLocaleString()}~${hi.toLocaleString()} 사이 숫자로 입력해 주세요.`);
  return +s;
}
/* 사업자등록번호 10자리 검증(국세청 검증식) */
function bizOk(v) {
  const d = String(v || '').replace(/[^0-9]/g, '');
  if (d.length !== 10) return '';
  const w = [1, 3, 7, 1, 3, 7, 1, 3, 5];
  let s = 0;
  for (let i = 0; i < 9; i++) s += +d[i] * w[i];
  s += Math.floor(+d[8] * 5 / 10);
  return (10 - s % 10) % 10 === +d[9] ? `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}` : '';
}
function adPhone(v) {
  const d = String(v || '').replace(/[^0-9]/g, '');
  if (!/^(01[016789]\d{7,8}|0[2-6]\d{7,9}|1[5-9]\d{6})$/.test(d)) throw new Error('담당자 연락처(휴대폰 또는 회사 전화번호)를 확인해 주세요.');
  if (d.length === 8) return `${d.slice(0, 4)}-${d.slice(4)}`;
  if (d.startsWith('02')) return `02-${d.slice(2, -4)}-${d.slice(-4)}`;
  return `${d.slice(0, 3)}-${d.slice(3, -4)}-${d.slice(-4)}`;
}
function adApply(b) {
  const cache = CacheService.getScriptCache(), dk = 'adday:' + ymd(new Date());
  const n = Number(cache.get(dk) || 0);
  if (n >= AD_DAILY) throw new Error('오늘 신청이 많아 내일 다시 신청해 주세요.');
  if (String(b.hp || '')) throw new Error('신청을 처리하지 못했습니다.');            // 자동 입력 방지용 숨은 칸
  const company = adText(b.company, 60, '회사명', true);
  const biz = bizOk(b.biz);
  if (!biz) throw new Error('사업자등록번호 10자리를 확인해 주세요.');
  const manager = adText(b.manager, 30, '담당자 이름', true);
  const phone = adPhone(b.phone);
  const danji = adText(b.danji, 60, '단지명', true);
  const sido = String(b.sido || '');
  if (AD_SIDO.indexOf(sido) < 0) throw new Error('시·도를 선택해 주세요.');
  const sgg = adText(b.sgg, 30, '시·군·구', true);
  if (!/^[가-힣0-9 ]{1,30}$/.test(sgg)) throw new Error('시·군·구는 한글로 입력해 주세요(예: 강동구).');
  const kind = String(b.kind || '');
  if (AD_KIND.indexOf(kind) < 0) throw new Error('주택 유형을 선택해 주세요.');
  const hh = adInt(b.hh, '세대수', 1, 100000, true);
  const pmin = adInt(b.pmin, '분양가 최저(만원)', 100, 10000000, false), pmax = adInt(b.pmax, '분양가 최고(만원)', 100, 10000000, false);
  if (pmin !== '' && pmax !== '' && pmin > pmax) throw new Error('분양가 최저가 최고보다 클 수 없습니다.');
  const approved = b.approved === true || b.approved === 'y';
  const pdate = adDate(b.pdate, '입주자모집공고일', approved);
  const url = adUrl(b.url, '공고문·홈페이지 주소', true);
  const img = adUrl(b.img, '대표 이미지 주소', false);
  const pos = (Array.isArray(b.pos) ? b.pos : []).map(String).filter((p, i, a) => AD_POS[p] && a.indexOf(p) === i);
  if (!pos.length) throw new Error('희망 노출 위치를 하나 이상 골라 주세요.');
  const start = adDate(b.start, '희망 시작일', true), end = adDate(b.end, '희망 종료일', true);
  const t0 = ymd(new Date());
  if (start < t0) throw new Error('희망 시작일은 오늘 이후로 골라 주세요.');
  if (end < start) throw new Error('희망 종료일은 시작일 이후로 골라 주세요.');
  if ((new Date(end + 'T00:00:00') - new Date(start + 'T00:00:00')) / 86400000 > AD_MAX_DAYS) throw new Error('노출 기간은 한 번에 1년까지 신청할 수 있습니다.');
  const ag = b.agree || {};
  if (!(ag.label === true && ag.score === true && ag.stop === true)) throw new Error('필수 동의 3가지에 모두 동의해 주세요.');
  const sh = adSheet();
  const dup = sh.getDataRange().getValues().slice(1).some(r => String(r[ADC['사업자등록번호']]) === biz && String(r[ADC['단지명']]) === danji && r[ADC['승인']] !== true);
  if (dup) throw new Error('같은 단지로 승인 대기 중인 신청이 있습니다. 확인 후 연락드릴게요.');
  const id = 'AD' + Utilities.getUuid().replace(/-/g, '').slice(0, 8).toUpperCase();
  const row = [];
  row[ADC['id']] = id; row[ADC['신청일']] = new Date(); row[ADC['회사명']] = company; row[ADC['사업자등록번호']] = biz;
  row[ADC['담당자']] = manager; row[ADC['연락처']] = phone; row[ADC['단지명']] = danji; row[ADC['시도']] = sido; row[ADC['시군구']] = sgg;
  row[ADC['유형']] = kind; row[ADC['세대수']] = hh; row[ADC['분양가최저(만원)']] = pmin; row[ADC['분양가최고(만원)']] = pmax;
  row[ADC['모집공고승인']] = approved ? '승인' : '승인 전'; row[ADC['모집공고일']] = pdate; row[ADC['공고문URL']] = url;
  row[ADC['노출위치']] = pos.map(p => AD_POS[p]).join(','); row[ADC['희망시작일']] = start; row[ADC['희망종료일']] = end;
  row[ADC['대표이미지URL']] = img; row[ADC['동의']] = '광고 표시·점수 무관·허위과장 시 중단 동의 ' + t0;
  row[ADC['승인']] = false; row[ADC['시작일']] = ''; row[ADC['종료일']] = ''; row[ADC['메모']] = '';
  sh.appendRow(ADH.map((h, i) => row[i] === undefined ? '' : row[i]));
  sh.getRange(sh.getLastRow(), ADC['승인'] + 1).insertCheckboxes();
  cache.put(dk, String(n + 1), 86400);
  if (NOTIFY) {
    try {
      MailApp.sendEmail(Session.getEffectiveUser().getEmail(), `[장대장 분양광고] 새 신청: ${danji}`,
        `${company} (${biz}) · 담당 ${manager} ${phone}\n단지 ${danji} · ${sido} ${sgg} · ${kind} · ${hh}세대\n`
        + `모집공고 ${approved ? '승인 ' + pdate : '승인 전'} · ${url}\n노출 ${row[ADC['노출위치']]} · ${start}~${end}\n`
        + `확인: 사업자 상태(국세청 홈택스)·입주자모집공고(청약홈) 내용과 광고 내용이 일치하는지 확인 후 [승인] 체크, [시작일]·[종료일]을 입력하세요.\n${book().getUrl()}`);
    } catch (e) {}
  }
  return { ok: true, id: id };
}
function adDay(v) {
  if (Object.prototype.toString.call(v) === '[object Date]') return isNaN(v.getTime()) ? '' : ymd(v);
  const s = String(v || '').trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : '';
}
/* 공개 목록: 승인 + 시작일≤오늘≤종료일, 공개 필드만 (연락처·사업자등록번호·담당자 제외) */
function adList() {
  const cache = CacheService.getScriptCache();
  const hit = cache.get('adlist');
  if (hit) return JSON.parse(hit);
  const sh = book().getSheetByName(SH_AD);
  const t0 = ymd(new Date()), ads = [];
  const back = Object.fromEntries(Object.entries(AD_POS).map(([k, v]) => [v, k]));
  if (sh) {
    const v = sh.getDataRange().getValues();
    for (let i = 1; i < v.length; i++) {
      const r = v[i];
      if (!r[ADC['id']] || r[ADC['승인']] !== true) continue;
      const s0 = adDay(r[ADC['시작일']]), e0 = adDay(r[ADC['종료일']]);
      if (!s0 || !e0 || s0 > t0 || e0 < t0) continue;
      const safeUrl = u => /^https:\/\/[^\s"'<>\\`]+$/.test(String(u || '')) ? String(u) : '';
      const u = safeUrl(r[ADC['공고문URL']]);
      if (!u) continue;
      ads.push({
        id: String(r[ADC['id']]), co: String(r[ADC['회사명']]), n: String(r[ADC['단지명']]), sd: String(r[ADC['시도']]), sg: String(r[ADC['시군구']]),
        k: String(r[ADC['유형']]), hh: Number(r[ADC['세대수']]) || null,
        pmin: Number(r[ADC['분양가최저(만원)']]) || null, pmax: Number(r[ADC['분양가최고(만원)']]) || null,
        ap: String(r[ADC['모집공고승인']]) === '승인', pd: adDay(r[ADC['모집공고일']]), u: u, img: safeUrl(r[ADC['대표이미지URL']]),
        pos: String(r[ADC['노출위치']]).split(',').map(x => back[x.trim()]).filter(Boolean), s: s0, e: e0
      });
    }
  }
  const res = { ok: true, at: t0, ads: ads };
  cache.put('adlist', JSON.stringify(res), 300);
  return res;
}


/* =====================================================================
   광고 문의 (ad/ 광고 상품 안내 페이지) — v13
   흐름: 사이트 ad/ 문의 폼 → adInquiry → '광고문의' 시트에 [접수]로 저장 + 시트 주인에게 메일(연락처 제외)
         → 운영자가 연락 후 [처리상태]·[처리일] 입력. 처리일로부터 1년 지나면 행 삭제(개인정보처리방침 보관 기간)
   ===================================================================== */
const SH_AQ = '광고문의';
const AQH = ['id','접수일','유형','회사명','담당자','연락처','관심상품','지역','희망기간','문의내용','동의','처리상태','처리일','메모'];
const AQC = Object.fromEntries(AQH.map((h, i) => [h, i]));
const AQ_PROD = { bunyang: '분양 단지 광고', agent: '지역 제휴 중개사', native: '결과 하단 카드', jeonse: '전세사기 예방 체크리스트 스폰서', package: '패키지', etc: '기타·제휴' };
const AQ_PERIOD = ['', '1주', '2주', '1개월', '3개월', '6개월', '1년', '미정·협의'];
const AQ_DAILY = 40;          // 하루 전체 문의 상한(스팸 방지)

function aqSheet() {
  const ss = book();
  let sh = ss.getSheetByName(SH_AQ);
  if (!sh) {
    sh = ss.insertSheet(SH_AQ);
    sh.getRange(1, 1, 1, AQH.length).setValues([AQH]).setFontWeight('bold').setBackground('#3B3F22').setFontColor('#F5EFDC');
    sh.setFrozenRows(1);
  }
  return sh;
}
/* 연락처: 전화번호(휴대폰·지역번호·070·대표번호) 또는 이메일 */
function aqContact(v) {
  const x = String(v == null ? '' : v).trim();
  if (!x) throw new Error('연락처(전화번호 또는 이메일)를 입력해 주세요.');
  if (x.length > 80) throw new Error('연락처를 확인해 주세요.');
  if (/^[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(x)) return x.toLowerCase();
  if (/[A-Za-z@]/.test(x)) throw new Error('전화번호 또는 이메일 형식을 확인해 주세요.');
  const d = x.replace(/[^0-9]/g, '');
  if (/^070\d{8}$/.test(d)) return `070-${d.slice(3, 7)}-${d.slice(7)}`;
  try { return adPhone(d); } catch (e) { throw new Error('전화번호 또는 이메일 형식을 확인해 주세요.'); }
}
function adInquiry(b) {
  const cache = CacheService.getScriptCache(), dk = 'aqday:' + ymd(new Date());
  const n = Number(cache.get(dk) || 0);
  if (n >= AQ_DAILY) throw new Error('오늘 문의가 많아 카카오톡 채널이나 전화로 문의해 주세요.');
  if (String(b.hp || '')) throw new Error('문의를 처리하지 못했습니다.');               // 자동 입력 방지용 숨은 칸
  const type = String(b.type || 'inquiry');
  if (type !== 'inquiry') throw new Error('문의 유형이 올바르지 않습니다.');
  const company = adText(b.company, 60, '회사명', true);
  const manager = adText(b.manager, 30, '담당자 이름', true);
  const contact = aqContact(b.contact);
  const products = (Array.isArray(b.products) ? b.products : []).map(String).filter((p, i, a) => AQ_PROD[p] && a.indexOf(p) === i);
  if (!products.length) throw new Error('관심 상품을 하나 이상 골라 주세요.');
  const region = adText(b.region, 60, '지역', false);
  const period = String(b.period || '');
  if (AQ_PERIOD.indexOf(period) < 0) throw new Error('희망 기간을 다시 골라 주세요.');
  const memo = String(b.memo == null ? '' : b.memo).replace(/[\u0000-\u0009\u000B-\u001F\u007F<>]/g, ' ').trim();
  if (memo.length > 1000) throw new Error('문의 내용은 1,000자 이내로 입력해 주세요.');
  if (/^[=+\-@\t\r]/.test(memo)) throw new Error('문의 내용은 = + - @ 기호로 시작할 수 없습니다.');
  if (!(b.agree && b.agree.privacy === true)) throw new Error('개인정보 수집·이용에 동의해 주세요.');
  const t0 = ymd(new Date());
  const id = 'AQ' + Utilities.getUuid().replace(/-/g, '').slice(0, 8).toUpperCase();
  const row = [];
  row[AQC['id']] = id; row[AQC['접수일']] = new Date(); row[AQC['유형']] = '광고 문의'; row[AQC['회사명']] = company; row[AQC['담당자']] = manager;
  row[AQC['연락처']] = contact; row[AQC['관심상품']] = products.map(p => AQ_PROD[p]).join(','); row[AQC['지역']] = region; row[AQC['희망기간']] = period;
  row[AQC['문의내용']] = memo; row[AQC['동의']] = '개인정보 수집·이용 동의(문의 처리 후 1년 보관) ' + t0;
  row[AQC['처리상태']] = '접수'; row[AQC['처리일']] = ''; row[AQC['메모']] = '';
  const sh = aqSheet();
  sh.appendRow(AQH.map((h, i) => row[i] === undefined ? '' : row[i]));
  cache.put(dk, String(n + 1), 86400);
  if (NOTIFY) {
    try {
      MailApp.sendEmail(Session.getEffectiveUser().getEmail(), `[장대장 광고 문의] ${company}`,
        `접수 번호 ${id}\n회사 ${company} · 담당 ${manager}\n관심 상품 ${row[AQC['관심상품']]}\n지역 ${region || '-'} · 희망 기간 ${period || '-'}\n`
        + `연락처는 '광고문의' 시트에서 확인하세요(메일에는 넣지 않아요).\n연락 후 [처리상태]·[처리일]을 적어 주세요. 처리일로부터 1년이 지나면 행을 삭제합니다.\n${book().getUrl()}`);
    } catch (e) {}
  }
  return { ok: true, id: id };
}


/* =====================================================================
   카카오 로그인 회원 (v14) — 집예보 웹(login/ · mine/ · buy/report/)
   흐름: 화면에서 Kakao.Auth.authorize → login/ 으로 인가 코드(code) 도착 → kakaoLogin
         → 서버가 REST API 키로 토큰 받기 → /v2/user/me 로 회원번호·닉네임 확인 → 카카오 토큰은 바로 만료(저장 안 함)
         → 서버가 만든 무작위 세션 토큰을 화면에 주고, 시트에는 그 해시만 저장
   저장: '회원'(카카오 회원번호·닉네임·저장 자료) · '세션'(세션 해시) · '관심알림'(알림 신청) — 탈퇴 시 세 시트에서 바로 삭제
   ===================================================================== */
const USER_ACTIONS = { kakaoLogin: 1, userLoad: 1, userSave: 1, alertSubscribe: 1, userLogout: 1, userDelete: 1 };
const KAKAO_REDIRECTS = ['https://chrisjangdaejang-ux.github.io/jangdaejang-calc/login/'];
const SH_U = '회원', SH_S = '세션', SH_UA = '관심알림';
const UH = ['카카오id', '닉네임', '가입일', '최근로그인', '저장자료', '수정일'];
const SSH = ['세션해시', '카카오id', '만든날', '만료일'];
const ALH = ['id', '카카오id', '종류', '대상키', '대상이름', '신청일', '상태'];
const UC = Object.fromEntries(UH.map((h, i) => [h, i])), SC = Object.fromEntries(SSH.map((h, i) => [h, i])), ALC = Object.fromEntries(ALH.map((h, i) => [h, i]));
const SESSION_DAYS = 90, MAX_SESSIONS = 10, MAX_USER_ALERTS = 20, USER_DATA_MAX = 40000;
const ALERT_KIND = { trade: '이 단지 새 실거래', high: '이 단지 신고가', area: '지역 시세 흐름' };

function userDispatch(b) {
  try {
    if (b.action === 'kakaoLogin') return kakaoLogin(b);           // 카카오 확인(네트워크)은 잠금 밖, 시트 쓰기만 잠금 안
    if (b.action === 'userLoad') return userLoad(b);
    return withLock(() => {
      if (b.action === 'userSave') return userSave(b);
      if (b.action === 'alertSubscribe') return alertSubscribe(b);
      if (b.action === 'userLogout') return userLogout(b);
      if (b.action === 'userDelete') return userDelete(b);
      return { ok: false, err: 'unknown' };
    });
  } catch (x) {
    return { ok: false, err: String(x.message || x), code: x.code || '' };
  }
}
function withLock(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try { return fn(); } finally { lock.releaseLock(); }
}
function uSheet(name, head) {
  const ss = book();
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, head.length).setValues([head]).setFontWeight('bold').setBackground('#3B3F22').setFontColor('#F5EFDC');
    sh.setFrozenRows(1);
  }
  return sh;
}
const uKey = id => 'k' + String(id);                       // 시트가 큰 숫자를 지수 표기로 바꾸지 않게 앞에 k
const cellSafe = s => /^[=+\-@\t\r]/.test(s) ? "'" + s : s; // 셀 수식 주입 막기
function uText(v, n) { return String(v == null ? '' : v).replace(/[\u0000-\u001F\u007F<>]/g, ' ').trim().slice(0, n); }
function authErr(msg) { const e = new Error(msg || '로그인이 끝났어요. 다시 로그인해 주세요.'); e.code = 'auth'; return e; }

/* 카카오 API 호출 */
function kakaoFetch(url, opt) {
  let r, last;
  for (let i = 0; i < 3 && !r; i++) {                       // 구글 쪽 일시 연결 실패('사용할 수 없는 주소')는 잠깐 쉬고 다시
    try { r = UrlFetchApp.fetch(url, Object.assign({ muteHttpExceptions: true }, opt)); }
    catch (e) { last = e; if (i < 2) Utilities.sleep(400 * (i + 1) + Math.floor(Math.random() * 300)); }
  }
  if (!r) throw last;
  let j = {}; try { j = JSON.parse(r.getContentText() || '{}'); } catch (e) {}
  return { code: r.getResponseCode(), j };
}

function kakaoLogin(b) {
  const code = String(b.code || '');
  if (!/^[A-Za-z0-9_\-]{10,200}$/.test(code)) throw new Error('로그인 정보를 확인하지 못했어요. 다시 시도해 주세요.');
  const redirect = String(b.redirectUri || '');
  if (KAKAO_REDIRECTS.indexOf(redirect) < 0) throw new Error('로그인 주소가 등록된 주소와 달라요.');
  const P = PropertiesService.getScriptProperties();
  const rest = P.getProperty('KAKAO_REST_KEY'), secret = P.getProperty('KAKAO_CLIENT_SECRET');
  if (!rest) throw new Error('카카오 로그인 서버 설정이 아직 끝나지 않았어요.');
  const payload = { grant_type: 'authorization_code', client_id: rest, redirect_uri: redirect, code: code };
  if (secret) payload.client_secret = secret;
  const t = kakaoFetch('https://kauth.kakao.com/oauth/token', { method: 'post', payload: payload });
  const at = t.j && t.j.access_token;
  if (t.code !== 200 || !at) {
    const ec = uText((t.j && (t.j.error_code || t.j.error)) || ('HTTP ' + t.code), 40);   // 예: KOE010(클라이언트 시크릿), KOE006(리다이렉트 URI), KOE320(코드 재사용)
    throw new Error('카카오 로그인을 마치지 못했어요. 다시 시도해 주세요. (' + ec + ')');
  }
  let me;
  try {
    me = kakaoFetch('https://kapi.kakao.com/v2/user/me', { method: 'get', headers: { Authorization: 'Bearer ' + at } });
  } finally {
    try { kakaoFetch('https://kapi.kakao.com/v1/user/logout', { method: 'post', headers: { Authorization: 'Bearer ' + at } }); } catch (e) {}   // 받은 토큰은 바로 만료
  }
  const id = me && me.code === 200 && me.j && me.j.id;
  if (!id || !/^\d{1,20}$/.test(String(id))) throw new Error('카카오 회원 정보를 확인하지 못했어요. 다시 시도해 주세요.');
  const prof = (me.j.kakao_account && me.j.kakao_account.profile) || {};
  const nick = uText(prof.nickname || (me.j.properties && me.j.properties.nickname) || '', 30) || '카카오 회원';
  return withLock(() => {
    const k = uKey(id), sh = uSheet(SH_U, UH), rows = sh.getDataRange().getValues();
    let row = 0, isNew = false;
    for (let i = 1; i < rows.length; i++) if (String(rows[i][UC['카카오id']]) === k) { row = i + 1; break; }
    const now = new Date();
    if (row) {
      sh.getRange(row, UC['닉네임'] + 1).setValue(cellSafe(nick));
      sh.getRange(row, UC['최근로그인'] + 1).setValue(now);
    } else {
      isNew = true;
      const r = []; r[UC['카카오id']] = k; r[UC['닉네임']] = cellSafe(nick); r[UC['가입일']] = now; r[UC['최근로그인']] = now; r[UC['저장자료']] = ''; r[UC['수정일']] = '';
      sh.appendRow(UH.map((h, i) => r[i] === undefined ? '' : r[i]));
    }
    const s = newToken();
    const ss = uSheet(SH_S, SSH), exp = new Date(now.getTime() + SESSION_DAYS * 86400000);
    /* 같은 회원 세션이 많으면 오래된 것부터 지움 */
    const sv = ss.getDataRange().getValues(), mine = [];
    for (let i = 1; i < sv.length; i++) if (String(sv[i][SC['카카오id']]) === k) mine.push({ row: i + 1, at: new Date(sv[i][SC['만든날']]).getTime() || 0 });
    mine.sort((a, c) => a.at - c.at).slice(0, Math.max(0, mine.length - MAX_SESSIONS + 1)).map(x => x.row).sort((a, c) => c - a).forEach(r => ss.deleteRow(r));
    const r = []; r[SC['세션해시']] = hashOf('ses|' + s); r[SC['카카오id']] = k; r[SC['만든날']] = now; r[SC['만료일']] = exp;
    ss.appendRow(SSH.map((h, i) => r[i] === undefined ? '' : r[i]));
    return { ok: true, s: s, nick: nick, isNew: isNew, exp: ymd(exp) };
  });
}

/* 세션 토큰 → 회원 {k, row, nick, data} (없거나 만료면 auth 오류) */
function sessionUser(s) {
  s = String(s || '');
  if (!/^[0-9a-f]{64}$/.test(s)) throw authErr();
  const h = hashOf('ses|' + s), ss = book().getSheetByName(SH_S);
  if (!ss) throw authErr();
  const sv = ss.getDataRange().getValues();
  let k = '';
  for (let i = 1; i < sv.length; i++) if (safeEq(String(sv[i][SC['세션해시']]), h)) {
    const exp = new Date(sv[i][SC['만료일']]);
    if (!(exp.getTime() > Date.now())) { ss.deleteRow(i + 1); throw authErr(); }
    k = String(sv[i][SC['카카오id']]); break;
  }
  if (!k) throw authErr();
  const sh = book().getSheetByName(SH_U), rows = sh ? sh.getDataRange().getValues() : [];
  for (let i = 1; i < rows.length; i++) if (String(rows[i][UC['카카오id']]) === k)
    return { k: k, row: i + 1, nick: String(rows[i][UC['닉네임']]).replace(/^'/, ''), data: parseJ(rows[i][UC['저장자료']], {}) };
  throw authErr();
}

/* 저장 자료 정리: 허용한 칸만, 길이·개수 제한 (이메일·전화 같은 칸은 들어와도 버림) */
const UD_CODE = /^\d{5}$/, UD_SD = /^[0-9A-Za-z_-]{1,12}$/;
function cleanPlace(x, withBuy) {
  if (!x || typeof x !== 'object') return null;
  const o = { sd: uText(x.sd, 12), code: uText(x.code, 5), dong: uText(x.dong, 30), jibun: uText(x.jibun, 30), apt: uText(x.apt, 60), band: uText(x.band, 20), t: uText(x.t, 10) };
  if (!UD_SD.test(o.sd) || !UD_CODE.test(o.code) || !o.apt || !o.band) return null;
  if (withBuy) {
    const bp = Math.round(Number(x.bp));
    o.bp = bp > 0 && bp < 10000000 ? bp : null;
    o.bd = /^\d{4}-\d{2}$/.test(String(x.bd || '')) ? String(x.bd) : '';
  }
  return o;
}
function cleanReport(x) {
  if (!x || typeof x !== 'object') return null;
  const q = String(x.q == null ? '' : x.q).slice(0, 400);
  if (q && !/^[A-Za-z0-9_\-.%=&~!*'()+]*$/.test(q)) return null;   // 주소 검색 문자열(인코딩된 값)만
  if (/(^|&)(i|c|d|n|e)=/.test(q)) return null;                  // 연소득·현금·대출·이름·기타 비용은 저장하지 않음
  const picks = (Array.isArray(x.picks) ? x.picks : []).slice(0, 10).map(p => p && ({
    apt: uText(p.apt, 60), area: uText(p.area, 40), band: uText(p.band, 20), P: Math.max(0, Math.round(Number(p.P) || 0)), fv: p.fv == null || p.fv === '' ? null : Math.max(0, Math.min(100, Math.round(Number(p.fv) || 0)))
  })).filter(p => p && p.apt);
  return { id: uText(x.id, 20), t: uText(x.t, 16), title: uText(x.title, 60), q: q, picks: picks };
}
/* 관심 지역: [{sd 시·도 이름, g 시·군·구 코드(빈 값 = 시·도 전체), gn 이름}] 최대 10곳 + kinds{notice, mu} */
function cleanAreas(a) {
  a = a && typeof a === 'object' ? a : {};
  const seen = {};
  const list = (Array.isArray(a.list) ? a.list : []).slice(0, 20).map(x => x && ({ sd: uText(x.sd, 20), g: /^\d{5}$/.test(String(x.g || '')) ? String(x.g) : '', gn: uText(x.gn, 30) }))
    .filter(x => x && /^[가-힣]{2,12}$/.test(x.sd) && (!x.g || x.gn))
    .filter(x => { const k = x.sd + '|' + x.g; if (seen[k]) return false; seen[k] = 1; return true; }).slice(0, 10);
  const k = a.kinds && typeof a.kinds === 'object' ? a.kinds : {};
  return { list: list, kinds: { notice: k.notice !== false, mu: k.mu !== false }, t: /^\d{4}-\d{2}-\d{2}$/.test(String(a.t || '')) ? String(a.t) : '' };
}
function cleanUserData(d) {
  d = d && typeof d === 'object' ? d : {};
  const uniq = (arr, key) => { const seen = {}; return arr.filter(x => { const k = key(x); if (seen[k]) return false; seen[k] = 1; return true; }); };
  const pk = x => [x.code, x.dong, x.jibun, x.apt, x.band].join('|');
  const out = {
    v: 1,
    homes: uniq((Array.isArray(d.homes) ? d.homes : []).slice(0, 10).map(x => cleanPlace(x, true)).filter(Boolean), pk).slice(0, 5),
    favs: uniq((Array.isArray(d.favs) ? d.favs : []).slice(0, 40).map(x => cleanPlace(x, false)).filter(Boolean), pk).slice(0, 30),
    reports: uniq((Array.isArray(d.reports) ? d.reports : []).slice(0, 20).map(cleanReport).filter(Boolean), x => x.id || x.t).slice(0, 10),
    areas: cleanAreas(d.areas)
  };
  const json = JSON.stringify(out);
  if (json.length > USER_DATA_MAX) throw new Error('저장할 자료가 너무 많아요. 리포트나 관심 단지를 조금 지운 뒤 다시 저장해 주세요.');
  return out;
}
function userAlerts(k) {
  const sh = book().getSheetByName(SH_UA); if (!sh) return [];
  return sh.getDataRange().getValues().slice(1).filter(r => String(r[ALC['카카오id']]) === k && r[ALC['상태']] === '신청')
    .map(r => ({ id: String(r[ALC['id']]), kind: String(r[ALC['종류']]), key: String(r[ALC['대상키']]), name: String(r[ALC['대상이름']]).replace(/^'/, ''), at: r[ALC['신청일']] instanceof Date ? ymd(r[ALC['신청일']]) : String(r[ALC['신청일']]).slice(0, 10) }));
}

function userLoad(b) {
  const u = sessionUser(b.s);
  const d = u.data && typeof u.data === 'object' ? u.data : {};
  return { ok: true, nick: u.nick, data: { v: 1, homes: d.homes || [], favs: d.favs || [], reports: d.reports || [], areas: d.areas || { list: [], kinds: { notice: true, mu: true }, t: '' } }, alerts: userAlerts(u.k) };
}
function userSave(b) {
  const u = sessionUser(b.s);
  const data = cleanUserData(b.data);
  const sh = book().getSheetByName(SH_U);
  sh.getRange(u.row, UC['저장자료'] + 1).setValue(JSON.stringify(data));
  sh.getRange(u.row, UC['수정일'] + 1).setValue(new Date());
  return { ok: true, data: data };
}

/* 알림 신청: op 'add'(items: [{kind, key, name}]) · 'remove'(ids) — 카카오 알림 발송을 시작하면 '신청' 상태 행으로 보냄 */
function alertSubscribe(b) {
  const u = sessionUser(b.s), sh = uSheet(SH_UA, ALH);
  if (b.op === 'remove') {
    const ids = (Array.isArray(b.ids) ? b.ids : []).map(String);
    const v = sh.getDataRange().getValues();
    for (let i = v.length - 1; i >= 1; i--) if (String(v[i][ALC['카카오id']]) === u.k && ids.indexOf(String(v[i][ALC['id']])) >= 0) sh.deleteRow(i + 1);
    return { ok: true, alerts: userAlerts(u.k) };
  }
  const items = (Array.isArray(b.items) ? b.items : []).slice(0, 5).map(x => {
    const kind = String(x && x.kind || ''), key = String(x && x.key || '').slice(0, 160), name = uText(x && x.name, 60);
    if (!ALERT_KIND[kind] || !name) return null;
    if (kind === 'area' ? !UD_CODE.test(key) : !/^\d{5}\|[^|]{1,30}\|[^|]{0,30}\|[^|]{1,60}$/.test(key)) return null;
    return { kind, key, name };
  }).filter(Boolean);
  if (!items.length) throw new Error('알림 받을 내용을 하나 이상 골라 주세요.');
  const cur = userAlerts(u.k), has = x => cur.some(a => a.kind === x.kind && a.key === x.key);
  const add = items.filter(x => !has(x));
  if (cur.length + add.length > MAX_USER_ALERTS) throw new Error(`알림은 ${MAX_USER_ALERTS}개까지 신청할 수 있어요. 내 계정에서 몇 개를 지운 뒤 다시 신청해 주세요.`);
  add.forEach(x => {
    const r = []; r[ALC['id']] = 'U' + Utilities.getUuid().replace(/-/g, '').slice(0, 9).toUpperCase(); r[ALC['카카오id']] = u.k;
    r[ALC['종류']] = x.kind; r[ALC['대상키']] = cellSafe(x.key); r[ALC['대상이름']] = cellSafe(x.name); r[ALC['신청일']] = new Date(); r[ALC['상태']] = '신청';
    sh.appendRow(ALH.map((h, i) => r[i] === undefined ? '' : r[i]));
  });
  return { ok: true, added: add.length, alerts: userAlerts(u.k) };
}

function userLogout(b) {
  const s = String(b.s || ''); if (!/^[0-9a-f]{64}$/.test(s)) return { ok: true };
  const h = hashOf('ses|' + s), ss = book().getSheetByName(SH_S); if (!ss) return { ok: true };
  const sv = ss.getDataRange().getValues();
  for (let i = sv.length - 1; i >= 1; i--) if (safeEq(String(sv[i][SC['세션해시']]), h)) ss.deleteRow(i + 1);
  return { ok: true };
}

/* 탈퇴: 회원·세션·알림 행을 바로 삭제. 어드민 키가 있으면 카카오 연결 끊기까지 */
function userDelete(b) {
  const u = sessionUser(b.s);
  const del = (name, col) => {
    const sh = book().getSheetByName(name); if (!sh) return;
    const v = sh.getDataRange().getValues();
    for (let i = v.length - 1; i >= 1; i--) if (String(v[i][col]) === u.k) sh.deleteRow(i + 1);
  };
  del(SH_UA, ALC['카카오id']); del(SH_S, SC['카카오id']); del(SH_U, UC['카카오id']);
  let unlinked = false;
  const admin = PropertiesService.getScriptProperties().getProperty('KAKAO_ADMIN_KEY');
  if (admin) {
    try {
      const r = kakaoFetch('https://kapi.kakao.com/v1/user/unlink', { method: 'post', headers: { Authorization: 'KakaoAK ' + admin }, payload: { target_id_type: 'user_id', target_id: u.k.slice(1) } });
      unlinked = r.code === 200;
    } catch (e) {}
  }
  return { ok: true, unlinked: unlinked };
}
