/* 중개사 플러스 — 내 손님 브리핑 공용 계산 (JDJ_CBRIEF)
   - 손님 정보는 중개사가 정한 '부르는 이름'(예: 김○○ 손님·302호 손님) · 관심 단지 5곳까지 · 지역(선택) · 목적(선택: 매수·매도·전세)만.
     전화번호·이메일·실명은 받지 않아요(cleanLabel 이 거르고, 서버 tools/agent-backend.gs bpLabel 이 같은 규칙으로 한 번 더 거름).
   - 몇 명·몇 곳까지: 요금제 표(assets/brief-core.js TIERS)의 customers(손님 수)·weekly(주간 리포트) 값을 읽어요. 손님 1명 단지 수는 APTS(5).
   - 카드 자료: 공개 데이터 data/brief/cx/{시군구}.json (엔진 client_brief.py — 모든 손님 단지를 한 번씩만 계산, 개인정보 없음).
     이 파일은 숫자를 새로 만들지 않고 자료를 읽기 쉬운 글로 바꾸기만 해요. 자료가 없으면 '어제 새 거래 없음'과 가장 최근 거래가를 그대로 밝혀요.
   - 손님 링크: /brief/c/#<손님id>.<토큰 64자리> — # 뒤는 서버·통계로 가지 않아요. 토큰은 서버 비밀값으로 만든 값(맞히기 어려움).
   node 에서도 불러 검사할 수 있게 순수 함수는 DOM 없이 동작해요(tools/client-brief-test.js). */
