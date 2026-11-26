/* 새 주소로 옮긴 뒤 '이 기기에 저장된 값' 옮기기 — 지금은 꺼 둠(ON: false). 켜는 날: docs/domain_switch.md '저장값 옮기기'.
   왜 필요한가: 브라우저 저장값(localStorage — 관심 단지·내 집·계산 값·만기 알림 날짜와 금액·구매한 리포트 열람 기록 등)은
     주소(출처)마다 따로 보관돼요. https://chrisjangdaejang-ux.github.io 에 저장한 값은 https://zipyebo.com 에서 보이지 않아요.
     GitHub 는 도메인을 붙이면 예전 주소(github.io 의 jangdaejang-calc 폴더)를 새 주소로 바로 넘겨서(301) 예전 화면이 다시 열리지 않으므로,
     같은 출처(chrisjangdaejang-ux.github.io)에 그대로 남는 공개 데이터 저장소 쪽 '다리 화면'(BRIDGE)이 예전 값을 읽어 넘겨 줘요.
   흐름(서버로는 아무것도 보내지 않음 — 금액 같은 개인 값은 주소의 # 뒤에만 실리고, # 뒤는 어떤 서버에도 전송되지 않음):
     ① 새 주소 첫 방문(이 기기에 jdj_moved 표시 없음) → 다리 화면이 실제로 있는지 먼저 확인(없으면 아무것도 안 함) →
        다리 화면(BRIDGE#to=지금 화면)으로 잠깐 이동
     ② 다리 화면: 예전 저장값 중 옮길 것만(pick) 골라 https://zipyebo.com/지금 화면#jdjmv=… 로 돌려보냄(목적지 주소는 다리 화면에 고정)
     ③ 새 주소: assets/track.js 가 분석 도구(GA)를 켜기 전에 # 값을 주소에서 지우고 이 탭 저장소(sessionStorage)에만 둠 →
        이 파일이 받아서 저장(merge)하고 화면을 한 번 새로 고침(화면이 옮긴 값으로 다시 그려지게)
   옮기지 않는 것: 로그인 상태(jdj_auth…: 다시 로그인하면 계정에 저장된 자료가 돌아옴), 운영자·미리 보기 표시, 화면 이동 기록.
   건너뛰는 경우: 검색 로봇·자동 점검 브라우저, 다른 화면 안에 넣어진 경우, 로그인·결제 돌아오는 화면(카카오 code·토스 paymentKey 등),
     ON 이 false, UNTIL 날짜가 지남, 이 탭에서 이미 한 번 시도함. 저장값을 쓸 수 없는 브라우저(사생활 보호 모드 일부)도 건너뜀.
   불러오는 곳: assets/track.js 가 새 주소에서만(예전 주소 github.io 에서는 절대 안 불러옴) 붙임.
   다리 화면 파일: buildBridge() 가 만듦(이 파일의 pick·encode 를 그대로 넣음) → node tools/domain-switch.js --bridge <폴더> 로 저장.
   검사: node tools/store-move-test.js </dev/null */
