/* 장대장 공인중개사 제휴 — 공용 클라이언트
   API: 구글 Apps Script 웹 앱 주소 (tools/agent-backend.gs 배포 후 여기에 붙여넣기) */
(function(){
  const API = '';   // 예: 'https://script.google.com/macros/s/XXXX/exec'

  function vid(){ try{ return localStorage.getItem('jdj_vid') || ''; }catch(e){ return ''; } }
  let listP = null;
  const A = {
    api: API,
    ready: !!API,
    list(){
      if (!API) return Promise.resolve({ok:false, agents:[]});
      if (!listP) listP = fetch(API + '?action=list').then(r=>r.json()).catch(()=>({ok:false, agents:[]}));
      return listP;
    },
    post(body){
      if (!API) return Promise.reject(new Error('제휴 서버가 아직 연결되지 않았습니다.'));
      return fetch(API, {method:'POST', headers:{'Content-Type':'text/plain;charset=utf-8'}, body:JSON.stringify(body)})
        .then(r=>r.json()).then(j=>{ if(!j.ok) throw new Error(j.err||'처리하지 못했습니다.'); return j; });
    },
    _q: [], _t: null, _seen: new Set(),
    /* t: imp|view|call|kakao, a: 중개사 id, g: 구 코드, k: 단지 키(선택) — 같은 화면에서 같은 노출은 한 번만 */
    log(t, a, g, k){
      if (!API) return;
      const key = [t,a,g,k||''].join('|');
      if (t==='imp' && A._seen.has(key)) return;
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
