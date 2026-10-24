// ================================================================ 홍보관 전시물 배치
const DEC = [];
function D(t, x, y, w, h, solid, o) { const d = Object.assign({ t, x, y, w: w || 1, h: h || 1, solid: solid !== false }, o || {}); DEC.push(d); return d; }
// 월드 엔진과 맞추기 위한 빈 구조
const GATES = [], CONV = {}, PLATES = [];
const TRACK = { up: 0, lo: 0, x0: 0, x1: 0, sw: [], block: [] };
const MILEYRS = ['2007', '2010', '2013', '2014', '2015', '2019', '2021', '2022', '2023', '2025'];
// ---- 로비
D('mediawall', 28, 30, 16, 1, true, { id: 'v_intro' });
D('mascots', 33, 34, 6, 4, true, { id: 'mascot' });
D('infodesk', 27, 43, 5, 1, true, { id: 'info' });
D('photo', 40, 40, 5, 1, true, { id: 'photo' }); D('photomark', 41, 42, 3, 2, false);
D('stampboard', 26, 33, 2, 3, true, { id: 'board' });
D('guestbook', 44, 34, 1, 2, true, { id: 'guest' });
for (const [x, y] of [[26, 44], [45, 44], [45, 31]]) D('plantbig', x, y, 1, 1, true);
// ---- 1관 KIRD 이야기 (연혁 길 2줄)
D('timeline', 5, 35, 17, 1, false); D('timeline', 5, 39, 17, 1, false);
MILEYRS.forEach((yr, i) => D('milestone', 6 + (i % 5) * 3, i < 5 ? 36 : 40, 1, 1, true, { id: 'ms' + i, yr }));
D('frame', 4, 30, 4, 1, true, { id: 'ci', label: 'CI 이야기', c: '#2E86D6' });
D('frame', 10, 30, 5, 1, true, { id: 'mission', label: '미션 · 비전', c: '#8CC63F' });
D('frame', 17, 30, 5, 1, true, { id: 'org', label: '조직 · 예산', c: '#7C5CE0' });
D('frameV', 4, 32, 1, 3, true, { id: 'talent', label: '인재상', c: '#F2A23A' });
D('bench', 9, 43, 3, 1, true); D('stamp', 20, 43, 1, 1, true, { id: 'st_h1', hall: 'h1' });
// ---- 2관 숫자로 보는 KIRD 2025 (레고 탑)
[['t_grad', 51, 33], ['t_course', 55, 33], ['t_member', 59, 33], ['t_kclub', 63, 33], ['t_sat', 51, 39], ['t_comp', 55, 39], ['t_field', 59, 39], ['t_who', 63, 39]].forEach(([id, x, y]) => D('tower', x, y, 2, 2, true, { id }));
D('bricktable', 50, 43, 4, 2, true, { id: 'bricks' });
D('stamp', 66, 44, 1, 1, true, { id: 'st_h2', hall: 'h2' });
// ---- 3관 커리어 충전소 K-클럽
D('stage', 6, 18, 4, 4, false, { id: 'stg0', lv: 0 }); D('stage', 11, 13, 4, 4, false, { id: 'stg1', lv: 1 }); D('stage', 16, 8, 4, 4, false, { id: 'stg2', lv: 2 });
D('charger', 5, 8, 2, 2, true, { id: 'charger' });
D('frame', 8, 6, 6, 1, true, { id: 'kclub', label: 'K-클럽 플랫폼', c: '#2FA84F' });
D('journey', 15, 22, 5, 1, true, { id: 'journey' });
D('frameV', 4, 11, 1, 4, true, { id: 'social', label: '소셜러닝', c: '#0EA5A4' });
D('stamp', 20, 24, 1, 1, true, { id: 'st_h3', hall: 'h3' });
// ---- 4관 AI·전략기술 교육
[['ai', 27, 8], ['semi', 32, 8], ['cyber', 37, 8], ['space', 42, 8], ['quantum', 29, 15], ['bio', 35, 15], ['ocean', 41, 15]].forEach(([k, x, y]) => D('pod', x, y, 3, 3, true, { id: 'pod_' + k, k }));
D('flowboard', 27, 22, 5, 1, true, { id: 'strategy' });
D('aitutor', 33, 22, 4, 1, true, { id: 'aitutor' });
D('badge', 38, 22, 3, 1, true, { id: 'badge' });
D('stamp', 43, 23, 1, 1, true, { id: 'st_h4', hall: 'h4' });
// ---- 5관 청년·글로벌
[50, 53.5, 57, 60.5, 64].forEach((x, i) => D('poster3', x, 6, 3, 1, true, { id: 'aw' + i, i }));
D('globe', 55, 12, 4, 4, true, { id: 'globe' });
D('worldmap', 61, 11, 5, 3, true, { id: 'abroad' });
D('frameV', 49, 8, 1, 3, true, { id: 'inclusive', label: '포용성장', c: '#F08BB4' });
D('podium', 61, 19, 4, 2, true, { id: 'chair' });
D('frame', 53, 19, 5, 1, true, { id: 'youth', label: '청년 경력 여정', c: '#8CC63F' });
D('stamp', 51, 24, 1, 1, true, { id: 'st_h5', hall: 'h5' });
// ---- 6관 미래비전 2050
D('visionwall', 28, 62, 16, 1, true, { id: 'vision' });
[0, 1, 2, 3, 4].forEach(i => D('rolepod', 27 + i * 4, 51, 3, 3, true, { id: 'role' + i, i }));
D('values', 27, 57, 5, 2, true, { id: 'values' });
D('rrboard', 34, 57, 5, 2, true, { id: 'rr' });
D('screen', 40, 57, 4, 2, true, { id: 'v_vision', label: '미래비전 2050 영상' });
D('stamp', 44, 61, 1, 1, true, { id: 'st_h6', hall: 'h6' });
for (const [x, y] of [[26, 61], [45, 50]]) D('plantbig', x, y, 1, 1, true);
// ---- 7관 2025 도전성과 7선
[0, 1, 2, 3, 4, 5, 6].forEach(i => D('trophy', i < 4 ? 50 + i * 4.3 : 52.2 + (i - 4) * 4.3, i < 4 ? 51 : 56, 2, 2, true, { id: 'feat' + i, i }));
D('frame', 50, 60, 6, 1, true, { id: 'results', label: '주요성과 모아보기', c: '#C99A1E' });
D('stamp', 66, 61, 1, 1, true, { id: 'st_h7', hall: 'h7' });
// ---- 8관 홍보 스튜디오
D('cardrack', 5, 49, 7, 1, true, { id: 'cards' });
D('screen', 16, 49, 5, 2, true, { id: 'v_talk', label: '토크 영상 2편' });
D('newsstand', 5, 55, 3, 3, true, { id: 'news' });
D('applydesk', 12, 59, 6, 1, true, { id: 'apply' });
D('frameV', 22, 50, 1, 3, true, { id: 'wbl', label: '일하는 방식', c: '#0EA5A4' });
D('stamp', 21, 61, 1, 1, true, { id: 'st_h8', hall: 'h8' });
D('bench', 11, 54, 3, 1, true); D('bench', 15, 54, 3, 1, true); for (const [x, y] of [[4, 61], [22, 62], [13, 52]]) D('plantbig', x, y, 1, 1, true);
const SOLID = new Uint8Array(MW * MH);
function bakeSolids() { SOLID.fill(0); for (const d of DEC) if (d.solid && !d.off) for (let y = Math.floor(d.y); y < Math.ceil(d.y + d.h); y++) for (let x = Math.floor(d.x); x < Math.ceil(d.x + d.w); x++) if (x >= 0 && y >= 0 && x < MW && y < MH) SOLID[gi(x, y)] = 1; }
bakeSolids();
function decorById(id) { return DEC.find(d => d.id === id); }
