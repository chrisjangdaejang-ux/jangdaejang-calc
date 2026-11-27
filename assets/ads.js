/* 집예보 '분양 광고' — 공용 (tools/agent-backend.gs v16 의 adList·adLead 사용, API 주소는 assets/agents.js 와 같음)
   지면(data-jdj-ads 값)
   - bunyang      : 분양 목록 바로 위 '목록 상단 카드' — 고른 시·도(·시·군·구) 광고만, 최대 3칸 (JDJ_ADS.render(el, {sido, sgg}) 로 다시 그림)
   - bunyang_rec  : 분양 상세의 '추천 현장' — 같은 시·도(같은 구 먼저), 보고 있는 공고와 같은 현장은 빼고 최대 2칸 (data-sido·data-sgg·data-no)
   - villa 등     : 예전 방식(노출 위치에 그 화면을 고른 광고)
   - 지도 프리미엄 마커: JDJ_ADS.pins(v) — map/index.html 이 겹침 정리 규칙에 넣어 그림
   원칙: 승인·기간 내 광고만, 항상 '광고' 표시. 광고는 어떤 점수·추천·순위에도 반영하지 않습니다(광고끼리의 순서만 여기서 정함).
   현장 정보는 청약홈 공고번호(no)가 맞는 공고가 있으면 공고 자료(분양가·세대수·일정·사업주체)를 그대로 쓰고 '청약홈 공고 기준'으로 밝힙니다.
   기록: 노출 adv·지도 마커 노출 adm·클릭 adc 를 광고 id 로만(JDJ_AGENTS.log) + 구간 통계(jdjStat). 이름·연락처는 상담 신청(adLead) 때 서버로만 갑니다.
   광고가 없으면 칸 자체를 숨깁니다(data-empty="invite" 면 '분양 광고 문의' 한 줄). */
