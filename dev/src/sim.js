// ============================================================== SIMULATION (pure logic, no DOM, no clock, no Math.random)
// A match changes only through: beginning a turn, aim-phase commands (move / item / fire / timeout)
// and step() ticks. Same seed + same TurnInputs => identical state on every device.

const TICK = 1 / CONFIG.physics.tickRate;

function createMatch(opts) {
  // opts: { seed, mapId, players: [{ id, nick, team: 'red'|'blue', tankId }] }
  const map = buildMap(opts.mapId);
  const m = {
    cfgVersion: CONFIG.version, seed: opts.seed >>> 0, rng: opts.seed >>> 0,
    mapId: opts.mapId, W: map.W, H: map.H, mask: map.mask, theme: map.theme,
    tick: 0, turnNo: 0, wind: 0, cur: -1, phase: 'settle', settle: 40, winner: null,
    tanks: [], proj: [], mines: [], crates: [], sched: [], schedSeq: 0,
    turn: null, hashes: {}, events: [], spawns: map.spawns,
  };
  // start positions: pick random spawns, then interleave the teams from left to right so neither team
  // starts bunched on one side (smaller team spread evenly between the bigger one)
  // start positions: fully random. 20 spots (neighbours ~460 px apart: more than one turn of movement) spread evenly over the standable width (map edges excluded); each player
  // gets one at random, teams not interleaved. Two neighbouring spots are never both taken (unless the map runs out).
  const n = opts.players.length, cand = map.cand && map.cand.length >= n ? map.cand : map.spawns.slice().sort((a, b) => a - b);
  const SPOTS = 20, lo = cand[0], hi = cand[cand.length - 1], spots = [];
  for (let k = 0; k < SPOTS; k++) {
    const want = lo + (hi - lo) * k / (SPOTS - 1);
    let best = cand[0]; for (const x of cand) if (Math.abs(x - want) < Math.abs(best - want)) best = x;
    if (spots.indexOf(best) < 0) spots.push(best);
  }
  const taken = [], free = spots.map((x, i) => i);
  for (let k = 0; k < n; k++) {
    let pool = free.filter(i => taken.every(j => Math.abs(i - j) > 1));
    if (!pool.length) pool = free.filter(i => taken.indexOf(i) < 0);
    const i = pool[Math.floor(rngNext(m) * pool.length)]; taken.push(i);
  }
  const spawnOf = {}; opts.players.forEach((p, i) => { spawnOf[i] = spots[taken[i]]; });
  opts.players.forEach((p, i) => {
    const d = CONFIG.tanks[p.tankId];
    const x = spawnOf[i];
    const t = {
      idx: i, id: p.id, nick: p.nick, team: p.team, tankId: p.tankId,
      x, y: maskSurface(m.mask, m.W, m.H, x, 0), vy: 0, fallAcc: 0, falling: false, fallFrom: 0,
      hp: d.hp, maxhp: d.hp, facing: x < m.W / 2 ? 1 : -1, aim: Math.round((d.angleMin + d.angleMax) / 2),
      delay: Math.floor(rngNext(m) * 120), alive: true, poison: null, shield: false, cd: 0, items: [],
      fuel: d.movePx, tc: 1, ts: 0, lastPower: -1, lastAim: -1, deathCause: '', lastBy: -1,
      // match stats for the results screen (computed by the simulation, so every device agrees)
      st: { dealt: 0, taken: 0, friendly: 0, kills: 0, falls: 0, shots: 0, hitTurns: 0, lastHit: 0 },
    };
    m.tanks.push(t);
  });
  m.tanks.forEach(t => updateTilt(m, t));
  // happening for this match
  const HP = CONFIG.happenings;
  m.happening = rngNext(m) < HP.chance ? HP.list[Math.floor(rngNext(m) * HP.list.length)] : null;
  m.column = null; // weather comes later
  return m;
}

// ---------------------------------------------------------------- terrain queries
function solidAt(m, x, y) {
  x = Math.floor(x); y = Math.floor(y);
  if (x < 0 || y < 0 || x >= m.W || y >= m.H) return false;
  return m.mask[y * m.W + x] === 1;
}
function surfaceAt(m, x, from) { return maskSurface(m.mask, m.W, m.H, x, from); }
function carve(m, cx, cy, r) {
  const W = m.W, H = m.H, mask = m.mask;
  const y0 = Math.max(0, Math.floor(cy - r)), y1 = Math.min(H - 1, Math.ceil(cy + r));
  for (let y = y0; y <= y1; y++) {
    const dy = y - cy, d2 = r * r - dy * dy;
    if (d2 < 0) continue;
    const dx = Math.sqrt(d2);
    const xa = Math.max(0, Math.floor(cx - dx)), xb = Math.min(W - 1, Math.ceil(cx + dx));
    mask.fill(0, y * W + xa, y * W + xb + 1);
  }
  m.events.push({ type: 'carve', x: cx, y: cy, r });
}

