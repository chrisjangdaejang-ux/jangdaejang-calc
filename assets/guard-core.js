/* 내 전셋집 지킴이(jeonse/guard/) 계산 — 화면 없음. 소개·신청 화면(jeonse/guard/)·내 지킴이(jeonse/guard/my/)·
   '알림이 오면 이렇게 하세요'(jeonse/guard/what/, 무료)·전세 안전 점검 '등기 바로 확인'과 서버(tools/agent-backend.gs 'v73 지킴이')가 함께 써요.
   - 아래 'GUARD-CORE' 블록은 tools/agent-backend.gs 에 글자 그대로 복사돼 있어요(서버는 다른 파일을 불러올 수 없어서). tools/guard-test.js 가 두 곳이 같은지 확인해요.
   - 판매가는 assets/config.js 의 JDJ_SITE.GUARD(화면 표시) — 서버 JG_PRICE 와 같은 값이어야 해요(서버가 결제 금액을 정하고 대조, guard-test 가 비교).
   - 업체 원가(등기 업체 포인트, 1P ≈ 1.1원): 등록 50P(첫 확인 1번 포함) + 매일 확인 60P × 일수 · 변동이 잡히면 업체가 감시를 끝내서 남은 기간을 다시 등록(+50P).
   window.JDJ_GUARD */
(function (root) {
'use strict';
/* GUARD-CORE BEGIN — 이 블록은 tools/agent-backend.gs 에 그대로 복사돼 있어요. 고칠 때는 두 곳을 똑같이 고쳐 주세요(node tools/guard-test.js 가 비교). */
const JG_V = 'guard-2026-11-27';
/* 기본 가격·원가 값(대표 확정 전 제안) — 화면은 assets/config.js GUARD 가 있으면 그 값을 씀 */
const JG_DEF = { month: 2900, read: 1900, days: 30, maxMonths: 24, regP: 50, dayP: 60, readP: 1300, wonPerP: 1.1, maxRereg: 10 };
const JG_LV = { r: '위험', y: '주의', g: '괜찮아요', n: '확인 필요' };
/* 변동 종류 — 등기 목적 글자에서 앞에서부터 먼저 맞는 것(경매 > 압류 > 예고등기 > 소유권 > 신탁 > 임차권 > 근저당 > 말소) */
const JG_TYPES = [
  { id: 'auction', n: '경매개시결정', lv: 'r', kw: ['경매개시결정', '임의경매', '강제경매'] },
  { id: 'seize', n: '압류·가압류·가처분', lv: 'r', kw: ['가압류', '압류', '가처분'] },
  { id: 'notice', n: '예고등기(소송 중)', lv: 'r', kw: ['예고등기'] },
  { id: 'owner', n: '소유권 이전(집주인이 바뀜)', lv: 'r', kw: ['소유권이전', '소유권 이전', '가등기'] },
  { id: 'trust', n: '신탁', lv: 'r', kw: ['신탁'] },
  { id: 'lease', n: '임차권등기', lv: 'y', kw: ['임차권'] },
  { id: 'mortgage', n: '근저당·전세권 설정', lv: 'y', kw: ['근저당', '저당권', '전세권설정', '전세권 설정'] },
  { id: 'release', n: '말소(권리가 지워짐)', lv: 'g', kw: ['말소'] },
  { id: 'other', n: '그 밖의 변동', lv: 'n', kw: [] }
];
/** 등기 목적 글자 → 변동 종류 id. '근저당권설정등기말소'처럼 말소가 붙으면 말소로 봐요(권리가 늘어난 게 아니라 지워진 것) */
function jgTypeOf(purpose) {
  const s = String(purpose == null ? '' : purpose).replace(/\s+/g, '');
  if (!s) return 'other';
  if (/말소/.test(s) && !/말소회복/.test(s)) return 'release';
  const t = JG_TYPES.find(x => x.kw.some(k => s.indexOf(k.replace(/\s+/g, '')) >= 0));
  return t ? t.id : 'other';
}
function jgType(id) { return JG_TYPES.find(x => x.id === id) || JG_TYPES[JG_TYPES.length - 1]; }
/** 값 정리: 설정(config GUARD) → 숫자만, 없으면 기본값 */
function jgCfg(c) {
  c = c && typeof c === 'object' ? c : {};
  const o = {}; Object.keys(JG_DEF).forEach(k => { const v = Number(c[k]); o[k] = isFinite(v) && v > 0 ? v : JG_DEF[k]; });
  return o;
}
function jgT(iso) { return Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)); }
function jgOkDate(v) { return /^20\d\d-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(String(v || '')); }
/** 오늘 → 만기일 일수(만기일 포함 안 함). 날짜가 틀리면 0 */
function jgDays(today, end) { return jgOkDate(today) && jgOkDate(end) ? Math.max(0, Math.round((jgT(end) - jgT(today)) / 864e5)) : 0; }
/** 신청할 달 수: 만기까지 남은 날을 30일 단위로 올림, 1~maxMonths */
function jgMonthsTo(today, end, c) { c = jgCfg(c); const d = jgDays(today, end); return d > 0 ? Math.min(c.maxMonths, Math.max(1, Math.ceil(d / c.days))) : 0; }
/** 판매가(원) — 달 수 × 월 가격 */
function jgPrice(months, c) { c = jgCfg(c); const m = Math.round(Number(months)); return m >= 1 && m <= c.maxMonths ? m * c.month : 0; }
/** 업체 원가(원) — 등록 (1 + 다시 등록 수) × 50P + 날수 × 60P, × 1.1원 */
function jgCost(days, rereg, c) { c = jgCfg(c); const d = Math.max(0, Math.round(Number(days) || 0)), r = Math.max(0, Math.round(Number(rereg) || 0)); return Math.round((c.regP * (1 + r) + c.dayP * d) * c.wonPerP); }
/** 한 건 손익 — 결제 수수료(pg, 기본 3.3%)를 빼고 남는 돈 */
function jgMargin(months, rereg, c, pg) { c = jgCfg(c); const p = jgPrice(months, c), cost = jgCost(months * c.days, rereg, c), fee = Math.round(p * (pg == null ? 0.033 : pg)); return { price: p, cost: cost, fee: fee, left: p - cost - fee }; }
function jgReadCost(c) { c = jgCfg(c); return Math.round(c.readP * c.wonPerP); }
/** 등기 고유번호: 숫자 14자리(1234-5678-901234) */
function jgUniq(v) { const d = String(v == null ? '' : v).replace(/[^0-9]/g, ''); return d.length === 14 ? `${d.slice(0, 4)}-${d.slice(4, 8)}-${d.slice(8)}` : ''; }
/** 이름 가리기: 홍길동 → 홍*동, 김수 → 김*, 법인·기관 이름(주식회사·은행 등)은 그대로 */
function jgMaskName(v) {
  const s = String(v == null ? '' : v).replace(/[\u0000-\u001F<>]/g, '').trim().slice(0, 40);
  if (!s) return '';
  if (/(주식회사|\(주\)|유한회사|법인|은행|금고|조합|공사|공단|보증|캐피탈|저축|대부|신탁|구청|시청|군청|세무서|법원|국민건강보험|근로복지)/.test(s) || /^[가-힣]{1,4}(시|구|군|도|국)$/.test(s) && s.length >= 3 && /(특별|광역|자치)?(시|구|군|도)$/.test(s) && !/^[가-힣]{3}$/.test(s)) return s;
  const a = Array.from(s);
  return a.length <= 1 ? '*' : a.length === 2 ? a[0] + '*' : a[0] + '*'.repeat(a.length - 2) + a[a.length - 1];
}
/** '금240,000,000원' → 24000(만원) */
function jgWon(v) { const d = String(v == null ? '' : v).replace(/[^0-9]/g, ''); return d ? Math.round(Number(d) / 10000) : 0; }
/** 등기 열람 결과(업체 응답을 서버 어댑터가 바꾼 모양) → 화면에 한 번 보여 줄 요약.
    reg = { asof 'YYYY-MM-DD', gap: [{ purpose, at, holder, cancelled }], eul: [{ purpose, at, amount, holder, cancelled }] }
    → { asof, senior 선순위 합계(만원), liens:[{ kind, amt, at, who }], flags:{ auction, seize, trust, lease, prov }, owner 가린 이름, ownerAt }
    주민번호·주소·전체 이름은 돌려주지 않아요(이름은 가린 것만). */
