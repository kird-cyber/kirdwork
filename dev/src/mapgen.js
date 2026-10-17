// ============================================================== MAP GENERATION (pure JS, deterministic)
// Builds a Uint8Array mask (1 = solid). No canvas: canvas rasterisation differs between browsers.

function maskNew(W, H) { return new Uint8Array(W * H); }
function fillSpan(mask, W, H, x, y0, y1) {
  if (x < 0 || x >= W) return;
  y0 = Math.max(0, y0); y1 = Math.min(H - 1, y1);
  for (let y = y0; y <= y1; y++) mask[y * W + x] = 1;
}
// Column band between top(x) and bot(x), pixel centres.
function fillBand(mask, W, H, x0, x1, top, bot) {
  for (let x = x0; x <= x1; x++) {
    const t = top(x + 0.5), b = bot(x + 0.5);
    if (b > t) fillSpan(mask, W, H, x, Math.ceil(t - 0.5), Math.floor(b - 0.5));
  }
}
// Even-odd scanline polygon fill, pts = [[x,y],...].
function fillPoly(mask, W, H, pts) {
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
      for (let x = xa; x <= xb; x++) mask[y * W + x] = 1;
    }
  }
}
function fillCircle(mask, W, H, cx, cy, r) {
  const y0 = Math.max(0, Math.floor(cy - r)), y1 = Math.min(H - 1, Math.ceil(cy + r));
  for (let y = y0; y <= y1; y++) {
    const dy = y + 0.5 - cy, d2 = r * r - dy * dy;
    if (d2 < 0) continue;
    const dx = Math.sqrt(d2);
    const xa = Math.max(0, Math.ceil(cx - dx - 0.5)), xb = Math.min(W - 1, Math.floor(cx + dx - 0.5));
    for (let x = xa; x <= xb; x++) mask[y * W + x] = 1;
  }
}
function quadPts(p0, p1, p2, n) {
  const out = [];
  for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t; out.push([u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]]); }
  return out;
}

