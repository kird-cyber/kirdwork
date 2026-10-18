// Beam search over "rope moves" to prove the course can be finished with the default feel.
// A move = face, aim, shoot, swing (+ reel), release, fall a bit. Writes tests/out/solution.json (input RLE) when it finishes.
const fs = require('fs'), path = require('path');
const code = ['config.js', 'core.js', 'mapgen.js', 'sim.js', 'weapons.js'].map(f => fs.readFileSync(path.join(__dirname, '../src', f), 'utf8')).join('\n');
const A = new Function(code + '\n;return {ROPE_DEFAULT,IN,createCourse,createRun,stepRun,runHash,rleAppend,rleAt,hitAt};')();
const I = A.IN, map = A.createCourse();
const BEAM = +(process.argv[2] || 24), MAXD = +(process.argv[3] || 80);
const clone = r => Object.assign({}, r, { anchors: r.anchors.map(a => Object.assign({}, a)), shot: r.shot ? Object.assign({}, r.shot) : null, events: [], respawn: Object.assign({}, r.respawn) });
function play(r, plan, log) {
  for (const [bits, n] of plan) for (let i = 0; i < n; i++) {
    A.stepRun(r, bits); log.push(bits); r.events.length = 0;
    if (r.dead > 0) return false;
    if (r.done) return true;
  }
  return true;
}
function moves(r) {
  const out = [];
  const face = [I.L, I.R];
  if (r.state === 'rope') { // already hanging (shouldn't happen at move start) -> release
    out.push([[I.FIRE, 1], [0, 30]]); return out;
  }
  for (const f of face) for (const aim of [20, 40, 60, 80]) {
    const fdir = f === I.R ? 1 : -1;
    const delta = aim * 10 - r.aim, aimBits = delta > 0 ? I.U : I.D, aimTicks = Math.ceil(Math.abs(delta) / 8);
    for (const sw of [f, f === I.L ? I.R : I.L]) for (const t1 of [45, 110]) for (const reel of [0, 45]) for (const t3 of [12, 45]) {
      out.push([[f, 1], [aimBits, aimTicks], [I.FIRE, 1], [0, 2], [sw, t1], [sw | I.U, reel], [I.FIRE, 1], [0, t3]]);
    }
  }
  if (r.state === 'ground') { for (const f of face) { out.push([[f, 50]]); out.push([[f, 1], [I.JUMP, 1], [0, 40]]); } }
  else out.push([[0, 25]]);
  return out;
}
function score(r) {
  const c = map.course[Math.min(r.cp, map.course.length - 1)];
  const dx = c.x - r.x, dy = c.y - r.y;
  return r.cp * 100000 - Math.sqrt(dx * dx + dy * dy) - r.tick * 0.05 + (r.done ? 1e7 : 0);
}
let beam = [{ r: A.createRun(map), log: [] }];
const t0 = Date.now();
for (let depth = 0; depth < MAXD; depth++) {
  const cand = new Map();
  for (const b of beam) for (const mv of moves(b.r)) {
    const r = clone(b.r), log = b.log.slice();
    if (!play(r, mv, log)) continue;
    // let it settle a little if still on a rope (moves end released, but a missed shot may leave it falling)
    const key = `${r.cp}:${Math.round(r.x / 24)}:${Math.round(r.y / 24)}:${r.state}`;
    const s = score(r), prev = cand.get(key);
    if (!prev || prev.s < s) cand.set(key, { r, log, s });
  }
  beam = [...cand.values()].sort((a, b) => b.s - a.s).slice(0, BEAM);
  const top = beam[0];
  console.log(`depth ${depth} cp ${top.r.cp}/${map.course.length} pos ${Math.round(top.r.x)},${Math.round(top.r.y)} t=${(top.r.tick / 120).toFixed(1)}s cands ${cand.size} ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  if (top.r.done) {
    const rle = []; for (const b of top.log) A.rleAppend(rle, b);
    // verify by replay
    const v = A.createRun(map); const cur = { i: 0, n: 0 }; let x; while ((x = A.rleAt(rle, cur)) >= 0) A.stepRun(v, x);
    console.log('SOLVED in', ((v.finishTick - v.startTick) / 120).toFixed(2), 's, ropes', v.ropes, 'replay done:', v.done);
    fs.mkdirSync(path.join(__dirname, 'out'), { recursive: true });
    fs.writeFileSync(path.join(__dirname, 'out', 'solution.json'), JSON.stringify({ time: (v.finishTick - v.startTick) / 120, ropes: v.ropes, rle }));
    process.exit(v.done ? 0 : 1);
  }
  if (!beam.length) { console.log('beam died'); process.exit(1); }
}
console.log('not solved within depth'); process.exit(1);
