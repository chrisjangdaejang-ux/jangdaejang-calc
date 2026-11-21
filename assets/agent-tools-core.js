/* 집코드 중개사 업무 도구 공통 계산 — agent/sheet/(적정 가격 근거표)·agent/my/(대시보드)·tools/agent-tools-test.js 가 함께 쓴다. DOM 없음.
   원칙
   - 공개 자료(price/{구}.json 단지·평형 행, index.json, 점수 fx, model_h.json)에 있는 값만 모아 보여 준다. 새 숫자를 지어내지 않는다:
     하는 계산은 중간값·최고·비율·단위 환산뿐이고, 근거 문장에 계산 방법을 함께 적는다.
   - 호가는 공개 자료가 없어 '중개사가 입력한 호가' 칸으로만 받는다(우리가 추정하지 않음).
   - 향(남향 등)은 국토부 실거래 자료에 없어 다루지 않는다. 층은 개별 거래에 있을 때만.
   - 미래가치 점수는 광고·제휴·요금과 무관하게 자료 값 그대로.
   u(price/{구}.json) = [구코드, 동, 단지, 평형대, 전용㎡, 거래수, 월별 평당가 36, 월별 거래수 문자열, 지번, 점수 1/0, 그 달 중앙 평당가, 개별 거래, 전체 기간 요약]
   window.JDJ_AGT = { sheet, floorBands, askCompare, encode, decode, aliasOk, cleanNote, clientStore, newRef, eventLine, KIND } */
