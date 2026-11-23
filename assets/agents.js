/* 장대장 공인중개사 제휴 — 공용 클라이언트
   API: 구글 Apps Script 웹 앱 주소 (tools/agent-backend.gs 배포 후 여기에 붙여넣기) */
(function(){
  const API = 'https://script.google.com/macros/s/AKfycbyFwqwleAfwHoVSfWHyFVnszvc0fCjsG-WcEVkxRqUz_FmmL4bL-RymfPc3Eh_aNcrRpQ/exec';   // 예: 'https://script.google.com/macros/s/XXXX/exec'

  /* 서버가 돌려준 오류 글: 한글 안내면 그대로, 'unknown'·'auth' 같은 코드·영문 오류면 쉬운 안내로(원래 값은 er.raw) */
  const FALLBACK_ERR = '잠시 뒤 다시 시도해 주세요. 계속되면 카카오톡 상담으로 알려 주세요.';
  const errText = t => /[가-힣]/.test(String(t || '')) ? String(t) : FALLBACK_ERR;
  window.JDJ_ERRTEXT = errText;
  function vid(){ try{ return localStorage.getItem('jdj_vid') || ''; }catch(e){ return ''; } }
  let listP = null;
  const A = {
    api: API,
    errText,
    ready: !!API,
    list(){
      if (!API) return Promise.resolve({ok:false, agents:[]});
      if (!listP) listP = fetch(API + '?action=list').then(r=>r.json()).catch(()=>({ok:false, agents:[]}));
      return listP;
    },
    post(body){
      if (!API) return Promise.reject(new Error('제휴 서버가 아직 연결되지 않았어요.'));
      return fetch(API, {method:'POST', headers:{'Content-Type':'text/plain;charset=utf-8'}, body:JSON.stringify(body)})
        .then(r=>r.json()).then(j=>{ if(!j || !j.ok){ const er = new Error(errText(j && j.err)); er.raw = (j && j.err) || ''; er.code = (j && j.code) || ''; throw er; } return j; });
    },
    _q: [], _t: null, _seen: new Set(),
    /* t: rec(추천 카드 표시, a에 여러 id 가능)|imp(목록 펼침)|view|call|kakao, a: 중개사 id, g: 구 코드, k: 단지 키(선택) — 같은 화면에서 같은 노출은 한 번만 */
    log(t, a, g, k){
      if (!API) return;
      const key = [t,a,g,k||''].join('|');
      if ((t==='imp'||t==='rec') && A._seen.has(key)) return;
      A._seen.add(key);
      A._q.push({t, a, g, k:k||''});
      clearTimeout(A._t);
      A._t = setTimeout(A.flush, 800);
    },
    flush(){
      if (!A._q.length || !API) return;
      const events = A._q.splice(0, 40);
      try{
        fetch(API, {method:'POST', mode:'no-cors', keepalive:true, headers:{'Content-Type':'text/plain;charset=utf-8'},
          body:JSON.stringify({action:'log', vid:vid(), events})});
      }catch(e){}
      if (A._q.length) setTimeout(A.flush, 300);
    }
  };
  addEventListener('pagehide', ()=>A.flush());
  window.JDJ_AGENTS = A;
})();