// ---------------------------------------------------------------- tank geometry
function groundUnder(m, t) {
  for (const dx of [-10, -4, 0, 4, 10]) if (solidAt(m, t.x + dx, t.y + 1)) return true;
  return false;
}
function updateTilt(m, t) {
  const yl = surfaceAt(m, t.x - 16, t.y - 26), yr = surfaceAt(m, t.x + 16, t.y - 26);
  if (yl >= 0 && yr >= 0 && Math.abs(yl - t.y) < 30 && Math.abs(yr - t.y) < 30) {
    const dy = clampN(yr - yl, -15, 15), len = Math.sqrt(32 * 32 + dy * dy);
    t.tc = 32 / len; t.ts = dy / len;
  } else { t.tc = 1; t.ts = 0; }
}
function tankCenter(t) { return { x: t.x + 22 * t.ts, y: t.y - 22 * t.tc }; }
// local sprite point (svg units) -> world, honouring facing and tilt
function spriteToWorld(t, lx, ly) {
  const S = CONFIG.sprite;
  const px = (lx - S.anchorX) * S.scale * t.facing, py = (ly - S.anchorY) * S.scale;
  return { x: t.x + px * t.tc - py * t.ts, y: t.y + px * t.ts + py * t.tc };
}
function muzzleOf(t, aimDeg) {
  const sp = CONFIG.tanks[t.tankId].sprite;
  if (sp.fixedMuzzle) return spriteToWorld(t, sp.fixedMuzzle[0], sp.fixedMuzzle[1]);
  const dir10 = (sp.catapult ? 180 - aimDeg : aimDeg) * 10;
  return spriteToWorld(t, sp.pivot[0] + sp.muzzleLen * cosD10(dir10), sp.pivot[1] - sp.muzzleLen * sinD10(dir10));
}
// unit aim vector in world space; extra10 = tenths of a degree offset
function aimVector(t, aimDeg, extra10) {
  const a10 = aimDeg * 10 + (extra10 || 0);
  const lx = t.facing * cosD10(a10), ly = -sinD10(a10);
  return { x: lx * t.tc - ly * t.ts, y: lx * t.ts + ly * t.tc };
}

// ---------------------------------------------------------------- damage
// by = the tank that caused it (null for terrain / sudden death / meteors)
function hurt(m, t, dmg, kind, by) {
  if (!t.alive || dmg <= 0) return;
  const real = Math.min(t.hp, dmg);
  t.hp = Math.max(0, t.hp - dmg);
  t.st.taken += real;
  if (by && by !== t) {
    if (by.team === t.team) by.st.friendly += real;
    else {
      by.st.dealt += real; t.lastBy = by.idx;
      if (by.st.lastHit !== m.turnNo) { by.st.lastHit = m.turnNo; by.st.hitTurns++; }
      if (t.hp <= 0) { by.st.kills++; if (kind === 'fall') by.st.falls++; }
    }
  }
  m.events.push({ type: 'dmg', idx: t.idx, x: t.x, y: t.y, amount: dmg, kind: kind || 'hit' });
  if (t.hp <= 0) { t.alive = false; t.deathCause = kind || 'hit'; m.events.push({ type: 'death', idx: t.idx, x: t.x, y: t.y }); }
}
// a tank that falls out: the last enemy who hit it gets the fall kill
function creditFall(m, t) {
  const by = t.lastBy >= 0 ? m.tanks[t.lastBy] : null;
  if (by && by.team !== t.team) { by.st.falls++; by.st.kills++; }
}
function explode(m, x, y, r, dmg, owner, w, amp) {
  const P = CONFIG.physics, cr = r * P.blastCarveMul, reach = r * P.blastDmgMul + P.bodyRadius;
  carve(m, x, y, cr);
  const crit = w && w.onHit && w.onHit.crit, poison = w && w.onHit && w.onHit.poison;
  for (const t of m.tanks) {
    if (!t.alive) continue;
    const c = tankCenter(t), dx = c.x - x, dy = c.y - y, d = Math.sqrt(dx * dx + dy * dy);
    if (d > reach) continue;
    let v = dmg * (1 - (1 - P.edgeDmg) * Math.min(1, d / reach));
    if (crit && d < crit.within) { v *= crit.mul; m.events.push({ type: 'text', x: t.x, y: t.y - 90, text: '정타!', color: '#FFD24A' }); }
    v *= CONFIG.tanks[t.tankId].dmgTaken;
    if (t.shield) v *= CONFIG.items.shield.mul;
    hurt(m, t, Math.round(v), owner && owner.team === t.team ? 'friendly' : 'hit', owner);
    if (poison && t.alive) {
      let pd = poison.dmg;
      if (amp && owner && CONFIG.tanks[owner.tankId].traits.ampPoison) pd = Math.round(pd * CONFIG.items.amplify.mul);
      t.poison = { dmg: pd, turns: poison.turns, healCut: poison.healCut || 1, by: owner ? owner.idx : -1 };
      m.events.push({ type: 'text', x: t.x, y: t.y - 84, text: '중독', color: '#8EDB3A' });
    }
  }
  for (const mi of m.mines) if (!mi.dead && Math.sqrt((mi.x - x) * (mi.x - x) + (mi.y - y) * (mi.y - y)) < cr + 6) {
    mi.dead = true; schedule(m, 18, { kind: 'mineBoom', x: mi.x, y: mi.y - 4, owner: mi.owner });
  }
  for (const c of m.crates) if (!c.dead && Math.sqrt((c.x - x) * (c.x - x) + (c.y - y) * (c.y - y)) < cr) c.dead = true;
  m.events.push({ type: 'boom', x, y, r, dr: r * P.blastDmgMul, color: (w && w.look && w.look.glow) || '#FFB040' });
  resettleObjects(m);
}
function mineBoom(m, x, y, owner) {
  const p = CONFIG.tanks.trapper.weapons[1].pattern;
  explode(m, x, y, p.mineRadius, p.mineDmg, owner, null, false);
}
// crates and mines snap down when the ground under them is carved; nothing left below = gone
function resettleObjects(m) {
  for (const o of m.mines.concat(m.crates)) {
    if (o.dead || solidAt(m, o.x, o.y)) continue;
    if (solidAt(m, o.x, o.y + 1)) continue;
    const y = surfaceAt(m, o.x, o.y);
    if (y < 0) o.dead = true; else o.y = y;
  }
}
function schedule(m, ticks, ev) { ev.at = m.tick + ticks; ev.seq = m.schedSeq++; m.sched.push(ev); }

