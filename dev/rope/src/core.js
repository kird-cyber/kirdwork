// ============================================================== CORE: deterministic math
// Rule: simulation code uses only + - * / Math.sqrt Math.floor Math.round Math.abs Math.min Math.max
// and the tables below. Math.sin/cos/atan2/hypot/pow differ between JS engines in the last bits.

// Seeded RNG (mulberry32). State is a uint32 so it can be hashed and copied.
function rngNext(m) {
  let t = (m.rng = (m.rng + 0x6D2B79F5) >>> 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function makeRng(seed) { return { rng: seed >>> 0 }; }

// Trig tables, rounded to 1e-9 so engine differences in Math.sin never survive.
const TRIG_N = 3600; // tenths of a degree
const COS_T = new Float64Array(TRIG_N);
const SIN_T = new Float64Array(TRIG_N);
for (let i = 0; i < TRIG_N; i++) {
  const a = (i / 10) * Math.PI / 180;
  COS_T[i] = Math.round(Math.cos(a) * 1e9) / 1e9;
  SIN_T[i] = Math.round(Math.sin(a) * 1e9) / 1e9;
}
// deg10 = angle in tenths of a degree (integer)
function cosD10(deg10) { return COS_T[((deg10 % TRIG_N) + TRIG_N) % TRIG_N]; }
function sinD10(deg10) { return SIN_T[((deg10 % TRIG_N) + TRIG_N) % TRIG_N]; }

// Radian sine for terrain shapes: 4096-step table, rounded the same way.
const RS_N = 4096;
const RSIN_T = new Float64Array(RS_N);
for (let i = 0; i < RS_N; i++) RSIN_T[i] = Math.round(Math.sin(2 * Math.PI * i / RS_N) * 1e9) / 1e9;
const RS_K = RS_N / 6.283185307179586;
function tsin(x) { let i = Math.round(x * RS_K) % RS_N; if (i < 0) i += RS_N; return RSIN_T[i]; }
function tcos(x) { return tsin(x + 1.5707963267948966); }

function clampN(v, a, b) { return v < a ? a : v > b ? b : v; }
function smoothstepN(e0, e1, x) { const t = clampN((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); }

// FNV-1a over bytes
function fnvInit() { return 0x811c9dc5; }
function fnvByte(h, b) { return Math.imul(h ^ (b & 255), 0x01000193) >>> 0; }
function fnvU32(h, v) { h = fnvByte(h, v); h = fnvByte(h, v >>> 8); h = fnvByte(h, v >>> 16); return fnvByte(h, v >>> 24); }
const _f64 = new Float64Array(1), _u32 = new Uint32Array(_f64.buffer);
function fnvF64(h, v) { _f64[0] = v; return fnvU32(fnvU32(h, _u32[0]), _u32[1]); }
function fnvStr(h, s) { s = String(s); for (let i = 0; i < s.length; i++) h = fnvU32(h, s.charCodeAt(i)); return h; }
