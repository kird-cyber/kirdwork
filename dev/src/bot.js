// ============================================================== BOT (balance measurement + practice opponent)
// Picks a target, searches angle × power with the same physics as the simulation, then adds aiming error.
// Practice bots play like people: they misjudge the wind, the first shot at a target is way off and they correct with every
// following shot (err x learn per shot, down to floor). 'measure' is the steady bot used for balance numbers.
// offset: the bot aims this many px beside the target on its first shot and walks in (x learn per shot, down to floor)
const BOT_LEVELS = {
  easy: { angErr: 3, powErr: 50, windSeen: 0.3, offset: 300, start: 1, learn: 0.8, floor: 0.55, special: 0.15 },
  normal: { angErr: 2.5, powErr: 40, windSeen: 0.6, offset: 240, start: 1, learn: 0.72, floor: 0.45, special: 0.35 },
  hard: { angErr: 1.5, powErr: 25, windSeen: 0.9, offset: 110, start: 1, learn: 0.6, floor: 0.12, special: 0.5 },
  measure: { angErr: 2, powErr: 30, windSeen: 1, offset: 0, start: 1, learn: 1, floor: 1, special: 0.5 },
};

// Predict where a shot lands (or how close it passes the target). Returns miss distance in px.
// Follows the same special rules as the simulation for bouncing and splitting shells.
function botPredict(m, t, angle, power, wIdx, target, windSeen, offX) {
  const d = CONFIG.tanks[t.tankId], w = d.weapons[wIdx], P = CONFIG.physics;
  const mz = muzzleOf(t, angle), dir = aimVector(t, angle, 0);
  const v = P.maxSpeed * power / 1000 * d.powerMul;
  return botFly(m, t, w, target, mz.x, mz.y, dir.x * v, dir.y * v, 0, false, false, windSeen === undefined ? 1 : windSeen, offX || 0);
}
function botFly(m, t, w, target, x, y, vx, vy, age, bounced, child, ws, offX) {
  const P = CONFIG.physics, wa = m.wind * ws * P.windAccel * w.windMul, g = P.gravity * w.gravityMul * (CONFIG.maps[m.mapId].gravity || 1);
  const tc0 = tankCenter(target), tc = { x: tc0.x + offX, y: tc0.y }, pat = w.pattern;
  let best = 1e9;
  for (let tick = 0; tick < 1400; tick++) {
    const sp = Math.sqrt(vx * vx + vy * vy), n = Math.max(1, Math.ceil(sp * TICK / 6)), h = TICK / n;
    for (let i = 0; i < n; i++) {
      vx += wa * h; vy += g * h; x += vx * h; y += vy * h; age += h;
      if (pat.kind === 'split' && !child && vy >= 0) {
        let mm = 1e9;
        for (const sgn of [1, -1]) { const c = cosD10(pat.spread * sgn), s = sinD10(pat.spread * sgn); mm = Math.min(mm, botFly(m, t, w, target, x, y, vx * c - vy * s, vx * s + vy * c, age, bounced, true, ws, offX)); }
        return mm;
      }
      const dx = x - tc.x, dy = y - tc.y, dd = dx * dx + dy * dy;
      if (dd < best) best = dd;
      if (dd < 400 && !offX) return 0;
      if (x < -400 || x > m.W + 400 || y > m.H + 200) return Math.sqrt(best) + 400;
      if (solidAt(m, x, y)) {
        if (pat.kind === 'bounce' && !bounced) { bounced = true; x -= vx * h; y -= vy * h; vy = -Math.abs(vy) * pat.keep; vx *= 0.8; continue; }
        // blocked by terrain: distance from the impact to the target
        return Math.sqrt(dx * dx + dy * dy) + (pat.kind === 'orbital' ? -30 : 0);
      }
      for (const o of m.tanks) {
        if (!o.alive || o === target || (o === t && age < 0.25)) continue;
        const c = tankCenter(o), ex = c.x - x, ey = c.y - y;
        if (ex * ex + ey * ey < 400) return Math.sqrt(dx * dx + dy * dy) + (o.team === t.team ? 300 : 0);
      }
    }
  }
  return Math.sqrt(best) + 200;
}

