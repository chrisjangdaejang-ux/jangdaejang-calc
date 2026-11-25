/* 보도자료실(/press/) — 글·숫자 규칙은 assets/weekly-core.js(JDJ_WEEKLY: pressTitles·pressKeys·pressLines·cite·urls). 발표 시각(월요일 오전 7시) 전 판은 보여 주지 않음. */
(function () {
  'use strict';
  const K = window.JDJ_WEEKLY, $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const SITE = () => (window.JDJ_SITE && window.JDJ_SITE.SITE_NAME) || '집예보';
  const J = u => fetch(u, { cache: 'no-cache' }).then(r => r.ok ? r.json() : null).catch(() => null);
  const T = (e, p) => { try { if (window.gtag) window.gtag('event', e, p || {}); } catch (x) {} };
  const copy = (btn, t) => (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => { btn.textContent = '복사했어요'; }).catch(() => { prompt('아래 글을 복사해 주세요', t); });
  const cls = x => x == null ? 'na' : x > 0 ? 'up' : x < 0 ? 'dn' : 'eq';

  (async function () {
    const IX = await J(K.DATA + 'index.json');
    const ws = ((IX && IX.weeks) || []).filter(x => K.released({ release: x.first_release }));
    if (!ws.length) { $('sum').innerHTML = '<div class="load">아직 발표한 주간 통계가 없어요. 매주 월요일 오전 7시에 발표해요.</div>'; $('past').innerHTML = ''; $('cite').innerHTML = '<div class="q">자료: ' + esc(SITE()) + ' 주간 실거래 동향(국토교통부 실거래가 분석, YYYY.MM.DD 기준)</div>'; return; }
    const L = await J(K.DATA + ws[0].w + '.json');
    if (!L) return;
    const rel = (L.versions || []).filter(x => K.released(x));
    let V = L;
    if (rel.length && rel[rel.length - 1].ver !== L.ver) V = (await J(`${K.DATA}${L.w}/v${rel[rel.length - 1].ver}.json`)) || L;
    const u = K.urls(V), c = K.cite(V, SITE()), lines = K.pressLines(V, SITE());
    $('sumSmall').textContent = `${K.weekName(V)} · ${K.verText(V)} · ${K.dot(V.asof)} 자료 기준${V.release ? ' · ' + K.whenText(V.release) + ' 발표' : ''}`;
    const sd = K.levelRows(V, 'sd'), kr = K.row(V, '00');
    $('sum').innerHTML = `<div class="pr-sum"><p class="tl">제목 후보</p><ol class="tit">${K.pressTitles(V).map(t => `<li>${esc(t)}</li>`).join('')}</ol>
      <p class="tl">핵심 숫자</p><div class="pr-keys">${K.pressKeys(V).map(x => `<div class="card"><span class="lb">${esc(x.lb)}</span><span class="big">${esc(x.v)}</span><span class="nt">${esc(x.nt)}</span></div>`).join('')}</div>
      <p class="tl" style="margin-top:12px">기사용 문장 <small style="font-weight:500">(그대로 붙여 쓰셔도 돼요)</small></p>
      <div class="pr-lines" id="lines">${lines.map(x => `<p>${esc(x)}</p>`).join('')}</div>
      <div class="row2" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px"><button type="button" class="btn primary" id="cpLines">문장 복사</button><a class="btn ghost" href="${u.csv}" download data-track="press_csv">표 내려받기(CSV)</a><a class="btn ghost" href="${K.PAGE}${V.w}/">자세히 보기</a></div>
      <p class="tl" style="margin-top:14px">시·도별 (${esc(K.period(V))} 계약)</p>
      <div class="tw"><table class="tt"><thead><tr><th>지역</th><th>변동률<br>중간값</th><th>비교<br>거래</th><th>거래<br>건수</th><th>신고가<br>비율</th><th>급매<br>비율</th><th>외지인<br>매수(월)</th></tr></thead><tbody>
      ${[kr].concat(sd).map((r, i) => { const ch = K.chgCell(r, 'w', (V.method || {}).min), us = K.usCell(r), ob = K.obCell(r);
        return `<tr class="${i ? '' : 'tot'}"><td>${esc(r.nm)}</td><td class="c ${ch.cls}"><b>${esc(ch.t)}</b></td><td>${K.num(r.np)}</td><td>${K.num(r.n)}</td><td>${esc(r.hs != null ? K.share(r.hs) : r.nh ? r.nh + '건' : '—')}</td><td>${esc(us.t)}</td><td>${esc(ob.t)}</td></tr>`; }).join('')}
      </tbody></table></div><p class="tnote">${esc(K.scheduleText(V))} 외지인 매수는 ${esc(K.ymText(((kr || {}).ob || {}).ym))} 한국부동산원 매입자 거주지 자료(월 단위)예요.</p></div>`;
    $('cpLines').onclick = () => { copy($('cpLines'), lines.join(' ') + '\n' + c.line); T('press_copy_lines', { w: V.w }); };
    $('cite').innerHTML = `<div class="q">${esc(c.line)}<small>${esc(c.detail)}</small></div>
      <div class="acts"><button type="button" class="btn primary" id="cpCite">인용 표기 복사</button></div>
      <p>판 번호가 붙은 고정 주소: <a href="${c.url}">${esc(c.url)}</a><br>변동률은 소수 둘째 자리까지, 비교 거래 수와 계약 기간을 함께 적어 주세요. 잠정치를 인용하실 때는 판 번호(제${V.ver}판)를 함께 적어 주시면 나중에 숫자가 바뀌어도 그대로 찾을 수 있어요.</p>`;
    $('cpCite').onclick = () => { copy($('cpCite'), `${c.line}\n${c.detail}\n${c.url}`); T('press_copy_cite', { w: V.w }); };
    $('dl').innerHTML = `<li><a href="${u.csv}" download>이번 주 표(CSV, 엑셀에서 열림)</a> — 전국·시·도·시·군·구 모든 숫자와 표본 수</li><li><a href="${u.json}">이번 주 원본(JSON)</a></li>
      <li><a href="${K.DATA}compare.csv" download>공식 주간 지수와 나란히 본 기록(CSV)</a></li><li><a href="${K.PAGE}#cmpD">방향이 같았던 비율 보기</a></li>`;
    $('past').innerHTML = ws.map(x => `<li><b>${esc(x.w)} · ${esc(K.period(x))}</b><span>${x.status === 'final' ? '확정' : '잠정'} 제${x.ver}판</span><a href="${K.PAGE}${x.w}/">최신 판</a><a href="${K.PAGE}${x.w}/?v=1">첫 발표(제1판)</a><a href="${K.DATA}${x.w}/v${x.ver}.csv" download>CSV</a></li>`).join('');
    const z = K.zeroText(K.cmpSummary(await J(K.DATA + 'compare.json')));
    if (z) document.querySelectorAll('[data-cz="p"]').forEach(el => { el.textContent = z.p; });
    T('press_view', { w: V.w });
  })();
})();
