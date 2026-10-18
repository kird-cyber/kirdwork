// Rope sim checks: course builds, rope attaches/swings/wraps, replay of the same inputs is identical.
const fs = require('fs'), path = require('path');
const code = ['config.js', 'core.js', 'mapgen.js', 'sim.js'].map(f => fs.readFileSync(path.join(__dirname, '../src', f), 'utf8')).join('\n');
const A = new Function(code + '\n;return {ROPE_DEFAULT,ROPE_PRESETS,IN,createCourse,createRun,stepRun,runHash,rleAppend,rleAt,courseSolid,hitAt,TICK};')();
let pass = 0, fail = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); c ? pass++ : fail++; };
const t0 = Date.now(); const map = A.createCourse(); console.log('map built in', Date.now() - t0, 'ms');
ok(!A.hitAt(map, map.start.x, map.start.y) && A.hitAt(map, map.start.x, map.start.y + 2), `start on the ground (${map.start.x},${map.start.y})`);
for (const c of map.course) ok(!A.hitAt(map, c.x, c.y), `checkpoint ${c.label} is free`);
// scripted run: aim up-right, shoot, swing, release ...
function script(r, plan) { const rle = []; for (const [bits, n] of plan) for (let i = 0; i < n; i++) { A.stepRun(r, bits); A.rleAppend(rle, bits); } return rle; }
const r = A.createRun(map);
const I = A.IN;
const plan = [[I.R, 30], [I.D, 2], [I.FIRE, 1], [0, 60], [I.R, 120], [I.U | I.R, 60], [I.L, 90], [I.R, 90], [I.FIRE, 1], [0, 80], [I.FIRE, 1], [I.R, 200], [I.FIRE, 1], [0, 200]];
let attached = 0, wraps = 0, maxAnch = 0;
const r2 = A.createRun(map); const rle = [];
for (const [bits, n] of plan) for (let i = 0; i < n; i++) { A.stepRun(r2, bits); A.rleAppend(rle, bits); for (const e of r2.events) { if (e.type === 'attach') attached++; if (e.type === 'wrap') wraps++; } r2.events.length = 0; maxAnch = Math.max(maxAnch, r2.anchors.length); }
console.log('end state', r2.state, Math.round(r2.x), Math.round(r2.y), 'ropes', r2.ropes, 'attached', attached, 'wraps', wraps, 'maxSpeed', Math.round(r2.maxSpeed));
ok(attached >= 1, 'rope attaches to rock');
// replay
const r3 = A.createRun(map); const cur = { i: 0, n: 0 }; let b; while ((b = A.rleAt(rle, cur)) >= 0) A.stepRun(r3, b);
ok(A.runHash(r3) === A.runHash(r2), 'replay of the same input gives the same state');
// fuzz: random inputs never leave the worm stuck inside rock, never NaN
let bad = 0, stuck = 0, total = 0, wrapsF = 0, maxA = 0;
for (let s = 1; s <= 40; s++) {
  const rr = A.createRun(map); let seed = s * 7919;
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  let bits = 0;
  for (let t = 0; t < 120 * 40; t++) {
    if (t % 20 === 0) { bits = 0; if (rnd() < 0.5) bits |= rnd() < 0.5 ? I.L : I.R; if (rnd() < 0.4) bits |= rnd() < 0.6 ? I.U : I.D; if (rnd() < 0.12) bits |= I.FIRE; if (rnd() < 0.05) bits |= I.JUMP; }
    A.stepRun(rr, bits); total++;
    for (const e of rr.events) if (e.type === 'wrap') wrapsF++; rr.events.length = 0; maxA = Math.max(maxA, rr.anchors.length);
    if (!isFinite(rr.x) || !isFinite(rr.y)) { bad++; break; }
    if (rr.dead === 0 && A.hitAt(A.createCourse === null ? null : map, rr.x, rr.y) && A.courseSolid(map, rr.x, rr.y)) stuck++;
  }
}
console.log('fuzz ticks', total, 'wraps', wrapsF, 'max anchors', maxA);
ok(bad === 0, 'no NaN positions in 40 random 40-second runs');
ok(stuck === 0, 'worm centre never inside rock (' + stuck + ')');
ok(wrapsF > 0, 'rope wraps around corners in random play');
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
