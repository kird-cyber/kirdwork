// ============================================================== MAP GENERATION (pure JS, deterministic)
// Builds a Uint8Array mask: 0 = water, 1 = rock (explosions dig it), 2 = bedrock (never dug).
// No canvas: canvas rasterisation differs between browsers. Only tsin/tcos tables and sqrt.

function maskNew(W, H) { return new Uint8Array(W * H); }
function setPx(mask, W, H, x, y, v) { if (x >= 0 && x < W && y >= 0 && y < H && mask[y * W + x] !== 2) mask[y * W + x] = v; }
// column band between top(x) and bot(x), pixel centres
function fillBand(mask, W, H, x0, x1, top, bot, v) {
  v = v || 1; x0 = Math.max(0, x0); x1 = Math.min(W - 1, x1);
  for (let x = x0; x <= x1; x++) {
    const t = top(x + 0.5), b = bot(x + 0.5);
    if (b <= t) continue;
    const y0 = Math.max(0, Math.ceil(t - 0.5)), y1 = Math.min(H - 1, Math.floor(b - 0.5));
    for (let y = y0; y <= y1; y++) if (mask[y * W + x] !== 2 || v === 2) mask[y * W + x] = v;
  }
}
// even-odd scanline polygon fill, pts = [[x,y],...]
function fillPoly(mask, W, H, pts, v) {
  v = v === undefined ? 1 : v;
  let minY = Infinity, maxY = -Infinity;
  for (const p of pts) { if (p[1] < minY) minY = p[1]; if (p[1] > maxY) maxY = p[1]; }
  const y0 = Math.max(0, Math.floor(minY)), y1 = Math.min(H - 1, Math.ceil(maxY));
  for (let y = y0; y <= y1; y++) {
    const yc = y + 0.5, xs = [];
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const a = pts[i], b = pts[j];
      if ((a[1] > yc) !== (b[1] > yc)) xs.push(a[0] + (yc - a[1]) * (b[0] - a[0]) / (b[1] - a[1]));
    }
    xs.sort((p, q) => p - q);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const xa = Math.max(0, Math.ceil(xs[k] - 0.5)), xb = Math.min(W - 1, Math.floor(xs[k + 1] - 0.5));
      for (let x = xa; x <= xb; x++) if (mask[y * W + x] !== 2) mask[y * W + x] = v;
    }
  }
}
// filled ellipse (v = 0 clears, bedrock always stays)
function fillEllipse(mask, W, H, cx, cy, rx, ry, v) {
  v = v === undefined ? 1 : v;
  const y0 = Math.max(0, Math.floor(cy - ry)), y1 = Math.min(H - 1, Math.ceil(cy + ry));
  for (let y = y0; y <= y1; y++) {
    const dy = (y + 0.5 - cy) / ry, d2 = 1 - dy * dy;
    if (d2 < 0) continue;
    const dx = rx * Math.sqrt(d2);
    const xa = Math.max(0, Math.ceil(cx - dx - 0.5)), xb = Math.min(W - 1, Math.floor(cx + dx - 0.5));
    for (let x = xa; x <= xb; x++) if (mask[y * W + x] !== 2) mask[y * W + x] = v;
  }
}
// local (rotated) polygon helper: rotate by a10 tenths of a degree around (cx, cy)
function rotPts(pts, cx, cy, a10) { const c = cosD10(a10), s = sinD10(a10); return pts.map(p => [cx + p[0] * c - p[1] * s, cy + p[0] * s + p[1] * c]); }
// sea floor from y = top(x) down, with a bedrock skin at the very bottom so nothing falls out of the world
function seabed(mask, W, H, top) {
  fillBand(mask, W, H, 0, W - 1, top, () => H, 1);
  fillBand(mask, W, H, 0, W - 1, () => H - 36, () => H, 2);
}

