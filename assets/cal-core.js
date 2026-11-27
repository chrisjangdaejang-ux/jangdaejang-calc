/* 내 부동산 달력 계산 — 화면 없음. 달력 화면(mine/calendar/)·서버 달력 알림 메일(tools/agent-backend.gs v55)이 함께 쓴다.
   - 아래 'CAL-CORE' 블록은 tools/agent-backend.gs 에 글자 그대로 복사돼 있다(서버는 다른 파일을 불러올 수 없어서). tools/cal-test.js 가 두 곳이 같은지 확인한다.
   - 날짜 규칙은 공식 출처(CAL_SRC)를 직접 열어 확인한 것만 보여 준다(CAL_RULES ok:true). 확인하지 못한 규칙(ok:false)은 계산도 표시도 하지 않는다.
   - 사용자가 넣는 것: 자가·전세·월세, 취득일(잔금일)·파는 집 잔금일(선택), 전월세 계약 시작·만기일, 보유 주택 수. 금액은 받지 않는다.
   - 날짜는 'YYYY-MM-DD' 글자로만 계산한다(시간대 영향 없음). 주말·공휴일로 기한이 미뤄지는 경우는 계산하지 않고 안내만 한다.
   window.JDJ_CAL_CORE */
(function (root) {
'use strict';
/* CAL-CORE BEGIN — 이 블록은 tools/agent-backend.gs 에 그대로 복사돼 있어요. 고칠 때는 두 곳을 똑같이 고쳐 주세요(node tools/cal-test.js 가 비교). */
const CAL_V = 'cal-2026-11-26';
const CAL_TEN = { own: '자가', jeonse: '전세', wolse: '월세' };
/* 공식 출처(2026-11-25 직접 열어 확인) */
const CAL_SRC = {
  prop: { nm: '서울특별시 「세목별 안내 — 재산세」', url: 'https://news.seoul.go.kr/gov/archives/200106' },
  acq: { nm: '서울특별시 「세목별 안내 — 취득세」', url: 'https://news.seoul.go.kr/gov/archives/200082' },
  comp: { nm: '종합부동산세법 제3조·제16조(국가법령정보센터)', url: 'https://www.law.go.kr/LSW/lsPdfPrint.do?ancYnChk=0&lsiSeq=249983&efYd=20230418&efGubun=Y&joAllCheck=Y&joEfOutPutYn=on&mokChaChk=N&bylChaChk=N' },
  cgt: { nm: '법제처 찾기쉬운 생활법령 「양도소득세」', url: 'https://easylaw.go.kr/CSP/CnpClsMain.laf?popMenu=ov&csmSeq=1259&ccfNo=4&cciNo=2&cnpClsNo=2' },
  renew: { nm: '주택임대차보호법 제6조의3(국가법령정보센터)', url: 'https://law.go.kr/lsLawLinkInfo.do?lsJoLnkSeq=1007847519&chrClsCd=010202&ancYnChk=0' },
  renew2: { nm: '대한민국 정책브리핑 「계약갱신청구권, 언제부터 집주인에게 요구할 수 있어요?」', url: 'https://www.korea.kr/news/visualNewsView.do?newsId=148875466' },
  move: { nm: '주택임대차보호법 제3조(국가법령정보센터)', url: 'https://www.law.go.kr/lsLinkCommonInfo.do?lsJoLnkSeq=1018577211&chrClsCd=010202&ancYnChk=' },
  rent: { nm: '서울특별시 내 손안에 서울 「전·월세 계약 꼭 신고하세요」', url: 'https://mediahub.seoul.go.kr/archives/2001807' },
  cy: { nm: '한국부동산원 청약홈 분양 공고', url: 'https://www.applyhome.co.kr/' },
  rentdata: { nm: '국토교통부 아파트·연립다세대·오피스텔 전월세 실거래가 공개 자료', url: 'https://rt.molit.go.kr/' },
  /* 세입자 살면서 할 일(2026-11-27): 날짜는 집예보가 정한 알림 시점이고 법정 기한이 아니에요 */
  hug: { nm: '주택도시보증공사(HUG) 안심전세포털 — 전세보증금반환보증 안내', url: 'https://www.khug.or.kr/jeonse/index_jeonse.jsp' },
  iros: { nm: '대법원 인터넷등기소 — 등기열람·등기사항 변동 알림', url: 'https://www.iros.go.kr/' },
  /* 집예보가 먼저 챙겨 드려요(PROACTIVE, 2026-11-26 직접 열어 확인) */
  own1: { nm: '법제처 법령해석례 23-0932 — 소득세법 시행령 제154조 제1항(보유 2년·조정대상지역 거주 2년)·제155조 제1항(일시적 2주택) 원문 인용(국가법령정보센터)', url: 'https://www.law.go.kr/LSW/expcInfoP.do?expcSeq=338247' },
  tmp26: { nm: '소득세법 시행령 일부개정령(대통령령 제36737호, 2026.9.30 공포·10.1 시행) 제155조 제1항·부칙 제2조(국가법령정보센터)', url: 'https://www.law.go.kr/LSW/lsRvsDocInfoR.do?lsiSeq=290841' }
};
/* ok:false = 공식 원문을 확인하지 못함 → 계산·표시하지 않음 */
const CAL_RULES = {
  base: { ok: true, src: ['prop', 'comp'] }, prop1: { ok: true, src: ['prop'] }, prop2: { ok: true, src: ['prop'] },
  compN: { ok: true, src: ['comp'] }, compP: { ok: true, src: ['comp'] }, acq: { ok: true, src: ['acq'] }, cgt: { ok: true, src: ['cgt'] },
  renewO: { ok: true, src: ['renew', 'renew2'] }, renewC: { ok: true, src: ['renew', 'renew2'] }, end: { ok: true, src: ['renew'] },
  move: { ok: true, src: ['move'] }, rent: { ok: true, src: ['rent'] }, cy: { ok: true, src: ['cy'] }, ta: { ok: true, src: ['renew', 'rentdata'] },
  tchk: { ok: true, src: ['move', 'iros'] }, tins: { ok: true, src: ['hug'] },
  /* pro:1 = '집예보가 먼저 챙겨 드려요' 기능(PROACTIVE_ENABLED) 켜졌을 때만 계산·표시 */
  hold2: { ok: true, src: ['own1'], pro: 1 }, live2: { ok: true, src: ['own1'], pro: 1 },
  tmp2: { ok: true, src: ['own1', 'tmp26'], pro: 1 }
};
/* 기한이 길어 미리 알아야 하는 것(일시적 2주택 처분)은 180일·90일 전부터 알림 */
const CAL_LONG = { tmp2: 1 };
const CAL_STAGES = ['d180', 'd90', 'd30', 'd7', 'd1'];
const CAL_AHEAD = 400, CAL_PAST = 0, CAL_MAX = 60;
const calOkDate = v => /^(19[9]\d|20\d\d|2100)-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(String(v || '')) && calIso(calT(String(v))) === String(v);
function calT(iso) { return Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)); }
function calIso(t) { const d = new Date(t); return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`; }
function calAdd(iso, n) { return calIso(calT(iso) + n * 864e5); }
function calDiff(a, b) { return Math.round((calT(b) - calT(a)) / 864e5); }
/** 달 더하기(같은 날, 그 달에 그날이 없으면 말일) */
function calAddM(iso, n) {
  let y = +iso.slice(0, 4), m = +iso.slice(5, 7) - 1 + n; y += Math.floor(m / 12); m = ((m % 12) + 12) % 12;
  const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate(), d = Math.min(+iso.slice(8, 10), last);
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}
function calMonthEnd(iso) { const y = +iso.slice(0, 4), m = +iso.slice(5, 7); return calIso(Date.UTC(y, m, 0)); }
function calKo(iso) { return iso ? `${+iso.slice(5, 7)}월 ${+iso.slice(8, 10)}일` : ''; }
function calKoY(iso) { return iso ? `${+iso.slice(0, 4)}년 ${calKo(iso)}` : ''; }
function calDow(iso) { return '일월화수목금토'[new Date(calT(iso)).getUTCDay()]; }

/** 사용자가 넣은 값 정리(서버·화면 같은 규칙). 금액 칸은 받지 않는다 */
function calClean(x) {
  x = x && typeof x === 'object' ? x : {};
  const t = CAL_TEN[x.t] ? x.t : '', d = v => calOkDate(v) ? String(v) : '';
  const o = { t: t };
  if (t === 'own') { o.acq = d(x.acq); o.sell = d(x.sell);
    /* PROACTIVE: 전입일(거주 시작) · 취득 당시 조정대상지역(y/n/'' 모름) · 일시적 2주택(새 집 잔금일, 새 집 잔금일에 이 집·새 집이 조정대상지역인지, 2026.8.3 전에 새 집 계약금을 냈는지) — 금액 없음 */
    const yn = v => v === 'y' || v === 'n' ? v : '';
    if (d(x.rs)) o.rs = d(x.rs); if (yn(x.adj)) o.adj = yn(x.adj);
    const t2 = x.t2 && typeof x.t2 === 'object' ? x.t2 : null;
    if (t2 && d(t2.d)) o.t2 = { d: d(t2.d), oa: yn(t2.oa), na: yn(t2.na), pre: t2.pre === true }; }
  if (t === 'jeonse' || t === 'wolse') { o.cs = d(x.cs); o.ce = d(x.ce); if (o.cs && o.ce && o.ce <= o.cs) o.ce = ''; if (x.ta && typeof x.ta === 'object') o.ta = calCleanTa(x.ta); }
  return o;
}
/* 전세·월세 만기 알림(세입자용) 설정 — 서버에는 이 칸만 저장한다: 켜기, 희망 지역(최대 3곳: 시·군·구 코드 + 동, 동 '' = 시·군·구 전체), 출퇴근지(동),
   집 형태(a 아파트·v 빌라·o 오피스텔), 평형, '매수도 생각해요'·'보증금 낮추고 싶어요'. 보증금·보유 현금·연소득은 받지 않는다(그 기기에만). */
const CAL_TA_TY = { a: '아파트', v: '빌라', o: '오피스텔' };
function calCleanTa(x) {
  x = x && typeof x === 'object' ? x : {};
  const pl = v => v && typeof v === 'object' && /^\d{5}$/.test(String(v.g || '')) ? { g: String(v.g), d: /^[0-9가-힣.·]{0,20}$/.test(String(v.d || '')) ? String(v.d || '') : '' } : null;
  const seen = {}, areas = (Array.isArray(x.areas) ? x.areas : []).map(pl).filter(a => a && !seen[a.g + a.d] && (seen[a.g + a.d] = 1)).slice(0, 3);
  return { on: x.on === true, areas: areas, work: pl(x.work), ty: CAL_TA_TY[x.ty] ? x.ty : '', band: /^[0-9가-힣㎡ ~.]{2,12}$/.test(String(x.band || '')) ? String(x.band) : '',
    buy: x.buy === true, down: x.down === true };
}
/** 회원 저장 자료의 달력 칸: { h: {집키: calClean}, n: 우리 세대 보유 주택 수 1·2·3(3채 이상)|null, t: 마지막 저장 날짜, ms: 마지막 수정 시각(기기끼리 맞출 때) } */
const CAL_KEY = /^\d{5}\|[^|<>\u0000-\u001F]{1,30}\|[^|<>\u0000-\u001F]{0,30}\|[^|<>\u0000-\u001F]{1,60}\|[^|<>\u0000-\u001F]{1,20}$/;
function calCleanAll(x) {
  x = x && typeof x === 'object' ? x : {};
  const h = {}, src = x.h && typeof x.h === 'object' ? x.h : {};
  Object.keys(src).filter(k => CAL_KEY.test(k)).slice(0, 10).forEach(k => { const c = calClean(src[k]); if (c.t) h[k] = c; });
  const n = Math.round(Number(x.n)), ms = Math.round(Number(x.ms));
  return { h: h, n: n >= 1 && n <= 3 ? n : null, t: calOkDate(x.t) ? String(x.t) : '', ms: isFinite(ms) && ms > 0 ? ms : 0 };
}

function calEv(k, d, o) { return Object.assign({ id: `${k}|${o.home || ''}|${d}`, k: k, d: d, home: '', name: '', end: '', src: CAL_RULES[k].src }, o); }
/** 한 해 정기 일정(자가가 하나라도 있을 때). y = 연도 */
function calYear(y, owns) {
  const nm = owns.map(h => h.name).filter(Boolean).slice(0, 3).join(', '), out = [];
  const near = owns.filter(h => [h.cal.acq, h.cal.sell].some(v => v && Math.abs(calDiff(`${y}-06-01`, v)) <= 45));
  out.push(calEv('base', `${y}-06-01`, { t: '재산세·종부세 과세기준일',
    s: '이날 집을 가진 사람이 그해 재산세와 종합부동산세를 내요. 사고팔 때 소유는 보통 잔금을 치른 날부터 따져서, 잔금일이 6월 1일이거나 그 전이면 산 사람이, 6월 2일부터면 판 사람이 그해 세금을 내요(잔금 전에 등기를 먼저 하면 등기일).',
    p: near.length ? `등록하신 ${near.map(h => `${h.name}(${h.cal.sell && Math.abs(calDiff(`${y}-06-01`, h.cal.sell)) <= 45 ? '파는 잔금 ' + calKo(h.cal.sell) : '잔금 ' + calKo(h.cal.acq)})`).join(', ')} — 잔금일이 6월 1일 앞뒤예요. 그해 세금을 누가 낼지 한 번 더 살펴보세요.` : '' }));
  out.push(calEv('prop1', `${y}-07-31`, { start: `${y}-07-16`, t: '재산세 1기분 납부(주택 절반)', s: `7월 16일부터 31일까지 주택 재산세의 절반을 내요. 한 해 세액이 20만 원 이하면 지자체 조례에 따라 7월에 한꺼번에 낼 수 있어요.${nm ? ' 대상: ' + nm : ''}` }));
  out.push(calEv('prop2', `${y}-09-30`, { start: `${y}-09-16`, t: '재산세 2기분 납부(주택 나머지 절반·토지)', s: `9월 16일부터 30일까지 주택 재산세 나머지 절반과 토지분 재산세를 내요.${nm ? ' 대상: ' + nm : ''}` }));
  out.push(calEv('compN', `${y}-11-26`, { t: '종합부동산세 고지서가 오는 때', s: '종부세는 공시가격 합계가 공제 금액을 넘는 분만 내요. 세무서는 납부 시작 5일 전(11월 26일)까지 고지서를 보내요.' }));
  out.push(calEv('compP', `${y}-12-15`, { start: `${y}-12-01`, t: '종합부동산세 납부', s: '12월 1일부터 15일까지 고지된 종부세를 내요. 고지 대신 직접 신고해서 낼 수도 있고, 기간은 같아요.' }));
  return out;
}
/** 한 집의 일정. h = { key, name, cal } */
function calHome(h) {
  const c = h.cal, out = [], o = () => ({ home: h.key, name: h.name });
  if (c.t === 'own') {
    if (c.acq) { const dl = calAdd(c.acq, 60);
      out.push(calEv('acq', dl, Object.assign(o(), { start: c.acq, t: '취득세 신고·납부 기한', s: `취득일(잔금일 ${calKoY(c.acq)})부터 60일 안에 취득세를 신고하고 내요. 잔금 전에 등기를 먼저 했다면 등기일부터 세요. 상속은 기한이 달라요(상속 개시일이 속한 달 말일부터 6개월).` }))); }
    if (c.acq && h.n !== 3) {                 // 1세대 1주택 비과세 보유 2년(3채 이상이면 뺌)
      const h2 = calAddM(c.acq, 24), law = c.acq >= '2017-08-03';
      const pn = c.adj === 'y' && law ? `취득 당시 조정대상지역이라 2년 이상 살기도 해야 해요.${c.rs ? '' : ' 내 집 정보에 전입한 날을 넣으면 거주 2년이 차는 날도 알려 드려요.'}`
        : c.adj === 'n' || !law ? '취득 당시 조정대상지역이 아니어서 살아야 하는 기간(거주 요건)은 없어요.' : '취득 당시 조정대상지역이었다면 2년 이상 살기도 해야 해요. 내 집 정보에서 골라 주시면 정확해져요.';
      out.push(calEv('hold2', h2, Object.assign(o(), { t: '1세대 1주택 비과세 — 보유 2년이 차는 날', s: `취득일(잔금일 ${calKoY(c.acq)})부터 2년이 ${calKoY(h2)}에 차요. 1세대 1주택은 2년 이상 가진 뒤 팔아야 양도소득세 비과세를 받을 수 있어요(파는 값 12억 원을 넘는 부분은 과세). 하루 차이로 결과가 갈릴 수 있으니 파는 잔금일은 여유 있게 잡고, 계약 전에 세무서나 세무사에게 한 번 더 확인해 두세요.`, p: pn })));
      if (c.rs && c.adj !== 'n' && law) {
        const st = c.rs > c.acq ? c.rs : c.acq, l2 = calAddM(st, 24);
        out.push(calEv('live2', l2, Object.assign(o(), { start: st, t: '1세대 1주택 비과세 — 거주 2년이 차는 날', s: `${calKoY(st)}부터 살기 시작했다면 거주 2년은 ${calKoY(l2)}에 차요. 취득 당시 조정대상지역인 집은 가지고 있는 동안 2년 이상 살아야 비과세를 받아요. 거주 기간은 보통 전입신고한 날부터 세고, 중간에 나갔다 들어왔다면 기간을 합쳐 다시 확인해 주세요.`, p: c.adj === 'y' ? '' : '취득 당시 조정대상지역이 아니었다면 이 날짜는 필요 없어요.' })));
      }
    }
    if (c.acq && c.t2 && c.t2.d) {            // 일시적 2주택: 새 집 잔금일부터 2년(조정→조정, 2026.8.4 이후 취득) 또는 3년 안에 이 집을 팖
      const T = c.t2, after = T.d >= '2026-08-04' && !T.pre, short = after && T.oa === 'y' && T.na === 'y', unk = after && !short && T.oa !== 'n' && T.na !== 'n';
      const yrs = short || unk ? 2 : 3, dl = calAddM(T.d, yrs * 12), b1 = T.d < calAddM(c.acq, 12);
      out.push(calEv('tmp2', dl, Object.assign(o(), { start: T.d, t: '일시적 2주택 — 이 집을 팔아야 하는 기한', s: `새 집 잔금일(${calKoY(T.d)})부터 ${yrs}년 안, ${calKoY(dl)}까지 이 집(먼저 가진 집)을 팔아야 1세대 1주택처럼 비과세를 받을 수 있어요. ${short ? '새 집 잔금일에 두 집이 모두 조정대상지역이라, 2026년 10월 1일부터 바뀐 규정에 따라 2년이에요.' : unk ? '새 집 잔금일에 두 집이 모두 조정대상지역이면 2년, 아니면 3년이에요. 아직 고르지 않으셔서 더 이른 2년 기준으로 알려 드려요.' : !after ? '2026년 8월 3일 전에 새 집을 샀거나 계약금을 내서, 예전 규정대로 3년이에요.' : '새 집 잔금일에 두 집이 모두 조정대상지역인 경우가 아니어서 3년이에요.'} 이 집의 보유 2년(조정대상지역에서 산 집이면 거주 2년)도 함께 채워야 해요.`,
        p: b1 ? '이 집을 산 날부터 1년이 지나기 전에 새 집을 사면 이 특례를 받을 수 없어요. 세무사에게 꼭 확인해 주세요.' : '' })));
    }
    if (c.sell) { const dl = calMonthEnd(calAddM(calMonthEnd(c.sell).slice(0, 8) + '01', 2));
      out.push(calEv('cgt', dl, Object.assign(o(), { start: c.sell, t: '양도소득세 예정신고 기한', s: `파는 집 잔금일(${calKoY(c.sell)})이 속한 달의 말일부터 2개월 안에 예정신고를 해요. 비과세라도 신고가 필요한지 세무서나 세무사에게 확인해 두세요.` }))); }
  }
  if (c.t === 'jeonse' || c.t === 'wolse') {
    if (c.ce) {
      const a = calAddM(c.ce, -6), b = calAddM(c.ce, -2);
      out.push(calEv('renewO', a, Object.assign(o(), { end: b, t: '계약갱신요구권을 쓸 수 있는 기간 시작', s: `만기 6개월 전(${calKoY(a)})부터 2개월 전(${calKoY(b)})까지 집주인에게 계약을 한 번 더 이어 가고 싶다고 알리면 2년 더 살 수 있어요. 한 번만 쓸 수 있고, 2020년 12월 10일 이후 맺거나 갱신한 계약 기준이에요.` })));
      out.push(calEv('renewC', b, Object.assign(o(), { start: a, t: '계약갱신요구권 요청 마감', s: `만기 2개월 전인 ${calKoY(b)}까지 알려야 해요. 문자·내용증명처럼 날짜가 남는 방법이 안전해요. 이사할 계획이면 집주인과 날짜를 미리 맞춰 두세요.` })));
      out.push(calEv('end', c.ce, Object.assign(o(), { t: `${CAL_TEN[c.t]} 계약 만기`, s: '이 날 계약이 끝나요. 갱신이나 이사 일정이 정해졌는지 다시 확인해 보세요.' })));
    }
    if (c.ce && c.ta && c.ta.on) [6, 4, 2].forEach(m => {
      out.push(calEv('ta', calAddM(c.ce, -m), Object.assign(o(), { id: `ta|${h.key}|${m}`, sub: 'ta', m: m, end: calAdd(calAddM(c.ce, -m), 14), t: `만기 ${m}개월 전 — 이사·갱신 준비 알림`,
        s: `만기(${calKoY(c.ce)})까지 ${m}개월 남았어요. 희망 지역에서 전세 보증금이 내린 곳, 내 단지 전세 시세, ${m >= 4 ? '계약갱신요구권 기간(만기 6개월 전~2개월 전)' : '갱신 요구 마감(만기 2개월 전)'}을 모아 드려요.` })));
    });
    if (c.cs) {
      out.push(calEv('move', c.cs, Object.assign(o(), { t: '이사하는 날 — 전입신고·확정일자', s: '이사한 날 바로 전입신고를 하고 계약서에 확정일자를 받아 두세요. 집에 들어가 전입신고까지 마친 다음 날부터 대항력(새 집주인·은행에도 내 권리를 주장할 힘)이 생겨요.' })));
      out.push(calEv('rent', c.cs, Object.assign(o(), { end: calAdd(c.cs, 30), t: '전월세 계약 신고(계약일부터 30일 안)', s: '보증금 6,000만 원 초과 또는 월세 30만 원 초과 계약은 계약한 날부터 30일 안에 신고해야 해요. 신고하면 확정일자가 저절로 붙고, 전입신고 때 계약서를 함께 내면 신고한 것으로 봐요.' })));
      /* 살면서 할 일(집예보 알림 시점 — 법정 기한 아님): 이사 7일 뒤 전입·확정일자·등기 확인 */
      out.push(calEv('tchk', calAdd(c.cs, 7), Object.assign(o(), { t: '전입·확정일자가 잘 됐는지 확인 + 등기 한 번 더', s: '주민등록 등본(정부24)에 이 집 주소로 전입이 됐는지, 계약서에 확정일자가 찍혔는지 확인해요. 이사한 사이 근저당·압류가 새로 생기지 않았는지 등기부도 한 번 더 보고, 인터넷등기소 등기 변동 알림(무료)을 신청해 두면 살면서 생기는 변동을 문자로 받을 수 있어요.' })));
    }
    if (c.ce) out.push(calEv('tins', calAddM(c.ce, -3), Object.assign(o(), { t: '보증보험(전세보증금 반환보증) 기간·갱신 확인', s: '보증보험에 들었다면 보증 기간이 언제 끝나는지 확인하고, 계약을 이어 가면 보증도 새로 들거나 기간을 늘려야 하는지 HUG 등 보증 기관 안내에서 확인해요. 신청 기한·조건은 기관마다 달라 이 알림은 미리 챙기라는 뜻이에요.' })));
  }
  return out;
}
/** 청약 공고 일정(사용자 지역). notices = chungyak/notices.json rows, areas = [{sd, gn}] */
function calCy(notices, areas, today) {
  const out = [], seen = {}, i8 = s => /^\d{8}$/.test(String(s || '')) ? `${String(s).slice(0, 4)}-${String(s).slice(4, 6)}-${String(s).slice(6, 8)}` : '';
  (notices || []).forEach(n => {
    if (!n || !n.no || seen[n.no]) return;
    const a = (areas || []).find(r => r && r.sd === n.sd && (!r.gn || r.gn === n.g)); if (!a) return;
    seen[n.no] = 1;
    const nm = String(n.n || '청약 공고').slice(0, 60), where = [n.sd, n.g].filter(Boolean).join(' '), pb = i8(n.pb), r1 = i8((n.r1 || [])[0]), r1e = i8((n.r1 || [])[1]), pw = i8(n.pw);
    const base = { home: '', name: nm, u: /^https:\/\/www\.applyhome\.co\.kr\//.test(String(n.u || '')) ? String(n.u) : '', no: String(n.no) };
    if (pb && calDiff(pb, today) <= 7) out.push(calEv('cy', pb, Object.assign({}, base, { id: `cy|${n.no}|pb`, sub: 'new', end: calAdd(pb, 7), t: `새 청약 공고 — ${nm}`, s: `${where}에 새 공고가 나왔어요${n.hh ? `(공급 ${Number(n.hh).toLocaleString('en-US')}세대)` : ''}. 내 지역이라 알려 드려요.` })));
    if (r1) out.push(calEv('cy', r1, Object.assign({}, base, { id: `cy|${n.no}|r1`, sub: 'r1', end: r1e && r1e !== r1 ? r1e : '', t: `1순위 청약 접수 — ${nm}`, s: `${where} · ${calKo(r1)}${r1e && r1e !== r1 ? `~${calKo(r1e)}` : ''} 1순위 접수예요. 청약홈에서 신청해요.` })));
    if (pw) out.push(calEv('cy', pw, Object.assign({}, base, { id: `cy|${n.no}|pw`, sub: 'pw', t: `당첨자 발표 — ${nm}`, s: `${where} · ${calKo(pw)}에 당첨자를 발표해요.` })));
  });
  return out;
}
/** 전체 일정: homes = [{key, name, cal}], today 'YYYY-MM-DD', opt = { ahead 일, notices, areas } → 날짜 순 [{id, k, d, start?, end?, t, s, p?, home, name, src, dd}] */
function calEvents(homes, today, opt) {
  opt = opt || {};
  const ahead = opt.ahead || CAL_AHEAD, lo = calAdd(today, -(opt.past || CAL_PAST)), hi = calAdd(today, ahead);
  const hs = (homes || []).map(h => h && h.key ? { key: h.key, name: String(h.name || ''), cal: calClean(h.cal), n: opt.n || null } : null).filter(h => h && h.cal.t);
  let ev = [];
  const owns = hs.filter(h => h.cal.t === 'own');
  const y = +today.slice(0, 4);
  if (owns.length) for (let yy = y; yy <= y + 1; yy++) ev = ev.concat(calYear(yy, owns));
  hs.forEach(h => { ev = ev.concat(calHome(h)); });
  if (opt.notices && opt.areas) ev = ev.concat(calCy(opt.notices, opt.areas, today));
  ev = ev.filter(e => CAL_RULES[e.k] && CAL_RULES[e.k].ok && (!CAL_RULES[e.k].pro || opt.pro === true) && (e.end > e.d ? e.end : e.d) >= lo && (e.start || e.d) <= hi);
  ev.forEach(e => { e.dd = calDiff(today, e.d); });
  ev.sort((a, b) => a.d < b.d ? -1 : a.d > b.d ? 1 : a.id < b.id ? -1 : 1);
  return ev.slice(0, CAL_MAX);
}
/** 메일로 알릴 단계: daily(모닝 브리핑에 함께) = 30일·7일·1일 전, weekly(따로 보내는 주 1회) = 5주·1주 안. 새 청약 공고는 나온 뒤 7일 안 한 번. 이미 보낸 단계(sent[id|단계])는 뺌.
    long(CAL_LONG — 일시적 2주택 처분 기한)은 180일·90일 전 단계가 더 있음. 늦은 단계를 이미 보냈으면 그보다 이른 단계는 보내지 않음 */
function calStage(dd, mode, long) {
  if (dd < 0) return '';
  if (mode === 'weekly') return dd <= 8 ? 'd7' : dd <= 37 ? 'd30' : long && dd <= 97 ? 'd90' : long && dd <= 187 ? 'd180' : '';
  return dd <= 1 ? 'd1' : dd <= 7 ? 'd7' : dd <= 30 ? 'd30' : long && dd <= 90 ? 'd90' : long && dd <= 180 ? 'd180' : '';
}
function calDue(ev, mode, sent) {
  sent = sent || {};
  const later = (id, st) => { const i = CAL_STAGES.indexOf(st); return i >= 0 && CAL_STAGES.slice(i).some(x => sent[id + '|' + x]); };
  return (ev || []).map(e => Object.assign({}, e, { stage: e.sub === 'new' ? (e.dd <= 0 && e.dd >= -7 ? 'd1' : '') : e.sub === 'ta' ? (e.dd <= 0 && e.dd >= -14 ? 'ta' : '') : calStage(e.dd, mode, !!CAL_LONG[e.k]) })).filter(e => e.stage && !sent[e.id + '|' + e.stage] && !later(e.id, e.stage));
}
function calEsc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function calWhen(e) {
  const d = e.dd === 0 ? '오늘' : e.dd === 1 ? '내일' : `${e.dd}일 뒤`;
  return `${calKo(e.d)}(${calDow(e.d)}) · ${d}`;
}
/* 메일 칸: items = calDue 결과, o = { site, web(끝 /), off(달력 메일만 끄기 링크), merged(모닝 브리핑·알림 메일 안에 넣을 때), sender, date }
   → { subject, html, text }. 광고 없음. 금액·개인 입력값(날짜 말고)은 싣지 않는다 */
function calMailHtml(items, o) {
  o = o || {};
  const site = o.site || '집예보', web = o.web || '', text = [];
  const li = items.map(e => { text.push(`${calKo(e.d)} ${e.t}${e.name ? ' (' + e.name + ')' : ''}`);
    return `<li style="margin:0 0 9px;line-height:1.55"><span style="display:inline-block;font-size:11.5px;font-weight:800;color:#8A6A12;background:#FBF3DC;border-radius:6px;padding:1px 6px;margin-right:4px">${calEsc(calWhen(e))}</span><b style="color:#191F28">${calEsc(e.t)}</b>${e.name ? ` <span style="font-size:12.5px;color:#4E5968">${calEsc(e.name)}</span>` : ''}<br><span style="font-size:13.5px;color:#4E5968">${calEsc(e.s)}</span>${e.p ? `<br><span style="font-size:13.5px;color:#8A6A12">${calEsc(e.p)}</span>` : ''}</li>`; }).join('');
  const links = `${web ? `<a href="${calEsc(web)}mine/calendar/" style="color:#2F6BFF">내 부동산 달력 전체 보기</a>` : ''}${o.off ? ` · <a href="${calEsc(o.off)}" style="color:#4E5968">달력 알림만 끄기(한 번 누르면 끝)</a>` : ''}`;
  const body = `<div style="font-size:17px;font-weight:900;margin:0 0 4px">내 부동산 달력 <span style="font-size:13px;font-weight:700;color:#B8942A">다가오는 날짜 ${items.length}개</span></div>
    <p style="margin:0 0 10px;font-size:13.5px;color:#4E5968;line-height:1.55">등록하신 집과 지역 기준으로 놓치기 쉬운 세금·계약 날짜를 모았어요. 날짜 규칙은 공식 안내를 확인한 것만 넣었고, 주말·공휴일이면 기한이 다음 평일로 미뤄질 수 있어요.</p>
    <ul style="list-style:none;margin:0 0 6px;padding:0">${li}</ul>${o.extra || ''}<p style="font-size:12.5px;color:#4E5968;margin:4px 0 0">${links}</p>`;
  const subject = `[${site}] ${o.date ? calKo(o.date) + ' ' : ''}내 부동산 달력 — ${items[0] ? items[0].t : ''}${items.length > 1 ? ` 외 ${items.length - 1}개` : ''}`.slice(0, 120);
  const html = o.merged ? `<div style="border:2px solid #B8942A;border-radius:12px;padding:14px 16px;margin:0 0 14px">${body}</div>`
    : `<div style="font-family:'Noto Sans KR',sans-serif;max-width:600px;margin:auto;color:#191F28"><div style="font-weight:900;font-size:19px;margin:6px 0 12px">${calEsc(site)} <span style="color:#B8942A">달력 알림</span></div>${body}
      <p style="font-size:12px;color:#4E5968;line-height:1.65;margin:12px 0 0;border-top:1px solid #E5E8EB;padding-top:10px">이 메일은 ${calEsc(site)} 알림 센터에서 '내 부동산 달력 메일'을 켜신 분께 일주일에 한 번까지 보내는 정보 메일이에요. 광고가 아니에요.<br>
      ${o.off ? `<a href="${calEsc(o.off)}" style="color:#4E5968">달력 알림만 끄기</a> · ` : ''}${web ? `<a href="${calEsc(web)}my/alerts/" style="color:#4E5968">알림 설정 바꾸기</a>` : ''}<br>보낸 사람: ${calEsc(site)}${o.sender ? `(${calEsc(o.sender.name)}) · 전화 ${calEsc(o.sender.tel)} · 답장은 ${calEsc(o.sender.email)}로 가요` : ''}</p></div>`;
  return { subject: subject, html: html, text: text.join('\n') };
}
/* ---------- 세입자 만기 알림 계산(공개 전월세 실거래 rent/{구}.json · rent/v · rent/o) ----------
   행 u = [동, 표시명, 평형, 지번, 전용, 3년 전세 수, 3년 월세 수, J, WD, WR, 계약 목록[[계약일, 전용, 층, 보증금, 월세, 0 신규·1 갱신·2 미기재, …]], 덧붙임]
   보증금 중간값은 '순수 전세'(월세 0) · 신규 계약(갱신 계약은 5% 상한이 있어 시세와 달라 뺌)만 센다. 최근 6개월 vs 그 전 6개월(7~12개월 전). */
const CAL_TA_MIN = 3;                         // 두 기간 모두 이 건수 이상일 때만 변화율을 낸다
function calMed(a) { const v = a.slice().sort((x, y) => x - y), n = v.length; return n ? (n % 2 ? v[(n - 1) / 2] : Math.round((v[n / 2 - 1] + v[n / 2]) / 2)) : 0; }
function calI8(iso) { return +String(iso).replace(/-/g, ''); }
function calTaPairs(u, today) {
  const t = calI8(today), a6 = calI8(calAddM(today, -6)), a12 = calI8(calAddM(today, -12)), r = [], p = [];
  (Array.isArray(u[10]) ? u[10] : []).forEach(c => { if (!Array.isArray(c) || !(c[3] > 0) || c[4] || c[5] === 1) return; if (c[0] > a6 && c[0] <= t) r.push(c[3]); else if (c[0] > a12 && c[0] <= a6) p.push(c[3]); });
  return { r: r, p: p };
}
function calTaStat(r, p) {
  const o = { nr: r.length, np: p.length, mr: calMed(r), mp: calMed(p), chg: null };
  if (o.nr >= CAL_TA_MIN && o.np >= CAL_TA_MIN && o.mp > 0) o.chg = Math.round((o.mr / o.mp - 1) * 1000) / 10;
  return o;
}
/** files = {구코드: rent 파일}, areas = [{g, d}], band = 평형('' = 모든 평형), deposit = 내 보증금(만원, 기기에만 — 없으면 0)
    → { dongs: [{g, d, …stat}] 내린 동(내림차순), apts: [{g, d, a, b, …stat}] 내린 단지, fit: 내 보증금 이하로 최근 6개월 계약된 단지 수, fitList } */
function calTaScan(files, areas, band, today, deposit) {
  const dongs = {}, apts = [], fit = [];
  (areas || []).forEach(ar => {
    const R = (files || {})[ar.g]; if (!R || !Array.isArray(R.units)) return;
    R.units.forEach(u => {
      if (ar.d && u[0] !== ar.d) return;
      if (band && u[2] !== band) return;
      const P = calTaPairs(u, today), k = ar.g + '|' + u[0];
      const D = dongs[k] = dongs[k] || { g: ar.g, d: u[0], r: [], p: [] }; D.r = D.r.concat(P.r); D.p = D.p.concat(P.p);
      const st = calTaStat(P.r, P.p);
      if (st.chg != null && st.chg < 0) apts.push(Object.assign({ g: ar.g, d: u[0], a: u[1], b: u[2], j: u[3] }, st));
      if (deposit > 0 && P.r.length && st.mr <= deposit) fit.push({ g: ar.g, d: u[0], a: u[1], b: u[2], mr: st.mr, nr: st.nr });
    });
  });
  const dl = Object.keys(dongs).map(k => { const D = dongs[k]; return Object.assign({ g: D.g, d: D.d }, calTaStat(D.r, D.p)); }).filter(x => x.chg != null && x.chg < 0).sort((a, b) => a.chg - b.chg);
  apts.sort((a, b) => a.chg - b.chg);
  fit.sort((a, b) => b.nr - a.nr || a.mr - b.mr);
  return { dongs: dl, apts: apts, fit: fit.length, fitList: fit.slice(0, 10) };
}
/** 내 단지(같은 동·단지 이름·평형)의 최근 6개월 vs 그 전 6개월 순수 전세 신규 계약 중간값. 없으면 null */
function calTaOwn(R, home, today) {
  if (!R || !Array.isArray(R.units) || !home) return null;
  const u = R.units.find(x => x[0] === home.dong && x[1] === home.apt && x[2] === home.band) || R.units.find(x => x[0] === home.dong && String(x[3]) === String(home.jibun || '') && x[2] === home.band);
  if (!u) return null;
  const P = calTaPairs(u, today); return Object.assign({ a: u[1], b: u[2] }, calTaStat(P.r, P.p));
}
function calWon(m) { m = Math.round(Number(m) || 0); const e = Math.floor(m / 10000), r = m % 10000; return e && r ? `${e}억 ${r.toLocaleString('en-US')}만 원` : e ? `${e}억 원` : `${r.toLocaleString('en-US')}만 원`; }
/** 메일 칸(세입자 만기 알림): name = 집 이름, scan = calTaScan(보증금 없이), own = calTaOwn, gname(코드) → 구 이름 */
function calTaMailHtml(name, scan, own, o) {
  o = o || {}; const gn = o.gname || (() => ''), web = o.web || '';
  const pct = v => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(1) + '%';
  const dl = (scan.dongs || []).slice(0, 4).map(x => `${gn(x.g)} ${x.d} ${pct(x.chg)}(최근 6개월 ${x.nr}건 ${calWon(x.mr)} · 그 전 ${x.np}건 ${calWon(x.mp)})`);
  const al = (scan.apts || []).slice(0, 5).map(x => `${x.d} ${x.a} ${x.b} ${pct(x.chg)}(${x.nr}건·${x.np}건)`);
  const ow = own && own.chg != null ? `${own.a} ${own.b} 순수 전세 신규 계약 중간값: 최근 6개월 ${calWon(own.mr)}(${own.nr}건) · 그 전 6개월 ${calWon(own.mp)}(${own.np}건), ${pct(own.chg)}.` : '';
  return `<div style="background:#FBF8EF;border:1px solid #EFE6CC;border-radius:10px;padding:10px 12px;margin:6px 0 8px;font-size:13.5px;line-height:1.6;color:#3E4754">
    <b style="color:#191F28">${calEsc(name)} 만기 준비</b><br>
    ${dl.length ? `<b>희망 지역에서 전세 보증금이 내린 동</b><br>${dl.map(calEsc).join('<br>')}<br>` : '희망 지역에서 최근 6개월 전세 보증금이 뚜렷하게 내린 동은 없어요.<br>'}
    ${al.length ? `<b>내린 단지</b><br>${al.map(calEsc).join('<br>')}<br>` : ''}
    ${ow ? `<b>내 단지 전세 시세</b><br>${calEsc(ow)} 지금 시세가 내 보증금보다 낮다면 계약갱신요구권을 쓰면서 보증금 감액을 집주인과 협의해 볼 수 있어요(정보 안내예요).<br>` : ''}
    <span style="font-size:12.5px;color:#4E5968">국토교통부 전월세 실거래 중 월세 없는 신규 전세 계약의 중간값(갱신 계약 제외). 내 보증금으로 갈 수 있는 단지 수와 매수 비교는 보증금·현금을 그 기기에만 저장하는 달력 화면에서 볼 수 있어요.</span>
    ${web ? `<br><a href="${calEsc(web)}mine/calendar/#ta" style="color:#2F6BFF">만기 준비 자세히 보기</a> · <a href="${calEsc(CAL_SRC.renew.url)}" style="color:#2F6BFF">계약갱신요구권 법 조문</a> · <a href="${calEsc(web)}jeonse/" style="color:#2F6BFF">전세 안전 점검</a>` : ''}</div>`;
}
/* CAL-CORE END */

const API = { V: CAL_V, TEN: CAL_TEN, SRC: CAL_SRC, RULES: CAL_RULES, AHEAD: CAL_AHEAD, okDate: calOkDate, add: calAdd, addM: calAddM, diff: calDiff, monthEnd: calMonthEnd, ko: calKo, koY: calKoY, dow: calDow,
  STAGES: CAL_STAGES, LONG: CAL_LONG, clean: calClean, cleanAll: calCleanAll, cleanTa: calCleanTa, TA_TY: CAL_TA_TY, taScan: calTaScan, taOwn: calTaOwn, taMailHtml: calTaMailHtml, won: calWon, med: calMed, KEY: CAL_KEY, year: calYear, home: calHome, cy: calCy, events: calEvents, stage: calStage, due: calDue, when: calWhen, mailHtml: calMailHtml, esc: calEsc };
root.JDJ_CAL_CORE = API;
if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
