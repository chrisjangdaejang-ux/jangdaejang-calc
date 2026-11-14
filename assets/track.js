/* ===== 장대장 익명 이용 통계 (회원가입 없이) =====
   각 페이지에서 window.JDJ_CONFIG = { tool, GA4_ID, CLARITY_ID } 를 먼저 선언합니다.
   채널 구분 링크: 주소 끝에 ?utm_source=yt (또는 #yt)
   yt 유튜브 · ig 인스타그램 · blog 블로그 · fb 페이스북 · kakao 카카오톡 · naver 네이버 · cafe 카페 · threads 스레드 · band 밴드 */
(function(){
  const C = window.JDJ_CONFIG = window.JDJ_CONFIG || {};
  const CH = {yt:'유튜브',youtube:'유튜브',ig:'인스타그램',instagram:'인스타그램',blog:'블로그',fb:'페이스북',facebook:'페이스북',kakao:'카카오톡',naver:'네이버',cafe:'카페',threads:'스레드',band:'밴드'};
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

  // Google Analytics 4
  if (C.GA4_ID){
    const s = document.createElement('script'); s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id='+encodeURIComponent(C.GA4_ID);
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function(){ dataLayer.push(arguments); };
    gtag('js', new Date());
    gtag('config', C.GA4_ID);
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
