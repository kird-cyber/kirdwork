// ============================================================== BOT (balance measurement only — not shipped in the game build)
// Picks a target, searches angle × power with the same physics as the simulation, then adds aiming error.
const BOT_LEVELS = {
  easy: { angErr: 4, powErr: 60 },
  normal: { angErr: 2, powErr: 30 },
  hard: { angErr: 1, powErr: 12 },
};

// Predict where a shot lands (or how close it passes the target). Returns miss distance in px.
function botPredict(m, t, angle, power, wIdx, target) {
  const d = CONFIG.tanks[t.tankId], w = d.weapons[wIdx], P = CONFIG.physics;
  const mz = muzzleOf(t, angle), dir = aimVector(t, angle, 0);
  const v = P.maxSpeed * power / 1000 * d.powerMul;
  let x = mz.x, y = mz.y, vx = dir.x * v, vy = dir.y * v, age = 0;
  const wa = m.wind * P.windAccel * w.windMul, g = P.gravity * w.gravityMul;
  const tc = tankCenter(target);
  let best = 1e9;
  for (let tick = 0; tick < 1400; tick++) {
    const sp = Math.sqrt(vx * vx + vy * vy), n = Math.max(1, Math.ceil(sp * TICK / 6)), h = TICK / n;
    for (let i = 0; i < n; i++) {
      vx += wa * h; vy += g * h; x += vx * h; y += vy * h; age += h;
      const dx = x - tc.x, dy = y - tc.y, dd = dx * dx + dy * dy;
      if (dd < best) best = dd;
      if (dd < 400) return 0;
      if (x < -400 || x > m.W + 400 || y > m.H + 200) return Math.sqrt(best) + 400;
      if (solidAt(m, x, y)) {
        // blocked by terrain: distance from the impact to the target
        return Math.sqrt(dx * dx + dy * dy) + (w.pattern.kind === 'orbital' ? -30 : 0);
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
  const t = curTank(m), d = CONFIG.tanks[t.tankId], L = BOT_LEVELS[level] || BOT_LEVELS.normal;
  const foes = m.tanks.filter(o => o.alive && o.team !== t.team);
  if (!foes.length) return cmdTimeout(m);
  // items: heal when hurt, otherwise use whatever buffs it holds
  const hasItem = id => t.items.indexOf(id);
  if (hasItem('heal') >= 0 && t.hp < t.maxhp * 0.55) cmdItem(m, hasItem('heal'));
  else if (hasItem('amplify') >= 0) cmdItem(m, hasItem('amplify'));
  else if (hasItem('double') >= 0) cmdItem(m, hasItem('double'));
  else if (hasItem('shield') >= 0) cmdItem(m, hasItem('shield'));
  const wIdx = t.cd <= 0 && rnd() < 0.5 ? 1 : 0;
  let best = { miss: 1e9 };
  for (const target of foes) {
    const dir = target.x < t.x ? -1 : 1;
    if (t.facing !== dir) { cmdMove(m, dir); if (m.phase !== 'aim') return m.turn.endedInput; }
    for (let a = d.angleMin; a <= d.angleMax; a += 3) for (let p = 150; p <= 1000; p += 25) {
      const miss = botPredict(m, t, a, p, wIdx, target);
      if (miss < best.miss) best = { miss, a, p, target };
    }
  }
  // refine around the best
  for (let a = best.a - 2; a <= best.a + 2; a++) for (let p = best.p - 24; p <= best.p + 24; p += 4) {
    if (a < d.angleMin || a > d.angleMax || p < 0 || p > 1000) continue;
    const miss = botPredict(m, t, a, p, wIdx, best.target);
    if (miss < best.miss) best = { miss, a, p, target: best.target };
  }
  const dir = best.target.x < t.x ? -1 : 1;
  if (t.facing !== dir) { cmdMove(m, dir); if (m.phase !== 'aim') return m.turn.endedInput; }
  const gauss = () => (rnd() + rnd() + rnd() - 1.5) / 1.5;
  const angle = Math.round(clampN(best.a + gauss() * L.angErr, d.angleMin, d.angleMax));
  const power = Math.round(clampN(best.p + gauss() * L.powErr, 0, 1000));
  return cmdFire(m, angle, power, wIdx);
}