// ---------------------------------------------------------------- tank physics (flight / settle phases)
function physTank(m, t) {
  if (!t.alive) return;
  let guard = 0; while (solidAt(m, t.x, t.y - 1) && guard++ < 60) t.y -= 1;
  if (!groundUnder(m, t)) {
    if (!t.falling) { t.falling = true; t.fallFrom = t.y; t.vy = 0; t.fallAcc = 0; }
    t.vy = Math.min(t.vy + CONFIG.physics.gravity * TICK, 900);
    t.fallAcc += t.vy * TICK;
    while (t.fallAcc >= 1) { t.fallAcc -= 1; if (groundUnder(m, t)) break; t.y += 1; }
    if (t.y > m.H + 40) { t.alive = false; t.hp = 0; t.deathCause = 'fall'; t.falling = false; creditFall(m, t); m.events.push({ type: 'fallout', idx: t.idx, x: t.x }); }
  } else if (t.falling) {
    landTank(m, t);
  }
  updateTilt(m, t);
  checkTouch(m, t);
}
function landTank(m, t) {
  const h = t.y - t.fallFrom;
  t.falling = false; t.vy = 0; t.fallAcc = 0;
  if (h > CONFIG.physics.fallSafe) hurt(m, t, Math.round((h - CONFIG.physics.fallSafe) * CONFIG.physics.fallDmgPerPx), 'fall', t.lastBy >= 0 ? m.tanks[t.lastBy] : null);
}
function checkTouch(m, t) {
  if (!t.alive) return;
  if (!CONFIG.tanks[t.tankId].traits.hover) for (const mi of m.mines) {
    if (!mi.dead && Math.abs(mi.x - t.x) < 16 && Math.abs(mi.y - t.y) < 22) { mi.dead = true; mineBoom(m, mi.x, mi.y - 4, mi.owner); }
  }
  for (const c of m.crates) if (!c.dead && Math.abs(c.x - t.x) < 30 && Math.abs(c.y - t.y) < 36) {
    if (t.items.length < CONFIG.turn.inventoryMax) {
      c.dead = true; t.items.push(c.item);
      m.events.push({ type: 'pickup', idx: t.idx, x: t.x, y: t.y, item: c.item });
    }
  }
}

