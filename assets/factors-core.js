/* 집값 요인 성적표(공개 자료 data/factors.json — 엔진 scripts/leakfree.py pub_factors) 읽기·문장 만들기.
   요인마다 '해당 단지가 같은 구 평균보다(구 단위 요인은 해당 구 단지가 같은 시·도 평균보다) 몇 %p 더(덜) 올랐는지'를
   점수를 매긴 뒤 1~6개월 안에 실제로 살 수 있었던 가격 기준으로 잰 과거 결과예요. 결합 비중·기준값은 비공개.
   window.JDJ_FX = { load, VTXT, line, best, cardsHtml, scoreRec, upIds, H }  · node: module.exports 같은 것 */
(function (root) {
  'use strict';
  var JB = (typeof window !== 'undefined' && window.JDJ_BASE) || (function (p) { var g = p.indexOf('/jangdaejang-calc/') === 0, b = { SITE: g ? '/jangdaejang-calc/' : '/', DATA: g ? '/jangdaejang-data/' : 'https://chrisjangdaejang-ux.github.io/jangdaejang-data/' }; if (typeof window !== 'undefined') window.JDJ_BASE = b; return b; })((typeof location !== 'undefined' && location.pathname) || '/jangdaejang-calc/');
  const VTXT = { up: '꾸준히 더 올랐어요', down: '꾸준히 덜 올랐어요', none: '일관된 차이가 없었어요', mixed: '시기·장세마다 방향이 달랐어요', few: '사례가 모자라 판단하지 않았어요' };
  const H = ['1', '2', '3'];
  const GN = { '04': '4월', '10': '10월' };
  const RT = { seoul: '서울', metro: '경기·인천', local: '지방' };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const sg = v => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(1);
  let P = null;
  function load() {
    if (P) return P;
    P = (typeof fetch === 'function' ? fetch(JB.DATA + 'data/factors.json', { cache: 'no-cache' }).then(r => r.ok ? r.json() : null).catch(() => null) : Promise.resolve(null));
    return P;
  }
  /* 한 기간의 두 격자 중 시기가 많은 쪽(같으면 4월) → { g, n, pos, avg, ci, units, reg, by } */
  function best(hv) {
    const G = (hv && hv.g) || {}; let b = null;
    for (const g of ['04', '10']) { const s = G[g]; if (s && s.n && (!b || s.n > b.n)) b = Object.assign({ g }, s); }
    return b;
  }
  /* 기간 한 줄: '2년 뒤 같은 구 평균보다 +4.3%p · 10번 중 10번 더 올랐어요(4월 기준)' — 판정 문장 포함 */
  function line(f, h) {
    const hv = f && f.h && f.h[h]; if (!hv) return null;
    const b = best(hv); if (!b) return null;
    const base = f.level === 'g' ? '같은 시·도 평균' : '같은 구 평균';
    const ci = b.ci ? ` (95% 구간 ${sg(b.ci[0])}~${sg(b.ci[1])}%p)` : '';
    return { h: +h, v: hv.v, text: `${h}년 뒤 ${base}보다 ${sg(b.avg)}%p · 시기 ${b.n}번 중 ${b.pos}번 더 올랐어요(${GN[b.g]} 기준${b.units ? `, 시기마다 평균 ${Number(b.units).toLocaleString('ko-KR')}곳` : ''})${ci}`, verdict: VTXT[hv.v] || '', b };
  }
  const upIds = F => ((F && F.factors) || []).filter(f => f.level === 'u' && H.some(h => f.h && f.h[h] && f.h[h].v === 'up')).map(f => f.id);
  const byId = (F, id) => ((F && F.factors) || []).find(f => f.id === id) || null;
  /* 이 단지에 해당하는 요인 카드(fx = 단지 요인 id 목록, rtype = 'seoul'|'metro'|'local') */
  function css() {
    if (typeof document === 'undefined' || document.getElementById('jdj-fx-css')) return;
    const st = document.createElement('style'); st.id = 'jdj-fx-css';
    st.textContent = '.fx-list{list-style:none;margin:8px 0 0;padding:0;display:grid;gap:10px}.fx-c{border:1px solid var(--line,#e5e7eb);border-radius:14px;padding:12px 14px;background:#fff}'
      + '.fx-c.fx-up{border-color:#BFE3D8;background:#F4FBF8}.fx-c.fx-down{border-color:#F3C9C9;background:#FFF7F7}.fx-c>b{font-size:16px;display:block;margin-bottom:4px}'
      + '.fx-c ul{margin:0;padding-left:18px;font-size:14.5px;line-height:1.65;color:var(--sub,#4b5563)}.fx-c small{display:block;margin-top:4px;font-size:13px;color:var(--sub2,#6b7280)}'
      + '.fx-v{font-weight:700;color:var(--text,#111)}.fx-v.fx-up{color:#0E7C66}.fx-v.fx-down{color:#C2410C}.fx-note{font-size:13.5px;color:var(--sub2,#6b7280);line-height:1.6;margin:8px 0 0}';
    document.head.appendChild(st);
  }
  function cardsHtml(F, fx, o) {
    o = o || {}; css();
    const L = (fx || []).map(id => byId(F, id)).filter(Boolean);
    if (!L.length) return '';
    const asof = F.asof ? `${String(F.asof).slice(0, 4)}년 ${+String(F.asof).slice(4, 6)}월` : '';
    const card = f => {
      const ls = H.map(h => line(f, h)).filter(Boolean);
      const dir = ls.some(x => x.v === 'up') ? 'up' : ls.some(x => x.v === 'down') ? 'down' : '';
      const rt = o.rtype && ls.length ? ls.map(x => { const bb = x.b && x.b.by && x.b.by[o.rtype]; return bb && bb.n ? `${x.h}년 ${sg(bb.avg)}%p(${bb.n}번)` : ''; }).filter(Boolean).join(' · ') : '';
      return `<li class="fx-c fx-${dir}"><b>${esc(f.name)}</b>
        <ul>${ls.map(x => `<li><span class="fx-v fx-${x.v}">${esc(x.verdict)}</span> ${esc(x.text)}</li>`).join('')}</ul>
        ${rt ? `<small>${esc(RT[o.rtype] || '')} 단지만 보면: ${esc(rt)}</small>` : ''}
        ${f.src ? `<small>자료: ${esc(f.src)}</small>` : ''}</li>`;
    };
    return `<ul class="fx-list">${L.map(card).join('')}</ul>
      <p class="fx-note">과거 여러 시기의 평균이에요${asof ? ` (${esc(asof)} 자료까지)` : ''}. 이 단지가 꼭 그렇게 된다는 뜻은 아니고, 요인끼리 함께 있을 때 효과가 더해지는지는 따로 확인되지 않았어요.</p>`;
  }
  /* 점수(결합 예측) 성적 — factors.json score[h] = {status, grids{g:{n,avg,ci,hit}}, why} → { ok, text } */
  function scoreRec(F, h) {
    const s = F && F.score && F.score[String(h)]; if (!s) return null;
    const gs = Object.entries(s.grids || {}).filter(([, g]) => g && g.n);
    if (!gs.length) return { ok: false, text: `${h}년 점수는 과거에 맞춰 볼 시기가 모자라요.` };
    const n = gs.reduce((a, [, g]) => a + g.n, 0), hit = gs.reduce((a, [, g]) => a + (g.hit || 0), 0);
    const parts = gs.map(([k, g]) => `${GN[k]} 기준 ${g.n}번 중 ${g.hit}번, 평균 ${sg(g.avg)}%p`).join(' · ');
    return { ok: s.status === 'pass', n, hit, text: `${h}년 점수의 과거 성적: ${n}번 중 ${hit}번 맞음(${parts})${s.status === 'pass' ? '' : ' — 우리 기준을 넘지 못해 참고용이에요'}` };
  }
  const API = { load, VTXT, line, best, cardsHtml, scoreRec, upIds, byId, css, H, RT };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') root.JDJ_FX = API;
})(typeof window !== 'undefined' ? window : this);
