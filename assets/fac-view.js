/* 단지 시설 — 단지 화면·지도 카드·매물 설명서가 같이 쓰는 표시.
   자료: 공개 data/fac/{시·도 id}.json (엔진 scripts/facility.py build) =
     { src: '국토교통부 공동주택관리정보시스템(K-apt)', note: '관리사무소가 등록한 정보예요. 실제와 다를 수 있어요', at: [가장 이른 조회일, 가장 늦은 조회일],
       u: { '시군구|동|지번'(한 지번에 단지가 여럿이면 '…|단지명'): {
         f: [정리한 시설 이름…], t: '관리사무소가 적은 원문', pk: [총 주차대수, 지하, 세대수, 세대당](세대수를 믿을 수 없으면 뒤 두 칸 null),
         cc: CCTV 대수, el: 승강기 대수, ev: 전기차 충전기 대수, n: K-apt 단지 이름, at: 조회일 } } }
   숫자는 자료 그대로. 자료에 없는 칸은 보여 주지 않는다(지어내지 않음). 자료가 하나도 없으면 칸 전체를 숨긴다.
   window.JDJ_FAC = { load, unit, rows, html, compact, srcShort, has, css } */
(function (root) {
  'use strict';
  const C = {};
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const n = v => Number(v).toLocaleString('ko-KR');
  const ymd = v => { const t = String(v || '').replace(/[^0-9]/g, ''); return t.length >= 8 ? `${t.slice(0, 4)}.${t.slice(4, 6)}.${t.slice(6, 8)}` : t.length >= 6 ? `${t.slice(0, 4)}.${t.slice(4, 6)}` : ''; };
  const NOTE = '관리사무소가 등록한 정보예요. 실제와 다를 수 있어요';
  /* base: 공개 자료 주소(…/data/), sd: 's01' → 파일 | null */
  function load(base, sd) {
    if (!sd) return Promise.resolve(null);
    if (!C[sd]) C[sd] = fetch(base + 'fac/' + sd + '.json', { cache: 'no-cache' }).then(r => r.ok ? r.json() : null).catch(() => null);
    return C[sd];
  }
  /* key: '시군구|동|지번', apt: 우리 단지 이름(한 지번에 단지가 여럿일 때) */
  function unit(F, key, apt) {
    if (!F || !F.u || !key) return null;
    const o = (apt && F.u[key + '|' + apt]) || F.u[key] || null;
    return o && (o.f && o.f.length || o.pk || o.cc || o.el || o.ev) ? o : null;
  }
  const has = (o, name) => !!(o && o.f && o.f.indexOf(name) >= 0);
  function parkText(pk, short) {
    if (!pk || !(pk[0] > 0)) return '';
    const tot = `총 ${n(pk[0])}대${pk[1] > 0 && !short ? (pk[1] === pk[0] ? '(모두 지하)' : `(지하 ${n(pk[1])}대)`) : ''}`;
    return pk[3] != null ? (short ? `세대당 ${pk[3].toFixed(2)}대` : `세대당 ${pk[3].toFixed(2)}대 · ${tot}`) : (short ? `주차 ${tot}` : tot);
  }
  /* → [{k(항목), v(한 줄), sub(작은 글씨), chips}] — 자료가 있는 항목만 */
  function rows(o) {
    const out = [];
    if (!o) return out;
    if (o.f && o.f.length) {
      const inner = ['피트니스', 'GX·요가', '골프연습장', '수영장', '사우나', '실내체육관', '독서실'].some(x => o.f.indexOf(x) >= 0);
      out.push({ k: '커뮤니티·복리시설', v: o.f.join(' · '), chips: o.f.slice(),
        sub: o.f.indexOf('주민공동시설') >= 0 && !inner ? '주민공동시설 안에 피트니스·독서실 등이 있는지는 공공 자료에 따로 나오지 않아요. 관리사무소에 물어보면 정확해요.' : '' });
    }
    const pt = parkText(o.pk);
    if (pt) out.push({ k: '주차', v: pt, sub: o.pk[3] != null ? `주차 칸 수를 세대 수(${n(o.pk[2])}세대)로 나눈 값이에요. 1대가 넘으면 한 집에 한 대 이상 댈 수 있다는 뜻이에요.`
      : '세대 수 자료를 아직 확인하지 못해 세대당 대수는 계산하지 않았어요.' });
    if (o.cc > 0) out.push({ k: 'CCTV', v: `${n(o.cc)}대` });
    if (o.el > 0) out.push({ k: '승강기', v: `${n(o.el)}대` });
    if (o.ev > 0) out.push({ k: '전기차 충전기', v: `${n(o.ev)}대` });
    return out;
  }
  function srcText(o, F) {
    const src = (F && F.src) || '국토교통부 공동주택관리정보시스템(K-apt)';
    return `출처: ${src}${o && o.at ? ` · ${ymd(o.at)} 조회` : ''}`;
  }
  /* 단지 화면 칸: 자료가 없으면 '' (칸을 숨김) */
  function html(o, F) {
    const R = rows(o);
    if (!R.length) return '';
    const note = (F && F.note) || NOTE;
    return `<dl class="jfc">${R.map(r => `<div><dt>${esc(r.k)}</dt><dd>${r.chips ? `<span class="jfc-chips">${r.chips.map(c => `<span class="jfc-chip">${esc(c)}</span>`).join('')}</span>` : esc(r.v)}${r.sub ? `<small>${esc(r.sub)}</small>` : ''}</dd></div>`).join('')}</dl>`
      + (o.t ? `<details class="jfc-raw"><summary>관리사무소가 적은 원래 글 보기</summary><p>${esc(o.t)}</p></details>` : '')
      + `<p class="jfc-note">${esc(note)}. ${esc(srcText(o, F))}</p>`;
  }
  /* 지도 카드용 짧은 줄: '피트니스 · 독서실 · 어린이집 외 2곳 · 세대당 1.33대' */
  function compact(o, max) {
    if (!o) return '';
    max = max || 3;
    const p = [];
    if (o.f && o.f.length) p.push(o.f.slice(0, max).join(' · ') + (o.f.length > max ? ` 외 ${o.f.length - max}개` : ''));
    const pt = parkText(o.pk, true);
    if (pt) p.push(pt);
    if (!p.length && o.cc > 0) p.push(`CCTV ${n(o.cc)}대`);
    return p.map(x => x.replace(/(세대당|총|주차|CCTV) (?=[\d총])/g, '$1\u00a0').replace(/ (?=\d[\d,]*대)/g, '\u00a0')).join(' · ');
  }
  function srcShort(o) { return `관리사무소 등록 정보 · K-apt${o && o.at ? ' ' + ymd(o.at) + ' 조회' : ''}`; }
  function css(doc) {
    doc = doc || (typeof document !== 'undefined' ? document : null);
    if (!doc || doc.getElementById('jfc-css')) return;
    const st = doc.createElement('style'); st.id = 'jfc-css';
    st.textContent = '.jfc{margin:8px 0 0;display:grid;gap:0}.jfc>div{display:grid;grid-template-columns:118px 1fr;gap:10px;padding:10px 0;border-top:1px solid #F0F1F3}'
      + '.jfc>div:first-child{border-top:0}.jfc dt{font-weight:700;color:#4E5968;font-size:14.5px}.jfc dd{margin:0;font-size:15px;color:#191F28;line-height:1.55;font-weight:600;font-variant-numeric:tabular-nums;min-width:0}'
      + '.jfc dd small{display:block;font-weight:500;color:#5F6B7A;font-size:13px;margin-top:2px}'
      + '.jfc-chips{display:flex;flex-wrap:wrap;gap:6px}.jfc-chip{display:inline-block;padding:3px 10px;border-radius:999px;background:#F2F4F6;color:#333D4B;font-size:13.5px;font-weight:600;line-height:1.5}'
      + '.jfc-raw{margin:8px 0 0;font-size:13px;color:#4E5968}.jfc-raw summary{cursor:pointer;font-weight:600;color:#4E5968;padding:4px 0}.jfc-raw p{margin:4px 0 0;line-height:1.6;word-break:keep-all;overflow-wrap:anywhere}'
      + '.jfc-note{font-size:12.5px;color:#5F6B7A;margin:10px 0 0;line-height:1.6}'
      + '@media(max-width:420px){.jfc>div{grid-template-columns:1fr;gap:4px}}';
    doc.head.appendChild(st);
  }
  const API = { load, unit, rows, html, compact, srcShort, srcText, has, css, parkText, NOTE };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  root.JDJ_FAC = API;
})(typeof window !== 'undefined' ? window : globalThis);