(function (root) {
  'use strict';
  var CFG = {
    ON: false,                                                   // 켜는 날 true (다리 화면을 먼저 올린 뒤)
    UNTIL: '2027-06-30',                                         // 이 날짜가 지나면 새로 옮기러 가지 않음(돌아온 값 받기는 계속)
    DEST: 'https://zipyebo.com',                                 // 새 대표 주소(끝 / 없이) — tools/domain-switch.js 가 함께 바꿈
    BRIDGE: 'https://chrisjangdaejang-ux.github.io/jangdaejang-data/move/',
    MARK: 'jdj-store-bridge-v1'                                  // 다리 화면 안의 확인 글자
  };
  var MAX_ONE = 60000, MAX_ALL = 180000;                          // 값 하나·전체 글자 수 한도(주소 길이 한도 안쪽)
  var DENY = /^jdj_(auth|moved|mv_|bk_nav$|bk_names$|pay_back$)|admin|_adm$|_op$|preview|_pv$/;
  var OLD_WINS = /^jdj_(vid|visits_)/;                           // 익명 방문 기록은 예전 값을 이어서 씀

  /* 옮길 값 고르기: [[키, 값], …] → { keep: {키: 값}, dropped: [키…] } — jdj_ 로 시작하는 것만, 큰 것부터 빼서 한도 안으로 */
  function pick(entries) {
    var keep = {}, dropped = [], list = [];
    for (var i = 0; i < (entries || []).length; i++) {
      var k = String(entries[i][0]), v = entries[i][1];
      if (!/^jdj_[A-Za-z0-9_]{1,60}$/.test(k) || DENY.test(k) || typeof v !== 'string') continue;
      if (v.length > MAX_ONE) { dropped.push(k); continue; }
      list.push([k, v]);
    }
    list.sort(function (a, b) { return a[1].length - b[1].length; });
    var total = 0;
    for (var j = 0; j < list.length; j++) {
      if (total + list[j][0].length + list[j][1].length > MAX_ALL) { dropped.push(list[j][0]); continue; }
      total += list[j][0].length + list[j][1].length; keep[list[j][0]] = list[j][1];
    }
    return { keep: keep, dropped: dropped };
  }
  /* 주소 # 뒤에 싣는 모양: base64url(UTF-8 JSON {v:1, t: 보낸 시각, d: {키: 값}}) */
  function encode(d, t) {
    var s = JSON.stringify({ v: 1, t: t || Date.now(), d: d || {} });
    var b = typeof btoa === 'function' ? btoa(unescape(encodeURIComponent(s))) : Buffer.from(s, 'utf8').toString('base64');
    return b.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function decode(x) {
    try {
      if (typeof x !== 'string' || !x || x.length > MAX_ALL * 2 || !/^[A-Za-z0-9_-]+$/.test(x)) return null;
      var b = x.replace(/-/g, '+').replace(/_/g, '/'); while (b.length % 4) b += '=';
      var s = typeof atob === 'function' ? decodeURIComponent(escape(atob(b))) : Buffer.from(b, 'base64').toString('utf8');
      var o = JSON.parse(s);
      if (!o || o.v !== 1 || !o.d || typeof o.d !== 'object' || Array.isArray(o.d)) return null;
      var d = {};
      for (var k in o.d) if (Object.prototype.hasOwnProperty.call(o.d, k) && /^jdj_[A-Za-z0-9_]{1,60}$/.test(k) && !DENY.test(k) && typeof o.d[k] === 'string') d[k] = o.d[k];
      return { t: +o.t || 0, d: d };
    } catch (e) { return null; }
  }
  /* 받은 값 합치기: fresh(새 주소를 처음 쓴 지 10분 안) 면 예전 값으로 모두, 아니면 새 주소에 없는 키만(+ 익명 방문 기록) */
  function merge(cur, inc, fresh) {
    var out = [];
    for (var k in inc) {
      if (!Object.prototype.hasOwnProperty.call(inc, k)) continue;
      if (fresh || OLD_WINS.test(k) || cur[k] == null) { if (cur[k] !== inc[k]) out.push([k, inc[k]]); }
    }
    return out;
  }
  /* 돌아갈 화면: 같은 사이트 안 경로만(//다른사이트·\\·제어 문자·너무 긴 주소는 첫 화면) */
  function safeTo(to) {
    to = String(to || '');
    if (to.length > 2000 || !/^\/(?![\/\\])/.test(to) || /[\u0000-\u001f\\]/.test(to)) return '/';
    return to.replace(/#.*$/, '');
  }
  var BOT = /bot|crawl|spider|slurp|yeti|daum|bing|google|facebookexternalhit|kakaotalk-scrap|naver|headless|lighthouse|pagespeed|preview|prerender/i;
  var SKIP_PATH = /^\/(login|premium\/(success|fail|checkout|view|r|pro)|brief\/(paid|manage|subscribe|c)|counsel\/heart|move\/partner)(\/|$)/;
  var SKIP_Q = /[?&](code|paymentKey|authKey|orderId|token|bill|pay|fail)=/;
  /* 옮기러 가지 않을 이유(없으면 '') */
  function skipReason(env) {
    if (!CFG.ON && !env.force) return 'off';
    if (env.today && CFG.UNTIL && env.today > CFG.UNTIL) return 'until';
    if (!env.top) return 'frame';
    if (env.webdriver || BOT.test(env.ua || '')) return 'bot';
    if (SKIP_PATH.test(env.path || '/')) return 'path';
    if (SKIP_Q.test(env.search || '')) return 'query';
    if (env.moved) return 'moved';
    if (env.tried) return 'tried';
    return '';
  }

  /* 다리 화면(예전 출처 github.io/jangdaejang-data/move/ 에 올림) — 이 파일의 pick·encode 를 그대로 넣어 만듦 */
  function buildBridge(dest) {
    dest = String(dest || CFG.DEST).replace(/\/+$/, '');
    if (!/^https:\/\/[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(dest)) throw new Error('목적지 주소 형식 오류: ' + dest);
    var js = [
      "var MAX_ONE = " + MAX_ONE + ", MAX_ALL = " + MAX_ALL + ", DENY = " + DENY + ";",
      pick.toString(), encode.toString(), safeTo.toString(),
      "(function () {",
      "  var DEST = " + JSON.stringify(dest) + ", to = '/', h = location.hash || '';",
      "  var m = h.match(/^#to=([^&]*)/); if (m) { try { to = safeTo(decodeURIComponent(m[1])); } catch (e) { to = '/'; } }",
      "  var tail = '#jdjmv=0';",
      "  try {",
      "    var all = [];",
      "    for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); all.push([k, localStorage.getItem(k)]); }",
      "    var p = pick(all), n = Object.keys(p.keep).length;",
      "    if (n) { tail = '#jdjmv=' + encode(p.keep); try { localStorage.setItem('jdj_moved_out', String(Date.now())); } catch (e) {} }",
      "  } catch (e) {}",
      "  location.replace(DEST + to + tail);",
      "})();"
    ].join('\n');
    return '<!DOCTYPE html>\n<html lang="ko"><head><meta charset="utf-8">\n' +
      '<meta name="robots" content="noindex,nofollow">\n<meta name="referrer" content="no-referrer">\n' +
      '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'unsafe-inline\'; style-src \'unsafe-inline\'">\n' +
      '<meta name="viewport" content="width=device-width,initial-scale=1">\n<title>집예보 — 새 주소로 이동 중</title>\n' +
      '<!-- ' + CFG.MARK + ' : 예전 주소에 저장된 값을 ' + dest + ' 로 넘겨 주는 화면(만든 곳: jangdaejang-calc assets/store-move.js buildBridge). 서버로 보내는 것 없음. -->\n' +
      '<style>body{font:16px/1.6 system-ui,sans-serif;color:#333;text-align:center;padding:40px 16px}</style>\n' +
      '</head><body><p>집예보 새 주소로 이동하고 있어요…</p>\n<noscript><p><a href="' + dest + '/">' + dest.replace(/^https:\/\//, '') + ' 로 가기</a></p></noscript>\n' +
      '<script>\n' + js + '\n</script>\n</body></html>\n';
  }

  /* ---------- 브라우저에서 실행 ---------- */
  function run() {
    var ls, ss; try { ls = root.localStorage; ss = root.sessionStorage; ls.setItem('jdj_mv_t', '1'); ls.removeItem('jdj_mv_t'); } catch (e) { return; }
    var get = function (s, k) { try { return s.getItem(k); } catch (e) { return null; } };
    var set = function (s, k, v) { try { s.setItem(k, v); return true; } catch (e) { return false; } };
    if (!get(ls, 'jdj_mv_first')) set(ls, 'jdj_mv_first', String(Date.now()));
    // ③ 돌아온 값 받기(track.js 가 # 에서 옮겨 둔 것)
    var inc = get(ss, 'jdj_mv_in');
    if (inc != null) {
      try { ss.removeItem('jdj_mv_in'); } catch (e) {}
      set(ls, 'jdj_moved', String(Date.now()));
      var P = inc === '0' ? null : decode(inc);
      if (P) {
        var cur = {}; for (var i = 0; i < ls.length; i++) { var k = ls.key(i); cur[k] = get(ls, k); }
        var fresh = Date.now() - (+get(ls, 'jdj_mv_first') || 0) < 10 * 60000;
        var w = merge(cur, P.d, fresh), n = 0;
        for (var j = 0; j < w.length; j++) if (set(ls, w[j][0], w[j][1])) n++;
        if (n) { set(ss, 'jdj_mv_reload', '1'); root.location.reload(); }
      }
      return;
    }
    // ① 옮기러 가기
    var L = root.location, nav = root.navigator || {};
    var why = skipReason({ path: L.pathname, search: L.search, ua: nav.userAgent, webdriver: !!nav.webdriver, top: root.top === root.self,
      moved: !!get(ls, 'jdj_moved'), tried: !!get(ss, 'jdj_mv_try'), today: new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10) });
    if (why) { if (why === 'off' || why === 'until') set(ss, 'jdj_mv_chk', '1'); return; }
    if (L.origin !== CFG.DEST && L.origin !== CFG.DEST.replace('://', '://www.')) return;   // 새 대표 주소에서만
    set(ss, 'jdj_mv_try', '1');
    if (typeof root.fetch !== 'function') return;
    root.fetch(CFG.BRIDGE, { mode: 'cors', cache: 'no-store', credentials: 'omit' }).then(function (r) { return r.ok ? r.text() : ''; }).then(function (t) {
      if (t.indexOf(CFG.MARK) < 0 || t.indexOf(JSON.stringify(CFG.DEST)) < 0) return;        // 다리 화면이 아직 없거나 다른 주소용이면 그대로
      L.replace(CFG.BRIDGE + '#to=' + encodeURIComponent(L.pathname + L.search));
    }).catch(function () {});
  }

  var api = { v: 1, CFG: CFG, pick: pick, encode: encode, decode: decode, merge: merge, safeTo: safeTo, skipReason: skipReason, buildBridge: buildBridge, run: run, DENY: DENY };
  root.JDJ_SMOVE = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else if (typeof document !== 'undefined') run();
})(typeof window !== 'undefined' ? window : globalThis);