function jgParseReg(reg) {
  reg = reg && typeof reg === 'object' ? reg : {};
  const live = a => (Array.isArray(a) ? a : []).filter(x => x && typeof x === 'object' && !x.cancelled);
  const gap = live(reg.gap), eul = live(reg.eul), flags = { auction: false, seize: false, trust: false, lease: false, prov: false, notice: false };
  let owner = '', ownerAt = '';
  gap.forEach(x => {
    const t = jgTypeOf(x.purpose);
    if (t === 'auction') flags.auction = true;
    if (t === 'seize') flags.seize = true;
    if (t === 'trust') flags.trust = true;
    if (t === 'notice') flags.notice = true;
    if (/가등기/.test(String(x.purpose || ''))) flags.prov = true;
    if ((t === 'owner' && !/가등기/.test(String(x.purpose || ''))) || /소유권보존/.test(String(x.purpose || ''))) { owner = jgMaskName(x.holder); ownerAt = jgOkDate(x.at) ? String(x.at) : ''; }
  });
  const liens = [];
  eul.forEach(x => {
    const t = jgTypeOf(x.purpose);
    if (t === 'lease') flags.lease = true;
    if (t === 'mortgage' || t === 'lease') liens.push({ kind: t === 'lease' ? '임차권' : /전세권/.test(String(x.purpose || '')) ? '전세권' : '근저당', amt: jgWon(x.amount), at: jgOkDate(x.at) ? String(x.at) : '', who: jgMaskName(x.holder) });
  });
  return { asof: jgOkDate(reg.asof) ? String(reg.asof) : '', senior: liens.reduce((s, l) => s + l.amt, 0), liens: liens, flags: flags, owner: owner, ownerAt: ownerAt };
}
/* 지킴이 상태(서버 시트 '상태' 칸 글자 = 화면 표시) */
const JG_ST = { wait: '결제대기', paid: '결제완료', on: '지켜보는 중', rereg: '다시 등록 중', done: '기간 끝', fail: '등록 실패·환불', stop: '중지', read: '열람 완료', bad: '금액불일치' };
/** 화면 단계: 결제가 열렸는지 + 서버 준비(업체 키·GUARD_ENABLED) → 'open'(신청) | 'wait'(알림 신청만) */
function jgCta(site, server) { return !!(site && site.PAID_OPEN) && !!(server && server.ok && server.open) ? 'open' : 'wait'; }
/* GUARD-CORE END */

