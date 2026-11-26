/* 집예보가 먼저 챙겨 드려요(PROACTIVE) — 화면 부품. 계산은 assets/proactive-core.js·cal-core.js·alerts-core.js.
   - 켜짐: assets/config.js PROACTIVE_ENABLED === true. 꺼져 있으면 어떤 칸·버튼도 만들지 않아요.
     대표 미리 보기: 주소 끝에 ?preview=pro 를 붙여 한 번 열면 이 기기에서만 보여요(?preview=off 로 끔). 검색·통계와 상관없음.
   - 따라보는 재개발·재건축 구역: 이 기기(jdj_zone_follow)와 알림 설정(jdj_alert_prefs pv.zones)에 구역 id·단계 번호·이름만. 로그인해 메일 알림을 받는 중이면 서버 설정에도.
   - 금액 칸은 이 파일이 만들지도, 서버로 보내지도 않아요.
   window.JDJ_PRO = { on, card, mount, zones, followed, toggleZone, inventory, SLOGAN } */
(function (root) {
  'use strict';
  var JB = (typeof window !== 'undefined' && window.JDJ_BASE) || (function (p) { var g = p.indexOf('/jangdaejang-calc/') === 0, b = { SITE: g ? '/jangdaejang-calc/' : '/', DATA: g ? '/jangdaejang-data/' : 'https://chrisjangdaejang-ux.github.io/jangdaejang-data/' }; if (typeof window !== 'undefined') window.JDJ_BASE = b; return b; })((typeof location !== 'undefined' && location.pathname) || '/jangdaejang-calc/');
  var BASE = JB.SITE;
  var SLOGAN = '집값도, 할 일도 미리 알려 드려요';
  var ZK = 'jdj_zone_follow', AP = 'jdj_alert_prefs', PV = 'jdj_pro_preview';
  var ls = { get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }, del: function (k) { try { localStorage.removeItem(k); } catch (e) {} } };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  (function () { try { var q = new URLSearchParams(location.search).get('preview'); if (q === 'pro') ls.set(PV, '1'); else if (q === 'off') ls.del(PV); } catch (e) {} })();
  function on() { return !!(root.JDJ_SITE && root.JDJ_SITE.PROACTIVE_ENABLED === true) || ls.get(PV) === '1'; }
  function site() { return ((root.JDJ_SITE || {}).SITE_NAME || '').trim() || '집예보'; }

  /* ---------- 첫 화면·관련 화면 칸 ---------- */
  var CSS = '.jpro{display:block;margin:14px 0;padding:16px 16px 14px;border-radius:18px;background:linear-gradient(135deg,#F4F0FF,#FBF8EF);border:1px solid #E4DCFA;color:#191F28;text-decoration:none}' +
    '.jpro .k{display:inline-block;font-size:12px;font-weight:800;color:#5B3FB0;background:#fff;border-radius:999px;padding:2px 9px;margin:0 0 6px}' +
    '.jpro b.h{display:block;font-size:18px;font-weight:900;letter-spacing:-.4px;line-height:1.35;margin:0 0 4px}' +
    '.jpro span.s{display:block;font-size:14.5px;color:#4E5968;line-height:1.55;word-break:keep-all}' +
    '.jpro ul{list-style:none;margin:8px 0 0;padding:0;display:flex;flex-wrap:wrap;gap:6px}.jpro li{font-size:13px;font-weight:700;color:#3E4754;background:#fff;border:1px solid #ECE7F8;border-radius:999px;padding:3px 10px}' +
    '.jpro .go{display:inline-flex;align-items:center;min-height:44px;margin-top:6px;font-size:15px;font-weight:800;color:#5B3FB0}';
  function css() { if (typeof document === 'undefined' || document.getElementById('jproCss')) return; var s = document.createElement('style'); s.id = 'jproCss'; s.textContent = CSS; document.head.appendChild(s); }
  /** where: 'home' | 'calendar' | 'alerts' | 'mine' | 'zone' — 화면마다 첫 줄만 조금 다르게 */
  function card(where) {
    if (!on()) return '';
    var sub = {
      home: '세금 기한, 계약갱신 마감, 내 단지 새 거래와 동네 규제 변화까지 — 묻기 전에 먼저 알려 드려요. 켠 알림만, 하루 한 통으로 묶어 보내요.',
      calendar: '여기 넣은 날짜로 비과세 2년·일시적 2주택 처분 기한까지 계산해, 놓치기 전에 메일로 먼저 알려 드려요.',
      alerts: '날짜 알림에 더해 내 집 단지 새 거래, 내 동네 규제지역 지정·해제, 따라보는 재개발 구역 단계 변화도 골라 받을 수 있어요.',
      mine: '이 집 정보로 보유 2년이 차는 날, 재산세·종부세 고지 시기, 이 단지 새 거래를 먼저 알려 드려요.',
      zone: '구역 카드의 ☆ 단계 알림을 누르면, 다음 단계로 넘어갈 때 먼저 알려 드려요.'
    }[where] || '';
    css();
    return '<a class="jpro" href="' + BASE + 'alerts/" data-track="pro_card_' + esc(where || '') + '"><span class="k">' + esc(site()) + '가 먼저 챙겨 드려요</span><b class="h">' + SLOGAN + '</b><span class="s">' + esc(sub) + '</span>' +
      '<ul><li>계약갱신 기간</li><li>비과세 2년</li><li>취득세 60일</li><li>재산세·종부세</li><li>내 단지 새 거래</li><li>동네 규제 변화</li></ul><span class="go">무엇을 언제 알려 주는지 보기 ›</span></a>';
  }
  function mount(el, where) { if (!el) return; var h = card(where); if (!h) { el.hidden = true; el.innerHTML = ''; return; } el.innerHTML = h; el.hidden = false; }

  /* ---------- 따라보는 구역 ---------- */
  function zones() { try { var a = JSON.parse(ls.get(ZK) || '[]'); return Array.isArray(a) ? a.filter(function (z) { return z && z.id; }).slice(0, 20) : []; } catch (e) { return []; } }
  function followed(id) { return zones().some(function (z) { return z.id === id; }); }
  /** 알림 설정에 구역 목록 넣기(단계는 더 높은 쪽을 남김 — 서버가 알린 뒤 올린 단계가 되돌아가지 않게) */
  function mergeZones(pv, list) {
    var by = {}; (pv.zones || []).forEach(function (z) { by[z.id] = z; });
    var out = list.map(function (z) { var s = by[z.id]; return { id: z.id, st: Math.max(z.st || 0, s ? s.st || 0 : 0), n: z.n || (s && s.n) || '' }; });
    pv.zones = out; if (out.length) pv.zone = true; return pv;
  }
  function localPrefs(list) {
    var AC = root.JDJ_ALERTS_CORE, P = null; try { P = JSON.parse(ls.get(AP) || 'null'); } catch (e) {}
    P = P && typeof P === 'object' ? P : {};
    P.pv = mergeZones(P.pv && typeof P.pv === 'object' ? P.pv : {}, list);
    ls.set(AP, JSON.stringify(AC ? AC.cleanPrefs(P) : P));
  }
  function tok() { try { var j = JSON.parse(ls.get('jdj_auth') || 'null'); return j && /^[0-9a-f]{64}$/.test(String(j.s || '')) ? j.s : ''; } catch (e) { return ''; } }
  function api() { return (root.JDJ_AGENTS && root.JDJ_AGENTS.api) || ((root.JDJ_SITE || {}).API) || ''; }
  function post(body) { return fetch(api(), { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body) }).then(function (r) { return r.json(); }); }
  /** 메일 알림을 받는 중이면 서버 설정에도(서버 것을 먼저 읽고 구역만 바꿈 — 다른 기기에서 바꾼 설정을 덮지 않게) */
  /** op: 'add'(z) · 'del'(z) · 'clear' — 서버 목록에 이 한 가지 일만 적용(다른 기기에서 따라본 구역은 그대로) */
  function applyOp(cur, op, z) {
    cur = (cur || []).slice();
    if (op === 'clear') return [];
    if (op === 'del') return cur.filter(function (x) { return x.id !== z.id; });
    if (!cur.some(function (x) { return x.id === z.id; })) cur.unshift({ id: z.id, st: z.st || 0, n: z.n || '' });
    return cur;
  }
  function pushServer(op, z) {
    var s = tok(); if (!s || !api()) return Promise.resolve(false);
    return post({ action: 'alertMine', s: s }).then(function (j) {
      if (!j || !j.ok || !j.sub || j.sub.state !== '활성' || j.pv !== 1) return false;
      var P = j.sub.prefs || {}; P.pv = P.pv || {}; P.pv.zones = applyOp(P.pv.zones, op, z); if (op === 'add') P.pv.zone = true;
      return post({ action: 'alertPrefs', s: s, prefs: P }).then(function (k) { return !!(k && k.saved); });
    }).catch(function () { return false; });
  }
  /** z = zones.json 구역 { id, st, n } → { on, list, server: Promise } */
  function toggleZone(z) {
    var L = zones(), i = -1; L.forEach(function (x, j) { if (x.id === z.id) i = j; });
    var now = i < 0;
    if (now) { if (L.length >= 20) return { on: false, full: true, list: L }; L.unshift({ id: String(z.id), st: +z.st || 0, n: String(z.n || '').slice(0, 40), t: new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10) }); }
    else L.splice(i, 1);
    ls.set(ZK, JSON.stringify(L)); localPrefs(L);
    return { on: now, list: L, server: pushServer(now ? 'add' : 'del', { id: String(z.id), st: +z.st || 0, n: String(z.n || '').slice(0, 40) }) };
  }

  /* ---------- 집예보가 기억하는 것(my/memory/) — 이 기기에 남은 칸 목록 ----------
     where: 'both' 이 기기 + 내 계정(로그인했을 때) · 'device' 이 기기에만 · money: 금액이 들어 있음(이 기기에만) */
  var INV = [
    { id: 'homes', keys: ['jdj_myhome', 'jdj_myhome_ar'], t: '내 집', from: '내 집 시세', url: 'mine/', where: 'both', acct: 'homes', what: '단지·평형·고른 전용면적. 내 집 시세·성적표·달력이 이 집을 기준으로 계산해요.' },
    { id: 'favs', keys: ['jdj_watch', 'jdj_watch_ops', 'jdj_watch_snap', 'jdj_watch_seen', 'jdj_watch_synced', 'jdj_watch_bnames'], t: '관심 단지(☆)', from: '관심 목록', url: 'my/watch/', where: 'both', acct: 'favs', what: '☆을 누른 단지·평형과 마지막으로 본 때. 새 실거래·신고가·급매 알림을 이 목록으로 만들어요.' },
    { id: 'cal', keys: ['jdj_cal'], t: '내 부동산 달력 날짜', from: '내 부동산 달력', url: 'mine/calendar/', where: 'both', acct: 'cal', what: '자가·전세·월세, 취득일·전입일·계약 시작일·만기일, 일시적 2주택 새 집 잔금일, 보유 주택 수, 전세 만기 알림 희망 지역. 날짜만 있고 금액은 없어요.' },
    { id: 'ta', keys: ['jdj_ta_me', 'jdj_tsw_me'], t: '전세 만기 준비·세입자 갈아타기 금액', from: '전세 만기 알림·이사 갈 집 구하기', url: 'mine/calendar/#ta', where: 'device', money: true, what: '보증금·보유 현금·연 소득. 이 기기에서만 계산에 쓰고 서버로 보내지 않아요.' },
    { id: 'fin', keys: ['jdj_fin', 'jdj_home_switch_pick', 'jdj_cmp', 'jdj_hz'], t: '내 집 마련·갈아타기 계산 입력', from: '내 집 마련·갈아타기 계산기', url: 'buy/', where: 'device', money: true, what: '보유 현금·소득·대출 조건, 비교하려고 고른 단지, 보는 기간. 이 기기에만 있어요.' },
    { id: 'cy', keys: ['jdj_cy', 'jdj_areas', 'jdj_areas_seen'], t: '청약 가점 입력·관심 지역', from: '청약 가점 계산', url: 'chungyak/', where: 'device', what: '가점 계산에 넣은 무주택 기간·부양가족·통장 가입 기간과 청약 관심 지역. 가점 범위는 청약 알림을 켤 때만 알림 설정에 들어가요.' },
    { id: 'rp', keys: ['jdj_report_me'], t: '내 집 성적표 보정·대출 잔액', from: '내 집 성적표', url: 'my/report/', where: 'both', acct: 'rp', money: true, what: '층·확장·리모델링 보정과 대출 잔액. 로그인하면 다른 기기에서도 보이도록 내 계정에 저장되고, 본인만 볼 수 있어요. 메일에는 넣지 않아요.' },
    { id: 'alerts', keys: ['jdj_alert_prefs', 'jdj_alert_seen', 'jdj_alert_log'], t: '알림 설정·본 알림', from: '알림 센터', url: 'my/alerts/', where: 'both', what: '켠 알림 종류, 끈 단지, 청약 지역·가점 범위, 먼저 챙겨 드려요 설정, 이 기기에서 본 알림. 메일 알림을 신청했다면 이메일 주소(가린 모양으로만 보여 드려요)도 서버에 있어요.' },
    { id: 'zones', keys: ['jdj_zone_follow'], t: '따라보는 재개발·재건축 구역', from: '재개발·재건축 구역 지도', url: 'villa/zone/', where: 'both', what: '구역 이름과 따라보기 시작할 때의 단계. 다음 단계로 넘어가면 알려 드려요.' }
  ];
  function has(k) { var v = ls.get(k); return v != null && v !== '' && v !== '[]' && v !== '{}' && v !== 'null'; }
  /** 이 기기 칸 목록: [{...INV, present, n(대략 개수)}] */
  function inventory() {
    return INV.map(function (x) {
      var present = x.keys.some(has), n = 0;
      try {
        if (x.id === 'homes') { var j = JSON.parse(ls.get('jdj_myhome') || 'null'); n = j && Array.isArray(j.list) ? j.list.length : (Array.isArray(j) ? j.length : 0); }
        else if (x.id === 'favs') { var w = JSON.parse(ls.get('jdj_watch') || '[]'); n = Array.isArray(w) ? w.length : 0; }
        else if (x.id === 'zones') n = zones().length;
        else if (x.id === 'cal') { var c = JSON.parse(ls.get('jdj_cal') || 'null'); n = c && c.h ? Object.keys(c.h).length : 0; }
      } catch (e) {}
      return Object.assign({}, x, { present: present, n: n });
    });
  }
  /** 따라보는 구역 모두 지우기(이 기기·알림 설정·메일 알림을 받는 중이면 서버 설정도) */
  function clearZones() { ls.del(ZK); localPrefs([]); return pushServer('clear'); }
  function forget(id) { var x = INV.filter(function (y) { return y.id === id; })[0]; if (!x) return false; x.keys.forEach(ls.del); return true; }

  root.JDJ_PRO = { on: on, card: card, mount: mount, css: css, zones: zones, followed: followed, toggleZone: toggleZone, mergeZones: mergeZones, inventory: inventory, forget: forget, clearZones: clearZones, INV: INV, SLOGAN: SLOGAN };
})(typeof window !== 'undefined' ? window : this);
