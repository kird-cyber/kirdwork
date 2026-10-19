// ============================================================== SIMULATION (pure logic, no DOM, no clock, no Math.random)
// A match changes only through: beginning a turn, aim-phase commands (move / item / fire / timeout) and step() ticks.
// Same seed + same TurnInputs => identical state on every device.
// Torpedoes follow a curve the player draws through three points; the gauge picks where on the curve they burst.

const TICK = 1 / CONFIG.physics.tickRate;
const DIAG = 0.7071067811865476;
// 8 move directions: 0 = right, then clockwise (y grows downward)
const DIRS = [[1, 0], [DIAG, DIAG], [0, 1], [-DIAG, DIAG], [-1, 0], [-DIAG, -DIAG], [0, -1], [DIAG, -DIAG]];

function createMatch(opts) {
  // opts: { seed, mapId, players: [{ id, nick, team: 'red'|'blue', subId }] }
  const map = buildMap(opts.mapId);
  const m = {
    cfgVersion: CONFIG.version, seed: opts.seed >>> 0, rng: opts.seed >>> 0,
    mapId: opts.mapId, W: map.W, H: map.H, mask: map.mask, theme: map.theme,
    tick: 0, turnNo: 0, current: 0, cur: -1, phase: 'settle', settle: 40, winner: null,
    subs: [], proj: [], crates: [], sched: [], schedSeq: 0, falls: [],
    turn: null, hashes: {}, events: [], spawns: map.spawns,
    rules: (CONFIG.maps[opts.mapId] && CONFIG.maps[opts.mapId].rules) || {},
  };
  m.mines = (m.rules.mines || []).map(([x, y], i) => ({ x, y, alive: true, id: i }));
  // start positions: a random window of the map (sorted by x), teams interleaved left to right, never too close
  const n = opts.players.length, T0 = CONFIG.turn, sorted = map.spawns.slice().sort((a, b) => a.x - b.x || a.y - b.y);
  const span = Math.max(T0.startSpan, (n - 1) * T0.startGap);
  const starts = sorted.map((s, i) => i).filter(i => sorted.filter(s => s.x >= sorted[i].x && s.x <= sorted[i].x + span).length >= n);
  let chosen = null;
  for (let tries = 0; tries < 24 && !chosen; tries++) {
    const lo = starts.length ? sorted[starts[Math.floor(rngNext(m) * starts.length)]].x : sorted[0].x;
    const win = starts.length ? sorted.filter(s => s.x >= lo && s.x <= lo + span) : sorted.slice();
    for (let i = win.length - 1; i > 0; i--) { const j = Math.floor(rngNext(m) * (i + 1)); const t = win[i]; win[i] = win[j]; win[j] = t; }
    const pick = win.slice(0, n).sort((a, b) => a.x - b.x);
    if (pick[pick.length - 1].x - pick[0].x >= Math.min(T0.startMin, span) || tries === 23) chosen = pick;
  }
  const reds = [], blues = [];
  opts.players.forEach((p, i) => (p.team === 'red' ? reds : blues).push(i));
  const shuffle = arr => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rngNext(m) * (i + 1)); const t = arr[i]; arr[i] = arr[j]; arr[j] = t; } return arr; };
  shuffle(reds); shuffle(blues);
  const big = reds.length >= blues.length ? reds : blues, small = big === reds ? blues : reds;
  const smallSlots = new Set(small.map((_, i) => Math.floor((i + 0.5) * n / small.length)));
  const order = [];
  for (let k = 0, bi = 0, si = 0; k < n; k++) order.push(smallSlots.has(k) && si < small.length ? small[si++] : big[bi++]);
  if (rngNext(m) < 0.5) order.reverse();
  const spawnOf = {}; order.forEach((pi, k) => { spawnOf[pi] = chosen[k]; });
  opts.players.forEach((p, i) => {
    const d = CONFIG.subs[p.subId], sp = spawnOf[i];
    m.subs.push({
      idx: i, id: p.id, nick: p.nick, team: p.team, subId: p.subId,
      x: sp.x, y: sp.y, hp: d.hp, maxhp: d.hp, facing: sp.x < m.W / 2 ? 1 : -1,
      delay: Math.floor(rngNext(m) * 120), alive: true, shock: null, shield: false, cd: 0, items: [],
      fuel: d.movePx, lastPts: null, lastGauge: -1, deathCause: '', lastBy: -1,
      st: { dealt: 0, taken: 0, friendly: 0, kills: 0, outs: 0, shots: 0, hitTurns: 0, lastHit: 0 },
    });
  });
  return m;
}

// ---------------------------------------------------------------- terrain queries
function solidAt(m, x, y) {
  x = Math.floor(x); y = Math.floor(y);
  if (x < 0 || y < 0 || x >= m.W || y >= m.H) return false;
  if (m.mask[y * m.W + x] !== 0) return true;
  if (m.mines.length) { const r = m.rules.mine.r; for (const q of m.mines) if (q.alive && (x - q.x) * (x - q.x) + (y - q.y) * (y - q.y) <= r * r) return true; }
  return false;
}
function outOfMap(m, x, y) { return x < 0 || y < 0 || x >= m.W || y >= m.H; }
// dig an ellipse out of the rock (bedrock stays)
function carveEllipse(m, cx, cy, rx, ry) {
  if (rx < 1 || ry < 1) return 0;
  const W = m.W, H = m.H, mask = m.mask;
  const y0 = Math.max(0, Math.floor(cy - ry)), y1 = Math.min(H - 1, Math.ceil(cy + ry));
  let n = 0;
  for (let y = y0; y <= y1; y++) {
    const dy = (y - cy) / ry, d2 = 1 - dy * dy;
    if (d2 < 0) continue;
    const dx = rx * Math.sqrt(d2);
    const xa = Math.max(0, Math.floor(cx - dx)), xb = Math.min(W - 1, Math.ceil(cx + dx));
    for (let i = y * W + xa, e = y * W + xb; i <= e; i++) if (mask[i] === 1) { mask[i] = 0; n++; }
  }
  m.events.push({ type: 'carve', x: cx, y: cy, rx, ry });
  return n;
}
// dig a rectangle (큐브 map: square bursts)
function carveBox(m, cx, cy, rx, ry) {
  if (rx < 1 || ry < 1) return 0;
  const W = m.W, mask = m.mask, x0 = Math.max(0, Math.floor(cx - rx)), x1 = Math.min(W - 1, Math.ceil(cx + rx)), y0 = Math.max(0, Math.floor(cy - ry)), y1 = Math.min(m.H - 1, Math.ceil(cy + ry));
  let n = 0;
  for (let y = y0; y <= y1; y++) for (let i = y * W + x0, e = y * W + x1; i <= e; i++) if (mask[i] === 1) { mask[i] = 0; n++; }
  m.events.push({ type: 'carve', x: cx, y: cy, rx, ry, box: true });
  return n;
}
// outward surface normal at a rock contact point: average of the water directions around it
function rockNormal(m, x, y) {
  let nx = 0, ny = 0;
  for (let k = 0; k < 16; k++) {
    const a10 = k * 225, c = cosD10(a10), s = sinD10(a10);
    if (!solidAt(m, x + 8 * c, y + 8 * s)) { nx += c; ny += s; }
  }
  const l = Math.sqrt(nx * nx + ny * ny);
  return l > 1e-9 ? { x: nx / l, y: ny / l } : { x: 0, y: -1 };
}

