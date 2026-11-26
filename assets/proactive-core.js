/* 집예보가 먼저 챙겨 드려요(PROACTIVE) — 2단계 '내 단지·내 동네 변화' 계산. 화면 없음.
   알림 센터(my/alerts/)·'집예보가 기억하는 것'(my/memory/)·소개 페이지(alerts/)·서버 하루 묶음 메일(tools/agent-backend.gs v63)이 함께 쓴다.
   - 아래 'PRO-CORE' 블록은 tools/agent-backend.gs 에 글자 그대로 복사돼 있다(서버는 다른 파일을 불러올 수 없어서). tools/proactive-test.js 가 두 곳이 같은지 확인한다.
   - 사용자가 직접 켠 것만(알림 설정 pv — ALERTS-CORE axCleanPv): home(내 집 단지 실거래 알림은 ALERTS-CORE 를 그대로 씀) · reg · zone.
   - 숫자·날짜는 공개 자료 값 그대로. 서버에는 날짜·단지·구역 같은 금액 없는 값만 있다.
   - 자료: data/policy.json(엔진 scripts/policy.py — 공식 발표 원문을 확인한 정책만, 단계·날짜·적용 지역)
           data/redev/zones.json(엔진 scripts/redev_map.py — 서울 열린데이터광장 정비사업 추진현황, 단계 번호 st·단계 이력 h)
   window.JDJ_PRO_CORE */
(function (root) {
'use strict';
/* PRO-CORE BEGIN — 이 블록은 tools/agent-backend.gs 에 그대로 복사돼 있어요. 고칠 때는 두 곳을 똑같이 고쳐 주세요(node tools/proactive-test.js 가 비교). */
const PV_V = 'pro-2026-11-26';
const PV_KINDS = { home: '내 집 단지 새 거래', reg: '내 동네 규제 변화', zone: '따라보는 구역 단계 변화' };
const PV_REG_TYPES = { '규제지역': '규제지역(투기과열지구·조정대상지역)', '토허': '토지거래허가구역' };
const PV_REG_STAGES = { '발표': '발표됐어요', '시행': '효력이 생겼어요', '연장': '기간이 연장됐어요', '해제': '해제됐어요', '철회': '철회됐어요' };
const PV_REG_DAYS = 14;                              // 단계 날짜가 오늘부터 이 날 수 안(지난 쪽)일 때만 알림(늦게 켠 분께 오래된 소식이 가지 않게)
const PV_METRO = ['11', '28', '41'];
function pvEsc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function pvT(iso) { return Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)); }
function pvDiff(a, b) { return Math.round((pvT(b) - pvT(a)) / 864e5); }
/** 정책 단계 날짜: 'YYYY-MM-DD' 그대로, 'YYYY-MM'(날짜 없이 달만 확인된 것)은 그 달 1일 */
function pvDay(d) { d = String(d || ''); return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : /^\d{4}-\d{2}$/.test(d) ? d + '-01' : ''; }
function pvKo(iso) { return iso ? `${+iso.slice(0, 4)}년 ${+iso.slice(5, 7)}월 ${+iso.slice(8, 10)}일` : ''; }
/* 적용 지역 판정 — assets/policy-view.js applies() 와 같은 규칙(all · metro · nonmetro · 시·도 2자리 · 시·군·구 5자리 · '코드:동') */
function pvTok(t, g, d) {
  if (t === 'all') return true;
  if (t === 'metro') return PV_METRO.indexOf(g.slice(0, 2)) >= 0;
  if (t === 'nonmetro') return PV_METRO.indexOf(g.slice(0, 2)) < 0;
  const i = t.indexOf(':');
  if (i > 0) return t.slice(0, i) === g && !!d && (d === t.slice(i + 1) || d.split(' ').pop() === t.slice(i + 1));
  if (t.length === 2) return g.slice(0, 2) === t;
  return t === g;
}
function pvApplies(p, g, d) {
  if (!(p.in || []).some(t => pvTok(t, g, d))) return false;
  return !(p.not || []).some(t => pvTok(t, g, d));
}
/** 내 동네 목록: 내 집·관심 단지(cleanPlace 꼴 {code, dong}) → [{g, d}] (같은 동은 한 번, 최대 15곳) */
function pvAreas(places) {
  const seen = {}, out = [];
  (places || []).forEach(p => { if (!p || !/^\d{5}$/.test(String(p.code || '')) || !p.dong) return; const k = p.code + '|' + p.dong; if (!seen[k]) { seen[k] = 1; out.push({ g: String(p.code), d: String(p.dong) }); } });
  return out.slice(0, 15);
}
/** 규제지역·토지거래허가구역 지정·해제 알림. pol = policy.json, areas = pvAreas, today·since 'YYYY-MM-DD', gname(코드) → 구 이름
    → [{k:'reg', key, pid, stage, d, t, s, u, src, where}] — 정책·단계 하나에 알림 하나(내 동네 여러 곳이면 이름을 모아 적음) */
