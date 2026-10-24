// ================================================================ KIRD 홍보관 — 6개 전시실이 고리처럼 이어진 미술관형 공간
const T = 48, MW = 72, MH = 50;
const OL = '#0E2238';
const TL = { WALL: 0, FLOOR: 1, DOOR: 2, WATER: 3, CONV: 4, GATE: 5, HOLE: 6, VOID: 9 };
const ROOMS = [
 { id: 'lobby', n: '로비 · 만남의 광장', inst: 'KIRD 홍보관', s: 'LOBBY', r: [26, 30, 45, 45], fl: 'hallLobby', c: '#2E86D6' },
 { id: 'h1', n: 'KIRD 이야기', inst: '1관', s: '1관', r: [4, 30, 22, 45], fl: 'parquet', c: '#1F6FB2' },
 { id: 'h2', n: '숫자로 보는 KIRD', inst: '2관', s: '2관', r: [49, 30, 67, 45], fl: 'gallery', c: '#F2A23A' },
 { id: 'h3', n: '커리어 충전소', inst: '3관', s: '3관', r: [4, 6, 22, 26], fl: 'carpetG', c: '#2FA84F' },
 { id: 'h4', n: '국가전략기술 교육', inst: '4관', s: '4관', r: [26, 6, 45, 26], fl: 'tech', c: '#7C5CE0' },
 { id: 'h5', n: '청년·글로벌 인재', inst: '5관', s: '5관', r: [49, 6, 67, 26], fl: 'parquetW', c: '#E0533F' },
];
const FLAVOR = { lobby: '마스코트와 인사하고 스탬프 랠리를 시작하세요', h1: '2007년 설립부터 알파캠퍼스까지', h2: '레고 블록으로 쌓은 KIRD의 숫자들', h3: '신진 → 중견 → 리더, 평생 현역 과학기술인', h4: 'AI·반도체·우주·양자… 7대 전략기술', h5: '리얼챌린지 · 외국인 연구자 · 석좌교수' };
const RID = {}; ROOMS.forEach((r, i) => { RID[r.id] = i; r.idx = i; });
const CORR = [];
const DOORS = [
 ['h1', 23, 36, 25, 38, null], ['h2', 46, 36, 48, 38, null], ['h4', 34, 27, 37, 29, null],
 ['h3', 12, 27, 14, 29, null], ['h4', 23, 15, 25, 17, null], ['h5', 46, 15, 48, 17, null], ['h5', 57, 27, 59, 29, null],
];
const VENTS = [];
const G = new Uint8Array(MW * MH), GR = new Int8Array(MW * MH).fill(-1);
const gi = (x, y) => y * MW + x;
function carve(x0, y0, x1, y1, t, rid) { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { G[gi(x, y)] = t; if (rid !== undefined) GR[gi(x, y)] = rid; } }
for (const r of ROOMS) carve(r.r[0], r.r[1], r.r[2], r.r[3], TL.FLOOR, r.idx);
const DOORLIST = DOORS.map(([rid, x0, y0, x1, y1, lock], k) => { const d = { k, room: rid, x0, y0, x1, y1, lock, open: true }; carve(x0, y0, x1, y1, TL.DOOR, RID[rid]); return d; });
for (const d of DOORLIST) d.vert = G[gi(d.x0, d.y0 - 1)] !== TL.WALL && G[gi(d.x0, d.y1 + 1)] !== TL.WALL;
function doorAt(x, y) { for (const d of DOORLIST) if (x >= d.x0 && x <= d.x1 && y >= d.y0 && y <= d.y1) return d; return null; }
function roomAt(x, y) { const v = GR[gi(Math.floor(x), Math.floor(y))]; return v >= 0 ? ROOMS[v] : null; }
function roomCenter(id) { const r = ROOMS[RID[id]].r; return [(r[0] + r[2] + 1) / 2, (r[1] + r[3] + 1) / 2]; }
