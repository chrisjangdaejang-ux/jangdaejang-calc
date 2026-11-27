/* 받은 분양 광고 확인하기 — 계산·판정 공용 파일. 화면(bunyang/check/)과 고민 찾기 길잡이(ad_check)가 같은 함수를 써서 같은 글이면 같은 결과가 나와요.
   브라우저 window.JDJ_ADCHK, node require 둘 다(시험: node tools/adcheck-test.js </dev/null).

   개인정보
     · 붙여 넣은 글·캡처는 이 기기 안에서만 읽어요. 서버로 보내지 않고, 기기에도 남기지 않아요(주소·공유·집계 모두 제외).
     · scrub(): 오류 기록 등 어디에든 글이 남을 일이 생기면 전화번호·이메일·담당자 이름을 먼저 지워요.

   흐름
     parse(text)                → 광고에서 뽑은 값 ext(현장명·주소·역·분양가·할인·면적·계약 조건·문구 주장·시공사·규모·유형)
     placeOf(ext, IX)           → 시·군·구 코드(공개 data/index.json 의 sgg 이름으로)
     matchNotice(ext, rows)     → 청약홈·분양 공고(data/bunyang/notices.json) 중 가장 비슷한 것(점수가 낮으면 null)
     nearPrice(units, o)        → 주변 같은 면적대 신축·준신축(첫 거래 10년 이내) 실거래 평당가(data/price/{구}.json)
     build(ext, ctx)            → 진단 리포트(assets/diag.js rep 모양). 판정은 '확인한 사실'·'확인할 점'으로만 — 사라·말라는 말을 하지 않아요.

   판정 기준(화면 '왜 그런가요?'에 그대로 적어요)
     가격: 할인 뒤 3.3㎡당 값이 주변 비교 중간값 대비 +5% 이하 '괜찮아요' · +5~20% '주의' · 20% 넘게 높으면 '위험'(높다는 사실만) · 비교 자료가 모자라면 '확인 필요'
     잔금 유예: 지금 대출 규칙(assets/loan-rules.js — 무주택·소득 미반영)으로 입주 때 받을 수 있는 최대 주담대가 중도금 대출(가정)보다 적으면 '위험', 아니면 유예 금액이 있으니 '주의'
     실거주·전매: 광고 문구와 규칙(assets/cy-plan.js rules — 법령 원문 대조본)이 다르면 '주의 · 광고 문구와 다를 수 있어요'
     역 거리: 공고 위치(또는 동 가운데 점)에서 역까지 직선 거리 ÷ 분당 67m. 광고 분보다 3분(또는 절반) 넘게 길면 '주의'
     개발 호재: 공식 발표 자료(data/devmap.json)에서 이름이 맞는 사업만 단계·출처와 함께, 못 찾은 말은 '확인되지 않은 내용' */
