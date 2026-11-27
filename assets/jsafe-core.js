/* 전세 안전 점검 계산 — 전세 안전 점검 화면(jeonse/safety/)과 고민 찾기 길잡이(보증금 걱정 deposit_safe)가 함께 써요.
   같은 입력이면 두 곳이 글자까지 같은 결과(tools/jsafe-test.js 가 대조). 브라우저 window.JDJ_JSAFE, node require 둘 다.
   이 파일은 서버로 아무것도 보내지 않아요. 넣은 보증금·선순위 채권·공시가격은 기기 안 계산에만 써요.

   입력 x = {
     kind  'a' 아파트 | 'v' 빌라 | 'o' 오피스텔 | 'd' 단독·다가구
     code  시·군·구 코드, metro 수도권(서울 11·인천 28·경기 41 — metroOf)
     dep 보증금, senior 선순위 채권(모르면 null → 0으로 계산하고 그렇게 적음), pub 공시가격, kb 시세(아파트·오피스텔, 선택)  — 금액 만원
     sale  { price, at 'YYYYMM', ch1 {pct, fromAt, toAt}, band, by 'b'(건물) } | { none: true } | null   — 매매 시세(아파트 = 내 집 시세와 같은 값)
     rent  { ch1 } — 빌라·오피스텔·단독 전셋값 1년 흐름(선택)
     range dongRange 결과(빌라·오피스텔) | { med, at, dong, band }(단독·다가구)
     kk    공개 깡통전세 요약(data/rent/kk.json), place { gu, dong, name, band }
   }
   build(x, { H: JDJ_HUG, KK: JDJ_KK }) → 진단 리포트(assets/diag.js rep 모양) + 항목마다 lvT(판정 글자).

   판단 선(집예보 안내용 기준 — 화면 '왜'에 그대로 적어요)
     전세가율 = (보증금 + 선순위 채권) ÷ 매매 시세: 80% 미만 괜찮아요 · 80~90% 주의 · 90% 이상 위험
     HUG 전세보증: 보증금 + 선순위 채권 ≤ 주택가격 × 90%(공시가격이면 × 140% × 90% = 126%) · 보증금 수도권 7억·그 밖 5억 이하
       (주택도시보증공사 상품 안내, 2026-11-25 확인 · 2026-11-27 다시 확인 · 126% 기준 유지 보도 2026-10-09)
     깡통전세(아파트): 과거 검증(kk.json status)에 합격하지 못한 확률은 숫자로 보여 주지 않고, 과거 비슷한 계약의 실제 횟수(n건 중 k건).
       10% 미만 괜찮아요 · 30% 미만 주의 · 그 이상 위험 · 비슷한 계약 30건 미만이면 판단 안 함
     최근 1년 흐름: ±0.5% 안은 거의 같음(괜찮아요) · 5% 넘게 내리면 위험 · 그 사이로 내리면 주의
     같은 동 보증금 범위(빌라·오피스텔): 최근 12개월 순수 전세 계약, 5건 미만이면 숨김. 내 보증금이 75% 자리 이하 괜찮아요 · 90% 자리 이하 주의 · 그 위 위험 */
