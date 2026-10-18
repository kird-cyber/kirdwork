// ============================================================== MATCH CONTROLLER (no DOM)
// Turns frame-time input into fixed ticks. The curve's three points live relative to the sub (they move with it);
// holding fire runs the gauge light along the curve, releasing fires with the burst at the light.

function createController(match, opts) {
  opts = opts || {};
  const c = {
    match, acc: 0, log: [], hashes: match.hashes,
    keys: { left: false, right: false, up: false, down: false, fire: false },
    rel: [[100, 0], [200, 0], [300, 0]], charging: false, gauge: 0, weapon: 0, timeLeft: CONFIG.turn.timeLimitTicks,
    lastTurnSeen: 0, maxStepsPerFrame: 40, mem: {},
    onInput: opts.onInput || null,
    isLocal: opts.isLocal || (() => true),
    replay: opts.replay || null,
    remote: opts.remote || null,
  };
  c.frame = function (dtSec, cap, maxSteps) {
    c.acc += Math.min(dtSec, cap || 0.25);
    let n = 0; const lim = maxSteps || c.maxStepsPerFrame;
    while (c.acc >= TICK && n < lim) { c.tickOnce(); c.acc -= TICK; n++; }
    if (n >= lim) c.acc = Math.min(c.acc, cap ? cap : 0);
  };
  c.tickOnce = function () {
    const m = c.match;
    if (m.phase === 'aim') {
      if (m.turnNo !== c.lastTurnSeen) c.onTurnStart();
      const t = curSub(m);
      if (c.replay) { const inp = c.replay[m.turnNo]; if (inp) { applyTurnInput(m, inp); c.log.push(inp); } }
      else if (c.isLocal(t.idx)) c.localTick(t);
      else if (c.remote) c.remote(m, t);
    }
    step(m);
  };
  // a straight curve toward the nearest enemy (or ahead)
  // a level straight line toward the enemy side: it tells nothing about where anyone is
  c.defaultRel = function (t) {
    const m = c.match, d = CONFIG.subs[t.subId];
    let ex = 0, n = 0; for (const o of m.subs) if (o.alive && o.team !== t.team) { ex += o.x; n++; }
    const dir = n && ex / n < t.x ? -1 : 1, L = Math.min(1000, d.range * 0.4);
    return [[dir * L / 3, 0], [dir * L * 2 / 3, 0], [dir * L, 0]];
  };

  c.onTurnStart = function () {
    const m = c.match, t = curSub(m);
    c.lastTurnSeen = m.turnNo;
    const mem = c.mem[t.idx];
    c.rel = mem ? mem.rel.map(p => p.slice()) : c.defaultRel(t);
    c.gauge = 0; c.charging = false; c.weapon = 0; c.timeLeft = CONFIG.turn.timeLimitTicks;
    c.keys.fire = false; // Space held from before the turn must be pressed again
  };
  c.resetCurve = function () { const t = curSub(c.match); if (t && !c.charging) c.rel = c.defaultRel(t); };
  c.worldPts = function (t) {
    const m = c.match; t = t || curSub(m);
    return c.rel.map(p => [clampN(Math.round(t.x + p[0]), 0, m.W - 1), clampN(Math.round(t.y + p[1]), 0, m.H - 1)]);
  };
  c.setPoint = function (i, wx, wy) { const t = curSub(c.match); if (!t || c.charging) return; c.rel[i] = [wx - t.x, wy - t.y]; };
  // straight curve from the sub to (wx, wy)
  c.aimAt = function (wx, wy) { const t = curSub(c.match); if (!t || c.charging) return; const dx = wx - t.x, dy = wy - t.y; c.rel = [[dx / 3, dy / 3], [dx * 2 / 3, dy * 2 / 3], [dx, dy]]; };
  c.emit = function (inp) { if (!inp) return; c.log.push(inp); if (c.onInput) c.onInput(inp); };
  c.moveDir = function () {
    const k = c.keys, dx = (k.right ? 1 : 0) - (k.left ? 1 : 0), dy = (k.down ? 1 : 0) - (k.up ? 1 : 0);
    if (!dx && !dy) return -1;
    return [[5, 6, 7], [4, -1, 0], [3, 2, 1]][dy + 1][dx + 1];
  };
  c.localTick = function (t) {
    const m = c.match, k = c.keys;
    if (!c.charging) {
      const d = c.moveDir();
      if (d >= 0) cmdMove(m, d);
      if (m.phase !== 'aim') { c.emit(m.turn.endedInput); return; }
    }
    if (k.fire && !c.charging) { c.charging = true; c.gauge = 0; }
    if (c.charging) {
      c.gauge = Math.min(1000, c.gauge + 1000 / CONFIG.aim.gaugeTicks);
      if (!k.fire || c.gauge >= 1000) { c.fire(); return; }
    }
    c.timeLeft--;
    if (c.timeLeft <= 0) { if (c.charging) c.fire(); else c.emit(cmdTimeout(m)); } // time out mid-charge = fire
  };
  c.fire = function () {
    const m = c.match, t = curSub(m), pts = c.worldPts(t);
    c.charging = false;
    const path = buildPath(t, pts), b = pathAt(path, burstDistance(path, Math.round(c.gauge)));
    c.mem[t.idx] = { rel: c.rel.map(p => p.slice()), burst: [b.x, b.y] };
    c.emit(cmdFire(m, pts, Math.round(c.gauge), c.weapon, CONFIG.turn.timeLimitTicks - c.timeLeft));
  };
  c.selectWeapon = function (w) { const t = curSub(c.match); if (!t || (c.remote && !c.activeLocal())) return; if (w === 1 && t.cd > 0) return; c.weapon = w; };
  c.useItem = function (slot) { if (c.charging) return false; return cmdItem(c.match, slot); };
  c.activeLocal = function () { const m = c.match; return m.phase === 'aim' && !c.replay && c.isLocal(m.cur); };
  return c;
}
