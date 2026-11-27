/* 청약 공고 한 곳의 무료 진단 + 유료 3가지 계산 — 분양가·입지 분석 화면(chungyak/price/)과 유료 리포트(premium/view/)가 같이 씀.
   무료·유료 나누기: 대표 승인 2026-11-27(엔진 docs/pricing_policy.md '청약').
   무료: 일정·D-day·달력(assets/cy-list.js) · 평형별 분양가 vs 주변 신축 · 내 가점으로 본 주택형별 당첨 가능성(+ 비슷한 단지 과거 결과)
         · 특별공급 8유형·제출 전 3대 실수(chungyak/cy-engine.js 그대로) · 입지 요약(역·중학교·공식 개발 정보) · 전매제한·실거주의무·재당첨 제한
   유료(청약 분양가 리포트, assets/pay.js PRODUCTS.cy): ① 당첨되면 내 돈 계획표 ② 내 가점으로 어디에 넣을까(전략표) ③ 입주할 때 얼마쯤일까
   원칙
     - 숫자는 공개 자료(분양가·실거래·청약홈 당첨 결과·공공 위치)를 고르기·더하기·나누기로만. 예상 커트라인은 엔진이 미리 계산한 notices.json cut 을
       chungyak/ 화면·고민 찾기(assets/guide-core.js cyPlan)와 같은 함수(cutOf·diag·lottery)로 읽어요 — 세 화면 판정이 늘 같아요.
     - 입주 때 가격: 아파트 예측 모델을 다시 만드는 중이라 검증을 통과한 기간이 없으면(REBUILD_PASS 가 비어 있으면) 가격 범위를 내지 않고,
       과거 실거래로 효과가 확인된 요인과 그 과거 효과만 보여 줘요. 숫자를 지어내지 않아요.
     - 내 돈 계획표에 넣는 보증금·집 판 돈·가진 돈은 이 기기 안에서만 계산해요(서버로 보내지 않음, 공유 주소에도 넣지 않음).
   브라우저 window.JDJ_CYPLAN, node require 둘 다(시험: node tools/cy-plan-test.js </dev/null). */