/* ---------- 화면 전용: '알림이 오면 이렇게 하세요' 해석(무료) ---------- */
const LINK = {
  iros: { n: '대법원 인터넷등기소', u: 'https://www.iros.go.kr/' },
  ecfs: { n: '대법원 전자소송', u: 'https://ecfs.scourt.go.kr/' },
  hug: { n: 'HUG 안심전세포털', u: 'https://www.khug.or.kr/jeonse/index_jeonse.jsp' },
  klac: { n: '대한법률구조공단(전화 132)', u: 'https://www.klac.or.kr/' },
  gov: { n: '정부24', u: 'https://www.gov.kr/' }
};
/* 할 일 사전 — 같은 할 일은 종류가 달라도 같은 글자 */
const TODO = {
  read: { t: '최신 등기부를 열어 무엇이 새로 생겼는지 보기', s: '알림은 "무언가 바뀌었다"까지만 알려 줘요. 등기부 갑구(집주인)·을구(빚) 맨 아래 줄과 접수일을 확인해요.', l: 'iros' },
  date: { t: '내 전입일·확정일자와 새 권리의 접수일 비교하기', s: '내 전입신고 다음 날·확정일자가 새 권리의 접수일보다 빠르면, 보통 내 보증금이 먼저 보호돼요. 등본(정부24)으로 내 전입일을 확인해요.', l: 'gov' },
  ask: { t: '집주인에게 이유를 물어보고 문자로 남기기', s: '왜 생겼는지, 언제 정리되는지 물어보고 답을 문자나 메신저처럼 날짜가 남는 방법으로 받아 두세요.' },
  owner: { t: '새 집주인을 확인하고 계약이 이어지는지 확인하기', s: '집이 팔려도 대항력(전입+거주)이 있으면 새 집주인이 보증금 돌려줄 의무를 이어받는 게 일반적이에요. 새 집주인 이름·연락처를 등기부와 맞춰 보세요.' },
  hug: { t: '보증보험(전세보증금 반환보증) 확인하기', s: '들어 있다면 보증 기관에 상황을 알려야 하는지, 집주인이 바뀌면 할 일이 있는지 확인해요. 아직 안 들었다면 지금 가입할 수 있는지 봐요.', l: 'hug' },
  leaseReg: { t: '만기에 보증금을 못 받으면 임차권등기명령 신청', s: '이사를 가야 하는데 보증금을 못 받았다면, 이사 전에 법원에 임차권등기명령을 신청해 두면 이사 뒤에도 순위가 지켜져요. 등기가 된 것을 확인한 뒤 이사해요.', l: 'ecfs' },
  claim: { t: '경매 법원에 권리신고·배당요구 하기(기한 안에)', s: '경매가 시작되면 법원이 정한 배당요구 종기까지 배당요구를 해야 보증금을 나눠 받을 수 있어요. 사건번호는 등기부 갑구에 적혀 있어요.', l: 'ecfs' },
  trust: { t: '신탁 원부를 떼어 임대 권한을 확인하기', s: '신탁이 되면 집의 법적 주인은 신탁회사예요. 계약할 때 신탁회사 동의를 받았는지 신탁 원부(등기소)로 확인해요.', l: 'iros' },
  legal: { t: '법률 상담 받기', s: '내 계약에 맞는 판단은 전문가에게 물어보세요. 대한법률구조공단은 국번 없이 132로 상담할 수 있어요.', l: 'klac' },
  keep: { t: '전입신고를 그대로 두고 이사 가지 않기', s: '대항력은 그 집에 살고 전입이 되어 있는 동안만 이어져요. 가족만 남겨 두는 것도 방법이지만, 먼저 상담해 보세요.' },
  watch: { t: '다음 변동도 계속 지켜보기', s: '한 번 정리된 뒤에도 새 권리가 또 생길 수 있어요. 알림은 계속 켜 두세요.' }
};
const WHAT = {
  auction: { head: '경매가 시작됐어요 — 가장 급한 상황이에요', why: ['집주인이 빚을 갚지 못해 채권자가 법원에 경매를 신청했고, 법원이 받아들였다는 뜻이에요.', '정해진 기한 안에 배당요구를 하지 않으면 보증금을 나눠 받지 못할 수 있어요.'], todo: ['read', 'claim', 'keep', 'hug', 'legal'] },
  seize: { head: '집에 압류·가압류가 걸렸어요 — 빨리 확인하세요', why: ['집주인에게 받을 돈이 있는 사람(세무서·은행·개인 등)이 이 집을 함부로 팔지 못하게 묶어 둔 거예요.', '내 전입·확정일자가 먼저면 내 순위가 앞서는 게 일반적이지만, 세금 압류는 순서가 다를 수 있어요.'], todo: ['read', 'date', 'ask', 'hug', 'leaseReg', 'legal'] },
  owner: { head: '집주인이 바뀌었어요', why: ['집이 팔렸거나(매매) 상속·증여 등으로 주인이 바뀐 거예요.', '대항력이 있으면 보통 새 집주인이 계약을 이어받지만, 새 주인의 빚·세금 상황은 다시 봐야 해요.'], todo: ['read', 'owner', 'date', 'hug', 'legal'] },
  notice: { head: '예고등기가 있어요 — 이 집을 두고 소송이 진행 중일 수 있어요', why: ['등기가 잘못됐다며 누군가 소송을 냈다는 것을 알리는 옛 제도의 기록이에요(2011년 폐지, 그 전 기록은 남아 있을 수 있어요).', '소송 결과에 따라 지금 집주인의 권리가 뒤집힐 수 있어요.'], todo: ['read', 'ask', 'legal'] },
  trust: { head: '집이 신탁됐어요 — 계약 권한을 확인하세요', why: ['집주인이 집을 신탁회사에 맡겼다는 뜻이에요. 법적으로는 신탁회사가 주인이 돼요.', '내 계약보다 신탁이 먼저였다면 신탁회사 동의가 없는 계약은 보호받기 어려울 수 있어요.'], todo: ['read', 'trust', 'date', 'legal'] },
  lease: { head: '임차권등기가 생겼어요 — 앞선 세입자가 보증금을 못 받은 신호일 수 있어요', why: ['세입자가 만기에 보증금을 못 받고 이사하면서 법원에 순위를 지켜 달라고 등기한 거예요.', '집주인이 보증금을 제때 돌려주지 못하고 있다는 뜻일 수 있어요.'], todo: ['read', 'ask', 'hug', 'leaseReg', 'legal'] },
  mortgage: { head: '집에 새 대출(근저당)이 잡혔어요', why: ['집주인이 이 집을 담보로 돈을 빌렸다는 뜻이에요.', '내 전입신고 다음 날·확정일자가 이 근저당 접수일보다 빠르면 보통 내 보증금이 먼저예요. 늦으면 은행이 먼저라 위험이 커져요.'], todo: ['read', 'date', 'ask', 'hug', 'watch'] },
  release: { head: '권리 하나가 지워졌어요 — 대개 좋은 소식이에요', why: ['대출을 갚아 근저당이 지워졌거나, 압류가 풀린 경우가 많아요.', '무엇이 지워졌는지는 등기부에서 줄이 그어진 항목으로 확인해요.'], todo: ['read', 'watch'] },
  other: { head: '등기에 변동이 있어요 — 무엇인지 확인하세요', why: ['주소 표시 변경처럼 가벼운 변동일 수도 있고, 확인이 필요한 변동일 수도 있어요.'], todo: ['read', 'ask', 'watch'] }
};
/** 해석 한 장: id → { id, n, lv, lvT, head, why, todo:[{id,t,s,href,ln}] } */
function what(id) {
  const T = jgType(id), w = WHAT[T.id] || WHAT.other;
  return { id: T.id, n: T.n, lv: T.lv, lvT: JG_LV[T.lv], head: w.head, why: w.why.slice(),
    todo: w.todo.map(k => { const d = TODO[k], L = d.l ? LINK[d.l] : null; return { id: k, t: d.t, s: d.s, href: L ? L.u : '', ln: L ? L.n : '' }; }) };
}
const ORDER = ['auction', 'seize', 'notice', 'owner', 'trust', 'lease', 'mortgage', 'release', 'other'];
/** 인터넷등기소 '등기사항 변동 알림' 신청 순서(무료 안내 — 2026-11-27 웹 안내글로 확인, 공식 화면 이름이 바뀌었을 수 있음) */
const FREE_STEPS = [
  '대법원 인터넷등기소(www.iros.go.kr)에 회원가입하고 로그인해요(본인 인증 필요).',
  '위 메뉴 [등기열람/발급]에서 [등기사항 변동 알림 서비스]를 눌러요.',
  '[서비스 신청]을 누르고, 내 전셋집 주소를 찾아 동·호수까지 골라요.',
  '알림 받을 기간(계약 만기까지)과 문자 받을 휴대폰 번호를 확인하고 신청을 마쳐요.',
  '문자가 오면 이 화면(알림이 오면 이렇게 하세요)에서 변동 종류를 골라 할 일을 확인해요.'
];

