/* 집코드 — '주변 개발사업' 칸 (buy/report · mine 공용)
   자료: jangdaejang-data/data/devproj.json (엔진 scripts/devproj.py 생성)
   - 서울시·국토부 등 공식 원문으로 확인한 단계·날짜만. 확인 안 된 일정은 '확인 불가'
   - 거리·발표 뒤 변화(이 단지 vs 같은 구 단지 중간값)는 실거래 실제 숫자
   - 과거 비슷한 사업 사례 문장은 엔진이 만든 문장 그대로(사례 수·한계 포함)
   window.JDJDev = { load(base), forUnit(data, u), summaryLine(data, u, o), detailHtml(data, u, o), mount(el, o) }
     u = {code, dong, jibun} · o = {apt, sggName: code → 이름} */
(function(){
  'use strict';
  var CACHE = {};
  var STG = {'구상': '구상 발표', '발표': '계획 발표', '계획 결정': '계획 결정', '착공': '착공', '준공': '준공'};
  var NEXT = {'착공': '착공', '계획 결정': '결정', '준공': '착공', '기반시설 준공': '착공', '입주': '착공', '첫 팹 가동': '착공'};
  var GRP = {'발표': '발표', '구상': '발표', '계획 결정': '결정', '착공': '착공'};

  function load(base){
    var u = (base || '/jangdaejang-data/data/') + 'devproj.json';
    try { css(); } catch (e) {}
    if (!CACHE[u]) CACHE[u] = fetch(u, {cache: 'no-cache'}).then(function(r){ return r.ok ? r.json() : null; }).catch(function(){ return null; });
    return CACHE[u];
  }
  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"]/g, function(c){ return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]; }); }
  /* 받침 있으면 '은', 없으면 '는' (한글 아닌 끝 글자는 '는') */
  function eun(w){ var c = String(w || '').trim().slice(-1).charCodeAt(0); if (c >= 0xAC00 && c <= 0xD7A3) return (c - 0xAC00) % 28 ? '은' : '는'; return '는'; }
  function fd(d){ if (!d) return ''; var a = String(d).split('-'); return a[0] + (a[1] ? '.' + (+a[1]) : '') + (a[2] ? '.' + (+a[2]) : ''); }
  function fdY(d){ if (!d) return ''; var a = String(d).split('-'); return a.length === 1 ? a[0] + '년' : a[0] + '년 ' + (+a[1]) + '월'; }
  function fym(ym){ return ym ? ym.slice(0, 4) + '.' + (+ym.slice(4)) : ''; }
  function km(m){ return m < 1000 ? (Math.round(m / 100) / 10 || 0.1).toFixed(1) : (Math.round(m / 100) / 10).toFixed(1); }
  function p1(x){ return (Math.round(Math.abs(x) * 10) / 10).toFixed(1); }
  function org(url){
    url = String(url || '');
    if (/seoul\.go\.kr/.test(url)) return '서울시';
    if (/molit\.go\.kr/.test(url)) return '국토교통부';
    if (/korea\.kr/.test(url)) return '정부(정책브리핑)';
    if (/eum\.go\.kr/.test(url)) return '토지이음 고시';
    if (/gg\.go\.kr/.test(url)) return '경기도';
    return '공식 자료';
  }
  function key(u){ return [u.code, u.dong, u.jibun].join('|'); }
  /* 기준일: 자동 수집이 공식 출처를 마지막으로 읽은 날(checked, 없으면 asof). 7일 넘으면 '자료 갱신 지연'. now: 확인용 'YYYY-MM-DD' */
  var STALE_DAYS = 7;
  function fresh(data, now){
    var d = data && (data.checked || data.asof); if (!d || !/^\d{4}-\d{2}-\d{2}/.test(d)) return null;
    var t = now || new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
    var days = Math.round((Date.parse(t + 'T00:00:00Z') - Date.parse(String(d).slice(0, 10) + 'T00:00:00Z')) / 86400000);
    return {d: String(d).slice(0, 10), days: days, stale: days > STALE_DAYS};
  }
  function fdd(d){ var a = String(d).split('-'); return a[0] + '.' + (+a[1]) + '.' + (+a[2]); }
  /* 화면 문구: 기준일 한 줄(늘) + 지연 안내(7일 넘을 때) */
  function freshText(data, now){
    var f = fresh(data, now); if (!f) return {asof: '', stale: ''};
    return {asof: '기준일 ' + fdd(f.d) + '(공식 원문을 마지막으로 확인한 날)',
      stale: f.stale ? '자료 갱신 지연: 개발사업 자료를 마지막으로 확인한 날이 ' + fdd(f.d) + '(' + f.days + '일 전)이라 그 뒤 단계 변화는 빠져 있을 수 있어요.' : ''};
  }

  /* 단지 → [{p, d(m), band, f(첫 발표 달), me(이 단지 %), gu(같은 구 중간값 %)}] 가까운 순 */
  function forUnit(data, u){
    if (!data || !data.units || !data.projects || !u) return [];
    var recs = data.units[key(u)] || [], byId = {};
    data.projects.forEach(function(p){ byId[p.id] = p; });
    return recs.filter(function(r){ return byId[r[0]]; }).map(function(r){
      return {p: byId[r[0]], d: r[1], band: r[2], f: r.length > 3 ? r[3] : null, me: r.length > 4 ? r[4] : null, gu: r.length > 5 ? r[5] : null};
    }).sort(function(a, b){ return a.d - b.d; });
  }
  function stageAt(p, ym){
    var st = p.stages || [];
    for (var i = 0; i < st.length; i++) if (String(st[i].d || '').replace(/-/g, '').slice(0, 6) === ym) return STG[st[i].s] || st[i].s;
    return '계획 발표';
  }
  function next(p){ var pl = p.plan || []; return pl.length ? pl[0] : null; }
  function srcOf(p, i){ return (p.src || [])[i] || null; }
  /* 과거 비슷한 사업 사례 문장: 다음 단계(예: 착공 예정이면 착공) → 지난 마지막 단계 순으로 엔진 문장 고름 */
  function caseOf(p, band){
    var c = p.cases || {}, nx = next(p), want = [];
    if (nx && NEXT[nx.s]) want.push(NEXT[nx.s]);
    var st = p.stages || [];
    for (var i = st.length - 1; i >= 0; i--) if (GRP[st[i].s]) want.push(GRP[st[i].s]);
    want.push('착공', '결정', '발표');
    for (var j = 0; j < want.length; j++) if (c[want[j] + '|' + band]) return c[want[j] + '|' + band];
    return null;
  }
  /* 엔진 사례 문장의 예전 방어적 꼬리 → 사실 문장(엔진 scripts/devproj.py text_case 새 문구와 같게) */
  function factCase(t){
    t = String(t || '');
    t = t.replace(/\(사례 1건뿐이라 일반적인 영향인지는 통계로 확인하지 못했어요\)\./, '. 사례가 1건뿐이라 점수에는 넣지 않았어요.');
    t = t.replace(/\(사례 (\d+)건 모두 (더|덜) 오름\)\. 다만 사례가 적거나 일부는 통계로 뚜렷하지 않아 일반적인 영향으로 단정하기는 어려워요\./, function(_, n, w){ return '(사례 ' + n + '건 모두 ' + w + ' 오름). ' + (+n < 10 ? '사례가 ' + n + '건뿐이라 점수에는 넣지 않았어요.' : '사례 사이 차이가 커서 점수에는 넣지 않았어요.'); });
    t = t.replace('사례마다 방향이 달라 통계로 뚜렷한 영향이라고 보기는 어려워요.', '사례마다 방향이 달라 점수에는 넣지 않았어요.');
    return t;
  }
  function gname(o, code){ return (o && o.sggName && o.sggName(code)) || '같은 구'; }
  function diff(x){ return (x.me == null || x.gu == null) ? null : Math.round((x.me - x.gu) * 10) / 10; }

  function summaryLine(data, u, o){
    var L = forUnit(data, u); if (!L.length) return null;
    var x = L[0], p = x.p, g = gname(o, u.code), D = diff(x), nx = next(p);
    var t = '주변 개발사업: ' + p.short + '까지 약 ' + km(x.d) + 'km';
    if (D != null) t += ' — ' + fym(x.f) + ' ' + stageAt(p, x.f) + ' 뒤 이 단지가 ' + g + ' 단지 중간값보다 ' + p1(D) + '%p ' + (D >= 0 ? '더' : '덜') + ' 올랐어요';
    if (nx) t += (D != null ? ', ' : ' — ') + fdY(nx.d) + ' ' + nx.s + ' 목표';
    if (L.length > 1) t += ' (그 밖에 ' + (L.length - 1) + '곳)';
    var fx = freshText(data, o && o.now);
    if (fx.stale && !(o && o.noStale)) t += ' — ' + fx.stale;            /* 자료가 멈췄으면 요약 한 줄에서 바로 보이게(보고서·내 집·설명 문단 모두 이 줄을 씀) */
    return t;
  }

  function oneHtml(x, u, o, data){
    var p = x.p, g = gname(o, u.code), apt = (o && o.apt) || '이 단지', D = diff(x), nx = next(p), S = [];
    S.push(esc(apt) + eun(apt) + ' ' + esc(p.short) + '에서 약 ' + km(x.d) + 'km예요.');
    if (D != null) {
      var mv = x.me >= 0 ? p1(x.me) + '% 올라' : p1(x.me) + '% 내려';
      var s = fym(x.f) + ' ' + stageAt(p, x.f) + ' 뒤 지금까지 이 단지는 ' + mv + ', ' + esc(g) + ' 단지 중간값(' + (x.gu >= 0 ? '+' : '−') + p1(x.gu) + '%)보다 ' + p1(D) + '%p ' + (D >= 0 ? '더' : '덜') + ' 올랐어요';
      if (D >= 1) s += '. 개발 기대가 이미 가격에 일부 들어간 거예요.';
      else if (D <= -1) s += '. 발표 효과가 아직 가격에 나타나지 않은 거예요.';
      else s += '. ' + esc(g) + ' 단지들과 비슷하게 움직였어요.';
      S.push(s);
    } else S.push('발표 전후 이 단지 시세 비교는 실거래가 부족하거나 발표가 자료 기간 밖이라 확인 불가예요.');
    if (nx) {
      var sr = srcOf(p, nx.src);
      S.push('다음 단계: ' + fdY(nx.d) + ' ' + esc(nx.s) + ' 목표' + (sr ? '(' + org(sr[1]) + ' 발표)' : '') + '.');
    } else S.push('다음 단계 일정: 공식 자료로 확인 불가예요.');
    if (p.delay) { var dl = typeof p.delay === 'string' ? {note: p.delay} : p.delay, ds = srcOf(p, dl.src);
      if (dl.note) S.push('지연: ' + esc(dl.note) + (ds ? '(' + org(ds[1]) + ')' : '')); }
    var c = caseOf(p, x.band);
    S.push(c ? esc(factCase(c.t)) : '과거 비슷한 사업 주변 단지의 통계 사례는 아직 확인 불가예요.');
    var hist = (p.stages || []).map(function(s){
      var sr = srcOf(p, s.src);
      return '<li>' + fd(s.d) + ' ' + esc(STG[s.s] || s.s) + (s.note ? ' — ' + esc(s.note) : '') + (sr ? ' <a href="' + esc(sr[1]) + '" target="_blank" rel="noopener">원문</a>' : '') + '</li>';
    }).concat((p.plan || []).map(function(s){
      var sr = srcOf(p, s.src);
      return '<li class="dv-plan">' + fd(s.d) + ' ' + esc(s.s) + ' (예정)' + (s.note ? ' — ' + esc(s.note) : '') + (sr ? ' <a href="' + esc(sr[1]) + '" target="_blank" rel="noopener">원문</a>' : '') + '</li>';
    }));
    return '<div class="dv-one"><b class="dv-nm">' + esc(p.name) + '</b>' + (p.scale ? '<div class="dv-sc">규모: ' + esc(p.scale) + '</div>' : '') +
      '<p class="dv-p">' + S.join(' ') + '</p>' +
      (hist.length ? '<details class="dv-h"><summary>단계·날짜와 공식 출처</summary><ul>' + hist.join('') + '</ul></details>' : '') + '</div>';
  }

  function detailHtml(data, u, o){
    var L = forUnit(data, u); if (!L.length) return '';
    var h = L.map(function(x){ return oneHtml(x, u, o, data); }).join('');
    h += '<p class="dv-note">' + (data.inModel ? '주변 개발사업은 과거 사례 검증을 거쳐 미래가치 점수에도 반영돼요.' :
      '주변 개발사업은 미래가치 점수에 넣지 않았어요(과거 사례로 검증했을 때 예측이 나아지지 않았어요).') +
      ' 단계·날짜는 서울시·국토부 등 공식 원문으로 확인한 것만 적었고, 확인 못 한 일정은 넣지 않았어요.' +
      (data.to ? ' 시세 비교는 ' + fym(data.to) + '까지 실거래 기준이에요.' : '') +
      (freshText(data, o && o.now).asof ? ' ' + freshText(data, o && o.now).asof + '.' : '') + '</p>';
    return h;
  }

  var CSS = '.dv-sec .dv-one{padding:10px 0;border-top:1px solid rgba(0,0,0,.08)}.dv-sec .dv-one:first-of-type{border-top:0}' +
    '.dv-sec .dv-nm{font-size:16px}.dv-sec .dv-sc{font-size:13.5px;color:#667;margin-top:2px}.dv-sec .dv-p{margin:6px 0;line-height:1.65;font-size:15px;word-break:keep-all}' +
    '.dv-sec .dv-h summary{cursor:pointer;font-size:14px;color:#456}.dv-sec .dv-h ul{margin:6px 0 0;padding-left:18px;font-size:14px;line-height:1.6}' +
    '.dvd{margin-top:6px}.dvd>summary,.dv-more>summary{cursor:pointer;font-size:14px;color:#456}.dv-sec .dv-plan{color:#667}.dv-sec .dv-note{font-size:13px;color:#778;line-height:1.6;margin:8px 0 0}.dv-sec .dv-sum{font-weight:700;line-height:1.6;word-break:keep-all}';
  CSS += '.dv-sec .dv-stale{font-size:14.5px;line-height:1.6;margin:0 0 10px;padding:10px 12px;border-radius:12px;background:#FFF6DB;border:1px solid #F1DFA6;color:#5C4500;word-break:keep-all}' +
    '.dv-sec .dv-stale b{display:block;color:#8A5A00;font-weight:900;margin:0 0 2px}';
  function css(){ if (document.getElementById('dv-css')) return; var s = document.createElement('style'); s.id = 'dv-css'; s.textContent = CSS; document.head.appendChild(s); }

  /* el 에 '주변 개발사업' 칸을 채움. 주변 사업이 없으면 숨김. o.base·o.head·o.cls 선택 */
  function mount(el, o){
    if (!el) return Promise.resolve(null);
    o = o || {};
    var tok = String(Math.random()); if (el.dataset) el.dataset.dvTok = tok;
    return load(o.base).then(function(data){
      if (el.dataset && el.dataset.dvTok !== tok) return null;
      var u = {code: o.code, dong: o.dong, jibun: o.jibun}, sl = summaryLine(data, u, Object.assign({}, o, {noStale: 1})), fx = freshText(data, o.now);
      if (!sl) { el.hidden = true; el.innerHTML = ''; return null; }
      el.innerHTML = '<div class="' + (o.cls || 'panel') + ' dv-sec">' + (o.head || '<h2>주변 개발사업</h2>') +
        (fx.stale ? '<p class="dv-stale" role="status"><b>자료 갱신 지연</b>' + esc(fx.stale.replace(/^자료 갱신 지연: /, '')) + '</p>' : '') +
        '<p class="dv-sum">' + esc(sl.replace(/^주변 개발사업: /, '')) + '</p>' +
        '<details class="dv-more"><summary>자세히 보기</summary>' + detailHtml(data, u, o) + '</details></div>';
      el.hidden = false;
      return data;
    });
  }

  window.JDJDev = {load: load, forUnit: forUnit, summaryLine: summaryLine, detailHtml: detailHtml, mount: mount, caseOf: caseOf, eun: eun, factCase: factCase, fresh: fresh, freshText: freshText};
})();
