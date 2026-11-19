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
  /* 지역 흐름 문장: [사실, 이유들, 해석] */
  function regionText(f, IX, code, G) {
    const ri = regionInfo(IX, code), out = { fact: '', why: [], mean: '' };
    if (f.gs != null && ri.n >= 3) {
      const { r, pos } = regionRank(f.gs, ri.n);
      out.fact = `${ri.short} ${ri.n}개 ${ri.unit} 중 ${J(ri.name, '은', '는')} 앞으로 2년 지역 흐름 점수가 ${pos}이에요(약 ${r}위).`;
      out.mean = pos === '하위권' ? `동네가 나쁘다는 뜻이 아니라, 앞으로 2년 오름폭이 ${ri.short} 다른 ${ri.unit}보다 작을 수 있다는 뜻이에요.`
        : pos === '상위권' ? '동네 전체 흐름이 단지 가격을 받쳐 줄 수 있다는 뜻이에요.' : '';
      out.pos = pos;
    }
    const p1 = v => Math.round(Math.abs(v) * 1000) / 10;
    if (f.sup != null) out.why.push(f.sup < 0.0005 ? '앞으로 2년 새 아파트 입주 물량은 거의 없어요.' : `앞으로 2년 새 아파트 입주 물량이 기존 아파트의 ${Math.round(f.sup * 1000) / 10}%예요` + (f.sup >= 0.08 ? '(많은 편).' : f.sup <= 0.03 ? '(적은 편).' : '.'));
    if (f.pg != null) out.why.push(Math.abs(f.pg) < 0.0005 ? '최근 1년 인구는 거의 그대로예요.' : `최근 1년 인구가 ${p1(f.pg)}% ${f.pg > 0 ? '늘었어요' : '줄었어요'}.`);
    if (f.un != null) out.why.push(`미분양 아파트는 ${f.un >= 0.01 ? '많은 편이에요' : f.un <= 0.002 ? '거의 없어요' : '보통이에요'}` + (f.unc > 0.001 ? '(1년 새 늘었어요).' : f.unc < -0.001 ? '(1년 새 줄었어요).' : '.'));
    if (f.jb != null) out.why.push(Math.abs(f.jb) < 0.0005 ? '지역 일자리는 1년 새 거의 그대로예요.' : `지역 일자리가 1년 새 ${p1(f.jb)}% ${f.jb > 0 ? '늘었어요' : '줄었어요'}.`);
    return out;
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
      + '.jp-ref{color:#8B95A1}';
    (root.document.head || root.document.documentElement).appendChild(s);
  }

  root.JDJ_PLAIN = { STAGE, gloss, J, won, eokR, rank, more, regionInfo, regionRank, regionText, ddText, rcText, momText, schText, stageName, rzText, jrStats, jrText, VOK, hzLabel, checkText, easy };
})(typeof window !== 'undefined' ? window : globalThis);
