// ============================================================== RENDER (reads match state, never changes it)
// Visual-only randomness and timing live here (Math.random, performance.now).

const vrnd = Math.random;
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const hash2 = (x, y) => { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };
const TEAMC = { red: '#F0583E', blue: '#3E94F0' };
const SUB_SCALE = 0.62;

const MTHEMES = {
  reef: { water: ['#2A8FB8', '#0F557E', '#062038'], rock: [[164, 128, 98], [92, 70, 58]], edge: [232, 196, 146], bed: [52, 42, 40], mini: '#C8A27A', debris: '#B39A7A', far: '#0B4466', ray: 'rgba(190,240,255,0.07)' },
  cave: { water: ['#1C6E8E', '#0B3A56', '#04162A'], rock: [[118, 116, 128], [58, 56, 70]], edge: [178, 176, 194], bed: [36, 34, 46], mini: '#8E8C9A', debris: '#9A98A8', far: '#082E46', ray: 'rgba(170,220,255,0.05)' },
  wreck: { water: ['#2F7A8C', '#134456', '#061A2A'], rock: [[148, 100, 66], [84, 56, 40]], edge: [204, 140, 92], bed: [48, 38, 32], mini: '#B07A50', debris: '#A0704C', far: '#0C3A4C', ray: 'rgba(200,240,230,0.06)' },
  ice: { water: ['#4AA2C8', '#1C6290', '#0A2A4C'], rock: [[206, 232, 244], [118, 158, 192]], edge: [246, 252, 255], bed: [88, 116, 150], mini: '#D8EEF8', debris: '#E2F2FA', far: '#14507A', ray: 'rgba(220,250,255,0.08)' },
  vents: { water: ['#215A6E', '#0F3042', '#050F1C'], rock: [[84, 74, 78], [40, 34, 38]], edge: [150, 104, 76], bed: [28, 22, 26], mini: '#6E6266', debris: '#7A6E70', far: '#0A2434', ray: 'rgba(255,200,160,0.04)', hot: true },
  // the 12 maps (deco = props on rock, pattern = texture inside rock, farKind = background silhouettes, bedEdge = metal rim)
  god12: { water: ['#1C2C70', '#0E1642', '#060A22'], rock: [[64, 76, 146], [30, 34, 84]], edge: [56, 225, 255], bed: [26, 22, 64], bedEdge: [255, 79, 216], mini: '#5A6AC8', debris: '#8FB0FF', far: '#18246A', ray: 'rgba(120,200,255,0.05)', deco: 'neon', pattern: 'grid', farKind: 'grid' },
  atlantic: { water: ['#2C93CC', '#0F5A8C', '#062A4A'], rock: [[124, 152, 160], [62, 82, 94]], edge: [196, 232, 238], bed: [40, 56, 70], mini: '#9AC0CC', debris: '#A8C4CC', far: '#0B4F7C', ray: 'rgba(190,240,255,0.08)', deco: 'reef' },
  battlefield: { water: ['#56735F', '#283B30', '#0E1A14'], rock: [[112, 120, 84], [62, 68, 46]], edge: [190, 170, 110], bed: [104, 104, 98], bedEdge: [160, 156, 140], mini: '#8E9468', debris: '#9A9470', far: '#1E2A20', ray: 'rgba(220,230,180,0.04)', deco: 'war', pattern: 'strata', farKind: 'hills' },
  bermuda: { water: ['#20828A', '#0E3F4A', '#051A22'], rock: [[64, 134, 132], [30, 70, 72]], edge: [110, 230, 206], bed: [30, 50, 56], mini: '#5AB0A8', debris: '#7FC8C0', far: '#0B2B3B', ray: 'rgba(160,255,230,0.05)', deco: 'wreck' },
  cave: { water: ['#3E3656', '#221C34', '#0C0A16'], rock: [[94, 84, 116], [44, 38, 58]], edge: [168, 150, 196], bed: [30, 26, 40], mini: '#8A7EA6', debris: '#9C8BB5', far: '#1A1528', ray: 'rgba(240,196,107,0.03)', deco: 'cave', pattern: 'strata' },
  cube: { water: ['#2E5288', '#18294A', '#0A1224'], rock: [[64, 100, 156], [32, 52, 92]], edge: [252, 170, 40], bed: [22, 32, 56], bedEdge: [236, 236, 236], mini: '#5A86C0', debris: '#9FC0E8', far: '#14213D', ray: 'rgba(200,220,255,0.05)', deco: 'neon', pattern: 'grid', farKind: 'grid' },
  duke: { water: ['#40386A', '#221D3A', '#0E0C1C'], rock: [[100, 88, 116], [54, 46, 64]], edge: [206, 168, 52], bed: [34, 30, 44], bedEdge: [150, 120, 50], mini: '#8A7AA0', debris: '#A898B8', far: '#1D1B2F', ray: 'rgba(255,220,150,0.04)', deco: 'castle', pattern: 'brick', farKind: 'castle' },
  iceberg: { water: ['#4AA2C8', '#1C6290', '#0A2A4C'], rock: [[210, 234, 246], [120, 160, 194]], edge: [255, 255, 255], bed: [88, 116, 150], mini: '#D8EEF8', debris: '#E2F2FA', far: '#14507A', ray: 'rgba(220,250,255,0.09)', deco: 'ice', pattern: 'ice' },
  jurassic: { water: ['#5E6E4C', '#2E3626', '#12160E'], rock: [[156, 116, 78], [92, 66, 46]], edge: [232, 206, 164], bed: [50, 38, 28], mini: '#B88E64', debris: '#C8A880', far: '#2B2414', ray: 'rgba(255,240,200,0.05)', deco: 'fossil', pattern: 'strata', farKind: 'hills' },
  nautilus: { water: ['#2C8494', '#134752', '#06202A'], rock: [[204, 172, 132], [132, 98, 72]], edge: [246, 218, 166], bed: [60, 46, 40], mini: '#D4B48C', debris: '#E8C8A0', far: '#0F2D3A', ray: 'rgba(200,250,255,0.07)', deco: 'reef' },
  seacity: { water: ['#20529A', '#0E2A55', '#050F26'], rock: [[74, 114, 176], [36, 60, 104]], edge: [79, 195, 247], bed: [30, 40, 64], bedEdge: [255, 102, 196], mini: '#6292D8', debris: '#9FC8F0', far: '#0A2040', ray: 'rgba(160,220,255,0.06)', deco: 'city', pattern: 'grid', farKind: 'city' },
  spa: { water: ['#3E928C', '#1C5450', '#0A2624'], rock: [[126, 156, 112], [72, 98, 72]], edge: [247, 205, 168], bed: [40, 56, 50], mini: '#98B898', debris: '#C8D8B0', far: '#103A3A', ray: 'rgba(255,240,220,0.07)', deco: 'spa', pattern: 'wood' },
};
// torpedo looks per weapon kind: body colour, nose colour, glow
const TORP = {
  circle: ['#C9D2DC', '#E8402E'], twin: ['#C9D2DC', '#E8402E'], cross: ['#E2B33C', '#C0392B', '#FFE7A0'], rain: ['#C9D2DC', '#E2B33C'],
  depth: ['#3A434F', '#E8402E'], pierce: ['#9AA3AD', '#5B5F66'], vortex: ['#C9A24A', '#3E9A8A', '#9FF0E0'], electric: ['#5E4F8A', '#BFA8FF', '#D8C8FF'],
  chain: ['#5E4F8A', '#BFA8FF', '#D8C8FF'], crawl: ['#F06548', '#7F8B98'], homing: ['#D6DEE8', '#FF3D3D', '#FF9A9A'], octo8: ['#7A8C9A', '#3E94F0'],
  direct: ['#1E232B', '#EEF2F5'], hell: ['#1E232B', '#EEF2F5'], vell: ['#7A8899', '#6FE3E1', '#AFFFFF'], inflate: ['#7A8899', '#A9B4C0', '#DDF6FF'],
  bounce: ['#2E86D6', '#8CC63F', '#8CC8FF'], magnet: ['#2E86D6', '#8CC63F', '#8CC8FF'], split: ['#8CC63F', '#2E86D6', '#D8F59A'],
};
const BOOMC = { mine: '#FF6A3A', rock: '#C8B8E0', hit: '#FFB547', small: '#FFC870', big: '#FF8A30', sonar: '#6FE3E1', cross: '#F2C94C', volt: '#BFA8FF', swirl: '#6FE3E1', fire: '#FF8A30', kblue: '#5FA8FF', kgreen: '#9FE07A' };