(function (root) {
  'use strict';
  const LV = { g: '괜찮아요', y: '주의', r: '위험', n: '확인 필요' };
  const SS_KEY = 'jdj_jsafe', SS_TTL = 30 * 60 * 1000;
  const FROM_HT = { apt: 'a', villa: 'v', offi: 'o', house: 'd' };
  const HT_OF = { a: 'apt', v: 'villa', o: 'offi', d: 'house' };
  const KIND_NM = { a: '아파트', v: '빌라', o: '오피스텔', d: '단독·다가구' };
  const RT = { n: '국토교통부 실거래가 공개시스템', u: 'https://rt.molit.go.kr/' };
  const NEWS126 = { n: '매일신문 · 전세보증 126% 룰(정부가 126% 기준을 바꾸지 않았다는 보도)', u: 'https://www.imaeil.com/page/view/2026100916594256154', at: '2026-10-09' };

  /** 만원 → '2억 5,200만원' (내 집 시세 화면과 같은 표기) */
  function won(man) {
    man = Math.round(+man || 0); const neg = man < 0; man = Math.abs(man);
    const e = Math.floor(man / 10000), r = man % 10000;
    const s = (e ? e.toLocaleString('ko-KR') + '억' : '') + (r ? (e ? ' ' : '') + r.toLocaleString('ko-KR') + '만' : '') + '원';
    return (neg ? '-' : '') + (man ? s : '0원');
  }
  const ym = v => { v = String(v || ''); return /^\d{6}$/.test(v) ? v.slice(0, 4) + '.' + v.slice(4) : ''; };
  const ymAdd = (v, n) => { const t = +v.slice(0, 4) * 12 + (+v.slice(4) - 1) + n; return String(Math.floor(t / 12)) + String(t % 12 + 1).padStart(2, '0'); };
  const metroOf = code => { code = String(code || ''); return !code || /^(11|28|41)/.test(code); };
  const num = v => Math.max(0, Math.round(+v || 0));

  /* ---------- 아파트 매매 시세(내 집 시세·길잡이 단지 정보와 같은 값) ---------- */
  /** 평형 고르기 — 길잡이(ask-core pickBand)·내 집 시세(mine-core defaultBand)와 같은 규칙 */
  function pickBand(bands) {
    if (!bands || !bands.length) return '';
    const top = bands.slice().sort((a, b) => b[5] - a[5])[0], b84 = bands.find(u => u[3] === '84㎡대');
    if (b84 && (b84[5] >= 12 || b84[5] * 4 >= top[5])) return b84[3];
    return top[3];
  }
  /** units = price/{구}.json units, months = index.json months, q = {code, dong, apt, jibun, band}, M = JDJ_MINE
      → { price, at, ch1, band } · 이 평형 최근 거래가 없으면 { none: true, band } · 단지가 없으면 null */
  function saleOf(units, months, q, M) {
    if (!units || !q) return null;
    const bands = units.filter(x => x[0] === q.code && x[1] === q.dong && x[2] === q.apt);
    if (!bands.length) return null;
    const band = q.band && bands.some(u => u[3] === q.band) ? q.band : pickBand(bands);
    const u = bands.find(x => x[3] === band && String(x[8]) === String(q.jibun || x[8])) || bands.find(x => x[3] === band);
    const sm = u && u[6] ? M.bandSummary(u, months) : null;
    if (!sm || !(sm.price > 0)) return { none: true, band };
    return { price: sm.price, at: sm.at, band, ch1: sm.ch1 ? { pct: sm.ch1.pct, fromAt: sm.ch1.fromAt, toAt: sm.ch1.toAt } : null };
  }
  /** 같은 평형 다른 단지 선택지(화면 평형 단추) */
  function bandsOf(units, q) { return (units || []).filter(x => x[0] === q.code && x[1] === q.dong && x[2] === q.apt).map(x => x[3]).filter((b, i, a) => a.indexOf(b) === i); }

  /* ---------- 빌라·오피스텔: 같은 동·같은 면적대 최근 1년 순수 전세 보증금 범위 ---------- */
  /** units = rent/v|o/{구}.json units(u[0] 동 · u[2] 면적대 · u[10] 개별 계약 [날짜, 면적, 층, 보증금, 월세, …]), to = 자료 마지막 달 */
  function dongRange(units, dong, band, to) {
    if (!units || !dong || !band || !/^\d{6}$/.test(String(to || ''))) return null;
    const st = (+to.slice(0, 4) - 1) * 10000 + (+to.slice(4) + 1) * 100;
    const v = [];
    units.forEach(u => { if (u[0] === dong && u[2] === band) (u[10] || []).forEach(t => { if (t[0] > st && !(t[4] > 0) && t[3] > 0) v.push(t[3]); }); });
    v.sort((a, b) => a - b);
    const out = { dong, band, n: v.length, from: ymAdd(to, -11), to, q1: null, q2: null, q3: null, p90: null };
    if (v.length < 5) return out;
    const q = p => { const i = (v.length - 1) * p, lo = Math.floor(i), hi = Math.ceil(i); return Math.round(v[lo] + (v[hi] - v[lo]) * (i - lo)); };
    return Object.assign(out, { q1: q(0.25), q2: q(0.5), q3: q(0.75), p90: q(0.9), lo: v[0], hi: v[v.length - 1] });
  }

  /* ---------- 항목 ---------- */
  const it = (id, t, lv, v, s, why, src) => ({ id, t, lv, lvT: LV[lv], v, s, why: why || [], src: src || [] });
  const owe = x => num(x.dep) + num(x.senior);
  const senNote = x => x.senior == null ? ['선순위 채권(근저당 등)을 몰라 0으로 계산했어요. 등기부 을구의 채권최고액을 넣으면 더 정확해요.'] : [];

  /** ① 전세가율 = (보증금 + 선순위 채권) ÷ 매매 시세 */
  function itemJr(x) {
    const T = '전세가율 (집값 대비 보증금)';
    const LINE = '판단 선: 80% 미만 괜찮아요 · 80~90% 주의 · 90% 이상 위험(집예보 안내용 기준). 90%는 HUG 전세보증이 보는 담보 비율과 같아요.';
    if (x.kind === 'd') return it('jr', T, 'n', '계산 안 해요', '단독·다가구는 원자료에 건물 정보가 없어 집값과 맞출 수 없어요.', ['단독·다가구 실거래는 개인정보 보호로 지번이 없어 같은 건물 매매가를 찾을 수 없어요.', '공시가격으로 본 HUG 기준과 같은 동 보증금 수준으로 대신 확인해 주세요.'], [RT]);
    if (!(num(x.dep) > 0)) return it('jr', T, 'n', '보증금 필요', '보증금을 넣으면 계산해요.', [LINE], [RT]);
    const s = x.sale;
    if (!s || s.none || !(s.price > 0)) {
      const why = x.kind === 'a' ? (s && s.none ? '이 평형은 최근 3개월 매매 거래가 없어 지금 시세를 알 수 없어요. 시세를 지어내지 않아요.' : '단지를 고르면 같은 평형 매매 시세로 계산해요.')
        : x.kind === 'v' ? (x.place && x.place.name ? '이 건물은 최근 3년 같은 건물 매매가 적어(3건 미만) 계산하지 않았어요.' : '건물을 고르면 같은 건물 매매가로 계산해요.')
        : '오피스텔은 같은 건물 매매 시세가 부족해 계산하지 않았어요.';
      return it('jr', T, 'n', '확인 필요', s && s.none && x.kind === 'a' ? '최근 3개월 매매 거래가 없어 지금 시세를 알 수 없어요.' : why, [why, LINE], [RT]);
    }
    const r = owe(x) / s.price, p = Math.round(r * 100), lv = r >= 0.9 ? 'r' : r >= 0.8 ? 'y' : 'g';
    const base = x.kind === 'a' ? `${x.place && x.place.band ? x.place.band + ' ' : ''}매매 시세(그 달까지 3개월 실거래 중간값)` : '같은 건물·면적 매매가(최근 3년 실거래 중간값)';
    return it('jr', T, lv, `${p}%`, `${x.senior ? '보증금 + 선순위 채권' : '보증금'} ${won(owe(x))} ÷ 매매 시세 ${won(s.price)}${s.at ? ` (${ym(s.at)})` : ''}`,
      [`전세가율이 높을수록 집을 팔아도 보증금을 다 돌려받지 못할 가능성이 커져요.`, `${base} ${won(s.price)}와 비교했어요.`].concat(senNote(x), [LINE]), [RT]);
  }

  /** ② HUG 전세보증 가입 기준(assets/hug-core.js check 그대로) */
  function itemHug(x, H) {
    const T = 'HUG 전세보증 가입';
    const src = [{ n: H.SRC.name, u: H.SRC.url, at: H.SRC.checked }, NEWS126];
    const cap = x.metro ? H.CAP.metro : H.CAP.other, capT = `${x.metro ? '수도권' : '수도권 밖'} 보증금 한도 ${won(cap)}`;
    const RULE = [`가입 기준: 보증금 + 선순위 채권이 주택가격 × 90% 안이어야 해요. 선순위 채권은 주택가격의 60% 이내여야 해요.`,
      `주택가격: 아파트·오피스텔은 시세(KB시세 등)를 먼저 쓰고, 없으면 공시가격 × 140%예요. 빌라·단독은 공시가격 × 140%가 첫 순위예요. 그래서 공시가격으로 보면 126%(140% × 90%)가 선이에요.`,
      `${capT}이에요. 정부가 126% 기준을 바꾸지 않았다는 보도(2026-10-09)가 있고, 2026-11-27에 HUG 안내와 다시 맞춰 봤어요.`,
      '판단 선: 기준 안이면 괜찮아요, 넘으면 위험이에요. 실제 가입 여부·보증료는 HUG 심사로 정해져요.'];
    const dep = num(x.dep);
    if (!(dep > 0)) return it('hug', T, 'n', '보증금 필요', '보증금을 넣으면 확인해요.', RULE, src);
    if (!(num(x.pub) > 0) && !(num(x.kb) > 0 && (x.kind === 'a' || x.kind === 'o'))) {
      if (dep > cap) return it('hug', T, 'r', '한도를 넘어요', `보증금이 ${capT}을 넘어요.`, RULE, src);
      return it('hug', T, 'n', '공시가격 필요', `공시가격을 넣으면 확인해요. ${capT}이에요.`, RULE, src);
    }
    const r = H.check({ dep, senior: num(x.senior), pub: num(x.pub), kb: num(x.kb), type: HT_OF[x.kind] || 'villa', metro: !!x.metro, months: 24 });
    const by = r.by === 'kb' ? `시세 ${won(r.price)} × 90%` : `공시가격 ${won(x.pub)} × 126%`;
    const fails = r.checks.filter(c => !c.ok).map(c => ({ cap: capT + '을 넘어요', limit: `보증금 + 선순위 채권이 ${won(r.limit)}(${by})을 넘어요`, senior: '선순위 채권이 주택가격의 60%를 넘어요' })[c.k]);
    const why = [r.ok ? `${by} = ${won(r.limit)}${num(x.senior) ? `에서 선순위 채권 ${won(x.senior)}을 빼면` : '이라'} 보증금 ${won(r.maxDep)}까지 기준 안이에요.` : fails.join(' · ') + '.'].concat(senNote(x), RULE);
    if (r.ok) return it('hug', T, 'g', '기준 안이에요', `이 조건이면 보증금 ${won(r.maxDep)}까지 가입 기준에 맞아요.`, why, src);
    return it('hug', T, 'r', '기준을 넘어요', `${r.checks.find(c => !c.ok).k === 'cap' ? capT + ' 넘음' : r.checks.find(c => !c.ok).k === 'senior' ? '선순위 채권이 주택가격의 60% 넘음' : `기준 ${won(r.limit)} 넘음`} · 보증금이 ${won(r.maxDep)} 이하면 기준 안이에요.`, why, src);
  }

  /** ③ 깡통전세 위험(아파트) — 과거 비슷한 계약의 실제 결과 */
  function itemKk(x, KK) {
    if (x.kind !== 'a') return null;
    const T = '깡통전세 위험 (2년 뒤)';
    const LINE = '판단 선: 10% 미만 괜찮아요 · 30% 미만 주의 · 그 이상 위험(집예보 안내용 기준). 비슷한 과거 계약이 30건보다 적으면 판단하지 않아요.';
    const K = x.kk, s = x.sale, gu = (x.place && x.place.gu) || '이 지역';
    const base = ['2년 뒤 이 평형 집값이 보증금(+ 선순위 채권)보다 낮아지면 집을 팔아도 보증금을 다 못 돌려받을 수 있어요. 같은 구 아파트의 실제 과거 전세 계약으로 확인해요.', LINE];
    if (!(num(x.dep) > 0)) return it('kk', T, 'n', '보증금 필요', '보증금을 넣으면 확인해요.', base, [RT]);
    if (!s) return it('kk', T, 'n', '확인 필요', '단지를 고르면 같은 평형 시세로 확인해요.', base, [RT]);
    if (s.none || !(s.price > 0)) return it('kk', T, 'n', '확인 필요', '지금 매매 시세를 알 수 없어 계산하지 않았어요.', base, [RT]);
    if (!K || !KK) return it('kk', T, 'n', '확인 필요', '자료를 불러오지 못했어요.', base, [RT]);
    const e = KK.estimate({ kk: K, code: x.code, dep: num(x.dep), senior: num(x.senior), price: s.price });
    if (e.miss) return it('kk', T, 'n', '확인 필요', '이 지역은 과거 거래가 적어 계산하지 않았어요.', base, [RT]);
    const bt = K.bt || {}, y0 = bt.from ? String(bt.from).slice(0, 4) : '2019', y1 = bt.to ? String(bt.to).slice(0, 4) : '2022';
    const was = /[미이]만$|이상$/.test(e.sim.label) ? '이었던' : '였던';
    const simT = `${gu} 아파트에서 계약 때 보증금이 시세의 ${e.sim.label}${was} ${y0}~${y1}년 전세 계약 ${e.sim.n.toLocaleString()}건 중 ${e.sim.k.toLocaleString()}건`;
    const now = `지금 이 집 보증금은 매매 시세의 ${Math.round(e.ratio * 100)}%예요(${won(e.owe)} ÷ ${won(s.price)}).`;
    if (e.sim.n < 30) return it('kk', T, 'n', '비슷한 계약이 적어요', `비슷한 과거 계약이 ${e.sim.n.toLocaleString()}건뿐이라 판단하지 않았어요.`, base.concat([now]), [RT]);
    const share = e.sim.k / e.sim.n;
    if (!e.ref) {
      const lv = e.p >= 0.3 ? 'r' : e.p >= 0.1 ? 'y' : 'g';
      return it('kk', T, lv, KK.pText(e.p), `2년 뒤 집값이 보증금보다 낮아질 확률(과거 결과로 확인된 계산)이에요.`, base.concat([`이 확률 계산은 과거 실제 전세 계약과 맞춰 봐 기준을 통과했어요.`, `${simT}(${Math.round(share * 100)}%)이 2년 뒤 집값이 보증금보다 낮아졌어요.`, now]), [RT]);
    }
    const lv = share >= 0.3 ? 'r' : share >= 0.1 ? 'y' : 'g';
    return it('kk', T, lv, `${e.sim.n.toLocaleString()}건 중 ${e.sim.k.toLocaleString()}건`, `과거 비슷한 계약의 ${Math.round(share * 100)}%가 2년 뒤 집값이 보증금보다 낮아졌어요.`,
      base.concat([`확률 계산은 ${y0}~${y1}년 실제 전세 계약과 맞춰 보니 위험한 순서는 대체로 맞았지만 숫자가 시기마다 크게 빗나갔어요. 그래서 이 리포트는 확률 대신 실제로 있었던 횟수를 보여 드려요.`, `${simT}(${Math.round(share * 100)}%)이 2년 뒤 집값이 보증금보다 낮아졌어요.`, now]), [RT]);
  }

  /** ④ 최근 1년 흐름 — 아파트는 매매 시세, 그 밖은 전셋값 */
  function itemTrend(x) {
    const apt = x.kind === 'a', T = apt ? '최근 1년 집값 흐름' : '최근 1년 전셋값 흐름';
    const c = apt ? x.sale && x.sale.ch1 : x.rent && x.rent.ch1;
    const LINE = '판단 선: ±0.5% 안은 거의 같음(괜찮아요) · 5% 넘게 내리면 위험 · 그 사이로 내리면 주의(집예보 안내용 기준). 그 달까지 3개월 실거래 중간값끼리 비교해요.';
    const why0 = apt ? '집값이 내리는 중이면 같은 보증금이라도 전세가율이 올라가요.' : '전셋값이 내리는 중이면 만기 때 다음 세입자를 같은 보증금으로 구하기 어려워 돌려받기가 늦어질 수 있어요.';
    const pl = x.place || {};
    if (!c || c.pct == null) return it('trend', T, 'n', '확인 필요', apt ? (x.sale ? '1년 전과 비교할 매매 거래가 없어요.' : '단지를 고르면 1년 흐름을 보여 드려요.') : !(pl.name || pl.dong) ? '집을 고르면 1년 흐름을 보여 드려요.' : '1년 전과 비교할 전세 계약이 없어요.', [why0, LINE], [RT]);
    const p = c.pct, lv = p <= -0.05 ? 'r' : p < -0.005 ? 'y' : 'g';
    const v = Math.abs(p) < 0.005 ? '거의 같음' : p > 0 ? `+${(p * 100).toFixed(1)}% 올랐어요` : `−${(Math.abs(p) * 100).toFixed(1)}% 내렸어요`;
    return it('trend', T, lv, v, `${ym(c.fromAt)} → ${ym(c.toAt)} ${apt ? '매매' : '전세'} 실거래 중간값 비교`, [why0, LINE], [RT]);
  }

  /** ⑤ 같은 동 보증금 범위(빌라·오피스텔) · 단독·다가구는 동·면적대 중간값만 */
  function itemRange(x) {
    if (x.kind === 'a') return null;
    const T = '같은 동 보증금 범위';
    const g = x.range, dep = num(x.dep);
    const LINE = '판단 선: 내 보증금이 같은 동 최근 1년 순수 전세 계약의 75% 자리 이하면 괜찮아요 · 90% 자리 이하면 주의 · 그보다 높으면 위험(집예보 안내용 기준). 계약이 5건보다 적으면 범위를 보여 주지 않아요.';
    const why0 = '같은 동·비슷한 면적 집들보다 보증금이 유난히 높으면 시세보다 부풀린 계약일 수 있어요.';
    if (x.kind === 'd') {
      if (!g || !(g.med > 0)) return it('range', T, 'n', '확인 필요', '동을 고르면 같은 동 단독·다가구 전세 수준을 보여 드려요.', [why0], [RT]);
      return it('range', '같은 동 전세 수준', 'n', `중간값 ${won(g.med)}`, `${g.dong} ${g.band} 단독·다가구 전세 중간값(${ym(g.at)}, 그 달까지 3개월)이에요. 개별 계약이 없어 판단하지 않아요.`,
        [why0, '단독·다가구는 원자료에 건물 정보가 없어 같은 동·같은 계약면적대끼리 묶은 중간값만 있어요. 같은 묶음 안에서도 집마다 차이가 커서 판단에 쓰지 않아요.'], [RT]);
    }
    if (!g) return it('range', T, 'n', '확인 필요', '동과 면적대를 고르면 같은 동 보증금 범위를 보여 드려요.', [why0, LINE], [RT]);
    if (g.q1 == null) return it('range', T, 'n', '계약이 적어요', `${g.dong} ${g.band} 최근 1년 순수 전세 계약이 ${g.n}건뿐이라 범위를 보여 주지 않아요.`, [why0, LINE], [RT]);
    const lv = !(dep > 0) ? 'n' : dep <= g.q3 ? 'g' : dep <= g.p90 ? 'y' : 'r';
    const pos = !(dep > 0) ? '' : dep <= g.q1 ? ' · 내 보증금은 낮은 편' : dep <= g.q3 ? ' · 내 보증금은 가운데 범위' : dep <= g.p90 ? ' · 내 보증금은 높은 편' : ' · 내 보증금은 거의 가장 높은 편';
    return it('range', T, lv, `${won(g.q1)} ~ ${won(g.q3)}`, `${g.dong} ${g.band} ${ym(g.from)}~${ym(g.to)} 순수 전세 ${g.n.toLocaleString()}건 중 가운데 절반${pos}`,
      [why0, `가운데 절반 범위 ${won(g.q1)} ~ ${won(g.q3)}, 중간값 ${won(g.q2)}, 90% 자리 ${won(g.p90)}이에요(월세 계약은 빼요).`, LINE], [RT]);
  }

  /* ---------- 다음 할 일 ---------- */
  function todoOf(x) {
    const t = [
      { id: 'reg', t: '등기부등본 떼어 보기 — 계약 전·잔금 직전 두 번', s: '을구의 근저당(채권최고액)·압류·가압류, 갑구의 집주인 이름을 계약서와 맞춰 봐요.', href: 'https://www.iros.go.kr/', ext: 1, ln: '대법원 인터넷등기소' },
      { id: 'tax', t: '집주인 세금 체납 확인', s: '집주인 동의를 받아 국세·지방세 납세증명서를 확인해요(계약 뒤에는 세입자 혼자 열람 신청도 돼요).', href: 'https://www.hometax.go.kr/', ext: 1, ln: '홈택스', alt: { n: '위택스', u: 'https://www.wetax.go.kr/' } },
      { id: 'move', t: '잔금 날 전입신고 + 확정일자', s: '전입신고 다음 날 0시부터 대항력이 생겨요. 임대차 신고를 하면 확정일자가 함께 붙어요.', href: 'https://www.gov.kr/', ext: 1, ln: '정부24', alt: { n: '임대차 신고', u: 'https://rtms.molit.go.kr/' } },
      { id: 'hug', t: '전세보증금 반환보증 알아보기', s: '보증 기관이 대신 돌려주는 보증이에요. 가입 신청·위험 정보는 HUG 공식 앱·누리집에서 해요.', href: 'https://www.khug.or.kr/jeonse/index_jeonse.jsp', ext: 1, ln: 'HUG 안심전세포털', alt: { n: '안심전세 앱', u: 'https://apps.apple.com/kr/app/id1633013098' } }
    ];
    if (x.kind === 'd') t.splice(1, 0, { id: 'prior', t: '먼저 들어온 세입자 보증금 확인', s: '다가구는 한 건물에 세입자가 여럿이에요. 확정일자 부여 현황(집주인 동의)으로 나보다 앞선 보증금 합계를 봐요.', href: 'https://www.gov.kr/', ext: 1, ln: '정부24' });
    /* 사는 동안 등기 지키기 — 무료 안내 2개(인터넷등기소 변동 알림 신청법 · 알림이 오면 할 일)를 먼저, 유료 지킴이는 그다음(대표 지시 2026-11-27) */
    t.push({ id: 'regalert', t: '인터넷등기소 등기 변동 알림 무료 신청하기', s: '살고 있는 동안 집에 근저당·압류·집주인 변경이 생기면 문자로 알려 줘요. 신청 순서를 단계별로 정리했어요.', href: 'jeonse/guard/#free', ln: '신청 방법 보기' });
    t.push({ id: 'what', t: '알림이 오면 이렇게 하세요(무료)', s: '변동 종류별 위험 정도와 다음 할 일을 쉬운 말로 정리했어요.', href: 'jeonse/guard/what/', ln: '해석 보기' });
    t.push({ id: 'guard', t: '자동으로 지켜보기 — 내 전셋집 지킴이(유료)', s: '등기를 매일 확인하고, 변동이 생기면 카카오톡·메일 알림과 할 일 안내, 남은 기간 자동 다시 등록까지 해 드려요.', href: 'jeonse/guard/', ln: '지킴이 보기' });
    t.push({ id: 'ck', t: '계약 전 체크리스트 끝까지 보기', s: '집 찾기부터 입주까지 단계별로 정리했어요.', href: 'jeonse/checklist/' + (x.kind && x.kind !== 'a' ? '?k=' + x.kind : ''), ln: '체크리스트' });
    t.push({ id: 'alert', t: '만기 알림 켜기', s: '만기 6·4·2개월 전에 알려 드려요.', href: 'mine/calendar/#ta', ln: '만기 알림' });
    t.push({ id: 'switch', t: '같은 보증금으로 더 나은 집 찾아보기', s: '만기 때 옮길 곳을 미리 비교해요.', href: 'switch/rent/', ln: '이사 갈 집 구하기' });
    return t;
  }

  /* ---------- 한 장 리포트 ---------- */
  function build(x, E) {
    x = Object.assign({ place: {} }, x || {}); x.place = x.place || {};
    E = E || {};
    const items = [itemJr(x), E.H ? itemHug(x, E.H) : null, itemKk(x, E.KK), itemRange(x), itemTrend(x)].filter(Boolean);
    const by = l => items.filter(i => i.lv === l);
    const r = by('r'), y = by('y'), g = by('g');
    let lv, head, sub;
    if (!(num(x.dep) > 0)) { lv = 'n'; head = '보증금을 넣으면 위험 신호를 확인해 드려요'; sub = ''; }
    else if (r.length) { lv = 'r'; head = `위험 신호 ${r.length}개 — 계약 전에 꼭 다시 확인하세요`; sub = `${r.map(i => i.t.replace(/ \(.*\)$/, '')).join(' · ')}에서 위험 신호가 나왔어요`; }
    else if (y.length) { lv = 'y'; head = `주의 신호 ${y.length}개 — 조건을 한 번 더 살펴보세요`; sub = `${y.map(i => i.t.replace(/ \(.*\)$/, '')).join(' · ')}을 다시 확인해 보세요`; }
    else if (g.length) { lv = 'g'; head = '큰 위험 신호는 보이지 않아요'; sub = by('n').length ? `확인하지 못한 항목 ${by('n').length}개는 직접 확인해 주세요` : '그래도 등기부등본은 계약 전·잔금 직전에 꼭 다시 확인하세요'; }
    else { lv = 'n'; head = '자료가 부족해 판단하지 못했어요'; sub = '아래 항목과 다음 할 일을 직접 확인해 주세요'; }
    const at = (x.sale && x.sale.at) || (x.range && (x.range.to || x.range.at)) || '';
    const H = E.H;
    return {
      title: '전세 안전 점검', lv, head, sub,
      asof: [at ? `${ym(at)} 실거래 기준` : '', H ? `HUG 기준 ${H.SRC.checked} 확인` : ''].filter(Boolean).join(' · '),
      items, todo: todoOf(x),
      note: '공개 실거래와 HUG 공개 기준으로 계산한 정보예요. 특정 계약을 권하거나 말리지 않아요. 실제 보증 가입은 HUG 심사로 정해지고, 등기·세금 체납은 공식 사이트에서 직접 확인해 주세요. 넣은 금액은 이 기기 안에서만 계산하고 어디에도 보내지 않아요.'
    };
  }

  /* ---------- 길잡이 → 화면: 같은 입력 ---------- */
  /** 길잡이 답(a)과 단지 정보(facts) → 입력 x. 화면 inputs() 와 같은 규칙(tools/jsafe-test.js ④ 대조) */
  function fromGuide(a, E) {
    const kind = FROM_HT[a.htype] || 'v', d = a.danji || null, f = a.facts || null;
    const code = (d && d.code) || (a.region && a.region.code) || '';
    const gu = ((E && E.IX && E.IX.sgg && E.IX.sgg[code]) || {}).name || (a.region && a.region.name) || '';
    const x = { kind, code, metro: metroOf(code), dep: num(a.dep), senior: a.senior == null || a.senior === '' ? null : num(a.senior), pub: num(a.pub), kb: num(a.kb),
      sale: null, rent: null, range: null, kk: null, place: { gu, band: '', dong: '' } };
    if (kind === 'a') {
      x.kk = (E && E.kkData) || null;
      if (d && f) { x.sale = f.price > 0 ? { price: f.price, at: f.at, band: f.band, ch1: f.ch1 || null } : { none: true, band: f.band }; x.place.name = d.apt; x.place.dong = d.dong; x.place.band = f.band; }
    }
    return x;
  }
  /** 화면 주소(금액 없음) + 이 탭에 넘길 금액 */
  function sameOf(a, x) {
    const d = a.danji, q = ['k=' + x.kind];
    if (d && d.sd) q.push('sd=' + encodeURIComponent(d.sd)); else if (a.region && a.region.sd) q.push('sd=' + encodeURIComponent(a.region.sd));
    if (x.code) q.push('g=' + encodeURIComponent(x.code));
    if (x.kind === 'a' && d) { q.push('d=' + encodeURIComponent([d.code, d.dong, d.jibun || '', d.apt].join('|'))); if (x.place.band) q.push('b=' + encodeURIComponent(x.place.band)); }
    q.push('from=guide');
    return { t: '같은 조건으로 전세 안전 점검 보기', s: '신호등·다음 할 일 체크리스트까지 한 장으로 봐요', href: 'jeonse/safety/?' + q.join('&'), ss: [SS_KEY, hand({ dep: x.dep, sen: x.senior, pub: x.pub, kb: x.kb })] };
  }
  /** 이 탭(sessionStorage)에 30분만 남길 금액 묶음 */
  function hand(o, now) { return { at: now == null ? Date.now() : now, dep: num(o.dep), sen: o.sen == null ? null : num(o.sen), pub: num(o.pub), kb: num(o.kb) }; }
  function take(str, now) {
    let o; try { o = JSON.parse(str); } catch (e) { return null; }
    if (!o || typeof o !== 'object' || !(o.at > 0) || (now == null ? Date.now() : now) - o.at > SS_TTL) return null;
    return { dep: num(o.dep), sen: o.sen == null ? null : num(o.sen), pub: num(o.pub), kb: num(o.kb) };
  }

  const API = { LV, SS_KEY, FROM_HT, HT_OF, KIND_NM, won, ym, metroOf, pickBand, saleOf, bandsOf, dongRange, itemJr, itemHug, itemKk, itemTrend, itemRange, todoOf, build, fromGuide, sameOf, hand, take };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.JDJ_JSAFE = API;
})(typeof window !== 'undefined' ? window : this);
