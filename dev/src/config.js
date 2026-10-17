// ============================================================== CONFIG
// Every gameplay number lives here. The simulation reads only this object.
// Units: px, degrees, ticks (1 tick = 1/120 s). Tank numbers are approved values — do not change without sign-off.
const CONFIG = {
  version: '0.8.0',
  physics: {
    tickRate: 120,
    gravity: 600,          // px/s^2
    maxSpeed: 1340,        // px/s at power 1000 (45°, no wind: ~3000 px)
    windAccel: 13,         // px/s^2 per wind unit
    fallSafe: 140,         // px of drop with no damage
    fallDmgPerPx: 0.35,
    moveStep: 0.5,         // px moved per movement tick (60 px/s)
    hoverMoveMul: 1.4,
    climb: 7,              // max px climbed per step
    tankRadius: 20,        // hit radius around tank centre
    settleTicks: 100,      // quiet ticks after the last action before the next turn
    // blast: weapon radius r -> damage reaches r*blastDmgMul + bodyRadius from the tank centre, terrain is dug to r*blastCarveMul
    blastDmgMul: 1.8,
    blastCarveMul: 1.15,
    bodyRadius: 30,
    edgeDmg: 0.3,          // damage at the very edge of the blast (centre = 100%)
  },
  turn: {
    timeLimitTicks: 7200,  // 60 s
    baseDelay: { 1: 900, 2: 820, 3: 740, 4: 660, 5: 580 },
    delayPerMovePx: 0.6,
    itemDelay: 80,
    skipDelay: 150,
    delayPerSec: 4,        // every second spent on a turn adds this much delay (60 s = +240)
    crateEveryTurns: 3,
    windMax: 10,
    maxPlayers: 8,
    teamMax: 4,
    inventoryMax: 4,
    mineMax: 6,
    // start positions: everyone within startSpan px (or (players-1) x startGap if that is wider), and not closer than startMin
    startSpan: 2400, startGap: 380, startMin: 900,
    // sudden death: from turn (base + perPlayer x players) every tank loses a share of its max hp each turn and wind gets stronger
    suddenBase: 10, suddenPerPlayer: 4, suddenDmg: 0.04, suddenWindMul: 1.5,
  },
  sprite: { scale: 0.42, anchorX: 128, anchorY: 178, w: 256, h: 192 },

  tanks: {
    boulder: {
      name: '볼더', era: 'classic', hp: 850, dmgTaken: 1.05, movePx: 182, speedClass: 1, angleMin: 15, angleMax: 80, powerMul: 1,
      traits: { heavyShot: true },
      sprite: { pivot: [132, 92], baseAngle: 46, dir: 1, muzzleLen: 62, behind: true, catapult: true },
      weapons: [
        { id: 'rock', name: '바위탄', dmg: 280, radius: 40, windMul: 0.5, gravityMul: 1, pattern: { kind: 'single' }, look: { shape: 'ball', color: '#B5AA95', size: 1 } },
        { id: 'boulder', name: '거대 바위', dmg: 380, radius: 58, windMul: 0.5, gravityMul: 1, pattern: { kind: 'roll', dmg: 150, radius: 40, dist: 80, ticks: 66 }, extraDelay: 120, look: { shape: 'ball', color: '#9C907A', size: 1.5 } },
      ],
    },
    viper: {
      name: '바이퍼', era: 'classic', hp: 900, dmgTaken: 1.05, movePx: 247, speedClass: 2, angleMin: 30, angleMax: 65, powerMul: 1,
      traits: { ampPoison: true },
      sprite: { pivot: [130, 80], baseAngle: 0, dir: -1, muzzleLen: 108, behind: false },
      weapons: [
        { id: 'poisonArrow', name: '독화살', dmg: 210, radius: 30, windMul: 1, gravityMul: 1, pattern: { kind: 'single' }, onHit: { poison: { dmg: 55, turns: 3 } }, look: { shape: 'arrow', color: '#8EDB3A', size: 1 } },
        { id: 'venomBolt', name: '맹독 볼트', dmg: 240, radius: 34, windMul: 1, gravityMul: 1, pattern: { kind: 'single' }, onHit: { poison: { dmg: 90, turns: 3, healCut: 0.5 } }, extraDelay: 120, look: { shape: 'arrow', color: '#6CC23A', size: 1 } },
      ],
    },
    hammer: {
      name: '해머', era: 'classic', hp: 950, dmgTaken: 1.05, movePx: 182, speedClass: 1, angleMin: 25, angleMax: 70, powerMul: 1,
      traits: {},
      sprite: { pivot: [112, 104], baseAngle: 36, dir: -1, muzzleLen: 100, behind: true },
      weapons: [
        { id: 'ap', name: '철갑 포탄', dmg: 275, radius: 35, windMul: 1, gravityMul: 1, pattern: { kind: 'single' }, onHit: { crit: { within: 10, mul: 1.2 } }, look: { shape: 'ball', color: '#4A5269', size: 1 } },
        { id: 'redflare', name: '홍염탄', dmg: 480, radius: 46, windMul: 1, gravityMul: 1, pattern: { kind: 'single' }, onHit: { crit: { within: 10, mul: 1.2 } }, cooldownTurns: 3, extraDelay: 150, look: { shape: 'ball', color: '#F0442E', size: 1.4, glow: '#FF7A4A' } },
      ],
    },
    rookie: {
      name: '루키', era: 'modern', hp: 1050, dmgTaken: 0.9, movePx: 247, speedClass: 3, angleMin: 5, angleMax: 40, powerMul: 1,
      traits: {},
      sprite: { pivot: [150, 77], baseAngle: 0, dir: -1, muzzleLen: 82, behind: true },
      weapons: [
        { id: 'std', name: '표준탄', dmg: 243, radius: 35, windMul: 1, gravityMul: 1, pattern: { kind: 'single' }, look: { shape: 'ball', color: '#5F7A30', size: 1 } },
        { id: 'twin', name: '2연발', dmg: 190, radius: 32, windMul: 1, gravityMul: 1, pattern: { kind: 'burst', count: 2, gapTicks: 36 }, extraDelay: 100, look: { shape: 'ball', color: '#5F7A30', size: 1 } },
      ],
    },
    trapper: {
      name: '트래퍼', era: 'modern', hp: 1050, dmgTaken: 0.8, movePx: 182, speedClass: 3, angleMin: 10, angleMax: 45, powerMul: 1,
      traits: {},
      sprite: { pivot: [154, 88], baseAngle: 0, dir: -1, muzzleLen: 62, behind: true },
      weapons: [
        { id: 'low', name: '저각 포탄', dmg: 232, radius: 35, windMul: 1, gravityMul: 1, pattern: { kind: 'single' }, look: { shape: 'ball', color: '#7C7140', size: 1 } },
        { id: 'mines', name: '지뢰 사출', dmg: 60, radius: 14, windMul: 1, gravityMul: 1, pattern: { kind: 'mine', offset: 28, mineDmg: 250, mineRadius: 40 }, extraDelay: 100, look: { shape: 'ball', color: '#3A3A3A', size: 1 } },
      ],
    },
    swarm: {
      name: '스웜', era: 'present', hp: 1050, dmgTaken: 0.9, movePx: 247, speedClass: 3, angleMin: 30, angleMax: 70, powerMul: 1.15,
      traits: {},
      sprite: { pivot: [104, 116], baseAngle: 24, dir: -1, muzzleLen: 74, behind: true },
      weapons: [
        { id: 'missile', name: '유도 미사일', dmg: 242, radius: 38, windMul: 0.7, gravityMul: 1, pattern: { kind: 'single' }, look: { shape: 'missile', color: '#FF7A3A', size: 1 } },
        { id: 'mlrs', name: '다연장 6연발', dmg: 90, radius: 26, windMul: 0.7, gravityMul: 1, pattern: { kind: 'spread', angles: [-60, -36, -12, 12, 36, 60], powerJitter: 25, gapTicks: 6 }, extraDelay: 120, look: { shape: 'missile', color: '#FF7A3A', size: 1 } },
      ],
    },
    prism: {
      name: '프리즘', era: 'future', hp: 1040, dmgTaken: 1.05, movePx: 429, speedClass: 5, angleMin: 0, angleMax: 65, powerMul: 1,
      traits: { hover: true },
      sprite: { pivot: [226, 118], baseAngle: 0, dir: -1, muzzleLen: 0, behind: false, fixedMuzzle: [226, 118] },
      weapons: [
        { id: 'beam', name: '광선', dmg: 292, radius: 36, windMul: 0, gravityMul: 0.3, pattern: { kind: 'single' }, look: { shape: 'beam', color: '#7FFFF2', size: 1 } },
        { id: 'prism3', name: '3분광', dmg: 170, radius: 26, windMul: 0, gravityMul: 0.3, pattern: { kind: 'spread', angles: [-50, 0, 50], powerJitter: 0, gapTicks: 0 }, extraDelay: 100, look: { shape: 'beam', color: '#B9A6FF', size: 1 } },
      ],
    },
    rage: {
      name: '레이지', era: 'future', hp: 850, dmgTaken: 1.05, movePx: 325, speedClass: 4, angleMin: 55, angleMax: 88, powerMul: 1,
      traits: { berserk: { hpBelow: 0.5, mul: 1.3 } },
      sprite: { pivot: [119, 92], baseAngle: 90, dir: -1, muzzleLen: 72, behind: true },
      weapons: [
        { id: 'photon', name: '광탄', dmg: 205, radius: 40, windMul: 1, gravityMul: 1, pattern: { kind: 'single' }, look: { shape: 'ball', color: '#FF3D7A', size: 1, glow: '#FF7FA8' } },
        { id: 'orbital', name: '궤도 낙하', dmg: 240, radius: 48, windMul: 1, gravityMul: 1, pattern: { kind: 'orbital', ticks: 72 }, cooldownTurns: 2, extraDelay: 150, look: { shape: 'ball', color: '#FF3D7A', size: 1, glow: '#FF7FA8' } },
      ],
    },
    // random-only tank in company colours. Never pickable; "?" gives it with randomTank.chance.
    kird: {
      name: '케이', era: 'modern', hidden: true, hp: 1050, dmgTaken: 0.95, movePx: 234, speedClass: 3, angleMin: 20, angleMax: 60, powerMul: 1,
      traits: {},
      sprite: { pivot: [150, 77], baseAngle: 0, dir: -1, muzzleLen: 84, behind: true },
      weapons: [
        { id: 'kbounce', name: 'K-바운스탄', dmg: 255, radius: 34, windMul: 1, gravityMul: 1, pattern: { kind: 'bounce', keep: 0.55 }, look: { shape: 'ball', color: '#2E86D6', size: 1, glow: '#8CC8FF' } },
        { id: 'ksplit', name: 'K-분열탄', dmg: 190, radius: 30, windMul: 1, gravityMul: 1, pattern: { kind: 'split', spread: 100 }, extraDelay: 110, look: { shape: 'ball', color: '#8CC63F', size: 1.1, glow: '#D8F59A' } },
      ],
    },
  },
  randomTank: { id: 'kird', chance: 1 / 9 },

  // happenings (like the original): one is drawn per match before it starts
  happenings: {
    // drawn once before the match (like the original): meteors or earthquakes for the whole match, or calm
    chance: 0.5,
    list: ['meteor', 'quake'],
    meteor: { every: 3, from: 3, r: 40, dmg: 180, fallTicks: 90 },
    quake: { every: 4, from: 4, shift: 55 },
    // weather that comes and goes during the match: one at a time, a few turns each
    weather: { list: ['tornado', 'pillar'], from: 3, chance: 0.2, minTurns: 3, maxTurns: 4 },
    tornado: { w: 70, drift: 14 },
    pillar: { w: 46, drift: 14, mul: 1.5 },
  },
  items: {
    double: { name: '더블샷', label: '×2', effect: 'doubleShot', dropWeight: 1, color: '#FFD24A', bg: '#3A2A12', gapTicks: 60 },
    heal: { name: '회복', label: '+HP', effect: 'heal', amount: 250, dropWeight: 1, color: '#6EF0C8', bg: '#12302A' },
    tele: { name: '텔레포트', label: '순간', effect: 'teleport', dropWeight: 1, color: '#9CC6F7', bg: '#1E2A44' },
    shield: { name: '실드', label: '실드', effect: 'shield', mul: 0.5, dropWeight: 1, color: '#C8B4FF', bg: '#241E44' },
    amplify: { name: '증폭', label: '증폭', effect: 'amplify', mul: 1.5, dropWeight: 1, color: '#FF9A86', bg: '#3A1A16' },
    fuel: { name: '연료', label: '연료', effect: 'fuel', dropWeight: 1, color: '#FFE08A', bg: '#3A3212' },
    calm: { name: '무풍탄', label: '무풍', effect: 'calm', dropWeight: 1, color: '#B8F0FF', bg: '#123038' },
  },

  // Map shapes are generated in pure JS (mapgen.js) so every device builds the same mask.
  maps: {
    temple: { name: '사막 신전', tag: '계단식 · 고지대 쟁탈', desc: '양끝이 높고 가운데가 파인 계단 지형. 높은 자리를 먼저 잡는 쪽이 유리합니다.', W: 5000, H: 1500, theme: 'desert' },
    valley: { name: '협곡 도시', tag: '얇은 지형 · 번지전', desc: '아주 얇은 골짜기 지형과 그 아래 한 겹 더. 발밑을 뚫어 떨어뜨리는 싸움이 핵심입니다.', W: 4800, H: 1500, theme: 'valley' },
    clouds: { name: '구름 대륙', tag: '넓은 맵 · 장거리전', desc: '두껍고 넓은 구름 대륙 세 개와 작은 구름섬. 멀리 떨어진 상대와 장거리 포격전을 벌입니다.', W: 6000, H: 1600, theme: 'clouds' },
    bridge: { name: '외나무 다리', tag: '좁은 다리 · 정면 승부', desc: '양쪽 바위 기둥을 잇는 얇은 다리 하나. 숨을 곳 없이 화력으로 맞붙습니다.', W: 4400, H: 1500, theme: 'bridge' },
    snow: { name: '설원 요새', tag: '성벽 · 엄폐전', desc: '눈 덮인 언덕 양쪽에 돌 성벽이 서 있습니다. 성벽 뒤에 숨거나 넘겨 쏘는 싸움.', W: 5200, H: 1500, theme: 'snow' },
    lava: { name: '화산 지대', tag: '용암 구덩이 · 고지대', desc: '가운데 화산과 용암 구덩이 두 개. 구덩이 위 떠 있는 바위를 차지하면 유리합니다.', W: 5000, H: 1500, theme: 'lava' },
    moon: { name: '달 기지', tag: '저중력 · 장거리', desc: '중력이 약해 포탄이 멀리, 오래 날아갑니다. 분화구와 평평한 고원.', W: 5600, H: 1600, theme: 'moon', gravity: 0.62 },
    islands: { name: '푸른 군도', tag: '섬 · 낙사 주의', desc: '바다 위 다섯 개의 섬. 섬 사이 바다에 빠지면 탈락입니다.', W: 5400, H: 1500, theme: 'sea' },
  },
};