(function(){
  var JB = (typeof window !== 'undefined' && window.JDJ_BASE) || (function (p) { var g = p.indexOf('/jangdaejang-calc/') === 0, b = { SITE: g ? '/jangdaejang-calc/' : '/', DATA: g ? '/jangdaejang-data/' : 'https://chrisjangdaejang-ux.github.io/jangdaejang-data/' }; if (typeof window !== 'undefined') window.JDJ_BASE = b; return b; })((typeof location !== 'undefined' && location.pathname) || '/jangdaejang-calc/');
  const APPLY = JB.SITE + 'bunyang/apply/', ALL = JB.SITE + 'ad/', PRIV = JB.SITE + 'privacy/#lead';
  /* v76 분양 상담 연결(숨김): 켜졌거나 대표 미리 보기(?preview=leads·leads-live)일 때만 assets/leads-core.js·leads.js 를 불러옴 */
  (function () {
    if (typeof document === 'undefined' || typeof location === 'undefined') return;
    let pv = null; try { if (/[?&]preview=leads(-live)?(&|$)/.test(location.search)) localStorage.setItem('jdj_leads_pv', /leads-live/.test(location.search) ? 'live' : 'demo'); pv = localStorage.getItem('jdj_leads_pv'); } catch (e) {}
    if (!((window.JDJ_SITE && window.JDJ_SITE.LEADS_ENABLED === true) || pv) || window.JDJ_LEADS) return;
    ['leads-core.js?v=1', 'leads.js?v=1'].forEach(f => { const sc = document.createElement('script'); sc.src = JB.SITE + 'assets/' + f; sc.async = false; document.head.appendChild(sc); });
  })();
  const NOTICES = JB.DATA + 'data/bunyang/notices.json';
  const HOUSING = ['아파트', '도시형생활주택', '민간임대', '무순위·잔여세대'];
  const SIDO_OLD = { '광주광역시': '전남광주통합특별시', '전라남도': '전남광주통합특별시', '강원도': '강원특별자치도', '전라북도': '전북특별자치도', '제주도': '제주특별자치도' };
  const sidoNorm = s => SIDO_OLD[s] || s;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const safe = u => /^https:\/\/[^\s"'<>\\`]+$/.test(String(u || '')) ? String(u) : '';
  const won = m => { m = +m; if (!m) return ''; const e = Math.floor(m / 10000), r = m % 10000; return e ? `${e}억${r ? ' ' + r.toLocaleString('ko-KR') + '만' : ''}원` : `${r.toLocaleString('ko-KR')}만원`; };
  const d10 = s => s ? String(s).replace(/-/g, '.') : '';
  const d8 = s => s && s.length === 8 ? `${s.slice(0, 4)}.${s.slice(4, 6)}.${s.slice(6, 8)}` : '';
  const short = s => String(s || '').replace(/(특별자치시|특별자치도|특별시|광역시|통합특별시)$/, '');
  const stat = (n, p) => { if (typeof window !== 'undefined' && window.jdjStat) try { window.jdjStat(n, p); } catch (e) {} };
  const log = (t, a, g) => { const A = typeof window !== 'undefined' && window.JDJ_AGENTS; if (A && A.log && a) A.log(t, a, g || ''); };
  let P = null, R = null, ROWS = null;
  function load(){
    const A = window.JDJ_AGENTS;
    if (!A || !A.api) return Promise.resolve([]);
    if (!P) P = fetch(A.api + '?action=adList').then(r => r.json()).then(j => (j && j.ok && Array.isArray(j.ads)) ? j.ads : []).catch(() => []);
    return P;
  }
  /* 공고 자료: 화면이 이미 가진 행(setRows)이 있으면 그것, 없으면 필요할 때만 받음 */
  function setRows(rows){ ROWS = Array.isArray(rows) ? rows : null; }
  function rows(){
    if (ROWS) return Promise.resolve(ROWS);
    if (!R) R = fetch(NOTICES).then(r => r.ok ? r.json() : { rows: [] }).then(j => j.rows || []).catch(() => { R = null; return []; });
    return R;
  }
  const rowOf = (a, list) => a && a.no && list ? list.find(x => x.no === a.no) || null : null;
  const has = (a, p) => (a.prod && a.prod.length ? a.prod : ['top']).indexOf(p) >= 0;
  /* 광고끼리 순서: 같은 시·군·구(추가 노출 구 포함) → 같은 시·도 → 시작일 → id */
  function order(list, sido, sgg){
    const sc = a => (sgg && (a.sg === sgg || (a.gx || []).indexOf(sgg) >= 0) ? 2 : 0) + (sido && sidoNorm(a.sd) === sidoNorm(sido) ? 1 : 0);
    return list.slice().sort((a, b) => sc(b) - sc(a) || String(a.s).localeCompare(String(b.s)) || String(a.id).localeCompare(String(b.id)));
  }
  /** 지면에 보일 광고 (순수 함수 — tools/ad-test.js 가 검증) */
  function pick(all, slot, o){
    o = o || {};
    const sido = o.sido || '', sgg = o.sgg || '', bun = slot === 'bunyang' || slot === 'bunyang_rec';
    let l = (all || []).filter(a => a && a.id && (a.pos || []).indexOf(bun ? 'bunyang' : slot) >= 0 && has(a, 'top'));
    if (bun) {
      if (slot === 'bunyang_rec' && !sido) return [];
      if (sido) l = l.filter(a => sidoNorm(a.sd) === sidoNorm(sido));
      if (slot === 'bunyang_rec') l = l.filter(a => !o.no || a.no !== o.no);
    }
    return order(l, sido, sgg).slice(0, o.max || (slot === 'bunyang_rec' ? 2 : 3));
  }
  /** 지도 마커: 좌표가 있고 상품에 지도 마커가 있는 광고 중, 화면 안 + (확대 14 이상이거나 지도 가운데가 현장 반경 rk km 안). 확대 11 미만은 없음, 화면당 2개 */
  function km(a, b){ const r = x => x * Math.PI / 180, dl = r(b[1] - a[1]), dg = r(b[0] - a[0]);
    const h = Math.sin(dl / 2) ** 2 + Math.cos(r(a[1])) * Math.cos(r(b[1])) * Math.sin(dg / 2) ** 2; return 2 * 6371 * Math.asin(Math.sqrt(h)); }
  function pinPick(all, list, v){
    if (!v || v.z < 11) return [];
    const out = [];
    for (const a of all || []) {
      if (!a || !a.id || !has(a, 'pin')) continue;
      const r = rowOf(a, list), xy = (a.xy && a.xy.length === 2) ? a.xy : (r && Array.isArray(r.xy) && r.xy.length === 2 ? r.xy : null);
      if (!xy || !(xy[1] >= v.s && xy[1] <= v.n && xy[0] >= v.w && xy[0] <= v.e)) continue;
      if (v.z < 14 && km(xy, [v.lng, v.lat]) > Math.max(3, +a.rk || 5)) continue;
      out.push({ a, r, xy });
    }
    return out.sort((p, q) => String(p.a.s).localeCompare(String(q.a.s)) || String(p.a.id).localeCompare(String(q.a.id))).slice(0, 2);
  }
  function css(){
    if (document.getElementById('jad-css')) return;
    const s = document.createElement('style'); s.id = 'jad-css';
    s.textContent = `.jad{margin:16px 0;padding:14px;border:1px solid #E5E8EB;border-radius:16px;background:#FBFAF6}
.jad-h{display:flex;align-items:baseline;justify-content:space-between;gap:4px 8px;flex-wrap:wrap;margin-bottom:10px}
.jad-h b{font-size:16px;color:#191F28}.jad-h small{font-size:13.5px;color:#4E5968}
.jad-l{display:grid;gap:10px}
.jad-c{display:flex;gap:12px;align-items:flex-start;padding:14px;border:1px solid #E3DCC4;border-radius:14px;background:#fff;min-width:0}
.jad-c img{width:84px;height:84px;object-fit:cover;border-radius:10px;flex:none;background:#F2F4F6}
@media(max-width:400px){.jad-c{padding:12px;gap:10px}.jad-c img{width:60px;height:60px}}
.jad-c .t{min-width:0;flex:1}
.jad-tag{display:inline-block;font-size:13px;font-weight:800;color:#6B520E;background:#FBF3DC;border:1px solid #E3CF8F;border-radius:6px;padding:0 6px;margin-right:6px;vertical-align:2px;line-height:1.6}
.jad-c .n{font-size:16.5px;font-weight:800;color:#191F28;word-break:keep-all;overflow-wrap:anywhere;line-height:1.4}
.jad-c .m{font-size:13.5px;color:#4E5968;margin-top:3px;overflow-wrap:anywhere;line-height:1.5}
.jad-c .p{font-size:15px;font-weight:700;color:#191F28;margin-top:4px}
.jad-c .p small{font-size:13px;font-weight:500;color:#4E5968}
.jad-c .who{font-size:13px;color:#4E5968;margin-top:4px;line-height:1.5;overflow-wrap:anywhere}
.jad-c .acts{display:flex;flex-wrap:wrap;align-items:center;gap:4px 14px;margin-top:6px}
.jad-c .acts a,.jad-c .acts button{display:inline-flex;align-items:center;min-height:44px;font:inherit;font-size:14.5px;font-weight:700;color:#4338CA;text-decoration:none;background:none;border:0;padding:0;cursor:pointer}
.jad-c .acts button.lead{background:#4338CA;color:#fff;border-radius:10px;padding:0 14px}
.jad-f{font-size:13px;color:#4E5968;margin-top:10px;line-height:1.6}
.jad-f a{color:#4E5968;font-weight:700}
.jad.rec{background:#fff;margin:18px 0 6px}
.jad.inv{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;padding:12px 16px}
.jad.inv span{font-size:14px;color:#4E5968;flex:1 1 100%}.jad.inv a{font-size:14.5px;font-weight:700;color:#4338CA;text-decoration:none;min-height:44px;display:inline-flex;align-items:center}
.jad-pr{font-size:13px;color:#4E5968;margin-top:2px;line-height:1.5}.jad-pr a{color:#4E5968;font-weight:700}
.jld{position:fixed;inset:0;z-index:3000;background:rgba(0,0,0,.45);display:flex;align-items:flex-end;justify-content:center}
@media(min-width:700px){.jld{align-items:center}}
.jld[hidden]{display:none}
.jld .bx{background:#fff;width:100%;max-width:520px;max-height:92vh;overflow:auto;border-radius:20px 20px 0 0;padding:20px;box-sizing:border-box}
@media(min-width:700px){.jld .bx{border-radius:20px}}
.jld h3{font-size:19px;margin:0 0 4px}.jld .s{font-size:14px;color:#4E5968;margin:0 0 12px;line-height:1.55}
.jld label.l{display:block;font-size:14px;font-weight:700;color:#4E5968;margin:10px 0 4px}
.jld input[type=text],.jld input[type=tel],.jld select,.jld textarea{width:100%;min-height:48px;padding:0 12px;border:1px solid #E5E8EB;border-radius:12px;font:inherit;font-size:16px;box-sizing:border-box;background:#fff}
.jld textarea{min-height:72px;padding:10px 12px}
.jld .ag{display:flex;gap:10px;align-items:flex-start;margin-top:10px;padding:12px;border:1px solid #E5E8EB;border-radius:12px;font-size:14px;line-height:1.55;cursor:pointer}
.jld .ag input{width:20px;height:20px;flex:none;margin-top:1px;accent-color:#4338CA}
.jld .ag small{display:block;color:#4E5968;font-size:13px;margin-top:2px}
.jld .row{display:flex;gap:8px;margin-top:14px}
.jld .row button{flex:1;min-height:52px;border-radius:14px;font:inherit;font-size:16px;font-weight:800;border:1px solid #E5E8EB;background:#fff;cursor:pointer;color:#191F28}
.jld .row button.p{background:#4338CA;border-color:#4338CA;color:#fff}
.jld .msg{font-size:14.5px;font-weight:700;margin-top:10px;min-height:1em}.jld .msg.err{color:#D92D20}
.jld .ok{background:#E8F6EF;border-radius:14px;padding:16px;font-size:15.5px;line-height:1.7}`;
    document.head.appendChild(s);
  }
  /* 현장 카드: 공고(청약홈 번호가 맞는 공고)가 있으면 공고 값으로, 없으면 광고주가 낸 공고 내용으로 */
  function cardHtml(a, r, o){
    o = o || {};
    const img = safe(a.img), u = safe(a.u) || (r && safe(r.u)) || '';
    const tp = r ? (r.ty || []).map(t => t[3]).filter(v => v > 0) : [];
    const pmin = tp.length ? Math.min(...tp) : a.pmin, pmax = tp.length ? Math.max(...tp) : a.pmax;
    const pr = pmin && pmax ? (pmin === pmax ? won(pmin) : `${won(pmin)} ~ ${won(pmax)}`) : (pmax ? `최고 ${won(pmax)}` : (pmin ? `${won(pmin)}부터` : ''));
    const hh = (r && r.hh) || a.hh, k = (r && r.k) || a.k, house = HOUSING.indexOf(a.k) >= 0;
    const meta = [a.sd && a.sg ? `${short(sidoNorm(a.sd))} ${a.sg}` : '', k, hh ? `${(+hh).toLocaleString('ko-KR')}세대` : ''].filter(Boolean).join(' · ');
    const rc = r && r.rc && r.rc[0] ? `청약 접수 ${d8(r.rc[0])}${r.rc[1] && r.rc[1] !== r.rc[0] ? ' ~ ' + d8(r.rc[1]).slice(5) : ''}` : '';
    const legal = house ? `입주자모집공고 ${r && r.pb ? d8(r.pb) : d10(a.pd)}${r ? ' · 청약홈 공고 기준' : ''}`
      : (a.dn && a.dn !== '신고 대상 아님' ? `분양신고 ${a.dn}${a.dd ? ' (' + d10(a.dd) + ')' : ''}${a.gt ? ' · ' + a.gt : ''}` : '분양신고 대상 아님(광고주 확인)');
    const vat = !house && a.vat ? ` <small>(부가세 ${esc(a.vat)})</small>` : '';
    const dev = (r && r.dev) || a.dev, bld = (r && r.bld) || a.bld;
    const who = [dev ? `사업주체 ${dev}` : '', bld ? `시공 ${bld}` : '', a.agc ? `분양대행 ${a.agc}` : '', `광고주 ${a.co}`].filter(Boolean).join(' · ');
    return `<div class="jad-c">${img ? `<img src="${esc(img)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}
      <div class="t"><div class="n"><span class="jad-tag">광고</span>${esc(a.n)}</div>
      <div class="m">${esc(meta)}</div>
      ${pr ? `<div class="p">분양가 ${esc(pr)}${tp.length ? ' <small>(주택형별 최고가)</small>' : ''}${vat}</div>` : ''}
      ${rc ? `<div class="m">${esc(rc)}</div>` : ''}
      <div class="m">${esc(legal)}</div>
      <div class="who">${esc(who)}</div>
      <div class="acts">${o.open && r ? `<button type="button" data-ad-open="${esc(r.id)}" data-ad="${esc(a.id)}">현장 정보 보기 ›</button>` : ''}${u ? `<a href="${esc(u)}" target="_blank" rel="noopener sponsored nofollow" data-ad="${esc(a.id)}">공고·홈페이지 ›</a>` : ''}${a.lead ? `<button type="button" class="lead" data-ad-lead="${esc(a.id)}" data-ad="${esc(a.id)}">분양 상담 신청</button>` : ''}</div>
      ${o.partner && a.pr ? `<div class="jad-pr">공인중개사·분양대행업체라면: 이 현장은 판매 파트너를 모집해요 · <a href="${JB.SITE}agent/" data-track="ad_partner">제휴 안내 ›</a></div>` : ''}</div></div>`;
  }
  const SEEN = {};
  function seen(list, slot, t){ list.forEach(x => { const k = slot + '|' + x.id; if (SEEN[k]) return; SEEN[k] = 1; log(t || 'adv', x.id, ''); }); }
  /** 칸 그리기. o = {sido, sgg, no, max, open(id)} — open 을 주면 '현장 정보 보기'로 화면의 상세를 엶 */
  async function render(el, o){
    if (!el) return;
    o = Object.assign({ sido: el.dataset.sido || '', sgg: el.dataset.sgg || '', no: el.dataset.no || '', max: +(el.dataset.max || 0) || undefined }, o || {});
    if (o.open) el._open = o.open;
    const slot = el.dataset.jdjAds, tok = (el._tok = (el._tok || 0) + 1);
    css();
    const [all, list] = await Promise.all([load(), rows()]);
    if (tok !== el._tok) return;                          // 그사이 조건이 바뀌었으면 새 그림만
    const show = pick(all, slot, o);
    if (!show.length){
      if (el.dataset.empty === 'invite'){ el.className = 'jad inv'; el.innerHTML = `<span>이 자리에 분양 현장을 알릴 수 있어요 · 승인된 광고만 ‘광고’로 표시돼요</span><a href="${APPLY}" data-track="ad_invite">분양 광고 문의 ›</a><a href="${ALL}" data-track="ad_invite_all">전체 광고 상품 보기 ›</a>`; el.hidden = false; }
      else { el.hidden = true; el.innerHTML = ''; }
      return;
    }
    const rec = slot === 'bunyang_rec';
    el.className = 'jad' + (rec ? ' rec' : ''); el.hidden = false;
    el.setAttribute('aria-label', rec ? '추천 현장 광고' : '분양 광고');
    const where = o.sido ? short(sidoNorm(o.sido)) : '';   // 같은 시·도 광고도 함께 보일 수 있어 시·도 이름으로
    el.innerHTML = `<div class="jad-h"><b>${rec ? '추천 현장' : (where ? esc(where) + ' 분양 광고' : '분양 광고')}</b><small>광고주가 비용을 내고 싣는 광고예요</small></div><div class="jad-l">${show.map(a => cardHtml(a, rowOf(a, list), { open: !!el._open, partner: rec })).join('')}</div>
      <div class="jad-f">광고는 집예보 미래가치 점수·추천·순위와 무관해요. 청약 자격·분양 조건은 입주자모집공고문으로 꼭 확인하세요. · <a href="${APPLY}">분양 광고 문의</a></div>`;
    seen(show, slot);
    stat('ad_view', { slot, n: Math.min(10, show.length) });
    el._show = show;
    if (!el._wired) {
      el._wired = 1;
      el.addEventListener('click', e => {
        const t = e.target.closest && e.target.closest('[data-ad]'); if (!t) return;
        const a = (el._show || []).find(x => x.id === t.dataset.ad) || {};
        log('adc', a.id, ''); stat('ad_click', { slot, ad_kind: a.k, sido: window.jdjStat && jdjStat.sido ? jdjStat.sido(a.sd) : '' });
        if (t.dataset.adOpen && el._open) el._open(t.dataset.adOpen);
      });
    }
  }
  function mount(el){ if (!el || el.dataset.jadDone) return; el.dataset.jadDone = '1'; return render(el); }
  /* ---------- 분양 상담 신청 (광고주에게 이용자가 동의한 정보만) ---------- */
  let DLG = null;
  async function leadOpen(id){
    css();
    const a = (await load()).find(x => x.id === id); if (!a || !a.lead) return;
    /* v76 분양 상담 연결(assets/leads.js, 숨김 — LEADS_ENABLED 또는 운영자 ?preview=leads-live): 동의 화면·휴대폰 확인·등급 흐름으로 */
    const LX = window.JDJ_LEADS;
    if (LX && LX.on() && !LX.demo() && LX.open({ id: a.id, name: a.n, co: a.co, sido: a.sd, sgg: a.sg, code: a.g || '', pmin: a.pmin, pmax: a.pmax, cy: [] })) return;
    if (!DLG) { DLG = document.createElement('div'); DLG.className = 'jld'; DLG.hidden = true; DLG.setAttribute('role', 'dialog'); DLG.setAttribute('aria-modal', 'true'); DLG.setAttribute('aria-labelledby', 'jldT'); document.body.appendChild(DLG);
      DLG.addEventListener('click', e => { if (e.target === DLG || (e.target.dataset && e.target.dataset.x)) DLG.hidden = true; });
      addEventListener('keydown', e => { if (e.key === 'Escape' && DLG && !DLG.hidden) DLG.hidden = true; }); }
    DLG.innerHTML = `<div class="bx"><h3 id="jldT">분양 상담 신청</h3><p class="s"><span class="jad-tag">광고</span>${esc(a.n)} · 광고주 <b>${esc(a.co)}</b>에서 연락드려요. 집예보는 신청 내용을 전달만 해요.</p>
      <form novalidate><label class="l" for="jldN">이름</label><input type="text" id="jldN" maxlength="20" autocomplete="name">
      <label class="l" for="jldP">휴대폰 번호</label><input type="tel" id="jldP" inputmode="tel" maxlength="14" placeholder="010-0000-0000" autocomplete="tel">
      <label class="l" for="jldW">연락받기 좋은 시간</label><select id="jldW"><option>상관없음</option><option>오전(9~12시)</option><option>오후(12~18시)</option><option>저녁(18~21시)</option></select>
      <label class="l" for="jldM">궁금한 점 (선택)</label><textarea id="jldM" maxlength="200" placeholder="예: 84㎡ 분양가와 중도금 조건이 궁금해요"></textarea>
      <label class="ag"><input type="checkbox" id="jldA1"><span><b>(필수) 개인정보 수집·이용 동의</b><small>집예보가 이름·휴대폰 번호·희망 시간·문의를 상담 연결에만 쓰고, 전달 후 6개월이 지나면 지워요. 동의하지 않으면 신청할 수 없어요.</small></span></label>
      <label class="ag"><input type="checkbox" id="jldA2"><span><b>(필수) 개인정보 제3자 제공 동의</b><small>받는 곳: ${esc(a.co)} · 목적: ${esc(a.n)} 분양 상담 연락 · 항목: 이름, 휴대폰 번호, 희망 시간, 문의 · 보유 기간: 상담 종료 또는 받은 날로부터 6개월 · 동의하지 않을 수 있고, 그러면 상담 신청은 할 수 없지만 공고문의 분양 문의 전화로 직접 연락하실 수 있어요.</small></span></label>
      <p class="s" style="margin:10px 0 0">광고 문자·전화 수신 동의가 아니에요. 광고주는 이 정보를 상담 연락에만 쓸 수 있어요. <a href="${PRIV}" target="_blank" rel="noopener">개인정보처리방침</a></p>
      <div aria-hidden="true" style="position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden"><input id="jldH" tabindex="-1" autocomplete="off"></div>
      <div class="row"><button type="button" data-x="1">닫기</button><button type="submit" class="p" id="jldS">신청하기</button></div><div class="msg" id="jldMsg" role="status" aria-live="polite"></div></form></div>`;
    DLG.hidden = false;
    const q = s => DLG.querySelector(s);
    q('#jldN').focus();
    q('form').onsubmit = async e => {
      e.preventDefault();
      const m = q('#jldMsg'); m.className = 'msg';
      const name = q('#jldN').value.trim(), phone = q('#jldP').value.replace(/[^0-9]/g, '');
      const bad = !/^[가-힣A-Za-z ]{2,20}$/.test(name) ? '이름을 한글 또는 영문으로 입력해 주세요.' : !/^01[016789]\d{7,8}$/.test(phone) ? '휴대폰 번호를 확인해 주세요.'
        : !(q('#jldA1').checked && q('#jldA2').checked) ? '필수 동의 2가지에 모두 동의해 주세요.' : '';
      if (bad) { m.className = 'msg err'; m.textContent = bad; return; }
      const A = window.JDJ_AGENTS;
      if (!A || !A.ready) { m.className = 'msg err'; m.textContent = '신청 서버에 연결하지 못했어요. 잠시 뒤 다시 시도해 주세요.'; return; }
      q('#jldS').disabled = true; m.textContent = '보내는 중이에요…';
      try {
        const r = await A.post({ action: 'adLead', ad: a.id, name, phone, time: q('#jldW').value, memo: q('#jldM').value.trim(), agree: { collect: true, third: true }, hp: q('#jldH').value });
        DLG.querySelector('.bx').innerHTML = `<div class="ok"><b>상담 신청이 전달됐어요</b><br>${esc(r.co || a.co)} 담당자가 고르신 시간에 연락드려요. 신청 번호 ${esc(r.id)}<br>신청을 지우고 싶으면 고객문의로 알려 주세요.</div><div class="row"><button type="button" data-x="1">닫기</button></div>`;
        stat('feature_use', { feature: 'ad_lead' });
      } catch (err) { m.className = 'msg err'; m.textContent = err.message || '신청을 처리하지 못했어요.'; q('#jldS').disabled = false; }
    };
  }
  /** 지도용: 보이는 범위 v={s,n,w,e,lat,lng,z} → [{a, r, xy}] (지도 마커 상품 광고가 없으면 공고 자료도 받지 않음) */
  async function pins(v){ const all = await load(); if (!all.some(a => has(a, 'pin'))) return []; return pinPick(all, await rows(), v); }
  /** 관심 지역 알림: 상품에 관심 지역 알림이 있고 관심 지역(시·도 전체 또는 시·군·구 이름)에 맞는 광고 — 광고성 정보 수신 동의한 사람에게만 부르세요 */
  function areaPick(all, areas){
    return (all || []).filter(a => a && a.id && has(a, 'alert') && (areas || []).some(x => sidoNorm(a.sd) === sidoNorm(x.sd) && (!x.gn || x.gn === a.sg || (a.gx || []).indexOf(x.gn) >= 0)));
  }
  async function forAreas(areas){ return areaPick(await load(), areas); }
  /** 판매 파트너 모집(중개사 대시보드 /agent/my/ '판매 가능한 분양 현장'용): 판매 파트너를 모집하는 광고 중 중개사 노출 구(이름 목록)에 맞는 것.
      gus = [{sd:'서울특별시', gn:'강동구'}] — 수수료·조건은 공개하지 않음(개별 협의, 수수료 쉐어는 법적 확인 뒤) */
  function partnerPick(all, gus){
    return (all || []).filter(a => a && a.id && a.pr && (gus || []).some(x => sidoNorm(a.sd) === sidoNorm(x.sd) && (x.gn === a.sg || (a.gx || []).indexOf(x.gn) >= 0)))
      .sort((a, b) => String(a.s).localeCompare(String(b.s)));
  }
  const API = { load, mount, render, setRows, pick, pinPick, pins, areaPick, forAreas, partnerPick, cardHtml, leadOpen, log, rowOf, km, css: () => { if (typeof document !== "undefined") css(); } };
  if (typeof module !== 'undefined' && module.exports) { module.exports = API; return; }
  window.JDJ_ADS = API;
  document.addEventListener('click', e => { const t = e.target.closest && e.target.closest('[data-ad-lead]'); if (t) { e.preventDefault(); leadOpen(t.dataset.adLead); } });
  const scan = () => document.querySelectorAll('[data-jdj-ads]').forEach(mount);
  API.scan = scan;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scan); else scan();
})();
