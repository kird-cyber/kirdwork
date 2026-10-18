// ============================================================== ROPE PLAYGROUND CONFIG
// All sizes in px, speeds in px/s. The simulation runs at a fixed 120 ticks per second.
const TICK = 1 / 120;
const TICK_RATE = 120;

// Tunable feel. Every slider in the "손맛 조절" panel edits one of these.
const ROPE_DEFAULT = {
  gravity: 900,      // px/s²
  walk: 72,          // walking speed
  jumpVx: 140, jumpVy: 280,   // forward jump (Enter)
  flipVx: 60, flipVy: 390,    // backflip (Backspace)
  swingAcc: 720,     // ← → push while hanging on the rope
  reel: 300,         // ↑ ↓ rope in / out speed
  maxLen: 460,       // longest rope
  minLen: 14,
  shotSpeed: 3000,   // how fast the rope flies out
  wallBounce: 0.72,  // bounce off walls while roped (2nd-gen rope: keeps speed; 0 = dead stop)
  airBounce: 0.3,    // bounce when hitting terrain hard in free flight
  landSpeed: 340,    // softer impacts than this on a floor just land
  momentum: 1,       // reeling in speeds the swing up (1 = real angular momentum, 0 = none)
  airDrag: 0,        // fraction of speed lost per second in the air
  maxSpeed: 1800,
};
// One-click starting points. 'classic' = old (2nd-generation) roping: wall bounces keep speed, reeling pumps the swing.
const ROPE_PRESETS = {
  classic: { name: '2세대 손맛', desc: '벽 반동으로 가속 · 줄 감으면 빨라짐 · 묘기 가능', v: {} },
  smooth: { name: '3세대 느낌', desc: '벽에 닿으면 멈칫 · 차분한 흔들림 · 쉬움', v: { wallBounce: 0, swingAcc: 540, momentum: 0.55, airDrag: 0.06, gravity: 780, maxLen: 420 } },
  wild: { name: '날다람쥐', desc: '중력 약하고 줄이 김 · 맵을 날아다니는 연습용', v: { gravity: 620, maxLen: 620, swingAcc: 780, wallBounce: 0.85 } },
};
// slider schema for the panel: key, label, min, max, step
const ROPE_SLIDERS = [
  ['gravity', '중력', 300, 1600, 10],
  ['swingAcc', '흔들기 힘 (← →)', 150, 1400, 10],
  ['reel', '줄 감기 속도 (↑ ↓)', 80, 600, 10],
  ['maxLen', '최대 줄 길이', 250, 900, 10],
  ['wallBounce', '벽 반동', 0, 1, 0.02],
  ['momentum', '감으면 빨라짐', 0, 1.2, 0.05],
  ['airDrag', '공기 저항', 0, 0.6, 0.01],
  ['shotSpeed', '줄 발사 속도', 900, 5000, 50],
  ['walk', '걷기 속도', 30, 160, 2],
];
const WORM_R = 7; // collision radius
