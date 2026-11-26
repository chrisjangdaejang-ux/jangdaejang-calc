/* 집예보 머리줄 '공유' 단추 — 모든 화면(휴대폰·PC) 상단 header.top 오른쪽에 늘 보이는 공유 단추
   - 불러오는 곳: assets/track.js 가 스스로 이 파일을 붙임(직접 만든 화면 + 자동으로 만든 단지·지역 화면 모두). 직접 <script> 로 넣어도 한 번만 동작.
   - 누르면: 휴대폰은 휴대폰 공유창(Web Share API — 카카오톡·문자 등, 휴대폰이 보여 주는 앱), PC 는 링크 복사 + '링크를 복사했어요' 알림.
     알림에는 '카카오톡으로 보내기'(assets/config.js KAKAO_JS_KEY 가 있을 때만, 카카오 공유 SDK 는 누를 때 불러옴)와
     첫 화면에서는 '카드 이미지 저장'(assets/share.js 카드 그림, 개인 숫자 없음).
   - 결과 화면(assets/share.js setup·update 를 쓰는 화면)에 결과가 나와 있으면 그 결과 요약 공유(요약/가족과 자세히 고르기)를 그대로 씀.
   - 공유 주소: 지금 화면 주소 + 공개 값만(단지·지역 같은 값) + utm_source=share · utm_medium=user_share · utm_campaign=home|page.
     개인 금융값(연소득·현금·대출·이름·기타 비용·매수가·매수 시기)과 # 뒤 값은 싣지 않음. 개인 화면(로그인·내 정보·결제·관리)에는 단추를 만들지 않음.
   - 통계: share_click {tool: home|page, place: header|home_cta, method: share|copy|kakao|image}
   - 첫 화면 '집예보를 친구에게 알려 주세요' 칸: [data-jsh-home] 단추를 누르면 같은 방식(place=home_cta). */
