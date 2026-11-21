/* 주간 실거래 동향(/weekly/, /weekly/YYYY-WW/) 화면 — 글·숫자 규칙은 assets/weekly-core.js(JDJ_WEEKLY).
   ?v=n 이면 그 판(고정 보관본)을, 없으면 그 주 최신 판을 보여 준다. 주가 없으면 최신 주. */
(function () {
  'use strict';
  const K = window.JDJ_WEEKLY, $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const SITE = () => (window.JDJ_SITE && window.JDJ_SITE.SITE_NAME) || '집코드';
  const T = (e, p) => { try { if (window.gtag) window.gtag('event', e, p || {}); } catch (x) {} };
  const J = u => fetch(u, { cache: 'no-cache' }).then(r => r.ok ? r.json() : null).catch(() => null);
  let V, IX, BASIS = 'w', SD = '서울';

  function fail(msg) { $('hd').textContent = '주간 실거래 동향'; $('hdSub').innerHTML = `<span class="load" style="display:block">${esc(msg)}</span>`; }

  function cls(x) { return x == null ? 'na' : x > 0 ? 'up' : x < 0 ? 'dn' : 'eq'; }

  function head() {
    const k = K.row(V, '00') || {}, m = V.method || {};
    document.title = `주간 실거래 동향 ${V.w} (${K.period(V)}) | ${SITE()}`;
    $('hd').innerHTML = k.chg == null ? esc(K.headline(V)) :
      `${esc(K.period(V))} 전국 아파트,<br>같은 집 직전 거래보다 <em class="${cls(k.chg)}">${esc(K.pct(k.chg))}</em>`;
    $('hdSub').textContent = (m.m || 1) >= 2 ? `${K.weekName(V)}에 계약된 아파트 매매 ${K.num(k.n)}건 가운데, 같은 단지·같은 면적의 직전 거래(${m.lookback || 90}일 안)와 비교할 수 있는 ${K.num(k.np)}건의 변화율을 줄 세워, 가장 많이 오른 4분의 1과 가장 많이 내린 4분의 1을 빼고 평균한 값(가운데 50% 평균)이에요.${k.med != null ? ` 중간값은 ${K.pct(k.med)}예요.` : ''}` :
      `${K.weekName(V)}에 계약된 아파트 매매 ${K.num(k.n)}건 가운데, 같은 단지·같은 면적의 직전 거래(${m.lookback || 90}일 안)와 비교할 수 있는 ${K.num(k.np)}건의 변화율 중간값이에요. 이 판은 예전 계산 방법(방법 판 1, 중간값)으로 만든 그대로 보관한 판이에요.`;
    $('stl').innerHTML = `<span class="pill ${V.status === 'final' ? 'final' : 'prov'}">${esc(K.statusText(V))}</span><span class="pill ver">제${V.ver}판 · ${esc(K.dot(V.asof))} 자료 기준</span>
      <span class="fn">${esc(K.finalNote(V))}</span><span class="fn"><b>${esc(K.scheduleText(V))}</b>${V.release ? ` 이 판 발표: ${esc(K.whenText(V.release))}.` : ''}</span>`;
    document.querySelectorAll('[data-m]').forEach(el => { const v = m[el.dataset.m]; if (v != null) el.textContent = v; });
    const can = document.querySelector('link[rel=canonical]'); if (can) can.href = K.ORIGIN + K.PAGE + V.w + '/';
  }

  function nav() {
    const ws = (IX && IX.weeks) || [];
    if (!ws.length) return;
    const i = ws.findIndex(x => x.w === V.w);
    const older = ws[i + 1], newer = ws[i - 1];
    $('wnav').innerHTML = `<label for="wsel" style="position:absolute;left:-9999px">주 고르기</label><select id="wsel" aria-label="주 고르기">${ws.map(x => `<option value="${x.w}"${x.w === V.w ? ' selected' : ''}>${esc(x.w)} · ${esc(K.period(x))} ${x.status === 'final' ? '확정' : '잠정'}</option>`).join('')}</select>
      <a href="${older ? K.PAGE + older.w + '/' : '#'}" aria-disabled="${!older}">← 이전 주</a><a href="${newer ? K.PAGE + newer.w + '/' : '#'}" aria-disabled="${!newer}">다음 주 →</a>${i > 0 ? `<a href="${K.PAGE}">최신 주</a>` : ''}`;
    $('wnav').hidden = false;
    $('wsel').onchange = e => { location.href = K.PAGE + e.target.value + '/'; };
  }

  function card(lb, big, c, nt) { return `<div class="card"><span class="lb">${esc(lb)}</span><span class="big ${c || ''}">${esc(big)}</span><span class="nt">${nt}</span></div>`; }
  function cards() {
    const k = K.row(V, '00') || {}, s = K.row(V, '11') || {}, min = (V.method || {}).min;
    const chgCard = (nm, r) => r.chg == null ? card(nm + ' 변동률', '표본 부족', 'na', `비교 ${K.num(r.np)}건 · 기준 ${min}건`) :
      card(nm + ' 변동률', K.pct(r.chg), cls(r.chg), `${esc(K.methodName(V))}${r.med != null && K.methodName(V) !== '중간값' ? ` · 중간값 ${esc(K.pct(r.med))}` : ''}<br>비교 ${K.num(r.np)}건 · 오른 거래 ${K.share(r.up)}, 내린 거래 ${K.share(r.dn)}<br>오차 범위 ${esc(K.pct(r.lo))} ~ ${esc(K.pct(r.hi))}`);
    const vc = K.volCell(k, V);
    const us = K.usCell(k), ob = K.obCell(k);
    $('cards').innerHTML = chgCard('전국', k) + chgCard('서울', s) +
      card('전국 거래 건수', K.num(k.n) + '건', '', `해제 제외 · ${V.status === 'final' ? '확정' : '지금까지 신고분'}<br>지난주 대비 ${esc(vc.t)} <small>(${esc(vc.why)})</small>`) +
      card('전국 신고가 비율', k.hs != null ? K.share(k.hs) : K.num(k.nh) + '건', '', `${K.num(k.nh)}건 · 직거래 뺀 거래 중 그 전 최고가를 넘은 거래`) +
      card('전국 급매 비율', us.t, us.cls || '', `${esc(us.why)} · 같은 집 최근 3개월 가운데 값보다 10~30% 싸게 거래`) +
      card('외지인 매수 비율', ob.t, ob.cls || '', `${esc(ob.why)} 다른 시·도에 사는 사람이 산 비율(한국부동산원 월간 집계)`);
  }

  function rone() {
    const k = K.row(V, '00') || {}, s = K.row(V, '11') || {};
    const why = '부동산원 지수는 조사원이 표본 아파트 시세를 매주 조사해 만든 값이고, 이 통계는 실제로 계약된 거래끼리 비교한 값이라 숫자가 다를 수 있어요.';
    if (!k.ro && !s.ro) {
      $('ro').innerHTML = `<b class="h">공식 주간 지수(한국부동산원)</b><p>이 판을 계산할 때 받아 둔 한국부동산원 주간 아파트 매매가격지수가 없어 함께 싣지 못했어요.${V.status === 'final' ? '' : ' 자료가 들어오면 다음 판부터 이 자리에 나란히 보여 드려요.'}</p><p>${esc(why)}</p>`;
      return;
    }
    const box = (nm, r) => r.ro ? `<div><small>${esc(nm)} · ${esc(r.ro.nm)}</small><strong class="${cls(r.ro.chg)}">${esc(K.pct(r.ro.chg))}</strong><small>지수 ${esc(r.ro.v)}</small></div>` : `<div><small>${esc(nm)}</small><strong class="na">—</strong></div>`;
    const src = V.rone_src || {};
    $('ro').innerHTML = `<b class="h">공식 주간 지수(한국부동산원) <small style="font-weight:500;color:var(--sub2);font-size:13px">참고</small></b>
      <div class="rr">${box('전국', k)}${box('서울', s)}</div>
      <p>${esc(why)}</p>
      <p class="src">출처: 한국부동산원 전국주택가격동향조사 「${esc(src.nm || '주간 아파트 매매가격지수')}」(R-ONE), ${esc(K.dot(src.at || ''))} 받음 · 변동률은 지수 두 주로 계산해 부동산원 발표 변동률과 소수 둘째 자리에서 다를 수 있어요.</p>`;
  }

  /* 막대 그래프(시·도) — 0에서 좌우로, 가는 선은 오차 범위 */
  function bars() {
    const rows = K.levelRows(V, 'sd'), mx = K.scaleMax(rows, BASIS), min = (V.method || {}).min;
    const x = v => (50 + v / mx * 50).toFixed(2);
    let h = '';
    rows.forEach(r => {
      const p = K.pick(r, BASIS);
      const tipTxt = p.ok ? `${r.nm} ${K.pct(p.chg)} · 오차 범위 ${K.pct(p.lo)} ~ ${K.pct(p.hi)} · 비교 ${K.num(p.np)}건` : `${r.nm} 표본 부족 · 비교 ${K.num(p.np)}건(기준 ${min}건)`;
      if (!p.ok) { h += `<div class="br na" tabindex="0" data-tip="${esc(tipTxt)}"><span class="nm">${esc(r.nm)}</span><span class="tr"></span><span class="v">표본 부족<small>${K.num(p.np)}건</small></span></div>`; return; }
      const a = Math.min(0, p.chg), b = Math.max(0, p.chg);
      const bar = p.chg === 0 ? `<span class="b eq" style="left:calc(50% - 1px)"></span>` : `<span class="b ${cls(p.chg)}" style="left:${x(a)}%;width:${(x(b) - x(a)).toFixed(2)}%"></span>`;
      const wh = p.lo != null ? `<span class="w" style="left:${x(p.lo)}%;width:${(x(p.hi) - x(p.lo)).toFixed(2)}%"></span>` : '';
      h += `<div class="br" tabindex="0" data-tip="${esc(tipTxt)}"><span class="nm">${esc(r.nm)}</span><span class="tr"><span class="z" style="left:50%"></span>${bar}${wh}</span><span class="v ${cls(p.chg)}">${esc(K.pct(p.chg))}<small>${K.num(p.np)}건</small></span></div>`;
    });
    h += `<div class="bax"><span></span><span class="ax"><span>−${mx}%</span><span>0</span><span>+${mx}%</span></span><span></span></div><div class="tip" id="tip" hidden></div>`;
    $('sdBars').innerHTML = h;
    const tip = $('tip'), box = $('sdBars');
    const show = el => { tip.textContent = el.dataset.tip; tip.hidden = false; const r = el.getBoundingClientRect(), b = box.getBoundingClientRect();
      tip.style.left = Math.max(4, Math.min(b.width - 264, r.left - b.left + 70)) + 'px'; tip.style.top = (r.bottom - b.top + 4) + 'px'; };
    box.querySelectorAll('.br').forEach(el => { el.onmouseenter = () => show(el); el.onfocus = () => show(el); el.onclick = () => show(el); el.onmouseleave = () => { tip.hidden = true; }; el.onblur = () => { tip.hidden = true; }; });
    $('sdSmall').textContent = BASIS === 'w' ? `${K.period(V)} 계약` : `최근 4주(${K.md(addDays(V.from, -21))}~${K.md(V.to)}) 계약`;
    $('basisNote').textContent = BASIS === 'w' ? '그 주 계약만 본 값이에요. 거래가 적은 곳은 ‘최근 4주’가 더 안정적이에요.' :
      '그 주를 포함한 4주 동안 계약된 거래를 모아 같은 방법으로 계산한 값이에요. 앞의 주들은 신고가 더 많이 들어와 있어요.';
  }
  function addDays(iso, n) { const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }

  function tops() {
    const t = (V.top || {})[BASIS] || { up: [], down: [], n: 0 }, min = (V.method || {}).min;
    $('topLead').textContent = `비교 거래가 ${min}건 이상이고 자료가 제때 들어온 시·군·구 ${t.n}곳 중에서 골랐어요(${BASIS === 'w' ? '지난주' : '최근 4주'} 기준). 표본이 적은 곳은 순위에 넣지 않아요.`;
    const li = x => `<li><span>${esc(x.sd)} ${esc(x.nm)} <small>비교 ${K.num(x.np)}건</small></span><b class="${cls(x.chg)}">${esc(K.pct(x.chg))}</b></li>`;
    const box = (h, a, none) => `<div class="topb"><h3>${h}</h3>${a.length ? `<ol>${a.map(li).join('')}</ol>` : `<p class="empty">${esc(none)}</p>`}${a.length && a.length < 5 ? `<p class="empty">기준을 넘은 곳 중 ${h.includes('오른') ? '오른' : '내린'} 곳은 ${a.length}곳뿐이에요.</p>` : ''}</div>`;
    const none = t.n ? '' : `표본 기준(${min}건)을 넘은 시·군·구가 없어요.${BASIS === 'w' ? ' ‘최근 4주’를 눌러 보세요.' : ''}`;
    $('tops').innerHTML = box('많이 오른 곳 TOP 5', t.up, none || '기준을 넘은 곳 중 오른 곳이 없어요.') + box('많이 내린 곳 TOP 5', t.down, none || '기준을 넘은 곳 중 내린 곳이 없어요.');
  }

  function table(rows, tot) {
    const min = (V.method || {}).min, b = BASIS;
    const hd = `<thead><tr><th>지역</th><th>변동률<br>${K.methodName(V) === '중간값' ? '중간값' : '(가운데 50%)'}</th><th>비교<br>거래</th><th>오른·내린<br>비율</th><th>거래<br>건수</th><th>거래량<br>변화</th><th>신고가<br>비율</th><th>급매<br>비율</th><th>외지인<br>매수(월)</th><th>부동산원<br>(참고)</th></tr></thead>`;
    const tr = (r, cl) => {
      const c = K.chgCell(r, b, min), p = K.pick(r, b), v = K.volCell(r, V), ro = K.roneCell(r);
      const ud = b === 'w' && r.up != null && p.ok ? `${Math.round(r.up)}% · ${Math.round(r.dn)}%` : '—';
      return `<tr class="${cl || ''} ${c.cls === 'na' ? 'na' : ''}"><td>${esc(r.nm)}${r.old ? '<small>자료 확인 늦음</small>' : ''}</td><td class="c ${c.cls}"><b>${esc(c.t)}</b>${c.sub ? `<small>${esc(c.sub)}</small>` : ''}${c.med && K.methodName(V) !== '중간값' ? `<small>${esc(c.med)}</small>` : ''}</td>
        <td>${K.num(p.np)}${p.gap != null ? `<small>간격 ${p.gap}일</small>` : ''}</td><td>${ud}</td><td>${K.num(b === 'w' ? r.n : (r.m || {}).n)}</td>
        <td class="${cls(r.vc)}">${esc(b === 'w' ? v.t : '—')}</td><td>${esc(b !== 'w' ? '—' : r.hs != null ? K.share(r.hs) : r.nh ? r.nh + '건' : '—')}</td>
        <td class="${K.usCell(r).cls || ''}">${esc(b !== 'w' ? '—' : K.usCell(r).t)}</td><td class="${K.obCell(r).cls || ''}">${esc(K.obCell(r).t)}${r.ob ? `<small>${esc(K.ymText(r.ob.ym))}</small>` : ''}</td><td class="${cls((r.ro || {}).chg)}">${esc(ro.t)}${ro.why ? `<small>${esc(ro.why)}</small>` : ''}</td></tr>`;
    };
    return hd + '<tbody>' + (tot ? tr(tot, 'tot') : '') + rows.map(r => tr(r)).join('') + '</tbody>';
  }

  function tables() {
    $('sdTbl').innerHTML = table(K.levelRows(V, 'sd'), K.row(V, '00'));
    const sds = K.sidos(V);
    if (!sds.includes(SD)) SD = sds[0];
    $('sgSel').innerHTML = sds.map(s => `<option${s === SD ? ' selected' : ''}>${esc(s)}</option>`).join('');
    const sdRow = K.levelRows(V, 'sd').find(r => r.nm === SD);
    $('sgTbl').innerHTML = table(K.levelRows(V, 'sgg', SD), sdRow);
    $('tblNote').textContent = `변동률 = ${K.methodName(V)}${K.methodName(V) !== '중간값' ? '(가장 많이 오른 4분의 1과 내린 4분의 1을 뺀 평균), 그 아래 작은 글씨 = 오차 범위(90%)·중간값' : ', 아래 작은 글씨 = 오차 범위(90%)'} · 비교 거래 = 같은 집 직전 거래와 짝지은 건수(간격 = 두 거래 사이 날 수의 중간값) · 거래 건수 = 해제 뺀 그 기간 신고분 · 거래량 변화 = 같은 신고 기간의 지난주 판과 비교 · 변동률은 비교 거래 ${(V.method || {}).min}건 이상일 때만${BASIS === 'm' ? ' · 최근 4주 보기에서는 비율·거래량 칸을 비워요' : ''}.`;
  }

  /* 주별 흐름(전국·서울) — 목록 index.json 의 각 주 최신 판 */
  function trend() {
    const ws = ((IX && IX.weeks) || []).slice(0, 16).reverse();
    if (ws.length < 2) { $('trend').innerHTML = '<p class="tnote" style="margin:6px 4px 10px">주가 두 개 이상 쌓이면 그래프로 보여 드려요.</p>'; return; }
    const ser = [['전국', 'kr', 0], ['서울', 'seoul', 1]];
    const vals = []; ws.forEach(w => ser.forEach(s => { const r = w[s[1]]; if (r && r.chg != null) vals.push(r.chg); }));
    if (!vals.length) { $('trend').innerHTML = '<p class="tnote">표본 기준을 넘은 주가 아직 없어요.</p>'; return; }
    let mx = Math.max(0.5, ...vals.map(Math.abs)); mx = Math.ceil(mx * 2) / 2;
    const W = 640, H = 220, L = 44, R = 56, TP = 12, B = 28, iw = W - L - R, ih = H - TP - B;
    const X = i => L + (ws.length === 1 ? iw / 2 : i * iw / (ws.length - 1)), Y = v => TP + (mx - v) / (2 * mx) * ih;
    let g = '';
    [-mx, -mx / 2, 0, mx / 2, mx].forEach(v => { g += `<line class="${v === 0 ? 'zl' : 'gl'}" x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}"/><text class="yl" x="${L - 6}" y="${Y(v) + 4}" text-anchor="end">${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v)}%</text>`; });
    ws.forEach((w, i) => { if (i % Math.ceil(ws.length / 8) === 0 || i === ws.length - 1) g += `<text class="xl" x="${X(i)}" y="${H - 8}">${esc(K.md(w.from))}</text>`; });
    ser.forEach(([nm, key, si]) => {
      let d = '', last = null;
      ws.forEach((w, i) => { const r = w[key]; if (!r || r.chg == null) { last = null; return; } d += `${last == null ? 'M' : 'L'}${X(i).toFixed(1)},${Y(r.chg).toFixed(1)}`; last = i; });
      g += `<path class="ln s${si}" d="${d}"/>`;
      ws.forEach((w, i) => { const r = w[key]; if (!r || r.chg == null) return;
        g += `<circle class="pt p${si} ${w.status === 'final' ? '' : 'prov'}" cx="${X(i)}" cy="${Y(r.chg)}" r="4.5"/><circle class="hit" cx="${X(i)}" cy="${Y(r.chg)}" r="11"><title>${esc(nm)} ${esc(K.period(w))} ${esc(K.pct(r.chg))} · 비교 ${K.num(r.np)}건 · ${w.status === 'final' ? '확정' : '잠정'} 제${w.ver}판</title></circle>`; });
      const li = ws.map((w, i) => [w, i]).reverse().find(([w]) => w[key] && w[key].chg != null);
      if (li) g += `<text x="${X(li[1]) + 8}" y="${Y(li[0][key].chg) + (si ? 14 : -6)}" style="font-size:12px;font-weight:700;fill:#191F28">${esc(nm)}</text>`;
    });
    $('trend').innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="전국·서울 주별 변동률">${g}</svg>
      <div class="leg"><span><i style="background:#191F28"></i>전국</span><span><i style="background:#2F6BFF"></i>서울</span><span>○ 잠정 · ● 확정</span></div>`;
  }

  function vers(cur) {
    const list = (V.versions || []).slice().reverse();
    $('vers').innerHTML = list.map(x => { const u = K.urls(V, x.ver);
      return `<li class="${x.ver === cur ? 'on' : ''}"><b>제${x.ver}판</b> · ${esc(K.dot(x.asof))} 자료 기준 · ${x.status === 'final' ? '확정' : '잠정'} · 거래 ${K.num(x.n)}건, 비교 ${K.num(x.np)}건, 전국 ${esc(K.pct(x.chg))}${x.ver === cur ? ' <small>(지금 보는 판)</small>' : ''}<br>
        ${x.note ? esc(x.note) + '<br>' : ''}<a href="${u.perma}">이 판 보기</a><a href="${u.csv}" download>표 내려받기(CSV)</a><a href="${u.json}">원본(JSON)</a><small style="color:var(--sub3);word-break:break-all">입력 지문 ${esc(String(x.sha256 || '').slice(0, 16))}…</small></li>`; }).join('');
  }

  function cite() {
    const c = K.cite(V, SITE()), u = K.urls(V);
    $('cite').innerHTML = `<div class="q" id="citeQ">${esc(c.line)}<small>${esc(c.detail)}</small></div>
      <div class="acts"><button type="button" class="btn primary" id="citeCopy">인용 문구 복사</button><a class="btn ghost" href="${u.csv}" download data-track="weekly_csv">표 내려받기(CSV, 엑셀)</a></div>
      <p>이 판 고정 주소: <a href="${c.url}">${esc(c.url)}</a><br>판 번호가 붙은 주소는 나중에 새 판이 나와도 이 숫자 그대로 보여요. 변동률은 소수 둘째 자리까지, 표본 수와 기간을 함께 적어 주세요.</p>`;
    $('citeCopy').onclick = () => {
      const t = `${c.line}\n${c.detail}\n${c.url}`;
      (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => { $('citeCopy').textContent = '복사했어요'; }).catch(() => { prompt('아래 문구를 복사해 주세요', t); });
      T('weekly_cite_copy', { w: V.w });
    };
  }

  let SEG = '00';
  function segs() {
    const opts = [['00', '전국']].concat(K.levelRows(V, 'sd').map(r => [r.c, r.nm]));
    $('segSel').innerHTML = opts.map(([c, nm]) => `<option value="${c}"${c === SEG ? ' selected' : ''}>${esc(nm)}</option>`).join('');
    const box = (h, kind) => `<div class="topb"><h3>${h}</h3><ol>${K.segRows(V, SEG, kind, BASIS).map(r => `<li><span>${esc(r.nm)} <small>비교 ${K.num(r.np)}건</small></span><b class="${r.ok ? cls(r.chg) : 'na'}">${r.ok ? esc(K.pct(r.chg)) : '표본 부족'}</b></li>`).join('')}</ol></div>`;
    $('segs').innerHTML = box('단지 나이(준공 후)', 'age') + box('단지 크기(세대수)', 'size');
    const cov = (((V.seg || {})[SEG] || {}).cov) || {};
    $('segSmall').textContent = BASIS === 'w' ? '지난주' : '최근 4주';
    $('segNote').textContent = `건축년도를 아는 거래 ${cov.age != null ? K.share(cov.age) : '—'}, 세대수(공동주택관리정보 K-apt)를 연결한 거래 ${cov.size != null ? K.share(cov.size) : '—'}만 나눠 셌어요(그 주 기준). 세대수를 연결하지 못한 단지는 크기별 칸에 들어가지 않아요.`;
  }
  async function cmp() {
    const C = await J(K.DATA + 'compare.json'), S = K.cmpSummary(C);
    if (!S) return;
    const L = Object.entries(C.levels || {}).sort((a, b) => a[0] < b[0] ? -1 : 1);
    const big = (C.big || []).slice(0, 8);
    const z = K.zeroText(S);
    if (z) document.querySelectorAll('[data-cz]').forEach(el => { if (z[el.dataset.cz]) el.textContent = z[el.dataset.cz]; });
    const m1 = S.m1, mt = (a, nm) => `<tr><td>${esc(nm)}</td><td>${esc(K.share(a.pct))} <small>${K.num(a.same)}/${K.num(a.n)}번</small></td><td>${esc(K.share(a.nzPct))} <small>${K.num(a.nz)}번 중</small></td><td>${K.num(a.ours0)}번 <small>${esc(K.share(a.ours0 / a.n * 100))}</small></td></tr>`;
    $('cmpA').insertAdjacentHTML('beforeend', `<p><b>${esc(S.from)}~${esc(S.to)} 주, 전국·시·도 ${K.num(S.n)}번 비교에서 방향(오름·내림·보합)이 같았던 비율은 ${esc(K.share(S.pct))}(${K.num(S.same)}번)예요.</b> 둘 다 보합이 아니었던 ${K.num(S.nz)}번만 보면 ${esc(K.share(S.nzPct))}가 같은 방향이었어요. 우리 숫자가 0.00%(보합)였던 경우는 ${K.num(S.ours0)}번, 두 숫자 차이의 중간값은 ${esc(K.pct(S.gap).replace('+', ''))}p예요(지금 방법: 가운데 50% 평균).</p>
      ${m1 ? `<p><b>예전 방법(중간값)과 나란히</b> — 같은 기간·같은 규칙으로 두 방법을 모두 계산했어요.</p><div class="tw"><table class="tt cmpt"><thead><tr><th>계산 방법</th><th>방향 같음</th><th>둘 다 보합 아님</th><th>우리 0.00%</th></tr></thead><tbody>${mt(S, '가운데 50% 평균(지금)')}${mt(m1, '중간값(예전)')}</tbody></table></div>` : ''}
      <div class="tw"><table class="tt cmpt"><thead><tr><th>지역</th><th>비교 주</th><th>방향 같음</th><th>둘 다 보합 아님</th><th>차이 중간값</th></tr></thead><tbody>${L.map(([c, v]) => `<tr><td>${esc(v.nm)}</td><td>${K.num(v.n)}</td><td>${esc(K.share(v.pct))}</td><td>${v.nz ? esc(K.share(v.nz_pct)) + ` <small>${v.nz}번</small>` : '—'}</td><td>${esc(K.pct(v.gap_med).replace('+', ''))}p</td></tr>`).join('')}</tbody></table></div>
      <p><b>차이가 가장 컸던 주</b>(숨기지 않고 그대로 보여 드려요)</p>
      <div class="tw"><table class="tt cmpt"><thead><tr><th>주(계약)</th><th>지역</th><th>우리</th><th>부동산원</th><th>차이</th></tr></thead><tbody>${big.map(r => `<tr><td>${esc(String(r.from).slice(0, 4))}년 ${esc(K.md(r.from))}~${esc(K.md(r.to))}</td><td>${esc(r.nm)}</td><td>${esc(K.pct(r.ours))}<small>비교 ${K.num(r.np)}건</small></td><td>${esc(K.pct(r.off))}<small>${esc(r.off_t)}</small></td><td>${esc(K.pct(r.gap))}p</td></tr>`).join('')}</tbody></table></div>
      <p>짝짓는 방법: 우리 주(월~일)는 그다음 월요일이 조사 기준일인 부동산원 주간 지수와 짝지어요(지수 두 주로 계산한 변동률). 방향은 우리 숫자는 0보다 크면 오름·작으면 내림·0.00이면 보합, 부동산원은 +0.01% 이상 오름·−0.01% 이하 내림·그 사이 보합으로 봐요. 비교 거래가 ${C.min}건 미만인 주는 넣지 않았어요. 서비스 시작 전 주는 지금 원자료로 같은 방법으로 다시 계산했어요. <a href="${K.DATA}compare.csv" download>전체 기록 내려받기(CSV)</a></p>`);
  }
  function renderBasis() { bars(); tops(); tables(); segs(); }

  (async function () {
    const w0 = K.weekFrom(location.pathname, location.search), v0 = K.verFrom(location.search);
    IX = await J(K.DATA + 'index.json');
    if (IX && IX.weeks) IX.weeks = IX.weeks.filter(x => K.released({ release: x.first_release }));    /* 발표 시각(월요일 오전 7시) 전인 주는 숨김 */
    const w = w0 || (IX && IX.weeks && IX.weeks[0] && IX.weeks[0].w);
    if (!w) return fail('아직 공개한 주간 통계가 없어요. 매주 월요일 새벽에 새로 계산해요.');
    const L = await J(K.DATA + w + '.json');
    if (!L) return fail(`${w} 주 통계를 찾지 못했어요. 아래 통계 설명을 참고해 주세요.`);
    const relV = (L.versions || []).filter(x => K.released(x));
    if (!relV.length) return fail(`${w} 주는 ${K.whenText((L.versions || [{}])[0].release) || '월요일 오전 7시'}에 발표해요.`);
    L.versions = relV;
    if (!v0 && relV[relV.length - 1].ver !== L.ver) {                       /* 새 판이 발표 시각 전이면 그 앞 판 */
      const P = await J(`${K.DATA}${w}/v${relV[relV.length - 1].ver}.json`); if (P) Object.assign(L, P, { versions: relV });
    }
    V = L;
    if (v0 && !relV.some(x => x.ver === v0)) return fail(`${w} 주 제${v0}판은 아직 발표 전이에요.`);
    if (v0 && v0 !== L.ver) {
      const P = await J(`${K.DATA}${w}/v${v0}.json`);
      if (!P) return fail(`${w} 주 제${v0}판을 찾지 못했어요.`);
      V = Object.assign(P, { versions: L.versions });
    }
    head(); nav(); cards(); rone(); renderBasis(); trend(); vers(V.ver); cite();
    if (v0 && v0 !== L.ver) $('stl').insertAdjacentHTML('beforeend', `<span class="fn"><b>예전 판을 보고 있어요.</b> 이 주의 최신 판은 제${L.ver}판이에요. <a href="${K.PAGE}${w}/">최신 판 보기</a></span>`);
    $('body').hidden = false;
    document.querySelectorAll('#basis button').forEach(b => b.onclick = () => {
      BASIS = b.dataset.b; document.querySelectorAll('#basis button').forEach(x => x.setAttribute('aria-pressed', String(x === b))); renderBasis(); T('weekly_basis', { b: BASIS });
    });
    $('sgSel').onchange = e => { SD = e.target.value; tables(); T('weekly_sido', { sd: SD }); };
    $('segSel').onchange = e => { SEG = e.target.value; segs(); };
    cmp();
    T('weekly_view', { w: V.w, v: V.ver });
  })();
})();
