/* 집예보 '← 이전으로' 줄 + 위치 표시(홈 › 카테고리 › 지금 화면) — 모든 화면 공용
   <script src="(상대 경로)assets/back.js?v=1" defer></script> 만 넣으면 머리줄(header.top) 바로 아래, 본문 칸과 같은 왼쪽 줄에 붙는다.
   - 우리 사이트의 다른 화면에서 왔으면(같은 사이트 referrer, 또는 우리 링크를 눌러 온 기록) 브라우저 뒤로 가기(history.back)와 같고,
     글자가 어디로 가는지 말해 줌: '← 재개발·빌라로'. 이름을 모르는 화면이면 '← 이전 화면'.
   - 검색·공유 링크로 바로 들어왔으면 '← 홈으로'(홈 링크).
   - 한 화면 안에서 내용만 바뀌는 흐름(탭·고른 건물·질문 단계)은 화면이 history.state 에 { jbn: 깊이, jbl: '돌아갈 곳 이름' } 을 남기면
     '← (그 이름)으로' + 뒤로 가기. 내 집 시세(mine/)는 JDJ_BACK.inpage() 로 탭·건물 바꿈을 기록에 쌓는다.
   - 첫 화면(홈)·머리줄이 없는 화면(고객용 카드 brief/c 등)·<body data-noback> 화면에는 붙이지 않는다.
   - 이미 위치 표시(nav.bc, 단지·지역 검색용 페이지)가 있으면 위치 표시는 새로 만들지 않는다.
   tools/back-test.js 가 이름표·조사(로/으로)·판단 규칙을 확인한다. */