// ---------------------------------------------------------------- submarine geometry
function inHull(s, x, y, pad) {
  const P = CONFIG.physics, dx = (x - s.x) / (P.hullRx + (pad || 0)), dy = (y - s.y) / (P.hullRy + (pad || 0));
  return dx * dx + dy * dy <= 1;
}
// hull fits at (x, y): no rock under its outline (outside the map counts as water)
function hullFree(m, x, y) {
  const P = CONFIG.physics;
  if (solidAt(m, x, y)) return false;
  for (let k = 0; k < 12; k++) { const a10 = k * 300; if (solidAt(m, x + P.hullRx * cosD10(a10), y + P.hullRy * sinD10(a10))) return false; }
  return !solidAt(m, x + P.hullRx * 0.5, y) && !solidAt(m, x - P.hullRx * 0.5, y);
}
function hullsOverlap(ax, ay, bx, by) {
  const P = CONFIG.physics, dx = (ax - bx) / (2 * P.hullRx), dy = (ay - by) / (2 * P.hullRy);
  return dx * dx + dy * dy < 1;
}

// ---------------------------------------------------------------- damage
// by = the sub that caused it (null for sudden death)
function hurt(m, t, dmg, kind, by) {
  if (!t.alive || dmg <= 0) return;
  const real = Math.min(t.hp, dmg);
  t.hp = Math.max(0, t.hp - dmg);
  t.st.taken += real;
  if (by && by !== t) {
    if (by.team === t.team) by.st.friendly += real;
    else {
      by.st.dealt += real; t.lastBy = by.idx;
      if (kind !== 'shock' && by.st.lastHit !== m.turnNo) { by.st.lastHit = m.turnNo; by.st.hitTurns++; }
      if (t.hp <= 0) by.st.kills++;
    }
  }
  m.events.push({ type: 'dmg', idx: t.idx, x: t.x, y: t.y, amount: dmg, kind: kind || 'hit' });
  if (t.hp <= 0) { t.alive = false; t.deathCause = kind || 'hit'; m.events.push({ type: 'death', idx: t.idx, x: t.x, y: t.y }); }
}
// pushed out of the open map edge
function ringOut(m, t, by) {
  if (!t.alive) return;
  t.alive = false; t.hp = 0; t.deathCause = 'out';
  if (by && by.team !== t.team) { by.st.kills++; by.st.outs++; }
  m.events.push({ type: 'ringout', idx: t.idx, x: t.x, y: t.y });
}
// a burst: ellipse (rx, ry) or a cross of two thin ellipses. Damage falls from 100% at the centre to edgeDmg at the edge.
// Bursts reach through rock: that is how a tall burst hits a sub hiding under an overhang.
function explode(m, x, y, sh, dmg, owner, opts) {
  opts = opts || {};
  const P = CONFIG.physics, R = m.rules, box = !!R.box, cm = P.carveMul * (opts.carveMul || 1) * (R.carveMul || 1), pad = P.bodyPad;
  const dig = box ? carveBox : carveEllipse;
  let carved = 0;
  if (sh.thin) { carved += dig(m, x, y, sh.rx * cm, sh.thin * cm); carved += dig(m, x, y, sh.thin * cm, sh.ry * cm); }
  else carved += dig(m, x, y, sh.rx * cm, sh.ry * cm);
  // distance inside the shape: 0 centre .. 1 edge (square norm on the 큐브 map)
  const norm = (a, b) => box ? Math.max(Math.abs(a), Math.abs(b)) : Math.sqrt(a * a + b * b);
  const hit = [];
  for (const t of m.subs) {
    if (!t.alive) continue;
    const dx = t.x - x, dy = t.y - y;
    let n;
    if (sh.thin) n = Math.min(norm(dx / (sh.rx + pad), dy / (sh.thin + pad)), norm(dx / (sh.thin + pad), dy / (sh.ry + pad)));
    else n = norm(dx / (sh.rx + pad), dy / (sh.ry + pad));
    if (n > 1) continue;
    let v = dmg * (1 - (1 - P.edgeDmg) * n);
    if (t.shield) v *= CONFIG.items.shield.mul;
    const g = R.guard; if (g && t.x >= g.x0 && t.x <= g.x1 && t.y >= g.y0 && t.y <= g.y1) v *= g.mul;
    hurt(m, t, Math.round(v), owner && owner.team === t.team ? 'friendly' : 'hit', owner);
    hit.push(t);
  }
  for (const c of m.crates) if (!c.dead) { const a = (c.x - x) / (sh.rx + 10), b = (c.y - y) / (sh.ry + 10); if (norm(a, b) <= 1) c.dead = true; }
  m.events.push({ type: 'boom', x, y, rx: sh.rx, ry: sh.ry, thin: sh.thin || 0, kind: opts.fx || 'hit', idx: owner ? owner.idx : -1, box });
  // 기뢰: every mine inside the burst goes off a moment later (chains)
  for (const q of m.mines) {
    if (!q.alive) continue;
    const r = m.rules.mine.r;
    if (norm((q.x - x) / (Math.max(sh.rx, sh.thin || 0) + r), (q.y - y) / (Math.max(sh.ry, sh.thin || 0) + r)) <= 1) { q.alive = false; schedule(m, 10, { kind: 'mine', x: q.x, y: q.y, idx: owner ? owner.idx : -1 }); }
  }
  // 낙석: a burst under the cave ceiling brings a stalactite down
  if (R.rockfall && !opts.rock) {
    const F = R.rockfall;
    for (let k = 20; k <= F.reach; k += 8) if (solidAt(m, x, y - Math.max(sh.ry, sh.thin || 0) * 0.5 - k)) {
      const ry = y - Math.max(sh.ry, sh.thin || 0) * 0.5 - k;
      if (ry <= F.ceilY && rngNext(m) < F.chance) { m.falls.push({ x, y: ry + 16, by: owner ? owner.idx : -1, id: m.schedSeq++ }); m.events.push({ type: 'rockfall', x, y: ry }); }
      break;
    }
  }
  // 화석 발굴: digging rock sometimes uncovers a supply crate right there
  if (R.fossil && carved > 300 && !opts.rock && rngNext(m) < R.fossil) {
    const keys = Object.keys(CONFIG.items); let total = 0; for (const k of keys) total += CONFIG.items[k].dropWeight;
    let r = rngNext(m) * total, item = keys[0]; for (const k of keys) { r -= CONFIG.items[k].dropWeight; if (r < 0) { item = k; break; } }
    if (clearAround(m.mask, m.W, m.H, x, y, 30, 30)) { const c = { x: Math.round(x), y: Math.round(y), item, dead: false, id: m.schedSeq++, born: m.turnNo }; m.crates.push(c); m.events.push({ type: 'crate', x: c.x, y: c.y, item, id: c.id, fossil: true }); }
  }
  return hit;
}
// water push on a torpedo at (x, y) for one 3-px step: the turn's current plus the map's own water (zones)
function driftAt(m, x, y) {
  const P = CONFIG.physics, R = m.rules, k = 3 / P.torpSpeed;
  let cx = m.current * P.currentPush * (R.currentMul || 1), cy = 0;
  if (R.tri && inTri(x, y, R.tri)) cx *= R.triMul;
  if (R.swirl) { const w = R.swirl, dx = x - w.x, dy = y - w.y, d = Math.sqrt(dx * dx + dy * dy); if (d < w.r && d > 1) { const f = w.v * (1 - d / w.r); cx += -dy / d * f; cy += dx / d * f; } }
  if (R.lift) for (const z of R.lift) if (x >= z[0] && x <= z[1] && y >= z[2] && y <= z[3]) cy -= z[4];
  return [cx * k, cy * k];
}
function inTri(x, y, t) {
  const s = (a, b) => (b[0] - a[0]) * (y - a[1]) - (b[1] - a[1]) * (x - a[0]);
  const d1 = s(t[0], t[1]), d2 = s(t[1], t[2]), d3 = s(t[2], t[0]);
  return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
}
// falling stalactites (케이브): straight down, burst on rock or a hull
function stepFalls(m) {
  const F = m.rules.rockfall;
  for (const f of m.falls) {
    if (f.dead) continue;
    f.y += 5;
    const hitSub = m.subs.some(t => t.alive && inHull(t, f.x, f.y, 6));
    if (f.y >= m.H - 2 || hitSub || solidAt(m, f.x, f.y + 6)) {
      f.dead = true;
      explode(m, f.x, f.y, { rx: F.r, ry: F.r }, F.dmg, f.by >= 0 ? m.subs[f.by] : null, { rock: true, carveMul: 0.6, fx: 'rock' });
    }
  }
  m.falls = m.falls.filter(f => !f.dead);
}
function schedule(m, ticks, ev) { ev.at = m.tick + ticks; ev.seq = m.schedSeq++; m.sched.push(ev); }

