/* 이사 견적 받기(이사업체 제휴) — 공용 화면 도구(window.JDJ_MOVE)
   - 지금은 숨김: assets/config.js MOVE_ENABLED 가 true 가 아니면 어떤 화면에도 버튼·칸이 나오지 않아요.
     운영자 미리 보기 = move/admin/ 에서 [이 기기에서 미리 보기 켜기]를 누른 기기(모닝 브리핑 운영자 모드 계정으로 카카오 간편 로그인) + 주소에 ?preview=move.
     서버(tools/agent-backend.gs 'v57')도 운영자 계정만 받아 줘요.
   - 버튼 붙이기: 화면 어디든 <div data-move-cta data-g="11680" data-d="대치동" data-date="2027-02-28" data-src="switch"></div> 를 두고 이 파일을 불러오면
     켜져 있을 때만 [이사 견적 받기] 버튼이 생겨요. 직접 쓰려면 JDJ_MOVE.cta({ g, d, date, src }) → HTML(꺼져 있으면 빈 글자).
   - [data-move-only] 칸(개인정보처리방침 등)은 켜져 있을 때만 보여요.
   - 계산 규칙은 assets/move-core.js(서버와 같은 글자). 포인트·연락처는 모두 서버에서만 다뤄요. */
(function (root) {
  'use strict';
  var JB = (typeof window !== 'undefined' && window.JDJ_BASE) || (function (p) { var g = p.indexOf('/jangdaejang-calc/') === 0, b = { SITE: g ? '/jangdaejang-calc/' : '/', DATA: g ? '/jangdaejang-data/' : 'https://chrisjangdaejang-ux.github.io/jangdaejang-data/' }; if (typeof window !== 'undefined') window.JDJ_BASE = b; return b; })((typeof location !== 'undefined' && location.pathname) || '/jangdaejang-calc/');
  var LS_PV = 'jdj_mv_preview', SS_PV = 'jdj_mv_pv', LS_AUTH = 'jdj_auth', LS_MINE = 'jdj_mv_mine';
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var ls = { get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }, del: function (k) { try { localStorage.removeItem(k); } catch (e) {} } };
  var ss = { get: function (k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }, set: function (k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} }, del: function (k) { try { sessionStorage.removeItem(k); } catch (e) {} } };
  var site = function () { return String((root.JDJ_SITE || {}).SITE_NAME || '').trim(); };
  var api = function () { return (root.JDJ_AGENTS && root.JDJ_AGENTS.api) || ''; };

  /* ---------- 켜짐 확인 ---------- */
  function sess() { try { var j = JSON.parse(ls.get(LS_AUTH) || 'null'); return j && /^[0-9a-f]{64}$/.test(String(j.s || '')) ? j.s : ''; } catch (e) { return ''; } }
  function preview() {
    if (typeof location === 'undefined') return false;
    if (ls.get(LS_PV) !== '1' || !sess()) { ss.del(SS_PV); return false; }
    if (/[?&]preview=move(&|$)/.test(location.search)) { ss.set(SS_PV, '1'); return true; }
    return ss.get(SS_PV) === '1';
  }
  function on() { return (root.JDJ_SITE || {}).MOVE_ENABLED === true; }
  function enabled() { return on() || preview(); }
  /** 미리 보기 중이면 안쪽 링크에 ?preview=move 를 붙여 다음 화면에서도 이어지게 */
  function link(path) { var pv = preview() && !on(); return JB.SITE + path + (pv ? (path.indexOf('?') < 0 ? '?' : '&') + 'preview=move' : ''); }

  /* ---------- 서버 ---------- */
  function post(body) {
    if (!api()) return Promise.reject(new Error('서버가 아직 연결되지 않았어요.'));
    var b = Object.assign({}, body), s = sess();
    if (s && !b.s) b.s = s;
    return fetch(api(), { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(b) })
      .then(function (r) { return r.json(); }).then(function (j) {
        if (j && j.err === 'unknown') { var e0 = new Error('준비 중이에요. 조금만 기다려 주세요.'); e0.code = 'unknown'; throw e0; }
        if (!j || !j.ok) { var t = (j && j.err) || '', e = new Error(/[가-힣]/.test(t) ? t : '잠시 뒤 다시 시도해 주세요. 계속되면 카카오톡 상담으로 알려 주세요.'); e.raw = t; e.code = (j && j.code) || ''; throw e; }
        return j;
      }, function (e) { if (e && e.code) throw e; throw new Error('인터넷 연결을 확인하고 잠시 뒤 다시 시도해 주세요.'); });
  }

  /* ---------- 이 기기에 저장하는 내 요청 열쇠(이름·연락처는 저장하지 않음) ---------- */
  function mine() { try { var a = JSON.parse(ls.get(LS_MINE) || '[]'); return Array.isArray(a) ? a.filter(function (x) { return x && /^M[0-9A-F]{9}$/.test(String(x.id)) && /^[0-9a-f]{32}$/.test(String(x.t)); }).slice(-10) : []; } catch (e) { return []; } }
  function mineAdd(x) { var a = mine().filter(function (y) { return y.id !== x.id; }); a.push({ id: x.id, t: x.t, date: x.date || '' }); ls.set(LS_MINE, JSON.stringify(a.slice(-10))); }
  function mineDrop(id) { ls.set(LS_MINE, JSON.stringify(mine().filter(function (y) { return y.id !== id; }))); }

  /* ---------- 지역 고르기: 시·도 → 시·군·구 → 동 ---------- */
  var ixP = null, dongP = {};
  function sgg() { if (!ixP) ixP = fetch(JB.DATA + 'data/index.json').then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }).then(function (ix) { return (ix && ix.sgg) || {}; }); return ixP; }
  function dongsOf(g) {
    var sd = String(g).slice(0, 2);
    if (!dongP[sd]) dongP[sd] = fetch(JB.SITE + 'assets/dong/' + sd + '.json').then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
    return dongP[sd].then(function (j) { var rows = (j && j.rows) || {}; return Object.keys(rows).filter(function (k) { return k.slice(0, 6) === g + '|'; }).map(function (k) { return k.slice(6); }).sort(function (a, b) { return a.localeCompare(b, 'ko'); }); });
  }
  function sortSido(list) { return root.JDJ_KO && root.JDJ_KO.sortSido ? root.JDJ_KO.sortSido(list) : list.sort(function (a, b) { return a.localeCompare(b, 'ko'); }); }
  /** 세 칸(시·도·시·군·구·동) 묶음 HTML. id 앞글자 p */
  function pickerHtml(p, label) {
    return '<div class="mv-pick" data-pick="' + p + '" role="group" aria-label="' + esc(label) + '">'
      + '<select id="' + p + 'Sd" aria-label="' + esc(label) + ' 시·도"><option value="">시·도</option></select>'
      + '<select id="' + p + 'Sg" aria-label="' + esc(label) + ' 시·군·구"><option value="">시·군·구</option></select>'
      + '<select id="' + p + 'Dn" aria-label="' + esc(label) + ' 동"><option value="">동</option></select></div>';
  }
  /** 고르기 칸 움직이기. want = { g, d } 미리 채울 값. 돌려줌 { get() → { g, d, gn } } */
  function pickerBind(p, want) {
    var sd = document.getElementById(p + 'Sd'), sg = document.getElementById(p + 'Sg'), dn = document.getElementById(p + 'Dn'), SG = {};
    function fillSg(g) {
      var list = Object.keys(SG).filter(function (x) { return SG[x].sido === sd.value; });
      list.sort(function (a, b) { return String(SG[a].name).localeCompare(String(SG[b].name), 'ko'); });
      sg.innerHTML = '<option value="">시·군·구</option>' + list.map(function (x) { return '<option value="' + x + '"' + (x === g ? ' selected' : '') + '>' + esc(SG[x].name) + '</option>'; }).join('');
    }
    function fillDn(d) {
      if (!sg.value) { dn.innerHTML = '<option value="">동</option>'; return Promise.resolve(); }
      return dongsOf(sg.value).then(function (list) {
        if (d && list.indexOf(d) < 0) list = list.concat([d]);
        dn.innerHTML = '<option value="">동</option>' + list.map(function (x) { return '<option' + (x === d ? ' selected' : '') + '>' + esc(x) + '</option>'; }).join('');
      });
    }
    var ready = sgg().then(function (m) {
      SG = m;
      var sds = sortSido(Array.from(new Set(Object.keys(SG).map(function (g) { return SG[g].sido; }))));
      sd.innerHTML = '<option value="">시·도</option>' + sds.map(function (x) { return '<option>' + esc(x) + '</option>'; }).join('');
      if (want && want.g && SG[want.g]) { sd.value = SG[want.g].sido; fillSg(want.g); return fillDn(want.d || ''); }
    });
    sd.onchange = function () { fillSg(''); fillDn(''); };
    sg.onchange = function () { fillDn(''); };
    return { ready: ready, get: function () { return { g: sg.value, d: dn.value, gn: SG[sg.value] ? SG[sg.value].name : '' }; } };
  }

  /* ---------- 사진 줄이기(긴 변 1280px JPEG — 보험 증권 글자가 읽히게) ---------- */
  function shrink(file) {
    return new Promise(function (ok, no) {
      if (!file) return ok('');
      if (!/^image\/(jpeg|png|webp|heic|heif)$/i.test(file.type || '') && !/\.(jpe?g|png|webp|heic)$/i.test(file.name || '')) return no(new Error('사진 파일(JPG·PNG)만 올릴 수 있어요.'));
      var fr = new FileReader();
      fr.onerror = function () { no(new Error('사진을 읽지 못했어요. 다른 사진을 골라 주세요.')); };
      fr.onload = function () {
        var im = new Image();
        im.onerror = function () { no(new Error('사진을 읽지 못했어요. JPG·PNG로 다시 골라 주세요.')); };
        im.onload = function () {
          var k = Math.min(1, 1280 / Math.max(im.width, im.height)), c = document.createElement('canvas');
          c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
          c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
          ok(c.toDataURL('image/jpeg', 0.85));
        };
        im.src = fr.result;
      };
      fr.readAsDataURL(file);
    });
  }

  /* ---------- [이사 견적 받기] 버튼 ---------- */
  var CSS = '.mv-cta{display:flex;align-items:center;gap:12px;flex-wrap:wrap;border:1px solid #D8E3FF;background:#F4F7FF;border-radius:14px;padding:12px 14px;margin:10px 0}'
    + '.mv-cta p{margin:0;flex:1 1 200px;font-size:14.5px;line-height:1.55;color:#333D4B;word-break:keep-all}.mv-cta p b{display:block;font-size:15.5px;color:#191F28}'
    + '.mv-cta a{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:0 16px;border-radius:12px;background:#2F6BFF;color:#fff;font-weight:800;text-decoration:none;white-space:nowrap}';
  function css() { if (typeof document === 'undefined' || document.getElementById('mvCss')) return; var s = document.createElement('style'); s.id = 'mvCss'; s.textContent = CSS; document.head.appendChild(s); }
  function ctaUrl(o) {
    o = o || {};
    var q = [];
    if (/^\d{5}$/.test(String(o.g || ''))) q.push('fg=' + o.g);
    if (o.d) q.push('fd=' + encodeURIComponent(String(o.d).slice(0, 20)));
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(o.date || ''))) q.push('date=' + o.date);
    if (o.src) q.push('src=' + encodeURIComponent(String(o.src).slice(0, 12)));
    return link('move/' + (q.length ? '?' + q.join('&') : ''));
  }
  function cta(o) {
    if (!enabled()) return '';
    css();
    return '<div class="mv-cta"><p><b>이사가 정해졌나요?</b>날짜와 동만 알려 주시면 제휴 이사업체 최대 3곳이 견적 전화를 드려요.</p><a href="' + esc(ctaUrl(o)) + '" data-track="move_cta_' + esc((o && o.src) || 'etc') + '">이사 견적 받기</a></div>';
  }
  function mount() {
    if (typeof document === 'undefined') return;
    var on2 = enabled();
    document.querySelectorAll('[data-move-only]').forEach(function (el) { el.hidden = !on2; });
    if (!on2) return;
    document.querySelectorAll('[data-move-cta]').forEach(function (el) {
      if (el.getAttribute('data-mv-done')) return; el.setAttribute('data-mv-done', '1');
      el.innerHTML = cta({ g: el.getAttribute('data-g'), d: el.getAttribute('data-d'), date: el.getAttribute('data-date'), src: el.getAttribute('data-src') });
    });
  }
  if (typeof document !== 'undefined') { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount(); }

  root.JDJ_MOVE = { LS_PV: LS_PV, esc: esc, site: site, enabled: enabled, preview: preview, on: on, link: link, post: post, mine: mine, mineAdd: mineAdd, mineDrop: mineDrop,
    sgg: sgg, dongsOf: dongsOf, pickerHtml: pickerHtml, pickerBind: pickerBind, shrink: shrink, cta: cta, ctaUrl: ctaUrl, mount: mount };
})(typeof window !== 'undefined' ? window : globalThis);
