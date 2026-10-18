// ============================================================== WEAPONS + TARGET PRACTICE (deterministic, no DOM)
// Fire key (IN.ATK): power weapons charge while held and fire on release; others act on press.
// Commands from the UI (weapon choice, fuse, mouse aim, strike target) arrive as `cmd` on stepRun.
IN.ATK = 128;
const TARGET_R = 11;
const WEAPONS = [
  { id: 'bazooka', name: '바주카', kind: 'power', speed: 1250, wind: 1, r: 44, dmg: 50, how: 'F(또는 마우스 왼쪽)를 누르고 있다 떼면 발사 · 바람에 밀림' },
  { id: 'grenade', name: '수류탄', kind: 'power', speed: 950, wind: 0, fuse: true, bounce: 0.5, r: 42, dmg: 45, how: '파워 충전 발사 · Q/E로 타이머 1~5초 · 통통 튐 · 바람 무시' },
  { id: 'cluster', name: '클러스터', kind: 'power', speed: 950, wind: 0, fuse: true, bounce: 0.45, r: 30, dmg: 25, bomblets: 5, how: '수류탄처럼 던지면 터지면서 작은 폭탄 5개로 흩어짐' },
  { id: 'shotgun', name: '샷건', kind: 'hitscan', r: 18, dmg: 25, range: 1000, how: 'F를 누르면 조준 방향으로 즉시 발사 · 직선' },
  { id: 'dynamite', name: '다이너마이트', kind: 'drop', fuseFixed: 5, r: 80, dmg: 75, how: 'F로 발밑에 놓고 도망 · 로프에 매달려 있으면 공중에서 툭 떨굼 · 5초 뒤 큰 폭발' },
  { id: 'mine', name: '지뢰', kind: 'drop', mine: true, r: 46, dmg: 50, how: 'F로 떨굼 · 1초 뒤 작동, 가까이 오면 1초 뒤 폭발' },
  { id: 'airstrike', name: '공중 폭격', kind: 'strike', r: 32, dmg: 30, count: 5, how: '맵을 클릭(터치)해 목표 지정 → F로 호출 · 바라보는 쪽에서 폭탄 5발' },
  { id: 'bat', name: '야구 방망이', kind: 'melee', dmg: 30, knock: 900, how: '표적에 붙어서 F · 조준 방향으로 날려 바다에 빠뜨리기' },
];

function initTargetMode(r) {
  const m = r.map;
  r.wind = Math.round((rngNext(r) + rngNext(r) - 1) * 10); // -10..10
  r.w = r.w || 0; r.fuse = r.fuse || 3; r.charge = -1; r.cool = 0; r.strikeX = -1;
  r.projs = []; r.kills = 0; r.drowned = 0; r.shots = 0; r.allDoneTick = -1;
  r.targets = m.targets.map((p, i) => {
    const t = { id: i, x: p.x, y: p.y, vx: 0, vy: 0, hp: 100, alive: true, rest: false };
    let g = 0; while (g++ < 400 && !bodyHit(m, t.x, t.y + 1, TARGET_R)) t.y += 1;
    t.rest = true; return t;
  });
}
function bodyHit(m, x, y, rad) {
  if (courseSolid(m, x, y)) return true;
  for (const p of CIRC12) if (courseSolid(m, x + p.x * rad, y + p.y * rad)) return true;
  return false;
}
// one free body (target or resting bomb): gravity, bounce, land, drown. Returns 'drown' when it fell in the sea.
function bodyStep(m, b, rad, gravity, bounce) {
  if (b.rest) {
    if (!bodyHit(m, b.x, b.y + 1, rad)) b.rest = false; else return null;
  }
  b.vy += gravity * TICK;
  const sp = Math.sqrt(b.vx * b.vx + b.vy * b.vy), n = Math.max(1, Math.ceil(sp * TICK / 1.5));
  for (let i = 0; i < n; i++) {
    const nx = b.x + b.vx * TICK / n, ny = b.y + b.vy * TICK / n;
    if (bodyHit(m, nx, ny, rad)) {
      const nr = normalAt(m, nx, ny, rad + 2), vn = b.vx * nr.x + b.vy * nr.y;
      if (vn < 0) {
        if (nr.y < -0.55 && -vn < 160) { b.vx = 0; b.vy = 0; b.rest = true; return null; }
        b.vx -= (1 + bounce) * vn * nr.x; b.vy -= (1 + bounce) * vn * nr.y; b.vx *= 0.85;
      }
      if (bodyHit(m, b.x, b.y, rad)) { b.x += nr.x; b.y += nr.y; }
      break;
    }
    b.x = nx; b.y = ny;
  }
  if (b.y > m.waterY) return 'drown';
  if (b.x < 0 || b.x > m.W) { b.x = clampN(b.x, rad, m.W - rad); b.vx = -b.vx * 0.5; }
  return null;
}