// ---------------------------------------------------------------- the drawn curve
// Catmull-Rom through muzzle -> P1 -> P2 -> P3. A point whose bend exceeds the sub's turn limit (and every point after it)
// is dropped; the curve is cut at the sub's range. Pure: does not touch the match.
function buildPath(t, pts) {
  const d = CONFIG.subs[t.subId], A = CONFIG.aim, P = CONFIG.physics;
  const face = pts[0][0] < t.x ? -1 : pts[0][0] > t.x ? 1 : t.facing;
  const list = [{ x: t.x + face * P.muzzle, y: t.y }];
  const cosLim = cosD10(d.turn * 10);
  for (const p of pts) {
    const last = list[list.length - 1], bx = p[0] - last.x, by = p[1] - last.y, lb = Math.sqrt(bx * bx + by * by);
    if (lb < A.minPointGap) continue;
    if (list.length >= 2) {
      const prev = list[list.length - 2], ax = last.x - prev.x, ay = last.y - prev.y, la = Math.sqrt(ax * ax + ay * ay);
      if ((ax * bx + ay * by) / (la * lb) < cosLim) break;
    }
    list.push({ x: p[0], y: p[1] });
  }
  if (list.length === 1) list.push({ x: list[0].x + face * 100, y: list[0].y });
  const n = list.length, ext = [{ x: 2 * list[0].x - list[1].x, y: 2 * list[0].y - list[1].y }].concat(list, [{ x: 2 * list[n - 1].x - list[n - 2].x, y: 2 * list[n - 1].y - list[n - 2].y }]);
  const xs = [list[0].x], ys = [list[0].y], ss = [0];
  let L = 0, done = false;
  for (let i = 1; i < ext.length - 2 && !done; i++) {
    const p0 = ext[i - 1], p1 = ext[i], p2 = ext[i + 1], p3 = ext[i + 2];
    for (let k = 1; k <= A.segSamples; k++) {
      const u = k / A.segSamples, u2 = u * u, u3 = u2 * u;
      let x = 0.5 * (2 * p1.x + (-p0.x + p2.x) * u + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * u2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * u3);
      let y = 0.5 * (2 * p1.y + (-p0.y + p2.y) * u + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * u2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * u3);
      const lx = xs[xs.length - 1], ly = ys[ys.length - 1], seg = Math.sqrt((x - lx) * (x - lx) + (y - ly) * (y - ly));
      if (seg < 1e-9) continue;
      if (L + seg >= d.range) { const f = (d.range - L) / seg; x = lx + (x - lx) * f; y = ly + (y - ly) * f; L = d.range; xs.push(x); ys.push(y); ss.push(L); done = true; break; }
      L += seg; xs.push(x); ys.push(y); ss.push(L);
    }
  }
  return { xs, ys, ss, L, face, used: list.length - 1 };
}
// point + unit tangent at distance s along the path (clamped to its ends)
function pathAt(path, s) {
  const ss = path.ss, n = ss.length;
  if (n < 2) return { x: path.xs[0], y: path.ys[0], tx: 1, ty: 0 };
  if (s <= 0) s = 0; if (s >= path.L) s = path.L;
  let lo = 0, hi = n - 1;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (ss[mid] <= s) lo = mid; else hi = mid; }
  const seg = ss[hi] - ss[lo], f = seg > 0 ? (s - ss[lo]) / seg : 0;
  const dx = path.xs[hi] - path.xs[lo], dy = path.ys[hi] - path.ys[lo], l = Math.sqrt(dx * dx + dy * dy) || 1;
  return { x: path.xs[lo] + dx * f, y: path.ys[lo] + dy * f, tx: dx / l, ty: dy / l };
}
function burstDistance(path, gauge) { return Math.max(Math.min(CONFIG.aim.minDet, path.L), path.L * gauge / 1000); }

