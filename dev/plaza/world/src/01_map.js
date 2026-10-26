// ================================================================ 케이요새 월드 — 모드마다 다른 맵 (실행 중 교체)
// 연구단지(방탈출) · 과학 정원 & 원형극장(숨바꼭질) · 야간 도심(탈출전)
const T = 48, MW = 122, MH = 84;
const OL = '#0E2238';
// tile codes
const TL = { WALL: 0, FLOOR: 1, DOOR: 2, WATER: 3, CONV: 4, GATE: 5, HOLE: 6, VOID: 9 };
// 맵이 바뀌면 내용만 갈아 끼우는 공용 그릇
const ROOMS = [], RID = {}, CORR = [], LINKS = [], VENTS = [], DOORLIST = [], DEC = [], GATES = [], PLATES = [];
const FLAVOR = {}, CONV = {}, GATEAT = {}, ROOMPROPS = {};
const TRACK = { up: 0, lo: 0, x0: 0, x1: 0, sw: [], block: [] };
const G = new Uint8Array(MW * MH), GR = new Int8Array(MW * MH).fill(-1), SOLID = new Uint8Array(MW * MH);
const gi = (x, y) => y * MW + x;
const MAPS = {}; let MAP = null;
const MODEMAP = { escape: 'lab', hide: 'garden', seek: 'garden', chase: 'city', chaseS: 'city' };
function carve(x0, y0, x1, y1, t, rid) { for (let y = Math.max(0, y0); y <= Math.min(MH - 1, y1); y++) for (let x = Math.max(0, x0); x <= Math.min(MW - 1, x1); x++) { G[gi(x, y)] = t; if (rid !== undefined) GR[gi(x, y)] = rid; } }
// 도형 깎기 — 타일 중심이 도형 안에 있으면
function carveIf(x0, y0, x1, y1, f, t, rid) { for (let y = Math.max(0, y0); y <= Math.min(MH - 1, y1); y++) for (let x = Math.max(0, x0); x <= Math.min(MW - 1, x1); x++) if (f(x + .5, y + .5)) { G[gi(x, y)] = t; if (rid !== undefined) GR[gi(x, y)] = rid; } }
function carveDisc(cx, cy, r, t, rid) { carveIf(Math.floor(cx - r), Math.floor(cy - r), Math.ceil(cx + r), Math.ceil(cy + r), (x, y) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r, t, rid); }
function carveEll(cx, cy, rx, ry, t, rid) { carveIf(Math.floor(cx - rx), Math.floor(cy - ry), Math.ceil(cx + rx), Math.ceil(cy + ry), (x, y) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1, t, rid); }
function carveRing(cx, cy, r0, r1, t, rid) { carveIf(Math.floor(cx - r1), Math.floor(cy - r1), Math.ceil(cx + r1), Math.ceil(cy + r1), (x, y) => { const d = Math.hypot(x - cx, y - cy); return d >= r0 && d <= r1; }, t, rid); }
// 굵은 선(대각선 길) — 점을 따라 원을 찍는다
function carveLine(x0, y0, x1, y1, w, t, rid) { const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 3); for (let k = 0; k <= n; k++) { const x = x0 + (x1 - x0) * k / n, y = y0 + (y1 - y0) * k / n; carveDisc(x, y, w / 2, t, rid); } }
function D(t, x, y, w, h, solid, o) { const d = Object.assign({ t, x, y, w: w || 1, h: h || 1, solid: solid !== false }, o || {}); DEC.push(d); return d; }
function bakeSolids() {
  SOLID.fill(0);
  for (const d of DEC) if (d.solid && !d.off) for (let y = Math.floor(d.y); y < Math.ceil(d.y + d.h); y++) for (let x = Math.floor(d.x); x < Math.ceil(d.x + d.w); x++) if (x >= 0 && y >= 0 && x < MW && y < MH) SOLID[gi(x, y)] = 1;
}
function decorById(id) { return DEC.find(d => d.id === id); }
function setRooms(list) { list.forEach((r, i) => { r.idx = i; ROOMS.push(r); RID[r.id] = i; }); }
function addDoors(list) { for (const [rid, x0, y0, x1, y1, lock] of list) { const d = { k: DOORLIST.length, room: rid, x0, y0, x1, y1, lock, open: true, amt: 0 }; carve(x0, y0, x1, y1, TL.DOOR, RID[rid]); DOORLIST.push(d); } }
function calcVert() { for (const d of DOORLIST) d.vert = G[gi(d.x0, d.y0 - 1)] !== TL.WALL && G[gi(d.x0, d.y1 + 1)] !== TL.WALL; }
function doorAt(x, y) { for (const d of DOORLIST) if (x >= d.x0 && x <= d.x1 && y >= d.y0 && y <= d.y1) return d; return null; }
function roomAt(x, y) { const v = GR[gi(Math.floor(x), Math.floor(y))]; return v >= 0 ? ROOMS[v] : null; }
function roomCenter(id) { const r = ROOMS[RID[id]]; if (r.ctr) return r.ctr.slice(); return [(r.r[0] + r.r[2] + 1) / 2, (r.r[1] + r.r[3] + 1) / 2]; }
// 맵 갈아 끼우기
function loadMap(id) {
  G.fill(TL.WALL); GR.fill(-1); SOLID.fill(0);
  for (const a of [ROOMS, CORR, LINKS, VENTS, DOORLIST, DEC, GATES, PLATES]) a.length = 0;
  for (const o of [RID, FLAVOR, CONV, GATEAT, ROOMPROPS]) for (const k in o) delete o[k];
  Object.assign(TRACK, { up: 0, lo: 0, x0: 0, x1: 0, sw: [], block: [] });
  MAP = MAPS[id]; MAP.id = id; MAP.build();
  DOORLIST.forEach((d, k) => { d.k = k; d.amt = 0; });
  for (const g of GATES) for (let y = g.y0; y <= g.y1; y++) GATEAT[gi(g.x, y)] = g;
  bakeSolids(); MAPIMG = null;
}
let MAPIMG = null; // 지도용 바닥 그림 캐시 (도형 맵)
function mapBaseImage() {
  if (MAPIMG && MAPIMG.id === MAP.id) return MAPIMG.c;
  const c = document.createElement('canvas'); c.width = MW; c.height = MH; const g = c.getContext('2d'), im = g.createImageData(MW, MH);
  const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const cols = ROOMS.map(r => hex(shade(r.c, 0.62))), cor = hex(MAP.corrCol || '#3A4560'), wat = [28, 110, 158];
  for (let i = 0; i < MW * MH; i++) { const t = G[i]; let c3 = null; if (t === TL.WALL || t === TL.VOID) c3 = null; else if (t === TL.WATER) c3 = wat; else { const v = GR[i]; c3 = v >= 0 ? cols[v] : cor; } const o = i * 4; if (c3) { im.data[o] = c3[0]; im.data[o + 1] = c3[1]; im.data[o + 2] = c3[2]; im.data[o + 3] = 255; } else { im.data[o] = 10; im.data[o + 1] = 15; im.data[o + 2] = 28; im.data[o + 3] = 255; } }
  g.putImageData(im, 0, 0); MAPIMG = { id: MAP.id, c }; return c;
}

