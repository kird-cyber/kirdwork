// ============================================================== ROPE SIMULATION (deterministic, no DOM)
// State advances one tick (1/120 s) per call with a bitmask of held keys. The same map + config +
// input stream gives the same run on every device (only + - * / sqrt and the trig tables are used),
// which is what the ghost replay and later the online game rely on.
const IN = { L: 1, R: 2, U: 4, D: 8, FIRE: 16, JUMP: 32, BACK: 64 };

// sample points on the unit circle (from the deterministic tables)
const CIRC12 = [], CIRC16 = [];
for (let i = 0; i < 12; i++) CIRC12.push({ x: cosD10(i * 300), y: sinD10(i * 300) });
for (let i = 0; i < 16; i++) CIRC16.push({ x: cosD10(i * 225), y: sinD10(i * 225) });

function hitAt(map, x, y) {
  if (courseSolid(map, x, y)) return true;
  for (const p of CIRC12) if (courseSolid(map, x + p.x * WORM_R, y + p.y * WORM_R)) return true;
  return false;
}
// outward surface normal around a point (points away from solid pixels)
function normalAt(map, x, y, r) {
  let nx = 0, ny = 0;
  for (const p of CIRC16) if (courseSolid(map, x + p.x * r, y + p.y * r)) { nx -= p.x; ny -= p.y; }
  const l = Math.sqrt(nx * nx + ny * ny);
  return l < 1e-9 ? { x: 0, y: -1 } : { x: nx / l, y: ny / l };
}
// first solid point along a segment (1 px steps), skipping `skip` px at the start. null if clear.
function rayHit(map, ax, ay, bx, by, skip) {
  const dx = bx - ax, dy = by - ay, d = Math.sqrt(dx * dx + dy * dy);
  if (d < 1e-9) return null;
  const ux = dx / d, uy = dy / d;
  for (let s = skip || 0; s < d; s += 1) if (courseSolid(map, ax + ux * s, ay + uy * s)) return { s, x: ax + ux * s, y: ay + uy * s };
  return null;
}
const cross = (ax, ay, bx, by) => ax * by - ay * bx;

function createRun(map, cfg) {
  const r = {
    map, cfg: Object.assign({}, ROPE_DEFAULT, cfg || {}), tick: 0, prevBits: 0,
    x: map.start.x, y: map.start.y, vx: 0, vy: 0, state: 'ground', facing: 1, aim: 450,
    shot: null, anchors: [], L: 0, ropes: 0, cp: 0, done: false, startTick: -1, finishTick: -1,
    dead: 0, respawn: { x: map.start.x, y: map.start.y }, splashes: 0, maxSpeed: 0, events: [],
  };
  return r;
}
function releaseRope(r) { r.anchors = []; r.shot = null; if (r.state === 'rope') r.state = 'air'; }
function ropeTotal(r) { let t = r.L; for (let i = 1; i < r.anchors.length; i++) { const a = r.anchors[i - 1], b = r.anchors[i]; t += Math.sqrt((b.x - a.x) * (b.x - a.x) + (b.y - a.y) * (b.y - a.y)); } return t; }