// ---------------------------------------------------------------- aim-phase commands (state changes are instant, never time-based)
function curTank(m) { return m.cur >= 0 ? m.tanks[m.cur] : null; }
function recordAction(m, a) {
  const acts = m.turn.actions, last = acts[acts.length - 1];
  if (a.t === 'm' && last && last.t === 'm' && last.d === a.d) last.n++;
  else acts.push(a);
}
// one movement step (0.5 px). Returns false if blocked or out of fuel.
function cmdMove(m, dir) {
  const t = curTank(m);
  if (m.phase !== 'aim' || !t || !t.alive) return false;
  // out of fuel: the tank stays put but can still turn around (barrel points the other way)
  if (t.fuel <= 0) { if (t.facing !== dir) { t.facing = dir; recordAction(m, { t: 'm', d: dir, n: 1 }); } return false; }
  const d = CONFIG.tanks[t.tankId];
  t.facing = dir;
  const step = CONFIG.physics.moveStep * (d.traits.hover ? CONFIG.physics.hoverMoveMul : 1);
  const nx = t.x + dir * step;
  let moved = false;
  if (nx >= 4 && nx <= m.W - 4) {
    let ny = t.y, ok = true;
    if (solidAt(m, nx + dir * 10, t.y - 1)) {
      ok = false;
      for (let u = 1; u <= CONFIG.physics.climb; u++) if (!solidAt(m, nx + dir * 10, t.y - 1 - u) && !solidAt(m, nx, t.y - 30 - u)) { ny = t.y - u; ok = true; break; }
    }
    if (ok && !solidAt(m, nx, ny - 32)) { t.x = nx; t.y = ny; moved = true; }
  }
  recordAction(m, { t: 'm', d: dir, n: 1 });
  if (moved) {
    t.fuel = Math.max(0, t.fuel - step);
    m.turn.movedPx += step;
    // drop to the ground instantly (aim phase never advances time)
    const from = t.y;
    if (!groundUnder(m, t)) {
      const ys = [-10, -4, 0, 4, 10].map(dx => surfaceAt(m, t.x + dx, t.y + 1)).filter(y => y >= 0);
      if (!ys.length) { t.y = m.H + 50; t.alive = false; t.hp = 0; t.deathCause = 'fall'; creditFall(m, t); m.events.push({ type: 'fallout', idx: t.idx, x: t.x }); }
      else {
        t.y = Math.min.apply(null, ys);
        const h = t.y - from;
        if (h > CONFIG.physics.fallSafe) hurt(m, t, Math.round((h - CONFIG.physics.fallSafe) * CONFIG.physics.fallDmgPerPx), 'fall');
      }
    }
    updateTilt(m, t);
    checkTouch(m, t);
    if (!t.alive) { m.turn.endedInput = inputOf(m, { ended: true }); endTurnAfterDeath(m); }
  }
  return moved;
}
function cmdItem(m, slot, tx, ty) {
  const t = curTank(m);
  if (m.phase !== 'aim' || !t || m.turn.itemUsed) return false;
  const id = t.items[slot]; if (!id) return false;
  const it = CONFIG.items[id];
  if (it.effect === 'teleport') { m.turn.tele = true; } // next shot is a teleport shell
  else if (it.effect === 'heal') {
    const cut = t.poison ? t.poison.healCut : 1;
    const v = Math.min(Math.round(it.amount * cut), t.maxhp - t.hp);
    t.hp += v; m.events.push({ type: 'heal', idx: t.idx, x: t.x, y: t.y, amount: v });
  } else if (it.effect === 'shield') { t.shield = true; }
  else if (it.effect === 'doubleShot') { m.turn.double = true; }
  else if (it.effect === 'amplify') { m.turn.amp = true; }
  else if (it.effect === 'fuel') { t.fuel += CONFIG.tanks[t.tankId].movePx; }
  else if (it.effect === 'calm') { m.turn.calm = true; }
  t.items.splice(slot, 1);
  m.turn.itemUsed = true;
  m.events.push({ type: 'item', idx: t.idx, item: id });
  recordAction(m, { t: 'i', s: slot });
  return true;
}
function inputOf(m, extra) {
  return Object.assign({ turnNo: m.turnNo, seat: curTank(m).id, actions: m.turn.actions.map(a => Object.assign({}, a)) }, extra);
}
// Fire: angle (integer deg), power 0..1000 (integer), weapon 0|1, used = ticks spent on the turn. Returns the TurnInput.
function cmdFire(m, angle, power, weapon, used) {
  const t = curTank(m);
  if (m.phase !== 'aim' || !t || !t.alive) return null;
  const d = CONFIG.tanks[t.tankId];
  angle = clampN(Math.round(angle), d.angleMin, d.angleMax);
  power = clampN(Math.round(power), 0, 1000);
  weapon = weapon === 1 && t.cd <= 0 ? 1 : 0;
  used = clampN(Math.round(used || 0), 0, CONFIG.turn.timeLimitTicks);
  const input = inputOf(m, { angle, power, weapon, used });
  t.st.shots++;
  t.aim = angle; t.lastAim = angle; t.lastPower = power;
  const w = d.weapons[weapon];
  const berserk = d.traits.berserk && t.hp < t.maxhp * d.traits.berserk.hpBelow;
  const shots = [];
  const addSeq = baseTick => {
    const p = w.pattern;
    if (p.kind === 'burst') for (let i = 0; i < p.count; i++) shots.push({ at: baseTick + i * p.gapTicks, extra: 0, pj: 0 });
    else if (p.kind === 'spread') p.angles.forEach((a, i) => shots.push({ at: baseTick + i * (p.gapTicks || 0), extra: a, pj: p.powerJitter ? (i % 2 ? p.powerJitter : -p.powerJitter) : 0 }));
    else shots.push({ at: baseTick, extra: 0, pj: 0 });
  };
  if (m.turn.tele) shots.push({ at: 0, extra: 0, pj: 0 }); // teleport shell: one plain shot, no weapon pattern
  else { addSeq(0); if (m.turn.double) addSeq(CONFIG.items.double.gapTicks); }
  // +1: scheduled events run after the tick counter advances, so offsets stay exact between shots
  for (const s of shots) schedule(m, s.at + 1, { kind: 'shot', idx: t.idx, wIdx: weapon, angle, power, extra: s.extra, pj: s.pj, amp: m.turn.amp, berserk, tele: !!m.turn.tele, calm: !!m.turn.calm });
  if (w.cooldownTurns && !m.turn.tele) t.cd = w.cooldownTurns;
  t.delay += CONFIG.turn.baseDelay[d.speedClass] + (w.extraDelay || 0) + m.turn.movedPx * CONFIG.turn.delayPerMovePx + (m.turn.itemUsed ? CONFIG.turn.itemDelay : 0)
    + Math.round(used / CONFIG.physics.tickRate * CONFIG.turn.delayPerSec);
  m.phase = 'flight'; m.settle = 0;
  m.events.push({ type: 'fire', idx: t.idx, weapon });
  return input;
}
// A team that left the game loses (online: the host records it as a TurnInput so every device agrees)
function cmdForfeit(m, team) {
  if (m.phase !== 'aim' || (team !== 'red' && team !== 'blue')) return null;
  const input = inputOf(m, { forfeit: team });
  m.phase = 'over'; m.winner = team === 'red' ? 'blue' : 'red'; m.forfeit = team;
  m.events.push({ type: 'over', winner: m.winner, forfeit: team });
  return input;
}
function cmdTimeout(m) {
  const t = curTank(m);
  if (m.phase !== 'aim' || !t) return null;
  const input = inputOf(m, { timeout: true });
  const d = CONFIG.tanks[t.tankId];
  t.delay += CONFIG.turn.baseDelay[d.speedClass] + CONFIG.turn.skipDelay + m.turn.movedPx * CONFIG.turn.delayPerMovePx
    + Math.round(CONFIG.turn.timeLimitTicks / CONFIG.physics.tickRate * CONFIG.turn.delayPerSec); // a timeout used the whole time
  m.phase = 'settle'; m.settle = 0;
  m.events.push({ type: 'timeout', idx: t.idx });
  return input;
}
// Pass (턴 넘기기, 원작식): no shot, only a light delay. Turn order stays pure delay.
function passCost(m, t, used) {
  const d = CONFIG.tanks[t.tankId];
  return Math.round(CONFIG.turn.baseDelay[d.speedClass] * CONFIG.turn.pass.delayMul) + m.turn.movedPx * CONFIG.turn.delayPerMovePx + (m.turn.itemUsed ? CONFIG.turn.itemDelay : 0)
    + Math.round(used / CONFIG.physics.tickRate * CONFIG.turn.delayPerSec);
}
// would this tank get the very next turn again if it passed now? (same rule as beginTurn: lowest delay, then lowest idx)
function passGetsTurnBack(m, t, used) {
  const nd = t.delay + passCost(m, t, used);
  return m.tanks.every(o => o === t || !o.alive || nd < o.delay || (nd === o.delay && t.idx < o.idx));
}
function cmdPass(m, used) {
  const t = curTank(m);
  if (m.phase !== 'aim' || !t || !t.alive) return null;
  used = clampN(Math.round(used || 0), 0, CONFIG.turn.timeLimitTicks);
  const input = inputOf(m, { pass: true, used });
  t.delay += passCost(m, t, used);
  t.st.passes = (t.st.passes || 0) + 1;
  m.phase = 'settle'; m.settle = 0;
  m.events.push({ type: 'pass', idx: t.idx });
  return input;
}
function endTurnAfterDeath(m) {
  if (m.phase === 'aim') { m.phase = 'settle'; m.settle = 0; }
}
// Replay a TurnInput from another device (or a recording). Must be called at the start of that aim phase.
function applyTurnInput(m, input) {
  if (m.phase !== 'aim' || input.turnNo !== m.turnNo) return false;
  if (curTank(m).id !== input.seat) return false;
  for (const a of input.actions) {
    if (a.t === 'm') { for (let i = 0; i < a.n && m.phase === 'aim'; i++) cmdMove(m, a.d); }
    else if (a.t === 'i') cmdItem(m, a.s, a.x, a.y);
    if (m.phase !== 'aim') break;
  }
  if (m.phase === 'aim') {
    if (input.forfeit) cmdForfeit(m, input.forfeit);
    else if (input.timeout) cmdTimeout(m);
    else if (input.pass) cmdPass(m, input.used);
    else cmdFire(m, input.angle, input.power, input.weapon, input.used);
  }
  return true;
}