(function (root) {
  'use strict';
  const PY = 3.3058, WALK = 67;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = n => Number(n).toLocaleString('ko-KR');
  function won(m) {
    if (m == null || isNaN(m)) return '–';
    m = Math.round(m); const neg = m < 0; m = Math.abs(m);
    const e = Math.floor(m / 10000), r = m % 10000;
    return (neg ? '-' : '') + (e ? e + '억' + (r ? ' ' + fmt(r) + '만' : '') + ' 원' : fmt(r) + '만 원');
  }
  const ymTxt = s => { s = String(s || ''); return s.length >= 6 ? `${s.slice(0, 4)}년 ${+s.slice(4, 6)}월` : ''; };
  const dot8 = s => { s = String(s || '').replace(/\D/g, ''); return s.length >= 8 ? `${s.slice(0, 4)}.${+s.slice(4, 6)}.${+s.slice(6, 8)}` : ymTxt(s); };
  const median = a => { const v = a.filter(x => isFinite(x)).sort((x, y) => x - y), n = v.length; return !n ? 0 : n % 2 ? v[(n - 1) / 2] : (v[n / 2 - 1] + v[n / 2]) / 2; };
  const quant = (a, p) => { const v = a.filter(x => isFinite(x)).sort((x, y) => x - y); if (!v.length) return 0; const i = (v.length - 1) * p, lo = Math.floor(i), hi = Math.ceil(i); return v[lo] + (v[hi] - v[lo]) * (i - lo); };
  function distM(a, b) {
    const R = 6371000, r = x => x * Math.PI / 180, dLa = r(b[1] - a[1]), dLo = r(b[0] - a[0]);
    const h = Math.sin(dLa / 2) ** 2 + Math.cos(r(a[1])) * Math.cos(r(b[1])) * Math.sin(dLo / 2) ** 2;
    return Math.round(2 * R * Math.asin(Math.sqrt(h)));
  }
  const mTxt = m => m >= 1000 ? `${(m / 1000).toFixed(1)}km` : `${Math.round(m / 10) * 10}m`;
  const bandOf = ar => ar <= 60 ? 0 : ar <= 85 ? 1 : 2;
  const BAND = ['전용 60㎡ 이하', '전용 60~85㎡', '전용 85㎡ 초과'];
  const norm = s => String(s || '').replace(/\s+/g, '').toLowerCase();

  /* ================= 개인정보 지우기 ================= */
  const RX_TEL = /(?:\+?82[-.\s]?)?0\d{1,2}[-.\s)]*\d{3,4}[-.\s]*\d{4}|\b1[5-9]\d{2}[-.\s]?\d{4}\b/g;
  const RX_MAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/g;
  const RX_NAME = /([가-힣]{2,4})\s*(실장|팀장|부장|과장|차장|대리|이사|상무|본부장|대표|소장|상담사|매니저|주임|사원|님)(?![가-힣])/g;
  const RX_NAME2 = /(담당|상담|문의|대표)\s*[:：]?\s*([가-힣]{2,4})(?=\s|$|[,·/)])/g;
  /** 전화번호·이메일·담당자 이름을 지운 글 — 오류 기록 등 글이 어딘가 남을 때 먼저 거쳐요 */
  function scrub(s) {
    return String(s == null ? '' : s).replace(RX_TEL, '[전화번호]').replace(RX_MAIL, '[이메일]')
      .replace(RX_NAME, (m, n, t) => '○○○ ' + t).replace(RX_NAME2, (m, k) => k + ' ○○○');
  }

  /* ================= 금액 읽기(만원) ================= */
  /* '4억 9,800만원' 49800 · '4억9천' 49000 · '1억2천만' 12000 · '3천만원' 3000 · '49,800만원' 49800 · '500만원' 500 · '5억대' 50000(대=그 금액부터) */
  const MONEY = '(\\d[\\d,]*(?:\\.\\d+)?\\s*억(?:\\s*\\d[\\d,]*\\s*(?:천|백)?\\s*만?)?|\\d[\\d,]*(?:\\.\\d+)?\\s*(?:천|백)\\s*만?|\\d[\\d,]*\\s*만)\\s*(?:원)?';
  function money(t) {
    t = String(t || '').replace(/\s+/g, '').replace(/원$/, '');
    const n = x => +String(x).replace(/,/g, '');
    let m = /^(\d[\d,]*(?:\.\d+)?)억(?:(\d[\d,]*)(천|백)?만?)?/.exec(t);
    if (m) { const e = n(m[1]) * 10000; let r = m[2] ? n(m[2]) : 0; if (m[3] === '천') r *= 1000; else if (m[3] === '백') r *= 100; return Math.round(e + r); }
    m = /^(\d[\d,]*(?:\.\d+)?)(천|백)만?/.exec(t);
    if (m) return Math.round(n(m[1]) * (m[2] === '천' ? 1000 : 100));
    m = /^(\d[\d,]*)만/.exec(t);
    if (m) return n(m[1]);
    return null;
  }

  /* ================= 광고 읽기 ================= */
  const SIDO_ALIAS = { 서울: '서울특별시', 부산: '부산광역시', 대구: '대구광역시', 인천: '인천광역시', 광주: '전남광주통합특별시', 대전: '대전광역시', 울산: '울산광역시', 세종: '세종특별자치시',
    경기: '경기도', 강원: '강원특별자치도', 충북: '충청북도', 충남: '충청남도', 전북: '전북특별자치도', 전남: '전남광주통합특별시', 경북: '경상북도', 경남: '경상남도', 제주: '제주특별자치도' };
  const DEV_WORDS = [
    [/GTX\s*[-–]?\s*([A-F])/gi, m => 'GTX-' + m[1].toUpperCase()], [/GTX(?!\s*[-–]?\s*[A-F])/gi, () => 'GTX'],
    [/신분당선(?:\s*(?:연장|개통|예정))?/g, () => '신분당선'], [/(\d{1,2})\s*호선\s*(연장|신설|개통|예정|착공)/g, m => `${m[1]}호선 ${m[2]}`],
    [/([가-힣]{2,6}선)\s*(연장|신설|개통 ?예정|착공|예정)/g, m => `${m[1]} ${m[2]}`],
    [/(?:역\s*)?신설\s*역|신설\s*예정\s*역|([가-힣]{1,8}역)\s*(신설|개통)\s*예정/g, m => m[1] ? `${m[1]} ${m[2]} 예정` : '신설역'],
    [/트램/g, () => '트램'], [/경전철/g, () => '경전철'], [/복합\s*환승\s*센터/g, () => '복합환승센터'],
    [/(?:[가-힣A-Za-z]{2,8}\s*)?(?:국가\s*)?산업\s*단지|산단/g, m => m[0].replace(/\s+/g, ' ').trim()], [/테크노\s*밸리|테크노\s*폴리스/g, m => m[0].replace(/\s+/g, '')],
    [/반도체\s*(?:클러스터|벨트|공장|단지)?/g, m => m[0].replace(/\s+/g, ' ')], [/(삼성전자|SK하이닉스|현대차|LG전자|LG디스플레이)\s*(?:공장|캠퍼스|사업장|이전|투자)?/g, m => m[0].trim()],
    [/재개발|재건축|정비\s*사업|뉴타운/g, m => m[0].replace(/\s+/g, '')], [/(?:대형\s*)?(?:쇼핑몰|백화점|스타필드|아울렛)/g, m => m[0].trim()],
    [/([가-힣]{2,8})\s*IC\s*(?:개통|신설|예정)?/g, m => m[0].trim()], [/개발\s*호재|미래\s*가치|프리미엄\s*예상|웃돈/g, m => m[0].replace(/\s+/g, ' ')]
  ];
  const SCHOOL_WORDS = /(초품아|초·중·고|초중고|학세권|명문\s*학군|학군|학원가|초등학교|중학교|고등학교|[가-힣]{2,6}(초|중|고)\s*(도보|바로|인접|앞))/g;
  const BRAND = [['자이', 'GS건설'], ['래미안', '삼성물산'], ['힐스테이트', '현대건설'], ['디에이치', '현대건설'], ['푸르지오', '대우건설'], ['써밋', '대우건설'], ['e편한세상', 'DL이앤씨'], ['이편한세상', 'DL이앤씨'], ['아크로', 'DL이앤씨'],
    ['아이파크', 'HDC현대산업개발'], ['롯데캐슬', '롯데건설'], ['더샵', '포스코이앤씨'], ['SK뷰', 'SK에코플랜트'], ['위브', '두산건설'], ['한화포레나', '한화 건설부문'], ['호반써밋', '호반건설'], ['중흥S클래스', '중흥토건'], ['우미린', '우미건설'], ['데시앙', '태영건설'], ['서희스타힐스', '서희건설'], ['더플래티넘', '쌍용건설'], ['코오롱하늘채', '코오롱글로벌']];
  const lines = t => String(t || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  function cleanName(s) {
    let v = String(s || '').replace(/\(광고\)|\[광고\]|광고\)|^\s*광고\s*/g, '').replace(/[★☆◆◇■□●○▶▷►※♥❤️✔✅🔥📢📣💰🏠🏢🚇!！]/gu, ' ').replace(/\s+/g, ' ').trim(), p;
    do { p = v; v = v.replace(/\s*(분양|모델하우스|홍보관|그랜드\s*오픈|오픈|특별|잔여\s*세대|선착순|동호수?\s*지정|안내|소식|아파트|오피스텔)\s*$/g, '').trim(); } while (v !== p);
    return v;
  }
  function nameOf(text) {
    const brx = /[【\[「『<〈]\s*([^】\]」』>〉\n]{3,40})\s*[】\]」』>〉]/g; let br;
    while ((br = brx.exec(text))) if (!/광고|문자|안내|공지|web\s*발신|알림/i.test(br[1])) { const n = cleanName(br[1]); if (n.length >= 3) return n; }
    for (const l of lines(text).slice(0, 4)) {
      if (/web\s*발신|^\(?광고\)?$|수신\s*거부|무료\s*거부/i.test(l)) continue;
      const m = /([가-힣A-Za-z0-9·]+(?:\s[가-힣A-Za-z0-9·]+){0,4})\s*(?:아파트|오피스텔|도시형생활주택|생활숙박시설|레지던스)?\s*(?:분양|특별\s*분양|잔여\s*세대|선착순|홍보관|모델하우스)/.exec(l);
      if (m) { const n = cleanName(m[1]); if (n.length >= 3) return n; }
    }
    const first = lines(text).find(l => !/web\s*발신|^\(?광고\)?$/i.test(l));
    const f = cleanName(first || '');
    return f && f.length <= 30 ? f : '';
  }
  function typeOf(t) {
    if (/지역\s*주택\s*조합|조합원\s*(모집|가입|분양)/.test(t)) return '지역주택조합';
    if (/생활\s*숙박|생숙|레지던스/.test(t)) return '생활숙박시설';
    if (/도시형\s*생활\s*주택|도생/.test(t)) return '도시형생활주택';
    if (/오피스텔|아파텔|주거형\s*오피/.test(t)) return '오피스텔';
    if (/지식\s*산업\s*센터/.test(t)) return '지식산업센터';
    if (/민간\s*임대|임대\s*후\s*분양|협동\s*조합형|장기\s*임대/.test(t)) return '민간임대';
    if (/아파트|APT|단지|세대|청약/i.test(t)) return '아파트';
    return '';
  }
  function parse(text) {
    const t = String(text || '').replace(/ /g, ' ').slice(0, 6000), flat = t.replace(/\s+/g, ' ');
    const x = { raw: !!t.trim(), name: nameOf(t), type: typeOf(flat), claims: {}, dev: [], school: [], found: [] };
    /* 주소 */
    const sdRx = new RegExp('(' + Object.keys(SIDO_ALIAS).join('|') + ')(?:특별시|광역시|특별자치시|특별자치도|도|시)?\\s*');
    const adSrc = '([가-힣]{1,5}(?:시|군|구))(?:\\s*([가-힣]{1,5}구))?(?:\\s*([가-힣0-9]{1,8}(?:동|읍|면|가|리)))?';
    const BADA = /^(도시|광고|분양|오피|단지|역세|학세|초역)|숙박시$|(개시|표시|전시|게시|일시|즉시|동시|당시|수시|임시|입구|출구|창구|연구|요구|가구|지구)$/;
    let ad = new RegExp(sdRx.source + adSrc).exec(flat);
    if (ad && BADA.test(ad[2])) ad = null;
    if (!ad) { const rg = new RegExp('(?:^|[^가-힣])()' + adSrc, 'g'); let m; while ((m = rg.exec(flat))) { if (!BADA.test(m[2])) { ad = m; break; } } }
    if (ad) {
      x.addr = { sd: ad[1] ? SIDO_ALIAS[ad[1]] : '', a: ad[2], b: ad[3] || '', dong: ad[4] && !/역$/.test(ad[4]) ? ad[4] : '' };
      x.found.push('주소');
    }
    /* 역 · 걸어서 N분 */
    const st = /([가-힣A-Za-z0-9]{1,10})역\s*(?:까지\s*)?(?:도보|걸어서|걸어)?\s*(?:약\s*)?(\d{1,2})\s*분/.exec(flat) || null;
    const st2 = !st && /(?:도보|걸어서)\s*(?:약\s*)?(\d{1,2})\s*분\s*(?:거리\s*)?(?:의\s*)?([가-힣A-Za-z0-9]{1,10})역/.exec(flat);
    if (st) x.station = { name: st[1].replace(/^(초|지하철|전철)/, ''), min: +st[2] };
    else if (st2) x.station = { name: st2[2], min: +st2[1] };
    else { const s3 = /([가-힣A-Za-z0-9]{2,10})역\s*(?:초역세권|역세권|바로\s*앞|인접)/.exec(flat); if (s3) x.station = { name: s3[1], min: null, word: true }; }
    if (x.station) x.found.push('역 거리');
    /* 면적 */
    let ar = /전용\s*(?:면적)?\s*(\d{2,3}(?:\.\d+)?)\s*(?:㎡|m²|m2|제곱미터)/.exec(flat) || /(\d{2,3}(?:\.\d+)?)\s*(?:㎡|m²|m2)/.exec(flat) || /\b(59|74|76|84|99|101|114|119|126)\s*(?:[A-D]\s*)?(?:타입|type|형)(?![가-힣])/i.exec(flat);
    if (ar) x.area = { m2: +ar[1], from: '전용' };
    else { const py = /(\d{2})\s*평형/.exec(flat) || /(\d{2})\s*평(?!당|균|택|가|형)/.exec(flat); if (py && +py[1] >= 10 && +py[1] <= 80) x.area = { m2: Math.round(+py[1] * 2.47), py: +py[1], from: '평형' }; }
    if (x.area) x.found.push('면적');
    /* 분양가 · 할인 */
    const M = MONEY;
    const pFlat = flat.replace(new RegExp('(?:기존|정상|당초|원)\\s*분양가\\s*[:：]?\\s*' + M), m => ' '.repeat(m.length));
    const pr = new RegExp('(?:분양가|분양\\s*금액|공급\\s*금액|총\\s*분양가)\\s*[:：]?\\s*(?:약\\s*)?' + M).exec(pFlat)
      || new RegExp('(?:\\d{2,3}\\s*(?:㎡|타입|형|평형?)\\s*)' + M + '(?:\\s*대)?').exec(flat);
    if (pr) { const v = money(pr[1]); if (v && v >= 3000 && v <= 1000000) { x.price = { v, approx: /대/.test(flat.slice(pr.index, pr.index + pr[0].length + 2)) }; x.found.push('분양가'); } }
    const ppy = new RegExp('평당\\s*(?:가\\s*)?(?:약\\s*)?' + M).exec(flat) || new RegExp('3\\.3\\s*㎡\\s*당\\s*' + M).exec(flat);
    if (ppy) { const v = money(ppy[1]); if (v && v >= 300 && v <= 30000) x.ppy = v; }
    const dc = new RegExp('(?:최대\\s*)?' + M + '\\s*(?:까지\\s*)?(?:할인|인하|다운|DC|파격\\s*할인)', 'i').exec(flat) || new RegExp('(?:할인|인하)\\s*(?:금액)?\\s*[:：]?\\s*(?:최대\\s*)?' + M).exec(flat);
    const dcp = /(?:분양가\s*)?(?:최대\s*)?(\d{1,2}(?:\.\d)?)\s*%\s*(?:까지\s*)?(?:할인|인하|DC)/i.exec(flat) || /(?:할인|인하)\s*(?:분양|율)?\s*[:：]?\s*(?:최대\s*)?(\d{1,2}(?:\.\d)?)\s*%/.exec(flat);
    if (dc) { const v = money(dc[1]); if (v && v >= 100) x.disc = { amt: v, max: /최대/.test(dc[0]) }; }
    if (!x.disc && dcp) x.disc = { pct: +dcp[1], max: /최대/.test(dcp[0]) };
    if (x.disc) x.found.push('할인');
    const was = new RegExp('(?:기존\\s*분양가|정상\\s*분양가|당초|원\\s*분양가)\\s*[:：]?\\s*' + M).exec(flat);
    if (was) { const v = money(was[1]); if (v) x.was = v; }
    /* 계약 조건 */
    const dp = /계약금\s*(\d{1,2})\s*%/.exec(flat), dpa = new RegExp('계약금\\s*(?:정액제\\s*)?' + M).exec(flat);
    x.pay = {};
    if (dp) x.pay.dp = +dp[1]; else if (dpa) { const v = money(dpa[1]); if (v) x.pay.dpAmt = v; }
    if (/계약금[^/·,|]{0,14}정액|정액\s*계약금/.test(flat)) x.pay.flat = true;
    const mid = /중도금\s*(?:대출\s*)?(\d{1,2})\s*%/.exec(flat); if (mid) x.pay.mid = +mid[1];
    if (/중도금\s*(?:\d{1,2}\s*%\s*)?(?:전액\s*)?무이자/.test(flat)) x.pay.midFree = true;
    if (/중도금\s*(?:\d{1,2}\s*%\s*)?이자\s*후불/.test(flat)) x.pay.midAfter = true;
    const bal = /잔금\s*(?:의\s*)?(\d{1,2})\s*%\s*(?:를\s*)?(?:입주\s*)?(?:후\s*)?(\d{1,2})\s*년\s*(?:간\s*|동안\s*)?(?:유예|뒤|후\s*납부|후에\s*납부)/.exec(flat)
      || /잔금\s*(?:납부\s*)?유예\s*[:：]?\s*(?:잔금\s*)?(\d{1,2})\s*%\s*[,·]?\s*(\d{1,2})\s*년/.exec(flat)
      || /잔금\s*(?:납부\s*)?(\d{1,2})\s*년\s*유예\s*\(?\s*(?:잔금\s*)?(\d{1,2})\s*%/.exec(flat);
    if (bal) { const a = +bal[1], b = +bal[2]; const pct = /년\s*유예\s*\(?\s*(?:잔금\s*)?\d/.test(bal[0]) ? b : a, yrs = pct === b ? a : b; x.pay.defer = { pct, yrs }; }
    else { const b2 = /잔금\s*(?:납부\s*)?(?:(\d{1,2})\s*년\s*)?유예/.exec(flat); if (b2) x.pay.defer = { pct: null, yrs: b2[1] ? +b2[1] : null }; }
    const balp = /잔금\s*(\d{1,2})\s*%/.exec(flat); if (balp && !(x.pay.defer && x.pay.defer.pct === +balp[1])) x.pay.bal = +balp[1];
    if (x.pay.defer) x.found.push('잔금 유예');
    if (x.pay.midFree || x.pay.midAfter) x.found.push('중도금 조건');
    /* 문구 주장 */
    const C = x.claims;
    if (/실\s*거주\s*(?:의무)?\s*(?:가\s*)?(?:없|X|x|면제|무|미적용|NO)/i.test(flat) || /거주\s*의무\s*(?:없|X|면제|미적용)/.test(flat)) C.noLive = true;
    if (/전매\s*(?:제한)?\s*(?:없|무제한|자유|가능|X|미적용)|즉시\s*전매|무제한\s*전매/.test(flat)) C.noResale = true;
    if (/전세\s*(?:가|값|금|가격)\s*(?:으로|로|만으로|수준으로)\s*(?:내\s*집|입주|마련|소유|구입|매입)|전세\s*(?:가|값)\s*수준(?:의|으로)?\s*(?:분양|매입|내\s*집)/.test(flat)) C.jeonse = true;
    if (/청약\s*통장\s*(?:필요\s*)?(?:없|무관|X|불필요)|통장\s*(?:없이|무관|불필요)/.test(flat)) C.noBank = true;
    if (/주택\s*수\s*(?:에\s*)?(?:미포함|제외|산정\s*제외|포함\s*안)/.test(flat)) C.noCount = true;
    if (/(?:확정|보장)\s*(?:수익|임대료|금리)|수익\s*(?:률\s*)?보장|환매\s*(?:보장|조건)|안심\s*보장|분양가\s*보장|원금\s*보장/.test(flat)) C.promise = true;
    if (/선착순|동\s*·?\s*호수?\s*지정|잔여\s*세대|무순위|줍줍|미분양\s*세대/.test(flat)) C.firstCome = true;
    if (/즉시\s*입주|바로\s*입주|입주\s*중/.test(flat)) C.ready = true;
    if (/무주택\s*(?:자\s*)?(?:만|우선)|규제\s*(?:없|프리|X)|비\s*규제/.test(flat)) C.noReg = /규제\s*(?:없|프리|X)|비\s*규제/.test(flat);
    if (/대출\s*(?:한도\s*)?(?:무관|걱정\s*없|문제\s*없|100\s*%|전액)|DSR\s*(?:미적용|무관|X)/i.test(flat)) C.loanEasy = true;
    Object.keys(C).forEach(k => { if (!C[k]) delete C[k]; });
    /* 개발 호재 · 학군 */
    const seen = new Set();
    DEV_WORDS.forEach(([rx, f]) => { rx.lastIndex = 0; let m; while ((m = rx.exec(flat))) { const v = f(m).trim(); if (v && !seen.has(norm(v))) { seen.add(norm(v)); x.dev.push(v); } if (!rx.global) break; } });
    x.dev = x.dev.filter(v => !(v === 'GTX' && x.dev.some(d => /^GTX-/.test(d))));
    SCHOOL_WORDS.lastIndex = 0; let sm; const ss = new Set();
    while ((sm = SCHOOL_WORDS.exec(flat))) { const v = sm[0].replace(/\s+/g, ' ').trim(); if (!ss.has(v)) { ss.add(v); x.school.push(v); } }
    if (x.dev.length) x.found.push('개발 호재');
    if (x.school.length) x.found.push('학군');
    /* 시공사 · 규모 · 입주 */
    const bd = /시공(?:사)?\s*[:：]?\s*(?:\(주\)|㈜)?\s*([가-힣A-Za-z&]{2,12}(?:건설|산업개발|산업|이앤씨|E&C|에코플랜트|글로벌|건영|토건|종합건설|개발|건설부문))/.exec(flat);
    if (bd) x.builder = { name: bd[1], from: 'text' };
    else { const b = BRAND.find(([k]) => norm(flat).indexOf(norm(k)) >= 0); if (b) x.builder = { name: b[1], from: 'brand', brand: b[0] }; }
    const hh = /(?:총\s*)?([\d,]{2,6})\s*(?:세대|가구|실|호실)(?!\s*(?:중|만|남음|남았))/.exec(flat); if (hh) { const v = +hh[1].replace(/,/g, ''); if (v >= 10 && v <= 20000) x.hh = v; }
    const fl = /지하\s*(\d{1,2})\s*층?\s*[~∼\-–]\s*지상\s*(\d{1,3})\s*층/.exec(flat); if (fl) x.floors = { b: +fl[1], top: +fl[2] };
    const dongs = /(\d{1,3})\s*개\s*동/.exec(flat); if (dongs) x.dongs = +dongs[1];
    const mv = /(\d{4})\s*년\s*(\d{1,2})\s*월\s*(?:입주|준공)/.exec(flat); if (mv) x.move = `${mv[1]}${String(+mv[2]).padStart(2, '0')}`;
    if (x.builder) x.found.push('시공사');
    if (x.hh || x.floors) x.found.push('규모');
    return x;
  }

  /* ================= 지역 찾기 ================= */
  /** IX = data/index.json → { code, sgg 이름, sido, sid(sNN), dong } | null */
  function placeOf(ext, IX) {
    if (!ext || !ext.addr || !IX || !IX.sgg) return null;
    const A = ext.addr, cand = [];
    for (const code of Object.keys(IX.sgg)) {
      const g = IX.sgg[code], nm = g.name;
      if (A.sd && g.sido !== A.sd && !(A.sd === '전남광주통합특별시' && /광주|전라남|전남/.test(g.sido))) continue;
      let s = 0;
      if (A.b && nm === `${A.a} ${A.b}`) s = 3;
      else if (nm === A.a) s = 2;
      else if (!A.b && nm.indexOf(A.a + ' ') === 0) s = 1;              // '수원시' → '수원시 영통구' 등 여러 곳(아래에서 하나면 씀)
      else if (A.b && nm.split(' ').pop() === A.b) s = 1.5;
      if (s) cand.push({ code, s, g });
    }
    if (!cand.length) return null;
    cand.sort((a, b) => b.s - a.s);
    const top = cand.filter(c => c.s === cand[0].s);
    if (top.length > 1 && !A.sd) return { many: top.map(c => ({ code: c.code, name: c.g.name, sido: c.g.sido })) };
    if (top.length > 1) return { many: top.map(c => ({ code: c.code, name: c.g.name, sido: c.g.sido })) };
    const c = top[0], sd = (IX.sido || []).find(s => s.name === c.g.sido);
    return { code: c.code, name: c.g.name, sido: c.g.sido, sid: sd ? sd.id : '', dong: A.dong || '' };
  }

  /* ================= 공고 맞추기 ================= */
  const STOP = /(아파트|오피스텔|도시형생활주택|생활숙박시설|분양|특별|공급|민간|공공|임대|단지|블록|BL|지구|더|the|센트럴|시티|파크|퍼스트|프레스티지|에듀|리버|레이크|힐스|포레|스카이|뷰)/gi;
  const toks = s => norm(s).replace(/[()（）\[\]·.,\-]/g, ' ').split(/\s+/).filter(Boolean);
  function nameScore(a, b) {
    const A = norm(a).replace(/[()（）\[\]·.,\-]/g, ''), B = norm(b).replace(/[()（）\[\]·.,\-]/g, '');
    if (!A || !B) return 0;
    if (A === B) return 10;
    if (B.indexOf(A) >= 0 || A.indexOf(B) >= 0) return Math.min(A.length, B.length) >= 4 ? 8 : 3;
    /* 두 글자씩 겹침 */
    const bi = s => { const o = new Set(); for (let i = 0; i < s.length - 1; i++) o.add(s.slice(i, i + 2)); return o; };
    const a2 = bi(A.replace(STOP, '')), b2 = bi(B.replace(STOP, ''));
    if (!a2.size || !b2.size) return 0;
    let n = 0; a2.forEach(v => { if (b2.has(v)) n++; });
    return Math.round(n / Math.min(a2.size, b2.size) * 7 * 10) / 10;
  }
  /** rows: bunyang notices.json rows(+plan.json) · place: placeOf 결과 → { row, score, why } | null */
  function matchNotice(ext, rows, place) {
    if (!ext || !rows || !rows.length) return null;
    let best = null;
    for (const r of rows) {
      let s = ext.name ? nameScore(ext.name, r.n) : 0;
      if (place && place.code) { if (r.g === place.code) s += 2; else if (s < 8) continue; }
      if (place && place.dong && r.dg === place.dong) s += 1;
      if (ext.hh && r.hh && Math.abs(r.hh - ext.hh) <= Math.max(3, r.hh * 0.02)) s += 2;
      if (ext.builder && r.bld && norm(r.bld).indexOf(norm(ext.builder.name).slice(0, 4)) >= 0) s += 1;
      if (!best || s > best.score) best = { row: r, score: s };
    }
    if (!best || best.score < 7) return null;
    return best;
  }

  /* ================= 주변 실거래(평당가) ================= */
  const cntOf = c => { const o = []; for (const ch of String(c || '')) o.push(Math.max(0, ch.charCodeAt(0) - 48)); return o; };
  const lastPpy = a => { if (!Array.isArray(a)) return 0; for (let i = a.length - 1; i >= Math.max(0, a.length - 3); i--) if (a[i] > 0) return a[i]; return 0; };
  const ymAdd = (ym, n) => { let y = +String(ym).slice(0, 4), m = +String(ym).slice(4, 6) + n; while (m > 12) { m -= 12; y++; } while (m < 1) { m += 12; y--; } return `${y}${String(m).padStart(2, '0')}`; };
  /** units: data/price/{구}.json units · o = { dong, area(전용㎡), dataTo 'YYYYMM', years(10), from '200601'(자료 시작 달) }
      첫 거래 달(u[12].f)이 최근 years 년 안이면 신축·준신축으로 봐요(입주 뒤 첫 거래 = 입주 무렵). 자료 시작 달에 첫 거래가 있는 단지는 연식을 알 수 없어 빼요.
      같은 동에서 단지 3곳·최근 12개월 거래 10건이 안 되면 같은 구로 넓혀요. → { scope, list, med, q, n, apts, at, years } | { lack, ... } */
  function nearPrice(units, o) {
    o = o || {};
    const years = o.years || 10, to = o.dataTo || '', cut = to ? ymAdd(to, -12 * years) : '', start = o.from || '200601', band = bandOf(o.area || 84);
    const rows = (units || []).filter(u => u && bandOf(+u[4]) === band).map(u => {
      const c = cntOf(u[7]), n12 = c.slice(-12).reduce((a, b) => a + b, 0), f = u[12] && u[12].f ? String(u[12].f) : '';
      return { code: u[0], dong: u[1], name: u[2], band: u[3], area: +u[4], ppy: lastPpy(u[6]), n12, f, isNew: !!(f && f > start && (!cut || f >= cut)) };
    }).filter(r => r.ppy > 0 && r.n12 > 0);
    const pick = (list, scope) => {
      const n = list.reduce((a, r) => a + r.n12, 0);
      if (list.length < 3 || n < 10) return null;
      const ps = list.map(r => r.ppy);
      return { scope, list: list.slice().sort((a, b) => b.n12 - a.n12), med: Math.round(median(ps)), q: [Math.round(quant(ps, 0.25)), Math.round(median(ps)), Math.round(quant(ps, 0.75))], n, apts: list.length, at: to, years, band };
    };
    const nw = rows.filter(r => r.isNew);
    return (o.dong && pick(nw.filter(r => r.dong === o.dong), `같은 동(${o.dong})`)) || pick(nw, '같은 구') || { lack: true, n: nw.reduce((a, r) => a + r.n12, 0), apts: nw.length, at: to, years, band, all: pick(rows, '같은 구(연식 구분 없이)') };
  }
  /** 같은 단지들 전세 평당가 → { med, n, at, list } — rows [{ name, dong, jppy, at }] (view 가 price/h/{구}.json 로 만든 값) */
  function nearJeonse(rows) {
    const r = (rows || []).filter(x => x && x.jppy > 0);
    if (r.length < 3) return { lack: true, apts: r.length };
    return { med: Math.round(median(r.map(x => x.jppy))), apts: r.length, at: r.map(x => x.at).sort().pop() || '', list: r.slice(0, 8) };
  }

  /* ================= 잔금 유예 · 대출 ================= */
  /** o = { price 분양가(만원, 할인 뒤), dp 계약금 %, mid 중도금 %, defer {pct, yrs}, code 시·군·구, near 주변 같은 면적 금액(만원, 없으면 null) }, R = JDJ_LOAN_RULES
      가정: 무주택(처음 집이 아닌 일반 무주택) · 소득(DSR)은 넣지 않음 · 중도금은 집단 대출로 냈다가 입주 때 주담대로 바꾼다고 봄 */
  function deferCalc(o, R) {
    if (!o || !(o.price > 0) || !o.defer) return null;
    const P = o.price, dp = o.dp != null ? o.dp : 10, mid = o.mid != null ? o.mid : 60, pct = o.defer.pct, yrs = o.defer.yrs;
    const g = R ? R.groupOf(o.code || '') : null, ltv = R && g ? R.ltvOf(g, 'none') : null;
    const base = o.near > 0 ? Math.min(P, o.near) : P;
    const cap = R && g ? R.capOf(base, g) : Infinity;
    const maxLoan = ltv == null ? null : Math.round(Math.min(base * ltv, cap));
    const lump = pct != null ? Math.round(P * pct / 100) : null;
    const midLoan = Math.round(P * mid / 100), atMove = pct != null ? Math.round(P * Math.max(0, 100 - dp - mid - pct) / 100) : null;
    const room = maxLoan == null ? null : Math.max(0, maxLoan - midLoan);
    const below = o.near > 0 && o.near < P ? Math.round((1 - o.near / P) * 1000) / 10 : 0;
    return { P, dp, mid, pct, yrs, g, ltv, base, cap: cap === Infinity ? null : cap, maxLoan, lump, midLoan, atMove, room, below, near: o.near || null,
      short: maxLoan != null && maxLoan < midLoan ? midLoan - maxLoan : 0 };
  }

  /* ================= 리포트 ================= */
  const TYPE_INFO = {
    오피스텔: { lv: 'y', s: '아파트가 아니라 건축법상 업무시설이에요. 청약통장 없이 계약할 수 있지만 세금·대출 기준이 달라요.',
      why: ['청약통장·가점 없이 계약할 수 있어요(건축물의 분양에 관한 법률에 따른 분양).', '사는 데 쓰면(주거용) 다른 집을 살 때 취득세 판정의 주택 수에 들어갈 수 있어요(2020년 8월 12일 이후 취득분).',
        '취득세는 주택 세율이 아니라 일반 건물 세율(4%, 지방교육세·농어촌특별세를 더하면 4.6%)이에요.', '대출은 주택담보대출이 아니라 비주택(오피스텔·상가) 담보대출 기준이 적용돼 한도·금리가 달라질 수 있어요.'],
      src: [{ n: '국가법령정보센터 건축물의 분양에 관한 법률', u: 'https://www.law.go.kr/법령/건축물의분양에관한법률' }, { n: '국가법령정보센터 지방세법', u: 'https://www.law.go.kr/법령/지방세법' }] },
    생활숙박시설: { lv: 'r', s: '주택이 아니라 숙박시설이에요. 숙박업 신고 없이 집으로 쓰면 이행강제금 대상이 될 수 있어요.',
      why: ['생활숙박시설은 건축법상 숙박시설이라 주거용으로 쓰려면 오피스텔 등으로 용도를 바꿔야 해요(주차·복도 폭 등 기준을 맞춰야 해요).', '집으로 쓰거나 전·월세를 놓으면 건축법 위반으로 이행강제금이 부과될 수 있어요. 지금 유예·특례 기간은 국토교통부 안내에서 확인해 주세요.',
        '청약통장 없이 계약하지만, 주택담보대출 대신 비주택 대출 기준이 적용돼요.', '「확정 수익」 같은 문구는 계약서에 그 조건이 실제로 적혀 있는지, 누가 보장하는지 확인해야 해요.'],
      src: [{ n: '국가법령정보센터 건축법', u: 'https://www.law.go.kr/법령/건축법' }, { n: '국토교통부', u: 'https://www.molit.go.kr/' }] },
    도시형생활주택: { lv: 'y', s: '주택이라 주택 수에 들어가요. 가점제 청약이 아니고 분양가상한제도 적용되지 않아요.',
      why: ['주택법상 주택(300세대 미만·전용 85㎡ 이하 등)이라 취득세·양도세에서 주택 수에 들어가요.', '청약 가점제 대상이 아니라 청약통장 없이 계약하는 경우가 많고, 분양가상한제가 적용되지 않아요.', '주차·단지 시설 기준이 아파트보다 완화돼 있어 같은 면적 아파트와 생활 조건이 다를 수 있어요.'],
      src: [{ n: '국가법령정보센터 주택법', u: 'https://www.law.go.kr/법령/주택법' }] },
    민간임대: { lv: 'y', s: '집을 사는 분양이 아니라 임대 계약이에요. 몇 년 뒤 분양 전환 가격이 정해져 있는지 확인해야 해요.',
      why: ['민간임대주택은 보증금을 내고 정해진 기간 동안 빌려 사는 계약이에요. 그 기간에는 내 집(소유권)이 아니에요.', '「임대 후 분양」은 분양 전환 시기·가격이 계약서에 정해져 있지 않은 경우가 많아요.',
        '「협동조합형 민간임대」는 임대 계약 전에 조합 가입(출자금)부터 하는 방식이라, 사업이 늦어지거나 무산되면 출자금을 돌려받기 어려울 수 있어요.'],
      src: [{ n: '국가법령정보센터 민간임대주택에 관한 특별법', u: 'https://www.law.go.kr/법령/민간임대주택에관한특별법' }] },
    지역주택조합: { lv: 'r', s: '분양이 아니라 조합 가입이에요. 땅을 다 사지 못하면 사업이 늦어지거나 추가 분담금이 생길 수 있어요.',
      why: ['지역주택조합은 조합원이 돈을 모아 땅을 사고 집을 짓는 방식이에요. 광고의 「분양가」는 확정 금액이 아니에요.', '조합원 모집 신고를 했는지, 땅(토지 사용권원)을 얼마나 확보했는지 시·군·구청에서 확인할 수 있어요.',
        '사업이 늦어지면 추가 분담금이 생길 수 있고, 탈퇴해도 낸 돈을 모두 돌려받기 어려울 수 있어요.'],
      src: [{ n: '국가법령정보센터 주택법(지역주택조합)', u: 'https://www.law.go.kr/법령/주택법' }] },
    지식산업센터: { lv: 'y', s: '주택이 아니라 공장·사무실 용도 건물이에요. 입주할 수 있는 업종이 정해져 있어요.',
      why: ['지식산업센터는 산업집적법에 따라 정해진 업종만 입주할 수 있어요. 주거용으로 쓸 수 없어요.', '대출·세금 기준이 주택과 달라요.'],
      src: [{ n: '국가법령정보센터 산업집적활성화 및 공장설립에 관한 법률', u: 'https://www.law.go.kr/법령/산업집적활성화및공장설립에관한법률' }] }
  };
  const HOUSE = t => !t || t === '아파트' || t === '도시형생활주택';

  /** ctx = {
       today 'YYYY-MM-DD', place(placeOf), notice(matchNotice 결과 row) , ny(공고 쪽 분양가 비교 — chungyak/price.json 행), userPrice(이용자가 넣은 분양가, 만원), userArea,
       near(nearPrice), jeonse(nearJeonse), R(JDJ_LOAN_RULES), rules(fn N → assets/cy-plan.js rules), xy([경도, 위도]), xyFrom 'notice'|'dong',
       poi(data/poi/sNN.json), dm(data/devmap.json), uns({ now, y1, ym, grp }), unsold(경기 미분양 현장 목록 행들), dataTo }
     → diag rep (+ facts, checks: '확인한 사실'·'확인할 점' 글 목록) */
  function build(ext, ctx) {
    ext = ext || {}; ctx = ctx || {};
    const items = [], N = ctx.notice || null, place = ctx.place && ctx.place.code ? ctx.place : null, R = ctx.R || null;
    const type = ext.type || (N ? (N.k === '오피스텔' ? '오피스텔' : N.k === '도시형생활주택' ? '도시형생활주택' : '아파트') : '');
    /* ⓪ 공고 확인 */
    if (N) items.push({ id: 'notice', t: '공식 공고', lv: 'g', v: '청약홈 공고 찾음', s: `${N.n} · 모집공고 ${dot8(N.pb) || '날짜 없음'}${N.hh ? ` · ${fmt(N.hh)}세대` : ''}`,
      why: ['광고의 현장 이름·지역으로 청약홈 분양 공고를 찾았어요. 아래 비교는 이 공고 기준이에요.', '이름이 비슷한 다른 현장일 수도 있으니 공고 주소가 광고와 같은지 한 번 더 봐 주세요.', N.ad ? `공고 주소: ${N.ad}` : ''].filter(Boolean),
      src: [{ n: '청약홈 입주자모집공고', u: N.u || 'https://www.applyhome.co.kr/' }] });
    else items.push({ id: 'notice', t: '공식 공고', lv: HOUSE(type) ? 'y' : 'n', v: '공고를 찾지 못했어요', s: HOUSE(type) ? '청약홈 분양 공고에서 같은 현장을 찾지 못했어요. 이름·지역이 다르게 적혔을 수 있어요' : `${type || '이 유형'}은 청약홈 공고가 없는 경우가 많아요`,
      why: ['30세대 이상 아파트는 보통 청약홈에 입주자모집공고가 올라와요. 공고를 못 찾았다면 이름이 다르게 적혔거나, 아직 공고 전이거나, 공고 대상이 아닌 경우예요.',
        '오피스텔·생활숙박시설·민간임대·지역주택조합은 청약홈 공고 대상이 아닐 수 있어요. 시·군·구청 분양신고·모집신고 여부를 확인해 주세요.'],
      src: [{ n: '청약홈', u: 'https://www.applyhome.co.kr/' }] });
    /* ① 유형 */
    if (type && TYPE_INFO[type]) { const T = TYPE_INFO[type]; items.push({ id: 'type', t: '주택 유형', lv: T.lv, v: type, s: T.s, why: T.why.concat(ext.claims.noBank ? ['광고의 「청약통장 필요 없음」은 이 유형에서는 사실이에요. 다만 그만큼 아파트 청약과 다른 규칙이 적용돼요.'] : []).concat(ext.claims.noCount && type !== '생활숙박시설' && type !== '지식산업센터' ? ['광고의 「주택 수 미포함」은 쓰는 방식에 따라 달라요. 사는 데 쓰는 오피스텔·도시형생활주택은 주택 수에 들어갈 수 있어요 — 광고 문구와 다를 수 있어요.'] : []), src: T.src }); }
    /* ② 가격 */
    const area = ctx.userArea || ext.area && ext.area.m2 || null;
    let price = ctx.userPrice || null, priceFrom = ctx.userPrice ? '직접 넣은 분양가' : '';
    let nTy = null;
    if (N && Array.isArray(N.ty) && N.ty.length) {
      const tys = N.ty.filter(t => +t[1] > 0 && +t[3] > 0);
      if (tys.length) { nTy = area ? tys.slice().sort((a, b) => Math.abs(a[1] - area) - Math.abs(b[1] - area))[0] : tys.slice().sort((a, b) => Math.abs(a[1] - 84) - Math.abs(b[1] - 84))[0]; }
    }
    if (!price && ext.price && ext.price.v) { price = ext.price.v; priceFrom = '광고에 적힌 분양가'; }
    if (!price && nTy) { price = +nTy[3]; priceFrom = `공고 분양가(전용 ${Math.floor(nTy[1])}㎡ 최고가)`; }
    const ar = area || (nTy ? +nTy[1] : null);
    let disc = 0, after = null;
    if (price && ext.was && ext.was > price && priceFrom === '광고에 적힌 분양가') { disc = ext.was - price; after = price; price = ext.was; }   // '기존 분양가 X → 지금 Y' 는 Y 가 할인 뒤 금액
    else {
      if (ext.disc && price) disc = ext.disc.amt ? ext.disc.amt : Math.round(price * ext.disc.pct / 100);
      after = price ? Math.max(0, price - disc) : null;
    }
    const ppyAfter = after && ar ? Math.round(after / (ar / PY)) : (ext.ppy || null);
    const facts = { price, priceFrom, disc, after, area: ar, ppy: ppyAfter };
    const NB = ctx.near, NY = ctx.ny;
    let cmp = null;
    if (NY && Array.isArray(NY.bands) && ar) { const b = NY.bands.find(x => x.b === bandOf(ar)); if (b && !b.lack && !b.lease && b.q) cmp = { med: b.q[1], q: b.q, n: b.n, apts: b.apts, scope: `${b.scope} 준공 10년 이내`, span: b.span, from: 'ny' }; }
    if (!cmp && NB && !NB.lack) cmp = { med: NB.med, q: NB.q, n: NB.n, apts: NB.apts, scope: `${NB.scope} 첫 거래 ${NB.years}년 이내 단지`, at: NB.at, list: NB.list, from: 'near' };
    if (!ppyAfter) items.push({ id: 'price', t: '가격', lv: 'n', v: '분양가를 찾지 못했어요', s: '광고·공고에서 분양가와 면적을 찾지 못했어요. 아래 칸에 넣으면 바로 비교해 드려요',
      why: ['분양가와 전용면적이 있어야 3.3㎡당 값을 계산해 주변 실거래와 견줄 수 있어요.'], ask: 'price' });
    else if (!cmp) items.push({ id: 'price', t: '가격', lv: 'n', v: `3.3㎡당 ${fmt(ppyAfter)}만 원`, s: NB && NB.all ? `주변에 같은 면적대 신축 거래가 적어 비교하지 않았어요(연식 구분 없이 같은 구 중간값 ${fmt(NB.all.med)}만 원)` : '주변에 비교할 실거래가 모자라요',
      why: ['같은 동·같은 구에서 같은 면적대, 첫 거래가 10년 안인 단지 3곳·최근 12개월 거래 10건이 안 되면 비교하지 않아요(비교 자료 부족).', NB && NB.all ? `참고: 연식을 따지지 않으면 같은 구 같은 면적대 ${NB.all.apts}개 단지 중간값이 3.3㎡당 ${fmt(NB.all.med)}만 원이에요. 오래된 단지가 섞여 있어 새 아파트와 바로 견주기 어려워요.` : ''].filter(Boolean) });
    else {
      const pct = Math.round((ppyAfter / cmp.med - 1) * 1000) / 10, lv = pct <= 5 ? 'g' : pct <= 20 ? 'y' : 'r';
      const names = (cmp.list || []).slice(0, 5).map(r => `${r.name}(${r.dong}) ${fmt(r.ppy)}만 원`);
      items.push({ id: 'price', t: '가격', lv, v: `주변보다 ${pct > 0 ? pct + '% 높아요' : pct < 0 ? Math.abs(pct) + '% 낮아요' : '같아요'}`,
        s: `${disc ? '할인 뒤 ' : ''}3.3㎡당 ${fmt(ppyAfter)}만 원 vs ${cmp.scope} 중간값 ${fmt(cmp.med)}만 원`,
        why: [`${priceFrom} ${won(price)}${disc ? `에서 할인 ${won(disc)}을 빼면 ${won(after)}` : ''}, 전용 ${ar}㎡${ext.area && ext.area.from === '평형' ? `(광고의 ${ext.area.py}평형을 전용 약 ${ar}㎡로 어림)` : ''} 기준 3.3㎡당 ${fmt(ppyAfter)}만 원이에요.`,
          `비교: ${cmp.scope}, ${BAND[bandOf(ar)]} 실거래 ${fmt(cmp.n)}건·${cmp.apts}개 단지 — 하위 25% ${fmt(cmp.q[0])} · 중간 ${fmt(cmp.q[1])} · 상위 25% ${fmt(cmp.q[2])}만 원${cmp.at ? ` (${ymTxt(cmp.at)} 실거래까지)` : cmp.span ? ` (${dot8(cmp.span[0])}~${dot8(cmp.span[1])} 계약)` : ''}.`,
          names.length ? `비교한 단지(거래 많은 순): ${names.join(' · ')}` : '',
          '판정 기준: 주변 중간값보다 5% 이하로 높거나 낮으면 괜찮아요, 5~20% 높으면 주의, 20% 넘게 높으면 위험으로 표시해요. 새 아파트는 기존 단지보다 비싼 경우가 많아 높다는 사실만 보여 드려요.',
          ext.price && ext.price.approx ? '광고에 「○억대」처럼 적혀 있어 그 금액부터로 계산했어요. 실제 분양가는 공고·계약서에서 확인해 주세요.' : ''].filter(Boolean),
        src: [{ n: '국토교통부 아파트 매매 실거래가(공공데이터포털)' }].concat(cmp.from === 'ny' ? [{ n: '청약홈 분양정보' }] : []) });
    }
    /* ③ 할인 · 공고 분양가와 맞추기 */
    if (ext.disc || ext.was) {
      const lines2 = [], ad0 = ext.was || (ext.price && ext.price.v) || null;
      let lv = 'n', v = ext.disc ? (ext.disc.amt ? `${ext.disc.max ? '최대 ' : ''}${won(ext.disc.amt)} 할인` : `${ext.disc.max ? '최대 ' : ''}${ext.disc.pct}% 할인`) : '기존 분양가 언급';
      if (nTy && ad0) {
        const np = +nTy[3], d = Math.round((ad0 / np - 1) * 1000) / 10;
        if (Math.abs(d) <= 1) { lv = 'g'; lines2.push(`광고의 할인 전 금액 ${won(ad0)}이 공고 분양가(전용 ${Math.floor(nTy[1])}㎡ ${won(np)})와 같아요.`); }
        else { lv = 'y'; lines2.push(`광고의 할인 전 금액 ${won(ad0)}이 공고 분양가(전용 ${Math.floor(nTy[1])}㎡ ${won(np)})와 ${d > 0 ? d + '% 높아요' : Math.abs(d) + '% 낮아요'} — 광고 문구와 다를 수 있어요. 평형·옵션 포함 여부가 다를 수도 있어요.`); }
      } else lines2.push('공고 분양가와 맞춰 보지 못했어요. 할인 전 금액이 처음 공고된 분양가와 같은지 입주자모집공고에서 확인해 주세요.');
      if (ext.disc && ext.disc.max) lines2.push('「최대」 할인은 일부 동·호수나 조건(일시불 등)에만 해당하는 경우가 많아요.');
      lines2.push('할인 조건이 계약서(특약)에 금액으로 적혀 있는지, 이미 계약한 사람과 조건이 다른지 확인해 두면 좋아요.');
      items.push({ id: 'disc', t: '할인 조건', lv, v, s: lv === 'g' ? '할인 전 금액이 공고 분양가와 같아요' : lv === 'y' ? '할인 전 금액이 공고 분양가와 달라요 — 광고 문구와 다를 수 있어요' : '공고 분양가와 맞춰 볼 자료가 없어요', why: lines2,
        src: N ? [{ n: '청약홈 입주자모집공고', u: N.u || 'https://www.applyhome.co.kr/' }] : [] });
    }
    /* ④ 전세가로 내 집 마련 */
    if (ext.claims.jeonse) {
      const J = ctx.jeonse;
      if (!after || !ar) items.push({ id: 'jeonse', t: '「전세가로 내 집 마련」', lv: 'n', v: '분양가 필요', s: '분양가와 면적을 넣으면 주변 전세 시세와 견줘 드려요', why: ['이 문구는 보통 「계약금만 내고 입주 때 전세를 놓으면 된다」는 뜻이에요. 실제로는 분양가와 주변 전세 시세 차이만큼 돈이 더 들어요.'] });
      else if (!J || J.lack) items.push({ id: 'jeonse', t: '「전세가로 내 집 마련」', lv: 'n', v: '전세 자료 부족', s: '같은 면적대 주변 단지 전세 거래가 모자라 비교하지 못했어요', why: ['같은 면적대 비교 단지 3곳 이상에서 최근 전세 거래가 있어야 비교해요.'] });
      else {
        const jw = Math.round(J.med * ar / PY), gap = after - jw, r = Math.round(jw / after * 1000) / 10;
        items.push({ id: 'jeonse', t: '「전세가로 내 집 마련」', lv: gap > after * 0.1 ? 'y' : 'g', v: `전세 시세는 분양가의 ${r}%`, s: `주변 같은 면적 전세 약 ${won(jw)} · 분양가와 차이 ${won(Math.max(0, gap))}`,
          why: [`주변 비교 단지 ${J.apts}곳 전세 3.3㎡당 중간값 ${fmt(J.med)}만 원을 전용 ${ar}㎡로 바꾸면 약 ${won(jw)}이에요${J.at ? `(${ymTxt(J.at)} 기준)` : ''}.`,
            gap > 0 ? `분양가(할인 뒤) ${won(after)}와 ${won(gap)} 차이가 나요. 입주 때 전세를 놓아도 이 차이와 취득세 등은 따로 마련해야 해요.` : '주변 전세 시세가 분양가와 비슷하거나 높아요. 다만 새 아파트 입주가 몰리면 전셋값이 한동안 낮아질 수 있어요.',
            '입주 때 세입자를 못 구하면 잔금을 직접 마련해야 해요. 실거주 의무가 있는 단지는 전세를 놓을 수 없어요.'],
          src: [{ n: '국토교통부 아파트 전월세 실거래가(공공데이터포털)' }] });
      }
    }
    /* ⑤ 잔금 유예 · 대출 */
    if (ext.pay && (ext.pay.defer || ext.pay.midFree || ext.pay.midAfter)) {
      const nearAmt = cmp && ar ? Math.round(cmp.med * ar / PY) : null;
      const D = ext.pay.defer ? deferCalc({ price: after, dp: ext.pay.dp, mid: ext.pay.mid, defer: ext.pay.defer, code: place ? place.code : (N && N.g) || '', near: nearAmt }, R) : null;
      const why = [], src = [{ n: '집예보 대출 규칙표(금융위원회 발표 기준)', u: 'https://chrisjangdaejang-ux.github.io/jangdaejang-calc/loan/#rules' }];
      let lv = 'n', v = '', s = '';
      if (ext.pay.defer && !after) { v = '분양가 필요'; s = '분양가를 넣으면 나중에 한 번에 낼 돈과 대출 가능 금액을 계산해 드려요'; why.push('잔금 유예는 입주 때 낼 잔금 일부를 몇 년 뒤로 미루는 조건이에요. 미룬 돈은 없어지지 않고 그때 한 번에 내야 해요.'); }
      else if (D) {
        const GN = { reg: '규제지역', capfree: '수도권(규제지역 아님)', local: '지방' }[D.g] || '';
        if (D.lump != null) why.push(`미룬 잔금: 분양가 ${won(D.P)}의 ${D.pct}% = ${won(D.lump)}을 ${D.yrs ? D.yrs + '년 뒤' : '정해진 때'} 한 번에 내야 해요.`);
        else why.push('광고에 미루는 비율이 없어 금액은 계산하지 않았어요. 계약서에서 비율·기간을 확인해 주세요.');
        if (D.maxLoan != null) {
          why.push(`지금 규칙(${GN}, 무주택, LTV ${Math.round(D.ltv * 100)}%${D.cap ? `, 집값 구간 최대 ${won(D.cap)}` : ''})으로 입주 때 받을 수 있는 주택담보대출은 최대 약 ${won(D.maxLoan)}이에요(담보 가치 ${won(D.base)} 기준).`);
          why.push(`중도금 ${D.mid}%(${won(D.midLoan)})를 대출로 냈다면 입주 때 이 돈부터 주택담보대출로 바꿔야 해요.${D.short ? ` 최대 대출보다 ${won(D.short)} 많아 그만큼 현금이 더 필요해요.` : D.room != null ? ` 그러고 남는 대출 여유는 약 ${won(D.room)}이에요.` : ''}`);
          if (D.lump != null && D.room != null) why.push(D.room >= D.lump ? `남는 대출 여유(${won(D.room)})가 미룬 잔금(${won(D.lump)})보다 커요. 다만 그때의 금리·소득(DSR)·규칙에 따라 달라져요.` : `미룬 잔금(${won(D.lump)})이 남는 대출 여유(${won(D.room)})보다 ${won(D.lump - D.room)} 많아, 그만큼은 현금으로 준비해야 할 수 있어요.`);
        }
        if (D.below) why.push(`주변 같은 면적 시세(약 ${won(D.near)})가 분양가보다 ${D.below}% 낮아요. 은행은 분양가가 아니라 감정가·시세로 대출을 정해 대출이 줄 수 있어요.`);
        why.push('계산 가정: 무주택(생애 첫 집 아님), 소득(DSR)은 넣지 않았어요. 정확한 한도는 대출 한도 계산기에서 소득을 넣어 확인해 주세요. 미룬 잔금에 이자·지연 손해금·담보 조건이 붙는지는 계약서에서 확인해 주세요.');
        lv = D.short ? 'r' : D.lump != null || D.below ? 'y' : 'n';
        v = D.lump != null ? `${D.yrs ? D.yrs + '년 뒤 ' : '나중에 '}${won(D.lump)}` : '잔금 일부 미룸';
        s = D.short ? `입주 때 대출로 중도금을 다 갚기 어려울 수 있어요(약 ${won(D.short)} 부족)` : D.maxLoan != null ? `지금 규칙으로 입주 때 최대 대출 약 ${won(D.maxLoan)}(소득 미반영)` : '대출 규칙을 불러오지 못했어요';
      }
      if (ext.pay.midFree) why.push('중도금 무이자: 중도금 대출 이자를 시행사가 대신 내 주는 조건이에요. 그 비용이 분양가에 들어 있는지는 광고만으로 알 수 없어요. 해지·전매 때 이자를 돌려내야 하는 조건이 있는지 계약서에서 확인해 주세요.');
      if (ext.pay.midAfter) why.push('중도금 이자 후불: 이자가 없어지는 게 아니라 입주(잔금) 때 한꺼번에 내는 조건이에요.');
      if (!v) { v = ext.pay.midFree ? '중도금 무이자' : '중도금 이자 후불'; s = ext.pay.midFree ? '이자 부담 주체와 조건을 계약서에서 확인할 점이 있어요' : '입주 때 쌓인 이자를 한꺼번에 내요'; lv = ext.pay.midAfter ? 'y' : 'n'; }
      items.push({ id: 'pay', t: ext.pay.defer ? '잔금 유예 · 대출' : '중도금 조건', lv, v, s, why, src, calc: D });
    }
    /* ⑥ 실거주 의무 · 전매제한 */
    if (ext.claims.noLive || ext.claims.noResale) {
      if (!HOUSE(type)) items.push({ id: 'rule', t: '실거주·전매 문구', lv: 'n', v: '아파트와 다른 규칙', s: `${type}은 주택법의 실거주 의무·전매제한 규칙이 그대로 적용되지 않아요`,
        why: ['오피스텔·생활숙박시설 등은 「건축물의 분양에 관한 법률」에 따라 지역·규모별로 전매 기준이 따로 있어요. 분양 공고(분양신고)의 「전매 제한」 항목을 확인해 주세요.'], src: [{ n: '국가법령정보센터 건축물의 분양에 관한 법률', u: 'https://www.law.go.kr/법령/건축물의분양에관한법률' }] });
      else if (!ctx.rules || !(N || place)) items.push({ id: 'rule', t: '실거주·전매 문구', lv: 'n', v: '지역 확인 필요', s: '현장 지역을 알면 규칙과 맞춰 봐 드려요', why: ['실거주 의무·전매제한 기간은 지역(규제지역·수도권)과 분양가상한제 적용 여부로 정해져요.'] });
      else {
        const reg = R && place ? R.regulated(place.code) : false;
        const RN = N ? { n: N.n, sd: N.sd, g: N.gn || '', k: /한국토지주택공사|LH|도시공사|주택도시공사|개발공사/.test(N.dev || '') ? '국민' : '민영', f: N.f || [] }
          : { n: ext.name || '', sd: place.sido, g: place.name, k: '민영', f: reg ? ['투기과열지구', '조정대상지역'] : [] };
        const r = ctx.rules(RN), why = [], diff = [];
        if (ext.claims.noLive) { if (r.live.has) diff.push('실거주 의무'); why.push(`광고: 「실거주 의무 없음」 → 규칙: ${r.live.txt}`); }
        if (ext.claims.noResale) { if (r.resale !== '없음') diff.push('전매제한'); why.push(`광고: 「전매 제한 없음」 → 규칙: 전매제한 ${r.resale}(${r.resaleWhy} 기준). 기간은 당첨자 발표일부터 세요.`); }
        why.push(N ? `공고 규제 표시: ${(N.f || []).length ? N.f.join(' · ') : '없음'}.` : `공고를 못 찾아 지역 규제 여부(${reg ? '규제지역' : '규제지역 아님'})와 「분양가상한제 표시 없음」으로 가정한 일반 기준이에요.`);
        if (R && R.regBasis) why.push(`규제지역(투기과열지구·조정대상지역) 여부: ${R.regBasis()}.`);
        why.push('단지별 확정 기간은 입주자모집공고문의 「전매 제한」·「거주의무」 항목이 기준이에요.');
        items.push({ id: 'rule', t: '실거주·전매 문구', lv: diff.length ? 'y' : 'g', v: diff.length ? '광고 문구와 다를 수 있어요' : '규칙과 같아요', s: diff.length ? `${diff.join('·')}이 있을 수 있어요(일반 기준)` : `전매 ${r.resale} · 실거주 ${r.live.has ? '있음' : '보통 없음'}(일반 기준)`,
          why, src: [{ n: '국토교통부 규제지역 지정·해제 공고', u: 'https://www.molit.go.kr/' }, { n: '국가법령정보센터 주택법 시행령 별표 3', u: 'https://www.law.go.kr/법령/주택법시행령' }, { n: '주택법 제57조의2', u: 'https://www.law.go.kr/법령/주택법' }] });
      }
    }
    /* ⑦ 역 거리 */
    if (ext.station) {
      const S = ext.station, st = ctx.poi && ctx.poi.st ? ctx.poi.st.find(s => norm(s[0]) === norm(S.name)) : null;
      if (!ctx.xy || !st) items.push({ id: 'station', t: '역 거리', lv: 'n', v: S.min ? `광고: ${S.name}역 ${S.min}분` : `광고: ${S.name}역 ${S.word ? '역세권' : ''}`.trim(), s: !ctx.xy ? '현장 위치를 찾지 못해 거리를 재지 못했어요' : `${S.name}역 위치 자료를 찾지 못했어요(수도권 밖은 역 자료가 아직 없어요)`,
        why: ['현장 위치(공고 좌표 또는 주소의 동)와 역 위치를 알아야 거리를 잴 수 있어요.', '광고의 「도보 N분」은 출입구·직선 기준으로 짧게 적는 경우가 있어요. 지도 앱의 실제 걷는 길로 확인해 보세요.'] });
      else {
        const m = distM(ctx.xy, [st[1], st[2]]), walk = Math.max(1, Math.round(m / WALK)), dongBase = ctx.xyFrom === 'dong';
        const over = S.min != null ? walk - S.min : null, bad = over != null && over > Math.max(3, S.min * 0.5);
        const lv = dongBase ? 'n' : S.min == null ? (m <= 500 ? 'g' : m <= 1000 ? 'n' : 'y') : bad ? 'y' : 'g';
        items.push({ id: 'station', t: '역 거리', lv, v: `${S.name}역 ${mTxt(m)} · 걸어서 약 ${walk}분`, s: S.min != null ? `광고 ${S.min}분${bad ? ' — 광고 문구와 다를 수 있어요' : ' — 비슷해요'}${dongBase ? ' (동 가운데 기준이라 참고용)' : ''}` : `광고 「${S.word ? '역세권' : '역 가까움'}」${dongBase ? ' (동 가운데 기준이라 참고용)' : ''}`,
          why: [`${dongBase ? `현장 정확한 위치를 몰라 주소의 동(${(ctx.place && ctx.place.dong) || ''}) 가운데 점` : '공고 주소 위치'}에서 ${S.name}역까지 직선 거리 ${mTxt(m)}를 분당 67m로 나눈 어림값이에요. 실제 걷는 길은 이보다 길어요.`,
            S.min != null ? `판정: 어림 시간이 광고 시간보다 3분(또는 광고 시간의 절반) 넘게 길면 「광고 문구와 다를 수 있어요」로 표시해요.` : '판정: 500m 안 괜찮아요 · 1km 넘으면 주의로 표시해요.'],
          src: [{ n: '서울시 역사마스터 정보(수도권 전철역)', at: ctx.poi && ctx.poi.at ? ctx.poi.at.st : '' }] });
      }
    }
    /* ⑧ 개발 호재 · 학군 */
    if (ext.dev.length || ext.school.length) {
      const items2 = (ctx.dm && ctx.dm.items) || [], hit = [], miss = [], far = [];
      ext.dev.forEach(w => {
        const key = norm(w).replace(/(연장|신설|개통예정|개통|착공|예정)$/g, '');
        const cands = key.length >= 2 ? items2.filter(it => { const nm = norm(it.name) + '|' + norm(it.short || ''); return nm.indexOf(key) >= 0 || (key.length >= 4 && key.indexOf(norm(it.short || it.name)) >= 0); }) : [];
        let it = null;
        if (cands.length) {
          it = cands.map(c => ({ c, m: ctx.xy ? (c.at ? distM(ctx.xy, c.at) : c.path ? Math.min.apply(null, c.path.map(p => distM(ctx.xy, p))) : null) : null })).sort((a, b) => (a.m == null ? 1e9 : a.m) - (b.m == null ? 1e9 : b.m))[0];
        }
        if (it && it.m != null && it.m > 5000) far.push({ w, it: it.c, m: it.m });
        else if (it) hit.push({ w, it: it.c, m: it.m }); else miss.push(w);
      });
      const near = [];
      if (ctx.xy) items2.forEach(it => { const m = it.at ? distM(ctx.xy, it.at) : it.path ? Math.min.apply(null, it.path.map(p => distM(ctx.xy, p))) : null; if (m != null && m <= (it.type === 'line' ? 1500 : 2000) && !hit.some(h => h.it === it)) near.push({ it, m }); });
      near.sort((a, b) => a.m - b.m);
      const why = [];
      hit.forEach(h => { const src = h.it.stage_src || {}; why.push(`광고 「${h.w}」 → 공식 자료 「${h.it.name}」: 지금 단계 ${h.it.stage || '확인 중'}${h.it.stage_at ? `(${h.it.stage_at})` : ''}${h.m != null ? ` · 현장에서 ${mTxt(h.m)}` : ''}${(h.it.due || [])[0] ? ` · ${h.it.due[0].say}` : ''} — 출처: ${src.org || ''} ${src.title || ''}${src.official === false ? '(언론 보도)' : ''}`); });
      far.forEach(h => why.push(`광고 「${h.w}」 → 공식 자료에 「${h.it.name}」(${h.it.stage || ''})이 있지만 현장에서 ${mTxt(h.m)} 떨어져 있어요. 이 현장과 직접 관련이 있는지는 확인되지 않은 내용이에요.`));
      miss.forEach(w => why.push(`광고 「${w}」 → 확인되지 않은 내용이에요. 집예보가 모은 공식 발표 자료에서 이 이름의 사업을 찾지 못했어요.`));
      ext.school.forEach(w => why.push(`광고 「${w}」 → 확인되지 않은 내용이에요. 초등학교 배정은 교육청 통학구역으로 정해져요. 관할 교육지원청 학구도 안내에서 확인해 주세요.`));
      if (ctx.poi && ctx.poi.sc && ctx.xy && ext.school.length) { const sc = ctx.poi.sc.map(s => ({ n: s[0], m: distM(ctx.xy, [s[1], s[2]]) })).filter(s => s.m <= 1000).sort((a, b) => a.m - b.m).slice(0, 3); if (sc.length) why.push(`참고: 1km 안 중학교 — ${sc.map(s => `${s.n} ${mTxt(s.m)}`).join(' · ')} (직선 거리)`); }
      near.slice(0, 3).forEach(n => why.push(`참고: 광고에 없지만 주변(${mTxt(n.m)})에 공식 자료로 확인한 사업 「${n.it.name}」(${n.it.stage || ''})이 있어요.`));
      why.push('예정 시기는 사업 진행에 따라 바뀔 수 있어요. 「계획」·「구역 지정」 단계는 실제 공사까지 오래 걸리거나 바뀔 수 있어요.');
      const total = ext.dev.length + ext.school.length;
      items.push({ id: 'dev', t: '개발 호재·학군', lv: miss.length + far.length + ext.school.length ? 'n' : 'g', v: `확인 ${hit.length} · 확인 안 됨 ${miss.length + far.length + ext.school.length}`, s: hit.length ? `공식 자료로 찾은 사업: ${hit.map(h => `${h.it.short || h.it.name}(${h.it.stage || ''})`).slice(0, 2).join(' · ')}` : `광고의 ${total}가지 주장 중 공식 자료로 확인한 것이 없어요`,
        why, src: [{ n: '서울시·국토교통부 등 공식 발표(집예보 개발 정보)', at: ctx.dm ? ctx.dm.checked || '' : '' }] });
    }
    /* ⑨ 미분양 · 분양 기간 */
    {
      const why = [], U = ctx.uns, list = ctx.unsold || [];
      let lv = 'n', v = '', s = '';
      if (U && U.now != null) {
        v = `${place ? place.name : '이 지역'} 미분양 ${fmt(U.now)}호`; s = `${ymTxt(U.ym)} 기준${U.y1 != null ? ` · 1년 전 ${fmt(U.y1)}호` : ''}${U.grp > 1 ? ' · 시 전체' : ''}`;
        why.push(`국토교통부 미분양주택현황: ${place ? place.name : '이 지역'} ${fmt(U.now)}호(${ymTxt(U.ym)})${U.y1 != null ? `, 1년 전 ${fmt(U.y1)}호` : ''}.`);
        if (U.y1 != null && U.now >= 100 && U.now > U.y1 * 1.5) { lv = 'y'; why.push('1년 전보다 미분양이 크게 늘었어요. 미분양이 많은 지역은 입주 때 전세·매매 물건이 함께 많아질 수 있어요.'); }
        else if (U.now === 0) lv = 'g';
      }
      if (list.length) { const tot = list.reduce((a, r) => a + (r.ar || []).reduce((b, x) => b + (+x[4] || 0), 0), 0); why.push(`경기도 공동주택 미분양 현황: ${place ? place.name : ''} 미분양 현장 ${list.length}곳${tot ? `, 남은 집 ${fmt(tot)}호` : ''}(현장 이름은 공개되지 않아요).`); }
      if (N && N.pb && ctx.today) {
        const t = ctx.today.replace(/-/g, ''), months = (+t.slice(0, 4) - +N.pb.slice(0, 4)) * 12 + (+t.slice(4, 6) - +N.pb.slice(4, 6));
        if (months >= 0) { why.push(`이 현장은 ${dot8(N.pb)}에 모집공고를 냈어요. 오늘까지 약 ${months}개월이에요.`); if (months >= 6 && (ext.disc || ext.claims.firstCome)) why.push('공고 뒤 시간이 지나 할인·선착순 계약을 하는 현장은 판매가 예상보다 더딘 경우가 많아요(일반적인 경향이에요). 이 현장의 계약률은 공개 자료로 알 수 없어요.'); }
        if (!v) { v = `공고 뒤 약 ${months}개월`; s = `모집공고 ${dot8(N.pb)}`; }
      }
      if (ext.claims.firstCome) why.push('「선착순·동호수 지정·잔여 세대」는 청약 접수가 끝난 뒤 남은 집을 계약하는 방식이에요. 청약통장 없이 계약할 수 있지만, 그만큼 청약 때 계약되지 않은 집이라는 뜻이기도 해요.');
      if (ext.claims.ready) why.push('「즉시 입주」는 다 지은 뒤에도 남은 집(준공 후 미분양)일 수 있어요. 계약하면 바로 잔금을 내야 해요.');
      if (why.length) items.push({ id: 'uns', t: '미분양·분양 기간', lv, v: v || '지역 자료 없음', s: s || '이 지역 미분양 자료를 찾지 못했어요', why, src: [{ n: '국토교통부 미분양주택현황(통계청 KOSIS)' }].concat(list.length ? [{ n: '경기도 공동주택 미분양 현황(경기데이터드림)' }] : []) });
    }
    /* ⑩ 시공사 · 규모 */
    if (ext.builder || ext.hh || ext.floors) {
      const why = [], diff = [];
      if (ext.builder) {
        if (N && N.bld) { const same = norm(N.bld).indexOf(norm(ext.builder.name).slice(0, 4)) >= 0; if (!same) diff.push('시공사'); why.push(`광고 시공사 「${ext.builder.name}」${ext.builder.from === 'brand' ? `(「${ext.builder.brand}」 이름으로 어림)` : ''} → 공고 시공사 「${N.bld}」${same ? ' — 같아요' : ' — 광고 문구와 다를 수 있어요'}`); }
        else why.push(`광고 시공사 「${ext.builder.name}」${ext.builder.from === 'brand' ? `(「${ext.builder.brand}」 이름으로 어림 — 브랜드 이름만 빌려 쓰는 경우도 있어요)` : ''} → 공고가 없어 확인하지 못했어요. 시행사(사업 주체)와 시공사가 다를 수 있어요.`);
      }
      if (ext.hh) { if (N && N.hh) { const same = Math.abs(N.hh - ext.hh) <= Math.max(3, N.hh * 0.02); if (!same) diff.push('세대수'); why.push(`광고 ${fmt(ext.hh)}세대 → 공고 ${fmt(N.hh)}세대${same ? ' — 같아요' : ' — 광고 문구와 다를 수 있어요(공고 세대수는 일반 분양만일 수 있어요)'}`); } else why.push(`광고 ${fmt(ext.hh)}세대 → 공고가 없어 확인하지 못했어요.`); }
      if (ext.floors) why.push(`광고 규모: 지하 ${ext.floors.b}층~지상 ${ext.floors.top}층${ext.dongs ? ` · ${ext.dongs}개 동` : ''} (건축물대장·사업계획승인 내용은 세움터에서 확인할 수 있어요)`);
      items.push({ id: 'build', t: '시공사·규모', lv: N ? (diff.length ? 'y' : 'g') : 'n', v: N ? (diff.length ? '광고 문구와 다를 수 있어요' : '공고와 같아요') : '공고로 확인 못 함', s: N ? (diff.length ? `${diff.join('·')}가 공고와 달라요` : '시공사·세대수가 공고와 같아요') : '공식 공고를 찾지 못해 맞춰 보지 못했어요', why,
        src: N ? [{ n: '청약홈 입주자모집공고', u: N.u || 'https://www.applyhome.co.kr/' }] : [{ n: '세움터(건축행정시스템)', u: 'https://www.eais.go.kr/' }] });
    }
    /* ⑪ 그 밖의 문구 */
    {
      const why = [];
      if (ext.claims.promise) why.push('「확정 수익·수익 보장·환매·분양가 보장」 같은 약속은 계약서에 그 조건이 적혀 있는지, 누가(시행사·운영사) 어떤 돈으로 보장하는지 확인해야 해요. 광고 문구만으로는 지켜진다고 볼 수 없어요.');
      if (ext.claims.loanEasy) why.push(`「대출 걱정 없음·100% 대출」 같은 문구는 지금 규칙과 다를 수 있어요. 주택담보대출은 지역별 LTV·소득(DSR) 기준을 따라요${R && place ? `(이 지역 무주택 LTV ${Math.round((R.ltvOf(R.groupOf(place.code), 'none') || 0) * 100)}%)` : ''}.`);
      if (ext.claims.noReg && place && R) { const reg = R.regulated(place.code); why.push(`「비규제」 문구 → ${place.name}은(는) 지금 ${reg ? '규제지역(투기과열지구·조정대상지역)이에요 — 광고 문구와 다를 수 있어요' : '규제지역이 아니에요 — 규칙과 같아요'}.`); }
      if (why.length) items.push({ id: 'etc', t: '그 밖의 광고 문구', lv: (ext.claims.promise || ext.claims.loanEasy || (ext.claims.noReg && place && R && R.regulated(place.code))) ? 'y' : 'n', v: `${why.length}가지 확인할 점`, s: why[0].slice(0, 60) + (why[0].length > 60 ? '…' : ''), why,
        src: [{ n: '국가법령정보센터 표시·광고의 공정화에 관한 법률', u: 'https://www.law.go.kr/법령/표시ㆍ광고의공정화에관한법률' }] });
    }
    /* 결론 */
    const cnt = { g: 0, y: 0, r: 0, n: 0 }; items.forEach(i => { cnt[i.lv] = (cnt[i.lv] || 0) + 1; });
    const lv = cnt.r ? 'r' : cnt.y ? 'y' : cnt.g ? 'g' : 'n';
    const head = !ext.raw ? '광고 문구를 붙여 넣어 주세요' : `확인한 사실 ${cnt.g}가지, 확인할 점 ${cnt.y + cnt.r}가지가 있어요`;
    const todo = [];
    todo.push(N ? { id: 'notice', t: '입주자모집공고문 원문 읽기', s: '분양가·계약금·중도금 비율, 전매·거주 의무, 발코니 확장·옵션 비용이 적혀 있어요', href: N.u || 'https://www.applyhome.co.kr/', ext: 1, ln: '청약홈 공고' }
      : { id: 'notice', t: '공식 공고·분양신고 확인하기', s: '청약홈에서 현장 이름을 찾아보고, 없으면 시·군·구청에 분양신고(모집신고) 여부를 물어봐요', href: 'https://www.applyhome.co.kr/', ext: 1, ln: '청약홈' });
    if (ext.pay && (ext.pay.defer || ext.pay.midFree || ext.pay.midAfter) || ext.disc) todo.push({ id: 'contract', t: '계약서·특약에서 조건 확인하기', s: '할인 금액, 잔금 유예 이자·기한, 중도금 무이자 해지 조건이 글로 적혀 있는지', href: '', ln: '' });
    todo.push({ id: 'loan', t: '내 소득으로 대출 한도 계산하기', s: '입주 때 받을 수 있는 주택담보대출(LTV·DSR)', href: 'loan/', ln: '대출 한도 계산기' });
    if (HOUSE(type)) todo.push({ id: 'hug', t: '분양보증 가입 확인하기', s: '30세대 이상 아파트 선분양은 보통 주택도시보증공사(HUG) 분양보증에 가입해요', href: 'https://www.khug.or.kr/', ext: 1, ln: '주택도시보증공사' });
    else todo.push({ id: 'eais', t: '건축물 정보·분양신고 확인하기', s: '건축 허가·용도를 세움터에서, 분양신고는 시·군·구청에서', href: 'https://www.eais.go.kr/', ext: 1, ln: '세움터' });
    if (ext.dev.length) todo.push({ id: 'eum', t: '개발 계획 원문 찾아보기', s: '지구 지정·고시 문서는 토지이음에서 주소로 볼 수 있어요', href: 'https://www.eum.go.kr/', ext: 1, ln: '토지이음' });
    todo.push({ id: 'map', t: '주변 실거래 직접 보기', s: '같은 동네 새 아파트 시세와 전세가율', href: place ? `map/?g=${place.code}` : 'map/', ln: '시세 지도' });
    return { title: '받은 분양 광고 확인', lv, head, sub: `${ext.name || (N && N.n) || '현장 이름 확인 안 됨'}${type ? ' · ' + type : ''} · 광고 문구 기준`, asof: `확인일 ${ctx.today || ''} · 실거래 ${ctx.dataTo ? ymTxt(ctx.dataTo) : ''}까지 · 광고 글은 이 기기 안에서만 읽었어요`.replace(' ·  ·', ' ·'),
      items, todo, facts, cnt,
      note: '정보 제공용 확인 결과예요. 특정 분양을 권하거나 말리지 않아요. 분양 조건은 입주자모집공고문·분양 계약서가 최종 기준이고, 광고주를 평가한 결과가 아니라 광고 문구를 공개 자료와 맞춰 본 결과예요.' };
  }

  /** 공유용 요약(개인 금액·전화번호·광고 원문 없음) */
  function shareText(rep) {
    const LV = { g: '괜찮아요', y: '주의', r: '위험', n: '확인 필요' };
    return `받은 분양 광고 확인 결과 — ${(rep.items || []).map(i => `${i.t} ${LV[i.lv] || ''}`).join(' · ')}`;
  }

  const BAD = /(지금\s*사세요|꼭\s*사세요|사셔야|사지\s*마세요|피하세요|계약하세요|계약하지\s*마|추천\s*단지|무조건|오를\s*거예요|떨어질\s*거예요|사기\s*분양|허위\s*광고입니다|사기예요)/;
  const API = { PY, WALK, BAND, BAD, scrub, money, parse, placeOf, matchNotice, nameScore, nearPrice, nearJeonse, deferCalc, build, shareText, won, distM, bandOf, TYPE_INFO, esc };
  root.JDJ_ADCHK = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