/* ---------- 내가 뗀 등기부 올리기(무료 · 기기 안에서만) ----------
   인터넷등기소에서 사용자가 직접 뗀 등기사항증명서(열람·발급 PDF)의 글자(assets/reg-upload.js 가 pdf.js 로 이 기기에서 읽음)를 표 모양으로 나눠요.
   글자 모양(인터넷등기소 양식): 【 갑 구 】(소유권) · 【 을 구 】(소유권 이외 권리) 표의 한 줄 = 순위번호 · 등기목적 · 접수(2020년3월5일 제12345호) · 등기원인 · 권리자 및 기타사항.
   '3번근저당권설정등기말소' 같은 줄이 있으면 그 순위번호는 지워진 것으로 봐요. 맨 뒤 '주요 등기사항 요약'은 같은 내용이 겹쳐서 읽지 않아요.
   파일·이름·주민번호는 어디에도 보내지 않고, 이 함수는 이름을 가린 결과만 돌려줘요. */
const PURP = '(?:[0-9]+(?:-[0-9]+)?번)?[가-힣0-9()·\\s]{0,30}?(?:소유권보존|소유권이전청구권가등기|소유권이전|근저당권설정|근저당권변경|근저당권이전|저당권설정|전세권설정|전세권변경|주택임차권|임차권설정|임차권등기|예고등기|가압류|압류|가처분|임의경매개시결정|강제경매개시결정|경매개시결정|신탁|말소|등기명의인표시변경|변경|가등기)(?:등기)?';
const ROW = new RegExp('(?:^|\\s)(\\d{1,3}(?:-\\d{1,3})?)\\s+(' + PURP + ')\\s+(\\d{4})\\s*년\\s*(\\d{1,2})\\s*월\\s*(\\d{1,2})\\s*일\\s*(?:제\\s*[\\d,]+\\s*호)?', 'g');
const HOLDER = /(소유자|공유자|근저당권자|저당권자|전세권자|임차권자|채권자|가처분권자|수탁자|가등기권자)\s+((?:주식회사|\(주\)|유한회사|재단법인|사단법인)?\s*[가-힣A-Za-z0-9()·]{1,30}(?:\s*(?:주식회사|은행|캐피탈|금고|조합|저축은행|대부))?)/;
const pad2 = n => String(n).padStart(2, '0');
function stripId(s) { return String(s || '').replace(/\d{6}\s*-\s*[\d*]{7}/g, ' ').replace(/\d{6}\s*-\s*\*+/g, ' '); }
/** PDF 글자 → reg { asof, gap:[…], eul:[…], ok } — jgParseReg 에 넣는 모양. ok=false 면 등기부 모양이 아님 */
function parseText(text) {
  let s = String(text == null ? '' : text).replace(/\r/g, '\n').replace(/[ 　]/g, ' ');
  const cut = s.search(/주\s*요\s*등\s*기\s*사\s*항\s*요\s*약/); if (cut > 0) s = s.slice(0, cut);
  s = s.replace(/\s+/g, ' ');
  const asofM = /(?:열람|발급)\s*일시\s*:?\s*(\d{4})\s*년\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일/.exec(s);
  const gi = s.search(/【\s*갑\s*구\s*】/), ei = s.search(/【\s*을\s*구\s*】/);
  const sec = (a, b) => a < 0 ? '' : s.slice(a, b > a ? b : undefined);
  const rows = part => {
    const out = [], ms = [];
    let m; ROW.lastIndex = 0;
    while ((m = ROW.exec(part))) ms.push({ i: m.index, end: ROW.lastIndex, no: m[1], purpose: m[2].replace(/\s+/g, ''), at: `${m[3]}-${pad2(m[4])}-${pad2(m[5])}` });
    ms.forEach((x, k) => {
      const body = stripId(part.slice(x.end, k + 1 < ms.length ? ms[k + 1].i : undefined));
      const amt = /(?:채권최고액|전세금|임차보증금|청구금액)\s*금?\s*([\d,]+)\s*원/.exec(body), h = HOLDER.exec(body);
      const cause = /(임의경매로\s*인한\s*매각|강제경매로\s*인한\s*매각|협의분할에\s*의한\s*상속|매매|증여|상속|신탁|공매|판결|교환|재산분할|설정계약|해지|해제|가압류결정|압류|임차권등기명령|경매개시결정)/.exec(body);
      out.push({ no: x.no, purpose: x.purpose, at: x.at, cause: cause ? cause[1].replace(/\s+/g, ' ') : '', amount: amt ? amt[1] : '', holder: h ? h[2].trim() : '', cancelled: false });
    });
    /* 말소: 'N번…말소' → 그 순위(N, N-1…)를 지움. 말소 줄 자체는 권리가 아니라 지워진 기록이라 같이 지움 */
    out.forEach(x => { const c = /^(\d+(?:-\d+)?)번.*말소/.exec(x.purpose); if (c) { out.forEach(y => { if (y.no === c[1] || y.no.split('-')[0] === c[1].split('-')[0] && c[1].indexOf('-') < 0) y.cancelled = true; }); x.cancelled = true; } });
    /* 변경(부기 N-1): 채권최고액이 바뀌면 원래 줄 금액을 바꿈 */
    out.forEach(x => { if (/변경/.test(x.purpose) && /-/.test(x.no) && x.amount) { const base = out.find(y => y.no === x.no.split('-')[0] && !y.cancelled); if (base) base.amount = x.amount; x.cancelled = true; } });
    return out;
  };
  const gap = rows(sec(gi, ei)), eul = rows(sec(ei, -1));
  return { ok: gi >= 0 && (gap.length > 0), asof: asofM ? `${asofM[1]}-${pad2(asofM[2])}-${pad2(asofM[3])}` : '', gap: gap, eul: eul };
}
/** 진단 한 장(assets/diag.js 모양). sum = jgParseReg 결과, o = { dep 보증금(만원, 기기에만), base 사이트 주소 } */
function regReport(sum, o) {
  o = o || {}; const F = sum.flags || {}, dep = Number(o.dep) || 0, items = [];
  const recent = sum.ownerAt && sum.asof ? (jgT(sum.asof) - jgT(sum.ownerAt)) / 864e5 < 92 : false;
  items.push({ id: 'own', t: '집주인(갑구 소유자)', lv: sum.owner ? (recent ? 'y' : 'g') : 'n', v: sum.owner ? `${sum.owner}${sum.ownerAt ? ` · ${sum.ownerAt.slice(0, 7).replace('-', '.')}부터` : ''}` : '읽지 못했어요',
    s: sum.owner ? (recent ? '최근 3개월 안에 집주인이 바뀌었어요. 계약서의 임대인과 같은 사람인지 꼭 맞춰 보세요.' : '계약서의 임대인 이름과 같은지 맞춰 보세요(이름은 이 화면에서도 가려서 보여 드려요).') : '등기부의 소유자 줄을 찾지 못했어요. 원본에서 직접 확인해 주세요.',
    why: ['등기부 갑구 맨 아래쪽 소유권 이전 줄의 소유자가 지금 집주인이에요.', '계약은 반드시 이 사람(또는 정식 위임을 받은 사람)과 해야 해요.'] });
  const nL = (sum.liens || []).length;
  items.push({ id: 'lien', t: '선순위 채권(을구 근저당·전세권 등)', lv: nL ? 'y' : 'g', v: nL ? man(sum.senior) : '없어요',
    s: nL ? `${nL}건 · ${sum.liens.map(l => `${l.kind} ${man(l.amt)}${l.at ? ` (${l.at.replace(/-/g, '.')})` : ''}`).join(', ')}${dep > 0 ? ` · 내 보증금과 합치면 ${man(sum.senior + dep)}` : ''}` : '지워지지 않은 근저당·전세권이 보이지 않아요.',
    why: ['근저당의 채권최고액은 은행이 경매 때 나보다 먼저 가져갈 수 있는 최대 금액이에요(실제 빚보다 보통 120~130% 높게 잡아요).', '집값(시세)에서 이 금액을 빼고도 내 보증금이 남는지 봐야 해요. 전세 안전 점검의 선순위 채권 칸에 이 합계를 넣어 계산해요.'] });
  const flag = (id, on, t, yes, no, why) => items.push({ id: id, t: t, lv: on ? 'r' : 'g', v: on ? '있어요' : '없어요', s: on ? yes : no, why: why });
  flag('seize', F.seize, '압류·가압류·가처분', '집주인의 빚 때문에 집이 묶여 있어요. 계약 전이라면 정리(말소)된 것을 확인하기 전에는 계약하지 않는 게 안전해요.', '보이지 않아요.', ['압류·가압류가 있으면 경매로 넘어갈 수 있고, 세금 압류는 보증금보다 먼저 가져갈 수 있어요.']);
  flag('auction', F.auction, '경매개시결정', '이미 경매가 시작된 집이에요. 계약하면 보증금을 잃을 위험이 매우 커요.', '보이지 않아요.', ['경매가 시작된 뒤 들어온 세입자는 보호받기 어려워요.']);
  flag('trust', F.trust, '신탁', '집의 법적 주인이 신탁회사예요. 신탁 원부로 임대 권한(신탁회사 동의)을 꼭 확인하세요.', '보이지 않아요.', ['신탁된 집은 집주인 이름만 믿고 계약하면 안 돼요. 신탁회사 동의 없는 계약은 보호받기 어려울 수 있어요.']);
  flag('lease', F.lease, '임차권등기', '앞선 세입자가 보증금을 못 받고 나간 기록이에요. 집주인이 보증금을 돌려주기 어려운 상황일 수 있어요.', '보이지 않아요.', ['임차권등기가 남아 있는 집은 새 세입자의 최우선변제도 제한될 수 있어요.']);
  if (F.notice) flag('notice', true, '예고등기', '이 집을 두고 소송이 있었거나 진행 중이라는 기록이에요. 결과에 따라 집주인 권리가 바뀔 수 있어요.', '', ['예고등기는 2011년에 없어진 제도지만 그 전 기록은 남아 있을 수 있어요.']);
  flag('prov', F.prov, '가등기', '다른 사람이 이 집을 넘겨받기로 예약해 둔 기록이에요. 나중에 소유권이 넘어가면 내 계약이 흔들릴 수 있어요.', '보이지 않아요.', ['소유권이전청구권 가등기가 본등기로 바뀌면 그 뒤 생긴 권리는 지워질 수 있어요.']);
  const r = items.filter(i => i.lv === 'r'), y = items.filter(i => i.lv === 'y');
  const lv = r.length ? 'r' : y.length ? 'y' : items.some(i => i.lv === 'n') ? 'n' : 'g';
  return { title: '내가 뗀 등기부 진단', lv: lv,
    head: r.length ? `위험 신호 ${r.length}개 — 계약 전에 꼭 정리됐는지 확인하세요` : y.length ? `주의할 점 ${y.length}개 — 금액과 날짜를 한 번 더 보세요` : lv === 'n' ? '일부를 읽지 못했어요 — 원본에서 직접 확인해 주세요' : '큰 위험 신호는 보이지 않아요',
    sub: r.length ? r.map(i => i.t).join(' · ') : y.length ? y.map(i => i.t).join(' · ') : '잔금 직전에 등기부를 한 번 더 떼어 그사이 바뀐 게 없는지 확인하세요',
    asof: sum.asof ? `등기부 ${sum.asof.replace(/-/g, '.')} 기준` : '', items: items,
    todo: [
      { id: 'again', t: '잔금 직전에 등기부를 한 번 더 떼어 보기', s: '계약한 날과 잔금 날 사이에 새 대출·압류가 생길 수 있어요.', href: LINK.iros.u, ext: 1, ln: LINK.iros.n },
      { id: 'free', t: '인터넷등기소 등기 변동 알림 무료 신청하기', s: '살고 있는 동안 집에 새 권리가 생기면 문자로 알려 줘요.', href: 'jeonse/guard/#free', ln: '신청 방법 보기' },
      { id: 'what', t: '알림이 오면 이렇게 하세요(무료)', s: '변동 종류별 위험 정도와 다음 할 일을 정리했어요.', href: 'jeonse/guard/what/', ln: '해석 보기' }
    ],
    note: '내가 올린 등기부 파일을 이 기기 안에서만 읽어 만든 정보예요. 파일·이름·주민번호는 집예보 서버를 포함해 어디에도 보내지 않아요. 표 모양이 특이하면 잘못 읽을 수 있으니 원본과 꼭 맞춰 보세요. 법률 판단이 아닌 참고 정보예요.' };
}

