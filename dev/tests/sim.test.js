// Headless acceptance tests for M1 (run: node tests/sim.test.js)
const fs = require('fs'), path = require('path'), vm = require('vm');
const SRC = path.join(__dirname, '..', 'src');
const code = ['config.js', 'core.js', 'mapgen.js', 'sim.js', 'controller.js'].map(f => fs.readFileSync(path.join(SRC, f), 'utf8')).join('\n');
const ctx = { API: new Function(code + '\n;return {CONFIG,createMatch,createController,step,stateHash,curTank,applyTurnInput,buildMap};')() };
const { CONFIG, createMatch, createController, stateHash, curTank } = ctx.API;

const TANKS = Object.keys(CONFIG.tanks), MAPS = Object.keys(CONFIG.maps);
let failures = 0;
const ok = (cond, msg) => { if (!cond) { failures++; console.log('  FAIL', msg); } };

function makePlayers(rnd, nRed, nBlue) {
  const ps = [];
  for (let i = 0; i < nRed; i++) ps.push({ id: 'r' + i, nick: '레드' + (i + 1), team: 'red', tankId: TANKS[Math.floor(rnd() * TANKS.length)] });
  for (let i = 0; i < nBlue; i++) ps.push({ id: 'b' + i, nick: '블루' + (i + 1), team: 'blue', tankId: TANKS[Math.floor(rnd() * TANKS.length)] });
  return ps;
}
function lcg(seed) { let s = seed >>> 0; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); }

// Plays a live session the way a person would: holding keys over real frames.
function liveSession(seed, mapId, players, fps, maxTurns, botSeed) {
  const m = createMatch({ seed, mapId, players });
  const c = createController(m);
  const rnd = lcg(botSeed);
  let plan = null, planTurn = -1, frames = 0;
  const dt = 1 / fps;
  while (m.phase !== 'over' && m.turnNo <= maxTurns && frames < fps * 60 * 120) {
    frames++;
    const k = c.keys; k.left = k.right = k.up = k.down = k.fire = false;
    if (c.activeLocal()) {
      const t = curTank(m), d = CONFIG.tanks[t.tankId];
      if (planTurn !== m.turnNo) {
        planTurn = m.turnNo;
        const foes = m.tanks.filter(o => o.alive && o.team !== t.team).sort((a, b) => Math.abs(a.x - t.x) - Math.abs(b.x - t.x));
        const toward = foes.length && foes[0].x < t.x ? -1 : 1;
        plan = {
          moveDir: rnd() < 0.3 ? -toward : toward, moveSec: rnd() * 1.2,
          angle: d.angleMin + Math.floor(rnd() * (d.angleMax - d.angleMin + 1)),
          chargeSec: 0.4 + rnd() * 1.6, weapon: rnd() < 0.4 ? 1 : 0,
          item: t.items.length && rnd() < 0.5 ? Math.floor(rnd() * t.items.length) : -1,
          teleX: 300 + rnd() * (m.W - 600), timeout: rnd() < 0.04,
          stage: 'item', t0: 0,
        };
      }
      const p = plan;
      if (p.stage === 'item') {
        if (p.item >= 0) c.useItem(p.item, p.teleX, 0);
        c.selectWeapon(p.weapon); p.stage = 'move'; p.t0 = 0;
      } else if (p.stage === 'move') {
        p.t0 += dt; if (p.moveDir < 0) k.left = true; else k.right = true;
        if (p.t0 >= p.moveSec) { p.stage = 'aim'; }
      } else if (p.stage === 'aim') {
        if (Math.abs(c.aimF - p.angle) > 0.6) { if (c.aimF < p.angle) k.up = true; else k.down = true; }
        else { p.stage = p.timeout ? 'wait' : 'charge'; p.t0 = 0; }
      } else if (p.stage === 'charge') {
        p.t0 += dt; k.fire = p.t0 < p.chargeSec;
      }
    }
    c.frame(dt);
  }
  return { m, c };
}
// Replays a recorded log under a given frame rate.
function replaySession(seed, mapId, players, log, fps) {
  const m = createMatch({ seed, mapId, players });
  const byTurn = {}; for (const i of log) byTurn[i.turnNo] = i;
  const c = createController(m, { replay: byTurn });
  const lastTurn = log.length ? log[log.length - 1].turnNo : 0;
  let frames = 0;
  while (m.phase !== 'over' && frames < fps * 60 * 200) {
    frames++;
    if (m.phase === 'aim' && !byTurn[m.turnNo]) break; // reached the end of the recording
    c.frame(1 / fps);
  }
  return m;
}
function sameHashes(a, b, upto) {
  for (let t = 1; t <= upto; t++) if (a[t] !== b[t]) return t;
  return 0;
}