(function (root) {
  'use strict';
  var HAS_DOC = typeof document !== 'undefined' && typeof window !== 'undefined';
  var JB = (typeof window !== 'undefined' && window.JDJ_BASE) || (function (p) { var g = p.indexOf('/jangdaejang-calc/') === 0, b = { SITE: g ? '/jangdaejang-calc/' : '/', DATA: g ? '/jangdaejang-data/' : 'https://chrisjangdaejang-ux.github.io/jangdaejang-data/' }; if (typeof window !== 'undefined') window.JDJ_BASE = b; return b; })((typeof location !== 'undefined' && location.pathname) || '/jangdaejang-calc/');

  /* 화면 이름표: 사이트 안 경로 → [이름, 카테고리(위 단계) 경로] */
  var NAMES = {
    '': ['홈'],
    'buy/': ['내 집 마련 계산기'], 'buy/report/': ['맞춤 분석 리포트', 'buy/'],
    'switch/': ['갈아타기'], 'switch/rent/': ['전세 갈아타기', 'switch/'],
    'villa/': ['재개발·빌라'], 'villa/zone/': ['재개발 구역 지도', 'villa/'],
    'chungyak/': ['청약'], 'chungyak/price/': ['분양가·입지 분석', 'chungyak/'], 'cy/': ['청약 공고', 'chungyak/'],
    'bunyang/': ['분양'], 'bunyang/agency/': ['분양대행 의뢰', 'bunyang/'], 'bunyang/apply/': ['분양 광고 신청', 'bunyang/'], 'partner/': ['분양 판매 파트너', 'bunyang/'],
    'tax/': ['세금'], 'tax/transfer/': ['넘기는 방법 비교', 'tax/'],
    'loan/': ['대출 한도'],
    'mine/': ['내 집 시세'], 'mine/calendar/': ['내 부동산 달력', 'mine/'], 'map/': ['지도'], 'all/': ['전체 기능'], 'ask/': ['단지 비교'], 'rank/': ['주간 순위'],
    'jeonse/': ['전월세'], 'jeonse/checklist/': ['전세사기 예방 체크리스트', 'jeonse/'], 'jeonse/safety/draft/': ['전셋집 안전 진단', 'jeonse/'],
    'quiz/': ['집값 맞혀 보기'], 'quiz/hall/': ['명예의 전당', 'quiz/'],
    'track/': ['예측 적중 기록'], 'track/detail/': ['성적표', 'track/'],
    'weekly/': ['주간 실거래 동향'], 'press/': ['보도자료실'],
    'brief/': ['모닝 브리핑'], 'brief/subscribe/': ['브리핑 받기', 'brief/'], 'brief/manage/': ['내 구독 관리', 'brief/'], 'brief/paid/': ['결제 확인', 'brief/'], 'brief/c/': ['관심 단지 소식', 'brief/'],
    'premium/': ['프리미엄 리포트'], 'premium/pro/': ['고객에게 보내기', 'premium/'], 'premium/checkout/': ['결제하기', 'premium/'], 'premium/success/': ['결제 확인', 'premium/'],
    'premium/fail/': ['결제 실패·취소', 'premium/'], 'premium/r/': ['전문가 리포트', 'premium/'], 'premium/view/': ['리포트 보기', 'premium/'],
    'my/watch/': ['관심 목록'], 'my/alerts/': ['알림 센터'], 'my/memory/': ['기억하는 것', 'my/alerts/'], 'alerts/': ['먼저 챙겨 드려요'], 'my/report/': ['내 집 성적표'], 'login/': ['로그인'],
    'about/': ['서비스 소개'], 'terms/': ['이용약관'], 'privacy/': ['개인정보처리방침'], 'refund/': ['환불 정책'],
    'guide/method/': ['점수 읽는 법'], 'guide/terms/': ['용어 모아 보기'],
    'ad/': ['광고·제휴'], 'ad/plan/': ['광고 설계 도우미', 'ad/'],
    'agent/': ['중개사 제휴'], 'agent/my/': ['중개사 대시보드', 'agent/'], 'agent/listing/': ['매물 설명서', 'agent/'], 'agent/content/': ['블로그·인스타 글', 'agent/'], 'agent/pro/': ['중개사 프로 도구', 'agent/'], 'agent/pro/report/': ['손님용 단지 리포트', 'agent/pro/'], 'agent/pro/post/': ['우리 동네 블로그·인스타 글', 'agent/pro/'], 'agent/sheet/': ['적정 가격 근거표', 'agent/'],
    'pro/developer/': ['시행사 데이터 리포트'],
    'community/': ['살아보니'], 'community/admin/': ['운영자 검토', 'community/'],
    'counsel/': ['고민 상담'], 'counsel/expert/': ['전문가로 답하기', 'counsel/'], 'counsel/heart/': ['전문가 하트', 'counsel/'], 'counsel/chat/': ['상담 채팅', 'counsel/'], 'counsel/pro/': ['전문가 프로필', 'counsel/pros/'], 'counsel/pros/': ['전문가 찾기', 'counsel/'], 'counsel/admin/': ['운영자 답변', 'counsel/'],
    'dongne/': ['동네 파트너'], 'dongne/my/': ['내 파트너 화면', 'dongne/'], 'dongne/office/': ['사무소 보기', 'dongne/'], 'dongne/terms/': ['동네 파트너 약관', 'dongne/'], 'dongne/admin/': ['운영자 검토', 'dongne/'],
    'move/': ['이사 견적 받기'], 'move/partner/': ['이사업체 제휴', 'move/'], 'move/terms/': ['이사 견적 약관', 'move/'], 'move/admin/': ['이사업체 운영자', 'move/'], 'solve/': ['고민 해결 길잡이'], 'solve/admin/': ['길잡이 운영자', 'solve/'],
    'apt/': ['지역별 아파트'], 'comm/': ['지역별 상가·건물'],
    'land/': ['땅 위험 신호 체크'], 'land/draft/': ['땅 체크'], 'sell/draft/': ['집 내놓기'], 'home-draft/': ['첫 화면 시안']
  };
  var MINE_T = { v: '빌라 시세', o: '오피스텔 시세', c: '상가·건물 시세' };
  var MAXN = 14;          // 이 글자 수보다 긴 이름은 '이전 화면'으로(단추가 두 줄이 되지 않게)

  /** 경로 정리: '(사이트 경로)/villa/index.html' → 'villa/' (사이트 밖이면 null) */
  function relOf(pathname) {
    var p = String(pathname || '');
    try { p = decodeURI(p); } catch (e) {}
    if (p.indexOf(JB.SITE) !== 0) return null;
    p = p.slice(JB.SITE.length).replace(/index\.html?$/, '');
    if (p && !/\/$/.test(p)) p += '/';
    return p;
  }
  /** 사이트 안 경로(+주소 ? 뒤) → { name, parent } (모르는 화면이면 name '') */
  function info(rel, search) {
    rel = rel || '';
    var q = search || '', m, e = NAMES[rel];
    if (rel === 'mine/') {
      m = /[?&]t=([voc])(&|$)/.exec(q);
      if (m) return { name: MINE_T[m[1]], parent: 'mine/' };
    }
    if (e) return { name: e[0], parent: e[1] || null };
    if ((m = /^apt\/(\d{5})\/(\d+\/)?$/.exec(rel))) return { name: '지역 아파트 목록', parent: 'apt/' };
    if ((m = /^apt\/(\d{5})\/[^/]+\/$/.exec(rel))) return { name: '단지 정보', parent: 'apt/' + m[1] + '/' };
    if (/^comm\/\d{5}\/$/.test(rel)) return { name: '지역 상가·건물', parent: 'comm/' };
    if (/^cy\/\d+\/$/.test(rel)) return { name: '청약 공고 상세', parent: 'cy/' };
    if (/^weekly\/\d{4}-\d{2}\/$/.test(rel)) return { name: '지난 주간 동향', parent: 'weekly/' };
    return { name: '', parent: null };
  }
  /** 단지·지역·청약 공고처럼 주소가 많은 화면(제목을 저장해 두었다가 이름으로 씀) */
  function isDyn(rel) { return /^(apt|comm|cy)\/[^/]+\//.test(String(rel || '')); }
  /** 받침에 맞는 조사: 받침 없음·ㄹ 받침 → '로', 그 밖 → '으로' */
  function josa(name) {
    var s = String(name || '').replace(/[^0-9A-Za-z가-힣]+$/, '');
    var c = s.charAt(s.length - 1);
    if (!c) return '로';
    var k = c.charCodeAt(0) - 0xAC00;
    if (k >= 0 && k < 11172) { var j = k % 28; return j === 0 || j === 8 ? '로' : '으로'; }
    if (/[0-9]/.test(c)) return /[360]/.test(c) ? '으로' : '로';   // 삼·육·영 → 으로
    return /[mnMN]/.test(c) ? '으로' : '로';
  }
  /** 이름 → 단추 글자 '← 재개발·빌라로' (이름이 없거나 너무 길면 '← 이전 화면') */
  function label(name) {
    var n = String(name || '').replace(/\s+/g, ' ').trim();
    if (!n || n.length > MAXN) return '← 이전 화면';
    return '← ' + n + josa(n);
  }
  /** 건물 키('11710|송파동|...|헬리오시티', '망원동|459-15|대왕빌라')의 이름 칸 — 이름처럼 보일 때만 */
  function keyName(key) {
    var ps = String(key || '').split('|'), n = (ps[ps.length - 1] || '').replace(/^#/, '').replace(/\s*\([^()]*\)\s*$/, '').trim();
    if (!n || /^[\d\s-]+$/.test(n) || ps.length < 2) return '';
    return n;
  }

  /**
   * 어디로 돌아갈지 정하기(순수 함수 — tools/back-test.js)
   * o = { here: {rel, search}, ref: referrer 주소(문자열), origin, nav: 우리 링크를 눌러 온 기록 {to, from, t}, now, histLen, state: history.state, names: 저장해 둔 화면 이름 }
   * → { mode: 'back'|'home', text, href(사이트 안 상대 경로), from }
   */
  function decide(o) {
    var st = o.state && typeof o.state === 'object' ? o.state : null;
    if (st && st.jbn > 0) return { mode: 'back', text: label(st.jbl), href: '', from: 'state' };
    if (st && st.jps) return { mode: 'back', text: '← 이전 화면', href: '', from: 'state' };      // 시세 표 시트가 열린 칸
    var hereRel = (o.here && o.here.rel) || '', from = null, fromSearch = '';
    if (st && typeof st.jbf === 'string' && (o.histLen || 0) > 1) { var g = st.jbf.split('?'); if (relOf(JB.SITE + g[0]) !== null) { from = g[0]; fromSearch = g[1] ? '?' + g[1] : ''; } }   // 이 기록 칸에 적어 둔 '어디서 왔는지'(새로 고침해도 그대로)
    if (from === null && o.ref && (o.histLen || 0) > 1) {
      try {
        var u = new URL(o.ref);
        if (u.origin === o.origin) { var r = relOf(u.pathname); if (r !== null) { from = r; fromSearch = u.search; } }
      } catch (e) {}
    }
    if (from === null && o.nav && (o.histLen || 0) > 1 && o.nav.to === hereRel && o.now - (o.nav.t || 0) < 30 * 60 * 1000 && typeof o.nav.from === 'string') {
      var f = o.nav.from.split('?'); from = f[0]; fromSearch = f[1] ? '?' + f[1] : '';
    }
    if (from === null) return { mode: 'home', text: '← 홈으로', href: '', from: null };
    var nm = (isDyn(from) && o.names && o.names[from]) || info(from, fromSearch).name || (o.names && o.names[from]) || '';
    if (from === '') nm = '홈';
    return { mode: 'back', text: label(nm), href: from + fromSearch, from: from };
  }
  /** 위치 표시 칸: [[이름, 경로|null(지금 화면)]] — 카테고리가 없으면 홈 › 지금 화면 */
  function crumbs(rel, search, names) {
    var me = info(rel, search), out = [['홈', '']];
    if (isDyn(rel) && names && names[rel]) me.name = names[rel];
    if (!me.name) return [];
    if (me.parent !== null && me.parent !== undefined) {
      var p = info(me.parent, ''), pn = (isDyn(me.parent) && names && names[me.parent]) || p.name;
      if (p.parent) { var pp = info(p.parent, ''); if (pp.name) out.push([pp.name, p.parent]); }
      if (pn) out.push([pn, me.parent]);
    }
    out.push([me.name, null]);
    return out;
  }

  var API = { NAMES: NAMES, relOf: relOf, info: info, isDyn: isDyn, josa: josa, label: label, keyName: keyName, decide: decide, crumbs: crumbs,
    st: function (extra, lbl) { var cur = (HAS_DOC && history.state) || {}; var o = {}; for (var k in (extra || {})) o[k] = extra[k]; o.jbn = (cur.jbn || 0) + 1; o.jbl = lbl || ''; return o; },
    refresh: function () {}, inpage: function () {} };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (!HAS_DOC) return;
  window.JDJ_BACK = API;

  /* ---------------- 화면 ---------------- */
  var SS = function () { try { return window.sessionStorage; } catch (e) { return null; } };
  var NAV_K = 'jdj_bk_nav', NM_K = 'jdj_bk_names';
  var readJ = function (k) { try { var s = SS(); return s ? JSON.parse(s.getItem(k) || 'null') : null; } catch (e) { return null; } };
  var writeJ = function (k, v) { try { var s = SS(); if (s) s.setItem(k, JSON.stringify(v)); } catch (e) {} };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var HERE = relOf(location.pathname);
  /* 우리 링크를 눌러 온 기록은 이 화면을 열 때 한 번만 읽고 지움(나중에 검색으로 바로 들어온 것과 헷갈리지 않게) — 대신 이 기록 칸(history.state.jbf)에 적어 둠 */
  var NAV0 = readJ(NAV_K);
  try { var s0 = SS(); if (s0) s0.removeItem(NAV_K); } catch (e) {}
  var bar = null, btn = null, bc = null, dec = null, cont = null;

  /* 우리 링크를 누를 때 '어디서 왔는지' 기록(referrer 를 안 보내는 화면에서도 돌아갈 곳을 알 수 있게) */
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest && e.target.closest('a[href]');
    if (!a || a.target === '_blank' || a.hasAttribute('download') || e.defaultPrevented || a.classList.contains('jbk-btn')) return;
    try {
      var u = new URL(a.getAttribute('href'), location.href);
      if (u.origin !== location.origin) return;
      var to = relOf(u.pathname); if (to === null || HERE === null) return;
      writeJ(NAV_K, { to: to, from: HERE + location.search, t: Date.now() });
    } catch (x) {}
  }, true);
  /* 단지·지역 검색용 페이지처럼 이름표에 없는 화면은 제목(h1)을 저장해 두었다가 돌아갈 때 이름으로 씀 */
  function rememberName() {
    if (!isDyn(HERE)) return;
    var h = document.querySelector('main h1, h1'); if (!h) return;
    var t = (h.textContent || '').replace(/\s+/g, ' ').trim().replace(/\s*(아파트 |상가·건물 )?(실거래가|분양가|청약).*$/, '');
    if (!t || t.length > 30) return;
    var m = readJ(NM_K) || {}, ks = Object.keys(m);
    if (ks.length > 60) ks.slice(0, ks.length - 60).forEach(function (k) { delete m[k]; });
    m[HERE] = t; writeJ(NM_K, m);
  }

  function css() {
    if (document.getElementById('jbk-css')) return;
    var st = document.createElement('style'); st.id = 'jbk-css';
    st.textContent =
      '.jbk{box-sizing:border-box;width:100%;margin:0 auto;padding-top:8px;padding-bottom:0;display:flex;flex-wrap:wrap;align-items:center;column-gap:12px;row-gap:2px;font-family:inherit}' +
      '.jbk-btn{display:inline-flex;align-items:center;gap:2px;min-height:44px;padding:0 14px 0 12px;border:1px solid #D5DEEC;border-radius:12px;background:#fff;color:#4338CA;font-size:15px;font-weight:700;line-height:1.2;text-decoration:none;white-space:nowrap;cursor:pointer;-webkit-tap-highlight-color:transparent;box-shadow:0 1px 2px rgba(15,23,42,.04)}' +
      '.jbk-btn:hover{background:#F3F7FF;border-color:#B9CBF3}' +
      '.jbk-btn:focus-visible{outline:3px solid rgba(67,56,202,.35);outline-offset:2px}' +
      '.jbk-bc{display:flex;flex-wrap:wrap;align-items:center;min-width:0;font-size:13.5px;color:#6B7684;line-height:1.3}' +
      '.jbk-bc a{display:inline-flex;align-items:center;min-height:44px;color:#4E5968;text-decoration:none;padding:0 2px}' +
      '.jbk-bc a:hover{color:#4338CA;text-decoration:underline}' +
      '.jbk-bc i{font-style:normal;color:#B0B8C1;padding:0 5px}' +
      '.jbk-bc b{font-weight:700;color:#333D4B;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:60vw;display:inline-block;vertical-align:middle}' +
      '.jbk-solo{flex:none;padding-left:12px;padding-right:12px;padding-bottom:6px}' +
      '@media(max-width:420px){.jbk-btn{font-size:14.5px;padding:0 12px 0 10px}.jbk-bc{font-size:13px}}' +
      '@media print{.jbk{display:none!important}}';
    document.head.appendChild(st);
  }
  /* 본문 칸(main 또는 머리줄 다음 칸)과 같은 폭·왼쪽 여백 */
  function align() {
    if (!bar || !cont || bar.classList.contains('jbk-solo')) return;
    var cs = getComputedStyle(cont);
    bar.style.maxWidth = cs.maxWidth && cs.maxWidth !== 'none' ? cs.maxWidth : '';
    var pl = parseFloat(cs.paddingLeft) || 0, pr = parseFloat(cs.paddingRight) || 0;
    bar.style.paddingLeft = Math.max(pl, 12) + 'px';
    bar.style.paddingRight = Math.min(Math.max(pr, 12), 40) + 'px';
    if (cs.maxWidth && cs.maxWidth !== 'none' && cs.boxSizing !== 'border-box') bar.style.maxWidth = 'calc(' + cs.maxWidth + ' + ' + (pl + (parseFloat(cs.paddingRight) || 0)) + 'px)';
  }
  function state() {
    return decide({ here: { rel: HERE, search: location.search }, ref: document.referrer, origin: location.origin, nav: NAV0,
      now: Date.now(), histLen: history.length, state: history.state, names: readJ(NM_K) || {} });
  }
  function paint() {
    if (!bar) return;
    dec = state();
    btn.textContent = dec.text;
    btn.setAttribute('href', JB.SITE + (dec.mode === 'back' && dec.href ? dec.href : ''));
    btn.setAttribute('data-mode', dec.mode);
    btn.setAttribute('aria-label', dec.mode === 'home' ? '홈으로 가기' : dec.text.replace(/^←\s*/, '') + ' 돌아가기');
    if (bc) {
      var cr = crumbs(HERE, location.search, readJ(NM_K) || {});
      bc.hidden = cr.length < 2;
      bc.innerHTML = cr.map(function (c, i) {
        return (i ? '<i aria-hidden="true">›</i>' : '') + (c[1] === null ? '<b aria-current="page">' + esc(c[0]) + '</b>' : '<a href="' + esc(JB.SITE + c[1]) + '">' + esc(c[0]) + '</a>');
      }).join('');
    }
  }
  API.refresh = paint;

  function build() {
    if (HERE === null || HERE === '' || bar) return;
    var B = document.body, head = document.querySelector('body > header.top, header.top');
    if (!B || !head || B.hasAttribute('data-noback')) return;
    css();
    bar = document.createElement('nav'); bar.className = 'jbk'; bar.setAttribute('aria-label', '이전 화면과 지금 위치');
    btn = document.createElement('a'); btn.className = 'jbk-btn'; btn.setAttribute('data-track', 'nav_back');
    bar.appendChild(btn);
    if (!document.querySelector('nav.bc, .bc[aria-label="위치"]')) { bc = document.createElement('div'); bc.className = 'jbk-bc'; bar.appendChild(bc); }
    var nx = head.nextElementSibling;
    while (nx && /^(SCRIPT|STYLE|TEMPLATE|NOSCRIPT)$/.test(nx.tagName)) nx = nx.nextElementSibling;
    var mn = document.querySelector('main');
    cont = mn && mn.parentNode === head.parentNode ? mn : nx;
    if (cont) {
      var ds = getComputedStyle(cont).display;
      if (/flex|grid/.test(ds) && cont.tagName !== 'MAIN') bar.classList.add('jbk-solo');   // 지도처럼 칸 전체가 화면 높이를 채우는 곳
      cont.parentNode.insertBefore(bar, cont);
    } else { bar.classList.add('jbk-solo'); head.parentNode.insertBefore(bar, head.nextSibling); cont = null; }
    if (getComputedStyle(B).display === 'flex') bar.style.flex = 'none';
    btn.addEventListener('click', function (e) {
      if (!dec || dec.mode !== 'back' || e.metaKey || e.ctrlKey || e.shiftKey || e.button > 0) return;   // 새 탭으로 열기는 링크 그대로
      e.preventDefault();
      gesture = 0;
      var before = location.href, left = false;
      addEventListener('pagehide', function () { left = true; }, { once: true });
      history.back();
      setTimeout(function () { if (!left && location.href === before && document.visibilityState !== 'hidden') location.href = btn.getAttribute('href') || JB.SITE; }, 700);
    });
    paint(); align();
    if (dec && dec.mode === 'back' && dec.from !== 'state' && !document.referrer && history.replaceState) {
      try { var cs0 = history.state && typeof history.state === 'object' ? history.state : {}, ns0 = {}; for (var k0 in cs0) ns0[k0] = cs0[k0]; ns0.jbf = dec.href; (API._origR || history.replaceState.bind(history))(ns0, ''); } catch (e) {}
    }
    var rz = 0; addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(align, 120); });
    rememberName();
  }

  /* ---------------- 한 화면 안 흐름(탭·고른 건물) ----------------
     JDJ_BACK.inpage({ key(URL) → 문자열(바뀌면 기록 한 칸), label(URL) → 지금 화면 이름(돌아올 때 단추 글자), restore(URLSearchParams) → 그 상태로 다시 그림 })
     화면 코드는 지금처럼 history.replaceState 로 주소만 바꾸면 된다: 사람이 누른 직후(5초 안)에 key 가 바뀌면 replace 대신 push 로 쌓는다.
     처음 열 때·뒤로 가기로 되돌리는 중에는 쌓지 않는다(예전 주소 ?sd=&d=&t=v&vb= 그대로 열림). */
  var gesture = 0, restoring = false, rtimer = 0;
  ['pointerdown', 'keydown', 'change'].forEach(function (ev) { document.addEventListener(ev, function (e) { if (!(e.target && e.target.closest && e.target.closest('.jbk'))) gesture = Date.now(); }, true); });
  API.inpage = function (opt) {
    if (!opt || typeof opt.key !== 'function' || API._inpage) return;
    API._inpage = opt;
    var H = window.history, origR = H.replaceState.bind(H), origP = H.pushState.bind(H);
    API._origR = origR;
    var keyOf = function (href) { try { return String(opt.key(new URL(href, location.href))); } catch (e) { return ''; } };
    var lastKey = keyOf(location.href);
    H.replaceState = function (st, t, url) {
      var nu = url == null ? location.href : new URL(String(url), location.href).href;
      var cur = H.state && typeof H.state === 'object' ? H.state : {};
      if (!restoring && gesture && Date.now() - gesture < 5000 && keyOf(nu) !== keyOf(location.href) && !cur.jps) {
        var lbl = ''; try { lbl = opt.label ? opt.label(new URL(location.href)) : ''; } catch (e) {}
        var o = {}; if (st && typeof st === 'object') for (var k in st) o[k] = st[k];
        o.jbn = (cur.jbn || 0) + 1; o.jbl = lbl;
        origP(o, t, url);
      } else {
        var keep = null; ['jbn', 'jbl', 'jbf'].forEach(function (kk) { if (cur[kk] != null) (keep = keep || {})[kk] = cur[kk]; });
        var ns = st;
        if (keep) { if (st == null) ns = keep; else if (typeof st === 'object') { ns = {}; for (var k2 in st) ns[k2] = st[k2]; for (var k3 in keep) ns[k3] = keep[k3]; } }
        origR(ns, t, url);
      }
      lastKey = keyOf(location.href);
      paint();
    };
    addEventListener('popstate', function () {
      var k = keyOf(location.href);
      gesture = 0;
      if (k !== lastKey && typeof opt.restore === 'function') {
        restoring = true; clearTimeout(rtimer);
        try { var p = opt.restore(new URLSearchParams(location.search)); if (p && p.then) p.then(done, done); else rtimer = setTimeout(done, 1500); } catch (e) { done(); }
      }
      lastKey = k;
      function done() { clearTimeout(rtimer); rtimer = setTimeout(function () { restoring = false; lastKey = keyOf(location.href); paint(); }, 600); }
    });
  };
  addEventListener('popstate', function () { setTimeout(paint, 0); });
  addEventListener('pageshow', function (e) { if (e.persisted) paint(); });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build); else build();
})(this);