function stepRun(r, bits) {
  const c = r.cfg, m = r.map;
  const pressed = bits & ~r.prevBits; r.prevBits = bits;
  r.tick++;
  if (r.startTick < 0 && bits) r.startTick = r.tick;
  if (r.dead > 0) { r.dead--; if (r.dead === 0) { r.x = r.respawn.x; r.y = r.respawn.y; r.vx = r.vy = 0; r.state = 'air'; r.events.push({ type: 'respawn' }); } return; }
  const dir = (bits & IN.R ? 1 : 0) - (bits & IN.L ? 1 : 0);
  const vert = (bits & IN.U ? 1 : 0) - (bits & IN.D ? 1 : 0);

  // ---- buttons
  if (pressed & IN.FIRE) {
    if (r.state === 'rope') { releaseRope(r); r.events.push({ type: 'release' }); }
    else if (!r.shot) {
      r.shot = { x: r.x, y: r.y, dx: r.facing * cosD10(r.aim), dy: -sinD10(r.aim), dist: 0 };
      r.ropes++; r.events.push({ type: 'shoot' });
    }
  }
  if (pressed & IN.JUMP) {
    if (r.state === 'ground') { r.vx = r.facing * c.jumpVx; r.vy = -c.jumpVy; r.state = 'air'; r.y -= 1; r.events.push({ type: 'jump' }); }
    else if (r.state === 'rope') { releaseRope(r); r.events.push({ type: 'release' }); }
  }
  if ((pressed & IN.BACK) && r.state === 'ground') { r.vx = -r.facing * c.flipVx; r.vy = -c.flipVy; r.state = 'air'; r.y -= 1; r.events.push({ type: 'jump', flip: true }); }

  // ---- aim (not while hanging: there ↑ ↓ reel the rope)
  if (r.state !== 'rope' && vert) r.aim = clampN(r.aim + vert * 8, -900, 900);
  if (dir && r.state !== 'rope') r.facing = dir;
  if (dir && r.state === 'rope') r.facing = dir;

  // ---- walking
  if (r.state === 'ground') {
    r.vx = 0; r.vy = 0;
    if (dir) {
      const nx = r.x + dir * c.walk * TICK;
      for (let u = 0; u <= 6; u++) if (!hitAt(m, nx, r.y - u)) { r.x = nx; r.y -= u; break; }
    }
    if (!hitAt(m, r.x, r.y + 1)) {
      let d = 0; while (d < 6 && !hitAt(m, r.x, r.y + 1)) { r.y += 1; d++; }
      if (!hitAt(m, r.x, r.y + 1)) { r.state = 'air'; r.vx = dir * c.walk; r.vy = 0; }
    }
  }

  // ---- rope shot in flight
  if (r.shot) {
    const s = r.shot, adv = c.shotSpeed * TICK;
    for (let k = 0; k < adv && r.shot; k += 1) {
      const nx = s.x + s.dx, ny = s.y + s.dy;
      if (courseSolid(m, nx, ny)) {
        const ax = s.x, ay = s.y, dd = Math.sqrt((ax - r.x) * (ax - r.x) + (ay - r.y) * (ay - r.y));
        r.shot = null;
        if (ny >= 0) { // the sky has nothing to hook
          r.anchors = [{ x: ax, y: ay, s: 0 }]; r.L = clampN(dd, c.minLen, c.maxLen); r.state = 'rope';
          r.events.push({ type: 'attach', x: ax, y: ay });
        }
        break;
      }
      s.x = nx; s.y = ny; s.dist += 1;
      if (s.dist > c.maxLen) { r.shot = null; r.events.push({ type: 'miss' }); }
    }
  }

  // ---- free flight and rope swing
  if (r.state === 'air' || r.state === 'rope') {
    r.vy += c.gravity * TICK;
    if (c.airDrag) { const k = 1 - c.airDrag * TICK; r.vx *= k; r.vy *= k; }
    if (r.state === 'rope') {
      r.vx += dir * c.swingAcc * TICK;
      // reel: ↑ in, ↓ out. With a taut rope, reeling in keeps angular momentum -> faster swing
      const P = r.anchors[r.anchors.length - 1];
      const ox = r.x - P.x, oy = r.y - P.y, od = Math.sqrt(ox * ox + oy * oy);
      if (vert) {
        const nL = clampN(r.L - vert * c.reel * TICK, c.minLen, Math.max(c.minLen, c.maxLen - (ropeTotal(r) - r.L)));
        if (od > 1e-6 && od >= r.L - 1 && nL !== r.L && c.momentum) {
          const nx = ox / od, ny = oy / od, vr = r.vx * nx + r.vy * ny, tx = r.vx - vr * nx, ty = r.vy - vr * ny;
          const k = 1 + (r.L / nL - 1) * c.momentum;
          r.vx = vr * nx + tx * k; r.vy = vr * ny + ty * k;
        }
        r.L = nL;
      }
    }
    let sp = Math.sqrt(r.vx * r.vx + r.vy * r.vy);
    if (sp > c.maxSpeed) { r.vx *= c.maxSpeed / sp; r.vy *= c.maxSpeed / sp; sp = c.maxSpeed; }
    if (sp > r.maxSpeed) r.maxSpeed = sp;
    const n = Math.max(1, Math.ceil(sp * TICK / 1.5));
    for (let i = 0; i < n && (r.state === 'air' || r.state === 'rope'); i++) {
      const px = r.x, py = r.y, nx = px + r.vx * TICK / n, ny = py + r.vy * TICK / n;
      if (hitAt(m, nx, ny)) {
        const nrm = normalAt(m, nx, ny, WORM_R + 2), vn = r.vx * nrm.x + r.vy * nrm.y;
        if (vn < 0) {
          if (r.state === 'air' && nrm.y < -0.55 && -vn < c.landSpeed) { r.state = 'ground'; r.vx = r.vy = 0; r.events.push({ type: 'land' }); break; }
          const e = r.state === 'rope' ? c.wallBounce : c.airBounce;
          r.vx -= (1 + e) * vn * nrm.x; r.vy -= (1 + e) * vn * nrm.y;
          if (r.state === 'air') { const tx = r.vx - (r.vx * nrm.x + r.vy * nrm.y) * nrm.x, ty = r.vy - (r.vx * nrm.x + r.vy * nrm.y) * nrm.y; r.vx -= tx * 0.15; r.vy -= ty * 0.15; }
          if (-vn > 120) r.events.push({ type: 'bump', x: nx, y: ny, power: -vn });
        }
        if (hitAt(m, px, py)) { r.x += nrm.x; r.y += nrm.y; } // pushed into a corner: slide out
        else { // slide: use the rest of this sub-step with the new velocity (or along each axis)
          const sx = px + r.vx * TICK / n, sy = py + r.vy * TICK / n;
          if (!hitAt(m, sx, sy)) { r.x = sx; r.y = sy; }
          else if (!hitAt(m, sx, py)) r.x = sx;
          else if (!hitAt(m, px, sy)) r.y = sy;
        }
      } else { r.x = nx; r.y = ny; }
      if (r.state === 'rope') ropeConstrain(r, px, py);
    }
  }

  // ---- sea, checkpoints
  if (r.y > m.waterY) { releaseRope(r); r.state = 'air'; r.dead = 72; r.splashes++; r.events.push({ type: 'splash', x: r.x }); return; }
  if (!r.done && r.cp < m.course.length) {
    const cpt = m.course[r.cp], dx = cpt.x - r.x, dy = cpt.y - r.y;
    if (dx * dx + dy * dy < 34 * 34) {
      r.cp++; r.respawn = { x: cpt.x, y: cpt.y };
      r.events.push({ type: 'checkpoint', n: r.cp, finish: !!cpt.finish });
      if (r.cp === m.course.length) { r.done = true; r.finishTick = r.tick; }
    }
  }
}

