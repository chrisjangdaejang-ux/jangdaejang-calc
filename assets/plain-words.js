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

  /* 점수(0~100, 높을수록 상위) → '100곳 중 상위 N등쯤' */
  const rank = v => v >= 50 ? `100곳 중 상위 ${Math.max(1, 100 - v)}등쯤` : `100곳 중 하위 ${Math.max(1, v)}등쯤`;

  /* %p 차이 → '1.6%p 더' / '0.5%p 덜' */
  function more(ex, G, d) {
    if (Math.abs(ex) < 0.05) return '거의 같게';
    return `${Math.abs(ex).toFixed(d == null ? 1 : d)}${G ? G('%p') : '%p'} ${ex > 0 ? '더' : '덜'}`;
  }

  /* 시·도 안 지역 단위 개수와 이름 (index.json의 구·시 목록에서 계산) */
  function regionInfo(IX, code) {
    const g = (IX && IX.sgg && IX.sgg[code]) || {}, sido = g.sido || '';
    const list = Object.values((IX && IX.sgg) || {}).filter(v => v.sido === sido);
    const sd = ((IX && IX.sido) || []).find(s => s.name === sido);
    const unit = list.length && list.every(v => /구$/.test(v.name)) ? '구' : '시·군·구';
    return { n: list.length, unit, sido, short: (sd && sd.short) || sido, name: g.name || '' };
  }
  /* 지역 흐름 점수(gs, 높을수록 상위) → 약 N위, 상위권/중위권/하위권 */
  function regionRank(gs, n) {
    const r = Math.min(n, Math.max(1, Math.floor((100 - gs) / 100 * n + 0.5)));
    return { r, pos: r <= n / 3 ? '상위권' : (r > n * 2 / 3 ? '하위권' : '중위권') };
  }
  /* 지역 흐름 문장: {fact 사실, why 이유들, mean 해석, ref 참고 지표, real 실제 이유 여부}
     - index.json sgg[구].r(up/down: 지역 점수를 가장 많이 올린·내린 항목 이름)이 있으면 그 항목을 실제 이유로 쓰고,
       입주 물량·인구·미분양·일자리 중 up/down 에 없는 것은 '참고 지표'로 뒤에 둔다.
     - r 이 없으면(배포 전 자료) 예전처럼 why = 참고 지표 문장들, real = false */
  const pct1 = v => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(Math.round(v * 10) / 10).toFixed(1) + '%';
  function regionText(f, IX, code, G) {
    const ri = regionInfo(IX, code), out = { fact: '', why: [], mean: '', ref: [], real: false };
    let pos = '';
    if (f.gs != null && ri.n >= 3) {
      const rr = regionRank(f.gs, ri.n); pos = rr.pos;
      out.fact = `${ri.short} ${ri.n}개 ${ri.unit} 중 ${J(ri.name, '은', '는')} 앞으로 2년 지역 흐름 점수가 ${pos}이에요(약 ${rr.r}위).`;
      out.mean = pos === '하위권' ? `동네가 나쁘다는 뜻이 아니라, 앞으로 2년 오름폭이 ${ri.short} 다른 ${ri.unit}보다 작을 수 있다는 뜻이에요.`
        : pos === '상위권' ? '동네 전체 흐름이 단지 가격을 받쳐 줄 수 있다는 뜻이에요.' : '';
      out.pos = pos;
    }
    const p1 = v => Math.round(Math.abs(v) * 1000) / 10;
    const T = {
      sup: () => f.sup == null ? '' : f.sup < 0.0005 ? '앞으로 2년 새 아파트 입주 물량은 거의 없어요.' : `앞으로 2년 새 아파트 입주 물량이 기존 아파트의 ${Math.round(f.sup * 1000) / 10}%예요` + (f.sup >= 0.08 ? '(많은 편).' : f.sup <= 0.03 ? '(적은 편).' : '.'),
      pg: () => f.pg == null ? '' : Math.abs(f.pg) < 0.0005 ? '최근 1년 인구는 거의 그대로예요.' : `최근 1년 인구가 ${p1(f.pg)}% ${f.pg > 0 ? '늘었어요' : '줄었어요'}.`,
      un: () => f.un == null ? '' : `미분양 아파트는 ${f.un >= 0.01 ? '많은 편이에요' : f.un <= 0.002 ? '거의 없어요' : '보통이에요'}` + (f.unc > 0.001 ? '(1년 새 늘었어요).' : f.unc < -0.001 ? '(1년 새 줄었어요).' : '.'),
      jb: () => f.jb == null ? '' : Math.abs(f.jb) < 0.0005 ? '지역 일자리는 1년 새 거의 그대로예요.' : `지역 일자리가 1년 새 ${p1(f.jb)}% ${f.jb > 0 ? '늘었어요' : '줄었어요'}.`
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
          if (m != null && R.mom > m) { momHigh = d; return `최근 1년 ${unit} 전체 시세가 ${pct1(R.mom)}로 ${d ? '이미 많이 올랐어요' : '많이 올랐어요'}${cmp}.`; }
          if (R.mom < 0) return `최근 1년 ${unit} 전체 시세가 ${pct1(R.mom)}로 내렸어요${cmp}.`;
          return `최근 1년 ${unit} 전체 시세가 ${pct1(R.mom)}로 ${m != null && R.mom < m ? '덜 올랐어요' : '올랐어요'}${cmp}.`;
        }
        case '구 전세가율': {
          if (R.jr == null) return '';
          const m = SR.jr, lv = m == null ? '' : Math.abs(R.jr - m) < 2 ? '보통이에요' : R.jr < m ? '낮아요' : '높아요';
          let t = `${unit} 전체 ${G ? G('전세가율') : '전세가율'}이 ${Math.round(R.jr * 10) / 10}%${lv ? '로 ' + lv : '예요'}${m != null ? `(${ri.short} 중앙값 ${Math.round(m * 10) / 10}%)` : ''}.`;
          if (m != null && R.jr < m) lowJr = true;
          if (lowJr && R.rz != null && SR.rz != null && R.rz > SR.rz * 1.5 && R.rz >= 5)
            t += ` 다만 재건축 단지가 많은 ${unit}(재건축 단계 단지 ${Math.round(R.rz * 10) / 10}%, ${ri.short} 중앙값 ${Math.round(SR.rz * 10) / 10}%)는 전세가율이 낮게 나오기 쉬워요.`;
          return t;
        }
        case '향후 2년 입주 물량': used.add('sup'); return T.sup();
        case '인구 증가': used.add('pg'); return T.pg();
        case '세대수 증가': return `최근 1년 ${unit} 세대수 변화가 ${d ? '점수를 낮췄어요' : '점수를 높였어요'}.`;
        case '미분양 물량(재고 대비)': case '미분양 증감(1년)': if (used.has('un')) return ''; used.add('un'); return T.un();
        case '일자리 증가(1년)': used.add('jb'); return T.jb();
        case '일자리 밀집도(인구 대비)': return `인구 대비 일자리 수가 ${d ? '점수를 낮췄어요' : '점수를 높였어요'}.`;
        case '구 하락기 방어력': return `최근 하락기에 ${unit} 전체가 버틴 정도가 ${d ? '점수를 낮췄어요' : '점수를 높였어요'}.`;
        case '구 고점 회복률': return `${unit} 전체가 예전 최고가를 회복한 정도가 ${d ? '점수를 낮췄어요' : '점수를 높였어요'}.`;
        case '시·도 대비 가격 수준': return `${ri.short} 안에서 ${unit} 전체 가격 수준이 ${d ? '점수를 낮췄어요' : '점수를 높였어요'}.`;
        default: return '';
      }
    };
    /* 주된 쪽(하위권=내린 항목, 상위권=올린 항목)을 이유로, 반대쪽은 해석 뒤에 짧게 */
    const seen = new Set(), U = [], D = [];
    for (const nm of main) { if (seen.has(nm)) continue; seen.add(nm); const t = line(nm); if (t) (isDn(nm) ? D : U).push(t); }
    for (const k of ['sup', 'pg', 'un', 'jb']) if (!used.has(k)) { const t = T[k](); if (t) out.ref.push(t); }
    if (pos === '하위권' && momHigh) out.mean = `동네가 나쁘다는 뜻이 아니라, 최근 많이 오른 만큼 앞으로 2년 오름폭은 ${ri.short} 다른 ${ri.unit}보다 작을 수 있다는 뜻이에요.`;
    if (pos === '하위권') { out.why = D; out.other = U.length ? '반대로 점수를 받쳐 준 쪽: ' + U.join(' ') : ''; }
    else if (pos === '상위권') { out.why = U; out.other = D.length ? '다만 점수를 낮춘 쪽: ' + D.join(' ') : ''; }
    else { out.why = [U.length ? '점수를 올린 쪽: ' + U.join(' ') : '', D.length ? '점수를 낮춘 쪽: ' + D.join(' ') : ''].filter(Boolean); out.other = ''; }
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
  const ddText = (d, G) => `최근 3년 하락기에 구 평균보다 ${pp(d)}${G ? G('%p') : '%p'} ${d >= 0 ? '덜' : '더'} 내렸어요`;
  const rcText = (d, G) => `직전 최고가에서 내린 뒤 구 평균보다 ${pp(d)}${G ? G('%p') : '%p'} ${d >= 0 ? '더' : '덜'} 회복했어요`;
  /* 최근 6개월 시세 변화 */
  function momText(ch, G) {
    const v = Math.abs(ch * 100);
    return `${G ? G('평당') : '평당'} 시세가 6개월 전보다 ` + (v < 0.05 ? '거의 그대로예요' : `${v.toFixed(1)}% ${ch > 0 ? '올랐어요' : '내렸어요'}`) + (ch >= 0.08 ? ' — 짧은 기간에 빠르게 오른 편이에요' : '');
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
    let t = `${G ? G('전세가율') : '전세가율'} ${q}%` + (why ? ` — ${why}` : '');
    if (priceMan > 0) t += ` ${jr < 0.4 ? '그래서 전세를 끼고 사도' : '전세를 끼고 사면'} ${eokR(priceMan)} 중 약 ${eokR(priceMan * (1 - jr))}을 내 돈과 대출로 마련해야 해요(추정).`;
    st = st || {};
    if (f.rz && st.rz) {
      const [m, n] = st.rz, d = jr - m, lvl = Math.abs(d) < 0.05 ? '보통인 편' : d < 0 ? '낮은 편' : '높은 편';
      t += ` ${sidoShort} 재건축 단지 ${n.toLocaleString()}곳(평형별)의 전세가율 ${G ? G('중앙값') : '중앙값'}은 ${Math.round(m * 100)}%라, 재건축 단지 중에서는 ${lvl}이에요.`;
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

  root.JDJ_PLAIN = { STAGE, gloss, J, won, eokR, rank, more, regionInfo, regionRank, regionText, regionLine, evid, evHtml, ddText, rcText, momText, schText, stageName, rzText, jrStats, jrText, VOK, hzLabel, checkText, easy };
})(typeof window !== 'undefined' ? window : globalThis);
