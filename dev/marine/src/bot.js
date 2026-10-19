// ============================================================== BOT (practice opponent + balance measurement)
// Tries a fan of curves at every enemy (straight, bent either way, S-bends, diving from above or below), walks each curve
// over the real rock mask with the expected current, and scores the burst with the weapon's real shape.
// Practice bots misjudge the current and aim off on their first shot at a target, then range in.
const BOT_LEVELS = {
  easy: { ptErr: 70, gaugeErr: 45, currentSeen: 0.3, offset: 260, learn: 0.8, floor: 0.55, special: 0.2 },
  normal: { ptErr: 50, gaugeErr: 32, currentSeen: 0.6, offset: 190, learn: 0.72, floor: 0.45, special: 0.4 },
  hard: { ptErr: 26, gaugeErr: 18, currentSeen: 0.9, offset: 90, learn: 0.6, floor: 0.15, special: 0.55 },
  measure: { ptErr: 70, gaugeErr: 80, currentSeen: 1, offset: 0, learn: 1, floor: 1, special: 0.5 },
};

// damage a burst of shape sh at (x, y) would deal to sub t (same falloff as explode)
function botShapeDmg(sh, dmg, x, y, t) {
  const P = CONFIG.physics, pad = P.bodyPad, dx = t.x - x, dy = t.y - y;
  let n;
  if (sh.thin) { const a = dx / (sh.rx + pad), b = dy / (sh.thin + pad), c = dx / (sh.thin + pad), d = dy / (sh.ry + pad); n = Math.min(Math.sqrt(a * a + b * b), Math.sqrt(c * c + d * d)); }
  else { const a = dx / (sh.rx + pad), b = dy / (sh.ry + pad); n = Math.sqrt(a * a + b * b); }
  return n > 1 ? 0 : dmg * (1 - (1 - P.edgeDmg) * n);
}
// first rock straight below (x, y), or y + max
function botDropY(m, x, y, max) { for (let k = 0; k < max; k += 6) if (solidAt(m, x, y + k)) return y + k; return y + max; }
// Score one curve. Returns { score, det } (det = burst distance along the curve).
function botEval(m, t, w, path, target, curSeen, aimX, aimY) {
  // water push accumulated along the curve (the turn's current + the map's own currents), as the bot judges it
  let ox = 0, oy = 0, best = 1e18, bestS = -1, rockS = -1, bx = 0, by = 0, rx = 0, ry = 0;
  for (let s = 6; s <= path.L; s += 6) {
    const a0 = pathAt(path, s), dv = driftAt(m, a0.x + ox, a0.y + oy);
    ox += dv[0] * 2 * curSeen; oy += dv[1] * 2 * curSeen;
    const a = a0, x = a.x + ox, y = a.y + oy;
    if (outOfMap(m, x, y) || solidAt(m, x, y)) { rockS = s; rx = x; ry = y; break; }
    const dd = (x - aimX) * (x - aimX) + (y - aimY) * (y - aimY);
    if (dd < best) { best = dd; bestS = s; bx = x; by = y; }
  }
  if (rockS >= 0 && (bestS < 0 || bestS > rockS)) { bestS = rockS; bx = rx; by = ry; }
  if (bestS < 0) return { score: -1, det: path.L };
  const sh = { rx: w.rx, ry: w.ry, thin: w.thin || 0 };
  let score = 0;
  const value = (o, v) => { if (o.team !== t.team) score += Math.min(v, o.hp) + (v >= o.hp ? 150 : 0); else score -= (o === t ? 2.5 : 1.5) * v; };
  for (const o of m.subs) {
    if (!o.alive) continue;
    let v = botShapeDmg(sh, w.dmg, bx, by, o);
    if (w.kind === 'depth' || w.kind === 'rain') {
      // the missile / arrows come down: what is under the burst point
      const top = w.kind === 'rain' ? Math.max(10, by - w.height) : by;
      if (Math.abs(o.x - bx) < (w.kind === 'rain' ? w.gap * 2 + 30 : 40) && o.y > top) { const floorY = botDropY(m, o.x, top, 2400); if (floorY > o.y - 10) v = Math.max(v, w.dmg * (w.kind === 'rain' ? 1.6 : 1)); }
    }
    if (w.kind === 'homing' && o === target && (o.x - bx) * (o.x - bx) + (o.y - by) * (o.y - by) < w.seek * w.seek) v = Math.max(v, w.dmg * 0.9);
    if (w.kind === 'chain' && o.team !== t.team && (o.x - bx) * (o.x - bx) + (o.y - by) * (o.y - by) < w.jumpR * w.jumpR) v += w.dmg * 0.8;
    if (w.kind === 'vortex' && o.team !== t.team && (o.x - bx) * (o.x - bx) + (o.y - by) * (o.y - by) < w.pullR * w.pullR) v = Math.max(v, w.dmg * 0.8);
    if (w.kind === 'magnet' && o.team !== t.team && (o.x - bx) * (o.x - bx) + (o.y - by) * (o.y - by) <= w.snap * w.snap) v = Math.max(v, w.dmg);
    if (w.kind === 'octo8' && v > 0) v *= 2.2;
    if (w.kind === 'twin') v *= 1.7;
    if (v > 0) value(o, v);
  }
  return { score, det: bestS };
}
function botCandidates(m, t, tx, ty) {
  const face = tx < t.x ? -1 : 1, mx = t.x + face * CONFIG.physics.muzzle, my = t.y;
  const dx = tx - mx, dy = ty - my, len = Math.sqrt(dx * dx + dy * dy) || 1, nx = -dy / len, ny = dx / len;
  const P = (x, y) => [clampN(Math.round(x), 0, m.W - 1), clampN(Math.round(y), 0, m.H - 1)];
  const out = [];
  for (const o of [0, -150, 150, -300, 300, -500, 500, -750, 750]) out.push([P(mx + dx * 0.33 + nx * o, my + dy * 0.33 + ny * o), P(mx + dx * 0.67 + nx * o * 0.85, my + dy * 0.67 + ny * o * 0.85), P(tx, ty)]);
  for (const o of [-250, 250, -450, 450]) out.push([P(mx + dx * 0.33 + nx * o, my + dy * 0.33 + ny * o), P(mx + dx * 0.67 - nx * o, my + dy * 0.67 - ny * o), P(tx, ty)]);
  for (const v of [-1, 1]) for (const hgt of [300, 520]) out.push([P(mx + dx * 0.45, Math.min(my, ty) * (v < 0 ? 1 : 0) + Math.max(my, ty) * (v > 0 ? 1 : 0) + v * hgt), P(tx - face * 40, ty + v * 220), P(tx, ty)]);
  // overshoot the target slightly (useful for crawling and bouncing shots)
  out.push([P(mx + dx * 0.33, my + dy * 0.33), P(mx + dx * 0.67, my + dy * 0.67), P(tx + dx / len * 220, ty + dy / len * 220)]);
  return out;
}
function botBest(m, t, wIdx, foes, L, offOf) {
  const w = CONFIG.subs[t.subId].weapons[wIdx];
  let best = { score: -1e9 };
  for (const f of foes) {
    const off = offOf[f.id] || { x: 0, y: 0 }, ax = f.x + off.x, ay = f.y + off.y;
    for (const pts of botCandidates(m, t, ax, ay)) {
      const path = buildPath(t, pts);
      if (path.used < 3) continue;
      const r = botEval(m, t, w, path, f, L.currentSeen, ax, ay);
      if (r.score > best.score) best = { score: r.score, pts, gauge: Math.round(clampN(r.det / path.L * 1000, 0, 1000)), target: f, wIdx };
    }
  }
  return best;
}
// Decide one whole turn for the current sub: uses items, maybe moves, returns { pts, gauge, weapon } (null = no target).
function botPlan(m, level, rnd, mem) {
  const t = curSub(m), L = BOT_LEVELS[level] || BOT_LEVELS.normal;
  const foes = m.subs.filter(o => o.alive && o.team !== t.team);
  if (!foes.length) return null;
  const has = id => t.items.indexOf(id);
  if (has('heal') >= 0 && t.hp < t.maxhp * 0.55) cmdItem(m, has('heal'));
  else if (has('amplify') >= 0) cmdItem(m, has('amplify'));
  else if (has('double') >= 0) cmdItem(m, has('double'));
  else if (has('shield') >= 0) cmdItem(m, has('shield'));
  else if (has('calm') >= 0 && Math.abs(m.current) >= 3) cmdItem(m, has('calm'));
  const gauss = () => (rnd() + rnd() + rnd() - 1.5) / 1.5;
  const offOf = {};
  for (const f of foes) {
    const k = mem && mem[f.id] !== undefined ? mem[f.id] : 1, a10 = Math.floor(rnd() * 3600);
    offOf[f.id] = L.offset ? { x: L.offset * k * cosD10(a10) * (0.6 + 0.6 * rnd()), y: L.offset * k * sinD10(a10) * 0.5 } : { x: 0, y: 0 };
  }
  const plan = () => {
    let b = botBest(m, t, 0, foes, L, offOf);
    if (t.cd <= 0 && rnd() < L.special) { const b1 = botBest(m, t, 1, foes, L, offOf); if (b1.score >= b.score * 0.85 || b.score <= 0) b = b1; }
    return b;
  };
  let best = plan();
  // nothing reachable from here: drive toward the nearest enemy for a while and look again
  if (best.score <= 0 && t.fuel > 0) {
    const f = foes.slice().sort((a, b) => ((a.x - t.x) ** 2 + (a.y - t.y) ** 2) - ((b.x - t.x) ** 2 + (b.y - t.y) ** 2))[0];
    const ang = Math.atan2(f.y - t.y, f.x - t.x), d = ((Math.round(ang / (Math.PI / 4)) % 8) + 8) % 8;
    for (let k = 0; k < 220 && m.phase === 'aim'; k++) if (!cmdMove(m, d) && !cmdMove(m, (d + 7) % 8) && !cmdMove(m, (d + 1) % 8)) break;
    if (m.phase !== 'aim') return null;
    best = plan();
  }
  if (!best.pts) return null;
  if (mem && best.target) { const key = best.target.id, k = mem[key] === undefined ? 1 : mem[key]; mem[key] = Math.max(L.floor, k * L.learn); }
  const dist = Math.sqrt((best.target.x - t.x) ** 2 + (best.target.y - t.y) ** 2), spread = L.ptErr * (0.4 + dist / 2000);
  const pts = best.pts.map((p, i) => [clampN(Math.round(p[0] + gauss() * spread * (i + 1) / 3), 0, m.W - 1), clampN(Math.round(p[1] + gauss() * spread * (i + 1) / 3), 0, m.H - 1)]);
  const gauge = clampN(Math.round(best.gauge + gauss() * L.gaugeErr), 0, 1000);
  return { pts, gauge, weapon: best.wIdx, target: best.target.idx };
}
function botPlayTurn(m, level, rnd, mem) {
  const p = botPlan(m, level, rnd, mem);
  if (m.phase !== 'aim') return null;
  if (!p) return cmdTimeout(m);
  return cmdFire(m, p.pts, p.gauge, p.weapon, 0);
}