// ---------------------------------------------------------------- projectiles
function spawnShot(m, ev) {
  const t = m.tanks[ev.idx];
  if (!t.alive) return;
  const d = CONFIG.tanks[t.tankId], w = d.weapons[ev.wIdx];
  const mz = muzzleOf(t, ev.angle), dir = aimVector(t, ev.angle, ev.extra);
  const v = CONFIG.physics.maxSpeed * (ev.power + ev.pj) / 1000 * d.powerMul;
  m.proj.push({ x: mz.x, y: mz.y, vx: dir.x * v, vy: dir.y * v, idx: t.idx, wIdx: ev.wIdx, age: 0, amp: ev.amp, berserk: ev.berserk, tele: ev.tele, calm: ev.calm, id: m.schedSeq++ });
  m.events.push({ type: 'shot', x: mz.x, y: mz.y, idx: t.idx, wIdx: ev.wIdx });
}
function stepProjectiles(m) {
  const P = CONFIG.physics, wa = m.wind * P.windAccel, gm = CONFIG.maps[m.mapId].gravity || 1, born = [];
  for (const p of m.proj) {
    const owner = m.tanks[p.idx], w = CONFIG.tanks[owner.tankId].weapons[p.wIdx];
    const sp = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
    const n = Math.max(1, Math.ceil(sp * TICK / 3)), h = TICK / n;
    for (let i = 0; i < n && !p.dead; i++) {
      if (!p.calm) p.vx += wa * w.windMul * h; p.vy += P.gravity * w.gravityMul * gm * h;
      p.x += p.vx * h; p.y += p.vy * h; p.age += h;
      if (m.column && !p.inCol && Math.abs(p.x - m.column.x) < CONFIG.happenings[m.column.kind].w) columnHit(m, p);
      if (p.x < -400 || p.x > m.W + 400 || p.y > m.H + 200) { p.dead = true; m.events.push({ type: 'out', x: p.x, y: p.y, tele: !!p.tele }); break; }
      // K split: at the top of its arc the shell becomes two (the arms of a K)
      if (w.pattern.kind === 'split' && !p.child && p.vy >= 0) { p.dead = true; splitShell(m, p, w.pattern, born); break; }
      if (solidAt(m, p.x, p.y)) {
        // bounce: the first touch of the ground throws it back up, the second one explodes
        if (w.pattern.kind === 'bounce' && !p.bounced) {
          p.bounced = true; p.x -= p.vx * h; p.y -= p.vy * h;
          p.vy = -Math.abs(p.vy) * w.pattern.keep; p.vx *= 0.8;
          m.events.push({ type: 'bounce', x: p.x, y: p.y });
          continue;
        }
        p.dead = true; impact(m, p, p.x, p.y); break;
      }
      for (const t of m.tanks) {
        if (!t.alive || (t.idx === p.idx && p.age < 0.25)) continue;
        const c = tankCenter(t), dx = c.x - p.x, dy = c.y - p.y;
        if (dx * dx + dy * dy < P.tankRadius * P.tankRadius) { p.dead = true; impact(m, p, p.x, p.y); break; }
      }
    }
  }
  m.proj = m.proj.filter(p => !p.dead);
  for (const b of born) m.proj.push(b);
}
function splitShell(m, p, pat, born) {
  for (const sgn of [1, -1]) {
    const c = cosD10(pat.spread * sgn), s = sinD10(pat.spread * sgn);
    born.push({ x: p.x, y: p.y, vx: p.vx * c - p.vy * s, vy: p.vx * s + p.vy * c, idx: p.idx, wIdx: p.wIdx, age: p.age, amp: p.amp, berserk: p.berserk, calm: p.calm, fire: p.fire, inCol: p.inCol, child: true, id: m.schedSeq++ });
  }
  m.events.push({ type: 'split', x: p.x, y: p.y });
}
// Teleport shell: the shooter appears on the ground where it lands. Off-map = wasted.
function teleLand(m, p, x, y) {
  const t = m.tanks[p.idx];
  if (!t.alive) return;
  const tx = clampN(Math.round(x), 20, m.W - 20);
  let sy = surfaceAt(m, tx, Math.max(0, Math.round(y) - 60));
  if (sy < 0) sy = surfaceAt(m, tx, 0);
  if (sy < 0) { m.events.push({ type: 'out', x, y, tele: true }); return; }
  m.events.push({ type: 'tele', idx: t.idx, x: t.x, y: t.y, x2: tx, y2: sy });
  t.x = tx; t.y = sy; t.vy = 0; t.falling = false; updateTilt(m, t); checkTouch(m, t);
}
// tornado: the shell is flung in a new direction (deterministic, looks wild); fire pillar: the shell burns for x1.5 damage
function columnHit(m, p) {
  p.inCol = true;
  if (m.column.kind === 'tornado') {
    const a = ((p.id * 977 + m.tick * 131) % 2400) - 1200, c = cosD10(a), s = sinD10(a);
    const vx = p.vx * c - p.vy * s, vy = p.vx * s + p.vy * c;
    p.vx = vx * 1.05; p.vy = vy * 1.05 - 160;
    m.events.push({ type: 'tornadoHit', x: p.x, y: p.y });
  } else { p.fire = true; m.events.push({ type: 'pillarHit', x: p.x, y: p.y }); }
}
function impact(m, p, x, y) {
  if (p.tele) return teleLand(m, p, x, y);
  // for the renderer only (stuck arrows, rock shards...): never read back by the simulation
  m.events.push({ type: 'impact', x, y, vx: p.vx, vy: p.vy, idx: p.idx, wIdx: p.wIdx, child: !!p.child, fire: !!p.fire });
  const owner = m.tanks[p.idx], d = CONFIG.tanks[owner.tankId], w = d.weapons[p.wIdx], pat = w.pattern;
  let r = w.radius, dmg = w.dmg;
  if (p.fire) dmg *= CONFIG.happenings.pillar.mul;
  if (p.amp) dmg *= CONFIG.items.amplify.mul;
  if (p.berserk) { r *= d.traits.berserk.mul; dmg *= d.traits.berserk.mul; }
  if (pat.kind === 'orbital') {
    m.events.push({ type: 'beam', x, ticks: pat.ticks });
    schedule(m, pat.ticks, { kind: 'orbitalHit', x, r, dmg, idx: p.idx, wIdx: p.wIdx, amp: p.amp });
    return;
  }
  if (pat.kind === 'mine') {
    explode(m, x, y, r, dmg, owner, w, p.amp);
    for (const dx of [-pat.offset, pat.offset]) {
      const sy = surfaceAt(m, x + dx, y - 80);
      if (sy >= 0) m.mines.push({ x: x + dx, y: sy, owner, dead: false, id: m.schedSeq++ });
    }
    const live = m.mines.filter(mi => !mi.dead);
    while (live.length > CONFIG.turn.mineMax) live.shift().dead = true;
    return;
  }
  explode(m, x, y, r, dmg, owner, w, p.amp);
  if (pat.kind === 'roll') {
    const sl = surfaceAt(m, x - 30, y - 60), sr = surfaceAt(m, x + 30, y - 60);
    const dir = (sr >= 0 ? sr : y) > (sl >= 0 ? sl : y) ? 1 : -1;
    const tx = x + dir * pat.dist, ty = surfaceAt(m, tx, y - 80);
    if (ty >= 0) {
      m.events.push({ type: 'roll', x0: x, y0: y, x1: tx, y1: ty, ticks: pat.ticks });
      schedule(m, pat.ticks, { kind: 'rollHit', x: tx, y: ty - 6, r: pat.radius, dmg: pat.dmg * (p.amp ? CONFIG.items.amplify.mul : 1), idx: p.idx, wIdx: p.wIdx, amp: p.amp });
    }
  }
}
function runScheduled(m) {
  if (!m.sched.length) return;
  const due = m.sched.filter(e => e.at <= m.tick).sort((a, b) => a.at - b.at || a.seq - b.seq);
  if (!due.length) return;
  m.sched = m.sched.filter(e => e.at > m.tick);
  for (const e of due) {
    if (e.kind === 'shot') spawnShot(m, e);
    else if (e.kind === 'mineBoom') mineBoom(m, e.x, e.y, e.owner);
    else if (e.kind === 'orbitalHit') { const sy = surfaceAt(m, e.x, 0); const w = CONFIG.tanks[m.tanks[e.idx].tankId].weapons[e.wIdx]; if (sy >= 0) explode(m, e.x, sy, e.r, e.dmg, m.tanks[e.idx], w, e.amp); }
    else if (e.kind === 'meteorHit') { const sy = surfaceAt(m, e.x, 0), M = CONFIG.happenings.meteor; if (sy >= 0) explode(m, e.x, sy, M.r, M.dmg, null, null, false); else m.events.push({ type: 'out', x: e.x, y: m.H }); }
    else if (e.kind === 'rollHit') { const w = CONFIG.tanks[m.tanks[e.idx].tankId].weapons[e.wIdx]; explode(m, e.x, e.y, e.r, e.dmg, m.tanks[e.idx], w, e.amp); }
  }
}