// ---------------------------------------------------------------- aim-phase commands (state changes are instant, never time-based)
function curSub(m) { return m.cur >= 0 ? m.subs[m.cur] : null; }
function recordAction(m, a) {
  const acts = m.turn.actions, last = acts[acts.length - 1];
  if (a.t === 'm' && last && last.t === 'm' && last.d === a.d) last.n++;
  else acts.push(a);
}
// one movement step (0.5 px) in direction d (0..7). Moving into another sub pushes it; a pushed sub that cannot move
// is crushed against the rock; one pushed past the map edge is out. Returns true if the sub moved.
function cmdMove(m, d) {
  const t = curSub(m);
  if (m.phase !== 'aim' || !t || !t.alive || t.fuel <= 0 || !DIRS[d]) return false;
  const P = CONFIG.physics, R = CONFIG.ram, def = CONFIG.subs[t.subId], st = P.moveStep;
  const ux = DIRS[d][0], uy = DIRS[d][1];
  if (ux > 0) t.facing = 1; else if (ux < 0) t.facing = -1;
  recordAction(m, { t: 'm', d, n: 1 });
  const nx = t.x + ux * st, ny = t.y + uy * st, M = P.edgeMargin;
  if ((nx < M && ux < 0) || (nx > m.W - M && ux > 0) || (ny < M && uy < 0) || (ny > m.H - M && uy > 0) || !hullFree(m, nx, ny)) return false; // a sub pushed into the margin can still move back out
  for (const o of m.subs) {
    if (o === t || !o.alive || !hullsOverlap(nx, ny, o.x, o.y)) continue;
    const enemy = o.team !== t.team;
    if (enemy && !m.turn.rammed[o.idx]) { m.turn.rammed[o.idx] = 1; hurt(m, o, Math.round((R.base + R.perHull * def.hull) * (def.ramMul || 1)), 'ram', t); m.events.push({ type: 'ram', x: (t.x + o.x) / 2, y: (t.y + o.y) / 2 }); }
    if (!o.alive) continue;
    const ox = o.x + ux * st, oy = o.y + uy * st;
    if (outOfMap(m, ox, oy)) { o.x = ox; o.y = oy; ringOut(m, o, t); continue; }
    const third = m.subs.some(q => q !== o && q !== t && q.alive && hullsOverlap(ox, oy, q.x, q.y));
    if (third || !hullFree(m, ox, oy)) {
      if (enemy && !third && !m.turn.crushed[o.idx]) { m.turn.crushed[o.idx] = 1; hurt(m, o, Math.round(R.wall * (def.ramMul || 1)), 'crush', t); m.events.push({ type: 'crush', x: o.x, y: o.y }); }
      return false;
    }
    o.x = ox; o.y = oy;
  }
  t.x = nx; t.y = ny;
  t.fuel = Math.max(0, t.fuel - st);
  m.turn.movedPx += st;
  pickupCrates(m, t);
  return true;
}
// a crate is taken when the sub's drawn body reaches it (not only its centre). A full bag says so once per crate.
function pickupCrates(m, t) {
  const T = CONFIG.turn;
  for (const c of m.crates) {
    if (c.dead) continue;
    const a = (c.x - t.x) / T.pickupRx, b = (c.y - t.y) / T.pickupRy;
    if (a * a + b * b >= 1) continue;
    if (t.items.length >= T.inventoryMax) { if (m.turn && !m.turn.fullSaid) { m.turn.fullSaid = 1; m.events.push({ type: 'bagfull', idx: t.idx, x: t.x, y: t.y }); } continue; }
    c.dead = true; t.items.push(c.item); m.events.push({ type: 'pickup', idx: t.idx, x: t.x, y: t.y, item: c.item });
  }
  m.crates = m.crates.filter(c => !c.dead);
}
function cmdItem(m, slot) {
  const t = curSub(m);
  if (m.phase !== 'aim' || !t || m.turn.itemUsed) return false;
  if (!Number.isInteger(slot) || slot < 0 || slot >= t.items.length) return false;
  const id = t.items[slot]; if (!Object.prototype.hasOwnProperty.call(CONFIG.items, id)) return false;
  const it = CONFIG.items[id];
  if (it.effect === 'heal') { const v = Math.min(it.amount, t.maxhp - t.hp); t.hp += v; m.events.push({ type: 'heal', idx: t.idx, x: t.x, y: t.y, amount: v }); }
  else if (it.effect === 'shield') t.shield = true;
  else if (it.effect === 'amplify') m.turn.amp = true;
  else if (it.effect === 'fuel') t.fuel += CONFIG.subs[t.subId].movePx;
  else if (it.effect === 'calm') m.turn.calm = true;
  else if (it.effect === 'double') m.turn.double = true;
  else if (it.effect === 'tele') m.turn.tele = true;
  t.items.splice(slot, 1);
  m.turn.itemUsed = true;
  m.events.push({ type: 'item', idx: t.idx, item: id });
  recordAction(m, { t: 'i', s: slot });
  return true;
}
function inputOf(m, extra) {
  return Object.assign({ turnNo: m.turnNo, seat: curSub(m).id, actions: m.turn.actions.map(a => Object.assign({}, a)) }, extra);
}
function cleanPts(m, pts) {
  const out = [];
  const xl = m.rules.wrapX ? -m.W / 2 : 0, xh = m.rules.wrapX ? m.W * 1.5 : m.W - 1; // 12신: points may lie past the side edges (the shot wraps)
  for (let i = 0; i < 3; i++) { const p = pts && pts[i] ? pts[i] : [0, 0]; out.push([clampN(Math.round(+p[0] || 0), xl, xh), clampN(Math.round(+p[1] || 0), 0, m.H - 1)]); }
  return out;
}
// Fire: pts = three [x, y] world points (integers), gauge 0..1000 (burst point along the curve), weapon 0|1, used = ticks spent.
function cmdFire(m, pts, gauge, weapon, used) {
  const t = curSub(m);
  if (m.phase !== 'aim' || !t || !t.alive) return null;
  const d = CONFIG.subs[t.subId];
  pts = cleanPts(m, pts);
  gauge = clampN(Math.round(+gauge || 0), 0, 1000);
  weapon = weapon === 1 && t.cd <= 0 ? 1 : 0;
  used = clampN(Math.round(+used || 0), 0, CONFIG.turn.timeLimitTicks);
  const input = inputOf(m, { pts, gauge, weapon, used });
  const w = d.weapons[weapon], path = buildPath(t, pts);
  t.facing = path.face; t.lastPts = pts; t.lastGauge = gauge;
  t.st.shots++;
  const det = burstDistance(path, gauge), base = { idx: t.idx, wIdx: weapon, amp: !!m.turn.amp, calm: !!m.turn.calm };
  if (m.turn.tele) launch(m, Object.assign({ mode: 'path', path, s: 0, det, off: 0, tele: true }, base)); // 순간이동: one carrier shot, no burst
  else {
    // 2연발: the same shot again, gapTicks later (it waits at the muzzle, unseen)
    const shots = m.turn.double ? [0, CONFIG.items.double.gapTicks] : [0];
    for (const wait of shots) {
      if (w.kind === 'twin') for (const off of [-w.gap / 2, w.gap / 2]) launch(m, Object.assign({ mode: 'path', path, s: 0, det, off, wait }, base));
      else launch(m, Object.assign({ mode: 'path', path, s: 0, det, off: 0, wait }, base));
    }
  }
  if (w.cooldownTurns) t.cd = w.cooldownTurns + 1; // +1: the count drops at the start of this sub's next turn
  const dbl = m.turn.double && !m.turn.tele ? CONFIG.items.double.delay + (w.extraDelay || 0) : 0; // 2연발 costs time (a special weapon's wait twice)
  t.delay += CONFIG.turn.baseDelay[d.speedClass] + (w.extraDelay || 0) + dbl + m.turn.movedPx * CONFIG.turn.delayPerMovePx + (m.turn.itemUsed ? CONFIG.turn.itemDelay : 0)
    + Math.round(used / CONFIG.physics.tickRate * CONFIG.turn.delayPerSec);
  m.phase = 'flight'; m.settle = 0;
  m.events.push({ type: 'fire', idx: t.idx, weapon, x: path.xs[0], y: path.ys[0] });
  return input;
}
function launch(m, p) {
  const a = pathAt(p.path, 0);
  p.x = a.x - a.ty * p.off; p.y = a.y + a.tx * p.off; p.dx = a.tx; p.dy = a.ty; p.ox = 0; p.oy = 0; p.age = 0; p.grazed = []; p.id = m.schedSeq++; p.wait = p.wait || 0;
  m.proj.push(p);
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
  const t = curSub(m);
  if (m.phase !== 'aim' || !t) return null;
  const input = inputOf(m, { timeout: true });
  const d = CONFIG.subs[t.subId];
  t.delay += CONFIG.turn.baseDelay[d.speedClass] + CONFIG.turn.skipDelay + m.turn.movedPx * CONFIG.turn.delayPerMovePx
    + Math.round(CONFIG.turn.timeLimitTicks / CONFIG.physics.tickRate * CONFIG.turn.delayPerSec);
  m.phase = 'settle'; m.settle = 0;
  m.events.push({ type: 'timeout', idx: t.idx });
  return input;
}
// Replay a TurnInput from another device (or a recording). Must be called at the start of that aim phase.
function applyTurnInput(m, input) {
  if (!input || typeof input !== 'object' || m.phase !== 'aim' || input.turnNo !== m.turnNo) return false;
  if (curSub(m).id !== input.seat) return false;
  // refused moves are recorded too (a held key keeps trying), so every recorded unit must be replayed; a real turn has at
  // most one unit per tick, so a corrupted input (n = 1e10, endless list) is cut at that budget instead of freezing clients
  const acts = Array.isArray(input.actions) ? input.actions : [];
  let budget = CONFIG.turn.maxUnits;
  for (const a of acts) {
    if (!a || budget <= 0) break;
    if (a.t === 'm') { const n = clampN(Math.floor(+a.n || 0), 0, budget); budget -= n; for (let i = 0; i < n && m.phase === 'aim'; i++) cmdMove(m, a.d); }
    else if (a.t === 'i') { budget--; cmdItem(m, a.s); }
    if (m.phase !== 'aim') break;
  }
  if (m.phase === 'aim') {
    if (input.forfeit) cmdForfeit(m, input.forfeit);
    else if (input.timeout) cmdTimeout(m); else cmdFire(m, input.pts, input.gauge, input.weapon, input.used);
  }
  return true;
}