function createRenderer(cv, mini) {
  const ctx = cv.getContext('2d'), mctx = mini.getContext('2d');
  const R = {
    m: null, terrain: null, tctx: null, th: null,
    cam: { x: 0, y: 0, zoom: 1 }, dpr: 1, VW: 800, VH: 600,
    fx: [], texts: [], bolts: [], shake: 0, follow: null, free: false, view: {}, trails: {},
    onBanner: () => {}, onOver: () => {}, onSfx: () => {}, onHitstop: () => {}, onEngine: () => {}, reduceMotion: false, t: 0,
  };

  R.setMatch = function (m) {
    R.m = m; R.th = MTHEMES[m.theme] || MTHEMES.reef; R.bubblesSay = {}; R.miniT = null; R.anchors = {};
    R.fx = []; R.texts = []; R.bolts = []; R.view = {}; R.shake = 0; R.trails = {}; R.bubbles = {}; R.snow = null;
    buildTerrainTexture(); buildBackground();
    const t0 = m.subs[0]; R.cam.x = t0.x; R.cam.y = t0.y; R.follow = null; R.free = false;
    m.events.length = 0;
  };
  function buildTerrainTexture() {
    const m = R.m, W = m.W, H = m.H, mask = m.mask, th = R.th;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d'), out = x.createImageData(W, H), o = out.data;
    // distance to water (two-pass 3-4 chamfer transform, in 1/3 px units, capped) for smooth edge depth
    const dist = new Uint16Array(W * H), CAP = 400;
    for (let i = 0; i < W * H; i++) dist[i] = mask[i] ? CAP : 0;
    for (let y = 0; y < H; y++) for (let cx = 0; cx < W; cx++) {
      const i = y * W + cx; let d = dist[i]; if (!d) continue;
      if (cx > 0 && dist[i - 1] + 3 < d) d = dist[i - 1] + 3;
      if (y > 0) { const u = i - W; if (dist[u] + 3 < d) d = dist[u] + 3; if (cx > 0 && dist[u - 1] + 4 < d) d = dist[u - 1] + 4; if (cx < W - 1 && dist[u + 1] + 4 < d) d = dist[u + 1] + 4; }
      dist[i] = d;
    }
    for (let y = H - 1; y >= 0; y--) for (let cx = W - 1; cx >= 0; cx--) {
      const i = y * W + cx; let d = dist[i]; if (!d) continue;
      if (cx < W - 1 && dist[i + 1] + 3 < d) d = dist[i + 1] + 3;
      if (y < H - 1) { const u = i + W; if (dist[u] + 3 < d) d = dist[u] + 3; if (cx > 0 && dist[u - 1] + 4 < d) d = dist[u - 1] + 4; if (cx < W - 1 && dist[u + 1] + 4 < d) d = dist[u + 1] + 4; }
      dist[i] = d;
    }
    const r0 = th.rock[0], r1 = th.rock[1], eg = th.edge, bd = th.bed;
    for (let i = 0; i < W * H; i++) {
      const v = mask[i]; if (!v) continue;
      const px = i % W, py = (i / W) | 0, p = i * 4, n = (hash2(px >> 1, py >> 1) - 0.5) * 16;
      let r, g, b;
      if (v === 2) {
        const s = ((px >> 3) + (py >> 3)) & 1; r = bd[0] + s * 6; g = bd[1] + s * 6; b = bd[2] + s * 8;
        if (th.bedEdge && dist[i] <= 9) { r = th.bedEdge[0]; g = th.bedEdge[1]; b = th.bedEdge[2]; }
        else if (th.bedEdge && (px % 48 < 2 || py % 48 < 2)) { r += 14; g += 14; b += 18; }
      }
      else {
        const e = dist[i] / 3, k = Math.min(1, e / 90);
        r = lerp(r0[0], r1[0], k); g = lerp(r0[1], r1[1], k); b = lerp(r0[2], r1[2], k);
        if (e <= 3) { const top = py > 0 && !mask[i - W], f = top ? 1 : 0.45; r = lerp(r, eg[0], f); g = lerp(g, eg[1], f); b = lerp(b, eg[2], f); }
        if (th.hot && e > 12 && Math.abs(Math.sin(px / 37 + Math.sin(py / 53) * 2.4)) < 0.03) { r = 220; g = 96; b = 40; }
        if (R.m.theme === 'ice' && e > 6 && Math.abs(Math.sin(px / 23 - py / 61)) < 0.02) { r += 30; g += 30; b += 20; }
        if (R.m.theme === 'wreck' && e > 6 && (py % 46 < 2 || ((px + (py / 46 | 0) * 30) % 90) < 2)) { r -= 26; g -= 20; b -= 16; }
        const pat = th.pattern;
        if (pat === 'grid' && e > 5 && (px % 40 < 2 || py % 40 < 2)) { r = lerp(r, eg[0], 0.35); g = lerp(g, eg[1], 0.35); b = lerp(b, eg[2], 0.35); }
        else if (pat === 'brick' && e > 5 && (py % 36 < 2 || ((px + ((py / 36 | 0) % 2) * 40) % 80) < 2)) { r -= 22; g -= 20; b -= 16; }
        else if (pat === 'strata' && e > 6) { const w = Math.sin(py / 9 + Math.sin(px / 140) * 1.6); if (w > 0.82) { r += 14; g += 12; b += 10; } else if (w < -0.9) { r -= 12; g -= 10; b -= 8; } }
        else if (pat === 'ice' && e > 6 && Math.abs(Math.sin(px / 23 - py / 61)) < 0.02) { r += 30; g += 30; b += 20; }
        else if (pat === 'wood' && e > 4 && Math.abs(Math.sin(px / 11 + py / 29 + Math.sin(py / 70) * 2)) < 0.07) { r -= 18; g -= 14; b -= 12; }
      }
      o[p] = r + n; o[p + 1] = g + n; o[p + 2] = b + n; o[p + 3] = 255;
    }
    x.putImageData(out, 0, 0);
    decorate(x, m);
    R.terrain = c; R.tctx = x;
  }
  // props on rock tops (and some undersides), seeded so every match on a map looks the same
  function decorate(x, m) {
    let s = 4321 + m.W; const r = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
    const W = m.W, H = m.H, mask = m.mask, theme = R.th.deco || m.theme;
    for (let px = 30; px < W - 30; px += 18 + Math.floor(r() * 44)) {
      for (let py = 4; py < H - 40; py++) {
        const i = py * W + px, top = mask[i] === 1 && !mask[i - W] && !mask[i - 2 * W], under = mask[i] === 1 && py + 2 < H && !mask[i + W] && !mask[i + 2 * W];
        if (!top && !under) continue;
        const k = r(); if (k > 0.55) continue;
        x.save(); x.translate(px, top ? py : py + 1);
        if (top) {
          if (theme === 'reef') {
            if (k < 0.18) { x.strokeStyle = '#3E9A4A'; x.lineWidth = 3; x.lineCap = 'round'; for (let j = -1; j <= 1; j++) { x.beginPath(); x.moveTo(j * 4, 0); x.bezierCurveTo(j * 4 + 6, -14, j * 4 - 6, -26, j * 4 + 2, -38 - r() * 16); x.stroke(); } }
            else if (k < 0.3) { x.strokeStyle = r() < 0.5 ? '#FF7A8A' : '#FFA24A'; x.lineWidth = 3; x.lineCap = 'round'; x.beginPath(); x.moveTo(0, 0); x.lineTo(0, -14); x.lineTo(-8, -22); x.moveTo(0, -14); x.lineTo(7, -24); x.moveTo(-4, -18); x.lineTo(-4, -28); x.stroke(); }
            else if (k < 0.38) { x.fillStyle = '#C98ADB'; x.beginPath(); x.arc(0, -4, 6, Math.PI, 0); x.fill(); x.strokeStyle = '#E2B4F0'; x.lineWidth = 1.5; for (let j = -2; j <= 2; j++) { x.beginPath(); x.moveTo(j * 2, -8); x.lineTo(j * 4, -14); x.stroke(); } }
          } else if (theme === 'cave') {
            if (k < 0.16) { x.fillStyle = '#6E6C7A'; x.beginPath(); x.moveTo(-6, 0); x.lineTo(0, -18 - r() * 16); x.lineTo(6, 0); x.fill(); }
            else if (k < 0.26) { x.fillStyle = '#9FF0D0'; x.globalAlpha = 0.85; x.beginPath(); x.ellipse(0, -5, 6, 3, 0, Math.PI, 0); x.fill(); x.fillRect(-1, -5, 2, 5); x.globalAlpha = 0.25; x.beginPath(); x.arc(0, -6, 12, 0, 7); x.fill(); }
          } else if (theme === 'wreck') {
            if (k < 0.12) { x.fillStyle = '#6A4A34'; x.beginPath(); x.ellipse(0, -2, 5, 3, 0, 0, 7); x.ellipse(6, -1, 3, 2, 0, 0, 7); x.fill(); }
            else if (k < 0.2) { x.strokeStyle = '#3E8A4A'; x.lineWidth = 2.5; x.beginPath(); x.moveTo(0, 0); x.quadraticCurveTo(8, -16, 0, -30); x.stroke(); }
          } else if (theme === 'ice') {
            if (k < 0.16) { x.fillStyle = 'rgba(240,252,255,0.9)'; x.beginPath(); x.moveTo(-4, 0); x.lineTo(0, -14 - r() * 8); x.lineTo(4, 0); x.fill(); }
            else if (k < 0.24) { x.fillStyle = '#E8F6FF'; x.beginPath(); x.ellipse(0, -1, 8, 3, 0, Math.PI, 0); x.fill(); }
          } else if (theme === 'neon') {
            if (k < 0.16) { x.fillStyle = R.th.bedEdge ? `rgb(${R.th.bedEdge.join(',')})` : '#FF4FD8'; x.globalAlpha = 0.9; x.fillRect(-2, -10, 4, 10); x.globalAlpha = 0.3; x.beginPath(); x.arc(0, -10, 9, 0, 7); x.fill(); x.globalAlpha = 1; }
            else if (k < 0.26) { x.strokeStyle = `rgb(${R.th.edge.join(',')})`; x.lineWidth = 2; x.beginPath(); x.moveTo(-14, -2); x.lineTo(-4, -2); x.lineTo(0, -8); x.lineTo(14, -8); x.stroke(); }
          } else if (theme === 'city') {
            if (k < 0.1) { x.fillStyle = '#9FB4D0'; x.fillRect(-1.5, -34, 3, 34); x.fillStyle = '#FFE9A0'; x.beginPath(); x.arc(0, -36, 4, 0, 7); x.fill(); x.globalAlpha = 0.25; x.beginPath(); x.arc(0, -36, 14, 0, 7); x.fill(); x.globalAlpha = 1; }
            else if (k < 0.18) { x.fillStyle = '#FF66C4'; x.fillRect(-8, -6, 16, 3); }
          } else if (theme === 'castle') {
            if (k < 0.1) { x.strokeStyle = '#3E2A1A'; x.lineWidth = 2; x.beginPath(); x.moveTo(0, 0); x.lineTo(0, -40); x.stroke(); x.fillStyle = r() < 0.5 ? '#7A1F2B' : '#C9A227'; x.beginPath(); x.moveTo(0, -40); x.lineTo(20, -34); x.lineTo(0, -27); x.fill(); }
            else if (k < 0.24) { x.fillStyle = 'rgba(86,120,60,0.85)'; x.beginPath(); x.ellipse(0, -2, 10, 4, 0, Math.PI, 0); x.fill(); }
          } else if (theme === 'fossil') {
            if (k < 0.14) { x.strokeStyle = '#6E8A3A'; x.lineWidth = 2; x.beginPath(); x.moveTo(0, 0); x.quadraticCurveTo(10, -18, 4, -34); x.stroke(); for (let j = 1; j < 5; j++) { x.beginPath(); x.moveTo(j * 1.5, -j * 7); x.lineTo(j * 1.5 + 8, -j * 7 - 4); x.moveTo(j * 1.5, -j * 7); x.lineTo(j * 1.5 - 7, -j * 7 - 3); x.stroke(); } }
            else if (k < 0.24) { x.fillStyle = '#EADBC0'; x.fillRect(-7, -3, 14, 3); x.beginPath(); x.arc(-7, -1.5, 3, 0, 7); x.arc(7, -1.5, 3, 0, 7); x.fill(); }
          } else if (theme === 'spa') {
            if (k < 0.12) { const c = ['#F7C59F', '#E8E0D4', '#BFD8C0']; for (let j = 0; j < 3; j++) { x.fillStyle = c[j]; x.beginPath(); x.ellipse(0, -4 - j * 7, 9 - j * 2, 4, 0, 0, 7); x.fill(); } }
            else if (k < 0.15) { x.fillStyle = '#FFD84A'; x.beginPath(); x.ellipse(0, -6, 8, 6, 0, 0, 7); x.fill(); x.beginPath(); x.arc(5, -13, 4.5, 0, 7); x.fill(); x.fillStyle = '#FF8A3A'; x.beginPath(); x.moveTo(9, -13); x.lineTo(13, -12); x.lineTo(9, -11); x.fill(); x.fillStyle = '#222'; x.fillRect(5.5, -15, 1.6, 1.6); }
          } else if (theme === 'war') {
            if (k < 0.12) { x.strokeStyle = '#4A3E2E'; x.lineWidth = 2; for (const ox of [-10, 10]) { x.beginPath(); x.moveTo(ox, 0); x.lineTo(ox, -20); x.stroke(); } x.strokeStyle = '#8A8A80'; x.lineWidth = 1; x.beginPath(); for (let j = -10; j <= 10; j += 4) { x.moveTo(j, -16); x.lineTo(j + 4, -12); x.lineTo(j + 2, -18); } x.stroke(); }
            else if (k < 0.2) { x.fillStyle = '#B08A4A'; x.save(); x.rotate(0.4); x.fillRect(-2, -10, 4, 9); x.restore(); }
          } else if (theme === 'vents') {
            if (k < 0.2) { for (let j = 0; j < 3; j++) { const h = 14 + r() * 18, ox = (j - 1) * 5; x.fillStyle = '#EDE6DC'; x.fillRect(ox - 1.5, -h, 3, h); x.fillStyle = '#E8402E'; x.beginPath(); x.arc(ox, -h, 3, 0, 7); x.fill(); } }
            else if (k < 0.28) { x.fillStyle = '#E0D2C0'; x.beginPath(); x.ellipse(0, -2, 5, 3, 0, 0, 7); x.fill(); }
          }
        } else if (k < 0.2) {
          if (theme === 'ice') { x.fillStyle = 'rgba(236,250,255,0.85)'; x.beginPath(); x.moveTo(-4, 0); x.lineTo(0, 14 + r() * 14); x.lineTo(4, 0); x.fill(); }
          else if (theme === 'cave') { x.fillStyle = 'rgba(160,255,220,0.6)'; x.beginPath(); x.arc(0, 3, 2.5, 0, 7); x.fill(); }
          else if (theme === 'reef' || theme === 'wreck') { x.strokeStyle = 'rgba(80,140,80,0.8)'; x.lineWidth = 2; x.beginPath(); x.moveTo(0, 0); x.quadraticCurveTo(4, 10, 0, 20 + r() * 12); x.stroke(); }
        }
        x.restore();
        py += 60;
      }
    }
  }
  function carveTexture(cx, cy, rx, ry, box) {
    R.miniDirty = true;
    const t = R.tctx; if (!t) return;
    if (box) {
      t.save(); t.globalCompositeOperation = 'source-atop'; t.fillStyle = 'rgba(10,14,20,0.5)'; t.fillRect(cx - rx - 12, cy - ry - 12, rx * 2 + 24, ry * 2 + 24);
      t.globalCompositeOperation = 'destination-out'; t.fillRect(cx - rx - 0.5, cy - ry - 0.5, rx * 2 + 1, ry * 2 + 1); t.restore();
      repaintBed(cx, cy, rx, ry); return;
    }
    t.save(); t.globalCompositeOperation = 'source-atop';
    t.translate(cx, cy); t.scale(1, ry / rx);
    const g = t.createRadialGradient(0, 0, rx * 0.85, 0, 0, rx * 1.35); g.addColorStop(0, 'rgba(10,14,20,0.55)'); g.addColorStop(1, 'rgba(10,14,20,0)');
    t.fillStyle = g; t.beginPath(); t.arc(0, 0, rx * 1.35, 0, 7); t.fill();
    t.globalCompositeOperation = 'destination-out'; t.beginPath(); t.arc(0, 0, rx + 0.5, 0, 7); t.fill();
    t.restore();
    repaintBed(cx, cy, rx, ry);
  }
  // bedrock never digs: repaint it if it sits inside the hole
  function repaintBed(cx, cy, rx, ry) {
    const t = R.tctx, m = R.m, x0 = Math.max(0, Math.floor(cx - rx - 2)), x1 = Math.min(m.W - 1, Math.ceil(cx + rx + 2)), y0 = Math.max(0, Math.floor(cy - ry - 2)), y1 = Math.min(m.H - 1, Math.ceil(cy + ry + 2));
    let bed = false; for (let y = y0; y <= y1 && !bed; y += 3) for (let x = x0; x <= x1; x += 3) if (m.mask[y * m.W + x] === 2) { bed = true; break; }
    if (bed) { const b = R.th.bedEdge || R.th.bed; t.fillStyle = `rgb(${b[0]},${b[1]},${b[2]})`; for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (m.mask[y * m.W + x] === 2) t.fillRect(x, y, 1, 1); }
  }
  function buildBackground() {
    const th = R.th; let s = 77; const r = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
    const far = document.createElement('canvas'); far.width = 2400; far.height = 700; const x = far.getContext('2d');
    x.fillStyle = th.far; x.globalAlpha = 0.55;
    x.beginPath(); x.moveTo(0, 700); for (let i = 0; i <= 2400; i += 40) x.lineTo(i, 520 - 120 * Math.abs(Math.sin(i / 340)) - 40 * Math.sin(i / 91)); x.lineTo(2400, 700); x.fill();
    x.globalAlpha = 0.35;
    const kind = th.farKind || 'hills';
    if (kind === 'city') for (let i = 0; i < 26; i++) { const px = r() * 2400, w = 30 + r() * 70, h = 120 + r() * 380; x.fillRect(px, 700 - h, w, h); if (r() < 0.5) { x.beginPath(); x.moveTo(px, 700 - h); x.lineTo(px + w / 2, 700 - h - 60); x.lineTo(px + w, 700 - h); x.fill(); } if (r() < 0.4) { x.beginPath(); x.ellipse(px + w / 2, 700 - h, w * 0.7, w * 0.5, 0, Math.PI, 0); x.fill(); } }
    else if (kind === 'castle') for (let i = 0; i < 7; i++) { const px = r() * 2400, w = 60 + r() * 80, h = 200 + r() * 260; x.fillRect(px, 700 - h, w, h); for (let j = 0; j < w; j += 20) x.fillRect(px + j, 700 - h - 16, 11, 16); if (r() < 0.6) { x.beginPath(); x.moveTo(px - 6, 700 - h - 16); x.lineTo(px + w / 2, 700 - h - 90); x.lineTo(px + w + 6, 700 - h - 16); x.fill(); } }
    else if (kind === 'grid') { x.globalAlpha = 0.5; x.strokeStyle = th.far; x.lineWidth = 2; for (let i = -20; i <= 20; i++) { x.beginPath(); x.moveTo(1200 + i * 60, 420); x.lineTo(1200 + i * 260, 700); x.stroke(); } for (let j = 0; j < 8; j++) { const y = 420 + (j * j) * 4.5; x.beginPath(); x.moveTo(0, y); x.lineTo(2400, y); x.stroke(); } }
    else for (let i = 0; i < 9; i++) { const px = r() * 2400, w = 30 + r() * 50, h = 180 + r() * 260; x.beginPath(); x.moveTo(px - w, 700); x.lineTo(px - w * 0.3, 700 - h); x.lineTo(px + w * 0.4, 700 - h * 0.9); x.lineTo(px + w, 700); x.fill(); }
    x.globalAlpha = 1;
    R.bg = { far, rays: Array.from({ length: 6 }, () => ({ x: r(), w: 60 + r() * 120, a: 0.6 + r() * 0.8, v: 0.002 + r() * 0.004 })) };
  }

  // ---------------- events -> effects
  function bubbles(x, y, n, spread, big) {
    for (let i = 0; i < n; i++) R.fx.push({ kind: 'bubble', x: x + (vrnd() - 0.5) * spread, y: y + (vrnd() - 0.5) * spread * 0.6, vx: (vrnd() - 0.5) * 40, vy: -40 - vrnd() * 90, t: -vrnd() * 0.25, life: 1.2 + vrnd() * 1.2, r: (big ? 3 : 1.5) + vrnd() * (big ? 6 : 3) });
  }
  function debris(x, y, n) {
    for (let i = 0; i < n; i++) { const a = vrnd() * Math.PI * 2, v = 60 + vrnd() * 200; R.fx.push({ kind: 'chunk', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0, life: 1.6 + vrnd() * 0.6, col: R.th.debris, s: 3 + vrnd() * 5, rot: vrnd() * 6 }); }
  }
  function shake(a) { if (!R.reduceMotion) R.shake = Math.min(16, R.shake + a); }
  function text(x, y, s, col, big) { R.texts.push({ x, y, s, col, t: 0, big, size: big ? 26 : 18 }); }
  function dmgText(e, col) {
    const prev = R.texts.find(s => s.idx === e.idx && s.dmg && s.kind === e.kind && s.t < 0.35);
    const amount = (prev ? prev.amount : 0) + e.amount;
    const o = prev || { x: e.x, y: e.y - 56, col, idx: e.idx, dmg: true, kind: e.kind };
    o.amount = amount; o.s = '-' + amount; o.t = prev ? 0.04 : 0; o.size = Math.min(52, 20 + amount / 11); o.big = amount >= 200;
    if (!prev) R.texts.push(o);
    if (amount >= 300 && !o.strong) { o.strong = true; text(e.x, e.y - 112, amount >= 450 ? '대박!' : '강타!', '#FFD24A', true); }
  }
  function boomFx(e) {
    const col = BOOMC[e.kind] || '#FFB547', size = Math.max(e.rx, e.ry), tier = size < 60 ? 1 : size < 120 ? 2 : 3;
    R.fx.push({ kind: 'shape', x: e.x, y: e.y, rx: e.rx, ry: e.ry, thin: e.thin, box: e.box, t: 0, life: 0.55 + tier * 0.1, col });
    R.fx.push({ kind: 'ring', x: e.x, y: e.y, r: size * 0.8, t: 0, life: 0.5, w: 2 + tier });
    bubbles(e.x, e.y, [10, 18, 30][tier - 1], size * 0.8, true);
    debris(e.x, e.y, [4, 8, 14][tier - 1]);
    if (e.kind === 'sonar') for (let i = 0; i < 3; i++) R.fx.push({ kind: 'sonar', x: e.x, y: e.y, t: -i * 0.12, life: 0.7, rx: e.rx, ry: e.ry });
    if (e.kind === 'volt') for (let i = 0; i < 6; i++) { const a = vrnd() * 7; R.bolts.push({ x1: e.x, y1: e.y, x2: e.x + Math.cos(a) * size, y2: e.y + Math.sin(a) * size, t: 0, col: '#D8C8FF' }); }
    shake([3, 6, 11][tier - 1]);
    if (tier === 3) R.onHitstop(60);
    R.onSfx('boom', { tier });
  }
  const viewOf = idx => R.view[idx] || (R.view[idx] = { x: R.m.subs[idx].x, y: R.m.subs[idx].y, flash: 0, recoil: 0, bob: vrnd() * 6, fxT: 0, face: R.m.subs[idx].facing });
  R.consumeEvents = function () {
    const m = R.m, ev = m.events;
    for (const e of ev) {
      const t = e.idx != null && e.idx >= 0 ? m.subs[e.idx] : null;
      switch (e.type) {
        case 'carve': carveTexture(e.x, e.y, e.rx, e.ry, e.box); break;
        case 'rockfall': debris(e.x, e.y + 10, 8); R.onSfx('hit', { n: 1 }); break;
        case 'boom': boomFx(e); break;
        case 'dmg':
          dmgText(e, e.kind === 'sudden' ? '#C9A6FF' : e.kind === 'shock' ? '#BFA8FF' : e.kind === 'graze' ? '#CFE6FF' : e.kind === 'friendly' ? '#FFD0A0' : e.kind === 'ram' || e.kind === 'crush' ? '#FFB4A4' : '#FFFFFF');
          viewOf(e.idx).flash = 1; if (e.kind !== 'shock') R.onSfx('hit', { amount: e.amount });
          if (R.isMine && R.isMine(t)) R.hurtFlash = Math.min(1, 0.45 + e.amount / 400);
          if (t && t.alive) { const before = (t.hp + e.amount) / t.maxhp, now = t.hp / t.maxhp; if (before > 1 / 3 && now <= 1 / 3) R.say(t.idx, '으악! 위험해!'); else if (before > 0.5 && now <= 0.5) R.say(t.idx, '아얏!'); }
          break;
        case 'death': {
          const v = viewOf(e.idx);
          boomFx({ x: v.x, y: v.y, rx: 70, ry: 70, kind: 'big' });
          for (let i = 0; i < 30; i++) R.fx.push({ kind: 'bubble', x: v.x + (vrnd() - 0.5) * 60, y: v.y + (vrnd() - 0.5) * 30, vx: 0, vy: -60 - vrnd() * 80, t: -vrnd() * 1.5, life: 2.4, r: 3 + vrnd() * 6 });
          R.fx.push({ kind: 'wreck', x: v.x, y: v.y, id: t.subId, face: t.facing, team: t.team, t: 0, life: 3.5 });
          text(e.x, v.y - 120, '격침!', '#FFD24A', true); R.texts[R.texts.length - 1].size = 44;
          R.onHitstop(140); R.onBanner(`${t.nick} 격침!`, t.team); R.onSfx('death'); break;
        }
        case 'ringout': R.onBanner(`${t.nick} 장외 탈락!`, t.team); text(clamp(e.x, 60, m.W - 60), clamp(e.y, 80, m.H - 60), '탈락!', '#FFD24A', true); R.onSfx('fall'); break;
        case 'ram': text(e.x, e.y - 40, '쾅!', '#FFB4A4'); bubbles(e.x, e.y, 10, 30); shake(4); R.onSfx('hit', { amount: 80 }); break;
        case 'crush': text(e.x, e.y - 60, '바위에 쾅!', '#FF9A86', true); bubbles(e.x, e.y, 14, 40); debris(e.x, e.y, 6); shake(6); break;
        case 'magnet': R.bolts.push({ x1: e.x1, y1: e.y1, x2: e.x2, y2: e.y2, t: 0, col: '#8CC8FF', big: true }); text(e.x1, e.y1 - 24, '자석!', '#8CC8FF'); R.onSfx('pickup'); break;
        case 'bounce': text(e.x, e.y - 24, '팅!', '#8CC8FF'); bubbles(e.x, e.y, 8, 16); R.onSfx('hit', { amount: 30 }); break;
        case 'stick': text(e.x, e.y - 24, '찰싹', '#FFB070'); bubbles(e.x, e.y, 8, 16); break;
        case 'drill': text(e.x, e.y - 24, '드르륵', '#FFD24A'); debris(e.x, e.y, 6); break;
        case 'hover': R.fx.push({ kind: 'hover', x: e.x, y: e.y, t: 0, life: e.ticks / 120 }); text(e.x, e.y - 30, '조준!', '#FF9A86'); break;
        case 'swell': R.fx.push({ kind: 'swell', x: e.x, y: e.y, r: e.r, t: 0, life: e.ticks / 120 }); text(e.x, e.y - 40, '부글부글', '#DDF6FF'); break;
        case 'swirl': R.fx.push({ kind: 'swirl', x: e.x, y: e.y, r: e.r, t: 0, life: e.ticks / 120 + 0.3 }); text(e.x, e.y - 50, '소용돌이!', '#6FE3E1', true); break;
        case 'rain': text(e.x, e.y - 20, '신기전!', '#F2C94C', true); R.onSfx('fire', { shape: 'arrow' }); break;
        case 'bolt': R.bolts.push({ x1: e.x1, y1: e.y1, x2: e.x2, y2: e.y2, t: 0, col: '#D8C8FF', big: true }); R.onSfx('beam'); break;
        case 'shocked': text(e.x, e.y - 80, '감전', '#BFA8FF'); break;
        case 'impact': bubbles(e.x, e.y, 6, 10); break;
        case 'pickup': text(e.x, e.y - 60, CONFIG.items[e.item].name + ' 획득', CONFIG.items[e.item].color); R.onSfx('pickup'); break;
        case 'bagfull': text(e.x, e.y - 60, '가방이 가득 (4칸)', '#FFB4A4'); break;
        case 'tele': {
          const v = viewOf(e.idx);
          for (const [x, y] of [[e.x1, e.y1], [e.x2, e.y2]]) { for (let i = 0; i < 18; i++) { const a = vrnd() * 7; R.fx.push({ kind: 'bubble', x: x + Math.cos(a) * 30, y: y + Math.sin(a) * 18, vx: Math.cos(a) * 30, vy: -30 - vrnd() * 50, t: 0, life: 1.2, r: 2 + vrnd() * 3 }); } }
          R.bolts.push({ x1: e.x1, y1: e.y1, x2: e.x2, y2: e.y2, t: 0, col: '#7CF5FF' });
          v.x = e.x2; v.y = e.y2; v.flash = 1;
          text(e.x2, e.y2 - 60, '순간이동!', '#7CF5FF', true); R.onSfx('item'); break;
        }
        case 'telefail': text(clamp(e.x, 40, m.W - 40), clamp(e.y, 60, m.H - 60), '이동 실패', '#CFE6FF'); break;
        case 'heal': text(e.x, e.y - 60, (e.spa ? '온천 +' : '+') + e.amount, '#6EF0C8'); for (let i = 0; i < 10; i++) R.fx.push({ kind: 'plus', x: e.x + (vrnd() - 0.5) * 60, y: e.y - 10 - vrnd() * 30, vy: -50 - vrnd() * 30, t: 0, life: 1 }); R.onSfx('heal'); break;
        case 'item': if (t) { text(t.x, t.y - 60, CONFIG.items[e.item].name, CONFIG.items[e.item].color); R.onSfx('item'); } break;
        case 'fire': { const v = viewOf(e.idx); v.recoil = 1; bubbles(e.x, e.y, 10, 14); shake(1.5); R.onSfx('fire', { shape: 'missile' }); break; }
        case 'out': text(clamp(e.x, 40, m.W - 40), clamp(e.y, 60, m.H - 60), '장외', '#CFE6FF'); break;
        case 'crate': R.onSfx('crate'); bubbles(e.x, e.y, 12, 30); break;
        case 'crategone': bubbles(e.x, e.y, 10, 24); break;
        case 'turn': R.follow = t; R.free = false; R.onBanner(R.isMine && R.isMine(t) ? '내 차례!' : `${t.nick} 차례`, t.team, true); R.onSfx('turn', { team: t.team }); break;
        case 'sudden': R.onBanner('서든데스! 매 턴 모두 체력 감소 · 해류 강화'); R.onSfx('death'); shake(6); break;
        case 'timeout': R.onBanner('시간 초과'); break;
        case 'over': R.onOver(e.winner, e.forfeit); break;
      }
    }
    ev.length = 0;
  };

  // ---------------- camera
  R.viewSize = () => ({ w: R.VW / R.cam.zoom, h: R.VH / R.cam.zoom });
  R.clampCam = function () {
    const m = R.m, v = R.viewSize(), cam = R.cam;
    cam.x = m.W > v.w ? clamp(cam.x, v.w / 2 - 80, m.W - v.w / 2 + 80) : m.W / 2;
    cam.y = m.H > v.h ? clamp(cam.y, v.h / 2 - 80, m.H - v.h / 2 + 60) : m.H / 2;
  };
  R.camTo = o => { R.follow = o; R.free = false; };
  R.bubblesSay = {};
  R.say = (idx, txt) => { R.bubblesSay[idx] = { text: txt.length > 18 ? txt.slice(0, 17) + '…' : txt, t: 0 }; };
  function updateCam(dt) {
    const m = R.m, cam = R.cam;
    let target = null, fast = false;
    if (m.proj.some(q => !(q.wait > 0))) { const p = m.proj.find(q => !(q.wait > 0)); target = { x: p.x + clamp((p.dx || 0) * 160, -220, 220), y: p.y + clamp((p.dy || 0) * 100, -140, 140) }; fast = true; }
    else if (!R.free && R.follow) target = R.view[R.follow.idx] ? R.view[R.follow.idx] : R.follow;
    if (target && (!R.free || fast)) {
      if (fast) R.free = false;
      const k = Math.min(1, dt * (fast ? 4.5 : 3.2));
      cam.x = lerp(cam.x, target.x, k); cam.y = lerp(cam.y, target.y, k);
    }
    R.clampCam();
  }

  // ---------------- draw
  R.resize = function () {
    R.dpr = Math.min(2, window.devicePixelRatio || 1);
    R.VW = cv.clientWidth; R.VH = cv.clientHeight;
    cv.width = Math.round(R.VW * R.dpr); cv.height = Math.round(R.VH * R.dpr);
    R.cam.zoom = clamp(R.VH / 900, 0.5, 1.4);
    if (R.m) { const mw = Math.round(Math.min(240, Math.max(140, R.VW * 0.18))); mini.width = mw; mini.height = Math.round(mw * R.m.H / R.m.W); }
  };
  R.frame = function (dt, ui) {
    const m = R.m; if (!m) return;
    R.consumeEvents();
    R.t += dt;
    for (const t of m.subs) {
      const v = viewOf(t.idx);
      v.x = Math.abs(v.x - t.x) > 300 ? t.x : lerp(v.x, t.x, Math.min(1, dt * 14));
      v.y = Math.abs(v.y - t.y) > 300 ? t.y : lerp(v.y, t.y, Math.min(1, dt * 14));
      v.face = lerp(v.face, t.facing, Math.min(1, dt * 10));
      v.recoil = Math.max(0, v.recoil - dt * 3); v.flash = Math.max(0, v.flash - dt * 5);
      if (!t.alive) continue;
      v.fxT -= dt;
      if (v.fxT <= 0) { v.fxT = 0.18 + vrnd() * 0.25; R.fx.push({ kind: 'bubble', x: v.x - t.facing * 38, y: v.y + (vrnd() - 0.5) * 8, vx: -t.facing * 10, vy: -30 - vrnd() * 20, t: 0, life: 1.2, r: 1.5 + vrnd() * 2 }); }
      // battle damage: air leaking from the crack when hurt; oil, more air and moaning when critical
      const md = moodOf(t);
      if (md >= 1 && vrnd() < dt * (md === 2 ? 4 : 1.6)) R.fx.push({ kind: 'bubble', x: v.x + t.facing * 6, y: v.y + 4, vx: (vrnd() - 0.5) * 16, vy: -40 - vrnd() * 30, t: 0, life: 1.4, r: 1.2 + vrnd() * 2.2 });
      if (md === 2 && vrnd() < dt * 2.2) R.fx.push({ kind: 'oil', x: v.x - t.facing * 20 + (vrnd() - 0.5) * 10, y: v.y + 8, vx: (vrnd() - 0.5) * 8, vy: -14 - vrnd() * 10, t: 0, life: 2.4, r: 4 + vrnd() * 4 });
      if (md === 2) { v.moanT = (v.moanT === undefined ? 2 + vrnd() * 4 : v.moanT) - dt; if (v.moanT <= 0 && !R.bubblesSay[t.idx]) { v.moanT = 7 + vrnd() * 5; R.say(t.idx, MOANS[Math.floor(vrnd() * MOANS.length)]); } }
      if (t.shock && vrnd() < dt * 6) { const a = vrnd() * 7; R.bolts.push({ x1: v.x, y1: v.y, x2: v.x + Math.cos(a) * 40, y2: v.y + Math.sin(a) * 26, t: 0, col: '#BFA8FF' }); }
    }
    for (const p of m.proj) {
      if (p.wait > 0) continue;
      const tr = R.trails[p.id] || (R.trails[p.id] = { last: 0 });
      tr.last += dt; if (tr.last > 0.03) { tr.last = 0; R.fx.push({ kind: 'bubble', x: p.x - (p.dx || 0) * 12, y: p.y - (p.dy || 0) * 12, vx: 0, vy: -20 - vrnd() * 20, t: 0, life: 0.9, r: 1.2 + vrnd() * 2 }); }
    }
    if (!m.proj.length) R.trails = {};
    for (const f of R.fx) {
      f.t += dt; if (f.t < 0) continue;
      if (f.kind === 'bubble' || f.kind === 'plus' || f.kind === 'oil') { f.x += (f.vx || 0) * dt + Math.sin(f.t * 6 + f.r) * 0.3; f.y += f.vy * dt; }
      else if (f.kind === 'chunk') { f.x += f.vx * dt; f.y += f.vy * dt; f.vx *= 0.96; f.vy = f.vy * 0.96 + 60 * dt; }
    }
    R.fx = R.fx.filter(f => f.t < f.life);
    for (const s of R.texts) s.t += dt; R.texts = R.texts.filter(s => s.t < 1.4);
    for (const b of R.bolts) b.t += dt; R.bolts = R.bolts.filter(b => b.t < (b.big ? 0.5 : 0.18));
    for (const k in R.bubblesSay) { R.bubblesSay[k].t += dt; if (R.bubblesSay[k].t > 3.2) delete R.bubblesSay[k]; }
    R.hurtFlash = (R.hurtFlash || 0) * Math.pow(0.08, dt);
    R.shake *= Math.pow(0.02, dt);
    updateCam(dt);
    draw(ui);
  };
  function draw(ui) {
    const m = R.m, th = R.th, cam = R.cam, dpr = R.dpr, W = cv.width, H = cv.height, z = cam.zoom * dpr;
    const v = R.viewSize(), left = cam.x - v.w / 2, top = cam.y - v.h / 2;
    // water: colour by depth (world y), so diving darkens the screen
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const y0 = top / m.H, y1 = (top + v.h) / m.H, wc = th.water;
    const g = ctx.createLinearGradient(0, 0, 0, H);
    const at = f => { f = clamp(f, 0, 1); return f < 0.5 ? mix(wc[0], wc[1], f / 0.5) : mix(wc[1], wc[2], (f - 0.5) / 0.5); };
    g.addColorStop(0, at(y0)); g.addColorStop(1, at(y1));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // light rays from the surface
    if (top < m.H * 0.6) for (const r of R.bg.rays) {
      const rx = ((r.x + R.t * r.v) % 1.2 - 0.1) * W - (left * 0.08 * cam.zoom * dpr) % W;
      ctx.fillStyle = th.ray; ctx.globalAlpha = r.a * clamp(1 - y0 * 1.6, 0, 1);
      ctx.beginPath(); ctx.moveTo(rx, 0); ctx.lineTo(rx + r.w * dpr, 0); ctx.lineTo(rx + r.w * dpr - H * 0.35, H); ctx.lineTo(rx - H * 0.35 - r.w * 0.5 * dpr, H); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // far rock silhouettes (parallax)
    { const img = R.bg.far, s = dpr * Math.max(1, cam.zoom) * 1.2, w = img.width * s, h = img.height * s; let x = -((left * 0.25 * cam.zoom * dpr) % w); if (x > 0) x -= w; const y = H - h + (m.H * 0.6 - cam.y) * 0.15 * cam.zoom * dpr; for (; x < W; x += w) ctx.drawImage(img, x, y, w, h); }
    // marine snow
    if (!R.snow) R.snow = Array.from({ length: 70 }, () => ({ x: vrnd(), y: vrnd(), s: 0.6 + vrnd() * 1.6, v: 0.004 + vrnd() * 0.01 }));
    ctx.fillStyle = 'rgba(220,240,255,0.35)';
    for (const p of R.snow) { p.y = (p.y + p.v * 0.016) % 1; const sx = ((p.x * W - left * 0.5 * cam.zoom * dpr) % W + W) % W, sy = ((p.y * H - top * 0.5 * cam.zoom * dpr) % H + H) % H; ctx.fillRect(sx, sy, p.s * dpr, p.s * dpr); }
    const shx = (vrnd() - 0.5) * R.shake, shy = (vrnd() - 0.5) * R.shake;
    ctx.setTransform(z, 0, 0, z, (-left + shx) * z, (-top + shy) * z);
    // map edges: open water beyond the map is darker (ring-out zone)
    ctx.fillStyle = 'rgba(0,8,20,0.55)';
    if (left < 0) ctx.fillRect(left - 10, top - 10, -left + 10, v.h + 20);
    if (left + v.w > m.W) ctx.fillRect(m.W, top - 10, left + v.w - m.W + 10, v.h + 20);
    if (top < 0) ctx.fillRect(left - 10, top - 10, v.w + 20, -top + 10);
    ctx.strokeStyle = 'rgba(255,90,74,0.45)'; ctx.setLineDash([16, 12]); ctx.lineWidth = 3 / cam.zoom; ctx.strokeRect(0, 0, m.W, m.H); ctx.setLineDash([]);
    const rx = clamp(Math.floor(left), 0, m.W), ry = clamp(Math.floor(top), 0, m.H);
    const rw = clamp(Math.ceil(left + v.w), 0, m.W) - rx, rh = clamp(Math.ceil(top + v.h), 0, m.H) - ry;
    drawZones(left, top, v);
    if (rw > 0 && rh > 0) ctx.drawImage(R.terrain, rx, ry, rw, rh, rx, ry, rw, rh);
    drawMapExtras();
    for (const c of m.crates) drawCrate(c);
    for (const f of R.fx) if (f.kind === 'wreck') drawFx(f);
    if (ui) drawAim(ui); // (the game passes no aim: the curve lives only on the aiming panel)
    for (const t of m.subs) if (t.alive) drawSub(t, ui);
    for (const p of m.proj) drawTorp(p);
    for (const f of R.fx) if (f.kind !== 'wreck') drawFx(f);
    if (ui) drawAimTop(ui);
    for (const b of R.bolts) { const k = b.t / (b.big ? 0.5 : 0.18); ctx.strokeStyle = b.col; ctx.globalAlpha = 1 - k; ctx.lineWidth = b.big ? 4 : 2; ctx.beginPath(); ctx.moveTo(b.x1, b.y1); for (let i = 1; i < 7; i++) { const f = i / 7; ctx.lineTo(b.x1 + (b.x2 - b.x1) * f + (vrnd() - 0.5) * (b.big ? 26 : 10), b.y1 + (b.y2 - b.y1) * f + (vrnd() - 0.5) * (b.big ? 26 : 10)); } ctx.lineTo(b.x2, b.y2); ctx.stroke(); ctx.globalAlpha = 1; }
    ctx.textAlign = 'center';
    for (const s of R.texts) {
      const a = s.t < 1 ? 1 : 1 - (s.t - 1) / 0.4, pop = s.t < 0.14 ? 1.7 - s.t / 0.14 * 0.7 : 1;
      ctx.globalAlpha = Math.max(0, a); ctx.font = `400 ${Math.round((s.size || 18) * pop)}px "Black Han Sans", "Noto Sans KR", sans-serif`;
      ctx.lineWidth = s.size > 24 ? 6 : 4; ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(0,0,0,0.75)';
      const yy = s.y - s.t * 36; ctx.strokeText(s.s, s.x, yy); ctx.fillStyle = s.col; ctx.fillText(s.s, s.x, yy);
    }
    ctx.globalAlpha = 1;
    for (const t of m.subs) if (t.alive) drawLabel(t);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawEdges(left, top);
    if (R.hurtFlash > 0.01) {
      const Wc = cv.clientWidth, Hc = cv.clientHeight, gg = ctx.createRadialGradient(Wc / 2, Hc / 2, Math.min(Wc, Hc) * 0.35, Wc / 2, Hc / 2, Math.max(Wc, Hc) * 0.75);
      gg.addColorStop(0, 'rgba(255,40,30,0)'); gg.addColorStop(1, `rgba(255,40,30,${0.5 * R.hurtFlash})`);
      ctx.fillStyle = gg; ctx.fillRect(0, 0, Wc, Hc);
    }
    drawMini(left, top, v);
  }
  function mix(a, b, f) { const pa = a.match(/\w\w/g).map(h => parseInt(h, 16)), pb = b.match(/\w\w/g).map(h => parseInt(h, 16)); return `rgb(${Math.round(lerp(pa[0], pb[0], f))},${Math.round(lerp(pa[1], pb[1], f))},${Math.round(lerp(pa[2], pb[2], f))})`; }
  // map-rule visuals under the rock: the Bermuda triangle, the Nautilus swirl, spa bubble columns, 12신 wrap edges
  function drawZones(left, top, v) {
    const m = R.m, Rr = m.rules, z = R.cam.zoom;
    if (Rr.tri) { const t = Rr.tri; ctx.fillStyle = 'rgba(110,230,206,0.07)'; ctx.beginPath(); ctx.moveTo(t[0][0], t[0][1]); ctx.lineTo(t[1][0], t[1][1]); ctx.lineTo(t[2][0], t[2][1]); ctx.closePath(); ctx.fill(); ctx.strokeStyle = 'rgba(110,230,206,0.25)'; ctx.setLineDash([18 / z, 14 / z]); ctx.lineWidth = 2 / z; ctx.stroke(); ctx.setLineDash([]); }
    if (Rr.swirl) { const w = Rr.swirl; ctx.strokeStyle = 'rgba(200,250,255,0.10)'; ctx.lineWidth = 3; for (let i = 0; i < 6; i++) { const r = w.r * (0.25 + i * 0.13), a0 = R.t * (0.6 - i * 0.06) + i; ctx.beginPath(); ctx.ellipse(w.x, w.y, r, r * 0.8, 0, a0, a0 + 1.6); ctx.stroke(); } }
    if (Rr.lift) for (const q of Rr.lift) { if (vrnd() < 0.25) R.fx.push({ kind: 'bubble', x: q[0] + vrnd() * (q[1] - q[0]), y: q[3] - vrnd() * 40, vx: 0, vy: -70 - vrnd() * 60, t: 0, life: 4, r: 2 + vrnd() * 3 }); }
    if (Rr.heal) for (const q of Rr.heal) { if (vrnd() < 0.06) R.fx.push({ kind: 'bubble', x: q[0] + vrnd() * (q[1] - q[0]), y: q[2] + 10, vx: (vrnd() - 0.5) * 10, vy: -25, t: 0, life: 2.5, r: 6 + vrnd() * 6 }); }
    if (Rr.wrapX) { for (const ex of [0, m.W]) { const g = ctx.createLinearGradient(ex - 60, 0, ex + 60, 0); g.addColorStop(0, 'rgba(56,225,255,0)'); g.addColorStop(0.5, `rgba(56,225,255,${0.18 + 0.08 * Math.sin(R.t * 3)})`); g.addColorStop(1, 'rgba(56,225,255,0)'); ctx.fillStyle = g; ctx.fillRect(ex - 60, top, 120, v.h); } }
  }
  // map objects over the rock: mines (배틀 필드), falling stalactites (케이브), the castle-guard mark (듀크)
  function drawMapExtras() {
    const m = R.m;
    for (const q of m.mines) {
      if (!q.alive) continue;
      const an = R.anchors || (R.anchors = {}); if (an[q.id] === undefined) { an[q.id] = q.y; for (let y = q.y + 24; y < m.H; y += 6) if (m.mask[Math.floor(y) * m.W + Math.floor(q.x)]) { an[q.id] = y; break; } }
      ctx.strokeStyle = 'rgba(40,40,36,0.8)'; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(q.x, q.y + 20); ctx.lineTo(q.x + Math.sin(R.t + q.id) * 6, an[q.id]); ctx.stroke(); ctx.setLineDash([]);
      ctx.save(); ctx.translate(q.x, q.y + Math.sin(R.t * 1.3 + q.id) * 3);
      ctx.strokeStyle = '#2A2A26'; ctx.lineWidth = 4; for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 16, Math.sin(a) * 16); ctx.lineTo(Math.cos(a) * 26, Math.sin(a) * 26); ctx.stroke(); }
      const g = ctx.createRadialGradient(-6, -6, 2, 0, 0, 20); g.addColorStop(0, '#6A6A60'); g.addColorStop(1, '#22221E'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 19, 0, 7); ctx.fill();
      ctx.fillStyle = Math.sin(R.t * 5 + q.id) > 0 ? '#FF3A2A' : '#5A1A14'; ctx.beginPath(); ctx.arc(0, -8, 3.5, 0, 7); ctx.fill();
      ctx.restore();
    }
    for (const f of m.falls) { ctx.fillStyle = `rgb(${R.th.edge.join(',')})`; ctx.beginPath(); ctx.moveTo(f.x - 16, f.y - 30); ctx.lineTo(f.x + 16, f.y - 30); ctx.lineTo(f.x, f.y + 14); ctx.fill(); }
  }
  // 0 fine, 1 hurt (half health or less), 2 critical (a third or less)
  function moodOf(t) { const k = t.hp / t.maxhp; return !t.alive ? 0 : k <= 1 / 3 ? 2 : k <= 0.5 ? 1 : 0; }
  R.moodOf = moodOf;
  const MOANS = ['끙…', '아야…', '으으…', '살려줘…', '물 샌다!', '수리 좀…'];
  function drawSub(t, ui) {
    const v = viewOf(t.idx), m = R.m, bob = Math.sin(R.t * 1.6 + v.bob) * 2.5;
    const face = v.face >= 0 ? 1 : -1, squash = Math.max(0.15, Math.abs(v.face));
    if (m.cur === t.idx && m.phase === 'aim') { ctx.strokeStyle = 'rgba(255,210,74,0.55)'; ctx.lineWidth = 2; ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.ellipse(v.x, v.y + bob, 64, 38, 0, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
    ctx.save(); ctx.translate(v.x - face * v.recoil * 6, v.y + bob); ctx.scale(squash, 1);
    const mood = moodOf(t);
    const shiver = mood === 2 && !R.reduceMotion ? Math.sin(R.t * 40 + t.idx) * 0.8 : 0;
    drawSubAt(ctx, t.subId, shiver, 0, SUB_SCALE, R.t + t.idx, TEAMC[t.team], face, mood);
    if (v.flash > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = v.flash * 0.6; drawSubAt(ctx, t.subId, 0, 0, SUB_SCALE, R.t, '#FFFFFF', face); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
    ctx.restore();
    if (t.shield) { ctx.strokeStyle = 'rgba(200,180,255,0.75)'; ctx.fillStyle = 'rgba(200,180,255,0.12)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(v.x, v.y + bob, 60, 36, 0, 0, 7); ctx.fill(); ctx.stroke(); }
  }
  function drawLabel(t) {
    const gz = R.m.rules.guard; if (gz && t.x >= gz.x0 && t.x <= gz.x1 && t.y >= gz.y0 && t.y <= gz.y1) { const v0 = viewOf(t.idx); ctx.fillStyle = '#C9A227'; ctx.beginPath(); ctx.moveTo(v0.x + 40, v0.y - 46); ctx.lineTo(v0.x + 52, v0.y - 42); ctx.lineTo(v0.x + 50, v0.y - 30); ctx.lineTo(v0.x + 46, v0.y - 25); ctx.lineTo(v0.x + 42, v0.y - 30); ctx.lineTo(v0.x + 40, v0.y - 42); ctx.closePath(); ctx.fill(); }
    const v = viewOf(t.idx), m = R.m, cur = m.cur === t.idx && m.phase === 'aim', y = v.y - 52;
    ctx.font = '700 14px "Noto Sans KR", sans-serif'; ctx.textAlign = 'center';
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.strokeText(t.nick, v.x, y - 10); ctx.fillStyle = t.team === 'red' ? '#FFB4A4' : '#A9D0FF'; ctx.fillText(t.nick, v.x, y - 10);
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(v.x - 30, y - 4, 60, 7);
    ctx.fillStyle = TEAMC[t.team]; ctx.fillRect(v.x - 30, y - 4, 60 * Math.max(0, t.hp) / t.maxhp, 7);
    if (cur) { ctx.fillStyle = '#FFD24A'; ctx.beginPath(); const ay = y - 34 + Math.sin(R.t * 5) * 3; ctx.moveTo(v.x - 8, ay); ctx.lineTo(v.x + 8, ay); ctx.lineTo(v.x, ay + 9); ctx.fill(); }
    const sb = R.bubblesSay[t.idx];
    if (sb) { ctx.font = '600 13px "Noto Sans KR", sans-serif'; const w = ctx.measureText(sb.text).width + 18, by = y - 56; ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.beginPath(); ctx.roundRect(v.x - w / 2, by - 15, w, 24, 10); ctx.fill(); ctx.fillStyle = '#10202E'; ctx.fillText(sb.text, v.x, by + 2); }
  }
  function drawCrate(c) {
    const b = Math.sin(R.t * 2 + c.id) * 4, meta = CONFIG.items[c.item];
    const last = R.m && R.m.turnNo - (c.born || 0) >= crateLife(R.m) - R.m.subs.length; // sinks away within a round: blink
    ctx.save(); ctx.translate(c.x, c.y + b); if (last) ctx.globalAlpha = 0.45 + 0.45 * Math.abs(Math.sin(R.t * 5));
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.beginPath(); ctx.arc(0, 0, 26, 0, 7); ctx.fill();
    ctx.fillStyle = '#E8C24A'; ctx.strokeStyle = '#3A2A00'; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(-15, -12, 30, 24, 6); ctx.fill(); ctx.stroke();
    ctx.fillStyle = meta.color; ctx.font = '900 10px "Noto Sans KR", sans-serif'; ctx.textAlign = 'center'; ctx.fillText(meta.label, 0, 4);
    ctx.strokeStyle = 'rgba(230,240,255,0.6)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(0, -26); ctx.stroke(); ctx.fillStyle = '#FF5A4A'; ctx.beginPath(); ctx.arc(0, -27, 3, 0, 7); ctx.fill();
    ctx.restore();
  }
  function drawTorp(p) {
    if (p.wait > 0) return; // 2연발: the second shot is still in the tube
    const m = R.m, w = CONFIG.subs[m.subs[p.idx].subId].weapons[p.wIdx], look = TORP[w.kind] || TORP.circle;
    const a = Math.atan2(p.dy || 0, p.dx || 1);
    if (p.tele) { // 순간이동 carrier: a glowing ring
      ctx.save(); ctx.translate(p.x, p.y);
      const gl = ctx.createRadialGradient(0, 0, 0, 0, 0, 18); gl.addColorStop(0, '#FFFFFF'); gl.addColorStop(0.45, '#7CF5FF'); gl.addColorStop(1, 'rgba(124,245,255,0)');
      ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(0, 0, 18, 0, 7); ctx.fill();
      ctx.strokeStyle = '#E8FDFF'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 10 + Math.sin(R.t * 14) * 2, 0, 7); ctx.stroke();
      ctx.restore(); return;
    }
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(a);
    if (look[2]) { ctx.fillStyle = look[2] + '44'; ctx.beginPath(); ctx.arc(0, 0, 16, 0, 7); ctx.fill(); }
    ctx.strokeStyle = '#0A1420'; ctx.lineWidth = 1.5;
    if (p.mode === 'fall' && w.kind === 'rain') {
      ctx.strokeStyle = '#8A5A2E'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(8, 0); ctx.stroke();
      ctx.fillStyle = '#C9CED6'; ctx.beginPath(); ctx.moveTo(8, -4); ctx.lineTo(15, 0); ctx.lineTo(8, 4); ctx.fill();
      ctx.fillStyle = `rgba(255,${140 + vrnd() * 80 | 0},40,0.95)`; ctx.beginPath(); ctx.arc(-16, 0, 3.5 + vrnd() * 2, 0, 7); ctx.fill();
    } else if (p.mode === 'mini') {
      ctx.fillStyle = w.kind === 'split' ? (p.tag < 0 ? '#2E86D6' : '#8CC63F') : '#9FB3C2';
      ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(-6, -6); ctx.lineTo(-2, 0); ctx.lineTo(-6, 6); ctx.closePath(); ctx.fill(); ctx.stroke();
    } else if (p.mode === 'crawl') {
      ctx.fillStyle = look[0]; ctx.beginPath(); ctx.ellipse(0, 0, 9, 6, 0, 0, 7); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#7F8B98'; ctx.lineWidth = 1.6; const k = Math.sin(R.t * 30) * 3; for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(-4, s * 5); ctx.lineTo(-8 + k, s * 10); ctx.moveTo(3, s * 5); ctx.lineTo(7 - k, s * 10); ctx.stroke(); }
      ctx.fillStyle = '#FFE08A'; ctx.beginPath(); ctx.arc(6, 0, 2, 0, 7); ctx.fill();
    } else if (w.kind === 'bounce' || w.kind === 'magnet') {
      ctx.fillStyle = look[0]; ctx.beginPath(); ctx.arc(0, 0, 9, 0, 7); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-3, -5); ctx.lineTo(-3, 5); ctx.moveTo(4, -5); ctx.lineTo(-2, 0); ctx.lineTo(4, 5); ctx.stroke();
    } else if (w.kind === 'electric' || w.kind === 'chain') {
      const gl = ctx.createRadialGradient(0, 0, 0, 0, 0, 14); gl.addColorStop(0, '#FFFFFF'); gl.addColorStop(0.4, look[1]); gl.addColorStop(1, 'rgba(190,170,255,0)');
      ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(0, 0, 14, 0, 7); ctx.fill();
    } else {
      const len = p.mode === 'fall' ? 24 : 26;
      ctx.fillStyle = look[0]; ctx.beginPath(); ctx.roundRect(-len / 2, -4.5, len, 9, 4.5); ctx.fill(); ctx.stroke();
      ctx.fillStyle = look[1]; ctx.beginPath(); if (w.kind === 'pierce') { ctx.moveTo(len / 2 - 2, -4.5); ctx.lineTo(len / 2 + 9, 0); ctx.lineTo(len / 2 - 2, 4.5); } else { ctx.moveTo(len / 2 - 4, -4.5); ctx.quadraticCurveTo(len / 2 + 6, 0, len / 2 - 4, 4.5); } ctx.closePath(); ctx.fill(); ctx.stroke();
      if (w.kind === 'cross') { ctx.fillStyle = '#2E8B57'; ctx.fillRect(-4, -4.5, 3, 9); ctx.fillStyle = '#1F5FA8'; ctx.fillRect(0, -4.5, 3, 9); }
      if (w.kind === 'homing' && Math.floor(R.t * 8) % 2) { ctx.fillStyle = '#FF3D3D'; ctx.beginPath(); ctx.arc(2, -5, 2.4, 0, 7); ctx.fill(); }
      ctx.fillStyle = '#CBD3DC'; const kk = Math.abs(Math.sin(R.t * 40)); ctx.beginPath(); ctx.ellipse(-len / 2 - 2, 0, 1.5, 2 + 4 * kk, 0, 0, 7); ctx.fill();
    }
    ctx.restore();
  }
  function drawFx(f) {
    const k = f.t / f.life; if (f.t < 0) return;
    if (f.kind === 'bubble') { ctx.strokeStyle = `rgba(220,245,255,${0.7 * (1 - k)})`; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 7); ctx.stroke(); ctx.fillStyle = `rgba(255,255,255,${0.35 * (1 - k)})`; ctx.beginPath(); ctx.arc(f.x - f.r * 0.3, f.y - f.r * 0.3, f.r * 0.3, 0, 7); ctx.fill(); }
    else if (f.kind === 'oil') { ctx.fillStyle = `rgba(24,18,12,${0.45 * (1 - k)})`; ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (1 + k * 1.6), 0, 7); ctx.fill(); }
    else if (f.kind === 'shape') {
      const a = 1 - k, draw = (rx, ry) => { const r = Math.max(rx, ry); ctx.save(); ctx.translate(f.x, f.y); ctx.scale(rx / r, ry / r); const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r); g.addColorStop(0, `rgba(255,250,225,${0.95 * a})`); g.addColorStop(0.45, f.col + Math.round(a * 180).toString(16).padStart(2, '0')); g.addColorStop(1, f.col + '00'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r * (0.75 + k * 0.25), 0, 7); ctx.fill(); ctx.restore(); ctx.strokeStyle = `rgba(255,255,255,${0.6 * a})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(f.x, f.y, rx, ry, 0, 0, 7); ctx.stroke(); };
      if (f.box) { const sq = (rx, ry) => { ctx.fillStyle = f.col + Math.round(a * 150).toString(16).padStart(2, '0'); ctx.fillRect(f.x - rx, f.y - ry, rx * 2, ry * 2); ctx.strokeStyle = `rgba(255,255,255,${0.7 * a})`; ctx.lineWidth = 2; ctx.strokeRect(f.x - rx, f.y - ry, rx * 2, ry * 2); }; if (f.thin) { sq(f.rx, f.thin); sq(f.thin, f.ry); } else sq(f.rx, f.ry); }
      else if (f.thin) { draw(f.rx, f.thin); draw(f.thin, f.ry); } else draw(f.rx, f.ry);
    }
    else if (f.kind === 'ring') { ctx.strokeStyle = `rgba(220,245,255,${0.6 * (1 - k)})`; ctx.lineWidth = f.w; ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (0.5 + k * 1.1), 0, 7); ctx.stroke(); }
    else if (f.kind === 'sonar') { ctx.strokeStyle = `rgba(111,227,225,${0.8 * (1 - k)})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(f.x, f.y, f.rx * (0.3 + k), f.ry * (0.3 + k), 0, 0, 7); ctx.stroke(); }
    else if (f.kind === 'chunk') { ctx.save(); ctx.translate(f.x, f.y); ctx.rotate((f.rot || 0) + f.t * 5); ctx.fillStyle = f.col; ctx.globalAlpha = 1 - k * 0.6; ctx.fillRect(-f.s / 2, -f.s / 2, f.s, f.s); ctx.restore(); ctx.globalAlpha = 1; }
    else if (f.kind === 'plus') { ctx.fillStyle = `rgba(110,240,200,${1 - k})`; ctx.fillRect(f.x - 5, f.y - 1.5, 10, 3); ctx.fillRect(f.x - 1.5, f.y - 5, 3, 10); }
    else if (f.kind === 'hover') { ctx.strokeStyle = `rgba(255,90,74,${0.5 + 0.5 * Math.sin(R.t * 18)})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(f.x, f.y, 18, 0, 7); ctx.moveTo(f.x - 26, f.y); ctx.lineTo(f.x + 26, f.y); ctx.moveTo(f.x, f.y - 26); ctx.lineTo(f.x, f.y + 26); ctx.stroke(); ctx.setLineDash([6, 8]); ctx.beginPath(); ctx.moveTo(f.x, f.y + 26); ctx.lineTo(f.x, f.y + 600); ctx.stroke(); ctx.setLineDash([]); }
    else if (f.kind === 'swell') { const r = 10 + f.r * 0.5 * k; ctx.fillStyle = 'rgba(221,246,255,0.25)'; ctx.strokeStyle = 'rgba(221,246,255,0.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(f.x, f.y, r, 0, 7); ctx.fill(); ctx.stroke(); }
    else if (f.kind === 'swirl') { ctx.strokeStyle = `rgba(111,227,225,${0.85 * (1 - k * 0.6)})`; ctx.lineWidth = 3; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (1 - ((R.t * 0.9 + i / 3) % 1)), R.t * 5 + i, R.t * 5 + i + 3.8); ctx.stroke(); } }
    else if (f.kind === 'wreck') { ctx.save(); ctx.globalAlpha = 1 - k; ctx.translate(f.x, f.y + f.t * 40); ctx.rotate(f.face * f.t * 0.25); drawSubAt(ctx, f.id, 0, 0, SUB_SCALE, 0, '#555', f.face); ctx.fillStyle = 'rgba(10,10,14,0.55)'; ctx.globalCompositeOperation = 'source-atop'; ctx.fillRect(-70, -50, 140, 100); ctx.restore(); ctx.globalAlpha = 1; }
  }
  // aim overlay: the curve being drawn, handles, the gauge light, the burst shape at the light
  function drawAim(ui) {
    const z = R.cam.zoom, path = ui.path;
    if (!path) return;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (ui.ghost) {
      ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 2 / z; ctx.setLineDash([10 / z, 10 / z]);
      ctx.beginPath(); for (let i = 0; i < path.xs.length; i++) i ? ctx.lineTo(path.xs[i], path.ys[i]) : ctx.moveTo(path.xs[i], path.ys[i]); ctx.stroke(); ctx.setLineDash([]);
      return;
    }
    // where the rest of the control polygon was refused (bend too sharp)
    if (ui.dropFrom >= 0) { ctx.strokeStyle = 'rgba(255,90,74,0.8)'; ctx.lineWidth = 2 / z; ctx.setLineDash([6 / z, 6 / z]); ctx.beginPath(); const a = ui.dropFrom === 0 ? ui.muzzle : ui.pts[ui.dropFrom - 1]; ctx.moveTo(a[0], a[1]); for (let i = ui.dropFrom; i < 3; i++) ctx.lineTo(ui.pts[i][0], ui.pts[i][1]); ctx.stroke(); ctx.setLineDash([]); }
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 6 / z; ctx.beginPath(); for (let i = 0; i < path.xs.length; i++) i ? ctx.lineTo(path.xs[i], path.ys[i]) : ctx.moveTo(path.xs[i], path.ys[i]); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,210,74,0.95)'; ctx.lineWidth = 3 / z; ctx.setLineDash([12 / z, 9 / z]); ctx.lineDashOffset = -R.t * 30 / z; ctx.stroke(); ctx.setLineDash([]); ctx.lineDashOffset = 0;
    // current drift preview: where the end really goes
    if (ui.driftEnd) { ctx.strokeStyle = 'rgba(140,220,255,0.7)'; ctx.lineWidth = 1.5 / z; ctx.setLineDash([4 / z, 6 / z]); ctx.beginPath(); ctx.moveTo(path.xs[path.xs.length - 1], path.ys[path.ys.length - 1]); ctx.lineTo(ui.driftEnd[0], ui.driftEnd[1]); ctx.stroke(); ctx.setLineDash([]); }
    const end = [path.xs[path.xs.length - 1], path.ys[path.ys.length - 1]];
    if (ui.cut) { ctx.fillStyle = '#FF7A59'; ctx.font = `700 ${13 / z}px "Noto Sans KR", sans-serif`; ctx.textAlign = 'center'; ctx.fillText('사거리 끝', end[0], end[1] - 14 / z); }
    if (ui.last) { ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 2 / z; ctx.beginPath(); ctx.arc(ui.last[0], ui.last[1], 8 / z, 0, 7); ctx.stroke(); }
  }
  // the parts of the aim drawn over the subs: gauge runner + burst shape + the three handles
  function drawAimTop(ui) {
    const z = R.cam.zoom, path = ui.path;
    if (!path || ui.ghost) return;
    if (ui.charging) {
      const s = path.L * ui.gauge / 1000;
      ctx.strokeStyle = 'rgba(255,245,200,0.95)'; ctx.lineWidth = 5 / z; ctx.beginPath();
      for (let i = 0; i < path.xs.length && path.ss[i] <= s; i++) i ? ctx.lineTo(path.xs[i], path.ys[i]) : ctx.moveTo(path.xs[i], path.ys[i]);
      const p = pathAt(path, s); ctx.lineTo(p.x, p.y); ctx.stroke();
      const gl = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 26 / z); gl.addColorStop(0, 'rgba(255,255,230,1)'); gl.addColorStop(1, 'rgba(255,210,74,0)'); ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(p.x, p.y, 26 / z, 0, 7); ctx.fill();
      const sh = ui.shape; if (sh) { ctx.strokeStyle = 'rgba(255,210,74,0.6)'; ctx.setLineDash([5 / z, 6 / z]); ctx.lineWidth = 1.5 / z; ctx.beginPath(); if (sh.thin) { ctx.ellipse(p.x, p.y, sh.rx, sh.thin, 0, 0, 7); ctx.moveTo(p.x + sh.thin, p.y); ctx.ellipse(p.x, p.y, sh.thin, sh.ry, 0, 0, 7); } else ctx.ellipse(p.x, p.y, sh.rx, sh.ry, 0, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
    }
    // handles
    ui.pts.forEach((q, i) => {
      const bad = ui.dropFrom >= 0 && i >= ui.dropFrom, r = 13 / z, hot = ui.hover === i || ui.drag === i;
      ctx.fillStyle = bad ? '#FF7A59' : hot ? '#FFF0A8' : '#FFD24A'; ctx.strokeStyle = '#3A2A00'; ctx.lineWidth = 2.5 / z;
      ctx.beginPath(); ctx.arc(q[0], q[1], hot ? r * 1.2 : r, 0, 7); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#2A1A00'; ctx.font = `800 ${13 / z}px "IBM Plex Mono", monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(i + 1), q[0], q[1] + 0.5 / z); ctx.textBaseline = 'alphabetic';
    });
  }
  function drawEdges(left, top) {
    const cam = R.cam, list = [];
    for (const t of R.m.subs) {
      if (!t.alive) continue;
      const v = viewOf(t.idx), sx = (v.x - left) * cam.zoom, sy = (v.y - top) * cam.zoom;
      if (sx > 0 && sx < R.VW && sy > 0 && sy < R.VH) continue;
      list.push({ t, sx, sy, ex: clamp(sx, 26, R.VW - 26), ey: clamp(sy, 100, R.VH - 180) });
    }
    for (const side of [26, R.VW - 26]) { const g = list.filter(o => o.ex === side).sort((a, b) => a.ey - b.ey); for (let i = 1; i < g.length; i++) if (g[i].ey - g[i - 1].ey < 46) g[i].ey = g[i - 1].ey + 46; }
    for (const o of list) {
      const t = o.t, a = Math.atan2(o.sy - o.ey, o.sx - o.ex);
      ctx.save(); ctx.translate(o.ex, o.ey);
      ctx.fillStyle = TEAMC[t.team]; ctx.beginPath(); ctx.arc(0, 0, 17, 0, 7); ctx.fill();
      ctx.save(); ctx.rotate(a); ctx.beginPath(); ctx.moveTo(26, 0); ctx.lineTo(16, -8); ctx.lineTo(16, 8); ctx.fill(); ctx.restore();
      ctx.fillStyle = '#fff'; ctx.font = '900 11px "Noto Sans KR", sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(t.nick.slice(0, 1), 0, 4); // no distance number: range is judged by eye
      ctx.font = '700 11px "Noto Sans KR", sans-serif'; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.strokeText(t.nick, 0, 31); ctx.fillText(t.nick, 0, 31);
      ctx.restore();
    }
  }
  function drawMini(left, top, v) {
    const m = R.m, mw = mini.width, mh = mini.height, sx = mw / m.W, sy = mh / m.H;
    mctx.clearRect(0, 0, mw, mh);
    // the full-size terrain is scaled down once and again only after the rock changed (not every frame)
    if (!R.miniT || R.miniT.width !== mw || R.miniT.height !== mh || (R.miniDirty && R.t - (R.miniAt || 0) > 0.25)) {
      const c = R.miniT && R.miniT.width === mw && R.miniT.height === mh ? R.miniT : document.createElement('canvas'); c.width = mw; c.height = mh;
      const x = c.getContext('2d'); x.fillStyle = R.th.water[1]; x.fillRect(0, 0, mw, mh); x.drawImage(R.terrain, 0, 0, mw, mh);
      R.miniT = c; R.miniDirty = false; R.miniAt = R.t;
    }
    mctx.drawImage(R.miniT, 0, 0);
    for (const c of m.crates) { mctx.fillStyle = '#FFD24A'; mctx.fillRect(c.x * sx - 2, c.y * sy - 2, 4, 4); }
    for (const t of m.subs) if (t.alive) { mctx.fillStyle = t.team === 'red' ? '#FF6A50' : '#5AA8FF'; mctx.beginPath(); mctx.arc(t.x * sx, t.y * sy, m.cur === t.idx ? 4.5 : 3.2, 0, 7); mctx.fill(); if (m.cur === t.idx) { mctx.strokeStyle = '#fff'; mctx.lineWidth = 1.5; mctx.stroke(); } }
    for (const p of m.proj) if (!(p.wait > 0)) { mctx.fillStyle = '#FFFFFF'; mctx.fillRect(p.x * sx - 1, p.y * sy - 1, 2, 2); }
    mctx.strokeStyle = 'rgba(255,255,255,0.9)'; mctx.lineWidth = 1.5; mctx.strokeRect(left * sx, top * sy, v.w * sx, v.h * sy);
  }
  R.screenToWorld = function (cx, cy) {
    const v = R.viewSize(), r = cv.getBoundingClientRect();
    return { x: R.cam.x - v.w / 2 + (cx - r.left) / R.cam.zoom, y: R.cam.y - v.h / 2 + (cy - r.top) / R.cam.zoom };
  };
  return R;
}
// lobby / setup map preview
// map previews take ~0.4 s each (the whole map is generated), so they are built one at a time after the screen shows
const PREVIEWS = {}, previewQueue = [];
function previewInto(canvas, id) {
  canvas.width = 320; canvas.height = Math.round(320 * CONFIG.maps[id].H / CONFIG.maps[id].W);
  const paint = () => canvas.getContext('2d').drawImage(PREVIEWS[id], 0, 0);
  if (PREVIEWS[id]) return paint();
  const x = canvas.getContext('2d'), th = MTHEMES[CONFIG.maps[id].theme]; x.fillStyle = th.water[1]; x.fillRect(0, 0, canvas.width, canvas.height);
  previewQueue.push({ id, paint });
  if (previewQueue.length === 1) setTimeout(nextPreview, 30);
}
function nextPreview() {
  const job = previewQueue[0]; if (!job) return;
  if (!PREVIEWS[job.id]) PREVIEWS[job.id] = mapPreview(job.id);
  for (let i = previewQueue.length - 1; i >= 0; i--) if (previewQueue[i].id === job.id) { previewQueue[i].paint(); previewQueue.splice(i, 1); }
  if (previewQueue.length) setTimeout(nextPreview, 30);
}
function mapPreview(id) {
  const meta = CONFIG.maps[id], th = MTHEMES[meta.theme];
  const mp = buildMap(id), cw = 320, ch = Math.round(320 * meta.H / meta.W);
  const c = document.createElement('canvas'); c.width = cw; c.height = ch;
  const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, ch); g.addColorStop(0, th.water[0]); g.addColorStop(1, th.water[2]); x.fillStyle = g; x.fillRect(0, 0, cw, ch);
  const img = x.getImageData(0, 0, cw, ch), o = img.data, col = th.mini.match(/\w\w/g).map(h => parseInt(h, 16));
  for (let py = 0; py < ch; py++) for (let px = 0; px < cw; px++) {
    const v = mp.mask[Math.floor(py * meta.H / ch) * meta.W + Math.floor(px * meta.W / cw)];
    if (v) { const p = (py * cw + px) * 4, k = v === 2 ? 0.55 : 1; o[p] = col[0] * k; o[p + 1] = col[1] * k; o[p + 2] = col[2] * k; }
  }
  x.putImageData(img, 0, 0);
  return c;
}
