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

const MAPGEN = {
  // 산호 협곡: three pillars with mushroom caps, floating rocks, a rolling sea floor
  reef(W, H, mask) {
    const floor = x => H - 330 + 60 * tsin(x / 310) + 30 * tsin(x / 97 + 1) + 12 * tsin(x / 23);
    seabed(mask, W, H, floor);
    for (const [fx, topY, cap] of [[0.27, 640, 190], [0.5, 520, 210], [0.73, 700, 180]]) {
      const cx = Math.round(W * fx), g = floor(cx) + 30;
      fillPoly(mask, W, H, [[cx - 70, g], [cx - 42, topY + 40], [cx + 42, topY + 40], [cx + 70, g]]);
      fillEllipse(mask, W, H, cx, topY, cap, 64);
      fillEllipse(mask, W, H, cx - cap * 0.55, topY + 30, cap * 0.35, 30); // drooping lip: shade below
      fillEllipse(mask, W, H, cx + cap * 0.55, topY + 30, cap * 0.35, 30);
    }
    for (const [fx, y, r] of [[0.11, 520, 90], [0.89, 560, 90], [0.38, 330, 64], [0.62, 360, 64]]) fillEllipse(mask, W, H, Math.round(W * fx), y, r * 1.3, r);
    for (let i = 0; i < 22; i++) { const x = 80 + i * (W - 160) / 21; fillEllipse(mask, W, H, x, floor(x) + 4, 34 + 14 * tsin(i * 1.7), 26 + 10 * tsin(i * 2.3)); }
  },
  // 해저 동굴: a big rock mass with a winding tunnel, two shafts and side pockets
  cave(W, H, mask) {
    const floor = x => H - 200 + 40 * tsin(x / 270) + 18 * tsin(x / 61);
    seabed(mask, W, H, floor);
    const x0 = Math.round(W * 0.15), x1 = Math.round(W * 0.85);
    const edge = x => Math.min(1, Math.min(x - x0, x1 - x) / 220);
    const top = x => 760 - edge(x) * (240 + 60 * tsin(x / 400) + 26 * tsin(x / 130));
    const bot = x => 760 + edge(x) * (460 + 50 * tsin(x / 350) + 20 * tsin(x / 77));
    fillBand(mask, W, H, x0, x1, top, bot);
    for (let x = W * 0.19; x <= W * 0.81; x += 6) fillEllipse(mask, W, H, x, 880 + 170 * tsin(x / 520), 78 + 14 * tsin(x / 90), 78 + 14 * tsin(x / 90), 0);
    for (const fx of [0.33, 0.66]) { const cx = W * fx; for (let y = top(cx) - 20; y <= 880 + 170 * tsin(cx / 520); y += 8) fillEllipse(mask, W, H, cx, y, 62, 62, 0); }
    for (const [fx, y, r] of [[0.24, 700, 110], [0.76, 1060, 110], [0.5, 1080, 120]]) fillEllipse(mask, W, H, W * fx, y, r * 1.2, r, 0);
  },
  // 침몰선: a huge tilted wreck lying on the sea floor, rooms inside, holes in the deck, two masts
  wreck(W, H, mask) {
    const floor = x => H - 240 + 30 * tsin(x / 330) + 14 * tsin(x / 70);
    seabed(mask, W, H, floor);
    const cx = W * 0.5, cy = H - 470, A = 60, L = 2100, T = 430;
    fillPoly(mask, W, H, rotPts([[-L / 2, -T / 2], [L / 2 - 220, -T / 2], [L / 2, -40], [L / 2 - 280, T / 2], [-L / 2 + 70, T / 2], [-L / 2, T / 2 - 90]], cx, cy, A));
    for (const [a, b] of [[-880, -470], [-370, 40], [140, 560]]) fillPoly(mask, W, H, rotPts([[a, -150], [b, -150], [b, 130], [a, 130]], cx, cy, A), 0);
    for (const [lx, ly, r] of [[-660, -215, 70], [360, -215, 70], [920, -60, 60], [-1050, -40, 70], [-120, -215, 56]]) { const p = rotPts([[lx, ly]], cx, cy, A)[0]; fillEllipse(mask, W, H, p[0], p[1], r, r, 0); }
    for (const lx of [-300, 420]) fillPoly(mask, W, H, rotPts([[lx - 13, -T / 2 - 430], [lx + 13, -T / 2 - 430], [lx + 13, -T / 2 + 10], [lx - 13, -T / 2 + 10]], cx, cy, A));
    for (const lx of [-300, 420]) fillPoly(mask, W, H, rotPts([[lx - 120, -T / 2 - 330], [lx + 120, -T / 2 - 330], [lx + 120, -T / 2 - 312], [lx - 120, -T / 2 - 312]], cx, cy, A));
    for (const [fx, r] of [[0.08, 70], [0.92, 80], [0.2, 50], [0.82, 55]]) fillEllipse(mask, W, H, W * fx, floor(W * fx) - 10, r * 1.4, r);
  },
  // 빙하 아래: unbreakable ice above, icicles hanging down, a narrow sea
  ice(W, H, mask) {
    fillBand(mask, W, H, 0, W - 1, () => 0, () => 70, 2);
    fillBand(mask, W, H, 0, W - 1, () => 0, x => 130 + 40 * tsin(x / 230) + 16 * tsin(x / 57), 1);
    for (let i = 0; i < 16; i++) {
      const x = 150 + i * (W - 300) / 15 + 60 * tsin(i * 2.1), len = 170 + 140 * (0.5 + 0.5 * tsin(i * 1.37)), w = 40 + 18 * tsin(i * 0.9);
      fillPoly(mask, W, H, [[x - w, 100], [x + w, 100], [x + w * 0.3, 100 + len * 0.7], [x, 100 + len], [x - w * 0.3, 100 + len * 0.7]]);
    }
    const bx = W * 0.5; fillPoly(mask, W, H, [[bx - 170, 90], [bx + 170, 90], [bx + 120, 600], [bx + 40, 680], [bx - 60, 660], [bx - 140, 560]]);
    const floor = x => H - 280 + 70 * tsin(x / 260) + 30 * tsin(x / 90 + 2);
    seabed(mask, W, H, floor);
    for (const fx of [0.22, 0.78]) { const x = W * fx; fillPoly(mask, W, H, [[x - 160, floor(x) + 20], [x - 40, floor(x) - 240], [x + 30, floor(x) - 260], [x + 150, floor(x) + 20]]); }
  },
  // 열수구: chimneys of different heights, stone arches between some of them
  vents(W, H, mask) {
    const floor = x => H - 260 + 50 * tsin(x / 300) + 20 * tsin(x / 80);
    seabed(mask, W, H, floor);
    const ch = [[0.16, 760], [0.3, 560], [0.44, 820], [0.58, 520], [0.72, 760], [0.86, 600]];
    for (const [fx, ty] of ch) {
      const x = W * fx, g = floor(x) + 30;
      fillPoly(mask, W, H, [[x - 95, g], [x - 46, ty + 30], [x - 62, ty], [x + 62, ty], [x + 46, ty + 30], [x + 95, g]]);
      fillEllipse(mask, W, H, x, ty + 6, 30, 22, 0); // the vent mouth
    }
    // arches: the upper half of a thick ring between neighbouring chimneys (shelter below)
    for (const [fa, fb, cyOff] of [[0.3, 0.44, 40], [0.58, 0.72, 60]]) {
      const xa = W * fa, xb = W * fb, mx = (xa + xb) / 2, rx = (xb - xa) / 2, base = Math.min(floor(xa), floor(xb)) - 360 + cyOff;
      fillEllipse(mask, W, H, mx, base, rx + 10, 230);
      fillEllipse(mask, W, H, mx, base + 20, rx - 50, 200, 0);
      fillBand(mask, W, H, Math.round(mx - rx - 20), Math.round(mx + rx + 20), () => base + 20, x => floor(x) + 40, 0);
      for (const fx of [fa, fb]) { const x = W * fx; fillPoly(mask, W, H, [[x - 95, floor(x) + 30], [x - 46, base + 30], [x + 46, base + 30], [x + 95, floor(x) + 30]]); }
    }
    for (const [fx, r] of [[0.06, 80], [0.94, 80], [0.51, 60]]) fillEllipse(mask, W, H, W * fx, floor(W * fx) - 10, r * 1.5, r);
  },
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

// Builds mask + 12 spawn points spread across the open water.
function buildMap(mapId) {
  const meta = CONFIG.maps[mapId], P = CONFIG.physics;
  const W = meta.W, H = meta.H, mask = maskNew(W, H);
  MAPGEN[mapId](W, H, mask);
  const water = waterComponent(mask, W, H);
  // per 80-px column: the reachable spot with the most room around it
  const cols = [];
  for (let x = 200; x <= W - 200; x += 80) {
    let best = null;
    for (let y = 160; y <= H - 160; y += 30) {
      if (!water[y * W + x] || !clearAround(mask, W, H, x, y, P.hullRx + 28, P.hullRy + 28)) continue;
      let room = 0; for (const r of [60, 90, 130, 180]) { if (clearAround(mask, W, H, x, y, r, r)) room = r; else break; }
      const score = room * 10 - Math.abs(y - H * 0.45) / 40;
      if (!best || score > best.score) best = { x, y, score };
    }
    if (best) cols.push({ x: best.x, y: best.y });
  }
  const N = 12, pick = G => { const out = []; for (const c of cols) if (!out.length || c.x - out[out.length - 1].x >= G) out.push(c); return out; };
  let G = 600; while (G > 80 && pick(G).length < N) G -= 20;
  const all = pick(G), spawns = [];
  for (let i = 0; i < N; i++) spawns.push(all[Math.round(i * (all.length - 1) / (N - 1))]);
  return { id: mapId, W, H, mask, spawns, theme: meta.theme };
}