// ================================================================ 맵 1: 케이요새 연구단지 (방탈출) — 네모난 기관 방이 복도로 이어진 격자
MAPS.lab = {
  name: '케이요새 연구단지', short: '연구단지', fog: 'rgba(6,9,20,.9)',
  build() {
    setRooms([
      // id, 이름, 기관, 짧은 설명, 내부 사각형 [x0,y0,x1,y1], 바닥, 색
      { id: 'kari', n: '발사 시험장', inst: '한국항공우주연구원', s: 'KARI', r: [4, 4, 22, 16], fl: 'pad', c: '#1B3A6B' },
      { id: 'kasi', n: '천문 관측실', inst: '한국천문연구원', s: 'KASI', r: [30, 4, 48, 16], fl: 'stars', c: '#3A2E7A' },
      { id: 'kriss', n: '표준 측정실', inst: '한국표준과학연구원', s: 'KRISS', r: [55, 4, 73, 16], fl: 'lab', c: '#7C5CE0' },
      { id: 'kisti', n: '슈퍼컴퓨터실', inst: '한국과학기술정보연구원', s: 'KISTI', r: [80, 4, 98, 16], fl: 'raised', c: '#4C6FD8' },
      { id: 'etri', n: '통신 안테나실', inst: '한국전자통신연구원', s: 'ETRI', r: [105, 4, 118, 16], fl: 'teal', c: '#1F6FB2' },
      { id: 'kigam', n: '지질 표본창고', inst: '한국지질자원연구원', s: 'KIGAM', r: [4, 24, 22, 40], fl: 'stone', c: '#9C6B3C' },
      { id: 'keri', n: '전력 제어실', inst: '한국전기연구원', s: 'KERI', r: [30, 24, 48, 40], fl: 'power', c: '#F59E0B' },
      { id: 'lobby', n: '중앙 로비', inst: '한국과학기술연구원', s: 'KIST', r: [55, 24, 73, 40], fl: 'marble', c: '#2E86D6' },
      { id: 'kfe', n: '핵융합 실험동', inst: '한국핵융합에너지연구원', s: 'KFE', r: [80, 24, 98, 40], fl: 'metal', c: '#7C3AED' },
      { id: 'nsr', n: '보안 미로', inst: '국가보안기술연구소', s: 'NSR', r: [105, 24, 118, 40], fl: 'matrix', c: '#16A34A' },
      { id: 'kribb', n: '바이오 온실', inst: '한국생명공학연구원', s: 'KRIBB', r: [4, 48, 22, 62], fl: 'soil', c: '#2FA84F' },
      { id: 'wikim', n: '김치 발효고', inst: '세계김치연구소', s: 'WiKim', r: [30, 48, 48, 62], fl: 'deck', c: '#E0533F' },
      { id: 'krict', n: '화학 플랜트', inst: '한국화학연구원', s: 'KRICT', r: [55, 48, 73, 62], fl: 'epoxy', c: '#0EA5A4' },
      { id: 'kaeri', n: '연구로 수조', inst: '한국원자력연구원', s: 'KAERI', r: [80, 48, 98, 62], fl: 'steel', c: '#0E7490' },
      { id: 'kimm', n: '로봇 공장', inst: '한국기계연구원', s: 'KIMM', r: [105, 48, 118, 62], fl: 'factory', c: '#475569' },
      { id: 'krri', n: '철도 시험선', inst: '한국철도기술연구원', s: 'KRRI', r: [4, 70, 118, 80], fl: 'gravel', c: '#BE123C' },
      { id: 'ctrl', n: '통합 관제실', inst: '국가과학기술연구회', s: 'NST', r: [60, 27, 68, 32], fl: 'carpetN', c: '#13294B', inner: 'lobby', hold: true },
    ]);
    Object.assign(FLAVOR, { kari: '누리호를 쏘아 올린 발사 시험장', kasi: '별자리를 좇는 관측 돔', kriss: '1초와 1킬로그램을 정하는 측정실', kisti: '국가 슈퍼컴퓨터가 웅웅대는 방', etri: '전파를 주고받는 안테나 숲', kigam: '땅속 시간이 쌓인 시추 코어 창고', keri: '고압 전기가 흐르는 제어실', lobby: '연구단지의 한가운데', kfe: 'KSTAR — 인공태양 핵융합로', nsr: '레이저가 지키는 보안 구역', kribb: '유전자를 키우는 바이오 온실', wikim: '김치가 익어 가는 발효고', krict: '배관이 얽힌 화학 플랜트', kaeri: '푸른 빛이 감도는 연구로 수조', kimm: '로봇 팔이 쉬지 않는 공장', krri: '시험 열차가 달리는 선로', ctrl: '모든 시설을 지휘하는 관제실' });
    CORR.push([4, 19, 118, 21], [4, 43, 118, 45], [4, 65, 118, 67], [25, 19, 27, 67], [50, 19, 52, 67], [75, 19, 77, 67], [100, 19, 102, 67]);
    LINKS.push([23, 11, 29, 12], [49, 8, 54, 9], [74, 10, 79, 11], [99, 10, 104, 11]);
    VENTS.push([16.5, 37.5, 31.5, 60.5], [117.5, 14.5, 105.5, 49.5], [72.5, 15.5, 73.5, 57.5]);
    for (const r of ROOMS) if (!r.inner) carve(r.r[0], r.r[1], r.r[2], r.r[3], TL.FLOOR, r.idx);
    for (const c of CORR) carve(c[0], c[1], c[2], c[3], TL.FLOOR, -2);
    for (const c of LINKS) carve(c[0], c[1], c[2], c[3], TL.FLOOR, -2);
    // 로비 안 관제실 벽
    { const r = ROOMS[RID.ctrl].r; for (let y = r[1] - 1; y <= r[3] + 1; y++) for (let x = r[0] - 1; x <= r[2] + 1; x++) { G[gi(x, y)] = TL.WALL; GR[gi(x, y)] = RID.lobby; } carve(r[0], r[1], r[2], r[3], TL.FLOOR, RID.ctrl); }
    // doors: [roomId, x0,y0,x1,y1 (carved tiles), lock tag for escape mode]
    addDoors([
      ['kari', 13, 17, 14, 18, 'red'], ['kasi', 39, 17, 40, 18, 'laser'], ['kriss', 64, 17, 65, 18, 'power'], ['kisti', 89, 17, 90, 18, 'power'], ['etri', 111, 17, 112, 18, null],
      ['kigam', 13, 22, 14, 23, null], ['kigam', 23, 31, 24, 32, null], ['keri', 39, 22, 40, 23, null], ['keri', 28, 31, 29, 32, null],
      ['lobby', 64, 22, 65, 23, null], ['lobby', 64, 41, 65, 42, null], ['lobby', 53, 35, 54, 36, null], ['lobby', 74, 35, 74, 36, null],
      ['kfe', 78, 31, 79, 32, 'power'], ['kfe', 89, 22, 90, 23, 'power'], ['nsr', 111, 22, 112, 23, 'green'], ['nsr', 103, 37, 104, 38, 'green'],
      ['kribb', 13, 46, 14, 47, 'blue'], ['wikim', 39, 46, 40, 47, 'green'], ['krict', 64, 46, 65, 47, 'blue'], ['kaeri', 89, 46, 90, 47, 'green'],
      ['kimm', 111, 46, 112, 47, 'power'], ['krri', 25, 68, 27, 69, 'red'], ['krri', 100, 68, 102, 69, 'red'],
      ['ctrl', 64, 33, 65, 33, 'fusion'],
      // 북쪽 연구동 직통 통로 (방끼리 바로 이어짐)
      ['kasi', 28, 11, 29, 12, 'laser'], ['kasi', 49, 8, 50, 9, 'laser'], ['kisti', 78, 10, 79, 11, 'power'], ['kisti', 99, 10, 100, 11, 'power'],
    ]);
    calcVert();
    labDecor();
    Object.assign(ROOMPROPS, { kari: ['cone', 'barrel'], kasi: ['scope', 'lamp'], kriss: ['flask', 'lamp'], kisti: ['server'], etri: ['router', 'server'], kigam: ['rock'], keri: ['coil', 'drum'], lobby: ['plant', 'chair'], kfe: ['canister'], nsr: ['server'], kribb: ['plant'], wikim: ['jar'], krict: ['drum', 'flask'], kaeri: ['barrel'], kimm: ['crate'], krri: ['crate', 'cone'], ctrl: ['chair'], corr: ['cone', 'plant'] });
  },
};
