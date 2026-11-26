/* 집예보 중개사 프로 도구 공통 (window.JDJ_PT) — agent/pro/(모음) · agent/pro/report/(손님용 단지 리포트) · agent/pro/post/(동네 글 자동 만들기)
   · tools/pro-tools-test.js 가 함께 쓴다. 숫자 계산·문장 만들기·문장 자체 검사는 DOM 없이 동작(node 에서도 불러 검사).
   켜짐: assets/config.js PRO_TOOLS_ENABLED === true. 꺼져 있으면 화면은 '준비 중'만 보여요.
     운영자 미리 보기: 주소 끝에 ?preview=pro-tools 를 붙여 한 번 열면 이 기기에서만 보여요(?preview=off 로 끔).
     서버(tools/agent-backend.gs 'v66' PRO_TOOLS_ENABLED)도 꺼져 있는 동안은 운영자 계정(모닝 브리핑 운영자 모드)만 받아 줘요.
   다시 쓰는 것
     · assets/broker-tools.js(JDJ_BT): 매물 설명서 사실값(listing — 같은 평형 실거래·주변 단지·학교·역·미래가치), 문장 틀 고르기(picker), 카드 그리기(drawCard), zip
     · 거래 판정 기준: 비공개 엔진 brief.py judge · brief_plus.py recent3/urgent 와 같은 숫자(신고가·급매·특수 거래 의심·비교 거래 적음, 직거래 제외)
     · 문장 자체 검사: 엔진 claim_check.py 와 같은 규칙(같은 정규식·같은 계산) — 여기서는 확인 규칙이 없는 최상급 숫자 문장도 빼요(더 엄격)
   원칙
     · 숫자는 공개 실거래(국토교통부)·공개 자료 그대로. 자료가 없으면 숫자를 채우지 않고 '자료가 없어요'.
     · 동·호수 같은 개인정보는 쓰지 않아요(실거래 공개 자료에도 없음). 지번도 글에는 넣지 않아요.
     · 글은 '실거래 정보 글'이지 매물 광고가 아니에요 — 모든 글·카드에 그 문장을 붙이고, 과장 표현은 자동으로 걸러요. */