// ---- Test 1: same seed + same input log at 30 fps and 144 fps -> identical hash every turn
console.log('Test 1 · frame-rate independence');
{
  const players = makePlayers(lcg(7), 2, 2);
  const live = liveSession(12345, 'temple', players, 60, 30, 99);
  const n = live.c.log.length, lastTurn = live.c.log[n - 1].turnNo;
  const r30 = replaySession(12345, 'temple', players, live.c.log, 30);
  const r144 = replaySession(12345, 'temple', players, live.c.log, 144);
  const d30 = sameHashes(live.m.hashes, r30.hashes, lastTurn), d144 = sameHashes(live.m.hashes, r144.hashes, lastTurn);
  console.log(`  live(60fps) turns recorded: ${n}, replay30 mismatch at: ${d30 || 'none'}, replay144 mismatch at: ${d144 || 'none'}`);
  ok(n >= 20, 'recorded at least 20 turns');
  ok(!d30 && !d144, 'hashes match at 30 and 144 fps');
  // also: live sessions themselves at 30 and 144 fps run without error
  for (const fps of [30, 144]) {
    const s = liveSession(777, 'valley', players, fps, 15, 5);
    const rp = replaySession(777, 'valley', players, s.c.log, fps === 30 ? 144 : 30);
    const lt = s.c.log[s.c.log.length - 1].turnNo;
    const mm = sameHashes(s.m.hashes, rp.hashes, lt);
    console.log(`  live ${fps}fps -> replay ${fps === 30 ? 144 : 30}fps: ${s.c.log.length} inputs, mismatch at: ${mm || 'none'}`);
    ok(!mm, `live ${fps} vs replay mismatch`);
  }
}

// ---- Test 2: 50 random turns on each map, no errors, and replay matches
console.log('Test 2 · 50 random turns × 4 maps');
for (const mapId of MAPS) {
  let ran = 0, games = 0, err = null, mism = 0, overs = 0;
  const t0 = Date.now();
  try {
    let seed = 1000 + mapId.length;
    while (ran < 50) {
      games++;
      const rnd = lcg(seed);
      const nR = 1 + Math.floor(rnd() * 4), nB = 1 + Math.floor(rnd() * 4);
      const players = makePlayers(rnd, nR, nB);
      const s = liveSession(seed, mapId, players, 60, 50 - ran, seed * 3);
      const lt = s.c.log.length ? s.c.log[s.c.log.length - 1].turnNo : 0;
      ran += s.c.log.length;
      if (s.m.phase === 'over') overs++;
      const rp = replaySession(seed, mapId, players, s.c.log, 144);
      if (sameHashes(s.m.hashes, rp.hashes, lt)) mism++;
      seed += 17;
    }
  } catch (e) { err = e; }
  console.log(`  ${mapId}: ${ran} turns in ${games} games (${overs} finished), replay mismatches: ${mism}, ${Date.now() - t0} ms${err ? ', ERROR ' + err.stack : ''}`);
  ok(!err, mapId + ' threw');
  ok(mism === 0, mapId + ' replay mismatch');
}

// ---- Test 3: every map has 12 standable spawns spaced for 8 tanks
console.log('Test 3 · spawns');
for (const mapId of MAPS) {
  const mp = ctx.API.buildMap(mapId);
  const gaps = mp.spawns.slice(1).map((x, i) => x - mp.spawns[i]);
  console.log(`  ${mapId}: ${mp.spawns.length} spawns, min gap ${Math.min(...gaps)} px`);
  ok(mp.spawns.length === 12 && Math.min(...gaps) >= 200, mapId + ' spawns');
}

