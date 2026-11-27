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
    '순전입률': '전학 온 학생 수에서 떠난 학생 수를 뺀 값을 재학생 수로 나눈 것',
    '중간값': '여러 값을 크기순으로 늘어놓았을 때 가운데 값'
  };
  for (const k in STAGE) GL[STAGE[k]] = `재건축·재개발 10단계 중 ${k}번째: ${STAGE_DESC[k]}`;
  const FIRST = { '평당': '평당(전용 3.3㎡당)' };

  /* 용어 풀이: 같은 장에서 처음 나올 때만 괄호 풀이 */
  function gloss() {
    const used = new Set();
    return t => { if (used.has(t) || !(t in GL || t in FIRST)) return t; used.add(t); return FIRST[t] || `${t}(${GL[t]})`; };
  }

  /* 연차(화면 표기 전용) — 아실과 같은 '올해 − 준공 연도'. 모든 화면이 이 함수만 쓴다.
     엔진 모델 피처(연식)와는 별개이며 계산식에 쓰지 않는다.
     ageOf: 숫자(음수 = 아직 입주 전), 이상한 연도는 null
     ageLabel: '8년차' · '올해 입주' · '입주 예정'
     ageText(by, year, word): '2018년(8년차)' · word='준공' → '2018년 준공(8년차)' · 미래 → '2028년 입주 예정' */
  function ageOf(by, year) {
    by = +by; year = +year || new Date().getFullYear();
    if (!(by >= 1900 && by <= year + 10)) return null;
    return year - by;
  }
  function ageLabel(by, year) {
    const a = ageOf(by, year);
    return a == null ? '' : a < 0 ? '입주 예정' : a === 0 ? '올해 입주' : `${a}년차`;
  }
  function ageText(by, year, word) {
    const a = ageOf(by, year); if (a == null) return '';
    if (a < 0) return `${+by}년 입주 예정`;
    return `${+by}년${word ? ' ' + word : ''}(${ageLabel(by, year)})`;
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
  /* 지역 흐름 점수(gs, 높을수록 상위) → N위, 상위권/중위권/하위권
     엔진은 시·도 안 n곳을 점수 낮은 순 i(0부터)로 세워 gs = round(100·(i+0.5)/n) 로 내보낸다 → i = round(gs·n/100 − 0.5), 등수 = n − i.
     n 이 엔진 곳 수(sido.ngs)면 실제 등수와 같다(n<100 이면 반올림 오차가 등수를 바꾸지 못함). 순위 화면(rank-core future)도 같은 계산 */
  function regionRank(gs, n) {
    const r = Math.min(n, Math.max(1, n - Math.round(gs * n / 100 - 0.5)));
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
  /* 인구 구조 문장(index.json sgg[구].r.pp, 시·도 중간값 sido[i].r.pp) — 주어(구 이름)와 비교 기준을 항상 붙인다.
     자료가 없으면 빈 객체 → 화면에 안 나옴. 키: a3049(30~40대 3년 증감) a65(65세 이상 비중) nm(1년 순이동) nm3049(30~40대 1년 순이동) h12(1·2인 세대 비중) */
  const POP_LABEL = { '30~40대 인구 증감(3년)': 'a3049', '고령화 속도(3년)': 'a65', '인구 순유입(1년)': 'nm', '30~40대 순유입(1년)': 'nm3049',
    '1·2인 세대 비중': 'h12', '1·2인 세대 비중 변화(3년)': 'h12' };
  function popLines(R, SR, ri) {
    const P = (R && R.pp) || {}, M = (SR && SR.pp) || {}, NM = ri.name || '이 지역', S = J(NM, '은', '는'), out = {};
    const n0 = v => Math.abs(Math.round(v)).toLocaleString('ko-KR');
    const f1 = v => (Math.round(Math.abs(v) * 10) / 10).toFixed(1);
    const rk = (d, how) => d.rk && d.of >= 3 ? ` — ${ri.short} ${d.of}개 ${ri.unit} 중 ${d.rk}위(${how}).` : '';
    const md = (k, unit) => M[k] != null ? ` — ${ri.short} ${ri.unit} 중간값 ${unit === '%' ? f1(M[k]) + '%' : n0(M[k]) + unit}.` : '';
    const end = (d, how, k, unit) => rk(d, how) || md(k, unit) || '.';
    let d;
    if ((d = P.a3049) && d.v != null)
      out.a3049 = `${S} 최근 3년 30~40대 인구가 ${Math.abs(d.v) < 0.05 ? '거의 그대로예요' : `${f1(d.v)}% ${d.v > 0 ? '늘었어요' : '줄었어요'}`}` + end(d, '많이 늘어난 순', 'a3049', '%');
    if ((d = P.a65) && d.v != null)
      out.a65 = `${S} 65세 이상 비중이 ${f1(d.v)}%` + (d.c != null ? (Math.abs(d.c) < 0.05 ? '로 3년 새 거의 그대로예요' : `로 3년 새 ${f1(d.c)}%p ${d.c > 0 ? '높아졌어요' : '낮아졌어요'}`) : '예요') + end(d, '높은 순', 'a65', '%');
    if ((d = P.nm) && d.v != null)
      out.nm = `${S} 최근 1년 ${d.v === 0 ? '전입과 전출이 같았어요' : d.v > 0 ? `전입이 전출보다 ${n0(d.v)}명 많았어요` : `전출이 전입보다 ${n0(d.v)}명 많았어요`}` + end(d, '순유입 많은 순', 'nm', '명');
    if ((d = P.nm3049) && d.v != null)
      out.nm3049 = `${S} 최근 1년 30~40대가 ${d.v === 0 ? '들어오고 나간 수가 같았어요' : `${n0(d.v)}명 ${d.v > 0 ? '순유입됐어요' : '순유출됐어요'}`}` + end(d, '순유입 많은 순', 'nm3049', '명');
    if ((d = P.h12) && d.v != null)
      out.h12 = `${S} 1·2인 세대가 전체 세대의 ${f1(d.v)}%예요` + (md('h12', '%') || rk(d, '높은 순') || '.');
    return out;
  }
  /* ev(evidence.json, 선택): 주는 화면은 첫 이유를 공용 구 이유 문장(narrative.js guWhy: 사실 → 비교 → 과거 사례 → 그래서)으로 바꾼다 */
  function regionText(f, IX, code, G, ev) {
    const ri = regionInfo(IX, code), out = { fact: '', why: [], mean: '', ref: [], real: false };
    let pos = '';
    const NM = ri.name || '이 지역';
    if (f.gs != null && ri.n >= 3) {
      const rp = regionPlace(IX, code, f.gs); pos = rp.pos;
      out.fact = `${J(NM, '은', '는')} 앞으로 2년 지역 흐름 점수가 ${rp.text}예요(${pos}).`;
      out.mean = pos === '하위권' ? `하위권은 ${NM} 앞으로 2년 오름폭이 ${ri.short} 다른 ${ri.unit}보다 작을 수 있다는 뜻이에요. 살기 좋은 정도와는 별개의 기준이에요.`
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
    const PP = popLines(R, SR, ri), PK = ['a3049', 'nm', 'nm3049', 'a65', 'h12'];
    if (!R || (!up.length && !dn.length)) {
      for (const k of ['sup', 'pg', 'un', 'jb']) { const t = T[k](); if (t) out.why.push(t); }
      for (const k of PK) if (PP[k]) out.why.push(PP[k]);
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
          const m = SR.mom, cmp = m != null ? `(${ri.short} ${unit} 중간값 ${pct1(m)})` : '';
          if (m != null && R.mom > m) { momHigh = d; return `${NM} 전체 시세가 최근 1년 ${pct1(R.mom)}로 ${d ? '이미 많이 올랐어요' : '많이 올랐어요'}${cmp}.`; }
          if (R.mom < 0) return `${NM} 전체 시세가 최근 1년 ${pct1(R.mom)}로 내렸어요${cmp}.`;
          return `${NM} 전체 시세가 최근 1년 ${pct1(R.mom)}로 ${m != null && R.mom < m ? '덜 올랐어요' : '올랐어요'}${cmp}.`;
        }
        case '구 전세가율': {
          if (R.jr == null) return '';
          const m = SR.jr, lv = m == null ? '' : Math.abs(R.jr - m) < 2 ? '보통이에요' : R.jr < m ? '낮아요' : '높아요';
          let t = `${NM} 전체 ${G ? G('전세가율') : '전세가율'}이 ${Math.round(R.jr * 10) / 10}%${lv ? '로 ' + lv : '예요'}${m != null ? `(${ri.short} 중간값 ${Math.round(m * 10) / 10}%)` : ''}.`;
          if (m != null && R.jr < m) lowJr = true;
          if (lowJr && R.rz != null && SR.rz != null && R.rz > SR.rz * 1.5 && R.rz >= 5)
            t += ` 다만 ${NM}처럼 재건축 단지가 많은 ${unit}(재건축 단계 단지 ${Math.round(R.rz * 10) / 10}%, ${ri.short} 중간값 ${Math.round(SR.rz * 10) / 10}%)는 전세가율이 낮게 나오기 쉬워요.`;
          return t;
        }
        case '향후 2년 입주 물량': used.add('sup'); return T.sup();
        case '인구 증가': case '인구 증감(3년)': if (used.has('pg')) return ''; used.add('pg'); return T.pg();
        case '세대수 증가': return `${NM} 세대수의 최근 1년 변화가 ${ri.short} 다른 ${unit}와 비교해 ${d ? '점수를 낮췄어요' : '점수를 높였어요'}.`;
        case '미분양 물량(재고 대비)': case '미분양 증감(1년)': if (used.has('un')) return ''; used.add('un'); return T.un();
        case '일자리 증가(1년)': used.add('jb'); return T.jb();
        case '일자리 밀집도(인구 대비)': return `${NM} 인구 대비 일자리 수가 ${ri.short} 다른 ${unit}와 비교해 ${d ? '점수를 낮췄어요' : '점수를 높였어요'}.`;
        case '구 하락기 방어력': return `${NM} 전체가 최근 하락기에 버틴 정도가 ${ri.short} 다른 ${unit}와 비교해 ${d ? '점수를 낮췄어요' : '점수를 높였어요'}.`;
        case '구 고점 회복률': return `${NM} 전체가 예전 최고가를 회복한 정도가 ${ri.short} 다른 ${unit}와 비교해 ${d ? '점수를 낮췄어요' : '점수를 높였어요'}.`;
        case '시·도 대비 가격 수준': return `${NM} 전체 가격 수준이 ${ri.short} 다른 ${unit}와 비교해 ${d ? '점수를 낮췄어요' : '점수를 높였어요'}.`;
        default: { const k = POP_LABEL[nm]; if (!k || used.has(k) || !PP[k]) return ''; used.add(k); return PP[k]; }
      }
    };
    /* 주된 쪽(하위권=내린 항목, 상위권=올린 항목)을 이유로, 반대쪽은 해석 뒤에 짧게 */
    const seen = new Set(), U = [], D = [];
    out.items = [];
    for (const nm of main) { if (seen.has(nm)) continue; seen.add(nm); const t = line(nm); if (t) { (isDn(nm) ? D : U).push(t); out.items.push({ nm, up: !isDn(nm), t }); } }
    for (const k of ['sup', 'pg', 'un', 'jb']) if (!used.has(k)) { const t = T[k](); if (t) out.ref.push(t); }
    for (const k of PK) if (!used.has(k) && PP[k]) out.ref.push(PP[k]);
    if (pos === '하위권' && momHigh) out.mean = `${J(NM, '이', '가')} 최근 많이 오른 만큼, 앞으로 2년 오름폭은 ${ri.short} 다른 ${ri.unit}보다 작을 수 있다는 뜻이에요. 살기 좋은 정도와는 별개의 기준이에요.`;
    const S = `${NM} 점수를`;
    if (pos === '하위권') { out.why = D; out.other = U.length ? `반대로 ${S} 받쳐 준 쪽: ` + U.join(' ') : ''; }
    else if (pos === '상위권') { out.why = U; out.other = D.length ? `다만 ${S} 낮춘 쪽: ` + D.join(' ') : ''; }
    else { out.why = [U.length ? `${S} 올린 쪽: ` + U.join(' ') : '', D.length ? `${S} 낮춘 쪽: ` + D.join(' ') : ''].filter(Boolean); out.other = ''; }
    const NR = root.JDJ_NAR;
    if (ev && NR && NR.guWhy && (pos === '상위권' || pos === '하위권') && out.why.length) {
      const gw = NR.guWhy({ IX, code, gs: f.gs, EV: ev, f, PL: root.JDJ_PLAIN });
      if (gw && gw.so) out.why[0] = gw.text;
    }
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
    const p = Math.round(sch * 1000) / 10;   /* ±0.5% 안은 '비슷해요'(학생 수백 명 학교에서 몇 명 차이) */
    return `가까운 중학교${names && names.length ? `(${names.join('·')})` : ''}는 ` + (p >= 0.5 ? '전학 온 학생이 떠난 학생보다 많아요' : p <= -0.5 ? '떠난 학생이 전학 온 학생보다 많아요' : '전학 온 학생과 떠난 학생이 비슷해요')
      + `. ${G ? G('순전입률') : '순전입률'} ${p > 0 ? '+' : ''}${p}%`;
  }
  /* 학군 한 줄(사이트 자료 fx.sc): [학교 이름, 한 해 평균 순전입률 %, 첫 공시연도, 끝 공시연도, 구 안 순위(1=순전입 최다), 구 안 곳 수, 구 코드, 거리 m]
     scParts → {name, dist, move, rank, base} · scText → 한 문장. 자료가 없으면 null / '' */
  function scParts(sc, guName) {
    if (!Array.isArray(sc) || !sc[0]) return null;
    const [nm, p, y0, y1, r, n, , m] = sc;
    const a = Math.abs(p), sp = Number.isInteger(a) ? String(a) : a.toFixed(1);
    /* ±0.5% 안은 '비슷해요'(재학생 수백 명 학교에서 몇 명 차이) — 값은 그대로 보여 준다 */
    const move = p >= 0.5 ? `최근 3년 전입이 전출보다 많아요(한 해 평균 순전입 +${sp}%)`
      : p <= -0.5 ? `최근 3년 전출이 전입보다 많아요(한 해 평균 순전입 −${sp}%)` : `최근 3년 전입과 전출이 비슷해요(한 해 평균 순전입 ${a < 0.05 ? '0' : (p > 0 ? '+' : '−') + sp}%)`;
    let rank = '';
    if (n >= 3 && r >= 1 && r <= n) {
      const top = Math.ceil(r / n * 100), low = Math.ceil((n - r + 1) / n * 100);
      rank = `${guName || '같은 구'} 중학교 ${n}곳 중 순전입 ${top <= 50 ? '상위 ' + Math.max(1, top) : '하위 ' + Math.max(1, low)}%`;
    }
    const dist = m > 0 ? (m >= 1000 ? `약 ${(m / 1000).toFixed(1)}km` : `약 ${m}m`) : '';
    return { name: nm, dist, move, rank, base: y0 && y1 ? (y0 === y1 ? `${y1}년 공시` : `${y0}~${y1}년 공시`) : '' };
  }
  function scText(sc, guName) {
    const s = scParts(sc, guName); if (!s) return '';
    return `${s.name}${s.dist ? `(${s.dist})` : ''}, ${s.move}` + (s.rank ? ` — ${s.rank}` : '') + (s.base ? ` · 학교알리미 ${s.base}` : '');
  }
  /* 재건축 단계 */
  const stageName = lv => STAGE[lv] || '';
  const rzText = (z, G, ymf) => `재건축 진행: ${z.n} — ${G ? G(STAGE[z.lv] || '') : (STAGE[z.lv] || '')} 단계${z.ym ? `(${ymf ? ymf(z.ym) : z.ym})` : ''} · 10단계 중 ${z.lv}단계`;

  /* 전세가율 비교 기준: 같은 시·도 공개 단지 자료의 중간값(재건축 단지는 30곳 이상일 때만) */
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
    const jr = f.jr, age = ageOf(by), q = Math.round(jr * 100);
    let why = '';
    if (jr < 0.4) why = f.rz ? '재건축 단지는 건물이 낡아 전셋값이 낮은 편이에요.' : (age != null && age >= 30) ? '지은 지 30년이 넘은 단지는 건물이 낡아 전셋값이 낮은 편이에요.' : '집값에 비해 전셋값이 낮은 편이에요.';
    else if (jr >= 0.6) why = '집값에 비해 전셋값이 높은 편이에요.';
    let t = `이 단지 ${G ? G('전세가율') : '전세가율'}은 ${q}%예요.` + (why ? ` ${why}` : '');
    if (priceMan > 0) t += ` ${jr < 0.4 ? '그래서 전세를 끼고 사도' : '전세를 끼고 사면'} ${eokR(priceMan)} 중 약 ${eokR(priceMan * (1 - jr))}을 내 돈과 대출로 마련해야 해요(추정).`;
    st = st || {};
    if (f.rz && st.rz) {
      const [m, n] = st.rz, d = jr - m, lvl = Math.abs(d) < 0.05 ? '보통인 편' : d < 0 ? '낮은 편' : '높은 편';
      t += ` ${sidoShort} 재건축 단지 ${n.toLocaleString()}곳(평형별)의 전세가율 ${G ? G('중간값') : '중간값'}은 ${Math.round(m * 100)}%라, 이 단지는 ${sidoShort} 재건축 단지 중에서는 ${lvl}이에요.`;
      if (st.all != null) t += ` ${sidoShort} 아파트 전체 중간값은 ${Math.round(st.all * 100)}%예요.`;
    } else if (st.all != null) t += ` ${sidoShort} 아파트 전체 전세가율 ${G ? G('중간값') : '중간값'}은 ${Math.round(st.all * 100)}%예요.`;
    return t;
  }

  /* ---------- 과거 성적 문구(대표 확정 11/20) ----------
     사용자 화면에는 '시험·통과·표본 외·백테스트'를 쓰지 않는다 → '과거에 그대로 써 봤더니 N번 중 M번 맞았어요'.
     기간은 '언제부터 언제까지' — 시작월은 엔진이 공개 모델 JSON 에 넣은 data_from(학습 자료 시작월, 없으면 생략).
     회차마다: 그 시점(t0)까지의 자료로 순위 → h년 뒤(t0 + h년) 실제 결과. '맞음' = 점수 상위 20%가 비교 평균보다 더 오름.
     판정 기준(VOK: 2번 이상·평균 +·절반 이상 맞음)은 그대로. */
  /* 엔진 판정(status: 누수 없는 재구축 2026-11-27 — 두 격자·블록 부트스트랩 구간·기준선·장세)이 있으면 그것만 따름(숫자로 다시 판정하지 않음) */
  const VOK = m => !!(m && (m.status || (m.robust && m.robust.status)) ? (m.status || m.robust.status) === 'pass' : !!(m && (m.oos_all || []).length >= 2 && m.oos_avg > 0 && 2 * (m.oos_hit != null ? m.oos_hit : (m.oos_all || []).filter(o => (o.top20 || 0) > 0).length) >= (m.oos_all || []).length));
  /* '2010-01'·'201001'·201001 → '201001' (이상하면 '') */
  const ymNorm = v => { const t = String(v == null ? '' : v).replace(/[^0-9]/g, ''); return /^(19|20)\d{2}(0[1-9]|1[0-2])/.test(t) ? t.slice(0, 6) : ''; };
  const ymPlus = (v, mo) => { const y = +v.slice(0, 4), m = +v.slice(4, 6) - 1 + mo; return `${y + Math.floor(m / 12)}${String((m % 12 + 12) % 12 + 1).padStart(2, '0')}`; };
  const ymDot = v => `${v.slice(0, 4)}.${v.slice(4, 6)}`;
  const ymKoM = v => `${v.slice(0, 4)}년 ${+v.slice(4, 6)}월`;
  const fromOf = (m, from) => ymNorm(from) || ymNorm(m && (m.data_from || m.from));
  const trackHit = m => { const O = (m && m.oos_all) || []; return m && m.oos_hit != null ? m.oos_hit : O.filter(o => (o.top20 || 0) > 0).length; };
  /* 회차별: { t0, end, top20, hit, txt: '2010.01~2021.10 자료 → 2023.10' } (시점 순) */
  function trackRuns(m, h, from) {
    const f = fromOf(m, from);
    return ((m && m.oos_all) || []).filter(o => o && ymNorm(o.t0) && o.top20 != null).map(o => {
      const t0 = ymNorm(o.t0), end = ymPlus(t0, Math.round(h * 12));
      return { t0, end, top20: o.top20, hit: o.top20 > 0, txt: `${f && f < t0 ? ymDot(f) : ''}~${ymDot(t0)} 자료 → ${ymDot(end)}` };
    }).sort((a, b) => a.t0.localeCompare(b.t0));
  }
  const ppT = v => (v > 0 ? '+' : v < 0 ? '−' : '') + (Math.round(Math.abs(v) * 10) / 10).toFixed(1) + '%p';
  /* [자세히 보기] 한 줄: '2010.01~2021.10 자료 → 2023.10: 맞음 +1.3%p' */
  const trackRow = r => `${r.txt}: ${r.hit ? '맞음' : '틀림'} ${ppT(r.top20)}`;
  /* 첫 줄: '이 예측 방법을 과거에 그대로 써 봤더니 4번 중 4번 맞았어요. (예: 2010년 1월~2021년 자료만으로 2023년을 예측 → 실제로 점수 상위 20% 단지가 같은 구 평균보다 더 올랐어요)'
     o = { from, what(주어, 기본 '이 예측 방법'), unit('단지'), base('같은 구 평균') } */
  function trackHead(m, h, o) {
    o = o || {};
    const R = trackRuns(m, h, o.from), n = ((m && m.oos_all) || []).length, hit = trackHit(m);
    const what = o.what || '이 예측 방법', unit = o.unit || '단지', base = o.base || '같은 구 평균';
    if (!n) return `${J(what, '은', '는')} 아직 과거에 써 볼 만큼 자료가 쌓이지 않았어요.`;
    let t = `${J(what, '을', '를')} 과거에 그대로 써 봤더니 ${n}번 중 ${hit}번 맞았어요.`;
    const ex = R.filter(r => r.hit).pop() || R[R.length - 1];
    if (ex) {
      const f = fromOf(m, o.from);
      t += ` (예: ${f && f < ex.t0 ? `${ymKoM(f)}~${ex.t0.slice(0, 4)}년` : `~${ex.t0.slice(0, 4)}년`} 자료만으로 ${ex.end.slice(0, 4)}년을 예측 → 실제로 점수 상위 20% ${J(unit, ex.hit ? '이' : '은', ex.hit ? '가' : '는')} ${base}보다 ${ex.hit ? '더' : '덜'} 올랐어요)`;
    }
    return t;
  }
  /* 결론에서 뺀 기간: '1년 전망: 과거에 써 봤을 때 8번 중 2번만 맞아 참고로만 보여 드려요.' */
  function trackRef(m, h, o) {
    o = o || {};
    const n = ((m && m.oos_all) || []).length, hit = trackHit(m), lab = o.label || `${h}년 전망`;
    if (!n) return `${lab}: 아직 과거에 써 볼 만큼 자료가 쌓이지 않아 참고로만 보여 드려요.`;
    if (n === 1) return `${lab}: 과거에 써 볼 수 있었던 때가 1번뿐이라 참고로만 보여 드려요.`;
    if (2 * hit >= n) return `${lab}: 과거에 써 봤을 때 ${n}번 중 ${hit}번 맞았지만 평균으로는 ${o.base || '같은 구 평균'}보다 덜 올라 참고로만 보여 드려요.`;
    return `${lab}: 과거에 써 봤을 때 ${n}번 중 ${hit}번만 맞아 참고로만 보여 드려요.`;
  }
  /* 짧은 표기(표 칸·배지): '과거 4번 중 4번 맞음' · '과거 8번 중 2번만 맞음 · 참고만' */
  function hzLabel(m) {
    const n = ((m && m.oos_all) || []).length, hit = trackHit(m) || 0;
    if (VOK(m)) return `과거 ${n}번 중 ${hit}번 맞음`;
    if (n === 0) return '과거 결과 없음 · 참고만';
    if (n === 1) return '과거 결과 1번뿐 · 참고만';
    return `과거 ${n}번 중 ${hit}번${2 * hit < n ? '만' : ''} 맞음 · 참고만`;
  }
  /* 접는 상자 '이 점수 방식을 믿을 수 있나요?' 본문 */
  function checkText(m, h, G, o) {
    const O = (m && m.oos_all) || [];
    const tail = '같은 구 평균과 비교한 순위라, 시장 전체가 내리면 점수가 높은 단지도 내릴 수 있어요.';
    if (!O.length) return `${h}년 점수는 아직 과거에 써 볼 만큼 자료가 쌓이지 않아 참고만 해 주세요. ` + tail;
    return trackHead(m, h, o) + (m.oos_avg != null ? ` 평균으로는 ${more(m.oos_avg, G)} 올랐어요.` : '') + ' ' + tail;
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
  /* 같은 조건(링·단계·점수 반영 여부)의 지구가 여러 곳이면 한 줄로 묶어 과거 통계 문장은 한 번만 */
  function supplyLines(f, SP, G) {
    const out = [];
    if (!f || !f.sl || !SP || !SP.zones) return out;
    const groups = new Map();
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
      const key = z.st === 3 ? 'move' : z.st === 2 ? 'sale' : 'ann', gk = [head, ring, key, sc ? 1 : 0].join('|');
      if (!groups.has(gk)) groups.set(gk, { head, ring, key, sc, zs: [], c: false });
      const g = groups.get(gk);
      g.zs.push(`${z.n} ${unitsKo(z.u)} 가구 — ${hist.concat([mv]).join(' → ')}`);
      if (ring === 'n' && z.st >= 2 && !z.x) g.c = true;
    }
    for (const g of groups.values()) {
      const many = g.zs.length > 1;
      let t = many ? `${g.head} ${g.zs.length}곳: ${g.zs.join('; ')}.` : `${g.head}: ${g.zs[0]}.`;
      const R = SP.ring && SP.ring[g.ring === 'n' ? 'near' : 'life'] && SP.ring[g.ring === 'n' ? 'near' : 'life'][g.key];
      if (R && R.n >= 3 && R.ex != null)
        t += ` 과거 비슷한 단계(${g.key === 'move' ? '첫 입주' : g.key === 'sale' ? '분양·착공' : '발표·지구 지정'})의 대규모 공급 ${g.ring === 'n' ? '가까이' : '같은 생활권'}에 있던 단지는 이후 2년 같은 구 평균보다 ${Math.abs(R.ex) < 0.05 ? '거의 같게' : '평균 ' + more(R.ex, G)} 올랐어요(사례 ${R.n}건${R.sig ? '' : ', 차이가 뚜렷하지는 않아요'}).`;
      t += g.sc ? ` ${many ? '모두 ' : ''}점수에 반영돼요.` : (g.ring === 'n' ? ' 점수에는 넣지 않았어요(점수는 더 가까운 지구만 반영) · 참고 정보.' : ' 점수에는 아직 넣지 않았어요(과거 영향이 뚜렷하지 않아서) · 참고 정보.');
      out.push([g.c ? 'c' : 'f', t]);
    }
    return out;
  }

  /* ---------- 점수를 움직인 요인(fx.why · fx.whyv) → 숫자 근거 문장 ----------
     엔진 fx.why[보유 년] = ['mom+', 'reg-', …](방향·기여 큰 순, 가중치 없음), fx.whyv[지표] = [이 단지 값, 같은 구 중간값, 같은 시·도 백분위] (예전 이름 wf — 직전 공개본 호환)
     o = {h:'2', apt, dong, sgg(구 이름), sido(짧은 시·도 이름), sid, ev(evidence.json), G, rp(regionPlace 결과), regionUsed(bool), sp(supply.json)}
     → {items:[{dir:'up'|'dn', k, name, t, ev}], keys:Set} — 점수가 낮으면 내린 요인 먼저, 방향별 최대 3개.
     - 사실값을 댈 수 없는 요인은 싣지 않는다(이름만 나열하지 않음).
     - 과거 통계(evidence.json)는 방향이 같고 차이가 뚜렷할 때만 붙인다. 방향이 다르면 통계도 '경우가 많았어요' 설명도 붙이지 않는다. */
  const WHY_NAME = { mom: '최근 6개월 가격 흐름', mom2: '최근 가격 변동 폭', rel: '같은 구 안 가격 수준', liq: '거래량', size: '단지 규모', sch: '학군(가까운 중학교 전입)',
    jr: '전세가율', dd: '하락기 방어', rc: '예전 최고가 회복', lg: '동네 대장 단지 대비 가격', sub: '지하철역까지 거리', new: '신축', old: '재건축 연한', vlo: '재건축 사업성(용적률)',
    land: '재건축 사업성(대지지분)', stg: '재건축 진행 단계', rlp: '신설역 계획', rls: '신설역 공사', rlo: '신설역 개통', rld: '신설역 개통 지연',
    spa: '주변 공공택지 발표', sps: '주변 공공택지 분양·착공', spm: '주변 신도시 입주', spw: '생활권 대규모 공급', reg: '지역 흐름' };
  const WHY_EV = { mom: 'mom', rel: 'rel', sch: 'sch', jr: 'jr', dd: 'dd', rc: 'rc', lg: 'lg', stg: 'stg', rlp: 'rail', rls: 'rail', rlo: 'rail' };
  function whyItems(f, o) {
    const out = { items: [], keys: new Set() };
    if (!f || !f.why) return out;
    const h = String(o.h || '2'), w = f.why[h] || (h === '2' ? null : f.why['2']);
    const H = f.why[h] ? h : '2';
    if (!w || !w.length) return out;
    const WF = f.whyv || f.wf || {}, G = o.G, SD = o.sido || '', SG = o.sgg || '이 구', A = J(o.apt || '이 단지', '은', '는');
    const sg = v => (v > 0 ? '+' : v < 0 ? '−' : '') + (Math.round(Math.abs(v) * 1000) / 10).toFixed(1) + '%';
    const p1 = v => (Math.round(Math.abs(v) * 1000) / 10).toFixed(1);
    const n0 = v => Number(v).toLocaleString('ko-KR');
    const qb = k => (f.eb && f.eb[k] != null && /^[0-4]$/.test(String(f.eb[k]))) ? +f.eb[k] : null;
    /* 같은 시·도 안 위치: 엔진 백분위(wf) → 없으면 5분위(eb) */
    const pos = (k, what) => {
      const x = WF[k];
      if (x && x[2] != null) return `${SD} 단지 중 ${what} ${topPct(x[2])}`;
      const b = qb(k); return b != null ? `${SD} 단지 중 ${what} ${Q5[b]}` : '';
    };
    const lvOf = k => { const x = WF[k]; const p = x && x[2] != null ? x[2] : (qb(k) != null ? qb(k) * 20 + 10 : null); return p == null ? '' : p >= 60 ? 'hi' : p <= 40 ? 'lo' : ''; };
    const gm = (k, fmt, unit) => { const x = WF[k]; return x && x[1] != null ? `${SG} 단지 중간값 ${fmt(x[1])}${unit || ''}` : ''; };
    const val = (k, raw) => (WF[k] && WF[k][0] != null) ? WF[k][0] : raw;
    const wrap = (main, extra) => main + (extra.filter(Boolean).length ? ` — ${extra.filter(Boolean).join(', ')}` : '');
    const ageNow = f.by ? ageOf(f.by, o.year) : null;
    /* 지표별 사실 문장 + 수준(hi/lo) + 수준·방향별 쉬운 설명 */
    const FACT = {
      mom: () => { const v = val('mom', f.mom); if (v == null) return null;
        const t = `${A} 최근 6개월 ${G ? G('평당') : '평당'} 시세가 그 전 6개월보다 ` + (Math.abs(v) < 0.005 ? `거의 그대로예요(${sg(v)})` : `${p1(v)}% ${v > 0 ? '올랐어요' : '내렸어요'}`);
        return { t: wrap(t, [gm('mom', sg), pos('mom', '상승 폭')]), lv: lvOf('mom'),
          r: { lo_up: '덜 오른 단지는 이후 따라 오르는 경우가 많았어요', hi_dn: '짧은 기간 많이 오른 단지는 이후 쉬어 가는 경우가 많았어요',
               hi_up: '오르는 흐름이 이어지는 경우가 많았어요', lo_dn: '약한 흐름이 이어지는 경우가 많았어요' } }; },
      mom2: () => { const v = val('mom2', f.mom != null ? Math.abs(f.mom) : null); if (v == null) return null;
        return { t: wrap(`${A} 최근 6개월 시세 변동 폭이 ${p1(v)}%예요`, [pos('mom2', '변동 폭')]), lv: lvOf('mom2'),
          r: { hi_dn: '짧은 기간 크게 움직인 단지는 이후 되돌림이 있는 경우가 많았어요', lo_up: '시세가 안정적인 단지가 이후 더 오른 경우가 많았어요' } }; },
      rel: () => { const v = WF.rel ? WF.rel[0] : null, b = qb('rel'); let t;
        if (v != null) t = `${A} ${G ? G('평당') : '평당'} 시세가 ${SG} 전체 거래 ${G ? G('중간값') : '중간값'}보다 ` + (Math.abs(v) < 0.03 ? '비슷해요' : `${Math.round(Math.abs(v) * 100)}% ${v > 0 ? '높아요' : '낮아요'}`);
        else if (b != null) t = `${A} ${SG} 안에서 비싼 편인지 보면 ${SD} 단지 중 ${Q5[b]}에 들어요`;
        else return null;
        return { t: v != null ? wrap(t, [pos('rel', '구 대비 가격')]) : t, lv: lvOf('rel'),
          r: { hi_up: '구 안에서 비싼 단지는 이후에도 더 오르는 경우가 많았어요', lo_dn: '구 안에서 싼 단지는 이후에도 덜 오르는 경우가 많았어요',
               hi_dn: '구 안에서 이미 비싼 단지는 오름폭이 작은 경우가 많았어요', lo_up: '구 안에서 싼 단지는 격차를 좁히며 오르는 경우가 많았어요' } }; },
      sch: () => { const v = val('sch', f.sch); if (v == null) return null;
        const p = v * 100, nm = f.schn && f.schn.length ? `(${f.schn.join('·')})` : '';
        const t = `가까운 중학교${nm}는 ` + (Math.abs(p) < 0.5 ? '전학 온 학생과 떠난 학생이 비슷해요' : p > 0 ? '전학 온 학생이 떠난 학생보다 많아요' : '떠난 학생이 전학 온 학생보다 많아요')
          + `. ${G ? G('순전입률') : '순전입률'} ${p > 0 ? '+' : p < 0 ? '−' : ''}${Math.abs(Math.round(p * 10) / 10)}%`;
        return { t: wrap(t, [gm('sch', x => (x > 0 ? '+' : x < 0 ? '−' : '') + Math.abs(Math.round(x * 1000) / 10) + '%'), pos('sch', '순전입')]), lv: Math.abs(p) < 0.5 ? '' : lvOf('sch'),
          r: { hi_up: '학생이 모이는 학교 주변은 집 수요가 꾸준한 경우가 많았어요', lo_dn: '학생이 빠지는 학교 주변은 집 수요가 약해지는 경우가 많았어요' } }; },
      jr: () => { const v = val('jr', f.jr); if (v == null) return null;
        return { t: wrap(`${A} ${G ? G('전세가율') : '전세가율'}이 ${Math.round(v * 100)}%예요`, [gm('jr', x => Math.round(x * 100), '%'), pos('jr', '전세가율')]), lv: lvOf('jr'),
          r: { lo_up: '전세가율이 낮은 단지는 이후 더 오른 경우가 많았어요', hi_dn: '전세가율이 높은 단지는 이후 덜 오른 경우가 많았어요',
               hi_up: '전세가율이 높으면 실거주 수요가 받쳐 주는 경우가 많았어요', lo_dn: '전세가율이 낮으면 실거주 수요가 약한 경우가 많았어요' } }; },
      dd: () => { const v = val('dd', f.dd); if (v == null) return null;
        return { t: wrap(ddText(v, G, `${A} `), [pos('dd', '하락기 방어')]), lv: v >= 0.03 ? 'hi' : v <= -0.03 ? 'lo' : lvOf('dd'),
          r: { lo_up: '하락기에 많이 내린 단지는 이후 회복하며 더 오르는 경우가 많았어요', hi_dn: '하락기에 덜 내린 단지는 이후 회복 폭이 작은 경우가 많았어요',
               hi_up: '하락기에 잘 버틴 단지는 이후에도 강한 경우가 많았어요', lo_dn: '하락기에 많이 내린 단지는 이후에도 약한 경우가 많았어요' } }; },
      rc: () => { const ps = pos('rc', '회복 정도'); if (!ps) return null;
        return { t: `${A} 직전 최고가에서 내린 뒤 회복한 정도가 ${ps.replace(' 회복 정도', '')}예요`, lv: lvOf('rc'),
          r: { lo_up: '덜 회복한 단지는 이후 따라 오르는 경우가 많았어요', hi_dn: '이미 많이 회복한 단지는 이후 오름폭이 작은 경우가 많았어요',
               hi_up: '회복이 빠른 단지는 이후에도 강한 경우가 많았어요', lo_dn: '회복이 더딘 단지는 이후에도 약한 경우가 많았어요' } }; },
      lg: () => { const v = val('lg', f.lg); if (v == null) return null;
        const t = (v >= 0.995 || (f.ln && f.ln === o.apt)) ? `${A} ${o.dong || '같은 동'} 대장 단지예요(같은 평형끼리 비교해 동에서 가장 비싸게 거래)`
          : `${A} 같은 평형 기준 시세가 ${o.dong || '같은 동'} 대장 단지${f.ln ? `(${f.ln})` : ''}보다 ${Math.round((1 - v) * 100)}% 낮아요`;
        return { t, lv: v >= 0.95 ? 'hi' : lvOf('lg'),
          r: { hi_up: '동네 대장급 단지는 수요가 먼저 몰리는 경우가 많았어요', lo_up: '대장 단지와 차이가 큰 단지는 차이를 좁히며 오르는 경우가 많았어요',
               hi_dn: '대장급 단지는 이미 비싸 오름폭이 작은 경우가 많았어요', lo_dn: '대장 단지와 차이가 큰 단지는 차이가 이어지는 경우가 많았어요' } }; },
      liq: () => { const x = WF.liq; if (!x || x[0] == null) return null;
        return { t: wrap(`${A} 최근 2년 이 평형 실거래가 ${n0(x[0])}건이에요`, [gm('liq', n0, '건')]), lv: lvOf('liq'),
          r: { hi_up: '거래가 꾸준한 단지는 오름세를 잘 따라가는 경우가 많았어요', lo_dn: '거래가 적은 단지는 오름세를 덜 타는 경우가 많았어요' } }; },
      size: () => { const v = val('size', f.hh); if (!v) return null;
        return { t: wrap(`${A} ${n0(v)}세대예요`, [gm('size', n0, '세대')]), lv: WF.size ? lvOf('size') : v >= 1000 ? 'hi' : v < 300 ? 'lo' : '',
          r: { hi_up: '대단지는 수요가 꾸준한 경우가 많았어요', lo_dn: '소규모 단지는 수요가 얇은 경우가 많았어요' } }; },
      sub: () => { const v = val('sub', f.sub); if (v == null) return null;
        const t = v >= 30 ? '지하철역이 걸어가기엔 멀어요(도보 20분 넘게)' : `${f.subs ? f.subs.replace(/\s+/g, ' ') : '지하철역'}까지 도보 ${v <= 5 ? '5분 이내' : v + '분 이내'}예요`;
        return { t, lv: v <= 10 ? 'hi' : v >= 20 ? 'lo' : '',
          r: { hi_up: '역이 가까운 단지는 수요가 꾸준한 경우가 많았어요', lo_dn: '역이 먼 단지는 수요가 약한 경우가 많았어요' } }; },
      new: () => { if (ageNow == null || ageNow > 10) return null;
        return { t: `${A} ${ageText(f.by, o.year, '준공')} 새 아파트예요`, lv: 'hi', r: { hi_up: '새 아파트는 수요가 몰리는 경우가 많았어요' } }; },
      old: () => { if (ageNow == null || ageNow < 25) return null;
        return { t: `${A} ${ageText(f.by, o.year, '준공')}로 재건축을 추진할 수 있는 나이(30년)${ageNow >= 30 ? '가 됐어요' : `까지 ${30 - ageNow}년 남았어요`}`, lv: 'hi',
          r: { hi_up: '재건축 기대가 가격에 반영되는 경우가 많았어요' } }; },
      vlo: () => { const v = val('vlo', f.vl); if (!v) return null;
        return { t: `${A} 용적률이 약 ${Math.round(v)}%예요`, lv: v <= 200 ? 'hi' : v >= 250 ? 'lo' : '',
          r: { hi_up: '용적률이 낮을수록 재건축 때 더 지을 여지가 커요', lo_dn: '용적률이 높아 재건축 때 더 지을 여지가 작아요' } }; },
      land: () => { const v = val('land', f.landavg); if (!v) return null;
        return { t: wrap(`${A} 세대당 평균 대지지분이 ${v}평이에요`, [gm('land', x => x, '평')]), lv: lvOf('land'),
          r: { hi_up: '대지지분이 클수록 재건축 사업성이 좋아요', lo_dn: '대지지분이 작으면 재건축 사업성이 낮은 편이에요' } }; },
      stg: () => { const z = f.rz;
        if (z && z.lv) return { t: `${A} 재건축 ${STAGE[z.lv] || z.lv + '단계'} 단계예요`, lv: 'hi', r: { hi_up: '재건축 단계가 나아갈수록 가격에 반영되는 경우가 많았어요' } };
        if (ageNow != null && ageNow >= 25) return { t: `${A} 지은 지 25년이 넘었지만 아직 정비구역이 아니에요`, lv: 'lo', r: { lo_dn: '재건축 단계에 들어선 단지보다 기대가 덜 반영되는 경우가 많았어요' } };
        return null; },
      rail: k => { const R = f.rl; if (!R || R.x) return null;
        const st = R.opened ? 'open' : /^start/.test(R.stage || '') ? 'build' : R.stage === 'plan' ? 'plan' : '';
        if ((k === 'rlo' && st !== 'open') || (k === 'rls' && st !== 'build') || (k === 'rlp' && st !== 'plan') || (k === 'rld' && !(R.dl || R.delays))) return null;
        const SK = { open: `${ymKo(R.stym)} 개통`, build: '공사 중', plan: '계획 확정, 착공 전' };
        const t = `${A} ${R.line} ${R.pl ? `${/역$/.test(R.st || '') ? R.st : R.st + '역'}(개통 예정)` : R.st}${R.m != null ? (R.pl ? ` · 예정 위치 기준 약 ${n0(R.m)}m 거리` : `까지 직선 ${n0(R.m)}m`) : ' 인근'}예요 — ${SK[st] || '진행 중'}`
          + (R.dl ? `, ${delayText(R.dl, '개통')}` : R.target && st !== 'open' ? `, 개통 목표 ${ymKo(R.target)}` : '')
          + (R.pre != null && R.first ? `. ${ymKo(R.first)} 발표 이후 ${o.apt || '이 단지'} 시세는 구 평균보다 ${Math.abs(R.pre)}% ${R.pre >= 0 ? '더' : '덜'} 올랐어요` : '');
        const RR = { rlp: { hi_up: '신설역 계획이 확정되면 기대가 가격에 먼저 반영되는 경우가 많았어요', hi_dn: '계획 단계에서는 기대가 먼저 반영된 뒤 주춤한 경우가 많았어요' },
          rls: { hi_up: '공사 중인 신설역 주변은 개통 기대가 가격에 반영되는 경우가 많았어요' },
          rlo: { hi_dn: '개통 뒤에는 기대가 이미 가격에 들어가 오름폭이 작은 경우가 많았어요', hi_up: '개통 뒤 실제로 편해진 만큼 수요가 늘어난 경우가 많았어요' },
          rld: { hi_dn: '개통이 늦어지면 기대가 줄어드는 경우가 많았어요' } };
        return { t, lv: 'hi', r: RR[k] || {} }; },
      sup: k => { let nm = '', u = 0, near = '';
        if (k === 'spw') { const z = f.sl && f.sl[0] && o.sp && o.sp.zones && o.sp.zones[f.sl[0][0]]; if (z) { nm = z.n; u = z.u; near = '같은 생활권에'; } }
        else if (f.sp && f.sp[0]) { nm = f.sp[0][0]; u = f.sp[0][1]; near = '주변 5km 안에'; }
        if (!nm) return null;
        const SG2 = { spa: '발표된', sps: '분양·착공한', spm: '입주가 시작된', spw: '진행 중인' };
        return { t: `${A} ${near} ${SG2[k] || ''} 대규모 공급 ${nm}${u ? `(약 ${unitsKo(u)} 가구)` : ''}이 있어요`, lv: 'hi',
          r: { hi_dn: '주변 대규모 공급은 이후 가격 오름폭을 누르는 경우가 많았어요' } }; },
      reg: () => { const rp = o.rp; if (!rp) return null;
        /* 지역 점수를 움직인 주된 이유 한 문장(지역 흐름 문단과 같은 사실값) — 순위 쪽과 방향이 같을 때만 */
        let rw = '';
        const NR = root.JDJ_NAR, gw = o.IX && o.code && o.ev && NR && NR.guWhy && (rp.pos === '하위권' || rp.pos === '상위권') ? NR.guWhy({ IX: o.IX, code: o.code, gs: f.gs, EV: o.ev, f, PL: root.JDJ_PLAIN }) : null;
        if (gw && gw.so) rw = gw.text.replace(/[.]$/, '');
        else if (o.IX && o.code) { const rg = regionText(f, o.IX, o.code, null); if (rg.real && rg.why[0] && (rp.pos === '하위권' || rp.pos === '상위권')) rw = '주된 이유는 ' + rg.why[0].replace(/[.]$/, ''); }
        const t = `${J(SG, '은', '는')} 앞으로 2년 지역 흐름 점수가 ${rp.text}예요` + (rw ? `. ${rw}` : '') + (f.fvg != null ? `. ${o.apt || '이 단지'} 자체는 ${SG} 안에서 ${topPct(f.fvg)}지만, 미래가치 점수는 지역 흐름까지 더해 ${SD} 전체 단지와 비교해요` : '');
        return { t, lv: rp.pos === '하위권' ? 'lo' : rp.pos === '상위권' ? 'hi' : '', r: {} }; }
    };
    const factOf = k => FACT[k] ? FACT[k](k) : /^rl[psod]$/.test(k) ? FACT.rail(k) : /^sp[asmw]$/.test(k) ? FACT.sup(k) : null;
    let tags = w.slice();
    /* 예전 자료(지역 흐름 항목 없음): 단지 점수와 지역 흐름을 합친 순위(fv)가 구 안 순위(fvg)보다 크게 낮/높으면 지역 흐름을 맨 앞 요인으로 */
    if (H === '2' && o.regionUsed && o.rp && !tags.some(t => t.startsWith('reg')) && f.fv != null && f.fvg != null && f.gs != null) {
      if (f.fv - f.fvg <= -15 && f.gs < 50) tags.unshift('reg-');
      else if (f.fv - f.fvg >= 15 && f.gs > 50) tags.unshift('reg+');
    }
    const items = { up: [], dn: [] }, seen = new Set();
    for (const tag of tags) {
      const k = tag.slice(0, -1), dir = tag.endsWith('+') ? 'up' : 'dn';
      if (seen.has(k) || items[dir].length >= 3) continue;
      const F = factOf(k); if (!F || !F.t) continue;
      seen.add(k);
      let e = null, agree = null;
      const ek = WHY_EV[k];
      if (ek && o.ev && o.sid) {
        const x = evid(o.ev, o.sid, f.eb, ek, SD, G);
        if (x) { agree = Math.sign(x.ex) === (dir === 'up' ? 1 : -1); if (agree && Math.abs(x.ex) >= 0.5) e = x; }
      }
      const why = agree === false ? '' : (F.lv && F.r[`${F.lv}_${dir}`]) || '';
      const t = `${F.t}.` + (why ? ` ${why}.` : '') + ` → ${H}년 점수를 ${dir === 'up' ? '올렸어요' : '낮췄어요'}.`;
      items[dir].push({ dir, k, name: WHY_NAME[k] || k, t, ev: e });
    }
    const sc = H === '2' ? f.fv : (f.fh && f.fh[H]);
    out.items = (sc != null && sc < 50) ? items.dn.concat(items.up) : items.up.concat(items.dn);
    out.h = H;
    for (const it of out.items) out.keys.add(it.k);
    return out;
  }
  /* 보유 기간별 순위가 크게 엇갈릴 때(2년 vs 다른 기간, 30%p 이상) 이유 한 줄 — 데이터로 확인되는 이유만, 없으면 ''.
     확인하는 이유: ① 2년 점수에만 구 지역 흐름이 더해짐(엔진: 2년 = 단지 점수 + 구 점수, 다른 기간 = 단지 점수만)
     ② 2년 점수를 움직인 최근 6개월 흐름이 그 기간 요인에는 없음 ③ 그 기간에 새로 크게 작용한 요인(fx.why[기간]) — 사실값을 댈 수 있는 것만
     o = whyItems 와 같은 값 + hs(비교할 기간, 기본 [3, 5, 7, 1]) */
  function hzGapLine(f, o) {
    if (!f || f.fv == null || !f.fh) return '';
    const hs = o.hs || [3, 5, 7, 1], SD = o.sido || '', SG = o.sgg || '이 구';
    const L = hs.find(h => f.fh[h] != null && Math.abs(f.fh[h] - f.fv) >= 30 && (!o.hzOk || o.hzOk[h]));
    if (L == null) return '';
    const up = f.fh[L] > f.fv, out = [];
    /* ① 지역 흐름 */
    const rp = o.rp;
    if (o.regionUsed !== false && rp && f.gs != null && f.fvg != null && (up ? (f.gs < 50 && f.fv < f.fvg) : (f.gs > 50 && f.fv > f.fvg)))
      out.push(`2년 점수에는 ${SG} 지역 흐름(${rp.text})이 더해져 ${up ? '낮아졌고' : '높아졌고'}, ${L}년 점수는 단지 자체 요인으로만 매겨요`);
    /* ② 최근 6개월 흐름이 2년에만 크게 작용 */
    const w2 = (f.why && f.why['2']) || [], wL = (f.why && f.why[String(L)]) || [], m = f.mom;
    if (m != null && Math.abs(m) >= 0.03) {
      if (up && w2.includes('mom-') && !wL.includes('mom-') && m > 0) out.push(`최근 6개월 시세가 ${Math.round(m * 1000) / 10}% 올라 2년 안에는 쉬어 갈 가능성이 크게 잡혔어요`);
      if (!up && w2.includes('mom+') && !wL.includes('mom+') && m < 0) out.push(`최근 6개월 시세가 ${Math.round(-m * 1000) / 10}% 내려 2년 안에 따라 오를 가능성이 크게 잡혔어요`);
    }
    /* ③ 그 기간에 새로 크게 작용한 요인 */
    const dir = up ? 'up' : 'dn', sg2 = new Set(w2.filter(t => t.endsWith(up ? '+' : '-')).map(t => t.slice(0, -1)));
    const it = whyItems(f, Object.assign({}, o, { h: String(L), ev: null })).items.find(x => x.dir === dir && !sg2.has(x.k) && x.k !== 'reg');
    if (it) out.push(`${L}년으로 보면 '${it.name}'${J(it.name, '이', '가').slice(it.name.length)} 점수를 ${up ? '올리는' : '내리는'} 쪽으로 더 크게 작용해요`);
    if (!out.length) return '';
    const A = o.apt || '이 단지';
    return `${J(A, '은', '는')} 2년 기준 ${SD} ${topPct(f.fv)}, ${L}년 기준 ${topPct(f.fh[L])}로 순위가 크게 달라요. ` + out.join('. ') + '.';
  }
  /* 요인 한 줄(목록용): '내린 요인 · 지역 흐름 — …' */
  const whyLine = it => `${it.dir === 'up' ? '올린 요인' : '내린 요인'} · ${it.name}: ${it.t}`;
  /* 프리미엄 표: 요인 | 방향 | 이 단지 | 같은 구 중간값 | 시·도 안 위치 — 엔진 사실값(wf)이 있는 요인만 */
  function whyTable(f, res, o, esc) {
    const WF = (f && (f.whyv || f.wf)) || {}, E = esc || (s => String(s));
    const fmt = (k, v) => v == null ? '-' : ['mom', 'mom2', 'sch'].includes(k) ? (k === 'mom2' ? '' : v > 0 ? '+' : v < 0 ? '−' : '') + (Math.round(Math.abs(v) * 1000) / 10).toFixed(1) + '%'
      : k === 'rel' ? (v > 0 ? '+' : v < 0 ? '−' : '') + Math.round(Math.abs(v) * 100) + '%' : ['jr', 'lg'].includes(k) ? Math.round(v * 100) + '%'
      : k === 'dd' || k === 'rc' ? (v > 0 ? '+' : v < 0 ? '−' : '') + Math.round(Math.abs(v) * 100) + '%p'
      : k === 'liq' ? Number(v).toLocaleString() + '건' : k === 'size' ? Number(v).toLocaleString() + '세대' : k === 'sub' ? v + '분'
      : k === 'new' || k === 'old' ? v + '년차' : k === 'vlo' ? Math.round(v) + '%' : k === 'land' ? v + '평' : String(v);
    const rows = (res.items || []).filter(it => WF[it.k]).map(it => { const x = WF[it.k];
      return `<tr><td>${E(it.name)}</td><td>${it.dir === 'up' ? '올림' : '내림'}</td><td class="num">${E(fmt(it.k, x[0]))}</td><td class="num">${E(it.k === 'rel' ? '기준' : fmt(it.k, x[1]))}</td><td class="num">${x[2] != null ? E(topPct(x[2])) : '-'}</td></tr>`; });
    if (!rows.length) return '';
    return `<table class="jp-why"><thead><tr><th>요인</th><th>점수</th><th>이 단지</th><th>${E(o.sgg || '같은 구')} 중간값</th><th>${E(o.sido || '')} 안 위치</th></tr></thead><tbody>${rows.join('')}</tbody></table>`;
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
      + '.jp-why{width:100%;border-collapse:collapse;margin:6px 0 12px;font-size:13px}.jp-why th,.jp-why td{border-bottom:1px solid #E5E8EB;padding:5px 6px;text-align:left}.jp-why th{color:#6B7684;font-weight:700}.jp-why .num{text-align:right;font-variant-numeric:tabular-nums}'
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
  /** v 의 k 번째 글자가 아직 닫히지 않은 괄호 안에 있는지 */
  function inParen(v, k) { let d = 0; for (let j = 0; j < k; j++) { const c = v.charAt(j); if (c === '(') d++; else if (c === ')' && d > 0) d--; } return d > 0; }
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
        else {
          /* 이미 괄호 안에 있는 낱말(예: '입주권(현금청산) 위험')에는 풀이를 또 붙이지 않음 — '입주권(현금청산(…))'처럼 괄호가 겹쳐 보이던 문제. 괄호 밖 다음 등장을 찾음 */
          for (let k = v.indexOf(t); k >= 0; k = v.indexOf(t, k + 1)) { if (!inParen(v, k)) { i = k; break; } }
        }
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

  /* ---------- 누르면 바로 아래 설명 상자가 열리는 용어 (분석 설명 등) ----------
     어려운 용어 밑에 점선, 누르면(휴대폰 탭·PC 클릭 같음) 그 문단 바로 아래 작은 설명 상자. 한 번에 하나만 열림.
     같은 묶음(blockSel 로 고른 문단) 안에서 용어마다 처음 한 번만 표시. onOpen(용어) 로 집계 연결. */
  const TIP = {
    '%p': '두 비율의 차이예요. 예를 들어 5% 오른 곳과 3% 오른 곳의 차이는 2%p예요.',
    '전세가율': '집값 대비 전셋값 비율이에요. 10억 집의 전세가 6억이면 60%예요. 높을수록 실제로 살려는 수요가 받쳐 준다고 봐요.',
    '평당': '전용면적 3.3㎡(1평)당 가격이에요. 크기가 다른 집을 같은 기준으로 비교할 때 써요.',
    '중간값': '여러 값을 크기순으로 늘어놓았을 때 가운데 값이에요. 아주 비싸거나 싼 몇 곳에 덜 흔들려요.',
    '상위': '같은 지역 단지를 점수 순으로 순위를 매겼을 때의 자리예요. 상위 10%면 100곳 중 10등 안쪽이에요.',
    '하위': '같은 지역 단지를 점수 순으로 순위를 매겼을 때의 자리예요. 하위 10%면 100곳 중 뒤에서 10등 안쪽이에요.',
    '과거에 써 봤더니': '과거 어느 때로 돌아가 그때까지의 자료만으로 순위를 매긴 뒤, 몇 년 뒤 실제 시세와 맞춰 본 결과예요.',
    '갭': '집값과 전셋값의 차이예요. 전세를 끼고 살 때 내 돈이 드는 만큼이에요.'
  };
  const TIP_RE = [['%p', /\d%p/], ['전세가율', /전세가율/], ['평당', /평당/], ['중간값', /중간값/], ['상위', /상위 \d+(~\d+)?%/], ['하위', /하위 \d+(~\d+)?%/], ['과거에 써 봤더니', /과거에 (그대로 )?써 봤더니/], ['갭', /갭/]];
  function tipDom(el, o) {
    if (!el || !root.document) return;
    o = o || {}; const doc = root.document, T = Object.assign({}, TIP, o.terms || {});
    if (!doc.getElementById('jp-tip-css')) {
      const st = doc.createElement('style'); st.id = 'jp-tip-css';
      st.textContent = '.jp-tip{all:unset;cursor:pointer;border-bottom:1.5px dotted #8A84E0;color:inherit;font:inherit;line-height:inherit}.jp-tip:focus-visible{outline:2px solid #4338CA;outline-offset:1px}.jp-tip[aria-expanded="true"]{background:#F3E7C2}'
        + '.jp-tipbox{margin:6px 0 4px;padding:8px 10px;background:#F5F4FD;border:1px solid #D4D1F5;border-radius:8px;font-size:13px;line-height:1.6;color:#3E4754;font-weight:500;word-break:keep-all}.jp-tipbox b{color:#3730A3;margin-right:4px}';
      (doc.head || doc.documentElement).appendChild(st);
    }
    const blocks = o.blockSel ? el.querySelectorAll(o.blockSel) : [el];
    blocks.forEach(b => {
      if (b.__tip) return; b.__tip = true;
      const left = new Set(TIP_RE.map(r => r[0]).filter(k => T[k]));
      const walker = doc.createTreeWalker(b, 4, { acceptNode: n => { const p = n.parentElement; if (!p || p.closest('.jp-tip,.jp-tipbox,button,script,style')) return 2; return 1; } });
      const nodes = []; let n; while ((n = walker.nextNode())) nodes.push(n);
      for (const node of nodes) {
        let cur = node;
        for (const [k, re] of TIP_RE) {
          if (!left.has(k) || !cur || !cur.nodeValue) continue;
          const m = re.exec(cur.nodeValue); if (!m) continue;
          left.delete(k);
          let i = m.index, len = m[0].length;
          if (k === '%p') { i = m.index + 1; len = 2; }
          const mid = cur.splitText(i), rest = mid.splitText(len);
          const bt = doc.createElement('button'); bt.type = 'button'; bt.className = 'jp-tip'; bt.dataset.tip = k; bt.setAttribute('aria-expanded', 'false'); bt.textContent = mid.nodeValue;
          mid.parentNode.replaceChild(bt, mid); cur = rest;
          /* 버튼 앞뒤에 붙은 글자(숫자·조사·괄호)와 떨어져 줄이 바뀌지 않게 한 덩어리로 묶음 (예: '5.5' + '%p', '전세가율' + '은') */
          const pv = bt.previousSibling, pm = pv && pv.nodeType === 3 ? /[^\s]{1,12}$/.exec(pv.nodeValue) : null, nm = /^[^\s]{1,6}/.exec(rest.nodeValue || '');
          if (pm || nm) {
            const sp = doc.createElement('span'); sp.style.whiteSpace = 'nowrap';
            bt.parentNode.insertBefore(sp, bt);
            if (pm) sp.appendChild(pv.splitText(pm.index));
            sp.appendChild(bt);
            if (nm) { const r2 = rest.splitText(nm[0].length); sp.appendChild(rest); cur = r2; }
          }
        }
      }
    });
    if (el.__tipBound) return; el.__tipBound = true;
    el.addEventListener('click', e => {
      const bt = e.target.closest('.jp-tip'); if (!bt || !el.contains(bt)) return;
      e.preventDefault(); e.stopPropagation();
      const open = bt.getAttribute('aria-expanded') === 'true';
      el.querySelectorAll('.jp-tipbox').forEach(x => x.remove());
      el.querySelectorAll('.jp-tip[aria-expanded="true"]').forEach(x => x.setAttribute('aria-expanded', 'false'));
      if (open) return;
      const blk = bt.closest(o.blockSel || 'p,li,div') || bt.parentNode;
      const box = doc.createElement('div'); box.className = 'jp-tipbox'; box.setAttribute('role', 'note');
      const kb = doc.createElement('b'); kb.textContent = bt.dataset.tip === '%p' ? '%p' : bt.dataset.tip; box.appendChild(kb); box.appendChild(doc.createTextNode(T[bt.dataset.tip] || ''));
      blk.insertAdjacentElement('afterend', box); bt.setAttribute('aria-expanded', 'true');
      if (o.onOpen) try { o.onOpen(bt.dataset.tip); } catch (_) { }
    });
  }

  root.JDJ_PLAIN = { TIP, tipDom, inParen, ageOf, ageLabel, ageText, scParts, scText, popLines, STAGE, GL_PAGE, glossDom, autoGloss, gloss, J, won, eokR, rank, more, regionInfo, rankBase, regionRank, regionPlace, topPct, regionText, regionLine, evid, evHtml, ddText, rcText, momText, schText, stageName, rzText, jrStats, jrText, VOK, hzLabel, checkText, trackRuns, trackRow, trackHead, trackRef, ymNorm, easy, ymKo, spanKo, delayText, unitsKo, supplyLines, renewalLine, whyItems, whyLine, whyTable, hzGapLine };
})(typeof window !== 'undefined' ? window : globalThis);
