// ================================================================ 케이요새 월드 — 연결형 연구단지 맵
// 어몽어스식: 방과 복도가 한 덩어리로 이어진 시설. 기관마다 고유 조형물.
const T = 48, MW = 122, MH = 84;
const OL = '#0E2238';
// tile codes
const TL = { WALL: 0, FLOOR: 1, DOOR: 2, WATER: 3, CONV: 4, GATE: 5, HOLE: 6, VOID: 9 };
const ROOMS = [
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
 { id: 'ctrl', n: '통합 관제실', inst: '국가과학기술연구회', s: 'NST', r: [60, 27, 68, 32], fl: 'carpetN', c: '#13294B', inner: 'lobby' },
];
const FLAVOR = { kari: '누리호를 쏘아 올린 발사 시험장', kasi: '별자리를 좇는 관측 돔', kriss: '1초와 1킬로그램을 정하는 측정실', kisti: '국가 슈퍼컴퓨터가 웅웅대는 방', etri: '전파를 주고받는 안테나 숲', kigam: '땅속 시간이 쌓인 시추 코어 창고', keri: '고압 전기가 흐르는 제어실', lobby: '연구단지의 한가운데', kfe: 'KSTAR — 인공태양 핵융합로', nsr: '레이저가 지키는 보안 구역', kribb: '유전자를 키우는 바이오 온실', wikim: '김치가 익어 가는 발효고', krict: '배관이 얽힌 화학 플랜트', kaeri: '푸른 빛이 감도는 연구로 수조', kimm: '로봇 팔이 쉬지 않는 공장', krri: '시험 열차가 달리는 선로', ctrl: '모든 시설을 지휘하는 관제실' };
const RID = {}; ROOMS.forEach((r, i) => { RID[r.id] = i; r.idx = i; });
const CORR = [[4, 19, 118, 21], [4, 43, 118, 45], [4, 65, 118, 67], [25, 19, 27, 67], [50, 19, 52, 67], [75, 19, 77, 67], [100, 19, 102, 67]];
// doors: [roomId, x0,y0,x1,y1 (carved tiles), lock tag for escape mode]
const DOORS = [
 ['kari', 13, 17, 14, 18, 'red'], ['kasi', 39, 17, 40, 18, 'laser'], ['kriss', 64, 17, 65, 18, 'power'], ['kisti', 89, 17, 90, 18, 'power'], ['etri', 111, 17, 112, 18, null],
 ['kigam', 13, 22, 14, 23, null], ['kigam', 23, 31, 24, 32, null], ['keri', 39, 22, 40, 23, null], ['keri', 28, 31, 29, 32, null],
 ['lobby', 64, 22, 65, 23, null], ['lobby', 64, 41, 65, 42, null], ['lobby', 53, 35, 54, 36, null], ['lobby', 74, 35, 74, 36, null],
 ['kfe', 78, 31, 79, 32, 'power'], ['kfe', 89, 22, 90, 23, 'power'], ['nsr', 111, 22, 112, 23, 'green'], ['nsr', 103, 37, 104, 38, 'green'],
 ['kribb', 13, 46, 14, 47, 'blue'], ['wikim', 39, 46, 40, 47, 'green'], ['krict', 64, 46, 65, 47, 'blue'], ['kaeri', 89, 46, 90, 47, 'green'],
 ['kimm', 111, 46, 112, 47, 'power'], ['krri', 25, 68, 27, 69, 'red'], ['krri', 100, 68, 102, 69, 'red'],
 ['ctrl', 64, 33, 65, 33, 'fusion'],
 // 북쪽 연구동 직통 통로 (방끼리 바로 이어짐)
 ['kasi', 28, 11, 29, 12, 'laser'], ['kasi', 49, 8, 50, 9, 'laser'], ['kisti', 78, 10, 79, 11, 'power'], ['kisti', 99, 10, 100, 11, 'power'],
];
const LINKS = [[23, 11, 29, 12], [49, 8, 54, 9], [74, 10, 79, 11], [99, 10, 104, 11]];
const VENTS = [[16.5, 37.5, 31.5, 60.5], [117.5, 14.5, 105.5, 49.5], [72.5, 15.5, 73.5, 57.5]];
// grid
const G = new Uint8Array(MW * MH), GR = new Int8Array(MW * MH).fill(-1);
const gi = (x, y) => y * MW + x;
function carve(x0, y0, x1, y1, t, rid) { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { G[gi(x, y)] = t; if (rid !== undefined) GR[gi(x, y)] = rid; } }
for (const r of ROOMS) if (!r.inner) carve(r.r[0], r.r[1], r.r[2], r.r[3], TL.FLOOR, r.idx);
for (const c of CORR) carve(c[0], c[1], c[2], c[3], TL.FLOOR, -2);
for (const c of LINKS) carve(c[0], c[1], c[2], c[3], TL.FLOOR, -2);
// inner control room inside the lobby: walls around it
(function () { const r = ROOMS[RID.ctrl].r; for (let y = r[1] - 1; y <= r[3] + 1; y++) for (let x = r[0] - 1; x <= r[2] + 1; x++) { G[gi(x, y)] = TL.WALL; GR[gi(x, y)] = RID.lobby; } carve(r[0], r[1], r[2], r[3], TL.FLOOR, RID.ctrl); })();
const DOORLIST = DOORS.map(([rid, x0, y0, x1, y1, lock], k) => { const d = { k, room: rid, x0, y0, x1, y1, lock, open: true }; carve(x0, y0, x1, y1, TL.DOOR, RID[rid]); return d; });
for (const d of DOORLIST) d.vert = G[gi(d.x0, d.y0 - 1)] !== TL.WALL && G[gi(d.x0, d.y1 + 1)] !== TL.WALL; // passage runs up-down
function doorAt(x, y) { for (const d of DOORLIST) if (x >= d.x0 && x <= d.x1 && y >= d.y0 && y <= d.y1) return d; return null; }
function roomAt(x, y) { const v = GR[gi(Math.floor(x), Math.floor(y))]; return v >= 0 ? ROOMS[v] : null; }
function roomCenter(id) { const r = ROOMS[RID[id]].r; return [(r[0] + r[2] + 1) / 2, (r[1] + r[3] + 1) / 2]; }
