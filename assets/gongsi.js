/* 공시가격 자동 채우기 공용 (단지 세금 칸 assets/tax-box.js, /tax/ 재산세·종부세, /tax/transfer/ 상속·증여 취득세)
   자료: jangdaejang-data data/gongsi/{시군구코드}.json — 엔진 scripts/gongsi.py 가 국토교통부 '주택 공시가격 정보'(공동주택 호별, 매년 1월 1일 기준)로 만든 요약
     {"y":2026,"d":"2026-01-01","u":{"구코드|동|지번"(한 지번 여러 단지면 "…|지번|단지명"): [[평형, 중간값, 호 수, 최소, 최대, 저층, 중층, 고층, 전용㎡], ...]}}  (금액 만 원)
   - 같은 평형 호별 '중간값'을 입력칸에 미리 넣고 출처 한 줄을 붙인다. 사용자가 고칠 수 있고, 고치면 고친 값으로 계산(중간값 다시 넣기 버튼).
   - 공시가격이 없는 단지(새 단지·못 맞춘 단지)는 아무것도 채우지 않음 → 지금처럼 직접 입력.
   - 시세×현실화율 같은 추정은 하지 않음. */
(function (root) {
  'use strict';
  var JB = (typeof window !== 'undefined' && window.JDJ_BASE) || (function (p) { var g = p.indexOf('/jangdaejang-calc/') === 0, b = { SITE: g ? '/jangdaejang-calc/' : '/', DATA: g ? '/jangdaejang-data/' : 'https://chrisjangdaejang-ux.github.io/jangdaejang-data/' }; if (typeof window !== 'undefined') window.JDJ_BASE = b; return b; })((typeof location !== 'undefined' && location.pathname) || '/jangdaejang-calc/');
  var DATA = JB.DATA + 'data/gongsi/';
  var ALIMI = 'https://www.realtyprice.kr/notice/main/mainBody.htm';
  var cache = {};
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

  /** 만 원 → '18억 9,900만 원' */
  function man(v) {
    v = Math.round(+v || 0); if (!v) return '0원';
    var e = Math.floor(v / 10000), m = v % 10000;
    return (e ? e.toLocaleString('ko-KR') + '억' + (m ? ' ' : '') : '') + (m ? m.toLocaleString('ko-KR') + '만' : '') + ' 원';
  }
  /** '2026-01-01' → '2026년 1월 1일' */
  function dayKo(d) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d || ''); return m ? (+m[1]) + '년 ' + (+m[2]) + '월 ' + (+m[3]) + '일' : '';
  }

  /** 시군구 파일 안에서 단지·평형 찾기 (순수 함수 — tools/gongsi-test.js)
      o: {code, dong, jibun, apt, band, area}. 평형이 없으면 전용면적이 가장 가까운(±10㎡) 평형. 없으면 null */
  function pick(file, o) {
    if (!file || !file.u || !o || !o.code || !o.dong || o.jibun == null) return null;
    var base = o.code + '|' + o.dong + '|' + o.jibun;
    var rows = (o.apt && file.u[base + '|' + o.apt]) || file.u[base];
    if (!rows || !rows.length) return null;
    var r = null, exact = true;
    for (var i = 0; i < rows.length; i++) if (rows[i][0] === o.band) { r = rows[i]; break; }
    if (!r && o.area > 0) {
      var best = 1e9;
      for (var j = 0; j < rows.length; j++) { var dd = Math.abs(rows[j][8] - o.area); if (dd < best) { best = dd; r = rows[j]; } }
      if (best > 10) r = null; exact = false;
    }
    if (!r || !(r[1] > 0)) return null;
    return { v: r[1], n: r[2], min: r[3], max: r[4], lo: r[5] || 0, mid: r[6] || 0, hi: r[7] || 0, area: r[8], band: r[0], exact: exact,
             d: file.d || '', y: file.y || null };
  }

  /** 출처 한 줄(HTML). info: pick 결과 또는 {v, d}(다른 화면에서 넘어온 값). edited: 사용자가 값을 고쳤는지 */
  function noteHtml(info, edited) {
    if (!info) return '';
    var head = esc(dayKo(info.d) || '올해') + ' 공시가격(국토교통부), 같은 평형 호별 중간값 — 우리 집 공시가격은 <a href="' + ALIMI + '" target="_blank" rel="noopener">부동산공시가격알리미 ↗</a>에서 확인';
    var det = [];
    if (info.n > 1) det.push((info.exact === false ? '전용 약 ' + info.area + '㎡ ' : '이 평형 ') + info.n.toLocaleString('ko-KR') + '호 · ' + man(info.min).replace(' 원', '') + '~' + man(info.max));
    if (info.lo && info.hi && info.lo !== info.hi) det.push('저층 ' + man(info.lo).replace(' 원', '') + ' · 고층 ' + man(info.hi).replace(' 원', ''));
    var tail = edited ? '<span class="gsx">직접 고친 값으로 계산해요 (중간값 ' + man(info.v) + ')</span> <button type="button" class="gsr" data-gs-reset>중간값 다시 넣기</button>'
                      : '<span class="gsx">미리 넣은 값이에요. 우리 집 값으로 고쳐 주세요.</span>';
    return '<span class="gsh">' + head + '</span>' + (det.length ? '<span class="gsd">' + esc(det.join(' · ')) + '</span>' : '') + tail;
  }

  function css() {
    if (typeof document === 'undefined' || document.getElementById('gsCss')) return;
    var st = document.createElement('style'); st.id = 'gsCss';
    st.textContent = '.gsn{font-size:13.5px;color:var(--sub2,#4E5968);line-height:1.55;margin:6px 0 8px;overflow-wrap:anywhere}' +
      '.gsn span{display:block}.gsn .gsh{color:var(--sub,#3E4754)}.gsn a{color:var(--blue,#2560E8)}.gsn .gsx{font-weight:700;margin-top:2px}' +
      '.gsn .gsr{font:inherit;font-size:13.5px;font-weight:700;color:var(--blue,#2560E8);background:none;border:0;padding:0 2px;min-height:44px;cursor:pointer;text-decoration:underline}';
    document.head.appendChild(st);
  }

  /** 시군구 파일 받기(한 번만) */
  function load(code) {
    if (!/^\d{5}$/.test(String(code || ''))) return Promise.resolve(null);
    if (!cache[code]) cache[code] = fetch(DATA + code + '.json').then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
    return cache[code];
  }
  function get(o) { return load(o && o.code).then(function (f) { return pick(f, o); }); }

  /** 입력칸에 연결: 비어 있으면 중간값을 넣고, noteEl 에 출처 한 줄. 고치면 '직접 고친 값' + 다시 넣기.
      input 의 'input' 이벤트를 쏴서 화면 계산이 바로 다시 돌게 함. 반환: { info, edited() } */
  function attach(input, info, noteEl, opt) {
    if (!input || !info || !noteEl) return null;
    css(); opt = opt || {};
    var num = function () { return parseInt(String(input.value).replace(/[^0-9]/g, ''), 10) || 0; };
    var fire = function () { input.dispatchEvent(new Event('input', { bubbles: true })); };
    if (!num() || opt.force) { input.value = (+info.v).toLocaleString('ko-KR'); fire(); }
    noteEl.classList.add('gsn'); noteEl.hidden = false;
    var draw = function () { noteEl.innerHTML = noteHtml(info, num() !== +info.v); };
    draw();
    input.addEventListener('input', draw);
    noteEl.addEventListener('click', function (e) { if (e.target.closest('[data-gs-reset]')) { input.value = (+info.v).toLocaleString('ko-KR'); fire(); input.focus(); } });
    return { info: info, edited: function () { return num() !== +info.v; } };
  }

  var api = { pick: pick, noteHtml: noteHtml, man: man, dayKo: dayKo, get: get, load: load, attach: attach, css: css, DATA: DATA, ALIMI: ALIMI };
  root.JDJ_GONGSI = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