function rectM(mask, W, H, x0, y0, x1, y1, v) { fillPoly(mask, W, H, [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], v === undefined ? 1 : v); }
// a straight bar of thickness th between two points
function barM(mask, W, H, x0, y0, x1, y1, th, v) {
  const dx = x1 - x0, dy = y1 - y0, L = Math.sqrt(dx * dx + dy * dy) || 1, nx = -dy / L * th / 2, ny = dx / L * th / 2;
  fillPoly(mask, W, H, [[x0 + nx, y0 + ny], [x1 + nx, y1 + ny], [x1 - nx, y1 - ny], [x0 - nx, y0 - ny]], v === undefined ? 1 : v);
}
// circular arc of thickness th (angles in tenths of a degree, 0 = right, 900 = down)
function arcM(mask, W, H, cx, cy, r, a0, a1, th, v) {
  const step = Math.max(4, Math.round(600 / Math.max(20, r)));
  for (let a = a0; a <= a1; a += step) fillEllipse(mask, W, H, cx + r * cosD10(a), cy + r * sinD10(a), th / 2, th / 2, v === undefined ? 1 : v);
}
function floorOf(H, base, a, b) { return x => H - base + a * tsin(x / 310) + b * tsin(x / 83 + 1); }


const MAPGEN = {
  // 12 GOD: a neon cyber temple. Twelve pillars (six from the ceiling, six from the floor, offset) with an unbreakable metal core and a rock sheath; four floating data blocks
  god12(W, H, m) {
    rectM(m, W, H, 0, 0, W, 70, 2); rectM(m, W, H, 0, H - 150, W, H, 2);
    for (let i = 0; i < 6; i++) {
      const xt = 400 + i * 640, xb = 720 + i * 640 - 640 * (i === 5 ? 1 : 0) * 0;
      const lt = 230 + 90 * ((i * 5) % 3), lb = 230 + 90 * ((i * 7 + 1) % 3);
      rectM(m, W, H, xt - 48, 60, xt + 48, 70 + lt); rectM(m, W, H, xt - 12, 60, xt + 12, 50 + lt, 2); fillEllipse(m, W, H, xt, 70 + lt, 62, 40);
      if (xb < W - 200) { rectM(m, W, H, xb - 48, H - 150 - lb, xb + 48, H - 140); rectM(m, W, H, xb - 12, H - 130 - lb, xb + 12, H - 140, 2); fillEllipse(m, W, H, xb, H - 150 - lb, 62, 40); }
    }
    for (const [y] of [[520], [1100]]) { rectM(m, W, H, 0, y - 30, 170, y + 30); rectM(m, W, H, W - 170, y - 30, W, y + 30); }
    for (const [x, y] of [[1250, 760], [2750, 760], [2000, 520], [2000, 1010]]) { rectM(m, W, H, x - 90, y - 60, x + 90, y + 60); rectM(m, W, H, x - 20, y - 20, x + 20, y + 20, 2); }
  },
  // Atlantic: wide open ocean. A row of cross-shaped reefs at mid depth (the original's + + . +), a few sea mounts far below. Long range: the pure eye test
  atlantic(W, H, m) {
    const f = floorOf(H, 180, 40, 14); seabed(m, W, H, f);
    for (const [x, y, s] of [[1050, 650, 1], [1950, 760, 1.15], [3000, 640, 0.8], [3850, 740, 1.05]]) {
      rectM(m, W, H, x - 190 * s, y - 34, x + 190 * s, y + 34); rectM(m, W, H, x - 34, y - 190 * s, x + 34, y + 190 * s); fillEllipse(m, W, H, x, y, 60, 60);
    }
    for (const [fx, w, h] of [[0.12, 260, 220], [0.5, 360, 300], [0.86, 300, 240]]) { const x = W * fx; fillPoly(m, W, H, [[x - w, f(x) + 40], [x - w * 0.25, f(x) - h], [x + w * 0.3, f(x) - h * 0.9], [x + w, f(x) + 40]]); }
  },
  // Battle Field: two sunken bunkers facing each other, trenches in the floor, anti-sub poles and a sagging net line in no-man's-land
  battlefield(W, H, m) {
    const f = x => H - 260 + 18 * tsin(x / 140); seabed(m, W, H, f);
    for (const s of [-1, 1]) {
      const cx = s < 0 ? 520 : W - 520;
      rectM(m, W, H, cx - 300, H - 760, cx + 300, f(cx) + 20);              // bunker block
      rectM(m, W, H, cx - 330, H - 800, cx + 330, H - 740, 2);             // concrete roof slab (metal)
      rectM(m, W, H, cx - 200, H - 640, cx + 200, H - 440, 0);              // inner room
      rectM(m, W, H, cx + s * 200 - 20, H - 600, cx + s * 320, H - 500, 0); // firing slit toward the middle
      rectM(m, W, H, cx - s * 60, H - 440, cx + s * 40, f(cx) + 20, 0);     // stair shaft down to the trench
      for (const k of [0, 1]) { const tx = cx + s * (520 + k * 260); rectM(m, W, H, tx - 70, f(tx) - 10, tx + 70, f(tx) + 120, 0); }
    }
    // anti-sub poles, alternating: up from the floor / hanging from surface buoys — there is always a way between them
    for (const [x, up] of [[1500, 1], [1800, 0], [2100, 1], [2400, 0], [2700, 1]]) {
      if (up) { rectM(m, W, H, x - 14, f(x) - 300, x + 14, f(x) + 10, 2); for (let k = 0; k < 3; k++) fillEllipse(m, W, H, x, f(x) - 300 + k * 14, 26 - k * 4, 8); }
      else { rectM(m, W, H, x - 14, 0, x + 14, 380, 2); fillEllipse(m, W, H, x, 30, 46, 30); fillEllipse(m, W, H, x, 380, 22, 18); }
    }
    for (const [x, r] of [[1300, 80], [2900, 80]]) fillEllipse(m, W, H, x, f(x) - 40, r * 1.6, r);
  },
  // Bermuda: the triangle. A big hollow triangle of rock (gaps at the corners) with a lost ship inside; zig-zag reef "waves" swirl around it
  bermuda(W, H, m) {
    const f = floorOf(H, 200, 30, 12); seabed(m, W, H, f);
    const A = [2100, 260], B = [1350, 1250], C = [2850, 1250];
    const side = (p, q) => { const n = 20; for (let i = 3; i <= n - 3; i++) { const t = i / n; fillEllipse(m, W, H, p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, 46, 46); } };
    side(A, B); side(B, C); side(C, A);
    fillPoly(m, W, H, [[1880, 1010], [2330, 1010], [2270, 1100], [1950, 1100]]); rectM(m, W, H, 2080, 860, 2100, 1010); // lost ship
    for (const [x0, y0, n, amp] of [[200, 380, 6, 70], [3000, 420, 6, 70], [260, 900, 5, 60], [3150, 980, 5, 60], [1500, 160, 5, 40]]) {
      for (let i = 0; i < n; i++) barM(m, W, H, x0 + i * 150, y0 + (i % 2 ? amp : -amp), x0 + (i + 1) * 150, y0 + (i % 2 ? -amp : amp), 34);
    }
  },
  // Cave: the original's cave. A thick wavy ceiling and floor bulging toward each other, stalactites, and floating boulders (the "objects") in between
  cave(W, H, m) {
    rectM(m, W, H, 0, 0, W, 40, 2);
    fillBand(m, W, H, 0, W - 1, () => 0, x => 220 + 150 * (0.5 + 0.5 * tsin(x / 260)) + 40 * tsin(x / 70));
    seabed(m, W, H, x => H - 230 - 150 * (0.5 + 0.5 * tsin(x / 260 + 2.4)) - 40 * tsin(x / 64));
    for (let i = 0; i < 14; i++) { const x = 140 + i * 270 + 40 * tsin(i * 3.1), top = 220 + 150 * (0.5 + 0.5 * tsin(x / 260)), L = 90 + 70 * (0.5 + 0.5 * tsin(i * 1.9)); fillPoly(m, W, H, [[x - 36, top - 10], [x + 36, top - 10], [x, top + L]]); }
    for (const [x, y, rx, ry] of [[700, 820, 150, 90], [1450, 650, 110, 120], [2050, 950, 180, 100], [2650, 640, 120, 110], [3300, 860, 160, 95]]) fillEllipse(m, W, H, x, y, rx, ry);
  },
  // Cube: a lattice of square blocks of different sizes. Some hide a metal cube inside; corners everywhere for cross and vertical bursts
  cube(W, H, m) {
    rectM(m, W, H, 0, H - 140, W, H, 2); rectM(m, W, H, 0, H - 260, W, H - 140);
    for (let i = 0; i < 9; i++) { const x = 220 + i * 420, h = 80 + 80 * ((i * 3) % 3); rectM(m, W, H, x - 90, H - 260 - h, x + 90, H - 250); }
    const sizes = [190, 290, 230, 340, 210, 300];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 7; c++) {
      if ((r * 7 + c) % 5 === 2) continue;
      const s = sizes[(r * 3 + c * 2) % sizes.length] / 2, x = 330 + c * 520 + (r % 2) * 260, y = 330 + r * 380;
      if (x > W - 200) continue;
      rectM(m, W, H, x - s, y - s, x + s, y + s);
      if ((r + c) % 3 === 0) rectM(m, W, H, x - s * 0.35, y - s * 0.35, x + s * 0.35, y + s * 0.35, 2);
    }
  },
  // Duke: a sunken duke's castle. Two towers with battlements, curtain walls, a keep with a gate arch through it
  duke(W, H, m) {
    const f = x => H - 240 + 20 * tsin(x / 400); seabed(m, W, H, f);
    const crenel = (x0, x1, y) => { for (let x = x0; x < x1; x += 80) rectM(m, W, H, x, y - 50, x + 44, y + 2); };
    // tall towers at the sides (windows through them at two heights)
    for (const cx of [1000, 3400]) {
      rectM(m, W, H, cx - 150, 520, cx + 150, f(cx) + 20); crenel(cx - 150, cx + 150, 520);
      rectM(m, W, H, cx - 160, 650, cx + 160, 760, 0); rectM(m, W, H, cx - 160, 1000, cx + 160, 1110, 0);
      rectM(m, W, H, cx - 20, 520, cx + 20, 640, 2); rectM(m, W, H, cx - 20, 770, cx + 20, 990, 2); rectM(m, W, H, cx - 20, 1120, cx + 20, f(cx), 2);
    }
    // a lower keep in the middle: the water above it is open; a great window and the gate arch go through it
    const k = 2200; rectM(m, W, H, k - 260, 820, k + 260, f(k) + 20); crenel(k - 260, k + 260, 820);
    fillEllipse(m, W, H, k, f(k) - 220, 150, 220, 0); rectM(m, W, H, k - 150, f(k) - 220, k + 150, f(k) + 10, 0); rectM(m, W, H, k - 280, f(k) - 190, k + 280, f(k) - 30, 0); // gate arch, open right through the keep
    rectM(m, W, H, k - 270, 900, k + 270, 1000, 0);                                                                 // great hall window, end to end
    // broken battlements floating high above the keep: they block the top lane where the keep leaves it open
    for (const [x, y, w] of [[1950, 420, 150], [2450, 420, 150]]) { rectM(m, W, H, x - w / 2, y - 30, x + w / 2, y + 30); crenel(x - w / 2, x + w / 2, y - 30); }
    // low curtain walls with breaches
    for (const [a, b] of [[1150, 1940], [2460, 3250]]) { rectM(m, W, H, a, 1060, b, 1130); crenel(a, b, 1060); }
    for (const [g0, g1] of [[1500, 1640], [2760, 2900]]) { rectM(m, W, H, g0, 1000, g1, 1135, 0); fillEllipse(m, W, H, (g0 + g1) / 2, 1135, 70, 34, 0); }
    for (const x of [300, 4100]) fillEllipse(m, W, H, x, f(x) - 30, 200, 110);
  },
  // Iceberg: icebergs hang from the surface (the bulk below water, wider than the tip), one broken floe drifting, the sea floor far down
  iceberg(W, H, m) {
    const f = floorOf(H, 170, 40, 16); seabed(m, W, H, f);
    for (const [cx, w, d] of [[700, 300, 760], [2050, 420, 980], [3450, 340, 700]]) {
      fillPoly(m, W, H, [[cx - w * 0.5, 0], [cx + w * 0.45, 0], [cx + w * 0.9, d * 0.35], [cx + w * 0.75, d * 0.7], [cx + w * 0.2, d], [cx - w * 0.35, d * 0.85], [cx - w * 0.95, d * 0.45], [cx - w * 0.8, d * 0.15]]);
      fillEllipse(m, W, H, cx - w * 0.2, d * 0.55, w * 0.25, d * 0.12, 0); // a cave pocket in the ice
    }
    fillPoly(m, W, H, [[1250, 820], [1480, 780], [1560, 900], [1420, 990], [1230, 950]]);
    fillPoly(m, W, H, [[2750, 1060], [2980, 1010], [3050, 1120], [2860, 1190]]);
  },
  // Jurassic: a giant fossil skeleton on the floor (ribs arch over a shelter, a skull with an eye hole), ammonites, and a field of small stones in the water
  jurassic(W, H, m) {
    const f = floorOf(H, 220, 26, 10); seabed(m, W, H, f);
    const spineY = x => H - 560 - 60 * tsin((x - 900) / 700);
    for (let x = 900; x <= 3000; x += 70) fillEllipse(m, W, H, x, spineY(x), 34, 26);
    for (let i = 0; i < 9; i++) { const x = 1300 + i * 140, r = 230 - Math.abs(i - 4) * 18; if (i % 2) arcM(m, W, H, x, spineY(x) + r, r, 2500, 3500, 26); else arcM(m, W, H, x, spineY(x) + r, r, 1900, 2900, 26); } // ribs open on alternating sides
    fillPoly(m, W, H, [[3000, spineY(3000) - 60], [3380, spineY(3000) - 120], [3560, spineY(3000) + 10], [3380, spineY(3000) + 130], [3030, spineY(3000) + 90]]);
    fillEllipse(m, W, H, 3300, spineY(3000) - 40, 40, 34, 0);
    for (let x = 3080; x < 3520; x += 60) fillPoly(m, W, H, [[x, spineY(3000) + 110], [x + 30, spineY(3000) + 110], [x + 15, spineY(3000) + 170]]);
    for (const [x, y] of [[420, f(420) - 60], [3900, f(3900) - 60]]) { arcM(m, W, H, x, y, 80, 0, 3200, 30); arcM(m, W, H, x + 20, y + 10, 40, 0, 2600, 24); }
    for (let i = 0; i < 22; i++) { const x = 200 + ((i * 977) % 3800), y = 260 + ((i * 613) % 520), s = 14 + (i * 7) % 16; rectM(m, W, H, x - s, y - s, x + s, y + s); }
  },
  // Nautilus: a giant chambered nautilus shell — a spiral corridor with inner walls (each with a hole) — and swirling coral like the original's
  nautilus(W, H, m) {
    const f = floorOf(H, 200, 30, 12); seabed(m, W, H, f);
    const cx = 2000, cy = 800;
    // log spiral r = a * e^(b*theta): sampled with the table, grows ~1.75x per half turn
    let r = 110; for (let a = 0; a <= 9000; a += 15) { r *= 1.0026; if (r > 720) break; fillEllipse(m, W, H, cx + r * cosD10(a), cy + r * sinD10(a) * 0.8, 24 + r * 0.06, 24 + r * 0.06); }
    { let rr = 110; const marks = {}; for (let a = 0; a <= 9000; a += 15) { rr *= 1.0026; if (a % 900 === 450 && a > 900 && rr < 720) { const r1 = rr * 0.62, r2 = rr * 0.86; barM(m, W, H, cx + r1 * cosD10(a), cy + r1 * sinD10(a) * 0.8, cx + r2 * cosD10(a), cy + r2 * sinD10(a) * 0.8, 24); fillEllipse(m, W, H, cx + rr * 0.74 * cosD10(a), cy + rr * 0.74 * sinD10(a) * 0.8, 26, 26, 0); } } } // inner walls (septa), each with a hole
    
    for (const [x, y, s] of [[500, 500, 1], [3500, 520, -1], [650, 1100, -1], [3350, 1120, 1]]) for (let a = 0; a <= 2400; a += 40) { const rr = 60 + a / 24; fillEllipse(m, W, H, x + s * rr * cosD10(a), y + rr * sinD10(a) * 0.6, 26, 22); }
  },
  // Sea City: an undersea city under a metal canopy. Lift shaft from the ceiling, walkway platforms on two levels, domes and spires on the city floor
  seacity(W, H, m) {
    rectM(m, W, H, 0, 0, W, 90, 2); rectM(m, W, H, 0, 90, W, 130);
    rectM(m, W, H, 1960, 120, 2240, 600); rectM(m, W, H, 2070, 120, 2130, 590, 2); rectM(m, W, H, 1990, 280, 2210, 400, 0); // lift shaft + cabin bay (short)
    // walkways in two pieces each, staggered: the upper ones outside, the lower ones toward the middle, gaps between
    for (const [x0, x1, y] of [[60, 640, 560], [820, 1300, 640], [2900, 3380, 640], [3560, 4140, 560], [450, 1000, 1000], [1250, 1750, 1080], [2450, 2950, 1080], [3200, 3750, 1000]]) { rectM(m, W, H, x0, y - 20, x1, y + 20, 2); rectM(m, W, H, x0 + 40, y + 20, x1 - 40, y + 54); }
    const f = x => H - 200 + 10 * tsin(x / 200); seabed(m, W, H, f);
    for (const [x, r] of [[700, 230], [2100, 280], [3500, 230]]) { fillEllipse(m, W, H, x, f(x), r, r * 0.8); fillEllipse(m, W, H, x, f(x), r - 50, r * 0.8 - 50, 0); rectM(m, W, H, x - r, f(x), x + r, f(x) + 40); }
    for (const [x, h] of [[1350, 360], [2850, 360]]) { rectM(m, W, H, x - 50, f(x) - h, x + 50, f(x) + 20); fillPoly(m, W, H, [[x - 50, f(x) - h], [x + 50, f(x) - h], [x, f(x) - h - 140]]); rectM(m, W, H, x - 8, f(x) - h - 140, x + 8, f(x), 2); }
  },
  // Spa: a cosy hot spring. Crossed bamboo poles leaning every way (the original's X sticks), stone tubs on the floor, pebble stacks
  spa(W, H, m) {
    const f = floorOf(H, 200, 20, 8); seabed(m, W, H, f);
    for (const [x, y, L, a] of [[600, 450, 520, 300], [1250, 700, 460, -350], [1900, 380, 560, 250], [2600, 650, 500, -280], [3250, 420, 480, 330], [1550, 1000, 380, 150], [2950, 1000, 380, -170]]) {
      for (const s of [1, -1]) { const aa = s * a; barM(m, W, H, x - L / 2 * cosD10(aa), y - L / 2 * sinD10(aa), x + L / 2 * cosD10(aa), y + L / 2 * sinD10(aa), 30); }
    }
    for (const [x, w] of [[700, 300], [2000, 380], [3200, 300]]) { const y = f(x); fillEllipse(m, W, H, x, y - 40, w, 150); fillEllipse(m, W, H, x, y - 90, w - 50, 140, 0); rectM(m, W, H, x - w, y - 250, x + w, y - 120, 0); }
    for (const x of [1350, 2650]) for (let k = 0; k < 4; k++) fillEllipse(m, W, H, x, f(x) - 30 - k * 62, 70 - k * 12, 30);
  },
};
// hand-placed start points (any depth, like the original); buildMap nudges each one into open water
const MAPSPAWNS = {
  god12: [[420, 640], [900, 1000], [1250, 420], [1550, 1150], [1700, 760], [2000, 760], [2300, 760], [2450, 1150], [2750, 420], [3100, 1000], [3550, 640], [3650, 1200]],
  atlantic: [[300, 420], [560, 900], [1050, 300], [1450, 1000], [1950, 360], [2450, 1050], [2500, 520], [3000, 1030], [3400, 400], [3850, 330], [4250, 980], [4500, 520]],
  battlefield: [[350, 300], [520, 540], [820, 1100], [1150, 420], [1350, 1150], [1700, 330], [2100, 560], [2500, 330], [2850, 1150], [3050, 420], [3380, 1100], [3850, 300]],
  bermuda: [[260, 620], [500, 1200], [850, 250], [1100, 700], [1650, 380], [2100, 820], [2550, 380], [3050, 700], [3350, 250], [3700, 1250], [3900, 650], [2100, 1400]],
  cave: [[280, 700], [450, 1050], [1000, 560], [1050, 1050], [1450, 950], [1750, 560], [2350, 700], [2650, 1000], [2950, 520], [3300, 1100], [3650, 600], [3800, 1000]],
  cube: [[330, 520], [590, 330], [850, 900], [1110, 520], [1370, 1100], [1630, 330], [1890, 900], [2150, 520], [2410, 1100], [2930, 330], [3190, 900], [3450, 520]],
  duke: [[300, 600], [600, 1150], [1000, 300], [1450, 700], [1300, 1250], [2200, 650], [2200, 260], [3100, 1250], [2950, 700], [3400, 300], [3800, 1150], [4100, 600]],
  iceberg: [[250, 500], [380, 1200], [700, 1050], [1250, 450], [1350, 1250], [2050, 1250], [2700, 450], [2750, 900], [3450, 1000], [3600, 1300], [3950, 500], [4000, 1150]],
  jurassic: [[250, 900], [600, 450], [900, 1050], [1150, 300], [1700, 1150], [1900, 700], [2400, 1150], [2600, 380], [3000, 300], [3300, 1100], [3700, 560], [4000, 900]],
  nautilus: [[220, 750], [500, 300], [850, 850], [1000, 1300], [1300, 400], [1700, 1300], [2700, 400], [2300, 1300], [3000, 850], [3150, 1300], [3500, 300], [3800, 800]],
  seacity: [[300, 400], [480, 820], [700, 1250], [1100, 450], [1100, 860], [2100, 820], [2100, 1150], [3100, 450], [3100, 860], [3500, 1250], [3700, 820], [3900, 400]],
  spa: [[250, 600], [450, 1050], [700, 250], [1000, 900], [1250, 300], [1700, 650], [2300, 250], [2250, 900], [2900, 300], [3300, 950], [3550, 650], [3650, 250]],
};