(function (root) {
  'use strict';
  var JB = (typeof window !== 'undefined' && window.JDJ_BASE) || (function (p) { var g = p.indexOf('/jangdaejang-calc/') === 0, b = { SITE: g ? '/jangdaejang-calc/' : '/', DATA: g ? '/jangdaejang-data/' : 'https://chrisjangdaejang-ux.github.io/jangdaejang-data/' }; if (typeof window !== 'undefined') window.JDJ_BASE = b; return b; })((typeof location !== 'undefined' && location.pathname) || '/jangdaejang-calc/');
  const B = root.JDJ_BRIEF || (typeof require !== 'undefined' ? require('./brief-core.js') : null);
  const SITE = ((root.JDJ_SITE || {}).SITE_NAME || '').trim() || (B && B.SITE) || '집예보';
  const APTS = 5, LABEL_MAX = 20;
  const PURPOSE = { '': '', buy: '매수', sell: '매도', jeonse: '전세' };
  const PURPOSE_TITLE = { '': '관심 단지 매매', buy: '사려는 단지 매매', sell: '팔려는 단지 매매', jeonse: '전세 알아보는 단지 매매' };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------- 요금제 한도 ---------- */
  /** 요금제 줄(TIERS 한 줄 또는 PRICE 값) → { customers, apts, weekly } — customers 가 없으면 0(이 요금제엔 손님 카드 없음) */
  function limits(t) {
    t = t || {};
    const n = Math.max(0, Math.floor(Number(t.customers) || 0));
    return { customers: n, apts: n ? Math.max(1, Math.min(APTS, Math.floor(Number(t.custApts) || APTS))) : 0, weekly: !!t.weekly };
  }
  /** 구독 목록(briefMine subs) 중 손님 카드가 되는 요금제(받는 중·시작 예정)의 한도. 없으면 customers 0 */
  function limitOf(subs, tiers, today) {
    today = today || new Date().toISOString().slice(0, 10);
    const T = tiers || (B && (B.PRICE || {})) || {};
    let best = limits(null);
    (subs || []).forEach(s => {
      if (s.state === '해지' || !(s.active || s.start > today)) return;
      const key = s.tier || Object.keys(T).find(k => T[k] && T[k].name && String(s.product || '').indexOf(T[k].name) === 0) || '';
      const L = limits(T[key]);
      if (L.customers > best.customers || (L.weekly && !best.weekly)) best = L;
    });
    return best;
  }

  /* ---------- 손님 이름표 (전화번호·실명·이메일 금지) ---------- */
  const SURNAME = '김이박최정강조윤장임한오서신권황안송류유전홍고문양손배백허남심노하곽성차주우구민진나지엄채원천방공현함변염여추도소석선설마길연위표명기반왕금옥육인맹제모탁국어은편용예봉경사부태';
  const PLACE_END = /[구동시군읍면리역로길층호집점관원단]$/;
  const PHONE = /(?:\d[\s.\-)(]*){7,}|01[016789]\s*[-.)]?\s*\d{3,4}/;
  /** 이름표 검사 → { ok, label, err } */
  function cleanLabel(s) {
    const t = String(s == null ? '' : s).replace(/[\u0000-\u001F\u007F<>"'`\\]/g, ' ').replace(/\s+/g, ' ').trim();
    const bad = err => ({ ok: false, label: '', err });
    if (!t) return bad('손님을 부를 이름을 적어 주세요. 예: 김○○ 손님, 302호 손님');
    if (t.length > LABEL_MAX) return bad(`이름은 ${LABEL_MAX}자까지 적을 수 있어요.`);
    if (PHONE.test(t)) return bad('전화번호는 적지 말아 주세요. 손님 연락처는 저장하지 않아요.');
    if (/@|https?:|www\./i.test(t)) return bad('이메일·주소 링크는 적지 말아 주세요. 손님 연락처는 저장하지 않아요.');
    const names = t.split(' ').map(w => w.replace(/(손님|고객님|고객|님|씨)$/, '')).filter(w => w.length === 3 && /^[가-힣]{3}$/.test(w) && SURNAME.indexOf(w[0]) >= 0 && !PLACE_END.test(w));
    if (names.length) return bad(`손님 실명은 적지 말아 주세요. '${names[0][0]}○○ 손님'처럼 가려서 적어 주세요.`);
    return { ok: true, label: t, err: '' };
  }
  /** 손님 한 명 → 깨끗한 값(서버로 보낼 모양). 문제가 있으면 err */
  function cleanCustomer(c, L) {
    c = c && typeof c === 'object' ? c : {};
    L = L || { apts: APTS };
    const lb = cleanLabel(c.label);
    const seen = {}, apts = [];
    (Array.isArray(c.apts) ? c.apts : []).forEach(x => {
      if (!x) return;
      const g = String(x.g || ''), d = String(x.d || '').trim().slice(0, 20), a = String(x.a || '').replace(/[<>"'`\\]/g, '').trim().slice(0, 40);
      if (!/^\d{5}$/.test(g) || !a || (d && !/^[가-힣0-9·.]{1,20}$/.test(d))) return;
      const k = g + '|' + d + '|' + a; if (seen[k]) return; seen[k] = 1; apts.push({ g, d, a });
    });
    const out = { id: /^C[0-9A-F]{11}$/.test(String(c.id || '')) ? String(c.id) : '', label: lb.label,
      g: /^\d{5}$/.test(String(c.g || '')) ? String(c.g) : '', gn: String(c.gn || '').replace(/[<>"'`\\]/g, '').trim().slice(0, 30),
      purpose: Object.prototype.hasOwnProperty.call(PURPOSE, c.purpose) ? c.purpose : '', apts: apts.slice(0, L.apts || APTS) };
    if (!out.g) out.gn = '';
    let err = lb.err;
    if (!err && !apts.length) err = '관심 단지를 하나 이상 골라 주세요.';
    if (!err && apts.length > (L.apts || APTS)) err = `손님 한 분에 단지는 ${L.apts || APTS}곳까지예요.`;
    return { c: out, err };
  }
  /** 손님 목록 전체 검사 → { list, err } */
  function cleanList(list, L) {
    L = L || limits({ customers: 10 });
    const arr = Array.isArray(list) ? list : [];
    if (arr.length > L.customers) return { list: [], err: `손님은 ${L.customers}명까지 등록할 수 있어요.` };
    const out = [];
    for (let i = 0; i < arr.length; i++) {
      const r = cleanCustomer(arr[i], L);
      if (r.err) return { list: [], err: `${i + 1}번째 손님: ${r.err}`, at: i };
      out.push(r.c);
    }
    return { list: out, err: '' };
  }
  /** 모든 손님 단지 → 시군구별로 한 번씩 (화면이 cx 파일을 한 번만 받게) */
  function sggs(list) {
    const s = {};
    (list || []).forEach(c => (c.apts || []).forEach(a => { s[a.g] = 1; }));
    return Object.keys(s).sort();
  }

  /* ---------- 손님 링크 ---------- */
  function parseHash(h) {
    const m = /^#?(C[0-9A-F]{11})\.([0-9a-f]{64})$/.exec(String(h || ''));
    return m ? { id: m[1], tk: m[2] } : null;
  }

  /* ---------- 카드 내용 (숫자는 자료 그대로) ---------- */
  const won = m => B ? B.won(m) : String(m);
  const md = i => `${Math.floor(i / 100) % 100}/${i % 100}`;
  /** 확인 기간 → '어제' · '11/13 이후' */
  function since(w) {
    if (!w || !w.to) return '';
    if (!w.from) return '처음 확인한';
    const a = new Date(w.from + 'T00:00:00Z'), b = new Date(w.to + 'T00:00:00Z');
    return (b - a) / 86400000 <= 1 ? '어제' : `${a.getUTCMonth() + 1}/${a.getUTCDate()} 이후`;
  }
  /** 단지 한 곳 → 줄 목록 [{k, t}] (k: head·new·none·last·chg·urg·rk) */
  function rows(C, apt) {
    const x = C && C.cx ? C.cx[(apt.d || '') + '|' + apt.a] : null;
    const name = `${apt.a}${apt.d ? ` (${apt.d})` : ''}`;
    if (!C) return { name, lines: [{ k: 'none', t: '오늘 자료를 아직 받지 못했어요.' }], tags: [] };
    if (!x) return { name, lines: [{ k: 'none', t: '오늘 이 단지 자료가 없어요. 내일 아침 카드부터 들어가요.' }], tags: [] };
    const w = since(C.win), out = [], tags = [];
    if (x.none) out.push({ k: 'none', t: '공개된 매매 기록이 아직 없어요.' });
    else if (x.nn) {
      const t = (x.new || []).slice().sort((a, b) => (b.hi ? 1 : 0) - (a.hi ? 1 : 0) || b.dt - a.dt)[0];
      out.push({ k: 'new', t: `${w} 새 거래 ${x.nn}건 · ${t.b} ${won(t.p)}(${md(t.dt)} 계약${t.f != null ? `, ${t.f}층` : ''})` });
      if (t.hi) tags.push({ c: 'hi', t: '신고가' });
      else if (t.dr != null && t.dr <= -10) tags.push({ c: 'dn', t: `최근 2년 최고가보다 ${Math.abs(t.dr).toFixed(0)}% 낮음` });
      if (t.x) tags.push({ c: 'x', t: '직거래' });
    } else {
      const l = (x.last || [])[0];
      out.push({ k: 'none', t: `${w} 새 거래 없음` + (l ? ` · 가장 최근 거래 ${l.b} ${won(l.p)}(${String(l.dt).slice(0, 4)}.${md(l.dt).replace('/', '.')} 계약)` : '') });
    }
    if (x.chg) {
      const c = x.chg, up = c.pct > 0;
      out.push({ k: 'chg', t: `${c.b} 최근 3개월 가운데 값 ${won(c.m1)}(${c.n1}건) · 그 전 3개월 ${won(c.m0)}(${c.n0}건)보다 ${up ? '+' : c.pct < 0 ? '−' : ''}${Math.abs(c.pct).toFixed(1)}%` });
    }
    (x.urg || []).slice(0, 1).forEach(u => out.push({ k: 'urg', t: `급매로 보이는 거래: ${u.b} ${won(u.p)} — 최근 3개월 같은 평형 가운데 값 ${won(u.med)}보다 ${Math.abs(u.disc).toFixed(0)}% 낮아요` }));
    (x.rk || []).slice(0, 1).forEach(r => out.push({ k: 'rk', t: `미래가치 등수(${r.b}) ${r.r0.toLocaleString('ko-KR')}위 → ${r.r1.toLocaleString('ko-KR')}위 ${r.mv > 0 ? '▲' : '▼'}${Math.abs(r.mv).toLocaleString('ko-KR')}` }));
    return { name, lines: out, tags };
  }
  /** 손님 카드 모델: cxMap = { 시군구: cx 파일 } */
  function card(cust, cxMap, profile, today) {
    cxMap = cxMap || {};
    const apts = (cust.apts || []).slice(0, APTS);
    const items = apts.map(a => rows(cxMap[a.g] || null, a));
    const files = apts.map(a => cxMap[a.g]).filter(Boolean);
    const dates = files.map(f => f.date).filter(Boolean).sort();
    const wins = files.map(f => f.win || {}).filter(w => w.to);
    const f0 = wins.map(w => w.from).filter(Boolean).sort()[0], t1 = wins.map(w => w.to).sort().slice(-1)[0];
    const fmt = s => s ? `${+s.slice(5, 7)}/${+s.slice(8, 10)}` : '';
    const period = t1 ? (f0 ? `${fmt(f0)} → ${fmt(t1)} 확인한 국토부 공개 자료` : `${fmt(t1)} 확인한 국토부 공개 자료`) : '';
    return { title: `오늘 아침 ${PURPOSE_TITLE[cust.purpose || ''] || '관심 단지 매매'} 소식`, date: dates.length ? B.dateLabel(dates[dates.length - 1]) : (today ? B.dateLabel(today) : ''),
      items, period, src: '출처: 국토교통부 아파트 매매 실거래가 공개 자료(공공자료)', profile: brand(profile), purpose: PURPOSE[cust.purpose || ''] || '' };
  }
  /** 중개사 표시(공인중개사법 제18조의2: 명칭·소재지·연락처·등록번호·개업공인중개사 성명) — 전문가 리포트(JDJ_PRO.headHtml)와 같은 규칙 */
  function brand(p) {
    p = p || {};
    const P = root.JDJ_PRO;
    const c = P ? P.cleanProfile(p) : p;
    const nm = c.role === 'member' ? `소속공인중개사 ${c.name} · 대표 ${c.ceo}` : `대표 공인중개사 ${c.ceo || ''}`;
    const sub = [c.reg ? `등록번호 ${c.reg}` : '', c.addr || ''].filter(Boolean).join(' · ');
    return { office: c.office || '', nm, sub, phone: c.phone || '', kakao: c.kakao || '', role: c.role };
  }
  /** 이 표시 정보로 카드를 보낼 수 있는지(공인중개사만) — 빈 문자열이면 됨 */
  function brandError(p) {
    const P = root.JDJ_PRO;
    p = P ? P.cleanProfile(p) : (p || {});
    if (!(p.role === 'agent' || p.role === 'member')) return '중개사 플러스는 공인중개사(개업·소속)용이에요.';
    return P ? P.profileError(p) : '';
  }

  /** 카드 HTML(화면·손님 페이지 공용). o.label: 중개사에게만 보이는 손님 이름표 */
  function cardHtml(m, o) {
    o = o || {};
    const p = m.profile;
    return `<article class="ccard" ${o.id ? `data-cid="${esc(o.id)}"` : ''}>
      <header class="cc-h"><div class="cc-of">${esc(p.office)}<span>공인중개사</span></div><div class="cc-dt">${esc(m.date)}</div></header>
      ${o.label ? `<div class="cc-lb">${esc(o.label)}<small>이 이름은 중개사님 화면에만 보여요</small></div>` : ''}
      <h3 class="cc-t">${esc(m.title)}</h3>
      <ol class="cc-l">${m.items.map(it => `<li><div class="cc-n">${esc(it.name)}${it.tags.map(t => `<em class="cc-tg ${t.c}">${esc(t.t)}</em>`).join('')}</div>
        ${it.lines.map(l => `<p class="cc-${l.k}">${esc(l.t)}</p>`).join('')}</li>`).join('')}</ol>
      <footer class="cc-f"><p>${m.period ? `기간: ${esc(m.period)} · ` : ''}${esc(m.src)}. 숫자는 공공자료를 그대로 옮겼어요. ‘가운데 값’은 거래 값을 줄 세웠을 때 한가운데 값이에요.</p>
        <p class="cc-who"><b>${esc(p.office)}</b> ${esc(p.nm)}${p.sub ? ' · ' + esc(p.sub) : ''}${p.phone ? ` · <span class="nw">전화 ${esc(p.phone)}</span>` : ''}</p></footer>
    </article>`;
  }
  const CSS = '.ccard{border:1px solid #D6E2FF;border-radius:18px;background:#fff;padding:16px 16px 12px;box-shadow:0 1px 0 rgba(0,0,0,.02)}'
    + '.cc-h{display:flex;justify-content:space-between;align-items:flex-start;gap:8px;border-bottom:2px solid #2560E8;padding-bottom:8px;margin-bottom:8px}'
    + '.cc-of{font-weight:900;font-size:17px;color:#191F28;display:flex;align-items:center;gap:6px;flex-wrap:wrap;min-width:0}.cc-of span{font-size:12px;font-weight:800;color:#fff;background:#2560E8;border-radius:5px;padding:1px 6px}'
    + '.cc-dt{font-size:13.5px;color:#4E5968;white-space:nowrap}'
    + '.cc-lb{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;font-weight:800;color:#8A6D1C;background:#FBF8EF;border:1px dashed #EFE6CC;border-radius:10px;padding:6px 10px;margin:0 0 8px}.cc-lb small{font-weight:500;color:#6B7684;font-size:12.5px}'
    + '.cc-t{font-size:19px;font-weight:900;margin:2px 0 8px;letter-spacing:-.3px}'
    + '.cc-l{list-style:none;margin:0;padding:0}.cc-l li{border-top:1px solid #EEF1F4;padding:9px 0}.cc-l li:first-child{border-top:0}'
    + '.cc-n{font-weight:800;font-size:16px;display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin:0 0 3px}'
    + '.cc-tg{font-style:normal;font-size:12px;font-weight:800;border-radius:6px;padding:1px 7px;background:#EEF1F4;color:#4E5968}.cc-tg.hi{background:#FDECEC;color:#C8333A}.cc-tg.dn{background:#E8F0FF;color:#1F4FD1}'
    + '.cc-l p{margin:2px 0;font-size:14.5px;line-height:1.55;color:#333D4B}.cc-l p.cc-new{color:#191F28;font-weight:700}.cc-l p.cc-urg{color:#8A6D1C}.cc-l p.cc-rk{color:#1F4FD1}'
    + '.cc-f{border-top:1px solid #E5E8EB;margin-top:6px;padding-top:8px}.cc-f p{margin:0 0 4px;font-size:12.5px;line-height:1.55;color:#4E5968}.cc-who b{color:#191F28}.cc-f .nw{white-space:nowrap}';

  /* ---------- 카드 이미지(1080×1080, canvas) — 보내기 화면에서 '사진으로 보내기'를 고를 때만 ---------- */
  function wrapText(ctx, text, maxW, maxLines) {
    const out = []; let line = '';
    const words = String(text).split(' ');
    for (let i = 0; i < words.length; i++) {
      let w = words[i];
      const t = line ? line + ' ' + w : w;
      if (ctx.measureText(t).width <= maxW) { line = t; continue; }
      if (line) { out.push(line); line = ''; if (out.length >= maxLines) break; }
      while (ctx.measureText(w).width > maxW) {                 // 한 낱말이 한 줄보다 길면 글자 단위로
        let k = w.length; while (k > 1 && ctx.measureText(w.slice(0, k)).width > maxW) k--;
        out.push(w.slice(0, k)); w = w.slice(k); if (out.length >= maxLines) break;
      }
      if (out.length >= maxLines) break;
      line = w;
    }
    if (out.length < maxLines && line) out.push(line);
    const all = String(text).replace(/\s+/g, ''), got = out.join('').replace(/\s+/g, '');
    if (got.length < all.length && out.length) out[out.length - 1] = out[out.length - 1].replace(/.$/, '…');
    return out.slice(0, maxLines);
  }
  function drawCard(m, doc) {
    doc = doc || root.document;
    const cv = doc.createElement('canvas'); cv.width = 1080; cv.height = 1080;
    const ctx = cv.getContext('2d'), F = "'Noto Sans KR','Apple SD Gothic Neo','Malgun Gothic',sans-serif", p = m.profile;
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 1080, 1080);
    ctx.fillStyle = '#2560E8'; ctx.fillRect(0, 0, 1080, 128);
    ctx.fillStyle = '#EFE6CC'; ctx.fillRect(0, 128, 1080, 8);
    ctx.fillStyle = '#fff'; ctx.font = `900 44px ${F}`; ctx.textBaseline = 'middle';
    ctx.fillText(wrapText(ctx, p.office, 700, 1)[0] || '', 56, 66);
    ctx.font = `500 28px ${F}`; ctx.textAlign = 'right'; ctx.fillStyle = '#F3E3B0'; ctx.fillText(m.date, 1024, 66); ctx.textAlign = 'left';
    ctx.fillStyle = '#191F28'; ctx.font = `900 46px ${F}`; ctx.textBaseline = 'alphabetic'; ctx.fillText(m.title, 56, 206);
    let y = 240;
    const n = m.items.length, per = Math.floor(712 / Math.max(n, 1)), LH = n <= 2 ? 44 : 40, FS = n <= 2 ? 30 : 27;
    m.items.forEach(it => {
      const y0 = y;
      ctx.fillStyle = '#B8942A'; ctx.fillRect(56, y + 6, 8, 36);
      ctx.fillStyle = '#191F28'; ctx.font = `800 34px ${F}`;
      const nm = wrapText(ctx, it.name, 620, 1)[0] || ''; ctx.fillText(nm, 80, y + 37);
      let x = 80 + ctx.measureText(nm).width + 14;
      it.tags.slice(0, 1).forEach(t => { ctx.font = `800 24px ${F}`; const w = ctx.measureText(t.t).width + 22;
        if (x + w < 1024) { ctx.fillStyle = t.c === 'hi' ? '#FDECEC' : '#E8F0FF'; ctx.fillRect(x, y + 8, w, 38); ctx.fillStyle = t.c === 'hi' ? '#C8333A' : '#1F4FD1'; ctx.fillText(t.t, x + 11, y + 35); } });
      y += 58;
      const maxL = Math.max(1, Math.floor((per - 74) / LH));
      let used = 0;
      it.lines.forEach(l => {
        if (used >= maxL) return;
        ctx.font = `${l.k === 'new' ? 700 : 500} ${FS}px ${F}`; ctx.fillStyle = l.k === 'urg' ? '#8A6D1C' : l.k === 'rk' ? '#1F4FD1' : l.k === 'new' ? '#191F28' : '#333D4B';
        wrapText(ctx, l.t, 944, Math.min(2, maxL - used)).forEach(t2 => { ctx.fillText(t2, 80, y + FS); y += LH; used++; });
      });
      y = Math.min(Math.max(y + 18, y0 + 80), 950);
      ctx.fillStyle = '#EEF1F4'; ctx.fillRect(56, y - 10, 968, 2);
      y += 6;
    });
    ctx.fillStyle = '#F4F7FF'; ctx.fillRect(0, 962, 1080, 118);
    ctx.fillStyle = '#4E5968'; ctx.font = `500 22px ${F}`;
    ctx.fillText(wrapText(ctx, (m.period ? `${m.period} · ` : '') + '국토교통부 실거래가(공공자료)', 968, 1)[0], 56, 998);
    ctx.fillStyle = '#191F28'; ctx.font = `700 23px ${F}`;
    ctx.fillText(wrapText(ctx, `${p.office} ${p.nm}${p.phone ? ' · 전화 ' + p.phone : ''}`, 968, 1)[0], 56, 1034);
    ctx.fillStyle = '#4E5968'; ctx.font = `500 21px ${F}`; ctx.fillText(wrapText(ctx, p.sub, 968, 1)[0] || '', 56, 1064);
    return cv;
  }
  function cardBlob(m) {
    return new Promise(res => { try { drawCard(m).toBlob(b => res(b || null), 'image/png'); } catch (e) { res(null); } });
  }

  /* ---------- 화면 도우미(브라우저에서만) ---------- */
  const DATA = (B && B.DATA) || JB.DATA + 'data/brief/';
  function sess() { try { return (JSON.parse(root.localStorage.getItem('jdj_auth') || 'null') || {}).s || ''; } catch (e) { return ''; } }
  async function post(action, body) {
    const api = (root.JDJ_AGENTS && root.JDJ_AGENTS.api) || '';
    if (!api) throw new Error('서버에 연결하지 못했어요.');
    let j; try { j = await (await fetch(api, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(Object.assign({ action }, body || {})) })).json(); }
    catch (e) { throw new Error('서버에 연결하지 못했어요. 인터넷 연결을 확인하고 다시 해 주세요.'); }
    if (!j || !j.ok) { const t = (j && j.err) || ''; const er = new Error(/[가-힣]/.test(t) ? t : '잠시 뒤 다시 시도해 주세요. 계속되면 카카오톡 상담으로 알려 주세요.'); er.raw = t; er.code = j && j.code; throw er; }
    return j;
  }
  /** 손님 단지가 있는 동네의 cx 파일을 동네마다 한 번씩 받음 */
  async function loadCx(gs) {
    const out = {};
    await Promise.all((gs || []).map(g => fetch(DATA + 'cx/' + g + '.json', { cache: 'no-cache' }).then(r => r.ok ? r.json() : null).catch(() => null).then(j => { out[g] = j; })));
    return out;
  }
  const ACT_CSS = '.ccw{margin:0 0 14px;scroll-margin-top:72px}.ccw.focus .ccard{border-color:#2560E8;box-shadow:0 0 0 3px rgba(47,107,255,.18)}'
    + '.cc-act{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}.cc-act .btn{flex:1 1 auto;min-width:140px}';
  function css(doc) {
    if (doc.getElementById('ccCss')) return;
    const st = doc.createElement('style'); st.id = 'ccCss'; st.textContent = CSS + ACT_CSS; doc.head.appendChild(st);
  }
  /** 중개사 화면: 오늘 손님 카드 + [손님에게 보내기](링크 먼저 — assets/share.js sendLink, 사진은 고를 때만) · [링크 복사]
      d: 서버 bpMine 결과 · o: { focus: 손님 id, place: 통계 위치, limit } */
  async function mountCards(el, d, o) {
    o = o || {}; const doc = el.ownerDocument; css(doc);
    const L = d.limit || limits(null), list = (d.customers || []).slice(0, L.customers || 0);
    if (!list.length) { el.innerHTML = '<p class="note" style="margin:0">아직 등록한 손님이 없어요. 아래 손님 목록에서 손님을 넣고 저장하면 내일 아침부터 카드가 만들어져요.</p>'; return; }
    const cx = await loadCx(sggs(list)), today = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
    const models = list.map(c => card(c, cx, d.profile, today));
    el.innerHTML = list.map((c, i) => `<div class="ccw${o.focus === c.id ? ' focus' : ''}" id="c-${esc(c.id)}">${cardHtml(models[i], { label: c.label, id: c.id })}
      <div class="cc-act"><button type="button" class="btn primary" data-send="${i}">손님에게 보내기</button><button type="button" class="btn" data-copy="${i}">링크 복사</button></div></div>`).join('');
    const S = root.JDJ_SHARE;
    el.querySelectorAll('[data-send]').forEach(b => b.onclick = () => {
      const i = +b.dataset.send, m = models[i], who = m.profile.office;
      const opt = { title: `${who} · 오늘 아침 단지 소식`, text: `${who}에서 보내 드리는 오늘 아침 관심 단지 소식이에요.`, url: list[i].link, blob: () => cardBlob(m), file: `${SITE}_손님카드.png`, tool: 'brief_card', place: o.place || 'manage' };
      if (S && S.sendLink) S.sendLink(opt);
      else if (root.navigator.share) root.navigator.share({ title: opt.title, text: opt.text, url: opt.url }).catch(() => {});
    });
    el.querySelectorAll('[data-copy]').forEach(b => b.onclick = () => {
      const t = list[+b.dataset.copy].link, lab = b.textContent;
      (root.navigator.clipboard ? root.navigator.clipboard.writeText(t) : Promise.reject()).then(() => { b.textContent = '복사했어요'; setTimeout(() => { b.textContent = lab; }, 2000); })
        .catch(() => { root.prompt('아래 링크를 길게 눌러 복사해 주세요', t); });
    });
    if (o.focus) { const f = doc.getElementById('c-' + o.focus); if (f && f.scrollIntoView) setTimeout(() => f.scrollIntoView({ block: 'center' }), 50); }
  }
  /** 모닝 브리핑 화면(중개사용 보기): 로그인한 중개사 플러스 회원이면 '내 손님 카드' 칸을 채움. 아니면 칸을 숨긴 채로 둠 */
  async function mountMine(sec) {
    if (!sec || !sess()) return;
    let d; try { d = await post('bpMine', { s: sess() }); } catch (e) { return; }
    if (!d.limit || !d.limit.customers || !(d.customers || []).length) return;
    sec.hidden = false;
    sec.innerHTML = `<h2 id="h-mc">내 손님 카드 <small>${d.customers.length}명</small></h2><p class="sub">손님마다 고른 단지의 오늘 아침 소식이에요. [손님에게 보내기]를 누르면 링크가 먼저 가고, 카드 사진은 원할 때만 함께 보내요. 손님 목록은 <a href="manage/#cards">내 구독 관리</a>에서 바꿔요.</p><div class="mc-list"></div>`;
    await mountCards(sec.querySelector('.mc-list'), d, { place: 'brief' });
  }

  const API = { SITE, APTS, LABEL_MAX, PURPOSE, PURPOSE_TITLE, limits, limitOf, cleanLabel, cleanCustomer, cleanList, sggs, parseHash, since, rows, card, brand, brandError,
    cardHtml, CSS, drawCard, cardBlob, esc, sess, post, loadCx, mountCards, mountMine };
  root.JDJ_CBRIEF = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
