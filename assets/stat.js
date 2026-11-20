/* ===== 장대장 익명 이용 통계 (광고 영업용 집계) =====
   - 회원가입이 없으므로 개인을 식별하지 않는 '구간(밴드)' 값만 GA4 맞춤 이벤트로 보냅니다.
   - 사용법: jdjStat('feature_use', {feature:'report'})
             jdjStat('interest_profile', {sido:'서울', sgg:'강남구', budget_band:jdjStat.band(95000), hold_band:jdjStat.hold(5), home_own:jdjStat.own('none')})
   - 아래 허용 목록에 없는 이벤트·파라미터, 형식이 맞지 않는 값(정확한 금액·주소·이름·자유 입력 등)은 전송 전에 버립니다.
   - 같은 이벤트·같은 값은 한 페이지에서 한 번만 보냅니다(이벤트별 상한도 있음).
   - GA4 로딩은 assets/track.js 가 합니다(각 페이지 JDJ_CONFIG.GA4_ID). 운영자가 ID를 바꿀 때는 아래 GA4_ID 상수 하나만 고치면
     JDJ_CONFIG에 ID가 없는 새 페이지(예: tax/)에서도 이 상수로 GA4가 켜집니다.
   - 운영자 안내: tools/stats-guide.md */
(function(){
  const GA4_ID = 'G-V2VR9VL7EM';            // ← GA4 측정 ID (공개되어도 되는 값)
  const C = window.JDJ_CONFIG = window.JDJ_CONFIG || {};
  const PAGE = C.tool || (location.pathname.split('/').filter(Boolean)[1] || 'home');

  /* GA4가 아직 없으면(새 페이지가 track.js 없이 stat.js만 넣은 경우) 직접 켭니다 */
  if (!window.gtag && GA4_ID && !C.NO_GA){
    const s = document.createElement('script'); s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id='+encodeURIComponent(GA4_ID);
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function(){ dataLayer.push(arguments); };
    gtag('js', new Date());
    const clean = window.JDJ_CLEAN_URL ? window.JDJ_CLEAN_URL(location.href) : location.origin+location.pathname;
    gtag('set', {page_location: clean, page_referrer: ''});
    gtag('config', GA4_ID, {page_location: clean});
  }

  /* ---------- 구간 만들기 ---------- */
  const OWN = {none:'무주택', first:'생애최초', one:'1주택', multi:'다주택', own:'유주택', '0':'무주택', '1':'1주택', '2':'다주택'};
  const RG = {seoul:'서울', ggreg:'경기 규제지역', capfree:'비규제 수도권', local:'지방 비규제', reg:'규제지역'};
  const SIDO_SHORT = {'서울특별시':'서울','부산광역시':'부산','대구광역시':'대구','인천광역시':'인천','광주광역시':'광주','전남광주통합특별시':'전남광주',
    '대전광역시':'대전','울산광역시':'울산','세종특별자치시':'세종','경기도':'경기','강원특별자치도':'강원','강원도':'강원','충청북도':'충북','충청남도':'충남',
    '전북특별자치도':'전북','전라북도':'전북','전라남도':'전남','경상북도':'경북','경상남도':'경남','제주특별자치도':'제주',
    '지역 상관없음':'상관없음','전국':'상관없음'};   /* 내 집 마련 '지역 상관없음' 선택 */
  const SIDO_OK = new Set(Object.values(SIDO_SHORT));
  /* 예산·금액(만원) → 1억 단위 구간 */
  function band(man){ man = +man; if (!isFinite(man) || man <= 0) return '없음'; const e = Math.floor(man/10000);
    return e < 1 ? '1억 미만' : e >= 30 ? '30억 이상' : `${e}~${e+1}억`; }
  /* 예상 보유 기간(년) → 구간 */
  function hold(y){ y = +y; if (!isFinite(y) || y <= 0) return ''; return y <= 2 ? '2년 이하' : y <= 5 ? '3~5년' : y <= 9 ? '6~9년' : '10년 이상'; }
  /* 청약 가점(0~84) → 10점 구간 */
  function score(p){ p = Math.round(+p); if (!isFinite(p) || p < 0) return ''; if (p >= 80) return '80~84점'; const b = Math.floor(p/10)*10; return `${b}~${b+9}점`; }
  const own = v => OWN[v] || '';
  const sido = v => { v = String(v||'').trim(); return SIDO_SHORT[v] || (SIDO_OK.has(v) ? v : ''); };
  const regionGroup = v => RG[v] || '';

  /* ---------- 허용 목록 ---------- */
  const EV = {feature_use:6, interest_profile:15, chungyak_result:3, report_share:5, compare_use:3, ad_view:6, ad_click:10, share_click:10, share_visit:1, ask_use:8, nar_open:12}; // 이벤트별 페이지당 상한
  const FEATURES = ['buy','report','switch','redev','villa','chungyak','tax','compare','consult','premium','mine','bunyang','ad_apply','price_sheet','agent_chat','jeonse','ad_inquiry','jeonse_checklist','ask'];
  const SPOTS = ['report_top','report_rank','report_near','report_compare','report_leader','switch_top','switch_compare','switch_pick','bunyang_deal','premium','mine'];
  const PAGES = ['home','buy','report','switch','villa','chungyak','tax','agent','calc','mine','bunyang','bunyang_apply','jeonse','ad','ask'];
  const SHARE_TOOLS = ['chungyak','report','mine','switch','jeonse','checklist','tax','villa','ask'];
  const P = {
    feature:     v => FEATURES.includes(v),
    page:        v => PAGES.includes(v),
    from:        v => PAGES.includes(v) || v === 'compare',
    sido:        v => SIDO_OK.has(v),
    sgg:         v => /^[가-힣]{1,6}(시|군|구)( [가-힣]{1,5}구)?$/.test(v),
    region_group:v => Object.values(RG).includes(v),
    budget_band: v => /^(없음|1억 미만|30억 이상|([1-9]|[12][0-9])~([2-9]|[1-3][0-9])억)$/.test(v),
    hold_band:   v => ['2년 이하','3~5년','6~9년','10년 이상'].includes(v),
    home_own:    v => Object.values(OWN).includes(v),
    score_band:  v => /^(80~84점|[0-7]0~[0-7]9점|0~9점)$/.test(v),
    method:      v => ['share','copy','image'].includes(v),
    tool:        v => SHARE_TOOLS.includes(v),                                                      // 공유한 결과 화면(assets/share.js)
    place:       v => ['top','mid','bottom'].includes(v),                                           // 공유 단추 위치: 상단 아이콘·중간 카드·아래 단추
    n:           v => Number.isInteger(v) && v >= 0 && v <= 10,
    danji:       v => /^\d{5}\|[^|]{1,20}\|[^|]{1,60}$/.test(v),                                    // '단지 이름으로 물어보기'로 찾은 공개 단지(구코드|동|단지명)만 — 내 집·주소·금액은 보내지 않음
    spot:        v => SPOTS.includes(v),                                                            // 시세 흐름 보기 단추 위치
    slot:        v => ['bunyang','buy','switch','villa','chungyak','tax'].includes(v),              // 분양 광고 노출 위치
    line:        v => ['r1','r2','r3','price','watch','fit','all','trust','term'].includes(v),                     // 분석 설명 '자세히 보기'를 연 줄 종류(assets/narrative.js) — 단지·금액 없음
    ad_kind:     v => ['아파트','오피스텔','도시형생활주택','민간임대','무순위·잔여세대','기타'].includes(v)
  };
  function clean(params){
    const out = {};
    for (const [k, v] of Object.entries(params||{})){
      if (v === '' || v == null) continue;
      if (P[k] && P[k](v)) out[k] = v;
      else if (window.JDJ_DEBUG) console.warn('[jdjStat] 버린 값', k, v);
    }
    return out;
  }

  const sent = new Set(), cnt = {}, timers = {};
  function jdjStat(ev, params){
    try{
      if (!EV[ev]) { if (window.JDJ_DEBUG) console.warn('[jdjStat] 허용되지 않은 이벤트', ev); return false; }
      const p = clean(Object.assign({page: PAGE}, params));
      if (Object.keys(p).length < 2) return false;               // 쓸 만한 값이 하나도 안 남으면 보내지 않음
      const key = ev + '|' + JSON.stringify(Object.keys(p).sort().map(k=>[k,p[k]]));
      if (sent.has(key) || (cnt[ev]||0) >= EV[ev]) return false;
      sent.add(key); cnt[ev] = (cnt[ev]||0) + 1;
      if (window.gtag) gtag('event', ev, p);
      (window.JDJ_STAT_LOG = window.JDJ_STAT_LOG || []).push([ev, p]);
      if (window.JDJ_DEBUG) console.log('[jdjStat]', ev, p);
      return true;
    }catch(_){ return false; }
  }
  /* 입력이 멈춘 뒤(ms) 한 번 보내기: 계산 결과가 자주 바뀌는 화면용 */
  jdjStat.later = (id, fn, ms) => { clearTimeout(timers[id]); timers[id] = setTimeout(()=>{ try{ fn(); }catch(_){} }, ms||2500); };
  Object.assign(jdjStat, {band, hold, score, own, sido, regionGroup});
  window.jdjStat = jdjStat;

  /* 공유 링크로 들어온 방문(assets/share.js 가 붙이는 utm_source=share&utm_campaign=화면) — 화면 이름만, 개인정보 없음 */
  try{ const q = new URLSearchParams(location.search);
    if (q.get('utm_source') === 'share') jdjStat('share_visit', {tool: q.get('utm_campaign') || ''}); }catch(_){}

  /* 상담 신청 버튼(data-track 에 consult 가 들어간 링크)은 모든 페이지에서 공통으로 집계 */
  document.addEventListener('click', e=>{
    const t = e.target.closest && e.target.closest('[data-track]');
    if (t && /consult/.test(t.dataset.track)) jdjStat('feature_use', {feature:'consult', from: PAGE});
  }, true);
})();
