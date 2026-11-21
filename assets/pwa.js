/* 장대장 계산기: 홈 화면에 추가(PWA) — 서비스 워커 등록 + 설치 안내 바 */
(function () {
  var JB = (typeof window !== 'undefined' && window.JDJ_BASE) || (function (p) { var g = p.indexOf('/jangdaejang-calc/') === 0, b = { SITE: g ? '/jangdaejang-calc/' : '/', DATA: g ? '/jangdaejang-data/' : 'https://chrisjangdaejang-ux.github.io/jangdaejang-data/' }; if (typeof window !== 'undefined') window.JDJ_BASE = b; return b; })((typeof location !== 'undefined' && location.pathname) || '/jangdaejang-calc/');
  const noBar = !!(document.currentScript && document.currentScript.hasAttribute('data-nobar'));
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register(JB.SITE + 'sw.js', { scope: JB.SITE }).catch(() => {}));
  }
  const ua = navigator.userAgent || '';
  const standalone = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  const isIOS = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const inApp = /KAKAOTALK|NAVER\(inapp|Instagram|FBAN|FBAV|BAND\/|Line\/|DaumApps|everytimeApp/i.test(ua);
  const isMobile = /Android|iPhone|iPad|iPod/.test(ua) || isIOS;
  const ga = (n, p) => { try { window.gtag && gtag('event', n, p || {}); } catch (e) {} };
  const isAndroid = /Android/i.test(ua);
  const isKakao = /KAKAOTALK/i.test(ua), isLine = /Line\//i.test(ua), isSamsung = /SamsungBrowser/i.test(ua);

  /* 앱 안 브라우저(카톡·밴드·네이버 등)로 열리면 자동으로 크롬/사파리로 옮겨 연다 */
  function externalUrl() {
    const u = new URL(location.href); u.searchParams.set('ext', '1'); return u.toString();
  }
  function openExternal() {
    const url = externalUrl();
    if (isKakao && !isAndroid) { location.href = 'kakaotalk://web/openExternal?url=' + encodeURIComponent(url); return true; }
    if (isLine) { location.href = url + '&openExternalBrowser=1'; return true; }
    if (isAndroid) {
      const u = new URL(url);
      location.href = 'intent://' + u.host + u.pathname + u.search + '#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=' + encodeURIComponent(url) + ';end';
      return true;
    }
    return false;                                                  // 아이폰 일반 인앱(카톡 제외)은 자동 전환 불가
  }
  const fromExt = new URLSearchParams(location.search).has('ext');
  if (inApp && !fromExt && !noBar) {
    let moved = false;
    try { moved = openExternal(); } catch (e) {}
    if (moved) ga('inapp_redirect', { kakao: isKakao, android: isAndroid });
  }
  const KEY = 'jdj_pwa_hide';
  const hidden = () => { try { return +localStorage.getItem(KEY) > Date.now(); } catch (e) { return false; } };
  const hideFor = d => { try { localStorage.setItem(KEY, Date.now() + d * 864e5); } catch (e) {} };
  let deferred = null, bar = null;

  if (standalone) { ga('pwa_open'); return; }

  const css = `.jdjpwa{position:fixed;left:12px;right:12px;bottom:12px;z-index:9999;background:#191F28;color:#FFFFFF;border-radius:16px;
    box-shadow:0 8px 28px rgba(0,0,0,.28);padding:12px 12px 12px 14px;display:flex;align-items:center;gap:10px;font:14px/1.45 'Noto Sans KR',sans-serif;max-width:560px;margin:0 auto}
    .jdjpwa img{width:42px;height:42px;border-radius:10px;flex:none}
    .jdjpwa .tx{flex:1;min-width:0}.jdjpwa .tx b{display:block;font-weight:900;font-size:15.5px}.jdjpwa .tx small{opacity:.8;font-size:13.5px}
    .jdjpwa .go{flex:none;background:#2F6BFF;color:#FFFFFF;min-height:44px;border:0;border-radius:9px;padding:9px 13px;font:inherit;font-weight:900;cursor:pointer}
    .jdjpwa .x{flex:none;background:none;border:0;color:#FFFFFF;min-width:44px;min-height:44px;opacity:.7;font-size:20px;cursor:pointer;padding:0 2px}
    .jdjpwa-how{position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.55);display:flex;align-items:flex-end;justify-content:center}
    .jdjpwa-how .bx{background:#FFFFFF;color:#191F28;border-radius:16px 16px 0 0;padding:20px 20px 28px;max-width:560px;width:100%;font:15px/1.6 'Noto Sans KR',sans-serif}
    .jdjpwa-how h3{margin:0 0 10px;font-size:18px;font-weight:900}.jdjpwa-how ol{margin:0;padding-left:20px;display:grid;gap:6px}
    .jdjpwa-how .ok{margin-top:16px;width:100%;background:#2F6BFF;color:#FFFFFF;border:0;border-radius:14px;padding:12px;min-height:52px;font:inherit;font-weight:900;cursor:pointer}
    .jdjpwa-how .k{display:inline-block;border:1.5px solid #191F28;border-radius:5px;padding:0 6px;font-weight:900}`;

  function addCss() { if (!document.getElementById('jdjpwa-css')) { const s = document.createElement('style'); s.id = 'jdjpwa-css'; s.textContent = css; document.head.appendChild(s); } }
  function how() {
    addCss();
    let steps;
    if (inApp) steps = isIOS
      ? ['오른쪽 아래(또는 위) <span class="k">⋯</span> 버튼을 누르세요', '<b>Safari로 열기</b>를 고르세요', 'Safari에서 아래 <span class="k">공유 ↑</span> → <b>홈 화면에 추가</b>']
      : ['오른쪽 위 <span class="k">⋮</span> 버튼을 누르세요', '<b>다른 브라우저로 열기</b>(Chrome)를 고르세요', 'Chrome에서 <span class="k">⋮</span> → <b>홈 화면에 추가</b>'];
    else if (isIOS) steps = ['화면 아래(또는 위) <span class="k">공유 ↑</span> 버튼을 누르세요', '목록을 내려 <b>홈 화면에 추가</b>를 누르세요', '오른쪽 위 <b>추가</b>를 누르면 끝!'];
    else if (isSamsung) steps = ['화면 아래 메뉴 <span class="k">≡</span> 버튼을 누르세요', '<b>현재 페이지 추가</b> → <b>홈 화면</b>을 누르세요'];
    else steps = ['오른쪽 위 <span class="k">⋮</span> 버튼을 누르세요', '<b>홈 화면에 추가</b> 또는 <b>앱 설치</b>를 누르세요'];
    const m = document.createElement('div'); m.className = 'jdjpwa-how';
    m.innerHTML = `<div class="bx"><h3>홈 화면에 추가하기</h3>${inApp ? '<p style="margin:0 0 8px">지금은 앱 안의 브라우저라 바로 추가할 수 없어요. 아래처럼 열어 주세요.</p>' : ''}<ol>${steps.map(s => `<li>${s}</li>`).join('')}</ol>
      <p style="margin:12px 0 0;font-size:14px;color:#4E5968">설치는 무료이고, 앱처럼 아이콘을 눌러 바로 계산기를 열 수 있어요.</p><button class="ok">알겠어요</button></div>`;
    m.onclick = e => { if (e.target === m || e.target.classList.contains('ok')) m.remove(); };
    document.body.appendChild(m); ga('pwa_howto', { inapp: inApp, ios: isIOS });
  }

  function toChrome() {
    const u = new URL(externalUrl());
    location.href = 'intent://' + u.host + u.pathname + u.search + '#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=' + encodeURIComponent(u.toString()) + ';end';
  }
  /* 삼성 인터넷은 기기·버전에 따라 '웹 앱을 설치할 수 없음'이 뜨는 경우가 있어 크롬 설치를 먼저 권한다 */
  function samsungSheet() {
    addCss();
    const m = document.createElement('div'); m.className = 'jdjpwa-how';
    m.innerHTML = `<div class="bx"><h3>홈 화면에 추가하기</h3>
      <p style="margin:0 0 12px">삼성 인터넷에서는 설치가 안 되는 경우가 있어요. <b>크롬으로 열면 한 번에 설치</b>됩니다.</p>
      <button class="ok" data-a="chrome">크롬으로 열어서 설치하기 (추천)</button>
      <button class="ok" data-a="here" style="background:#fff;color:#2F6BFF;border:1px solid #E5E8EB;margin-top:8px">삼성 인터넷에서 바로 추가</button>
      <p style="margin:12px 0 0;font-size:13.5px;color:#4E5968">삼성 인터넷에서 '설치할 수 없음'이 뜨면: 아래 메뉴 <span class="k">≡</span> → <b>현재 페이지 추가</b> → <b>홈 화면</b></p></div>`;
    m.onclick = async e => {
      const a = e.target.getAttribute && e.target.getAttribute('data-a');
      if (e.target === m) return m.remove();
      if (a === 'chrome') { ga('pwa_samsung_to_chrome'); toChrome(); m.remove(); }
      if (a === 'here') { m.remove(); if (deferred) { deferred.prompt(); ga('pwa_prompt', { samsung: true }); const r = await deferred.userChoice.catch(() => null); deferred = null; if (r && r.outcome === 'accepted') { ga('pwa_install'); close(30); } } else how(); }
    };
    document.body.appendChild(m); ga('pwa_samsung_sheet');
  }

  async function install() {
    if (isSamsung && isAndroid) return samsungSheet();
    if (deferred) {
      deferred.prompt(); ga('pwa_prompt');
      const r = await deferred.userChoice.catch(() => null); deferred = null;
      if (r && r.outcome === 'accepted') { ga('pwa_install'); close(30); }
    } else if (inApp && openExternal()) { ga('inapp_redirect_click'); }
    else how();
  }
  function close(days) { if (bar) bar.remove(); bar = null; hideFor(days); }
  function show(force) {
    if (bar || (!force && hidden())) return;
    if (!force && !isMobile && !deferred) return;                 // PC는 설치 가능할 때만
    addCss();
    bar = document.createElement('div'); bar.className = 'jdjpwa';
    bar.innerHTML = `<img src="${JB.SITE}assets/icons/icon-192.png" alt=""><div class="tx"><b>홈 화면에 추가하세요</b><small>앱처럼 아이콘 한 번에 계산기를 열 수 있어요</small></div>
      <button class="go">추가하기</button><button class="x" aria-label="닫기">×</button>`;
    bar.querySelector('.go').onclick = install;
    bar.querySelector('.x').onclick = () => { close(7); ga('pwa_dismiss'); };
    document.body.appendChild(bar); ga('pwa_bar');
  }
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; });
  window.addEventListener('appinstalled', () => { ga('pwa_install'); close(365); });
  window.JDJ_PWA = { show: () => show(true), install };
  // 계산기를 조금 써 본 뒤(12초 또는 화면을 내린 뒤) 한 번만 안내
  if (noBar) return;
  let t = setTimeout(() => show(false), fromExt ? 2500 : 12000);
  window.addEventListener('scroll', function f() { if (scrollY > 600) { clearTimeout(t); window.removeEventListener('scroll', f); setTimeout(() => show(false), 1500); } }, { passive: true });
})();
