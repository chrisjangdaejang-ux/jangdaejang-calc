/* 장대장 단지 추천 공통 로직 — 내 집 마련 리포트(buy/report)와 갈아타기(switch)가 함께 쓴다.
   조건 검색 엔진 search()는 내 집 마련 리포트와 길잡이(solve/ '현금 + 대출로 살 수 있는 서울 아파트')가 같이 써서, 같은 조건이면 두 화면의 단지·순서·숫자가 같다(tools/guide-same-test.js).
   자료: jangdaejang-data data/sNN.json 의 units
     u = [시군구코드, 동, 단지, 평형대, 전용㎡, 최근1년 거래수, 월별 평당가(만원) 36개, 월별 거래수 문자열, 지역 일자리, 미래가치 등 fx]
   규제지역·LTV: assets/loan-rules.js(공식 출처·적용일 포함) 한 곳에서 읽음 — 이 파일보다 먼저 불러와야 함
   ※ 점수 계산 세부 기준은 내부 기준이라 화면에 숫자로 보여 주지 않는다. */
(function (root) {
  'use strict';
  const PY = 3.3058;
  const RULES = root.JDJ_LOAN_RULES || (typeof require === 'function' ? require('./loan-rules.js') : null);
  const REG_GG = Object.keys(RULES.REGION.reg.v.gg);
  const isReg = c => RULES.regulated(c);
  const isCap = c => RULES.metro(c);
  const groupOf = c => RULES.groupOf(c);
  /* 주택담보대출 LTV: 보유 상황별 (loan-rules.js) */
  const LTV = {}; ['reg', 'capfree', 'local'].forEach(g => { LTV[g] = {}; ['none', 'first', 'one', 'multi'].forEach(o => { LTV[g][o] = RULES.ltvOf(g, o); }); });
  const r100 = m => Math.round(m / 100) * 100;
  function lastNZ(arr) { for (let i = arr.length - 1; i >= Math.max(0, arr.length - 3); i--) if (arr[i] > 0) return arr[i]; return 0; }
  function firstNZ(arr) { for (let i = 0; i < Math.min(arr.length, 3); i++) if (arr[i] > 0) return arr[i]; return 0; }
  function recentCnt(cnt) { let s = 0; for (const ch of String(cnt).slice(-3)) s += ch.charCodeAt(0) - 48; return s; }
  function change6(arr) { const n = arr.length, a = arr[n - 1] || arr[n - 2], b = arr[n - 7] || arr[n - 8]; return (a > 0 && b > 0) ? (a - b) / b : null; }
  /** 자료 기간(약 3년) 처음과 끝 평당가 변동률 — 과거 실거래 기록 */
  function change3y(arr) { const a = lastNZ(arr), b = firstNZ(arr); return (a > 0 && b > 0) ? (a - b) / b : null; }
  /** 단지·평형 추정 시세(만원): 최근 3개월 실거래 평당가 중간값(월별 값이 3개월 중간값) × 전용면적 */
  function unitPrice(u) { const p = lastNZ(u[6]); return p ? r100(p * u[4] / PY) : 0; }
  const MIN_FIT = 0.55;   // 매수 가능액 대비 너무 낮은 단지는 추천에서 뺀다
  /** '너무 싼 단지' 제외를 지역 시세 기준으로 완화: 예산 대비 낮아도 그 시·군·구 같은 면적 시세(구 평당가 × 전용) 이상이면 남긴다.
      예산이 큰 사람이 시세가 낮은 지방을 고르면 결과가 0곳이 되던 문제(갈아타기) 해결용. refP 없으면 기존 기준 그대로 */
  function tooCheap(fit, P, refP) { return fit < MIN_FIT && !(refP > 0 && P >= refP); }

  /** 내부 정렬용 보조 점수(화면에 표시하지 않음) p: { fit, n, ch, rel, note(bool), fv(null|0~100) } */
  function scoreOf(p) {
    const sBudget = Math.max(0, 1 - Math.abs(0.93 - p.fit) * 2.2);
    const sLiq = Math.min(1, Math.log(p.n) / Math.log(160));
    // 완만한 상승이 가장 좋고, 급등은 추격 위험으로 감점, 하락은 중립 이하
    let sMom = 0.5;
    if (p.ch !== null && p.ch !== undefined) {
      if (p.ch < 0) sMom = Math.max(0.2, 0.55 + p.ch * 2);
      else if (p.ch <= 0.06) sMom = 0.7 + p.ch * 5;
      else sMom = Math.max(0.2, 1 - (p.ch - 0.06) * 5);
    }
    const sVal = Math.max(0, Math.min(1, 0.5 + (p.rel || 0)));
    const sNote = p.note ? 1 : 0.4;
    const fvS = (p.fv !== null && p.fv !== undefined) ? p.fv / 100 : null;
    // 미래가치 점수(표본 외 검증)가 있으면 그게 중심, 없으면 기존 기준
    return fvS !== null ? 0.42 * fvS + 0.25 * sBudget + 0.20 * sLiq + 0.13 * sNote
      : 0.28 * sBudget + 0.30 * sLiq + 0.16 * sMom + 0.14 * sVal + 0.12 * sNote;
  }
  /* 순위: 미래가치 점수가 있는 단지 먼저 점수 높은 순 → 같은 점수면 추천 점수 순 → 미래가치 점수가 없는 단지는 그 뒤 */
  const rankCmp = (a, b) => (b.hasFv - a.hasFv) || ((b.sortv != null ? b.sortv : b.disp) - (a.sortv != null ? a.sortv : a.disp)) || (b.score - a.score);
  /** 한 단지·한 구·한 시·도에 몰리지 않게 고른다. opt: { max, perSgg, perSido(지역 상관없음일 때), sidoOf(code) } */
  function diversify(sorted, opt) {
    const max = opt.max || 10, perSgg = opt.perSgg || 3, perSido = opt.perSido || 0;
    const picked = [], bySgg = {}, bySd = {}, seen = new Set();
    for (const x of sorted) {
      const key = x.code + '|' + x.apt; if (seen.has(key)) continue;
      if ((bySgg[x.code] || 0) >= perSgg) continue;
      const sd = perSido && opt.sidoOf ? opt.sidoOf(x.code) : '';
      if (sd && (bySd[sd] || 0) >= perSido) continue;
      picked.push(x); seen.add(key); bySgg[x.code] = (bySgg[x.code] || 0) + 1; if (sd) bySd[sd] = (bySd[sd] || 0) + 1;
      if (picked.length >= max) break;
    }
    return picked;
  }
  /** 점수 계산에 쓰는 한 단지 값 묶음 (P: 시세, M: 그 지역 매수 가능 상한, sggPpy: 구 평균 평당가) */
  function scoreUnit(u, P, M, sggPpy, note) {
    const fit = P / M, ch = change6(u[6]), ppy = lastNZ(u[6]);
    const rel = sggPpy ? (sggPpy - ppy) / sggPpy : 0;
    const fx = u[9] || null, hasFv = !!(fx && fx.fv != null);
    const score = scoreOf({ fit, n: u[5], ch, rel, note, fv: hasFv ? fx.fv : null });
    const disp = hasFv ? fx.fv : Math.min(99, Math.round(score * 100));
    return { fit, ch, rel, fx, hasFv, score, disp, sortv: hasFv && fx.fvSort != null ? fx.fvSort : disp };
  }

  /* ---------- 보유 기간별 미래가치 점수(내 집 마련 리포트의 '예상 보유 기간' 막대) ----------
     2년은 기본 모델(model.json 이 있으면 늘 사용), 1·3·5·7년은 표본 외 검증을 2번 이상 했고 평균이 플러스이며 절반 이상 맞은 기간만 */
  /* 엔진 판정(status: 누수 없는 재구축 2026-11-27 — 두 격자·블록 부트스트랩 구간·기준선·장세)이 있으면 그것만 따름(숫자로 다시 판정하지 않음) */
  const VOK = m => !!(m && (m.status || (m.robust && m.robust.status)) ? (m.status || m.robust.status) === 'pass' : !!(m && (m.oos_all || []).length >= 2 && m.oos_avg > 0 && 2 * (m.oos_hit != null ? m.oos_hit : (m.oos_all || []).filter(o => (o.top20 || 0) > 0).length) >= (m.oos_all || []).length));
  function hzList(MODEL, MH) { return [1, 2, 3, 5, 7].filter(h => h === 2 ? !!MODEL : VOK(MH && MH[h])); }
  /** 고른 연수 → [[모델 연수, 비율], …] 사이 기간은 양옆 검증 모델을 거리 비율로 섞고, 범위 밖은 가장 가까운 모델 */
  function hzMix(y, MODEL, MH) {
    const L = hzList(MODEL, MH); if (!L.length) return [[2, 1]]; const yy = Math.min(y, 9);
    const lo = L.filter(h => h <= yy).pop(), hi = L.find(h => h >= yy);
    if (lo == null) return [[hi, 1]]; if (hi == null || hi === lo) return [[lo, 1]];
    const w = (yy - lo) / (hi - lo); return [[lo, 1 - w], [hi, w]].filter(x => x[1] > 0);
  }
  /** units 의 점수 칸(fx)에 보유 기간 점수를 넣음(fv = 화면 점수, fvSort = 정렬값). cleanFx: mine-core cleanFx(있으면) */
  function applyHz(units, mix, cleanFx) {
    for (const u of units || []) {
      const f = u[9]; if (!f) continue; if (cleanFx) cleanFx(f);
      if (f.fv2 === undefined) f.fv2 = (f.fv0 != null ? f.fv0 : f.fv); if (f.fv2 == null) { f.fv = null; continue; }
      let s = 0; for (const [h, w] of mix) { const v = h === 2 ? f.fv2 : (f.fh && f.fh[h] != null ? f.fh[h] : f.fv2); s += w * v; }
      f.fvSort = s; f.fv = Math.min(99, Math.round(s));
    }
    return units;
  }
  /** 지역 메모(assets/region-notes.js) 키 — 행정구역 개편으로 코드가 바뀐 곳(예: 전남광주통합특별시 12xxx)은 '시도|시군구 이름'으로 기존 메모를 찾음 */
  function noteKey(NOTES, IX, code) {
    if (!NOTES || !NOTES.notes) return code;
    if (NOTES.notes[code]) return code;
    const s = IX && IX.sgg ? IX.sgg[code] : null;
    return (s && NOTES.byName && NOTES.byName[s.sido + '|' + s.name]) || code;
  }

  /* ---------- 재건축 단지(몸테크) 판정 — 맞춤 단지 '재건축 단지만 보기'와 길잡이 재건축 몸테크(rebuild_live)가 같은 함수를 써요 ----------
     기준(기존 화면 기준 그대로): 서울시 정비사업 추진현황에 재건축 구역으로 이름이 연결된 단지(자료 fx.rz · 길잡이는 구역 자료 z를 먼저)는 착공 전(10단계 중 8단계까지)만,
     연결된 구역이 없으면 준공 30년 이상(재건축 연한). z: 길잡이가 구역 자료(zones.json)에서 이름으로 찾은 구역 {st} — 없으면 자료의 fx.rz */
  const REBUILD_AGE = 30, REBUILD_GONE = 9;
  function rebuildOf(u, year, z) {
    const f = u && u[9] && typeof u[9] === 'object' ? u[9] : {};
    const zone = z || (f.rz && f.rz.lv != null ? { st: f.rz.lv } : null);
    const age = f.by ? (year || 0) - f.by : null;
    if (zone) return { ok: (+zone.st || 0) < REBUILD_GONE, zone: true, lv: +zone.st || 0, age, gone: (+zone.st || 0) >= REBUILD_GONE };
    return { ok: age != null && age >= REBUILD_AGE, zone: false, lv: 0, age, gone: false };
  }

  /* ---------- 맞춤 단지 순서(정렬 단추 4가지 + 재건축 단지만 볼 때 '재건축 단계 순') — 내 집 마련 맞춤 단지와 길잡이가 같은 함수 ----------
     rec(추천 순, 기본): ① 예산에 맞는 단지(최대 매수 가능액의 85~100%) ② 예산보다 싼 단지(85% 미만) 두 묶음, 묶음 안은 점수 순 · 한 구 3곳(쪽마다)
     stn(역 가까운 순: 역까지 걸어서 분 fx.sub) · new(신축 순: 준공 연도 fx.by) · deal(거래 많은 순: 최근 12개월 실거래 수) — 값이 없는 단지는 맨 뒤
     stage(재건축 단계 순 — '재건축 단지만 보기'를 켰을 때만): 정비사업 단계(rebuildOf lv, 10단계 중) 높은 순 · 구역 연결이 없는(준공 30년 이상만) 단지는 맨 뒤
       길잡이 '재건축 몸테크'(guide-redev rebuildRows)는 이 정렬 그대로 같은 목록을 써요
     같은 값이면: 점수 높은 순 → 집값 높은 순(예산에 더 가까운 쪽) → 단지 이름 가나다순 → 동·평형·구 코드 — 자료 파일 순서와 상관없이 늘 같은 순서 */
  const FIT_A = 0.85, PAGE = 10;
  const SORTS = [['rec', '추천 순'], ['stn', '역 가까운 순'], ['new', '신축 순'], ['deal', '거래 많은 순']];
  const RB_SORT = ['stage', '재건축 단계 순'];
  /** 화면에 보일 정렬 단추: 재건축 단지만 볼 때는 '재건축 단계 순'을 덧붙여요 */
  const sortsFor = rb => rb ? SORTS.concat([RB_SORT]) : SORTS;
  const sortId = v => SORTS.some(s => s[0] === v) || v === RB_SORT[0] ? v : 'rec';
  /** 실제로 쓰는 정렬: '재건축 단계 순'은 재건축 단지만 볼 때만, 아니면 추천 순 */
  const sortEff = (v, rb) => { const id = sortId(v); return id === RB_SORT[0] && !rb ? 'rec' : id; };
  function cnt12(u) { let s = 0; for (const ch of String((u && u[7]) || '').slice(-12)) s += ch.charCodeAt(0) - 48; return s; }
  const fxOf = x => (x.fx && typeof x.fx === 'object') ? x.fx : {};
  const ko = (a, b) => String(a || '').localeCompare(String(b || ''), 'ko');
  /** 점수 → 집값 → 이름 → 동·평형·구 코드 */
  const tieCmp = (a, b) => rankCmp(a, b) || (b.P - a.P) || ko(a.apt, b.apt) || ko(a.dong, b.dong) || ko(a.band, b.band) || ko(a.code, b.code);
  /** 값이 없는(null) 단지는 뒤로: dir 1 = 작은 값 먼저, −1 = 큰 값 먼저 */
  const keyCmp = (va, vb, dir) => (va == null) - (vb == null) || (va == null ? 0 : dir * (va - vb));
  const SORT_KEY = {
    stn: x => { const v = fxOf(x).sub; return v != null && isFinite(v) ? +v : null; },
    new: x => { const v = fxOf(x).by; return v > 0 ? +v : null; },
    deal: x => cnt12(x.u),
    stage: x => x.rbl != null ? x.rbl : null
  };
  function sortCmp(id) {
    if (id === 'stn') return (a, b) => keyCmp(SORT_KEY.stn(a), SORT_KEY.stn(b), 1) || tieCmp(a, b);
    if (id === 'new') return (a, b) => keyCmp(SORT_KEY.new(a), SORT_KEY.new(b), -1) || tieCmp(a, b);
    if (id === 'stage') return (a, b) => keyCmp(SORT_KEY.stage(a), SORT_KEY.stage(b), -1) || tieCmp(a, b);
    if (id === 'deal') return (a, b) => keyCmp(SORT_KEY.deal(a), SORT_KEY.deal(b), -1) || tieCmp(a, b);
    return (a, b) => (a.grp === 'b') - (b.grp === 'b') || tieCmp(a, b);
  }
  /** 한 단지는 한 번만(같은 정렬에서 가장 앞선 평형) */
  function uniq(sorted) { const seen = new Set(), out = []; for (const x of sorted) { const k = x.code + '|' + x.apt; if (seen.has(k)) continue; seen.add(k); out.push(x); } return out; }
  /** 쪽(10곳)마다 한 구 3곳·시·도 3곳까지 — 칸이 남으면(고른 구가 적을 때) 다음 순서 단지로 채워요 */
  function pageDiversify(list, opt) {
    const size = opt.page || PAGE, perSgg = opt.perSgg || 3, perSido = opt.perSido || 0, rest = list.slice(), out = [];
    while (rest.length) {
      const page = [], bySgg = {}, bySd = {}, used = new Set();
      for (let i = 0; i < rest.length && page.length < size; i++) {
        const x = rest[i], sd = perSido && opt.sidoOf ? opt.sidoOf(x.code) : '';
        if ((bySgg[x.code] || 0) >= perSgg || (sd && (bySd[sd] || 0) >= perSido)) continue;
        page.push(x); used.add(i); bySgg[x.code] = (bySgg[x.code] || 0) + 1; if (sd) bySd[sd] = (bySd[sd] || 0) + 1;
      }
      for (let i = 0; i < rest.length && page.length < size; i++) if (!used.has(i)) { page.push(rest[i]); used.add(i); }
      out.push(...page);
      for (let i = rest.length - 1; i >= 0; i--) if (used.has(i)) rest.splice(i, 1);
    }
    return out;
  }
  /** 조건에 맞는 평형들(out) → 화면 순서 목록 */
  function arrange(out, q) {
    const id = sortEff(q.sort, q.rebuild), sorted = out.slice().sort(sortCmp(id)), list = uniq(sorted);
    if (id !== 'rec') return list;
    const dv = { page: PAGE, perSgg: 3, perSido: q.any ? 3 : 0, sidoOf: q.sidoOf };
    return pageDiversify(list.filter(x => x.grp === 'a'), dv).concat(pageDiversify(list.filter(x => x.grp === 'b'), dv));
  }

  /* ---------- 조건 검색(맞춤 단지) — 내 집 마련 리포트(buy/report)와 길잡이(solve/ budget_apts)가 같은 함수를 써요 ----------
     q = { units, sggs:Set|배열(구 코드), areas:Set|배열(평형대 — 비면 전체), cash(만원), ctxBy·dsrBy·maxBy:{reg,capfree,local}(loan-core ctx·dsrMax·maxPrice),
           need(P, c, dsr, large)(loan-core need), groupOf(code), noteOf(code)→참/거짓, sggPpy:{코드: 구 평당가},
           newb(준공 N년 이내 — 0·없음 = 상관없음), pmax(집값 상한 만원 — 0·없음 = 상관없음), year(준공 연수 기준 해 = 자료 갱신 해), any(지역 상관없음), sidoOf(code), max(첫 쪽 곳 수, 기본 10),
           sort(rec·stn·new·deal·stage(재건축 단지만일 때) — 기본 rec), rebuild(참 = 재건축 단지만, rebuildOf) }
     조건: 고른 구 → 고른 평형 → 최근 시세 있음 → 최근 3개월 거래 1건 이상 → 신축 → 집값 상한 → 재건축 단지만 → 내 돈으로 살 수 있음(need ≤ cash) → 최대 매수 가능액의 55% 미만 제외(MIN_FIT)
       단, 재건축 단지만 볼 때는 55% 아래도 빼지 않아요(몸테크는 일부러 싼 오래된 단지를 사는 경우가 많아서 — 2026-11-26, 길잡이 재건축 몸테크와 같은 기준)
     순서: arrange(정렬 단추 — 위 설명) · 돌려주는 값: list(전체 순서, '더 보기'로 10곳씩), picked(첫 쪽), total(조건 충족 평형 수), nA·nB(예산에 맞는·예산보다 싼 단지 수), sort */
  const asSet = v => v instanceof Set ? v : new Set(v || []);
  function passBase(u, q, sggs, areas) {
    const f = u[9] && typeof u[9] === 'object' ? u[9] : {};
    if (!sggs.has(u[0])) return false;
    if (areas.size && !areas.has(u[3])) return false;
    if (!lastNZ(u[6] || [])) return false;
    if (recentCnt(u[7] || '') < 1) return false;
    if (q.newb > 0 && !(f.by && (q.year || 0) - f.by <= q.newb)) return false;
    if (q.pmax > 0 && unitPrice(u) > q.pmax) return false;
    if (q.rebuild && !rebuildOf(u, q.year || 0).ok) return false;
    return true;
  }
  function search(q) {
    const sggs = asSet(q.sggs), areas = asSet(q.areas), gOf = q.groupOf || groupOf, out = [];
    for (const u of q.units || []) {
      if (!passBase(u, q, sggs, areas)) continue;
      const [code, dong, apt, band, area, n, series] = u;
      const g = gOf(code), c = q.ctxBy[g], M = q.maxBy[g]; if (!M) continue;
      const P = unitPrice(u), large = area > 85;
      const nd = q.need(P, c, q.dsrBy[g], large);
      if (nd.need > q.cash) continue;
      const sc = scoreUnit(u, P, M, (q.sggPpy || {})[code], q.noteOf ? !!q.noteOf(code) : false);
      if (!q.rebuild && sc.fit < MIN_FIT) continue;
      const rb = q.rebuild ? rebuildOf(u, q.year || 0) : null;
      out.push(Object.assign({ code, dong, apt, band, area, n, series, P, g, c, nd, large, jb: u[8], u, grp: sc.fit >= FIT_A ? 'a' : 'b', rbl: rb && rb.zone ? rb.lv : null }, sc));
    }
    const list = arrange(out, q);
    return { list, picked: list.slice(0, q.max || PAGE), total: out.length, nA: list.filter(x => x.grp === 'a').length, nB: list.filter(x => x.grp === 'b').length, sort: sortEff(q.sort, q.rebuild) };
  }
  /** 조금만 더 준비하면 살 수 있는 단지(맞는 단지가 없을 때) — 같은 조건에서 부족한 돈이 적은 순 10곳(최근 1년 거래 20건 이상) */
  function nearMiss(q) {
    const sggs = asSet(q.sggs), areas = asSet(q.areas), gOf = q.groupOf || groupOf, out = [], seen = new Set(), res = [];
    for (const u of q.units || []) {
      if (!passBase(u, q, sggs, areas) || u[5] < 20) continue;
      const g = gOf(u[0]), P = unitPrice(u), nd = q.need(P, q.ctxBy[g], q.dsrBy[g], u[4] > 85);
      if (nd.need <= q.cash) continue;
      out.push({ code: u[0], dong: u[1], apt: u[2], band: u[3], P, nd, jb: u[8] });
    }
    out.sort((a, b) => a.nd.need - b.nd.need || (b.P - a.P) || ko(a.apt, b.apt) || ko(a.dong, b.dong) || ko(a.band, b.band) || ko(a.code, b.code));
    for (const x of out) { const k = x.code + x.apt; if (seen.has(k)) continue; seen.add(k); res.push(x); if (res.length >= 10) break; }
    return res;
  }

  const API = { PY, REG_GG, isReg, isCap, groupOf, LTV, r100, lastNZ, firstNZ, recentCnt, change6, change3y, unitPrice, MIN_FIT, tooCheap, scoreOf, scoreUnit, rankCmp, diversify,
    VOK, hzList, hzMix, applyHz, noteKey, search, nearMiss, REBUILD_AGE, rebuildOf, FIT_A, PAGE, SORTS, RB_SORT, sortsFor, sortId, sortEff, sortCmp, tieCmp, cnt12, arrange, pageDiversify };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.JDJ_REC = API;
})(typeof self !== 'undefined' ? self : this);
