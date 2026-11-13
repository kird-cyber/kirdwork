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
function clearCircle(mask, W, H, cx, cy, r) {
  const y0 = Math.max(0, Math.floor(cy - r)), y1 = Math.min(H - 1, Math.ceil(cy + r));
  for (let y = y0; y <= y1; y++) {
    const dy = y + 0.5 - cy, d2 = r * r - dy * dy;
    if (d2 < 0) continue;
    const dx = Math.sqrt(d2);
    const xa = Math.max(0, Math.ceil(cx - dx - 0.5)), xb = Math.min(W - 1, Math.floor(cx + dx - 0.5));
    for (let x = xa; x <= xb; x++) mask[y * W + x] = 0;
  }
}
function quadPts(p0, p1, p2, n) {
  const out = [];
  for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t; out.push([u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]]); }
  return out;
}

const THICK = 1.5; // terrain thickness multiplier (surface stays where it is, the underside goes deeper)
const MAPGEN = {
  temple(W, H, mask) {
    const cx = W / 2, k = W / 3800;
    const top = x => {
      const d = Math.abs(x - cx);
      let t = 520 + 120 * smoothstepN(35, -35, d - 1250 * k) + 120 * smoothstepN(35, -35, d - 900 * k) + 100 * smoothstepN(35, -35, d - 450 * k);
      if (d < 450 * k) { const c = tcos(Math.PI * d / (900 * k)); t += 46 * c * c; }
      return t + 5 * tsin(x / 37) + 3 * tsin(x / 13);
    };
    const bot0 = x => {
      const b = 1120 + 38 * tsin(x / 210) + 22 * tsin(x / 71 + 1);
      const e = Math.min(x - 120, W - 120 - x);
      return Math.min(b, top(x) + 50 + e * 1.3);
    };
    const bot = x => Math.min(H - 70, top(x) + THICK * (bot0(x) - top(x)));
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
    const bot = x => top(x) + THICK * (34 + 44 * (1 - bump(x)) + 6 * tsin(x / 23));
    fillBand(mask, W, H, 120, W - 121, top, bot);
    const t2 = x => 1090 + 30 * tsin(x / 90) + 18 * tsin(x / 37);
    fillBand(mask, W, H, Math.round(W * 0.29), Math.round(W * 0.71), t2, x => t2(x) + THICK * (28 + 6 * tsin(x / 19)));
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
    mass(1000, 1400, 820, 240 * THICK);
    mass(3000, 1150, 900, 260 * THICK);
    mass(5000, 1400, 800, 240 * THICK);
    mass(2050, 280, 700, 70 * THICK);
    mass(3950, 260, 660, 60 * THICK);
  },
  bridge(W, H, mask) {
    const pillar = (x0, x1) => {
      const mid = (x0 + x1) / 2;
      const lo = 660 + THICK * 390, tip = Math.min(H - 60, 660 + THICK * 680);
      const pts = quadPts([x0, 660], [mid, 610], [x1, 660], 24)
        .concat([[x1 - 30, lo]])
        .concat(quadPts([x1 - 30, lo], [mid, tip], [x0 + 30, lo], 24));
      fillPoly(mask, W, H, pts);
    };
    pillar(160, 560); pillar(W - 560, W - 160);
    const span = W - 1040;
    const top = x => 700 + 34 * tsin(Math.PI * (x - 520) / span);
    fillBand(mask, W, H, 520, W - 521, top, x => top(x) + 46 * THICK);
  },
  // snow fortress: rolling snow fields, a stone castle wall near each side to hide behind or shoot over
  snow(W, H, mask) {
    const cx = W / 2;
    const top = x => 650 + 70 * tsin(x / 420) + 40 * tsin(x / 173 + 1) + 8 * tsin(x / 37) - 90 * Math.max(0, 1 - Math.abs(x - cx) / 700);
    const bot = x => { const e = Math.min(x - 100, W - 100 - x); return Math.min(H - 70, top(x) + Math.min(THICK * 260, 40 + e * 1.2)); };
    fillBand(mask, W, H, 100, W - 101, top, bot);
    for (const fx of [0.22, 0.78]) {
      const x = Math.round(W * fx), g = Math.min(top(x - 60), top(x + 60));
      fillPoly(mask, W, H, [[x - 60, g + 30], [x - 60, g - 150], [x + 60, g - 150], [x + 60, g + 30]]);
      for (let k = 0; k < 4; k++) fillPoly(mask, W, H, [[x - 60 + k * 34, g - 149], [x - 60 + k * 34, g - 176], [x - 60 + k * 34 + 18, g - 176], [x - 60 + k * 34 + 18, g - 149]]);
    }
  },
  // volcano: a cone in the middle, two lava pits with floating rocks above them
  lava(W, H, mask) {
    const cx = W / 2;
    const top = x => {
      const d = Math.abs(x - cx), c = Math.max(0, 1 - d / 1050);
      let t = 830 + 30 * tsin(x / 190) + 12 * tsin(x / 53) - 430 * c * c * (3 - 2 * c);
      if (d < 130) t += 90 * (1 - d / 130);
      return t;
    };
    const bot = x => Math.min(H - 60, 830 + THICK * 300 + 20 * tsin(x / 90));
    const g1 = Math.round(W * 0.27), g2 = Math.round(W * 0.73), gw = 120;
    fillBand(mask, W, H, 150, g1 - gw, top, bot);
    fillBand(mask, W, H, g1 + gw, g2 - gw, top, bot);
    fillBand(mask, W, H, g2 + gw, W - 151, top, bot);
    for (const gx of [g1, g2]) fillBand(mask, W, H, gx - 150, gx + 150, x => { const u = (x - gx) / 150; return 560 + 26 * u * u + 4 * tsin(x / 17); }, x => { const u = (x - gx) / 150; return 560 + THICK * 70 - 60 * u * u; });
  },
  // moon base: low gravity (see CONFIG.maps.moon.gravity), craters and two flat mesas
  moon(W, H, mask) {
    const top = x => 720 + 60 * tsin(x / 510) + 30 * tsin(x / 190 + 2) + 5 * tsin(x / 29);
    const bot = x => { const e = Math.min(x - 120, W - 120 - x); return Math.min(H - 70, top(x) + Math.min(THICK * 260, 40 + e * 1.2)); };
    fillBand(mask, W, H, 120, W - 121, top, bot);
    for (const fx of [0.33, 0.67]) { const x = Math.round(W * fx), g = top(x); fillPoly(mask, W, H, [[x - 170, g + 20], [x - 130, g - 150], [x + 130, g - 150], [x + 170, g + 20]]); }
    for (const [fx, r] of [[0.14, 150], [0.5, 230], [0.86, 150], [0.24, 90], [0.76, 90]]) { const x = Math.round(W * fx); clearCircle(mask, W, H, x, top(x) - r * 0.62, r); }
  },
  // islands: five islands over the sea; falling into the water is a fall-out
  islands(W, H, mask) {
    for (const [fx, hw, lift] of [[0.12, 400, 0], [0.32, 300, 70], [0.5, 360, -30], [0.68, 300, 70], [0.88, 400, 0]]) {
      const cx = Math.round(W * fx);
      const top = x => { const u = (x - cx) / hw; return 1120 - lift - 280 * Math.sqrt(Math.max(0, 1 - u * u)) + 6 * tsin(x / 31); }; // sqrt is exact on every engine (pow is not)
      fillBand(mask, W, H, cx - hw, cx + hw, top, () => H - 4);
    }
  },
};

