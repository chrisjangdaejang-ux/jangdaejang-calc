/* 집예보 지도 엔진 한 겹 — 지도 화면(map/)은 이 파일의 함수만 부르고, 카카오맵/Leaflet 차이는 여기서만 다룬다.
   고르는 순서 (assets/config.js 의 window.JDJ_SITE):
     1) MAP_ENGINE 이 'leaflet' 이 아니고 KAKAO_JS_KEY 가 있으면 → 카카오맵 JavaScript SDK (dapi.kakao.com, autoload=false)
        · 카카오 개발자 콘솔에서 같은 앱의 [플랫폼] Web 사이트 도메인 등록 + [카카오맵] 사용 설정이 되어 있어야 함
        · SDK 를 못 불러오면(키·도메인 오류, 네트워크) 조용히 2)로
     2) Leaflet(assets/leaflet, 사이트 안에 있는 1.9.4) + 배경 타일
        · VWORLD_KEY 가 있으면 브이월드 배경지도(국토교통부 공간정보 오픈플랫폼, 서비스 URL 로 제한된 공개 키)
        · 없으면 OpenStreetMap 공식 타일 — 정식 오픈 전 미리 보기용(공식 타일은 대량·상업 서비스용이 아님)
   타일·SDK 는 다른 주소(외부)라 sw.js 가 캐시하지 않는다.
   window.JDJ_MAPE.create(el, {lat, lng, zoom}) → Promise<지도>
     지도 = { kind, zoom(), bounds() {w,s,e,n}, center() {lat,lng}, project(lat,lng) {x,y}, size() {w,h},
              setView(lat,lng,zoom), zoomBy(d, lat, lng), panBy(dx,dy), onIdle(fn), onTap(fn), onMoveStart(fn),
              add(lat,lng,el,z) → {el, move(lat,lng), remove()}, relayout(),
              shape(kind 'line'|'area', pts, st, onTap) → {remove()} }   // pts: 선 [[위도,경도],…] / 면 [[[위도,경도],…],…](고리 여러 개)
                                                                          // st: {color, weight, dash(true=점선), fill, fillOpacity, opacity}. 말풍선 아래에 그려짐
     줌 숫자는 두 엔진 모두 Leaflet 기준(카카오 레벨 = 20 − 줌)으로 맞춘다. */