// keep the worm on the rope and wrap / unwrap it around corners. (px, py) = position before this sub-step.
function ropeConstrain(r, px, py) {
  const m = r.map, c = r.cfg;
  for (let guard = 0; guard < 4; guard++) {
    const P = r.anchors[r.anchors.length - 1];
    // wrap: the straight line anchor -> worm went through rock: add the corner as a new pivot
    const hit = rayHit(m, P.x, P.y, r.x, r.y, 2);
    if (!hit) break;
    // find the last worm position (between px,py and now) whose line was still clear
    let lo = 0, hi = 1;
    for (let k = 0; k < 10; k++) { const t = (lo + hi) / 2; if (rayHit(m, P.x, P.y, px + (r.x - px) * t, py + (r.y - py) * t, 2)) hi = t; else lo = t; }
    const qx = px + (r.x - px) * lo, qy = py + (r.y - py) * lo;
    const hb = rayHit(m, P.x, P.y, px + (r.x - px) * hi, py + (r.y - py) * hi, 2) || hit;
    const qd = Math.sqrt((qx - P.x) * (qx - P.x) + (qy - P.y) * (qy - P.y));
    if (qd < 1e-6) break;
    const s = Math.min(hb.s, qd - 1);
    let cx = P.x + (qx - P.x) * s / qd, cy = P.y + (qy - P.y) * s / qd;
    for (let k = 0; k < 6 && courseSolid(m, cx, cy); k++) { const nn = normalAt(m, cx, cy, 2.5); cx += nn.x; cy += nn.y; }
    const sx = cx - P.x, sy = cy - P.y, segLen = Math.sqrt(sx * sx + sy * sy);
    if (segLen < 2) break;
    const side = cross(sx, sy, r.x - cx, r.y - cy) >= 0 ? 1 : -1;
    r.anchors.push({ x: cx, y: cy, s: side });
    r.L = Math.max(c.minLen, r.L - segLen);
    r.events.push({ type: 'wrap' });
  }
  // unwrap: the rope swung back past the corner
  while (r.anchors.length >= 2) {
    const A = r.anchors[r.anchors.length - 2], B = r.anchors[r.anchors.length - 1];
    const cr = cross(B.x - A.x, B.y - A.y, r.x - B.x, r.y - B.y);
    if (cr * B.s < 0 && !rayHit(m, A.x, A.y, r.x, r.y, 2)) {
      r.anchors.pop(); r.L += Math.sqrt((B.x - A.x) * (B.x - A.x) + (B.y - A.y) * (B.y - A.y));
    } else break;
  }
  // rope length: pull the worm back onto the circle around the last pivot, drop outward speed
  const P = r.anchors[r.anchors.length - 1];
  const dx = r.x - P.x, dy = r.y - P.y, d = Math.sqrt(dx * dx + dy * dy);
  if (d > r.L && d > 1e-6) {
    const tx = P.x + dx * r.L / d, ty = P.y + dy * r.L / d;
    if (!hitAt(m, tx, ty)) { r.x = tx; r.y = ty; }
    const nx = dx / d, ny = dy / d, vr = r.vx * nx + r.vy * ny;
    if (vr > 0) { r.vx -= vr * nx; r.vy -= vr * ny; }
  }
}

// state hash (for replay checks)
function runHash(r) {
  let h = fnvInit();
  h = fnvU32(h, r.tick); h = fnvF64(h, r.x); h = fnvF64(h, r.y); h = fnvF64(h, r.vx); h = fnvF64(h, r.vy);
  h = fnvU32(h, r.anchors.length); h = fnvF64(h, r.L); h = fnvU32(h, r.cp);
  return h >>> 0;
}
// input streams are stored run-length encoded: [[bits, count], ...]
function rleAppend(rle, bits) { const l = rle[rle.length - 1]; if (l && l[0] === bits) l[1]++; else rle.push([bits, 1]); }
function rleAt(rle, cursor) { // cursor = { i, n } -> next bits (or -1 at the end)
  while (cursor.i < rle.length && cursor.n >= rle[cursor.i][1]) { cursor.i++; cursor.n = 0; }
  if (cursor.i >= rle.length) return -1;
  cursor.n++; return rle[cursor.i][0];
}
