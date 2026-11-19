/* 장대장 리포트 '쉬운 말' 문구 도우미 (무료 리포트 buy/report/ · 프리미엄 리포트 premium/view/ 공용)
   - 공개 자료 파일에 이미 들어 있는 값만 사람 말로 바꿉니다(점수 계산식·가중치·임계값은 이 파일에 없습니다).
   - 용어 풀이는 리포트 한 장마다 처음 나올 때만 괄호로 붙입니다(gloss()로 새 장을 시작). */
(function (root) {
  const STAGE = { 1: '신속통합기획 대상지 선정', 2: '신속통합기획 완료', 3: '정비구역 지정', 4: '추진위원회 승인', 5: '조합설립인가', 6: '건축심의', 7: '사업시행인가', 8: '관리처분인가', 9: '이주', 10: '착공' };
  const STAGE_DESC = { 1: '서울시가 계획 수립을 빠르게 도와줄 대상으로 고름', 2: '서울시 도움으로 재건축 계획안을 마련함', 3: '재건축할 구역으로 공식 지정됨',
    4: '주민 대표 모임(추진위원회)을 구청이 인정함', 5: '재건축 조합이 공식 출범함', 6: '건물 설계를 시·구가 심사함', 7: '사업 계획을 구청이 최종 승인함',
    8: '누가 어떤 집을 받고 얼마를 낼지 확정함', 9: '주민들이 이사 나감', 10: '공사를 시작함' };
  const GL = {
    '전세가율': '집값 대비 전셋값 비율',
    '%p': '퍼센트포인트: 두 비율의 차이',
    '표본 외 검증': '과거 자료만으로 점수를 매기고, 그 뒤 실제로 맞았는지 확인하는 시험',
    '순전입률': '전학 온 학생 수에서 떠난 학생 수를 뺀 값을 재학생 수로 나눈 것',
    '중앙값': '여러 값을 크기순으로 줄 세웠을 때 가운데 값'
  };
  for (const k in STAGE) GL[STAGE[k]] = `재건축·재개발 10단계 중 ${k}번째: ${STAGE_DESC[k]}`;
  const FIRST = { '평당': '평당(전용 3.3㎡당)' };

  /* 용어 풀이: 같은 장에서 처음 나올 때만 괄호 풀이 */
  function gloss() {
    const used = new Set();
    return t => { if (used.has(t) || !(t in GL || t in FIRST)) return t; used.add(t); return FIRST[t] || `${t}(${GL[t]})`; };
  }

  /* 받침에 따라 조사 고르기 */
  function J(w, a, b) {
    const c = String(w).trim().slice(-1).charCodeAt(0);
    if (c >= 0xAC00 && c <= 0xD7A3) return w + ((c - 0xAC00) % 28 ? a : b);
    const d = String(w).trim().slice(-1);
    if (/[0-9]/.test(d)) return w + ('013678'.includes(d) ? a : b);   // 영·일·삼·육·칠·팔은 받침 있음
    return w + a;
  }

  /* 금액(만원) → 한국식: 39억 2,705만원 */
  function won(man) {
    man = Math.round(man); if (man <= 0) return '0원';
    const e = Math.floor(man / 10000), r = man % 10000;
    return !e ? r.toLocaleString() + '만원' : e + '억' + (r ? ' ' + r.toLocaleString() + '만원' : '원');
  }
  /* '○억 중 약 ○억'용 대략 금액: 10억 이상은 억 단위, 그 밖은 1,000만원 단위 */
  function eokR(man) {
    if (man >= 100000) return Math.round(man / 10000) + '억';
    const s = won(Math.round(man / 1000) * 1000);
    return s.endsWith('억원') ? s.slice(0, -1) : s;
  }

  /* 점수(0~100 백분위, 높을수록 상위) → '상위 5%' / '하위 30%' */
  const topPct = v => (v = Math.round(v), v >= 50 ? `상위 ${Math.max(1, 100 - v)}%` : `하위 ${Math.max(1, v)}%`);
  /* 비교 대상을 붙인 순위: rank(95, {name:'서울 아파트', n:4094}) → '서울 아파트 4,094곳 중 상위 5%'
     - n(곳 수)이 없으면 '서울 아파트 중 상위 5%', base 가 없으면 '상위 5%'
     - base 는 rankBase(IX, 구코드, 종류)로 만든다(곳 수는 index.json 에 엔진이 함께 내보낸 값만 씀) */
  function rank(v, base) {
    if (v == null || isNaN(v)) return '';
    const p = topPct(+v);
    if (!base) return p;
    if (typeof base === 'string') base = { name: base };
    const n = base.n > 0 ? `${Number(base.n).toLocaleString()}곳` : '';
    const head = [base.name, n].filter(Boolean).join(' ');
    return head ? `${head} 중 ${p}` : p;
  }

  /* %p 차이 → '1.6%p 더' / '0.5%p 덜' */
  function more(ex, G, d) {
    if (Math.abs(ex) < 0.05) return '거의 같게';
    return `${Math.abs(ex).toFixed(d == null ? 1 : d)}${G ? G('%p') : '%p'} ${ex > 0 ? '더' : '덜'}`;
  }

  /* 시·도 안 지역 단위 개수와 이름. 개수는 엔진이 내보낸 '지역 점수를 매긴 시군구 수'(sido.ngs)가 있으면 그것(exact=true),
     없으면 index.json 의 구·시 목록에서 센다 */
  function regionInfo(IX, code) {
    const g = (IX && IX.sgg && IX.sgg[code]) || {}, sido = g.sido || '';
    const list = Object.values((IX && IX.sgg) || {}).filter(v => v.sido === sido);
    const sd = ((IX && IX.sido) || []).find(s => s.name === sido);
    const unit = list.length && list.every(v => /구$/.test(v.name)) ? '구' : '시·군·구';
    const exact = !!(sd && sd.ngs > 0);
    return { n: exact ? sd.ngs : list.length, exact, unit, sido, short: (sd && sd.short) || sido, name: g.name || '' };
  }
  /* 순위 비교 기준: kind = fv(같은 시·도 아파트) · fvg(같은 구 아파트) · lrk(같은 구 재건축 단지) · rbp(전국 재건축 단지) */
  function rankBase(IX, code, kind) {
    const ri = regionInfo(IX, code), g = (IX && IX.sgg && IX.sgg[code]) || {};
    const sd = ((IX && IX.sido) || []).find(s => s.name === ri.sido) || {};
    if (kind === 'fvg') return { name: `${ri.name} 아파트`, n: g.nfvg };
    if (kind === 'lrk') return { name: `${ri.name} 재건축 단지`, n: g.nlrk };
    if (kind === 'rbp') return { name: '전국 재건축 단지', n: IX && IX.stats && IX.stats.nrbp };
    return { name: `${ri.short} 아파트`, n: sd.nfv };
  }
  /* 지역 흐름 점수(gs, 높을수록 상위) → N위, 상위권/중위권/하위권 */
  function regionRank(gs, n) {
    const r = Math.min(n, Math.max(1, Math.floor((100 - gs) / 100 * n + 0.5)));
    return { r, pos: r <= n / 3 ? '상위권' : (r > n * 2 / 3 ? '하위권' : '중위권') };
  }
  /* 지역 실제 등수 문구: '서울 25개 구 중 4위' (곳 수를 목록에서 센 경우 '약 4위') */
  function regionPlace(IX, code, gs) {
    const ri = regionInfo(IX, code);
    if (gs == null || ri.n < 3) return null;
    const rr = regionRank(gs, ri.n);
    return { r: rr.r, n: ri.n, pos: rr.pos, text: `${ri.short} ${ri.n}개 ${ri.unit} 중 ${ri.exact ? '' : '약 '}${rr.r}위` };
  }
  /* 지역 흐름 문장: {fact 사실, why 이유들, mean 해석, ref 참고 지표, real 실제 이유 여부}
     - index.json sgg[구].r(up/down: 지역 점수를 가장 많이 올린·내린 항목 이름)이 있으면 그 항목을 실제 이유로 쓰고,
       입주 물량·인구·미분양·일자리 중 up/down 에 없는 것은 '참고 지표'로 뒤에 둔다.
     - r 이 없으면(배포 전 자료) 예전처럼 why = 참고 지표 문장들, real = false */
  const pct1 = v => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(Math.round(v * 10) / 10).toFixed(1) + '%';
  function regionText(f, IX, code, G) {
    const ri = regionInfo(IX, code), out = { fact: '', why: [], mean: '', ref: [], real: false };
    let pos = '';
    const NM = ri.name || '이 지역';
    if (f.gs != null && ri.n >= 3) {
      const rp = regionPlace(IX, code, f.gs); pos = rp.pos;
      out.fact = `${J(NM, '은', '는')} 앞으로 2년 지역 흐름 점수가 ${rp.text}예요(${pos}).`;
      out.mean = pos === '하위권' ? `${J(NM, '이', '가')} 나쁜 동네라는 뜻이 아니라, ${NM} 앞으로 2년 오름폭이 ${ri.short} 다른 ${ri.unit}보다 작을 수 있다는 뜻이에요.`
        : pos === '상위권' ? `${NM} 전체 흐름이 이 단지 가격을 받쳐 줄 수 있다는 뜻이에요.` : '';
      out.pos = pos;
    }
    const p1 = v => Math.round(Math.abs(v) * 1000) / 10;
    const T = {
      sup: () => f.sup == null ? '' : f.sup < 0.0005 ? `${NM} 새 아파트 입주 물량은 앞으로 2년 거의 없어요.` : `${NM} 새 아파트 입주 물량은 앞으로 2년 기존 아파트의 ${Math.round(f.sup * 1000) / 10}%예요` + (f.sup >= 0.08 ? '(많은 편).' : f.sup <= 0.03 ? '(적은 편).' : '.'),
      pg: () => f.pg == null ? '' : Math.abs(f.pg) < 0.0005 ? `${NM} 인구는 최근 1년 거의 그대로예요.` : `${NM} 인구가 최근 1년 ${p1(f.pg)}% ${f.pg > 0 ? '늘었어요' : '줄었어요'}.`,
      un: () => f.un == null ? '' : `${NM} 미분양 아파트는 ${f.un >= 0.01 ? '많은 편이에요' : f.un <= 0.002 ? '거의 없어요' : '보통이에요'}` + (f.unc > 0.001 ? '(1년 새 늘었어요).' : f.unc < -0.001 ? '(1년 새 줄었어요).' : '.'),
      jb: () => f.jb == null ? '' : Math.abs(f.jb) < 0.0005 ? `${NM} 일자리는 1년 새 거의 그대로예요.` : `${NM} 일자리가 1년 새 ${p1(f.jb)}% ${f.jb > 0 ? '늘었어요' : '줄었어요'}.`
    };
    const g = (IX && IX.sgg && IX.sgg[code]) || {}, R = g.r, sd = ((IX && IX.sido) || []).find(s => s.name === ri.sido), SR = (sd && sd.r) || {};
    const up = (R && R.up) || [], dn = (R && R.down) || [];
    if (!R || (!up.length && !dn.length)) {
      for (const k of ['sup', 'pg', 'un', 'jb']) { const t = T[k](); if (t) out.why.push(t); }
      return out;
    }
    out.real = true;
    /* 하위권은 내린 항목, 상위권은 올린 항목이 주된 이유. 중위권은 둘 다 */
    const main = pos === '하위권' ? dn.concat(up) : pos === '상위권' ? up.concat(dn) : up.concat(dn);
    const isDn = nm => dn.includes(nm) && !(pos !== '하위권' && up.includes(nm));
    const used = new Set(), unit = ri.unit === '구' ? '구' : '시·군·구';
    let momHigh = false, lowJr = false;
    const line = nm => {
      const d = isDn(nm);
      switch (nm) {
        case '구 시세 최근 1년 흐름': {
          if (R.mom == null) return '';
          const m = SR.mom, cmp = m != null ? `(${ri.short} ${unit} 중앙값 ${pct1(m)})` : '';
          if (m != null && R.mom > m) { momHigh = d; return `${NM} 전체 시세가 최근 1년 ${pct1(R.mom)}로 ${d ? '이미 많이 올랐어요' : '많이 올랐어요'}${cmp}.`; }
          if (R.mom < 0) return `${NM} 전체 시세가 최근 1년 ${pct1(R.mom)}로 내렸어요${cmp}.`;
          return `${NM} 전체 시세가 최근 1년 ${pct1(R.mom)}로 ${m != null && R.mom < m ? '덜 올랐어요' : '올랐어요'}${cmp}.`;
        }
        case '구 전세가율': {
          if (R.jr == null) return '';
          const m = SR.jr, lv = m == null ? '' : Math.abs(R.jr - m) < 2 ? '보통이에요' : R.jr < m ? '낮아요' : '높아요';
          let t = `${NM} 전체 ${G ? G('전세가율') : '전세가율'}이 ${Math.round(R.jr * 10) / 10}%${lv ? '로 ' + lv : '예요'}${m != null ? `(${ri.short} 중앙값 ${Math.round(m * 10) / 10}%)` : ''}.`;
          if (m != null && R.jr < m) lowJr = true;
          if (lowJr && R.rz != null && SR.rz != null && R.rz > SR.rz * 1.5 && R.rz >= 5)
            t += ` 다만 ${NM}처럼 재건축 단지가 많은 ${unit}(재건축 단계 단지 ${Math.round(R.rz * 10) / 10}%, ${ri.short} 중앙값 ${Math.round(SR.rz * 10) / 10}%)는 전세가율이 낮게 나오기 쉬워요.`;
          return t;
        }
        case '향후 2년 입주 물량': used.add('sup'); return T.sup();
        case '인구 증가': used.add('pg'); return T.pg();
        case '세대수 증가': return `${NM} 세대수의 최근 1년 변화가 ${ri.short} 다른 ${unit}와 비교해 ${d ? '점수를 낮췄어요' : '점수를 높였어요'}.`;
        case '미분양 물량(재고 대비)': case '미분양 증감(1년)': if (used.has('un')) return ''; used.add('un'); return T.un();
        case '일자리 증가(1년)': used.add('jb'); return T.jb();
        case '일자리 밀집도(인구 대비)': return `${NM} 인구 대비 일자리 수가 ${ri.short} 다른 ${unit}와 비교해 ${d ? '점수를 낮췄어요' : '점수를 높였어요'}.`;
        case '구 하락기 방어력': return `${NM} 전체가 최근 하락기에 버틴 정도가 ${ri.short} 다른 ${unit}와 비교해 ${d ? '점수를 낮췄어요' : '점수를 높였어요'}.`;
        case '구 고점 회복률': return `${NM} 전체가 예전 최고가를 회복한 정도가 ${ri.short} 다른 ${unit}와 비교해 ${d ? '점수를 낮췄어요' : '점수를 높였어요'}.`;
        case '시·도 대비 가격 수준': return `${NM} 전체 가격 수준이 ${ri.short} 다른 ${unit}와 비교해 ${d ? '점수를 낮췄어요' : '점수를 높였어요'}.`;
        default: return '';
      }
    };
    /* 주된 쪽(하위권=내린 항목, 상위권=올린 항목)을 이유로, 반대쪽은 해석 뒤에 짧게 */
    const seen = new Set(), U = [], D = [];
    for (const nm of main) { if (seen.has(nm)) continue; seen.add(nm); const t = line(nm); if (t) (isDn(nm) ? D : U).push(t); }
    for (const k of ['sup', 'pg', 'un', 'jb']) if (!used.has(k)) { const t = T[k](); if (t) out.ref.push(t); }
    if (pos === '하위권' && momHigh) out.mean = `${J(NM, '이', '가')} 나쁜 동네라는 뜻이 아니라, ${J(NM, '이', '가')} 최근 많이 오른 만큼 앞으로 2년 오름폭은 ${ri.short} 다른 ${ri.unit}보다 작을 수 있다는 뜻이에요.`;
    const S = `${NM} 점수를`;
    if (pos === '하위권') { out.why = D; out.other = U.length ? `반대로 ${S} 받쳐 준 쪽: ` + U.join(' ') : ''; }
    else if (pos === '상위권') { out.why = U; out.other = D.length ? `다만 ${S} 낮춘 쪽: ` + D.join(' ') : ''; }
    else { out.why = [U.length ? `${S} 올린 쪽: ` + U.join(' ') : '', D.length ? `${S} 낮춘 쪽: ` + D.join(' ') : ''].filter(Boolean); out.other = ''; }
    return out;
  }
  /* 지역 흐름 한 문단: 실제 이유가 있으면 [사실, 이유들, 해석, 참고 지표], 없으면 [사실, 해석, 참고 지표] */
  function regionLine(rg, head) {
    if (rg.real) return [rg.fact || head, ...rg.why, rg.mean, rg.other, rg.ref.length ? '참고 지표: ' + rg.ref.join(' ') : ''].filter(Boolean).join(' ');
    return [rg.fact || head, rg.mean, rg.why.length ? '참고 지표: ' + rg.why.join(' ') : ''].filter(Boolean).join(' ');
  }

  /* ---------- 근거 등급: data/evidence.json (과거 같은 조건 단지의 2년 뒤 성적) ----------
     ev = evidence.json, sid = 시·도 id('s00'), eb = 단지 fx.eb, kind = 'mom'·'jr'·… → null 또는 {n, ex, hit, per, grade, text, cond, perText}
     등급 기준 숫자는 화면에 내보내지 않는다(이 함수 안에서만 씀). */
  const EV_MIN_N = 300, EV_AGREE = 0.75;
  const Q5 = { 4: '가장 높은 20%', 3: '상위 21~40%', 2: '중간 20%', 1: '하위 21~40%', 0: '가장 낮은 20%' };
  const EV_NAME = { mom: '최근 6개월 가격 흐름', rc: '예전 최고가 회복', dd: '하락기 방어', sch: '가까운 중학교 전입', jr: '전세가율', rel: '같은 구 안 가격 수준', lg: '동네 대장 단지 대비 가격' };
  const RAIL_C = { none: '700m 안 신설역 없음', plan: '700m 안 신설역 발표 단계', build: '700m 안 신설역 공사 중', open: '700m 안 신설역 개통 2년 이내' };
  function evCond(kind, b, sidoShort) {
    if (kind === 'stg') return b === '0' ? '지은 지 25년 넘었지만 정비구역 아님' : `재건축 ${STAGE[b] || b + '단계'} 단계`;
    if (kind === 'rail') return RAIL_C[b] || '';
    return Q5[b] ? `${EV_NAME[kind] || kind} ${sidoShort ? sidoShort + ' 단지 중 ' : ''}${Q5[b]}` : '';
  }
  function evid(ev, sid, eb, kind, sidoShort, G) {
    if (!ev || !ev.sido || !eb || eb[kind] == null) return null;
    const b = String(eb[kind]), e = ((ev.sido[sid] || {})[kind] || {})[b];
    if (!e || !(e.n > 0) || e.ex == null) return null;
    const per = (e.per || []).filter(p => p && p[1] > 0 && p[2] != null);
    const same = per.filter(p => Math.sign(p[2]) === Math.sign(e.ex)).length;
    const grade = Math.abs(e.ex) < 1 ? '영향 작음' : (e.n >= EV_MIN_N && per.length >= 3 && same / per.length >= EV_AGREE) ? '근거 강함' : '근거 보통';
    const hit10 = e.hit != null ? Math.round(e.hit / 10) : null;
    const cond = evCond(kind, b, sidoShort);
    const text = `과거 같은 조건${cond ? `(${cond})` : ''} 단지 ${e.n.toLocaleString()}건이 2년 뒤 같은 구 평균보다 ${Math.abs(e.ex) < 0.05 ? '거의 같게' : '평균 ' + more(e.ex, G)} 올랐어요` + (hit10 != null ? `(10건 중 ${hit10}건 더 오름).` : '.');
    const ymk = s => `${String(s).slice(0, 4)}년 ${parseInt(String(s).slice(4, 6), 10)}월`;
    const perText = per.slice().sort((x, y) => String(x[0]).localeCompare(String(y[0])))
      .map(p => `${ymk(p[0])}부터 2년: ${p[1].toLocaleString()}건, ${more(p[2])}` + (p[3] != null ? `(10건 중 ${Math.round(p[3] / 10)}건 더 오름)` : ''));
    return { n: e.n, ex: e.ex, hit: e.hit, per, grade, text, cond, perText };
  }
  /* 근거 한 줄 HTML: 무료(full=false)는 등급 + 한 줄 요약, 프리미엄(full=true)은 시기별 값까지 */
  function evHtml(e, full, esc) {
    if (!e) return '';
    const E = esc || (s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])));
    const cls = e.grade === '근거 강함' ? 'st' : e.grade === '영향 작음' ? 'lo' : 'md';
    return `<span class="jp-ev"><b class="jp-g ${cls}">${E(e.grade)}</b> ${E(e.text)}`
      + (full && e.perText.length ? `<span class="jp-per">${e.perText.map(t => E(t)).join('<br>')}</span>` : '') + '</span>';
  }

  /* 하락기·고점 회복 (구 평균 대비 %p, 소수 비율 값) */
  const pp = v => Math.round(Math.abs(v) * 100);
  const ddText = (d, G, s) => `${s == null ? '이 단지는 ' : s}최근 3년 하락기에 구 평균보다 ${pp(d)}${G ? G('%p') : '%p'} ${d >= 0 ? '덜' : '더'} 내렸어요`;
  const rcText = (d, G, s) => `${s == null ? '이 단지는 ' : s}직전 최고가에서 내린 뒤 구 평균보다 ${pp(d)}${G ? G('%p') : '%p'} ${d >= 0 ? '더' : '덜'} 회복했어요`;
  /* 최근 6개월 시세 변화 */
  function momText(ch, G) {
    const v = Math.abs(ch * 100);
    return `이 단지 ${G ? G('평당') : '평당'} 시세가 6개월 전보다 ` + (v < 0.05 ? '거의 그대로예요' : `${v.toFixed(1)}% ${ch > 0 ? '올랐어요' : '내렸어요'}`) + (ch >= 0.08 ? ' — 짧은 기간에 빠르게 오른 편이에요' : '');
  }
  /* 학군: 가까운 중학교 순전입률 */
  function schText(sch, names, G) {
    const p = Math.round(sch * 1000) / 10;
    return `가까운 중학교${names && names.length ? `(${names.join('·')})` : ''}는 ` + (p > 0 ? '전학 온 학생이 떠난 학생보다 많아요' : p < 0 ? '떠난 학생이 전학 온 학생보다 많아요' : '전학 온 학생과 떠난 학생이 비슷해요')
      + `. ${G ? G('순전입률') : '순전입률'} ${p > 0 ? '+' : ''}${p}%`;
  }
  /* 재건축 단계 */
  const stageName = lv => STAGE[lv] || '';
  const rzText = (z, G, ymf) => `재건축 진행: ${z.n} — ${G ? G(STAGE[z.lv] || '') : (STAGE[z.lv] || '')} 단계${z.ym ? `(${ymf ? ymf(z.ym) : z.ym})` : ''} · 10단계 중 ${z.lv}단계`;

  /* 전세가율 비교 기준: 같은 시·도 공개 단지 자료의 중앙값(재건축 단지는 30곳 이상일 때만) */
  const JR_MEMO = new WeakMap();
  const median = a => { const s = a.slice().sort((x, y) => x - y), n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : null; };
  function jrStats(units) {
    if (!units) return {};
    if (JR_MEMO.has(units)) return JR_MEMO.get(units);
    const rz = [], all = [];
    for (const u of units) { const f = u[9]; if (!f || f.jr == null) continue; all.push(f.jr); if (f.rz) rz.push(f.jr); }
    const o = { rz: rz.length >= 30 ? [median(rz), rz.length] : null, all: all.length >= 30 ? median(all) : null };
    JR_MEMO.set(units, o); return o;
  }
  /* 전세가율 문장: 전셋값 수준 이유 + 내 돈·대출로 마련할 몫 + 같은 시·도 비교 */
  function jrText(f, priceMan, st, sidoShort, G, by) {
    const jr = f.jr, age = by ? new Date().getFullYear() - by : null, q = Math.round(jr * 100);
    let why = '';
    if (jr < 0.4) why = f.rz ? '재건축 단지는 건물이 낡아 전셋값이 낮은 편이에요.' : (age != null && age >= 30) ? '지은 지 30년이 넘은 단지는 건물이 낡아 전셋값이 낮은 편이에요.' : '집값에 비해 전셋값이 낮은 편이에요.';
    else if (jr >= 0.6) why = '집값에 비해 전셋값이 높은 편이에요.';
    let t = `이 단지 ${G ? G('전세가율') : '전세가율'}은 ${q}%예요.` + (why ? ` ${why}` : '');
    if (priceMan > 0) t += ` ${jr < 0.4 ? '그래서 전세를 끼고 사도' : '전세를 끼고 사면'} ${eokR(priceMan)} 중 약 ${eokR(priceMan * (1 - jr))}을 내 돈과 대출로 마련해야 해요(추정).`;
    st = st || {};
    if (f.rz && st.rz) {
      const [m, n] = st.rz, d = jr - m, lvl = Math.abs(d) < 0.05 ? '보통인 편' : d < 0 ? '낮은 편' : '높은 편';
      t += ` ${sidoShort} 재건축 단지 ${n.toLocaleString()}곳(평형별)의 전세가율 ${G ? G('중앙값') : '중앙값'}은 ${Math.round(m * 100)}%라, 이 단지는 ${sidoShort} 재건축 단지 중에서는 ${lvl}이에요.`;
      if (st.all != null) t += ` ${sidoShort} 아파트 전체 중앙값은 ${Math.round(st.all * 100)}%예요.`;
    } else if (st.all != null) t += ` ${sidoShort} 아파트 전체 전세가율 ${G ? G('중앙값') : '중앙값'}은 ${Math.round(st.all * 100)}%예요.`;
    return t;
  }

  /* 검증 결과: 과거 시험 N번 중 M번 통과 (통과 기준 미달이면 '참고만') */
  const VOK = m => !!(m && (m.oos_all || []).length >= 2 && m.oos_avg > 0);
  function hzLabel(m) {
    const n = ((m && m.oos_all) || []).length, hit = (m && m.oos_hit) || 0;
    if (VOK(m)) return `과거 시험 ${n}번 중 ${hit}번 통과`;
    if (n === 0) return '아직 검증 전 · 참고만';
    if (n === 1) return '과거 시험 1번뿐 · 참고만';
    return `과거 시험 ${n}번 중 ${hit}번 통과 · 참고만`;
  }
  /* 접는 상자 '이 점수 방식을 믿을 수 있나요?' 본문 */
  function checkText(m, h, G) {
    const O = (m && m.oos_all) || [];
    if (!O.length) return `${h}년 점수는 아직 과거 시험을 하지 못해 참고만 해 주세요. 같은 구 평균과 비교한 순위라, 시장 전체가 내리면 점수가 높은 단지도 내릴 수 있어요.`;
    const n = O.length, hit = m.oos_hit || 0, ys = O.map(o => String(o.t0).slice(0, 4)).join('·');
    return `${ys}년 ${n}개 시점에서, 그때까지의 자료만으로 점수를 매겨 봤어요. 이런 시험을 ${G ? G('표본 외 검증') : '표본 외 검증'}이라고 해요. `
      + `점수 상위 20% 단지들이 ${h}년 뒤 같은 구 평균보다 더 올랐는지 확인했더니 ${hit === n ? `${n}번 모두 그랬어요` : `${n}번 중 ${hit}번 그랬어요`}. `
      + (m.oos_avg != null ? `평균으로는 ${more(m.oos_avg, G)} 올랐어요. ` : '')
      + '같은 구 평균과 비교한 순위라, 시장 전체가 내리면 점수가 높은 단지도 내릴 수 있어요.';
  }

  /* ---------- 일정: 당초 목표 → 실제/현재 예정(지연) — 엔진 scripts/schedule.py delay_text 와 같은 규칙 ----------
     d = {orig, cur, orig_s, cur_s, actual, delay(개월), state: done|done_late|overdue|postponed|on_track|unknown|cancel|planned|overdue_later} */
  const ymKo = v => { v = String(v == null ? '' : v).replace('-', ''); return v.length === 4 ? `${v}년` : `${v.slice(0, 4)}년 ${parseInt(v.slice(4, 6), 10)}월`; };
  const spanKo = m => m < 12 ? `${m}개월` : `${Math.floor(m / 12)}년` + (m % 12 >= 3 ? ` ${m % 12}개월` : '');
  function delayText(d, what) {
    if (!d) return '';
    const w = what ? what + ' ' : '';
    if (d.state === 'cancel') return `${w}공식 취소`;
    if (d.orig == null) {
      if (d.state === 'done') return `${ymKo(d.actual)} ${w}완료`.replace(/ $/, '');
      return `${w}${ymKo(d.cur_s || d.cur)} 예정(당초 목표 미확인)` + (d.state === 'overdue_later' ? ` — 예정보다 약 ${spanKo(d.delay)} 지났어요` : '');
    }
    const o = ymKo(d.orig_s || d.orig);
    if (d.state === 'done' || d.state === 'done_late') return `당초 ${o} ${w}목표 → 실제 ${ymKo(d.actual)}` + (d.delay ? `(약 ${spanKo(d.delay)} 늦어짐)` : '(목표대로)');
    if (d.state === 'overdue') return `당초 ${o} ${w}목표 → 아직 공식 기록이 없어요(목표보다 약 ${spanKo(d.delay)} 지남)`;
    if (d.state === 'unknown') return `당초 ${o} ${w}목표 → 진행 여부는 공식 확인 전이에요`;
    return `당초 ${o} ${w}목표 → 현재 ${ymKo(d.cur_s || d.cur)} 예정` + (d.delay ? `(약 ${spanKo(d.delay)} 늦어짐)` : '');
  }

  /* ---------- 가까운·같은 생활권 대규모 공급(공개 supply.json zones·ring, 단지 f.sl) ---------- */
  function unitsKo(u) {
    const m = Math.floor(u / 10000), r = u % 10000, c = Math.round(r / 1000);
    const ap = u % 1000 ? '약 ' : '';
    if (!m) return `${ap}${Math.round(u / 1000)}천`;
    if (c === 10) return `${ap}${m + 1}만`;
    return `${ap}${m}만` + (c ? ` ${c}천` : '');
  }
  const SP_STAGE = { ann: '발표', desig: '지구 지정', sale: '첫 분양·사전청약', start: '착공', move: '첫 입주' };
  function supplyLines(f, SP, G) {
    const out = [];
    if (!f || !f.sl || !SP || !SP.zones) return out;
    for (const [id, ring, sc] of f.sl) {
      const z = SP.zones[id]; if (!z) continue;
      const big = z.u >= 10000, head = ring === 'n' ? (big ? '가까운 대규모 공급' : '가까운 공공택지 공급') : '같은 생활권 대규모 공급';
      const seen = new Set(), hist = [];
      for (const [ym, s] of z.h || []) { const k = (SP_STAGE[s] || s); if (s === 'move' || seen.has(k)) continue; seen.add(k); hist.push(`${String(ym).slice(0, 4)}년 ${k}`); }
      let mv;
      if (z.x) mv = `${ymKo(String(z.x[0]).replace('-', ''))} 공식 취소`;
      else if (z.mv) mv = `${ymKo(z.mv)} 첫 입주`;
      else if (z.dl) mv = '첫 입주: ' + delayText(z.dl);
      else if (z.plan) mv = `첫 입주 목표 ${ymKo(z.plan)}`;
      else mv = '첫 입주 시기 미정';
      let t = `${head}: ${z.n} ${unitsKo(z.u)} 가구 — ${hist.concat([mv]).join(' → ')}.`;
      const key = z.st === 3 ? 'move' : z.st === 2 ? 'sale' : 'ann', R = SP.ring && SP.ring[ring === 'n' ? 'near' : 'life'] && SP.ring[ring === 'n' ? 'near' : 'life'][key];
      if (R && R.n >= 3 && R.ex != null)
        t += ` 과거 비슷한 단계(${key === 'move' ? '첫 입주' : key === 'sale' ? '분양·착공' : '발표·지구 지정'})의 대규모 공급 ${ring === 'n' ? '가까이' : '같은 생활권'}에 있던 단지는 이후 2년 같은 구 평균보다 ${Math.abs(R.ex) < 0.05 ? '거의 같게' : '평균 ' + more(R.ex, G)} 올랐어요(사례 ${R.n}건${R.sig ? '' : ', 차이가 뚜렷하지는 않아요'}).`;
      t += sc ? ' 점수에 반영돼요.' : (ring === 'n' ? ' 점수에는 넣지 않았어요(점수는 더 가까운 지구만 반영) · 참고 정보.' : ' 점수에는 아직 넣지 않았어요(과거 영향이 뚜렷하지 않아서) · 참고 정보.');
      out.push([ring === 'n' && z.st >= 2 && !z.x ? 'c' : 'f', t]);
    }
    return out;
  }

  /* ---------- 1기 신도시 노후계획도시 정비 선도지구(공개 supply.json renewal, 단지 f.nr) ---------- */
  function renewalLine(f, SP, G, ev) {
    const RN = SP && SP.renewal, z = f && f.nr && RN && RN.zones && RN.zones[f.nr];
    if (!z) return null;
    const L = RN.labels || {}, sel = (z.h || []).find(h => h[1] === 'select'), cur = (z.h || []).filter(h => h[1] === z.st).slice(-1)[0];
    const ok = s => (z.v && z.v[s] === 'official') ? '공식 확인됨' : '보도로 확인';
    let t = `${z.town} 노후계획도시 정비 — 이 단지는 ${z.n} 선도지구에 포함돼요(${sel ? ymKo(sel[0]) : ''} 선정, ${ok('select')})`;
    t += ` · 현재 단계: ${L[z.st] || z.st}${cur && z.st !== 'select' ? `(${ymKo(cur[0])}, ${ok(z.st)})` : ''}`;
    if (z.next && z.dl) t += ` · 다음 단계 ${L[z.next] || z.next}: ${delayText(z.dl)}`;
    if (z.done) t += ` · 정부 목표 입주 ${ymKo(z.done)}`;
    if (z.far) t += ` · ${z.town} 기준용적률 ${z.far}%(보도로 확인)` + (f.vl ? `, 이 단지 지금 용적률 약 ${Math.round(f.vl)}%` : '');
    t += '.';
    const S = RN.stats && Object.values(RN.stats).find(s => s.town === z.town);
    if (S) t += ` 선정(${ymKo(S.from)}) 이후 ${ymKo(S.to)}까지 ${z.town} 선도지구 단지는 평균 ${S.sel >= 0 ? '+' : ''}${S.sel}%, 같은 도시 선정 안 된 노후 단지는 ${S.oth >= 0 ? '+' : ''}${S.oth}% 움직였어요(단지·평형 ${S.n_sel}곳 vs ${S.n_oth}곳, 사실 통계 · 점수에는 넣지 않았어요).`;
    let ref = null;
    if (ev) { const e = evid(ev, 's00', { stg: z.st === 'select' ? '1' : '3' }, 'stg', '서울', G); if (e && e.n >= 30) ref = `비슷한 단계 참고(서울 ${e.cond}): ${e.text}`; }   /* 사례가 적으면 싣지 않음 */
    return { text: t, ref };
  }
  const easy = t => `<p class="jp-easy"><b>쉽게 말하면:</b> ${t}</p>`;

  /* 공용 스타일(한 번만) */
  if (root.document && !root.document.getElementById('jp-style')) {
    const s = root.document.createElement('style'); s.id = 'jp-style';
    s.textContent = '.jp-easy{margin:6px 0 10px;padding:9px 12px;border-radius:10px;background:rgba(184,148,42,.10);font-size:14.5px;line-height:1.6;word-break:keep-all;overflow-wrap:anywhere}'
      + '.jp-easy b{color:#6B5A1E;margin-right:2px}'
      + '.jp-check{margin:8px 0 12px;border:1px solid #E5E1D3;border-radius:10px;padding:9px 12px;background:#fff;font-size:14px;line-height:1.65}'
      + '.jp-check summary{cursor:pointer;font-weight:800}.jp-check p{margin:8px 0 0}'
      + '.jp-ref{color:#8B95A1}'
      + '.jp-ev{display:block;margin-top:3px;font-size:13px;line-height:1.55;color:#4E5968;word-break:keep-all;overflow-wrap:anywhere}'
      + '.jp-g{display:inline-block;font-size:11.5px;font-weight:800;padding:0 6px;border-radius:6px;margin-right:4px;vertical-align:1px;line-height:18px}'
      + '.jp-g.st{background:#E3F4EA;color:#0E7A4F}.jp-g.md{background:#F2F4F6;color:#4E5968}.jp-g.lo{background:#FFF4E0;color:#8A5A00}'
      + '.jp-per{display:block;margin-top:2px;padding-left:8px;border-left:2px solid #E5E1D3;font-size:12.5px;color:#6B7684}';
    (root.document.head || root.document.documentElement).appendChild(s);
  }

  /* ---------- 화면 전체 첫 등장 풀이 (갈아타기·세금·빌라·청약·리포트 공용) ----------
     화면 글자에서 용어가 처음 나오는 곳 바로 뒤에만 작은 괄호 풀이를 붙인다. 이미 바로 뒤에 '('가 있으면 붙이지 않음.
     화면이 다시 그려지면(내용 변경) 풀이를 지우고 다시 첫 등장에 붙인다. */
  const GL_PAGE = {
    '%p': '퍼센트포인트: 두 비율의 차이',
    '전세가율': '집값 대비 전셋값 비율',
    '장기보유특별공제': '오래 보유·거주한 집을 팔 때 양도차익에서 빼 주는 금액',
    '표2': '1세대 1주택자가 2년 이상 거주했을 때 쓰는 공제율 표, 보유·거주 기간별 최대 80%',
    '필요경비': '취득세·중개보수·수리비처럼 양도차익에서 빼 주는 비용',
    '처분조건부': '기존 집을 정해진 기한 안에 판다는 조건',
    '권리산정기준일': '이날 이전부터 있던 건물이어야 새 아파트 입주권을 받을 수 있는 기준 날짜',
    '대지지분': '건물이 깔고 있는 땅 중 내 몫',
    '대지권': '등기된 땅 지분',
    '현금청산': '입주권 대신 감정가로 돈을 받고 나가는 것',
    '가점제': '무주택 기간·부양가족·통장 가입기간 점수 순으로 뽑는 방식',
    '추첨제': '점수와 상관없이 추첨으로 뽑는 방식',
    '해당지역': '공고한 시·군에 일정 기간 이상 산 사람',
    'LTV': '집값 대비 대출 비율',
    'DSR': '연소득 대비 1년 원리금 상환액 비율'
  };
  function glossDom(el, terms) {
    if (!el || !root.document) return;
    const doc = root.document, T = terms || GL_PAGE;
    el.querySelectorAll('.jp-gl').forEach(x => x.remove());
    el.normalize();
    const left = new Set(Object.keys(T));
    const walker = doc.createTreeWalker(el, 4, { acceptNode: n => {
      const p = n.parentElement; if (!p || !n.nodeValue.trim()) return 2;
      if (p.closest('script,style,textarea,select,option,button,[data-nogloss],.jp-gl,summary') || p.closest('[hidden]')) return 2;
      return 1; } });
    const hits = [];
    let n;
    while ((n = walker.nextNode()) && left.size) {
      const v = n.nodeValue;
      for (const t of [...left]) {
        let i = -1;
        if (t === '%p') { const m = /\d%p/.exec(v); if (m) i = m.index + 1; }
        else i = v.indexOf(t);
        if (i < 0) continue;
        left.delete(t);
        const end = i + t.length;
        if (v.charAt(end) === '(' || v.slice(end).trimStart().startsWith('(')) continue;   // 이미 풀이가 있음
        hits.push([n, end, t]);
      }
    }
    hits.sort((a, b) => b[1] - a[1]);   // 같은 노드 안에서는 뒤에서부터 잘라야 위치가 안 밀림
    for (const [node, end, t] of hits) {
      if (!node.parentNode) continue;
      const after = node.splitText(Math.min(end, node.nodeValue.length));
      const sp = doc.createElement('span'); sp.className = 'jp-gl'; sp.textContent = `(${T[t]})`;
      node.parentNode.insertBefore(sp, after);
    }
  }
  /* 화면이 바뀔 때마다 다시 붙임(잠깐 기다렸다 한 번) */
  function autoGloss(el, terms) {
    if (!el || !root.MutationObserver) return;
    if (root.document && !root.document.getElementById('jp-gl-css')) {
      const s = root.document.createElement('style'); s.id = 'jp-gl-css';
      s.textContent = '.jp-gl{font-size:.85em;color:#4E5968;font-weight:500;margin-left:1px}';
      (root.document.head || root.document.documentElement).appendChild(s);
    }
    let t = null; const mo = new MutationObserver(() => { clearTimeout(t); t = setTimeout(run, 120); });
    function run() { mo.disconnect(); try { glossDom(el, terms); } finally { mo.observe(el, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['hidden'] }); } }
    run();
  }

  root.JDJ_PLAIN = { STAGE, GL_PAGE, glossDom, autoGloss, gloss, J, won, eokR, rank, more, regionInfo, rankBase, regionRank, regionPlace, topPct, regionText, regionLine, evid, evHtml, ddText, rcText, momText, schText, stageName, rzText, jrStats, jrText, VOK, hzLabel, checkText, easy, ymKo, spanKo, delayText, unitsKo, supplyLines, renewalLine };
})(typeof window !== 'undefined' ? window : globalThis);