/* ---------- 쉽게 읽는 등기부(무료 · 기기 안 또는 열람 결과 한 번 보기) ----------
   reg = parseText 결과(또는 서버 열람 어댑터가 같은 모양으로 바꾼 것 — 이름은 가린 것만). 한 줄씩 쉬운 말로 풀어요. */
const TAGC = { r: '#B42318', y: '#A15C07', g: '#0E7A4F', n: '#4E5968' };
const CAUSE_KO = { '매매': '사서(매매)', '증여': '증여받아', '상속': '상속받아', '신탁': '신탁으로', '공매': '공매로 사서', '판결': '판결로', '교환': '교환으로', '재산분할': '재산분할로' };
/* 채권최고액 → 실제 빚 일반 관행: 은행은 보통 대출 원금의 110~120%를 근저당 설정액으로 잡아요(금융위원회 2013.11.29 보도자료 '생활밀착형 금융관행 개선') */
const MAX_RATE = { lo: 1.1, hi: 1.2, src: { n: '금융위원회 「생활밀착형 금융관행 개선 추진」(2013.11.29) — 시중은행 주택담보대출 근저당 설정비율 관행 120%(일부 110%)', u: 'https://fsc.go.kr/no010101/70927' } };
function rowPlain(x, sec) {
  const t = jgTypeOf(x.purpose), who = jgMaskName(x.holder), d = x.at ? x.at.replace(/-/g, '.') : '', amt = jgWon(x.amount);
  if (/^\d+(-\d+)?번/.test(x.purpose) && /말소/.test(x.purpose)) return `${d}에 ${x.purpose.match(/^\d+(-\d+)?/)[0]}번 줄의 권리를 지웠다는 기록이에요.`;
  if (/변경/.test(x.purpose) && /-/.test(x.no)) return `${d}에 ${x.no.split('-')[0]}번 줄의 내용을 바꿨어요${amt ? `(채권최고액 → ${man(amt)})` : ''}. 바뀐 값이 원래 줄에 반영돼요.`;
  if (/소유권보존/.test(x.purpose)) return `${who || '첫 주인'}이(가) 이 집의 첫 주인으로 등기했어요(${d}). 새로 지은 집은 보통 이 줄부터 시작해요.`;
  if (t === 'owner' && /가등기/.test(x.purpose)) return `${who || '누군가'}이(가) 나중에 이 집을 넘겨받기로 예약(가등기)해 뒀어요(${d}). 본등기가 되면 이 뒤에 생긴 권리는 지워질 수 있어요.`;
  if (t === 'owner') return `${who || '새 주인'}이(가) ${d}에 ${CAUSE_KO[x.cause] || (x.cause ? x.cause + '(으)로' : '')} 집주인이 됐어요.`;
  if (t === 'mortgage' && /전세권/.test(x.purpose)) return `${who || '전세권자'}이(가) 전세금 ${man(amt)}에 대해 전세권을 등기했어요(${d}). 이 사람의 보증금이 나보다 먼저일 수 있어요.`;
  if (t === 'mortgage') return `${who || '채권자'}이(가) 이 집을 담보로 최대 ${man(amt)}까지 먼저 받을 수 있게 해 뒀어요(${d}). 일반적으로 실제 빌린 돈은 이 금액의 약 ${Math.round(100 / MAX_RATE.hi)}~${Math.round(100 / MAX_RATE.lo)}%(약 ${man(amt / MAX_RATE.hi)}~${man(amt / MAX_RATE.lo)}) 수준이에요.`;
  if (t === 'lease') return `세입자 ${who || ''}이(가) 보증금 ${amt ? man(amt) : ''}을(를) 돌려받지 못해 임차권을 등기했어요(${d}).`;
  if (t === 'seize') return `${who || '채권자'}이(가) ${d}에 이 집을 ${/가처분/.test(x.purpose) ? '함부로 처분하지 못하게(가처분)' : /가압류/.test(x.purpose) ? '임시로 묶어(가압류)' : '묶어(압류)'} 뒀어요${amt ? `(청구 ${man(amt)})` : ''}.`;
  if (t === 'auction') return `${who || '채권자'}의 신청으로 ${d}에 경매가 시작됐어요.`;
  if (t === 'trust') return `${d}에 집을 신탁회사${who ? `(${who})` : ''}에 맡겼어요. 법적인 주인은 신탁회사예요.`;
  if (t === 'notice') return `${d}에 이 집 등기를 두고 소송이 있다는 예고등기가 됐어요.`;
  if (t === 'release') return `${d}에 권리 하나를 지웠다는 기록이에요.`;
  return `${d} · ${x.purpose}${x.cause ? ` (${x.cause})` : ''}`;
}
/** 쉽게 읽는 등기부 HTML. o = { brand: {name, office, tel, logo} 중개사 설명용(선택) } */
function easyView(reg, o) {
  o = o || {};
  const tag = x => { if (x.cancelled) return `<span class="ez-tag" style="background:#F2F4F6;color:#6B7684">지워진 기록</span>`; const T = jgType(jgTypeOf(x.purpose)); return T.id === 'other' || /소유권보존/.test(x.purpose) ? '' : `<span class="ez-tag" style="background:${TAGC[T.lv]}14;color:${TAGC[T.lv]}">${esc(T.n)}</span>`; };
  const rows = (a, sec) => (a || []).length ? `<ol class="ez-rows">${a.map(x => `<li class="${x.cancelled ? 'ez-off' : ''}"><span class="ez-no">${esc(x.no)}</span><div><b>${esc(x.purpose)}</b> ${tag(x)}<p>${esc(rowPlain(x, sec))}</p></div></li>`).join('')}</ol>` : `<p class="ez-none">${sec === 'eul' ? '을구에 적힌 권리가 없어요. 근저당·전세권이 없다는 뜻이라 좋은 신호예요.' : '읽은 줄이 없어요.'}</p>`;
  const B = o.brand && o.brand.name ? `<div class="ez-brand">${o.brand.logo ? `<img src="${esc(o.brand.logo)}" alt="" width="40" height="40">` : ''}<div><b>${esc(o.brand.office || '')} ${esc(o.brand.name)}</b><small>${o.brand.tel ? '문의 ' + esc(o.brand.tel) + ' · ' : ''}손님 설명용으로 정리했어요</small></div></div>` : '';
  return `<section class="ez" aria-label="쉽게 읽는 등기부">${B}
    <h3>쉽게 읽는 등기부${reg.asof ? ` <small>${esc(reg.asof.replace(/-/g, '.'))} 열람 기준</small>` : ''}</h3>
    <div class="ez-part"><h4>표제부 <small>어떤 집인가요</small></h4><p>집의 주소·건물 구조·면적이 적힌 곳이에요. 계약서의 주소·동·호수와 똑같은지 먼저 맞춰 보세요.</p></div>
    <div class="ez-part"><h4>갑구 <small>누가 주인인가요 · 집을 묶는 권리</small></h4>${rows(reg.gap, 'gap')}</div>
    <div class="ez-part"><h4>을구 <small>집에 걸린 빚 · 다른 사람의 권리</small></h4>${rows(reg.eul, 'eul')}</div>
    <p class="ez-src">근저당 설명의 '실제 빌린 돈' 범위는 일반 관행으로 계산한 참고값이에요. 근거: <a href="${MAX_RATE.src.u}" target="_blank" rel="noopener">${esc(MAX_RATE.src.n)} ↗</a>. 실제 남은 빚은 집주인·은행만 알 수 있어요.</p>
  </section>`;
}
/** 내 보증금 순서 참고 계산. o = { price 집값(만원), ratio 경매에서 팔릴 비율(0~1, 사용자가 고침), dep 내 보증금(만원), senior 나보다 앞선 권리 합계(만원) }
    → { sale 예상 매각가, ahead, left 내 몫, back 돌려받을 수 있는 금액 범위 {lo, hi}, short 모자랄 수 있는 금액 } — 경매 비용·세금·최우선변제는 넣지 않은 단순 계산 */
