// Rope sim checks: course builds, rope attaches/swings/wraps, replay of the same inputs is identical.
const fs = require('fs'), path = require('path');
const code = ['config.js', 'core.js', 'mapgen.js', 'sim.js', 'weapons.js'].map(f => fs.readFileSync(path.join(__dirname, '../src', f), 'utf8')).join('\n');
const A = new Function(code + '\n;return {ROPE_DEFAULT,ROPE_PRESETS,IN,createCourse,createRun,stepRun,runHash,rleAppend,rleAt,courseSolid,hitAt,TICK,WEAPONS};')();
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
// ---- target practice / weapons
{
  const mk = () => { const mp = A.createCourse(); return A.createRun(mp, {}, 'target'); };
  const r0 = mk();
  ok(r0.targets.length === 12 && r0.targets.every(t => !A.hitAt(r0.map, t.x, t.y - 6)), `12 targets placed in free space (${r0.targets.map(t => Math.round(t.y)).join(',')})`);
  ok(r0.targets.every(t => t.y < r0.map.waterY), 'targets are above the sea');
  // every weapon fires from the start and nothing breaks
  for (let wi = 0; wi < A.WEAPONS.length; wi++) {
    const r = mk(), w = A.WEAPONS[wi], I = A.IN; let evs = [];
    const solidBefore = r.map.mask.reduce((a, b) => a + b, 0);
    A.stepRun(r, 0, { w: wi, aim: w.kind === 'power' ? -450 : 300, face: 1, tx: 600 });
    const hold = w.kind === 'power' ? 90 : 1;
    for (let t = 0; t < hold; t++) { A.stepRun(r, I.ATK); evs.push(...r.events); r.events.length = 0; }
    for (let t = 0; t < 120 * 7; t++) { A.stepRun(r, 0); evs.push(...r.events); r.events.length = 0; if (!isFinite(r.x)) break; }
    const booms = evs.filter(e => e.type === 'boom').length, solidAfter = r.map.mask.reduce((a, b) => a + b, 0);
    const okW = w.kind === 'melee' ? evs.some(e => e.type === 'swing') : booms > 0 && solidAfter < solidBefore;
    ok(okW && isFinite(r.x), `${w.name}: ${w.kind === 'melee' ? 'swing' : booms + ' explosion(s), carved ' + (solidBefore - solidAfter) + 'px'}`);
  }
  // a bazooka shell flying into a dummy explodes on it and hurts / throws it
  { const r = mk(), t = r.targets[5]; r.projs.push({ k: 'bazooka', x: t.x - 34, y: t.y - 6, vx: 1000, vy: 0, fuse: -1, age: 0 }); let hit = 0;
    for (let k = 0; k < 200; k++) { A.stepRun(r, 0); for (const e of r.events) if (e.type === 'hit') hit++; r.events.length = 0; }
    ok(hit > 0 && (t.hp < 100 || !t.alive), `bazooka shell hits a dummy (hp ${t.hp}, alive ${t.alive})`); }
  // bat knocks a dummy into flight
  { const r = mk(), t = r.targets[0]; r.x = t.x - 20; r.y = t.y; r.state = 'air';
    for (let k = 0; k < 200; k++) { A.stepRun(r, 0); if (r.state === 'ground') break; }
    A.stepRun(r, 0, { w: 7, aim: 300, face: 1 }); A.stepRun(r, A.IN.ATK); A.stepRun(r, 0);
    ok(!t.rest && t.vx > 300, `bat sends the dummy flying (vx ${Math.round(t.vx)})`); }
  // weapons + commands replay identically
  { const plan = []; const r = mk(); let seed = 99; const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    for (let t = 0; t < 120 * 30; t++) { let bits = 0, cmd = null; if (t % 15 === 0) { if (rnd() < 0.4) bits |= A.IN.ATK; if (rnd() < 0.3) bits |= rnd() < 0.5 ? A.IN.L : A.IN.R; if (rnd() < 0.1) bits |= A.IN.FIRE; } if (t % 240 === 0) cmd = { w: Math.floor(rnd() * 8), aim: Math.floor(rnd() * 1200) - 300, face: rnd() < 0.5 ? 1 : -1, tx: 400 + Math.floor(rnd() * 2000), fuse: 1 + Math.floor(rnd() * 5) }; plan.push([bits, cmd]); A.stepRun(r, bits, cmd); r.events.length = 0; }
    const r2 = mk(); for (const [b, c] of plan) { A.stepRun(r2, b, c); r2.events.length = 0; }
    const sum = rr => rr.targets.map(t => `${t.alive}${Math.round(t.x * 100)}`).join() + rr.map.mask.reduce((a, b, i) => (a + b * (i % 9973)) % 1000000007, 0);
    ok(A.runHash(r) === A.runHash(r2) && sum(r) === sum(r2), `weapon session replays identically (kills ${r.kills}, shots ${r.shots})`); }
}
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
