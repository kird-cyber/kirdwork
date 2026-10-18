// ============================================================== ROPE COURSE MAP (deterministic: tables + rng only)
// A practice course: floating rocks over the sea, stalactite ceilings, a tunnel through a mountain,
// a pillar field and a tower shaft to climb. Checkpoints must be touched in order.
function createCourse(seed) {
  const W = 3600, H = 1800, waterY = 1700;
  const mask = new Uint8Array(W * H);
  const st = makeRng(seed || 20261018);
  const set = (x, y, v) => { if (x >= 0 && x < W && y >= 0 && y < H) mask[y * W + x] = v; };
  // ellipse with a wobbly edge (wob = edge noise in px)
  function blob(cx, cy, rx, ry, v, wob) {
    const ph = rngNext(st) * 6.283, ph2 = rngNext(st) * 6.283;
    const x0 = Math.floor(cx - rx - wob), x1 = Math.ceil(cx + rx + wob), y0 = Math.floor(cy - ry - wob), y1 = Math.ceil(cy + ry + wob);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const dx = (x - cx) / rx, dy = (y - cy) / ry, d = Math.sqrt(dx * dx + dy * dy);
      // angle-free wobble: noise along the normalised position
      const n = wob ? (tsin(dx * 3.1 + dy * 1.7 + ph) * 0.6 + tsin(dx * 7.3 - dy * 5.9 + ph2) * 0.4) * wob / Math.max(rx, ry) : 0;
      if (d <= 1 + n) set(x, y, v);
    }
  }
  function rect(x0, y0, w, h, v) { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) set(x, y, v); }
  // pillar / stalactite: tapered vertical shape
  function spike(cx, yTop, yBot, wTop, wBot, v) {
    for (let y = yTop; y <= yBot; y++) { const t = (y - yTop) / Math.max(1, yBot - yTop), hw = (wTop + (wBot - wTop) * t) / 2; for (let x = Math.floor(cx - hw); x <= Math.ceil(cx + hw); x++) set(x, y, v); }
  }

  // --- 1. start island and first rocks
  blob(260, 1690, 300, 260, 1, 26);
  blob(560, 1120, 70, 48, 1, 14);
  blob(860, 1260, 110, 46, 1, 16);
  // --- 2. stalactite ceiling over the first gap
  rect(620, 0, 1000, 150, 1);
  for (let i = 0; i < 7; i++) { const cx = 680 + i * 140 + Math.floor(rngNext(st) * 40); spike(cx, 140, 330 + Math.floor(rngNext(st) * 160), 70, 8, 1); }
  blob(1150, 900, 80, 56, 1, 14);
  blob(1480, 1240, 170, 58, 1, 18);
  blob(1300, 560, 60, 40, 1, 10);
  // --- 3. mountain with a tunnel
  blob(2020, 1520, 330, 680, 1, 30);
  blob(2020, 1330, 285, 66, 0, 10);           // the tunnel
  blob(2020, 1262, 120, 40, 0, 6);            // a little headroom bump in the middle
  rect(1640, 1290, 760, 86, 0);               // corridor: opens both tunnel mouths to the outside
  blob(1700, 1333, 46, 62, 0, 4); blob(2340, 1333, 46, 62, 0, 4); // flared mouths
  // --- 4. pillar field with a ceiling bar
  rect(2380, 260, 640, 70, 1);
  for (const [cx, top] of [[2470, 760], [2660, 900], [2850, 720]]) spike(cx, top, 1760, 26, 56, 1);
  blob(2560, 560, 34, 26, 1, 6); blob(2760, 520, 30, 24, 1, 6);
  // --- 5. tower with a shaft to climb, a door at the bottom and an opening on top
  rect(3140, 520, 400, 1240, 1);
  rect(3270, 560, 140, 1100, 0);              // shaft
  rect(3140, 1450, 140, 110, 0);              // door (west side)
  rect(3270, 520, 140, 40, 0);                // top opening
  for (let i = 0; i < 5; i++) { const yy = 700 + i * 190; blob(i % 2 ? 3398 : 3282, yy, 22, 16, 1, 4); } // ledges to hook in the shaft
  blob(3060, 1120, 60, 40, 1, 10);
  rect(3170, 250, 340, 46, 1);                // bar above the tower: hook it to climb out of the shaft
  blob(2990, 640, 34, 26, 1, 6);
  // --- 6. small rocks everywhere so there is always something to hook (kept off the course points)
  const course = [
    { x: 560, y: 1040, label: '1' }, { x: 1150, y: 810, label: '2' }, { x: 1480, y: 1150, label: '3' },
    { x: 2020, y: 1325, label: '4' }, { x: 2660, y: 640, label: '5' }, { x: 3340, y: 1500, label: '6' },
    { x: 3340, y: 430, label: '도착', finish: true },
  ];
  const start = { x: 200, y: 1418 };
  for (let i = 0; i < 26; i++) {
    const x = 500 + Math.floor(rngNext(st) * 2500), y = 380 + Math.floor(rngNext(st) * 1000), r = 20 + Math.floor(rngNext(st) * 22);
    let ok = true;
    for (const c of course) { const dx = c.x - x, dy = c.y - y; if (dx * dx + dy * dy < 140 * 140) ok = false; }
    if (Math.abs(x - 2020) < 380 && y > 900) ok = false; // keep the mountain clean
    if (x > 2380 && x < 3020 && y < 360) ok = false;
    if (ok) blob(x, y, r, r * 0.75, 1, 5);
  }
  // keep the course points themselves free
  for (const c of course) blob(c.x, c.y, 34, 34, 0, 0);
  blob(start.x, start.y - 10, 20, 26, 0, 0);
  // settle the start point on the ground
  let sy = start.y; while (sy < H - 1 && !courseSolid({ W, H, mask }, start.x, sy + WORM_R + 1)) sy++;
  start.y = sy;
  return { W, H, mask, waterY, course, start, seed: seed || 20261018 };
}
function courseSolid(map, x, y) {
  x = Math.floor(x); y = Math.floor(y);
  if (x < 0 || x >= map.W) return true; // side walls
  if (y < 0 || y >= map.H) return false; // open sky / below the sea
  return map.mask[y * map.W + x] === 1;
}