function explode(r, x, y, rad, dmg) {
  const m = r.map, W = m.W, H = m.H;
  // carve the terrain
  const x0 = Math.max(0, Math.floor(x - rad)), x1 = Math.min(W - 1, Math.ceil(x + rad)), y0 = Math.max(0, Math.floor(y - rad)), y1 = Math.min(H - 1, Math.ceil(y + rad));
  for (let yy = y0; yy <= y1; yy++) for (let xx = x0; xx <= x1; xx++) { const dx = xx - x, dy = yy - y; if (dx * dx + dy * dy <= rad * rad) m.mask[yy * W + xx] = 0; }
  r.events.push({ type: 'boom', x, y, r: rad });
  // push and hurt everything nearby
  const reach = rad + 14;
  const push = (b, k) => {
    const dx = b.x - x, dy = b.y - y, d = Math.sqrt(dx * dx + dy * dy);
    if (d >= reach) return 0;
    const f = 1 - d / reach, nx = d > 1e-6 ? dx / d : 0, ny = d > 1e-6 ? dy / d : -1;
    const v = (260 + rad * 9) * f * k;
    b.vx += nx * v; b.vy += ny * v - 120 * f * k; b.rest = false;
    return f;
  };
  for (const t of r.targets) if (t.alive) {
    const f = push(t, 1);
    if (f > 0) { const d = Math.round(dmg * (0.35 + 0.65 * f)); t.hp -= d; r.events.push({ type: 'hit', x: t.x, y: t.y, dmg: d }); }
  }
  // the worm gets thrown around too (rocket jumps!) but has no health in practice
  { const f = push(r, 0.9); if (f > 0 && r.state === 'ground') { r.state = 'air'; r.y -= 1; } }
  for (const p of r.projs) if (p.rest !== undefined && !p.dead) { const f = push(p, 0.8); if (f > 0 && p.mine) p.trig = Math.min(p.trig || 999, 1); }
  // a rope anchored in rock that is gone now lets go
  if (r.state === 'rope' && r.anchors.some(a => !bodyHit(m, a.x, a.y, 3))) { releaseRope(r); r.events.push({ type: 'release' }); }
}

