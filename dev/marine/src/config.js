// ============================================================== CONFIG
// Every gameplay number lives here. The simulation reads only this object.
// Units: px, ticks (1 tick = 1/120 s). Damage shapes: rx/ry = damage reach (half width / half height) around the burst.
const GAME_NAME = { full: '배틀서브', a: '배틀', b: '서브' }; // working title: change here only
const CONFIG = {
  version: '0.1.0',
  physics: {
    tickRate: 120,
    torpSpeed: 720,        // px/s along the drawn curve
    currentPush: 16,       // px/s sideways drift per current unit
    moveStep: 0.5,         // px per movement tick (60 px/s)
    hullRx: 34, hullRy: 15, // submarine hull ellipse (collision with rock and torpedoes)
    bodyPad: 22,           // a burst reaches this much further for a sub's body
    edgeDmg: 0.3,          // damage at the very edge of a burst (centre = 100%)
    carveMul: 0.5,         // rock dug out = burst size x this
    grazeMul: 0.2,         // a torpedo passing through a sub deals this share once
    ownerSafeTicks: 40,    // own torpedo cannot graze its owner this long after launch
    settleTicks: 100,      // quiet ticks after the last action before the next turn
    muzzle: 30,            // launch point in front of the bow
    edgeMargin: 40,        // a sub cannot drive itself closer than this to the map edge (pushes can)
  },
  aim: {
    gaugeTicks: 240,       // the gauge light runs the whole curve in 2 s
    minDet: 40,            // shortest burst distance along the curve
    segSamples: 16,        // samples per curve segment (path polyline resolution)
    minPointGap: 24,       // control points closer than this are merged
  },
  turn: {
    timeLimitTicks: 7200,  // 60 s
    baseDelay: { 1: 900, 2: 820, 3: 740, 4: 660, 5: 580 },
    delayPerMovePx: 0.6,
    itemDelay: 80,
    skipDelay: 150,
    delayPerSec: 4,
    crateEveryTurns: 3,
    currentMax: 5,
    maxPlayers: 8,
    teamMax: 4,
    inventoryMax: 4,
    startSpan: 2600, startGap: 380, startMin: 700, // everyone starts inside a window this wide; two subs never closer than startMin
    suddenBase: 10, suddenPerPlayer: 4, suddenDmg: 0.04, suddenCurrentMul: 1.5,
  },
  ram: { base: 30, perHull: 10, wall: 60, shockMove: 0.7 },
  shock: { dmg: 45, turns: 3 },

  // speedClass 1 = heaviest (longest wait between turns) .. 5 = quickest
  subs: {
    uboat: {
      name: '유보트-96', model: '유보트 VII-C형', hp: 960, hull: 3, movePx: 260, range: 3000, turn: 100, speedClass: 3,
      weapons: [
        { id: 'std', name: '표준 어뢰', kind: 'circle', dmg: 210, rx: 90, ry: 90 },
        { id: 'wolf', name: '늑대떼 쌍어뢰', kind: 'twin', dmg: 145, rx: 70, ry: 70, gap: 30, cooldownTurns: 2, extraDelay: 100 },
      ],
    },
    sejong: {
      name: '세종대왕함', model: '도산안창호급 몸체', hp: 1100, hull: 4, movePx: 240, range: 2900, turn: 90, speedClass: 2,
      weapons: [
        { id: 'cheonji', name: '천지 어뢰', kind: 'cross', dmg: 200, rx: 140, ry: 140, thin: 38 },
        { id: 'singijeon', name: '신기전', kind: 'rain', dmg: 75, rx: 45, ry: 45, arrows: 5, gap: 45, height: 360, cooldownTurns: 3, extraDelay: 120 },
      ],
    },
    ohio: {
      name: '오하이오', model: '오하이오급 전략원잠', hp: 1190, hull: 5, movePx: 170, range: 2500, turn: 60, speedClass: 1,
      weapons: [
        { id: 'heavy', name: '중어뢰', kind: 'circle', dmg: 220, rx: 95, ry: 95 },
        { id: 'vls', name: '수직 미사일', kind: 'depth', dmg: 275, rx: 100, ry: 100, waitTicks: 48, fallSpeed: 420, cooldownTurns: 3, extraDelay: 150 },
      ],
    },
    nautilus: {
      name: '노틸러스', model: '해저 2만 리 + 원자력 1호', hp: 1120, hull: 4, movePx: 250, range: 2700, turn: 90, speedClass: 2,
      weapons: [
        { id: 'drill', name: '충각 관통탄', kind: 'pierce', dmg: 205, rx: 80, ry: 80, drill: 120 },
        { id: 'maelstrom', name: '마엘스트롬', kind: 'vortex', dmg: 175, rx: 90, ry: 90, pull: 100, pullR: 220, waitTicks: 72, cooldownTurns: 3, extraDelay: 120 },
      ],
    },
    kilo: {
      name: '킬로', model: '킬로급 디젤-전기', hp: 1050, hull: 2, movePx: 260, range: 2600, turn: 150, speedClass: 3,
      weapons: [
        { id: 'volt', name: '전류탄', kind: 'electric', dmg: 165, rx: 85, ry: 85 },
        { id: 'chain', name: '연쇄 번개', kind: 'chain', dmg: 125, rx: 60, ry: 60, jumps: 2, jumpR: 400, cooldownTurns: 2, extraDelay: 100 },
      ],
    },
    alvin: {
      name: '앨빈', model: '심해 탐사정', hp: 1050, hull: 4, movePx: 200, range: 2600, turn: 70, speedClass: 2,
      weapons: [
        { id: 'claw', name: '집게 어뢰', kind: 'circle', dmg: 225, rx: 90, ry: 90 },
        { id: 'drone', name: '해저 드론', kind: 'crawl', dmg: 210, rx: 85, ry: 85, crawl: 300, cooldownTurns: 2, extraDelay: 100 },
      ],
    },
    blue: {
      name: '블루핀', model: '청상어형', fish: true, hp: 930, hull: 2, movePx: 300, range: 3000, turn: 120, speedClass: 4,
      weapons: [
        { id: 'hunt', name: '추적 어뢰', kind: 'homing', dmg: 205, rx: 80, ry: 80, seek: 260, turnMax: 40 },
        { id: 'frenzy', name: '피 냄새 파편탄', kind: 'octo8', dmg: 70, rx: 45, ry: 45, reach: 120, cooldownTurns: 3, extraDelay: 120 },
      ],
    },
    orca: {
      name: '오르카', model: '범고래형', fish: true, hp: 1210, hull: 5, movePx: 320, range: 2600, turn: 90, speedClass: 2, ramMul: 1.5,
      weapons: [
        { id: 'direct', name: '직격 어뢰', kind: 'direct', dmg: 220, rx: 80, ry: 80 },
        { id: 'tail', name: '꼬리치기 어뢰', kind: 'hell', dmg: 190, rx: 150, ry: 40, cooldownTurns: 2, extraDelay: 100 },
      ],
    },
    sona: {
      name: '소나', model: '향유고래형', fish: true, hp: 1210, hull: 4, movePx: 190, range: 2600, turn: 70, speedClass: 2,
      weapons: [
        { id: 'sonar', name: '음파탄', kind: 'vell', dmg: 195, rx: 45, ry: 160 },
        { id: 'blow', name: '숨구멍 대폭발', kind: 'inflate', dmg: 260, rx: 140, ry: 140, waitTicks: 60, cooldownTurns: 3, extraDelay: 150 },
      ],
    },
    // random-only sub in company colours. Never pickable; "?" gives it with randomSub.chance.
    kird: {
      name: '케이', model: '회사 색 히든', hidden: true, hp: 1020, hull: 3, movePx: 250, range: 2800, turn: 110, speedClass: 3,
      weapons: [
        { id: 'kbounce', name: 'K-바운스탄', kind: 'bounce', dmg: 205, rx: 85, ry: 85 },
        { id: 'ksplit', name: 'K-분열탄', kind: 'split', dmg: 145, rx: 70, ry: 70, reach: 90, spread: 450, cooldownTurns: 2, extraDelay: 100 },
      ],
    },
  },
  randomSub: { id: 'kird', chance: 1 / 10 },

  items: {
    heal: { name: '회복', label: '+HP', effect: 'heal', amount: 250, dropWeight: 1, color: '#6EF0C8', bg: '#12302A' },
    shield: { name: '실드', label: '실드', effect: 'shield', mul: 0.5, dropWeight: 1, color: '#C8B4FF', bg: '#241E44' },
    amplify: { name: '증폭', label: '증폭', effect: 'amplify', mul: 1.5, dropWeight: 1, color: '#FF9A86', bg: '#3A1A16' },
    fuel: { name: '연료', label: '연료', effect: 'fuel', dropWeight: 1, color: '#FFE08A', bg: '#3A3212' },
    calm: { name: '정류탄', label: '정류', effect: 'calm', dropWeight: 1, color: '#B8F0FF', bg: '#123038' },
  },

  // Map shapes are generated in pure JS (mapgen.js) so every device builds the same mask. W*H must be a multiple of 4.
  maps: {
    reef: { name: '산호 협곡', tag: '기둥 · 버섯 바위', desc: '해저에서 솟은 기둥 위에 버섯 모양 바위가 얹혀 있습니다. 바위 밑은 좋은 은신처.', W: 4000, H: 1600, theme: 'reef' },
    cave: { name: '해저 동굴', tag: '굴 · 주머니', desc: '가운데 거대한 바위 덩어리를 굴이 꿰뚫습니다. 굴 속에 숨으면 곡선과 튕김으로 노려야 합니다.', W: 4000, H: 1700, theme: 'cave' },
    wreck: { name: '침몰선', tag: '선실 · 구멍', desc: '가라앉은 거대한 배. 선실 안에 숨고, 뚫린 구멍으로 쏘고 들어갑니다.', W: 4200, H: 1600, theme: 'wreck' },
    ice: { name: '빙하 아래', tag: '고드름 · 좁은 바다', desc: '머리 위는 깨지지 않는 빙하, 고드름이 매달린 좁은 바다. 위로 밀려 나갈 수 없습니다.', W: 4000, H: 1500, theme: 'ice' },
    vents: { name: '열수구', tag: '굴뚝 · 아치', desc: '뜨거운 굴뚝과 돌 아치가 늘어선 해저 화산 지대.', W: 3800, H: 1700, theme: 'vents' },
  },
};