// ---------------------------------------------------------------- torpedoes
const TELE_W = { id: 'tele', kind: 'tele', dmg: 0, rx: 0, ry: 0 }; // the 순간이동 carrier: flies the curve, passes subs, never bursts
function weaponOf(m, p) { return p.tele ? TELE_W : CONFIG.subs[m.subs[p.idx].subId].weapons[p.wIdx]; }
function dmgOf(m, p, base) { return base * (p.amp ? CONFIG.items.amplify.mul : 1); }
// one 3-px sub-step of a torpedo. Returns nothing; marks p.dead when it bursts or leaves.
function stepTorp(m, p, w) {
  const P = CONFIG.physics, h = 3;
  const dv = p.calm || p.mode === 'fall' || p.mode === 'crawl' ? null : driftAt(m, p.x, p.y), drift = dv ? dv[0] : 0, lift = dv ? dv[1] : 0;
  const px = p.x, py = p.y;
  if (p.mode === 'path') {
    p.s += h;
    if (w.kind === 'homing' && !p.homed && p.s >= p.det * 0.55) {
      const tg = nearestFoe(m, p.idx, p.x, p.y, w.seek);
      if (tg) { const a = pathAt(p.path, p.s); p.homed = true; p.mode = 'free'; p.dx = a.tx; p.dy = a.ty; p.rem = p.det - p.s + w.seek; p.target = tg.idx; p.turnLeft = w.turnMax * 10; }
    }
    if (p.mode === 'path') {
      const a = pathAt(p.path, p.s);
      p.ox += drift; p.oy = (p.oy || 0) + lift; p.x = a.x - a.ty * p.off + p.ox; p.y = a.y + a.tx * p.off + p.oy; p.dx = a.tx; p.dy = a.ty;
    }
  }
  if (p.mode === 'free') {
    if (p.target >= 0 && p.turnLeft > 0 && m.subs[p.target].alive) {
      const tg = m.subs[p.target], ex = tg.x - p.x, ey = tg.y - p.y, el = Math.sqrt(ex * ex + ey * ey);
      if (el > 1e-6) {
        const ux = ex / el, uy = ey / el, dot = p.dx * ux + p.dy * uy, step = 30;
        if (dot >= cosD10(step)) { p.dx = ux; p.dy = uy; }
        else { const sg = p.dx * uy - p.dy * ux >= 0 ? 1 : -1, c = cosD10(step), s = sinD10(step) * sg; const nx = p.dx * c - p.dy * s, ny = p.dx * s + p.dy * c; p.dx = nx; p.dy = ny; }
        p.turnLeft -= step;
      }
    }
    p.x += p.dx * h + drift; p.y += p.dy * h + lift; p.rem -= h;
  } else if (p.mode === 'mini') {
    p.x += p.dx * h + drift; p.y += p.dy * h + lift; p.rem -= h;
  } else if (p.mode === 'fall') {
    const v = (w.kind === 'rain' ? 600 : (w.fallSpeed || 420)) * TICK / 2; p.y += v; p.rem -= v;
  } else if (p.mode === 'crawl') {
    crawlStep(m, p); p.rem -= h;
    if (m.subs.some(o => o.alive && o.idx !== p.idx && inHull(o, p.x, p.y, 6)) || p.rem <= 0) return detonate(m, p, w);
    return;
  }
  p.age++;
  // 12신: the left and right edges of cyberspace join up
  if (m.rules.wrapX && p.y >= 0 && p.y < m.H) { if (p.x < 0) { p.x += m.W; p.ox += m.W; if (p.x >= m.W) p.x = m.W - 1e-6; } else if (p.x >= m.W) { p.x -= m.W; p.ox -= m.W; } }
  if (outOfMap(m, p.x, p.y)) { p.dead = true; m.events.push({ type: p.tele ? 'telefail' : 'out', x: p.x, y: p.y, idx: p.idx }); return; }
  // rock
  if (p.piercing) {
    if (!solidAt(m, p.x, p.y)) { p.piercing = false; p.pierced = true; }
    else { p.pLeft -= h; if (p.pLeft <= 0) return detonate(m, p, w); }
  } else if (solidAt(m, p.x, p.y)) {
    if (p.mode === 'mini' || p.mode === 'fall') return burstSmall(m, p, w);
    if (w.kind === 'pierce' && !p.pierced) { p.piercing = true; p.pLeft = w.drill; m.events.push({ type: 'drill', x: p.x, y: p.y }); }
    else if (w.kind === 'bounce' && !p.bounced) {
      const n = rockNormal(m, p.x, p.y), dot = p.dx * n.x + p.dy * n.y;
      p.rem = p.mode === 'path' ? p.det - p.s : p.rem; p.mode = 'free'; p.target = -1;
      p.dx -= 2 * dot * n.x; p.dy -= 2 * dot * n.y; const l = Math.sqrt(p.dx * p.dx + p.dy * p.dy) || 1; p.dx /= l; p.dy /= l;
      p.x = px; p.y = py; p.bounced = true;
      m.events.push({ type: 'bounce', x: p.x, y: p.y });
      return;
    } else if (w.kind === 'crawl' && (p.mode === 'path' || p.mode === 'free')) {
      p.x = px; p.y = py; startCrawl(m, p, w); m.events.push({ type: 'stick', x: p.x, y: p.y });
      return;
    } else return detonate(m, p, w);
  }
  // subs
  for (const t of m.subs) {
    if (!t.alive || !inHull(t, p.x, p.y, 4)) continue;
    if (t.idx === p.idx && p.age < CONFIG.physics.ownerSafeTicks) continue;
    if (p.mode === 'mini' || p.mode === 'fall') return burstSmall(m, p, w);
    if (w.kind === 'direct' || p.target === t.idx) return detonate(m, p, w);
    if (p.grazed.indexOf(t.idx) < 0 && t.idx !== p.idx) {
      p.grazed.push(t.idx);
      hurt(m, t, Math.round(dmgOf(m, p, w.dmg) * CONFIG.physics.grazeMul), t.team === m.subs[p.idx].team ? 'friendly' : 'graze', m.subs[p.idx]);
    }
  }
  if (p.mode === 'path' && p.s >= p.det) return detonate(m, p, w);
  if ((p.mode === 'free' || p.mode === 'mini' || p.mode === 'fall') && p.rem <= 0) return p.mode === 'free' ? detonate(m, p, w) : burstSmall(m, p, w);
}
function nearestFoe(m, ownerIdx, x, y, r, hullPad) {
  const owner = ownerIdx >= 0 ? m.subs[ownerIdx] : null;
  let best = null, bd = r * r;
  for (const t of m.subs) {
    if (!t.alive) continue;
    if (hullPad !== undefined) { if (inHull(t, x, y, hullPad)) return t; continue; }
    if (owner && t.team === owner.team) continue;
    const dd = (t.x - x) * (t.x - x) + (t.y - y) * (t.y - y);
    if (dd < bd) { bd = dd; best = t; }
  }
  return best;
}
// crawling drone: hugs the rock face. Heading in tenths of a degree; side = which way it turns to find the wall.
function startCrawl(m, p, w) {
  let h10 = 0, bestDot = -2;
  for (let k = 0; k < 36; k++) { const c = cosD10(k * 100), s = sinD10(k * 100), dot = c * p.dx + s * p.dy; if (dot > bestDot) { bestDot = dot; h10 = k * 100; } }
  let plus = 99, minus = 99;
  for (let k = 1; k <= 18; k++) { if (plus === 99 && !solidAt(m, p.x + 5 * cosD10(h10 + k * 100), p.y + 5 * sinD10(h10 + k * 100))) plus = k; if (minus === 99 && !solidAt(m, p.x + 5 * cosD10(h10 - k * 100), p.y + 5 * sinD10(h10 - k * 100))) minus = k; }
  p.side = plus <= minus ? -1 : 1; // the wall is on the opposite side of the free turn
  p.h10 = h10 + (plus <= minus ? plus : -minus) * 100;
  p.mode = 'crawl';
  p.rem = clampN(p.det - p.s, 40, w.crawl);
}
function crawlStep(m, p) {
  // turn toward the wall, then away from it until the next 4 px are water: the drone follows the face
  let h = p.h10 + p.side * 900;
  for (let k = 0; k < 36; k++) {
    const nx = p.x + 4 * cosD10(h), ny = p.y + 4 * sinD10(h);
    if (!solidAt(m, nx, ny) && !outOfMap(m, nx, ny)) { p.h10 = h; p.x += 3 * cosD10(h); p.y += 3 * sinD10(h); p.dx = cosD10(h); p.dy = sinD10(h); return; }
    h -= p.side * 100;
  }
  p.rem = 0;
}
// the main burst of a torpedo, by weapon kind
function detonate(m, p, w) {
  p.dead = true;
  if (p.tele) return teleport(m, p);
  const owner = m.subs[p.idx], x = p.x, y = p.y, dmg = dmgOf(m, p, w.dmg), sh = { rx: w.rx, ry: w.ry, thin: w.thin || 0 };
  m.events.push({ type: 'impact', x, y, idx: p.idx, wIdx: p.wIdx, dx: p.dx, dy: p.dy });
  switch (w.kind) {
    case 'depth': schedule(m, w.waitTicks, { kind: 'fall', x, y, idx: p.idx, wIdx: p.wIdx, amp: p.amp }); m.events.push({ type: 'hover', x, y, ticks: w.waitTicks }); return;
    case 'inflate': schedule(m, w.waitTicks, { kind: 'burst', x, y, idx: p.idx, wIdx: p.wIdx, amp: p.amp, carveMul: 1.3, fx: 'big' }); m.events.push({ type: 'swell', x, y, ticks: w.waitTicks, r: w.rx }); return;
    case 'vortex': schedule(m, w.waitTicks, { kind: 'vortex', x, y, idx: p.idx, wIdx: p.wIdx, amp: p.amp }); m.events.push({ type: 'swirl', x, y, ticks: w.waitTicks, r: w.pullR }); return;
    case 'rain': {
      explode(m, x, y, { rx: 30, ry: 30 }, dmgOf(m, p, 40), owner, { fx: 'small' });
      const n = w.arrows, top = Math.max(10, y - w.height);
      for (let i = 0; i < n; i++) schedule(m, 18 + Math.abs(i - (n - 1) / 2) * 8, { kind: 'arrow', x: x + (i - (n - 1) / 2) * w.gap, y: top, idx: p.idx, wIdx: p.wIdx, amp: p.amp });
      m.events.push({ type: 'rain', x, y: top, n, gap: w.gap });
      return;
    }
    case 'octo8': {
      explode(m, x, y, sh, dmg, owner, { fx: 'small' });
      for (let k = 0; k < 8; k++) spawnMini(m, p, x, y, cosD10(k * 450), sinD10(k * 450), w.reach);
      return;
    }
    case 'split': {
      explode(m, x, y, { rx: 30, ry: 30 }, dmgOf(m, p, 50), owner, { fx: 'small' });
      for (const sg of [-1, 1]) { const c = cosD10(w.spread * sg), s = sinD10(w.spread * sg); spawnMini(m, p, x, y, p.dx * c - p.dy * s, p.dx * s + p.dy * c, w.reach, sg); }
      return;
    }
    case 'electric': {
      const hit = explode(m, x, y, sh, dmg, owner, { fx: 'volt' });
      for (const t of hit) if (t.alive) { t.shock = { turns: CONFIG.shock.turns, dmg: CONFIG.shock.dmg, by: owner.idx }; m.events.push({ type: 'shocked', idx: t.idx, x: t.x, y: t.y }); }
      return;
    }
    case 'chain': {
      const hit0 = explode(m, x, y, sh, dmg, owner, { fx: 'volt' });
      let fx = x, fy = y; const done = hit0.map(t => t.idx); // the bolt jumps to subs the burst did not already hit
      for (let j = 0; j < w.jumps; j++) {
        let best = null, bd = w.jumpR * w.jumpR;
        for (const t of m.subs) { if (!t.alive || t.team === owner.team || done.indexOf(t.idx) >= 0) continue; const dd = (t.x - fx) * (t.x - fx) + (t.y - fy) * (t.y - fy); if (dd < bd) { bd = dd; best = t; } }
        if (!best) break;
        done.push(best.idx); m.events.push({ type: 'bolt', x1: fx, y1: fy, x2: best.x, y2: best.y });
        hurt(m, best, Math.round(dmg * (best.shield ? CONFIG.items.shield.mul : 1)), 'hit', owner); fx = best.x; fy = best.y;
      }
      return;
    }
    case 'magnet': {
      // K-자석탄: an enemy within `snap` of the burst point pulls the burst onto itself
      let best = null, bd = w.snap * w.snap;
      for (const t of m.subs) { if (!t.alive || t.team === owner.team) continue; const dd = (t.x - x) * (t.x - x) + (t.y - y) * (t.y - y); if (dd <= bd) { bd = dd; best = t; } }
      if (best) { m.events.push({ type: 'magnet', x1: x, y1: y, x2: best.x, y2: best.y }); explode(m, best.x, best.y, sh, dmg, owner, { fx: 'kblue' }); }
      else explode(m, x, y, sh, dmg, owner, { fx: 'kblue' });
      return;
    }
    default: explode(m, x, y, sh, dmg, owner, { fx: w.kind === 'cross' ? 'cross' : w.kind === 'vell' ? 'sonar' : 'hit' });
  }
}
// 순간이동: the shooter appears where the carrier stopped — backed off along its track (it may have hit rock),
// else the nearest open water in rings. Nowhere to fit: it stays put.
function teleport(m, p) {
  const t = m.subs[p.idx]; if (!t || !t.alive) return;
  const E = CONFIG.physics.edgeMargin, fits = (x, y) => x >= E && x <= m.W - E && y >= E && y <= m.H - E && hullFree(m, x, y) && !m.subs.some(q => q !== t && q.alive && hullsOverlap(x, y, q.x, q.y));
  let nx = null, ny = null;
  for (let k = 0; k <= 120 && nx === null; k += 3) { const x = p.x - p.dx * k, y = p.y - p.dy * k; if (fits(x, y)) { nx = x; ny = y; } }
  const R = CONFIG.items.tele.search;
  for (let r = 10; r <= R && nx === null; r += 10) for (let a = 0; a < 3600; a += 150) { const x = p.x + r * cosD10(a), y = p.y + r * sinD10(a); if (fits(x, y)) { nx = x; ny = y; break; } }
  if (nx === null) { m.events.push({ type: 'telefail', x: p.x, y: p.y, idx: t.idx }); return; }
  const fx = t.x, fy = t.y;
  t.x = Math.round(nx); t.y = Math.round(ny);
  if (!fits(t.x, t.y)) { t.x = nx; t.y = ny; }
  m.events.push({ type: 'tele', idx: t.idx, x1: fx, y1: fy, x2: t.x, y2: t.y });
  pickupCrates(m, t);
}
function spawnMini(m, p, x, y, dx, dy, reach, tag) {
  m.proj.push({ mode: 'mini', x, y, dx, dy, rem: reach, idx: p.idx, wIdx: p.wIdx, amp: p.amp, calm: p.calm, ox: 0, age: CONFIG.physics.ownerSafeTicks, grazed: [], id: m.schedSeq++, tag: tag || 0 });
}
// minis, falling missiles and arrows burst on their own smaller rules
function burstSmall(m, p, w) {
  p.dead = true;
  const owner = m.subs[p.idx];
  if (p.mode === 'fall' && w.kind === 'rain') explode(m, p.x, p.y, { rx: w.rx, ry: w.ry }, dmgOf(m, p, w.dmg), owner, { fx: 'fire' });
  else if (p.mode === 'fall') explode(m, p.x, p.y, { rx: w.rx, ry: w.ry }, dmgOf(m, p, w.dmg), owner, { fx: 'big' });
  else explode(m, p.x, p.y, { rx: w.rx, ry: w.ry }, dmgOf(m, p, w.dmg), owner, { fx: w.kind === 'split' ? (p.tag < 0 ? 'kblue' : 'kgreen') : 'small' });
}
function stepProjectiles(m) {
  for (const p of m.proj) {
    if (p.dead) continue;
    if (p.wait > 0) { if (--p.wait === 0) m.events.push({ type: 'fire', idx: p.idx, weapon: p.wIdx, x: p.x, y: p.y, again: true }); continue; }
    const w = weaponOf(m, p);
    for (let i = 0; i < 2 && !p.dead; i++) stepTorp(m, p, w);
  }
  m.proj = m.proj.filter(p => !p.dead);
}
function runScheduled(m) {
  if (!m.sched.length) return;
  const due = m.sched.filter(e => e.at <= m.tick).sort((a, b) => a.at - b.at || a.seq - b.seq);
  if (!due.length) return;
  m.sched = m.sched.filter(e => e.at > m.tick);
  for (const e of due) {
    if (e.kind === 'mine') { const M = m.rules.mine; explode(m, e.x, e.y, { rx: M.rx, ry: M.rx }, M.dmg, e.idx >= 0 ? m.subs[e.idx] : null, { fx: 'mine', rock: true }); continue; }
    const owner = m.subs[e.idx], w = CONFIG.subs[owner.subId].weapons[e.wIdx], mul = e.amp ? CONFIG.items.amplify.mul : 1;
    if (e.kind === 'fall') m.proj.push({ mode: 'fall', x: e.x, y: e.y, dx: 0, dy: 1, rem: 2400, idx: e.idx, wIdx: e.wIdx, amp: e.amp, ox: 0, age: CONFIG.physics.ownerSafeTicks, grazed: [], id: m.schedSeq++ });
    else if (e.kind === 'arrow') m.proj.push({ mode: 'fall', x: e.x, y: e.y, dx: 0, dy: 1, rem: 900, idx: e.idx, wIdx: e.wIdx, amp: e.amp, ox: 0, age: CONFIG.physics.ownerSafeTicks, grazed: [], id: m.schedSeq++ });
    else if (e.kind === 'burst') explode(m, e.x, e.y, { rx: w.rx, ry: w.ry }, w.dmg * mul, owner, { carveMul: e.carveMul, fx: e.fx });
    else if (e.kind === 'vortex') {
      // pull every sub in reach toward the centre (stops at rock or another hull), then burst
      for (const t of m.subs) {
        if (!t.alive || (owner && t.team === owner.team)) continue; // enemies only (as the weapon text says)
        const dx = e.x - t.x, dy = e.y - t.y, d = Math.sqrt(dx * dx + dy * dy);
        if (d > w.pullR || d < 1) continue;
        const ux = dx / d, uy = dy / d, move = Math.min(w.pull, d - 20);
        for (let k = 0; k < move; k += 2) {
          const nx = t.x + ux * 2, ny = t.y + uy * 2;
          if (!hullFree(m, nx, ny) || m.subs.some(q => q !== t && q.alive && hullsOverlap(nx, ny, q.x, q.y))) break;
          t.x = nx; t.y = ny;
        }
        m.events.push({ type: 'pulled', idx: t.idx });
      }
      explode(m, e.x, e.y, { rx: w.rx, ry: w.ry }, w.dmg * mul, owner, { fx: 'swirl' });
    }
  }
}