(function (root) {
  'use strict';
  const BT = () => root.JDJ_BT || (typeof require === 'function' ? require('./broker-tools.js') : null);
  const SITE = (((root.JDJ_SITE || {}).SITE_NAME) || '').trim() || '집예보';
  const LS_PV = 'jdj_pt_preview';
  const ls = { get(k) { try { return root.localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { root.localStorage.setItem(k, v); } catch (e) {} }, del(k) { try { root.localStorage.removeItem(k); } catch (e) {} } };
  (function () { try { const q = new URLSearchParams(root.location.search).get('preview'); if (q === 'pro-tools') ls.set(LS_PV, '1'); else if (q === 'off') ls.del(LS_PV); } catch (e) {} })();
  /** 켜짐(설정) 또는 이 기기 미리 보기 */
  function on() { return (root.JDJ_SITE || {}).PRO_TOOLS_ENABLED === true || ls.get(LS_PV) === '1'; }
  function preview() { return on() && (root.JDJ_SITE || {}).PRO_TOOLS_ENABLED !== true; }

  /** 동네 파트너 소개 주소 — 동네 파트너가 꺼져 있으면(미리 보기도 아니면) 빈 글자(링크를 만들지 않음) */
  function dongneLink() {
    const S = root.JDJ_SITE || {}, base = (root.JDJ_BASE && root.JDJ_BASE.SITE) || '/';
    if (S.PARTNER_ENABLED === true) return base + 'dongne/';
    return ls.get('jdj_dp_preview') === '1' ? base + 'dongne/?preview=dongne' : '';
  }

  /* ---------- 서버 ---------- */
  function sess() { try { const j = JSON.parse(ls.get('jdj_auth') || 'null'); return j && /^[0-9a-f]{64}$/.test(String(j.s || '')) ? j.s : ''; } catch (e) { return ''; } }
  function post(body) {
    const api = (root.JDJ_AGENTS && root.JDJ_AGENTS.api) || '';
    if (!api) return Promise.reject(new Error('서버가 아직 연결되지 않았어요.'));
    const b = Object.assign({}, body), s = sess(); if (s && !b.s) b.s = s;
    return fetch(api, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(b) })
      .then(r => r.json()).then(j => {
        if (j && j.err === 'unknown') { const e = new Error('준비 중이에요. 조금만 기다려 주세요.'); e.code = 'unknown'; throw e; }
        if (!j || !j.ok) { const t = (j && j.err) || ''; const e = new Error(/[가-힣]/.test(t) ? t : '잠시 뒤 다시 시도해 주세요.'); e.code = (j && j.code) || ''; throw e; }
        return j;
      }, e => { if (e && e.code) throw e; throw new Error('인터넷 연결을 확인하고 잠시 뒤 다시 시도해 주세요.'); });
  }

  /* ---------- 공용 ---------- */
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const med = a => { const s = a.slice().sort((x, y) => x - y), n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : 0; };
  const r1 = v => Math.round(v * 10) / 10;
  const toDate = n => { n = Number(n); return new Date(Date.UTC(Math.floor(n / 10000), Math.floor(n / 100) % 100 - 1, n % 100)); };
  const toInt = d => d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate();
  const back = (n, days) => toInt(new Date(toDate(n).getTime() - days * 86400000));
  const won = m => BT().won(m), wonS = m => won(m).replace(' 원', '');
  const ymd = s => BT().ymd(s), ymK = s => BT().ymK(s), J = (w, a, b) => BT().J(w, a, b);

  /* ---------- 거래 판정 — 엔진 brief.py·brief_plus.py 와 같은 기준 ---------- */
  const RULE = { HI_JUMP: 0.60, HI_JUMP_N: 3, HI_JUMP_DAYS: 365, HI_THIN_UP: 0.30, URG_DISC: -0.10, URG_SUS: -0.30, URG_N: 3, URG_DAYS: 90, MIN_AREA: 30 };
  /** 한 단지·평형의 개별 거래(JDJ_MINE.trades 결과, {ymd, amt, area, floor, type, hi}) → 거래마다 꼬리표.
      hi 신고가(엔진 표시 그대로) · sus 특수 거래 의심 · thin 비교 거래 적음 · urg 급매로 볼 만한 거래(최근 3개월 중간값보다 10% 넘게 쌈) · x 직거래 */
  function judge(list) {
    const asc = (list || []).slice().sort((a, b) => a.ymd - b.ymd);
    const out = asc.map((t, i) => {
      const o = Object.assign({}, t, { x: t.type === '직거래' }), day = t.ymd % 100;
      if (o.x) { o.hi = false; return o; }
      const prior = asc.slice(0, i).filter(p => p.ymd < t.ymd && p.type !== '직거래');
      if (t.hi) {
        const pm = prior.length ? Math.max(...prior.map(p => p.amt)) : 0;
        o.pm = pm || null;
        if (day) {
          const lo = back(t.ymd, RULE.HI_JUMP_DAYS), yr = prior.filter(p => p.ymd >= lo).map(p => p.amt);
          if (yr.length >= RULE.HI_JUMP_N) { if (t.amt > med(yr) * (1 + RULE.HI_JUMP)) o.sus = true; }
          else if (!pm || t.amt >= pm * (1 + RULE.HI_THIN_UP)) o.thin = true;
        }
        return o;
      }
      if (!day || !(t.area >= RULE.MIN_AREA)) return o;
      const lo = back(t.ymd, RULE.URG_DAYS), base = prior.filter(p => p.ymd >= lo).map(p => p.amt);
      if (base.length < RULE.URG_N) return o;
      const m = med(base), disc = t.amt / m - 1;
      o.med3 = Math.round(m); o.n3 = base.length; o.disc = r1(disc * 100);
      if (disc <= RULE.URG_SUS) o.sus = true;
      else if (disc <= RULE.URG_DISC) o.urg = true;
      return o;
    });
    return out.reverse();
  }
  /** 꼬리표 글자(화면·인쇄) */
  function tags(t) {
    const a = [];
    if (t.x) a.push(['x', '직거래']);
    if (t.hi) a.push(['hi', '신고가']);
    if (t.sus) a.push(['sus', '특수 거래 의심']);
    else if (t.thin) a.push(['thin', '비교 거래 적음']);
    if (t.urg) a.push(['urg', '급매로 볼 만한 거래']);
    return a;
  }
  /** 전세가율: 전체 기간 시세(JDJ_PRICE.histOf 결과 {months, s, j, jr})에서 최근 6개월 안 마지막 달 */
  function jeonse(h) {
    if (!h || !Array.isArray(h.jr) || !h.months) return { miss: '전세 실거래 자료를 불러오지 못해 전세가율을 계산하지 않았어요.' };
    const n = h.months.length;
    for (let i = n - 1; i >= Math.max(0, n - 6); i--) if (h.jr[i] > 0 && h.s[i] > 0 && h.j[i] > 0) return { pct: r1(h.jr[i] * 100), at: h.months[i], s: h.s[i], j: h.j[i] };
    return { miss: '최근 6개월 안에 매매와 전세 거래가 함께 있는 달이 없어 전세가율을 계산하지 않았어요.' };
  }
  /** 입주 예정 물량(구 전체): region/sNN.json gu[구].sup = [1년 안, 1~2년, 2~3년 세대, 단지 수] */
  function supply(region, g) {
    const s = region && region.gu && region.gu[g] && region.gu[g].sup;
    const src = region && region.src && region.src.sup;
    const gu = region && region.gu && region.gu[g];
    if (gu && !s && (region.used || {}).sup) return { none: true, y1: 0, y2: 0, y3: 0, n: 0, tot: 0, src: src ? src.nm : '청약홈 분양 모집공고', at: src ? src.at : '' };
    if (!Array.isArray(s) || s.length < 3) return { miss: '이 지역 입주 예정 자료를 불러오지 못했어요.' };
    return { y1: s[0] || 0, y2: s[1] || 0, y3: s[2] || 0, n: s[3] || 0, tot: (s[0] || 0) + (s[1] || 0) + (s[2] || 0), src: src ? src.nm : '청약홈 분양 모집공고', at: src ? src.at : '' };
  }

  /* ---------- 손님용 단지 리포트: 사실값 ---------- */
  /** c = { L(JDJ_BT.listing 결과 — kind 'danji'), list(JDJ_MINE.trades(u)), hist(histOf 결과|null), region(region/sNN.json|null), g, client, date } */
  function report(c) {
    const L = c.L; if (!L) return null;
    const J1 = judge(c.list || []);
    const to = String((L.trades.asOf || {}).to || '');
    const since = to.length >= 6 ? Number(String(Number(to.slice(0, 4)) - 1) + to.slice(4, 6) + '01') : 0;
    const recent = J1.filter(t => t.ymd >= since);
    const S = { apt: L.apt, band: L.band, area: L.area, dong: L.dong, gu: L.gu, sido: L.sido, date: L.date, client: String(c.client || '').slice(0, 20),
      trend: L.trend, near: L.near, poi: L.poi, asOf: L.trades.asOf,
      rows: (function () { const f = recent.filter(t => t.hi || t.urg || t.sus).slice(0, 6), rest = recent.filter(t => f.indexOf(t) < 0).slice(0, 10 - f.length); return f.concat(rest).sort((a, b) => b.ymd - a.ymd); })(), y1: { n: recent.filter(t => !t.x).length, hi: recent.filter(t => t.hi).length, urg: recent.filter(t => t.urg).length, sus: recent.filter(t => t.sus).length, x: recent.filter(t => t.x).length },
      lastHi: J1.find(t => t.hi && !t.sus) || null,
      jr: jeonse(c.hist), sup: supply(c.region, c.g),
      hist: c.hist && c.hist.s ? { months: c.hist.months, s: c.hist.s, from: c.hist.from || c.hist.months[0] } : null };
    /* 미래가치: 과거에 같은 방법으로 맞춰 본 성적이 기준(2번 이상·평균 +·절반 이상 맞음)을 넘은 지역만 점수를 싣고, 늘 '참고'로 */
    const vc = c.vc || null, fv = L.fv;
    S.fv = fv.has && vc && vc.ok ? { show: true, head: fv.head, what: fv.what, past: fv.past, src: fv.src, to: (fv.asOf || {}).to }
      : { show: false, why: !fv.has ? fv.miss : '이 지역은 과거에 같은 방법으로 맞춰 본 성적이 기준에 못 미쳐 점수를 싣지 않았어요.', past: fv.past };
    S.src = [
      ['아파트 매매 실거래가', '국토교통부 실거래가 공개 자료(공공데이터포털)', `${ymK(to)} 계약분까지`],
      ['전세 실거래가(전세가율)', '국토교통부 전월세 실거래가 공개 자료', S.jr.at ? `${ymK(S.jr.at)} 기준` : ''],
      ['입주 예정 물량', S.sup.src || '청약홈 분양 모집공고', S.sup.at ? `${ymd(S.sup.at)} 확인` : ''],
      ['학교·역 위치', L.poi.src ? `${L.poi.src.st} · ${L.poi.src.sc}` : '학교알리미·역 위치 공개 자료', ''],
      ['미래가치 점수', `${SITE} 미래가치 점수(공공 자료로 계산·과거 성적 공개)`, S.fv.to ? `${ymK(S.fv.to)} 자료` : '']
    ];
    return S;
  }
  const GLOSS = [
    ['실거래가', '실제로 계약한 가격을 국토교통부에 신고한 값이에요. 계약 뒤 30일 안에 신고해서 가장 최근 거래는 늦게 보일 수 있어요.'],
    ['신고가', '같은 단지·같은 크기에서 그전까지 가장 높았던 거래 가격을 넘은 거래예요.'],
    ['급매로 볼 만한 거래', '같은 단지·같은 크기의 바로 앞 3개월 거래 가격 중간값보다 10% 넘게 싸게 계약된 거래예요.'],
    ['특수 거래 의심', '앞 1년 중간값보다 60% 넘게 비싸거나 앞 3개월 중간값보다 30% 넘게 싼 거래예요. 가족 간 거래·지분 거래 등이 섞였을 수 있어 비교에서 조심해서 봐요.'],
    ['비교 거래 적음', '앞 1년 거래가 3건이 안 돼서, 이전 최고가와 견준 오름 폭이 지금 시세 변화를 말하기 어려운 신고가예요.'],
    ['직거래', '중개사 없이 당사자끼리 한 거래예요. 시세 판단에서 뺐어요.'],
    ['전세가율', '전셋값이 매맷값의 몇 %인지예요. 높을수록 매매가와 전세가 차이(갭)가 작아요.'],
    ['평당가', '전용면적 3.3㎡(1평)당 가격이에요. 크기가 다른 집을 같은 기준으로 비교할 때 써요.'],
    ['미래가치 점수(참고)', '같은 시·도 아파트와 견줘 앞으로 2년 동안 평균보다 더 오를 쪽인지 나타낸 참고 점수예요. 시장 전체가 내리면 점수가 높아도 내릴 수 있어요.']
  ];
  const DISCLAIM = '이 리포트는 공개 자료를 정리한 참고 자료이며, 특정 매물 광고나 법정 서류인 중개대상물 확인·설명서를 대신하지 않아요.';

  /* ---------- 손님용 단지 리포트: 화면(HTML 글자) ---------- */
  const cls = v => v == null ? '' : v > 0 ? 'up' : v < 0 ? 'dn' : '';
  const pc = v => v == null ? '–' : BT().pct(v);
  /** 사무소 표시(확인된 중개사만) — card = 서버 ptMe/ptOpen 결과 {role, office, ceo, name, reg, addr, phone} */
  /* 사무소 색상(서버 PX_COLORS 와 같은 값 — 흰 글자가 잘 읽히는 진한 색만) */
  const COLORS = ['#2560E8', '#1B3C8F', '#0E7A4F', '#0F766E', '#7C3AED', '#B42318', '#B45309', '#8A6A12', '#374151', '#BE185D'];
  const colorOf = c => c && COLORS.indexOf(c.color) >= 0 ? c.color : COLORS[0];
  const logoOk = v => /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(String(v || ''));
  /** 공인중개사가 아닌 분(분양상담사·컨설턴트 등)의 자료에 늘 붙는 안내 */
  const NOT_BROKER = '작성자는 공인중개사가 아니며, 중개(거래 연결·계약 대행)를 하지 않아요.';
  const isBroker = c => !!c && (c.broker === true || (c.broker == null && (c.role === 'agent' || c.role === 'member')));
  const titleOf = c => !c ? '' : isBroker(c) ? c.office : (c.office || c.name);
  /** 표시 정보(확인된 분만) — card = 서버 ptMe/ptOpen 결과 {role, broker, kind, office, ceo, name, reg, addr, phone, mobile, kakao}
      공인중개사: 공인중개사법 제18조의2·시행령 제17조의2 표시 항목(명칭·소재지·연락처·등록번호·대표자 성명)이 모두 들어가요. */
  function officeLines(card) {
    if (!card || !titleOf(card)) return [];
    let L;
    if (isBroker(card)) {
      L = [['중개사무소', card.office], ['대표 공인중개사', card.ceo]];
      if (card.role === 'member' && card.name) L.push(['소속공인중개사', card.name]);
      L.push(['등록번호', card.reg], ['소재지', card.addr], ['전화', card.phone], ['휴대폰', card.mobile], ['카카오톡', card.kakao]);
    } else {
      L = [[card.kind || '이름', card.name || card.office]];
      if (card.name && card.office) L.push(['소속', card.office]);
      L.push(['소재지', card.addr], ['전화', card.phone], ['휴대폰', card.mobile], ['카카오톡', card.kakao]);
    }
    return L.filter(x => x[1]);
  }
  const contactOf = c => [c.phone, c.mobile].filter(Boolean).join(' · ');
  /** 첫 장 표지(사무소 중심) — 로고 크게, 사무소 색상 띠 */
  function coverHtml(card, logo, S, P) {
    const col = colorOf(card), ok = !!titleOf(card);
    const lg = ok && logoOk(logo) ? `<img class="pt-cv-lg" src="${logo}" alt="${esc(titleOf(card))} 로고">` : ok ? `<div class="pt-cv-lg pt-cv-ini" aria-hidden="true">${esc(titleOf(card).slice(0, 2))}</div>` : '';
    const sub = !ok ? '' : isBroker(card) ? `대표 공인중개사 ${esc(card.ceo || '')}${card.role === 'member' && card.name ? ` · 담당 ${esc(card.name)}` : ''} · 등록번호 ${esc(card.reg || '')}`
      : `${esc(card.kind || '')}${card.name && card.office ? ` · ${esc(card.name)}` : ''}`;
    return `<div class="pt-cv" style="--pc:${col}">${ok ? `<div class="pt-cv-top">${lg}<div class="pt-cv-of"><b>${esc(titleOf(card))}</b><span>${sub}</span>${contactOf(card) ? `<span class="pt-cv-tel">${esc(contactOf(card))}</span>` : ''}</div></div>`
      : `<div class="pt-cv-top"><div class="pt-cv-of"><b>단지 리포트</b><span>공개 실거래 자료로 정리했어요</span></div></div>`}<div class="pt-cv-pg">${esc(S.date)} · 1/${P}</div></div>`;
  }
  function headHtml(card, logo, S, page, pages) {
    const ok = !!titleOf(card), col = colorOf(card);
    const lg = ok && logoOk(logo) ? `<img class="pt-lg" src="${logo}" alt="${esc(titleOf(card))} 로고">` : '';
    return `<div class="pt-hd" style="--pc:${col}">${ok ? `${lg}<div class="pt-of"><b>${esc(titleOf(card))}</b><span>${isBroker(card) ? `대표 ${esc(card.ceo || '')} · 등록번호 ${esc(card.reg || '')} · ` : ''}${esc(contactOf(card))}</span></div>`
      : `<div class="pt-of"><b>단지 리포트</b><span>공개 실거래 자료로 정리했어요</span></div>`}<div class="pt-pg">${esc(S.date)}${pages ? ` · ${page}/${pages}` : ''}</div></div>`;
  }
  /** 꼬리말: 표시 정보 + 안내 문장(+ 공인중개사가 아니면 '중개 아님') + 맨 아래 아주 작은 Powered by(pw 일 때만) */
  function footHtml(card, pw) {
    const L = officeLines(card);
    return `<div class="pt-ft">${L.length ? `<p class="pt-ad">${L.map(x => `<span>${esc(x[0])} ${esc(x[1])}</span>`).join('')}</p>` : ''}${L.length && !isBroker(card) ? `<p class="pt-dis"><b>${esc(NOT_BROKER)}</b></p>` : ''}<p class="pt-dis">${esc(DISCLAIM)}</p>${pw ? `<p class="pt-pw">Powered by ${esc(SITE)}</p>` : ''}</div>`;
  }
  function chart(S) {
    const H0 = S.hist, t = S.trend;
    const ser = H0 ? H0.months.map((ym, i) => ({ ym, v: H0.s[i] })) : t.ser.map(x => ({ ym: x.ym, v: x.v > 0 ? Math.round(x.v * S.area / 3.3058) : 0 }));
    const pts = ser.map((x, i) => [i, x.v]).filter(p => p[1] > 0);
    if (pts.length < 2) return `<p class="miss">${esc(t.miss || '가격 흐름을 그릴 만큼 거래가 없어요.')}</p>`;
    const W = 640, H = 170, L = 8, R = 124, T = 12, B = 24, n = ser.length;
    const vs = pts.map(p => p[1]), lo = Math.min(...vs), hi = Math.max(...vs), pad = (hi - lo) * 0.1 || hi * 0.05;
    const X = i => L + (W - L - R) * i / Math.max(1, n - 1), Y = v => T + (H - T - B) * (1 - (v - (lo - pad)) / ((hi + pad) - (lo - pad)));
    const d = pts.map((p, k) => `${k ? 'L' : 'M'}${X(p[0]).toFixed(1)},${Y(p[1]).toFixed(1)}`).join('');
    const last = pts[pts.length - 1], yl = ym => String(ym).slice(0, 4), first = ser[pts[0][0]].ym;
    const lab = v => wonS(v);
    return `<svg class="pt-ch" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(S.apt)} ${esc(S.band)} 매매 시세 흐름(${yl(first)}년부터)">
      <line x1="${L}" x2="${W - R}" y1="${Y(hi).toFixed(1)}" y2="${Y(hi).toFixed(1)}" stroke="#E5E8EB" stroke-dasharray="3 3"/><line x1="${L}" x2="${W - R}" y1="${Y(lo).toFixed(1)}" y2="${Y(lo).toFixed(1)}" stroke="#E5E8EB" stroke-dasharray="3 3"/>
      <text x="${W - R + 6}" y="${(Y(hi) + 4).toFixed(1)}" font-size="15" fill="#4E5968">${lab(hi)}</text><text x="${W - R + 6}" y="${(Y(lo) + 4).toFixed(1)}" font-size="15" fill="#4E5968">${lab(lo)}</text>
      <path d="${d}" fill="none" stroke="#2560E8" stroke-width="2.4" stroke-linejoin="round"/>
      <circle cx="${X(last[0]).toFixed(1)}" cy="${Y(last[1]).toFixed(1)}" r="4" fill="#2560E8"/>
      <text x="${X(pts[0][0]).toFixed(1)}" y="${H - 5}" font-size="15" fill="#4E5968">${yl(first)}년</text><text x="${W - R}" y="${H - 5}" font-size="15" fill="#4E5968" text-anchor="end">${yl(ser[n - 1].ym)}년</text></svg>`;
  }
  const srcP = (s, a) => `<p class="src">출처: ${esc(s)}${a ? ` · ${esc(a)}` : ''}</p>`;
  /** 리포트 세 장(인쇄 A4 기준). o = { card(확인된 중개사 표시 — 없으면 이름 없이), logo, shared } */
  function reportHtml(S, o) {
    o = o || {};
    const card = o.card && titleOf(o.card) ? o.card : null, P = 3, tr = S.trend;
    const head = p => headHtml(card, o.logo, S, p, P);
    const sub = [S.sido, S.gu, S.dong].filter(Boolean).join(' ') + ` · 전용 ${S.area}㎡`;
    const key = `<div class="pt-key">
      <div class="pv"><div class="k">시세(실거래)</div><div class="v">${tr.price ? wonS(tr.price) : '거래 없음'}</div><small>${tr.kind === 'last' ? `${ymK(tr.priceAt)} 마지막 거래` : `최근 3개월 실거래 중간값`}</small></div>
      <div><div class="k">1년 변동</div><div class="v ${cls(tr.ch1)}">${pc(tr.ch1)}</div><small>평당가 기준</small></div>
      <div><div class="k">전세가율</div><div class="v">${S.jr.pct != null ? S.jr.pct + '%' : '–'}</div><small>${S.jr.at ? `${ymK(S.jr.at)} 기준` : '자료 없음'}</small></div>
      <div><div class="k">최근 1년 거래</div><div class="v">${S.y1.n}건</div><small>직거래 제외 · 신고가 ${S.y1.hi}건</small></div></div>`;
    const tagH = t => tags(t).map(x => `<span class="tg ${x[0]}">${esc(x[1])}</span>`).join('');
    const t1 = S.rows.length ? `<table><thead><tr><th>계약일</th><th class="n">층</th><th class="n">거래가</th><th>판정</th></tr></thead><tbody>${S.rows.map(t => `<tr><td>${esc(t.date)}</td><td class="n">${t.floor || '-'}</td><td class="n"><b>${wonS(t.amt)}</b></td><td>${tagH(t) || '<span class="tg n0">보통 거래</span>'}${t.urg && t.disc != null ? `<small class="why">3개월 중간값보다 ${Math.abs(t.disc)}% 쌈</small>` : ''}</td></tr>`).join('')}</tbody></table>`
      : `<p class="miss">최근 1년 동안 이 평형의 거래가 없어요.</p>`;
    const hiLine = S.lastHi ? `<p class="sm">가장 최근 신고가: ${esc(S.lastHi.date)} ${wonS(S.lastHi.amt)}${S.lastHi.thin ? ' (비교 거래 적음)' : ''}</p>` : '';
    const sum = `<p class="sm">최근 1년 거래 ${S.y1.n}건 중 신고가 ${S.y1.hi}건, 급매로 볼 만한 거래 ${S.y1.urg}건${S.y1.sus ? `, 특수 거래 의심 ${S.y1.sus}건` : ''}${S.y1.x ? ` · 직거래 ${S.y1.x}건은 판단에서 뺐어요` : ''}.</p>`;
    const t2 = S.near.rows.length ? `<table><thead><tr><th>단지 (직선 거리)</th><th>계약일</th><th class="n">거래가</th></tr></thead><tbody>${S.near.rows.map(r => `<tr><td>${esc(r.apt)} <span class="mut">${BT().mText(r.m)}</span></td><td>${esc(r.date)}</td><td class="n"><b>${wonS(r.amt)}</b></td></tr>`).join('')}</tbody></table>` : `<p class="miss">${esc(S.near.miss)}</p>`;
    const sp = S.sup;
    const t3 = sp.miss ? `<p class="miss">${esc(sp.miss)}</p>` : `${sp.none ? '' : `<div class="pt-sup"><div><b>${sp.y1.toLocaleString('ko-KR')}</b><span>1년 안</span></div><div><b>${sp.y2.toLocaleString('ko-KR')}</b><span>1~2년</span></div><div><b>${sp.y3.toLocaleString('ko-KR')}</b><span>2~3년</span></div></div>`}
      <p class="sm">${sp.none ? `분양 공고 기준으로 ${esc(S.gu)}에는 앞으로 3년 안 입주 예정으로 잡힌 아파트가 없어요. 아직 분양 공고를 내지 않은 단지는 빠져 있어요.` : `${esc(S.gu)} 전체에 앞으로 3년 안 입주 예정인 아파트는 ${sp.tot.toLocaleString('ko-KR')}세대${sp.n ? `(단지 ${sp.n}곳)` : ''}예요. 입주가 몰리는 때는 주변 전셋값이 잠시 눌릴 수 있어요.`}</p>${srcP(sp.src, sp.at ? ymd(sp.at) + ' 확인 · 분양 공고의 입주 예정 달 기준' : '')}`;
    const po = S.poi, pl = (a, miss, unit) => a.length ? `<ul class="lst">${a.map(x => `<li><b>${esc(x.nm)}${unit}</b><span>직선 ${BT().mText(x.m)} · 걸어서 약 ${BT().walkMin(x.m)}분</span></li>`).join('')}</ul>` : `<p class="miss">${esc(miss)}</p>`;
    const t4 = `<div class="lab">지하철역</div>${pl(po.st, po.stMiss, '역')}<div class="lab">중학교</div>${pl(po.sc, po.scMiss, '')}<p class="src">${esc(po.elem)} 걷는 시간은 직선 거리로 어림한 값이라 실제로는 더 걸려요.</p>`;
    const f = S.fv;
    const t5 = f.show ? `<div class="pt-fv"><div class="ring">${esc((f.head.match(/\d+/) || [''])[0])}</div><div><p><b>${esc(f.head)}</b> <span class="ref">참고</span></p><p>${esc(f.what)}</p><p>${esc(f.past)}</p></div></div>${srcP('공공 자료로 계산한 미래가치 점수(맨 뒤 자료 출처 표)', f.to ? ymK(f.to) + ' 자료' : '')}`
      : `<p class="miss">${esc(f.why)}</p>`;
    const jr = S.jr;
    const t6 = jr.pct != null ? `<p class="sm">${ymK(jr.at)} 기준 전세 ${wonS(jr.j)} ÷ 매매 ${wonS(jr.s)} = <b>${jr.pct}%</b>(두 값 모두 그 달까지 3개월 실거래 중간값). 매매가와 전세가 차이는 약 ${wonS(jr.s - jr.j)}이에요.</p>` : `<p class="miss">${esc(jr.miss)}</p>`;
    const gl = `<div class="gl">${GLOSS.map(g => `<p><b>${esc(g[0])}</b> ${esc(g[1])}</p>`).join('')}</div>`;
    const srcT = `<table class="srct"><thead><tr><th>항목</th><th>출처</th><th>기준</th></tr></thead><tbody>${S.src.map(r => `<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td><td>${esc(r[2])}</td></tr>`).join('')}</tbody></table>`;
    const title = `<div class="pt-tt"><div class="k">${S.client ? `${esc(S.client)} 님께 드리는 ` : ''}단지 리포트</div><h2>${esc(S.apt)} · ${esc(S.band)}</h2><small>${esc(sub)}</small></div>`;
    const ft = footHtml(card, o.shared && o.pw !== false);
    return `<article class="pt-rp" id="sheet">
      <section class="pt-page pt-p1">${coverHtml(card, o.logo, S, P)}${title}${key}
        <h3><span class="n">1</span>시세 흐름 <small>매매 실거래 · ${S.hist ? String(S.hist.from).slice(0, 4) + '년부터' : '최근 3년'} · 오른쪽 숫자는 최고·최저</small></h3>${chart(S)}${srcP('국토교통부 아파트 매매 실거래가 공개 자료(직거래 제외) · 월별 3개월 실거래 중간값', `${ymK((S.asOf || {}).to)} 계약분까지`)}
        <h3><span class="n">2</span>최근 1년 거래와 판정 <small>신고가·급매·특수 거래 의심</small></h3>${sum}${t1}${hiLine}${srcP('국토교통부 아파트 매매 실거래가 공개 자료', '판정 기준은 아래 말 풀이')}
        ${ft}</section>
      <section class="pt-page">${head(2)}
        <h3><span class="n">3</span>전세가율</h3>${t6}${srcP('국토교통부 아파트 매매·전월세 실거래가 공개 자료', '')}
        <h3><span class="n">4</span>주변 비교 단지 <small>같은 구 · 같은 평형 · 직선 1km 안 · 단지마다 최근 1건</small></h3>${t2}
        <h3><span class="n">5</span>입주 예정 물량 <small>${esc(S.gu)} 전체</small></h3>${t3}
        <h3><span class="n">6</span>가까운 역·학교 <small>직선 1.5km 안</small></h3>${t4}
        <h3><span class="n">7</span>미래가치 점수 <small>참고 · 2년 보유 기준</small></h3>${t5}
        ${ft}</section>
      <section class="pt-page">${head(3)}
        <h3>처음 보는 말 풀이</h3>${gl}
        <h3>자료 출처</h3>${srcT}
        <p class="sm">모든 숫자는 공공 자료를 그대로 정리한 값이에요. 실제 가격은 동·층·향·수리 상태에 따라 달라요.</p>
        ${ft}</section>
    </article>`;
  }

  /* ---------- 공유 주소 ---------- */
  function encodeUnit(o) {
    const q = new URLSearchParams();
    ['sd', 'g', 'd', 'j', 'a', 'b'].forEach(k => { if (o[k]) q.set(k, String(o[k]).slice(0, 80)); });
    return q.toString();
  }
  function decodeUnit(search) {
    const q = new URLSearchParams(search || ''), s = k => String(q.get(k) || '').slice(0, 80);
    const o = { sd: s('sd'), g: s('g'), d: s('d'), j: s('j'), a: s('a'), b: s('b') };
    if (!/^s\d{2}$/.test(o.sd)) o.sd = ''; if (!/^\d{5}$/.test(o.g)) o.g = '';
    return o;
  }
  /** #v=<id>.<토큰> (서버 링크 — # 뒤는 서버·통계로 가지 않아요) */
  function parseShare(hash) {
    const m = /(?:^|[#&])v=(T[0-9A-F]{11})\.([0-9a-f]{64})(?:&|$)/.exec(String(hash || ''));
    return m ? { id: m[1], tk: m[2] } : null;
  }

  /* =====================================================================
     동네 글(블로그·인스타) — 담당 동네(구·동·단지 묶음) + 매일/매주
     ===================================================================== */
  /** 담당 동네 묶음 정리 { g, dongs:[동], apts:[단지] } — 동·단지가 비면 구 전체 */
  function bundle(b) {
    b = b && typeof b === 'object' ? b : {};
    const cl = (a, n) => (Array.isArray(a) ? a : []).map(x => String(x || '').replace(/[<>"']/g, '').trim().slice(0, 40)).filter(Boolean).filter((x, i, s) => s.indexOf(x) === i).slice(0, n);
    return { g: /^\d{5}$/.test(String(b.g || '')) ? String(b.g) : '', dongs: cl(b.dongs, 10), apts: cl(b.apts, 20) };
  }
  /** 자료 → 거래 목록 + 기간. mode 'day': data/brief/{구}.json(오늘 새로 공개된 거래) · 'week': data/brief/kit/{구}.json rows(지난 한 주, 재료 v2부터) */
  function source(D, mode) {
    if (!D) return { rows: null, urg: null, miss: '이 지역 자료가 아직 없어요.' };
    if (mode === 'week') {
      if (!Array.isArray(D.rows)) return { rows: null, urg: null, miss: '이 지역 주간 묶음 자료는 다음 주 월요일 아침부터 만들어져요. 지금은 [매일]로 만들어 주세요.' };
      const w = D.wk || {}, isNew = w.basis === 'new';
      return { rows: D.rows, urg: D.urg || [], name: D.name, sd: D.sd, g: D.g,
        period: isNew ? { short: `${BT().mdS(w.from)}~${BT().mdS(w.to)} 공개분`, long: `${BT().md(w.from)}부터 ${BT().md(w.to)}까지 국토교통부 실거래가 공개 자료에 새로 올라온 거래`, word: '이번 주', lag: '' }
          : { short: `계약일 ${BT().mdS(w.p0)}~${BT().mdS(w.p1)}`, long: `계약일 기준 최근 30일(${BT().md(w.p0)}~${BT().md(w.p1)}) 국토교통부 실거래가 공개 자료`, word: '최근 30일', lag: '실거래 신고 기한이 계약 뒤 30일이라 이 기간 숫자는 앞으로 조금 늘 수 있다.' },
        asof: (D.asof || {}).t || D.built || '', seed: D.seed >>> 0 };
    }
    const w = (D.win || {}).t || {};
    return { rows: Array.isArray(D.trades) ? D.trades : [], urg: D.urgent || [], name: D.name, sd: D.sd, g: D.g,
      period: { short: `${BT().mdS(w.from || D.date)}${w.to && w.to !== w.from ? '~' + BT().mdS(w.to) : ''} 공개분`, long: `${BT().md(w.from || D.date)}${w.to && w.to !== w.from ? '~' + BT().md(w.to) : ''} 국토교통부 실거래가 공개 자료에 새로 올라온 거래`, word: '오늘', lag: '' },
      asof: D.date || '', seed: hashS(String(D.g) + '|' + String(D.date)) };
  }
  const hashS = s => { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
  /** 묶음에 맞는 거래만 */
  function pick(rows, B) {
    const ds = B.dongs || [], as = B.apts || [];
    if (!ds.length && !as.length) return (rows || []).slice();
    return (rows || []).filter(t => ds.indexOf(t.d) >= 0 || as.indexOf(t.a) >= 0);
  }
  const clean = t => !(t.sus || t.x);
  const upOf = t => t.pm ? r1((t.p / t.pm - 1) * 100) : null;
  /** 숫자 모으기(문장·카드가 같은 값을 씀) */
  function stats(rows, urg) {
    const R = rows || [], U = (urg || []).filter(u => !u.sus);
    const his = R.filter(t => t.hi), hc = his.filter(clean);
    const top = R.slice().sort((a, b) => b.p - a.p);
    const ups = hc.filter(t => t.pm && !t.thin).map(t => Object.assign({ up: upOf(t) }, t)).sort((a, b) => b.up - a.up);
    const cnt = {}; R.filter(t => !t.x).forEach(t => { cnt[t.a] = (cnt[t.a] || 0) + 1; });
    const apts = Object.keys(cnt).map(a => [a, cnt[a]]).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ko'));
    return { n: R.length, nx: R.filter(t => t.x).length, nhi: his.length, hiClean: hc.slice().sort((a, b) => b.p - a.p), ups,
      nsus: R.filter(t => t.sus).length, nthin: his.filter(t => t.thin && !t.sus).length,
      ndrop: R.filter(t => t.dr != null && t.dr <= -10).length, drops: R.filter(t => t.dr != null && t.dr <= -10 && !t.sus).sort((a, b) => a.dr - b.dr),
      urg: U.slice().sort((a, b) => a.disc - b.disc), nurg: U.length, top, apts };
  }

  /* ---------- 문장 자체 검사(엔진 claim_check.py 와 같은 규칙) ---------- */
  const WON = '(\\d+억(?: [\\d,]+만)? 원|[\\d,]+만 원)';
  const SUPER = /가장 |제일 |1위|최다|최대 /;
  function parseWon(s) {
    const m = /^(?:(\d+)억)?\s*(?:([\d,]+)만)?\s*원$/.exec(String(s).trim());
    if (!m || !(m[1] || m[2])) return null;
    return Number(m[1] || 0) * 10000 + Number(String(m[2] || '0').replace(/,/g, ''));
  }
  const SKIP = {};
  const num = s => Number(String(s).replace(/,/g, ''));
  const CC = [
    ['hi_max', new RegExp('가장 비싼 신고가(?:는|:) .*?' + WON), (m, c) => {
      const rows = c.rows.filter(t => t.hi && clean(t)); if (!rows.length) return '신고가가 없는데 가장 비싼 신고가를 말함';
      const got = parseWon(m[1]), want = Math.max(...rows.map(t => t.p)); return got === want ? null : `가장 비싼 신고가 ${m[1]} — 실제 ${want}만 원`; }],
    ['hi_up', /가장 많이 오른 곳은 .*?\(\+([\d.]+)%/, (m, c, s) => {
      const lim = s.indexOf('1억 원 이상') >= 0 ? 10000 : 0;
      const rows = c.rows.filter(t => t.hi && t.pm && clean(t) && !t.thin && t.p >= lim); if (!rows.length) return '해당 신고가가 없는데 가장 많이 오른 곳을 말함';
      const got = Number(m[1]), want = Math.max(...rows.map(upOf)); return Math.abs(got - want) < 0.05 ? null : `가장 많이 오른 신고가 +${got}% — 실제 +${want}%`; }],
    ['top_any', new RegExp('가장 비싼 거래는 .*?' + WON), (m, c) => {
      if (!c.rows.length) return '거래가 없는데 가장 비싼 거래를 말함';
      const got = parseWon(m[1]), want = Math.max(...c.rows.map(t => t.p)); return got === want ? null : `가장 비싼 거래 ${m[1]} — 실제 ${want}만 원`; }],
    ['drop_n', /최고가보다 10% (?:넘게|이상) 낮은 (?:1억 원 이상 )?거래가 ([\d,]+)건/, (m, c, s) => {
      const lim = s.indexOf('1억 원 이상') >= 0 ? 10000 : 0, want = c.rows.filter(t => t.dr != null && t.dr <= -10 && t.p >= lim).length;
      return num(m[1]) === want ? null : `큰 하락 ${m[1]}건 — 실제 ${want}건`; }],
    ['count', /매매(?: 거래)?는 ([\d,]+)건/, (m, c) => num(m[1]) === c.rows.length ? null : `매매 ${m[1]}건 — 실제 ${c.rows.length}건`],
    ['count_hi', /그중 신고가가 ([\d,]+)건/, (m, c) => { const w = c.rows.filter(t => t.hi).length; return num(m[1]) === w ? null : `신고가 ${m[1]}건 — 실제 ${w}건`; }],
    ['urg_max', /할인 폭이 가장 큰 (?:곳은|급매:) .*?([\d.]+)%/, (m, c) => {
      if (c.urg == null) return SKIP; if (!c.urg.length) return '급매가 없는데 할인 폭이 가장 큰 곳을 말함';
      const want = Math.max(...c.urg.map(u => Math.abs(u.disc))); return Math.abs(Number(m[1]) - want) < 0.05 ? null : `할인 폭이 가장 큰 급매 ${m[1]}% — 실제 ${want}%`; }],
    ['jr_max', /전세가율이 가장 높은 곳(?:은|:) .*?([\d.]+)%/, (m, c) => {
      if (c.jr == null) return SKIP; if (!c.jr.length) return '자료가 없는데 전세가율이 가장 높은 곳을 말함';
      const want = Math.max(...c.jr.map(r => r.jr)); return Math.abs(Number(m[1]) - want) < 0.05 ? null : `전세가율이 가장 높은 곳 ${m[1]}% — 실제 ${want}%`; }],
    ['apt_most', /거래가 가장 많은 단지는 (.+?)\(([\d,]+)건\)/, (m, c) => {
      const cnt = {}; c.rows.filter(t => !t.x).forEach(t => { cnt[t.a] = (cnt[t.a] || 0) + 1; });
      const want = Math.max(0, ...Object.values(cnt)), got = num(m[2]);
      if (got !== want) return `거래가 가장 많은 단지 ${got}건 — 실제 최대 ${want}건`;
      return m[1].split(/·|, /).every(a => cnt[a.trim()] === want) ? null : `${m[1]}의 실제 건수가 최대(${want})가 아님`; }]
  ];
  const NEEDS_ROWS = ['hi_max', 'hi_up', 'top_any', 'drop_n', 'count', 'count_hi', 'apt_most'];
  function splitS(line) { return String(line).split(/(?<=[.!?])\s+(?=\S)/).filter(Boolean); }
  function checkSentence(s, c) {
    const bad = []; let hit = 0;
    CC.forEach(([nm, rx, fn]) => {
      const m = rx.exec(s); if (!m) return;
      if (NEEDS_ROWS.indexOf(nm) >= 0 && !c.rows) return;
      const why = fn(m, c, s); if (why === SKIP) return;
      hit++; if (why) bad.push(nm + ': ' + why);
    });
    return { bad, hit };
  }
  /** 줄 목록 → { kept, probs }. 틀린 문장, 확인 규칙이 없는 최상급 숫자 문장은 뺌(엔진보다 엄격 — 엔진은 경고만) */
  function claimCheck(lines, c, where) {
    const kept = [], probs = [];
    (lines || []).forEach(line => {
      if (typeof line !== 'string') { kept.push(line); return; }
      const out = [];
      splitS(line).forEach(s => {
        const r = checkSentence(s, c);
        if (r.bad.length) { probs.push({ where: where || '', kind: 'wrong', text: s, why: r.bad.join('; ') }); return; }
        if (!r.hit && SUPER.test(s) && /\d/.test(s)) { probs.push({ where: where || '', kind: 'unverified', text: s, why: '확인 규칙이 없는 최상급 숫자 문장' }); return; }
        out.push(s);
      });
      if (out.length) kept.push(out.join(' '));
    });
    return { kept, probs };
  }

  /* ---------- 과장 표현 거르기(표시·광고 규정) ---------- */
  const HYPE = /(수익\s*보장|보장\s*수익|원금\s*보장|무조건|확실히\s*오|반드시\s*오|틀림없|100\s*%\s*(수익|상승|오)|손해\s*(없|안\s*)|최고의\s*투자|대박|폭등|폭락|역대급|미친\s*(가격|상승|시세)|지금이\s*(기회|적기)|마지막\s*기회|놓치면\s*후회|강력\s*추천|투자\s*적기|오를\s*수밖에|떨어질\s*(일|리)\s*없|저평가\s*확실|로또|급등\s*예정|프리미엄\s*보장|최저가\s*보장|초급매)/;
  const hypeHit = t => { const m = HYPE.exec(String(t || '')); return m ? m[0] : ''; };
  /** 개인정보처럼 보이는 것(동·호수, 전화, 지번) — 글에 있으면 안 됨 */
  const PRIV = /\d{1,4}\s*동\s*\d{1,4}\s*호|\d{3,4}\s*호(?![가-힣])|0\d{1,2}-\d{3,4}-\d{4}|\d{1,4}-\d{1,4}\s*번지/;
  function guard(lines, where) {
    const kept = [], probs = [];
    (lines || []).forEach(line => {
      const out = [];
      splitS(line).forEach(s => {
        const h = hypeHit(s); if (h) { probs.push({ where: where || '', kind: 'hype', text: s, why: `과장 표현 '${h}'` }); return; }
        if (PRIV.test(s)) { probs.push({ where: where || '', kind: 'priv', text: s, why: '동·호수·전화·지번처럼 보이는 글자' }); return; }
        out.push(s);
      });
      if (out.length) kept.push(out.join(' '));
    });
    return { kept, probs };
  }
  const NOT_AD = '이 글은 국토교통부에 신고된 아파트 실거래 정보를 정리한 글로, 특정 매물을 소개하는 광고가 아니다.';
  const NOT_AD_CARD = '실거래 정보 글 · 매물 광고 아님';
  const NOT_BROKER_DA = '작성자는 공인중개사가 아니며, 중개(거래 연결·계약 대행)를 하지 않는다.';

  /** 글 재료 → { title, blog:{text, md, body, len}, caption:{text, tags}, cards:[카드 설계], probs, st, empty }
      o = { src(source 결과), bundle, areaName, card(확인된 중개사 표시|null), seed } */
  function compose(o) {
    const src = o.src, B = bundle(o.bundle), R = pick(src.rows || [], B), U = pick(src.urg || [], B);
    const st = stats(R, U), P = src.period, pk = BT().picker(((o.seed != null ? o.seed : src.seed) >>> 0)), N = o.areaName || src.name || '';
    const ctx = { rows: R, urg: U.filter(u => !u.sus) };
    const tName = t => `${t.a} ${t.b}`;
    const L = [];
    const title = pk('t', [
      `${N} 아파트 ${P.word} 실거래 TOP — 신고가 ${st.nhi}건·급매 ${st.nurg}건`,
      `[${P.short}] ${N} 아파트, 실거래로 본 ${P.word}`,
      `${N} ${P.word} 새 거래 ${st.n}건 정리: 신고가·급매 한눈에`]);
    L.push(pk('i', [
      `${J(N, '을', '를')} 공개 자료로만 정리했다. 예상이나 소문이 아니라 실제로 신고된 거래만 담았다.`,
      `${N}에서 어떤 거래가 있었는지 숫자로 짚어 본다. 모든 숫자는 국토교통부 실거래가 공개 자료에서 가져왔다.`,
      `호가보다 먼저 확인해야 할 것은 실제로 계약된 가격이다. ${N} 아파트 실거래를 정리했다.`]));
    if (!st.n) {
      L.push(`${P.long}에서 ${N} 아파트 매매는 아직 보이지 않는다.` + (P.lag ? ' ' + P.lag : ' 공개 자료가 늦게 올라오는 날도 있어 다음에 함께 정리한다.'));
    } else {
      L.push(`${P.long}를 모아 보니 ${N} 아파트 매매는 ${st.n}건이다. 그중 신고가가 ${st.nhi}건이다.` + (st.nx ? ` 이 가운데 직거래(중개 없이 당사자끼리 한 거래) ${st.nx}건은 신고가·급매 판단에서 뺐다.` : '') + (P.lag ? ' ' + P.lag : ''));
      if (st.apts.length >= 2 && st.apts[0][1] >= 2) {
        const mx = st.apts[0][1], ties = st.apts.filter(a => a[1] === mx).slice(0, 3).map(a => a[0]);
        L.push(`거래가 가장 많은 단지는 ${ties.join('·')}(${mx}건)이다.`);
      }
      /* 새 거래 TOP(금액 순) */
      const t0 = st.top[0];
      L.push(`가장 비싼 거래는 ${tName(t0)} ${won(t0.p)}이다.` + (st.top.length > 1 ? ` 이어서 ${st.top.slice(1, 3).map(t => `${tName(t)} ${won(t.p)}`).join(', ')} 순이다.` : ''));
      /* 신고가 */
      if (st.hiClean.length) {
        const h0 = st.hiClean[0];
        L.push(pk('h', [`신고가는 같은 단지·같은 크기에서 그전까지 가장 높았던 가격을 넘은 거래를 말한다.`, `그전 최고 가격을 넘어선 거래를 신고가라고 한다(같은 단지·같은 크기 기준).`])
          + ` 가장 비싼 신고가는 ${tName(h0)} ${won(h0.p)}이다.` + (h0.pm ? ` 이전 최고가(${ymd(h0.pmd)}) ${J(won(h0.pm), '을', '를')} 넘었다.` : ''));
        if (st.ups.length) { const u0 = st.ups[0]; L.push(`이전 최고가 대비 가장 많이 오른 곳은 ${tName(u0)}(+${u0.up}%)이다.`); }
      } else if (st.nhi) L.push(`신고가 ${st.nhi}건은 모두 특수 거래 의심으로 표시돼 금액 비교에서 뺐다.`);
      else L.push(pk('h0', [`이번에 신고가 거래는 없었다.`, `같은 단지·같은 크기의 이전 최고 가격을 넘은 거래(신고가)는 이번에 나오지 않았다.`]));
      if (st.nsus) L.push(`특수 거래 의심 ${st.nsus}건(앞 1년 중간값보다 60% 넘게 비싸거나 최근 3개월 중간값보다 30% 넘게 싼 거래)은 순위에서 뺐다.`);
      if (st.nthin) L.push(`비교 거래가 적은 신고가 ${st.nthin}건은 오름 폭 순위에서 뺐다. 앞 1년 거래가 드물어 몇 % 올랐다는 숫자가 지금 시세 변화를 말하기 어렵기 때문이다.`);
      /* 급매 */
      if (st.nurg) {
        const u0 = st.urg[0];
        L.push(`같은 단지·같은 크기 최근 3개월 거래 중간값보다 10% 넘게 싸게 계약된 거래(흔히 급매로 보는 거래)는 ${st.nurg}건이다. 할인 폭이 가장 큰 곳은 ${tName(u0)}로 최근 3개월 중간값 ${won(u0.med)}보다 ${Math.abs(u0.disc).toFixed(1)}% 낮았다${u0.x ? '(직거래)' : ''}.`);
      } else L.push(pk('u0', [`최근 3개월 같은 단지 거래 중간값보다 10% 넘게 싼 거래(급매로 볼 만한 거래)는 보이지 않았다.`, `급매로 볼 만한 거래, 즉 같은 단지 최근 3개월 중간값보다 10% 넘게 싼 거래는 없었다.`]));
      /* 하락 */
      if (st.ndrop) L.push(`최근 2년 최고가보다 10% 넘게 낮은 거래가 ${st.ndrop}건이다. 층·향·수리 상태에 따라 가격 차이가 커서 한두 건만으로 시세가 내렸다고 보기는 어렵다.`);
    }
    L.push(pk('c', [
      '실거래는 이미 끝난 계약의 기록이다. 관심 있는 단지가 있다면 최근 거래와 지금 나온 매물을 함께 비교해 보세요.',
      '숫자는 흐름을 보는 출발점일 뿐이고, 실제 가격은 동·층·향·수리 상태에 따라 다르다. 궁금한 단지는 편하게 문의해 주세요.',
      '하루·한 주 숫자만으로 시장 방향을 단정하기는 어렵다. 몇 주 흐름을 이어서 보면 판단에 도움이 됩니다.']));
    /* 자체 검사 → 과장·개인정보 거르기 */
    const c1 = claimCheck(L, ctx, 'blog'), g1 = guard(c1.kept, 'blog');
    const body = g1.kept.join('\n\n');
    const srcLine = `자료: 국토교통부 아파트 매매 실거래가 공개 자료(${P.short}${src.asof ? `, ${BT().mdS(src.asof)} 수집분` : ''}). 신고가·급매 판단에서 직거래는 뺐고, 특수 거래 의심 거래는 순위에서 뺐다.`;
    const card = o.card && titleOf(o.card) ? o.card : null;
    const ofL = officeLines(card), ofT = ofL.length ? (isBroker(card) ? '[중개사무소 정보]\n' : '[작성자 정보]\n') + ofL.map(x => `${x[0]}: ${x[1]}`).join('\n') + (isBroker(card) ? '' : '\n' + NOT_BROKER_DA) : '';
    const tail = [srcLine, NOT_AD, ofT].filter(Boolean).join('\n\n');
    const text = `${title}\n\n${body}\n\n${tail}\n`;
    const md = `# ${title}\n\n${body}\n\n---\n\n${tail.replace(/\n/g, '  \n')}\n`;
    /* 인스타 설명글 */
    const CL = [pk('cap', [`${N} 아파트 ${P.word} 실거래 정리 (${P.short})`, `${N} ${P.word} 실거래 한눈에 (${P.short})`])];
    CL.push(`· 매매 ${st.n}건` + (st.nx ? `(직거래 ${st.nx}건 포함)` : ''), `· 신고가 ${st.nhi}건 · 급매로 볼 만한 거래 ${st.nurg}건`);
    if (st.hiClean[0]) CL.push(`· 신고가 중 금액이 큰 거래: ${tName(st.hiClean[0])} ${wonS(st.hiClean[0].p)}`);
    CL.push('카드를 넘겨 단지별 거래를 확인해 보세요.', `자료: 국토교통부 실거래가 공개 자료(${P.short})`, `※ ${NOT_AD}`);
    const c2 = claimCheck(CL, ctx, 'caption'), g2 = guard(c2.kept, 'caption');
    const tag = s => '#' + String(s).replace(/[^0-9A-Za-z가-힣]/g, '');
    const gName = (o.areaName || '').split(' ').pop() || N;
    const tagsA = [tag(gName), tag(gName + '아파트')].concat(B.dongs.slice(0, 3).map(d => tag(d + '아파트'))).concat(B.apts.slice(0, 2).map(a => tag(a)))
      .concat(['#아파트실거래가', '#실거래가', st.nhi ? '#신고가' : '', '#부동산시장', '#내집마련']).filter(Boolean).filter((t, i, s) => s.indexOf(t) === i && t.length > 1);
    const capTop = card ? `${titleOf(card)}${contactOf(card) ? ' · ' + contactOf(card) : ''}` : '';
    const capText = (capTop ? capTop + '\n' : '') + g2.kept.join('\n').replace('카드를 넘겨', '\n카드를 넘겨') + (ofT ? '\n\n' + ofT : '') + '\n\n' + tagsA.join(' ');
    /* 카드 2~4장(JDJ_BT.drawCard 모양) */
    const foot = `자료: 국토교통부 실거래가 공개 자료 · ${P.short} · ${NOT_AD_CARD}`;
    const adOne = ofL.map(x => `${x[0]} ${x[1]}`).join(' · ');
    const brand = card ? { color: colorOf(card), title: titleOf(card), sub: isBroker(card) ? `등록번호 ${card.reg || ''} · 대표 ${card.ceo || ''}` : (card.kind || ''), tel: contactOf(card), note: isBroker(card) ? '' : '공인중개사 아님 · 중개하지 않음' } : null;
    const C = [{ k: 'cover', kicker: `${N} 아파트`, title: P.word === '오늘' ? '오늘 새로 공개된 실거래' : `${P.word} 실거래 TOP`, sub: P.short,
      stats: [['매매', `${st.n}건`], ['신고가', `${st.nhi}건`], ['급매로 볼 만한 거래', `${st.nurg}건`]],
      lines: [st.nx ? `직거래 ${st.nx}건은 신고가·급매 판단에서 뺐어요` : '', st.nsus ? `특수 거래 의심 ${st.nsus}건은 순위에서 뺐어요` : '', '급매: 같은 단지 최근 3개월 중간값보다 10% 넘게 싼 거래'].filter(Boolean), foot }];
    if (st.hiClean.length) C.push({ k: 'list', kicker: '신고가', title: `신고가 ${st.nhi}건`, sub: '같은 단지·같은 크기 이전 최고가를 넘은 거래',
      rows: st.hiClean.slice(0, 4).map(t => [tName(t), wonS(t.p), `${t.d} · ${ymd(t.dt)}${t.f ? ` · ${t.f}층` : ''}${t.pm ? ` · 이전 최고 ${wonS(t.pm)}` : ''}${t.thin ? ' · 비교 거래 적음' : ''}`]), foot });
    const tops = st.urg.length ? { k: 'list', kicker: '급매로 볼 만한 거래', title: `급매로 볼 만한 거래 ${st.nurg}건`, sub: '같은 단지 최근 3개월 중간값보다 10% 넘게 싸게 계약',
      rows: st.urg.slice(0, 4).map(u => [tName(u), wonS(u.p), `${u.d} · ${ymd(u.dt)}${u.f ? ` · ${u.f}층` : ''} · 중간값보다 ${Math.abs(u.disc).toFixed(1)}% 쌈`]), foot }
      : st.n ? { k: 'list', kicker: '새 거래', title: '금액이 큰 거래 TOP', sub: P.long.length > 40 ? P.short : P.long,
        rows: st.top.slice(0, 4).map(t => [tName(t), wonS(t.p), `${t.d} · ${ymd(t.dt)}${t.f ? ` · ${t.f}층` : ''}${t.x ? ' · 직거래' : ''}${t.hi ? ' · 신고가' : ''}`]), foot } : null;
    if (tops) C.push(tops);
    C.push({ k: 'end', kicker: card ? (isBroker(card) ? '중개사무소 정보' : '작성자 정보') : '우리 동네 실거래', title: card ? titleOf(card) : '숫자로 보는 우리 동네', lines: card ? ofL.map(x => `${x[0]} ${x[1]}`).concat(isBroker(card) ? [] : [NOT_BROKER]) : ['공개 실거래 자료로 정리했어요'], sub: NOT_AD_CARD, foot });
    const cards = C.slice(0, 4).map(x => Object.assign(x, { ad: brand ? '' : adOne, brand }));
    /* 카드 글자도 거르기 */
    const cprobs = [];
    cards.forEach((x, i) => { [x.title, x.sub].concat(x.lines || []).forEach(t => { const h = hypeHit(t); if (h) cprobs.push({ where: 'card' + (i + 1), kind: 'hype', text: t, why: h }); }); });
    return { title, blog: { text, md, body, len: body.length }, caption: { text: capText, tags: tagsA }, cards, st, empty: !st.n,
      probs: c1.probs.concat(g1.probs, c2.probs, g2.probs, cprobs), lines: { all: L.length, kept: g1.kept.length } };
  }

  /* ---------- 카드 그리기(브라우저): JDJ_BT.drawCard 위에 사무소 색 띠·로고·연락처 ---------- */
  function loadImg(src) { return new Promise(ok => { if (!logoOk(src)) return ok(null); const im = new root.Image(); im.onload = () => ok(im); im.onerror = () => ok(null); im.src = src; }); }
  async function drawBrandCard(cv, c, i, n, logo) {
    BT().drawCard(cv, c, i, n);
    const B = c.brand; if (!B) return;
    const W = 1080, x = cv.getContext('2d'), y0 = W - 160, F = (sz, w) => { x.font = `${w} ${sz}px 'Noto Sans KR', sans-serif`; };
    x.fillStyle = B.color; x.fillRect(0, 0, W, 14);
    x.fillStyle = '#FFFFFF'; x.fillRect(0, W - 162, W, 162);
    x.fillStyle = B.color; x.fillRect(0, y0, W, 160);
    const im = await loadImg(logo); let tx = 64;
    if (im) { const s = 104, r = Math.min(s / im.width, s / im.height), w = im.width * r, h = im.height * r; x.fillStyle = '#FFFFFF'; x.beginPath(); x.arc(64 + s / 2, y0 + 80, s / 2 + 8, 0, Math.PI * 2); x.fill(); x.drawImage(im, 64 + (s - w) / 2, y0 + 80 - h / 2, w, h); tx = 64 + s + 32; }
    x.fillStyle = '#FFFFFF'; x.textBaseline = 'alphabetic'; x.textAlign = 'left';
    F(40, 900); let t = B.title; while (x.measureText(t).width > W - tx - 60 && t.length > 2) t = t.slice(0, -1); x.fillText(t, tx, y0 + 58);
    F(26, 700); x.fillText([B.tel, B.note].filter(Boolean).join(' · ').slice(0, 60), tx, y0 + 98);
    F(20, 500); x.globalAlpha = 0.85; x.fillText(String(c.foot || '').slice(0, 70), tx, y0 + 134); x.globalAlpha = 1;
  }

  /* ---------- 내 표시 정보 칸(브라우저) — 확인된 값은 글자로만, 빈 칸·꾸미기만 고침 ---------- */
  const FIELD = { office: ['사무소(회사) 이름', 40], ceo: ['대표 공인중개사 이름', 20], name: ['이름', 20], addr: ['소재지', 80], phone: ['사무소 전화', 20] };
  function mountMe(box, ME, done, shrink) {
    const c = ME.card, br = isBroker(c), L = c.locked || [], miss = c.missing || [];
    const lk = L.map(f => FIELD[f] && c[f] ? `<li><b>${esc(f === 'reg' ? '등록번호' : FIELD[f][0])}</b> ${esc(c[f])}</li>` : f === 'reg' && c.reg ? `<li><b>등록번호</b> ${esc(c.reg)}</li>` : '').join('');
    const editable = (br ? ['office', 'ceo', 'addr', 'phone'].concat(c.role === 'member' ? ['name'] : []) : ['name', 'office', 'addr', 'phone']).filter(f => L.indexOf(f) < 0);
    box.innerHTML = `<div class="me" style="border-left:6px solid ${colorOf(c)}">${logoOk(ME.logo) ? `<img src="${ME.logo}" alt="">` : ''}<div><b>${esc(titleOf(c) || '이름을 채워 주세요')}</b><span class="vf">확인된 ${esc(c.kind || '전문가')}</span>
      ${lk ? `<ul class="lk">${lk}</ul><small>확인 자료에 있는 값이라 바꿀 수 없어요.</small>` : ''}</div></div>
      ${miss.length ? `<p class="warn">${br ? '공인중개사법상 손님 자료에 꼭 들어가야 하는 칸이 비어 있어요. 채우고 [저장]을 눌러 주세요.' : '이름과 연락처 하나를 채우고 [저장]을 눌러 주세요.'}</p>` : ''}
      <div class="two">${editable.map(f => `<div><label for="pf_${f}">${esc(FIELD[f][0])}${miss.indexOf(f) >= 0 ? ' (꼭 필요)' : ''}</label><input id="pf_${f}" maxlength="${FIELD[f][1]}" value="${esc(c[f] || '')}"></div>`).join('')}
        <div><label for="pf_mobile">휴대폰 (선택)</label><input id="pf_mobile" maxlength="20" inputmode="tel" value="${esc(c.mobile || '')}"></div>
        <div><label for="pf_kakao">카카오톡 채널 주소 (선택)</label><input id="pf_kakao" maxlength="200" placeholder="https://pf.kakao.com/…" value="${esc(c.kakao || '')}"></div></div>
      <label>사무소 색상 <small>(표지·머리글·카드 띠)</small></label><div class="sw">${(ME.colors || COLORS).map(k => `<button type="button" data-c="${k}" class="${k === colorOf(c) ? 'on' : ''}" style="background:${k}" aria-label="색상 ${k}"></button>`).join('')}</div>
      <label for="pf_logo">로고 (PNG·JPG)</label><input id="pf_logo" type="file" accept="image/png,image/jpeg,image/webp">
      ${logoOk(ME.logo) ? '<p class="hint"><button type="button" class="btn ghost" id="pf_nologo" style="min-height:36px;font-size:13px;padding:4px 10px">로고 빼기</button></p>' : ''}
      ${ME.whiteOk ? `<label class="wl"><input type="checkbox" id="pf_white" ${c.white ? 'checked' : ''}> 손님 화면 맨 아래 'Powered by ${esc(SITE)}' 끄기 <small>(프로 회원 기능 · 지금은 운영자만 · 공공데이터 출처 표기는 늘 남아요)</small></label>` : ''}
      ${!br ? `<p class="hint">${esc(NOT_BROKER)} 이 문장은 손님 자료에 늘 함께 들어가요.</p>` : ''}
      <div class="acts"><button class="btn" id="pf_save" type="button">내 정보 저장</button></div><p class="err" id="pf_err" role="alert"></p>`;
    let color = colorOf(c);
    box.querySelector('.sw').onclick = e => { const b = e.target.closest('[data-c]'); if (!b) return; color = b.dataset.c; box.querySelectorAll('.sw button').forEach(x => x.classList.toggle('on', x === b)); };
    const send = async body => { try { const r = await post(Object.assign({ action: 'ptProfile' }, body)); done(r); } catch (e) { box.querySelector('#pf_err').textContent = e.message; } };
    box.querySelector('#pf_save').onclick = () => { const b = { color, mobile: box.querySelector('#pf_mobile').value, kakao: box.querySelector('#pf_kakao').value }; editable.forEach(f => { b[f] = box.querySelector('#pf_' + f).value; }); const w = box.querySelector('#pf_white'); if (w) b.white = w.checked; send(b); };
    box.querySelector('#pf_logo').onchange = async e => { const f = e.target.files[0]; if (!f) return; try { send({ logo: await shrink(f) }); } catch (x) { box.querySelector('#pf_err').textContent = x.message || '로고를 읽지 못했어요.'; } };
    const nl = box.querySelector('#pf_nologo'); if (nl) nl.onclick = () => send({ logo: '' });
  }

  const API = { SITE, LS_PV, on, preview, dongneLink, sess, post, COLORS, colorOf, NOT_BROKER, NOT_BROKER_DA, isBroker, titleOf, coverHtml, drawBrandCard, mountMe, esc, med, RULE, judge, tags, jeonse, supply, report, GLOSS, DISCLAIM, officeLines, headHtml, footHtml, reportHtml,
    encodeUnit, decodeUnit, parseShare, bundle, source, pick, stats, parseWon, claimCheck, splitS, HYPE, hypeHit, PRIV, guard, NOT_AD, NOT_AD_CARD, compose };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.JDJ_PT = API;
})(typeof window !== 'undefined' ? window : globalThis);