// ---- KIRD (국가과학기술인력개발원, 청주 오창) maps: the building as a cut-away you fight inside
function rectF(mask, W, H, x0, y0, x1, y1, v) { for (let y = Math.max(0, y0); y < Math.min(H, y1); y++) for (let x = Math.max(0, x0); x < Math.min(W, x1); x++) mask[y * W + x] = v; }
// the building: floors[] = slab tops from the ground up (ground first), roof last. Returns the deco description.
function kirdBuilding(mask, W, H, b) {
  const { x0, x1, floors, slab, wall } = b, G = floors[0], roof = floors[floors.length - 1];
  for (let i = 1; i < floors.length; i++) rectF(mask, W, H, x0, floors[i], x1, floors[i] + slab, 1);        // slabs + roof
  for (const [wx0, wx1] of [[x0, x0 + wall], [x1 - wall, x1]]) {
    rectF(mask, W, H, wx0, roof, wx1, G, 1);                                                              // end walls
    for (let i = 1; i < floors.length; i++) rectF(mask, W, H, wx0, floors[i - 1] - 96, wx1, floors[i - 1] - (i === 1 ? 0 : 34), 0); // a door at the bottom, windows above
  }
  for (const r of b.ramps || []) { fillPoly(mask, W, H, r.poly); rectF(mask, W, H, r.hole[0], r.hole[1], r.hole[2], r.hole[3], 0); }
  for (const h of b.holes || []) rectF(mask, W, H, h[0], h[1], h[2], h[3], 0);                           // skylights
  for (const o of b.blocks || []) rectF(mask, W, H, o[0], o[1], o[2], o[3], 1);                           // solid rooms / volumes
  if (b.pent) { const [p0, p1, ph, pk] = b.pent, pm = (p0 + p1) / 2; fillPoly(mask, W, H, [[p0, roof], [p0, roof - ph], [pm, roof - ph - pk], [p1, roof - ph], [p1, roof]]); }
  if (b.canopy) rectF(mask, W, H, b.canopy[0], b.canopy[1], b.canopy[2], b.canopy[1] + 14, 1);
  if (b.fill) rectF(mask, W, H, b.x0, b.floors[b.floors.length - 1], b.x1, b.floors[0], 1); // solid inside (the rooms are painted on): shells break it open
}
// ramps between every pair of floors, alternating sides; each ramp climbs `run` px and opens a hole in the upper slab
function autoRamps(x0, x1, floors, slab, run, wall) {
  const out = [];
  for (let i = 0; i + 1 < floors.length - 1; i++) {
    const lo = floors[i], hi = floors[i + 1], left = i % 2 === 0;
    const a = left ? x0 + wall + 40 : x1 - wall - 40, b = left ? a + run : a - run;
    out.push({ poly: [[a, lo], [b, hi], [b, lo]], hole: left ? [b - 190, hi, b, hi + slab] : [b, hi, b + 190, hi + slab] });
  }
  return out;
}
const MAPDECO = {
  campus: { bld: [
      { x0: 700, x1: 2100, top: 650, bot: 1100, floors: [1100, 950, 800, 650], slab: 24, wall: 30, ramps: autoRamps(700, 2100, [1100, 950, 800, 650], 24, 380, 30), fill: true,
        holes: [[1700, 650, 1810, 674]], blocks: [[950, 674, 1300, 800]], orange: [[950, 674, 1300, 800], [1150, 540, 1650, 650]], pent: [1150, 1650, 70, 40], sign: [1150, 1650, 610] },
      { x0: 3500, x1: 4500, top: 400, bot: 1100, floors: [1100, 960, 820, 680, 540, 400], slab: 22, wall: 28, ramps: autoRamps(3500, 4500, [1100, 960, 820, 680, 540, 400], 22, 330, 28), fill: true,
        holes: [[3980, 400, 4080, 422]], blocks: [[4500, 760, 4720, 1100]], orange: [[4500, 760, 4720, 1100]], panel: [242, 214, 150], label: '생활관', pent: [3820, 4180, 56, 0] }],
    plaza: [500, 4900], hills: [[0, 500], [4900, 5600]], flags: [2300, 2340, 2380], bridge: [2100, 3500, 800, 690], fill: true, trees: [2650, 2850, 3050, 3250] },
  songdae: { bld: [{ x0: 450, x1: 1350, top: 640, bot: 900, floors: [900, 770, 640], slab: 22, wall: 28,
      ramps: [{ poly: [[900, 900], [1180, 770], [1180, 900]], hole: [1040, 770, 1180, 792] }], holes: [[620, 640, 720, 662]], pent: [560, 1000, 52, 0],
      blocks: [[1350, 700, 1520, 900]], orange: [[1350, 700, 1520, 900]], sign: [560, 1000, 618] }],
    plaza: [300, 1560], hills: [[0, 300], [1560, 1960], [3650, 5400]], lake: [1960, 3650], decks: [[1960, 2470, 1180], [3130, 3650, 1180]], deckT: 42, islet: [2760, 3040],
    rocks: [[2030, 2150, 1236], [2250, 2370, 1244], [3220, 3340, 1244], [3440, 3560, 1236]] }, // rocks under the decks: a broken deck drops you on one, not straight into the lake
};
function kirdMap(W, H, mask, id) {
  const D = MAPDECO[id];
  if (id === 'campus') {
    const G = 1100;
    const top = x => {
      if (x < 500) { const u = (500 - x) / 500; return G - 300 * u * u * (3 - 2 * u) + 8 * tsin(x / 41); }
      if (x > 4900) { const u = (x - 4900) / 700; return G - 360 * u * u * (3 - 2 * u) + 8 * tsin(x / 43); }
      return G + 3 * tsin(x / 120);
    };
    fillBand(mask, W, H, 0, W - 1, top, () => H - 60);
    const [b0, b1, by, br] = D.bridge;                       // the glass sky bridge: solid from roof to floor (break it to drop through)
    rectF(mask, W, H, b0, br, b1, by + 18, 1);
  } else {
    const top = x => {
      if (x < 300) return 900 - 140 * (300 - x) / 300 + 6 * tsin(x / 23);
      if (x < 1560) return 900;
      if (x < 1960) { const u = (x - 1560) / 400; return 900 + 280 * u * u + 5 * tsin(x / 21); }
      const u = (x - 3650) / 1250; if (x < 4900) return 1180 - 620 * (u < 0 ? 0 : u * u * (3 - 2 * u)) + 14 * tsin(x / 61) + 7 * tsin(x / 19);
      return 560 + 140 * (x - 4900) / 500 + 8 * tsin(x / 29);
    };
    fillBand(mask, W, H, 0, 1959, top, () => H - 4);
    fillBand(mask, W, H, 3650, W - 1, top, () => H - 4);
    for (const [a, b, y] of D.decks) rectF(mask, W, H, a, y, b, y + D.deckT, 1);                                  // wooden decks (thick: takes a few hits)
    for (const [a, b, top] of D.rocks) { const c = (a + b) / 2, hw = (b - a) / 2; fillBand(mask, W, H, a, b, x => { const u = (x - c) / hw; return top + 46 * u * u + 4 * tsin(x / 9); }, () => H - 4); } // rocks rising from the lake
    const [i0, i1] = D.islet, ic = (i0 + i1) / 2, hw = (i1 - i0) / 2;
    fillBand(mask, W, H, i0, i1, x => { const u = (x - ic) / hw; return 1260 - 120 * Math.sqrt(Math.max(0, 1 - u * u)) + 4 * tsin(x / 13); }, () => H - 4);
    fillPoly(mask, W, H, [[ic - 100, 1084], [ic - 60, 1060], [ic, 1036], [ic + 60, 1060], [ic + 100, 1084], [ic + 70, 1078], [ic, 1062], [ic - 70, 1078]]); // the islet pavilion roof (정자)
    rectF(mask, W, H, ic - 62, 1080, ic - 52, 1150, 1); rectF(mask, W, H, ic + 52, 1080, ic + 62, 1150, 1);
  }
  for (const b of D.bld) kirdBuilding(mask, W, H, b);
}
MAPGEN.songdae = (W, H, mask) => kirdMap(W, H, mask, 'songdae');
MAPGEN.campus = (W, H, mask) => kirdMap(W, H, mask, 'campus');

