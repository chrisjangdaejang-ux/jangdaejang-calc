/* 단지 화면 [데이터 출처 보기] 접는 상자 — 내 집 시세(mine/)·내 집 마련 리포트(buy/report/) 공용, 테스트 tools/src-test.js.
   그 단지 화면에 실제로 쓴 자료만 줄로 만든다(점수 묶음 fx 에 그 항목 값이 있을 때만). 없는 자료를 출처로 적지 않는다.
   기준일은 공개 index.json 의 갱신일(updated)·실거래 마지막 계약 달(dataTo)만 읽는다(날짜를 지어내지 않음).
   기관 이름은 서비스 소개(about/) '출처·갱신'과 같은 표기.
   window.JDJ_SRC = { rows(ctx), html(rows, IX) }  ctx = { IX, f(점수 묶음, 없으면 null), jeonse(전세 시세를 화면에 보였으면 true) } */
(function (root) {
  'use strict';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ym = s => s ? `${String(s).slice(0, 4)}년 ${+String(s).slice(4, 6)}월` : '';
  const ymd = s => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || '')); return m ? `${m[1]}.${m[2]}.${m[3]}` : ''; };
  const has = v => v != null && v !== '' && !(Array.isArray(v) && !v.length);

  function rows(ctx) {
    const IX = (ctx && ctx.IX) || {}, f = (ctx && ctx.f) || {}, up = ymd(IX.updated), out = [];
    const upd = up ? `${up} 반영` : '';
    const to = IX.dataTo || (IX.price && IX.price.to);
    if (to) out.push({ k: '매매 실거래가', at: `${ym(to)} 계약분까지` + (up ? ` · ${up} 반영` : ''), org: '국토교통부 아파트 매매 실거래가(공공데이터포털)' });
    if ((ctx && ctx.jeonse) || has(f.jr)) {
      const rt = (IX.price && IX.price.to) || to;
      out.push({ k: '전세 실거래가(전세가율)', at: rt ? `${ym(rt)} 계약분까지` + (up ? ` · ${up} 반영` : '') : upd, org: '국토교통부 아파트 전월세 실거래가(공공데이터포털)' });
    }
    if (has(f.hh) || has(f.by)) out.push({ k: '세대수·준공 연도', at: upd, org: '국토교통부 공동주택관리정보시스템(K-apt)' });
    if (has(f.sub) || has(f.subs)) out.push({ k: '가까운 지하철역', at: upd, org: '국토교통부 공동주택관리정보시스템(K-apt)' });
    if (has(f.sl)) out.push({ k: '신설역 계획·공사', at: upd, org: '국토교통부·국가철도공단·지자체 공식 발표' });
    if (has(f.rz) || has(f.land)) out.push({ k: '재건축 사업성(용적률·대지면적)', at: upd, org: '국토교통부 건축물대장(건축HUB)' });
    if (has(f.sch) || has(f.schn)) out.push({ k: '학군(중학교 전·출입 학생 수)', at: upd, org: '교육부 학교알리미' });
    if (has(f.sup)) out.push({ k: '입주 예정 물량', at: upd, org: '한국부동산원 청약홈 분양정보' });
    if (has(f.pg)) out.push({ k: '인구·세대 변화', at: upd, org: '통계청 KOSIS 주민등록 인구' });
    if (has(f.jb)) out.push({ k: '일자리 변화', at: upd, org: '통계청 지역별고용조사(KOSIS)' });
    if (has(f.un) || has(f.unc)) out.push({ k: '미분양', at: upd, org: '국토교통부 미분양 현황(KOSIS)' });
    return out;
  }

  const CSS = '.jsrc{margin:14px 0 0;border:1px solid var(--line,#E5E8EB);border-radius:14px;background:#fff}'
    + '.jsrc>summary{list-style:none;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:8px;min-height:48px;padding:0 16px;font-size:15px;font-weight:700;color:var(--sub,#3E4754)}'
    + '.jsrc>summary::-webkit-details-marker{display:none}.jsrc>summary::after{content:"＋";font-weight:700;color:var(--sub2,#4E5968)}.jsrc[open]>summary::after{content:"－"}'
    + '.jsrc .jsrc-in{padding:0 16px 14px}.jsrc table{width:100%;border-collapse:collapse;font-size:14px;line-height:1.5}'
    + '.jsrc th,.jsrc td{text-align:left;vertical-align:top;padding:9px 6px;border-top:1px solid var(--line2,#F0F1F3)}.jsrc th{font-size:13px;color:var(--sub2,#4E5968);font-weight:700;white-space:nowrap}'
    + '.jsrc td:first-child{font-weight:700;color:var(--text,#191F28);word-break:keep-all}.jsrc td:nth-child(2){white-space:nowrap;color:var(--sub,#3E4754)}.jsrc td:nth-child(3){color:var(--sub,#3E4754);word-break:keep-all}'
    + '.jsrc p{margin:10px 0 0;font-size:13.5px;color:var(--sub2,#4E5968);line-height:1.6}'
    + '@media(max-width:480px){.jsrc thead{display:none}.jsrc tr{display:block;border-top:1px solid var(--line2,#F0F1F3);padding:8px 0}.jsrc td{display:block;border:0;padding:1px 0}.jsrc td:nth-child(2){white-space:normal;font-size:13.5px}.jsrc td:nth-child(2)::before{content:"기준일 ";color:var(--sub2,#4E5968)}.jsrc td:nth-child(3)::before{content:"출처 ";color:var(--sub2,#4E5968)}}';
  function css() {
    if (typeof document === 'undefined' || document.getElementById('jsrc-css')) return;
    const s = document.createElement('style'); s.id = 'jsrc-css'; s.textContent = CSS; document.head.appendChild(s);
  }

  function html(rs) {
    if (!rs || !rs.length) return '';
    css();
    return `<details class="jsrc"><summary>데이터 출처 보기</summary><div class="jsrc-in"><table><thead><tr><th>구분</th><th>기준일</th><th>출처 기관</th></tr></thead><tbody>`
      + rs.map(r => `<tr><td>${esc(r.k)}</td><td>${esc(r.at || '-')}</td><td>${esc(r.org)}</td></tr>`).join('')
      + `</tbody></table><p>이 단지 화면에 쓴 자료만 적었어요. 기준일은 집예보가 공공기관 자료를 마지막으로 반영한 날이고, 실거래는 계약한 달 기준이에요. 통계는 기관마다 발표 주기(매월·반기·연 1회)가 달라요. <a href="/jangdaejang-calc/about/">분석 방법 보기</a></p></div></details>`;
  }

  const API = { rows, html, CSS };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  root.JDJ_SRC = API;
})(typeof window !== 'undefined' ? window : globalThis);