function pvRegEvents(pol, areas, today, since, gname) {
  const out = [], gn = gname || (() => '');
  if (!pol || !Array.isArray(pol.policies) || !today) return out;
  const lo = pvDiff('2000-01-01', today) - PV_REG_DAYS;
  pol.policies.forEach(p => {
    if (!p || !p.id || !(p.types || []).some(t => PV_REG_TYPES[t])) return;
    const hit = (areas || []).filter(a => pvApplies(p, a.g, a.d));
    if (!hit.length) return;
    const where = hit.slice(0, 3).map(a => `${gn(a.g)} ${a.d}`.trim()).join(', ') + (hit.length > 3 ? ` 외 ${hit.length - 3}곳` : '');
    (p.stages || []).forEach(st => {
      const day = pvDay(st && st.d), lab = st && PV_REG_STAGES[st.s];
      if (!day || !lab || day > today || pvDiff('2000-01-01', day) < lo || (since && day < since)) return;
      const kinds = (p.types || []).filter(t => PV_REG_TYPES[t]).map(t => PV_REG_TYPES[t]).join('·');
      const src = Array.isArray(p.src) && Array.isArray(p.src[0]) && /^https:\/\//.test(String(p.src[0][1] || '')) ? { nm: String(p.src[0][0] || '공식 발표').slice(0, 80), url: String(p.src[0][1]) } : null;
      const key = `r|${p.id}|${st.s}|${day}`;
      out.push({ k: 'reg', key: key, pid: p.id, stage: st.s, d: day, where: where,
        t: `내 동네(${where}) ${kinds} 소식: ${String(p.name || '').slice(0, 60)} — ${lab}`,
        s: `${/^\d{4}-\d{2}$/.test(String(st.d)) ? `${+day.slice(0, 4)}년 ${+day.slice(5, 7)}월` : pvKo(day)} ${st.s}${st.note ? ` · ${String(st.note).slice(0, 60)}` : ''}. ${p.dir === 'ease' ? '규제가 풀리면 대출 한도·세금·실거주 의무가 달라질 수 있어요.' : '규제지역·토지거래허가구역이 되면 대출 한도가 줄고, 집을 살 때 허가를 받아 직접 살아야 할 수 있어요.'} 내 조건에 맞는 영향은 대출·세금 계산기에서 확인해 보세요.`,
        u: src ? src.url : '', src: src });
    });
  });
  return out.sort((a, b) => a.d < b.d ? 1 : a.d > b.d ? -1 : a.key < b.key ? -1 : 1);
}
/** 따라보는 재개발·재건축 구역 단계 변화. Z = zones.json, follows = pv.zones [{id, st, n}]
    → [{k:'zone', key, id, st(새 단계), st0, t, s}] — 따라보기 시작할 때(또는 마지막 알림 때) 단계보다 올라간 구역만. 단계가 내려간 자료 고침은 알리지 않음 */