function weaponsTick(r, bits, pressed, cmd) {
  const m = r.map, c = r.cfg;
  if (cmd) {
    if (cmd.w != null && cmd.w >= 0 && cmd.w < WEAPONS.length && r.charge < 0) r.w = cmd.w;
    if (cmd.fuse != null) r.fuse = clampN(cmd.fuse, 1, 5);
    if (cmd.aim != null) { r.aim = clampN(Math.round(cmd.aim), -900, 900); if (cmd.face) r.facing = cmd.face; }
    if (cmd.tx != null) r.strikeX = clampN(Math.round(cmd.tx), 20, m.W - 20);
  }
  if (r.cool > 0) r.cool--;
  const w = WEAPONS[r.w], held = bits & IN.ATK, dirX = r.facing * cosD10(r.aim), dirY = -sinD10(r.aim);
  const ox = r.x + dirX * 12, oy = r.y + dirY * 12;
  const canAct = !r.dead && r.cool === 0;
  if (w.kind === 'power') {
    if ((pressed & IN.ATK) && canAct && r.charge < 0) r.charge = 0;
    if (r.charge >= 0) {
      if (held) r.charge = Math.min(1, r.charge + TICK / 1.6);
      if (!held || r.charge >= 1) {
        const v = w.speed * (0.08 + 0.92 * r.charge);
        r.projs.push({ k: w.id, x: ox, y: oy, vx: dirX * v + r.vx * 0.5, vy: dirY * v + r.vy * 0.5, fuse: w.fuse ? r.fuse * TICK_RATE : -1, age: 0 });
        r.charge = -1; r.cool = 30; r.shots++; r.events.push({ type: 'fire', w: w.id });
      }
    }
  } else if ((pressed & IN.ATK) && canAct) {
    r.cool = 30;
    if (w.kind === 'hitscan') {
      r.shots++; let hx = -1, hy = -1, tgt = null;
      for (let s = 0; s < w.range; s += 2) {
        const px = ox + dirX * s, py = oy + dirY * s;
        if (courseSolid(m, px, py) && py >= 0) { hx = px; hy = py; break; }
        for (const t of r.targets) if (t.alive) { const dx = t.x - px, dy = t.y - py; if (dx * dx + dy * dy < TARGET_R * TARGET_R) tgt = t; }
        if (tgt) { hx = px; hy = py; break; }
      }
      r.events.push({ type: 'fire', w: w.id, x0: ox, y0: oy, x1: hx >= 0 ? hx : ox + dirX * w.range, y1: hx >= 0 ? hy : oy + dirY * w.range });
      if (hx >= 0) explode(r, hx, hy, w.r, w.dmg);
    } else if (w.kind === 'drop') {
      r.shots++;
      r.projs.push({ k: w.id, x: r.x + r.facing * 4, y: r.y + 4, vx: r.vx * 0.6, vy: Math.max(0, r.vy * 0.6), fuse: w.fuseFixed ? w.fuseFixed * TICK_RATE : -1, age: 0, rest: false, mine: !!w.mine, trig: 0 });
      r.events.push({ type: 'drop', w: w.id });
    } else if (w.kind === 'strike') {
      if (r.strikeX < 0) { r.events.push({ type: 'need', what: '목표를 먼저 찍어 주세요 (맵 클릭/터치)' }); r.cool = 0; }
      else {
        r.shots++;
        const dir = r.facing;
        for (let i = 0; i < w.count; i++) r.projs.push({ k: 'airbomb', x: r.strikeX - dir * 300 + (i - 2) * 34, y: -40 - i * 18, vx: dir * 300, vy: 120, fuse: -1, age: 0 });
        r.events.push({ type: 'strike', x: r.strikeX, dir });
      }
    } else if (w.kind === 'melee') {
      r.shots++; let hitAny = false;
      for (const t of r.targets) if (t.alive) {
        const dx = t.x - r.x, dy = t.y - r.y;
        if (dx * dx + dy * dy < 34 * 34 && dx * r.facing > -6) {
          t.vx = dirX * w.knock; t.vy = dirY * w.knock - 80; t.rest = false; t.hp -= w.dmg; hitAny = true;
          r.events.push({ type: 'hit', x: t.x, y: t.y, dmg: w.dmg, bat: true });
        }
      }
      r.events.push({ type: 'swing', hit: hitAny });
    }
  }

  // ---- projectiles
  for (const p of r.projs) {
    if (p.dead) continue;
    p.age++;
    if (p.rest !== undefined) { // dropped dynamite / mine
      const res = bodyStep(m, p, 3, c.gravity, 0.25);
      if (res === 'drown') { p.dead = true; r.events.push({ type: 'fizz', x: p.x }); continue; }
      if (p.mine) {
        if (p.trig > 0) { if (--p.trig === 0) { p.dead = true; explode(r, p.x, p.y, 46, 50); } }
        else if (p.age > TICK_RATE) {
          const near = (x, y) => (x - p.x) * (x - p.x) + (y - p.y) * (y - p.y) < 42 * 42;
          if (near(r.x, r.y) || r.targets.some(t => t.alive && near(t.x, t.y))) { p.trig = TICK_RATE; r.events.push({ type: 'beep', x: p.x, y: p.y }); }
        }
      } else if (p.fuse > 0 && --p.fuse === 0) { p.dead = true; explode(r, p.x, p.y, 80, 75); }
      continue;
    }
    const wd = WEAPONS.find(x => x.id === p.k) || { wind: 0 };
    p.vy += c.gravity * TICK;
    if (wd.wind) p.vx += r.wind * 14 * TICK;
    const sp = Math.sqrt(p.vx * p.vx + p.vy * p.vy), n = Math.max(1, Math.ceil(sp * TICK / 2));
    let boom = false;
    for (let i = 0; i < n && !boom; i++) {
      const nx = p.x + p.vx * TICK / n, ny = p.y + p.vy * TICK / n;
      const hitT = r.targets.some(t => t.alive && (t.x - nx) * (t.x - nx) + (t.y - ny) * (t.y - ny) < (TARGET_R + 3) * (TARGET_R + 3));
      if ((courseSolid(m, nx, ny) && ny >= 0) || hitT) {
        if (p.fuse > 0 && !hitT) { // bouncing grenade
          const nr = normalAt(m, nx, ny, 4), vn = p.vx * nr.x + p.vy * nr.y, b = wd.bounce || 0.4;
          if (vn < 0) { p.vx -= (1 + b) * vn * nr.x; p.vy -= (1 + b) * vn * nr.y; p.vx *= 0.9; if (-vn > 90) r.events.push({ type: 'tink', x: nx, y: ny }); }
          break;
        }
        p.x = nx; p.y = ny; boom = true; break;
      }
      p.x = nx; p.y = ny;
    }
    if (p.fuse > 0 && --p.fuse === 0) boom = true;
    if (boom) {
      p.dead = true;
      if (p.k === 'bazooka') explode(r, p.x, p.y, 44, 50);
      else if (p.k === 'grenade') explode(r, p.x, p.y, 42, 45);
      else if (p.k === 'cluster') {
        explode(r, p.x, p.y, 30, 25);
        for (let i = 0; i < 5; i++) r.projs.push({ k: 'bomblet', x: p.x, y: p.y - 4, vx: (i - 2) * 95 + (rngNext(r) - 0.5) * 40, vy: -260 - rngNext(r) * 160, fuse: -1, age: 0 });
      } else if (p.k === 'bomblet') explode(r, p.x, p.y, 20, 20);
      else if (p.k === 'airbomb') explode(r, p.x, p.y, 32, 30);
    }
    if (p.y > m.H + 200 || p.x < -200 || p.x > m.W + 200) { p.dead = true; if (p.y > m.waterY) r.events.push({ type: 'fizz', x: p.x }); }
  }
  if (r.projs.length > 40 || r.projs.some(p => p.dead)) r.projs = r.projs.filter(p => !p.dead);

  // ---- targets
  for (const t of r.targets) {
    if (!t.alive) continue;
    const res = bodyStep(m, t, TARGET_R, c.gravity, 0.35);
    if (res === 'drown') { t.alive = false; r.drowned++; r.kills++; r.events.push({ type: 'drown', x: t.x, id: t.id }); continue; }
    if (t.hp <= 0 && t.rest) { t.alive = false; r.kills++; r.events.push({ type: 'kill', x: t.x, y: t.y, id: t.id }); explode(r, t.x, t.y, 22, 0); }
  }
  if (r.allDoneTick < 0 && r.targets.every(t => !t.alive)) { r.allDoneTick = r.tick; r.done = true; r.finishTick = r.tick; r.events.push({ type: 'cleared' }); }
}