function simulate(o) {
  const P = Math.max(0, Number(o.price) || 0), R = Math.min(1, Math.max(0.3, Number(o.ratio) || 0.8)), D = Math.max(0, Number(o.dep) || 0), S = Math.max(0, Number(o.senior) || 0);
  const at = r => Math.max(0, Math.min(D, Math.round(P * r - S)));
  const hi = at(R), lo = at(Math.max(0.3, R - 0.1));
  return { sale: Math.round(P * R), ahead: S, back: { lo: lo, hi: hi }, short: Math.max(0, D - lo), ratio: R };
}
/** 계약서에 넣을 만한 특약 문구 예시(널리 쓰이는 일반 문구). sum = parseReg 결과 */
function clauses(sum) {
  sum = sum || { liens: [], flags: {} };
  const c = ['임대인은 잔금일 다음 날까지 이 집에 저당권 등 담보권을 새로 설정하지 않는다. 이를 어기면 임차인은 계약을 해제할 수 있고, 임대인은 받은 보증금 전액을 즉시 돌려준다.',
    '임대인은 잔금일까지 매매·증여·신탁 등으로 소유권을 넘기지 않는다.',
    '임대인은 계약일 현재 국세·지방세 체납이 없음을 확인한다. 잔금 전 체납 사실이 확인되면 임차인은 계약을 해제할 수 있고, 임대인은 받은 금액 전부를 즉시 돌려준다.',
    '임차인의 전세보증금 반환보증 가입이 임대인 사유로 거절되면 이 계약은 효력을 잃고, 임대인은 받은 금액 전부를 즉시 돌려준다.'];
  if ((sum.liens || []).some(l => l.kind === '근저당')) c.unshift('임대인은 등기부 을구의 근저당권(채권최고액 ○○원)을 잔금일에 받은 잔금으로 갚고 말소하며, 말소 접수증을 임차인에게 준다.');
  if (sum.flags && sum.flags.trust) c.unshift('임대인은 계약 전 신탁회사(수탁자)의 임대 동의서를 받아 이 계약서에 붙인다. 동의서가 없으면 이 계약은 효력을 잃는다.');
  if (sum.flags && sum.flags.seize) c.unshift('임대인은 잔금일까지 등기부의 압류·가압류를 모두 말소하고, 말소되지 않으면 임차인은 계약을 해제할 수 있다.');
  return c;
}