// open-water component reachable from the widest open area (spawns must all be in it)
function waterComponent(mask, W, H) {
  let seed = -1;
  for (let y = 60; y < H && seed < 0; y += 20) for (let x = Math.floor(W / 2); x < W; x += 20) if (!mask[y * W + x]) { seed = y * W + x; break; }
  const seen = new Uint8Array(W * H), q = new Int32Array(W * H);
  let qh = 0, qt = 0;
  if (seed >= 0) { q[qt++] = seed; seen[seed] = 1; }
  while (qh < qt) {
    const i = q[qh++], x = i % W;
    const nb = [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, i - W, i + W];
    for (const j of nb) if (j >= 0 && j < W * H && !seen[j] && !mask[j]) { seen[j] = 1; q[qt++] = j; }
  }
  return seen;
}
// a hull-sized ellipse (plus pad) around (x, y) is all water
function clearAround(mask, W, H, x, y, rx, ry) {
  for (let k = 0; k < 16; k++) {
    const a10 = k * 225, px = Math.round(x + rx * cosD10(a10)), py = Math.round(y + ry * sinD10(a10));
    if (px < 0 || py < 0 || px >= W || py >= H || mask[py * W + px]) return false;
  }
  return !mask[Math.round(y) * W + Math.round(x)];
}

// Builds mask + the 12 hand-placed spawn points (each nudged to the nearest spot where a hull fits in the open water).
function buildMap(mapId) {
  const meta = CONFIG.maps[mapId], P = CONFIG.physics;
  const W = meta.W, H = meta.H, mask = maskNew(W, H);
  MAPGEN[mapId](W, H, mask);
  const water = waterComponent(mask, W, H), spawns = [];
  for (const [x, y] of MAPSPAWNS[mapId]) {
    let best = null;
    for (let r = 0; r <= 400 && !best; r += 10) for (let a = 0; a < 3600 && !best; a += r ? 300 : 3600) {
      const px = Math.round(x + r * cosD10(a)), py = Math.round(y + r * sinD10(a));
      if (px > 60 && py > 60 && px < W - 60 && py < H - 60 && water[py * W + px] && clearAround(mask, W, H, px, py, P.hullRx + 20, P.hullRy + 20)) best = { x: px, y: py };
    }
    if (best) spawns.push(best);
  }
  return { id: mapId, W, H, mask, spawns, theme: meta.theme };
}