(function (root) {
  'use strict';
  if (root.JDJ_SHEAD && root.JDJ_SHEAD.v) return;
  var JB = (typeof window !== 'undefined' && window.JDJ_BASE) || (function (p) { var g = p.indexOf('/jangdaejang-calc/') === 0, b = { SITE: g ? '/jangdaejang-calc/' : '/', DATA: g ? '/jangdaejang-data/' : 'https://chrisjangdaejang-ux.github.io/jangdaejang-data/' }; if (typeof window !== 'undefined') window.JDJ_BASE = b; return b; })((typeof location !== 'undefined' && location.pathname) || '/jangdaejang-calc/');
  var SITE_URL = 'https://chrisjangdaejang-ux.github.io/jangdaejang-calc/';
  function siteUrl() { var u = String(((root.JDJ_SITE) || {}).SITE_URL || '').trim(); return /^https:\/\//.test(u) ? u.replace(/\/+$/, '') + '/' : SITE_URL; }

  /* 개인 화면: 단추를 만들지 않음(로그인·내 정보·결제·구독 관리·운영자·초안) */
  var PRIVATE = /^(login|my|premium\/(checkout|success|fail|view|r|pro)|brief\/(manage|paid|c|subscribe)|agent\/(my|sheet|listing|content)|dongne\/(admin|my)|community\/admin|counsel\/(admin|heart|expert|chat)|[^?#]*draft)(\/|$)/;
  /* 주소에 남겨도 되는 공개 값(단지·지역·화면 탭). 'd' 는 맞춤 리포트(buy/)에서는 대출 금액이라 뺌 */
  var PUBLIC_KEYS = ['id', 'no', 'g', 'k', 'sd', 't', 'tab', 'b', 'a', 'd'];
  var NEVER = ['i', 'c', 'n', 'e', 'bp', 'bd'];

  function rel(path) { var p = String(path || '').replace(/index\.html$/, ''); return p.indexOf(JB.SITE) === 0 ? p.slice(JB.SITE.length) : p.replace(/^\//, ''); }
  function isPrivate(path) { return PRIVATE.test(rel(path)); }
  function isHome(path) { return rel(path) === ''; }

  /* 공유 링크: 화면 주소(대표 주소 기준) + 공개 값 + utm */
  function pageLink(loc, o) {
    o = o || {};
    loc = loc || root.location;
    var r = rel(loc.pathname), u = new URL(r, o.base || siteUrl());
    var q = new URLSearchParams(loc.search || '');
    q.forEach(function (v, k) {
      if (NEVER.indexOf(k) >= 0 || PUBLIC_KEYS.indexOf(k) < 0 || !v) return;
      if (k === 'd' && /^buy(\/|$)/.test(r)) return;
      if (v.length > 80) return;
      u.searchParams.set(k, v);
    });
    u.searchParams.set('utm_source', 'share');
    u.searchParams.set('utm_medium', 'user_share');
    u.searchParams.set('utm_campaign', r === '' ? 'home' : 'page');
    return u.href;
  }
  function meta(sel) { try { var m = root.document.querySelector(sel); return m ? String(m.getAttribute('content') || '').trim() : ''; } catch (e) { return ''; } }
  function short(s, n) { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1).replace(/[\s·,]+$/, '') + '…' : s; }
  /* 제목·설명: og:title → 문서 제목, og:description → 설명 */
  function pageInfo() {
    var d = root.document, home = isHome(root.location.pathname);
    var title = meta('meta[property="og:title"]') || d.title || '집예보';
    if (!/집예보/.test(title)) title = title + ' · 집예보';
    var desc = meta('meta[property="og:description"]') || meta('meta[name="description"]') || '공공데이터로 내 집값의 내일을 풀어 보는 집예보예요.';
    if (home) { title = '집예보 — 공공데이터로 내 집값의 내일을 풉니다'; desc = '우리 동네·단지가 앞으로 더 오를 가능성을 공공 통계로 미리 볼 수 있어요. 대출 한도·내 집 시세·청약·전월세까지 무료예요.'; }
    var img = meta('meta[property="og:image"]');
    if (!/^https:\/\//.test(img)) img = siteUrl() + 'assets/og/' + (home ? 'home' : 'default') + '.png';
    return { title: short(title, 60), text: short(desc, 110), image: img, home: home };
  }
  /* 첫 화면 카드 그림 요약(개인 숫자 없음) */
  var HOME_CARD = {
    head: '공공데이터로 내 집값의 내일을\u00a0풉니다',   // 줄바꿈이 '풉니다' 한 단어만 남기지 않게(붙은 칸)
    lines: ['우리 동네·단지가 앞으로 더 오를 가능성을 미리 봐요', '대출 한도·내 집 시세·청약·전월세까지 한곳에서', '회원가입 없이 바로 써 볼 수 있어요']
  };

  /* ---------- 통계 ---------- */
  function stat(place, method, tool) {
    var p = { tool: tool, place: place, method: method, mode: 'summary' };
    try { if (root.jdjStat) { root.jdjStat('share_click', p); return; } if (root.gtag) root.gtag('event', 'share_click', p); } catch (e) {}
  }

  /* ---------- 화면 ---------- */
  var ICON = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="M7.5 7.5 12 3l4.5 4.5"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg>';
  var KICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 3.5c-5 0-9 3.1-9 7 0 2.5 1.7 4.7 4.2 6l-1 3.6c-.1.3.3.6.6.4l4.2-2.8c.3 0 .7.1 1 .1 5 0 9-3.1 9-7s-4-7.3-9-7.3z"/></svg>';
  var CSS = ''
    + '.jsh-grp{display:flex;align-items:center;gap:8px;min-width:0}.jdj-right>.jsh-grp{order:-1}'
    + '.jsh-btn{font:inherit;display:inline-flex;align-items:center;justify-content:center;gap:5px;flex:none;min-width:44px;min-height:44px;padding:0 12px;border:1px solid #C9D8FB;border-radius:999px;background:#EEF3FF;color:#1E4FCC;font-size:14.5px;font-weight:800;letter-spacing:-.2px;cursor:pointer;white-space:nowrap;line-height:1}'
    + '.jsh-btn svg{width:18px;height:18px;flex:none}.jsh-btn:hover{background:#E1EAFF}.jsh-btn:focus-visible{outline:3px solid #4338CA;outline-offset:2px}'
    + 'header.top>.jsh-btn{margin-left:auto}'
    + '@media(max-width:359px){.jsh-btn{padding:0 10px}.jsh-btn span{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}}'
    + '.jsh-toast{position:fixed;left:50%;bottom:calc(24px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:1001;width:max-content;max-width:min(92vw,480px);background:#191F28;color:#fff;border-radius:14px;padding:12px 48px 12px 14px;font-size:15px;line-height:1.5;box-shadow:0 8px 24px rgba(0,0,0,.22);display:flex;flex-wrap:wrap;gap:8px 12px;align-items:center}'
    + 'body.jtab-pad .jsh-toast{bottom:calc(72px + env(safe-area-inset-bottom))}'
    + '@media(min-width:1024px){body.jtab-pad .jsh-toast{bottom:24px}}'
    + '.jsh-toast[hidden]{display:none}.jsh-toast .m{flex:1 1 220px;min-width:0}'
    + '.jsh-toast .acts{display:flex;flex-wrap:wrap;gap:8px}'
    + '.jsh-toast button{font:inherit;min-height:44px;padding:0 14px;border:0;border-radius:10px;font-size:14.5px;font-weight:800;cursor:pointer;display:inline-flex;align-items:center;gap:6px;white-space:nowrap}'
    + '.jsh-toast .kk{background:#FEE500;color:rgba(0,0,0,.85)}.jsh-toast .kk svg{width:18px;height:18px}.jsh-toast .im{background:#333D4B;color:#fff}'
    + '.jsh-toast .x{position:absolute;top:2px;right:2px;background:none;color:#fff;opacity:.75;min-width:44px;padding:0;font-size:20px;justify-content:center}'
    + '@media print{.jsh-btn,.jsh-toast{display:none!important}}';
  function css() {
    var d = root.document; if (d.getElementById('jshCss')) return;
    var s = d.createElement('style'); s.id = 'jshCss'; s.textContent = CSS; d.head.appendChild(s);
  }
  /* 머리줄 오른쪽에 붙이기: 로그인 칸(.jdj-right)이 있으면 그 맨 앞, 없으면 오른쪽 칸들을 한 묶음(.jsh-grp)으로 */
  function mount() {
    var d = root.document, h = d.querySelector('header.top');
    if (!h || h.hasAttribute('data-noshare') || isPrivate(root.location.pathname)) return null;
    var b = h.querySelector('.jsh-btn');
    if (b) return b;
    css();
    b = d.createElement('button'); b.type = 'button'; b.className = 'jsh-btn'; b.setAttribute('data-jsh', 'header');
    b.setAttribute('aria-label', '이 화면 공유하기'); b.innerHTML = ICON + '<span>공유</span>';
    var right = h.querySelector(':scope > .jdj-right');
    if (right) { var g0 = d.createElement('div'); g0.className = 'jsh-grp'; g0.appendChild(b); right.insertBefore(g0, right.firstChild); }
    else {
      var brand = h.querySelector(':scope > .brand, :scope > .logo');
      var rest = [].slice.call(h.children).filter(function (c) { return c !== brand && !/^(NAV|SCRIPT|STYLE)$/.test(c.tagName) && !c.classList.contains('jbk'); });
      var hasNav = !!h.querySelector(':scope > nav');
      if (!rest.length && hasNav) h.appendChild(b);          // 자동 생성 화면(.logo + nav): 맨 끝
      else { var g = d.createElement('div'); g.className = 'jsh-grp'; h.appendChild(g); rest.forEach(function (c) { g.appendChild(c); }); g.appendChild(b); }
    }
    /* 결과 화면 공용 모듈이 먼저 붙인 상단 아이콘은 이 단추로 하나로 합침 */
    [].slice.call(h.querySelectorAll('.jshare-top')).forEach(function (x) { x.remove(); });
    return b;
  }

  var toastT = null;
  function toast(msg, acts) {
    var d = root.document, el = d.getElementById('jshToast');
    css();
    if (!el) { el = d.createElement('div'); el.id = 'jshToast'; el.className = 'jsh-toast'; el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite'); d.body.appendChild(el); }
    el.innerHTML = '<span class="m"></span><span class="acts"></span><button type="button" class="x" aria-label="알림 닫기">×</button>';
    el.querySelector('.m').textContent = msg;
    var box = el.querySelector('.acts');
    (acts || []).forEach(function (a) {
      var b = d.createElement('button'); b.type = 'button'; b.className = a.cls || ''; b.innerHTML = (a.icon || '') + '<span></span>';
      b.querySelector('span').textContent = a.label; b.onclick = function () { a.run(); }; box.appendChild(b);
    });
    if (!box.children.length) box.remove();
    el.querySelector('.x').onclick = function () { el.hidden = true; };
    el.hidden = false;
    clearTimeout(toastT); toastT = setTimeout(function () { el.hidden = true; }, acts && acts.length ? 9000 : 5000);
    return el;
  }

  /* ---------- 카카오톡으로 보내기(키가 있을 때만, SDK 는 필요할 때 불러옴) ---------- */
  var SDK = 'https://t1.kakaocdn.net/kakao_js_sdk/2.8.5/kakao.min.js', SRI = 'sha384-v6JKY3z4FUkWq21oZDHZe74YvuPk/WUrVLrDHTBojHXClOSa3iXy7sCXPY1jkFbj';
  var sdkP = null;
  function kakaoKey() { return String(((root.JDJ_SITE) || {}).KAKAO_JS_KEY || '').trim(); }
  function kakaoSdk() {
    var key = kakaoKey();
    if (!key) return Promise.reject(new Error('nokey'));
    var ready = function () { var K = root.Kakao; if (!K || !K.Share) throw new Error('sdk'); if (!K.isInitialized()) K.init(key); return K; };
    if (root.Kakao && root.Kakao.Share) { try { return Promise.resolve(ready()); } catch (e) { return Promise.reject(e); } }
    if (!sdkP) sdkP = new Promise(function (ok, no) {
      var s = root.document.createElement('script'); s.src = SDK; s.integrity = SRI; s.crossOrigin = 'anonymous'; s.async = true;
      s.onload = function () { try { ok(ready()); } catch (e) { sdkP = null; no(e); } };
      s.onerror = function () { sdkP = null; no(new Error('sdk')); };
      root.document.head.appendChild(s);
    });
    return sdkP;
  }
  function kakaoSend(o) {
    return kakaoSdk().then(function (K) {
      var link = { mobileWebUrl: o.url, webUrl: o.url };
      K.Share.sendDefault({ objectType: 'feed',
        content: { title: o.title, description: o.text, imageUrl: o.image, imageWidth: 1200, imageHeight: 630, link: link },
        buttons: [{ title: '집예보에서 보기', link: link }] });
      stat(o.place, 'kakao', o.tool);
      return 'kakao';
    });
  }

  /* ---------- 공유 ---------- */
  function copyText(s) {
    var nav = root.navigator || {};
    function fallback() {
      try {
        var d = root.document, ta = d.createElement('textarea'); ta.value = s; ta.setAttribute('readonly', '');
        ta.style.position = 'fixed'; ta.style.opacity = '0'; d.body.appendChild(ta); ta.select();
        var ok = d.execCommand('copy'); ta.remove(); return ok ? 'copy' : 'fail';
      } catch (e) { return 'fail'; }
    }
    if (nav.clipboard && nav.clipboard.writeText) return nav.clipboard.writeText(s).then(function () { return 'copy'; }, fallback);
    return Promise.resolve(fallback());
  }
  function homeBlob(url) {
    var S = root.JDJ_SHARE;
    if (!S || !S.cardBlob) return Promise.resolve(null);
    return S.cardBlob('home', HOME_CARD, url);
  }
  function saveBlob(b, name) {
    if (!b) return;
    var u = URL.createObjectURL(b), a = root.document.createElement('a'); a.href = u; a.download = name;
    root.document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(u); }, 4000);
  }
  function imageAct(o) {
    if (!o.card) return null;
    return { label: '카드 이미지 저장', cls: 'im', run: function () {
      homeBlob(o.url).then(function (b) {
        if (!b) return;
        var nav = root.navigator || {}, f = null, can = false;
        try { f = new root.File([b], 'jibyebo-home.png', { type: 'image/png' }); can = !!(nav.share && nav.canShare && nav.canShare({ files: [f] })); } catch (e) { can = false; }
        if (can) nav.share({ files: [f], title: o.title }).then(function () { stat(o.place, 'image', o.tool); }, function (e) { if (!(e && e.name === 'AbortError')) saveBlob(b, 'jibyebo-home.png'); });
        else { saveBlob(b, 'jibyebo-home.png'); stat(o.place, 'image', o.tool); }
      });
    } };
  }
  function kakaoAct(o) {
    if (!kakaoKey()) return null;
    kakaoSdk().catch(function () {});                     // 미리 불러 두기(누르는 순간 바로 열리게)
    return { label: '카카오톡으로 보내기', cls: 'kk', icon: KICON, run: function () {
      kakaoSend(o).catch(function () { toast('카카오톡을 열지 못했어요. 복사한 링크를 카카오톡 대화창에 붙여 넣어 주세요.'); });
    } };
  }
  /* 지금 화면 공유: place = header | home_cta */
  function sharePage(place) {
    var info = pageInfo(), url = pageLink(root.location);
    var o = { url: url, title: info.title, text: info.text, image: info.image, place: place, tool: info.home ? 'home' : 'page', card: info.home && !!(root.JDJ_SHARE && root.JDJ_SHARE.cardBlob) };
    var nav = root.navigator || {};
    function copyTell() {
      return copyText(url).then(function (r) {
        if (r === 'copy') {
          stat(place, 'copy', o.tool);
          toast('링크를 복사했어요. 카카오톡·문자에 붙여 넣어 보내 주세요.', [kakaoAct(o), imageAct(o)].filter(Boolean));
        } else toast('복사가 안 됐어요. 주소창의 링크를 길게 눌러 복사해 주세요.', [kakaoAct(o)].filter(Boolean));
        return r;
      });
    }
    /* 휴대폰: 휴대폰 공유창(카카오톡·문자 등). PC(마우스)에서는 바로 링크 복사 — PC 공유창은 고를 앱이 거의 없어서 */
    var touch = false;
    try { touch = !!(root.matchMedia && root.matchMedia('(pointer:coarse)').matches); } catch (e) {}
    if (nav.share && touch) {
      return nav.share({ title: o.title, text: o.text, url: url }).then(function () {
        stat(place, 'share', o.tool);
        if (o.card) toast('링크를 보냈어요. 집예보 소개 카드 사진도 보내려면', [imageAct(o)]);
        return 'share';
      }, function (e) {
        if (e && e.name === 'AbortError') return 'cancel';
        return copyTell();
      });
    }
    return copyTell();
  }
  /* 머리줄 단추: 결과 화면에 결과가 있으면 결과 요약 공유, 아니면 지금 화면 공유 */
  function onHeader(btn) {
    var S = root.JDJ_SHARE;
    try { if (S && S.headerRun && S.headerRun(btn)) return Promise.resolve('result'); } catch (e) {}
    return sharePage('header');
  }

  function start() {
    mount();
    /* 로그인 칸·자동 생성 머리줄이 나중에 바뀌어도 단추가 남게 한 번 더 */
    setTimeout(mount, 800);
  }
  if (typeof document !== 'undefined') {
    root.document.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-jsh]'); if (!b) return;
      e.preventDefault();
      if (b.getAttribute('data-jsh') === 'header') onHeader(b); else sharePage('home_cta');
    });
    if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', start); else start();
  }

  var api = { v: 1, pageLink: pageLink, pageInfo: pageInfo, isPrivate: isPrivate, isHome: isHome, rel: rel, sharePage: sharePage, mount: mount, HOME_CARD: HOME_CARD, PUBLIC_KEYS: PUBLIC_KEYS };
  root.JDJ_SHEAD = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