// ---------------------------------------------------------------- turns
function teamAlive(m, team) { return m.subs.some(t => t.alive && t.team === team); }
function beginTurn(m) {
  const red = teamAlive(m, 'red'), blue = teamAlive(m, 'blue');
  if (!red || !blue) { m.phase = 'over'; m.winner = red ? 'red' : blue ? 'blue' : 'draw'; m.events.push({ type: 'over', winner: m.winner }); return; }
  const alive = m.subs.filter(t => t.alive).sort((a, b) => a.delay - b.delay || a.idx - b.idx);
  const t = alive[0], base = t.delay;
  for (const o of alive) o.delay -= base;
  m.turnNo++;
  m.cur = t.idx;
  const d = CONFIG.subs[t.subId];
  t.fuel = d.movePx * (t.shock ? CONFIG.ram.shockMove : 1); t.shield = false;
  if (t.cd > 0) t.cd--;
  m.turn = { actions: [], itemUsed: false, amp: false, calm: false, movedPx: 0, rammed: {}, crushed: {} };
  const T = CONFIG.turn, sudden = m.turnNo >= T.suddenBase + T.suddenPerPlayer * m.subs.length;
  const cmax = Math.round(T.currentMax * (sudden ? T.suddenCurrentMul : 1));
  m.current = clampN(Math.round((rngNext(m) + rngNext(m) + rngNext(m) - 1.5) * 3.6 * (sudden ? T.suddenCurrentMul : 1)), -cmax, cmax);
  for (const c of m.crates) if (m.turnNo - (c.born || 0) >= crateLife(m)) { c.dead = true; m.events.push({ type: 'crategone', x: c.x, y: c.y }); }
  m.crates = m.crates.filter(c => !c.dead);
  const ce = m.rules.crateEvery || T.crateEveryTurns;
  if (m.turnNo % ce === 1 % ce) dropCrate(m);
  m.hashes[m.turnNo] = stateHash(m);
  m.events.push({ type: 'turn', idx: t.idx, turnNo: m.turnNo });
  if (t.shock) {
    hurt(m, t, t.shock.dmg, 'shock', t.shock.by >= 0 ? m.subs[t.shock.by] : null);
    t.shock.turns--; if (t.shock.turns <= 0) t.shock = null;
    if (!t.alive || !teamAlive(m, 'red') || !teamAlive(m, 'blue')) { m.phase = 'settle'; m.settle = 0; return; }
  }
  if (sudden) {
    if (!m.sudden) { m.sudden = true; m.events.push({ type: 'sudden' }); }
    for (const o of m.subs) if (o.alive) hurt(m, o, Math.round(o.maxhp * T.suddenDmg), 'sudden');
    if (!t.alive || !teamAlive(m, 'red') || !teamAlive(m, 'blue')) { m.phase = 'settle'; m.settle = 0; return; }
  }
  // 온천: starting the turn inside a stone tub heals
  if (m.rules.heal) for (const z of m.rules.heal) if (t.x >= z[0] && t.x <= z[1] && t.y >= z[2] && t.y <= z[3] && t.hp < t.maxhp) {
    const v = Math.min(z[4], t.maxhp - t.hp); t.hp += v; m.events.push({ type: 'heal', idx: t.idx, x: t.x, y: t.y, amount: v, spa: true }); break;
  }
  m.phase = 'aim';
}
function crateLife(m) { return CONFIG.turn.crateLifeRounds * m.subs.length; }
// a supply crate near one sub (300~600 px, nobody closer than 300): out of reach this turn, but 2~3 turns of driving get it
function dropCrate(m) {
  const T = CONFIG.turn, keys = Object.keys(CONFIG.items);
  if (m.crates.length >= T.crateMax) return;
  let total = 0; for (const k of keys) total += CONFIG.items[k].dropWeight;
  const alive = m.subs.filter(t => t.alive); if (!alive.length) return;
  const lo = T.crateNear[0], hi = T.crateNear[1];
  for (let tries = 0; tries < 60; tries++) {
    const t = alive[Math.floor(rngNext(m) * alive.length)], a = Math.floor(rngNext(m) * 3600), r = lo + rngNext(m) * (hi - lo);
    const x = Math.round(t.x + r * cosD10(a)), y = Math.round(t.y + r * sinD10(a));
    let item = keys[0], rr = rngNext(m) * total;
    for (const k of keys) { rr -= CONFIG.items[k].dropWeight; if (rr < 0) { item = k; break; } }
    if (x < 100 || x > m.W - 100 || y < 100 || y > m.H - 100) continue;
    if (!clearAround(m.mask, m.W, m.H, x, y, 36, 36)) continue;
    if (alive.some(o => (o.x - x) * (o.x - x) + (o.y - y) * (o.y - y) < lo * lo)) continue;
    if (m.mines.some(q => q.alive && (q.x - x) * (q.x - x) + (q.y - y) * (q.y - y) < 90 * 90)) continue;
    if (m.crates.some(c => (c.x - x) * (c.x - x) + (c.y - y) * (c.y - y) < 120 * 120)) continue;
    m.crates.push({ x, y, item, dead: false, id: m.schedSeq++, born: m.turnNo });
    m.events.push({ type: 'crate', x, y, item, id: m.crates[m.crates.length - 1].id });
    return;
  }
}

