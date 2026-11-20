/* 장대장 '단지 시세 한눈에' 공용 시트 — 어느 화면에서든 단지 시세를 바로 보여 준다.
   사용: <script src="/jangdaejang-calc/assets/mine-core.js"></script> 다음에 이 파일을 불러오고
         JDJ_PRICE.open({sd:'s00', sgg:'11680', dong:'청담동', apt:'청담4차이-편한세상', band:'84㎡대', jibun:'28-20'(선택)})
   모바일(폭 640px 이하)은 아래에서 올라오는 시트, PC는 가운데 창으로 열린다.
     ① 최근 시세·1년/3년 변동 + 역대·최근 1년 최고가 ② 가격 추이(전체 기간 price/h 가 있으면 매매·전세 두 선 + 1년/3년/5년/전체, 없으면 최근 3년 평당가) ③ 최근 실거래(신고가 배지, 최신 10건, 더보기) ④ '내 집 시세에서 자세히 보기'
   자료: /jangdaejang-data/data/price/{구코드}.json (거래가 1건이라도 있는 모든 단지·평형, 개별 실거래 포함)
         — 아직 없으면 점수용 sNN.json 으로 대신 보여 준다(개별 거래 없이 월별 요약).
   계산은 assets/mine-core.js(JDJ_MINE) 함수를 그대로 쓴다. 다른 화면용 공개 함수: open·close·btn(단추 HTML)·loadSgg·scoreUnits·findUnit·tradesHtml */
