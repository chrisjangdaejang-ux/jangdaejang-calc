/* 알림 계산(관심 단지 변화 · 청약 맞춤) — 화면 없음. 알림 센터(my/alerts/)·머리줄 종 배지(assets/watch.js)·서버 하루 묶음 메일(tools/agent-backend.gs)이 함께 쓴다.
   - 아래 'ALERTS-CORE' 블록은 tools/agent-backend.gs 에 글자 그대로 복사돼 있다(서버는 다른 파일을 불러올 수 없어서). tools/alerts-test.js 가 두 곳이 같은지 확인한다.
   - 숫자는 공개 자료 값 그대로 쓴다. 비율(%)은 자료의 두 값으로 나눈 것만 쓴다. 기준선은 모두 기존 기준을 다시 쓴다:
       급매 = 모닝 브리핑 급매 레이더(최근 3개월 같은 평형 중간값보다 10% 이상 낮음, 엔진 brief_plus URG_DISC)
       큰 하락 = 관심 목록·브리핑(최근 2년 최고가보다 10% 이상 낮음, watch-core DROP)
       전세가율 변화 = 브리핑 '전세가율 급변'(5%p 이상, 엔진 brief_plus GAP_MIN) · 전세가율 80%·90% 선 넘음/내려옴(어제 값과 비교)
       근처 신축 허가 = newbuild.json 허가 단계 현장이 관심 단지에서 500m 안(최근 3달 허가) · 근처 청약 공고 = 관심 단지와 같은 시·군·구의 새 공고(최근 14일)
       두 종류는 나중에 생겨서 사용자가 알림 센터에서 직접 켠 경우에만 보낸다(AX_OPTIN).
   - 자료: today/g/{구}.json(하루 4번, 어제·오늘 새로 보인 거래와 단지별 [점수, 순위, 전세가율]) · brief/{구}.json(급매·전세가율 급변)
           · chungyak/notices.json(청약홈 공고, 접수·발표 날짜와 예상 당첨 가점 범위) · newbuild.json + sNN_xy.json(근처 신축 허가) · index.json sgg(근처 청약)
   window.JDJ_ALERTS_CORE */