(function (root) {
  'use strict';
  const JB = (typeof window !== 'undefined' && window.JDJ_BASE) || (function (p) { const g = p.indexOf('/jangdaejang-calc/') === 0, b = { SITE: g ? '/jangdaejang-calc/' : '/', DATA: g ? '/jangdaejang-data/' : 'https://chrisjangdaejang-ux.github.io/jangdaejang-data/' }; if (typeof window !== 'undefined') window.JDJ_BASE = b; return b; })((typeof location !== 'undefined' && location.pathname) || '/jangdaejang-calc/');
  const CYE = () => root.JDJ_CYE, LOAN = () => root.JDJ_LOAN, CYP = () => root.JDJ_CYP, SALE = () => root.JDJ_SALE, CYL = () => root.JDJ_CYL;
  const PY = 3.3058, WALK = 67;   // 3.3㎡ · 분당 걷는 거리(직선 거리 기준 어림, assets/life-view.js 와 같은 값)
  const BAND = ['60㎡ 이하', '60~85㎡', '85㎡ 초과'];
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = n => Number(n).toLocaleString('ko-KR');
  function won(m) {               // 만원 → '8억 4,500만 원'
    if (m == null || isNaN(m)) return '–';
    m = Math.round(m); const neg = m < 0; m = Math.abs(m);
    const e = Math.floor(m / 10000), r = m % 10000;
    return (neg ? '-' : '') + (e ? e + '억' + (r ? ' ' + fmt(r) + '만' : '') + ' 원' : fmt(r) + '만 원');
  }
  const d8 = s => String(s || '').replace(/\D/g, '').slice(0, 8);
  const dot = s => { s = d8(s); return s.length === 8 ? `${s.slice(0, 4)}.${+s.slice(4, 6)}.${+s.slice(6, 8)}` : ''; };
  const ymK = s => { s = String(s || ''); return s.length >= 6 ? `${s.slice(0, 4)}년 ${+s.slice(4, 6)}월` : ''; };
  const ymDot = s => { s = String(s || ''); return s.length >= 6 ? `${s.slice(0, 4)}.${s.slice(4, 6)}` : ''; };
  const toDate = s => { s = d8(s); return new Date(Date.UTC(+s.slice(0, 4), +s.slice(4, 6) - 1, +s.slice(6, 8))); };
  const ymdOf = d => `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`;
  const days = (a, b) => Math.round((toDate(b) - toDate(a)) / 86400000);
  const addMonths = (s, n) => { const d = toDate(s); const day = d.getUTCDate(); d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() + n); const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate(); d.setUTCDate(Math.min(day, last)); return ymdOf(d); };
  const isoOf = s => { s = d8(s); return s.length === 8 ? `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}` : ''; };
  function distM(a, b) {          // [경도, 위도] 두 점 직선 거리(m)
    const R = 6371000, r = x => x * Math.PI / 180, dLa = r(b[1] - a[1]), dLo = r(b[0] - a[0]);
    const h = Math.sin(dLa / 2) ** 2 + Math.cos(r(a[1])) * Math.cos(r(b[1])) * Math.sin(dLo / 2) ** 2;
    return Math.round(2 * R * Math.asin(Math.sqrt(h)));
  }
  const mTxt = m => m >= 1000 ? `${(m / 1000).toFixed(1)}km` : `${Math.round(m / 10) * 10}m`;
  const bandOf = ar => ar <= 60 ? 0 : ar <= 85 ? 1 : 2;
  const tyName = t => String(t || '').replace(/^0+/, '').replace(/\.\d+/, m => '');   // '084.9409A' → '84A'
  const flagsOf = n => (n && n.f) || [];

  /* ================= 무료 ① 평형별 분양가 vs 주변 신축 ================= */
  /* D: chungyak/price/{no}.json. 주택형마다 최고 분양가의 3.3㎡당 값을 같은 면적대 주변 신축·준신축 거래 중간값(엔진 cy_price 가 고른 가장 좁은 범위)과 견줘요 */
  function typeCompare(D) {
    const bands = {}; (D.bands || []).forEach(b => { bands[b.b] = b; });
    const cx = D.complexes || [];
    return (D.types || []).slice().sort((a, b) => a.area - b.area || a.price - b.price).map(t => {
      const b = bandOf(t.area), B = bands[b], ppy = Math.round(t.price / (t.area / PY));
      const o = { ty: t.ty, name: tyName(t.ty), area: t.area, hh: t.hh, price: t.price, band: b, ppy };
      if (!B) return Object.assign(o, { lack: true });
      if (B.lease) return Object.assign(o, { lease: true });
      const med = B.q && B.q[1];
      if (B.lack || !med) return Object.assign(o, { lack: true, scope: B.scope });
      o.med = med; o.q = B.q; o.scope = B.scope; o.n = B.n; o.apts = B.apts; o.span = B.span;
      o.pct = Math.round((ppy / med - 1) * 100);
      o.nearWon = Math.round(med * t.area / PY);            // 같은 면적을 주변 중간값으로 바꾼 금액(만원)
      o.cx = cx.filter(c => c.band === b).sort((x, y) => (x.d == null ? 99 : x.d) - (y.d == null ? 99 : y.d)).slice(0, 3);
      return o;
    });
  }
  const pctWord = p => p < 0 ? `${-p}% 낮아요` : p > 0 ? `${p}% 높아요` : '거의 같아요';
  function typeCompareHTML(D) {
    const rows = typeCompare(D);
    if (!rows.length) return '<p class="cyq-na">주택형 분양가 자료가 없어 비교하지 못했어요.</p>';
    const lease = rows.some(r => r.lease);
    const body = rows.map(r => {
      let v, s = '';
      if (r.lease) v = '<span class="cyq-chip n">비교 안 함</span>';
      else if (r.lack) v = '<span class="cyq-chip n">비교 자료 부족</span>';
      else { v = `<span class="cyq-chip ${r.pct < 0 ? 'lo' : r.pct > 0 ? 'hi' : 'n'}">${esc(pctWord(r.pct))}</span>`; s = `주변 중간값으로 같은 면적이면 약 ${won(r.nearWon)}`; }
      return `<tr><td><b>${esc(r.name)}</b><small>전용 ${r.area}㎡</small><small>${fmt(r.hh)}세대</small></td><td class="num">${won(r.price)}<small>3.3㎡당 ${fmt(r.ppy)}만</small></td>`
        + `<td>${v}${r.med ? `<small>주변 중간값 3.3㎡당 ${fmt(r.med)}만(${esc(r.scope || '')}${r.n ? ' ' + fmt(r.n) + '건' : ''})</small>` : ''}${s ? `<small>${esc(s)}</small>` : ''}</td></tr>`;
    }).join('');
    /* 비교에 쓴 단지(면적대마다 가까운 3곳)와 기준일 */
    const seen = {}, cites = [];
    rows.forEach(r => { if (!(r.cx && r.cx.length) || seen[r.band]) return; seen[r.band] = 1; cites.push(`<li><b>${BAND[r.band]}</b> · ${r.cx.map(c => `${esc(c.name)}(${c.by}년 준공${c.d != null && c.d < 99 ? ', ' + c.d.toFixed(1) + 'km' : ''}, 3.3㎡당 ${fmt(c.med)}만 원, ${c.n}건)`).join(' · ')}${r.span ? ` — 비교 거래 계약일 ${dot(r.span[0])}~${dot(r.span[1])}` : ''}</li>`); });
    return `<div class="cyq-tw"><table class="cyq-tb"><thead><tr><th>주택형</th><th class="num">최고 분양가</th><th>주변 신축보다</th></tr></thead><tbody>${body}</tbody></table></div>`
      + (cites.length ? `<p class="cyq-s"><b>비교한 주변 단지</b>(준공 10년 이내, 가까운 순)</p><ul class="cyq-ul">${cites.join('')}</ul>` : '')
      + `<p class="cyq-s">기준: 국토교통부 아파트 매매 실거래 ${esc(ymK(D.dataTo))}까지 신고분, 자료 받은 날 ${esc(D.updated || '')}. 분양가는 주택형별 최고가(발코니 확장·옵션 제외)이고, 주변 값은 그것이 들어간 실제 거래라 같은 조건이 아니에요. 지금 거래 기준이고 입주 때 가격이 아니에요.</p>`
      + (lease ? '<p class="cyq-s">토지임대부는 분양가에 땅값이 빠져 있어 주변 아파트 거래와 견주지 않았어요.</p>' : '');
  }

  /* ================= 무료 ② 내 가점으로 본 주택형별 당첨 가능성 ================= */
  /* N: data/chungyak/notices.json 의 공고 행(ty: [주택형, 전용, 일반 세대, 특별 세대, 최고 분양가], cut, f). 판정은 cy-engine cutOf·diag 그대로 */
  const DG = { hi: ['g', '가능성 높음'], mid: ['y', '경합'], lo: ['r', '낮음'] };
  function typeOdds(N, my) {
    const E = CYE(); if (!E || !N) return null;
    const sd = E.noticeSido(N), pub = N.k !== '민영';
    const rows = (N.ty || []).filter(t => t[1]).map(t => {
      const band = E.bandOf(+t[1]), lt = E.lottery(N.f, band, sd), p = pub || lt.noGajum ? null : E.cutOf(N, band);
      return { ty: t[0], name: tyName(t[0]), area: +t[1], gen: +t[2] || 0, sp: +t[3] || 0, price: +t[4] || 0, band, lt, p, d: my != null && p && p.ok ? E.diag(my, p) : null };
    });
    return { pub, sd, rows };
  }
  function methodTxt(p) {
    if (!p) return '';
    if (p.ok) return `${p.scope} · 같은 면적대 · 해당지역 1순위 과거 ${fmt(p.nCx)}개 단지 ${fmt(p.nRows)}개 주택형(${ymDot(p.from)}~${ymDot(p.to)} 공고)의 최저 당첨 가점으로 만든 범위예요. 공고 위치와 가까운 곳·최근 공고를 더 무겁게 봤어요.`;
    if (p.none) return '이 시·도는 공식 당첨 가점 자료가 아직 없어요.';
    return `비교할 최근 과거 결과가 적어(같은 시·도·같은 면적대 ${fmt(p.nCx)}개 단지 ${fmt(p.nRows)}개 주택형) 숫자로 예측하지 않았어요.`;
  }
  /* 비슷한 단지 과거 결과: 청약홈 당첨 가점 행 [시군구, 단지, 공고년월, 전용, 면적대, 거주구분, 최저, 평균, 최고, 1순위 경쟁률, 주택관리번호] — 같은 면적대·해당지역, 최근 2년, 같은 구 먼저 */
  function similar(rows, N, band, today, max) {
    if (!rows || !rows.length) return [];
    const from = addMonths(d8(today) || '20260101', -24).slice(0, 6), gu = String(N.g || '').replace(/\s/g, '');
    const seen = {};
    return rows.filter(r => r[5] === 'h' && +r[4] === band && String(r[2]) >= from && r[10] !== N.no && +r[6] > 0)
      .sort((x, y) => ((String(y[0]).replace(/\s/g, '') === gu) - (String(x[0]).replace(/\s/g, '') === gu)) || String(y[2]).localeCompare(String(x[2])) || (+y[3]) - (+x[3]))
      .filter(r => { const k = r[1] + '|' + Math.round(+r[3]); if (seen[k]) return false; seen[k] = 1; return true; })
      .slice(0, max || 5)
      .map(r => ({ gu: r[0], name: r[1], ym: String(r[2]), area: Math.round(+r[3]), lo: +r[6], avg: Math.round(+r[7] * 10) / 10, rate: r[9] == null || r[9] === '' ? null : +r[9] }));
  }
  function typeOddsHTML(N, my, scoreRows, today) {
    const T = typeOdds(N, my);
    if (!T) return '<p class="cyq-na">공고 자료를 불러오지 못했어요.</p>';
    if (T.pub) return '<p class="cyq-s">국민주택(공공분양)은 일반공급을 청약 가점이 아니라 청약통장 납입 횟수·금액 순으로 뽑아 가점 커트라인을 내지 않아요. 특별공급 진단과 납입 인정 금액을 확인하세요.</p>';
    const byBand = {};
    T.rows.forEach(r => { (byBand[r.band] = byBand[r.band] || []).push(r); });
    let h = '';
    Object.keys(byBand).sort().forEach(k => {
      const rs = byBand[k], r0 = rs[0], p = r0.p, lt = r0.lt;
      h += `<div class="cyq-band"><div class="cyq-bh"><b>${BAND[+k]}</b><span>${esc(lt.txt)}</span>${r0.d ? `<span class="cyq-chip ${DG[r0.d.g][0]}">${DG[r0.d.g][1]}</span>` : ''}</div>`;
      if (lt.noGajum) h += '<p class="cyq-v">추첨제 100%라 가점 커트라인이 없어요. 가점과 관계없이 추첨으로 뽑아요.</p>';
      else if (p && p.ok) {
        h += `<p class="cyq-v">예상 최저 당첨 가점 <b>${p.lo === p.hi ? p.lo : p.lo + '~' + p.hi}점</b> · 평균 약 ${p.avg}점</p>`;
        if (my != null) { const d = r0.d; h += `<p class="cyq-my">${d.g === 'hi' ? `내 가점 ${my}점은 범위 상단(${p.hi}점) 이상이에요.` : d.g === 'mid' ? `내 가점 ${my}점은 범위 안이에요. 상단(${p.hi}점)까지 ${d.need}점 남았어요.` : `내 가점 ${my}점은 범위 하단(${p.lo}점)보다 ${d.need}점 낮아요.`}</p>`; }
      } else if (p) h += '<p class="cyq-v">예상 당첨 가점: <b>자료 부족</b></p>';
      else h += '<p class="cyq-v">예상 커트라인 준비 중</p>';
      h += `<ul class="cyq-tys">${rs.map(r => `<li><span>${esc(r.name)} · 전용 ${r.area}㎡</span><b>일반 ${fmt(r.gen)}세대</b></li>`).join('')}</ul>`;
      if (p) h += `<p class="cyq-s"><b>만든 방법</b> · ${esc(methodTxt(p))}</p>`;
      if (lt.note && lt.note.length) h += `<p class="cyq-s">${esc(lt.note.join(' · '))}</p>`;
      const sim = similar(scoreRows, N, +k, today, 4);
      if (sim.length) h += `<p class="cyq-s"><b>비슷한 단지 과거 결과</b>(같은 면적대·해당지역 1순위, 최근 2년)</p><div class="cyq-tw"><table class="cyq-tb sm"><thead><tr><th>단지</th><th class="num">1순위 경쟁률</th><th class="num">최저/평균</th></tr></thead><tbody>${sim.map(s => `<tr><td>${esc(s.name)}<small>${esc(s.gu)} · ${ymDot(s.ym)} · ${s.area}㎡</small></td><td class="num">${s.rate == null ? '–' : fmt(s.rate) + ' : 1'}</td><td class="num">${s.lo} / ${s.avg}</td></tr>`).join('')}</tbody></table></div>`;
      h += '</div>';
    });
    return h + '<p class="cyq-s">예상 커트라인은 과거 당첨 결과로 만든 참고 범위예요. 실제 당첨을 약속하지 않아요. 같은 범위가 청약 가점 화면·고민 찾기에도 똑같이 쓰여요.</p>';
  }

  /* ================= 무료 ③ 입지 요약 — 공공 위치 자료만 ================= */
  /* xy: 공고 위치 [경도, 위도](data/bunyang/notices.json), poi: data/poi/sNN.json {st:[[이름, 경도, 위도]], sc:[...]}, dm: data/devmap.json */
  function locSummary(xy, poi, dm) {
    const o = { xy: !!xy, st: [], sc: [], dev: [], poi: !!poi, stAt: poi && poi.at ? poi.at.st : '', scAt: poi && poi.at ? poi.at.sc : '' };
    if (!xy) return o;
    if (poi) {
      o.st = (poi.st || []).map(s => ({ n: s[0], m: distM(xy, [s[1], s[2]]) })).filter(s => s.m <= 1500).sort((a, b) => a.m - b.m).slice(0, 3).map(s => Object.assign(s, { walk: Math.max(1, Math.round(s.m / WALK)) }));
      o.sc = (poi.sc || []).map(s => ({ n: s[0], m: distM(xy, [s[1], s[2]]) })).filter(s => s.m <= 1000).sort((a, b) => a.m - b.m).slice(0, 3);
    }
    if (dm && dm.items) {
      dm.items.forEach(it => {
        let m = null;
        if (it.at) m = distM(xy, it.at);
        else if (it.path) m = Math.min.apply(null, it.path.map(p => distM(xy, p)));
        const lim = it.type === 'line' ? 1500 : 2000;
        if (m != null && m <= lim) o.dev.push({ id: it.id, type: it.type, name: it.short || it.name, kind: it.kind || (it.type === 'line' ? '철도' : ''), stage: it.stage, at: it.stage_at, m, src: it.stage_src || it.notice || null, due: (it.due || [])[0] || null });
      });
      o.dev.sort((a, b) => a.m - b.m); o.dev = o.dev.slice(0, 6); o.devAt = dm.checked || dm.asof || '';
    }
    return o;
  }
  function locHTML(L, D) {
    if (!L.xy) return '<p class="cyq-na">공고 위치 좌표가 아직 없어 입지 요약을 만들지 못했어요.</p>';
    const cap = ['서울특별시', '인천광역시', '경기도'].indexOf(D && D.sd) >= 0;
    const st = L.st.length ? L.st.map(s => `<li><b>${esc(s.n)}역</b> ${mTxt(s.m)} · 걸어서 약 ${s.walk}분</li>`).join('')
      : `<li>${L.poi && cap ? '1.5km 안에 지하철역이 없어요' : '수도권 밖은 역 위치 자료가 아직 없어요'}</li>`;
    const sc = L.sc.length ? L.sc.map(s => `<li><b>${esc(s.n)}</b> ${mTxt(s.m)}</li>`).join('') : `<li>${L.poi ? '1km 안에 중학교가 없어요' : '학교 위치 자료가 아직 없어요'}</li>`;
    const dev = L.dev.length ? L.dev.map(d => `<li><b>${esc(d.name)}</b> <span class="cyq-chip n">${esc(d.stage || '')}</span> ${mTxt(d.m)}${d.type === 'line' ? '(노선이 지나는 기존 역 기준)' : ''}`
      + `${d.due ? `<small>${esc(d.due.say || '')}${d.due.src && d.due.src.org ? ' — ' + esc(d.due.src.org) : ''}</small>` : ''}`
      + `${d.src && d.src.url ? `<small>출처: <a href="${esc(d.src.url)}" target="_blank" rel="noopener">${esc(d.src.org || '')} ${esc(d.src.title || '')} ↗</a></small>` : ''}</li>`).join('')
      : '<li>2km 안에 공식 자료로 확인한 개발사업이 없어요(정비구역·철도 등)</li>';
    return `<div class="cyq-g3"><div class="cyq-lc"><h3>지하철역</h3><ul>${st}</ul></div><div class="cyq-lc"><h3>중학교</h3><ul>${sc}</ul><small>초등학교 배정은 교육청 통학구역으로 정해져요. 관할 교육지원청 학구도 안내에서 확인해 주세요.</small></div><div class="cyq-lc"><h3>주변 개발 정보</h3><ul>${dev}</ul></div></div>`
      + `<p class="cyq-s">거리는 공고 주소 위치에서 잰 직선 거리이고, 걷는 시간은 분당 67m로 어림한 값이에요(실제 길은 더 길어요). 자료: 서울시 역사마스터 정보(수도권 전철역${L.stAt ? ', ' + esc(L.stAt) + ' 받음' : ''}) · 학교알리미 학교 위치(중학교${L.scAt ? ', ' + esc(L.scAt) + ' 받음' : ''}) · 개발 정보는 서울시·국토교통부 등 공식 발표(${esc(L.devAt || '')} 확인). 예정 시기는 사업 진행에 따라 바뀔 수 있어요.</p>`;
  }

  /* ================= 무료 ④ 전매제한·실거주의무·재당첨 제한 ================= */
  /* 주택법 시행령 제73조 별표 3(2023. 4. 7. 개정)·주택법 제57조의2(2024. 3. 19. 개정: 최초 입주가능일부터 3년 안에 거주 시작)·주택공급에 관한 규칙 제54조.
     공고의 규제 표시(f)와 위치로 일반 기준만 안내하고, 단지별 확정 기간은 입주자모집공고문이 기준이에요. */
  const OVER = ['의정부시', '구리시', '하남시', '고양시', '수원시', '성남시', '안양시', '부천시', '광명시', '과천시', '의왕시', '군포시', '시흥시'];   // 경기 과밀억제권역(수도권정비계획법 시행령 별표 1) — 남양주 일부·시흥 반월특수지역 제외 등은 공고문 확인
  const LAW = {
    resale: 'https://www.law.go.kr/법령/주택법시행령',
    live: 'https://www.law.go.kr/법령/주택법',
    rewin: 'https://www.law.go.kr/법령/주택공급에관한규칙'
  };
  function rules(N) {
    const E = CYE(), f = flagsOf(N), sd = E ? E.noticeSido(N) : (N.sd || ''), cap = ['서울특별시', '인천광역시', '경기도'].indexOf(sd) >= 0;
    const tg = f.indexOf('투기과열지구') >= 0, ov = f.indexOf('조정대상지역') >= 0 || f.indexOf('청약과열지역') >= 0, reg = tg || ov;
    const sh = f.indexOf('분양가상한제') >= 0, pubLand = f.some(x => /공공주택지구|대규모택지개발지구|공공택지|택지개발/.test(x)), lease = /토지임대부/.test(N.n || '') || f.indexOf('토지임대부') >= 0;
    const city = String(N.g || '').split(' ')[0];
    const over = sd === '서울특별시' || (sd === '경기도' && OVER.indexOf(city) >= 0) || sd === '인천광역시';
    let resale, why;
    if (cap) {
      if (reg || (pubLand && sh)) { resale = '3년'; why = reg ? '수도권 규제지역(투기과열지구·조정대상지역)' : '수도권 공공택지 분양가상한제 주택'; }
      else if (over) { resale = '1년'; why = '수도권 과밀억제권역' + (sd === '인천광역시' ? '(인천 강화·옹진 등 일부는 6개월)' : ''); }
      else { resale = '6개월'; why = '수도권 그 밖의 지역'; }
    } else {
      if (reg || (pubLand && sh)) { resale = '1년'; why = reg ? '비수도권 규제지역' : '비수도권 공공택지 분양가상한제 주택'; }
      else if (/광역시$/.test(sd)) { resale = '6개월'; why = '비수도권 광역시 도시지역'; }
      else { resale = '없음'; why = '비수도권 그 밖의 지역'; }
    }
    let live;
    if (cap && sh) live = { has: true, txt: pubLand ? '있어요 — 수도권 공공택지 분양가상한제 주택은 분양가가 주변 시세의 80% 미만이면 5년, 80~100%면 3년 동안 직접 살아야 해요.' : '있어요 — 수도권 민간택지 분양가상한제 주택은 분양가가 주변 시세의 80% 미만이면 3년, 80~100%면 2년 동안 직접 살아야 해요.' };
    else if (lease && cap) live = { has: true, txt: '토지임대부 분양주택은 보통 거주의무가 있어요. 기간은 입주자모집공고문을 확인하세요.' };
    else live = { has: false, txt: cap ? '분양가상한제 표시가 없어 보통 실거주의무가 없어요.' : '수도권 밖이라 보통 실거주의무가 없어요(행정중심복합도시 등 예외는 공고문 확인).' };
    if (live.has) live.txt += ' 2024년 3월 개정으로 최초 입주가 가능한 날부터 3년 안에 들어가 살기 시작하면 돼요(그 전에 한 번 세를 놓을 수 있어요).';
    let rewin;
    if (tg || sh) rewin = { y: 10, txt: `${tg ? '투기과열지구' : '분양가상한제'} 단지라 당첨되면 세대원 모두 10년 동안 재당첨 제한을 받아요.` };
    else if (ov) rewin = { y: 7, txt: '조정대상지역 단지라 당첨되면 세대원 모두 7년 동안 재당첨 제한을 받아요.' };
    else if (lease) rewin = { y: 5, txt: '토지임대부 분양주택이라 당첨되면 5년 동안 재당첨 제한을 받아요.' };
    else rewin = { y: 0, txt: '규제 표시가 없는 민영주택이라 보통 재당첨 제한 대상이 아니에요. 다만 당첨되면 다른 단지 청약 때 1순위 조건(최근 당첨 이력)이 달라질 수 있어요.' };
    rewin.txt += ' 재당첨 제한 기간에는 규제지역·분양가상한제 단지 등에 청약할 수 없어요.';
    return { resale, resaleWhy: why, live, rewin, sd, cap, reg, sh, pubLand, flags: f };
  }
  function rulesHTML(N) {
    const R = rules(N);
    return `<ul class="cyq-rules"><li><b>전매제한</b><span class="cyq-chip ${R.resale === '없음' || R.resale === '6개월' ? 'g' : 'y'}">${esc(R.resale)}</span><div>${esc(R.resaleWhy)} 기준이에요. 기간은 당첨자 발표일부터 세고, 그동안 분양권을 팔 수 없어요. <a href="${LAW.resale}" target="_blank" rel="noopener">주택법 시행령 별표 3 ↗</a></div></li>`
      + `<li><b>실거주의무</b><span class="cyq-chip ${R.live.has ? 'y' : 'g'}">${R.live.has ? '있음' : '보통 없음'}</span><div>${esc(R.live.txt)} <a href="${LAW.live}" target="_blank" rel="noopener">주택법 제57조의2 ↗</a></div></li>`
      + `<li><b>재당첨 제한</b><span class="cyq-chip ${R.rewin.y ? 'y' : 'g'}">${R.rewin.y ? R.rewin.y + '년' : '보통 없음'}</span><div>${esc(R.rewin.txt)} <a href="${LAW.rewin}" target="_blank" rel="noopener">주택공급에 관한 규칙 제54조 ↗</a></div></li></ul>`
      + `<p class="cyq-s">공고 규제 표시: ${esc(R.flags.length ? R.flags.join(' · ') : '없음')}. 위 기간은 공고 위치·규제 표시로 본 일반 기준이에요. 단지별 확정 기간은 입주자모집공고문의 ‘전매 제한’·‘거주의무’ 항목이 기준이에요.</p>`;
  }

  /* ================= 무료 ⑤ 한눈에 보는 청약 점검(assets/diag.js 진단 리포트 틀) ================= */
  /* prof: { A(가점 답, 없으면 null), my(가점), e(특공 답, 'jdj_cy_e'), m(3대 실수 답, 'jdj_cy_m') } — 모두 이 기기 저장값 */
  function eFor(N, e0, A) {
    const E = CYE(), f = flagsOf(N), area = Math.max.apply(null, (N.ty || []).map(t => +t[1] || 0).concat([0]));
    return Object.assign({ dep: '', cnt: '', head: 'u', win: 'u', house: A && A.own ? '1' : '0', ever: 'u', kids: '0', baby: 'n', tax: 'u', old: 'n', inst: 'n', reloc: 'n' }, e0 || {},
      { sido: E.noticeSido(N), reg: f.indexOf('투기과열지구') >= 0 || f.indexOf('조정대상지역') >= 0 ? 'y' : 'n', kind: N.k === '민영' ? 'p' : 'g', size: area <= 85 ? 0 : area <= 102 ? 1 : area <= 135 ? 2 : 3, pb: N.pb });
  }
  function eligFor(N, prof) {
    const E = CYE(); if (!E || !prof || !prof.A || !prof.A.birth) return null;
    const e = eFor(N, prof.e, prof.A), ref = E.CY.d8(isoOf(N.pb)) || new Date();
    const A = Object.assign({}, prof.A); if (A.quick != null && !A.birth) return null;
    return { e, rows: E.eligibility(A, e, ref) };
  }
  function mistakesFor(N, prof) {
    const E = CYE(); if (!E || !prof || !prof.A) return null;
    const m = Object.assign({}, prof.m || {}, { nSido: E.noticeSido(N), nSgg: N.g || '' });
    return E.mistakes(prof.A, m, E.CY.d8(isoOf(N.pb)) || new Date());
  }
  function diagReport(N, D, prof) {
    const E = CYE(), my = prof && prof.my != null ? prof.my : null, items = [];
    const odds = typeOdds(N, my);
    /* ① 당첨 가능성 */
    if (odds && odds.pub) items.push({ id: 'odds', t: '당첨 가능성(가점)', lv: 'n', v: '국민주택 · 순차제', s: '일반공급은 청약통장 납입 횟수·금액 순이라 가점으로 보지 않아요', why: ['국민주택(공공분양) 일반공급은 납입 인정 금액·횟수 등으로 순서를 정해요.'] });
    else if (my == null) items.push({ id: 'odds', t: '당첨 가능성(가점)', lv: 'n', v: '가점 계산 전', s: '내 가점을 넣으면 주택형별로 바로 비교해 드려요' });
    else {
      const ds = odds.rows.filter(r => r.d), ord = { hi: 0, mid: 1, lo: 2 };
      if (!ds.length) items.push({ id: 'odds', t: '당첨 가능성(가점)', lv: 'n', v: '예상 범위 없음', s: odds.rows.some(r => r.lt.noGajum) ? '추첨제 물량이거나 과거 자료가 부족해요' : '과거 비교 자료가 부족해요' });
      else {
        const best = ds.slice().sort((a, b) => ord[a.d.g] - ord[b.d.g])[0];
        items.push({ id: 'odds', t: '당첨 가능성(가점)', lv: best.d.g === 'hi' ? 'g' : 'y', v: `${BAND[best.band]} ${DG[best.d.g][1]}`, s: `내 가점 ${my}점 · 예상 최저 당첨 가점 ${best.p.lo === best.p.hi ? best.p.lo : best.p.lo + '~' + best.p.hi}점`,
          why: [methodTxt(best.p), '같은 범위를 청약 가점 화면과 고민 찾기에서도 똑같이 써요.'], src: [{ n: '청약홈 당첨 가점(공공데이터포털)' }] });
      }
    }
    /* ② 1순위 · ③ 특별공급 */
    const el = eligFor(N, prof);
    if (!el) {
      items.push({ id: 'rank1', t: '1순위', lv: 'n', v: '답 입력 전', s: '청약 가점 화면에서 질문에 답하면 이 공고 기준으로 봐 드려요' });
      items.push({ id: 'special', t: '특별공급 8가지', lv: 'n', v: '답 입력 전', s: '세부 진단에 답하면 이 공고 기준으로 봐 드려요' });
    } else {
      const r1 = el.rows.filter(r => r.id === 'rank1'), worst = r1.some(r => r.g === 'no') ? 'no' : r1.some(r => r.g === 'chk2') ? 'chk2' : 'ok';
      items.push({ id: 'rank1', t: '1순위', lv: worst === 'ok' ? 'g' : worst === 'no' ? 'r' : 'n', v: worst === 'ok' ? '조건 충족' : worst === 'no' ? '어려움' : '확인 필요', s: (r1[0] && r1[0].why) || '',
        why: r1.map(r => `${r.t}: ${r.items.join(' · ')}`), src: [{ n: r1[0] ? r1[0].law : '주택공급에 관한 규칙' }] });
      const sp = el.rows.filter(r => r.k === '특별공급'), ok = sp.filter(r => r.g === 'ok'), ck = sp.filter(r => r.g === 'chk2');
      items.push({ id: 'special', t: '특별공급 8가지', lv: ok.length ? 'g' : ck.length ? 'n' : 'y', v: `가능성 있음 ${ok.length} · 확인 필요 ${ck.length}`, s: ok.length ? ok.map(r => r.t).join(' · ') : ck.length ? ck.map(r => r.t).slice(0, 3).join(' · ') : '이번 공고에서는 특별공급이 어려워 보여요',
        why: sp.map(r => `${r.t}: ${r.why}`) });
    }
    /* ④ 3대 실수 */
    const mk = prof && prof.A && prof.A.birth ? mistakesFor(N, prof) : null;
    if (!mk) items.push({ id: 'mk', t: '제출 전 3대 실수', lv: 'n', v: '점검 전', s: '무주택기간·세대원 주택·거주지역을 신청 전에 함께 봐요' });
    else items.push({ id: 'mk', t: '제출 전 3대 실수', lv: mk.cnt.risk ? 'r' : mk.cnt.warn ? 'y' : 'g', v: mk.cnt.risk ? `위험 ${mk.cnt.risk}` : mk.cnt.warn ? `주의 ${mk.cnt.warn}` : '세 가지 좋음', s: (mk.rows.filter(r => r.g !== 'ok')[0] || mk.rows[0]).head,
      why: mk.rows.map(r => `${r.t}: ${r.head}`), src: [{ n: mk.src.t }] });
    /* ⑤ 전매·실거주 */
    const R = rules(N);
    items.push({ id: 'rule', t: '전매제한·실거주의무', lv: R.live.has || (R.resale !== '없음' && R.resale !== '6개월') ? 'y' : 'g', v: `전매 ${R.resale} · 실거주 ${R.live.has ? '있음' : '보통 없음'}`, s: `${R.resaleWhy} · 재당첨 제한 ${R.rewin.y ? R.rewin.y + '년' : '보통 없음'}`,
      why: [`전매제한 ${R.resale}: ${R.resaleWhy} 기준(주택법 시행령 별표 3)`, R.live.txt, R.rewin.txt], src: [{ n: '국가법령정보센터', u: LAW.resale }] });
    const cnt = { r: 0, y: 0 }; items.forEach(i => { if (cnt[i.lv] != null) cnt[i.lv]++; });
    const lv = cnt.r ? 'r' : cnt.y ? 'y' : items.every(i => i.lv === 'n') ? 'n' : 'g';
    const head = cnt.r ? `신청 전에 꼭 고칠 것이 ${cnt.r}가지 있어요` : cnt.y ? `신청 전에 살펴볼 것이 ${cnt.y}가지 있어요` : lv === 'n' ? '내 조건을 넣으면 이 공고 기준으로 점검해 드려요' : '지금 넣은 조건으로는 큰 걸림돌이 없어요';
    return { title: '이 공고 청약 점검', lv, head, sub: `${N.n} · 모집공고 ${dot(N.pb)} 기준`, asof: `청약홈 공고·당첨 결과 기준 · 내 답은 이 기기 안에서만 계산`, items,
      todo: [
        { id: 'notice', t: '입주자모집공고문 원문 읽기', s: '계약금·중도금 비율, 거주기간 요건, 전매·거주의무 기간이 적혀 있어요', href: N.u || 'https://www.applyhome.co.kr/', ext: 1, ln: '청약홈 공고' },
        { id: 'score', t: '내 가점 계산하기', s: '무주택기간·부양가족·통장 가입기간', href: `chungyak/?no=${encodeURIComponent(N.no)}`, ln: '가점 계산' },
        { id: 'elig', t: '특별공급 8가지 자세히 보기', s: '신혼부부·생애최초·다자녀·노부모·신생아·기관추천·청년·이전기관', href: `chungyak/?no=${encodeURIComponent(N.no)}#eligH`, ln: '세부 진단' },
        { id: 'mk', t: '제출 전 3대 실수 점검', s: '부적격 당첨의 가장 흔한 이유 세 가지', href: `chungyak/?no=${encodeURIComponent(N.no)}#mkH`, ln: '점검하기' },
        { id: 'home', t: '청약홈에서 자격 한 번 더 확인', s: '세대구성원·주택소유·청약통장 순위 확인', href: 'https://www.applyhome.co.kr/', ext: 1, ln: '청약홈' }
      ],
      note: '정보 제공용 점검이에요. 청약 자격·일정·분양 조건은 입주자모집공고문과 청약홈이 최종 기준이에요.' };
  }

  /* ================= 유료 ① 당첨되면 내 돈 계획표 ================= */
  /* o = { price 만원, dp 계약금 %, mid 중도금 %, n 중도금 회차, midDates [YYYYMMDD…](회차 수만큼, 비면 고르게), ct 계약일, move 입주(잔금)일,
           midLoan true|false, midInt 'after'(이자후불)|'free'(무이자)|'self'(내가 냄), rate 중도금 대출 연 %, ltv 중도금 대출 한도 비율(0~1),
           loan 잔금 대출 가능액(만원, assets/loan-core.js 로 계산한 값), tax 취득세 등(만원), cash 지금 가진 돈, dep {amt, date} 돌려받을 보증금, sale {amt, date} 집 판 돈 }
     → { rows: [{date, k, t, out, inn, bal, short}], total, firstShort, maxShort, midLoanAmt, interest, ... } (모두 만원) */
  function evenDates(ct, move, n) {
    if (!ct || !move || n < 1) return [];
    const span = days(ct, move), out = [];
    for (let i = 1; i <= n; i++) { const d = toDate(ct); d.setUTCDate(d.getUTCDate() + Math.round(span * i / (n + 1))); out.push(ymdOf(d)); }
    return out;
  }
  function plan(o) {
    const P = +o.price || 0, dpP = Math.max(0, Math.min(100, +o.dp || 0)), midP = Math.max(0, Math.min(100 - dpP, +o.mid || 0)), n = Math.max(1, Math.min(12, Math.round(+o.n || 1)));
    const down = Math.round(P * dpP / 100), midTot = Math.round(P * midP / 100), bal = P - down - midTot;
    const dates = (o.midDates && o.midDates.length === n && o.midDates.every(d => d8(d).length === 8)) ? o.midDates.map(d8) : evenDates(o.ct, o.move, n);
    const each = []; for (let i = 0; i < n; i++) each.push(i < n - 1 ? Math.round(midTot / n) : midTot - Math.round(midTot / n) * (n - 1));
    let cap = o.midLoan ? Math.min(midTot, Math.floor(P * (o.ltv == null ? 1 : +o.ltv))) : 0;
    const rate = (+o.rate || 0) / 100, ev = [];
    const push = (date, k, t, out, inn, sub) => ev.push({ date: d8(date), k, t, out: Math.round(out || 0), inn: Math.round(inn || 0), sub: sub || '' });
    if (+o.cash > 0) push(o.today || o.ct, 'cash', '지금 가진 돈', 0, +o.cash);
    if (o.dep && +o.dep.amt > 0 && d8(o.dep.date)) push(o.dep.date, 'dep', '보증금 돌려받음', 0, +o.dep.amt);
    if (o.sale && +o.sale.amt > 0 && d8(o.sale.date)) push(o.sale.date, 'sale', '집 판 돈 들어옴', 0, +o.sale.amt);
    push(o.ct, 'down', '계약금', down, 0, `분양가의 ${dpP}%`);
    const loans = [];                               // 회차별 대출 [날짜, 금액]
    dates.forEach((d, i) => {
      const L = Math.min(each[i], cap); cap -= L; if (L > 0) loans.push([d, L]);
      push(d, 'mid', `중도금 ${i + 1}회차`, each[i] - L, 0, L >= each[i] ? `${won(each[i])} 모두 중도금 대출` : L > 0 ? `${won(each[i])} 중 ${won(L)}은 중도금 대출` : `${won(each[i])} 모두 내 돈`);
    });
    const midLoanAmt = loans.reduce((s, x) => s + x[1], 0);
    /* 이자: 이자후불제는 잔금 때 한꺼번에, 내가 내는 방식은 다음 납부일까지 쌓인 이자를 그날 함께(매달 내는 이자를 모아 보여 줌), 무이자는 0 */
    let interest = 0;
    if (o.midLoan && o.midInt !== 'free' && rate > 0) {
      if (o.midInt === 'self') {
        const stops = dates.concat([d8(o.move)]);
        for (let j = 1; j < stops.length; j++) {
          const owed = loans.filter(x => x[0] < stops[j]).reduce((s, x) => s + x[1] * Math.max(0, days(x[0] < stops[j - 1] ? stops[j - 1] : x[0], stops[j])), 0) * rate / 365;
          if (owed > 0) { interest += owed; push(stops[j], 'int', '중도금 대출 이자(그동안 낸 이자 합)', owed, 0, `연 ${o.rate}% · ${dot(stops[j - 1])}~${dot(stops[j])}`); }
        }
      } else {
        interest = loans.reduce((s, x) => s + x[1] * Math.max(0, days(x[0], o.move)), 0) * rate / 365;
      }
    }
    interest = Math.round(interest);
    const loan = Math.max(0, Math.min(+o.loan || 0, bal + midLoanAmt));   // 잔금 대출은 잔금 + 갚을 중도금 대출까지만
    const moveOut = bal + midLoanAmt - loan + (o.midInt === 'after' ? interest : 0);
    push(o.move, 'bal', '잔금(입주)', moveOut, 0, `잔금 ${won(bal)}${midLoanAmt ? ` + 중도금 대출 상환 ${won(midLoanAmt)}` : ''} − 잔금 대출 ${won(loan)}${o.midLoan && o.midInt === 'after' && interest ? ` + 이자후불 이자 ${won(interest)}` : ''}`);
    push(o.move, 'tax', '취득세 등', +o.tax || 0, 0, '취득세·지방교육세·농어촌특별세(입주 때 함께)');
    const ord = { cash: 0, dep: 1, sale: 2, down: 3, mid: 4, int: 5, bal: 6, tax: 7 };
    ev.sort((a, b) => a.date.localeCompare(b.date) || ord[a.k] - ord[b.k]);
    let bb = 0, firstShort = null, maxShort = 0;
    ev.forEach(r => { bb += r.inn - r.out; r.bal = bb; r.short = bb < 0 ? -bb : 0; if (r.short && !firstShort) firstShort = { date: r.date, amt: r.short, t: r.t }; if (r.short > maxShort) maxShort = r.short; });
    const total = down + (midTot - midLoanAmt) + moveOut + (+o.tax || 0) + (o.midInt === 'self' ? interest : 0);
    return { rows: ev, P, down, midTot, each, dates, bal, midLoanAmt, loan, interest, moveOut, tax: +o.tax || 0, total, firstShort, maxShort, end: bb };
  }
  function planIcs(R, name, url) {
    const esc2 = s => String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
    const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//jipyebo//cyplan//KO', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:' + esc2('분양 돈 계획 · ' + name)];
    R.rows.filter(r => r.out > 0).forEach((r, i) => {
      const e = toDate(r.date); e.setUTCDate(e.getUTCDate() + 1);
      L.push('BEGIN:VEVENT', `UID:cyplan-${i}-${r.date}@jipyebo`, 'DTSTAMP:' + r.date + 'T000000Z', 'DTSTART;VALUE=DATE:' + r.date, 'DTEND;VALUE=DATE:' + ymdOf(e),
        'SUMMARY:' + esc2(`[분양] ${name} ${r.t} ${won(r.out)}`), 'DESCRIPTION:' + esc2(`${r.sub || ''}${r.short ? `\n이날 ${won(r.short)} 모자라요` : ''}\n날짜·금액은 입주자모집공고문과 계약서가 기준이에요${url ? '\n' + url : ''}`),
        'BEGIN:VALARM', 'TRIGGER:-P7D', 'ACTION:DISPLAY', 'DESCRIPTION:' + esc2(`${name} ${r.t} 일주일 전`), 'END:VALARM', 'END:VEVENT');
    });
    L.push('END:VCALENDAR');
    return L.join('\r\n') + '\r\n';
  }
  function planHTML(R, o) {
    const row = r => `<tr class="${r.short ? 'short' : ''}"><td>${dot(r.date)}</td><td><b>${esc(r.t)}</b>${r.sub ? `<small>${esc(r.sub)}</small>` : ''}</td><td class="num"><b>${r.inn ? '+' + won(r.inn) : r.out ? '−' + won(r.out) : '0원'}</b><small>${r.short ? `<b class="neg">${won(r.short)} 모자람</b>` : '남는 돈 ' + won(r.bal)}</small></td></tr>`;
    const head = R.firstShort ? `<div class="cyq-alert r"><b>${dot(R.firstShort.date)} ${esc(R.firstShort.t)} 때 ${won(R.firstShort.amt)}이 처음 모자라요.</b> 가장 많이 모자라는 금액은 ${won(R.maxShort)}이에요.</div>`
      : `<div class="cyq-alert g"><b>넣어 주신 돈으로 모든 날짜를 맞출 수 있어요.</b> 입주 뒤 남는 돈 ${won(R.end)}.</div>`;
    return head + `<div class="cyq-tw"><table class="cyq-tb plan"><thead><tr><th>날짜</th><th>내용</th><th class="num">낼 돈(−)·들어올 돈(+)<small>그날 남는 돈</small></th></tr></thead><tbody>${R.rows.map(row).join('')}</tbody></table></div>`
      + `<div class="cyq-sum"><span>분양가 <b>${won(R.P)}</b></span><span>내 돈으로 낼 금액 합계 <b>${won(R.total)}</b></span><span>중도금 대출 <b>${won(R.midLoanAmt)}</b></span><span>잔금 대출 <b>${won(R.loan)}</b></span>${R.interest ? `<span>중도금 대출 이자 <b>${won(R.interest)}</b></span>` : ''}</div>`;
  }
  /* 중도금 대출·잔금 대출 기준(화면 설명) */
  function loanRuleTxt(F) {
    const g = { reg: '규제지역(투기과열지구·조정대상지역)', capfree: '비규제 수도권', local: '지방' }[F.g] || '';
    return `중도금 대출(집단대출)은 시행사가 정한 은행에서 보증기관(HUG·HF) 보증으로 나와요. ${g}은 LTV(집값 대비 대출 비율) ${Math.round(F.ltv * 100)}%가 한도라, 이 화면은 중도금 대출도 분양가의 ${Math.round(F.ltv * 100)}%까지로 계산했어요. `
      + `잔금 대출은 내 집 마련 계산기와 같은 기준(LTV·가격 구간별 한도·소득을 넣으면 DSR)으로 ${won(F.loan)}까지예요. 보증 한도·세대당 건수·이자 방식(이자후불제·무이자)은 단지마다 달라 입주자모집공고문과 은행 안내가 기준이에요.`;
  }
  function mountPlan(el, D, N, opt) {
    if (!el) return; opt = opt || {};
    const C = CYP(), tys = (D.types || []).slice().sort((a, b) => a.area - b.area || a.price - b.price);
    if (!tys.length || !C) { el.innerHTML = '<p class="cyq-na">주택형 분양가 자료가 없어 계획표를 만들지 못했어요.</p>'; return; }
    const pick = tys.reduce((a, t) => Math.abs(t.area - 84.9) < Math.abs(a.area - 84.9) ? t : a, tys[0]);
    const ct = d8((D.ct || [])[0] || (N && (N.ct || [])[0]) || ''), mv = String(D.mv || (N && N.mv) || ''), move = mv.length >= 6 ? mv.slice(0, 6) + '01' : '';
    const today = d8(opt.today || ymdOf(new Date()));
    el.innerHTML = `<div class="cyq-form">
      <label>주택형<select data-p="ty">${tys.map((t, i) => `<option value="${i}"${t === pick ? ' selected' : ''}>${esc(tyName(t.ty))} · 최고 ${won(t.price)}</option>`).join('')}</select></label>
      <label>집 보유<select data-p="own"><option value="none">무주택</option><option value="first">무주택 · 생애최초</option><option value="one">1주택(입주 전 처분 조건)</option></select></label>
      <label>연소득(만 원, 비우면 소득 한도 빼고)<input data-p="inc" type="number" inputmode="numeric" min="0" placeholder="예: 7000"></label>
      <label>계약금 %<input data-p="dp" type="number" inputmode="numeric" min="0" max="100" value="10"></label>
      <label>중도금 %<input data-p="mid" type="number" inputmode="numeric" min="0" max="100" value="60"></label>
      <label>중도금 회차<input data-p="n" type="number" inputmode="numeric" min="1" max="12" value="6"></label>
      <label>계약일<input data-p="ct" type="date" value="${isoOf(ct)}"></label>
      <label>입주(잔금)일<input data-p="move" type="date" value="${isoOf(move)}"></label>
      <label>중도금 대출<select data-p="ml"><option value="after">대출 · 이자후불제(잔금 때 이자 한꺼번에)</option><option value="free">대출 · 무이자(시행사 부담)</option><option value="self">대출 · 이자는 내가 매달</option><option value="cash">대출 안 받고 내 돈으로</option></select></label>
      <label>중도금 대출 금리 연 %<input data-p="rate" type="number" inputmode="decimal" min="0" max="15" step="0.1" value="4.5"></label>
      <label>지금 가진 돈(만 원)<input data-p="cash" type="number" inputmode="numeric" min="0" placeholder="예: 15000"></label>
      <label>돌려받을 전·월세 보증금(만 원)<input data-p="dep" type="number" inputmode="numeric" min="0" placeholder="없으면 비워 두세요"></label>
      <label>보증금 돌려받는 날<input data-p="depD" type="date"></label>
      <label>집 팔아 들어올 돈(만 원, 대출 갚고 남는 돈)<input data-p="sale" type="number" inputmode="numeric" min="0" placeholder="없으면 비워 두세요"></label>
      <label>집 판 돈 들어오는 날<input data-p="saleD" type="date"></label>
    </div>
    <details class="cyq-md"><summary>중도금 회차 날짜 바꾸기(공고문 날짜로)</summary><div data-p="mds" class="cyq-form"></div></details>
    <p class="cyq-s">처음 값(계약금 10%·중도금 60% 6회·금리 4.5%)은 예시예요. 공고문 비율·날짜로 바꿔 보세요. 넣은 금액은 이 기기 안에서만 계산하고 어디에도 보내지 않아요.</p>
    <div data-p="out"></div><div data-p="rule" class="cyq-s"></div>
    <button type="button" class="cyq-btn" data-p="ics" data-track="cyplan_ics">날짜별 낼 돈을 내 달력에 추가(.ics)</button>`;
    const q = k => el.querySelector(`[data-p="${k}"]`), num = k => +(q(k).value || 0), date = k => d8(q(k).value);
    let midDates = null, last = null;
    function mdInputs(n, ds) {
      q('mds').innerHTML = ds.map((d, i) => `<label>${i + 1}회차<input type="date" data-md="${i}" value="${isoOf(d)}"></label>`).join('');
      q('mds').querySelectorAll('[data-md]').forEach(x => x.addEventListener('change', () => { midDates = Array.from(q('mds').querySelectorAll('[data-md]')).map(y => d8(y.value)); run(true); }));
    }
    function run(keepMd) {
      const t = tys[+q('ty').value] || pick, ml = q('ml').value;
      const F = C.fund({ price: t.price, g: D.g, own: q('own').value, income: num('inc'), dp: num('dp'), mid: num('mid'), midLoan: ml !== 'cash', large: t.area > 85 });
      if (!F) { q('out').innerHTML = '<p class="cyq-na">대출 계산 모듈을 불러오지 못했어요.</p>'; return; }
      const n = Math.max(1, Math.min(12, Math.round(num('n') || 1))), c0 = date('ct'), m0 = date('move');
      if (!keepMd || !midDates || midDates.length !== n) { midDates = evenDates(c0, m0, n); mdInputs(n, midDates); }
      const o = { price: t.price, dp: num('dp'), mid: num('mid'), n, midDates, ct: c0, move: m0, midLoan: ml !== 'cash', midInt: ml === 'cash' ? 'free' : ml, rate: num('rate'), ltv: F.ltv, loan: F.loan, tax: Math.round(F.tax),
        cash: num('cash'), dep: { amt: num('dep'), date: date('depD') }, sale: { amt: num('sale'), date: date('saleD') }, today };
      if (!c0 || !m0 || m0 <= c0) { q('out').innerHTML = '<p class="cyq-na">계약일과 입주(잔금)일을 넣어 주세요(입주일이 계약일보다 뒤여야 해요).</p>'; return; }
      last = { R: plan(o), name: `${D.name} ${tyName(t.ty)}` };
      q('out').innerHTML = planHTML(last.R, o);
      q('rule').textContent = loanRuleTxt(F) + (q('own').value === 'one' ? ' 1주택(처분 조건)은 입주 뒤 정해진 기간 안에 기존 집을 팔아야 대출이 유지돼요.' : '');
    }
    el.querySelectorAll('select,input').forEach(x => x.addEventListener(x.tagName === 'INPUT' && x.type !== 'date' ? 'input' : 'change', () => run(x.dataset.p !== 'n' && x.dataset.p !== 'ct' && x.dataset.p !== 'move')));
    q('ics').addEventListener('click', () => {
      if (!last) return;
      try {
        const b = new Blob([planIcs(last.R, last.name, root.location ? root.location.href.split('#')[0] : '')], { type: 'text/calendar;charset=utf-8' }), a = document.createElement('a');
        a.href = URL.createObjectURL(b); a.download = ('분양돈계획_' + last.name).replace(/[\\/:*?"<>|\s]+/g, '_').slice(0, 60) + '.ics'; document.body.appendChild(a); a.click();
        setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
      } catch (e) {}
    });
    run(false);
  }

  /* ================= 유료 ② 내 가점으로 어디에 넣을까 — 진행·예정 공고 전략표 ================= */
  /* notices: data/chungyak/notices.json rows, my: 가점, prof: {A, e, m}, today: 'YYYYMMDD'
     → 주택형마다 { n(공고), ty, area, gen, band, p(예상 범위), d(판정), margin(내 가점 − 범위 상단), lt, cons:[조건 문장], block(신청 자체가 막힘), rewin, area(해당/기타) } 순서대로 */
  /* scope 'near': 내 주소 시·도 공고 + (수도권에 살면) 수도권 공고만 · 'all'(기본): 전국 */
  function strategy(notices, my, prof, today, scope) {
    const E = CYE(), S = SALE(); if (!E) return { rows: [], n: 0 };
    const t = d8(today) || ymdOf(new Date()), CAP = ['서울특별시', '인천광역시', '경기도'];
    const mySd = prof && prof.m && prof.m.mySido ? E.sidoNorm(prof.m.mySido) : '';
    const near = n => { const sd = E.noticeSido(n); return !mySd || sd === mySd || (CAP.indexOf(sd) >= 0 && CAP.indexOf(mySd) >= 0); };
    const live = (notices || []).filter(n => n.k === '민영' && (S ? S.isLive(n, t) : true) && (scope !== 'near' || near(n)));
    const sameDay = {}; live.forEach(n => { if (n.pw) (sameDay[n.pw] = sameDay[n.pw] || []).push(n.no); });
    const out = [];
    live.forEach(n => {
      const sd = E.noticeSido(n), R = rules(n);
      /* 지역(해당지역·기타지역): 3대 실수 점검과 같은 판단(cy-engine mistakes ③) */
      let here = null, hereTxt = '내 주소를 넣으면 해당지역인지 알려 드려요';
      if (prof && prof.m && prof.m.mySido) {
        const mk = E.mistakes(prof.A || { quick: 0 }, Object.assign({}, prof.m, { nSido: sd, nSgg: n.g || '', pick: '' }), E.CY.d8(isoOf(n.pb)) || new Date()).rows.filter(r => r.id === 'area')[0];
        here = mk && /^해당지역이에요/.test(mk.head) ? true : mk && /해당지역이 아니에요|기타지역/.test(mk.head) ? false : null;
        hereTxt = mk ? mk.head : hereTxt;
      }
      const el = prof && prof.A && prof.A.birth ? E.eligibility(prof.A, eFor(n, prof.e, prof.A), E.CY.d8(isoOf(n.pb)) || new Date()) : null;
      const r1 = el ? el.filter(r => r.id === 'rank1') : [];
      const r1g = !el ? null : r1.some(r => r.g === 'no') ? 'no' : r1.some(r => r.g === 'chk2') ? 'chk2' : 'ok';
      const sp = el ? el.filter(r => r.k === '특별공급' && r.g !== 'no').map(r => r.t) : [];
      (n.ty || []).filter(x => x[1]).forEach(x => {
        const band = E.bandOf(+x[1]), lt = E.lottery(n.f, band, sd), p = lt.noGajum ? null : E.cutOf(n, band);
        const d = my != null && p && p.ok ? E.diag(my, p) : null;
        const cons = [];
        if (here === false) cons.push('기타지역 — 해당지역 신청자가 먼저 뽑혀요');
        else if (here === true) cons.push('해당지역');
        else cons.push(hereTxt);
        if (r1g === 'no') cons.push('1순위 어려움 — ' + ((r1.filter(r => r.g === 'no')[0] || {}).why || ''));
        else if (r1g === 'chk2') cons.push('1순위 확인 필요 — ' + ((r1.filter(r => r.g === 'chk2')[0] || {}).why || ''));
        else if (r1g === 'ok') cons.push('1순위 조건 충족');
        if (sp.length) cons.push(`특별공급 가능성: ${sp.slice(0, 3).join('·')}${sp.length > 3 ? ` 외 ${sp.length - 3}` : ''}`);
        if (R.rewin.y) cons.push(`당첨되면 재당첨 제한 ${R.rewin.y}년`);
        if (n.pw && sameDay[n.pw].length > 1) cons.push(`발표일(${dot(n.pw)})이 같은 공고 ${sameDay[n.pw].length - 1}곳과는 한 사람이 한 곳만 신청할 수 있어요(두 곳 넣으면 모두 무효)`);
        if (prof && prof.e && prof.e.win === 'y' && R.reg) cons.push('최근 5년 당첨 이력이 있으면 규제지역 1순위가 안 돼요');
        out.push({ n, no: n.no, name: n.n, sd, gu: n.g || '', ty: x[0], tyName: tyName(x[0]), area: +x[1], gen: +x[2] || 0, price: +x[4] || 0, band, lt, p, d,
          margin: d && p ? my - p.hi : null, block: r1g === 'no', here, cons, rewin: R.rewin.y, rc: (n.rc && n.rc[0]) || (n.r1 && n.r1[0]) || '', pw: n.pw || '' });
      });
    });
    const gO = { hi: 0, mid: 1, lo: 2 };
    const key = r => [r.block ? 1 : 0, r.d ? gO[r.d.g] : r.lt.noGajum ? 3 : 4, r.here === false ? 1 : 0, -(r.margin == null ? -99 : r.margin), -r.gen, r.rc];
    out.sort((a, b) => { const x = key(a), y = key(b); for (let i = 0; i < x.length; i++) { if (x[i] < y[i]) return -1; if (x[i] > y[i]) return 1; } return 0; });
    return { rows: out, n: live.length, types: out.length, my, scope: scope === 'near' && mySd ? (CAP.indexOf(mySd) >= 0 ? '수도권' : mySd) : '전국' };
  }
  function strategyHTML(S, opt) {
    opt = opt || {};
    if (!S.n) return `<p class="cyq-na">지금 ${esc(S.scope || '전국')}에 진행·예정인 민영주택 공고가 없어요(청약홈 기준). ‘볼 범위’를 전국으로 바꿔 보세요.</p>`;
    const rows = S.rows.slice(0, opt.max || 60), FIRST = 10;
    const g = r => r.d ? `<span class="cyq-chip ${DG[r.d.g][0]}">${DG[r.d.g][1]}</span>` : r.lt.noGajum ? '<span class="cyq-chip n">추첨제</span>' : '<span class="cyq-chip n">자료 부족</span>';
    return `<p class="cyq-s">내 가점 <b>${S.my == null ? '–' : S.my + '점'}</b> · ${esc(S.scope || '전국')} 진행·예정 민영 공고 ${S.n}곳 주택형 ${S.types}개 · 순서: 신청이 막히지 않는 곳 → 가능성(높음·경합·낮음) → 해당지역 → 예상 범위 상단보다 여유가 큰 순 → 일반공급 세대가 많은 순</p>`
      + `<ol class="cyq-st">${rows.map((r, i) => (i === FIRST ? `</ol><details class="cyq-md"><summary>나머지 ${rows.length - FIRST}개 더 보기</summary><ol class="cyq-st" start="${FIRST + 1}">` : '') + `<li class="${r.block ? 'blk' : ''}"><div class="cyq-sth"><span class="cyq-rk">${i + 1}</span><b>${esc(r.name)}</b> ${esc(r.tyName)}${g(r)}</div>`
        + `<div class="cyq-stv">${esc(r.sd.replace(/(특별시|광역시|특별자치시|특별자치도|도)$/, ''))} ${esc(r.gu)} · 전용 ${r.area}㎡ · 일반 ${fmt(r.gen)}세대 · ${esc(r.lt.txt)}${r.rc ? ` · 접수 ${dot(r.rc)}` : ''}${r.pw ? ` · 발표 ${dot(r.pw)}` : ''}</div>`
        + (r.p && r.p.ok ? `<div class="cyq-stv">예상 최저 당첨 가점 <b>${r.p.lo === r.p.hi ? r.p.lo : r.p.lo + '~' + r.p.hi}점</b>${r.margin != null ? ` · 범위 상단보다 <b>${r.margin >= 0 ? '+' + r.margin : r.margin}점</b>` : ''}</div>` : '')
        + `<ul>${r.cons.filter(Boolean).map(c => `<li>${esc(c)}</li>`).join('')}</ul></li>`).join('')}</ol>${rows.length > FIRST ? '</details>' : ''}`
      + (S.rows.length > rows.length ? `<p class="cyq-s">위 ${rows.length}개만 보여 드려요(전체 ${S.rows.length}개).</p>` : '')
      + '<p class="cyq-s">예상 범위는 청약 가점 화면·고민 찾기와 같은 값이에요. 순서는 당첨을 약속하거나 특정 단지를 권하는 것이 아니라, 넣어 주신 조건으로 정리한 참고 순서예요. 지역 거주기간·소득·자산 기준은 공고문이 기준이에요.</p>';
  }
  function mountStrategy(el, notices, prof, opt) {
    if (!el) return; opt = opt || {};
    const my0 = prof && prof.my != null ? prof.my : '';
    el.innerHTML = `<div class="cyq-form"><label>내 청약 가점(0~84)<input data-s="my" type="number" inputmode="numeric" min="0" max="84" value="${esc(my0)}" placeholder="예: 64"></label>`
      + `<label>내 주민등록 주소(시·도)<select data-s="sd"><option value="">골라 주세요</option>${(CYE() ? CYE().SIDO : []).map(s => `<option${prof && prof.m && prof.m.mySido === s ? ' selected' : ''}>${esc(s)}</option>`).join('')}</select></label>`
      + `<label>시·군·구<input data-s="sgg" type="text" value="${esc((prof && prof.m && prof.m.mySgg) || '')}" placeholder="예: 고양시 덕양구"></label>`
      + `<label>볼 범위<select data-s="sc"><option value="near">내 시·도(수도권이면 수도권 전체)</option><option value="all">전국</option></select></label></div><div data-s="out"></div>`;
    const q = k => el.querySelector(`[data-s="${k}"]`);
    function run() {
      const v = String(q('my').value).trim(), my = /^\d{1,2}$/.test(v) && +v <= 84 ? +v : null;
      const p = Object.assign({}, prof || {}, { m: Object.assign({}, (prof && prof.m) || {}, { mySido: q('sd').value, mySgg: q('sgg').value.trim() }) });
      q('out').innerHTML = strategyHTML(strategy(notices, my, p, opt.today, q('sd').value ? q('sc').value : 'all'), opt);
    }
    el.querySelectorAll('input,select').forEach(x => x.addEventListener(x.tagName === 'SELECT' ? 'change' : 'input', run));
    run();
  }

  /* ================= 유료 ③ 입주할 때 얼마쯤일까 ================= */
  /* REBUILD_PASS: 다시 만드는 아파트 예측 모델(엔진)이 검증 기준을 통과한 보유 기간(년). 비어 있으면 가격 범위를 내지 않아요.
     통과 기간이 생기면 엔진이 공개 자료에 그 기간의 범위를 실을 때 함께 여기에 적고 화면을 켜요(지어낸 범위 금지).
     FACTORS: 2026-11-27 독립 2차 검증(엔진 docs/audit/apt_score_second_opinion.md 5-2, 2010~2026.10 실거래, 같은 구 평균 대비, 진입가 = 점수일 뒤 1~12개월 거래)
     에서 신호가 확인된 구조 요인. 숫자는 그 표 그대로(범위 = 두 시험 격자, N/M = 시험 시점 중 맞은 횟수). 1년은 신호가 없어 싣지 않아요. */
  const REBUILD_PASS = [];
  const FACTORS = [
    { id: 'rail', t: '신설역 계획 단계', y2: '+1.8~+2.1%p', h2: '10번 중 8~9번', y3: '+2.8~+3.6%p', h3: '9번 중 7번', s: '새 철도역이 계획·공사 중인 곳 가까운 아파트는 같은 구 평균보다 더 오른 경우가 많았어요. 다만 개통한 뒤에는 오히려 약했어요(개통 뒤 2년 −1.0~−2.0%p).' },
    { id: 'size', t: '단지 규모(세대수)', y2: '+0.35%p', h2: '11번 중 9번', y3: '+0.6%p', h3: '10번 중 7번', s: '세대수가 많은 단지가 같은 구 평균보다 조금 더 오른 경향이 꾸준했지만, 효과는 작았어요.' },
    { id: 'redev', t: '재건축 단계(서울)', y2: '+4.2~+4.7%p', h2: '11번 중 10~11번', y3: '+5.9~+6.9%p', h3: '10번 중 9~10번', s: '재건축을 진행 중인 서울 아파트가 가장 강했어요. 새로 짓는 분양 단지에는 해당하지 않아요.', na: true },
    { id: 'old', t: '준공 25년 넘은 아파트', y2: '+1.6%p', h2: '11번 중 8~9번', y3: '+2.5~+2.6%p', h3: '10번 중 8번', s: '재건축 기대가 있는 오래된 아파트예요. 새 아파트에는 해당하지 않아요.', na: true }
  ];
  function factors(D, L) {
    const rail = (L && L.dev || []).filter(d => d.type === 'line' && d.stage && !/운행|개통/.test(d.stage));
    return FACTORS.map(f => {
      let hit = null, v = '';
      if (f.id === 'rail') { hit = rail.length > 0; v = hit ? `${rail.map(r => `${r.name}(${r.stage})`).join(' · ')}가 ${mTxt(rail[0].m)} 안에 있어요(노선이 지나는 기존 역 기준)` : (L && L.xy ? '1.5km 안에 공식 자료로 확인한 계획·공사 중 노선이 없어요' : '공고 위치 좌표가 없어 확인하지 못했어요'); }
      else if (f.id === 'size') { hit = null; v = D.hh ? `이 단지는 ${fmt(D.hh)}세대예요(공고 기준)` : '세대수 자료가 없어요'; }
      else { hit = false; v = '새로 짓는 분양 단지라 해당하지 않아요'; }
      return Object.assign({}, f, { hit, v });
    });
  }
  function factorsHTML(D, L) {
    const fs = factors(D, L);
    const pass = REBUILD_PASS.length > 0;
    return (pass ? `<div class="cyq-alert n"><b>정확도 검증을 마친 기간: ${REBUILD_PASS.map(y => y + '년').join('·')}</b> 그 기간의 가격 범위는 공개 자료가 준비되면 이 칸에 보여 드려요.</div>`
      : '<div class="cyq-alert n"><b>입주 때 가격 범위 예측은 아직 내놓지 않아요.</b> 아파트 예측 모델을 다시 만드는 중이고, 정확도 검증을 마친 예측 기간이 아직 없어서예요. 마치면 이 칸에서 가격 범위를 보여 드려요. 그 대신 과거 실거래로 효과가 확인된 요인과 이 단지가 해당하는지를 정리했어요.</div>')
      + `<div class="cyq-fc">${fs.map(f => `<article class="${f.na ? 'na' : ''}"><h3>${esc(f.t)}${f.hit === true ? '<span class="cyq-chip y">이 단지 해당</span>' : f.hit === false ? '<span class="cyq-chip n">해당 없음</span>' : ''}</h3>`
        + `<p class="cyq-v">${esc(f.v)}</p><dl><div><dt>2년 뒤</dt><dd><b>${esc(f.y2)}</b><small>${esc(f.h2)}</small></dd></div><div><dt>3년 뒤</dt><dd><b>${esc(f.y3)}</b><small>${esc(f.h3)}</small></dd></div></dl><p class="cyq-s">${esc(f.s)}</p></article>`).join('')}</div>`
      + '<p class="cyq-s">숫자는 같은 구 아파트 평균보다 몇 %p 더(덜) 올랐는지를 2010~2026년 실거래로 잰 과거 결과예요(집예보 자체 검증, 2026. 11. 27.). 요인 하나만 따로 본 값이라 더해서 쓰면 안 되고, 앞으로도 같다는 보장은 없어요. 이 단지의 입주 때 가격을 뜻하지 않아요.</p>';
  }

  /* ================= 유료 미리 보기(무료 화면) ================= */
  function teasers(D, N, key, opt) {
    const T = root.JDJ_TEASER; if (!T) return '';
    opt = opt || {};
    const href = JB.SITE + 'premium/checkout/?p=cy&k=' + encodeURIComponent(key || '');
    const tys = (D.types || []), pick = tys.length ? tys.reduce((a, t) => Math.abs(t.area - 84.9) < Math.abs(a.area - 84.9) ? t : a, tys[0]) : null;
    const ct = d8((D.ct || [])[0] || (N && (N.ct || [])[0]) || '');
    const p1 = pick ? `${tyName(pick.ty)}형(최고 ${won(pick.price)})에 당첨되면, 계약금이 10%일 때 ${ct ? '계약일 ' + dot(ct) + '에' : '계약할 때'} ${won(Math.round(pick.price * 0.1))}이 먼저 필요해요.` : '';
    const S = opt.notices ? strategy(opt.notices, opt.my, opt.prof, opt.today) : null;
    const p2 = S && S.n ? `지금 진행·예정 민영 공고 ${S.n}곳의 주택형 ${S.types}개를${opt.my != null ? ` 내 가점 ${opt.my}점 기준으로` : ''} 예상 커트라인 여유 순으로 줄 세워요.` : '';
    const L = opt.loc, rail = L ? factors(D, L)[0] : null;
    const p3 = '입주 때 가격 범위는 아직 예측하지 않아요(정확도 검증을 마친 예측 기간이 아직 없어요).';
    const box = (name, pv, desc, tr) => T.html({ name, preview: pv, desc, href: key ? href : JB.SITE + 'premium/', track: tr });
    return box('당첨되면 내 돈 계획표', p1, '계약금·중도금 회차·잔금을 날짜별로, 중도금 대출(이자후불제·무이자)·잔금 대출 한도, 내 보증금·집 판 돈이 들어오는 날까지 넣어 모자라는 날과 금액을 보여 드려요. 달력 파일로도 받아요.', 'cy_teaser_plan')
      + box('내 가점으로 어디에 넣을까', p2, '진행·예정 공고의 주택형을 예상 커트라인 여유·당첨 가능성 순으로 정리하고, 해당지역 여부·1순위·특별공급 자격·재당첨 제한·같은 날 발표까지 함께 따져요.', 'cy_teaser_strategy')
      + box('입주할 때 얼마쯤일까', p3, `과거 실거래로 효과가 확인된 요인(신설역 계획 단계·단지 규모 등)과 그 과거 효과, 이 단지가 해당하는지를 보여 드려요.${rail && rail.hit ? ' 이 단지는 가까운 곳에 계획·공사 중인 노선이 있어요.' : ''}`, 'cy_teaser_future');
  }

  /* ================= 유료 리포트(premium/view/)에서 세 가지 그리기 ================= */
  async function mountPaid(el, D, opt) {
    if (!el) return; opt = opt || {};
    const DATA = JB.DATA + 'data/', get = u => fetch(u).then(r => r.ok ? r.json() : null).catch(() => null);
    const [nj, bj, poi, dm] = await Promise.all([get(DATA + 'chungyak/notices.json'), get(DATA + 'bunyang/notices.json'), D.sid ? get(DATA + 'poi/' + D.sid + '.json') : null, get(DATA + 'devmap.json')]);
    const notices = (nj && nj.rows) || [], N = notices.filter(n => n.no === D.no)[0] || null, B = ((bj && bj.rows) || []).filter(b => b.no === D.no)[0];
    const L = locSummary(B && B.xy, poi, dm), prof = profile(opt.storage);
    el.innerHTML = `<section class="cyp-sec cyq-paid" id="cyqPlan"><h2>유료 ① 당첨되면 내 돈 계획표</h2><div data-x="plan"></div></section>`
      + `<section class="cyp-sec cyq-paid" id="cyqStr"><h2>유료 ② 내 가점으로 어디에 넣을까</h2><div data-x="str"></div></section>`
      + `<section class="cyp-sec cyq-paid" id="cyqFut"><h2>유료 ③ 입주할 때 얼마쯤일까</h2>${factorsHTML(D, L)}</section>`;
    mountPlan(el.querySelector('[data-x="plan"]'), D, N, opt);
    mountStrategy(el.querySelector('[data-x="str"]'), notices, prof, opt);
  }
  /* 이 기기에 저장된 청약 답(chungyak/ 화면이 저장): 가점 답 jdj_cy · 특공 답 jdj_cy_e · 3대 실수 답 jdj_cy_m */
  function profile(st) {
    st = st || (typeof localStorage !== 'undefined' ? localStorage : null);
    const j = k => { try { return JSON.parse((st && st.getItem(k)) || 'null'); } catch (e) { return null; } };
    const A = j('jdj_cy'), e = j('jdj_cy_e'), m = j('jdj_cy_m'), E = CYE();
    let my = null;
    if (A && A.quick != null && /^\d{1,2}$/.test(String(A.quick))) my = +A.quick;
    else if (A && A.birth && E) { try { my = E.CY.total(A, A.ref || isoOf(ymdOf(new Date()))).sum; } catch (x) { my = null; } }
    return { A: A && typeof A === 'object' ? A : null, e: e || null, m: m || null, my };
  }

  const CSS = '.cyq-sec{margin-top:26px}.cyq-sec>h2{font-size:20px;letter-spacing:-.4px;margin:0 0 4px}.cyq-sec>.cyq-lead{font-size:14.5px;color:#4E5968;margin:0 0 10px;word-break:keep-all}'
    + '.cyq-tw{overflow-x:auto;-webkit-overflow-scrolling:touch}.cyq-tb{width:100%;border-collapse:collapse;font-size:14px;font-variant-numeric:tabular-nums}.cyq-tb th{text-align:left;font-size:13px;color:#6B7684;font-weight:700;padding:6px 6px;border-bottom:1px solid #E5E8EB;vertical-align:bottom}'
    + '.cyq-tb td{padding:8px 6px;border-bottom:1px solid #F2F4F6;vertical-align:top}.cyq-tb small,.cyq-tb th small{display:block;font-size:12.5px;color:#6B7684;font-weight:500;margin-top:2px;word-break:keep-all}.cyq-tb .num{text-align:right;white-space:nowrap}.cyq-tb.sm{font-size:13.5px}'
    + '.cyq-tb.plan tr.short td{background:#FDF2F1}.cyq-tb.plan td:first-child{white-space:nowrap;font-size:13px}.cyq-tb .neg{color:#B42318}'
    + '.cyq-chip{display:inline-flex;align-items:center;gap:3px;font-size:12.5px;font-weight:800;border-radius:999px;padding:2px 9px;margin-left:6px;white-space:nowrap;vertical-align:1px}'
    + '.cyq-chip.g,.cyq-chip.lo{background:#E9F6EF;color:#0E7A4F}.cyq-chip.y,.cyq-chip.hi{background:#FFF6E5;color:#A15C07}.cyq-chip.r{background:#FDECEA;color:#B42318}.cyq-chip.n{background:#F2F4F6;color:#4E5968}'
    + '.cyq-tb td .cyq-chip{margin-left:0}'
    + '.cyq-s{font-size:13.5px;color:#6B7684;line-height:1.6;margin:8px 0 0;word-break:keep-all}.cyq-na{font-size:14.5px;color:#6B7684;background:#F9FAFB;border-radius:12px;padding:12px 14px}'
    + '.cyq-ul{margin:4px 0 0;padding-left:18px;font-size:13.5px;color:#4E5968;line-height:1.6;display:grid;gap:3px;word-break:keep-all}'
    + '.cyq-band{border:1px solid #E5E8EB;border-radius:14px;padding:12px 14px;margin-top:10px;background:#fff}.cyq-bh{display:flex;flex-wrap:wrap;align-items:center;gap:6px;font-size:15.5px}.cyq-bh span:not(.cyq-chip){font-size:13px;color:#6B7684}'
    + '.cyq-v{font-size:15px;margin:6px 0 0;word-break:keep-all}.cyq-my{font-size:15px;font-weight:700;margin:4px 0 0;word-break:keep-all}'
    + '.cyq-tys{list-style:none;margin:8px 0 0;padding:0;font-size:13.5px;color:#4E5968}.cyq-tys li{display:flex;justify-content:space-between;gap:8px;padding:2px 0}.cyq-tys b{font-weight:700;color:#191F28;white-space:nowrap}'
    + '.cyq-g3{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}@media(max-width:720px){.cyq-g3{grid-template-columns:1fr}}'
    + '.cyq-lc{border:1px solid #E5E8EB;border-radius:14px;padding:12px 14px;background:#fff}.cyq-lc h3{font-size:15px;margin:0 0 6px}.cyq-lc ul{margin:0;padding-left:16px;font-size:14px;line-height:1.6;display:grid;gap:4px}.cyq-lc li small{display:block;font-size:12.5px;color:#6B7684}.cyq-lc>small{display:block;margin-top:6px;font-size:12.5px;color:#6B7684;line-height:1.5}'
    + '.cyq-rules{list-style:none;margin:0;padding:0;display:grid;gap:10px}.cyq-rules li{border:1px solid #E5E8EB;border-radius:14px;padding:12px 14px;background:#fff}.cyq-rules li>b{font-size:15.5px}.cyq-rules li>div{font-size:14px;color:#3E4754;line-height:1.6;margin-top:4px;word-break:keep-all}'
    + '.cyq-form{display:grid;grid-template-columns:repeat(2,1fr);gap:8px 10px}@media(min-width:900px){.cyq-form{grid-template-columns:repeat(3,1fr)}}@media(max-width:420px){.cyq-form{grid-template-columns:1fr}}'
    + '.cyq-form label{display:flex;flex-direction:column;gap:4px;font-size:13.5px;font-weight:700;color:#4E5968}.cyq-form input,.cyq-form select{min-height:44px;border:1px solid #E5E8EB;border-radius:12px;padding:8px 10px;font:inherit;font-size:15px;font-weight:700;color:#191F28;background:#fff;width:100%;box-sizing:border-box}'
    + '.cyq-md{margin:10px 0 0;border:1px solid #E5E8EB;border-radius:12px;padding:2px 12px}.cyq-md summary{min-height:44px;display:flex;align-items:center;font-weight:700;font-size:14.5px;cursor:pointer}.cyq-md .cyq-form{padding:0 0 10px}'
    + '.cyq-alert{border-radius:12px;padding:12px 14px;margin:12px 0 8px;font-size:14.5px;line-height:1.6;word-break:keep-all}.cyq-alert.r{background:#FDECEA;color:#7A1A12}.cyq-alert.g{background:#E9F6EF;color:#0B5A3A}.cyq-alert.n{background:#F2F4F6;color:#333D4B}'
    + '.cyq-sum{display:flex;flex-wrap:wrap;gap:6px 14px;font-size:14px;color:#4E5968;margin-top:10px}.cyq-sum b{color:#191F28}'
    + '.cyq-btn{display:inline-flex;align-items:center;min-height:44px;margin-top:12px;padding:0 16px;border-radius:12px;border:1px solid #4338CA;background:#fff;color:#4338CA;font:inherit;font-size:14.5px;font-weight:800;cursor:pointer}'
    + '.cyq-st{list-style:none;margin:10px 0 0;padding:0;display:grid;gap:8px}.cyq-st>li{border:1px solid #E5E8EB;border-radius:14px;padding:12px 14px;background:#fff}.cyq-st>li.blk{opacity:.72;background:#F9FAFB}'
    + '.cyq-sth{display:flex;flex-wrap:wrap;align-items:center;gap:4px 6px;font-size:15.5px}.cyq-rk{display:inline-flex;align-items:center;justify-content:center;min-width:24px;height:24px;border-radius:8px;background:#EEF0FF;color:#4338CA;font-size:13px;font-weight:800}'
    + '.cyq-stv{font-size:13.5px;color:#4E5968;margin-top:4px;word-break:keep-all}.cyq-st ul{margin:6px 0 0;padding-left:18px;font-size:13.5px;color:#3E4754;line-height:1.55;display:grid;gap:2px}'
    + '.cyq-fc{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-top:10px}@media(max-width:620px){.cyq-fc{grid-template-columns:1fr}}.cyq-fc article{border:1px solid #E5E8EB;border-radius:14px;padding:12px 14px;background:#fff}.cyq-fc article.na{background:#F9FAFB}'
    + '.cyq-fc h3{font-size:15.5px;margin:0;display:flex;flex-wrap:wrap;align-items:center;gap:4px}.cyq-fc dl{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:8px 0 0}.cyq-fc dl div{background:#F9FAFB;border-radius:10px;padding:8px 10px}.cyq-fc dt{font-size:12.5px;color:#6B7684}.cyq-fc dd{margin:2px 0 0;font-size:15px}.cyq-fc dd small{display:block;font-size:12px;color:#6B7684}'
    + '.cyq-sched{border:1px solid #E5E8EB;border-radius:16px;padding:12px 14px;margin-top:14px;background:#fff}.cyq-sched .dd{display:inline-flex;font-size:13px;font-weight:800;border-radius:8px;padding:2px 8px;background:#EEF0FF;color:#4338CA;margin-right:6px}.cyq-sched ul{list-style:none;margin:8px 0 0;padding:0;display:grid;grid-template-columns:repeat(2,1fr);gap:4px 12px;font-size:14px}@media(min-width:720px){.cyq-sched ul{grid-template-columns:repeat(4,1fr)}}.cyq-sched li span{display:block;font-size:12.5px;color:#6B7684}'
    + '.cyq-paidwrap .jpt{margin-top:10px}'
    + '@media print{.cyq-form,.cyq-btn,.cyq-md{display:none}}';
  function style() {
    if (typeof document === 'undefined' || document.getElementById('cyqCss')) return;
    const s = document.createElement('style'); s.id = 'cyqCss'; s.textContent = CSS; (document.head || document.documentElement).appendChild(s);
  }

  const api = { REBUILD_PASS, FACTORS, BAND, won, dot, distM, tyName, typeCompare, typeCompareHTML, typeOdds, typeOddsHTML, methodTxt, similar, locSummary, locHTML, rules, rulesHTML,
    eFor, eligFor, mistakesFor, diagReport, evenDates, plan, planIcs, planHTML, loanRuleTxt, mountPlan, strategy, strategyHTML, mountStrategy, factors, factorsHTML, teasers, mountPaid, profile, style, CSS, addMonths, days };
  root.JDJ_CYPLAN = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
