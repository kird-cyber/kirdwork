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
    maxUnits: 8000,        // most action units one turn input may carry (a real turn has at most one per tick: 7200)
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
      name: '유보트-96', model: '유보트 VII-C형', hp: 970, hull: 3, movePx: 260, range: 3000, turn: 100, speedClass: 3,
      weapons: [
        { id: 'std', name: '표준 어뢰', kind: 'circle', dmg: 210, rx: 90, ry: 90 },
        { id: 'wolf', name: '늑대떼 쌍어뢰', kind: 'twin', dmg: 145, rx: 70, ry: 70, gap: 30, cooldownTurns: 2, extraDelay: 100 },
      ],
    },
    sejong: {
      name: '세종대왕함', model: '도산안창호급 몸체', hp: 1110, hull: 4, movePx: 240, range: 2900, turn: 90, speedClass: 2,
      weapons: [
        { id: 'cheonji', name: '천지 어뢰', kind: 'cross', dmg: 200, rx: 140, ry: 140, thin: 38 },
        { id: 'singijeon', name: '신기전', kind: 'rain', dmg: 75, rx: 45, ry: 45, arrows: 5, gap: 45, height: 360, cooldownTurns: 3, extraDelay: 120 },
      ],
    },
    ohio: {
      name: '오하이오', model: '오하이오급 전략원잠', hp: 1210, hull: 5, movePx: 170, range: 2500, turn: 60, speedClass: 1,
      weapons: [
        { id: 'heavy', name: '중어뢰', kind: 'circle', dmg: 225, rx: 95, ry: 95 },
        { id: 'vls', name: '수직 미사일', kind: 'depth', dmg: 280, rx: 100, ry: 100, waitTicks: 48, fallSpeed: 420, cooldownTurns: 3, extraDelay: 150 },
      ],
    },
    nautilus: {
      name: '노틸러스', model: '해저 2만 리 + 원자력 1호', hp: 1110, hull: 4, movePx: 250, range: 2700, turn: 90, speedClass: 2,
      weapons: [
        { id: 'drill', name: '충각 관통탄', kind: 'pierce', dmg: 205, rx: 80, ry: 80, drill: 120 },
        { id: 'maelstrom', name: '마엘스트롬', kind: 'vortex', dmg: 175, rx: 90, ry: 90, pull: 100, pullR: 220, waitTicks: 72, cooldownTurns: 3, extraDelay: 120 },
      ],
    },
    kilo: {
      name: '킬로', model: '킬로급 디젤-전기', hp: 1040, hull: 2, movePx: 260, range: 2600, turn: 150, speedClass: 3,
      weapons: [
        { id: 'volt', name: '전류탄', kind: 'electric', dmg: 165, rx: 85, ry: 85 },
        { id: 'chain', name: '연쇄 번개', kind: 'chain', dmg: 125, rx: 60, ry: 60, jumps: 2, jumpR: 400, cooldownTurns: 2, extraDelay: 100 },
      ],
    },
    alvin: {
      name: '앨빈', model: '심해 탐사정', hp: 1060, hull: 4, movePx: 200, range: 2600, turn: 70, speedClass: 2,
      weapons: [
        { id: 'claw', name: '집게 어뢰', kind: 'circle', dmg: 225, rx: 90, ry: 90 },
        { id: 'drone', name: '해저 드론', kind: 'crawl', dmg: 210, rx: 85, ry: 85, crawl: 300, cooldownTurns: 2, extraDelay: 100 },
      ],
    },
    blue: {
      name: '블루핀', model: '청상어형', fish: true, hp: 920, hull: 2, movePx: 300, range: 3000, turn: 120, speedClass: 4,
      weapons: [
        { id: 'hunt', name: '추적 어뢰', kind: 'homing', dmg: 200, rx: 80, ry: 80, seek: 260, turnMax: 40 },
        { id: 'frenzy', name: '피 냄새 파편탄', kind: 'octo8', dmg: 70, rx: 45, ry: 45, reach: 120, cooldownTurns: 3, extraDelay: 120 },
      ],
    },
    orca: {
      name: '오르카', model: '범고래형', fish: true, hp: 1220, hull: 5, movePx: 320, range: 2600, turn: 90, speedClass: 2, ramMul: 1.5,
      weapons: [
        { id: 'direct', name: '직격 어뢰', kind: 'direct', dmg: 220, rx: 80, ry: 80 },
        { id: 'tail', name: '꼬리치기 어뢰', kind: 'hell', dmg: 190, rx: 150, ry: 40, cooldownTurns: 2, extraDelay: 100 },
      ],
    },
    sona: {
      name: '소나', model: '향유고래형', fish: true, hp: 1200, hull: 4, movePx: 190, range: 2600, turn: 70, speedClass: 2,
      weapons: [
        { id: 'sonar', name: '음파탄', kind: 'vell', dmg: 195, rx: 45, ry: 160 },
        { id: 'blow', name: '숨구멍 대폭발', kind: 'inflate', dmg: 260, rx: 140, ry: 140, waitTicks: 60, cooldownTurns: 3, extraDelay: 150 },
      ],
    },
    // random-only sub in company colours. Never pickable; "?" gives it with randomSub.chance.
    kird: {
      name: '케이', model: '회사 색 히든', hidden: true, hp: 1020, hull: 3, movePx: 250, range: 2800, turn: 110, speedClass: 3,
      weapons: [
        { id: 'kmagnet', name: 'K-자석탄', kind: 'magnet', dmg: 185, rx: 85, ry: 85, snap: 50 }, // the burst jumps onto an enemy within snap px
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
  // map list (order = the original's). rules: special rule per map, all deterministic (see sim.js mapRules)
  maps: {
    god12: { name: '12신', en: '12 GOD', tag: '사이버 신전 · 기둥 12개', desc: '네온 회로가 흐르는 사이버 신전. 천장과 바닥에서 엇갈려 뻗은 기둥 12개는 겉이 깎여도 금속 속심이 남습니다.', rule: '사이버 공간: 어뢰가 좌우 끝을 넘으면 반대편에서 다시 나옵니다', W: 4000, H: 1700, theme: 'god12',
      rules: { wrapX: true } },
    atlantic: { name: '아틀란틱', en: 'Atlantic', tag: '대양 · 탁 트인 전장', desc: '넓고 깊은 대서양. 십자 암초 4개뿐이라 눈대중 거리와 해류 읽기가 실력의 전부입니다.', rule: '대양 해류: 해류가 1.6배 강합니다', W: 4800, H: 1500, theme: 'atlantic',
      rules: { currentMul: 1.6 } },
    battlefield: { name: '배틀 필드', en: 'Battle Field', tag: '벙커 · 참호 · 기뢰', desc: '양 끝의 가라앉은 벙커와 참호. 가운데엔 바닥에서 솟은 기둥과 수면에 매달린 기둥이 번갈아 서 있어, 그 사이로 쏘고 지나갑니다.', rule: '기뢰밭: 떠 있는 기뢰가 폭발이나 어뢰에 닿으면 터집니다(연쇄 폭발)', W: 4200, H: 1600, theme: 'battlefield',
      rules: { mines: [[1650, 620], [1950, 840], [2250, 840], [2550, 620], [2250, 1100], [1350, 900], [2850, 900], [2100, 300]], mine: { r: 22, rx: 120, dmg: 120 } } },
    bermuda: { name: '버뮤다', en: 'Bermuda', tag: '삼각지대 · 물결 암초', desc: '한가운데 거대한 삼각형 암벽과 길 잃은 배. 바깥은 지그재그 물결 암초가 휘감습니다.', rule: '버뮤다 삼각지대: 삼각형 안에서는 해류가 2배', W: 4200, H: 1700, theme: 'bermuda',
      rules: { tri: [[2100, 260], [1350, 1250], [2850, 1250]], triMul: 2 } },
    cave: { name: '케이브', en: 'Cave', tag: '동굴 · 종유석 · 떠 있는 바위', desc: '위아래가 출렁이는 두꺼운 동굴. 종유석과 떠 있는 바위 사이 틈으로 곡선을 꿰어야 합니다.', rule: '낙석: 천장 가까이에서 터지면 종유석이 떨어집니다(피해 90)', W: 4000, H: 1700, theme: 'cave',
      rules: { rockfall: { ceilY: 620, chance: 0.6, dmg: 90, r: 55, reach: 520 } } },
    cube: { name: '큐브', en: 'Cube', tag: '격자 블록 · 금속 심', desc: '크기가 다른 정육면체 블록이 격자로 떠 있고, 일부는 금속 심이 박혀 끝까지 남습니다.', rule: '큐브 세계: 모든 폭발이 네모 모양으로 터집니다', W: 3800, H: 1800, theme: 'cube',
      rules: { box: true } },
    duke: { name: '듀크', en: 'Duke', tag: '가라앉은 공작의 성', desc: '높은 탑 둘과 낮은 본성, 그 위에 떠 있는 무너진 성벽 조각. 탑과 본성의 창, 성문 아치로 위·가운데·아래 길이 엇갈려 뚫려 있습니다.', rule: '성의 가호: 성 안뜰에 있으면 받는 피해가 20% 줄어듭니다', W: 4400, H: 1700, theme: 'duke',
      rules: { guard: { x0: 1150, x1: 3250, y0: 1060, y1: 1700, mul: 0.8 } } },
    iceberg: { name: '아이스버그', en: 'Iceberg', tag: '빙산 · 유빙', desc: '수면에 거꾸로 매달린 빙산 셋과 유빙 조각. 빙산마다 숨을 수 있는 얼음 동굴이 있습니다.', rule: '깨지는 얼음: 폭발에 파이는 크기가 1.4배', W: 4200, H: 1700, theme: 'iceberg',
      rules: { carveMul: 1.4 } },
    jurassic: { name: '쥬라기', en: 'Jurassic', tag: '공룡 화석 · 암모나이트', desc: '바닥에 누운 거대한 공룡 화석. 갈비뼈 아치 아래가 은신처, 물속엔 돌 조각이 가득합니다.', rule: '화석 발굴: 바위를 파면 가끔 보급 상자가 나옵니다', W: 4200, H: 1600, theme: 'jurassic',
      rules: { fossil: 0.18 } },
    nautilus: { name: '노틸러스', en: 'Nautilus', tag: '거대 앵무조개 껍데기', desc: '한가운데 앵무조개 껍데기의 나선 복도. 곡선을 빙글 돌려 안쪽 깊숙이 숨은 적을 노립니다.', rule: '나선 해류: 껍데기 주변 물살이 어뢰를 시계 방향으로 휘감습니다', W: 4000, H: 1700, theme: 'nautilus',
      rules: { swirl: { x: 2000, y: 800, r: 950, v: 40 } } },
    seacity: { name: '씨 시티', en: 'Sea City', tag: '해저 도시 · 2층 통로 · 리프트', desc: '금속 천장 아래 해저 도시. 짧은 리프트 기둥, 엇갈려 놓인 2층 금속 통로, 바닥의 돔과 첨탑 사이로 길이 나 있습니다.', rule: '도시 보급망: 보급 상자가 2턴마다 떨어집니다', W: 4200, H: 1800, theme: 'seacity',
      rules: { crateEvery: 2 } },
    spa: { name: '스파', en: 'Spa', tag: '해저 온천 · 대나무 · 돌 욕조', desc: '엇갈린 대나무 장대와 김이 오르는 돌 욕조 셋. 욕조 안은 아늑한 은신처입니다.', rule: '온천: 욕조 안에서 턴을 시작하면 체력 +60, 욕조 위 기포가 어뢰를 밀어 올립니다', W: 3800, H: 1500, theme: 'spa',
      rules: { lift: [[480, 920, 400, 1240, 60], [1680, 2320, 400, 1240, 60], [2980, 3420, 400, 1240, 60]], heal: [[460, 940, 1040, 1290, 60], [1660, 2340, 1040, 1290, 60], [2960, 3440, 1040, 1290, 60]] } },
  },
};
