// ================================================================ 기관 조형물 · 방 배치
// decor: {t, x, y, w, h, solid, room, ...}  (타일 단위)
const DEC = [];
function D(t, x, y, w, h, solid, o) { const d = Object.assign({ t, x, y, w: w || 1, h: h || 1, solid: solid !== false }, o || {}); DEC.push(d); return d; }
// ---- NSR maze walls (internal) & gates
DOORLIST.splice(DOORLIST.findIndex(d => d.room === 'nsr' && d.y0 === 22), 1); // 보안 미로는 서쪽 문 하나
for (let x = 111; x <= 112; x++) for (let y = 22; y <= 23; y++) { G[gi(x, y)] = TL.WALL; }
DOORLIST.forEach((d, k) => d.k = k);
const NSRW = [[105, 36, 116, 36], [106, 31, 118, 31], [105, 26, 116, 26], [109, 38, 109, 40], [113, 37, 113, 39], [108, 32, 108, 34], [114, 33, 114, 35], [110, 27, 110, 29], [115, 28, 115, 30]];
for (const [x0, y0, x1, y1] of NSRW) for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) G[gi(x, y)] = TL.WALL;
const GATES = [{ x: 111, y0: 37, y1: 40, ph: 0 }, { x: 116, y0: 37, y1: 40, ph: 0.5 }, { x: 111, y0: 32, y1: 35, ph: 0.25 }, { x: 106, y0: 32, y1: 35, ph: 0.75 }, { x: 112, y0: 27, y1: 30, ph: 0.4 }, { x: 108, y0: 24, y1: 25, ph: 0.1 }];
for (const g of GATES) for (let y = g.y0; y <= g.y1; y++) G[gi(g.x, y)] = TL.GATE;
// ---- 방 모서리 깎기 (네모 상자 탈피)
for (const [x0, y0, x1, y1] of [[80, 14, 83, 16], [95, 4, 98, 5], [46, 38, 48, 40], [80, 24, 82, 26], [96, 37, 98, 40], [46, 48, 48, 50], [4, 14, 6, 16], [30, 4, 32, 6]]) for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) G[gi(x, y)] = TL.WALL;
// ---- KAERI pool
for (let y = 51; y <= 59; y++) for (let x = 83; x <= 95; x++) if (!(x >= 88 && x <= 90 && y >= 54 && y <= 56)) G[gi(x, y)] = TL.WATER;
// ---- KIMM conveyors (direction per row)
const CONV = {}; // gi -> dx  (2줄짜리 벨트 4묶음, 사이사이 안전 줄)
for (const [y0, dir] of [[50, 1], [53, -1], [56, 1], [59, -1]]) for (let y = y0; y <= y0 + 1; y++) for (let x = 105; x <= 118; x++) { G[gi(x, y)] = TL.CONV; CONV[gi(x, y)] = dir; }
// ---- room decor
// KARI 발사 시험장
D('pad', 5, 5, 7, 7, true, { room: 'kari' }); D('gantry', 12, 5, 2, 6, true); D('fueltank', 20, 13, 2, 3, true); D('fueltank', 17, 13, 2, 3, true);
D('range', 15, 5, 7, 4, false); D('booth', 15, 10, 3, 2, true, { label: '사격대' });
// KASI 천문 관측실
D('dome', 35, 5, 9, 8, true); D('desk', 31, 14, 3, 1, true, { label: '관측 기록' }); D('orrery', 45, 5, 3, 3, true); D('starmap', 45, 12, 3, 2, true);
// KRISS 표준 측정실
D('atomclock', 56, 4, 3, 3, true); D('emitter', 55, 11, 1, 1, true); D('sensor', 68, 15, 1, 1, true);
D('mirror', 61, 11, 1, 1, true, { id: 'm1', st: 0 }); D('mirror', 61, 6, 1, 1, true, { id: 'm2', st: 0 }); D('mirror', 68, 6, 1, 1, true, { id: 'm3', st: 1 }); D('mirror', 58, 11, 1, 1, true, { id: 'm4', st: 1 }); D('mirror', 61, 8, 1, 1, true, { id: 'm5', st: 0 });
D('kgstd', 71, 12, 2, 2, true, { label: '질량 표준' }); D('bench', 56, 14, 3, 1, true); D('bench', 70, 8, 3, 1, true);
// KISTI 슈퍼컴퓨터실
for (const y of [6, 9, 12]) { D('racks', 81, y, 7, 1, true); D('racks', 92, y, 6, 1, true); }
D('console', 88, 4, 3, 1, true, { label: '슈퍼컴 콘솔' }); D('cooler', 96, 14, 2, 2, true);
// ETRI 통신 안테나실
[106, 108.6, 111.2, 113.8, 116.4].forEach((x, i) => D('dish', x, 5.5, 2, 2, true, { i }));
D('panel', 110, 12, 3, 1, true, { label: '안테나 제어' }); D('router', 105, 14, 2, 2, true); D('router', 115, 12, 2, 2, true);
// KIGAM 지질 표본창고
D('strata', 4, 24, 9, 1, true); D('strata', 15, 24, 8, 1, true); D('cores', 5, 26, 2, 3, true); D('cores', 20, 26, 2, 3, true); D('minecart', 19, 38, 2, 2, true);
for (const [x, y] of [[13, 32], [10, 33], [16, 35]]) D('pillar', x, y, 1, 1, true);
D('reset', 21, 34, 1, 1, true, { id: 'reset', label: '원위치' });
for (const [x, y] of [[4, 34], [5, 34], [6, 34], [7, 34], [9, 34], [10, 34], [11, 34], [12, 34], [7, 35], [7, 36], [9, 35], [9, 36], [12, 35], [12, 36], [12, 37], [12, 38], [12, 39], [12, 40], [4, 27], [7, 27], [8, 27], [9, 27], [11, 27], [12, 27], [12, 28], [12, 29], [12, 30], [12, 31], [12, 32], [12, 33], [7, 31], [9, 30]]) D('rock', x, y, 1, 1, true);
D('toolbox', 5, 38, 2, 2, true, { id: 'toolbox', label: '공구함' });
// KERI 전력 제어실
D('tesla', 32, 26, 3, 3, true); D('xfmr', 44, 26, 3, 3, true); D('xfmr', 44, 33, 3, 3, true); D('breaker', 34, 24, 3, 1, true, { label: '주 차단기' });
D('cabletray', 31, 31, 10, 1, false); D('hvfence', 43, 30, 1, 8, false);
// LOBBY
D('kstatue', 56, 36, 2, 2, true); D('reception', 66, 37, 5, 1, true, { label: '안내' }); D('plantbig', 55, 24, 1, 1, true); D('plantbig', 72, 24, 1, 1, true); D('plantbig', 72, 39, 1, 1, true);
D('board', 70, 26, 3, 1, true, { label: '안내판' }); D('rug', 59, 34, 11, 6, false); D('column', 56, 33, 1, 1, true); D('column', 72, 33, 1, 1, true); D('column', 56, 25, 1, 1, true); D('sofa', 56, 28, 2, 3, true);
// CTRL 통합 관제실
D('monwall', 60, 27, 9, 1, true); D('chair2', 61, 30, 1, 1, true); D('chair2', 67, 30, 1, 1, true);
// KFE 핵융합 실험동
D('tokamak', 84, 26, 10, 10, true); D('ctrldesk', 81, 37, 4, 1, true, { label: '플라즈마 진단' }); D('magnet', 96, 25, 2, 2, true); D('magnet', 96, 29, 2, 2, true);
// NSR — 벽은 위에서
D('server2', 105, 24, 1, 1, true, { id: 'orderbox', label: '보안 금고' });
// KRIBB 바이오 온실
for (const y of [50, 53]) D('bed', 5, y, 8, 1, true); D('dna', 19, 49, 2, 3, true); D('glasswall', 15, 55, 1, 3, true); D('glasswall', 15, 60, 1, 2, true); D('glasswall', 16, 55, 7, 1, true);
D('glassdoor', 15, 58, 1, 2, true, { id: 'gdoor' });
// WIKIM 김치 발효고
for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) D('jar', 33 + c * 3.4, 51.5 + r * 3.3, 1.4, 1.4, true, { id: 'jar' + (r * 4 + c), jr: r, jc: c });
D('poster', 30, 48, 3, 1, true, { label: '숙성 일지' }); D('salt', 46, 59, 2, 2, true);
// KRICT 화학 플랜트
D('tank', 56, 49, 3, 3, true, { col: '#4FB0A9' }); D('tank', 70, 49, 3, 3, true, { col: '#E8A33A' }); D('pipes', 59, 50, 11, 1, false); D('pipes', 64, 51, 1, 6, false, { vert: true });
D('pipepanel', 61, 56, 3, 1, true, { label: '배관 제어' }); D('valve', 66, 56, 1, 1, true); D('drums', 56, 59, 2, 2, true); D('drums', 71, 59, 2, 2, true);
// KAERI 연구로 수조
D('rails', 82, 50, 15, 1, false); D('core', 88, 54, 3, 3, false); D('radsign', 81, 49, 1, 1, true); D('radsign', 97, 49, 1, 1, true); D('cooling', 81, 60, 2, 2, true);
// KIMM 로봇 공장
for (const [x, y] of [[109, 50], [114, 51], [107, 53], [112, 54], [117, 53], [110, 56], [115, 57], [108, 59], [113, 60], [106, 51]]) D('robotarm', x, y, 1, 1, true);
D('fusebox', 117, 61, 1, 1, true, { label: '퓨즈함' }); D('crates', 105, 61, 2, 1, true);
// KRRI 철도 시험선
D('station', 109, 70, 8, 2, true, { label: '화물역' }); D('signal', 7, 70, 2, 1, true, { label: '출발 신호' });
D('cage', 58, 79, 5, 1, false, { label: '격리실' });
// 선로: 위 y73, 아래 y77, 분기 x30/60/90 · 장애 구간
const TRACK = { up: 73, lo: 77, x0: 6, x1: 116, sw: [30, 60, 90], block: [{ tr: 'up', x0: 34, x1: 56 }, { tr: 'lo', x0: 64, x1: 86 }, { tr: 'lo', x0: 96, x1: 108 }] };
TRACK.sw.forEach((x, i) => D('lever', x - 1, 71, 1, 1, true, { id: 'lev' + i, i, st: 0 }));
for (const b of TRACK.block) D('rockfall', b.x0, TRACK[b.tr] - 1, b.x1 - b.x0 + 1, 2, false);
D('board2', 10, 79, 4, 1, true, { label: '운행 안내' });
[16, 22, 31, 40, 48, 66, 75, 84, 94, 101].forEach((x, k) => D('container', x, 79, 3, 2, true, { c: ['#2E86D6', '#E0533F', '#F2A23A', '#2FA84F', '#7C5CE0'][k % 5] }));
[[38, 70], [46, 70], [70, 70], [78, 70], [98, 70]].forEach(([x, y], k) => D('container', x, y, 3, 2, true, { c: ['#F2A23A', '#2FA84F', '#7C5CE0', '#2E86D6', '#E0533F'][k % 5] }));
// KRIBB 압력판
const PLATES = [[6, 60], [12, 57]];
// helpers
const SOLID = new Uint8Array(MW * MH);
function bakeSolids() {
  SOLID.fill(0);
  for (const d of DEC) if (d.solid && !d.off) for (let y = Math.floor(d.y); y < Math.ceil(d.y + d.h); y++) for (let x = Math.floor(d.x); x < Math.ceil(d.x + d.w); x++) if (x >= 0 && y >= 0 && x < MW && y < MH) SOLID[gi(x, y)] = 1;
}
bakeSolids();
function decorById(id) { return DEC.find(d => d.id === id); }