// ---- KIRD 주제 맵 (연구윤리 · 연구노트 · 연구실 안전 · 연구비 관리): mirror-symmetric shapes on a flat ground at TG.
// The pictures are painted in thememaps.js over exactly these shapes; only rects, polygons and sqrt arcs here (same on every engine).
const TG = 1150, TCX = 2600;
function tmMirror(fn) { fn(x => x, false); fn(x => 2 * TCX - x, true); }
function tmRect(mask, W, H, x0, y0, x1, y1, X) { const a = X(x0), b = X(x1); rectF(mask, W, H, Math.min(a, b), y0, Math.max(a, b), y1, 1); }
function tmPoly(mask, W, H, pts, X) { fillPoly(mask, W, H, pts.map(([a, b]) => [X(a), b])); }
function tmDisc(mask, W, H, cx, cy, r) { for (let y = Math.ceil(cy - r); y <= cy + r; y++) { const h = Math.sqrt(Math.max(0, r * r - (y - cy) * (y - cy))); rectF(mask, W, H, Math.round(cx - h), y, Math.round(cx + h), y + 1, 1); } }
// a capsule top: rect a..b from y1 up to y0 with the top corners rounded by radius r
function tmCapsule(mask, W, H, a, b, y0, y1, r) { fillBand(mask, W, H, a, b - 1, x => { const d = Math.min(x - a, b - x); return d >= r ? y0 : y0 + r - Math.sqrt(Math.max(0, r * r - (r - d) * (r - d))); }, () => y1); }
function nbTop(px) { // the notebook's left page top edge (the right page mirrors it)
  if (px < 640) return TG; const e = t => t * t * (3 - 2 * t);
  if (px < 820) return TG - 150 - 180 * e((px - 640) / 180);
  if (px < 2200) return TG - 330 - 10 * ((px - 820) / 1380);
  if (px <= 2560) { const u = (px - 2200) / 360; return TG - 340 + 150 * u * Math.sqrt(u); }
  return TG;
}
// KIRD 주제 맵 grounds (2026-11, v2): each map is built from its own structures — stacks of notebooks, a scale, a lab block,
// drums, a receipt roll, a calculator, the evaluation dais... — but every structure is walkable: flat tops with soft ramps
// (no walls, nothing to drive under, no deep pits). Not mirrored; the two teams spawn interleaved, so it stays fair.
//  mesa: flat top a..b, h px above the floor (TG); ramps on both sides at average slope sL / sR (default 0.4).
//        The ramp is an S-curve (half straight, half smoothstep): steepest point 1.25 x average → ≤ 0.5 (a tank climbs ~0.7).
//        A mesa standing on another gives `on` = the height it starts from: its ramps then only climb the difference,
//        so stacks, a roof on a building and the steps of a dais read as crisp terraces. Its whole span (ramps included)
//        must sit on the flat top of the one below, or there would be a wall — tests/terrain_check.js catches that.
//  dome: centre c, half-width w, height h; (1 - u²)² profile, steepest 1.54 h / w (kept ≤ 0.5).
// The ground is the highest structure at each x. `art` says how thememaps.js paints it.
function featH(f, x) {
  if (f.k === 'dome') { const u = (x - f.c) / f.w; if (u <= -1 || u >= 1) return 0; const v = 1 - u * u; return f.h * v * v; }
  if (x >= f.a && x <= f.b) return f.h;
  const h0 = f.on || 0, left = x < f.a, r = (f.h - h0) / ((left ? f.sL : f.sR) || f.s || 0.4), t = left ? (x - (f.a - r)) / r : ((f.b + r) - x) / r;
  return t <= 0 ? 0 : h0 + (f.h - h0) * (0.5 * t + 0.5 * t * t * (3 - 2 * t));
}
function featSpan(f) { if (f.k === 'dome') return [f.c - f.w, f.c + f.w]; const d = f.h - (f.on || 0); return [f.a - d / (f.sL || f.s || 0.4), f.b + d / (f.sR || f.s || 0.4)]; }
const M = (a, b, h, art, o) => Object.assign({ k: 'mesa', a, b, h, art }, o || {}), D = (c, w, h, art, o) => Object.assign({ k: 'dome', c, w, h, art }, o || {});
// 2026-11 v3: designed again from the 522 「알고 계셨나요?」 sentences — every structure stands for a rule, and `lab`
// is the short rule engraved on its face (thememaps.js draws it as a plaque; lx/lw/ly place it by hand where the face is odd).
const TMAP_F = {
  scale: [ // 진실의 전당 (연구윤리): 출처 서가 → 저자 시상대 → 정의의 저울 3단 → AI 단말 → 제재 받침
    M(-500, 420, 180, 'shelf', { lab: ['출처 없이 쓰면 표절'] }),
    M(1050, 1750, 90, 'podium', { lab: ['기여한 사람만 저자로'] }), M(1290, 1510, 180, 'podium', { on: 90, lab: ['저자'] }),
    M(2150, 3450, 90, 'dais', { lab: ['위조 · 변조 · 표절 · 부당한 저자 표시'] }), M(2440, 3160, 180, 'dais', { on: 90, lab: ['참여제한 기준 3년 이내'] }), M(2690, 2910, 260, 'dais', { on: 180, lab: ['정의의 저울'] }),
    M(3800, 4100, 120, 'ai', { lab: ['AI는 도구', '책임은 연구자'] }),
    M(4550, 6000, 100, 'sanc', { lab: ['참여제한 최대 10년 → 2027.3부터 20년'] }), M(4850, 6000, 200, 'sanc', { on: 100, lab: ['제재부가금 5배 → 30배'] }),
  ],
  notebook: [ // 증명의 노트 (연구노트): 잉크병 → 제본 노트 → 펼친 두 쪽과 서명 도장 → 수정액 → 보존 상자
    M(-500, 330, 160, 'ink', { lab: ['오래 가는 필기구로'] }),
    M(900, 1500, 80, 'bound', { lab: ['쪽 번호 있는 제본 노트'] }),
    M(1900, 2600, 150, 'pageL', { lab: ['객관적인 사실만 기록'] }), M(2900, 3700, 200, 'pageR', { lab: ['빈 공간에는 사선'] }),
    M(3180, 3420, 270, 'stamp', { on: 200, lab: ['서명 + 날짜'] }),
    M(4050, 4350, 90, 'whiteout', { lab: ['수정액 금지'] }),
    M(4750, 6000, 110, 'box', { lab: ['과제 종료일부터 30년 보존'] }), M(5000, 6000, 210, 'box', { on: 110, lab: ['유출 금지'] }),
  ],
  lab: [ // 예방의 실험동 (연구실 안전): 잔디 언덕 → 비상샤워 → 실험동과 옥상 → 드럼 → 시약 창고와 소화기 → 폐액 보관
    M(-800, 280, 170, 'yard'),
    M(820, 1080, 70, 'shower', { lab: ['15분 이상 물로'] }),
    M(1400, 2500, 130, 'labFloor', { lab: ['일상점검 · 연구 시작 전 매일 1회'] }), M(1750, 2150, 250, 'labRoof', { on: 130, lab: ['위급하면 사용 중지'] }),
    M(2950, 3370, 90, 'drums', { lab: ['섞어 보관 금지'] }), M(3120, 3200, 150, 'drums', { on: 90 }),
    M(3800, 4700, 140, 'store', { lab: ['MSDS는 잘 보이는 곳에'] }), M(4160, 4340, 260, 'ext', { on: 140, lab: ['소화기'] }),
    M(4900, 6000, 90, 'waste', { lab: ['폐액은 종류별로', '라벨 필수'] }),
  ],
  archive: [ // 신뢰의 집행실 (연구비 관리): 동전 → 연구비 카드 → 영수증 롤 → 계산기 → 장비 상자 → 금고
    M(-500, 500, 110, 'coins', { lab: ['연구비는 연구기간 안에'] }), M(-500, 220, 200, 'coins', { on: 110 }),
    M(1450, 1600, 220, 'card', { sL: 0.25, lab: ['카드 · 계좌이체가 원칙'], lx: 1500, lw: 370, ly: 70 }),
    D(2500, 520, 170, 'roll', { lab: ['회의비 · 결재문서나 회의록 + 영수증'], lx: 2500, lw: 500, ly: 46 }),
    M(3100, 3800, 150, 'calc', { lab: ['연구혁신비 한도', '재료비+활동비의 10%'] }),
    M(4180, 4620, 110, 'crate', { lab: ['계획에 없던 3천만 원 이상 장비', '사전 승인 필요'] }),
    M(4700, 6000, 120, 'safe', { lab: ['학생인건비 공동관리 금지'] }), M(4980, 6000, 230, 'safe', { on: 120 }),
  ],
  ridge: [ // 혁신의 능선 (국가연구개발혁신법): 출발 → 선정평가 고지 → 수행 → 단계평가 고지 → 수행 → 최종평가 단상 → 성과
    M(-1000, 6200, 50, 'grass'), M(-400, 250, 110, 'grass', { on: 50 }),
    M(740, 1160, 250, 'grass', { on: 50, lab: ['이의신청은 10일 안에 한 번'] }),
    M(2380, 2820, 300, 'grass', { on: 50, lab: ["'극히 불량'이면 과제 중단"] }),
    M(3900, 4600, 150, 'dais', { on: 50, lab: ['최종보고서 · 협약 종료 후 60일까지'] }), M(4060, 4440, 210, 'dais', { on: 150, lab: ['3개월 안에 성과 공개'] }), M(4170, 4330, 250, 'dais', { on: 210 }),
    M(4850, 5600, 130, 'grass', { on: 50, lab: ['성과활용보고 5년'] }),
  ],
};
const TMAP_TOP = {}; for (const k in TMAP_F) { const F = TMAP_F[k]; TMAP_TOP[k] = px => { let h = 0; for (const f of F) { const v = featH(f, px); if (v > h) h = v; } return TG - h; }; }
function ridgeTop(px) { return TMAP_TOP.ridge(px); } // 국가연구개발혁신법 맵 「혁신의 능선」
for (const k in TMAP_TOP) MAPGEN[k] = (W, H, mask) => fillBand(mask, W, H, 0, W - 1, TMAP_TOP[k], () => H - 4); // one smooth ground per 주제 맵

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
  // 12 spawns as far apart as possible: the largest gap G that still lets a left-to-right pass pick 12, then spread evenly
  const N = 12;
  const pick = G => { const out = []; for (const x of cand) if (!out.length || x - out[out.length - 1] >= G) out.push(x); return out; };
  let G = 600; while (G > 20 && pick(G).length < N) G -= 10;
  const all = pick(G), spawns = [];
  for (let i = 0; i < N; i++) spawns.push(all[Math.round(i * (all.length - 1) / (N - 1))]);
  return { id: mapId, W, H, mask, spawns, cand, theme: meta.theme }; // cand: every standable x (20 px steps, map edges excluded)
}
