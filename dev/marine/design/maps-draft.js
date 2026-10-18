// Map design draft: 12 maps after the original Battle Marine list. Uses the helpers of src/mapgen.js
// (fillBand, fillPoly, fillEllipse, rotPts, seabed) plus a few below. 0 water, 1 rock, 2 metal/bedrock (never dug).
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

const NEWMAPS = {
  // ---------------------------------------------------------------- 12 GOD: a neon cyber temple. Twelve pillars (six from
  // the ceiling, six from the floor, offset) with an unbreakable metal core and a rock sheath; four floating data blocks
  god12: {
    W: 4000, H: 1700,
    gen(W, H, m) {
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
    spawns: [[420, 640], [900, 1000], [1250, 420], [1550, 1150], [1700, 760], [2000, 760], [2300, 760], [2450, 1150], [2750, 420], [3100, 1000], [3550, 640], [3650, 1200]],
  },
  // ---------------------------------------------------------------- Atlantic: wide open ocean. A row of cross-shaped reefs
  // at mid depth (the original's + + . +), a few sea mounts far below. Long range: the pure eye test
  atlantic: {
    W: 4800, H: 1500,
    gen(W, H, m) {
      const f = floorOf(H, 180, 40, 14); seabed(m, W, H, f);
      for (const [x, y, s] of [[1050, 650, 1], [1950, 760, 1.15], [3000, 640, 0.8], [3850, 740, 1.05]]) {
        rectM(m, W, H, x - 190 * s, y - 34, x + 190 * s, y + 34); rectM(m, W, H, x - 34, y - 190 * s, x + 34, y + 190 * s); fillEllipse(m, W, H, x, y, 60, 60);
      }
      for (const [fx, w, h] of [[0.12, 260, 220], [0.5, 360, 300], [0.86, 300, 240]]) { const x = W * fx; fillPoly(m, W, H, [[x - w, f(x) + 40], [x - w * 0.25, f(x) - h], [x + w * 0.3, f(x) - h * 0.9], [x + w, f(x) + 40]]); }
    },
    spawns: [[300, 420], [560, 900], [1050, 300], [1450, 1000], [1950, 360], [2450, 1050], [2500, 520], [3000, 1030], [3400, 400], [3850, 330], [4250, 980], [4500, 520]],
  },
  // ---------------------------------------------------------------- Battle Field: two sunken bunkers facing each other,
  // trenches in the floor, anti-sub poles and a sagging net line in no-man's-land
  battlefield: {
    W: 4200, H: 1600,
    gen(W, H, m) {
      const f = x => H - 260 + 18 * tsin(x / 140); seabed(m, W, H, f);
      for (const s of [-1, 1]) {
        const cx = s < 0 ? 520 : W - 520;
        rectM(m, W, H, cx - 300, H - 760, cx + 300, f(cx) + 20);              // bunker block
        rectM(m, W, H, cx - 330, H - 800, cx + 330, H - 740, 2);             // concrete roof slab (metal)
        rectM(m, W, H, cx - 200, H - 640, cx + 200, H - 440, 0);              // inner room
        rectM(m, W, H, cx + s * 200 - 20, H - 590, cx + s * 320, H - 520, 0); // firing slit toward the middle
        rectM(m, W, H, cx - s * 60, H - 440, cx + s * 40, f(cx) + 20, 0);     // stair shaft down to the trench
        for (const k of [0, 1]) { const tx = cx + s * (520 + k * 260); rectM(m, W, H, tx - 70, f(tx) - 10, tx + 70, f(tx) + 120, 0); }
      }
      for (const x of [1550, 1800, 2400, 2650]) rectM(m, W, H, x - 14, f(x) - 520, x + 14, f(x) + 10, 2);
      for (let x = 1550; x <= 2650; x += 20) { const t = (x - 1550) / 1100, y = H - 780 + 120 * 4 * t * (1 - t); fillEllipse(m, W, H, x, y, 12, 10); }
      for (const [x, r] of [[2100, 120], [1300, 80], [2900, 80]]) fillEllipse(m, W, H, x, f(x) - 40, r * 1.6, r);
    },
    spawns: [[350, 300], [520, 540], [820, 1100], [1150, 420], [1350, 1150], [1700, 330], [2100, 560], [2500, 330], [2850, 1150], [3050, 420], [3380, 1100], [3850, 300]],
  },
  // ---------------------------------------------------------------- Bermuda: the triangle. A big hollow triangle of rock
  // (gaps at the corners) with a lost ship inside; zig-zag reef "waves" swirl around it
  bermuda: {
    W: 4200, H: 1700,
    gen(W, H, m) {
      const f = floorOf(H, 200, 30, 12); seabed(m, W, H, f);
      const A = [2100, 260], B = [1350, 1250], C = [2850, 1250];
      const side = (p, q) => { const n = 20; for (let i = 3; i <= n - 3; i++) { const t = i / n; fillEllipse(m, W, H, p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, 46, 46); } };
      side(A, B); side(B, C); side(C, A);
      fillPoly(m, W, H, [[1880, 1010], [2330, 1010], [2270, 1100], [1950, 1100]]); rectM(m, W, H, 2080, 860, 2100, 1010); // lost ship
      for (const [x0, y0, n, amp] of [[200, 380, 6, 70], [3000, 420, 6, 70], [260, 900, 5, 60], [3150, 980, 5, 60], [1500, 160, 5, 40]]) {
        for (let i = 0; i < n; i++) barM(m, W, H, x0 + i * 150, y0 + (i % 2 ? amp : -amp), x0 + (i + 1) * 150, y0 + (i % 2 ? -amp : amp), 34);
      }
    },
    spawns: [[260, 620], [500, 1200], [850, 250], [1100, 700], [1650, 380], [2100, 820], [2550, 380], [3050, 700], [3350, 250], [3700, 1250], [3900, 650], [2100, 1400]],
  },
  // ---------------------------------------------------------------- Cave: the original's cave. A thick wavy ceiling and floor
  // bulging toward each other, stalactites, and floating boulders (the "objects") in between
  cave: {
    W: 4000, H: 1700,
    gen(W, H, m) {
      rectM(m, W, H, 0, 0, W, 40, 2);
      fillBand(m, W, H, 0, W - 1, () => 0, x => 220 + 150 * (0.5 + 0.5 * tsin(x / 260)) + 40 * tsin(x / 70));
      seabed(m, W, H, x => H - 230 - 150 * (0.5 + 0.5 * tsin(x / 260 + 2.4)) - 40 * tsin(x / 64));
      for (let i = 0; i < 14; i++) { const x = 140 + i * 270 + 40 * tsin(i * 3.1), top = 220 + 150 * (0.5 + 0.5 * tsin(x / 260)), L = 90 + 70 * (0.5 + 0.5 * tsin(i * 1.9)); fillPoly(m, W, H, [[x - 36, top - 10], [x + 36, top - 10], [x, top + L]]); }
      for (const [x, y, rx, ry] of [[700, 820, 150, 90], [1450, 650, 110, 120], [2050, 950, 180, 100], [2650, 640, 120, 110], [3300, 860, 160, 95]]) fillEllipse(m, W, H, x, y, rx, ry);
    },
    spawns: [[280, 700], [450, 1050], [1000, 560], [1050, 1050], [1450, 950], [1750, 560], [2350, 700], [2650, 1000], [2950, 520], [3300, 1100], [3650, 600], [3800, 1000]],
  },
  // ---------------------------------------------------------------- Cube: a lattice of square blocks of different sizes.
  // Some hide a metal cube inside; corners everywhere for cross and vertical bursts
  cube: {
    W: 3800, H: 1800,
    gen(W, H, m) {
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
    spawns: [[330, 520], [590, 330], [850, 900], [1110, 520], [1370, 1100], [1630, 330], [1890, 900], [2150, 520], [2410, 1100], [2930, 330], [3190, 900], [3450, 520]],
  },
  // ---------------------------------------------------------------- Duke: a sunken duke's castle. Two towers with
  // battlements, curtain walls, a keep with a gate arch through it
  duke: {
    W: 4400, H: 1700,
    gen(W, H, m) {
      const f = x => H - 240 + 20 * tsin(x / 400); seabed(m, W, H, f);
      const crenel = (x0, x1, y) => { for (let x = x0; x < x1; x += 80) rectM(m, W, H, x, y - 50, x + 44, y + 2); };
      for (const cx of [1000, 3400]) {
        rectM(m, W, H, cx - 150, 520, cx + 150, f(cx) + 20); crenel(cx - 150, cx + 150, 520);
        rectM(m, W, H, cx - 40, 640, cx + 40, 720, 0); rectM(m, W, H, cx - 40, 880, cx + 40, 960, 0);
        rectM(m, W, H, cx - 20, 520, cx + 20, f(cx), 2);
      }
      const k = 2200; rectM(m, W, H, k - 260, 380, k + 260, f(k) + 20); crenel(k - 260, k + 260, 380);
      fillEllipse(m, W, H, k, f(k) - 220, 150, 220, 0); rectM(m, W, H, k - 150, f(k) - 220, k + 150, f(k) + 10, 0); // gate arch
      rectM(m, W, H, k - 70, 520, k + 70, 640, 0);                                                                    // great hall window
      for (const [a, b] of [[1150, 1940], [2460, 3250]]) { rectM(m, W, H, a, 860, b, 940); crenel(a, b, 860); }
      for (const [g0, g1] of [[1700, 1860], [2540, 2700]]) { rectM(m, W, H, g0, 800, g1, 945, 0); fillEllipse(m, W, H, (g0 + g1) / 2, 945, 80, 40, 0); } // breached walls: the way into the courtyards
      for (const x of [300, 4100]) fillEllipse(m, W, H, x, f(x) - 30, 200, 110);
    },
    spawns: [[300, 600], [600, 1150], [1000, 300], [1400, 650], [1300, 1150], [1950, 300], [2450, 300], [3100, 1150], [3000, 650], [3400, 300], [3800, 1150], [4100, 600]],
  },
  // ---------------------------------------------------------------- Iceberg: icebergs hang from the surface (the bulk below
  // water, wider than the tip), one broken floe drifting, the sea floor far down
  iceberg: {
    W: 4200, H: 1700,
    gen(W, H, m) {
      const f = floorOf(H, 170, 40, 16); seabed(m, W, H, f);
      for (const [cx, w, d] of [[700, 300, 760], [2050, 420, 980], [3450, 340, 700]]) {
        fillPoly(m, W, H, [[cx - w * 0.5, 0], [cx + w * 0.45, 0], [cx + w * 0.9, d * 0.35], [cx + w * 0.75, d * 0.7], [cx + w * 0.2, d], [cx - w * 0.35, d * 0.85], [cx - w * 0.95, d * 0.45], [cx - w * 0.8, d * 0.15]]);
        fillEllipse(m, W, H, cx - w * 0.2, d * 0.55, w * 0.25, d * 0.12, 0); // a cave pocket in the ice
      }
      fillPoly(m, W, H, [[1250, 820], [1480, 780], [1560, 900], [1420, 990], [1230, 950]]);
      fillPoly(m, W, H, [[2750, 1060], [2980, 1010], [3050, 1120], [2860, 1190]]);
    },
    spawns: [[250, 500], [380, 1200], [700, 1050], [1250, 450], [1350, 1250], [2050, 1250], [2700, 450], [2750, 900], [3450, 1000], [3600, 1300], [3950, 500], [4000, 1150]],
  },
  // ---------------------------------------------------------------- Jurassic: a giant fossil skeleton on the floor (ribs
  // arch over a shelter, a skull with an eye hole), ammonites, and a field of small stones in the water
  jurassic: {
    W: 4200, H: 1600,
    gen(W, H, m) {
      const f = floorOf(H, 220, 26, 10); seabed(m, W, H, f);
      const spineY = x => H - 560 - 60 * tsin((x - 900) / 700);
      for (let x = 900; x <= 3000; x += 70) fillEllipse(m, W, H, x, spineY(x), 34, 26);
      for (let i = 0; i < 9; i++) { const x = 1300 + i * 140, r = 230 - Math.abs(i - 4) * 18; arcM(m, W, H, x, spineY(x) + r, r, 1900, 3500, 26); arcM(m, W, H, x, spineY(x) + r, r, 0, 300, 26); }
      fillPoly(m, W, H, [[3000, spineY(3000) - 60], [3380, spineY(3000) - 120], [3560, spineY(3000) + 10], [3380, spineY(3000) + 130], [3030, spineY(3000) + 90]]);
      fillEllipse(m, W, H, 3300, spineY(3000) - 40, 40, 34, 0);
      for (let x = 3080; x < 3520; x += 60) fillPoly(m, W, H, [[x, spineY(3000) + 110], [x + 30, spineY(3000) + 110], [x + 15, spineY(3000) + 170]]);
      for (const [x, y] of [[420, f(420) - 60], [3900, f(3900) - 60]]) { arcM(m, W, H, x, y, 80, 0, 3200, 30); arcM(m, W, H, x + 20, y + 10, 40, 0, 2600, 24); }
      for (let i = 0; i < 40; i++) { const x = 200 + ((i * 977) % 3800), y = 260 + ((i * 613) % 520), s = 18 + (i * 7) % 22; rectM(m, W, H, x - s, y - s, x + s, y + s); }
    },
    spawns: [[250, 900], [600, 450], [900, 1050], [1150, 300], [1700, 1150], [1900, 700], [2400, 1150], [2600, 380], [3000, 300], [3300, 1100], [3700, 560], [4000, 900]],
  },
  // ---------------------------------------------------------------- Nautilus: a giant chambered nautilus shell — a spiral
  // corridor with inner walls (each with a hole) — and swirling coral like the original's
  nautilus: {
    W: 4000, H: 1700,
    gen(W, H, m) {
      const f = floorOf(H, 200, 30, 12); seabed(m, W, H, f);
      const cx = 2000, cy = 800;
      // log spiral r = a * e^(b*theta): sampled with the table, grows ~1.75x per half turn
      let r = 110; for (let a = 0; a <= 9000; a += 15) { r *= 1.0026; if (r > 720) break; fillEllipse(m, W, H, cx + r * cosD10(a), cy + r * sinD10(a) * 0.8, 24 + r * 0.06, 24 + r * 0.06); }
      { let rr = 110; const marks = {}; for (let a = 0; a <= 9000; a += 15) { rr *= 1.0026; if (a % 900 === 450 && a > 900 && rr < 720) { const r1 = rr * 0.62, r2 = rr * 0.86; barM(m, W, H, cx + r1 * cosD10(a), cy + r1 * sinD10(a) * 0.8, cx + r2 * cosD10(a), cy + r2 * sinD10(a) * 0.8, 24); fillEllipse(m, W, H, cx + rr * 0.74 * cosD10(a), cy + rr * 0.74 * sinD10(a) * 0.8, 26, 26, 0); } } } // inner walls (septa), each with a hole
      
      for (const [x, y, s] of [[500, 500, 1], [3500, 520, -1], [650, 1100, -1], [3350, 1120, 1]]) for (let a = 0; a <= 2400; a += 40) { const rr = 60 + a / 24; fillEllipse(m, W, H, x + s * rr * cosD10(a), y + rr * sinD10(a) * 0.6, 26, 22); }
    },
    spawns: [[220, 750], [500, 300], [850, 850], [1000, 1300], [1300, 400], [1700, 1300], [2700, 400], [2300, 1300], [3000, 850], [3150, 1300], [3500, 300], [3800, 800]],
  },
  // ---------------------------------------------------------------- Sea City: an undersea city under a metal canopy. Lift
  // shaft from the ceiling, walkway platforms on two levels, domes and spires on the city floor
  seacity: {
    W: 4200, H: 1800,
    gen(W, H, m) {
      rectM(m, W, H, 0, 0, W, 90, 2); rectM(m, W, H, 0, 90, W, 130);
      rectM(m, W, H, 1950, 120, 2250, 760); rectM(m, W, H, 2060, 120, 2140, 740, 2); rectM(m, W, H, 1990, 300, 2210, 420, 0); // lift shaft + cabin bay
      for (const [x0, x1, y] of [[60, 900, 560], [3300, 4140, 560], [450, 1500, 1000], [2700, 3750, 1000]]) { rectM(m, W, H, x0, y - 22, x1, y + 22, 2); rectM(m, W, H, x0 + 40, y + 22, x1 - 40, y + 60); }
      const f = x => H - 200 + 10 * tsin(x / 200); seabed(m, W, H, f);
      for (const [x, r] of [[700, 230], [2100, 300], [3500, 230]]) { fillEllipse(m, W, H, x, f(x), r, r * 0.8); fillEllipse(m, W, H, x, f(x), r - 50, r * 0.8 - 50, 0); rectM(m, W, H, x - r, f(x), x + r, f(x) + 40); }
      for (const [x, h] of [[1300, 520], [1450, 380], [2800, 460], [2950, 600]]) { rectM(m, W, H, x - 50, f(x) - h, x + 50, f(x) + 20); fillPoly(m, W, H, [[x - 50, f(x) - h], [x + 50, f(x) - h], [x, f(x) - h - 140]]); rectM(m, W, H, x - 8, f(x) - h - 140, x + 8, f(x), 2); }
    },
    spawns: [[300, 400], [480, 820], [700, 1250], [1200, 400], [1150, 820], [2100, 900], [2100, 1150], [3000, 400], [3050, 820], [3500, 1250], [3700, 820], [3900, 400]],
  },
  // ---------------------------------------------------------------- Spa: a cosy hot spring. Crossed bamboo poles leaning
  // every way (the original's X sticks), stone tubs on the floor, pebble stacks
  spa: {
    W: 3800, H: 1500,
    gen(W, H, m) {
      const f = floorOf(H, 200, 20, 8); seabed(m, W, H, f);
      for (const [x, y, L, a] of [[600, 450, 520, 300], [1250, 700, 460, -350], [1900, 380, 560, 250], [2600, 650, 500, -280], [3250, 420, 480, 330], [1550, 1000, 380, 150], [2950, 1000, 380, -170]]) {
        for (const s of [1, -1]) { const aa = s * a; barM(m, W, H, x - L / 2 * cosD10(aa), y - L / 2 * sinD10(aa), x + L / 2 * cosD10(aa), y + L / 2 * sinD10(aa), 30); }
      }
      for (const [x, w] of [[700, 300], [2000, 380], [3200, 300]]) { const y = f(x); fillEllipse(m, W, H, x, y - 40, w, 150); fillEllipse(m, W, H, x, y - 90, w - 50, 140, 0); rectM(m, W, H, x - w, y - 250, x + w, y - 120, 0); }
      for (const x of [1350, 2650]) for (let k = 0; k < 4; k++) fillEllipse(m, W, H, x, f(x) - 30 - k * 62, 70 - k * 12, 30);
    },
    spawns: [[250, 600], [450, 1050], [700, 250], [1000, 900], [1250, 300], [1700, 650], [2300, 250], [2250, 900], [2900, 300], [3300, 950], [3550, 650], [3650, 250]],
  },
};
const NEWMETA = {
  god12: { name: '12신', en: '12 GOD', tag: '사이버 신전 · 기둥 12개', desc: '네온 회로가 흐르는 사이버 신전. 천장과 바닥에서 엇갈려 뻗은 신의 기둥 12개는 겉은 부서져도 속심(금속)은 남는다.', pal: ['#0A0F2C', '#1B2A6B', '#38E1FF', '#FF4FD8'], gimmick: '기둥 속심은 안 부서짐 — 엄폐는 깎이지만 사라지지 않음' },
  atlantic: { name: '아틀란틱', en: 'Atlantic', tag: '대양 · 탁 트인 전장', desc: '가장 기본이 되는 넓은 바다. 중간 수심에 십자 모양 암초 4개만 떠 있어, 맵을 보고 거리를 재는 눈대중 실력이 그대로 드러난다.', pal: ['#0B4F7C', '#1C7CB8', '#7FD3F2', '#E9F6FF'], gimmick: '맵이 가장 넓고 엄폐가 적음 · 해류 영향 큼' },
  battlefield: { name: '배틀 필드', en: 'Battle Field', tag: '벙커 · 참호 · 대잠망', desc: '양쪽 끝에 가라앉은 벙커, 바닥엔 참호, 가운데엔 대잠 기둥과 처진 그물. 전선이 뚜렷한 정석 전장.', pal: ['#28331F', '#4D5B37', '#B9A66B', '#E05A3A'], gimmick: '벙커 지붕은 콘크리트(안 부서짐), 총안으로 쏘고 숨기' },
  bermuda: { name: '버뮤다', en: 'Bermuda', tag: '삼각지대 · 소용돌이 물결', desc: '한가운데 거대한 삼각형 암벽, 그 안에 길 잃은 배. 바깥은 지그재그 물결 암초가 휘감는다.', pal: ['#0B2B3B', '#155E63', '#5FE0C8', '#F2C14E'], gimmick: '(제안) 삼각형 안에서는 해류 2배' },
  cave: { name: '케이브', en: 'Cave', tag: '동굴 천장 · 종유석 · 떠 있는 바위', desc: '원작 케이브처럼 위아래가 출렁이는 두꺼운 동굴. 천장의 종유석과 가운데 떠 있는 바위 사이로 곡선을 꿰어야 한다.', pal: ['#1E1A26', '#3B3347', '#9C8BB5', '#F0C46B'], gimmick: '위로 빠져나갈 수 없음 · 곡선 실력 맵' },
  cube: { name: '큐브', en: 'Cube', tag: '격자 블록 · 금속 심', desc: '크기가 다른 정육면체 블록이 격자로 떠 있다. 일부는 속에 금속 큐브가 박혀 있어 다 부서지지 않는다. 직각 모서리가 많아 십자·세로 폭발이 빛난다.', pal: ['#14213D', '#2B4C7E', '#FCA311', '#E5E5E5'], gimmick: '모서리 많은 격자 · 십자 폭발 유리' },
  duke: { name: '듀크', en: 'Duke', tag: '가라앉은 공작의 성', desc: '탑 두 개와 성벽, 아치형 성문이 뚫린 본성. 성가퀴(톱니 모양 성벽) 사이로 숨고, 성문 아래로 돌아 들어간다.', pal: ['#1D1B2F', '#4B3F5C', '#C9A227', '#7A1F2B'], gimmick: '탑 중심은 안 부서짐 · 성문 아치 아래가 은신처' },
  iceberg: { name: '아이스버그', en: 'Iceberg', tag: '빙산 · 떠다니는 유빙', desc: '수면에서 거꾸로 매달린 빙산 셋(물 아래가 더 크다), 부서진 유빙 조각. 빙산 속 동굴에 숨을 수 있다.', pal: ['#0E3B5C', '#2A7BB0', '#CFEFFF', '#FFFFFF'], gimmick: '(제안) 얼음은 잘 깨짐: 파이는 크기 1.4배' },
  jurassic: { name: '쥬라기', en: 'Jurassic', tag: '공룡 화석 · 암모나이트', desc: '바닥에 누운 거대한 공룡 화석. 갈비뼈가 아치처럼 덮어 안은 은신처, 해골 눈구멍은 저격 구멍. 물속엔 작은 돌 부스러기가 가득.', pal: ['#2B1D14', '#6B4A2F', '#E3C9A0', '#A8C66C'], gimmick: '갈비뼈 사이 틈으로 곡선 통과하기' },
  nautilus: { name: '노틸러스', en: 'Nautilus', tag: '거대 앵무조개 껍데기', desc: '한가운데 앵무조개 껍데기. 나선 복도 안쪽 칸막이마다 구멍이 있어, 곡선을 빙글 돌려 안쪽 깊숙이 숨은 적을 노린다.', pal: ['#0F2D3A', '#1F6E78', '#F4D6A0', '#E07A5F'], gimmick: '나선 복도 · 이 맵이 곡선 조준의 끝판왕' },
  seacity: { name: '씨 시티', en: 'Sea City', tag: '해저 도시 · 2층 통로 · 리프트', desc: '금속 천장 아래 해저 도시. 천장에서 내려온 리프트 기둥, 좌우 2층으로 놓인 금속 통로, 바닥엔 돔과 첨탑. 원작 씨 시티 구조를 그대로.', pal: ['#081A33', '#123A6B', '#4FC3F7', '#FF66C4'], gimmick: '통로·첨탑 심은 금속(안 부서짐) · 층마다 전투' },
  spa: { name: '스파', en: 'Spa', tag: '온천 · 엇갈린 대나무 · 돌 욕조', desc: '아기자기한 해저 온천. 엇갈려 기댄 대나무 장대(원작의 X자)와 바닥의 돌 욕조, 돌탑. 욕조 안은 아늑한 은신처.', pal: ['#103A3A', '#2E7D6B', '#F7C59F', '#FF8FAB'], gimmick: '(제안) 욕조에서 올라오는 기포가 어뢰를 위로 밀어 올림' },
};
const ORDER12 = ['god12', 'atlantic', 'battlefield', 'bermuda', 'cave', 'cube', 'duke', 'iceberg', 'jurassic', 'nautilus', 'seacity', 'spa'];
if (typeof module !== 'undefined') module.exports = { NEWMAPS, NEWMETA, ORDER12 };
