// 주제 맵 지형 점검 (2026-11): 벽·낑김·숨는 구멍이 없는지.
// 맵마다: ① 어느 세로줄에도 땅 밑 빈 공간(테이블·다리 밑) 없음 ② 경사 0.55 이하 ③ 가장 깊은 골도 양옆 봉우리보다 250px 이상 낮지 않음
// ④ 모든 탱크 종류가 왼쪽 끝 → 오른쪽 끝, 다시 왼쪽 끝까지 막힘 없이 달림 ⑤ 8명 배치 자리가 모두 땅 위(땅속·허공 아님)
// run: node tests/terrain_check.js
const fs = require('fs'), path = require('path');
const code = ['config.js', 'core.js', 'mapgen.js', 'sim.js', 'controller.js'].map(f => fs.readFileSync(path.join(__dirname, '../src', f), 'utf8')).join('\n');
const A = new Function(code + '\n;return {CONFIG,createMatch,step,cmdMove,TMAP_K};')();
const { CONFIG } = A, maps = Object.keys(A.TMAP_K);
let pass = 0, fail = 0; const ok = (c, msg) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + msg); };
for (const id of maps) {
  const tk = Object.keys(CONFIG.tanks), pl = []; for (let i = 0; i < 8; i++) pl.push({ id: 'p' + i, nick: 'p', team: i % 2 ? 'blue' : 'red', tankId: tk[i % tk.length] });
  const m = A.createMatch({ seed: 7, mapId: id, players: pl }), W = m.W, H = m.H, mk = m.mask;
  const top = []; let holes = 0;
  for (let x = 0; x < W; x++) { let y = 0; while (y < H && !mk[y * W + x]) y++; top.push(y); for (let q = y; q < H - 4; q++) if (!mk[q * W + x]) { holes++; break; } }
  ok(holes === 0, `${id}: 땅 밑 빈 공간 없음 (${holes}줄)`);
  let slope = 0; for (let x = 0; x + 10 < W; x++) slope = Math.max(slope, Math.abs(top[x + 10] - top[x]) / 10);
  ok(slope <= 0.55, `${id}: 가장 가파른 경사 ${slope.toFixed(2)} (≤ 0.55, 탱크는 0.7까지 오름)`);
  let pit = 0; for (let x = 0; x < W; x += 20) { let l = 1e9, r = 1e9; for (let q = Math.max(0, x - 900); q < x; q++) l = Math.min(l, top[q]); for (let q = x + 1; q < Math.min(W, x + 900); q++) r = Math.min(r, top[q]); if (l < 1e9 && r < 1e9) pit = Math.max(pit, top[x] - Math.max(l, r)); }
  ok(pit <= 250, `${id}: 가장 깊은 골 ${pit}px (≤ 250)`);
  let g = 0; while (m.phase !== 'aim' && g++ < 30000) A.step(m);
  const bad = m.tanks.filter(t => Math.abs(t.y - top[Math.round(t.x)]) > 3);
  ok(!bad.length, `${id}: 8명 시작 자리 모두 땅 위 (${bad.map(t => t.x | 0).join(',') || '이상 없음'})`);
  for (const tankId of tk) {
    const t = m.tanks[m.cur]; t.tankId = tankId; t.x = 30; t.y = top[30]; t.fuel = 1e9;
    let n = 0; while (t.x < W - 30 && n++ < 40000) { if (!A.cmdMove(m, 1)) break; }
    const right = t.x >= W - 31; n = 0; while (t.x > 30 && n++ < 40000) { if (!A.cmdMove(m, -1)) break; }
    ok(right && t.x <= 31, `${id}: ${CONFIG.tanks[tankId].name} 끝에서 끝까지 왕복 (오른쪽 ${right ? '도착' : '막힘 x=' + (t.x | 0)}, 왼쪽 ${t.x <= 31 ? '도착' : '막힘 x=' + (t.x | 0)})`);
  }
}
console.log(`${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