// ---------------------------------------------------------------- turns
function teamAlive(m, team) { return m.tanks.some(t => t.alive && t.team === team); }
function beginTurn(m) {
  const red = teamAlive(m, 'red'), blue = teamAlive(m, 'blue');
  if (!red || !blue) { m.phase = 'over'; m.winner = red ? 'red' : blue ? 'blue' : 'draw'; m.events.push({ type: 'over', winner: m.winner }); return; }
  const alive = m.tanks.filter(t => t.alive).sort((a, b) => a.delay - b.delay || a.idx - b.idx);
  const t = alive[0], base = t.delay;
  const again = m.cur === t.idx; // the same tank twice in a row (its turns were cheaper than everyone else's)
  for (const o of alive) o.delay -= base;
  m.turnNo++;
  m.cur = t.idx;
  const d = CONFIG.tanks[t.tankId];
  t.fuel = d.movePx; t.shield = false;
  if (t.cd > 0) t.cd--;
  m.turn = { actions: [], itemUsed: false, double: false, amp: false, tele: false, calm: false, movedPx: 0 };
  const T = CONFIG.turn, sudden = m.turnNo >= T.suddenBase + T.suddenPerPlayer * m.tanks.length;
  const W = Math.round(T.windMax * (sudden ? T.suddenWindMul : 1));
  m.wind = clampN(Math.round((rngNext(m) + rngNext(m) + rngNext(m) - 1.5) * 9 * (sudden ? T.suddenWindMul : 1)), -W, W);
  for (const c of m.crates) if (!c.dead && m.turnNo - (c.born || 0) >= crateLife(m)) { c.dead = true; m.events.push({ type: 'crategone', x: c.x, y: c.y }); }
  m.crates = m.crates.filter(c => !c.dead);
  if (m.turnNo % CONFIG.turn.crateEveryTurns === 1) dropCrate(m);
  m.hashes[m.turnNo] = stateHash(m);
  m.events.push({ type: 'turn', idx: t.idx, turnNo: m.turnNo, again });
  if (t.poison) {
    hurt(m, t, t.poison.dmg, 'poison', t.poison.by >= 0 ? m.tanks[t.poison.by] : null);
    t.poison.turns--; if (t.poison.turns <= 0) t.poison = null;
    if (!t.alive) { m.phase = 'settle'; m.settle = 0; return; }
  }
  const MT = CONFIG.happenings.meteor;
  if (m.happening === 'meteor' && m.turnNo >= MT.from && m.turnNo % MT.every === 0) {
    const n = 1 + (rngNext(m) < 0.5 ? 1 : 0);
    for (let i = 0; i < n; i++) {
      const x = 200 + Math.floor(rngNext(m) * (m.W - 400));
      schedule(m, MT.fallTicks + i * 20, { kind: 'meteorHit', x });
      m.events.push({ type: 'meteor', x, at: m.tick + MT.fallTicks + i * 20 + 1, dur: MT.fallTicks + i * 20 });
    }
  }
  const WX = CONFIG.happenings.weather;
  if (m.column) { // the column drifts with the wind, bounces off the map edges and runs out after a few turns
    m.column.life--;
    if (m.column.life <= 0) { m.events.push({ type: 'weatherEnd', kind: m.column.kind }); m.column = null; }
    else {
      const C = CONFIG.happenings[m.column.kind];
      let nx = m.column.x + m.wind * C.drift;
      if (nx < 300) nx = 600 - nx; if (nx > m.W - 300) nx = 2 * (m.W - 300) - nx;
      m.column.x = Math.round(clampN(nx, 300, m.W - 300));
      if (m.column.life === 1) m.events.push({ type: 'weatherSoon', kind: m.column.kind });
    }
  } else if (m.turnNo >= WX.from && rngNext(m) < WX.chance) {
    const kind = WX.list[Math.floor(rngNext(m) * WX.list.length)];
    const life = WX.minTurns + Math.floor(rngNext(m) * (WX.maxTurns - WX.minTurns + 1));
    m.column = { kind, x: Math.round(m.W * (0.25 + 0.5 * rngNext(m))), life };
    m.events.push({ type: 'weatherStart', kind, x: m.column.x });
  }
  if (sudden) {
    if (!m.sudden) { m.sudden = true; m.events.push({ type: 'sudden' }); }
    for (const o of m.tanks) if (o.alive) hurt(m, o, Math.round(o.maxhp * T.suddenDmg), 'sudden');
    if (!t.alive) { m.phase = 'settle'; m.settle = 0; return; }
  }
  m.phase = 'aim';
}
function crateLife(m) { return CONFIG.turn.crateLifeRounds * m.tanks.length; }
// a crate lands 300~600 px to the side of one tank (open sky above, not much higher or lower, no tank nearer than 300):
// out of reach this turn, but 2~3 turns of driving get it. Nowhere like that: anywhere, as before.
function dropCrate(m) {
  const T = CONFIG.turn, keys = Object.keys(CONFIG.items);
  if (m.crates.length >= T.crateMax) return;
  let total = 0; for (const k of keys) total += CONFIG.items[k].dropWeight;
  const pick = () => { let r = rngNext(m) * total; for (const k of keys) { r -= CONFIG.items[k].dropWeight; if (r < 0) return k; } return keys[0]; };
  const put = (x, y, item) => { m.crates.push({ x, y, item, dead: false, id: m.schedSeq++, born: m.turnNo }); m.events.push({ type: 'crate', x, y, item, id: m.crates[m.crates.length - 1].id }); };
  const alive = m.tanks.filter(t => t.alive), lo = T.crateNear[0], hi = T.crateNear[1];
  for (let tries = 0; alive.length && tries < 40; tries++) {
    const t = alive[Math.floor(rngNext(m) * alive.length)], side = rngNext(m) < 0.5 ? -1 : 1;
    const x = Math.round(t.x + side * (lo + rngNext(m) * (hi - lo))), item = pick();
    if (x < 100 || x > m.W - 100) continue;
    const y = surfaceAt(m, x, 0);
    if (y < 0 || Math.abs(y - t.y) > T.crateNearDy) continue;
    if (alive.some(o => Math.abs(o.x - x) < lo && Math.abs(o.y - y) < T.crateNearDy)) continue;
    if (m.crates.some(c => Math.abs(c.x - x) < 80)) continue;
    put(x, y, item); return;
  }
  for (let tries = 0; tries < 20; tries++) {
    const x = Math.round(200 + rngNext(m) * (m.W - 400)), y = surfaceAt(m, x, 0), item = pick();
    if (y >= 0) { put(x, y, item); return; }
  }
}

