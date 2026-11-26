/* 장대장 — 제휴 공인중개사 '카카오톡 채팅' 버튼 + PC용 QR 창
   - 링크는 https://open.kakao.com/ (오픈채팅) 또는 https://pf.kakao.com/ (카카오톡 채널)만 허용, 그 외는 버튼을 만들지 않음
   - 휴대폰(터치·좁은 화면): 카카오톡 링크로 바로 이동(새 창)
   - PC: 작은 창에 QR코드(브라우저에서 직접 그림, 외부 서버 호출 없음) + 'PC에서 열기'
   - 클릭 기록: JDJ_AGENTS.log('kakao', …) — 백엔드의 기존 '카톡' 유형으로 집계·리뷰 자격에 반영
     익명 통계: jdjStat('feature_use', {feature:'agent_chat'}) (개인정보 없음)
   - 페이지에서 후속 처리가 필요하면 document 의 'jdj:kchat' 이벤트(detail: {a, g, k})를 받으면 됨
   사용: KChat.url(kk) → 안전한 주소 또는 ''  /  KChat.btn(kk, {a, g, k, cls, label}) → 버튼 HTML 또는 '' */
(function(){
  const SELF = (document.currentScript && document.currentScript.src) || location.href;
  const LIB = new URL('vendor/qrcode-generator.js?v=1.4.4', SELF).href;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const HOSTS = ['open.kakao.com', 'pf.kakao.com'];

  function url(kk){
    const s = String(kk == null ? '' : kk).trim();
    if (!s || s.length > 200 || !/^https:\/\/(open|pf)\.kakao\.com\//.test(s) || /[\s"'<>\\`]/.test(s)) return '';
    try{
      const u = new URL(s);
      if (u.protocol !== 'https:' || HOSTS.indexOf(u.hostname) < 0 || u.username || u.password || u.port) return '';
      if (u.pathname.length < 3) return '';          // 도메인만 있는 주소는 채팅방이 아님
      return u.href;
    }catch(e){ return ''; }
  }
  const ICON = '<svg class="kchat-i" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><path fill="currentColor" d="M12 3.5C6.75 3.5 2.5 6.86 2.5 11c0 2.66 1.76 5 4.4 6.33l-.9 3.3c-.08.3.26.54.52.37l3.93-2.6c.5.06 1.02.1 1.55.1 5.25 0 9.5-3.36 9.5-7.5S17.25 3.5 12 3.5z"/></svg>';
  function btn(kk, o){
    o = o || {};
    const u = url(kk); if (!u) return '';
    return `<a class="kchat ${esc(o.cls||'')}" href="${esc(u)}" target="_blank" rel="noopener noreferrer" data-kchat="1" data-a="${esc(o.a||'')}" data-g="${esc(o.g||'')}" data-k="${esc(o.k||'')}" data-name="${esc(o.name||'')}"${o.name?` aria-label="${esc(o.name)} 카카오톡 채팅"`:''}>${ICON}<span>${esc(o.label||'카카오톡 채팅')}</span></a>`;
  }

  /* 스타일 (이 파일 하나로 어디서든 같은 모양) */
  const css = `
a.kchat{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:44px;min-width:44px;box-sizing:border-box;padding:0 14px;border-radius:12px;background:#FEE500!important;color:#191919!important;font-weight:800;font-size:14px;text-decoration:none!important;border:0;cursor:pointer;line-height:1.2;-webkit-tap-highlight-color:transparent}
a.kchat:hover{filter:brightness(.96)}
a.kchat:focus-visible{outline:3px solid #191919;outline-offset:2px}
a.kchat .kchat-i{flex:none}
a.kchat.sm{font-size:13px;padding:0 12px;border-radius:999px}
.kqr-bg{position:fixed;inset:0;background:rgba(25,25,20,.55);display:flex;align-items:center;justify-content:center;z-index:80;padding:16px}
.kqr{background:#fff;color:#191F28;border-radius:16px;max-width:320px;width:100%;padding:20px 20px 16px;text-align:center;position:relative;box-shadow:0 12px 40px rgba(0,0,0,.3);font-family:inherit}
.kqr h3{margin:0 0 4px;font-size:17px;font-weight:900}
.kqr .kqr-n{font-size:13px;color:#4E5968;margin:0 0 10px}
.kqr .kqr-c{display:inline-block;padding:10px;border:1px solid #E5E8EB;border-radius:12px;background:#fff;line-height:0}
.kqr .kqr-c svg{width:200px;height:200px;display:block}
.kqr p{margin:12px 0 10px;font-size:14px;font-weight:700;line-height:1.5}
.kqr .kqr-pc{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:0 16px;font-size:13.5px;font-weight:700;color:#4338CA;text-decoration:underline}
.kqr .kqr-x{position:absolute;right:6px;top:6px;width:44px;height:44px;border:0;background:none;font-size:22px;line-height:1;cursor:pointer;color:#4E5968;border-radius:10px}
.kqr .kqr-err{font-size:13px;color:#C2410C}
@media print{a.kchat,.kqr-bg{display:none!important}}`;
  const st = document.createElement('style'); st.id = 'kchat-css'; st.textContent = css;
  (document.head || document.documentElement).appendChild(st);

  /* QR 라이브러리는 PC에서 처음 필요할 때만 불러옴 */
  let libP = null;
  function lib(){
    if (window.qrcode) return Promise.resolve(window.qrcode);
    if (!libP) libP = new Promise((ok, no) => {
      const s = document.createElement('script'); s.src = LIB; s.async = true;
      s.onload = () => window.qrcode ? ok(window.qrcode) : no(new Error('qr'));
      s.onerror = () => { libP = null; no(new Error('qr')); };
      document.head.appendChild(s);
    });
    return libP;
  }
  function svgOf(qrcode, text){
    const q = qrcode(0, 'M'); q.addData(text, 'Byte'); q.make();
    const n = q.getModuleCount(), m = 4, size = n + m * 2;
    let d = '';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) d += `M${c+m} ${r+m}h1v1h-1z`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges" role="img" aria-label="카카오톡 채팅 QR코드"><rect width="${size}" height="${size}" fill="#fff"/><path d="${d}" fill="#000"/></svg>`;
  }

  let lastFocus = null;
  function close(){
    const bg = document.getElementById('kqr'); if (!bg) return;
    bg.remove(); document.removeEventListener('keydown', onKey, true);
    if (lastFocus && lastFocus.focus) try{ lastFocus.focus(); }catch(e){}
  }
  function onKey(e){ if (e.key === 'Escape'){ e.stopPropagation(); close(); } }
  function showQR(u, name){
    close(); lastFocus = document.activeElement;
    const bg = document.createElement('div'); bg.id = 'kqr'; bg.className = 'kqr-bg';
    bg.innerHTML = `<div class="kqr" role="dialog" aria-modal="true" aria-labelledby="kqrT"><button type="button" class="kqr-x" aria-label="닫기">×</button>
      <h3 id="kqrT">카카오톡 채팅으로 문의</h3>${name?`<div class="kqr-n">${esc(name)}</div>`:''}
      <div class="kqr-c" id="kqrC" aria-busy="true"></div>
      <p>휴대폰 카메라로 찍으면<br>카카오톡 채팅이 열려요</p>
      <a class="kqr-pc" href="${esc(u)}" target="_blank" rel="noopener noreferrer">PC에서 열기</a></div>`;
    document.body.appendChild(bg);
    bg.addEventListener('click', e => { if (e.target === bg || e.target.closest('.kqr-x')) close(); });
    document.addEventListener('keydown', onKey, true);
    bg.querySelector('.kqr-x').focus();
    lib().then(qr => { const c = document.getElementById('kqrC'); if (c){ c.innerHTML = svgOf(qr, u); c.removeAttribute('aria-busy'); } })
      .catch(() => { const c = document.getElementById('kqrC'); if (c) c.outerHTML = '<div class="kqr-err">QR코드를 그리지 못했어요. 아래 \'PC에서 열기\'를 눌러 주세요.</div>'; });
  }
  function isMobile(){
    try{ return matchMedia('(pointer:coarse)').matches || matchMedia('(max-width:760px)').matches; }catch(e){ return innerWidth <= 760; }
  }

  document.addEventListener('click', e => {
    const el = e.target.closest && e.target.closest('a[data-kchat]'); if (!el) return;
    const u = url(el.getAttribute('href'));
    if (!u){ e.preventDefault(); return; }
    const a = el.dataset.a || '', g = el.dataset.g || '', k = el.dataset.k || '';
    const A = window.JDJ_AGENTS;
    if (A && a){ A.log('kakao', a, g, k); A.flush(); }
    if (window.jdjStat) try{ jdjStat('feature_use', {feature:'agent_chat'}); }catch(err){}
    try{ document.dispatchEvent(new CustomEvent('jdj:kchat', {detail:{a, g, k, mobile:isMobile()}})); }catch(err){}
    if (isMobile()) return;                 // 휴대폰: 링크 그대로(새 창)
    e.preventDefault();
    showQR(u, el.dataset.name || '');
  });

  window.KChat = { url, btn, showQR, isMobile };
})();