(function (root) {
  'use strict';
  const M = () => root.JDJ_MINE || (typeof require === 'function' ? require('./mine-core.js') : null);
  const PY = 3.3058;
  const pct1 = v => v == null ? null : Math.round(v * 1000) / 10;            // 비율 → % 소수 1자리

  /* 최근 1년 개별 거래를 층으로 나눠 평당가 중간값 (각 묶음 2건 이상일 때만) */
  function floorBands(list, sinceYmd) {
    const m = M(), B = [{ k: 'lo', t: '저층(1~5층)', a: 1, b: 5 }, { k: 'mid', t: '중층(6~15층)', a: 6, b: 15 }, { k: 'hi', t: '고층(16층 이상)', a: 16, b: 999 }];
    const use = list.filter(t => t.ymd >= sinceYmd && t.type !== '직거래' && t.floor > 0 && t.ppy > 0);
    return B.map(x => {
      const g = use.filter(t => t.floor >= x.a && t.floor <= x.b);
      return { k: x.k, t: x.t, n: g.length, ppy: g.length >= 2 ? Math.round(m.median(g.map(t => t.ppy))) : 0 };
    }).filter(x => x.n > 0);
  }

  /** 근거표 한 장에 들어갈 사실값.
      c = { u, IX(index.json), fx(점수 묶음, 없으면 null), vc(JDJ_RANK.vcheck 결과, 없으면 null), hist(price/{구}.json hist), ask(만원, 중개사 입력 호가) } */
  function sheet(c) {
    const m = M(), u = c.u, IX = c.IX; if (!u || !IX) return null;
    const months = IX.months, sm = m.bandSummary(u, months), last = m.lastDeal(u, months);
    const list = m.trades(u), alt = (!sm.price || m.isFew(u)) && last;
    const price = alt ? last.price : sm.price;
    const sgg = IX.sgg[u[0]] || null, gp = m.sggPosition(sgg, u, months);
    const hi = m.highs(u, c.hist || null, price);
    const to = String(IX.dataTo || months[months.length - 1] || '');
    const since = Number(m.ymAdd(to, -11) + '01');
    const y1 = list.filter(t => t.ymd >= since);
    const fx = c.fx && typeof c.fx === 'object' ? c.fx : null;
    const out = {
      apt: u[2], dong: u[1], code: u[0], gu: sgg ? sgg.name : u[0], sido: sgg ? sgg.sido : '', band: u[3], area: u[4], to,
      price, priceAt: alt ? last.at : sm.at, priceKind: alt ? 'last' : 'median', ppy: alt ? last.ppy : sm.ppy, recent3: sm.recent3, cnt12: sm.cnt12,
      range: sm.range, ch1: sm.ch1 ? pct1(sm.ch1.pct) : null, ch3: sm.ch3 ? pct1(sm.ch3.pct) : null, ch3From: sm.ch3 ? sm.ch3.fromAt : '',
      trades: list.slice(0, 12), y1n: y1.length, floors: floorBands(list, since),
      hasFloor: list.some(t => t.floor > 0),
      hi: hi && hi.hi ? { amt: hi.hi.amt, ymd: hi.hi.ymd, label: hi.label, vs: pct1(hi.hi.vs) } : null,
      hi1: hi && hi.hi1 ? { amt: hi.hi1.amt, ymd: hi.hi1.ymd, vs: pct1(hi.hi1.vs) } : null,
      sggPpy: gp ? gp.sggPpy : 0, vsGu: gp ? pct1(gp.diff) : null,
      fv: fx && fx.fv != null ? fx.fv : null, fvg: fx && fx.fvg != null ? fx.fvg : null,
      vc: c.vc || null,
      ask: null
    };
    const ask = Math.round(Number(c.ask) || 0);
    if (ask > 0 && ask < 10000000) out.ask = askCompare(ask, out);
    return out;
  }
  /** 중개사 입력 호가 → 시세·최고가와 차이 (시세가 없으면 그 칸은 null) */
  function askCompare(ask, s) {
    const d = (a, b) => b > 0 ? pct1((a - b) / b) : null;
    return { amt: ask, vsPrice: d(ask, s.price), vsHi: s.hi ? d(ask, s.hi.amt) : null, vsHi1: s.hi1 ? d(ask, s.hi1.amt) : null };
  }

  /* ---------- 공유 주소 (?sd&g&d&j&a&b&ask&ag&n) — 개인 정보 없음: 단지·평형·중개사가 넣은 호가·중개사 id·한마디만 ---------- */
  const NOTE_BAD = /(무조건|확실|보장|100\s*%|틀림없|반드시\s*오)/;
  function cleanNote(v) {
    const s = String(v == null ? '' : v).replace(/[\u0000-\u001F\u007F<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60);
    if (!s) return { ok: true, v: '' };
    if (NOTE_BAD.test(s)) return { ok: false, v: s, err: "'무조건·확실·보장' 같은 단정·보장 표현은 쓸 수 없어요(표시·광고 규정)." };
    if (/\d{4,}|@|https?:/i.test(s)) return { ok: false, v: s, err: '한마디에는 전화번호·주소·링크를 넣지 않아요. 사무소 연락처는 근거표 아래에 자동으로 나와요.' };
    return { ok: true, v: s };
  }
  function encode(o) {
    const q = new URLSearchParams();
    if (o.sd) q.set('sd', o.sd); if (o.g) q.set('g', o.g); if (o.dong) q.set('d', o.dong); if (o.jibun) q.set('j', o.jibun);
    if (o.apt) q.set('a', o.apt); if (o.band) q.set('b', o.band);
    const ask = Math.round(Number(o.ask) || 0); if (ask > 0 && ask < 10000000) q.set('ask', String(ask));
    if (/^A[0-9A-F]{7}$/.test(String(o.ag || ''))) q.set('ag', o.ag);
    const n = cleanNote(o.note); if (n.ok && n.v) q.set('n', n.v);
    return q.toString();
  }
  function decode(search) {
    const q = new URLSearchParams(search || '');
    const s = k => String(q.get(k) || '').slice(0, 80);
    const o = { sd: s('sd'), g: s('g'), dong: s('d'), jibun: s('j'), apt: s('a'), band: s('b'), ask: 0, ag: '', note: '' };
    if (!/^s\d{2}$/.test(o.sd)) o.sd = ''; if (!/^\d{5}$/.test(o.g)) o.g = '';
    const ask = Math.round(Number(q.get('ask')) || 0); if (ask > 0 && ask < 10000000) o.ask = ask;
    if (/^A[0-9A-F]{7}$/.test(String(q.get('ag') || ''))) o.ag = q.get('ag');
    const n = cleanNote(q.get('n')); if (n.ok) o.note = n.v;
    return o;
  }

  /* ---------- 고객 관심 단지: 고객 이름은 이 기기에만 ---------- */
  const CKEY = 'jdj_agt_clients';
  /** 서버로 보내는 별칭 검사(서버 cleanAlias 와 같은 규칙) */
  function aliasOk(v) {
    const s = String(v == null ? '' : v).replace(/[\u0000-\u001F\u007F<>]/g, ' ').trim().slice(0, 12);
    if (!s) return { ok: false, err: '고객 별칭을 적어 주세요(예: 고객 A, 학군 이사).' };
    if (/\d{4,}|@|https?:/i.test(s)) return { ok: false, err: '별칭에는 전화번호·메일 주소를 넣을 수 없어요.' };
    return { ok: true, v: s };
  }
  function newRef() {
    const b = new Uint8Array(12); (root.crypto || require('crypto').webcrypto).getRandomValues(b);
    return Array.from(b, x => ('0' + x.toString(16)).slice(-2)).join('');
  }
  /** 중개사 기기 저장소: { [관심id]: {name, ref} } + 새로 만들 때 쓸 임시 ref. ls = localStorage 비슷한 객체 */
  function clientStore(ls, agentId) {
    const key = CKEY + '_' + String(agentId || '');
    const load = () => { try { const j = JSON.parse(ls.getItem(key) || '{}'); return j && typeof j === 'object' ? j : {}; } catch (e) { return {}; } };
    return {
      all: load,
      get(id) { return load()[id] || null; },
      set(id, v) { const j = load(); j[id] = { name: String(v.name || '').slice(0, 30), ref: String(v.ref || '') }; try { ls.setItem(key, JSON.stringify(j)); } catch (e) {} },
      del(id) { const j = load(); delete j[id]; try { ls.setItem(key, JSON.stringify(j)); } catch (e) {} }
    };
  }
  /* 알림 한 줄 */
  const KIND = { trade: '새 실거래', high: '신고가', drop: '큰 하락 거래' };
  function eventLine(e) {
    const m = M(), d = e.d || {}, s = String(d.d || '');
    const date = s ? `${s.slice(0, 4)}.${s.slice(4, 6)}.${s.slice(6, 8)}` : '';
    return `${e.n || ''} ${d.band || ''} · ${d.floor ? d.floor + '층 · ' : ''}${m.won(d.amt || 0)} · ${date} 계약${d.type === 1 ? ' · 직거래' : ''}`
      + (e.kind === 'drop' && d.pct != null ? ` · 그 평형 최근 3개월 시세보다 ${Math.abs(d.pct)}% 낮음` : '');
  }

  const API = { sheet, floorBands, askCompare, encode, decode, cleanNote, aliasOk, clientStore, newRef, eventLine, KIND, PY };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.JDJ_AGT = API;
})(typeof self !== 'undefined' ? self : this);
