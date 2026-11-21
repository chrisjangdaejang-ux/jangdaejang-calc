/* 학군·생활 정보 — 단지 화면·지도 카드·매물 설명서가 같이 쓰는 표시.
   자료: 공개 data/life/{시·도 id}.json (엔진 scripts/life.py build) =
     { at: {zone, sc, hs, aca, hos, park, mart}, src: {...}, r: {aca:[500,1000], walk, big, sc}, u: { '시군구|동|지번': {
        e: [배정 초등학교…](통학구역 안일 때만), sc/hs: [[이름, 직선 m]…](중·고등학교), a: [500m 안, 1km 안](학원·교습소),
        h: [1km 안 병·의원 수, 가장 가까운 종합병원 이름, m], p: [1km 안 공원 수, 가장 가까운 공원, m], m: [1km 안 대형마트 수, 가장 가까운 곳, m] } } }
   숫자는 자료 그대로. 자료에 없는 칸은 보여 주지 않는다(지어내지 않음). 거리는 모두 직선 거리.
   window.JDJ_LIFE = { load, unit, rows, html, srcText, compact, ELEM_NOTE } */
(function (root) {
  'use strict';
  const C = {};
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const mText = m => m >= 1000 ? `${(m / 1000).toFixed(1)}km` : `${m}m`;
  const walk = m => Math.max(1, Math.round(m / 67));            // 분당 67m(직선 거리 기준 어림, 실제 길은 더 김)
  const ymd = v => { const t = String(v || '').replace(/[^0-9]/g, ''); return t.length >= 8 ? `${t.slice(0, 4)}.${t.slice(4, 6)}.${t.slice(6, 8)}` : t.length >= 6 ? `${t.slice(0, 4)}.${t.slice(4, 6)}` : ''; };
  const ELEM_NOTE = '초등학교 배정은 교육청 통학구역으로 정해져요. 관할 교육지원청 학구도 안내에서 확인해 주세요.';
  /* base: 공개 자료 주소(…/data/), sd: 's01' → 파일 | null */
  function load(base, sd) {
    if (!sd) return Promise.resolve(null);
    if (!C[sd]) C[sd] = fetch(base + 'life/' + sd + '.json', { cache: 'no-cache' }).then(r => r.ok ? r.json() : null).catch(() => null);
    return C[sd];
  }
  const unit = (F, key) => (F && F.u && F.u[key]) || null;
  /* → [{k(항목), v(한 줄), s(출처 키), sub(작은 글씨)}] — 자료가 있는 항목만 */
  function rows(o, F, opt) {
    opt = opt || {};
    const R = (F && F.r) || {}, A = R.aca || [500, 1000], W = R.walk || 1000, out = [];
    if (!o) return out;
    if (o.e && o.e.length) out.push({ k: '배정 초등학교', s: 'zone', v: o.e.length > 1 ? `${o.e.join(' · ')} 중 한 곳(공동통학구역)` : o.e[0],
      sub: '교육청 통학구역(학구도) 기준이에요. 해마다 바뀔 수 있어 입학 전 관할 교육지원청에서 다시 확인해 주세요.' });
    else if (F && F.at && F.at.zone) out.push({ k: '배정 초등학교', s: '', v: '공식 통학구역 자료로 정하지 못했어요', sub: ELEM_NOTE });
    const sch = (a, k, s) => { if (a && a.length) out.push({ k, s, v: a.map(x => `${x[0]} ${mText(x[1])}${opt.compact ? '' : `(걸어서 약 ${walk(x[1])}분)`}`).join(' · ') });
      else if (a) out.push({ k, s, v: `직선 ${mText(R.sc || 1500)} 안에 없어요` }); };
    sch(o.sc, '가까운 중학교', 'sc'); sch(o.hs, '가까운 고등학교', 'hs');
    if (o.a) out.push({ k: '학원·교습소', s: 'aca', v: `${mText(A[0])} 안 ${o.a[0].toLocaleString()}곳 · ${mText(A[1])} 안 ${o.a[1].toLocaleString()}곳` });
    if (o.h) out.push({ k: '병원·의원', s: 'hos', v: `${mText(W)} 안 ${o.h[0].toLocaleString()}곳` + (o.h[1] ? ` · 가장 가까운 종합병원 ${o.h[1]}(${mText(o.h[2])})` : ` · ${mText(R.big || 5000)} 안에 종합병원은 없어요`) });
    if (o.p) out.push({ k: '공원', s: 'park', v: o.p[0] ? `${mText(W)} 안 ${o.p[0].toLocaleString()}곳 · 가장 가까운 곳 ${o.p[1]}(${mText(o.p[2])})` : `${mText(W)} 안에 도시공원이 없어요` });
    if (o.m) out.push({ k: '대형마트', s: 'mart', v: o.m[0] ? `${mText(W)} 안 ${o.m[0].toLocaleString()}곳 · 가장 가까운 곳 ${o.m[1]}(${mText(o.m[2])})` : `${mText(W)} 안에 대형마트가 없어요` });
    return out;
  }
  /* 출처·기준일 한 줄: '출처: 학구도안내서비스 …(2026.09.20) · …' */
  function srcText(F, keys) {
    if (!F || !F.src) return '';
    const seen = new Set(), parts = [];
    for (const k of keys) { const t = F.src[k]; if (!t || seen.has(t)) continue; seen.add(t); parts.push(`${t}${F.at && F.at[k] ? ` ${ymd(F.at[k])} 기준` : ''}`); }
    return parts.length ? '출처: ' + parts.join(' · ') : '';
  }
  /* 단지 화면 칸 */
  function html(o, F, opt) {
    opt = opt || {};
    const R = rows(o, F, opt);
    if (!R.length) return opt.empty ? `<p class="jlf-miss">${esc(opt.empty)}</p><p class="jlf-sub">${esc(ELEM_NOTE)}</p>` : '';
    const hasE = R.some(r => r.k === '배정 초등학교');
    return `<dl class="jlf">${R.map(r => `<div><dt>${esc(r.k)}</dt><dd>${esc(r.v)}${r.sub ? `<small>${esc(r.sub)}</small>` : ''}</dd></div>`).join('')}</dl>`
      + (hasE ? '' : `<p class="jlf-sub">${esc(ELEM_NOTE)}</p>`)
      + `<p class="jlf-src">거리는 모두 직선 거리라 실제로 걷는 길은 더 길어요. ${esc(srcText(F, R.map(r => r.s).filter(Boolean)))}</p>`;
  }
  /* 지도 카드용 짧은 줄: '배정 ○○초 · 학원 1km 안 123곳 · 병·의원 45곳 · 공원 3곳' */
  function compact(o, F) {
    if (!o) return '';
    const R = (F && F.r) || {}, A = R.aca || [500, 1000], p = [];
    if (o.e && o.e.length) p.push(`배정 ${o.e.slice(0, 2).join('·')}`);
    if (o.sc && o.sc.length) p.push(`중학교 ${o.sc[0][0]} ${mText(o.sc[0][1])}`);
    if (o.a) p.push(`학원 ${mText(A[1])} 안 ${o.a[1].toLocaleString()}곳`);
    if (o.h) p.push(`병·의원 ${o.h[0].toLocaleString()}곳`);
    if (o.p) p.push(`공원 ${o.p[0].toLocaleString()}곳`);
    if (o.m) p.push(`대형마트 ${o.m[0].toLocaleString()}곳`);
    return p.join(' · ');
  }
  /* 짧은 출처(지도 카드): '학구도안내서비스 2026.09.20 · 건강보험심사평가원 2026.09' — 보여 준 항목만 */
  const SHORT = { zone: '학구도안내서비스', sc: '학교알리미', hs: '학교알리미', aca: '나이스 학원정보', hos: '건강보험심사평가원', park: '도시공원 표준데이터', mart: '소상공인 상가정보' };
  function srcShort(o, F) {
    if (!o || !F) return '';
    const ks = [o.e && o.e.length ? 'zone' : '', o.sc && o.sc.length ? 'sc' : '', o.a ? 'aca' : '', o.h ? 'hos' : '', o.p ? 'park' : '', o.m ? 'mart' : ''].filter(Boolean);
    const seen = new Set(), out = [];
    for (const k of ks) { const n = SHORT[k]; if (seen.has(n)) continue; seen.add(n); out.push(`${n}${F.at && F.at[k] ? ' ' + ymd(F.at[k]) : ''}`); }
    return out.length ? '출처: ' + out.join(' · ') + ' 기준' : '';
  }
  /* 화면에 실제로 보이는 항목 이름만: '학교·병원' (자료 없는 항목은 이름도 안 나옴) */
  const TOPIC = [['학교', o => !!(o.e && o.e.length) || !!(o.sc && o.sc.length) || !!(o.hs && o.hs.length)], ['학원', o => !!o.a], ['병원', o => !!o.h], ['공원', o => !!(o.p && o.p[0])], ['대형마트', o => !!(o.m && o.m[0])]];
  function topics(o) { return o ? TOPIC.filter(t => t[1](o)).map(t => t[0]).join('·') : ''; }
  /* 소제목: '공공 자료로 이 단지 주변 학교·병원을 정리했어요' */
  function lead(o) { const t = topics(o); return t ? `공공 자료로 이 단지 주변 ${t}${/[가-힣]$/.test(t) && ((t.charCodeAt(t.length - 1) - 0xAC00) % 28) ? '을' : '를'} 정리했어요` : '공공 자료로 이 단지 주변 정보를 정리했어요'; }
  function css(doc) {
    doc = doc || (typeof document !== 'undefined' ? document : null);
    if (!doc || doc.getElementById('jlf-css')) return;
    const st = doc.createElement('style'); st.id = 'jlf-css';
    st.textContent = '.jlf{margin:8px 0 0;display:grid;gap:0}.jlf>div{display:grid;grid-template-columns:118px 1fr;gap:10px;padding:10px 0;border-top:1px solid #F0F1F3}'
      + '.jlf>div:first-child{border-top:0}.jlf dt{font-weight:700;color:#4E5968;font-size:14.5px}.jlf dd{margin:0;font-size:15px;color:#191F28;line-height:1.55;font-weight:600}'
      + '.jlf dd small{display:block;font-weight:500;color:#5F6B7A;font-size:13px;margin-top:2px}'
      + '.jlf-sub,.jlf-miss{font-size:13.5px;color:#4E5968;margin:8px 0 0;line-height:1.6}.jlf-src{font-size:12.5px;color:#5F6B7A;margin:10px 0 0;line-height:1.6}'
      + '@media(max-width:420px){.jlf>div{grid-template-columns:1fr;gap:2px}}';
    doc.head.appendChild(st);
  }
  const API = { load, unit, rows, html, srcText, srcShort, compact, topics, lead, css, ELEM_NOTE, mText, walk };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  root.JDJ_LIFE = API;
})(typeof window !== 'undefined' ? window : globalThis);