// ---- Test 4: matches played to the end (low HP so they finish), every weapon of every tank fires
console.log('Test 4 · full matches to a result, weapon coverage');
{
  const used = {}; let finished = 0, mism = 0, total = 0, draws = 0;
  for (let g = 0; g < 40; g++) {
    const rnd = lcg(500 + g);
    const players = makePlayers(rnd, 1 + (g % 4), 1 + ((g >> 1) % 4));
    players.forEach((p, i) => { p.tankId = TANKS[(g + i) % TANKS.length]; });
    const orig = createMatch;
    // wrap: shrink HP right after creation so games end quickly
    const live = (function () {
      const m = createMatch({ seed: 900 + g, mapId: MAPS[g % 4], players });
      m.tanks.forEach(t => { t.hp = t.maxhp = 260; });
      return m;
    })();
    // drive with the same bot as liveSession but on this match
    const c = createController(live); const r2 = lcg(g * 7 + 3); let pt = -1, plan = null, frames = 0;
    while (live.phase !== 'over' && frames < 60 * 60 * 60) {
      frames++; const k = c.keys; k.left = k.right = k.up = k.down = k.fire = false;
      if (c.activeLocal()) {
        const t = curTank(live), d = CONFIG.tanks[t.tankId];
        if (pt !== live.turnNo) { pt = live.turnNo; plan = { w: r2() < 0.5 ? 1 : 0, ang: d.angleMin + Math.floor(r2() * (d.angleMax - d.angleMin + 1)), ch: 0.3 + r2() * 1.5, mv: r2() * 0.8, dir: r2() < 0.5 ? -1 : 1, st: 0, t0: 0, it: t.items.length ? 0 : -1 }; }
        const p = plan;
        if (p.st === 0) { if (p.it >= 0) c.useItem(0, 200 + r2() * (live.W - 400), 0); c.selectWeapon(p.w); p.st = 1; }
        else if (p.st === 1) { p.t0 += 1 / 60; if (p.dir < 0) k.left = true; else k.right = true; if (p.t0 > p.mv) { p.st = 2; p.t0 = 0; } }
        else if (p.st === 2) { if (Math.abs(c.aimF - p.ang) > 0.6) { if (c.aimF < p.ang) k.up = true; else k.down = true; } else p.st = 3; }
        else { p.t0 += 1 / 60; k.fire = p.t0 < p.ch; }
      }
      c.frame(1 / 60);
    }
    total++;
    if (live.phase === 'over') { finished++; if (live.winner === 'draw') draws++; }
    for (const inp of c.log) if (!inp.timeout && !inp.ended) { const tk = live.tanks.find(t => t.id === inp.seat).tankId; used[tk + ':' + inp.weapon] = (used[tk + ':' + inp.weapon] || 0) + 1; }
    // replay check with the same HP tweak
    const m2 = createMatch({ seed: 900 + g, mapId: MAPS[g % 4], players }); m2.tanks.forEach(t => { t.hp = t.maxhp = 260; });
    const by = {}; for (const i of c.log) by[i.turnNo] = i;
    const c2 = createController(m2, { replay: by }); let f2 = 0;
    while (m2.phase !== 'over' && f2 < 60 * 60 * 60) { f2++; if (m2.phase === 'aim' && !by[m2.turnNo]) break; c2.frame(1 / 30); }
    if (stateHash(m2) !== stateHash(live) || m2.winner !== live.winner) mism++;
  }
  const missing = [];
  for (const tk of TANKS) for (const w of [0, 1]) if (!used[tk + ':' + w]) missing.push(tk + ':' + w);
  console.log(`  ${finished}/${total} matches finished (${draws} draws), final-state replay mismatches: ${mism}, weapons never fired: ${missing.join(', ') || 'none'}`);
  ok(finished === total, 'all matches finish');
  ok(mism === 0, 'final state replay');
  ok(missing.length === 0, 'weapon coverage');
}

console.log(failures ? `\n${failures} FAILED` : '\nALL PASSED');
process.exit(failures ? 1 : 0);