/* ---------- 중개대상물 확인·설명서 '권리관계' 칸 작성 보조(중개사용) ----------
   서식: 공인중개사법 시행규칙 [별지 제20호서식] 중개대상물 확인·설명서[Ⅰ](주거용 건축물) ② 권리관계 — 등기부 기재사항(소유권에 관한 사항 · 소유권 외의 권리사항).
   최신 개정 서식은 국가법령정보센터에서 확인. 이름은 가린 값이라 중개사가 원본 등기부로 직접 채우고 확인해야 해요. */
const CONFIRM_SRC = { n: '공인중개사법 시행규칙 [별지 제20호서식] 중개대상물 확인·설명서[Ⅰ](주거용 건축물) — 최신 개정본은 국가법령정보센터에서 확인', u: 'https://www.law.go.kr/%EB%B2%95%EB%A0%B9/%EA%B3%B5%EC%9D%B8%EC%A4%91%EA%B0%9C%EC%82%AC%EB%B2%95%EC%8B%9C%ED%96%89%EA%B7%9C%EC%B9%99' };
function confirmDoc(reg) {
  const sum = jgParseReg(reg), F = sum.flags, live = a => (a || []).filter(x => !x.cancelled);
  const own = `소유자: ${sum.owner || '(원본 확인)'}${sum.ownerAt ? ` · ${sum.ownerAt.replace(/-/g, '.')} 소유권 취득` : ''}`;
  const gapEtc = live(reg.gap).filter(x => ['seize', 'auction', 'trust', 'notice'].indexOf(jgTypeOf(x.purpose)) >= 0 || /가등기/.test(x.purpose))
    .map(x => `${x.purpose}(${x.at.replace(/-/g, '.')} 접수${x.amount ? ` · 청구 ${man(jgWon(x.amount))}` : ''}${x.holder ? ` · ${jgMaskName(x.holder)}` : ''})`);
  const eul = live(reg.eul).filter(x => !/^\d+(-\d+)?번/.test(x.purpose)).map(x => `${x.purpose}(${x.at.replace(/-/g, '.')} 접수${x.amount ? ` · ${/전세/.test(x.purpose) ? '전세금' : /임차/.test(x.purpose) ? '임차보증금' : '채권최고액'} ${man(jgWon(x.amount))}` : ''}${x.holder ? ` · ${jgMaskName(x.holder)}` : ''})`);
  return { gap: [own].concat(gapEtc.length ? gapEtc : ['소유권 외 갑구 권리: 없음']).join('\n'), eul: eul.length ? eul.join('\n') : '해당 없음', asof: sum.asof, flags: F, src: CONFIRM_SRC,
    note: '자동으로 읽은 값이에요. 원본 등기사항증명서와 한 줄씩 맞춰 보고, 소유자 이름은 원본으로 직접 적어 주세요. 확인·설명 책임은 개업공인중개사에게 있어요.' };
}

