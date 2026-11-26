/* 집예보 '시장 온도' 화면 조각 — 계산·문장은 assets/temp-core.js(JDJ_TEMP), 여기는 그리기만.
   JDJ_TEMPV.mini(el, code)     한 줄 칸(단계 + 이유 + [시장 온도 자세히 보기]) — 지도 지역 분석·내 집·단지 순위·모닝 브리핑
   JDJ_TEMPV.overview(el)       전국·시·도 한눈에(누르면 temp/ 화면) — 주간 동향·temp/
   JDJ_TEMPV.full(el, code)     전체 칸(단계 눈금·이유·지표·신고 진행 중·공식 통계·월별 기록 그래프·출처) — temp/
   JDJ_TEMPV.load()             temp/index.json (한 번만 받음)
   공통 원칙: 숫자는 자료 그대로, 사라·팔라는 말 없음, 자료가 없으면 칸을 숨김. */
(function (root) {
  'use strict';
  const T = root.JDJ_TEMP;
  if (!T) return;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const J = u => fetch(u, { cache: 'no-cache' }).then(r => r.ok ? r.json() : null).catch(() => null);
  let IP = null; const FP = {};
  const load = () => IP || (IP = J(T.DATA + 'index.json'));
  const file = f => FP[f] || (FP[f] = J(T.DATA + f + '.json'));

  const CSS = `.tmp{--tl:#8B95A1}
.tmp-mini{display:flex;gap:10px;align-items:flex-start;padding:12px 14px;border-radius:14px;background:var(--tb,#F2F4F6);margin:10px 0;font-size:14px;line-height:1.55;color:#191F28}
.tmp-mini .tmp-chip{flex:none}
.tmp-mini small{display:block;color:#4E5968;font-size:12.5px;margin-top:2px}
.tmp-mini a{color:#4338CA;font-weight:700;text-decoration:none;white-space:nowrap}
.tmp-chip{display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:999px;font-weight:900;font-size:13.5px;background:#fff;border:2px solid var(--tc,#8B95A1);color:var(--tf,#4E5968);white-space:nowrap}
.tmp-chip i{width:9px;height:9px;border-radius:50%;background:var(--tc,#8B95A1);display:inline-block}
.tmp-gauge{display:grid;grid-template-columns:repeat(5,1fr);gap:4px;margin:12px 0 6px}
.tmp-gauge span{height:10px;border-radius:5px;opacity:.28}
.tmp-gauge span.on{opacity:1;height:14px;margin-top:-2px}
.tmp-gl{display:grid;grid-template-columns:repeat(5,1fr);gap:4px;font-size:11.5px;color:#6B7684;text-align:center}
.tmp-gl b{color:#191F28}
.tmp-card{border:1px solid #E5E8EB;border-radius:18px;padding:18px 16px;background:#fff;margin:12px 0}
.tmp-card h2,.tmp-card h3{margin:0 0 4px;font-size:17px;font-weight:900;letter-spacing:-.2px}
.tmp-big{font-size:28px;font-weight:900;letter-spacing:-.5px;margin:2px 0}
.tmp-why{font-size:15px;line-height:1.6;margin:6px 0 0;color:#191F28}
.tmp-basis{font-size:12.5px;color:#6B7684;margin:6px 0 0}
.tmp-rows{list-style:none;margin:12px 0 0;padding:0;display:grid;gap:8px}
.tmp-rows li{display:grid;grid-template-columns:1fr auto;gap:2px 10px;padding:10px 12px;border-radius:12px;background:#F9FAFB;font-size:14px}
.tmp-rows li b{font-weight:900}
.tmp-rows li .v{font-weight:900;font-size:15.5px;text-align:right;white-space:nowrap}
.tmp-rows li small{grid-column:1/-1;color:#4E5968;font-size:12.5px;line-height:1.5}
.tmp-dir{display:inline-block;margin-left:6px;padding:1px 7px;border-radius:999px;font-size:11.5px;font-weight:700;background:#fff;border:1px solid #E5E8EB;color:#4E5968}
.tmp-card .tmp-sub{margin:18px 0 4px;font-size:14.5px;font-weight:900}
.tmp-pend{margin:8px 0 0;padding:10px 12px;border-radius:12px;background:#FBF8EF;font-size:13px;line-height:1.55;color:#6B5A1E}
.tmp-ov{display:grid;grid-template-columns:repeat(auto-fill,minmax(104px,1fr));gap:8px;margin:10px 0}
.tmp-ov a{display:flex;flex-direction:column;gap:4px;padding:10px 12px;border-radius:12px;border:1px solid #E5E8EB;background:#fff;text-decoration:none;color:#191F28;font-size:13.5px;font-weight:700;min-height:44px}
.tmp-ov a .tmp-chip{align-self:flex-start;font-size:12.5px;padding:2px 8px}
.tmp-ov a.kr{grid-column:1/-1;flex-direction:row;align-items:center;justify-content:space-between}
.tmp-chart{margin:8px 0 0}
.tmp-chart svg{width:100%;height:auto;display:block}
.tmp-seg{display:inline-flex;gap:4px;background:#F2F4F6;border-radius:10px;padding:3px;margin:4px 0}
.tmp-seg button{border:0;background:none;padding:6px 12px;border-radius:8px;font:inherit;font-size:13px;font-weight:700;color:#4E5968;min-height:32px;cursor:pointer}
.tmp-seg button[aria-pressed=true]{background:#fff;color:#191F28;box-shadow:0 1px 2px rgba(0,0,0,.08)}
.tmp-tip{font-size:13px;color:#191F28;min-height:20px;margin:4px 0 0}
.tmp-leg{display:flex;flex-wrap:wrap;gap:6px 12px;font-size:12px;color:#4E5968;margin:6px 0 0}
.tmp-leg i{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:4px;vertical-align:-1px}
.tmp-src{font-size:12px;color:#6B7684;line-height:1.6;margin:12px 0 0}
.tmp-bt{width:100%;border-collapse:collapse;font-size:13px;margin:8px 0 0}
.tmp-bt th,.tmp-bt td{padding:7px 6px;border-bottom:1px solid #F0F1F3;text-align:right}
.tmp-bt th:first-child,.tmp-bt td:first-child{text-align:left}
.tmp-bt th{font-weight:700;color:#4E5968;font-size:12px}`;
  function css() {
    if (typeof document === 'undefined' || document.getElementById('tmpcss')) return;
    const s = document.createElement('style'); s.id = 'tmpcss'; s.textContent = CSS; document.head.appendChild(s);
  }
  const chip = (l, txt) => `<span class="tmp-chip" style="--tc:${T.COLORS[l] || '#8B95A1'};--tf:${T.FG[l] || '#4E5968'}"><i aria-hidden="true"></i>${esc(txt || T.LABELS[l] || '')}</span>`;
  const DIR = { v: ['적음', '평소', '많음'], u: ['낮음', '평소', '높음'], nh: ['드묾', '평소', '잦음'] };

  /** 한 줄 칸 */
  async function mini(el, code, o) {
    if (!el) return;
    o = o || {};
    css();
    const I = await load(), r = T.region(I, code), s = T.summary(I, r);
    if (!s || s.l == null) { el.hidden = true; el.innerHTML = ''; return; }
    el.hidden = false;
    el.innerHTML = `<div class="tmp tmp-mini" style="--tb:${s.bg}">${chip(s.l)}<div><b>${esc(r.nm)} 이번 주 시장 온도</b> · ${esc(s.short)}<small>${esc(s.why)}</small><small>${esc(s.basis)} · <a href="${esc(T.pageUrl(code))}" data-track="${esc(o.track || 'temp_mini')}">시장 온도 자세히 보기 ›</a></small></div></div>`;
  }

  /** 전국·시·도 한눈에 */
  async function overview(el, o) {
    if (!el) return;
    o = o || {};
    css();
    const I = await load();
    if (!I || !I.kr) { el.hidden = true; return; }
    el.hidden = false;
    const kr = T.summary(I, I.kr);
    const href = c => o.onPick ? '#' : T.pageUrl(c);
    el.innerHTML = `<div class="tmp tmp-ov">${kr && kr.l != null ? `<a class="kr" href="${esc(href('kr'))}" data-code="kr" data-track="temp_ov_kr"><span>전국</span>${chip(kr.l)}</a>` : ''}
      ${T.sidoList(I).map(x => `<a href="${esc(href(x.id))}" data-code="${esc(x.id)}" data-track="temp_ov_sd">${esc(x.short)}${x.l != null ? chip(x.l) : '<span class="tmp-chip">자료 적음</span>'}</a>`).join('')}</div>
      <p class="tmp-basis">${esc(T.span(((I.kr.c || {}).v || {}).from, ((I.kr.c || {}).v || {}).to))} 계약 국토교통부 실거래 기준 · ${esc(String(I.asof || '').replace(/-/g, '.'))} 계산 · 지역마다 그 지역의 지난 기록과 비교한 단계예요</p>`;
    if (o.onPick) el.querySelectorAll('a[data-code]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); o.onPick(a.getAttribute('data-code')); }));
  }

  /* ---------- 월별 기록 그래프(SVG): 거래 건수 막대, 막대 색 = 그달 온도 ---------- */
  function chartSvg(rows, w) {
    const H = 190, padL = 40, padR = 8, padT = 10, padB = 24, W = Math.max(300, w || 640);
    const max = Math.max(1, ...rows.map(r => r.n || 0));
    const nice = (() => { const p = Math.pow(10, Math.floor(Math.log10(max))); const c = [1, 2, 2.5, 5, 10].map(k => k * p).find(k => k >= max / 4) || p; return c; })();
    const top = Math.ceil(max / nice) * nice, iw = W - padL - padR, ih = H - padT - padB, bw = iw / rows.length;
    const y = v => padT + ih - (v / top) * ih;
    let g = '';
    for (let v = 0; v <= top; v += nice) g += `<line x1="${padL}" x2="${W - padR}" y1="${y(v)}" y2="${y(v)}" stroke="#F0F1F3"/><text x="${padL - 6}" y="${y(v) + 4}" text-anchor="end" font-size="11" fill="#6B7684">${v >= 1000 ? (v / 1000) + '천' : v}</text>`;
    rows.forEach((r, i) => {
      const x = padL + i * bw, h = Math.max(0, ih - (y(r.n || 0) - padT));
      const col = r.l != null ? T.COLORS[r.l] : '#C9CED6';
      g += `<rect x="${(x + bw * 0.12).toFixed(1)}" y="${y(r.n || 0).toFixed(1)}" width="${Math.max(1, bw * 0.76).toFixed(1)}" height="${h.toFixed(1)}" fill="${col}" rx="${bw > 6 ? 2 : 0}" data-i="${i}"><title>${T.ymTxt(r.ym)} ${(r.n || 0).toLocaleString('ko-KR')}건${r.l != null ? ' · ' + T.LABELS[r.l] : ''}</title></rect>`;
    });
    const yrs = rows.length > 48 ? 2 : 1;
    rows.forEach((r, i) => { if (r.ym.slice(4) === '01' && (+r.ym.slice(0, 4)) % yrs === 0) g += `<text x="${padL + i * bw}" y="${H - 6}" font-size="11" fill="#6B7684">${r.ym.slice(0, 4)}</text>`; });
    if (rows.length && rows.length < 14) rows.forEach((r, i) => { g += `<text x="${padL + i * bw + bw / 2}" y="${H - 6}" font-size="10.5" fill="#6B7684" text-anchor="middle">${+r.ym.slice(4)}월</text>`; });
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="월별 아파트 거래 건수와 그달 시장 온도">${g}<rect class="hit" x="${padL}" y="${padT}" width="${iw}" height="${ih}" fill="transparent"/></svg>`;
  }

  /** 전체 칸 */
  async function full(el, code, o) {
    if (!el) return;
    o = o || {};
    css();
    const I = await load();
    const r = T.region(I, code), s = T.summary(I, r);
    if (!r) { el.innerHTML = '<div class="tmp-card"><p>이 지역의 시장 온도 자료가 아직 없어요.</p></div>'; return; }
    const cs = T.comps(r), of = T.official(I, r), pd = T.pendList(r);
    const gauge = `<div class="tmp-gauge" aria-hidden="true">${T.LABELS.map((x, i) => `<span class="${i === s.l ? 'on' : ''}" style="background:${T.COLORS[i]}"></span>`).join('')}</div>
      <div class="tmp-gl">${T.LABELS.map((x, i) => i === s.l ? `<b>${esc(x)}</b>` : `<span>${esc(x)}</span>`).join('')}</div>`;
    const dir = c => c.dir != null && DIR[c.id] ? `<span class="tmp-dir">지난 기록보다 ${DIR[c.id][c.dir]}</span>` : c.ref ? '<span class="tmp-dir">참고</span>' : '';
    el.innerHTML = `<section class="tmp tmp-card" aria-labelledby="tmpH">
      <h2 id="tmpH">${esc(r.nm)} 이번 주 시장 온도</h2>
      ${s.l != null ? `<div class="tmp-big" style="color:${s.fg}">${esc(s.t)}</div>${gauge}<p class="tmp-why">${esc(s.why)}</p>` : `<p class="tmp-why">${esc(s.none)}</p>`}
      <p class="tmp-basis">${esc(s.basis)}</p>
      ${cs.length ? `<h3 class="tmp-sub">온도를 정한 실거래 숫자</h3><ul class="tmp-rows">${cs.map(c => `<li><b>${esc(c.t)}${dir(c)}</b><span class="v">${esc(c.v)}</span><small>${esc(c.s)}</small></li>`).join('')}</ul>` : ''}
      ${pd.length ? `<div class="tmp-pend"><b>신고 진행 중</b><br>${pd.map(p => esc(p.t)).join('<br>')}<br><small>계약 뒤 30일 안에 신고하므로 최근 달 숫자는 계속 늘어요. 예상 범위는 지난 신고 속도로 계산한 값이에요.</small></div>` : ''}
      ${of.length ? `<h3 class="tmp-sub">함께 보는 공식 통계·참고 <small style="font-weight:500;color:#6B7684">(온도 계산에는 넣지 않았어요)</small></h3><ul class="tmp-rows">${of.map(c => `<li><b>${esc(c.t)}</b><span class="v">${esc(c.v)}</span><small>${esc(c.s)}</small></li>`).join('')}</ul>` : ''}
      <h3 class="tmp-sub">월별 기록 <small style="font-weight:500;color:#6B7684">아파트 매매 거래 건수 · 막대 색 = 그달 온도</small></h3>
      <div class="tmp-seg" role="group" aria-label="기간 고르기"><button type="button" data-p="36" aria-pressed="false">3년</button><button type="button" data-p="120" aria-pressed="true">10년</button><button type="button" data-p="0" aria-pressed="false">전체</button></div>
      <div class="tmp-chart" id="tmpChart"><p class="tmp-basis">불러오는 중이에요</p></div>
      <p class="tmp-tip" id="tmpTip" aria-live="polite"></p>
      <div class="tmp-leg">${T.LABELS.map((x, i) => `<span><i style="background:${T.COLORS[i]}"></i>${esc(x)}</span>`).join('')}<span><i style="background:#C9CED6"></i>온도 없음(지난 기록이 짧거나 거래가 적음)</span></div>
      <p class="tmp-src">출처: ${esc(Object.values(I.src || {}).map(x => x.nm).join(' · '))}. 포털 매물 수는 쓰지 않고 공공 자료만 써요. 단계는 그 지역의 지난 기록 안에서 지금 숫자가 어디쯤인지로 정해요(구마다 기준이 달라요). 사고팔기를 권하는 정보가 아니에요.</p>
    </section>`;
    const F = await file(T.fileOf(I, code));
    const h = T.histOf(F, code);
    const box = el.querySelector('#tmpChart'), tip = el.querySelector('#tmpTip');
    if (!h || !h.n) { box.innerHTML = '<p class="tmp-basis">월별 기록이 아직 없어요.</p>'; return; }
    const all = T.chartRows(h);
    let per = 120;
    const draw = () => {
      const rows = per ? all.slice(-per) : all;
      box.innerHTML = chartSvg(rows, Math.round(box.clientWidth || 640));
      const svg = box.querySelector('svg');
      const show = ev => {
        const rc = svg.getBoundingClientRect(), vb = svg.viewBox.baseVal, x = (ev.clientX - rc.left) / rc.width * vb.width;
        const i = Math.floor((x - 40) / ((vb.width - 48) / rows.length));
        const p = rows[Math.max(0, Math.min(rows.length - 1, i))];
        if (p) tip.textContent = `${T.ymTxt(p.ym)}: 거래 ${(p.n || 0).toLocaleString('ko-KR')}건${p.vn != null ? ` · 빌라 ${p.vn.toLocaleString('ko-KR')}건` : ''}${p.l != null ? ` · 온도 ${T.LABELS[p.l]}` : ''}`;
      };
      svg.addEventListener('pointermove', show); svg.addEventListener('click', show);
      const last = rows[rows.length - 1];
      tip.textContent = last ? `${T.ymTxt(last.ym)}: 거래 ${(last.n || 0).toLocaleString('ko-KR')}건 (그래프를 누르면 그달 숫자가 보여요)` : '';
    };
    el.querySelectorAll('.tmp-seg button').forEach(b => b.addEventListener('click', () => {
      per = +b.getAttribute('data-p'); el.querySelectorAll('.tmp-seg button').forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false')); draw();
    }));
    draw();
    if (typeof addEventListener === 'function') { let t; addEventListener('resize', () => { clearTimeout(t); t = setTimeout(draw, 150); }); }
  }

  /** 지난 자료로 본 성적 표 */
  async function backtest(el) {
    if (!el) return;
    css();
    const I = await load(), B = T.backtestRows(I);
    if (!B) { el.hidden = true; return; }
    el.hidden = false;
    el.innerHTML = `<table class="tmp-bt"><thead><tr><th>그때 온도</th><th>사례</th><th>1년 뒤 평당가<br>(중간값)</th><th>1년 뒤 오른 비율</th><th>같은 시·도 평균보다<br>더 오른 비율</th></tr></thead><tbody>
      ${B.rows.map(x => `<tr><td>${chip(x.l)}</td><td>${x.n.toLocaleString('ko-KR')}</td><td>${x.med > 0 ? '+' : ''}${x.med.toFixed(1)}%</td><td>${x.up.toFixed(0)}%</td><td>${x.beat != null ? x.beat.toFixed(0) + '%' : '-'}</td></tr>`).join('')}</tbody></table>
      <p class="tmp-basis">${esc(T.backtestText(I))} 같은 달 여러 구를 함께 세서 사례끼리 겹쳐요 — 숫자는 경향만 봐 주세요.</p>`;
  }

  root.JDJ_TEMPV = { load, mini, overview, full, backtest, chartSvg };
})(typeof window !== 'undefined' ? window : globalThis);