// One fixed tick. Aim phase is frozen (only commands change it).
function step(m) {
  if (m.phase === 'over' || m.phase === 'aim') return;
  m.tick++;
  runScheduled(m);
  stepProjectiles(m);
  for (const t of m.tanks) physTank(m, t);
  m.mines = m.mines.filter(x => !x.dead);
  m.crates = m.crates.filter(x => !x.dead);
  const busy = m.proj.length || m.sched.length || m.tanks.some(t => t.alive && t.falling);
  if (busy) { m.settle = 0; return; }
  m.settle++;
  if (m.settle >= CONFIG.physics.settleTicks || (m.phase === 'settle' && m.turnNo === 0 && m.settle >= 40)) {
    const Q = CONFIG.happenings.quake, next = m.turnNo + 1;
    if (m.happening === 'quake' && next >= Q.from && next % Q.every === 0 && m.quakeDone !== next) { m.quakeDone = next; quake(m); m.settle = 0; return; }
    beginTurn(m);
  }
}
// earthquake: every tank is shoved sideways; ledges become dangerous
function quake(m) {
  const Q = CONFIG.happenings.quake;
  m.events.push({ type: 'quake' });
  for (const t of m.tanks) {
    if (!t.alive) continue;
    const nx = clampN(Math.round(t.x + (rngNext(m) - 0.5) * 2 * Q.shift), 20, m.W - 20);
    if (solidAt(m, nx, t.y - 60)) continue; // a wall: stays put
    t.x = nx; t.lastQuake = m.turnNo;
  }
}

