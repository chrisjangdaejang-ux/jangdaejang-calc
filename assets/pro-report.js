/* 집예보 전문가 이름 리포트 (premium/pro/ 편집 · premium/r/ 고객 보기) — 공용 모듈
   - 유료 리포트(assets/premium-report.js)가 그린 화면 위에 전문가 표시 정보·의견을 '덧붙이기'만 합니다.
     집예보가 계산한 숫자·점수·순위·과거 성적·출처 문장은 이 파일이 건드리지 않습니다(고칠 칸 자체가 없음).
   - 섹션(.pr-sec[data-sec])은 넣기/빼기와 순서만 바꿉니다. 각 섹션 위에 '집예보 분석' 표시.
   - 전문가 의견은 '○○ 공인중개사 의견'·'○○ 분양대행 의견'·'○○ 세무사 의견' 등 유형별 이름 상자로 따로 그리고, 글은 텍스트로만(HTML 불가) 넣습니다.
   - 고객 링크: premium/r/#<id>.<토큰> — # 뒤는 서버·통계로 가지 않습니다. 서버에는 토큰 해시만 저장(tools/agent-backend.gs v17).
   node 에서도 불러 검사할 수 있게 순수 함수는 DOM 없이 동작합니다(tools/pro-test.js). */
(function (root) {
  'use strict';
  var JB = (typeof window !== 'undefined' && window.JDJ_BASE) || (function (p) { var g = p.indexOf('/jangdaejang-calc/') === 0, b = { SITE: g ? '/jangdaejang-calc/' : '/', DATA: g ? '/jangdaejang-data/' : 'https://chrisjangdaejang-ux.github.io/jangdaejang-data/' }; if (typeof window !== 'undefined') window.JDJ_BASE = b; return b; })((typeof location !== 'undefined' && location.pathname) || '/jangdaejang-calc/');
  /* 사이트 대표 주소(끝 /): assets/config.js SITE_URL → 없으면 지금 열린 사이트 → 없으면 예전 기본 주소. 도메인을 바꾸면 config.js 한 줄로 따라 바뀜 */
  const SITE = (function () {
    const u = String(((root && root.JDJ_SITE) || {}).SITE_URL || '').trim();
    if (/^https:\/\//.test(u)) return u.replace(/\/+$/, '') + '/';
    try { if (root.location && /^https?:$/.test(root.location.protocol)) return root.location.origin + JB.SITE; } catch (e) {}
    return 'https://chrisjangdaejang-ux.github.io/jangdaejang-calc/';
  })();
  /* 전문가 유형 — 신축 분양은 분양대행사·컨설팅·방송 출연 전문가·세미나 업체도 상담·소개하므로 공인중개사로 한정하지 않음.
     공인중개사는 법정 표시(공인중개사법 제18조의2·시행령 제17조의2: 중개사무소 명칭·소재지·연락처·등록번호·개업공인중개사 성명) 필수.
     중개보조원은 어느 유형으로도 넣을 수 없음(중개보조원 이름·직함 거절). 서버(agent-backend.gs PRO_ROLE)와 같은 키. */
  const ROLE = {
    agent: { t: '개업공인중개사(대표)', who: '공인중개사', tag: '공인중개사' },
    member: { t: '소속공인중개사', who: '공인중개사', tag: '공인중개사' },
    seller: { t: '분양대행사', who: '분양대행', tag: '분양대행사' },
    consult: { t: '부동산 컨설팅·전문가(유튜브·방송·세미나 등)', who: '부동산 전문가', tag: '부동산 전문가' },
    licensed: { t: '세무사·법무사 등 자격사', who: '자격사', tag: '자격사' }
  };
  const BROKER = r => r === 'agent' || r === 'member';
  /* 자격사 자격명(이 중에서 고름) */
  const QUALS = ['세무사', '법무사', '감정평가사', '변호사', '공인회계사', '행정사'];
  /* 예전 유형 'pro'(다른 전문가) → 직함이 자격명이면 자격사, 아니면 컨설팅·전문가 */
  const roleOf = (r, title) => ROLE[r] ? r : r === 'pro' ? (QUALS.indexOf(String(title || '').trim()) >= 0 ? 'licensed' : 'consult') : 'agent';
  /* 공인중개사가 아닌 사람이 '공인중개사'·'중개사무소' 명칭을 쓰면 안 됨(공인중개사법 제18조) · 중개보조원은 제외 */
  const BROKER_WORD = /공인\s*중개|중개\s*사무소|부동산\s*중개/;
  const ASSIST = /중개\s*보조/;
  /* 세무사 광고 규정: 수임료(보수) 비교·할인·무료, 금전·경품 혜택 문구 금지 */
  const TAX_AD = /(수임료|보수|수수료|기장료|신고\s*대행료)[^\n]{0,12}(할인|무료|최저|저렴|싸게|비교|면제|반값|0\s*원)|(최저|저렴한|무료)\s*(수임료|보수|기장|신고\s*대행)|현금\s*(지급|제공|사은)|상품권|사은품|경품|캐시백|페이백/;
  const SECS = [
    { k: 'cmp', t: '한눈에 비교', multi: true },
    { k: 'sum', t: '단지 요약(시세·거래)' },
    { k: 'fv', t: '미래가치 점수 · 오를 이유 · 조심할 점 · 지켜볼 것' },
    { k: 'trend', t: '최근 3년 시세 흐름' },
    { k: 'hz', t: '보유 기간별 미래가치' },
    { k: 'money', t: '대출 · 취득세 · 필요 현금', warn: '고객의 소득·보유 현금 숫자가 함께 보여요' }
  ];
  const SEC_KEYS = SECS.map(s => s.k);
  const DEFAULT_SECS = ['cmp', 'sum', 'fv', 'trend', 'hz'];
  const NOTE_MAX = 800, NOTES_TOTAL = 9000, LOGO_MAX = 45000;
  /* 서버(agent-backend.gs PRO_FAKE)와 같은 규칙: 전문가 글이 집예보가 쓴 것처럼 보이지 않게 */
  const FAKE = /(집\s*코\s*드|집\s*예\s*보|zip\s*code)\s*(의\s*)?(분석|의견|공식|인증|보증|추천)|장대장\s*(분석|인증|보증)/i;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const txt = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u001F\u007F<>]/g, ' ').trim().slice(0, n);
  const digits = v => String(v || '').replace(/[^0-9]/g, '');

  /* ---------- 표시 정보 ---------- */
  function cleanProfile(p) {
    p = p && typeof p === 'object' ? p : {};
    const role = roleOf(p.role, p.title);
    return { role, office: txt(p.office, 40), ceo: txt(p.ceo, 20), name: txt(p.name, 20), title: txt(p.title, 20),
      reg: txt(p.reg, 30).replace(/[^0-9A-Za-z가-힣-]/g, ''), biz: digits(p.biz).slice(0, 10), addr: txt(p.addr, 80), phone: txt(p.phone, 20).replace(/[^0-9-]/g, ''),
      kakao: /^https:\/\/(open|pf)\.kakao\.com\/[^\s"'<>\\`]+$/.test(String(p.kakao || '').trim()) ? String(p.kakao).trim().slice(0, 200) : '',
      logo: /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(String(p.logo || '')) && String(p.logo).length <= LOGO_MAX ? String(p.logo) : '' };
  }
  const bizFmt = d => (d = digits(d)).length === 10 ? d.slice(0, 3) + '-' + d.slice(3, 5) + '-' + d.slice(5) : d;
  /* 사업자등록번호 검증(국세청 체크섬) */
  function bizOk(d) {
    d = digits(d); if (d.length !== 10) return false;
    const w = [1, 3, 7, 1, 3, 7, 1, 3, 5]; let s = 0;
    for (let i = 0; i < 9; i++) s += +d[i] * w[i];
    s += Math.floor(+d[8] * 5 / 10);
    return (10 - s % 10) % 10 === +d[9];
  }
  /* 유형별 칸: 필수(req)·보임(show)·이름표(label) — 편집 화면과 검사가 같은 표를 씀 */
  /* 유형별 칸: [이름표, 필수(1)/선택(0), 왜 필요한지(작은 글씨)] — 편집 화면·검사·서버(agent-backend.gs proProfile)가 같은 기준.
     공인중개사: 공인중개사법 제18조의2·시행령 제17조의2 표시 항목은 모두 필수.
     그 밖의 전문가(분양대행·컨설팅·자격사): 필수는 '이름 또는 활동명' 한 칸 + 연락처(전화나 카카오톡 채널) 하나. 소속·상호·사업자번호 등은 선택(11/21 대표 결정). */
  const LAW = '법으로 꼭 표시해야 해요(공인중개사법)';
  const NM = ['이름 또는 활동명', 1, '손님이 누가 보낸 자료인지 알 수 있게 보여 줘요.'];
  function fieldsOf(r) {
    const F = {
      agent: { office: ['중개사무소 이름', 1, LAW], ceo: ['대표 공인중개사 이름', 1, LAW], reg: ['중개사무소 등록번호', 1, LAW], addr: ['중개사무소 소재지', 1, LAW] },
      member: { office: ['중개사무소 이름', 1, LAW], ceo: ['대표 공인중개사 이름', 1, LAW], name: ['내 이름(소속공인중개사)', 1, '손님이 상담한 사람을 알 수 있게 보여 줘요.'], reg: ['중개사무소 등록번호', 1, LAW], addr: ['중개사무소 소재지', 1, LAW] },
      seller: { name: NM, office: ['분양대행사 상호 (선택)', 0, '넣으면 이름 옆에 함께 보여요.'], title: ['담당 현장·직함 (선택)', 0, '어느 현장 담당인지 알려 주면 손님이 믿기 쉬워요.'], ceo: ['대표자 이름 (선택)', 0, '넣으면 함께 보여요.'], biz: ['사업자등록번호 (선택)', 0, '넣으면 함께 보여요. 숫자 10자리예요.'], addr: ['사무실 주소 (선택)', 0, '넣으면 함께 보여요.'] },
      consult: { name: NM, office: ['소속·상호 (선택)', 0, '학교·회사·채널 이름이에요. 넣으면 이름 옆에 함께 보여요.'], title: ['소개 한 줄 (선택)', 0, '예: ○○대 교수, ○○TV 운영. 넣으면 함께 보여요.'], biz: ['사업자등록번호 (선택)', 0, '넣으면 함께 보여요. 숫자 10자리예요.'], addr: ['사무실 주소 (선택)', 0, '넣으면 함께 보여요.'] },
      licensed: { name: NM, title: ['자격 (선택)', 0, '세무사·법무사 등 자격을 고르면 이름 옆에 보여요.'], office: ['사무소 이름 (선택)', 0, '넣으면 함께 보여요.'], reg: ['자격 등록번호 (선택)', 0, '넣으면 함께 보여요.'], biz: ['사업자등록번호 (선택)', 0, '넣으면 함께 보여요. 숫자 10자리예요.'], addr: ['사무소 주소 (선택)', 0, '넣으면 함께 보여요.'] }
    };
    return F[roleOf(r)];
  }
  /** 연락처 칸 이름표·필수·이유 */
  const contactOf = r => BROKER(r) ? { phone: ['전화번호', 1, LAW], kakao: ['카카오톡 채널 주소 (선택)', 0, '넣으면 손님이 카카오톡으로 바로 문의할 수 있어요.'] }
    : { phone: ['전화번호', 2, '손님이 전화로 문의할 수 있어요.'], kakao: ['카카오톡 채널·오픈채팅 주소', 2, '전화번호를 알리고 싶지 않으면 이것만 넣어도 돼요.'] };
  /** 비중개사 연락처 두 칸 위 한 줄(2 = 둘 중 하나) */
  const CONTACT_NOTE = '연락처: 둘 중 하나만 있으면 돼요.';
  /** 보여 줄 이름(비중개사는 이름 → 없으면 상호) */
  const nameOf = p => p.office || p.name || '';   // 머리 큰 글씨: 상호가 있으면 상호, 없으면 이름
  /** 빠진 칸 안내를 모두(한 줄씩). 서버와 같은 기준 */
  function profileErrors(p) {
    const r = p.role, d = digits(p.phone), out = [];
    if ([p.office, p.ceo, p.name, p.title].some(x => ASSIST.test(x || ''))) return ['중개보조원은 이름을 넣어 보낼 수 없어요. 개업·소속공인중개사 이름으로 보내 주세요.'];
    if (d && !(/^0\d{8,10}$/.test(d) || /^1[5-9]\d{6}$/.test(d))) out.push('전화번호를 다시 확인해 주세요. 숫자 9~11자리예요.');
    if (BROKER(r)) {
      if (!p.office) out.push('중개사무소 이름을 적어 주세요. ' + LAW + '.');
      if (!d) out.push('연락처(전화번호)를 적어 주세요. ' + LAW + '.');
      if (digits(p.reg).length < 5) out.push('중개사무소 등록번호를 적어 주세요. ' + LAW + '.');
      if (!p.ceo) out.push('개업공인중개사(대표) 이름을 적어 주세요. ' + LAW + '.');
      if (!p.addr) out.push('중개사무소 소재지(주소)를 적어 주세요. ' + LAW + '.');
      if (r === 'member' && !p.name) out.push('소속공인중개사 본인 이름을 적어 주세요. 손님이 상담한 사람을 알 수 있어야 해요.');
    } else {
      if (!p.name && !p.office) out.push('이름 또는 활동명을 적어 주세요. 손님이 누가 보낸 자료인지 알 수 있어야 해요.');
      if (!d && !p.kakao) out.push('전화번호나 카카오톡 채널 주소 중 하나를 적어 주세요. 손님이 문의할 곳이 있어야 해요.');
      if ([p.office, p.name, p.title].some(x => BROKER_WORD.test(x || ''))) out.push("공인중개사가 아니면 '공인중개사'·'중개사무소' 같은 이름을 쓸 수 없어요(공인중개사법 제18조). 공인중개사라면 위에서 공인중개사 유형을 골라 주세요.");
      if (digits(p.biz) && !bizOk(p.biz)) out.push('사업자등록번호 10자리를 다시 확인해 주세요. 비워 둬도 돼요.');
      if (r === 'licensed' && p.title && QUALS.indexOf(p.title) < 0) out.push('자격은 목록(세무사·법무사 등)에서 골라 주세요. 비워 둬도 돼요.');
    }
    if ([p.office, p.ceo, p.name, p.title].some(x => FAKE.test(x || ''))) out.push('이름·소속에는 집예보가 쓴 것처럼 보이는 말을 넣을 수 없어요.');
    return out;
  }
  /* 첫 번째 안내(빈 문자열이면 통과) */
  const profileError = p => profileErrors(p)[0] || '';
  /* 의견 상자 이름: '홍길동 공인중개사 의견' · '○○ 분양대행 의견' · '장대장 부동산 전문가 의견' · '김세무 세무사 의견' */
  function who(p) {
    const r = roleOf(p.role, p.title);
    if (r === 'seller') return `${p.office || p.name || ''} 분양대행`.trim();
    if (r === 'consult') return `${p.name || p.office || ''} ${p.name ? '부동산 전문가' : ''}`.trim() || '부동산 전문가';
    if (r === 'licensed') return `${p.name || p.office || ''} ${p.title || '자격사'}`.trim();
    return `${(r === 'member' ? p.name : p.ceo) || ''} 공인중개사`.trim();
  }
  const opinionLabel = p => who(p) + ' 의견';
  /* 표지·공유 제목의 '보낸 분': 사무소 이름이 이미 들어간 이름표(분양대행)는 겹쳐 쓰지 않음 */
  const senderOf = p => { const w = who(p); return p.office && w.indexOf(p.office) < 0 ? `${p.office} ${w}` : w; };
  /* 편집 화면 경고(저장은 막지 않음 — 서버도 세무사 금지 문구만 거절) */
  function adWarn(p, notes) {
    const out = [];
    if (roleOf(p.role, p.title) === 'licensed' && p.title === '세무사') {
      out.push('세무사 광고 규정상 수임료 비교·할인·무료 같은 보수 문구나 현금·상품권 같은 금전 혜택 문구는 쓸 수 없어요.');
    }
    if (roleOf(p.role) === 'seller') out.push('분양 광고 문구(확정 수익·프리미엄 보장 등)는 쓰지 말아 주세요. 고객 화면에는 "분양 판매를 맡은 회사의 의견"이라고 함께 표시돼요.');
    return out;
  }

  /* ---------- 의견 글 ---------- */
  const NOTE_KEY = /^(summary|closing|cmp|[0-2]\.(sum|trend|fv|hz|money))$/;
  function cleanNotes(n) {
    const out = {}; let total = 0;
    Object.keys(n && typeof n === 'object' ? n : {}).slice(0, 40).forEach(k => {
      if (!NOTE_KEY.test(k)) return;
      const t = String(n[k] == null ? '' : n[k]).replace(/[\u0000-\u0009\u000B-\u001F\u007F<>]/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, NOTE_MAX);
      if (t) { out[k] = t; total += t.length; }
    });
    return { notes: out, total };
  }
  function notesError(n, p) {
    const { notes, total } = cleanNotes(n);
    if (p && roleOf(p.role, p.title) === 'licensed' && p.title === '세무사' && Object.keys(notes).some(k => TAX_AD.test(notes[k])))
      return '세무사 광고 규정상 수임료 비교·할인·무료 문구나 현금·상품권 같은 금전 혜택 문구는 넣을 수 없어요. 해당 문장을 빼 주세요.';
    if (Object.keys(notes).some(k => FAKE.test(notes[k]))) return '의견에는 집예보가 쓴 것처럼 보이는 말(예: 집예보 분석·집예보 의견)을 넣을 수 없어요. 전문가 의견은 전문가 이름으로 따로 표시돼요.';
    if (total > NOTES_TOTAL) return '의견 글이 너무 길어요. 조금 줄여 주세요.';
    return '';
  }
  function cleanSecs(a) {
    const seen = {};
    return (Array.isArray(a) ? a : []).map(String).filter(k => SEC_KEYS.indexOf(k) >= 0 && !seen[k] && (seen[k] = 1));
  }

  /* ---------- 링크 ---------- */
  const linkOf = (id, tk) => SITE + 'premium/r/#' + id + '.' + tk;
  function parseHash(h) {
    const m = /^#?(P[0-9A-F]{11})\.([0-9a-fA-F]{64})$/.exec(String(h || ''));
    return m ? { id: m[1], tk: m[2] } : null;
  }

  /* ---------- 화면 조각 ---------- */
  const nl = t => esc(t).replace(/\n/g, '<br>');
  function noteHtml(p, t, key) {
    return `<aside class="pro-note" data-note="${esc(key)}"><div class="pro-note-h"><span class="pro-pen" aria-hidden="true">✎</span>${esc(opinionLabel(p))}</div>
      <p>${nl(t)}</p><div class="pro-note-f">${roleOf(p.role) === 'seller' ? '분양 판매를 맡은 회사(분양대행사)가 직접 쓴 의견이에요. ' : '전문가가 직접 쓴 의견이에요. '}위 집예보 분석과 다를 수 있어요.</div></aside>`;
  }
  function telOf(p) { const d = digits(p.phone); return d ? 'tel:' + d : ''; }
  /* 표지 위 전문가 머리말: 로고 · 사무소 · 이름 · 등록번호 · 소재지 · 연락처 · [이 전문가에게 문의하기] */
  function headHtml(p, o) {
    o = o || {};
    const r = roleOf(p.role, p.title);
    const nm = r === 'member' ? `소속공인중개사 ${p.name} · 대표 ${p.ceo}`
      : r === 'agent' ? `대표 공인중개사 ${p.ceo}`
      : r === 'seller' ? [p.ceo ? '대표 ' + p.ceo : '', p.name && p.office ? `담당 ${p.name}${p.title ? ' (' + p.title + ')' : ''}` : (p.title || '')].filter(Boolean).join(' · ')
      : r === 'licensed' ? `${p.title || '자격사'} ${p.office ? p.name : ''}`.trim()
      : [p.office ? p.name : '', p.title || '부동산 컨설팅·전문가'].filter(Boolean).join(' · ');
    const lines = [
      p.reg ? `${BROKER(r) ? '중개사무소 등록번호' : r === 'licensed' ? (p.title || '자격') + ' 등록번호' : '등록번호'} ${esc(p.reg)}` : '',
      p.biz && !BROKER(r) ? `사업자등록번호 ${esc(bizFmt(p.biz))}` : '',
      p.addr ? esc(p.addr) : '',
      p.phone ? `전화 ${esc(p.phone)}` : ''
    ].filter(Boolean);
    return `<header class="pro-head">
      <div class="pro-id">${p.logo ? `<img class="pro-logo" src="${p.logo}" alt="${esc(nameOf(p))} 로고">` : `<div class="pro-logo pro-logo0" aria-hidden="true">${esc((nameOf(p) || '?').slice(0, 1))}</div>`}
        <div><div class="pro-office">${esc(nameOf(p))}<span class="pro-kind">${esc(r === 'licensed' && p.title ? p.title : ROLE[r].tag)}</span></div><div class="pro-nm">${esc(nm)}</div><div class="pro-sub">${lines.join(' · ')}</div></div></div>
      ${o.noBtn ? '' : `<button type="button" class="pro-ask noprint" data-pro-ask>이 전문가에게 문의하기</button>`}
    </header>`;
  }
  function askSheet(p) {
    const tel = telOf(p), sms = tel ? 'sms:' + digits(p.phone) : '';
    return `<div class="pro-sheet" role="dialog" aria-label="문의하기"><div class="pro-sheet-in">
      <b>${esc(senderOf(p))}</b>
      ${tel ? `<a class="btn2 blue" href="${tel}" data-pro-click="call">전화 걸기 (${esc(p.phone)})</a><a class="btn2" href="${sms}" data-pro-click="sms">문자 보내기</a>` : ''}
      ${p.kakao ? `<a class="btn2" href="${esc(p.kakao)}" target="_blank" rel="noopener" data-pro-click="kakao">카카오톡으로 문의하기</a>` : ''}
      <button type="button" class="btn2" data-pro-close>닫기</button>
      <small>문의는 전문가에게 바로 연결돼요. 집예보는 상담·중개·분양 내용을 보지 않아요.</small></div></div>`;
  }
  function coverHtml(p, o) {
    const names = (o.items || []).map(x => x.apt + ' ' + x.band);
    return `<div class="pr-cover pro-cover">
      <span class="tag">${esc(o.client ? o.client + '님께 드리는 단지 분석 리포트' : '고객님께 드리는 단지 분석 리포트')}</span>
      <h1>${names.length > 1 ? '후보 단지 비교 리포트' : esc((o.items && o.items[0] ? o.items[0].apt : '단지') + ' 분석 리포트')}</h1>
      <div class="pr-meta">보낸 분 ${esc(senderOf(p))}${o.created ? ` · 보낸 날 ${esc(o.created)}` : ''}${o.expires ? ` · ${esc(o.expires)}까지 볼 수 있어요` : ''}${o.dataTo ? ` · 실거래 자료 ${esc(o.dataTo)}까지 반영` : ''}</div>
      ${names.length > 1 ? `<div class="pr-meta">${esc(names.join(' · '))}</div>` : ''}
    </div>`;
  }
  function footHtml(o) {
    o = o || {};
    return `<footer class="pro-src">
      ${o.refresh ? `<p>숫자(시세·점수·순위·대출)는 링크를 열 때마다 최신 공개 자료로 다시 계산해요. 전문가 의견은 보낸 날 기준이에요.</p>` : ''}
      <p><b>데이터·분석: 집예보</b> · 국토교통부 실거래가 등 공공 자료 기반 · 집예보가 계산한 숫자·점수·순위는 전문가가 고칠 수 없어요. 전문가 의견 상자만 전문가가 쓴 글이에요.</p>
      <p>집예보는 이 전문가의 중개·분양·상담에 관여하지 않아요. <a href="${SITE}?utm_source=pro">집예보 둘러보기</a></p>
    </footer>`;
  }
  const ym6 = v => /^\d{6}$/.test(String(v || '')) ? String(v).slice(0, 4) + '년 ' + parseInt(String(v).slice(4), 10) + '월' : '';

  /* ---------- 그린 리포트에 덧붙이기(여러 번 불러도 같은 결과) ---------- */
  function apply(box, cfg) {
    const p = cfg.profile, secs = cleanSecs(cfg.secs), notes = cleanNotes(cfg.notes).notes, edit = !!cfg.edit;
    box.querySelectorAll('.pro-note,.pro-lock,.pro-gap').forEach(e => e.remove());
    box.classList.add('pro-on');
    const lock = () => `<div class="pro-lock">집예보 분석${edit ? ' · 숫자는 고칠 수 없어요' : ''}</div>`;
    const ins = (el, key) => { if (notes[key]) el.insertAdjacentHTML('afterend', noteHtml(p, notes[key], key)); };
    const cmp = box.querySelector('.pr-sec[data-sec="cmp"]');
    if (cmp) { cmp.hidden = secs.indexOf('cmp') < 0; if (!cmp.hidden) { cmp.insertAdjacentHTML('afterbegin', lock()); ins(cmp, 'cmp'); } }
    box.querySelectorAll('.pr-unit[id^="u"]').forEach(u => {
      const i = +u.id.slice(1), all = {};
      u.querySelectorAll(':scope > .pr-sec').forEach(s => { all[s.dataset.sec] = s; });
      /* 순서: 고른 것 차례대로, 안 고른 것은 뒤로 숨김 */
      const order = secs.filter(k => all[k]).concat(Object.keys(all).filter(k => secs.indexOf(k) < 0));
      order.forEach(k => { const s = all[k]; u.appendChild(s); s.hidden = secs.indexOf(k) < 0; });
      order.forEach(k => { const s = all[k]; if (s.hidden) return; s.insertAdjacentHTML('afterbegin', lock()); ins(s, i + '.' + k); });
      const vis = order.filter(k => !all[k].hidden);
      u.hidden = !vis.length;
    });
    box.querySelectorAll('.pr-soon').forEach(e => { e.hidden = true; });
    box.querySelectorAll('.pr-cond,.pr-condp').forEach(e => { e.hidden = secs.indexOf('money') < 0; });
    const cov = box.querySelector('.pr-cover');
    if (cov && notes.summary) cov.insertAdjacentHTML('afterend', noteHtml(p, notes.summary, 'summary'));
    const disc = box.querySelector('.pr-disc');
    if (disc && notes.closing) disc.insertAdjacentHTML('beforebegin', noteHtml(p, notes.closing, 'closing'));
  }

  /* ---------- 로고: 브라우저에서 줄여 작은 이미지로(서버엔 작은 크기만) ---------- */
  function shrinkLogo(file) {
    return new Promise((ok, no) => {
      if (!file || !/^image\/(png|jpeg|webp|gif)$/.test(file.type)) return no(new Error('PNG·JPG 이미지 파일을 골라 주세요.'));
      if (file.size > 8 * 1024 * 1024) return no(new Error('8MB보다 작은 이미지를 골라 주세요.'));
      const fr = new FileReader();
      fr.onerror = () => no(new Error('이미지를 읽지 못했어요.'));
      fr.onload = () => {
        const im = new Image();
        im.onerror = () => no(new Error('이미지를 읽지 못했어요.'));
        im.onload = () => {
          let W = 360, Hh = 144;
          for (let n = 0; n < 6; n++) {
            const k = Math.min(1, W / im.width, Hh / im.height), w = Math.max(1, Math.round(im.width * k)), h = Math.max(1, Math.round(im.height * k));
            const c = document.createElement('canvas'); c.width = w; c.height = h;
            const g = c.getContext('2d');
            let url = '';
            if (file.type === 'image/png' || file.type === 'image/gif') { g.drawImage(im, 0, 0, w, h); url = c.toDataURL('image/png'); }
            if (!url || url.length > LOGO_MAX - 1000) { g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.drawImage(im, 0, 0, w, h); url = c.toDataURL('image/jpeg', n < 3 ? 0.86 : 0.72); }
            if (url.length <= LOGO_MAX - 1000) return ok(url);
            W = Math.round(W * 0.8); Hh = Math.round(Hh * 0.8);
          }
          no(new Error('로고 이미지를 충분히 줄이지 못했어요. 더 단순한 이미지를 올려 주세요.'));
        };
        im.src = fr.result;
      };
      fr.readAsDataURL(file);
    });
  }

  /* ---------- 카카오톡 보내기: 카카오 공유(미리보기 카드) → 휴대폰 공유창 → 링크 복사 ---------- */
  const SDK = 'https://t1.kakaocdn.net/kakao_js_sdk/2.8.5/kakao.min.js', SRI = 'sha384-v6JKY3z4FUkWq21oZDHZe74YvuPk/WUrVLrDHTBojHXClOSa3iXy7sCXPY1jkFbj';
  let sdkP = null;
  function kakaoSdk() {
    const key = String((root.JDJ_SITE || {}).KAKAO_JS_KEY || '').trim();   // assets/config.js
    if (!key) return Promise.reject(new Error('nokey'));
    if (root.Kakao) { if (!root.Kakao.isInitialized()) root.Kakao.init(key); return Promise.resolve(root.Kakao); }
    if (!sdkP) sdkP = new Promise((ok, no) => {
      const s = document.createElement('script'); s.src = SDK; s.integrity = SRI; s.crossOrigin = 'anonymous'; s.async = true;
      s.onload = () => { if (!root.Kakao) return no(new Error('sdk')); if (!root.Kakao.isInitialized()) root.Kakao.init(key); ok(root.Kakao); };
      s.onerror = () => { sdkP = null; no(new Error('sdk')); };
      document.head.appendChild(s);
    });
    return sdkP;
  }
  async function copy(url) {
    try { await navigator.clipboard.writeText(url); return true; } catch (e) {
      try { const t = document.createElement('textarea'); t.value = url; document.body.appendChild(t); t.select(); const r = document.execCommand('copy'); t.remove(); return r; } catch (x) { return false; }
    }
  }
  async function share(o) {
    try {
      const K = await kakaoSdk();
      K.Share.sendDefault({ objectType: 'feed',
        content: { title: o.title, description: o.desc, imageUrl: SITE + 'assets/og/premium.png', imageWidth: 1200, imageHeight: 630, link: { mobileWebUrl: o.url, webUrl: o.url } },
        buttons: [{ title: '리포트 보기', link: { mobileWebUrl: o.url, webUrl: o.url } }] });
      return 'kakao';
    } catch (e) {}
    if (navigator.share) { try { await navigator.share({ title: o.title, text: o.desc, url: o.url }); return 'share'; } catch (e) { if (e && e.name === 'AbortError') return 'cancel'; } }
    return (await copy(o.url)) ? 'copy' : 'fail';
  }

  const API = { ROLE, QUALS, BROKER, roleOf, fieldsOf, bizOk, bizFmt, adWarn, TAX_AD, SECS, SEC_KEYS, DEFAULT_SECS, NOTE_MAX, LOGO_MAX, FAKE, esc, cleanProfile, profileError, profileErrors, contactOf, CONTACT_NOTE, nameOf, LAW, cleanNotes, notesError, cleanSecs,
    who, opinionLabel, senderOf, linkOf, parseHash, noteHtml, headHtml, askSheet, coverHtml, footHtml, apply, shrinkLogo, share, copy, kakaoSdk, ym6, telOf };
  root.JDJ_PRO = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
