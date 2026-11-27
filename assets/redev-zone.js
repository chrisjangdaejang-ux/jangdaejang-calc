/* 재개발·재건축 구역 페이지(villa/z/{구역}/)·구역 목록(villa/z/) 화면
   자료(모두 공개 저장소 jangdaejang-data, 엔진이 만듦 — 값마다 출처·기준일):
     data/redev/zone/index.json · data/redev/zone/{id}.json (엔진 redev_detail.py, 형식 docs/redev_detail_schema.md)
     data/redev/zones.json (재개발 지도 — 착공 예상·맞혀 본 기록·이주 주변 전세·가까운 새 아파트, 지도에 있는 구역만)
     data/policy.json (투기과열지구·토지거래허가 — 판정 카드) · data/price/{구}.json (가까운 새 아파트 실거래)
   이 파일은 숫자를 만들지 않아요. 계산은 assets/redev-calc.js(판정·개월 수·주소 조각)와 assets/redev-core.js(착공 예상 문장) 함수만 써요. */
(function () {
  'use strict';
  var JB = (typeof window !== 'undefined' && window.JDJ_BASE) || (function (p) { var g = p.indexOf('/jangdaejang-calc/') === 0, b = { SITE: g ? '/jangdaejang-calc/' : '/', DATA: g ? '/jangdaejang-data/' : 'https://chrisjangdaejang-ux.github.io/jangdaejang-data/' }; if (typeof window !== 'undefined') window.JDJ_BASE = b; return b; })((typeof location !== 'undefined' && location.pathname) || '/jangdaejang-calc/');
  var R = window.JDJ_REDEV, C = window.JDJ_RCALC, esc = R.esc;
  var $ = function (i) { return document.getElementById(i); };
  var DATA = JB.DATA + 'data/';
  var TODAY = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
  var track = function (n, p) { try { if (window.JDJ_TRACK) window.JDJ_TRACK.event(n, p || {}); } catch (e) {} };
  var get = function (u) { return fetch(u).then(function (r) { if (!r.ok) throw new Error(String(r.status)); return r.json(); }); };
  var main = $('zmain'), app = $('zapp');
  var qid = ''; try { qid = new URLSearchParams(location.search).get('id') || ''; } catch (e) {}
  var ID = (main && main.dataset.id) || qid;

  var BIZ = [['area', '구역 면적', '㎡'], ['hh', '계획 세대수', '세대'], ['far', '용적률', '%'], ['bcr', '건폐율', '%'], ['floor', '층수(지하/지상)', ''], ['height', '높이', 'm'],
    ['gfa', '연면적', '㎡'], ['sale', '분양 세대', '세대'], ['rental', '임대 세대', '세대'], ['rental_rt', '임대 비율', '%'], ['old_hh', '기존 세대', '세대'],
    ['zone_prev', '용도지역(사업 전)', ''], ['zone_after', '용도지역(사업 뒤)', ''], ['members', '조합원 수', '명'], ['bldgs', '동 수', '동'],
    ['contractor', '시공사', ''], ['operator', '사업 주체', ''], ['operator_type', '사업시행자 유형', '']];
  var GK = { rights: '#B45309', mgmt: '#C2410C', impl: '#4338CA', union: '#7C3AED', cmte: '#0F766E', zone: '#1D4ED8', moa: '#0E7490', small: '#0E7490', lift: '#B91C1C', done: '#15803D', transfer: '#15803D', promo: '#6D28D9', etc: '#4E5968' };

  function ymd(d) { d = String(d || ''); if (/^\d{6}$/.test(d)) return R.ym(d); if (/^\d{4}-\d{2}-\d{2}/.test(d)) return d.slice(0, 4) + '년 ' + (+d.slice(5, 7)) + '월 ' + (+d.slice(8, 10)) + '일'; return d; }
  /* 짧은 출처: '서울 열린데이터광장 서울플랜+ 정비사업 현황(OA-23112, OpenAPI)' → '서울플랜+ 정비사업 현황' (전체 이름·주소는 페이지 아래 출처 목록에) */
  function shortName(n) { n = String(n || '').replace(/\s*\(.*$/, '').replace(/^(서울 열린데이터광장|공공데이터포털)\s+/, ''); return n.length > 22 ? n.slice(0, 21) + '…' : n; }
  function srcShort(src, k, d) {
    var s = src && src[k]; if (!s) return '';
    var dd = d || s.d || '';
    return '<span class="zsrc">' + esc(shortName(s.name)) + (dd ? ' · ' + esc(ymd(dd)) + (s.dk === 'got' ? ' 받음' : ' 기준') : '') + '</span>';
  }
  function srcLine(src, k, d) {
    var s = src && src[k]; if (!s) return '';
    var dd = d || s.d || '', got = s.dk === 'got';
    return '<span class="zsrc">' + (s.url ? '<a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.name) + '</a>' : esc(s.name)) + (dd ? ' · ' + esc(ymd(dd)) + (got ? ' 받음' : ' 기준') : '') + '</span>';
  }
  function fmtV(x, u) {
    if (!x || x.v == null || x.v === '') return null;
    var v = x.v, unit = x.u || u || '';
    if (typeof v === 'number') v = (Math.round(v * 100) / 100).toLocaleString('ko-KR');
    return v + (unit && typeof x.v === 'number' ? (unit === '%' ? '%' : ' ' + unit) : '');
  }
  function share(title) {
    var url = location.href.split('#')[0];
    track('redev_zone_share', { id: ID });
    try { if (navigator.share) { navigator.share({ title: title, url: url }).catch(function () {}); return; } } catch (e) {}
    try { navigator.clipboard.writeText(url).then(function () { toast('주소를 복사했어요'); }, function () { toast('주소를 복사하지 못했어요'); }); } catch (e) { toast('주소를 복사하지 못했어요'); }
  }
  function toast(t) { var d = document.createElement('div'); d.className = 'ztoast'; d.setAttribute('role', 'status'); d.textContent = t; document.body.appendChild(d); setTimeout(function () { d.remove(); }, 2200); }

  /* ---------- 관심 등록: 재개발 지도에 있는 구역은 단계 알림(proactive.js), 아니면 이 기기에만 저장 ---------- */
  var FAV = 'jdj_zfav';
  function favs() { try { return JSON.parse(localStorage.getItem(FAV) || '[]'); } catch (e) { return []; } }
  function isFav(z) { var P = window.JDJ_PRO; if (z.in_map && P && P.on()) return P.followed(z.id); return favs().some(function (x) { return x.id === z.id; }); }
  function toggleFav(z, lv) {
    var P = window.JDJ_PRO;
    if (z.in_map && P && P.on()) { var r = P.toggleZone({ id: z.id, st: lv || 0, n: z.n }); return r.full ? 'full' : r.on ? 'alert' : 'off'; }
    var L = favs(), i = L.findIndex(function (x) { return x.id === z.id; });
    if (i >= 0) { L.splice(i, 1); try { localStorage.setItem(FAV, JSON.stringify(L)); } catch (e) {} return 'off'; }
    if (L.length >= 30) return 'full';
    L.unshift({ id: z.id, n: z.n, t: TODAY }); try { localStorage.setItem(FAV, JSON.stringify(L)); } catch (e) {} return 'local';
  }

  /* ================= 구역 목록 ================= */
  function listPage() {
    var S = { q: '', sido: '', t: '', sort: 'name', shown: 60 }, IX = null, SL = {};
    app.hidden = false;
    app.innerHTML = '<div class="zl-top"><span class="tag">재개발·재건축 구역</span><h1 class="zh1">구역을 찾아보세요</h1>' +
      '<p class="lead">공식 공개 자료에 있는 정비구역이에요. 이름을 누르면 단계 이력·고시·사업 정보·판정을 한 페이지에서 볼 수 있어요. <a href="' + JB.SITE + 'villa/zone/">지도에서 보기 ›</a></p></div>' +
      '<div class="zl-f"><input id="zq" placeholder="구역·동 이름 찾기" autocomplete="off" aria-label="구역·동 이름 찾기">' +
      '<div class="row2"><select id="zsd" aria-label="시·도 고르기"><option value="">전국</option></select><select id="zt" aria-label="사업 종류 고르기"><option value="">모든 사업 종류</option></select></div>' +
      '<div class="chips" id="zsort" role="group" aria-label="정렬"></div></div><p class="sum" id="zsum"></p><div id="zlist"><div class="loading">구역 목록을 불러오는 중이에요…</div></div>';
    var st = $('zstatic'); if (st) st.hidden = true;
    get(DATA + 'redev/zone/index.json').then(function (j) {
      IX = j; SL = C.slugs((j.z || []).map(function (z) { return z.id; }));
      var sd = {}; j.z.forEach(function (z) { sd[z.sido] = (sd[z.sido] || 0) + 1; });
      $('zsd').innerHTML = '<option value="">전국 (' + j.z.length.toLocaleString('ko-KR') + '곳)</option>' + Object.keys(sd).sort(function (a, b) { return sd[b] - sd[a]; }).map(function (s) { return '<option value="' + esc(s) + '">' + esc(s) + ' (' + sd[s].toLocaleString('ko-KR') + '곳)</option>'; }).join('');
      var ts = {}; j.z.forEach(function (z) { ts[z.t] = 1; });
      $('zt').innerHTML = '<option value="">모든 사업 종류</option>' + Object.keys(j.types || {}).filter(function (k) { return ts[k]; }).map(function (k) { return '<option value="' + k + '">' + esc(j.types[k]) + '</option>'; }).join('');
      draw();
    }).catch(function () { $('zlist').innerHTML = '<div class="empty">구역 목록을 준비하고 있어요. 자료를 만든 뒤부터 보여 드려요. <a href="' + JB.SITE + 'villa/zone/">구역 지도</a>는 지금 볼 수 있어요.</div>'; if (st) st.hidden = false; });
    var SORTS = [['name', '이름순'], ['lv', '단계 높은 순'], ['gosi', '고시 많은 순']];
    function draw() {
      $('zsort').innerHTML = SORTS.map(function (s) { return '<button class="chip' + (S.sort === s[0] ? ' on' : '') + '" data-k="' + s[0] + '">' + s[1] + '</button>'; }).join('');
      var q = S.q.replace(/\s/g, '');
      var zs = IX.z.filter(function (z) { return (!S.sido || z.sido === S.sido) && (!S.t || z.t === S.t) && (!q || (z.n + (z.gn || '') + (z.sido || '')).replace(/\s/g, '').indexOf(q) >= 0); });
      zs.sort(function (a, b) { return S.sort === 'lv' ? (b.lv || 0) - (a.lv || 0) || a.n.localeCompare(b.n, 'ko') : S.sort === 'gosi' ? (b.gosi || 0) - (a.gosi || 0) || a.n.localeCompare(b.n, 'ko') : (a.sido + a.gn).localeCompare(b.sido + b.gn, 'ko') || a.n.localeCompare(b.n, 'ko'); });
      $('zsum').innerHTML = '구역 <b>' + zs.length.toLocaleString('ko-KR') + '곳</b>' + (S.sort !== 'name' ? ' · ' + (S.sort === 'lv' ? '단계가 높은 순서' : '연결된 고시가 많은 순서') + '로 줄 세웠어요(추천 순위 아님)' : '') + ' · 자료 만든 날 ' + esc(IX.v || '');
      $('zlist').innerHTML = zs.length ? zs.slice(0, S.shown).map(function (z) {
        return '<a class="zli" href="' + esc(base() + encodeURIComponent(SL[z.id]) + '/') + '"><span class="zli-n">' + esc(z.n) + '</span><span class="zli-t">' + esc((IX.types || {})[z.t] || '정비사업') + (z.sh ? ' · 신속통합기획' : '') + '</span>' +
          '<span class="zli-s">' + esc([z.sido, z.gn].filter(Boolean).join(' ')) + ' · ' + esc(z.sn || '단계 확인 필요') + (z.gosi ? ' · 고시 ' + z.gosi + '건' : '') + '</span></a>';
      }).join('') + (zs.length > S.shown ? '<button class="morebtn" id="zmore">더 보기 (' + (zs.length - S.shown).toLocaleString('ko-KR') + '곳 남음)</button>' : '') : '<div class="empty">조건에 맞는 구역이 없어요. 찾는 말이나 조건을 바꿔 보세요.</div>';
    }
    function base() { return /\/villa\/z\/$/.test(location.pathname) ? '' : JB.SITE + 'villa/z/'; }
    var tq; app.addEventListener('input', function (e) { if (e.target.id === 'zq') { clearTimeout(tq); tq = setTimeout(function () { S.q = e.target.value.trim(); S.shown = 60; if (IX) draw(); }, 200); } });
    app.addEventListener('change', function (e) { if (e.target.id === 'zsd') S.sido = e.target.value; else if (e.target.id === 'zt') S.t = e.target.value; else return; S.shown = 60; if (IX) draw(); });
    app.addEventListener('click', function (e) {
      var b = e.target.closest('#zsort button'); if (b) { S.sort = b.dataset.k; if (IX) draw(); return; }
      if (e.target.closest('#zmore')) { S.shown += 60; draw(); }
    });
  }

  /* ================= 구역 페이지 ================= */
  function lvOf(z) { return typeof (z.st && z.st.v) === 'number' ? z.st.v : null; }
  function stageDate(z) {
    var lv = lvOf(z), h = (z.hist || []).filter(function (x) { return x.lv === lv && x.ym; });
    if (h.length) return { d: h[h.length - 1].ym, s: h[h.length - 1].s };
    var s = z.src && z.st && z.src[z.st.s];
    if (z.st && z.st.d && s && s.dk !== 'got') return { d: z.st.d, s: z.st.s };
    return null;
  }
  function signals(z, mz, D, RT) {
    var out = [], lv = lvOf(z);
    if (z.done) out.push(['info', '원자료에 준공·해제된 구역으로 나와요. 지금 진행 중인 사업인지 구청에 확인해 주세요.']);
    if (z.st && z.st.chk) out.push(['warn', '단계와 날짜가 서로 맞지 않는 구역이에요. 원자료 오류일 수 있어 구청 확인이 필요해요.']);
    if ((z.gosi || []).some(function (g) { return g.k === 'lift'; })) out.push(['warn', '정비구역 해제와 관련된 고시가 있어요. 아래 고시 목록에서 원문을 확인해 주세요.']);
    if (z.rights && z.rights.est) out.push(['warn', '권리산정기준일이 공식 값이 아니라 추정이에요. 빌라·단독을 사기 전에 구청 고시로 꼭 확인해 주세요(그 뒤 쪼개진 집은 입주권이 안 나올 수 있어요).']);
    if (mz && D) { var s = R.speed(mz, D); if (s.state === 'est' && /오래 걸리고/.test(s.mine || '')) out.push(['warn', '지금 단계에서 과거 비슷한 구역 대부분보다 오래 머물고 있어요(원인은 자료로 알 수 없어요).']); }
    (RT ? RT.cards : []).forEach(function (c) { if (c.k === 'transfer' && c.v === 'on') out.push(['warn', '지금 사면 원칙적으로 조합원이 될 수 없는 단계예요(투기과열지구, 예외 확인 필요).']); if (c.k === 'live' && c.v === 'on') out.push(['info', '토지거래허가구역이라 허가를 받고 직접 살아야 해요.']); });
    var sd = stageDate(z), m = sd ? C.monthsIn(sd.d, TODAY) : null;
    if (!sd && lv) out.push(['info', '지금 단계의 날짜 자료가 없어 얼마나 머물렀는지 알 수 없어요.']);
    var src = z.src && z.st && z.src[z.st.s], asof = src && src.dk === 'asof' ? src.d : null, am = asof ? C.monthsIn(asof, TODAY) : null;
    if (am != null && am >= 6) out.push(['info', '단계 자료가 ' + am + '개월 전 기준이에요. 그 뒤 바뀐 단계는 아직 반영되지 않았을 수 있어요.']);
    void m;
    return out;
  }
  function detailPage(id) {
    app.hidden = false;
    app.innerHTML = '<div class="loading">구역 자료를 불러오는 중이에요…</div>';
    var st = $('zstatic');
    Promise.all([get(DATA + 'redev/zone/' + encodeURIComponent(id) + '.json'), get(DATA + 'redev/zones.json').catch(function () { return null; }), get(DATA + 'policy.json').catch(function () { return null; }), (C && C.regReady ? C.regReady() : null)])
      .then(function (a) { if (st) st.hidden = true; render(a[0], a[1], a[2]); })
      .catch(function () {
        // 상세 자료가 아직 없을 때: 재개발 지도 자료만으로(정적 내용은 그대로 둠)
        get(DATA + 'redev/zones.json').then(function (D) {
          var mz = (D.z || []).find(function (x) { return x.id === id; });
          if (!mz) throw new Error('nf');
          app.innerHTML = '<p class="note">구역 상세 자료를 준비하고 있어요. 지금은 <a href="' + JB.SITE + 'villa/zone/?z=' + encodeURIComponent(id) + '">구역 지도</a>에서 단계 이력과 착공 예상을 볼 수 있어요.</p>';
        }).catch(function () { app.innerHTML = st ? '' : '<div class="empty">이 구역 자료를 찾지 못했어요. <a href="' + JB.SITE + 'villa/z/">구역 목록</a>에서 다시 찾아 주세요.</div>'; });
      });
  }
  function render(z, D, pol) {
    var mz = D && z.in_map ? (D.z || []).find(function (x) { return x.id === z.id; }) : null;
    var lv = lvOf(z), tn = z.tn || (R.TYPES[z.t]) || '정비사업';
    var RT = C.rights(pol, { t: z.t, lv: lv, g: z.g, dong: mz && mz.umd, kind: z.t === 'rb' ? 'apt' : '' });
    var sd = stageDate(z), mon = sd ? C.monthsIn(sd.d, TODAY) : null;
    if (!main.dataset.id) document.title = z.n + ' ' + tn + ' — 단계·고시·사업 정보 | 집예보';
    var h = [];
    // ① 머리
    h.push('<nav class="bc" aria-label="위치"><a href="' + JB.SITE + 'villa/zone/">구역 지도</a> › <a href="' + JB.SITE + 'villa/z/">구역 목록</a> › <span>' + esc(z.n) + '</span></nav>');
    h.push('<section class="zhead"><div class="zbadges"><span class="tb" style="background:' + (R.COLOR[z.t] || '#4E5968') + '">' + esc(tn) + '</span>' + (z.sh ? '<span class="tb sh">신속통합기획</span>' : '') + (z.small ? '<span class="tb sh">소규모 정비</span>' : '') + '</div>' +
      '<h1 class="zh1">' + esc(z.n) + '</h1><p class="zloc">' + esc([z.sido, z.gn].filter(Boolean).join(' ')) + (z.addr && z.addr.v ? ' · ' + esc(z.addr.v) : '') + '</p>' +
      (lv && lv <= 10 && !z.small ? '<div class="lvbar" aria-hidden="true">' + Array.from({ length: 10 }, function (_, i) { return '<i class="' + (i < lv ? 'on' : '') + '"></i>'; }).join('') + '</div>' : '') +
      '<p class="zstg">지금 단계: <b>' + esc((z.st && z.st.nm) || (lv ? R.STAGES[lv] : '') || '확인 필요') + '</b>' + (lv && lv <= 10 && !z.small ? ' <small>(10단계 중 ' + lv + '단계)</small>' : '') + '</p>' +
      '<p class="zmon">' + (sd ? esc(ymd(sd.d)) + '부터 · <b>지금 단계 ' + (mon != null ? mon + '개월째' : '') + '</b>' : '지금 단계의 날짜 자료가 없어요') + (z.st && z.st.chk ? ' <span class="bd warn">확인 필요</span>' : '') + '</p>' +
      (z.gosi_stage ? '<p class="note">고시 기준으로는 더 뒤 단계예요: ' + esc(ymd(z.gosi_stage.d)) + ' ' + esc(z.gosi_stage.nm || '') + ' — <a href="' + esc(z.gosi_stage.url) + '" target="_blank" rel="noopener">고시 원문 ↗</a> (공식 단계 값은 바꾸지 않았어요)</p>' : '') +
      '</section>');
    // ② 숫자 4칸
    var B = z.biz || {}, R4 = [['area', '구역 면적', '㎡'], ['hh', '계획 세대수', '세대'], ['far', '용적률', '%']];
    h.push('<div class="znum">' + R4.map(function (r) { var v = fmtV(B[r[0]], r[2]); return '<div><span>' + r[1] + '</span><b>' + (v ? esc(v) : '<i>자료 없음</i>') + '</b>' + (v ? srcShort(z.src, B[r[0]].s, B[r[0]].d) : '') + '</div>'; }).join('') +
      '<div><span>권리산정기준일</span><b>' + (z.rights && z.rights.v ? esc(ymd(z.rights.v)) + (z.rights.est ? ' <span class="bd est">추정</span>' : '') : '<i>자료 없음</i>') + '</b>' + (z.rights ? (z.rights.est ? '<span class="zsrc">' + esc(z.rights.basis || '') + '</span>' : srcShort(z.src, z.rights.s, z.rights.d) + (z.rights.url ? ' <a class="zsrc" href="' + esc(z.rights.url) + '" target="_blank" rel="noopener">원문 ↗</a>' : '')) : '') + '</div></div>');
    // ③ 행동 단추
    h.push('<div class="zact"><button class="zbtn" id="zfav" type="button" aria-pressed="' + isFav(z) + '">' + (isFav(z) ? '★ 관심 구역' : '☆ 관심 등록') + '</button><a class="zbtn pri" href="' + JB.SITE + 'villa/calc/?z=' + encodeURIComponent(z.id) + '" data-track="redev_zone_calc">분담금 계산해 보기</a>' +
      (z.in_map ? '<a class="zbtn" href="' + JB.SITE + 'villa/zone/?z=' + encodeURIComponent(z.id) + '">지도에서 보기</a>' : '') + '<button class="zbtn" id="zshare2" type="button">공유</button></div><p class="note" id="zfavmsg" role="status"></p>');
    // 탭(구역 안 바로 가기)
    var T = [['zs-prog', '진행'], ['zs-risk', '위험 신호'], ['zs-biz', '사업 정보'], ['zs-gosi', '고시'], ['zs-mkt', '주변 시세'], ['zs-rule', '판정'], ['zs-src', '출처']];
    h.push('<nav class="ztabs" aria-label="이 페이지 안 바로 가기">' + T.map(function (t) { return '<a href="#' + t[0] + '">' + t[1] + '</a>'; }).join('') + '</nav>');
    // ④ 진행: 단계 타임라인 + 착공 예상
    var tl = (z.hist || []).slice().sort(function (a, b) { return String(a.ym).localeCompare(String(b.ym)) || a.lv - b.lv; });
    var p = '<section id="zs-prog" class="zsec"><h2>단계 이력</h2>';
    if (tl.length) p += '<ol class="tl">' + tl.map(function (x, i) { var cur = x.lv === lv && i === tl.length - 1; return '<li class="' + (cur ? 'cur' : '') + '"><b>' + esc(x.nm || R.STAGES[x.lv] || '') + '</b> ' + esc(R.ym(x.ym)) + (cur && mon != null ? ' <span class="bd now">지금 · ' + mon + '개월째</span>' : '') + (R.PLAIN[x.lv] ? '<small>' + esc(R.PLAIN[x.lv]) + '</small>' : '') + '</li>'; }).join('') + '</ol>';
    else p += '<p class="note">원자료에 단계별 날짜가 없어요. 지금 단계만 있어요' + (z.sido !== '서울특별시' ? '(서울 밖 구역은 대부분 지금 단계만 공개돼요)' : '') + '.</p>';
    if (tl.length) p += '<p class="note">날짜 출처: ' + Array.from(new Set(tl.map(function (x) { return x.s; }))).map(function (k) { return srcLine(z.src, k); }).join(' · ') + '</p>';
    if (mz && D) {
      var s = R.speed(mz, D);
      p += '<h3>착공은 언제쯤일까요</h3>';
      if (s.state === 'est') p += '<div class="sp' + (s.badge === 'ok' ? '' : ' ref') + '">' + (s.badge === 'ok' ? '<span class="bd ok">맞힌 기록 있음</span>' : '<span class="bd ref">참고</span>') + '<b>' + esc(s.mine) + '</b><br>' + esc(s.head) + '.</div><p class="note"><b>과거로 돌아가 맞혀 본 기록</b> — ' + esc(s.who) + ' 구역 기준. ' + esc(s.why) + ' <a href="' + JB.SITE + 'villa/zone/#how">계산 방법 ›</a></p>';
      else p += '<div class="sp ref">' + esc(s.head) + '</div>';
    } else if (z.sp && z.sp.y) p += '<h3>착공은 언제쯤일까요</h3><div class="sp ref">' + (z.sp.ok ? '<span class="bd ok">맞힌 기록 있음</span>' : '<span class="bd ref">참고</span>') + '과거 비슷한 구역 기준 착공 ' + (z.sp.y[0] === z.sp.y[1] ? z.sp.y[0] : z.sp.y[0] + '~' + z.sp.y[1]) + '년 무렵</div>';
    else p += '<h3>착공은 언제쯤일까요</h3><p class="note">이 구역은 과거 비슷한 구역 자료(서울 정비사업 추진현황의 단계별 날짜)가 없어 착공 시기를 예상하지 않았어요.</p>';
    h.push(p + '</section>');
    // ⑤ 위험 신호
    var sg = signals(z, mz, D, RT);
    h.push('<section id="zs-risk" class="zsec"><h2>위험 신호</h2>' + (sg.length ? '<ul class="zsig">' + sg.map(function (x) { return '<li class="' + x[0] + '">' + esc(x[1]) + '</li>'; }).join('') + '</ul>' : '<p class="note">공개 자료에서 찾은 위험 신호는 없어요.</p>') +
      '<p class="note">조합 분쟁·소송·시공사 계약 같은 위험은 공개 자료에 없어 여기서 알 수 없어요. 조합·구청 자료로 함께 확인해 주세요.</p></section>');
    // ⑥ 사업 정보
    var rows = BIZ.filter(function (r) { return B[r[0]] && fmtV(B[r[0]], r[2]); });
    h.push('<section id="zs-biz" class="zsec"><h2>기본 정보·사업 정보</h2>' + (rows.length ? '<dl class="zdl">' + rows.map(function (r) { var x = B[r[0]]; return '<div><dt>' + r[1] + (x.est ? ' <span class="bd est">추정</span>' : '') + '</dt><dd>' + esc(fmtV(x, r[2])) + (x.note ? '<small>' + esc(x.note) + '</small>' : '') + srcShort(z.src, x.s, x.d) + '</dd></div>'; }).join('') + '</dl>' : '<p class="note">공식 공개 자료에 이 구역의 사업 정보(면적·세대수·용적률 등)가 없어요.</p>') +
      '<p class="note">조합원 분양가: 기계로 읽을 수 있는 공식 공개 자료가 없어요. 관리처분계획 고시 원문에서 확인해 주세요' + ((z.gosi || []).some(function (g) { return g.k === 'mgmt'; }) ? '(아래 고시 목록의 관리처분계획인가 고시)' : '') + '.' + (B.contractor ? '' : ' 시공사: 공식 자료 없음.') + '</p></section>');
    // ⑦ 고시
    var G = z.gosi || [], es = z.src && z.src.eum_gosi;
    h.push('<section id="zs-gosi" class="zsec"><h2>고시·공고 <small>' + (z.gosi_n || G.length) + '건</small></h2>' + (es ? '<p class="note">고시 목록 기준일 ' + esc(ymd(es.d)) + ' — ' + esc(es.name) + '. 그 뒤 고시는 다음 공개 때 더해져요.</p>' : '') +
      (G.length ? '<ul class="zgosi">' + G.map(function (g) { return '<li><span class="gk" style="background:' + (GK[g.k] || GK.etc) + '">' + esc(g.kn || '기타') + '</span><span class="gd">' + esc(g.d) + '</span>' + (g.u ? '<a href="' + esc(g.u) + '" target="_blank" rel="noopener">' + esc(g.t) + ' ↗</a>' : '<span>' + esc(g.t) + '</span>') + (g.no ? '<small>' + esc(g.no) + '</small>' : '') + '</li>'; }).join('') + '</ul>' : '<p class="note">이 구역 이름으로 확실하게 연결되는 고시를 찾지 못했어요. 이름이 비슷한 다른 사업 고시는 일부러 뺐어요.</p>') +
      ((z.links || []).length ? '<div class="links">' + z.links.map(function (l) { return '<a href="' + esc(l.u) + '" target="_blank" rel="noopener">' + esc(l.t) + '<span>↗</span></a>'; }).join('') + '</div>' : '') + '</section>');
    // ⑧ 주변 시세·이주 영향·관련 단지
    var mk = '<section id="zs-mkt" class="zsec"><h2>주변 시세·이주 영향</h2>';
    var tr = z.trade;
    if (tr && tr.rows && tr.rows.length) mk += '<h3>이 구역 이름 단지 분양권·입주권 실거래 <small>' + tr.rows.length + '건</small></h3><table class="ztr"><thead><tr><th>계약</th><th>구분</th><th>전용</th><th class="num">금액</th></tr></thead><tbody>' + tr.rows.slice(0, 12).map(function (r) { return '<tr><td>' + esc(R.ym(r.ym)) + (r.dd ? ' ' + r.dd + '일' : '') + '<small>' + esc(r.nm || '') + (r.f ? ' · ' + r.f + '층' : '') + '</small></td><td>' + (r.k === 'ipju' ? '입주권' : '분양권') + '</td><td>' + esc(r.a) + '㎡</td><td class="num">' + esc(C.won(r.p)) + '</td></tr>'; }).join('') + '</tbody></table><p class="note">' + srcLine(z.src, tr.s, tr.d) + ' — 같은 시·군·구에서 단지 이름이 구역 이름과 같은 거래만 모았어요(해제 거래 제외).</p>';
    else mk += '<p class="note">이 구역 이름과 같은 단지의 분양권·입주권 실거래는 아직 없어요.</p>';
    var M2 = mz ? R.mv(mz, D) : null;
    if (M2) mk += '<h3>이주 앞둔 구역 주변 전세</h3><p class="note" style="color:var(--ink)">' + esc(M2.head) + '</p>' + (M2.rows.length ? '<table class="ztr"><tbody>' + M2.rows.map(function (r) { return '<tr><td>' + esc(r.dong) + '<small>' + esc(r.gn) + ' · ' + r.km + 'km</small></td><td><span class="' + (r.up ? 'up' : r.flat ? '' : 'dn') + '">' + esc(r.line) + '</span><small>최근 1년 전세 보증금 변화 · ' + esc(r.at) + ' 기준</small></td></tr>'; }).join('') + '</tbody></table>' : '<p class="note">' + esc(M2.none) + '</p>') + '<p class="note">' + esc(M2.note) + '</p>';
    var nb = (mz && mz.nb) || [];
    if (nb.length) mk += '<h3>가까운 새 아파트(관련 단지)</h3><p class="note">준공 ' + D.new_years + '년 안, ' + D.near_km + 'km 안 아파트예요. 다 지어진 뒤 모습을 가늠하는 데 참고가 돼요.</p><div class="links" id="znb">' + nb.map(function (x) { return '<a href="' + esc(R.nbHref(JB.SITE, x)) + '" data-track="redev_zone_nb">' + esc(x.n) + ' <small>' + x.by + '년 준공 · ' + x.km + 'km</small><span>›</span></a>'; }).join('') + '</div><div id="zcomps"></div>';
    h.push(mk + '</section>');
    // ⑨ 판정
    h.push('<aside class="zside"><section id="zs-rule" class="zsec"><h2>실거주 의무·조합원 지위 양도</h2>' + RT.cards.map(function (c) {
      return '<div class="zrule ' + c.v + '"><h3>' + esc(c.t) + '</h3><p class="rh">' + esc(c.head) + '</p>' + (c.body ? '<p>' + esc(c.body) + '</p>' : '') +
        '<p class="zsrc">' + (c.law || []).map(function (l) { return '<a href="' + esc(l.url) + '" target="_blank" rel="noopener">' + esc(l.nm) + ' ↗</a>'; }).join(' · ') + (c.src ? ' · 정책: <a href="' + esc(c.src.url) + '" target="_blank" rel="noopener">' + esc(c.src.nm) + ' ↗</a>' : '') + '</p></div>';
    }).join('') + '<p class="note">' + (RT.basis ? esc(RT.basis) + '. ' : '') + '규제지역 표(투기과열지구·토지거래허가 지정)와 법 조문의 일반 규칙으로만 판정했어요. 예외·적용 시점·구역 단위 지정은 사람마다 달라 꼭 구청·전문가에게 확인해 주세요. 법률 자문이 아니에요.</p></section>');
    // ⑩ 계산 + 출처
    h.push('<section class="zsec zcalc"><h2>내 돈은 얼마나 들까요</h2><p class="note">감정평가액·비례율·조합원 분양가를 넣으면 권리가액·분담금·총 투입금을 계산해 드려요. 집예보가 넣어 둔 가정값은 없어요.</p><a class="zbtn pri wide" href="' + JB.SITE + 'villa/calc/?z=' + encodeURIComponent(z.id) + '">분담금·수익 계산기 열기</a></section></aside>');
    h.push('<section id="zs-src" class="zsec"><h2>출처</h2><ul class="zsrcl">' + Object.keys(z.src || {}).map(function (k) { var s = z.src[k]; return '<li>' + (s.url ? '<a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.name) + '</a>' : esc(s.name)) + (s.d ? ' · ' + esc(ymd(s.d)) + (s.dk === 'got' ? ' 받음' : ' 기준') : '') + '</li>'; }).join('') + '</ul><p class="note">' + esc(z.note || '공식 공개 자료를 그대로 옮긴 참고자료예요(법적 효력 없음).') + ' 자료 만든 날 ' + esc(z.built || '') + '.</p></section>');
    app.innerHTML = h.join('');
    track('redev_zone_view', { id: z.id, t: z.t });
    // 행동
    $('zfav').onclick = function () {
      var r = toggleFav(z, lv), b = $('zfav'), on = r === 'alert' || r === 'local';
      if (r === 'full') { $('zfavmsg').textContent = '관심 구역은 ' + (z.in_map ? '20' : '30') + '곳까지예요.'; return; }
      b.textContent = on ? '★ 관심 구역' : '☆ 관심 등록'; b.setAttribute('aria-pressed', on);
      $('zfavmsg').innerHTML = r === 'alert' ? '다음 단계로 넘어가면 알려 드려요. 메일로 받으려면 <a href="' + JB.SITE + 'my/alerts/#pv">알림 센터</a>에서 \'따라보는 구역 단계 변화\'를 켜 주세요.' : r === 'local' ? '이 기기에 관심 구역으로 저장했어요.' : '관심 구역에서 뺐어요.';
      track('redev_zone_fav', { id: z.id, on: on ? 1 : 0 });
    };
    var sh = function () { share(z.n + ' ' + tn + ' | 집예보'); };
    $('zshare2').onclick = sh;
    if (nb.length) nearPrices(nb);
  }
  /* 가까운 새 아파트 최근 1년 실거래(㎡당 중간값) — 계산기와 같은 함수(C.comps) */
  function nearPrices(nb) {
    var gs = Array.from(new Set(nb.map(function (x) { return x.g; })));
    Promise.all(gs.map(function (g) { return get(DATA + 'price/' + g + '.json').then(function (j) { return j.units || []; }).catch(function () { return []; }); })).then(function (us) {
      var cs = C.comps([].concat.apply([], us), nb, TODAY), el = $('zcomps'); if (!el) return;
      el.innerHTML = cs.length ? '<table class="ztr"><thead><tr><th>단지</th><th class="num">3.3㎡당 중간값</th></tr></thead><tbody>' + cs.map(function (c) { return '<tr><td>' + esc(c.n) + '<small>최근 1년 ' + c.cnt + '건 · ' + esc(c.from.slice(0, 4) + '.' + c.from.slice(4, 6)) + '~' + esc(c.to.slice(0, 4) + '.' + c.to.slice(4, 6)) + '</small></td><td class="num">' + esc(C.won(c.med * 3.3058)) + '</td></tr>'; }).join('') + '</tbody></table><p class="note">국토교통부 아파트 매매 실거래(직거래 제외) — 거래 3건 이상인 단지만이에요.</p>' : '<p class="note">가까운 새 아파트의 최근 1년 거래가 적어(단지마다 3건 미만) 시세 숫자는 보여 드리지 않아요.</p>';
    });
  }

  if (!R || !C || !main) return;
  if (ID) detailPage(ID); else listPage();
})();