function pvZoneEvents(Z, follows) {
  const out = []; if (!Z || !Array.isArray(Z.z)) return out;
  const byId = {}; Z.z.forEach(z => { if (z && z.id) byId[z.id] = z; });
  const names = Z.stages || {};
  (follows || []).forEach(f => {
    const z = byId[f.id]; if (!z || !(z.st > f.st)) return;
    const h = (z.h || []).filter(x => Array.isArray(x) && x[0] === z.st).map(x => String(x[1] || '')).pop() || '';
    const ym = /^\d{6}$/.test(h) ? `${h.slice(0, 4)}년 ${+h.slice(4)}월` : '';
    out.push({ k: 'zone', key: `z|${z.id}|${z.st}`, id: z.id, st: z.st, st0: f.st,
      t: `따라보는 구역 ${String(z.n || f.n || '').slice(0, 30)}${z.gn ? `(${z.gn}${z.umd ? ' ' + z.umd : ''})` : ''}이 다음 단계로 넘어갔어요: ${z.sn || names[z.st] || ''}`,
      s: `${f.st && names[f.st] ? `'${names[f.st]}'에서 ` : ''}'${z.sn || names[z.st] || ''}' 단계가 됐어요${ym ? `(${ym}, 서울시 정비사업 추진현황 기준)` : ''}. 단계가 바뀌면 이주·분담금·입주 시기가 달라질 수 있어요. 구역 지도에서 착공까지 예상 기간을 다시 확인해 보세요.` });
  });
  return out;
}
/** 메일 칸: items = pvRegEvents·pvZoneEvents, o = { site, web(끝 /), off(이 알림만 끄기 링크) } → html. 광고 없음 */
function pvMailHtml(items, o) {
  o = o || {};
  const site = o.site || '집예보', web = o.web || '';
  const lab = { reg: '내 동네 규제', zone: '구역 단계' };
  const li = items.map(e => `<li style="margin:0 0 9px;line-height:1.55"><span style="display:inline-block;font-size:11.5px;font-weight:800;color:#5B3FB0;background:#F1EDFB;border-radius:6px;padding:1px 6px;margin-right:4px">${pvEsc(lab[e.k] || '')}</span><b style="color:#191F28">${pvEsc(e.t)}</b><br><span style="font-size:13.5px;color:#4E5968">${pvEsc(e.s)}</span>${e.src ? `<br><a href="${pvEsc(e.src.url)}" style="font-size:12.5px;color:#2F6BFF">출처: ${pvEsc(e.src.nm)}</a>` : ''}${e.k === 'zone' && web ? `<br><a href="${pvEsc(web)}villa/zone/?z=${encodeURIComponent(e.id)}" style="font-size:12.5px;color:#2F6BFF">구역 지도에서 보기</a>` : ''}</li>`).join('');
  const links = `${web ? `<a href="${pvEsc(web)}my/alerts/#pv" style="color:#2F6BFF">먼저 챙겨 드려요 설정</a> · <a href="${pvEsc(web)}my/memory/" style="color:#4E5968">집예보가 기억하는 것</a>` : ''}${o.off ? ` · <a href="${pvEsc(o.off)}" style="color:#4E5968">이 알림만 끄기(한 번 누르면 끝)</a>` : ''}`;
  return `<div style="border:2px solid #7C5CD6;border-radius:12px;padding:14px 16px;margin:0 0 14px"><div style="font-size:17px;font-weight:900;margin:0 0 4px">${pvEsc(site)}가 먼저 챙겨 드려요 <span style="font-size:13px;font-weight:700;color:#7C5CD6">내 동네·구역 소식 ${items.length}개</span></div>
    <p style="margin:0 0 10px;font-size:13.5px;color:#4E5968;line-height:1.55">켜 두신 알림에 맞는 소식만 모았어요. 공식 발표와 공개 자료에 나온 날짜·단계 그대로예요.</p>
    <ul style="list-style:none;margin:0 0 6px;padding:0">${li}</ul><p style="font-size:12.5px;color:#4E5968;margin:4px 0 0">${links}</p></div>`;
}
/* PRO-CORE END */

const API = { V: PV_V, KINDS: PV_KINDS, REG_TYPES: PV_REG_TYPES, REG_STAGES: PV_REG_STAGES, REG_DAYS: PV_REG_DAYS, esc: pvEsc, day: pvDay, applies: pvApplies, areas: pvAreas,
  regEvents: pvRegEvents, zoneEvents: pvZoneEvents, mailHtml: pvMailHtml };
root.JDJ_PRO_CORE = API;
if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
