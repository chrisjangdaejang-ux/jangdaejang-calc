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
  function tradesHtml(u, months, opts) {
    const m = M(), show = (opts && opts.show) || 10, list = m.trades(u);
    if (!list.length) {
      const md = m.monthDeals(u, months).slice(0, 12);
      if (!md.length) return '<p class="jps-note">최근 3년 거래가 없어요.</p>';
      return `<div class="jps-tbl"><table><thead><tr><th>월</th><th class="n">거래</th><th class="n">평당가</th><th class="n">환산</th></tr></thead><tbody>${md.map(x =>
        `<tr><td>${m.ymLabel(x.at)}</td><td class="n">${x.n}건</td><td class="n">${x.ppy ? x.ppy.toLocaleString() + '만' : '-'}</td><td class="n">${x.price ? m.won(x.price) : '-'}</td></tr>`).join('')}</tbody></table></div>`;
    }
    const row = (t, i) => `<tr${i >= show ? ' class="jps-more" hidden' : ''}><td>${esc(t.date)}</td><td class="n">${t.area}㎡</td><td class="n">${t.floor != null ? t.floor + '층' : '-'}</td><td class="n">${t.hi ? '<span class="jps-new" title="그 전까지 같은 평형·같은 전용면적 최고가보다 높은 거래">신고가</span> ' : ''}<b>${m.won(t.amt)}</b>${t.type === '직거래' ? '<br><small class="jps-dir">직거래</small>' : ''}</td></tr>`;
    return `<div class="jps-tbl"><table><thead><tr><th>계약일</th><th class="n">전용</th><th class="n">층</th><th class="n">거래금액</th></tr></thead><tbody>${list.map(row).join('')}</tbody></table></div>`
      + (list.length > show ? `<button type="button" class="jps-morebtn" data-jps-more>더보기 (${list.length - show}건 더)</button>` : '')
      + `<p class="jps-note">국토교통부 실거래 신고 기준, 해제(취소) 신고 거래는 뺐어요. 직거래는 목록에만 표시하고 시세 계산에서는 빼요.${list.some(t => t.hi) ? ' <span class="jps-new">신고가</span> = 그 전날까지 같은 평형·같은 전용면적에서 가장 높았던 값보다 비싸게 거래된 경우(수집 자료 기준, 직거래 제외).' : ''}</p>`;
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
    return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="월별 평당가 추이">${ticks}<path d="${path(gs)}" fill="none" stroke="#8B95A1" stroke-width="1.8" stroke-dasharray="5 3"/><path d="${path(me)}" fill="none" stroke="#2F6BFF" stroke-width="2.4"/>${dots}${xl}</svg>`;
  }

  /* ---------- 전체 기간 차트: 매매·전세 두 선(금액) 또는 전세가율 ---------- */
  const eok = v => v >= 10000 ? (Math.round(v / 1000) / 10).toString().replace(/\.0$/, '') + '억' : Math.round(v).toLocaleString() + '만';
  /** t = histSeries(또는 histWindow) 결과, W = 폭(px), opts.jr = 전세가율 선만, opts.fs = 글자 크기 */
  function histChart(t, W, opts) {
    opts = opts || {}; const m = M(), fs = opts.fs || 12.5;
    if (opts.jr && t) { const k = t.jr.findIndex(v => v > 0); if (k > 0) t = Object.assign({}, t, { months: t.months.slice(k), jr: t.jr.slice(k), s: t.s.slice(k), j: t.j.slice(k) }); }   // 전세가율은 전세 자료가 있는 달부터
    W = Math.max(260, Math.round(W || 480)); const H = opts.h || 190, L = opts.jr ? 44 : 54, R = 12, T = 12, B = 24;
    const lines = opts.jr ? [{ a: t.jr.map(v => v * 100), c: '#0E7A4F', w: 2.4 }] : [{ a: t.j, c: '#14A06B', w: 2.2, dash: '' }, { a: t.s, c: '#2F6BFF', w: 2.6 }];
    const vals = [].concat(...lines.map(l => l.a)).filter(v => v > 0);
    if (vals.length < 2) return `<p class="jps-note">${opts.jr ? '전세가율을 계산할 달(매매·전세 거래가 모두 있는 달)이 적어요.' : '차트로 보여 드릴 거래가 없어요.'}</p>`;
    let lo = Math.min(...vals), hi = Math.max(...vals); const pad = (hi - lo) * 0.1 || hi * 0.05; lo = Math.max(0, lo - pad); hi += pad;
    const n = t.months.length, x = i => L + (n === 1 ? 0 : i * (W - L - R) / (n - 1)), y = v => T + (hi - v) / (hi - lo) * (H - T - B);
    const fmtY = v => opts.jr ? Math.round(v) + '%' : eok(v);
    const grid = [lo, (lo + hi) / 2, hi].map(v => `<line x1="${L}" x2="${W - R}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}" stroke="#E5E8EB"/><text x="${L - 5}" y="${(y(v) + 4).toFixed(1)}" font-size="${fs}" fill="#4E5968" text-anchor="end">${fmtY(v)}</text>`).join('');
    const path = a => { let d = '', on = false; a.forEach((v, i) => { if (v > 0) { d += (on ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1); on = true; } else on = false; }); return d; };
    const lone = (a, c) => a.map((v, i) => v > 0 && !(a[i - 1] > 0) && !(a[i + 1] > 0) ? `<circle cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="2.2" fill="${c}"/>` : '').join('');
    const last = (a, c) => { for (let i = a.length - 1; i >= 0; i--) if (a[i] > 0) return `<circle cx="${x(i).toFixed(1)}" cy="${y(a[i]).toFixed(1)}" r="4" fill="${c}"><title>${m.ymLabel(t.months[i])} ${opts.jr ? Math.round(a[i]) + '%' : m.won(a[i])}</title></circle>`; return ''; };
    const idx = n <= 4 ? [0, n - 1] : [0, Math.round((n - 1) / 3), Math.round((n - 1) * 2 / 3), n - 1];
    const xl = idx.map((i, k) => `<text x="${x(i).toFixed(1)}" y="${H - 5}" font-size="${fs}" fill="#4E5968" text-anchor="${k === 0 ? 'start' : k === idx.length - 1 ? 'end' : 'middle'}">${n > 36 ? String(t.months[i]).slice(0, 4) + '년' : m.ymLabel(t.months[i])}</text>`).join('');
    return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="${opts.jr ? '전세가율 추이' : '매매·전세 시세 추이'}">${grid}${lines.map(l => `<path d="${path(l.a)}" fill="none" stroke="${l.c}" stroke-width="${l.w}" stroke-linejoin="round"/>${lone(l.a, l.c)}${last(l.a, l.c)}`).join('')}${xl}</svg>`;
  }
  /** 기간 단추 HTML (data-hspan) */
  const spanBtns = (t, cur, cls) => `<div class="${cls || 'jps-seg'}" role="group" aria-label="기간">${M().histSpans(t).map(b => `<button type="button" data-hspan="${b.span}" class="${b.span === cur ? 'on' : ''}" aria-pressed="${b.span === cur}">${b.label}</button>`).join('')}</div>`;
  /** 차트 아래 자료 기간 문구: 수집 시작 달(cover)을 실제 값으로 */
  function histNote(hist, t) {
    const m = M(), a = hist && (hist.cover || hist.hm), b = hist && (hist.rcover || hist.rm);
    return `${a ? `매매 ${m.ymKo(a)}부터` : ''}${b ? ` · 전세 ${m.ymKo(b)}부터` : ''} 국토교통부 실거래 자료${t && t.from && a && t.from > a ? ` · 이 평형 첫 매매 시세 ${m.ymKo(t.from)}` : ''}. 각 달 값 = 그 달까지 3개월 실거래 평당가 중앙값 × 전용면적 ÷ 3.3058(전세는 월세 없는 순수 전세만). 거래가 없는 달은 선을 끊어 표시해요.`;
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
.jps-morebtn{font:inherit;font-size:14px;font-weight:700;width:100%;min-height:44px;margin-top:8px;border:1px solid #E5E8EB;border-radius:12px;background:#fff;color:#3E4754;cursor:pointer}
.jps-note{font-size:13px;color:#4E5968;line-height:1.6;margin:6px 0 0}
.jps-go{display:flex;align-items:center;justify-content:center;min-height:50px;margin-top:16px;border-radius:14px;background:#2F6BFF;color:#fff!important;font-weight:700;font-size:16px;text-decoration:none}
.jps-load{padding:30px 0;text-align:center;color:#4E5968}
.jps-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:44px;padding:0 14px;border:1.5px solid #2F6BFF;border-radius:12px;background:#fff;color:#2F6BFF!important;font:inherit;font-size:14.5px;font-weight:700;line-height:1.2;cursor:pointer;white-space:nowrap;text-decoration:none;vertical-align:middle;box-sizing:border-box;max-width:100%}
.jps-btn:hover{background:#EEF3FF}.jps-btn:focus-visible{outline:3px solid #9DB8FF;outline-offset:2px}.jps-btn svg{flex:none}
.jps-btn.sm{padding:0 10px;font-size:13.5px}.jps-btn.blk{display:flex;width:100%;margin-top:8px}
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
    keyH = e => { if (e.key === 'Escape' && ov) { e.stopPropagation(); e.stopImmediatePropagation(); close(); } };
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
      mine.querySelector('#jpsT').textContent = u[2];
      wireMore(box);
      /* 전체 기간 시세(price/h)가 있으면 차트를 매매·전세 두 선 + 기간 단추로 바꾼다. 없으면 최근 3년 차트 그대로 */
      loadHist(g).then(h => {
        const t = histOf(g, h, u), sec = box.querySelector('.jps-hsec');
        if (ov !== mine || !t || !sec) return;
        let span = 36;
        const draw = () => {
          const w = M().histWindow(t, span), W = Math.min(520, (sec.clientWidth || 480));
          sec.innerHTML = `<div class="jps-ch"><h4>가격 추이 (매매·전세)</h4>${spanBtns(t, span)}</div>${histChart(w, W)}
            <div class="jps-lg"><span><i></i>매매 시세</span>${t.j.some(v => v > 0) ? '<span><i class="j"></i>전세 시세</span>' : ''}<span>${esc(u[3])} · 전용 ${u[4]}㎡ 환산</span></div>
            <p class="jps-note">${esc(histNote(g.hist, t))}</p>`;
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
    ${miniChart(u, sgg, months, 480)}
    <div class="jps-lg"><span><i></i>이 단지 ${esc(u[3])}</span><span><i class="g"></i>${esc((sgg && sgg.name) || '')} 아파트 전체</span></div>
    <p class="jps-note">단위: 만원/3.3㎡ · 각 달 값 = 그 달까지 3개월 실거래 평당가 중앙값</p></div>
    <h4>${isPrice ? '최근 실거래' : '월별 실거래 요약'}</h4>
    ${tradesHtml(u, months, { show: 10 })}
    <a class="jps-go" href="${esc(link)}">내 집 시세에서 자세히 보기 →</a>`;
  }

  const API = { open, close, btn, loadSgg, loadHist, histOf, scoreUnits, findUnit, tradesHtml, wireMore, miniChart, histChart, histNote, highsHtml, spanBtns, baseName };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.JDJ_PRICE = API;
})(typeof self !== 'undefined' ? self : this);