(function (root) {
'use strict';
/* ALERTS-CORE BEGIN — 이 블록은 tools/agent-backend.gs 에 그대로 복사돼 있어요. 고칠 때는 두 곳을 똑같이 고쳐 주세요(node tools/alerts-test.js 가 비교). */
const AX_V = 'alerts-2026-11-21';                 // 메일 알림 동의 문구 판(화면 문구를 바꾸면 날짜를 바꿈)
const AX_KINDS = { high: '신고가', trade: '새 실거래', drop: '급매·큰 하락', jeonse: '전세가율', nb: '근처 신축 허가', cynear: '근처 청약 공고' };
const AX_OPTIN = { nb: 1, cynear: 1 };            // 나중에 생긴 종류 — 사용자가 직접 켠 경우에만 보냄(먼저 신청한 분께 묻지 않은 알림이 가지 않게)
const AX_JR_LINES = [80, 90];                     // 전세가율이 이 선을 넘거나 내려오면 알림(%)
const AX_NB_M = 500, AX_NB_MONTHS = 3, AX_NEAR_DAYS = 14;   // 신축 허가: 관심 단지에서 이 거리(m) 안·최근 이 달 수 안 허가 · 근처 청약: 공고 뒤 이 날 수 안
const AX_CY_KINDS = { cy_new: '새 청약 공고', cy_eve: '청약 접수 하루 전', cy_win: '당첨자 발표일' };
const AX_URG = 10, AX_DROP = -10, AX_JR = 5;       // 급매(%) · 큰 하락(%) · 전세가율 변화(%p) — 위 설명의 기존 기준
const AX_MAX_PLACES = 30, AX_MAX_REGIONS = 10, AX_MAX_LINES = 40, AX_MAX_ZONES = 20;
const AX_BN = ['60㎡ 이하', '60~85㎡', '85㎡ 초과'];
const AX_SIDO_OLD = { '광주광역시': '전남광주통합특별시', '전라남도': '전남광주통합특별시', '강원도': '강원특별자치도', '전라북도': '전북특별자치도', '제주도': '제주특별자치도' };
function axEsc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function axTxt(s, n) { return String(s == null ? '' : s).replace(/[\u0000-\u001F\u007F<>]/g, ' ').trim().slice(0, n); }
function axWon(m) { m = Math.round(Number(m) || 0); const e = Math.floor(m / 10000), r = m % 10000; return e && r ? `${e}억 ${r.toLocaleString('en-US')}만 원` : e ? `${e}억 원` : `${r.toLocaleString('en-US')}만 원`; }
function axPid(p) { return [p.code, p.dong, p.jibun || '', p.apt, p.band].join('|'); }          // watch-core idOf 와 같음
function axRowKey(p) { return [p.dong, p.jibun || '', p.apt, p.band].join('|'); }              // today/g 의 u 키
function axIso(d8) { d8 = String(d8 || ''); return /^\d{8}$/.test(d8) ? `${d8.slice(0, 4)}-${d8.slice(4, 6)}-${d8.slice(6, 8)}` : ''; }
function axAddDay(iso, n) { const t = Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) + n * 864e5, d = new Date(t); return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`; }
function axMd(x) { const s = String(x || '').replace(/-/g, ''); return s.length >= 8 ? `${+s.slice(4, 6)}/${+s.slice(6, 8)}` : ''; }
function axPct(v) { return (Math.round(Math.abs(v) * 10) / 10).toFixed(1); }
/** 키 → 짧은 글자(같은 알림을 두 번 보내지 않으려고 기록하는 값). 서버·화면이 같은 값을 만든다 */
function axKeyId(s) {
  s = String(s); let a = 0x811c9dc5, b = 0x01000193 ^ s.length;
  for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); a = Math.imul(a ^ c, 16777619) >>> 0; b = Math.imul(b ^ c, 2246822519) >>> 0; }
  return ('0000000' + a.toString(16)).slice(-8) + ('0000000' + b.toString(16)).slice(-8);
}
function axSido(s) { s = String(s || ''); return AX_SIDO_OLD[s] || s; }

/** '집예보가 먼저 챙겨 드려요'(PROACTIVE) 설정 — 모두 사용자가 직접 켠 경우만(기본 꺼짐).
    home = 내 집 단지도 관심 단지처럼 새 실거래·신고가·급매 알림 · reg = 내 동네 규제지역·토지거래허가구역 지정/해제 · zone = 따라보는 재개발·재건축 구역 단계 변화
    zones = 따라보는 구역 [{id, st 따라보기 시작했을 때(또는 마지막으로 알린) 단계 번호, n 이름}] — 금액 없음 */
function axCleanPv(x) {
  x = x && typeof x === 'object' ? x : {};
  const seen = {}, zones = (Array.isArray(x.zones) ? x.zones : []).map(z => {
    if (!z || typeof z !== 'object') return null;
    const id = axTxt(z.id, 60), st = Math.round(Number(z.st));
    return /^\d{5}[^|]{1,50}$/.test(id) ? { id: id, st: isFinite(st) && st >= 0 && st <= 20 ? st : 0, n: axTxt(z.n, 40) } : null;
  }).filter(z => z && !seen[z.id] && (seen[z.id] = 1)).slice(0, AX_MAX_ZONES);
  return { home: x.home === true, reg: x.reg === true, zone: x.zone === true, zones: zones };
}
/** 알림 설정 정리(서버·화면 같은 규칙). kinds = 관심 단지 알림 종류, mute = 알림을 끈 단지(키), cy = 청약 맞춤 알림, pv = 먼저 챙겨 드려요 */
function axCleanPrefs(x) {
  x = x && typeof x === 'object' ? x : {};
  const k = x.kinds && typeof x.kinds === 'object' ? x.kinds : {}, kinds = {};
  Object.keys(AX_KINDS).forEach(n => { kinds[n] = AX_OPTIN[n] ? k[n] === true : k[n] !== false; });
  const mute = (Array.isArray(x.mute) ? x.mute : []).map(v => axTxt(v, 160)).filter(v => v.split('|').length === 5).filter((v, i, a) => a.indexOf(v) === i).slice(0, AX_MAX_PLACES);
  const c = x.cy && typeof x.cy === 'object' ? x.cy : {}, seen = {};
  const regions = (Array.isArray(c.regions) ? c.regions : []).map(r => r && ({ sd: axSido(axTxt(r.sd, 20)), g: /^\d{5}$/.test(String(r.g || '')) ? String(r.g) : '', gn: axTxt(r.gn, 30) }))
    .filter(r => r && /^[가-힣]{2,12}$/.test(r.sd) && (!r.g || r.gn)).filter(r => { const q = r.sd + '|' + r.g; if (seen[q]) return false; seen[q] = 1; return true; }).slice(0, AX_MAX_REGIONS);
  const n = v => { if (v === '' || v == null) return null; v = Math.round(Number(v)); return isFinite(v) && v >= 0 && v <= 84 ? v : null; };
  let lo = n(c.lo), hi = n(c.hi);
  if (lo != null && hi != null && lo > hi) { const t = lo; lo = hi; hi = t; }
  const ck = c.kinds && typeof c.kinds === 'object' ? c.kinds : {}, cyk = {};
  Object.keys(AX_CY_KINDS).forEach(q => { cyk[q] = ck[q] !== false; });
  return { kinds: kinds, mute: mute, cy: { on: c.on === true && regions.length > 0, regions: regions, nohome: c.nohome === true ? true : c.nohome === false ? false : null, lo: lo, hi: hi, kinds: cyk }, rp: x.rp === true, cal: x.cal === true, pv: axCleanPv(x.pv) };
}

/* ---------- 관심 단지 한 곳의 알림 ----------
   거래 하나는 알림 하나: 신고가 > 급매·큰 하락 > 새 실거래 순으로 하나만 고른다. 거래 키 = 단지|계약일|층|금액(두 자료에서 같은 거래를 한 번만) */
function axPlaceEvents(p, G, S) {
  const pid = axPid(p), out = {}, order = [];
  const put = (key, ev) => { if (!out[key]) order.push(key); out[key] = Object.assign({ key: key, id: axKeyId(key), pid: pid }, ev); };
  const tkey = t => `t|${pid}|${t.dt}|${t.f == null ? '' : t.f}|${t.p}`;
  const fl = t => (t.f != null && t.f !== '' ? `${t.f}층 ` : '');
  const tags = t => [t.x ? '직거래' : '', t.sus ? '특수 거래 의심' : ''].filter(Boolean);
  ((G && G.rows) || []).forEach(t => {
    if (t.d !== p.dong || (t.j || '') !== (p.jibun || '') || t.a !== p.apt || t.b !== p.band || !(t.p > 0)) return;
    const base = { dt: t.dt, p: t.p, f: t.f, day: t.day || '', tags: tags(t) };
    if (t.hi) put(tkey(t), Object.assign(base, { k: 'high', t: `신고가 거래가 나왔어요: ${axMd(t.dt)} 계약 ${fl(t)}${axWon(t.p)}`,
      s: t.pm > 0 ? `같은 단지·같은 면적의 그 전 최고가 ${axWon(t.pm)}보다 ${axPct((t.p / t.pm - 1) * 100)}% 높아요.` : '같은 단지·같은 면적의 그 전 최고가보다 높아요.' }));
    else if (t.dr != null && t.dr <= AX_DROP && !t.sus) put(tkey(t), Object.assign(base, { k: 'drop', t: `큰 하락 거래가 나왔어요: ${axMd(t.dt)} 계약 ${fl(t)}${axWon(t.p)}`,
      s: `이 거래는 최근 2년 최고가${t.m2 > 0 ? ' ' + axWon(t.m2) : ''}보다 ${axPct(t.dr)}% 낮아요.` }));
    else put(tkey(t), Object.assign(base, { k: 'trade', t: `새 실거래가 올라왔어요: ${axMd(t.dt)} 계약 ${fl(t)}${axWon(t.p)}`, s: '국토교통부 실거래 공개 자료에 새로 보인 거래예요.' }));
  });
  ((S && S.urgent) || []).forEach(u => {
    if (u.d !== p.dong || u.a !== p.apt || u.b !== p.band || u.sus || !(Math.abs(Number(u.disc)) >= AX_URG) || !(u.p > 0)) return;
    const key = tkey(u);
    if (out[key] && out[key].k === 'high') return;
    put(key, { k: 'drop', dt: u.dt, p: u.p, f: u.f, day: '', tags: u.x ? ['직거래'] : [], t: `급매 수준 거래가 나왔어요: ${axMd(u.dt)} 계약 ${fl(u)}${axWon(u.p)}`,
      s: `이 거래는 최근 3개월 같은 평형 중간값 ${axWon(u.med)}${u.n3 ? `(${u.n3}건)` : ''}보다 ${axPct(u.disc)}% 낮아요.` });
  });
  ((S && S.gap) || []).forEach(g => {
    if (g.d !== p.dong || g.a !== p.apt || g.b !== p.band || g.jr == null || g.jr0 == null || !(Math.abs(Number(g.dlt)) >= AX_JR)) return;
    put(`j|${pid}|${g.to || ''}|${g.jr}`, { k: 'jeonse', jr: g.jr, jr0: g.jr0, t: `전세가율이 ${g.jr0}%에서 ${g.jr}%로 ${axPct(g.dlt)}%p ${g.dlt > 0 ? '올랐어요' : '내려갔어요'}`,
      s: `전세가율은 매매가 대비 전세 보증금 비율이에요(최근 거래 기준${g.to ? ', ' + axMd(g.to) + '까지' : ''}). ${g.dlt > 0 ? '갭 기회와 전세 위험을 함께 확인해 보세요.' : '보증금은 더 안전해졌고, 갭 부담은 커졌어요.'}` });
  });
  const u = G && G.u && G.u[axRowKey(p)], u0 = G && G.u0 && G.u0[axRowKey(p)];
  if (u && u0 && u[2] != null && u0[2] != null && Math.abs(u[2] - u0[2]) >= AX_JR) {
    const d = u[2] - u0[2];
    put(`j|${pid}|${G.date || ''}|${u[2]}`, { k: 'jeonse', jr: u[2], jr0: u0[2], t: `전세가율이 ${u0[2].toFixed(1)}%에서 ${u[2].toFixed(1)}%로 ${axPct(d)}%p ${d > 0 ? '올랐어요' : '내려갔어요'}`,
      s: `전세가율은 매매가 대비 전세 보증금 비율이에요${G.d0 ? `(${axMd(G.d0)} 값과 비교)` : ''}. ${d > 0 ? '갭 기회와 전세 위험을 함께 확인해 보세요.' : '보증금은 더 안전해졌고, 갭 부담은 커졌어요.'}` });
  }
  if (u && u0 && u[2] != null && u0[2] != null) AX_JR_LINES.forEach(L => {          // 80%·90% 선을 넘거나 내려옴(같은 방향은 90일에 한 번)
    const up = u0[2] < L && u[2] >= L, dn = u0[2] >= L && u[2] < L;
    if (!up && !dn) return;
    put(`jx|${pid}|${L}|${up ? 'u' : 'd'}`, { k: 'jeonse', jr: u[2], jr0: u0[2],
      t: up ? `전세가율이 ${L}%를 넘었어요: ${u0[2].toFixed(1)}% → ${u[2].toFixed(1)}%` : `전세가율이 ${L}% 아래로 내려왔어요: ${u0[2].toFixed(1)}% → ${u[2].toFixed(1)}%`,
      s: up ? `전세가율이 ${L}%를 넘으면 집값이 조금만 내려도 전세 보증금을 다 돌려받기 어려워질 수 있어요. 전세로 들어가신다면 보증보험 가입이 되는지 먼저 확인해 보세요.`
        : `전세 보증금 부담이 조금 줄었어요. 갭(매매가 − 전세가)은 그만큼 커졌어요.` });
  });
  return order.map(q => out[q]);
}

/* ---------- 관심 단지 근처 신축 허가(newbuild.json — 건축HUB 건축 인허가 공개 자료) ----------
   xy = 관심 단지 좌표 [경도, 위도](공개 sNN_xy.json), nb = { rows, kinds, asof }. 허가 단계(아직 공사 전)이고, 허가 달이 최근 AX_NB_MONTHS 달 안이며
   신청한 달(since) 이후인 현장만. 현장 좌표는 약 100m 범위로 둥글린 값이라 거리도 대략(50m 단위)으로 적는다. */
function axYm(iso, back) { const y = +String(iso).slice(0, 4), m = +String(iso).slice(5, 7) - (back || 0), t = y * 12 + m - 1; return `${Math.floor(t / 12)}${String(t % 12 + 1).padStart(2, '0')}`; }
function axDist(a, b) { const r = Math.PI / 180, dx = (b[0] - a[0]) * r * Math.cos((a[1] + b[1]) / 2 * r), dy = (b[1] - a[1]) * r; return 6371000 * Math.sqrt(dx * dx + dy * dy); }
function axNbEvents(p, xy, nb, since) {
  if (!Array.isArray(xy) || xy.length < 2 || !nb || !Array.isArray(nb.rows) || !nb.asof) return [];
  const pid = axPid(p), lo = [axYm(nb.asof, AX_NB_MONTHS - 1), since ? axYm(since, 0) : ''].sort().pop(), out = [];
  nb.rows.forEach(r => {
    if (!r || r.st !== 'permit' || !/^\d{6}$/.test(String(r.pm || '')) || r.pm < lo || !Array.isArray(r.xy)) return;
    const m = axDist(xy, r.xy); if (!(m <= AX_NB_M)) return;
    const kn = ((nb.kinds || {})[r.k]) || '건물', cnt = r.u > 0 ? ` ${r.u}${r.k === 'offi' ? '실' : r.k === 'shop' ? '호' : '세대'}` : '';
    out.push({ k: 'nb', key: `n|${pid}|${r.id}`, id: axKeyId(`n|${pid}|${r.id}`), pid: pid, m: Math.max(50, Math.round(m / 50) * 50),
      t: `관심 단지에서 약 ${Math.max(50, Math.round(m / 50) * 50)}m 거리에 신축 허가가 났어요: ${axTxt(r.dn, 30)} ${kn}${cnt}`,
      s: `${String(r.pm).slice(0, 4)}년 ${+String(r.pm).slice(4, 6)}월 허가, 아직 공사 시작 전이에요. 국토교통부 건축HUB 건축 인허가 공개 자료이고, 위치는 약 100m 범위라 거리도 대략이에요. 분양 여부는 이 자료로 알 수 없어요.` });
  });
  return out.sort((a, b) => a.m - b.m);
}
/* ---------- 관심 단지와 같은 시·군·구의 새 청약 공고 ----------
   sg = 관심 단지 시·군·구 {sido, name}(공개 index.json sgg). 공고일이 오늘 이전·최근 AX_NEAR_DAYS 일 안·신청한 날 이후이고 접수가 끝나지 않은 공고만. */
function axCyNear(p, sg, notices, today, since) {
  if (!sg || !sg.name || !today) return [];
  const pid = axPid(p), lo = axAddDay(today, -AX_NEAR_DAYS), out = [];
  (notices || []).forEach(n => {
    if (!n || axSido(n.sd) !== axSido(sg.sido) || n.g !== sg.name) return;
    const pb = axIso(n.pb), st = axCyStages(n);
    if (!pb || pb > today || pb < lo || (since && pb < since) || (st.length && st[st.length - 1].d < today)) return;
    const pw = axIso(n.pw), sub = [pb ? `공고 ${axMd(pb)}` : '', st.map(x => `${x.lab} 접수 ${axMd(x.d)}`).join(' · '), pw ? `발표 ${axMd(pw)}` : ''].filter(Boolean).join(' · ');
    out.push({ k: 'cynear', key: `c|${n.no}|near`, id: axKeyId(`c|${n.no}|near`), pid: pid, no: n.no, n: n.n, u: /^https:\/\//.test(n.u || '') ? n.u : '',
      t: `관심 단지와 같은 ${n.g}에 ${n.n} 청약 공고가 나왔어요`, s: [sub ? sub + '.' : '', n.k === '국민' ? '국민주택이라 무주택 세대구성원만 신청할 수 있어요.' : '', '접수는 청약홈에서 해요.'].filter(Boolean).join(' ') });
  });
  return out;
}

/* ---------- 청약 ----------
   지역: 공고의 시·도(sd)와 시·군·구 이름(g)이 고른 지역과 같을 때. 시·군·구를 비우면 시·도 전체.
   무주택: '집 있음'을 고르면 국민주택(공공) 공고는 뺀다 — 국민주택 일반공급은 무주택 세대구성원만 신청할 수 있어요(주택공급에 관한 규칙).
   가점 범위: 민영 공고에 예상 당첨 가점 범위(cut)가 있으면, 내 가점 범위의 위쪽 끝이 어느 면적대 예상 범위의 아래쪽 끝 이상일 때만.
             예상 범위가 없는 공고(국민주택·자료 부족)는 그대로 알리고 '예상 범위 없음'이라고 적는다. 확률처럼 보이는 말은 쓰지 않는다. */
function axCyMatch(n, cy) {
  if (!n || !cy || !cy.on) return null;
  const sd = axSido(n.sd);
  if (!(cy.regions || []).some(r => r.sd === sd && (!r.g || r.gn === n.g))) return null;
  if (cy.nohome === false && n.k === '국민') return null;
  const cuts = (n.cut || []).filter(c => c && !c.insufficient && c.lo != null && c.hi != null);
  if (cy.lo == null && cy.hi == null) return { fit: '', cuts: cuts };
  if (!cuts.length) return { fit: '이 공고는 예상 당첨 가점 범위가 없어요(국민주택이거나 비교할 과거 자료가 적어요).', cuts: cuts };
  const lo = cy.lo != null ? cy.lo : cy.hi, hi = cy.hi != null ? cy.hi : cy.lo;
  const ok = cuts.filter(c => hi >= c.lo);
  if (!ok.length) return null;
  const c = ok[0];
  return { fit: `${AX_BN[c.band] || ''} 예상 당첨 가점은 ${c.lo}~${c.hi}점이고, 내 가점 범위(${lo}~${hi}점)는 ${lo >= c.hi ? '그보다 높아요' : '그 범위와 겹쳐요'}.`, cuts: ok };
}
/** 접수 단계: 특별공급 시작일, 1순위 시작일(같은 날이면 하나로) */
function axCyStages(n) {
  const out = [], sp = axIso((n.sp || [])[0]), r1 = axIso((n.r1 || [])[0] || (n.rc || [])[0]);
  if (sp) out.push({ lab: '특별공급', d: sp });
  if (r1) { if (out.length && out[0].d === r1) out[0].lab = '특별공급·1순위'; else out.push({ lab: '1순위', d: r1 }); }
  return out;
}
/** 공고 하나 → 오늘 보낼 청약 알림. today = 'YYYY-MM-DD'(한국 날짜), since = 알림을 신청한 날(그 전에 나온 공고는 '새 공고'로 보내지 않음) */
function axCyEvents(n, cy, today, since) {
  const m = axCyMatch(n, cy); if (!m) return [];
  const out = [], kinds = (cy && cy.kinds) || {}, tmr = axAddDay(today, 1), pb = axIso(n.pb), pw = axIso(n.pw), place = [n.sd, n.g].filter(Boolean).join(' ');
  const st = axCyStages(n), first = st[0];
  const sub = [place, pb ? `공고 ${axMd(pb)}` : '', st.map(x => `${x.lab} 접수 ${axMd(x.d)}`).join(' · '), pw ? `발표 ${axMd(pw)}` : ''].filter(Boolean).join(' · ');
  const ev = (k, key, t, extra) => out.push(Object.assign({ k: k, key: key, id: axKeyId(key), no: n.no, n: n.n, u: /^https:\/\//.test(n.u || '') ? n.u : '', t: t, s: [sub ? sub + '.' : '', extra || '', m.fit].filter(Boolean).join(' ') }));
  const live = !first || st[st.length - 1].d >= today;                    // 접수가 모두 끝난 공고는 '새 공고'로 알리지 않음
  if (kinds.cy_new !== false && pb && pb <= today && (!since || pb >= since) && live) ev('cy_new', `c|${n.no}|new`, `${n.n} 청약 공고가 나왔어요`, n.k === '국민' ? '국민주택이라 무주택 세대구성원만 신청할 수 있어요.' : '');
  if (kinds.cy_eve !== false) st.filter(x => x.d === tmr).forEach(x => ev('cy_eve', `c|${n.no}|eve|${x.d}`, `내일(${axMd(x.d)}) ${n.n} ${x.lab} 접수가 시작돼요`, '접수는 청약홈에서 해요.'));
  if (kinds.cy_win !== false && pw && pw === today) ev('cy_win', `c|${n.no}|win`, `오늘(${axMd(pw)}) ${n.n} 당첨자 발표가 있어요`, '당첨 여부는 청약홈에서 확인해요.');
  return out;
}

/* ---------- 하루 묶음 ----------
   o = { places, g:{구: today/g}, s:{구: brief}, notices:[청약 공고], prefs, today, since, sent:{알림id:1},
         xy(p) → 단지 좌표 [경도, 위도] | null, nb: { rows, kinds, asof }(newbuild.json), sg(code) → { sido, name } | null(index.json sgg) }
   → { groups:[{p, pid, ev[]}], cy:[ev], n, ids[] } — 끈 단지·끈 종류·이미 보낸 알림(sent)은 뺀다.
   같은 청약 공고는 한 번만: 청약 맞춤(새 공고)으로 알리는 공고는 근처 청약으로 또 알리지 않고, 근처 청약은 그 공고와 같은 구의 첫 관심 단지에만 붙인다. */
function axDigest(o) {
  o = o || {};
  const P = axCleanPrefs(o.prefs), sent = o.sent || {}, mute = {}, groups = [], ids = [];
  P.mute.forEach(x => { mute[x] = 1; });
  let cy = [];
  if (P.cy.on && o.today) (o.notices || []).forEach(n => { cy = cy.concat(axCyEvents(n, P.cy, o.today, o.since || '').filter(e => !sent[e.id])); });
  const cyNew = {}, nearDone = {};
  cy.forEach(e => { if (e.k === 'cy_new') cyNew[e.no] = 1; });
  (o.places || []).slice(0, AX_MAX_PLACES).forEach(p => {
    const pid = axPid(p); if (mute[pid]) return;
    let ev = axPlaceEvents(p, (o.g || {})[p.code], (o.s || {})[p.code]);
    if (P.kinds.nb && o.nb && o.xy) ev = ev.concat(axNbEvents(p, o.xy(p), o.nb, o.since || ''));
    if (P.kinds.cynear && o.sg) ev = ev.concat(axCyNear(p, o.sg(p.code), o.notices, o.today, o.since || '').filter(e => !cyNew[e.no] && !nearDone[e.no] && (nearDone[e.no] = 1)));
    ev = ev.filter(e => P.kinds[e.k] && !sent[e.id]);
    if (ev.length) { groups.push({ p: p, pid: pid, ev: ev }); ev.forEach(e => ids.push(e.id)); }
  });
  cy.forEach(e => ids.push(e.id));
  return { groups: groups, cy: cy, n: ids.length, ids: ids };
}
/** 화면 배지 수: 이 기기에서 아직 안 본 알림 */
function axUnread(D, seen) { seen = seen || {}; return (D.ids || []).filter(id => !seen[id]).length; }

/* ---------- 받는 사람 확인(동의) ----------
   sub = { state, consent, consentAt, v, email } — 상태 '활성' + 동의 체크 + 동의 시각 + 동의 문구 판 + 이메일 형식이 모두 있어야 보낸다 */
function axCanSend(sub) {
  if (!sub || sub.state !== '활성' || sub.consent !== true) return false;
  if (!/^\d{4}-\d{2}-\d{2}/.test(String(sub.consentAt || '')) || !String(sub.v || '')) return false;
  return /^[^\s@]{1,64}@[^\s@]+\.[^\s@]{2,}$/.test(String(sub.email || ''));
}
/** 메일 속 광고: 모닝 브리핑과 같은 규칙 — 광고성 정보 받기(①항)와 이른 아침 메일 속 광고 받기(③항) 동의가 모두 있을 때만 */
function axAdOk(c) { return !!(c && c.ad && c.ad.on === true && c.am && c.am.on === true); }

/* ---------- 끄기 링크 ----------
   api = 서버 주소, id = 알림 구독 번호, tok(id) = 서버 비밀값으로 만든 확인값, ph(pid) = 단지 키를 줄인 값 */
function axLinks(api, id, tok, ph) {
  const b = `${api}?action=alertOff&id=${encodeURIComponent(id)}&t=${encodeURIComponent(tok(id))}`;
  return { all: b + '&all=1', cy: b + '&cy=1', place: pid => b + '&p=' + encodeURIComponent(ph(pid)) };
}

/* ---------- 메일 ----------
   o = { site 서비스 이름, web 사이트 주소(끝 /), links(axLinks 결과), since 신청 시각 글자, sender {name, tel, email}, merged(모닝 브리핑 안에 넣을 때), date 'YYYY-MM-DD', gname(코드 → 구 이름) }
   → { subject, html, text }. 광고는 넣지 않는다(광고는 따로 붙임 — 붙일 때 제목 앞 (광고)는 보내는 쪽에서) */
function axMailHtml(D, o) {
  o = o || {};
  const site = o.site || '집예보', web = o.web || '', L = o.links, gname = o.gname || (() => ''), lines = [];
  let left = AX_MAX_LINES, cut = 0;
  const btn = (href, label) => href ? `<a href="${axEsc(href)}" style="font-size:13px;color:#4E5968;text-decoration:underline;white-space:nowrap">${axEsc(label)}</a>` : '';
  const tag = k => `<span style="display:inline-block;font-size:11.5px;font-weight:800;color:${k === 'high' ? '#C2410C' : k === 'drop' ? '#1F56E0' : '#4E5968'};background:${k === 'high' ? '#FDECE4' : k === 'drop' ? '#E8F0FF' : '#F2F4F6'};border-radius:6px;padding:1px 6px;margin-right:4px">${axEsc(AX_KINDS[k] || AX_CY_KINDS[k] || '')}</span>`;
  const li = e => { if (left <= 0) { cut++; return ''; } left--; lines.push(e.t);
    return `<li style="margin:0 0 8px;line-height:1.55">${tag(e.k)}<b style="color:#191F28">${axEsc(e.t)}</b>${(e.tags || []).length ? ` <span style="font-size:12px;color:#4E5968">(${axEsc(e.tags.join(', '))})</span>` : ''}<br><span style="font-size:13.5px;color:#4E5968">${axEsc(e.s)}</span>${e.u ? `<br><a href="${axEsc(e.u)}" style="font-size:13px;color:#2F6BFF">청약홈 공고 보기</a>` : ''}</li>`; };
  const blocks = D.groups.map(g => `<div style="border:1px solid #E5E8EB;border-radius:12px;padding:12px 14px;margin:0 0 10px">
      <div style="display:flex;justify-content:space-between;gap:8px;align-items:baseline;flex-wrap:wrap"><div style="font-size:16px;font-weight:900">${axEsc(g.p.apt)} <span style="font-size:13px;font-weight:500;color:#4E5968">${axEsc([gname(g.p.code), g.p.dong, g.p.band].filter(Boolean).join(' · '))}</span></div>${L ? btn(L.place(g.pid), '이 단지 알림 끄기') : ''}</div>
      <ul style="list-style:none;margin:8px 0 0;padding:0">${g.ev.map(li).join('')}</ul>
      ${web ? `<a href="${axEsc(web)}mine/?sd=${encodeURIComponent(g.p.sd)}&d=${encodeURIComponent([g.p.code, g.p.dong, g.p.jibun || '', g.p.apt].join('|'))}&b=${encodeURIComponent(g.p.band)}" style="font-size:13.5px;color:#2F6BFF">이 단지 시세·미래가치 보기</a>` : ''}</div>`).join('');
  const cyb = D.cy.length ? `<div style="border:1px solid #EFE6CC;background:#FBF8EF;border-radius:12px;padding:12px 14px;margin:0 0 10px">
      <div style="display:flex;justify-content:space-between;gap:8px;align-items:baseline;flex-wrap:wrap"><div style="font-size:16px;font-weight:900">청약 맞춤 알림</div>${L ? btn(L.cy, '청약 알림 끄기') : ''}</div>
      <ul style="list-style:none;margin:8px 0 0;padding:0">${D.cy.map(e => li(e)).join('')}</ul></div>` : '';
  const more = cut ? `<p style="font-size:13.5px;color:#4E5968;margin:0 0 10px">이 밖에 알림 ${cut}건은 <a href="${axEsc(web)}my/alerts/" style="color:#2F6BFF">알림 센터</a>에서 볼 수 있어요.</p>` : '';
  const head = `<div style="font-size:18px;font-weight:900;margin:0 0 4px">내가 고른 것의 새 소식 <span style="font-size:13px;font-weight:700;color:#2F6BFF">${D.n}건</span></div>
    <p style="margin:0 0 10px;font-size:13.5px;color:#4E5968;line-height:1.55">관심 목록에 넣은 단지와 직접 고른 청약 조건에 생긴 변화 가운데, 알림 센터에서 켜 둔 종류만 모았어요. 숫자는 국토교통부 공개 자료와 청약홈 공고 그대로예요.</p>`;
  const offAll = L ? `<a href="${axEsc(L.all)}" style="color:#4E5968">모든 알림 끄기(한 번 누르면 끝)</a>` : '';
  const foot = `<p style="font-size:12px;color:#4E5968;line-height:1.65;margin:12px 0 0;border-top:1px solid #E5E8EB;padding-top:10px">
    이 메일은 ${axEsc(site)}에서 관심 단지·청약 메일 알림을 신청하신 분께만 보내는 정보 알림이에요${o.since ? `(신청 ${axEsc(o.since)})` : ''}. 알림이 있는 날만 하루 한 번, 오전 7시대에 보내요.<br>
    ${offAll}${offAll ? ' · ' : ''}<a href="${axEsc(web)}my/alerts/" style="color:#4E5968">알림 설정 바꾸기</a><br>
    보낸 사람: ${axEsc(site)}${o.sender ? `(${axEsc(o.sender.name)}) · 전화 ${axEsc(o.sender.tel)} · 답장은 ${axEsc(o.sender.email)}로 가요` : ''}</p>`;
  const body = head + blocks + cyb + more;
  const subject = (`[${site}] ${axMd(o.date || '')} 관심 단지·청약 새 소식 ${D.n}건 — ` + D.groups.map(g => g.p.apt).concat(D.cy.length ? ['청약'] : []).join(', ')).slice(0, 120);
  const html = o.merged ? `<div style="border:2px solid #B8942A;border-radius:12px;padding:14px 16px;margin:0 0 14px">${body}<p style="font-size:12px;color:#4E5968;margin:6px 0 0">${offAll}${offAll ? ' · ' : ''}<a href="${axEsc(web)}my/alerts/" style="color:#4E5968">알림 설정 바꾸기</a></p></div>`
    : `<div style="font-family:'Noto Sans KR',sans-serif;max-width:600px;margin:auto;color:#191F28"><div style="font-weight:900;font-size:19px;margin:6px 0 12px">${axEsc(site)} <span style="color:#2F6BFF">알림</span></div>${body}${foot}</div>`;
  return { subject: subject, html: html, text: lines.join('\n') };
}
/* ALERTS-CORE END */

const API = { V: AX_V, KINDS: AX_KINDS, OPTIN: AX_OPTIN, JR_LINES: AX_JR_LINES, NB_M: AX_NB_M, CY_KINDS: AX_CY_KINDS, URG: AX_URG, DROP: AX_DROP, JR: AX_JR, MAX_PLACES: AX_MAX_PLACES, BN: AX_BN,
  esc: axEsc, won: axWon, pid: axPid, iso: axIso, addDay: axAddDay, md: axMd, keyId: axKeyId, sido: axSido, cleanPrefs: axCleanPrefs, cleanPv: axCleanPv, MAX_ZONES: AX_MAX_ZONES, placeEvents: axPlaceEvents,
  nbEvents: axNbEvents, cyNear: axCyNear, dist: axDist, ym: axYm, cyMatch: axCyMatch, cyStages: axCyStages, cyEvents: axCyEvents, digest: axDigest, unread: axUnread, canSend: axCanSend, adOk: axAdOk, links: axLinks, mailHtml: axMailHtml };
root.JDJ_ALERTS_CORE = API;
if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
