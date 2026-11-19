/* 장대장 '분양 광고' 칸 — 공용 (tools/agent-backend.gs v12 의 adList 사용, API 주소는 assets/agents.js 와 같음)
   사용: <div data-jdj-ads="bunyang" data-sido="서울특별시" data-empty="invite"></div> + agents.js 다음에 이 파일
   - 승인·기간 내 광고만 받아 '광고' 표시와 함께 보여 줍니다. 광고는 어떤 점수·추천 순위에도 반영하지 않습니다.
   - 클릭·노출은 jdjStat 구간 이벤트(ad_view·ad_click: 위치·유형·시도)만 보냅니다(광고 id·단지명·주소는 보내지 않음).
   - data-empty="invite": 광고가 없을 때 '분양 광고 문의' 안내 한 줄을 보여 줌(없으면 칸 자체를 숨김). */
(function(){
  const APPLY = '/jangdaejang-calc/bunyang/apply/', ALL = '/jangdaejang-calc/ad/';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const safe = u => /^https:\/\/[^\s"'<>\\`]+$/.test(String(u || '')) ? String(u) : '';
  const won = m => { m = +m; if (!m) return ''; const e = Math.floor(m / 10000), r = m % 10000; return e ? `${e}억${r ? ' ' + r.toLocaleString('ko-KR') + '만' : ''}원` : `${r.toLocaleString('ko-KR')}만원`; };
  const d10 = s => s ? s.replace(/-/g, '.') : '';
  let P = null;
  function load(){
    const A = window.JDJ_AGENTS;
    if (!A || !A.api) return Promise.resolve([]);
    if (!P) P = fetch(A.api + '?action=adList').then(r => r.json()).then(j => (j && j.ok && Array.isArray(j.ads)) ? j.ads : []).catch(() => []);
    return P;
  }
  function css(){
    if (document.getElementById('jad-css')) return;
    const s = document.createElement('style'); s.id = 'jad-css';
    s.textContent = `.jad{margin:16px 0;padding:16px;border:1px solid #E5E8EB;border-radius:16px;background:#F9FAFB}
.jad-h{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-bottom:10px}
.jad-h b{font-size:16px;color:#191F28}.jad-h small{font-size:13.5px;color:#4E5968}
.jad-l{display:grid;gap:10px}
.jad-c{display:flex;gap:12px;align-items:flex-start;padding:14px;border:1px solid #E5E8EB;border-radius:14px;background:#fff;min-width:0}
.jad-c img{width:76px;height:76px;object-fit:cover;border-radius:10px;flex:none;background:#F2F4F6}
.jad-c .t{min-width:0;flex:1}
.jad-tag{display:inline-block;font-size:13.5px;font-weight:700;color:#4E5968;border:1px solid #C9CED6;border-radius:6px;padding:0 6px;margin-right:6px;vertical-align:1px;line-height:1.6}
.jad-c .n{font-size:16px;font-weight:800;color:#191F28;word-break:keep-all;overflow-wrap:anywhere}
.jad-c .m{font-size:13.5px;color:#4E5968;margin-top:2px;overflow-wrap:anywhere}
.jad-c .p{font-size:15px;font-weight:700;color:#191F28;margin-top:4px}
.jad-c a.go{display:inline-flex;align-items:center;min-height:44px;margin-top:4px;font-size:14.5px;font-weight:700;color:#2F6BFF;text-decoration:none}
.jad-f{font-size:13.5px;color:#4E5968;margin-top:10px;line-height:1.6}
.jad-f a{color:#4E5968;font-weight:700}
.jad.inv{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;padding:12px 16px}
.jad.inv span{font-size:14px;color:#4E5968;flex:1 1 100%}.jad.inv a{font-size:14.5px;font-weight:700;color:#2F6BFF;text-decoration:none;min-height:44px;display:inline-flex;align-items:center}`;
    document.head.appendChild(s);
  }
  function card(a){
    const img = safe(a.img), u = safe(a.u);
    const pr = a.pmin && a.pmax ? (a.pmin === a.pmax ? won(a.pmin) : `${won(a.pmin)} ~ ${won(a.pmax)}`) : (a.pmax ? `최고 ${won(a.pmax)}` : (a.pmin ? `${won(a.pmin)}부터` : ''));
    const meta = [a.sd && a.sg ? `${a.sd.replace(/(특별자치시|특별자치도|특별시|광역시|통합특별시)$/, '')} ${a.sg}` : '', a.k, a.hh ? `${(+a.hh).toLocaleString('ko-KR')}세대` : ''].filter(Boolean).join(' · ');
    const gong = a.ap ? `입주자모집공고 ${d10(a.pd)}` : '입주자모집공고 승인 전';
    return `<div class="jad-c">${img ? `<img src="${esc(img)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}
      <div class="t"><div class="n"><span class="jad-tag">광고</span>${esc(a.n)}</div>
      <div class="m">${esc(meta)}</div>
      ${pr ? `<div class="p">분양가 ${esc(pr)}</div>` : ''}
      <div class="m">${esc(gong)} · 광고주 ${esc(a.co)}</div>
      ${u ? `<a class="go" href="${esc(u)}" target="_blank" rel="noopener sponsored nofollow" data-ad="${esc(a.id)}">공고·홈페이지 보기 ›</a>` : ''}</div></div>`;
  }
  async function mount(el){
    if (!el || el.dataset.jadDone) return; el.dataset.jadDone = '1';
    const slot = el.dataset.jdjAds, sido = el.dataset.sido || '', max = +(el.dataset.max || 3);
    css();
    const all = (await load()).filter(a => (a.pos || []).indexOf(slot) >= 0);
    /* 같은 시·도 광고 먼저(광고끼리의 순서일 뿐, 분석 결과·추천과는 무관), 나머지는 시작일 순 */
    const list = all.sort((a, b) => ((b.sd === sido) - (a.sd === sido)) || String(a.s).localeCompare(String(b.s))).slice(0, max);
    if (!list.length){
      if (el.dataset.empty === 'invite'){ el.className = 'jad inv'; el.innerHTML = `<span>이 자리에 분양 단지를 알릴 수 있어요 · 승인된 광고만 ‘광고’로 표시돼요</span><a href="${APPLY}" data-track="ad_invite">분양 광고 문의 ›</a><a href="${ALL}" data-track="ad_invite_all">전체 광고 상품 보기 ›</a>`; el.hidden = false; }
      else el.hidden = true;
      return;
    }
    el.className = 'jad'; el.hidden = false;
    el.setAttribute('aria-label', '분양 광고');
    el.innerHTML = `<div class="jad-h"><b>분양 광고</b><small>광고주가 비용을 내고 싣는 광고예요</small></div><div class="jad-l">${list.map(card).join('')}</div>
      <div class="jad-f">광고는 장대장 분석 점수·추천 순위와 무관해요. 청약 자격·분양 조건은 입주자모집공고문으로 꼭 확인하세요. · <a href="${APPLY}">분양 광고 문의</a> · <a href="${ALL}">전체 광고 상품 보기</a></div>`;
    if (window.jdjStat) jdjStat('ad_view', {slot, n: Math.min(10, list.length)});
    el.addEventListener('click', e => {
      const t = e.target.closest && e.target.closest('a[data-ad]'); if (!t) return;
      const a = list.find(x => x.id === t.dataset.ad) || {};
      if (window.jdjStat) jdjStat('ad_click', {slot, ad_kind: a.k, sido: jdjStat.sido(a.sd)});
    });
  }
  function scan(){ document.querySelectorAll('[data-jdj-ads]').forEach(mount); }
  window.JDJ_ADS = { load, mount, scan };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scan); else scan();
})();
