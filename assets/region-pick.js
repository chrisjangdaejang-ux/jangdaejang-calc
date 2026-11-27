/* 매수 지역: 시·도 → 시·군·구를 직접 고르면 규제 구분(서울/경기 규제/비규제 수도권/지방)은 자동으로 정해진다.
   페이지의 기존 <select id="region">(seoul|ggreg|capfree|local)은 숨겨 두고 값만 채워 change 이벤트를 보낸다. */
/* 지역 고르기 목록(시·도·시·군·구·동) 가나다순 정렬 — 여러 화면이 함께 쓴다. window.JDJ_KO
   시·도는 서울·경기·인천을 먼저, 나머지는 가나다순. 시·군·구·동은 모두 가나다순('구 전체' 같은 첫 칸은 화면이 따로 붙임). */
(function (root) {
  const FIRST = ['서울', '경기', '인천'];
  const cmp = (a, b) => String(a == null ? '' : a).localeCompare(String(b == null ? '' : b), 'ko');
  const head = n => { n = String(n || ''); for (let i = 0; i < FIRST.length; i++) if (n.indexOf(FIRST[i]) === 0) return i; return FIRST.length; };
  const sidoCmp = (a, b) => head(a) - head(b) || cmp(a, b);
  const id = x => x;
  const sortBy = (list, key) => { key = key || id; return Array.from(list || []).sort((a, b) => cmp(key(a), key(b))); };
  const sortSido = (list, key) => { key = key || id; return Array.from(list || []).sort((a, b) => sidoCmp(key(a), key(b))); };
  const API = { cmp, sidoCmp, sortBy, sortSido };
  if (root) root.JDJ_KO = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : null);

(function () {
  if (typeof document === 'undefined' || !document.getElementById('region')) return;   // 고르기 칸이 없는 화면은 정렬 도우미(JDJ_KO)만 씀
  var JB = (typeof window !== 'undefined' && window.JDJ_BASE) || (function (p) { var g = p.indexOf('/jangdaejang-calc/') === 0, b = { SITE: g ? '/jangdaejang-calc/' : '/', DATA: g ? '/jangdaejang-data/' : 'https://chrisjangdaejang-ux.github.io/jangdaejang-data/' }; if (typeof window !== 'undefined') window.JDJ_BASE = b; return b; })((typeof location !== 'undefined' && location.pathname) || '/jangdaejang-calc/');
  /* 오늘 규제지역인 경기 시·군·구 — 날짜별 표 assets/reg-zones.js(JDJ_REG) 한 곳에서 (이 파일보다 먼저 불러옴) */
  const REG_GG = window.JDJ_REG ? JDJ_REG.regList().filter(c => c.slice(0, 2) === '41') : [];
  const CAT_TXT = { seoul: '규제지역', ggreg: '규제지역', capfree: '비규제 수도권', local: '지방 비규제' };
  const sel = document.getElementById('region');
  if (!sel) return;
  window.JDJ_REGION = { sido: '서울특별시', sgg: '', label: '서울특별시', cat: 'seoul' };

  const wrap = document.createElement('div');
  wrap.className = 'row2';
  wrap.innerHTML = '<select id="rSido" aria-label="시·도"><option>불러오는 중…</option></select><select id="rSgg" aria-label="시·군·구"><option value="">전체</option></select>';
  const note = document.createElement('div');
  note.className = 'hint'; note.id = 'rPickNote'; note.style.cssText = 'color:#C2410C';
  sel.style.display = 'none';
  sel.parentNode.insertBefore(wrap, sel);
  sel.parentNode.insertBefore(note, sel.nextSibling);
  const sd = wrap.querySelector('#rSido'), sg = wrap.querySelector('#rSgg');
  let IX = null;

  const ANY = '__any';   /* 지역 상관없음: 대출 기준은 비규제 수도권으로 보여 주고, 리포트는 전 시·도에서 찾는다 */
  const shortOf = n => IX.sido.find(s => s.name === n)?.short || '';
  function category(sidoName, sgg) {
    if (sidoName === ANY) return 'capfree';
    const sh = shortOf(sidoName);
    if (sh === '서울') return 'seoul';
    if (sh === '경기') return REG_GG.includes(sgg) ? 'ggreg' : 'capfree';
    if (sh === '인천') return 'capfree';
    return 'local';
  }
  function apply(fire) {
    const any = sd.value === ANY, sidoName = any ? '지역 상관없음' : sd.value, sgg = any ? '' : sg.value;
    const cat = category(sd.value, sgg);
    const label = sidoName + (sgg ? ' ' + IX.sgg[sgg].name : '');
    window.JDJ_REGION = { sido: sidoName, sgg, label, cat, any };
    sg.disabled = any; sg.hidden = any; wrap.classList.toggle('any', any);
    sel.value = cat;
    const opt = sel.options[sel.selectedIndex];
    if (opt) opt.textContent = any ? '지역 상관없음 (전국)' : `${label} (${CAT_TXT[cat]})`;
    note.textContent = any ? '지역 상관없음: 대출 한도는 지역마다 달라 여기서는 비규제 수도권 기준으로 보여 드려요. 리포트에서는 전국에서 예산 안의 단지를 찾아 단지 위치별 기준으로 다시 계산해요.'
      : (shortOf(sidoName) === '경기' && !sgg)
      ? '과천·성남(분당)·화성(동탄) 등 규제지역은 대출 기준이 달라요. 시·군·구까지 골라 주세요. (지금은 비규제 기준으로 계산)' : '';
    note.style.color = any ? 'var(--sub2)' : '#C2410C';
    if (fire) sel.dispatchEvent(new Event('change', { bubbles: true }));
    try { localStorage.setItem('jdj_region', JSON.stringify({ sido: any ? ANY : sidoName, sgg })); } catch (e) {}
  }
  function fillSgg(keep) {
    const list = window.JDJ_KO.sortBy(Object.entries(IX.sgg).filter(([, v]) => v.sido === sd.value), e => e[1].name);
    sg.innerHTML = '<option value="">전체</option>' + list.map(([c, v]) => `<option value="${c}">${v.name}${(window.JDJ_REG && JDJ_REG.regulated(c) === true) ? ' · 규제' : ''}</option>`).join('');
    if (keep && list.some(([c]) => c === keep)) sg.value = keep;
  }
  sd.addEventListener('change', () => { fillSgg(); apply(true); });
  sg.addEventListener('change', () => apply(true));

  fetch(JB.DATA + 'data/index.json', { cache: 'no-cache' }).then(r => r.json()).then(ix => {
    IX = ix;
    // 서울·경기·인천 먼저, 나머지는 가나다순
    const sidos = window.JDJ_KO.sortSido(IX.sido, s => s.name);
    sd.innerHTML = sidos.map(s => `<option value="${s.name}">${s.name}</option>`).join('') + `<option value="${ANY}">지역 상관없음 (전국)</option>`;
    let saved = null; try { saved = JSON.parse(localStorage.getItem('jdj_region') || 'null'); } catch (e) {}
    const q = new URLSearchParams(location.search);
    const want = q.get('sd') ? { sido: q.get('sd'), sgg: q.get('g') || '' } : saved;
    if (want && (want.sido === ANY || want.sido === 'all' || want.sido === '지역 상관없음')) sd.value = ANY;
    else if (want && sidos.some(s => s.name === want.sido)) sd.value = want.sido;
    else {   // 예전 링크(r=ggreg 등)는 그 구분에 맞는 시·도로
      const r = q.get('r') || sel.value;
      sd.value = (sidos.find(s => s.short === (r === 'seoul' ? '서울' : r === 'local' ? '부산' : '경기')) || sidos[0]).name;
    }
    fillSgg(want && want.sido === sd.value ? want.sgg : '');
    apply(true);
  }).catch(() => { wrap.remove(); note.remove(); sel.style.display = ''; });   // 자료를 못 불러오면 예전 선택 방식 그대로
})();