function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function won(n) { return Math.round(Number(n) || 0).toLocaleString('ko-KR') + '원'; }
function man(m) { m = Math.round(Number(m) || 0); if (!m) return '0원'; const e = Math.floor(m / 10000), r = m % 10000; return e && r ? `${e}억 ${r.toLocaleString('ko-KR')}만 원` : e ? `${e}억 원` : `${r.toLocaleString('ko-KR')}만 원`; }
/** 화면 가격: config GUARD 값 */
function cfg() { return jgCfg(root && root.JDJ_SITE && root.JDJ_SITE.GUARD); }

const API = { V: JG_V, DEF: JG_DEF, LV: JG_LV, TYPES: JG_TYPES, ST: JG_ST, ORDER, FREE_STEPS, LINK, typeOf: jgTypeOf, type: jgType, cfgOf: jgCfg, cfg, days: jgDays, monthsTo: jgMonthsTo,
  price: jgPrice, cost: jgCost, margin: jgMargin, readCost: jgReadCost, uniq: jgUniq, maskName: jgMaskName, wonOf: jgWon, parseReg: jgParseReg, cta: jgCta, what, parseText, regReport, easyView, simulate, clauses, rowPlain, confirmDoc, MAX_RATE, esc, won, man };
if (typeof module !== 'undefined' && module.exports) module.exports = API;
else root.JDJ_GUARD = API;
})(typeof window !== 'undefined' ? window : this);
