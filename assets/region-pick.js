/* 매수 지역: 시·도 → 시·군·구를 직접 고르면 규제 구분(서울/경기 규제/비규제 수도권/지방)은 자동으로 정해진다.
   페이지의 기존 <select id="region">(seoul|ggreg|capfree|local)은 숨겨 두고 값만 채워 change 이벤트를 보낸다. */
(function () {
  const REG_GG = ['41290', '41210', '41135', '41131', '41133', '41117', '41111', '41115', '41173', '41465', '41430', '41450', '41597', '41463', '41310'];
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

  const shortOf = n => IX.sido.find(s => s.name === n)?.short || '';
  function category(sidoName, sgg) {
    const sh = shortOf(sidoName);
    if (sh === '서울') return 'seoul';
    if (sh === '경기') return REG_GG.includes(sgg) ? 'ggreg' : 'capfree';
    if (sh === '인천') return 'capfree';
    return 'local';
  }
  function apply(fire) {
    const sidoName = sd.value, sgg = sg.value;
    const cat = category(sidoName, sgg);
    const label = sidoName + (sgg ? ' ' + IX.sgg[sgg].name : '');
    window.JDJ_REGION = { sido: sidoName, sgg, label, cat };
    sel.value = cat;
    const opt = sel.options[sel.selectedIndex];
    if (opt) opt.textContent = `${label} (${CAT_TXT[cat]})`;
    note.textContent = (shortOf(sidoName) === '경기' && !sgg)
      ? '과천·성남(분당)·화성(동탄) 등 규제지역은 대출 기준이 달라요. 시·군·구까지 골라 주세요. (지금은 비규제 기준으로 계산)' : '';
    if (fire) sel.dispatchEvent(new Event('change', { bubbles: true }));
    try { localStorage.setItem('jdj_region', JSON.stringify({ sido: sidoName, sgg })); } catch (e) {}
  }
  function fillSgg(keep) {
    const list = Object.entries(IX.sgg).filter(([, v]) => v.sido === sd.value)
      .sort((a, b) => a[1].name.localeCompare(b[1].name, 'ko'));
    sg.innerHTML = '<option value="">전체</option>' + list.map(([c, v]) => `<option value="${c}">${v.name}${REG_GG.includes(c) || c.startsWith('11') ? ' · 규제' : ''}</option>`).join('');
    if (keep && list.some(([c]) => c === keep)) sg.value = keep;
  }
  sd.addEventListener('change', () => { fillSgg(); apply(true); });
  sg.addEventListener('change', () => apply(true));

  fetch('/jangdaejang-data/data/index.json', { cache: 'no-cache' }).then(r => r.json()).then(ix => {
    IX = ix;
    // 서울·경기·인천 먼저, 나머지는 가나다순
    const first = ['서울', '경기', '인천'];
    const sidos = [...IX.sido].sort((a, b) => {
      const ia = first.indexOf(a.short), ib = first.indexOf(b.short);
      return (ia < 0 ? 9 : ia) - (ib < 0 ? 9 : ib) || a.name.localeCompare(b.name, 'ko');
    });
    sd.innerHTML = sidos.map(s => `<option value="${s.name}">${s.name}</option>`).join('');
    let saved = null; try { saved = JSON.parse(localStorage.getItem('jdj_region') || 'null'); } catch (e) {}
    const q = new URLSearchParams(location.search);
    const want = q.get('sd') ? { sido: q.get('sd'), sgg: q.get('g') || '' } : saved;
    if (want && sidos.some(s => s.name === want.sido)) sd.value = want.sido;
    else {   // 예전 링크(r=ggreg 등)는 그 구분에 맞는 시·도로
      const r = q.get('r') || sel.value;
      sd.value = (sidos.find(s => s.short === (r === 'seoul' ? '서울' : r === 'local' ? '부산' : '경기')) || sidos[0]).name;
    }
    fillSgg(want && want.sido === sd.value ? want.sgg : '');
    apply(true);
  }).catch(() => { wrap.remove(); note.remove(); sel.style.display = ''; });   // 자료를 못 불러오면 예전 선택 방식 그대로
})();