// One fixed tick. Aim phase is frozen (only commands change it).
function step(m) {
  if (m.phase === 'over' || m.phase === 'aim') return;
  m.tick++;
  runScheduled(m);
  stepProjectiles(m);
  if (m.falls.length) stepFalls(m);
  m.crates = m.crates.filter(x => !x.dead);
  if (m.proj.length || m.sched.length || m.falls.length) { m.settle = 0; return; }
  m.settle++;
  if (m.settle >= CONFIG.physics.settleTicks || (m.phase === 'settle' && m.turnNo === 0 && m.settle >= 40)) beginTurn(m);
}

// ---------------------------------------------------------------- hash (everything that decides the future)
function stateHash(m) {
  let h = fnvInit();
  h = fnvU32(h, m.rng); h = fnvU32(h, m.turnNo); h = fnvU32(h, m.tick); h = fnvU32(h, m.current + 100); h = fnvU32(h, m.cur + 1);
  const words = new Uint32Array(m.mask.buffer, m.mask.byteOffset, m.mask.length >> 2);
  for (let i = 0; i < words.length; i++) h = Math.imul(h ^ words[i], 0x01000193);
  h >>>= 0;
  for (const t of m.subs) {
    h = fnvF64(h, t.x); h = fnvF64(h, t.y); h = fnvU32(h, t.hp); h = fnvF64(h, t.delay); h = fnvU32(h, t.alive ? 1 : 0);
    h = fnvU32(h, t.cd); h = fnvF64(h, t.facing); h = fnvStr(h, t.items.join(',')); h = fnvStr(h, t.shock ? t.shock.dmg + ':' + t.shock.turns : '-'); h = fnvU32(h, t.shield ? 1 : 0); h = fnvF64(h, t.fuel);
  }
  for (const o of m.crates) { h = fnvF64(h, o.x); h = fnvF64(h, o.y); h = fnvStr(h, o.item); }
  for (const q of m.mines) h = fnvU32(h, q.alive ? 1 : 0);
  return h >>> 0;
}