// ---------------------------------------------------------------- hash (everything that decides the future)
function stateHash(m) {
  let h = fnvInit();
  h = fnvU32(h, m.rng); h = fnvU32(h, m.turnNo); h = fnvU32(h, m.tick); h = fnvU32(h, m.wind + 100); h = fnvU32(h, m.cur + 1);
  // terrain: 4 bytes per step (mask length is a multiple of 4 on every map)
  const words = new Uint32Array(m.mask.buffer, m.mask.byteOffset, m.mask.length >> 2);
  for (let i = 0; i < words.length; i++) h = Math.imul(h ^ words[i], 0x01000193);
  h >>>= 0;
  for (const t of m.tanks) {
    h = fnvF64(h, t.x); h = fnvF64(h, t.y); h = fnvU32(h, t.hp); h = fnvF64(h, t.delay); h = fnvU32(h, t.alive ? 1 : 0);
    h = fnvU32(h, t.cd); h = fnvF64(h, t.facing); h = fnvStr(h, t.items.join(',')); h = fnvStr(h, t.poison ? t.poison.dmg + ':' + t.poison.turns : '-');
  }
  for (const o of m.mines) { h = fnvF64(h, o.x); h = fnvF64(h, o.y); }
  for (const o of m.crates) { h = fnvF64(h, o.x); h = fnvF64(h, o.y); h = fnvStr(h, o.item); }
  if (m.column) { h = fnvF64(h, m.column.x); h = fnvU32(h, m.column.life); }
  return h >>> 0;
}
