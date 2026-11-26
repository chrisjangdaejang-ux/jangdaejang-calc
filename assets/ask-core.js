/* 집예보 '단지 이름으로 물어보기' 공통 로직 — 대화형 답변 없이 공개 통계를 정해진 규칙으로만 계산한다.
   - 문장에서 단지 이름 1~3개 찾기: 불용어('비교'·'지금'·'사도 될까' 등)·조사를 빼고, 남은 낱말을 이어 붙이거나 나눠
     내 집 시세 화면과 같은 이름 규칙(assets/mine-core.js 의 matchName: e편한세상·대림·N차·N단지 별칭)으로 맞춘다.
   - 애매하면(같은 이름 여러 곳·후보 여럿) 고르지 않고 후보를 돌려준다(화면에서 후보 칩).
   - 비교 요약 문장은 데이터 템플릿: 주어·비교 기준을 항상 쓰고, 다른 숫자를 '같다'고 하지 않는다.
   - 미래가치 점수(fx.fv·fh)는 공개 자료 값을 그대로 쓰고, 계산식·가중치는 다루지 않는다.
   화면: assets/ask.js(입력창), ask/(단지 비교) · 검증: node tools/ask-test.js */
(function (root) {
  'use strict';
  var JB = (typeof window !== 'undefined' && window.JDJ_BASE) || (function (p) { var g = p.indexOf('/jangdaejang-calc/') === 0, b = { SITE: g ? '/jangdaejang-calc/' : '/', DATA: g ? '/jangdaejang-data/' : 'https://chrisjangdaejang-ux.github.io/jangdaejang-data/' }; if (typeof window !== 'undefined') window.JDJ_BASE = b; return b; })((typeof location !== 'undefined' && location.pathname) || '/jangdaejang-calc/');
  const M = () => root.JDJ_MINE || (typeof require === 'function' ? require('./mine-core.js') : null);
  const PW = () => root.JDJ_PLAIN || (typeof require === 'function' ? (require('./plain-words.js'), globalThis.JDJ_PLAIN) : null);
  const MAX = 3;

  /* ---------- 문장 다듬기 ---------- */
  /* 질문에 흔히 붙는 말(단지 이름이 아님) — 낱말 전체가 이것이면 뺀다 */
  const STOP = new Set(('비교 비교해 비교해줘 비교해주세요 비교하면 비교하기 비교좀 좀 어때 어때요 어떄 어떤가요 어떨까 어떨까요 어떻게 어떤 ' +
    '지금 요즘 현재 올해 내년 당장 사도 사면 살까 살까요 사야 사야해 사야할까 살만해 살만한가요 될까 될까요 되나요 돼요 해도 괜찮 괜찮아 괜찮을까 괜찮을까요 ' +
    '어디 어디가 어디를 어느 어느게 어느쪽 어느곳 곳 더 좋아 좋아요 좋을까 좋을까요 좋은가요 나아 나아요 나을까 나을까요 낫나요 유리 유리해 유리할까 ' +
    '중 중에 중에서 중에선 vs v 대 와 과 랑 이랑 하고 그리고 및 또는 아니면 거 것 게 건 ' +
    '시세 얼마 얼마야 얼마예요 얼마에요 가격 집값 전망 미래 미래가치 점수 앞으로 오를까 오를까요 떨어질까 내릴까 투자 매수 매매 실거래 실거래가 ' +
    '알려줘 알려 알려주세요 줘 주세요 봐줘 봐주세요 궁금 궁금해 궁금해요 질문 요 네 아파트 단지 아파트들 단지들 우리 내 집 두 세 곳의 둘 셋').split(' '));
  /* 낱말 끝에 붙는 조사 — 떼고도 2글자 이상 남을 때만 (긴 것부터) */
  const PART = ['이랑', '하고', '에서', '보다', '이나', '까지', '부터', '랑', '와', '과', '은', '는', '을', '를', '이', '가', '도', '의', '나', '로', '에'];
  /* 흔히 부르는 옛 이름·줄임말 → 실거래 신고 이름에 들어 있는 말 (공개 단지명만) */
  const ALIAS = { '둔촌주공': '올림픽파크포레온', '마래푸': '마포래미안푸르지오', '아리팍': '아크로리버파크', '원베일리': '래미안원베일리',
    '래대팰': '래미안대치팰리스', '대치팰리스': '래미안대치팰리스', '래퍼': '래미안퍼스티지', '반포래미안퍼스티지': '래미안퍼스티지', '포레온': '올림픽파크포레온' };
  /* 평형 힌트: '34평' → 전용 약 84㎡, '84㎡'·'84타입'·'84' → 전용 84㎡ */
  function bandHint(tok) {
    let m = /^(\d{2,3})평(형|대)?$/.exec(tok); if (m) { const p = +m[1]; return p >= 8 && p <= 120 ? { area: Math.round(p * 2.48), py: p } : null; }
    m = /^(\d{2,3})(㎡|m2|제곱|제곱미터|타입|형|a|b)?$/i.exec(tok); if (m && +m[1] >= 30 && +m[1] <= 300) return { area: +m[1] };
    return null;
  }
  /** 문장 → {tokens, hint, sido}. 불용어·물음표·조사 정리, 'A vs B'·'A랑 B'·'A, B' 모두 낱말로 */
  function clean(text) {
    let s = String(text || '').replace(/[?!？！.,，、·・/|&+~"'“”‘’()\[\]{}<>]/g, ' ').replace(/\s+/g, ' ').trim();
    s = s.replace(/(사도|사면|살까|사야)\s*(될까요?|되나요|돼요|괜찮을까요?|할까요?)/g, ' ').replace(/(비교)\s*(해\s*줘|해\s*주세요|해\s*봐|하면)/g, ' ');
    const out = []; let hint = null;
    for (let t of s.split(' ')) {
      if (!t) continue;
      if (/^vs$/i.test(t)) continue;
      t = t.replace(/(아파트|비교|단지비교)$/, '') || t;
      if (/^(vs|대)$/i.test(t)) continue;
      const h = bandHint(t); if (h) { hint = hint || h; continue; }
      if (STOP.has(t.toLowerCase())) continue;
      let base = t;
      for (const p of PART) if (base.length - p.length >= 2 && base.endsWith(p)) { base = base.slice(0, -p.length); break; }
      if (STOP.has(base)) continue;
      if (ALIAS[base]) { out.push({ t: ALIAS[base], alt: ALIAS[base], from: t }); continue; }
      /* 따로 쓴 작은 숫자('목동 신시가지 7')는 단지 번호로 */
      if (/^\d{1,2}$/.test(base)) { out.push({ t: base + '단지', alt: base + '단지' }); continue; }
      if (base.length < 2 && !/\d/.test(base)) continue;
      out.push({ t, alt: base });
    }
    return { tokens: out, hint };
  }

  /* ---------- 단지 찾기 ---------- */
  /** 이름이 검색어와 글자 그대로 같은가(공백·하이픈·e편한세상·대림 표기 차이 무시) */
  function exact(apt, q) {
    const m = M(), a = m.normName(apt), b = m.normName(q);
    return !!b && (a === b || m.normName(apt, true) === m.normName(q, true) || m.normName(String(apt).replace(/\(.*\)$/, '')) === b);
  }
  /** groups(여러 시·도 Map 합친 것) 에서 q 검색 — mine-core 의 searchDanji 와 같은 규칙, 이름이 똑같은 단지 먼저 */
  function search(groups, q, limit) {
    const hits = M().searchDanji(groups, q, 200);
    const ex = hits.filter(d => exact(d.apt, q));
    const rest = hits.filter(d => ex.indexOf(d) < 0);
    return ex.concat(rest).slice(0, limit || 30);
  }
  /** 낱말 한 덩어리(i~j)의 검색어: 원래 낱말 그대로, 안 되면 조사 뗀 것 */
  function spanQueries(tokens, i, j) {
    const a = tokens.slice(i, j).map(x => x.t).join(' '), b = tokens.slice(i, j).map(x => x.alt).join(' ');
    return a === b ? [a] : [a, b];
  }
  /** 이 덩어리로 찾은 결과가 쓸 만한가: 짧은 한 낱말이 너무 많은 단지에 걸리면(예: '목동' 70곳) 단독으로는 안 씀 */
  function usable(q, hits, single) {
    if (!hits.length) return false;
    if (hits.some(d => exact(d.apt, q))) return true;
    const n = M().normName(q).replace(/\d+(차|단지)?/g, '').length;
    if (single && n <= 2 && hits.length > 5) return false;
    return true;
  }
  /** 낱말들을 단지 이름 덩어리로 나누기(빠뜨리는 낱말 최소 → 덩어리 수 최소 → 더 분명한 결과).
      search(q) → 결과 배열. 반환 {segs:[{q, i, j, hits}], skipped:[낱말]} */
  function segment(tokens, find) {
    const n = tokens.length, W = 5, memo = new Map();
    const look = (i, j) => {
      const k = i + ':' + j; if (memo.has(k)) return memo.get(k);
      let best = null;
      for (const q of spanQueries(tokens, i, j)) { const h = find(q); if (usable(q, h, j - i === 1)) { best = { q, hits: h }; break; } }
      memo.set(k, best); return best;
    };
    const cost = new Array(n + 1).fill(Infinity), back = new Array(n + 1).fill(null); cost[0] = 0;
    for (let i = 0; i < n; i++) {
      if (cost[i] === Infinity) continue;
      if (cost[i] + 1 < cost[i + 1]) { cost[i + 1] = cost[i] + 1; back[i + 1] = { i, skip: true }; }        // 낱말 빼기
      for (let j = i + 1; j <= Math.min(n, i + W); j++) {
        const r = look(i, j); if (!r) continue;
        const ex = r.hits.some(d => exact(d.apt, r.q));
        /* 여러 낱말을 한 이름으로 볼 때, 이름 앞부분부터 맞지 않으면(예: '은마 래미안' → '시범다은마을삼성래미안') 나눠 보는 쪽을 먼저 */
        const loose = j - i > 1 && !ex && M().matchName(r.hits[0].apt, r.q) > 0 ? 0.6 : 0;
        const c = cost[i] + 0.5 + loose + (ex || r.hits.length === 1 ? 0 : 0.05) - (j - i - 1) * 0.01;
        if (c < cost[j]) { cost[j] = c; back[j] = { i, r }; }
      }
    }
    const segs = [], skipped = [];
    for (let j = n; j > 0;) { const b = back[j]; if (!b) break; if (b.skip) skipped.unshift(tokens[b.i].t); else segs.unshift(Object.assign({ i: b.i, j }, b.r)); j = b.i; }
    return { segs, skipped };
  }
  /** 덩어리 결과 → 바로 고를 수 있으면 pick, 아니면 후보(cands, 최대 6곳) */
  function resolve(seg) {
    const h = seg.hits || [];
    const ex = h.filter(d => exact(d.apt, seg.q));
    const generic = M().normName(seg.q).length <= 3 && h.length > 5;   // '래미안'처럼 흔한 짧은 이름은 같은 이름 단지가 있어도 후보로
    if (ex.length === 1 && (!generic || ex[0].n >= 30)) return { pick: ex[0], cands: [] };
    if (generic) return { pick: null, cands: h.slice(0, 6) };
    if (!ex.length && h.length === 1) return { pick: h[0], cands: [] };
    /* 후보 중 한 곳의 최근 3년 거래가 압도적으로 많으면(다음 곳의 4배 이상, 30건 이상) 그 단지로 — 화면에 위치를 함께 보여 줌 */
    const pool = (ex.length ? ex : h).slice().sort((a, b) => b.n - a.n);
    if (pool.length >= 2 && pool[0].n >= 30 && pool[0].n >= pool[1].n * 4) return { pick: pool[0], cands: [], dominant: true };
    return { pick: null, cands: (ex.length ? ex : h).slice(0, 6) };
  }
  /** 문장 한 번에: {segs:[{q, pick, cands}], skipped, hint, more(3곳 넘게 찾음)} */
  function parse(text, groups) {
    const c = clean(text), cache = new Map();
    const find = q => { if (!cache.has(q)) cache.set(q, search(groups, q, 30)); return cache.get(q); };
    const sg = segment(c.tokens, find);
    const seen = new Set(), segs = [];
    for (const s of sg.segs) {
      const r = resolve(s);
      if (r.pick && seen.has(r.pick.key)) continue;
      if (r.pick) seen.add(r.pick.key);
      segs.push({ q: s.q, pick: r.pick, cands: r.cands, dominant: !!r.dominant });
    }
    return { segs: segs.slice(0, MAX), more: segs.length > MAX, skipped: sg.skipped, hint: c.hint, tokens: c.tokens.map(x => x.t) };
  }
  /** 평형 고르기: 힌트(전용㎡)에 가장 가까운 평형, 없으면 84㎡대, 그것도 없으면 거래 가장 많은 평형 */
  function pickBand(d, hint) {
    const bs = (d && d.bands) || []; if (!bs.length) return '';
    if (hint && hint.area) return bs.slice().sort((a, b) => Math.abs(a[4] - hint.area) - Math.abs(b[4] - hint.area) || b[5] - a[5])[0][3];
    const b84 = bs.find(u => u[3] === '84㎡대'); if (b84) return b84[3];
    return bs.slice().sort((a, b) => b[5] - a[5])[0][3];
  }

  /* ---------- 주소 ---------- */
  /** 단지 키 sd|구|동|지번|단지 ↔ 주소 k=키!키 */
  const keyOf = d => [d.sd, d.code, d.dong, d.jibun, d.apt].join('|');
  function parseKey(k) {
    const a = String(k || '').split('|'); if (a.length < 5 || !/^s\d\d$/.test(a[0]) || !/^\d{5}$/.test(a[1])) return null;
    return { sd: a[0], code: a[1], dong: a[2], jibun: a[3], apt: a.slice(4).join('|'), dkey: a.slice(1).join('|') };
  }
  /* 여러 값을 '!' 로 잇기(값 안의 '%'·'!' 만 바꿔 씀 — 주소에서 한 번만 인코딩되게) */
  const packList = a => a.map(x => String(x == null ? '' : x).replace(/%/g, '%25').replace(/!/g, '%21')).join('!');
  const unpackList = s => String(s || '').split('!').map(x => x.replace(/%21/gi, '!').replace(/%25/g, '%'));
  /** 1곳이면 내 집 시세, 2~3곳이면 단지 비교 주소 */
  function target(picks, hint, from) {
    const base = JB.SITE;
    if (picks.length === 1) {
      const p = picks[0], q = new URLSearchParams({ sd: p.d.sd, d: p.d.key });
      if (p.band) q.set('b', p.band);
      q.set('from', 'ask');
      return base + 'mine/?' + q.toString();
    }
    const q = new URLSearchParams(); q.set('k', packList(picks.map(p => keyOf(p.d))));
    if (picks.some(p => p.band)) q.set('b', packList(picks.map(p => p.band || '')));
    if (from) q.set('from', from);
    return base + 'ask/?' + q.toString();
  }

  /* ---------- 비교 값 ---------- */
  /** 실거래 평균(직거래 제외): 자료 마지막 3개월, 거래가 없으면 최근 12개월. u[11] = [계약일, 전용, 층, 금액, 유형, 신고가] */
  function avgDeal(u, months) {
    const t = (u && u[11]) || [], n = months.length; if (!n) return null;
    for (const span of [3, 12]) {
      const from = String(months[Math.max(0, n - span)]), to = String(months[n - 1]);
      const pick = t.filter(x => x[4] !== 1 && String(x[0]).slice(0, 6) >= from && String(x[0]).slice(0, 6) <= to && x[3] > 0);
      if (pick.length) return { v: Math.round(pick.reduce((s, x) => s + x[3], 0) / pick.length / 100) * 100, n: pick.length, from, to, span };
    }
    return null;
  }
  /** 전세가율·갭: 전체 기간 시세(histSeries)에서 매매·전세가 모두 있는 가장 최근 달(자료 끝 3개월 안) */
  function jeonseOf(ht, fxJr) {
    if (ht && ht.months && ht.months.length) {
      const n = ht.months.length;
      for (let i = n - 1; i >= Math.max(0, n - 3); i--) {
        const s = ht.s[i], j = ht.j[i];
        if (s > 0 && j > 0) return { jr: j / s, gap: s - j, sale: s, jeonse: j, at: ht.months[i], src: 'hist' };
      }
    }
    if (fxJr != null && fxJr > 0) return { jr: fxJr, gap: null, src: 'fx' };
    return null;
  }

  /* ---------- 요약 문장 (데이터 템플릿) ---------- */
  const nm = x => `${x.apt}(${x.band})`;
  /* 'A(84㎡대)' 뒤 조사: 괄호 안 마지막 글자(평형) 받침으로 고름 — 이/가, 은/는, 와/과 */
  const Jn = (x, a, b) => { const w = String(x.band || x.apt), c = w.charCodeAt(w.length - 1); const has = c >= 0xAC00 && c <= 0xD7A3 ? (c - 0xAC00) % 28 > 0 : false; return nm(x) + (has ? a : b); };
  const joinWa = list => list.map((x, i) => i < list.length - 1 ? Jn(x, '과', '와') : nm(x)).join(' ');
  const won = v => M().won(v);
  const pctTop = v => { v = Math.round(v); return v >= 50 ? `상위 ${Math.max(1, 100 - v)}%` : `하위 ${Math.max(1, v)}%`; };
  /** items: [{apt, band, sidoShort, price:{v}, avg:{v}, fv, fvBase(비교 기준 이름), fh:{1,3,5,7}, hzOk:{h:true}, jeon:{jr,gap}, gu:{diff, name}}]
      반환: 쉬운 말 문장 배열(최대 4). 숫자는 화면 표와 같은 값만 쓴다 */
  function summary(items) {
    const out = [], two = items.length === 2;
    /* ① 가격: 최근 시세(3개월 중간값 환산) — 둘 다 있을 때만, 차이 금액을 그대로 */
    const pr = items.filter(x => x.price && x.price.v > 0).sort((a, b) => b.price.v - a.price.v);
    if (pr.length >= 2) {
      const hi = pr[0], lo = pr[pr.length - 1], d = hi.price.v - lo.price.v;
      if (d === 0) out.push(`최근 시세는 ${joinWa(pr)} 모두 ${won(hi.price.v)}으로 같아요.`);
      else if (pr.length === 2) out.push(`최근 시세는 ${Jn(hi, '이', '가')} ${won(hi.price.v)}으로, ${nm(lo)} ${won(lo.price.v)}보다 ${won(d)} 높아요.`);
      else out.push(`최근 시세는 ${Jn(hi, '이', '가')} ${won(hi.price.v)}으로 가장 높고, ${Jn(lo, '이', '가')} ${won(lo.price.v)}으로 가장 낮아요(차이 ${won(d)}).`);
    }
    else {
      /* 시세(3개월 중간값)를 둘 이상 못 구하면 같은 기준인 '실거래 평균'끼리만 견줌(서로 다른 기준을 섞지 않음) */
      const av = items.filter(x => x.avg && x.avg.v > 0).sort((a, b) => b.avg.v - a.avg.v);
      if (av.length >= 2 && new Set(av.map(x => x.avg.span)).size === 1) {   // 같은 기간(3개월 또는 1년)끼리만
        const hi = av[0], lo = av[av.length - 1], d = hi.avg.v - lo.avg.v;
        if (d === 0) out.push(`최근 실거래 평균은 ${joinWa(av)} 모두 ${won(hi.avg.v)}으로 같아요.`);
        else out.push(`최근 실거래 평균은 ${Jn(hi, '이', '가')} ${won(hi.avg.v)}으로, ${nm(lo)} ${won(lo.avg.v)}보다 ${won(d)} 높아요(거래가 적어 시세 대신 평균으로 비교했어요).`);
      }
    }
    /* ② 미래가치 점수(2년 보유 기준) — 비교 기준(같은 시·도 아파트)을 꼭 붙임 */
    const fv = items.filter(x => x.fv != null).sort((a, b) => b.fv - a.fv);
    const sameBase = new Set(fv.map(x => x.fvBase)).size === 1;
    if (fv.length >= 2 && sameBase) {
      const a = fv[0], b = fv[1];
      if (a.fv === b.fv && (fv.length === 2 || fv[2].fv !== a.fv)) out.push(`미래가치 점수(2년 보유 기준)는 ${Jn(a, '과', '와')} ${Jn(b, '이', '가')} 모두 ${a.fvBase} 중 ${pctTop(a.fv)}로 같아요.`);
      else if (a.fv === b.fv) out.push(`미래가치 점수(2년 보유 기준)는 세 단지 모두 ${a.fvBase} 중 ${pctTop(a.fv)}로 같아요.`);
      else out.push(`미래가치 점수(2년 보유 기준)는 ${Jn(a, '이', '가')} ${a.fvBase} 중 ${pctTop(a.fv)}로${fv.length === 2 ? `, ${nm(b)}의 ${pctTop(b.fv)}보다 순위가 높아요` : ' 세 단지 중 가장 높아요'}.`);
      /* 검증을 통과한 더 긴 보유 기간에서 1위가 바뀌면 함께 알려 줌 */
      for (const h of [5, 3]) {
        const hs = items.filter(x => x.fh && x.fh[h] != null && x.hzOk && x.hzOk[h]).sort((p, q) => q.fh[h] - p.fh[h]);
        if (hs.length >= 2 && hs.length === fv.length && hs[0] !== a && hs[0].fh[h] > hs[1].fh[h]) {
          out.push(`다만 ${h}년 보유 기준으로는 ${Jn(hs[0], '이', '가')} ${pctTop(hs[0].fh[h])}로, ${nm(a)}의 ${pctTop(a.fh[h])}보다 앞서요.`);
          break;
        }
      }
    } else if (fv.length >= 2) {
      out.push(`미래가치 점수는 시·도마다 따로 매긴 순위라 바로 견주기 어려워요: ${fv.map(x => `${Jn(x, '은', '는')} ${x.fvBase} 중 ${pctTop(x.fv)}`).join(', ')}.`);
    } else if (fv.length === 1 && items.length >= 2) {
      out.push(`미래가치 점수는 ${nm(fv[0])}만 있어요(${fv[0].fvBase} 중 ${pctTop(fv[0].fv)}). 나머지 단지는 자료가 부족해 점수를 매기지 않았어요.`);
    }
    /* ③ 전세 끼고 살 때 필요한 돈(갭 = 매매 시세 − 전세 시세) */
    const gp = items.filter(x => x.jeon && x.jeon.gap != null).sort((a, b) => a.jeon.gap - b.jeon.gap);
    if (gp.length >= 2) {
      const lo = gp[0], hi = gp[gp.length - 1];
      if (lo.jeon.gap === hi.jeon.gap) out.push(`전세를 끼고 살 때 필요한 돈(갭)은 ${joinWa(gp)} 모두 ${won(lo.jeon.gap)}으로 같아요.`);
      else out.push(`전세를 끼고 살 때 필요한 돈(갭 = 매매 시세 − 전세 시세)은 ${Jn(lo, '이', '가')} ${won(lo.jeon.gap)}으로 ${two ? `${nm(hi)} ${won(hi.jeon.gap)}보다 ${won(hi.jeon.gap - lo.jeon.gap)} 적어요` : '세 단지 중 가장 적어요'}.`);
    }
    /* ④ 구 대비 위치(같은 구 아파트 3개월 평당가 중간값 대비) — 한 문장으로 */
    const gu = items.filter(x => x.gu && x.gu.diff != null);
    if (gu.length >= 2 && out.length < 4) {
      const one = new Set(gu.map(x => x.gu.name)).size === 1;
      const part = (x, last) => { const p = Math.round(Math.abs(x.gu.diff) * 100), up = x.gu.diff > 0;
        return `${Jn(x, '은', '는')} ${one ? '' : x.gu.name + '보다 '}` + (p === 0 ? (last ? '비슷해요' : '비슷하고') : `${p}% ${up ? (last ? '높아요' : '높고') : (last ? '낮아요' : '낮고')}`); };
      out.push((one ? `평당가로 보면 ${gu[0].gu.name}보다 ` : '같은 구 아파트 평당가 중간값과 비교하면 ') + gu.map((x, i) => part(x, i === gu.length - 1)).join(', ') + '.');
    }
    return out.slice(0, 4);
  }
  /** 공유 카드 머리글: 'A vs B, 통계로 비교했어요' */
  const shareHead = items => items.map(x => x.apt).join(' vs ') + ', 통계로 비교했어요';


  /* ---------- 비교 화면 표시값 (아실류 오류 막기: 음수 연식·의미 없는 -0.01%·날짜 원문 노출 금지) ---------- */
  /** '202610' → '2026년 10월', '20050518' → '2005년 5월' */
  function ymText(v) {
    const t = String(v == null ? '' : v); if (!/^\d{6}(\d{2})?$/.test(t)) return '';
    const m = +t.slice(4, 6); return m >= 1 && m <= 12 ? `${t.slice(0, 4)}년 ${m}월` : '';
  }
  /** 입주(준공) 연도 → '2018년(8년차)', 아직 입주 전이면 '2027년 입주 예정', 이상한 값은 '' */
  function ageText(by, year) { const P = PW(); return P ? P.ageText(by, year) : ''; }   // 공용: assets/plain-words.js
  /** 차이 비율 → {p 반올림 %, up} — 0.5% 미만은 null('비슷해요'로 표시, '-0.01%' 같은 값 안 씀) */
  function pctDiff(d) { if (d == null || !isFinite(d)) return null; const p = Math.round(Math.abs(d) * 100); return p < 1 ? { p: 0, up: false, same: true } : { p, up: d > 0, same: false }; }
  /** 거래 회전율: 최근 12개월 매매 건수(모든 평형) ÷ 세대수 */
  function turnover(bands, hh) {
    if (!(hh > 0) || !bands || !bands.length) return null;
    const n = bands.reduce((s, u) => s + M().counts(u[7]).slice(-12).reduce((a, b) => a + b, 0), 0);
    return { r: n / hh, n, hh };
  }
  /** 이긴 쪽: dir 1 = 클수록, -1 = 작을수록. 값이 2개 미만이거나 1등이 같으면 -1 */
  function winner(vals, dir) {
    const ok = vals.map((v, i) => [v, i]).filter(a => a[0] != null && isFinite(a[0]));
    if (ok.length < 2 || !dir) return -1;
    ok.sort((a, b) => (b[0] - a[0]) * dir);
    return ok[0][0] === ok[1][0] ? -1 : ok[0][1];
  }
  /** 'YYYYMM' 사이 모든 달 */
  function monthsBetween(a, b) { const out = []; if (!a || !b) return out; for (let m = String(a); m <= String(b); m = M().ymAdd(m, 1)) out.push(m); return out; }
  /** [시작 칸, 값…](기준 달 base) → Map(달 → 값) */
  function offSeries(a, base) { const m = new Map(); if (!Array.isArray(a) || a.length < 2 || !base) return m; for (let k = 1; k < a.length; k++) if (a[k] > 0) m.set(M().ymAdd(base, a[0] + k - 1), a[k]); return m; }
  /** 차트 자료: tab = sale(매매)·jeonse(전세)·rent(월세)·cnt(매매 건수)
      src = {ht: histSeries, u: 시세 행(u[11] 개별 거래, u[7] 월별 건수), months: 36개월, rent: 전월세 행, rentBase: m0}
      반환 {line: Map(달 → 금액), dots: [[달, 금액, 일]]} — 금액 단위 만원, 선은 3개월 중간값, 점은 실제 신고 거래 */
  function chartData(tab, src) {
    const line = new Map(), dots = [];
    const ym = d => String(d).slice(0, 6);
    if (tab === 'sale') {
      const ht = src.ht;
      if (ht) ht.months.forEach((m, i) => { if (ht.s[i] > 0) line.set(m, ht.s[i]); });
      else if (src.u && src.u[6]) src.months.forEach((m, i) => { const v = src.u[6][i]; if (v > 0) line.set(String(m), M().toPrice(v, src.u[4])); });
      for (const t of ((src.u && src.u[11]) || [])) if (t[4] !== 1 && t[3] > 0) dots.push([ym(t[0]), t[3], t[0]]);
    } else if (tab === 'jeonse') {
      const ht = src.ht;
      if (ht) ht.months.forEach((m, i) => { if (ht.j[i] > 0) line.set(m, ht.j[i]); });
      else if (src.rent) for (const [m, v] of offSeries(src.rent[7], src.rentBase)) line.set(m, v);
      for (const c of ((src.rent && src.rent[10]) || [])) if (!(c[4] > 0) && c[3] > 0) dots.push([ym(c[0]), c[3], c[0]]);
    } else if (tab === 'rent') {
      if (src.rent) for (const [m, v] of offSeries(src.rent[9], src.rentBase)) line.set(m, v);
      for (const c of ((src.rent && src.rent[10]) || [])) if (c[4] > 0) dots.push([ym(c[0]), c[4], c[0]]);
    } else if (tab === 'cnt') {
      const c = M().counts(src.u && src.u[7]);
      src.months.forEach((m, i) => { if (i < c.length) line.set(String(m), c[i]); });
    }
    return { line, dots };
  }

  /* ---------- 단지 이름이 아닌 질문 → 이미 있는 화면으로 바로 연결 ----------
     '서울 분양 예정 단지', '송파구 집값 올랐어?', '우리 동네 재개발 구역'처럼 단지 이름이 아닌 질문은 낱말(예: '서울')을 단지 이름으로 잘못 찾지 않고,
     그 질문에 답하는 집예보 화면(분양·순위·재개발 구역·전월세·빌라 등)을 지역 조건을 채워 열어 줘요. 숫자를 새로 만들지 않아요.
     topic(text, IX) → null | { id, title, desc, url, region:{sd, sdName, g, gName}, danjiOk } (danjiOk: 단지 이름이 함께 있으면 단지 화면이 더 맞는 주제) */
  const TOPICS = [
    { id: 'cy', re: /가점|청약\s*점수|당첨\s*(가능|확률|될|되)|특별공급|특공|1순위/, title: '내 청약 진단', desc: '내 가점·자격으로 지금 공고 중 어디를 노려 볼 만한지 보여 드려요', path: 'chungyak/' },
    { id: 'by', re: /분양|청약|모집\s*공고|입주\s*예정|무순위|줍줍|미분양|새\s*아파트|신축\s*아파트/, title: '분양 정보', desc: '공식 공고 기준 분양 예정·청약 중·입주 예정 단지를 지역별로 보여 드려요', path: 'bunyang/' },
    { id: 'zone', re: /재개발|재건축|정비\s*구역|구역|정비\s*사업|관리처분|사업시행|착공|이주|조합\s*설립|신속통합|입주권/, title: '재개발·재건축 구역 지도', desc: '구역마다 지금 단계와 착공까지 보통 몇 년 걸리는지 보여 드려요', path: 'villa/zone/' },
    { id: 'jeonse', re: /전세|월세|전월세|보증금|깡통|전세\s*사기|역전세|세입자|임대차/, title: '전월세 전망·전세사기 예방', desc: '전세·월세 시세, 전세가율(집값 대비 전셋값 비율), 깡통전세 위험을 보여 드려요', path: 'jeonse/', danjiOk: true },
    { id: 'villa', re: /빌라|연립|다세대|대지\s*지분/, title: '재개발·빌라 체크', desc: '빌라 실거래와 대지지분 평당가, 같은 동 정비구역 단계를 보여 드려요', path: 'villa/' },
    { id: 'offi', re: /오피스텔/, title: '오피스텔 시세', desc: '오피스텔 실거래 시세와 흐름을 보여 드려요', path: 'mine/?t=o' },
    { id: 'shop', re: /상가|통건물|꼬마\s*빌딩|건물\s*시세/, title: '상가·건물 시세', desc: '상가·건물 실거래를 보여 드려요', path: 'mine/?t=c' },
    { id: 'week', re: /지난\s*주|이번\s*주|주간/, title: '주간 실거래 동향', desc: '지난주 계약된 아파트가 같은 집 직전 거래보다 얼마나 올랐는지 보여 드려요', path: 'weekly/' },
    { id: 'rank', re: /순위|몇\s*위|몇\s*등|가장\s*많이|제일\s*많이|많이\s*(오른|내린|올랐|떨어진)|올랐|내렸|떨어졌|상승률|하락률|오른\s*(곳|구|동네|지역)|내린\s*(곳|구|동네|지역)|집값\s*(흐름|동향|추이)|어디가\s*(올|좋)/, title: '지역 순위', desc: '같은 시·도 안에서 구별 시세가 얼마나 올랐는지, 앞으로 2년 지역 흐름은 몇 위인지 보여 드려요', path: 'rank/' },
    { id: 'map', re: /지도|근처|주변|역세권|가까운|이하\s*(아파트|단지)|억\s*(이하|미만|대)|추천/, title: '지도로 단지 찾기', desc: '지역·가격·평형 조건으로 단지 시세와 미래가치 점수를 지도에서 한눈에 보여 드려요', path: 'map/' }
  ];
  /** 문장 속 지역(시·도, 시·군·구) — index.json 의 이름만 씀 */
  /* 옛 이름·흔한 줄임말 → index.json 시·도 줄임 이름 */
  const SIDO_ALIAS = [[/광주|전남|전라남도/, '전남광주'], [/충청북도/, '충북'], [/충청남도/, '충남'], [/경상북도/, '경북'], [/경상남도/, '경남'], [/전라북도/, '전북'], [/강원도/, '강원']];
  function regionOf(text, IX) {
    let t = String(text || '');
    for (const [re, sh] of SIDO_ALIAS) if (re.test(t) && t.indexOf(sh) < 0 && !(sh === '전남광주' && /경기/.test(t))) t += ' ' + sh;   // '경기 광주'는 경기도 광주시
    const out = { sd: '', sdName: '', sdShort: '', g: '', gName: '' };
    if (!IX || !IX.sido) return out;
    /* 시·군·구 먼저(글자가 가장 길게 맞는 곳 — '강남구'가 '포항시 남구'의 '남구'로, '해운대구'가 '대구'로 잘못 잡히지 않게) */
    const cand = [];
    for (const [code, v] of Object.entries(IX.sgg || {})) {
      const n = v && v.name; if (!n || n.length < 2) continue;
      const short = n.split(' ').pop(), hitLen = t.indexOf(n) >= 0 ? n.length : (short.length >= 2 && t.indexOf(short) >= 0 ? short.length : 0);
      if (!hitLen) continue;
      const at = t.indexOf(n) >= 0 ? t.indexOf(n) : t.indexOf(short), word = t.indexOf(n) >= 0 ? n : short;
      /* 더 긴 이름의 일부인 경우(앞 글자가 한글) 빼기 — '강남구' 안의 '남구' */
      if (at > 0 && /[가-힣]/.test(t.charAt(at - 1)) && !(t.indexOf(n) >= 0 && n.indexOf(' ') > 0)) continue;
      cand.push({ code, v, len: hitLen, word });
    }
    const sidoIn = s => s && (t.indexOf(s.name) >= 0 || (s.short && t.split(/\s+/).some(w => w.indexOf(s.short) === 0 && !cand.some(c => w.indexOf(c.word) >= 0 && c.word.indexOf(s.short) >= 0))));
    const sido = IX.sido.find(x => t.indexOf(x.name) >= 0) || IX.sido.find(sidoIn);
    if (sido) { out.sd = sido.id; out.sdName = sido.name; out.sdShort = sido.short; }
    if (cand.length) {
      const inSd = cand.filter(c => !out.sdName || c.v.sido === out.sdName);
      const pool = (inSd.length ? inSd : cand).sort((a, b) => b.len - a.len || (a.code.startsWith('11') ? -1 : b.code.startsWith('11') ? 1 : 0));
      const c = pool[0];
      out.g = c.code; out.gName = c.v.name;
      if (!out.sd || c.v.sido !== out.sdName) { const s = IX.sido.find(x => x.name === c.v.sido); if (s) { out.sd = s.id; out.sdName = s.name; out.sdShort = s.short; } }
    }
    return out;
  }
  function topic(text, IX) {
    const t = String(text || '');
    const hit = TOPICS.find(x => x.re.test(t)); if (!hit) return null;
    const r = regionOf(t, IX), base = JB.SITE;
    let url = base + hit.path;
    const q = new URLSearchParams();
    if (hit.id === 'by') {
      if (r.sdShort) q.set('sd', r.sdShort);
      if (r.g && r.gName) q.set('g', r.gName.split(' ').pop());
      if (/분양\s*예정|예정/.test(t) && !/입주\s*예정/.test(t)) q.set('st', 'pre');
      else if (/청약\s*중|접수|넣을\s*수|지금\s*청약/.test(t)) q.set('st', 'on');
      else if (/입주\s*예정/.test(t)) q.set('st', 'mv');
      if (/아파트/.test(t)) q.set('k', '아파트');
    } else if (hit.id === 'rank') {
      if (r.sd) q.set('sd', r.sd);
      if (/내린|내렸|떨어|하락/.test(t)) q.set('dir', 'down');
      if (/미래|앞으로|전망/.test(t)) q.set('t', 'fv');
    } else if (hit.id === 'jeonse') {
      if (r.sd) q.set('sd', r.sd); if (r.g) q.set('g', r.g);
      if (/빌라|연립|다세대/.test(t)) q.set('k', 'v'); else if (/오피스텔/.test(t)) q.set('k', 'o');
    } else if (hit.id === 'map') {
      if (r.sd) q.set('sd', r.sd);
    } else if (hit.id === 'villa') {
      if (r.g) q.set('g', r.g);
    } else if (hit.id === 'cy') {
      /* '가점 64점' 처럼 점수가 있으면 질문을 건너뛰고 바로 단지별 진단(chungyak ?score=·sido=) */
      const m = /(\d{1,2})\s*점/.exec(t); if (m && +m[1] <= 84) q.set('score', m[1]);
      if (r.sdName) q.set('sido', r.sdName);
    }
    const qs = q.toString();
    if (qs) url += (url.indexOf('?') >= 0 ? '&' : '?') + qs;
    /* 화면 주소에 실제로 넣은 지역만 글자로(넣지 못한 지역을 넣은 것처럼 쓰지 않게) */
    const gIn = q.has('g'), sdIn = q.has('sd') || q.has('sido') || gIn;
    const where = gIn ? (r.sdShort && r.gName.indexOf(r.sdShort) < 0 ? r.sdShort + ' ' : '') + r.gName : sdIn ? r.sdShort : '';
    return { id: hit.id, title: hit.title, desc: hit.desc, url, region: r, where, danjiOk: !!hit.danjiOk };
  }
  /** 주제 낱말(분양·재건축·구역·추천·10억 등)로 찾은 단지 덩어리인가 — 주제 질문에서 '재건축' → '낙원연립재건축조합아파트'처럼 잘못 고르지 않게 */
  function topicWord(q) {
    const w = String(q || '');
    return TOPICS.some(x => x.re.test(w)) || /^\d+(억|만|평)/.test(w) || /^(언제|어디|이하|이상|미만|정도|높은|낮은|싼|비싼|많은|좋은|구|동네|지역|단지|아파트)$/.test(w.replace(/\s/g, ''));
  }
  /** 낱말이 지역 이름(시·도·시·군·구·'○○동')뿐인가 — 주제 질문에서 '서울' 같은 낱말을 단지 이름으로 찾지 않게 */
  function regionWord(q, IX) {
    const w = String(q || '').replace(/\s/g, ''); if (!w) return false;
    if (/^(우리|내)?(동네|지역|근처|주변)$/.test(w)) return true;
    if (!IX) return false;
    if ((IX.sido || []).some(s => s.short === w || s.name === w || s.short + '시' === w)) return true;
    return Object.values(IX.sgg || {}).some(v => v && v.name && (v.name === w || v.name.split(' ').pop() === w || v.name.replace(/\s/g, '') === w || v.name.split(' ').pop() === w + '구'));
  }

  const API = { TOPICS, topic, topicWord, regionOf, regionWord, MAX, ymText, ageText, pctDiff, turnover, winner, monthsBetween, offSeries, chartData, STOP, ALIAS, clean, bandHint, exact, search, segment, resolve, parse, pickBand, keyOf, parseKey, packList, unpackList, target, avgDeal, jeonseOf, summary, shareHead, pctTop };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.JDJ_ASK_CORE = API;
})(typeof self !== 'undefined' ? self : this);