(function (root) {
  'use strict';
  const DATA = '/jangdaejang-data/data/';
  const MINE = '/jangdaejang-calc/mine/';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const C = {};                                    // 불러온 자료(약속) 보관
  const get = (k, url, pick) => C[k] || (C[k] = fetch(url, { cache: 'no-cache' }).then(r => { if (!r.ok) throw new Error(url); return r.json(); }).then(pick)
    .catch(e => { delete C[k]; throw e; }));
  const M = () => root.JDJ_MINE || (typeof require === 'function' ? require('./mine-core.js') : null);

  /** index.json (자료 기간 months·구 시계열 sgg) */
  const index = () => get('ix', DATA + 'index.json', j => j);
  /** 점수용 시·도 자료 units (점수·근거는 여기에만 있음) */
  const scoreUnits = sd => get('s' + sd, DATA + sd + '.json', j => j.units || []);
  /** 구 시세 자료 units: price/{구}.json, 없으면 점수용 sNN 에서 그 구만 */
  function loadSgg(sgg, sd) {
    return C['g' + sgg] || (C['g' + sgg] = get('pg' + sgg, DATA + 'price/' + sgg + '.json', j => ({ units: j.units || [], price: true, hist: j.hist || null }))
      .catch(() => {
        if (!sd) throw new Error('no data');
        return scoreUnits(sd).then(us => ({ units: us.filter(u => u[0] === sgg), price: false }));
      }).catch(e => { delete C['g' + sgg]; throw e; }));
  }
  /** 전체 기간 월별 시세 price/h/{구}.json (hist.file). 없거나 못 받으면 null(예전 화면 그대로) */
  function loadHist(g) {
    const f = g && g.hist && g.hist.file; if (!f || !/^price\/h\/\d{5}\.json$/.test(f)) return Promise.resolve(null);
    return get('h' + f, DATA + f, j => j).catch(() => null);
  }
  /** u 의 전체 기간 시세(금액). g = loadSgg 결과, h = loadHist 결과 */
  function histOf(g, h, u) {
    const m = M(); if (!h || !u) return null;
    const row = m.histRow(h, u, g && g.units ? g.units.indexOf(u) : -1, g && g.hist ? g.hist.v : null);
    return row ? m.histSeries(h, row, u[4]) : null;
  }
  const baseName = s => String(s || '').replace(/\s*\([^()]*\d+\s*동[^()]*\)\s*$/, '');
  /** 단지·평형 찾기: 지번까지 맞으면 그것, 아니면 같은 동·이름(괄호 동 표기 차이 허용) 중 거래 많은 것 */
  function findUnit(units, q) {
    const same = u => u[0] === q.sgg && u[1] === q.dong && u[3] === q.band;
    let c = units.filter(u => same(u) && u[2] === q.apt);
    if (!c.length) c = units.filter(u => same(u) && baseName(u[2]) === baseName(q.apt));
    if (q.jibun) { const j = c.find(u => u[8] === q.jibun); if (j) return j; }
    return c.sort((a, b) => b[5] - a[5])[0] || null;
  }

  /* ---------- 개별 거래 표 (mine/ 화면도 같이 씀) ---------- */
  /** u 의 개별 거래 표 HTML. 개별 거래가 없는 자료면 월별 요약으로 대신. opts.show: 처음 보일 건수(기본 10) */
  const FREE_TRADES = 5;                            // 로그인 없이 보여 주는 최근 실거래 건수(카카오 로그인이 켜져 있을 때만 잠금)
  const auth = () => root.JDJ_AUTH && root.JDJ_AUTH.on() ? root.JDJ_AUTH : null;
  const locked = () => { const a = auth(); return !!(a && !a.user()); };
  function tradesHtml(u, months, opts) {
    const m = M(), list = m.trades(u), lock = locked() && list.length > FREE_TRADES;
    const show = lock ? FREE_TRADES : (opts && opts.show) || 10;
    if (!list.length) {
      const md = m.monthDeals(u, months).slice(0, 12);
      if (!md.length) return '<p class="jps-note">최근 3년 거래가 없어요.</p>';
      return `<div class="jps-tbl"><table><thead><tr><th>월</th><th class="n">거래</th><th class="n">평당가</th><th class="n">환산</th></tr></thead><tbody>${md.map(x =>
        `<tr><td>${m.ymLabel(x.at)}</td><td class="n">${x.n}건</td><td class="n">${x.ppy ? x.ppy.toLocaleString() + '만' : '-'}</td><td class="n">${x.price ? m.won(x.price) : '-'}</td></tr>`).join('')}</tbody></table></div>`;
    }
    /* 좁은 화면: 계약일 앞 '20' 을 숨겨(26.10.22) 네 칸이 가로 스크롤 없이 들어가게. 신고가·직거래 표시는 금액 아래 줄 */
    const dt = d => /^20\d\d\./.test(d) ? `<span class="jps-yy">20</span>${esc(d.slice(2))}` : esc(d);
    const row = (t, i) => `<tr${i >= show ? ' class="jps-more" hidden' : ''}><td class="jps-dt">${dt(t.date)}</td><td class="n">${t.area}㎡${t.floor != null ? `<br><small>${t.floor}층</small>` : ''}</td><td class="n"><b>${m.won(t.amt)}</b>${t.hi || t.type === '직거래' ? '<br>' : ''}${t.hi ? '<span class="jps-new" title="그 전까지 같은 평형·같은 전용면적 최고가보다 높은 거래">신고가</span>' : ''}${t.type === '직거래' ? `${t.hi ? ' ' : ''}<small class="jps-dir">직거래</small>` : ''}</td></tr>`;
    return `<div class="jps-tbl"><table><thead><tr><th>계약일</th><th class="n">전용·층</th><th class="n">거래금액</th></tr></thead><tbody>${(lock ? list.slice(0, show) : list).map(row).join('')}</tbody></table></div>`
      + (lock ? auth().gate(`최근 거래 ${show}건을 보여 드렸어요. 나머지 <b>${list.length - show}건</b>과 3년보다 이전 시세는 로그인하면 바로 볼 수 있어요.`, '카카오로 3초 로그인하고 전체 보기', 'trades')
        : list.length > show ? `<button type="button" class="jps-morebtn" data-jps-more>더보기 (${list.length - show}건 더)</button>` : '')
      + `<p class="jps-note">국토교통부 실거래 신고 기준, 해제(취소) 신고 거래는 뺐어요. 직거래는 목록에만 표시하고 시세 계산에서는 빼요.${list.some(t => t.hi) ? ' <span class="jps-new">신고가</span> = 그 전날까지 같은 평형·같은 전용면적에서 가장 높았던 값보다 비싸게 거래된 경우(수집 자료 기준, 직거래 제외).' : ''}</p>`;
  }
  /** 3년보다 이전 연도별 매매 시세: t = histOf 결과(월별 시세), before = 이 연월(YYYYMM)보다 앞만. 로그인 잠금이면 빈 문자열 */
  function pastYearsHtml(t, before) {
    if (!t || !t.months || locked()) return '';
    const by = {};
    t.months.forEach((ym, i) => { if (ym >= before) return; const y = ym.slice(0, 4), v = t.s[i], j = t.j ? t.j[i] : 0; const o = by[y] || (by[y] = { s: [], j: [] }); if (v > 0) o.s.push(v); if (j > 0) o.j.push(j); });
    const avg = a => a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length / 100) * 100 : 0;
    const ys = Object.keys(by).filter(y => by[y].s.length).sort().reverse();
    if (!ys.length) return '';
    const m = M();
    return `<details class="jps-past"><summary>3년보다 이전 시세 보기 (연도별, ${ys[ys.length - 1]}~${ys[0]}년)</summary><div class="jps-tbl"><table><thead><tr><th>연도</th><th class="n">매매 시세</th><th class="n">전세 시세</th></tr></thead><tbody>`
      + ys.map(y => `<tr><td class="jps-dt">${y}년<br><small>${by[y].s.length}개월</small></td><td class="n"><b>${tv(m.won(avg(by[y].s)))}</b></td><td class="n">${by[y].j.length ? tv(m.won(avg(by[y].j))) : '-'}</td></tr>`).join('')
      + `</tbody></table></div><p class="jps-note">국토교통부 실거래 월별 시세(그 달까지 3개월 중앙값 × 전용면적)를 연도마다 평균 낸 값이에요(연도 아래 숫자 = 시세가 있는 달 수). 개별 거래 목록은 최근 3년치만 있어요.</p></details>`;
  }
  /** tradesHtml 의 '더보기' 단추 연결 */
  function wireMore(box) {
    box.querySelectorAll('[data-jps-more]').forEach(b => b.onclick = () => {
      const t = b.previousElementSibling, rest = [...t.querySelectorAll('tr.jps-more')];
      rest.slice(0, 20).forEach(r => { r.hidden = false; r.classList.remove('jps-more'); });
      const left = rest.length - 20;
      if (left > 0) b.textContent = `더보기 (${left}건 더)`; else b.remove();
    });
  }

  /* ---------- 작은 차트 ---------- */
  /** 값 선 그리기: 실제 값이 있는 달끼리는 실선, 거래 없는 구간은 앞뒤 실제 값을 옅은 점선으로 잇기만(사이 달 값·툴팁 없음).
      a = 값 배열(0 = 거래 없음), x·y = 좌표 함수, c = 색, w = 굵기 */
  function linePaths(a, x, y, c, w) {
    const p = M().lineParts(a), pt = i => x(i).toFixed(1) + ' ' + y(a[i]).toFixed(1);
    const sd = p.solid.map(g => g.map((i, k) => (k ? 'L' : 'M') + pt(i)).join('')).join('');
    const gd = p.gaps.map(g => 'M' + pt(g[0]) + 'L' + pt(g[1])).join('');
    return (gd ? `<path d="${gd}" fill="none" stroke="${c}" stroke-opacity=".45" stroke-width="${Math.max(1.4, w - 0.8)}" stroke-dasharray="3 4" stroke-linecap="round" class="gap"/>` : '')
      + (sd ? `<path d="${sd}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linejoin="round"/>` : '');
  }
  const SPARSE = '<p class="jps-note jps-sp">거래가 드문 단지라 추이는 참고로 봐 주세요</p>';
  function miniChart(u, sgg, months, W) {
    const m = M(), n = months.length, me = u[6] || [], gs = (sgg && sgg.s) || [];
    W = Math.max(260, Math.round(W || 480)); const H = 170, L = 48, R = 10, T = 12, B = 22;
    const vals = me.concat(gs).filter(v => v > 0);
    if (!vals.length) return '<p class="jps-note">차트로 보여 드릴 거래가 없어요.</p>';
    let lo = Math.min(...vals), hi = Math.max(...vals); const pad = (hi - lo) * 0.12 || hi * 0.05; lo = Math.max(0, lo - pad); hi += pad;
    const x = i => L + (n === 1 ? 0 : i * (W - L - R) / (n - 1)), y = v => T + (hi - v) / (hi - lo) * (H - T - B);
    const path = a => { let d = '', on = false; a.forEach((v, i) => { if (v > 0) { d += (on ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1); on = true; } else on = false; }); return d; };
    const ticks = [lo, (lo + hi) / 2, hi].map(v => `<line x1="${L}" x2="${W - R}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}" stroke="#E5E8EB"/><text x="${L - 5}" y="${(y(v) + 4).toFixed(1)}" font-size="12" fill="#4E5968" text-anchor="end">${Math.round(v).toLocaleString()}</text>`).join('');
    const dots = me.map((v, i) => v > 0 ? `<circle cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="2.4" fill="#2F6BFF"><title>${m.ymLabel(months[i])} ${v.toLocaleString()}만/3.3㎡</title></circle>` : '').join('');
    const xl = [0, Math.floor((n - 1) / 2), n - 1].map((i, k) => `<text x="${x(i).toFixed(1)}" y="${H - 5}" font-size="12" fill="#4E5968" text-anchor="${k === 0 ? 'start' : k === 2 ? 'end' : 'middle'}">${m.ymLabel(months[i])}</text>`).join('');
    return `${m.isSparse(me) ? SPARSE : ''}<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="월별 평당가 추이">${ticks}<path d="${path(gs)}" fill="none" stroke="#8B95A1" stroke-width="1.8" stroke-dasharray="5 3"/>${linePaths(me, x, y, '#2F6BFF', 2.4)}${dots}${xl}</svg>`;
  }

  /* ---------- 공용 추이 차트: 그리기 + 안내선(세로선·점·말풍선, 호갱노노처럼) ----------
     sp = {months, lines:[{a, c, w}], fmtY, h(본 그래프 높이), L(왼쪽 여백), fs(글자), xLab(연월 → 글자),
           sub:{a, c, label, fmt}(아래 얇은 보조 그래프 — 같은 세로선 공유, 평균 점선), tip(i) → 말풍선 내용, empty, min, aria}
     plot() 은 SVG 문자열과 좌표(model)를 돌려주고, mount() 가 el 에 넣고 안내선을 연결한다 */
  const eok = v => v >= 10000 ? (Math.round(v / 1000) / 10).toString().replace(/\.0$/, '') + '억' : Math.round(v).toLocaleString() + '만';
  function plot(sp, W) {
    const m = M(), fs = sp.fs || 12.5, months = sp.months || [], n = months.length;
    W = Math.max(260, Math.round(W || 480));
    const L = sp.L || 54, R = 12, T = 12, B = 24, PH = (sp.h || 190) - T - B;
    const vals = [].concat(...sp.lines.map(l => l.a)).filter(v => v > 0);
    if (vals.length < (sp.min == null ? 2 : sp.min)) return { html: `<p class="jps-note">${sp.empty || '차트로 보여 드릴 거래가 없어요.'}</p>` };
    let lo = Math.min(...vals), hi = Math.max(...vals); const pad = (hi - lo) * (sp.pad || 0.1) || hi * 0.05; lo = Math.max(0, lo - pad); hi += pad;
    const sv = sp.sub && sp.sub.a ? sp.sub.a.filter(v => v > 0) : [], sub = sv.length ? sp.sub : null;
    const SG = sub ? 14 : 0, SH = sub ? (sp.subH || 44) : 0, H = T + PH + SG + SH + B, s0 = T + PH + SG;
    const x = i => L + (n === 1 ? 0 : i * (W - L - R) / (n - 1)), y = v => T + (hi - v) / (hi - lo) * PH;
    const fmtY = sp.fmtY || eok, live = !!sp.tip;
    const grid = [lo, (lo + hi) / 2, hi].map(v => `<line x1="${L}" x2="${W - R}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}" stroke="#E5E8EB"/><text x="${L - 5}" y="${(y(v) + 4).toFixed(1)}" font-size="${fs}" fill="#4E5968" text-anchor="end">${fmtY(v)}</text>`).join('');
    /* 실제 값이 있는 달의 작은 점: 기간이 짧으면(5년 이하) 모든 달, 길면 거래 공백 앞뒤·외딴 달만 */
    const dots = (a, c, yy) => a.map((v, i) => v > 0 && (n <= 60 || !(a[i - 1] > 0) || !(a[i + 1] > 0)) ? `<circle cx="${x(i).toFixed(1)}" cy="${yy(v).toFixed(1)}" r="${n <= 60 ? 2 : 2.2}" fill="${c}"/>` : '').join('');
    const last = (a, c) => { for (let i = a.length - 1; i >= 0; i--) if (a[i] > 0) return `<circle cx="${x(i).toFixed(1)}" cy="${y(a[i]).toFixed(1)}" r="4" fill="${c}">${live ? '' : `<title>${m.ymLabel(months[i])} ${fmtY(a[i])}</title>`}</circle>`; return ''; };
    const pts = sp.lines.map(l => ({ a: l.a, c: l.c, y }));
    let subSvg = '';
    if (sub) {
      let a = Math.min(...sv), b = Math.max(...sv); const p2 = (b - a) * 0.15 || 2; a -= p2; b += p2;
      const y2 = v => s0 + (b - v) / (b - a) * SH, avg = sv.reduce((q, v) => q + v, 0) / sv.length, f2 = sub.fmt || (v => Math.round(v) + '%');
      subSvg = `<rect x="${L}" y="${s0}" width="${W - L - R}" height="${SH}" fill="#F7F8FA" rx="4"/>`
        + `<line x1="${L}" x2="${W - R}" y1="${y2(avg).toFixed(1)}" y2="${y2(avg).toFixed(1)}" stroke="${sub.c}" stroke-opacity=".7" stroke-dasharray="4 3"/>`
        + `<text x="${W - R - 4}" y="${(s0 + 12).toFixed(1)}" font-size="${fs - 1}" fill="#4E5968" text-anchor="end">평균 ${f2(avg)}</text>`
        + `<text x="${L - 5}" y="${(s0 + SH / 2 - 2).toFixed(1)}" font-size="${fs - 1}" fill="#4E5968" text-anchor="end">${esc(sub.label || '')}</text>`
        + `<text x="${L - 5}" y="${(s0 + SH / 2 + fs - 1).toFixed(1)}" font-size="${fs - 1}" fill="#4E5968" text-anchor="end">${f2(sv[sv.length - 1])}</text>`
        + linePaths(sub.a, x, y2, sub.c, 1.8);
      pts.push({ a: sub.a, c: sub.c, y: y2 });
    }
    const xLab = sp.xLab || ((ym, short) => n > 36 ? (short ? "'" + String(ym).slice(2, 4) + '년' : String(ym).slice(0, 4) + '년') : short ? "'" + String(ym).slice(2, 4) + '.' + String(ym).slice(4, 6) : m.ymLabel(ym));
    const xl = m.xTicks(n, W - L - R, fs, x, months, (ym, short) => xLab(ym, short)).map(t => `<text x="${t.x.toFixed(1)}" y="${H - 5}" font-size="${fs}" fill="#4E5968" text-anchor="${t.a}">${t.t}</text>`).join('');
    const over = live ? `<g class="jhv-o" style="display:none" pointer-events="none"><line x1="0" x2="0" y1="${T - 4}" y2="${s0 + SH}" stroke="#4E5968" stroke-opacity=".7" stroke-width="1" stroke-dasharray="3 3" shape-rendering="crispEdges"/>${pts.map(p => `<circle r="4.2" stroke="#fff" stroke-width="2" fill="${p.c}"/>`).join('')}</g>` : '';
    /* dash = 비교선(구 전체 등): 회색 점선 한 줄, 점·끝점 없음 */
    const dashP = l => { let d = '', on = false; l.a.forEach((v, i) => { if (v > 0) { d += (on ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1); on = true; } else on = false; });
      return d ? `<path d="${d}" fill="none" stroke="${l.c}" stroke-width="${l.w || 1.8}" stroke-dasharray="5 3" class="cmp"/>` : ''; };
    const svg = `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="${esc(sp.aria || '추이 그래프')}">${grid}${sp.lines.map(l => l.dash ? dashP(l) : `${linePaths(l.a, x, y, l.c, l.w)}${dots(l.a, l.c, y)}${last(l.a, l.c)}`).join('')}${subSvg}${xl}${over}</svg>`;
    return { html: svg, model: { W, H, L, R, n, x, pts, top: T, months } };
  }
  /** 말풍선 내용 만들기(공용). o = {months, rows:[{k, sk(요약 줄용 짧은 이름), a, c, fmt, ex}], gap:[매매 a, 전세 a] (선택), cnt: Map(연월 → 건수, 선택), cntK: '매매',
      vs: {a: 이 단지, b: 구 전체} (선택 — 두 값이 모두 그 달 실제 값일 때만 '이 단지가 ○% 높아요/낮아요')}
      각 줄: 실제 값 → 금액, 거래 없는 점선 구간 → '약 …' + '거래 없음(앞뒤 거래로 이은 값)', 자료 밖 → '거래 없음' */
  function tipFn(o) {
    const m = M(), fm = o.fmt || m.won;
    return i => {
      const ym = o.months[i], out = { head: m.ymLabel(ym), rows: [], extra: [], gapOn: !!o.gap, vsOn: !!o.vs, cntOn: !!o.cnt, cntK: o.cntK || '' }, say = [out.head];
      o.rows.forEach(r => {
        const p = m.valAt(r.a, i), f = r.fmt || fm;
        let v, fill = false;
        if (!p) { const k = r.a.findIndex(x => x > 0); v = k > i ? `자료 없음(${m.ymLabel(o.months[k])}부터)` : '최근 거래 없음'; }
        else if (p.real) v = f(p.v) + (r.ex ? r.ex(i) : '');
        else { v = '약 ' + f(r.fmt ? p.v : m.r100(p.v)); fill = true; }
        out.rows.push({ k: r.k, sk: r.sk, c: r.c, v, fill, none: !p });
        say.push(`${r.k} ${fill ? v + '(거래 없음, 앞뒤 거래로 이은 값)' : v}`);
      });
      if (o.gap) {
        const s = m.valAt(o.gap[0], i), j = m.valAt(o.gap[1], i), g = s && j && s.real && j.real ? m.gapOf(s.v, j.v) : null;
        if (g) {
          out.gap = { v: fm(g.gap), pct: Math.round(g.pct * 100), jr: Math.round(g.jr * 100) };
          say.push(`갭 ${out.gap.v}, 매매가의 ${out.gap.pct}%`, `전세가율 ${out.gap.jr}%`);
        }
      }
      if (o.vs) {
        const p = m.valAt(o.vs.a, i), q = m.valAt(o.vs.b, i), c = p && q && p.real && q.real ? m.vsSgg(p.v, q.v) : null;
        if (c) { out.vs = { pct: Math.round(c.pct * 100), txt: c.txt }; say.push(c.txt); }
      }
      const fl = out.rows.filter(r => r.fill).map(r => r.sk || r.k);
      if (fl.length) out.extra.push(`${fl.join('·')} 거래 없음 — 앞뒤 거래로 이은 값이에요`);
      if (o.cnt && o.cnt.has(ym)) { const c = o.cnt.get(ym); out.cnt = c; const t = c ? `이 달 ${o.cntK || '매매'} 신고 ${c}건` : `이 달 ${o.cntK || '매매'} 신고 없음 · 값은 앞 3개월 거래 기준`; out.extra.push(t); say.push(t); }
      out.say = say.join(', ');
      return out;
    };
  }
  /** 전체 기간 매매·전세(histSeries 결과)용 말풍선. cnt = Map(연월 → 매매 건수) 선택 */
  function histTip(t, cnt, gu) {
    const rows = [{ k: '매매', a: t.s, c: '#2F6BFF' }], two = t.j.some(v => v > 0);
    if (two) rows.push({ k: '전세', a: t.j, c: '#14A06B' });
    if (gu) rows.push({ k: `${gu.name} 전체(같은 면적 환산)`, sk: `${gu.name} 전체`, a: gu.a, c: GRAY });
    return tipFn({ months: t.months, rows, gap: two ? [t.s, t.j] : null, cnt, vs: gu ? { a: t.s, b: gu.a } : null });
  }
  /** 최근 3년 월별 매매 건수(u[7]) → Map(연월 → 건수) */
  function cntMap(u, months) {
    const c = M().counts(u && u[7]), mp = new Map();
    (months || []).forEach((ym, i) => { if (i < c.length) mp.set(ym, c[i]); });
    return mp;
  }
  const GRAY = '#8B95A1';
  /* 값 칸(그래프 위 고정, /ask/ 단지 비교와 같은 방식): 날짜 1줄 + [색 점 · 이름 … 값(오른쪽 정렬, 굵게)] 한 줄씩.
     평소엔 가장 최근 달, 그래프를 움직이거나 누르면 그 달. 줄 구성은 달마다 바뀌지 않게(높이 고정) 값이 없으면 '-'·'거래 없음' */
  const tv = v => String(v).replace(/억원$/, '억').replace(/만원$/, '만');
  const rRow = (c, k, v, cls) => `<div class="r${cls ? ' ' + cls : ''}"><span><i${c ? ` style="background:${c}"` : ' class="o"'}></i>${esc(k)}</span><b>${v}</b></div>`;
  const NA = '<small>-</small>';
  const rdHtml = (o, latest, fillOn) => {
    const rs = o.rows.map(r => r.none ? rRow(r.c, r.sk || r.k, `<small>${/^자료 없음/.test(r.v) ? '자료 없음' : '거래 없음'}</small>`, 'f')
      : rRow(r.c, r.sk || r.k, esc(tv(r.v)), r.fill ? 'f' : ''));
    if (o.gapOn) { const g = o.gap; rs.push(rRow('', '갭', g ? esc(tv(g.v)) : NA), rRow('', '갭 비율', g ? g.pct + '%' : NA), rRow('', '전세가율', g ? g.jr + '%' : NA)); }
    if (o.cntOn || o.cnt != null) rs.push(rRow('', `거래${o.cntK ? '(' + o.cntK + ')' : ''}`, o.cnt == null ? NA : o.cnt ? o.cnt + '건' : '<small>없음</small>', o.cnt ? '' : 'f'));
    return `<div class="d">${esc(o.head)}${latest ? '<small>가장 최근 · 그래프를 누르면 그 달 값</small>' : ''}</div><div class="t">${rs.join('')}</div>`
      + (o.vsOn ? `<div class="g"><span>비교</span><span>${o.vs ? esc(o.vs.txt) : '-'}</span></div>` : '')
      + (fillOn ? `<div class="x"${o.rows.some(r => r.fill) ? '' : ' style="visibility:hidden"'}>약 = 거래 없는 달(앞뒤 거래로 이은 값)</div>` : '');
  };
  /** el 에 차트를 그리고 안내선 연결. 반환: plot 결과 */
  function mount(el, sp) {
    if (!el) return null;
    const r = plot(sp, el.clientWidth || 480);
    if (!r.model || !sp.tip) { el.innerHTML = (sp.pre || '') + r.html; return r; }
    el.innerHTML = `${sp.pre || ''}<div class="jhv" tabindex="0" role="group" aria-roledescription="차트" aria-label="${esc((sp.aria || '추이 그래프') + ' — 왼쪽·오른쪽 화살표 키로 달을 옮기며 값을 들을 수 있어요')}">`
      + `<div class="jhv-rd" aria-hidden="true"></div><div class="jhv-in">${r.html}</div><div class="jhv-sr" aria-live="polite"></div></div>`;
    wire(el.querySelector('.jhv'), r.model, sp.tip);
    return r;
  }
  function wire(box, md, tip) {
    const inr = box.querySelector('.jhv-in'), svg = inr.querySelector('svg'), g = svg.querySelector('.jhv-o'), ln = g.querySelector('line'),
      cs = [...g.querySelectorAll('circle')], rd = box.querySelector('.jhv-rd'), sr = box.querySelector('.jhv-sr'), m = M();
    let lastI = md.n - 1; while (lastI > 0 && !md.pts.some(p => p.a[lastI] > 0)) lastI--;
    let fillOn = false; for (let i = 0; i < md.n && !fillOn; i++) fillOn = tip(i).rows.some(r => r.fill);   // '약' 안내 줄 자리를 미리 잡아 높이가 달마다 바뀌지 않게
    let cur = -1, pin = false, touch = null, raf = 0, want = -1, pt = 'mouse', fade = 0;
    const idle = () => { const o = tip(lastI); rd.innerHTML = rdHtml(o, true, fillOn); box._say = o.say; };
    const show = i => {
      i = Math.max(0, Math.min(md.n - 1, i)); if (i === cur) return; cur = i;
      const x = md.x(i).toFixed(1); g.style.display = ''; ln.setAttribute('x1', x); ln.setAttribute('x2', x);
      cs.forEach((c, k) => { const p = md.pts[k], v = p.raw ? (p.a[i] > 0 ? { v: p.a[i], real: true } : null) : m.valAt(p.a, i);
        if (!v) { c.style.display = 'none'; return; }
        c.style.display = ''; c.setAttribute('cx', x); c.setAttribute('cy', p.y(v.v).toFixed(1)); c.setAttribute('fill', v.real ? p.c : '#fff'); c.setAttribute('stroke', v.real ? '#fff' : p.c); });
      const o = tip(i); rd.innerHTML = rdHtml(o, false, fillOn); box._say = o.say;
    };
    const hide = () => { clearTimeout(fade); fade = 0; cur = -1; pin = false; box.classList.remove('pin'); g.style.display = 'none'; idle(); };
    const say = () => { if (box._say) sr.textContent = box._say; };
    const at = cx => { const r = svg.getBoundingClientRect(), vx = (cx - r.left) * md.W / (r.width || 1); return md.ix ? md.ix(vx) : Math.round((vx - md.L) / (md.W - md.L - md.R) * (md.n - 1)); };
    const later = i => { want = i; if (!raf) raf = requestAnimationFrame(() => { raf = 0; show(want); }); };
    const setPin = v => { pin = v; box.classList.toggle('pin', v); };
    inr.addEventListener('pointerdown', e => {
      pt = e.pointerType || 'mouse'; if (pt === 'mouse') return;
      clearTimeout(fade); touch = true; show(at(e.clientX));
    });
    inr.addEventListener('pointermove', e => {
      if (e.pointerType === 'mouse') { if (!pin) later(at(e.clientX)); return; }
      if (touch) later(at(e.clientX));
    });
    /* 모바일: 손가락을 떼면 1.5초 뒤 가장 최근 달로 */
    inr.addEventListener('pointerup', e => { if (e.pointerType === 'mouse' || !touch) return; touch = null; say(); clearTimeout(fade); fade = setTimeout(hide, 1500); });
    /* 세로로 문지르면 브라우저가 스크롤로 가져가며 pointercancel — 스크롤을 막지 않고 1.5초 뒤 되돌림 */
    inr.addEventListener('pointercancel', () => { if (!touch) return; touch = null; clearTimeout(fade); fade = setTimeout(hide, 1500); });
    inr.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse' && !pin) hide(); });
    inr.addEventListener('click', e => { if (pt !== 'mouse' || touch) return;
      if (pin) { setPin(false); cur = -1; show(at(e.clientX)); } else { show(at(e.clientX)); setPin(true); say(); } });
    box.addEventListener('keydown', e => {
      const k = e.key, base = cur < 0 ? lastI : cur;
      if (k === 'ArrowLeft' || k === 'ArrowRight' || k === 'Home' || k === 'End') {
        e.preventDefault(); show(k === 'ArrowLeft' ? (cur < 0 ? lastI : base - 1) : k === 'ArrowRight' ? (cur < 0 ? lastI : base + 1) : k === 'Home' ? 0 : md.n - 1); setPin(true); say();
      } else if (k === 'Escape' && cur >= 0) { e.preventDefault(); hide(); }
    });
    box.addEventListener('focusout', e => { if (!box.contains(e.relatedTarget)) hide(); });
    box._jhvHide = hide; box._md = md;
    idle();
  }
  /* 차트 바깥을 누르면 고정된 안내선 풀기 (차트마다 문서 이벤트를 달지 않도록 한 번만) */
  if (typeof document !== 'undefined' && document.addEventListener) document.addEventListener('pointerdown', e => {
    document.querySelectorAll('.jhv.pin').forEach(b => { if (!b.contains(e.target) && b._jhvHide) b._jhvHide(); });
  }, true);

  /* ---------- 전체 기간 차트: 매매·전세 두 선(금액) 또는 전세가율 ---------- */
  /** t = histSeries(또는 histWindow) 결과 → plot 설명서. opts.jr = 전세가율 선만, opts.fs = 글자 크기, opts.h = 높이,
      opts.sub = 아래에 전세가율 보조 그래프, opts.tip = 안내선 연결(mountHist), opts.cnt = Map(연월 → 매매 건수),
      opts.sparse = 거래가 드문 단지 안내 한 줄(기간 단추와 무관하게 전체 자료로 판단해 넘겨 줌),
      opts.gu = {name, s, months, area} 구 전체 비교선(guOf: price/h sgg 전체 기간, 없으면 index.json sgg[].s·months 를 이 평형 전용면적으로 환산, 회색 점선 — t 의 달에 맞춰 자르므로 기간 단추와 함께 움직임) */
  function histSpec(t, opts) {
    opts = opts || {};
    if (opts.jr && t) { const k = t.jr.findIndex(v => v > 0); if (k > 0) t = Object.assign({}, t, { months: t.months.slice(k), jr: t.jr.slice(k), s: t.s.slice(k), j: t.j.slice(k) }); }   // 전세가율은 전세 자료가 있는 달부터
    const jr = t.jr.map(v => v * 100);
    const sp = { months: t.months, fs: opts.fs || 12.5, h: opts.h || 190, L: opts.jr ? 44 : 54, min: 2,
      lines: opts.jr ? [{ a: jr, c: '#0E7A4F', w: 2.4 }] : [{ a: t.j, c: '#14A06B', w: 2.2 }, { a: t.s, c: '#2F6BFF', w: 2.6 }],
      fmtY: opts.jr ? (v => Math.round(v) + '%') : eok, aria: opts.jr ? '전세가율 추이' : '매매·전세 시세 추이',
      empty: opts.jr ? '전세가율을 계산할 달(매매·전세 거래가 모두 있는 달)이 적어요.' : '차트로 보여 드릴 거래가 없어요.',
      pre: opts.sparse ? SPARSE : '' };
    let gu = null;
    if (opts.gu && !opts.jr) { const a = M().sggLine(opts.gu.s, opts.gu.months, t.months, opts.gu.area); if (a.some(v => v > 0)) { gu = { name: opts.gu.name || '구', a }; sp.lines.unshift({ a, c: GRAY, w: 1.8, dash: true }); } }
    if (opts.sub && !opts.jr && jr.some(v => v > 0)) sp.sub = { a: jr, c: '#0E7A4F', label: '전세가율' };
    if (opts.tip) sp.tip = opts.jr ? tipFn({ months: t.months, rows: [{ k: '전세가율', a: jr, c: '#0E7A4F', fmt: v => Math.round(v) + '%' }] }) : histTip(t, opts.cnt, gu);
    return sp;
  }
  /** 구 전체 비교선 자료 {name, s, months, area}: price/h/{구}.json 의 sgg(전체 기간, 기준 달 hm)가 있으면 그것,
      없으면 index.json sgg[].s·months(최근 3년)로 대신. 값이 하나도 없으면 null */
  function guOf(h, sgg, ixMonths, area, name) {
    const m = M(), nm = name || (sgg && sgg.name) || '구';
    if (h && Array.isArray(h.sgg) && h.sgg.length > 1 && h.hm) {
      const mp = m.decodeSeries(h.sgg, h.hm);
      if (mp.size) {
        const ks = [...mp.keys()].sort(), to = h.to && h.to > ks[ks.length - 1] ? h.to : ks[ks.length - 1], months = [];
        for (let ym = ks[0]; ym <= to; ym = m.ymAdd(ym, 1)) months.push(ym);
        return { name: nm, s: months.map(ym => mp.get(ym) || 0), months, area };
      }
    }
    return sgg && sgg.s && sgg.s.some(v => v > 0) && ixMonths ? { name: nm, s: sgg.s, months: ixMonths, area } : null;
  }
  /** 구 전체 비교선 설명 한 줄. gu = histSpec opts.gu, shown = 보이는 첫 달(그보다 구 자료가 늦게 시작하면 시작 달 안내) */
  function guNote(gu, shown) {
    if (!gu || !gu.s || !gu.months || !gu.months.length) return '';
    const m = M(), k = gu.s.findIndex(v => v > 0), from = k >= 0 ? gu.months[k] : '';
    return `회색 점선 = ${gu.name} 안 모든 아파트의 3개월 실거래 평당가 중앙값 × 이 평형 전용 ${gu.area}㎡ ÷ 3.3058(같은 면적이면 ${gu.name} 아파트 시세가 얼마인지).${from && (!shown || shown < from) ? ` ${gu.name} 전체 자료는 ${m.ymKo(from)}부터 있어요.` : ''}`;
  }
  /* ---------- 예비 차트: 최근 3년 평당가(전체 기간 자료가 없을 때) — 같은 안내선·말풍선 ----------
     t = JDJ_MINE.trend 결과 {months, ppy, sgg, cnt}, opts = {name(구 이름), h, fs, sparse} */
  const ppyFmt = v => Math.round(v).toLocaleString() + '만';
  function ppySpec(t, opts) {
    opts = opts || {};
    const nm = opts.name || '구', has = (t.sgg || []).some(v => v > 0), cnt = new Map();
    t.months.forEach((ym, i) => { if (t.cnt && i < t.cnt.length) cnt.set(ym, t.cnt[i] || 0); });
    const rows = [{ k: '이 단지 평당가', sk: '이 단지', a: t.ppy, c: '#2F6BFF', fmt: ppyFmt }];
    if (has) rows.push({ k: `${nm} 전체 평당가`, sk: `${nm} 전체`, a: t.sgg, c: GRAY, fmt: ppyFmt });
    return { months: t.months, fs: opts.fs || 12.5, h: opts.h || 190, L: opts.L || 54, min: 1, pad: 0.12,
      lines: (has ? [{ a: t.sgg, c: GRAY, w: 2, dash: true }] : []).concat([{ a: t.ppy, c: '#2F6BFF', w: 2.5 }]),
      fmtY: v => Math.round(v).toLocaleString(), aria: '월별 평당가 추이(만원/3.3㎡)', empty: '이 기간에 거래가 없어요.', pre: opts.sparse ? SPARSE : '',
      tip: tipFn({ months: t.months, rows, cnt, vs: has ? { a: t.ppy, b: t.sgg } : null }) };
  }
  /** el 에 예비 평당가 차트 + 안내선 */
  function mountPpy(el, t, opts) { return mount(el, ppySpec(t, opts));
  }
  /** SVG 문자열만(예전 방식, 안내선 없음) */
  function histChart(t, W, opts) {
    const sp = histSpec(t, Object.assign({}, opts, { tip: false })), r = plot(sp, W);
    return (r.model ? sp.pre : '') + r.html;
  }
  /** el 에 전체 기간 차트 + 안내선(세로선·말풍선·전세가율 보조 그래프) */
  function mountHist(el, t, opts) { return mount(el, histSpec(t, Object.assign({ tip: true }, opts))); }
  /** 월별 막대(거래 건수 등) + 같은 안내선·작은 말풍선. o = {months, a, c, h, L, fs, k(말풍선 이름), unit('건'), aria} */
  function mountBars(el, o) {
    if (!el) return null;
    const m = M(), months = o.months || [], a = o.a || [], n = a.length, W = Math.max(280, Math.round(el.clientWidth || 600)), fs = o.fs || 13.5;
    const H = o.h || 160, L = o.L || 56, R = 12, T = 12, B = 26, mx = Math.max(1, ...a), st = Math.max(1, Math.ceil(mx / 3)), top = st * Math.ceil(mx / st);
    const y = v => T + (top - v) / top * (H - T - B), slot = (W - L - R) / Math.max(1, n), bw = Math.max(2, slot * 0.66), x = i => L + i * slot + slot / 2, c = o.c || '#9DB8FF', u = o.unit || '건';
    let grid = ''; for (let v = 0; v <= top; v += st) grid += `<line x1="${L}" x2="${W - R}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}" stroke="#E5E8EB"/><text x="${L - 6}" y="${(y(v) + 4).toFixed(1)}" font-size="${fs}" fill="#4E5968" text-anchor="end">${v}</text>`;
    const bars = a.map((v, i) => v > 0 ? `<rect x="${(x(i) - bw / 2).toFixed(1)}" y="${y(v).toFixed(1)}" width="${bw.toFixed(1)}" height="${(y(0) - y(v)).toFixed(1)}" rx="2" fill="${c}"/>` : '').join('');
    const xl = m.xTicks(n, W - L - R, fs, x, months).map(t => `<text x="${t.x.toFixed(1)}" y="${H - 6}" font-size="${fs}" fill="#4E5968" text-anchor="${t.a}">${t.t}</text>`).join('');
    const over = `<g class="jhv-o" style="display:none" pointer-events="none"><line x1="0" x2="0" y1="${T - 4}" y2="${H - B}" stroke="#4E5968" stroke-opacity=".7" stroke-width="1" stroke-dasharray="3 3" shape-rendering="crispEdges"/><circle r="4.2" stroke="#fff" stroke-width="2" fill="#2F6BFF"/></g>`;
    const aria = o.aria || '월별 거래 건수';
    el.innerHTML = `<div class="jhv" tabindex="0" role="group" aria-roledescription="차트" aria-label="${esc(aria + ' — 왼쪽·오른쪽 화살표 키로 달을 옮기며 값을 들을 수 있어요')}"><div class="jhv-rd" aria-hidden="true"></div>`
      + `<div class="jhv-in"><svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="${esc(aria)}">${grid}${bars}${xl}${over}</svg></div><div class="jhv-sr" aria-live="polite"></div></div>`;
    const k = o.k || '거래', tip = i => { const v = a[i] || 0, head = m.ymLabel(months[i]);
      return { head, rows: [{ k, c: '#2F6BFF', v: v ? v + u : '거래 없음', none: !v }], extra: [], say: `${head}, ${k} ${v ? v + u : '없음'}` }; };
    const md = { W, H, L, R, n, x, top: T, months, pts: [{ a, c: '#2F6BFF', y, raw: true }], ix: vx => Math.floor((vx - L) / slot) };
    wire(el.querySelector('.jhv'), md, tip);
    return { model: md };
  }
  /** 기간 단추 HTML (data-hspan) */
  const spanBtns = (t, cur, cls) => `<div class="${cls || 'jps-seg'}" role="group" aria-label="기간">${M().histSpans(t).map(b => `<button type="button" data-hspan="${b.span}" class="${b.span === cur ? 'on' : ''}" aria-pressed="${b.span === cur}">${b.label}</button>`).join('')}</div>`;
  /** 차트 아래 자료 기간 문구: 수집 시작 달(cover)을 실제 값으로 */
  function histNote(hist, t) {
    const m = M(), a = hist && (hist.cover || hist.hm), b = hist && (hist.rcover || hist.rm);
    return `${a ? `매매 ${m.ymKo(a)}부터` : ''}${b ? ` · 전세 ${m.ymKo(b)}부터` : ''} 국토교통부 실거래 자료${t && t.from && a && t.from > a ? ` · 이 평형 첫 매매 시세 ${m.ymKo(t.from)}` : ''}. 각 달 값 = 그 달까지 3개월 실거래 평당가 중앙값 × 전용면적 ÷ 3.3058(전세는 월세 없는 순수 전세만). 거래가 없던 기간은 점선으로 이어 표시해요.`;
  }
  /** 최고가 요약 상자 HTML (역대·최근 1년). h = M().highs 결과 */
  function highsHtml(h, cls) {
    if (!h || !h.hi) return '';
    const m = M(), vs = v => v == null ? '' : Math.abs(v) < 0.0005 ? ' · 최근 시세와 같아요' : ` · 최근 시세는 이보다 <b class="${v < 0 ? 'dn' : 'up'}">${(Math.abs(v) * 100).toFixed(1)}% ${v < 0 ? '낮아요' : '높아요'}</b>`;
    const box = (k, x, extra) => x ? `<div><div class="k">${esc(k)}</div><div class="v">${m.won(x.amt)}</div><div class="d">${m.ymLabel(x.at)} · 전용 ${x.area}㎡${vs(x.vs)}${extra ? '<br>' + esc(extra) : ''}</div></div>` : '';
    return `<div class="${cls || 'jps-hi'}">${box(h.label, h.hi, h.note)}${box('최근 1년 최고가', h.hi1)}</div>`;
  }

  /* ---------- 시트 ---------- */
  const CSS = `.jps-ov{position:fixed;inset:0;background:rgba(17,24,39,.45);z-index:9000;display:flex;align-items:center;justify-content:center;padding:20px}
.jps{background:#fff;color:#191F28;border-radius:20px;width:100%;max-width:560px;max-height:88vh;overflow:auto;-webkit-overflow-scrolling:touch;box-shadow:0 10px 40px rgba(0,0,0,.2);font-family:inherit;box-sizing:border-box}
.jps *{box-sizing:border-box}
.jps-h{position:sticky;top:0;background:#fff;display:flex;justify-content:space-between;align-items:flex-start;gap:10px;padding:16px 18px 10px;border-bottom:1px solid #F2F4F6;z-index:1}
.jps-h b{font-size:18px;font-weight:900;line-height:1.35;word-break:keep-all}
.jps-h small{display:block;font-size:13.5px;color:#4E5968}
.jps-x{flex:none;font:inherit;font-size:22px;line-height:1;width:44px;height:44px;border:0;border-radius:12px;background:#F2F4F6;color:#3E4754;cursor:pointer}
.jps-b{padding:12px 18px 20px}
.jps-st{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:4px 0 8px}
.jps-st>div{background:#F2F4F6;border-radius:12px;padding:9px 10px;min-width:0}
.jps-st>div:first-child{background:#E8F0FF}
.jps-st .k{font-size:13px;color:#4E5968;font-weight:700}
.jps-st .v{font-size:17px;font-weight:900;letter-spacing:-.3px;word-break:keep-all}
.jps-st .d{font-size:12.5px;color:#4E5968}
.jps h4{font-size:16px;font-weight:900;margin:16px 0 6px}
.jps-lg{display:flex;gap:12px;flex-wrap:wrap;font-size:13px;color:#4E5968}
.jps-lg i{display:inline-block;width:16px;height:3px;background:#2F6BFF;vertical-align:middle;margin-right:4px}
.jps-lg i.g{background:repeating-linear-gradient(90deg,#8B95A1 0 5px,transparent 5px 8px)}
.jps-tbl{overflow-x:auto}
.jps-tbl table{width:100%;border-collapse:collapse;font-size:14.5px}
.jps-tbl th{text-align:left;font-size:13px;color:#4E5968;font-weight:700;padding:7px 5px;border-bottom:2px solid #E5E8EB;white-space:nowrap}
.jps-tbl td{padding:8px 5px;border-bottom:1px solid #E5E8EB;font-variant-numeric:tabular-nums}
.jps-tbl .n{text-align:right;white-space:nowrap}
.jps-dt{white-space:nowrap}.jps-tbl td small{color:#6B7684;font-size:12.5px;font-weight:500}
@media(max-width:520px){.jps-yy{display:none}.jps-tbl table{font-size:14px}.jps-tbl th,.jps-tbl td{padding-left:4px;padding-right:4px}}
.jps-dir{font-size:12px;color:#8A6D17;font-weight:700}
.jps-new{display:inline-block;font-size:11px;font-weight:800;line-height:16px;padding:0 5px;border-radius:5px;background:#FDECEC;color:#C81E1E;vertical-align:1px;white-space:nowrap}
.jps-hi{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:0 0 8px}
.jps-hi>div{border:1px solid #E5E8EB;border-radius:12px;padding:9px 10px;min-width:0}
.jps-hi .k{font-size:13px;color:#4E5968;font-weight:700}.jps-hi .v{font-size:16.5px;font-weight:900;word-break:keep-all}.jps-hi .d{font-size:12.5px;color:#4E5968;line-height:1.5;overflow-wrap:anywhere}
.jps-hi .up{color:#C2410C}.jps-hi .dn{color:#1F56E0}
.jps-seg{display:inline-flex;gap:3px;background:#F2F4F6;border-radius:10px;padding:3px;flex-wrap:wrap}
.jps-seg button{font:inherit;font-size:13.5px;font-weight:700;border:0;background:transparent;color:#4E5968;min-height:36px;min-width:44px;padding:0 10px;border-radius:8px;cursor:pointer}
.jps-seg button.on{background:#fff;color:#2F6BFF;box-shadow:0 1px 3px rgba(0,0,0,.08)}
.jps-ch{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin:16px 0 6px}.jps-ch h4{margin:0}
.jps-lg i.j{background:#14A06B}
.jps-past{margin-top:12px}.jps-past summary{cursor:pointer;font-weight:700;font-size:15px;min-height:44px;display:flex;align-items:center}
.jps-morebtn{font:inherit;font-size:14px;font-weight:700;width:100%;min-height:44px;margin-top:8px;border:1px solid #E5E8EB;border-radius:12px;background:#fff;color:#3E4754;cursor:pointer}
.jps-note{font-size:13px;color:#4E5968;line-height:1.6;margin:6px 0 0}
.jps-sp{margin:0 0 6px;padding:6px 10px;border-radius:8px;background:#FFF7E6;color:#8A5A00;font-weight:700}
.jps-go{display:flex;align-items:center;justify-content:center;min-height:50px;margin-top:16px;border-radius:14px;background:#2F6BFF;color:#fff!important;font-weight:700;font-size:16px;text-decoration:none}
.jps-load{padding:30px 0;text-align:center;color:#4E5968}
.jps-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:44px;padding:0 14px;border:1.5px solid #2F6BFF;border-radius:12px;background:#fff;color:#2F6BFF!important;font:inherit;font-size:14.5px;font-weight:700;line-height:1.2;cursor:pointer;white-space:nowrap;text-decoration:none;vertical-align:middle;box-sizing:border-box;max-width:100%}
.jps-btn:hover{background:#EEF3FF}.jps-btn:focus-visible{outline:3px solid #9DB8FF;outline-offset:2px}.jps-btn svg{flex:none}
.jps-btn.sm{padding:0 10px;font-size:13.5px}.jps-btn.blk{display:flex;width:100%;margin-top:8px}
.jhv{position:relative;outline:none;border-radius:10px}.jhv:focus-visible{box-shadow:0 0 0 3px #9DB8FF}
.jhv-in{position:relative;touch-action:pan-y;-webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent;cursor:crosshair}
.jhv-in svg{display:block}
.jhv-rd{border:1px solid #E5E8EB;border-radius:12px;padding:9px 12px;margin:0 0 6px;font-variant-numeric:tabular-nums;background:#fff}
.jhv-rd .d{font-size:12.5px;font-weight:700;color:#6B7684;margin-bottom:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.jhv-rd .d small{font-weight:500;margin-left:6px}
.jhv-rd .t{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));column-gap:24px}
.jhv-rd .r{display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:14px;line-height:1.6;min-width:0}
.jhv-rd .r span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#3E4754}
.jhv-rd .r b{font-weight:800;color:#191F28;white-space:nowrap}.jhv-rd .r.f b{font-weight:500;color:#6B7684}
.jhv-rd i{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:5px;vertical-align:0}.jhv-rd i.o{background:transparent}
.jhv-rd small{font-size:12px;font-weight:500;color:#8B95A1}
.jhv-rd .g{font-size:12.5px;color:#6B7684;margin-top:2px;display:flex;justify-content:space-between;gap:10px}.jhv-rd .g span:last-child{font-weight:700;color:#2F6BFF;text-align:right}
.jhv-rd .x{font-size:11.5px;color:#8B95A1;margin-top:1px}
.jhv.pin .jhv-rd{border-color:#9DB8FF}
.jhv-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
@media print{.jps-btn{display:none!important}}
@media(max-width:400px){.jps-hi{grid-template-columns:1fr}}
@media(max-width:640px){.jps-ov{align-items:flex-end;padding:0}.jps{border-radius:20px 20px 0 0;max-width:none;max-height:90vh}.jps-st{grid-template-columns:1fr 1fr}.jps-st>div:first-child{grid-column:1/-1}}`;
  let ov = null, lastFocus = null, keyH = null, bodyOv = '', pushed = false, backing = false;
  /* 모바일 뒤로가기 = 시트만 닫기: 열 때 기록 한 칸(history state)을 쌓고, 닫을 때 그 칸을 되돌린다 */
  function pushState() {
    if (pushed || backing || !root.history || !history.pushState) return;
    try { history.pushState({ jps: 1 }, ''); pushed = true; } catch (e) {}
  }
  function closeDom() {
    if (!ov) return;
    ov.remove(); ov = null; document.body.style.overflow = bodyOv;
    if (keyH) { document.removeEventListener('keydown', keyH, true); keyH = null; }
    const f = lastFocus; lastFocus = null;
    if (f && f.focus && document.contains(f)) try { f.focus({ preventScroll: true }); } catch (e) {}
  }
  /** 시트 닫기(닫기 단추·바깥 누르기·Esc). 쌓아 둔 기록 칸도 함께 되돌린다 */
  function close() {
    if (!ov) return;
    closeDom();
    if (pushed) { pushed = false; backing = true; try { history.back(); } catch (e) { backing = false; } }
  }
  if (typeof addEventListener === 'function' && typeof document !== 'undefined') addEventListener('popstate', () => {
    if (backing) { backing = false; if (ov) pushState(); return; }   // 닫기 단추로 되돌린 칸 — 그사이 새 시트가 열렸으면 칸을 다시 쌓음
    if (ov) { pushed = false; closeDom(); }                          // 뒤로가기로 닫음
  });
  function shell(title, sub) {
    injectCss();
    closeDom();
    lastFocus = document.activeElement; bodyOv = document.body.style.overflow; document.body.style.overflow = 'hidden';
    ov = document.createElement('div'); ov.className = 'jps-ov';
    ov.innerHTML = `<div class="jps" role="dialog" aria-modal="true" aria-labelledby="jpsT"><div class="jps-h"><div><b id="jpsT">${esc(title)}</b><small>${esc(sub)}</small></div><button type="button" class="jps-x" aria-label="닫기">×</button></div><div class="jps-b"><div class="jps-load">시세를 불러오는 중이에요…</div></div></div>`;
    ov.addEventListener('click', e => {
      if (e.target === ov) return close();
      const a = e.target.closest && e.target.closest('a.jps-go');
      /* '내 집 시세에서 자세히 보기': 시트 기록 칸을 새 화면으로 바꿔 끼워, 그 화면에서 뒤로 가면 바로 원래 화면으로 */
      if (a && pushed && !(e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || e.button)) { e.preventDefault(); pushed = false; location.replace(a.href); }
    });
    ov.querySelector('.jps-x').onclick = close;
    keyH = e => { if (e.key === 'Escape' && ov && !(e.target && e.target.closest && e.target.closest('.jhv.pin'))) { e.stopPropagation(); e.stopImmediatePropagation(); close(); } };
    document.addEventListener('keydown', keyH, true);
    document.body.appendChild(ov);
    pushState();
    ov.querySelector('.jps-x').focus({ preventScroll: true });
    return ov.querySelector('.jps-b');
  }
  /** 시세 시트 열기. q = {sd, sgg, dong, apt, band, jibun?, at?(통계용 위치)} */
  async function open(q) {
    q = q || {};
    const box = shell(q.apt || '단지 시세', [q.dong, q.band].filter(Boolean).join(' · '));
    const mine = ov;
    try {
      const [ix, g] = await Promise.all([index(), loadSgg(q.sgg, q.sd)]);
      if (ov !== mine) return;
      const u = findUnit(g.units, q);
      if (!u) { box.innerHTML = '<p class="jps-note" style="font-size:15px">최근 3년 동안 이 단지·평형의 거래 기록을 찾지 못했어요.</p>'; return; }
      box.innerHTML = body(u, ix, q, g);
      const sgg = ix.sgg && ix.sgg[u[0]], pc = box.querySelector('.jps-pc');
      if (pc) mountPpy(pc, M().trend(u, sgg, ix.months, 36), { name: sgg && sgg.name, sparse: M().isSparse(u[6]) });
      mine.querySelector('#jpsT').textContent = u[2];
      wireMore(box);
      /* 전체 기간 시세(price/h)가 있으면 차트를 매매·전세 두 선 + 기간 단추로 바꾼다. 없으면 최근 3년 차트 그대로 */
      loadHist(g).then(h => {
        const t = histOf(g, h, u), sec = box.querySelector('.jps-hsec');
        if (ov !== mine || !t || !sec) return;
        const pw = box.querySelector('.jps-pastw'); if (pw) pw.innerHTML = pastYearsHtml(t, ix.months[0]);
        let span = 36;
        const cnt = cntMap(u, ix.months), gu = guOf(h, sgg, ix.months, u[4]);
        const draw = () => {
          const w = M().histWindow(t, span), W = Math.min(520, (sec.clientWidth || 480));
          sec.innerHTML = `<div class="jps-ch"><h4>가격 추이 (매매·전세)</h4>${spanBtns(t, span)}</div><div class="jps-hc" style="max-width:${W}px"></div>
            <div class="jps-lg"><span><i></i>매매 시세</span>${t.j.some(v => v > 0) ? '<span><i class="j"></i>전세 시세</span>' : ''}${gu ? `<span><i class="g"></i>${esc(gu.name)} 아파트 같은 면적 환산</span>` : ''}<span>${esc(u[3])} · 전용 ${u[4]}㎡ 환산</span>${w.jr.some(v => v > 0) ? '<span>아래 띠 = 전세가율(점선 = 평균)</span>' : ''}</div>
            ${gu ? `<p class="jps-note">${esc(guNote(gu, w.months[0]))}</p>` : ''}<p class="jps-note">${esc(histNote(g.hist, t))}</p>`;
          mountHist(sec.querySelector('.jps-hc'), w, { sparse: M().isSparse(t.s), sub: true, cnt, gu });
          sec.querySelectorAll('[data-hspan]').forEach(b => b.onclick = () => { span = +b.dataset.hspan; draw(); });
        };
        draw();
      });
      if (root.jdjStat) try { root.jdjStat('feature_use', { feature: 'price_sheet', spot: q.at || '' }); } catch (e) {}
    } catch (e) {
      if (ov === mine) box.innerHTML = '<p class="jps-note" style="font-size:15px">시세 자료를 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요.</p>';
    }
  }
  function injectCss() {
    if (typeof document === 'undefined' || document.getElementById('jps-css')) return;
    const st = document.createElement('style'); st.id = 'jps-css'; st.textContent = CSS; (document.head || document.documentElement).appendChild(st);
  }
  const ICON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 6-7"/></svg>';
  /** '시세 흐름 보기' 단추 HTML. q = open() 과 같은 값, at = 통계용 위치 이름, opts.cls = 'sm'·'blk' 등 */
  function btn(q, at, opts) {
    opts = opts || {};
    const d = { sd: q.sd || '', sgg: q.sgg || '', dong: q.dong || '', apt: q.apt || '', band: q.band || '' };
    if (q.jibun) d.jibun = String(q.jibun);
    const lbl = opts.label || '시세 흐름 보기';
    return `<button type="button" class="jps-btn${opts.cls ? ' ' + opts.cls : ''}" data-jps="${esc(JSON.stringify(d))}" data-jps-at="${esc(at || '')}" aria-label="${esc((q.apt || '') + ' ' + (q.band || '') + ' ' + lbl)}">${ICON}<span>${esc(lbl)}</span></button>`;
  }
  /* 어느 화면이든 data-jps 단추를 누르면 시트를 연다(카드 자체의 클릭 동작보다 먼저) */
  if (typeof document !== 'undefined' && document.addEventListener) {
    injectCss();
    document.addEventListener('click', e => {
      const b = e.target && e.target.closest && e.target.closest('[data-jps]'); if (!b) return;
      e.preventDefault(); e.stopPropagation();
      let q = null; try { q = JSON.parse(b.getAttribute('data-jps')); } catch (x) {}
      if (q) open(Object.assign(q, { at: b.getAttribute('data-jps-at') || '' }));
    }, true);
  }
  function body(u, ix, q, g) {
    const isPrice = !!(g && g.price);
    const m = M(), months = ix.months, sm = m.bandSummary(u, months), last = m.lastDeal(u, months), few = m.isFew(u);
    const pct = c => c ? `<span style="color:${c.pct > 0.0005 ? '#C2410C' : c.pct < -0.0005 ? '#1F56E0' : 'inherit'}">${m.pctTxt(c.pct)}</span>` : '-';
    let k = '최근 시세', v = sm.price ? m.won(sm.price) : '-', d = sm.at ? m.ymLabel(sm.at) + ' 기준 (3개월 중앙값)' : '';
    if (few && last) { k = '최근 거래'; v = m.won(last.price); d = `${m.ymLabel(last.at)} · 최근 3년 ${u[5]}건`; }
    else if (!sm.price && last) { k = '마지막 실거래'; v = m.won(last.price); d = `${m.ymLabel(last.at)} · 그 뒤 거래 없음`; }
    const sgg = ix.sgg && ix.sgg[u[0]], link = `${MINE}?sd=${encodeURIComponent(q.sd || '')}&d=${encodeURIComponent([u[0], u[1], u[8], u[2]].join('|'))}&b=${encodeURIComponent(u[3])}`;
    return `<div class="jps-st"><div><div class="k">${k} · ${esc(u[3])}</div><div class="v">${v}</div><div class="d">${esc(d)}</div></div>
      <div><div class="k">1년 변동</div><div class="v">${pct(sm.ch1)}</div><div class="d">평당가 기준</div></div>
      <div><div class="k">3년 변동</div><div class="v">${pct(sm.ch3)}</div><div class="d">평당가 기준</div></div></div>
    ${highsHtml(m.highs(u, g && g.hist, sm.price || (last ? last.price : 0)))}
    ${!m.hasScore(u) ? `<p class="jps-note">최근 3년 거래 ${u[5]}건 기준이에요. 거래가 적어 한두 건 가격에 따라 시세가 크게 달라질 수 있어요.</p>` : ''}
    <div class="jps-hsec"><h4>가격 추이 (평당가, 최근 3년)</h4>
    <div class="jps-pc"></div>
    <div class="jps-lg"><span><i></i>이 단지 ${esc(u[3])}</span><span><i class="g"></i>${esc((sgg && sgg.name) || '')} 아파트 전체</span></div>
    <p class="jps-note">단위: 만원/3.3㎡ · 각 달 값 = 그 달까지 3개월 실거래 평당가 중앙값. 거래가 없던 기간은 점선으로 이어 표시해요.</p></div>
    <h4>${isPrice ? '최근 실거래' : '월별 실거래 요약'}</h4>
    ${tradesHtml(u, months, { show: 10 })}
    <div class="jps-pastw"></div>
    <a class="jps-go" href="${esc(link)}">내 집 시세에서 자세히 보기 →</a>`;
  }

  const API = { open, close, btn, loadSgg, loadHist, histOf, scoreUnits, findUnit, tradesHtml, pastYearsHtml, wireMore, miniChart, histChart, histNote, linePaths, mountBars, SPARSE, highsHtml, spanBtns, baseName, plot, mount, tipFn, histTip, histSpec, mountHist, cntMap, eok, guOf, guNote, ppySpec, mountPpy };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.JDJ_PRICE = API;
})(typeof self !== 'undefined' ? self : this);