(function (root) {
  'use strict';
  const CFG = root.JDJ_SITE || {};
  const LEAF = '/jangdaejang-calc/assets/leaflet/';
  const KZ = lv => 20 - lv, ZK = z => Math.max(1, Math.min(14, Math.round(20 - z)));
  function script(src) {
    return new Promise((ok, no) => { const s = document.createElement('script'); s.src = src; s.async = true; s.onload = () => ok(); s.onerror = () => no(new Error(src)); document.head.appendChild(s); });
  }
  function css(href) { if (document.querySelector('link[href="' + href + '"]')) return; const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = href; document.head.appendChild(l); }
  /** 어떤 엔진·타일을 쓸지(화면에 표시·테스트용) */
  function plan(cfg) {
    cfg = cfg || CFG;
    const kakao = String(cfg.KAKAO_JS_KEY || '').trim(), vw = String(cfg.VWORLD_KEY || '').trim();
    if (kakao && cfg.MAP_ENGINE !== 'leaflet') return { kind: 'kakao' };
    return { kind: 'leaflet', tiles: vw ? 'vworld' : 'osm' };
  }
  const TILES = {
    vworld: k => ({ url: 'https://api.vworld.kr/req/wmts/1.0.0/' + encodeURIComponent(k) + '/Base/{z}/{y}/{x}.png', o: { minZoom: 6, maxZoom: 19,
      attribution: '배경지도 <a href="https://www.vworld.kr" target="_blank" rel="noopener">브이월드(국토교통부)</a>' } }),
    osm: () => ({ url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', o: { maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> 기여자' } })
  };

  /* ---------- Leaflet ---------- */
  async function leaflet(el, v, tiles) {
    if (!root.L) { css(LEAF + 'leaflet.css'); await script(LEAF + 'leaflet.js'); }
    const L = root.L;
    const map = L.map(el, { zoomControl: false, minZoom: 6, maxZoom: 19, tap: false, preferCanvas: true, zoomSnap: 1, wheelPxPerZoomLevel: 120,
      maxBounds: [[32.5, 123.5], [39.2, 132.2]], maxBoundsViscosity: 0.8 }).setView([v.lat, v.lng], v.zoom);
    const t = tiles === 'vworld' ? TILES.vworld(CFG.VWORLD_KEY) : TILES.osm();
    const layer = L.tileLayer(t.url, Object.assign({ updateWhenIdle: true, keepBuffer: 2, crossOrigin: false }, t.o)).addTo(map);
    if (tiles === 'vworld') {       // 브이월드 키가 이 주소에서 안 되면(도메인 미등록 등) 공식 OSM 으로 한 번만 바꾼다
      let bad = 0; layer.on('tileerror', () => { if (++bad === 6) { map.removeLayer(layer); const o = TILES.osm(); L.tileLayer(o.url, o.o).addTo(map); } });
    }
    map.attributionControl.setPrefix('<a href="https://leafletjs.com" target="_blank" rel="noopener">Leaflet</a>');
    const pane = map.getPane('markerPane');
    return {
      kind: 'leaflet', tiles,
      zoom: () => map.getZoom(),
      bounds: () => { const b = map.getBounds(); return { w: b.getWest(), s: b.getSouth(), e: b.getEast(), n: b.getNorth() }; },
      center: () => { const c = map.getCenter(); return { lat: c.lat, lng: c.lng }; },
      project: (lat, lng) => { const p = map.latLngToContainerPoint([lat, lng]); return { x: p.x, y: p.y }; },
      size: () => { const s = map.getSize(); return { w: s.x, h: s.y }; },
      setView: (lat, lng, z) => map.setView([lat, lng], z == null ? map.getZoom() : z, { animate: true }),
      zoomBy: (d, lat, lng) => lat != null ? map.setView([lat, lng], map.getZoom() + d) : map.setZoom(map.getZoom() + d),
      panBy: (dx, dy) => map.panBy([dx, dy]),
      onIdle: fn => map.on('moveend', fn),
      onMoveStart: fn => map.on('movestart', fn),
      onTap: fn => map.on('click', e => { const t = e.originalEvent && e.originalEvent.target; if (t && t.closest && t.closest('.jm-pin')) return; fn(); }),
      add(lat, lng, node, z) {
        const m = L.marker([lat, lng], { icon: L.divIcon({ html: node, className: 'jm-pin', iconSize: [0, 0], iconAnchor: [0, 0] }), keyboard: false, interactive: false, zIndexOffset: z || 0 }).addTo(map);
        return { el: node, move: (a, b) => m.setLatLng([a, b]), remove: () => map.removeLayer(m) };
      },
      relayout: () => map.invalidateSize(),
      shape(kind, pts, st, onTap) {
        st = st || {};
        const o = { color: st.color || '#6D4AFF', weight: st.weight || 3, opacity: st.opacity == null ? 0.9 : st.opacity, dashArray: st.dash ? '8 7' : null,
          lineCap: 'round', interactive: !!onTap, bubblingMouseEvents: false };
        const g = kind === 'area' ? L.polygon(pts, Object.assign(o, { fill: true, fillColor: st.fill || o.color, fillOpacity: st.fillOpacity == null ? 0.12 : st.fillOpacity }))
          : L.polyline(pts, o);
        if (onTap) g.on('click', () => onTap());   // bubblingMouseEvents:false → 지도 빈 곳 누름(카드 닫기)으로 번지지 않음
        g.addTo(map);
        return { remove: () => map.removeLayer(g) };
      },
      _pane: pane
    };
  }

  /* ---------- 카카오맵 ---------- */
  let kakaoShapeTap = 0;
  async function kakao(el, v) {
    const key = String(CFG.KAKAO_JS_KEY || '').trim();
    if (!(root.kakao && root.kakao.maps && root.kakao.maps.Map)) {
      await script('https://dapi.kakao.com/v2/maps/sdk.js?autoload=false&appkey=' + encodeURIComponent(key));
      await new Promise((ok, no) => { if (!(root.kakao && root.kakao.maps)) return no(new Error('kakao')); root.kakao.maps.load(ok); });
    }
    const K = root.kakao.maps, ev = K.event;
    const map = new K.Map(el, { center: new K.LatLng(v.lat, v.lng), level: ZK(v.zoom) });
    map.setMinLevel(1); map.setMaxLevel(13);
    const pr = () => map.getProjection();
    return {
      kind: 'kakao',
      zoom: () => KZ(map.getLevel()),
      bounds: () => { const b = map.getBounds(), sw = b.getSouthWest(), ne = b.getNorthEast(); return { w: sw.getLng(), s: sw.getLat(), e: ne.getLng(), n: ne.getLat() }; },
      center: () => { const c = map.getCenter(); return { lat: c.getLat(), lng: c.getLng() }; },
      project: (lat, lng) => { const p = pr().containerPointFromCoords(new K.LatLng(lat, lng)); return { x: p.x, y: p.y }; },
      size: () => ({ w: el.clientWidth, h: el.clientHeight }),
      setView: (lat, lng, z) => { if (z != null) map.setLevel(ZK(z)); map.panTo(new K.LatLng(lat, lng)); },
      zoomBy: (d, lat, lng) => { map.setLevel(Math.max(1, Math.min(13, map.getLevel() - d)), lat != null ? { anchor: new K.LatLng(lat, lng) } : undefined); },
      panBy: (dx, dy) => map.panBy(dx, dy),
      onIdle: fn => ev.addListener(map, 'idle', fn),
      onMoveStart: fn => { ev.addListener(map, 'dragstart', fn); ev.addListener(map, 'zoom_start', fn); },
      onTap: fn => ev.addListener(map, 'click', () => { if (Date.now() - kakaoShapeTap < 400) return; fn(); }),   // 선·면을 누른 같은 누름은 지도 빈 곳 누름으로 치지 않음
      add(lat, lng, node, z) {
        const o = new K.CustomOverlay({ position: new K.LatLng(lat, lng), content: node, xAnchor: 0, yAnchor: 0, zIndex: 10 + (z || 0) / 100, clickable: true });
        o.setMap(map);
        return { el: node, move: (a, b) => o.setPosition(new K.LatLng(a, b)), remove: () => o.setMap(null) };
      },
      relayout: () => map.relayout(),
      shape(kind, pts, st, onTap) {
        st = st || {};
        const ll = a => a.map(p => new K.LatLng(p[0], p[1]));
        const o = { strokeWeight: st.weight || 3, strokeColor: st.color || '#6D4AFF', strokeOpacity: st.opacity == null ? 0.9 : st.opacity, strokeStyle: st.dash ? 'shortdash' : 'solid', zIndex: 1 };
        const g = kind === 'area' ? new K.Polygon(Object.assign(o, { path: pts.map(ll), fillColor: st.fill || o.strokeColor, fillOpacity: st.fillOpacity == null ? 0.12 : st.fillOpacity }))
          : new K.Polyline(Object.assign(o, { path: ll(pts) }));
        g.setMap(map);
        if (onTap) ev.addListener(g, 'click', () => { kakaoShapeTap = Date.now(); onTap(); });
        return { remove: () => g.setMap(null) };
      }
    };
  }

  async function create(el, v) {
    const p = plan();
    if (p.kind === 'kakao') {
      try { return await kakao(el, v); } catch (e) { el.innerHTML = ''; }
      return leaflet(el, v, String(CFG.VWORLD_KEY || '').trim() ? 'vworld' : 'osm');
    }
    return leaflet(el, v, p.tiles);
  }
  const API = { create, plan, TILES, KZ, ZK };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.JDJ_MAPE = API;
})(typeof window !== 'undefined' ? window : globalThis);
