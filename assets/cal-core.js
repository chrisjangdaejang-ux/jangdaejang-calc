/* 내 부동산 달력 계산 — 화면 없음. 달력 화면(mine/calendar/)·서버 달력 알림 메일(tools/agent-backend.gs v54)이 함께 쓴다.
   - 아래 'CAL-CORE' 블록은 tools/agent-backend.gs 에 글자 그대로 복사돼 있다(서버는 다른 파일을 불러올 수 없어서). tools/cal-test.js 가 두 곳이 같은지 확인한다.
   - 날짜 규칙은 공식 출처(CAL_SRC)를 직접 열어 확인한 것만 보여 준다(CAL_RULES ok:true). 확인하지 못한 규칙(ok:false)은 계산도 표시도 하지 않는다.
   - 사용자가 넣는 것: 자가·전세·월세, 취득일(잔금일)·파는 집 잔금일(선택), 전월세 계약 시작·만기일, 보유 주택 수. 금액은 받지 않는다.
   - 날짜는 'YYYY-MM-DD' 글자로만 계산한다(시간대 영향 없음). 주말·공휴일로 기한이 미뤄지는 경우는 계산하지 않고 안내만 한다.
   window.JDJ_CAL_CORE */
(function (root) {
'use strict';
/* CAL-CORE BEGIN — 이 블록은 tools/agent-backend.gs 에 그대로 복사돼 있어요. 고칠 때는 두 곳을 똑같이 고쳐 주세요(node tools/cal-test.js 가 비교). */
const CAL_V = 'cal-2026-11-25';
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
  cy: { nm: '한국부동산원 청약홈 분양 공고', url: 'https://www.applyhome.co.kr/' }
};
/* ok:false = 공식 원문을 확인하지 못함 → 계산·표시하지 않음 */
const CAL_RULES = {
  base: { ok: true, src: ['prop', 'comp'] }, prop1: { ok: true, src: ['prop'] }, prop2: { ok: true, src: ['prop'] },
  compN: { ok: true, src: ['comp'] }, compP: { ok: true, src: ['comp'] }, acq: { ok: true, src: ['acq'] }, cgt: { ok: true, src: ['cgt'] },
  renewO: { ok: true, src: ['renew', 'renew2'] }, renewC: { ok: true, src: ['renew', 'renew2'] }, end: { ok: true, src: ['renew'] },
  move: { ok: true, src: ['move'] }, rent: { ok: true, src: ['rent'] }, cy: { ok: true, src: ['cy'] },
  tmp2: { ok: false, src: [], why: '일시적 2주택 처분 기한은 2026년 10월에 바뀐 규정이라, 공식 사이트에서 법령 원문을 확인한 뒤 보여 드릴게요.' }
};
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
  if (t === 'own') { o.acq = d(x.acq); o.sell = d(x.sell); }
  if (t === 'jeonse' || t === 'wolse') { o.cs = d(x.cs); o.ce = d(x.ce); if (o.cs && o.ce && o.ce <= o.cs) o.ce = ''; }
  return o;
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
    if (c.cs) {
      out.push(calEv('move', c.cs, Object.assign(o(), { t: '이사하는 날 — 전입신고·확정일자', s: '이사한 날 바로 전입신고를 하고 계약서에 확정일자를 받아 두세요. 집에 들어가 전입신고까지 마친 다음 날부터 대항력(새 집주인·은행에도 내 권리를 주장할 힘)이 생겨요.' })));
      out.push(calEv('rent', c.cs, Object.assign(o(), { end: calAdd(c.cs, 30), t: '전월세 계약 신고(계약일부터 30일 안)', s: '보증금 6,000만 원 초과 또는 월세 30만 원 초과 계약은 계약한 날부터 30일 안에 신고해야 해요. 신고하면 확정일자가 저절로 붙고, 전입신고 때 계약서를 함께 내면 신고한 것으로 봐요.' })));
    }
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
  const hs = (homes || []).map(h => h && h.key ? { key: h.key, name: String(h.name || ''), cal: calClean(h.cal) } : null).filter(h => h && h.cal.t);
  let ev = [];
  const owns = hs.filter(h => h.cal.t === 'own');
  const y = +today.slice(0, 4);
  if (owns.length) for (let yy = y; yy <= y + 1; yy++) ev = ev.concat(calYear(yy, owns));
  hs.forEach(h => { ev = ev.concat(calHome(h)); });
  if (opt.notices && opt.areas) ev = ev.concat(calCy(opt.notices, opt.areas, today));
  ev = ev.filter(e => CAL_RULES[e.k] && CAL_RULES[e.k].ok && (e.end > e.d ? e.end : e.d) >= lo && (e.start || e.d) <= hi);
  ev.forEach(e => { e.dd = calDiff(today, e.d); });
  ev.sort((a, b) => a.d < b.d ? -1 : a.d > b.d ? 1 : a.id < b.id ? -1 : 1);
  return ev.slice(0, CAL_MAX);
}
/** 메일로 알릴 단계: daily(모닝 브리핑에 함께) = 30일·7일·1일 전, weekly(따로 보내는 주 1회) = 5주·1주 안. 새 청약 공고는 나온 뒤 7일 안 한 번. 이미 보낸 단계(sent[id|단계])는 뺌 */
function calStage(dd, mode) {
  if (dd < 0) return '';
  if (mode === 'weekly') return dd <= 8 ? 'd7' : dd <= 37 ? 'd30' : '';
  return dd <= 1 ? 'd1' : dd <= 7 ? 'd7' : dd <= 30 ? 'd30' : '';
}
function calDue(ev, mode, sent) {
  sent = sent || {};
  return (ev || []).map(e => Object.assign({}, e, { stage: e.sub === 'new' ? (e.dd <= 0 && e.dd >= -7 ? 'd1' : '') : calStage(e.dd, mode) })).filter(e => e.stage && !sent[e.id + '|' + e.stage] && !(e.stage === 'd30' && sent[e.id + '|d7']) && !(e.stage !== 'd1' && sent[e.id + '|d1']));
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
    <ul style="list-style:none;margin:0 0 6px;padding:0">${li}</ul><p style="font-size:12.5px;color:#4E5968;margin:4px 0 0">${links}</p>`;
  const subject = `[${site}] ${o.date ? calKo(o.date) + ' ' : ''}내 부동산 달력 — ${items[0] ? items[0].t : ''}${items.length > 1 ? ` 외 ${items.length - 1}개` : ''}`.slice(0, 120);
  const html = o.merged ? `<div style="border:2px solid #B8942A;border-radius:12px;padding:14px 16px;margin:0 0 14px">${body}</div>`
    : `<div style="font-family:'Noto Sans KR',sans-serif;max-width:600px;margin:auto;color:#191F28"><div style="font-weight:900;font-size:19px;margin:6px 0 12px">${calEsc(site)} <span style="color:#B8942A">달력 알림</span></div>${body}
      <p style="font-size:12px;color:#4E5968;line-height:1.65;margin:12px 0 0;border-top:1px solid #E5E8EB;padding-top:10px">이 메일은 ${calEsc(site)} 알림 센터에서 '내 부동산 달력 메일'을 켜신 분께 일주일에 한 번까지 보내는 정보 메일이에요. 광고가 아니에요.<br>
      ${o.off ? `<a href="${calEsc(o.off)}" style="color:#4E5968">달력 알림만 끄기</a> · ` : ''}${web ? `<a href="${calEsc(web)}my/alerts/" style="color:#4E5968">알림 설정 바꾸기</a>` : ''}<br>보낸 사람: ${calEsc(site)}${o.sender ? `(${calEsc(o.sender.name)}) · 전화 ${calEsc(o.sender.tel)} · 답장은 ${calEsc(o.sender.email)}로 가요` : ''}</p></div>`;
  return { subject: subject, html: html, text: text.join('\n') };
}
/* CAL-CORE END */

const API = { V: CAL_V, TEN: CAL_TEN, SRC: CAL_SRC, RULES: CAL_RULES, AHEAD: CAL_AHEAD, okDate: calOkDate, add: calAdd, addM: calAddM, diff: calDiff, monthEnd: calMonthEnd, ko: calKo, koY: calKoY, dow: calDow,
  clean: calClean, cleanAll: calCleanAll, KEY: CAL_KEY, year: calYear, home: calHome, cy: calCy, events: calEvents, stage: calStage, due: calDue, when: calWhen, mailHtml: calMailHtml, esc: calEsc };
root.JDJ_CAL_CORE = API;
if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
