/* 조정대상지역 판정 (세금 화면용 이름 → 코드 연결)
   ─────────────────────────────────────────────
   지정·해제 날짜는 이 파일에 두지 않는다. 집예보 전체가 함께 쓰는 날짜별 규제지역 표
   assets/reg-zones.js(JDJ_REG — 국토교통부 공고 제2023-2호·제2025-1223호·제2026-882호 등 출처 포함)를 읽어 판정한다.
   이 파일보다 assets/reg-zones.js 를 먼저 불러와야 한다.
   주의:
   - 세금 판정에 쓰는 2017.08.03 이후 기간만 본다. 1세대1주택 2년 거주 요건은 2017.8.3 이후
     조정대상지역에서 취득한 주택부터 적용되고(소득세법 시행령 제154조 제1항, 대통령령 제28293호 부칙),
     다주택 중과는 2018.4.1 이후 양도분부터라서 그 전 지정일은 계산에 영향이 없다.
   - 'ask' = 그 기간엔 구·시 안의 일부(광교지구, 동탄2택지개발지구, 처인구 일부 읍·면 제외 등)만 지정이었거나
     표에 없는 지역(인천·경기 그 밖의 시군·지방)의 2023.1.4 이전 → 화면에서 이용자에게 직접 확인을 받는다. */
(function (root) {
  const R = root.JDJ_REG || (typeof require === 'function' ? require('../assets/reg-zones.js') : null);
  const OPEN = R.OPEN;
  const SIDO = ['서울', '경기', '인천', '그 밖의 지역'];
  /* 이름 → 코드, 시·도별 기간 목록(예전 AREAS 모양 그대로: [{from, to, partial}]) */
  const CODE = {}, AREAS = { '서울': {}, '경기': {} };
  Object.keys(R.NAMES).forEach(c => {
    const [sd, gu] = R.NAMES[c], ps = R.periods(c, 'adj');
    CODE[sd + '|' + gu] = c;
    if (ps.length) AREAS[sd][gu] = ps.map(r => ({ from: r.f, to: r.e || null, partial: r.k !== 'all' || undefined }));
  });
  const OTHER_UNTIL = R.OTHER_UNTIL; // 표에 없는 지역: 이 날까지는 지정됐을 수 있음(직접 확인)

  /** 판정: true / false / 'ask'(이용자 확인 필요) */
  function isAdjusted(sido, gu, date) {
    if (!date) return 'ask';
    if (date < OPEN) return false;
    const c = CODE[sido + '|' + gu];
    if (!c || !AREAS[sido] || !AREAS[sido][gu]) return date <= OTHER_UNTIL ? 'ask' : false;
    return R.at(c, 'adj', date);
  }
  function guList(sido) {
    const ko = (a, b) => a.localeCompare(b, 'ko');   // 고르기 목록은 가나다순, '그 밖의 시·군'은 맨 끝
    if (sido === '경기') return Object.keys(AREAS['경기']).sort(ko).concat(['그 밖의 시·군']);
    if (AREAS[sido]) return Object.keys(AREAS[sido]).sort(ko);
    return [];
  }
  const cur = R.listAt('adj', R.today()).map(c => R.NAMES[c]);
  const META = {
    checked: R.CHECKED,
    current: cur.filter(n => n[0] === '서울').length === 25 ? '서울 25개 구 전역, 경기 ' + cur.filter(n => n[0] === '경기').map(n => n[1]).join('·') : cur.map(n => n.join(' ')).join(', '),
    sources: ['국토교통부공고 제2023-2호(2023.1.5)', '국토교통부공고 제2025-1223호(2025.10.16)', '국토교통부공고 제2026-882호(2026.7.1)'],
    basis: R.basis()
  };
  const API = { AREAS, SIDO, isAdjusted, guList, META, OPEN, codeOf: (sido, gu) => CODE[sido + '|' + gu] || null };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.JDJ_ADJ = API;
})(typeof self !== 'undefined' ? self : this);
