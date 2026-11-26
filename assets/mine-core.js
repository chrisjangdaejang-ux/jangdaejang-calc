/* 장대장 '내 집 시세' 공통 로직 — mine/ 화면과 tools/mine-test.js 가 함께 쓴다.
   자료: jangdaejang-data data/sNN.json 의 units (assets/rec-core.js 설명과 같음 — 점수·추천용)
     u = [시군구코드, 동, 단지, 평형대, 전용㎡(중간값), 자료 기간 거래수, 월별 평당가 36개, 월별 거래수 문자열, 지번, fx]
   시세 확인용(거래가 1건이라도 있으면 모두): jangdaejang-data data/price/
     price/sNN.json   단지 목록(검색용) r = [시군구코드, 동, 단지, 평형대, 전용㎡, 거래수, 지번, 점수 자료 1/0, (단지 첫 행만) 별칭 목록]
                      → listRow(r) 로 u 모양으로(별칭은 u.al, groupDanji 가 d.al 로 모음)
     alias/sNN.json   {x: [[구코드, 동, K-apt 이름, 지번, 사용승인 연도, 사유, 마지막 거래 연월]]} 최근 3년 목록에 없는 K-apt 단지(검색 결과 없을 때 안내)
     price/{구코드}.json units: u 와 같은 앞 9칸 + [9] 점수 자료 1/0, [10] 거래 있는 달의 그 달 중앙 평당가(오래된 달부터),
                     [11] 개별 거래 [계약 연월일(YYYYMMDD), 전용㎡, 층, 금액(만원), 유형 0 중개·1 직거래·2 미기재, 신고가 1/0] 최신순,
                     [12] 전체 기간 요약 {f 첫 거래 달, hi 역대 최고가, hi1 최근 1년 최고가} — 파일 hist 와 price/h/{구}.json 은 아래 '전체 기간 시세'
       · 거래수·평당가는 직거래 제외(점수용과 같은 기준), 개별 거래 목록에는 직거래도 유형 표시와 함께 있음
     · 월별 평당가: 그 달까지 3개월 실거래 평당가(만원/3.3㎡)의 중간값 — 해제(취소) 신고 거래·직거래는 원자료 단계에서 제외
     · 월별 거래수 문자열: 한 글자 = 한 달 거래 건수 (글자 코드 − 48)
   여기서 하는 계산은 단순 집계(중간값·최저·최고·합계·변동률)와 단위 환산뿐이며, 화면에는 계산 근거를 함께 보여 준다.
   미래가치 점수(fx.fv)는 공개 자료에 있는 값을 그대로 쓰고, 계산식·가중치는 다루지 않는다. */
