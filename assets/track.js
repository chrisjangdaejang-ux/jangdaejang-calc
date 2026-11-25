/* ===== 장대장 익명 이용 통계 (회원가입 없이) =====
   각 페이지에서 window.JDJ_CONFIG = { tool, GA4_ID, CLARITY_ID } 를 먼저 선언합니다.
   채널 구분 링크: 주소 끝에 ?utm_source=yt (또는 #yt)
   yt 유튜브 · ig 인스타그램 · blog 블로그 · fb 페이스북 · kakao 카카오톡 · naver 네이버 · cafe 카페 · threads 스레드 · band 밴드 */
/* '가족과 자세히 공유' 링크(#jv=…, assets/share.js): GA·Clarity를 켜기 전에 주소에서 # 값을 지우고 화면용으로만 넘김.
   # 뒤 값은 원래 서버로 가지 않지만, 분석 도구가 주소를 읽기 전에 없애 두어 내 금액이 어디에도 기록되지 않게 함.
   공개 값(q: 지역·단지 등, 매수가·시기 bp·bd 와 리포트의 i·c·d·n·e 제외)만 ? 뒤로 옮겨 각 화면이 원래 방식대로 복원 */
(function(){ try{
  const h = location.hash; if (h.indexOf('#jv=') !== 0) return;
  let s = h.slice(4).replace(/-/g,'+').replace(/_/g,'/'); while (s.length % 4) s += '=';
  let p = null; try{ p = h.length <= 6000 ? JSON.parse(decodeURIComponent(escape(atob(s)))) : null; }catch(_){ p = null; }
  if (!p || typeof p !== 'object' || p.v !== 1) p = null;
  const q = new URLSearchParams(location.search), PERS = p && p.t === 'report' ? ['i','c','d','n','e','bp','bd'] : ['bp','bd'];   // 리포트의 d 는 대출, 내 집 시세·전월세의 d 는 단지
  if (p && p.q && typeof p.q === 'object') for (const k of Object.keys(p.q)) if (!PERS.includes(k) && !/^utm_/.test(k)) q.set(k, String(p.q[k]));
  const qs = q.toString(), hh = p && /^[a-z]{1,12}$/.test(p.h || '') ? '#' + p.h : '';
  history.replaceState(history.state, '', location.pathname + (qs ? '?' + qs : '') + hh);
  window.JDJ_SHARED_IN = p;
}catch(_){} })();
(function(){
  const C = window.JDJ_CONFIG = window.JDJ_CONFIG || {};
  const CH = {yt:'유튜브',youtube:'유튜브',ig:'인스타그램',instagram:'인스타그램',blog:'블로그',fb:'페이스북',facebook:'페이스북',kakao:'카카오톡',naver:'네이버',cafe:'카페',threads:'스레드',band:'밴드',claude:'기존 Claude 링크'};
  const ls = {get(k){try{return localStorage.getItem(k)}catch(_){return null}}, set(k,v){try{localStorage.setItem(k,v)}catch(_){}}};
  const rid = () => Math.random().toString(36).slice(2,10)+Date.now().toString(36).slice(-4);

  // 익명 방문자 ID + 계산기별 방문 횟수 (이 브라우저 기준)
  let vid = ls.get('jdj_vid'); const isNew = !vid;
  if (!vid){ vid = rid(); ls.set('jdj_vid', vid); }
  const vk = 'jdj_visits_'+(C.tool||'calc');
  const visits = (parseInt(ls.get(vk)||'0',10)||0)+1; ls.set(vk, String(visits));

  // 유입 채널
  let src = '';
  try{ const u = new URL(location.href); src = (u.searchParams.get('utm_source')||u.searchParams.get('src')||'').toLowerCase(); }catch(_){}
  const hs = (location.hash||'').slice(1).toLowerCase();
  if (!src && CH[hs]) src = hs;
  if (!src && document.referrer){
    const r = document.referrer;
    if (/youtube\.com|youtu\.be/.test(r)) src='yt';
    else if (/instagram\.com/.test(r)) src='ig';
    else if (/facebook\.com/.test(r)) src='fb';
    else if (/naver\.com/.test(r)) src='naver';
    else if (/kakao/.test(r)) src='kakao';
  }
  if (src) ls.set('jdj_src', src); else src = ls.get('jdj_src') || '';
  const channel = CH[src] || src || '직접 방문';

  // 주소 정리: 같은 사이트 주소는 utm_*·mode 만 남기고, 다른 사이트(유입 경로)는 도메인까지만
  function J0(u){ if (!u) return ''; try{ const x = new URL(u); if (x.origin !== location.origin) return x.origin + '/';
    const q = new URLSearchParams(); for (const [k,v] of x.searchParams) if (/^utm_|^mode$/.test(k)) q.set(k, v);
    const qs = q.toString(); return x.origin + x.pathname + (qs ? '?'+qs : ''); }catch(_){ return ''; } }
  window.JDJ_CLEAN_URL = J0;
  // Google Analytics 4
  if (C.GA4_ID){
    const s = document.createElement('script'); s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id='+encodeURIComponent(C.GA4_ID);
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function(){ dataLayer.push(arguments); };
    gtag('js', new Date());
    // 주소의 계산 입력값(연소득 i·현금 c·이름 n 등)이 GA로 가지 않도록 utm·mode만 남긴 주소로 보냄
    const loc = J0(location.href), ref = J0(document.referrer);
    gtag('set', {page_location: loc, page_referrer: ref});
    gtag('config', C.GA4_ID, {page_location: loc, page_referrer: ref});
    gtag('set', 'user_properties', {visit_count: visits, first_channel: channel});
  }
  // Microsoft Clarity
  if (C.CLARITY_ID){
    (function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src='https://www.clarity.ms/tag/'+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,'clarity','script',C.CLARITY_ID);
    clarity('set','channel',channel); clarity('set','visit_count',String(visits));
  }

  const done = {}; let rt = null;
  const J = window.JDJ = {
    channel, visits, isNew,
    band(m){ if(!m) return '0'; const e=m/10000; return e<3?'3억 미만':e<6?'3~6억':e<9?'6~9억':e<12?'9~12억':e<15?'12~15억':e<25?'15~25억':'25억 이상'; },
    track(ev, p){
      const params = Object.assign({tool:C.tool, channel, visit_count:visits}, p||{});
      if (window.gtag) gtag('event', ev, params);
      if (window.clarity) clarity('event', ev);
      done[ev] = (done[ev]||0)+1;
      if (window.JDJ_DEBUG) console.log('[JDJ]', ev, params);
    },
    once(ev, p){ if (!done[ev]) J.track(ev, p); },
    label(){ return '유입: '+channel+' · '+visits+'번째 방문'; }
  };

  J.track('calc_open', {returning: !isNew});
  function interacted(){
    J.once('calc_start'); clearTimeout(rt);
    rt = setTimeout(()=>{ let info={}; try{ if (typeof C.info==='function') info=C.info(); }catch(_){} J.track('calc_result', info); }, 3000);
  }
  document.addEventListener('input', e=>{ if(!e.target.closest('.grid')) return; if(e.target.dataset.track) J.once(e.target.dataset.track); interacted(); });
  document.addEventListener('change', e=>{ if(e.target.closest('.grid')) interacted(); });
  document.addEventListener('click', e=>{
    const t = e.target.closest('[data-track]');
    if (t && t.tagName!=='INPUT'){ J.track(t.dataset.track); return; }
    if (e.target.closest('.seg')) interacted();
  });
})();
/* 머리줄 '공유' 단추(assets/share-head.js): 이 파일을 쓰는 모든 화면(자동으로 만든 단지·지역 화면 포함)에 한 번만 붙임.
   화면에 직접 <script src=".../share-head.js"> 가 있으면 그것을 씀. 주소는 이 파일(track.js) 위치 기준. */
(function(){ try{
  if (window.JDJ_SHEAD || document.querySelector('script[src*="share-head.js"]')) return;
  const me = document.currentScript && document.currentScript.src;
  if (!me || !/\/assets\/track\.js/.test(me)) return;
  const s = document.createElement('script'); s.src = me.replace(/track\.js(\?[^#]*)?$/, 'share-head.js?v=1'); s.async = true;
  (document.head || document.documentElement).appendChild(s);
}catch(_){} })();
