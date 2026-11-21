/* 장대장 계산기 — '이 지역에 영향을 주는 정책' 칸 (buy/report · mine · jeonse 공용)
   자료: jangdaejang-data/data/policy.json (엔진 scripts/policy.py 생성)
   - 공식 출처로 원문을 확인한 정책만, 사실(무엇이·어느 단계·누가 대상)만 보여 줌
   - 과거 비슷한 정책의 통계 결과는 엔진이 만든 문장을 그대로(확인됨/혼재/확인 불가)
   - '최근 변화'는 그 구의 실제 실거래 숫자(발표 전 3개월 vs 최근 3개월)
   window.JDJPolicy = { load(base), forCodes(data, codes, mode), html(data, opts), applies(p, sgg, dong) } */
(function(){
  'use strict';
  var JB = (typeof window !== 'undefined' && window.JDJ_BASE) || (function (p) { var g = p.indexOf('/jangdaejang-calc/') === 0, b = { SITE: g ? '/jangdaejang-calc/' : '/', DATA: g ? '/jangdaejang-data/' : 'https://chrisjangdaejang-ux.github.io/jangdaejang-data/' }; if (typeof window !== 'undefined') window.JDJ_BASE = b; return b; })((typeof location !== 'undefined' && location.pathname) || '/jangdaejang-calc/');
  var CACHE = {};
  var TYPE = {'세금-보유':'보유세','세금-양도':'양도세','대출':'대출','규제지역':'규제지역','토허':'토지거래허가','공급':'공급','청약':'청약','임대차':'임대차'};
  var METRO = ['11', '28', '41'];

  function load(base){
    var u = (base || JB.DATA + 'data/') + 'policy.json';
    if (!CACHE[u]) CACHE[u] = fetch(u, {cache:'no-cache'}).then(function(r){ return r.ok ? r.json() : null; }).catch(function(){ return null; });
    return CACHE[u];
  }
  function tok(t, sgg, dong){
    if (t === 'all') return true;
    if (t === 'metro') return METRO.indexOf(sgg.slice(0, 2)) >= 0;
    if (t === 'nonmetro') return METRO.indexOf(sgg.slice(0, 2)) < 0;
    var i = t.indexOf(':');
    if (i > 0) return t.slice(0, i) === sgg && !!dong && (dong === t.slice(i + 1) || dong.split(' ').pop() === t.slice(i + 1));
    if (t.length === 2) return sgg.slice(0, 2) === t;
    return t === sgg;
  }
  /* 동 단위 정책(토지거래허가 일부 동)은 동을 모르면 '구 안 일부 동'으로 표시 */
  function applies(p, sgg, dong){
    var inn = p.in || [], not = p.not || [], hit = false, part = false;
    for (var i = 0; i < inn.length; i++){
      if (tok(inn[i], sgg, dong)) { hit = true; break; }
      if (!dong && inn[i].indexOf(sgg + ':') === 0) part = true;
    }
    if (!hit && !part) return false;
    for (var j = 0; j < not.length; j++) if (tok(not[j], sgg, dong)) return false;
    return hit ? 'yes' : 'part';
  }
  function fd(d){ if (!d) return ''; var a = String(d).split('-'); return a[0] + '.' + (+a[1]) + (a[2] ? '.' + (+a[2]) : ''); }
  /* 기준일: 자동 수집이 공식 출처를 마지막으로 읽은 날(checked, 없으면 asof). 7일 넘게 지나면 '자료 갱신 지연'(멈춘 자료가 최신처럼 보이지 않게).
     now: 확인용 'YYYY-MM-DD'(없으면 오늘, 한국 시각) */
  var STALE_DAYS = 7;
  function today(){ var k = new Date(Date.now() + 9 * 3600000); return k.toISOString().slice(0, 10); }
  function fresh(data, now){
    var d = data && (data.checked || data.asof); if (!d || !/^\d{4}-\d{2}-\d{2}/.test(d)) return null;
    var days = Math.round((Date.parse((now || today()) + 'T00:00:00Z') - Date.parse(String(d).slice(0, 10) + 'T00:00:00Z')) / 86400000);
    return {d: String(d).slice(0, 10), days: days, stale: days > STALE_DAYS};
  }
  function freshHtml(data, now){
    var f = fresh(data, now); if (!f) return '';
    var h = '<p class="pol-asof">기준일 ' + fd(f.d) + ' · 공식 발표 원문을 마지막으로 확인한 날이에요.</p>';
    if (f.stale) h = '<p class="pol-stale" role="status"><b>자료 갱신 지연</b> 정책 자료를 마지막으로 확인한 날이 ' + fd(f.d) + '(' + f.days + '일 전)이에요. ' +
      '그 뒤에 나온 정책 발표나 단계 변화는 아직 반영되지 않았을 수 있어요. 최신 발표는 대한민국 정책브리핑(korea.kr)에서 확인해 주세요.</p>';
    return h;
  }
  function fym(ym){ return ym ? ym.slice(0, 4) + '.' + (+ym.slice(4)) : ''; }
  function rng(r){ return r[0] === r[1] ? fym(r[0]) : fym(r[0]) + '~' + fym(r[1]); }
  function badge(p){
    var st = p.stages || [], names = st.map(function(s){ return s.s; }), last = names[names.length - 1];
    if (names.indexOf('철회') >= 0) return ['철회', 'off'];
    if (p.status === 'bill') return [last + ' 단계 · 확정 아님', 'bill'];
    if (names.indexOf('해제') >= 0) return ['해제됨', 'off'];
    if (p.status === 'past') return ['지난 정책', 'off'];
    if (last === '시행' || last === '연장') return ['시행 중', 'on'];
    if (last === '통과' || last === '공포') return [last + ' · 시행 전', 'ann'];
    return ['발표', 'ann'];
  }
  function forCodes(data, codes, mode){
    if (!data || !data.policies) return {now: [], past: []};
    var now = [], past = [];
    data.policies.forEach(function(p){
      if (mode === 'jeonse' && !p.rent) return;
      var hits = [];
      codes.forEach(function(c){ var a = applies(p, c.sgg, c.dong); if (a) hits.push({c: c, a: a}); });
      if (!hits.length) return;
      ((p.status === 'active' || p.status === 'bill') ? now : past).push({p: p, hits: hits});
    });
    var rank = function(x){ return x.p.status === 'bill' ? 0 : 1; };
    now.sort(function(a, b){ return rank(a) - rank(b) || (a.p.date < b.p.date ? 1 : -1); });
    past.sort(function(a, b){ return a.p.date < b.p.date ? 1 : -1; });
    return {now: now, past: past};
  }
  function e(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(ch){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]; }); }
  function pct(v){ return (v > 0 ? '+' : '') + v.toFixed(1) + '%'; }
  function n0(v){ return v >= 100 ? Math.round(v).toLocaleString() : (Math.round(v * 10) / 10).toString(); }

  function recentHtml(data, x, mode, names, sname){
    sname = sname || names;
    var rows = [];
    x.hits.forEach(function(h){
      var r = ((data.recent || {})[h.c.sgg] || {})[x.p.id];
      if (!r) return;
      r.forEach(function(o){
        var it = [];
        it.push('<li><span>한 달 평균 거래</span><b>' + n0(o.tr0) + '건 → ' + n0(o.tr1) + '건</b></li>');
        if (o.dn0 != null) it.push('<li><span>직전 3개월 최고 시세보다 5% 넘게 낮게 팔린 거래</span><b>' + o.dn0.toFixed(0) + '% → ' + o.dn1.toFixed(0) + '%</b></li>');
        if (mode === 'jeonse') { if (o.jx != null) it.push('<li><span>같은 단지 전세 보증금 변화</span><b>' + pct(o.jx) + '</b></li>'); }
        else if (o.px != null) it.push('<li><span>같은 단지 매매 시세 변화</span><b>' + pct(o.px) + '</b></li>');
        rows.push('<div class="pol-rc"><div class="pol-rch">' + e(sname(h.c)) + ' · ' + e(o.label) + '<small>발표 전 ' + rng(o.before) + ' → 최근 ' + rng(o.after) + '</small></div><ul>' + it.join('') + '</ul></div>');
      });
    });
    if (!rows.length) return '';
    return '<div class="pol-blk"><div class="pol-k">발표 뒤 실제 변화</div>' + rows.join('') + '</div>';
  }

  function card(data, x, opt){
    var p = x.p, b = badge(p), names = opt.name || function(c){ return c.label || c.sgg; };
    var types = (p.types || []).map(function(t){ return '<span class="pol-ty">' + e(TYPE[t] || t) + '</span>'; }).join('');
    var where = x.hits.length > 1 || opt.mode === 'buy' ? '<div class="pol-where">해당 지역: ' + x.hits.map(function(h){ return e(names(h.c)) + (h.a === 'part' ? '(일부 동)' : ''); }).join(', ') + '</div>'
      : (x.hits[0].a === 'part' ? '<div class="pol-where">' + e(names(x.hits[0].c)) + ' 안 일부 동만 해당돼요</div>' : '');
    var hit = '';
    if (opt.price && p.ptier){
      var eok = opt.price / 10000, lo = p.ptier[0], hi = p.ptier[1];
      var inT = (lo == null || eok > lo) && (hi == null || eok <= hi);
      hit = inT ? '<div class="pol-hit"><b>내 집 시세(약 ' + (Math.round(eok * 10) / 10) + '억 원)가 이 정책의 가격 조건에 들어요.</b>' + (p.cond && p.cond.length ? ' 아래 조건에 따라 실제로 해당되는지가 달라져요.' : '') + '</div>'
        : '<div class="pol-miss">내 집 시세(약 ' + (Math.round(eok * 10) / 10) + '억 원)는 이 정책의 가격 조건(' + e(p.price) + ')에는 들지 않아요.</div>';
    }
    var steps = (p.stages || []).map(function(s){ return '<li><b>' + e(s.s) + '</b> ' + fd(s.d) + (s.note ? ' <small>' + e(s.note) + '</small>' : '') + '</li>'; })
      .concat((p.plan || []).map(function(s){ return '<li class="plan"><b>예정 · ' + e(s.s) + '</b> ' + fd(s.d) + (s.note ? ' <small>' + e(s.note) + '</small>' : '') + '</li>'; })).join('');
    var ver = (p.verdict || []).map(function(v){ return '<p class="pol-v ' + (v.v === 'a' ? 'ok' : '') + '">' + (v.v === 'a' ? '<b>통계로 확인됨</b> · ' : '') + e(v.text) + '</p>'; }).join('');
    var chk = (p.checks || []).length ? '<details class="pol-d"><summary>이 정책 때 실제 결과 보기 (' + p.checks.length + '가지 비교)</summary><ul>' + p.checks.map(function(c){ return '<li><b>' + e(c.label) + '</b><br>' + e(c.text) + '</li>'; }).join('') + '</ul></details>' : '';
    var past = ver || chk ? '<div class="pol-blk"><div class="pol-k">과거 비슷한 정책 때는 어땠나요</div>' + ver + chk + '</div>'
      : (p.nocheck ? '<div class="pol-blk"><div class="pol-k">과거 비슷한 정책 때는 어땠나요</div><p class="pol-v">' + e(p.nocheck) + '</p></div>' : '');
    var src = (p.src || []).map(function(s){ return '<a href="' + e(s[1]) + '" target="_blank" rel="noopener">' + e(s[0]) + '</a>'; }).join('<br>');
    return '<div class="pol-card' + (p.status === 'bill' ? ' bill' : '') + '">' +
      '<div class="pol-top"><span class="pol-bd ' + b[1] + '">' + e(b[0]) + '</span>' + types + '</div>' +
      '<div class="pol-nm">' + e(p.name) + '</div><div class="pol-dt">' + fd(p.date) + ' 발표</div>' + where + hit +
      (p.status === 'bill' ? '<p class="pol-warn">아직 국회를 통과하지 않은 안이에요. 심사 과정에서 내용이 바뀌거나 빠질 수 있어요.</p>' : '') +
      '<div class="pol-blk"><div class="pol-k">누가 대상이에요</div><p>' + e(p.plain) + '</p>' +
      (p.price ? '<p class="pol-s">가격 조건: ' + e(p.price) + '</p>' : '') +
      (p.cond && p.cond.length ? '<p class="pol-s">이런 경우 해당돼요: ' + p.cond.map(e).join(' · ') + '</p>' : '') + '</div>' +
      '<div class="pol-blk"><div class="pol-k">진행 단계</div><ol class="pol-st">' + steps + '</ol></div>' +
      (opt.recent === false ? '' : recentHtml(data, x, opt.mode, names, opt.sggName)) + past +
      '<div class="pol-src">출처(원문) · ' + src + '</div></div>';
  }

  var CSS = '.pol-intro{font-size:14px;color:var(--muted,#4E5968);margin:0 0 12px;line-height:1.6}' +
    '.pol-asof{font-size:13.5px;color:var(--sub2,#4E5968);margin:-6px 0 12px;line-height:1.55}' +
    '.pol-stale{font-size:14.5px;line-height:1.6;margin:0 0 10px;padding:10px 12px;border-radius:12px;background:#FFF6DB;border:1px solid #F1DFA6;color:#5C4500;word-break:keep-all}' +
    '.pol-stale b{display:block;color:#8A5A00;font-weight:900;margin:0 0 2px}' +
    '.pol-list{display:grid;gap:12px;grid-template-columns:minmax(0,1fr)}' +
    '.pol-card{border:1px solid var(--line,#E5E8EB);border-radius:12px;padding:16px;background:var(--card,#fff);min-width:0;overflow-wrap:anywhere;word-break:keep-all}' +
    '.pol-card.bill{border-style:dashed}' +
    '.pol-top{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-bottom:8px}' +
    '.pol-bd{font-size:13.5px;font-weight:700;border-radius:999px;padding:3px 10px;border:1.5px solid}' +
    '.pol-bd.on{color:#1B64DA;border-color:#1B64DA;background:rgba(27,100,218,.06)}' +
    '.pol-bd.ann{color:#1B64DA;border-color:#9DB8E8}' +
    '.pol-bd.bill{color:#A23B2A;border-color:#A23B2A;background:rgba(162,59,42,.06)}' +
    '.pol-bd.off{color:#6B7684;border-color:#C9CED4}' +
    '.pol-ty{font-size:13.5px;color:#4E5968;background:#F2F4F6;border-radius:999px;padding:3px 9px}' +
    '.pol-nm{font-size:17px;font-weight:900;line-height:1.4;letter-spacing:-.02em}' +
    '.pol-dt,.pol-where{font-size:13.5px;color:#4E5968;margin-top:2px}' +
    '.pol-hit{background:rgba(27,100,218,.07);border-left:4px solid #1B64DA;border-radius:0 8px 8px 0;padding:10px 12px;margin-top:10px;font-size:16px;line-height:1.55}' +
    '.pol-miss{font-size:14px;color:#4E5968;margin-top:8px}' +
    '.pol-warn{font-size:14px;color:#A23B2A;margin:10px 0 0;font-weight:700;line-height:1.5}' +
    '.pol-blk{margin-top:12px}' +
    '.pol-k{font-size:13.5px;font-weight:900;color:#4E5968;margin-bottom:4px}' +
    '.pol-blk p{font-size:16px;line-height:1.6;margin:0 0 4px}' +
    '.pol-blk p.pol-s{font-size:14px;color:#4E5968}' +
    '.pol-v{font-size:16px!important}.pol-v.ok b{color:#1B64DA}' +
    '.pol-st{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:6px}' +
    '.pol-st li{font-size:14px;background:#F2F4F6;border-radius:8px;padding:5px 9px;line-height:1.45}' +
    '.pol-st li.plan{background:#fff;border:1.5px dashed #C9CED4;color:#4E5968}' +
    '.pol-st small{color:#6B7684;font-size:13.5px}' +
    '.pol-rc{border:1px solid var(--line,#E5E8EB);border-radius:10px;padding:10px 12px;margin-top:6px}' +
    '.pol-rch{font-size:15px;font-weight:700;line-height:1.45}.pol-rch small{display:block;font-weight:400;color:#6B7684;font-size:13.5px}' +
    '.pol-rc ul{list-style:none;margin:6px 0 0;padding:0}' +
    '.pol-rc li{display:flex;justify-content:space-between;gap:10px;font-size:14px;padding:4px 0;border-top:1px solid #F2F4F6}' +
    '.pol-rc li span{color:#4E5968}.pol-rc li b{white-space:nowrap;font-size:15px}' +
    '.pol-d{margin-top:6px}.pol-d summary{font-size:14px;font-weight:700;color:#1B64DA;cursor:pointer;min-height:44px;display:flex;align-items:center}' +
    '.pol-d ul{margin:4px 0 0;padding-left:18px}.pol-d li{font-size:14px;line-height:1.55;margin-bottom:8px}' +
    '.pol-src{font-size:13.5px;color:#6B7684;margin-top:12px;line-height:1.6}.pol-src a{color:#1B64DA}' +
    '.pol-more{margin-top:12px}.pol-more>summary{font-size:15px;font-weight:700;cursor:pointer;min-height:44px;display:flex;align-items:center;color:#1B64DA}' +
    '.pol-note{font-size:13.5px;color:#6B7684;margin:10px 0 0;line-height:1.6}';
  function css(){
    if (document.getElementById('polCss')) return;
    var s = document.createElement('style'); s.id = 'polCss'; s.textContent = CSS; document.head.appendChild(s);
  }

  /* opts: {codes:[{sgg, dong, label}], mode:'buy'|'mine'|'jeonse', price(만원, mine), name(c)→표시 이름, sggName(c)→구 이름(최근 변화는 구 단위)} */
  function html(data, opts){
    css();
    var g = forCodes(data, opts.codes || [], opts.mode);
    if (!data) return '<p class="pol-intro">정책 자료를 불러오지 못했어요. 잠시 뒤 다시 열어 주세요.</p>';
    var mode = opts.mode, out = [];
    var intro = mode === 'jeonse' ? '전세·월세 계약과 전세대출에 관련된 정책 중 공식 발표 원문으로 확인한 것만 모았어요.'
      : '공식 발표 원문(정책브리핑·부처 보도자료·법제처·서울시)으로 확인한 정책만 모았어요. 정책이 실제로 시세를 움직였는지는 과거 사례를 통계로 따져 본 결과를 함께 보여 드려요.';
    out.push('<p class="pol-intro">' + intro + '</p>' + freshHtml(data, opts.now));
    if (!g.now.length) out.push('<p class="pol-intro">지금 이 지역에 적용 중이거나 논의 중인 정책 중 화면에 올린 것이 없어요.</p>');
    else {
      var top = g.now.slice(0, 3), rest = g.now.slice(3);
      out.push('<div class="pol-list">' + top.map(function(x){ return card(data, x, opts); }).join('') + '</div>');
      if (rest.length) out.push('<details class="pol-more"><summary>적용 중인 정책 ' + rest.length + '건 더 보기</summary><div class="pol-list">' +
        rest.map(function(x){ return card(data, x, opts); }).join('') + '</div></details>');
    }
    if (g.past.length) out.push('<details class="pol-more"><summary>이 지역에 있었던 지난 정책 ' + g.past.length + '건과 그때 결과</summary><div class="pol-list">' +
      g.past.map(function(x){ return card(data, x, {mode: mode, name: opts.name, recent: false}); }).join('') + '</div></details>');
    if (g.now.some(function(x){ return x.hits.some(function(h){ return ((data.recent || {})[h.c.sgg] || {})[x.p.id]; }); }))
      out.push('<p class="pol-note">\'발표 뒤 실제 변화\'는 국토교통부 실거래 숫자 그대로예요(직거래·해제 거래 제외, 마지막 달은 신고가 덜 끝나 빼요). 같은 기간 금리·계절 등 다른 요인도 함께 작용한 결과예요.</p>');
    return out.join('');
  }

  /* el 에 칸을 채움. head(h2 안쪽 HTML)·cls(감싸는 클래스)는 화면마다 다름. 자료가 없거나 해당 정책이 없으면 칸을 숨김(hideEmpty) */
  function mount(el, opts){
    if (!el) return Promise.resolve();
    var tok = String(Math.random()); el.dataset.polTok = tok;
    return load(opts.base).then(function(data){
      if (el.dataset.polTok !== tok || !el.isConnected) return;
      var g = forCodes(data, opts.codes || [], opts.mode);
      if (!data || (opts.hideEmpty && !g.now.length && !g.past.length)) { el.innerHTML = ''; el.hidden = true; return; }
      el.hidden = false;
      el.innerHTML = '<div class="' + (opts.cls || 'panel') + '">' + (opts.head || '<h2>이 지역에 영향을 주는 정책</h2>') + html(data, opts) + '</div>';
    });
  }

  window.JDJPolicy = {load: load, forCodes: forCodes, html: html, applies: applies, badge: badge, mount: mount, fresh: fresh, freshHtml: freshHtml};
})();
