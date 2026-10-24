// ================================================================ 홍보관 전시물 배치
const DEC = [];
function D(t, x, y, w, h, solid, o) { const d = Object.assign({ t, x, y, w: w || 1, h: h || 1, solid: solid !== false }, o || {}); DEC.push(d); return d; }
// 월드 엔진과 맞추기 위한 빈 구조
const GATES = [], CONV = {}, PLATES = [];
const TRACK = { up: 0, lo: 0, x0: 0, x1: 0, sw: [], block: [] };
// ---- 로비
D('mediawall', 28, 30, 16, 1, true, { id: 'v_intro' });
D('mascots', 33, 34, 6, 4, true, { id: 'mascot' });
D('infodesk', 27, 43, 5, 1, true, { id: 'info' });
D('photo', 40, 40, 5, 1, true, { id: 'photo' }); D('photomark', 41, 42, 3, 2, false);
D('stampboard', 26, 33, 2, 3, true, { id: 'board' });
D('guestbook', 44, 34, 1, 2, true, { id: 'guest' });
for (const [x, y] of [[26, 44], [45, 44], [45, 31]]) D('plantbig', x, y, 1, 1, true);
// ---- 1관 KIRD 이야기 (연혁 길)
D('timeline', 5, 38, 17, 1, false);
['2007', '2013', '2014', '2015', '2019', '2022'].forEach((yr, i) => D('milestone', 5 + i * 3, 39, 1, 1, true, { id: 'ms' + i, yr }));
D('frame', 4, 30, 4, 1, true, { id: 'ci', label: 'CI 이야기', c: '#2E86D6' });
D('frame', 16, 30, 4, 1, true, { id: 'mission', label: '설립 목적', c: '#8CC63F' });
D('frameV', 4, 33, 1, 3, true, { id: 'talent', label: '인재상', c: '#F2A23A' });
D('bench', 9, 43, 3, 1, true); D('stamp', 20, 43, 1, 1, true, { id: 'st_h1', hall: 'h1' });
// ---- 2관 숫자로 보는 KIRD (레고 탑)
[['t_course', 51, 33], ['t_grad', 55, 33], ['t_member', 59, 33], ['t_field', 63, 33], ['t_comp', 52, 40]].forEach(([id, x, y]) => D('tower', x, y, 2, 2, true, { id }));
D('bricktable', 61, 41, 4, 2, true, { id: 'bricks' });
D('stamp', 66, 44, 1, 1, true, { id: 'st_h2', hall: 'h2' });
// ---- 3관 커리어 충전소
D('stage', 6, 18, 4, 4, false, { id: 'stg0', lv: 0 }); D('stage', 11, 13, 4, 4, false, { id: 'stg1', lv: 1 }); D('stage', 16, 8, 4, 4, false, { id: 'stg2', lv: 2 });
D('charger', 5, 8, 2, 2, true, { id: 'charger' });
D('frame', 8, 6, 6, 1, true, { id: 'kclub', label: '2050 비전 · K-클럽', c: '#2FA84F' });
D('stamp', 20, 24, 1, 1, true, { id: 'st_h3', hall: 'h3' });
// ---- 4관 국가전략기술
[['ai', 27, 8], ['semi', 32, 8], ['cyber', 37, 8], ['space', 42, 8], ['quantum', 29, 15], ['ocean', 35, 15], ['nuclear', 41, 15]].forEach(([k, x, y]) => D('pod', x, y, 3, 3, true, { id: 'pod_' + k, k }));
D('flowboard', 28, 22, 6, 1, true, { id: 'strategy' });
D('stamp', 43, 23, 1, 1, true, { id: 'st_h4', hall: 'h4' });
// ---- 5관 청년·글로벌
[50, 53.5, 57, 60.5, 64].forEach((x, i) => D('poster3', x, 6, 3, 1, true, { id: 'aw' + i, i }));
D('globe', 55, 13, 4, 4, true, { id: 'globe' });
D('podium', 61, 19, 4, 2, true, { id: 'chair' });
D('stamp', 51, 24, 1, 1, true, { id: 'st_h5', hall: 'h5' });
const SOLID = new Uint8Array(MW * MH);
function bakeSolids() { SOLID.fill(0); for (const d of DEC) if (d.solid && !d.off) for (let y = Math.floor(d.y); y < Math.ceil(d.y + d.h); y++) for (let x = Math.floor(d.x); x < Math.ceil(d.x + d.w); x++) if (x >= 0 && y >= 0 && x < MW && y < MH) SOLID[gi(x, y)] = 1; }
bakeSolids();
function decorById(id) { return DEC.find(d => d.id === id); }