(function (root) {
  'use strict';
  const PY = 3.3058;
  const r100 = m => Math.round(m / 100) * 100;
  const STORE_KEY = 'jdj_myhome';
  const MAX_HOMES = 5;

  /* ---------- 기본 ---------- */
  function counts(cnt) { const out = []; for (const ch of String(cnt || '')) out.push(Math.max(0, ch.charCodeAt(0) - 48)); return out; }
  /** 마지막 실거래 평당가 위치(최근 3개월 안), 없으면 -1 */
  function lastIdx(arr) { for (let i = arr.length - 1; i >= Math.max(0, arr.length - 3); i--) if (arr[i] > 0) return i; return -1; }
  function median(a) {
    const v = a.filter(x => typeof x === 'number' && isFinite(x)).sort((x, y) => x - y), n = v.length;
    if (!n) return 0; return n % 2 ? v[(n - 1) / 2] : (v[n / 2 - 1] + v[n / 2]) / 2;
  }
  /** 평당가(만원/3.3㎡) × 전용㎡ → 금액(만원, 100만 원 단위) */
  const toPrice = (ppy, area) => (ppy > 0 && area > 0) ? r100(ppy * area / PY) : 0;
  const ymLabel = ym => ym ? `${String(ym).slice(0, 4)}.${String(ym).slice(4, 6)}` : '';
  /** x축 날짜 라벨 고르기: 글자가 겹치지 않을 만큼만(처음·끝은 항상), 좁은 화면이면 '23.11 짧은 형식.
      n = 점 개수, plotW = 그림 폭(px), fs = 글씨 크기, pos(i) = i번째 점의 x. 반환 [{i, x, t, a}] (a = text-anchor) */
  function xTicks(n, plotW, fs, pos, months, fmt) {
    if (!n) return [];
    const short = plotW < 420, lab = i => fmt ? fmt(months[i], short) : (short ? "'" + String(months[i]).slice(2, 4) + '.' + String(months[i]).slice(4, 6) : ymLabel(months[i]));
    const w = Math.max(...[0, n - 1].map(i => String(lab(i)).length)) * fs * 0.72 + 16;   // 라벨 한 개 폭 + 여유
    if (n === 1) return [{ i: 0, x: pos(0), t: lab(0), a: 'start' }];
    const slots = Math.max(1, Math.min(n - 1, Math.floor(plotW / w)));
    const raw = Math.ceil((n - 1) / slots), step = [1, 2, 3, 6, 12, 24, 36, 60, 120].find(v => v >= raw) || raw;   // 달 수를 보기 좋은 간격으로
    const idx = []; for (let i = 0; i < n - 1; i += step) idx.push(i);
    while (idx.length > 1 && pos(n - 1) - pos(idx[idx.length - 1]) < w) idx.pop();   // 끝 라벨과 가까운 앞 라벨 빼기
    idx.push(n - 1);
    const out = idx.map((i, k) => ({ i, x: pos(i), t: lab(i), a: k === 0 ? 'start' : k === idx.length - 1 ? 'end' : 'middle' }));
    return out.filter((t, k) => k === 0 || k === out.length - 1 ? true : t.t !== out[k - 1].t && t.t !== out[out.length - 1].t);   // 같은 글자(같은 해) 반복 빼기
  }
  const danjiKey = u => [u[0], u[1], u[8], u[2]].join('|');                 // 시군구|동|지번|단지
  const agentKey = u => [u[0], u[1], u[2]].join('|');                       // 제휴 중개사 매물 단지 키(리포트와 같음)
  /** 프리미엄 리포트 단지 키 — assets/pay.js 의 JDJ_PAY.keyOf 와 같은 형식 (시도id~구코드~동~단지~평형) */
  const premiumKey = p => [p.sd, p.code, p.dong, p.apt, p.band].map(v => encodeURIComponent(v).replace(/~/g, '%7E').replace(/!/g, '%21')).join('~');

  /** 같은 단지(구·동·지번·이름)의 평형들을 묶는다. 평형은 전용면적 순 */
  function groupDanji(units) {
    const m = new Map();
    for (const u of units) {
      const k = danjiKey(u);
      let d = m.get(k);
      if (!d) { d = { key: k, code: u[0], dong: u[1], apt: u[2], jibun: u[8], bands: [], n: 0 }; m.set(k, d); }
      d.bands.push(u); d.n += u[5] || 0;
      if (Array.isArray(u.al) && u.al.length) d.al = (d.al || []).concat(u.al.filter(a => !(d.al || []).includes(a)));
    }
    for (const d of m.values()) d.bands.sort((a, b) => a[4] - b[4]);
    addNicks(m);
    return m;
  }
  /* ---------- 흔히 부르는 별명(사람들이 실제로 부르는 이름) ----------
     [별명 목록, 시군구 코드, 동, 실거래 단지 이름 목록] — 이름은 공개 자료(data/price/s00·s08.json, 2026-11-25)에 그대로 있는 것만 넣었어요(추측 금지).
     한 별명이 여러 단지를 묶어 부르면(엘리트 = 잠실엘스·리센츠·트리지움) 묶인 단지 모두에 붙어 함께 나와요. 자료에 없는 이름은 그냥 건너뜀.
     새 별명은 '검색실패' 기록(logMiss)을 보고 이 표에 더해요. tools/mine-test.js 가 표 모양·검색 결과를 확인. */
  const NICK = [
    [['은마'], '11680', '대치동', ['은마']],
    [['엘리트', '잠실 엘리트'], '11710', '잠실동', ['잠실엘스', '리센츠', '트리지움']],
    [['엘리트레파'], '11710', '잠실동', ['잠실엘스', '리센츠', '트리지움', '레이크팰리스']],
    [['엘리트레파'], '11710', '신천동', ['파크리오']],
    [['헬리오', '헬리오시티'], '11710', '가락동', ['헬리오시티']],
    [['둔촌주공', '올파포', '둔촌 올림픽파크포레온'], '11740', '둔촌동', ['올림픽파크포레온']],
    [['잠실주공5단지', '잠실5단지', '잠실주공 5단지'], '11710', '잠실동', ['주공아파트 5단지']],
    [['올림픽선수촌', '올선'], '11710', '방이동', ['올림픽선수기자촌1단지', '올림픽선수기자촌2단지', '올림픽선수기자촌3단지']],
    [['마래푸'], '11440', '아현동', ['마포래미안푸르지오1단지', '마포래미안푸르지오2단지', '마포래미안푸르지오3단지', '마포래미안푸르지오4단지']],
    [['아리팍'], '11650', '반포동', ['아크로리버파크']],
    [['원베일리'], '11650', '반포동', ['래미안원베일리']],
    [['래퍼', '래미안 퍼스티지'], '11650', '반포동', ['래미안퍼스티지']],
    [['반자'], '11650', '반포동', ['반포자이']],
    [['래대팰', '대치팰리스'], '11680', '대치동', ['래미안대치팰리스']],
    [['우선미'], '11680', '대치동', ['개포우성1', '개포우성2', '선경1차(1동-7동)', '선경2차(8동-12동)', '선경3차', '한보미도맨션1', '한보미도맨션2']],
    [['타팰', '타워팰리스'], '11680', '도곡동', ['타워팰리스1', '타워팰리스2', '타워팰리스3']],
    [['디아너', '디에이치 아너힐즈'], '11680', '개포동', ['디에이치아너힐즈']],
    [['래블', '래미안 블레스티지'], '11680', '개포동', ['래미안블레스티지']],
    [['분당 시범단지', '서현 시범단지', '시범단지'], '41135', '서현동', ['시범한양', '시범우성', '시범현대', '시범한신', '시범삼성']]
  ];
  function addNicks(m) {
    const by = new Map();
    for (const d of m.values()) { const k = d.code + '|' + d.dong + '|' + d.apt; if (!by.has(k)) by.set(k, []); by.get(k).push(d); }
    for (const [nicks, code, dong, names] of NICK) for (const nm of names) for (const d of (by.get(code + '|' + dong + '|' + nm) || [])) {
      const al = d.al || (d.al = []);
      for (const a of nicks) if (al.indexOf(a) < 0 && a !== d.apt) al.push(a);
    }
  }
  /* ---------- 단지 이름 검색용 별칭 (원래 이름은 그대로 두고 검색어·이름을 같은 규칙으로 맞춘다) ----------
     엔진 scripts/aliases.py 의 norm() 과 같은 규칙. 두 가지 꼴로 비교한다:
       · 가벼운 꼴(normLight): 소문자, 공백·기호 빼기, e편한세상·이편한세상·e-편한세상 → 이편한세상, 엘지 → lg 처럼 영문 표기 하나로
       · 브랜드 꼴(normName): 위 + 시공사 앞말이 붙은 브랜드를 브랜드 하나로(대림이편한세상·삼성래미안·현대힐스테이트·GS자이·대우푸르지오·
         현대아이파크·포스코더샵·에스케이뷰·한화꿈에그린·동부센트레빌…) + '아파트' 빼기
     차수: 로마 숫자(Ⅳ)·'제4차'·띄어 쓴 한글 차수('사차') → '4차', 'N차'와 'N단지'는 같은 번호로 본다 */
  const ROMAN = { 'Ⅰ': '1', 'Ⅱ': '2', 'Ⅲ': '3', 'Ⅳ': '4', 'Ⅴ': '5', 'Ⅵ': '6', 'Ⅶ': '7', 'Ⅷ': '8', 'Ⅸ': '9', 'Ⅹ': '10',
    'ⅰ': '1', 'ⅱ': '2', 'ⅲ': '3', 'ⅳ': '4', 'ⅴ': '5', 'ⅵ': '6', 'ⅶ': '7', 'ⅷ': '8', 'ⅸ': '9', 'ⅹ': '10' };
  const HNUM = { 일: '1', 이: '2', 삼: '3', 사: '4', 오: '5', 육: '6', 칠: '7', 팔: '8', 구: '9', 십: '10' };
  const LATIN = [['엘지', 'lg'], ['에스케이', 'sk'], ['지에스', 'gs'], ['케이씨씨', 'kcc'], ['엘에이치', 'lh'], ['에이치디씨', 'hdc'], ['케이티', 'kt']];
  const BRANDS = [
    [/(?:대림|dl)?\s*(?:e|이)\s*-?\s*편한\s*세상/g, '이편한세상'],
    [/(?:삼성\s*)?(?:래미안|raemian)/g, '래미안'],
    [/(?:현대\s*)?(?:힐스테이트|hill\s*state)/g, '힐스테이트'],
    [/(?:gs|지에스)\s*(?:자이|xi)/g, '자이'],
    [/(^|[^a-z])xi(?![a-z])/g, '$1자이'],
    [/(?:대우\s*)?(?:푸르지오|prugio)/g, '푸르지오'],
    [/(?:현대|hdc|에이치디씨)?\s*(?:아이파크|i-?park)/g, '아이파크'],
    [/(?:롯데|lotte)\s*(?:캐슬|castle)/g, '롯데캐슬'],
    [/(?:포스코\s*)?(?:더샵|더#|the\s*#|the\s*sharp)/g, '더샵'],
    [/(?:sk|에스케이)\s*(?:뷰|view)/g, 'sk뷰'],
    [/(?:한화\s*)?꿈에그린/g, '꿈에그린'],
    [/(?:동부\s*)?센트레빌/g, '센트레빌'],
    [/(?:두산\s*)?(?:위브|we'?ve)/g, '위브'],
    [/(?:호반\s*)?베르디움/g, '베르디움'],
    [/(?:한신\s*)?휴\s*플러스/g, '휴플러스'],
    [/(?:금호\s*)?어울림/g, '어울림']];
  /** 낱말 안에서 떼어 비교할 브랜드('이편한세상청담4차' → '이편한세상' + '청담4차') */
  const SPLIT = ['이편한세상', '래미안', '힐스테이트', '자이', '푸르지오', '아이파크', '롯데캐슬', '더샵', 'sk뷰', '꿈에그린', '센트레빌', '위브', '베르디움', '휴플러스', '어울림', '주공'];
  const PUNCT = /[\s\-_.,·・'"’()\[\]&#]+/g;
  /** 띄어쓰기를 남긴 채 글자 꼴만 맞춤(로마 숫자·전각 문자·한글 차수·'제N차'·e편한세상·영문 표기) */
  function prep(s) {
    let x = String(s || '').replace(/[Ⅰ-Ⅹⅰ-ⅹ]/g, c => ROMAN[c] || c);
    if (x.normalize) x = x.normalize('NFKC');
    x = x.toLowerCase()
      .replace(/(^|\s)(일|이|삼|사|오|육|칠|팔|구|십)\s*차(?=\s|$)/g, (m, a, b) => a + HNUM[b] + '차')
      .replace(/제\s*(\d+)\s*(차|단지)/g, '$1$2')
      .replace(/(e|이)\s*-?\s*편한\s*세상/g, '이편한세상');
    for (const [a, b] of LATIN) x = x.split(a).join(b);
    return x;
  }
  /** 브랜드 꼴(띄어쓰기 남김) */
  function prepBrand(s) {
    let x = prep(s);
    for (const [re, to] of BRANDS) x = x.replace(re, to);
    const y = x.replace(/아파트|\bapt\b/g, ' ');
    return y.replace(PUNCT, '') ? y : x;
  }
  const NC = new Map();                                                     // 정리 결과 기억(같은 이름을 글자 칠 때마다 다시 정리하지 않게)
  function memo(k, f) { let v = NC.get(k); if (v === undefined) { if (NC.size > 200000) NC.clear(); v = f(); NC.set(k, v); } return v; }
  /** 가벼운 꼴: 시공사 앞말은 그대로('청담대림' 검색이 대림 단지만 찾게) */
  function normLight(s) { return memo('L' + s, () => prep(s).replace(PUNCT, '')); }
  /** 브랜드 꼴. dropMaker=true 면 시공사 '대림' 표기도 뺀다(예전 호출 그대로) */
  function normName(s, dropMaker) {
    const n = memo('N' + s, () => prepBrand(s).replace(PUNCT, ''));
    return dropMaker ? n.replace(/대림/g, '') : n;
  }
  /** 'N차'·'N단지' 를 따로 떼어 낸다: {rest, nums, bare}
      bare = 이름 끝에 붙은 1~2자리 숫자(예: '목동신시가지7' → '7') — 'N차'·'N단지' 어느 쪽 검색어와도 맞춘다 */
  function splitNum(n) {
    return memo('S' + n, () => {
      if (/^\d{1,2}$/.test(n)) return { rest: '', nums: [], bare: String(+n) };   // 숫자만 쓴 낱말('Ⅳ' → '4')은 번호
      const nums = []; let rest = n.replace(/(\d+)(차|단지)/g, (m, a, b) => { nums.push(+a + b); return ''; });
      let bare = '';
      rest = rest.replace(/([^\d])(\d{1,2})$/, (m, a, b) => { bare = String(+b); return a; });
      return { rest, nums, bare };
    });
  }
  const numOf = x => String(parseInt(x, 10));
  /** 검색어의 'N차'(또는 'N단지')가 이름의 번호와 같은지 — 'N차'와 'N단지'는 같은 번호로 본다 */
  const numOk = (x, ns) => ns.nums.some(y => numOf(y) === numOf(x)) || (!!ns.bare && ns.bare === numOf(x));
  /** 낱말 하나를 브랜드 경계에서 나눈다(앞·뒤가 두 글자 이상 남을 때) */
  function splitBrand(t) {
    for (const b of SPLIT) {
      const i = t.indexOf(b);
      if (i < 0 || t === b) continue;
      const a = t.slice(0, i), c = t.slice(i + b.length);
      if ((a && a.replace(/\d+(차|단지)?/g, '').length < 1 && !/\d/.test(a)) || (c && c.replace(/\d+(차|단지)?/g, '').length < 1 && !/\d/.test(c))) continue;
      return [a, b, c].filter(Boolean);
    }
    return [t];
  }
  /** 검색어 q 가 단지 이름 name 에 맞는지. -1 = 안 맞음, 0 = 앞부분부터 맞음, 1 = 맞음
      · 이름·검색어를 가벼운 꼴과 브랜드 꼴 두 가지로 비교(둘 중 잘 맞는 쪽)
      · 띄어쓰기로 나눈 낱말마다(브랜드 경계에서도 나눔): 'N차/N단지'를 뺀 글자가 이름에 들어 있고, 'N차'는 이름의 번호와 같아야 함
      · 이름에 '차' 번호가 없으면 '1차'로 본다 (예: 청담대림이-편한세상 = 청담 e편한세상 1차)
      · 검색어에 '편'이 있으면(이편한세상을 쓰다 만 경우 포함) 검색어의 '대림'도 빼고 비교 — e편한세상은 대림(DL) 브랜드 */
  const DONG_TAIL = /\s*\([^()]*\d+\s*동[^()]*\)\s*$/;
  function matchName(name, q) {
    const ql = normLight(q); if (!ql) return -1;
    const nm = String(name || '').replace(DONG_TAIL, '') || String(name || '');    // '(201동,202동)' 같은 동 표기는 비교에서 뺌
    const rs = [matchOne(normLight(nm), q, normLight), matchOne(normName(nm), q, normName)];
    if (/편/.test(ql)) {
      const qd = String(q || '').replace(/대림/g, ''), dl = s => normLight(s).replace(/대림/g, '');
      rs.push(matchOne(normName(nm, true), qd, s => normName(s, true)), matchOne(dl(nm), qd, dl));
    }
    const ok = rs.filter(r => r >= 0);
    return ok.length ? Math.min(...ok) : -1;
  }
  function matchOne(nn, q, f) {
    const tq = f(q); if (!tq || !nn) return -1;
    if (nn.indexOf(tq) >= 0) return nn.indexOf(tq) === 0 ? 0 : 1;
    const ns = splitNum(nn), hasCha = ns.nums.length > 0;
    let toks = [];
    for (const w of prep(q).split(/\s+/)) { const t = f(w); if (t) toks.push(...splitBrand(t)); }
    if (!toks.length) return -1;
    let first = false;
    for (let i = 0; i < toks.length; i++) {
      const ts = splitNum(toks[i]);
      if (ts.rest && ns.rest.indexOf(ts.rest) < 0) return -1;
      for (const x of ts.nums) if (!numOk(x, ns) && !(numOf(x) === '1' && !hasCha && !ns.bare)) return -1;
      if (ts.bare && !numOk(ts.bare, ns) && !(ts.bare === '1' && !hasCha && !ns.bare)) return -1;
      if (i === 0 && ts.rest && ns.rest.indexOf(ts.rest) === 0) first = true;
    }
    return first ? 0 : 1;
  }
  const dongStem = d => String(d || '').split(/\s+/).pop().replace(/(\d+가)?(동|읍|면|리)$/, '');
  /** 단지 하나(d)에 검색어가 맞는 정도: 작을수록 앞, null = 안 맞음
      -2 이름과 똑같음, -1 별칭과 똑같음, 0·1 이름, 0.5·1.5 별칭(K-apt 공식 이름·실거래 다른 이름·도로명 주소),
      2 동 이름·지번을 뺀 나머지 낱말이 이름에 맞음('청담동 4차 이편한', '청담동 28-20') */
  function matchDanji(d, q) {
    const qn = normName(q), ql = normLight(q);
    if (!ql) return null;
    if (normName(d.apt) === qn || normLight(d.apt) === ql) return -2;
    const al = Array.isArray(d.al) ? d.al : [];
    if (al.some(a => normName(a) === qn || normLight(a) === ql)) return -1;
    let r = matchName(d.apt, q);
    if (r >= 0) return r;
    for (const a of al) { const x = matchName(a, q); if (x >= 0 && (r < 0 || x + 0.5 < r)) r = x + 0.5; }
    if (r >= 0) return r;
    {                                              // 동 이름을 붙여 쓴 검색('잠실주공5단지', '반포자이')도 찾기: 앞에 붙은 동 이름을 떼고 다시 비교
      const st0 = dongStem(d.dong), dn0 = String(d.dong || '').split(/\s+/).pop(), qt = String(q || '').trim();
      for (const pre of [dn0, st0]) {
        if (!pre || pre.length < 2 || qt.indexOf(pre) !== 0) continue;
        const q2 = qt.slice(pre.length).trim();
        if (q2 && normLight(q2) && (matchName(d.apt, q2) >= 0 || al.some(a => matchName(a, q2) >= 0))) return 2;
      }
    }
    const toks = String(q || '').trim().split(/\s+/);
    if (toks.length < 2) return null;
    const st = dongStem(d.dong), dn = normLight(String(d.dong || '').split(/\s+/).pop()), jb = String(d.jibun || '');
    let used = false;
    const rest = toks.filter(t => {
      const n = normLight(t);
      if (n && (n === dn || (st.length >= 2 && n === normLight(st)) || (jb && t === jb))) { used = true; return false; }
      return true;
    });
    if (!used) return null;
    if (!rest.length) return 2;
    const rq = rest.join(' ');
    if (matchName(d.apt, rq) >= 0 || al.some(a => matchName(a, rq) >= 0)) return 2;
    return null;
  }
  /** 단지 이름 검색: 공백·하이픈·브랜드 표기·차수 표기 차이 무시, 별칭(K-apt 이름 등)·동 이름·지번으로도, 똑같은 이름 먼저 → 거래 많은 단지 먼저 */
  function searchDanji(groups, q, limit) {
    if (!normLight(q)) return [];
    const out = [];
    for (const d of groups.values()) {
      const r = matchDanji(d, q);
      if (r != null) out.push([r, -d.n, d]);
    }
    out.sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2].apt.localeCompare(b[2].apt, 'ko'));
    return out.slice(0, limit || 20).map(x => x[2]);
  }
  /** 어떤 이름으로 찾았는지(별칭으로 찾았을 때만 그 별칭, 아니면 '') — 결과 목록에 '○○(으)로 찾음' 표시용 */
  function matchedAlias(d, q) {
    if (matchName(d.apt, q) >= 0 || normName(d.apt) === normName(q)) return '';
    for (const a of (Array.isArray(d.al) ? d.al : [])) if (normName(a) === normName(q) || matchName(a, q) >= 0) return a;
    return '';
  }
  /** 글자 쌍 겹침(0~1) */
  function dice(a, b) {
    if (!a || !b) return 0;
    if (a.length < 2 || b.length < 2) return a === b ? 1 : (b.indexOf(a) >= 0 || a.indexOf(b) >= 0 ? 0.5 : 0);
    const g = new Map(); for (let i = 0; i < a.length - 1; i++) { const k = a.slice(i, i + 2); g.set(k, (g.get(k) || 0) + 1); }
    let hit = 0; for (let i = 0; i < b.length - 1; i++) { const k = b.slice(i, i + 2), c = g.get(k); if (c) { hit++; g.set(k, c - 1); } }
    return 2 * hit / (a.length - 1 + b.length - 1);
  }
  /** 검색 결과가 없을 때 가까운 후보: 검색어에 동 이름이 있으면 그 동 단지 중에서, 아니면 전체에서 이름이 비슷한 순.
      번호(N차)가 다르면 점수를 낮춘다. 돌려줌: [{d, s, dong(동 이름이 맞았는지)}] */
  function suggestDanji(groups, q, limit) {
    const toks = prep(q).split(/\s+/).filter(Boolean);
    if (!toks.length) return [];
    const all = [...groups.values()];
    const dongs = new Set(all.map(d => d.dong));
    const hitDong = new Set();
    for (const t of toks) { const n = normLight(t); for (const dg of dongs) { const st = dongStem(dg); if (n && (n === normLight(String(dg).split(/\s+/).pop()) || (st.length >= 2 && (n === normLight(st) || n.indexOf(normLight(st)) === 0)))) hitDong.add(dg); } }
    const qs = splitNum(normName(q)), qtext = qs.rest.replace(/\d+/g, '');
    const pool = hitDong.size ? all.filter(d => hitDong.has(d.dong)) : all;
    const out = [];
    for (const d of pool) {
      let s = 0;
      for (const nm of [d.apt].concat(Array.isArray(d.al) ? d.al : [])) {
        const ns = splitNum(normName(nm));
        let v = dice(qtext, ns.rest.replace(/\d+/g, ''));
        if (qs.nums.length && !qs.nums.every(x => numOk(x, ns) || (numOf(x) === '1' && !ns.nums.length && !ns.bare))) v *= 0.6;
        if (v > s) s = v;
      }
      if (hitDong.size) s += 0.3;
      if (s >= (hitDong.size ? 0.3 : 0.35)) out.push({ d, s, dong: hitDong.size > 0 });
    }
    out.sort((a, b) => b.s - a.s || b.d.n - a.d.n);
    return out.slice(0, limit || 5);
  }
  /** K-apt 에는 있지만 최근 3년 시세 목록에 없는 단지(alias/sNN.json 의 x) 중 검색어에 맞는 것 — '왜 안 나오는지' 안내용
      row = [구코드, 동, K-apt 이름, 지번, 사용승인 연도, 사유 old|rent|none, 마지막 거래 연월] */
  function missRows(x, q, limit) {
    const out = [];
    for (const r of (x || [])) { const m = matchName(r[2], q); if (m >= 0) out.push([m, r]); }
    out.sort((a, b) => a[0] - b[0]);
    return out.slice(0, limit || 3).map(v => v[1]);
  }
  const MISS_WHY = { old: '최근 3년 동안 매매 거래가 없어요', rent: '임대 단지라 매매 거래 신고가 없어요', none: '국토교통부 매매 실거래 신고를 찾지 못했어요' };
  /** 검색 결과가 없을 때 검색어만 익명으로 남긴다(새 별칭을 배우는 용도). 방문자 번호·위치·시각 외 정보는 보내지 않고,
      전화번호·이메일처럼 보이는 글은 보내지 않는다. 같은 검색어는 한 번만. 제휴 서버(assets/agents.js)가 있는 화면에서만 */
  const MISS_SENT = new Set();
  function logMiss(q, where) {
    try {
      if (typeof window === 'undefined' || !window.JDJ_AGENTS || !window.JDJ_AGENTS.api) return false;
      const t = String(q || '').replace(/\s+/g, ' ').trim().slice(0, 40);
      if (t.length < 2 || /\d{6,}|\d{2,4}[-.\s]\d{3,4}[-.\s]\d{4}|@|https?:/i.test(t) || !/[가-힣a-z]/i.test(t) || MISS_SENT.has(t)) return false;
      MISS_SENT.add(t);
      fetch(window.JDJ_AGENTS.api, { method: 'POST', mode: 'no-cors', keepalive: true, headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'log', events: [{ t: 'sq', a: '', g: String(where || '').replace(/[^\w]/g, '').slice(0, 12), k: t }] }) }).catch(() => {});
      return true;
    } catch (e) { return false; }
  }

  /* ---------- 시세 확인용 자료 ---------- */
  const FEW = 3;                                                            // 이보다 적으면 시세 범위 대신 거래 목록 요약만
  /** price/sNN.json 목록 행 → u 모양(시계열 칸은 비움) */
  const listRow = r => { const u = [r[0], r[1], r[2], r[3], r[4], r[5], null, null, r[6], r[7]]; if (Array.isArray(r[8]) && r[8].length) u.al = r[8]; return u; };
  const unitKey = u => [u[0], u[1], u[8], u[2], u[3]].join('|');            // 시군구|동|지번|단지|평형
  /** 점수 자료가 있는 단지·평형인지(점수용 sNN 의 fx 객체, 또는 시세 자료의 1 표시) */
  const hasScore = u => !!u && (u[9] === 1 || (u[9] != null && typeof u[9] === 'object'));
  /** 점수 묶음(fx): 점수용 자료에서 온 행이면 그대로, 시세 자료 행이면 점수용 Map(unitKey → fx)에서 */
  function scoreOf(u, map) {
    if (!u) return null;
    if (u[9] && typeof u[9] === 'object') return u[9];
    if (u[9] === 1 && map) return map.get(unitKey(u)) || null;
    return null;
  }
  /** 거래 있는 달 목록(최신순): {at, n, ppy(그 달 중앙 평당가, 없으면 3개월 중간값), price} */
  function monthDeals(u, months) {
    const c = counts(u[7]), mm = Array.isArray(u[10]) ? u[10] : null, out = [];
    let k = 0;
    for (let i = 0; i < c.length; i++) if (c[i] > 0) {
      const p = mm ? (mm[k] || 0) : (u[6] ? u[6][i] || 0 : 0); k++;
      out.push({ at: months[i], n: c[i], ppy: p, price: toPrice(p, u[4]), own: !!mm });
    }
    return out.reverse();
  }
  /** 개별 거래(최신순): {ymd, date 'YYYY.MM.DD', area, floor, amt, type '중개'·'직거래'·'', ppy} */
  const TYPE = ['중개', '직거래', ''];
  function trades(u) {
    const t = Array.isArray(u && u[11]) ? u[11] : [];
    return t.map(x => {
      const s = String(x[0]);
      return { ymd: x[0], date: `${s.slice(0, 4)}.${s.slice(4, 6)}` + (s.slice(6, 8) !== '00' ? '.' + s.slice(6, 8) : ''), area: x[1], floor: x[2], amt: x[3],
        type: TYPE[x[4]] || '', ppy: x[1] > 0 ? Math.round(x[3] / x[1] * PY) : 0, hi: x[5] === 1 };
    });
  }
  /** 마지막 거래(그 달 중앙 평당가 기준) — 최근 3개월에 거래가 없을 때 '마지막 실거래' 로 보여 주는 값 */
  function lastDeal(u, months) { const m = monthDeals(u, months); return m.length ? m[0] : null; }
  const isFew = u => (u[5] || 0) < FEW;

  /* ---------- 한 평형 요약 ---------- */
  /** months: index.json 의 months(YYYYMM 36개) */
  function bandSummary(u, months) {
    const s = u[6], c = counts(u[7]), area = u[4], n = s.length;
    const li = lastIdx(s), ppy = li >= 0 ? s[li] : 0;
    const r3 = c.slice(-3).reduce((a, b) => a + b, 0);
    const y1 = s.slice(-12).filter(v => v > 0);
    const lo = y1.length ? Math.min(...y1) : 0, hi = y1.length ? Math.max(...y1) : 0;
    const cnt12 = c.slice(-12).reduce((a, b) => a + b, 0);
    return {
      band: u[3], area, ppy, price: toPrice(ppy, area),
      at: li >= 0 ? months[li] : '', stale: li >= 0 && li < n - 1,        // 마지막 달에 거래가 없어 앞 달 값을 쓴 경우
      recent3: r3, cnt12, total: u[5],
      range: { lo: toPrice(lo, area), hi: toPrice(hi, area), loPpy: lo, hiPpy: hi, months: y1.length },
      ch1: changeBack(s, months, 12), ch3: changeBack(s, months, n - 1)
    };
  }
  /** 마지막 실거래 평당가와 back 개월 전 평당가 비교. 그달 값이 없으면 null(추정으로 메우지 않음) */
  function changeBack(s, months, back) {
    const li = lastIdx(s); if (li < 0) return null;
    const bi = li - back; if (bi < 0) return null;
    let j = bi; if (!(s[j] > 0)) { j = -1; for (let k = bi; k <= Math.min(bi + 2, li - 1); k++) if (s[k] > 0) { j = k; break; } }
    if (j < 0 || !(s[j] > 0)) return null;
    return { from: s[j], to: s[li], fromAt: months[j], toAt: months[li], pct: (s[li] - s[j]) / s[j], months: li - j };
  }

  /* ---------- 같은 동·구 대비 ---------- */
  /** 같은 동(같은 구) 안의 단지·평형 최근 평당가 중간값과 비교. sameBand=true 면 같은 평형대만(3개 이상일 때) */
  function dongPosition(units, u) {
    const pick = (fn) => units.filter(x => x[0] === u[0] && x[1] === u[1] && fn(x)).map(x => ({ u: x, p: x[6][lastIdx(x[6])] || 0 })).filter(x => x.p > 0);
    let pool = pick(x => x[3] === u[3]), sameBand = true;
    if (pool.length < 3) { pool = pick(() => true); sameBand = false; }
    const me = u[6][lastIdx(u[6])] || 0;
    if (!me || pool.length < 2) return null;
    const med = median(pool.map(x => x.p));
    const sorted = pool.map(x => x.p).sort((a, b) => b - a);
    const rank = sorted.findIndex(p => p <= me) + 1;
    const danji = new Set(pool.map(x => danjiKey(x.u))).size;
    return { med: Math.round(med), me, diff: (me - med) / med, rank, n: pool.length, danji, sameBand };
  }
  /** 같은 구 전체 아파트 3개월 중앙 평당가(index.json sgg.s, 공개 집계)와 비교 */
  function sggPosition(sgg, u, months) {
    if (!sgg || !sgg.s) return null;
    const li = lastIdx(u[6]); if (li < 0) return null;
    const g = sgg.s[li]; if (!(g > 0)) return null;
    return { sggPpy: g, me: u[6][li], diff: (u[6][li] - g) / g, at: months[li] };
  }

  /* ---------- 추이 (차트용) ---------- */
  /** span 개월(12·36) 구간: 단지 평당가·구 평당가·단지 거래 건수·구 거래 건수 */
  function trend(u, sgg, months, span) {
    const n = months.length, st = Math.max(0, n - span);
    const c = counts(u[7]);
    return {
      months: months.slice(st), ppy: u[6].slice(st), sgg: sgg && sgg.s ? sgg.s.slice(st) : [],
      cnt: c.slice(st), sggCnt: sgg && sgg.c ? sgg.c.slice(st) : []
    };
  }
  /** 거래량: 최근 12개월 합 vs 그 전 12개월 합 */
  function volume(u) { return volumeCounts(counts(u[7])); }
  /** 월별 건수 배열 → 최근 12개월 합 vs 그 전 12개월 합 (구 전체 건수 index.json sgg.c 에도 씀) */
  function volumeCounts(c) {
    c = (c || []).map(v => +v || 0); const n = c.length, sum = a => a.reduce((x, y) => x + y, 0);
    const a = sum(c.slice(Math.max(0, n - 12))), b = n >= 24 ? sum(c.slice(n - 24, n - 12)) : null;
    return { last12: a, prev12: b, pct: (b && b > 0) ? (a - b) / b : null };
  }

  /* ---------- 평형 안 전용면적 고르기 ----------
     price/{구}.json 칸 13(한 평형에 전용 타입이 여럿일 때만, 엔진 build_site.type_list): [[전용㎡, 최근 3년 거래 수, 타입 첫 정수, 타입 끝 정수, 월별 시세 36개 | 0], …]
     월별 시세는 엔진이 그 타입을 기준으로 칸 6 과 같은 방법으로 낸 값(0 = 칸 4 대표 타입 → 칸 6 그대로). 웹은 고르고 보여 주기만 하고 다시 계산하지 않는다. */
  const areaInt = a => Math.floor(+a + 0.5);
  /** 칸 13 → [{a 전용㎡, n 3년 거래 수, lo, hi 타입 정수 범위, rep 대표 타입이면 true, s 월별 시세 36개}] (타입이 하나뿐이거나 자료가 없으면 []) */
  function areaTypes(u) {
    const t = u && Array.isArray(u[13]) ? u[13] : null;
    if (!t || t.length < 2) return [];
    const out = t.filter(x => Array.isArray(x) && x[0] > 0).map(x => ({ a: +x[0], n: +x[1] || 0, lo: +x[2], hi: +x[3], rep: !Array.isArray(x[4]), s: Array.isArray(x[4]) ? x[4] : u[6] }));
    return out.length >= 2 && out.filter(x => x.rep).length === 1 ? out : [];
  }
  /** 고른 전용㎡ → 그 타입(정수 범위 안이면 그 타입, 아니면 전용㎡가 가장 가까운 타입). 고른 값이 없으면 대표 타입 */
  function areaPick(types, ar) {
    if (!types || !types.length) return null;
    ar = +ar;
    if (!(ar > 0)) return types.find(x => x.rep) || types[0];
    const i = areaInt(ar);
    return types.find(x => i >= x.lo && i <= x.hi) || types.slice().sort((x, y) => Math.abs(x.a - ar) - Math.abs(y.a - ar))[0];
  }
  /** 고른 전용면적 기준으로 본 평형 행(u 모양 그대로라 bandSummary·lastDeal 등을 그대로 씀).
      대표 타입이거나 고를 타입이 없으면 u 그대로. 아니면 칸 4 = 그 타입 전용㎡, 칸 5·7 = 그 타입 거래 수(직거래 제외), 칸 6 = 그 타입 월별 시세,
      칸 10 = 없음(거래 달 값은 3개월 시세로 보여 줌), 칸 11 = 그 타입 개별 거래. u.base = 원래 행, u.ar = 고른 전용㎡ */
  function areaUnit(u, ar, months) {
    const types = areaTypes(u), t = areaPick(types, ar);
    if (!t || t.rep) return u;
    const inT = x => { const i = areaInt(x[1]); return i >= t.lo && i <= t.hi; };
    const tr = (Array.isArray(u[11]) ? u[11] : []).filter(inT);
    const ms = months || [], ix = new Map(ms.map((m, i) => [String(m), i])), c = ms.map(() => 0);
    tr.forEach(x => { if (x[4] === 1) return; const i = ix.get(String(Math.floor(x[0] / 100))); if (i != null) c[i]++; });
    const v = u.slice(0, 13);
    v[4] = t.a; v[5] = t.n; v[6] = t.s; v[7] = c.map(n => String.fromCharCode(48 + Math.min(n, 74))).join(''); v[10] = null; v[11] = tr;
    v.base = u; v.ar = t.a;
    return v;
  }

  /* ---------- 내 집 (브라우저 저장) ---------- */
  const okYm = v => /^\d{4}-(0[1-9]|1[0-2])$/.test(String(v || ''));
  function cleanHome(h) {
    if (!h || typeof h !== 'object') return null;
    const o = { sd: String(h.sd || ''), code: String(h.code || ''), dong: String(h.dong || ''), jibun: String(h.jibun || ''), apt: String(h.apt || ''), band: String(h.band || '') };
    if (!/^s\d{2}$/.test(o.sd) || !/^\d{5}$/.test(o.code) || !o.apt || !o.band || o.apt.length > 80) return null;
    const bp = Math.round(+h.bp);
    o.bp = (isFinite(bp) && bp > 0 && bp < 10000000) ? bp : null;          // 매수가(만원)
    o.bd = okYm(h.bd) ? h.bd : '';                                          // 매수 연월 YYYY-MM
    o.t = String(h.t || '').slice(0, 10);                                   // 저장한 날
    const ar = Math.round(+h.ar * 10) / 10;
    if (isFinite(ar) && ar >= 5 && ar <= 400) o.ar = ar;                   // 고른 전용면적(㎡) — 한 평형에 전용 타입이 여럿일 때만, 없으면 키 없음
    return o;
  }
  const homeId = h => [h.code, h.dong, h.jibun, h.apt, h.band].join('|');
  function parseStore(raw) {
    try {
      const j = JSON.parse(raw || 'null'); const arr = j && Array.isArray(j.list) ? j.list : [];
      const seen = new Set(), out = [];
      for (const x of arr) { const h = cleanHome(x); if (!h || seen.has(homeId(h))) continue; seen.add(homeId(h)); out.push(h); if (out.length >= MAX_HOMES) break; }
      return out;
    } catch (e) { return []; }
  }
  const dumpStore = list => JSON.stringify({ v: 1, list: list.slice(0, MAX_HOMES) });
  /** 추가(같은 집이면 바꿔 넣고 맨 앞으로). 가득 찼으면 {ok:false, full:true} */
  function addHome(list, h) {
    const c = cleanHome(h); if (!c) return { ok: false, list };
    const rest = list.filter(x => homeId(x) !== homeId(c));
    if (rest.length === list.length && list.length >= MAX_HOMES) return { ok: false, full: true, list };
    return { ok: true, list: [c, ...rest].slice(0, MAX_HOMES) };
  }
  const removeHome = (list, id) => list.filter(x => homeId(x) !== id);
  function findUnit(units, h) { return units.find(u => u[0] === h.code && u[1] === h.dong && u[8] === h.jibun && u[2] === h.apt && u[3] === h.band) || null; }
  /** 매수가 대비 변동 (최근 시세 환산 − 매수가) */
  function vsBuy(price, bp) { if (!(price > 0) || !(bp > 0)) return null; return { diff: price - bp, pct: (price - bp) / bp }; }
  /** 보유 기간(개월): 매수 연월 → 기준 연월(YYYYMM) */
  function heldMonths(bd, ym) { if (!okYm(bd) || !/^\d{6}$/.test(String(ym || ''))) return null; const a = +bd.slice(0, 4) * 12 + +bd.slice(5, 7), b = +String(ym).slice(0, 4) * 12 + +String(ym).slice(4, 6); return b - a >= 0 ? b - a : null; }

  /* ---------- 미래가치 근거 요약 — 리포트와 같은 '쉬운 말'(assets/plain-words.js 재사용), 2년 기준 ----------
     x = {apt, dong, sgg, sido, sidoShort, label, year, sid(시·도 파일 id), ev(evidence.json), sp(supply.json), PL(없으면 전역 JDJ_PLAIN)}
     reasonItems → [{t: 문장, ev: 근거 등급(PL.evid 결과) 또는 null, c: 'c'(주의)|''}] · reasons → 문장만 */
  function reasonItems(f, x) {
    const r = []; if (!f) return r;
    const PL = x.PL || root.JDJ_PLAIN || (typeof require === 'function' ? (require('./plain-words.js'), globalThis.JDJ_PLAIN) : null), G = x.G || null;
    const pct = v => Math.round(Math.abs(v) * 100);
    const Y = x.year || new Date().getFullYear();
    const EV = kind => (PL && x.ev && x.sid) ? PL.evid(x.ev, x.sid, f.eb, kind, x.sidoShort || '', G) : null;
    const add = (t, ev, c) => r.push({ t, ev: ev || null, c: c || '' });
    /* 순위에는 비교 대상(이름·곳 수)을 붙인다: '서울 아파트 4,094곳 중 상위 5%' — 곳 수(x.nfv·x.nfvg)는 index.json 값만 */
    const pctT = v => v >= 50 ? `상위 ${Math.max(1, 100 - v)}%` : `하위 ${Math.max(1, v)}%`;
    const rank = (v, base) => PL ? PL.rank(v, base) : `${base.name}${base.n ? ' ' + Number(base.n).toLocaleString() + '곳' : ''} 중 ${pctT(v)}`;
    const sdN = x.sidoShort || x.sido;
    if (f.fv != null) add(f.gs != null
      ? `이 단지는 미래가치 ${f.fv}점으로 ${rank(f.fv, { name: `${sdN} 아파트`, n: x.nfv })}예요` + (f.fvg != null ? ` · ${x.sgg} 안에서는 ${rank(f.fvg, { name: '아파트', n: x.nfvg })}예요` : '') + '(과거에 그대로 써 보고 실제 시세와 맞춰 본 점수).'
      : `이 단지는 미래가치 ${f.fv}점으로 ${rank(f.fv, { name: `${x.sgg} 아파트` })}예요(과거에 그대로 써 보고 실제 시세와 맞춰 본 점수).`);
    /* 2년 점수를 올린·내린 요인: 이 단지 실제 값·비교 기준·과거 같은 조건 통계(PL.whyItems) */
    const W = PL && PL.whyItems ? PL.whyItems(f, { h: '2', apt: x.apt, dong: x.dong, sgg: x.sgg, sido: sdN, sid: x.sid, ev: x.ev, G, sp: x.sp, year: Y,
      rp: x.IX && x.code && PL.regionPlace ? PL.regionPlace(x.IX, x.code, f.gs) : null, regionUsed: x.regionUsed !== false, IX: x.IX, code: x.code }) : { items: [], keys: new Set() };
    for (const it of W.items) add(PL.whyLine(it), it.ev);
    { const hg = PL && PL.hzGapLine ? PL.hzGapLine(f, { apt: x.apt, dong: x.dong, sgg: x.sgg, sido: sdN, sp: x.sp, year: Y, rp: x.IX && x.code ? PL.regionPlace(x.IX, x.code, f.gs) : null, regionUsed: x.regionUsed !== false, IX: x.IX, code: x.code }) : '';
      if (hg) add('보유 기간별 차이: ' + hg); }
    if (f.rz && PL) add(PL.rzText(f.rz, G, v => `${String(v).slice(0, 4)}년 ${parseInt(String(v).slice(4, 6), 10)}월`), EV('stg'));
    if (f.dd != null && Math.abs(f.dd) >= 0.03 && !W.keys.has('dd')) add(PL ? PL.ddText(f.dd, G) + (f.dd > 0 ? ' — 집값이 흔들릴 때 잘 버틴 편이에요' : ' — 시장에 따라 오르내림이 큰 편이에요')
      : `이 단지는 최근 3년 하락기에 구 평균보다 ${pct(f.dd)}%p ${f.dd > 0 ? '덜' : '더'} 내렸어요`, EV('dd'), f.dd > 0 ? '' : 'c');
    /* 고점 회복(rc)은 공개 값이 비율(예: 0.966)로 보여 '구 평균 대비 %p' 문구와 맞지 않아 이 화면에서는 싣지 않는다 */
    if (f.by || f.hh) {
      const age = f.by ? PL.ageOf(f.by, Y) : null, parts = [], tags = [];
      if (f.by && PL.ageText(f.by, Y)) parts.push(PL.ageText(f.by, Y, '준공')); if (f.hh) parts.push(`${f.hh.toLocaleString()}세대`);
      if (age != null && age >= 0 && age <= 10) tags.push('신축이에요');
      if (age != null && age >= 30) tags.push('지은 지 30년이 넘어 재건축을 추진할 수 있는 나이가 됐어요');
      else if (age != null && age >= 25) tags.push(`${30 - age}년 뒤 재건축을 추진할 수 있는 나이(30년)가 돼요`);
      if (f.hh >= 1000) tags.push('대단지예요'); else if (f.hh && f.hh < 300) tags.push('소규모 단지예요');
      add(parts.join(' · ') + (tags.length ? ' — ' + tags.join(' · ') : ''));
    }
    if (f.lg != null && !W.keys.has('lg')) {
      if ((f.ln && f.ln === x.apt) || f.lg >= 0.995) add(`${x.dong} 대장 단지예요 — 같은 평형끼리 비교해 동에서 가장 비싸게 거래돼요`, EV('lg'));
      else add(`${x.dong} 대장 단지(${f.ln || '-'})보다 같은 평형 기준 시세가 ${pct(1 - f.lg)}% 낮아요`, EV('lg'));
    }
    if (PL && x.sp) {
      for (const [c, t] of PL.supplyLines(f, x.sp, G)) add(t, null, c);
      const rn = PL.renewalLine(f, x.sp, G, x.ev); if (rn) { add(rn.text); if (rn.ref) add(rn.ref); }
    }
    const rlW = ['rlp', 'rls', 'rlo', 'rld'].some(k => W.keys.has(k));
    if (f.rl && PL && !rlW) { const R = f.rl, ymk = v => `${String(v).slice(0, 4)}년 ${parseInt(String(v).slice(4, 6), 10)}월`, SK = { plan: '계획 확정', start: '착공', start_real: '본공사 착수', delay: '개통 지연', open: '개통' };
      add(`신규 노선: ${R.line} ${R.pl ? `${/역$/.test(R.st || '') ? R.st : R.st + '역'}(개통 예정)` : R.st} 인근 — ` + (R.x ? '노선 계획 공식 취소·제외' : R.opened ? `${ymk(R.stym)} 개통했어요` : `${ymk(R.stym)} ${SK[R.stage] || R.stage}` + (R.dl ? `, ${PL.delayText(R.dl, '개통')}` : (R.target ? `, 개통 목표 ${ymk(R.target)}` : ''))), EV('rail')); }
    if (f.sc && PL && PL.scText) add('학군: ' + PL.scText(f.sc, x.gname ? x.gname(f.sc[6]) : x.sgg), EV('sch'));
    else if (f.sch != null && !W.keys.has('sch')) add('학군: ' + (PL ? PL.schText(f.sch, f.schn, G) : ''), EV('sch'));
    else if (x.schNA) add('학군: 가까운 중학교(1.5km 안) 자료 없음');
    if (f.sub != null) add(f.sub >= 30 ? '지하철역이 걸어가기엔 먼 편이에요(도보 20분 이상) — 버스·자차 위주 생활권' : `${f.subs ? f.subs.replace(/\s+/g, ' ') : '지하철역'}까지 걸어서 ${f.sub <= 5 ? '5분 이내' : f.sub + '분 이내'}예요` + (f.sub <= 10 ? ' — 역세권' : ''));
    return r;
  }
  function reasons(f, x) { return reasonItems(f, x).map(o => o.t); }

  /* ---------- 전체 기간 시세 (price/h/{구}.json) · 신고가 · 최고가 ----------
     price/{구}.json 의 hist = {hm, rm, to, cover, rcover, v, file}, 행 칸 12 = {f, hi:[금액, 연월일, 전용㎡], hi1}
     price/h/{구}.json units 행 = [동, 표시명, 평형구간, 지번, s, j] — s/j = [시작 칸, 값0, 값1, …](기준 달 hm/rm, 0 = 3개월 거래 없음) */
  /** 'YYYYMM' + n개월 */
  function ymAdd(ym, n) { const s = String(ym), t = +s.slice(0, 4) * 12 + (+s.slice(4, 6) - 1) + n; return String(Math.floor(t / 12)) + String(t % 12 + 1).padStart(2, '0'); }
  function ymDiff(a, b) { const f = v => +String(v).slice(0, 4) * 12 + +String(v).slice(4, 6); return f(b) - f(a); }
  /** '2006년 1월' */
  const ymKo = ym => ym ? `${String(ym).slice(0, 4)}년 ${parseInt(String(ym).slice(4, 6), 10)}월` : '';
  /** [시작 칸, 값…] → Map(연월 → 평당가) (0 은 빼고) */
  function decodeSeries(a, base) {
    const m = new Map(); if (!Array.isArray(a) || a.length < 2 || !base) return m;
    for (let k = 1; k < a.length; k++) if (a[k] > 0) m.set(ymAdd(base, a[0] + k - 1), a[k]);
    return m;
  }
  /** h 파일에서 u 의 행 찾기: 같은 생성본(v)이면 같은 순서 i, 아니면 앞 4칸(동·표시명·평형·지번)으로 */
  function histRow(h, u, i, v) {
    if (!h || !Array.isArray(h.units) || !u) return null;
    const ok = r => r && r[0] === u[1] && r[1] === u[2] && r[2] === u[3] && String(r[3]) === String(u[8]);
    if (i != null && i >= 0 && (v == null || v === h.v) && ok(h.units[i])) return h.units[i];
    return h.units.find(ok) || null;
  }
  /** 전체 기간 월별 시세(금액, 만원) — {months, s:[매매], j:[전세], jr:[전세가율 0~1 또는 0], from, rfrom}
      area = 전용㎡(행 칸 4). 값 없는 달은 0 */
  function histSeries(h, row, area) {
    if (!h || !row) return null;
    const sm = decodeSeries(row[4], h.hm), jm = decodeSeries(row[5], h.rm);
    if (!sm.size && !jm.size) return null;
    const keys = [...sm.keys(), ...jm.keys()].sort(), first = keys[0], to = h.to || keys[keys.length - 1];
    const months = []; for (let ym = first; ym <= to; ym = ymAdd(ym, 1)) months.push(ym);
    const s = months.map(ym => toPrice(sm.get(ym) || 0, area)), j = months.map(ym => toPrice(jm.get(ym) || 0, area));
    const jr = months.map(ym => { const a = sm.get(ym), b = jm.get(ym); return a > 0 && b > 0 ? b / a : 0; });
    return { months, s, j, jr, from: sm.size ? [...sm.keys()].sort()[0] : '', rfrom: jm.size ? [...jm.keys()].sort()[0] : '' };
  }
  /** 차트 선 나누기 — 값 있는 달(>0)끼리 붙은 실선 조각(solid: 인덱스 배열들)과,
      그 사이 거래 없는 구간을 앞뒤 실제 값끼리 잇는 점선 조각(gaps: [앞 인덱스, 뒤 인덱스]).
      사이 달의 값은 만들지 않는다(시각적 연결만). 맨 앞·맨 뒤의 빈 달은 잇지 않음 */
  function lineParts(a) {
    const solid = [], gaps = []; let cur = null, prev = -1;
    (a || []).forEach((v, i) => {
      if (!(v > 0)) { cur = null; return; }
      if (prev >= 0 && i - prev > 1) gaps.push([prev, i]);
      if (!cur) { cur = []; solid.push(cur); }
      cur.push(i); prev = i;
    });
    return { solid, gaps };
  }
  /** 차트 안내선용: a[i] 값. 실제 값이면 {v, real:true}, 거래 없는 달이 앞뒤 실제 값 사이(점선 구간)면
      그 두 값을 이은 선 위의 값 {v, real:false, from, to}(표시용 — 실제 거래가 아님), 맨 앞·맨 뒤 빈 달은 null */
  function valAt(a, i) {
    if (!a || !(i >= 0 && i < a.length)) return null;
    if (a[i] > 0) return { v: a[i], real: true };
    let p = i - 1, q = i + 1;
    while (p >= 0 && !(a[p] > 0)) p--;
    while (q < a.length && !(a[q] > 0)) q++;
    if (p < 0 || q >= a.length) return null;
    return { v: a[p] + (a[q] - a[p]) * (i - p) / (q - p), real: false, from: p, to: q };
  }
  /** 갭(매매 − 전세)·갭 비율(갭 ÷ 매매)·전세가율(전세 ÷ 매매). 둘 중 하나라도 없으면 null. 금액 단위 그대로 */
  function gapOf(s, j) {
    if (!(s > 0 && j > 0)) return null;
    const gap = s - j;
    return { gap, pct: gap / s, jr: j / s };
  }
  /** 한 달 안내선 값: t = histSeries(또는 같은 모양 {months, s, j}) → {ym, s, j, gap}
      s·j = valAt 결과, gap = 매매·전세가 모두 그 달 실제 값일 때만 gapOf (이은 값으로는 계산하지 않음) */
  function monthPoint(t, i) {
    if (!t || !t.months || !(i >= 0 && i < t.months.length)) return null;
    const s = valAt(t.s, i), j = valAt(t.j, i);
    return { ym: t.months[i], s, j, gap: s && j && s.real && j.real ? gapOf(s.v, j.v) : null };
  }
  /** 거래가 아주 드문가: 마지막 n(기본 36)개월 중 값 있는 달이 1/3 미만 (값이 하나도 없으면 false) */
  function isSparse(a, n) {
    const w = (a || []).slice(-(n || 36)), k = w.filter(v => v > 0).length;
    return k > 0 && k * 3 < w.length;
  }
  /** 구 전체 비교선: 구 월별 평당가 s(sMonths 와 같은 칸, index.json sgg[].s·months) → months 칸에 맞춘
      같은 면적 환산 금액(평당가 × area ÷ 3.3058, 100만 원 반올림). 구 자료가 없는 달은 0 */
  function sggLine(s, sMonths, months, area) {
    const mp = new Map(); (sMonths || []).forEach((ym, i) => { if (s && s[i] > 0) mp.set(String(ym), s[i]); });
    return (months || []).map(ym => toPrice(mp.get(String(ym)) || 0, area));
  }
  /** 단지 대 구 전체: (단지 − 구) ÷ 구 → {pct, txt}. 둘 중 하나라도 없으면 null. 반올림 0% = 비슷해요 */
  function vsSgg(me, g) {
    if (!(me > 0 && g > 0)) return null;
    const d = (me - g) / g, p = Math.round(Math.abs(d) * 100);
    return { pct: d, txt: p === 0 ? '이 단지가 비슷해요' : `이 단지가 ${p}% ${d > 0 ? '높아요' : '낮아요'}` };
  }
  /** 마지막 span 개월만 (span 없으면 전체) */
  function histWindow(t, span) {
    if (!t || !span || span >= t.months.length) return t;
    const st = t.months.length - span, cut = a => a.slice(st);
    return Object.assign({}, t, { months: cut(t.months), s: cut(t.s), j: cut(t.j), jr: cut(t.jr) });
  }
  /** 기간 단추: 자료 길이보다 짧은 1·3·5년 + 전체 */
  function histSpans(t) {
    const n = t ? t.months.length : 0;
    return [12, 36, 60].filter(m => m < n).map(m => ({ span: m, label: m / 12 + '년' })).concat([{ span: 0, label: '전체' }]);
  }
  /** 역대·최근 1년 최고가 요약. hist = price/{구}.json hist, price = 지금 시세(만원, 없으면 0)
      → null 또는 {hi:{amt, ymd, at, area, vs}, hi1:{…}, label, note} */
  function highs(u, hist, price) {
    const x = u && u[12]; if (!x || !Array.isArray(x.hi)) return null;
    const one = a => a && a[0] > 0 ? { amt: a[0], ymd: a[1], at: String(a[1]).slice(0, 6), area: a[2], vs: price > 0 ? (price - a[0]) / a[0] : null } : null;
    const start = (hist && (hist.cover || hist.hm)) || '';
    const allTime = !!(x.f && start && x.f > start);                       // 수집 시작보다 늦게 첫 거래 → 그 단지 역대
    const hi = one(x.hi), mf = hist && /^\d{6}$/.test(String(hist.mf || '')) ? String(hist.mf) : '';
    const ref = !!(hi && mf && hi.at < mf);                                // 예측 모델 자료 시작(hist.mf) 전 기록 → '참고'
    const notes = [allTime ? `첫 거래(${ymKo(x.f)}) 이후 수집 자료 기준` : '', ref ? `${mf.slice(4) === '01' ? mf.slice(0, 4) + '년' : ymKo(mf)} 이전 기록이라 참고로 보여 드려요` : ''].filter(Boolean);
    return { hi, hi1: one(x.hi1), f: x.f || '', start, ref,
      label: allTime || !start ? '역대 최고가' : `${ymKo(start)} 이후 최고가`,
      note: notes.join(' · ') };
  }
  /** 개별 거래 6번째 칸: 신고가 1 */
  const isNewHigh = t => !!(t && t[5] === 1);

  /* ---------- 표시 ---------- */
  /** 만원 → '12억 3,400만원' */
  function won(man) {
    man = Math.round(+man || 0); const neg = man < 0; man = Math.abs(man);
    const e = Math.floor(man / 10000), r = man % 10000;
    const s = (e ? e.toLocaleString('ko-KR') + '억' : '') + (r ? (e ? ' ' : '') + r.toLocaleString('ko-KR') + '만' : '') + '원';
    return (neg ? '-' : '') + (man ? s : '0원');
  }
  /** 점수 자료(fx)의 이상값 방어: 용적률이 50~1000% 밖이거나 대지지분이 전용의 5배를 넘으면 그 값과 그 값으로 만든 순위를 지워
      화면 근거 문장에서 빠지게 한다(엔진 build_site.far_ok·land_ok 와 같은 기준). 고친 f 를 그대로 돌려줌 */
  function cleanFx(f) {
    if (!f || typeof f !== 'object' || f._c) return f;
    if (f.vl != null && !(f.vl >= 50 && f.vl <= 1000)) { f.vl = null; f.rbp = null; if (f.eg) f.eg = null; }
    const lim = f.area ? f.area / PY * 5 : Infinity;
    if (f.land != null && !(f.land > 0 && f.land <= lim)) { f.land = null; if (f.eg) f.eg = null; }
    if (f.landavg != null && !(f.landavg > 0 && f.landavg <= lim)) { f.landavg = null; f.lrk = null; }
    /* 화면 점수 상한 99: 상위 0.5% 안 단지가 모두 100점으로 겹쳐 보이지 않게. 정렬은 원래 값(fvSort)으로 */
    if (f.fv != null) { f.fv0 = f.fv; f.fvSort = f.fv; f.fv = Math.min(99, f.fv); }
    if (f.fvg != null) f.fvg = Math.min(99, f.fvg);
    try { Object.defineProperty(f, '_c', { value: 1, enumerable: false }); } catch (e) {}
    return f;
  }
  const pctTxt = (v, d) => v == null ? '-' : (v > 0 ? '+' : '') + (v * 100).toFixed(d == null ? 1 : d) + '%';

  const API = { PY, r100, STORE_KEY, MAX_HOMES, FEW, NICK, counts, lastIdx, median, toPrice, ymLabel, xTicks, danjiKey, agentKey, premiumKey, groupDanji, searchDanji,
    normName, normLight, splitNum, matchName, matchDanji, matchedAlias, suggestDanji, missRows, MISS_WHY, logMiss, dice, listRow, unitKey, hasScore, scoreOf, monthDeals, trades, lastDeal, isFew,
    bandSummary, changeBack, dongPosition, sggPosition, trend, volume, volumeCounts, cleanHome, homeId, parseStore, dumpStore, addHome, removeHome, findUnit, areaTypes, areaPick, areaUnit, vsBuy, heldMonths, reasons, reasonItems, won, pctTxt, cleanFx,
    ymAdd, ymDiff, ymKo, decodeSeries, histRow, histSeries, histWindow, histSpans, sggLine, vsSgg, highs, isNewHigh, lineParts, isSparse, valAt, gapOf, monthPoint };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.JDJ_MINE = API;
})(typeof self !== 'undefined' ? self : this);
