// ============================================================== MATCH CONTROLLER (no DOM)
// Turns frame-time input into fixed ticks. Local (hotseat) now; in M4 a network transport plugs in here:
// the active device sends the TurnInput, every other device calls applyTurnInput.

function createController(match, opts) {
  opts = opts || {};
  const c = {
    match, acc: 0, log: [], hashes: match.hashes,
    keys: { left: false, right: false, up: false, down: false, fire: false },
    aimF: null, powerF: 0, charging: false, weapon: 0, timeLeft: CONFIG.turn.timeLimitTicks,
    lastTurnSeen: 0, maxStepsPerFrame: 40, limit: null,
    clock: opts.clock || (() => (typeof performance !== 'undefined' ? performance.now() : Date.now())),
    turnT0: 0, tickUsed: 0,                  // the turn clock: real time since the turn began, or ticks run if more
    onInput: opts.onInput || null,
    preTick: opts.preTick || null,          // (match, ctrl) before each aim tick; true = skip this tick's input (solo clock)          // called with every TurnInput the local side produces
    isLocal: opts.isLocal || (() => true),  // does this device control tank idx?
    replay: opts.replay || null,            // map turnNo -> TurnInput (replay / remote)
    remote: opts.remote || null,            // online: called on aim ticks of tanks this device does not control
  };
  // cap: longest real-time gap to catch up in one call (a hidden tab catches up in bigger chunks)
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
      if (c.preTick && c.preTick(m, c)) { step(m); return; }
      const t = curTank(m);
      if (c.replay) {
        const inp = c.replay[m.turnNo];
        if (inp) { applyTurnInput(m, inp); c.log.push(inp); }
      } else if (c.isLocal(t.idx)) {
        c.localTick(t);
      } else if (c.remote) {
        c.remote(m, t);
      }
    }
    step(m);
  };
  c.onTurnStart = function () {
    const m = c.match, t = curTank(m);
    c.lastTurnSeen = m.turnNo;
    c.aimF = t.aim; c.powerF = 0; c.charging = false; c.weapon = 0; c.timeLeft = CONFIG.turn.timeLimitTicks;
    c.turnT0 = c.clock(); c.tickUsed = 0;
  };
  // time used = real time since the turn began (frames dropped, a frozen page or a background tab all count),
  // or the ticks actually run when that is more (tests fast-forward ticks)
  c.syncTime = function () {
    const wall = Math.floor((c.clock() - c.turnT0) / 1000 * CONFIG.physics.tickRate);
    c.timeLeft = Math.max(0, CONFIG.turn.timeLimitTicks - Math.max(c.tickUsed, wall));
  };
  // called by a timer even while the page is hidden: the local player's turn still runs out on time
  c.checkTime = function () {
    if (!c.activeLocal() || c.match.turnNo !== c.lastTurnSeen) return;
    c.syncTime();
    if (c.timeLeft <= 0) { c.charging = false; c.emit(cmdTimeout(c.match)); }
  };
  c.emit = function (inp) { if (!inp) return; c.log.push(inp); if (c.onInput) c.onInput(inp); };
  c.localTick = function (t) {
    const m = c.match, d = CONFIG.tanks[t.tankId], k = c.keys;
    if (!c.charging) {
      if (k.left && !k.right) cmdMove(m, -1);
      else if (k.right && !k.left) cmdMove(m, 1);
      if (m.phase !== 'aim') { c.emit(m.turn.endedInput); return; }
      c.limit = null;
      if (k.up) { c.aimF = Math.min(d.angleMax, c.aimF + 30 * TICK); if (c.aimF >= d.angleMax) c.limit = 'max'; }
      if (k.down) { c.aimF = Math.max(d.angleMin, c.aimF - 30 * TICK); if (c.aimF <= d.angleMin) c.limit = 'min'; }
      t.aim = Math.round(c.aimF);
    }
    if (k.fire && !c.charging) { c.charging = true; c.powerF = 0; }
    if (c.charging) {
      c.powerF = Math.min(1000, c.powerF + 500 * TICK); // full power in 2 s
      if (!k.fire || c.powerF >= 1000) { c.fire(); return; }
    }
    c.tickUsed++; c.syncTime();
    if (c.timeLeft <= 0) c.emit(cmdTimeout(m));
  };
  c.fire = function () {
    const m = c.match, t = curTank(m);
    c.charging = false;
    c.syncTime(); c.emit(cmdFire(m, t.aim, Math.round(c.powerF), c.weapon, CONFIG.turn.timeLimitTicks - c.timeLeft));
  };
  // 턴 넘기기 (only for the local active tank, never mid-charge)
  c.pass = function () { if (!c.activeLocal() || c.charging) return false; c.syncTime(); c.emit(cmdPass(c.match, CONFIG.turn.timeLimitTicks - c.timeLeft)); return true; };
  c.selectWeapon = function (w) { const t = curTank(c.match); if (!t || (c.remote && !c.activeLocal())) return; if (w === 1 && t.cd > 0) return; c.weapon = w; };
  c.useItem = function (slot, tx, ty) { if (c.charging) return false; return cmdItem(c.match, slot, tx, ty); };
  c.activeLocal = function () { const m = c.match; return m.phase === 'aim' && !c.replay && c.isLocal(m.cur); };
  return c;
}