const MAPGEN = {
  temple(W, H, mask) {
    const cx = W / 2, k = W / 3800;
    const top = x => {
      const d = Math.abs(x - cx);
      let t = 520 + 120 * smoothstepN(35, -35, d - 1250 * k) + 120 * smoothstepN(35, -35, d - 900 * k) + 100 * smoothstepN(35, -35, d - 450 * k);
      if (d < 450 * k) { const c = tcos(Math.PI * d / (900 * k)); t += 46 * c * c; }
      return t + 5 * tsin(x / 37) + 3 * tsin(x / 13);
    };
    const bot = x => {
      const b = 1120 + 38 * tsin(x / 210) + 22 * tsin(x / 71 + 1);
      const e = Math.min(x - 120, W - 120 - x);
      return Math.min(b, top(x) + 50 + e * 1.3);
    };
    fillBand(mask, W, H, 120, W - 121, top, bot);
    for (const ox of [Math.round(330 * k), Math.round(W - 330 * k)]) {
      const g = top(ox);
      fillPoly(mask, W, H, [[ox - 22, g + 10], [ox - 22, g - 120], [ox, g - 150], [ox + 22, g - 120], [ox + 22, g + 10]]);
    }
    for (const [fx, w, h] of [[0.18, 120, 120], [0.5, 180, 150], [0.82, 120, 110]]) {
      const x = Math.round(W * fx), b = bot(x);
      fillPoly(mask, W, H, [[x - w / 2, b - 10], [x, b + h], [x + w / 2, b - 10]]);
    }
  },
  valley(W, H, mask) {
    const cx = W / 2;
    const bump = x => { const c = tcos(Math.PI * (x - cx) / (W * 0.944)); return c * c; };
    const top = x => 470 + 360 * bump(x) + 6 * tsin(x / 41);
    const bot = x => top(x) + 34 + 44 * (1 - bump(x)) + 6 * tsin(x / 23);
    fillBand(mask, W, H, 120, W - 121, top, bot);
    const t2 = x => 1090 + 30 * tsin(x / 90) + 18 * tsin(x / 37);
    fillBand(mask, W, H, Math.round(W * 0.29), Math.round(W * 0.71), t2, x => t2(x) + 28 + 6 * tsin(x / 19));
    for (const [fx, w, h] of [[0.083, 70, 90], [0.117, 60, 140], [0.156, 80, 70], [0.844, 80, 70], [0.883, 60, 140], [0.917, 70, 90]]) {
      const x = Math.round(W * fx), g = top(x);
      fillPoly(mask, W, H, [[x - w / 2, g + 20], [x - w / 2, g - h], [x + w / 2, g - h], [x + w / 2, g + 20]]);
    }
  },
  clouds(W, H, mask) {
    const r = makeRng(4242);
    const mass = (cx, w, base, th) => {
      fillPoly(mask, W, H, [[cx - w / 2 + 40, base], [cx + w / 2 - 40, base], [cx + w / 2 - 40, base + th], [cx - w / 2 + 40, base + th]]);
      for (let x = cx - w / 2 + 40; x <= cx + w / 2 - 40; x += 55) {
        fillCircle(mask, W, H, x, base + 10 - rngNext(r) * 24, 60 + rngNext(r) * 50);
        fillCircle(mask, W, H, x, base + th - 10 + rngNext(r) * 20, 50 + rngNext(r) * 40);
      }
      fillCircle(mask, W, H, cx - w / 2 + 70, base + th / 2, th / 2 + 20);
      fillCircle(mask, W, H, cx + w / 2 - 70, base + th / 2, th / 2 + 20);
    };
    mass(1000, 1400, 820, 240);
    mass(3000, 1150, 900, 260);
    mass(5000, 1400, 800, 240);
    mass(2050, 280, 700, 70);
    mass(3950, 260, 660, 60);
  },
  bridge(W, H, mask) {
    const pillar = (x0, x1) => {
      const mid = (x0 + x1) / 2;
      const pts = quadPts([x0, 660], [mid, 610], [x1, 660], 24)
        .concat([[x1 - 30, 1050]])
        .concat(quadPts([x1 - 30, 1050], [mid, 1340], [x0 + 30, 1050], 24));
      fillPoly(mask, W, H, pts);
    };
    pillar(160, 560); pillar(W - 560, W - 160);
    const span = W - 1040;
    const top = x => 700 + 34 * tsin(Math.PI * (x - 520) / span);
    fillBand(mask, W, H, 520, W - 521, top, x => top(x) + 46);
  },
};

function maskSurface(mask, W, H, x, from) {
  x = Math.floor(x); if (x < 0 || x >= W) return -1;
  for (let y = Math.max(0, Math.floor(from || 0)); y < H; y++) if (mask[y * W + x]) return y;
  return -1;
}

// Builds mask + 12 spawn points spread across the standable surface.
function buildMap(mapId) {
  const meta = CONFIG.maps[mapId];
  const W = meta.W, H = meta.H, mask = maskNew(W, H);
  MAPGEN[mapId](W, H, mask);
  const cand = [];
  for (let x = 240; x <= W - 240; x += 20) {
    const y = maskSurface(mask, W, H, x, 0);
    if (y < 0) continue;
    // standable: ground on both sides within 12px and headroom
    const yl = maskSurface(mask, W, H, x - 18, y - 30), yr = maskSurface(mask, W, H, x + 18, y - 30);
    if (yl < 0 || yr < 0 || Math.abs(yl - y) > 12 || Math.abs(yr - y) > 12) continue;
    cand.push(x);
  }
  const N = 12, spawns = [];
  for (let i = 0; i < N; i++) spawns.push(cand[Math.round(i * (cand.length - 1) / (N - 1))]);
  return { id: mapId, W, H, mask, spawns, theme: meta.theme };
}