// Decide and play one whole turn for the current tank. rnd = function returning [0,1).
function botPlayTurn(m, level, rnd) {
  const plan = botPlan(m, level, rnd);
  if (!plan) return m.turn.endedInput || cmdTimeout(m);
  return cmdFire(m, plan.angle, plan.power, plan.weapon);
}
// Everything except the shot: uses items, turns toward the target, returns { angle, power, weapon } (null = no target / turn ended).
function botPlan(m, level, rnd, mem) {
  const t = curTank(m), d = CONFIG.tanks[t.tankId], L = BOT_LEVELS[level] || BOT_LEVELS.normal;
  const foes = m.tanks.filter(o => o.alive && o.team !== t.team);
  if (!foes.length) return null;
  // a crate within this turn's driving (about the same height): usually drive over it first, like a person would
  if (t.items.length < CONFIG.turn.inventoryMax) {
    const c = m.crates.filter(k => !k.dead && Math.abs(k.y - t.y) < 120 && Math.abs(k.x - t.x) <= t.fuel * 0.95).sort((p, q) => Math.abs(p.x - t.x) - Math.abs(q.x - t.x))[0];
    if (c && rnd() < 0.8) {
      const dir = c.x > t.x ? 1 : -1;
      for (let g = 0; g < 4000 && !c.dead && m.phase === 'aim' && Math.abs(c.x - t.x) > 2; g++) if (!cmdMove(m, dir)) break;
      if (m.phase !== 'aim') return null;
    }
  }
  // items: heal when hurt, otherwise use whatever buffs it holds
  const hasItem = id => t.items.indexOf(id);
  if (hasItem('heal') >= 0 && t.hp < t.maxhp * 0.55) cmdItem(m, hasItem('heal'));
  else if (hasItem('amplify') >= 0) cmdItem(m, hasItem('amplify'));
  else if (hasItem('double') >= 0) cmdItem(m, hasItem('double'));
  else if (hasItem('shield') >= 0) cmdItem(m, hasItem('shield'));
  const wIdx = t.cd <= 0 && rnd() < L.special ? 1 : 0;
  // how far beside each target this bot aims this time (ranging in over the match)
  const offOf = {};
  for (const target of foes) {
    let k = L.start;
    if (mem) { k = mem[target.id] === undefined ? L.start : mem[target.id]; }
    offOf[target.id] = L.offset ? L.offset * k * (rnd() < 0.5 ? -1 : 1) * (0.7 + 0.6 * rnd()) : 0;
  }
  let best = { miss: 1e9 };
  for (const target of foes) {
    const dir = target.x < t.x ? -1 : 1;
    if (t.facing !== dir) { cmdMove(m, dir); if (m.phase !== 'aim') return null; }
    for (let a = d.angleMin; a <= d.angleMax; a += 3) for (let p = 30; p <= 1000; p += 20) {
      const miss = botPredict(m, t, a, p, wIdx, target, L.windSeen, offOf[target.id]);
      if (miss < best.miss) best = { miss, a, p, target };
    }
  }
  // refine around the best
  for (let a = best.a - 2; a <= best.a + 2; a++) for (let p = best.p - 24; p <= best.p + 24; p += 4) {
    if (a < d.angleMin || a > d.angleMax || p < 0 || p > 1000) continue;
    const miss = botPredict(m, t, a, p, wIdx, best.target, L.windSeen, offOf[best.target.id]);
    if (miss < best.miss) best = { miss, a, p, target: best.target };
  }
  const dir = best.target.x < t.x ? -1 : 1;
  if (t.facing !== dir) { cmdMove(m, dir); if (m.phase !== 'aim') return null; }
  const gauss = () => (rnd() + rnd() + rnd() - 1.5) / 1.5;
  // ranging in: the error shrinks with every shot at the same target
  if (mem) { const key = best.target.id, k = mem[key] === undefined ? L.start : mem[key]; mem[key] = Math.max(L.floor, k * L.learn); }
  const angle = Math.round(clampN(best.a + gauss() * L.angErr, d.angleMin, d.angleMax));
  const power = Math.round(clampN(best.p + gauss() * L.powErr, 0, 1000));
  return { angle, power, weapon: wIdx };
}
