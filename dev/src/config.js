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
    edgeDmg: 0.3,
    crater: [1.3, 0.78],   // default crater: wider than deep (a weapon's own crater: [widen, deepen])          // damage at the very edge of the blast (centre = 100%)
  },
  turn: {
    timeLimitTicks: 7200,  // 60 s
    baseDelay: { 1: 900, 2: 820, 3: 740, 4: 660, 5: 580 },
    delayPerMovePx: 0.6,
    itemDelay: 80,
    skipDelay: 150,
    // 턴 넘기기 (원작식): no shot, delay = base x delayMul + movement + item + time. Turn order is delay only, so a cheap pass
    // brings the turn back sooner; two turns in a row happen on their own when the others' turns cost more
    pass: { delayMul: 0.25 },
    delayPerSec: 4,        // every second spent on a turn adds this much delay (60 s = +240)
    crateEveryTurns: 2,
    crateNear: [300, 600],  // a crate lands this far (sideways) from one tank picked at random, at most crateNearDy above/below it
    crateNearDy: 300,
    crateMax: 8,            // most crates lying around at once (no new drop past this)
    crateLifeRounds: 4,     // a crate nobody took is gone after every tank had about this many own turns (turns = this x players)
    windMax: 10,
    maxPlayers: 8,
    teamMax: 4,
    inventoryMax: 4,
    mineMax: 6,
    // sudden death: from turn (base + perPlayer x players) every tank loses a share of its max hp each turn and wind gets stronger
    // only some matches have it at all (suddenChance, decided from the seed), and later than before (base 10 -> 16, 4 -> 6 per player)
    suddenChance: 0.25, suddenBase: 16, suddenPerPlayer: 6, suddenDmg: 0.04, suddenWindMul: 1.5,
  },
  sprite: { scale: 0.42, anchorX: 128, anchorY: 178, w: 256, h: 192 },

  tanks: {
    boulder: {
      name: '볼더', era: 'classic', hp: 850, dmgTaken: 1.05, movePx: 146, speedClass: 1, angleMin: 20, angleMax: 88, powerMul: 1,
      traits: { heavyShot: true },
      sprite: { pivot: [132, 92], baseAngle: 46, dir: 1, muzzleLen: 62, behind: true, catapult: true },
      weapons: [
        { id: 'rock', name: '바위탄', dmg: 345, radius: 40, crater: [1.45, 0.7], windMul: 0.5, gravityMul: 1, pattern: { kind: 'single' }, look: { shape: 'rock', color: '#9A8F78', size: 1.3 } },
        { id: 'boulder', name: '불바위', dmg: 484, radius: 48, crater: [1.5, 0.68], windMul: 0.5, gravityMul: 1, pattern: { kind: 'roll', dmg: 95, radius: 32, dist: 80, ticks: 66 }, extraDelay: 120, look: { shape: 'firerock', color: '#4A362A', size: 1.45, glow: '#FF8A30' } },
      ],
    },
    viper: {
      name: '바이퍼', era: 'classic', hp: 900, dmgTaken: 1.05, movePx: 198, speedClass: 2, angleMin: 20, angleMax: 88, powerMul: 1,
      traits: { ampPoison: true },
      sprite: { pivot: [130, 80], baseAngle: 0, dir: -1, muzzleLen: 108, behind: false },
      weapons: [
        { id: 'poisonArrow', name: '독화살', dmg: 216, radius: 30, crater: [0.9, 1.1], windMul: 1, gravityMul: 1, pattern: { kind: 'single' }, onHit: { poison: { dmg: 55, turns: 3 } }, look: { shape: 'arrow', color: '#8EDB3A', size: 1.25 } },
        { id: 'venomBolt', name: '맹독 볼트', dmg: 249, radius: 34, crater: [0.95, 1.05], windMul: 1, gravityMul: 1, pattern: { kind: 'single' }, onHit: { poison: { dmg: 90, turns: 3, healCut: 0.5 } }, extraDelay: 120, look: { shape: 'bolt', color: '#6CC23A', size: 1.3, glow: '#B6F07A' } },
      ],
    },
    hammer: {
      name: '해머', era: 'classic', hp: 950, dmgTaken: 1.05, movePx: 146, speedClass: 1, angleMin: 20, angleMax: 88, powerMul: 1,
      traits: {},
      sprite: { pivot: [112, 104], baseAngle: 36, dir: -1, muzzleLen: 100, behind: true },
      weapons: [
        { id: 'ap', name: '철갑 포탄', dmg: 438, radius: 35, crater: [0.85, 1.25], windMul: 1, gravityMul: 1, pattern: { kind: 'single' }, onHit: { crit: { within: 10, mul: 1.2 } }, look: { shape: 'cannonball', color: '#16181B', size: 1 } },
        { id: 'redflare', name: '홍염탄', dmg: 650, radius: 24, crater: [0.8, 1.3], windMul: 1, gravityMul: 1, pattern: { kind: 'single' }, onHit: { crit: { within: 10, mul: 1.2 } }, cooldownTurns: 3, extraDelay: 150, look: { shape: 'redshell', color: '#F02A1C', size: 1, glow: '#FF5A3A' } },
      ],
    },
    rookie: {
      name: '루키', era: 'modern', hp: 1050, dmgTaken: 0.9, movePx: 198, speedClass: 3, angleMin: 20, angleMax: 88, powerMul: 1,
      traits: {},
      sprite: { pivot: [150, 77], baseAngle: 0, dir: -1, muzzleLen: 82, behind: true },
      weapons: [
        { id: 'std', name: '표준탄', dmg: 264, radius: 35, windMul: 1, gravityMul: 1, pattern: { kind: 'single' }, look: { shape: 'shell', color: '#5F7A30', size: 1.15 } },
        { id: 'twin', name: '2연발', dmg: 206, radius: 32, windMul: 1, gravityMul: 1, pattern: { kind: 'burst', count: 2, gapTicks: 36 }, extraDelay: 100, look: { shape: 'shell', color: '#6E8A3A', size: 1 } },
      ],
    },
    trapper: {
      name: '트래퍼', era: 'modern', hp: 1050, dmgTaken: 0.9, movePx: 146, speedClass: 3, angleMin: 20, angleMax: 88, powerMul: 1,
      traits: {},
      sprite: { pivot: [154, 88], baseAngle: 0, dir: -1, muzzleLen: 62, behind: true },
      weapons: [
        { id: 'low', name: '수류탄', dmg: 228, radius: 35, crater: [1.1, 0.9], windMul: 1, gravityMul: 1, pattern: { kind: 'single' }, look: { shape: 'grenade', color: '#5B6B2E', size: 1.2 } },
        { id: 'mines', name: '지뢰 사출', dmg: 58, radius: 14, windMul: 1, gravityMul: 1, pattern: { kind: 'mine', offset: 28, mineDmg: 250, mineRadius: 40 }, extraDelay: 100, look: { shape: 'minecase', color: '#3A3A3A', size: 1.2 } },
      ],
    },
    swarm: {
      name: '스웜', era: 'present', hp: 1050, dmgTaken: 0.9, movePx: 198, speedClass: 3, angleMin: 20, angleMax: 88, powerMul: 1.15,
      traits: {},
      sprite: { pivot: [104, 116], baseAngle: 24, dir: -1, muzzleLen: 74, behind: true },
      weapons: [
        { id: 'missile', name: '유도 미사일', dmg: 191, radius: 38, crater: [1.35, 0.75], windMul: 0.7, gravityMul: 1, pattern: { kind: 'single' }, look: { shape: 'missile', color: '#E8402E', size: 1.05 } },
        { id: 'mlrs', name: '다연장 6연발', dmg: 72, radius: 26, crater: [1.4, 0.7], windMul: 0.7, gravityMul: 1, pattern: { kind: 'spread', angles: [-60, -36, -12, 12, 36, 60], powerJitter: 25, gapTicks: 6 }, extraDelay: 160, look: { shape: 'rocket', color: '#FF7A3A', size: 1.15 } },
      ],
    },
    prism: {
      name: '프리즘', era: 'future', hp: 1040, dmgTaken: 1.05, movePx: 343, speedClass: 5, angleMin: 20, angleMax: 88, powerMul: 1,
      traits: { hover: true },
      sprite: { pivot: [226, 118], baseAngle: 0, dir: -1, muzzleLen: 0, behind: false, fixedMuzzle: [226, 118] },
      weapons: [
        { id: 'beam', name: '광선', dmg: 302, radius: 36, crater: [1.6, 0.55], windMul: 0, gravityMul: 0.55, pattern: { kind: 'single' }, extraDelay: 60, look: { shape: 'laser', color: '#7FFFF2', size: 1, glow: '#7FFFF2' } },
        { id: 'prism3', name: '3분광', dmg: 177, radius: 26, crater: [1.5, 0.6], windMul: 0, gravityMul: 0.55, pattern: { kind: 'spread', angles: [-50, 0, 50], powerJitter: 0, gapTicks: 0 }, extraDelay: 100, look: { shape: 'laser', color: '#B9A6FF', size: 0.8, glow: '#B9A6FF' } },
      ],
    },
    rage: {
      name: '레이지', era: 'future', hp: 850, dmgTaken: 1.05, movePx: 260, speedClass: 4, angleMin: 20, angleMax: 88, powerMul: 1,
      traits: { berserk: { hpBelow: 0.5, mul: 1.3 } },
      sprite: { pivot: [119, 92], baseAngle: 90, dir: -1, muzzleLen: 72, behind: true },
      weapons: [
        { id: 'photon', name: '광탄', dmg: 209, radius: 40, windMul: 1, gravityMul: 1, pattern: { kind: 'single' }, look: { shape: 'plasma', color: '#FF3D7A', size: 1, glow: '#FF7FA8' } },
        { id: 'orbital', name: '궤도 낙하', dmg: 244, radius: 48, crater: [0.8, 1.35], windMul: 1, gravityMul: 1, pattern: { kind: 'orbital', ticks: 72 }, cooldownTurns: 2, extraDelay: 150, look: { shape: 'beacon', color: '#FF3D7A', size: 1, glow: '#FF7FA8' } },
      ],
    },
    // random-only tank in company colours. Never pickable; "?" gives it with randomTank.chance.
    kird: {
      name: '케이', era: 'modern', hidden: true, hp: 1050, dmgTaken: 0.95, movePx: 187, speedClass: 3, angleMin: 20, angleMax: 88, powerMul: 1,
      traits: {},
      sprite: { pivot: [150, 77], baseAngle: 0, dir: -1, muzzleLen: 84, behind: true },
      weapons: [
        { id: 'kbounce', name: 'K-바운스탄', dmg: 230, radius: 34, crater: [1.2, 0.85], windMul: 1, gravityMul: 1, pattern: { kind: 'bounce', keep: 0.55 }, look: { shape: 'kball', color: '#2E86D6', size: 1, glow: '#8CC8FF' } },
        { id: 'ksplit', name: 'K-분열탄', dmg: 174, radius: 30, windMul: 1, gravityMul: 1, pattern: { kind: 'split', spread: 100 }, extraDelay: 110, look: { shape: 'ksplit', color: '#8CC63F', size: 1.1, glow: '#D8F59A' } },
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
    double: { name: '더블샷', label: '×2', effect: 'doubleShot', dropWeight: 1, color: '#FFD24A', bg: '#3A2A12', gapTicks: 60 , desc: '두 번 발사' },
    heal: { name: '회복', label: '+HP', effect: 'heal', amount: 250, dropWeight: 1, color: '#6EF0C8', bg: '#12302A' , desc: '체력 250 회복' },
    tele: { name: '텔레포트', label: '순간', effect: 'teleport', dropWeight: 1, color: '#9CC6F7', bg: '#1E2A44' , desc: '떨어진 곳으로 순간이동' },
    shield: { name: '실드', label: '실드', effect: 'shield', mul: 0.5, dropWeight: 1, color: '#C8B4FF', bg: '#241E44' , desc: '다음 내 턴까지 받는 피해 절반' },
    amplify: { name: '증폭', label: '증폭', effect: 'amplify', mul: 1.5, dropWeight: 1, color: '#FF9A86', bg: '#3A1A16' , desc: '이번 발사 피해 1.5배' },
    fuel: { name: '연료', label: '연료', effect: 'fuel', dropWeight: 1, color: '#FFE08A', bg: '#3A3212' , desc: '이번 턴 한 번 더 이동' },
    calm: { name: '무풍탄', label: '무풍', effect: 'calm', dropWeight: 1, color: '#B8F0FF', bg: '#123038' , desc: '이번 발사 바람 무시' },
  },

  // Map shapes are generated in pure JS (mapgen.js) so every device builds the same mask.
  maps: {
    campus: { name: 'KIRD 캠퍼스', tag: '두 건물 · 구름다리', desc: '본관과 5층 생활관이 마주 선 캠퍼스. 두 건물을 잇는 유리 구름다리와 가운데 잔디 마당.', W: 5600, H: 1500, theme: 'kird', special: 'KIRD 기관 전용' },
    songdae: { name: '송대제', tag: '호숫가 · 낙수 주의', desc: '본관 앞 송대제 호수. 왼쪽 언덕엔 본관, 가운데 호수엔 나무 데크와 작은 섬, 오른쪽은 숲 산책로.', W: 5400, H: 1500, theme: 'lake', special: 'KIRD 기관 전용' },
    scale: { name: '진실의 전당', tag: '믿을 수 있는 연구가 되려면', desc: '대리석 단 위 청동 저울. 두 접시는 늘 같은 높이, 저울대 위가 맵의 꼭대기. 양쪽 끝은 KIRD 연구실.', W: 5200, H: 1500, theme: 'kird', special: 'KIRD 연구윤리',
      tips: ['연구진실성의 5가치: 객관성·정직성·개방성·책무성·공정성이에요.', '위조: 존재하지 않는 데이터나 연구 결과를 거짓으로 만들어 내는 것이에요.', '변조: 연구 재료·과정을 조작하거나 데이터를 임의로 바꾸고 빼는 것이에요.', '표절: 남의 아이디어·글·결과를 출처 없이 내 것처럼 쓰는 것이에요.', '부당한 저자 표시: 기여한 사람을 빼거나, 기여하지 않은 사람을 저자로 넣는 것이에요.', '부당한 중복게재: 내 이전 연구 결과를 출처 없이 다시 싣는 것도 부정행위예요.', '국가연구개발혁신법 제31조는 연구비 용도 외 사용도 부정행위로 금지해요.', '거짓이나 부정한 방법으로 과제를 신청·수행하는 것도 부정행위예요.', '부정행위 검증은 예비조사 → 본조사 → 판정 순서로, 6개월 안에 끝내요.', '부정행위를 제보한 사람은 신분상 불이익을 받지 않도록 보호돼요.', '판정에 이의가 있으면 통보를 받은 날부터 30일 안에 신청할 수 있어요.', '부정행위 참여제한은 최대 10년, 2027년 3월부터는 최대 20년으로 늘어나요.', '연구개발기관은 자체 연구윤리규정을 마련해 운영해야 해요.'],
      guide: { title: '진실의 전당', line: '기록하고, 밝히고, 함께 검증하라.' }, items: { shield: '연구노트', heal: '데이터 원본 보관', double: '공동연구', amplify: '동료 검증', calm: '출처 표기', fuel: 'IRB 승인', tele: '학회 발표' }, happen: { meteor: ['표절 적발', '3턴마다 빨간 「표절」 도장이 떨어집니다 (붉은 원 = 낙하 지점)'], quake: ['데이터 변조', '4턴마다 땅이 흔들려 탱크가 밀려납니다'], tornado: ['위조 회오리', '회오리에 들어간 포탄은 엉뚱한 곳으로 튕깁니다'], pillar: ['검증의 빛', '빛기둥을 통과한 포탄은 위력 1.5배'], sudden: '논문 철회 카운트다운! 매 턴 모두 체력 감소 · 바람 강화' }, meteorLook: { kind: 'stamp', word: '표절' } },
    notebook: { name: '증명의 노트', tag: '내 연구를 지켜 주는 가장 강력한 기록', desc: '책상 위에 펼친 거대한 연구노트. 두 쪽은 언덕, 가운데 제본선은 골짜기, 만년필이 다리.', W: 5200, H: 1500, theme: 'kird', special: 'KIRD 연구노트',
      tips: ['연구노트는 「국가연구개발사업 연구노트 지침」(과기정통부 고시)을 따라요.', '기록자와 확인자가 날짜와 함께 서명해요.', '틀린 곳은 수정액 대신 줄을 긋고 서명해요. 원래 내용이 보여야 해요.', '빈 칸에는 사선을 그어 나중에 덧쓰지 못하게 해요.', '연구노트는 30년 동안 보존해요.', '연구노트는 연구자 개인이 아니라 연구개발기관이 소유해요.', '전자연구노트도 인정돼요. 전자서명과 입력 시각 자동 기록이 필요해요.', '원본 데이터가 어디에 저장됐는지도 연구노트에 남겨요.', '연구노트 비용은 간접비(성과활용지원비)로 쓸 수 있어요.', '정부는 기관의 연구노트 관리 실태를 점검할 수 있어요.', '잘 쓴 연구노트는 특허·분쟁 때 내 연구를 증명해 주는 기록이에요.'],
      guide: { title: '증명의 노트', line: '쓰고, 서명하고, 남겨라.' }, items: { shield: '연구노트', heal: '데이터 원본 보관', double: '공동연구', amplify: '동료 검증', calm: '출처 표기', fuel: 'IRB 승인', tele: '학회 발표' }, happen: { meteor: ['표절 적발', '3턴마다 빨간 「표절」 도장이 떨어집니다 (붉은 원 = 낙하 지점)'], quake: ['데이터 변조', '4턴마다 땅이 흔들려 탱크가 밀려납니다'], tornado: ['위조 회오리', '회오리에 들어간 포탄은 엉뚱한 곳으로 튕깁니다'], pillar: ['검증의 빛', '빛기둥을 통과한 포탄은 위력 1.5배'], sudden: '논문 철회 카운트다운! 매 턴 모두 체력 감소 · 바람 강화' }, meteorLook: { kind: 'stamp', word: '위조' } },
    lab: { name: '예방의 실험동', tag: '사고는 실험 전에 막는다', desc: '실험동 두 채와 시약 창고 마당. 창고 위 소화기가 맵의 꼭대기. 3턴마다 연구실 화재로 불붙은 천장재가 떨어집니다.', W: 5200, H: 1500, theme: 'kird', special: 'KIRD 연구실안전', happening: 'meteor',
      tips: ['일상점검은 연구를 시작하기 전에 매일 해요.', '정기점검은 매년 1회 이상 해요.', '유해물질을 다루는 연구실은 2년마다 정밀안전진단을 받아요.', '신규 안전교육: 연구실 근로자 8시간, 학생 2시간 이상이에요.', '정기 안전교육: 반기마다 6시간 이상 (저위험 연구실은 연 3시간)이에요.', '연구를 시작하기 전에 연구실책임자가 사전유해인자위험분석을 해요.', '연구활동종사자를 위한 보험 가입은 법에 정한 의무예요.', '중대연구실사고는 지체 없이 과학기술정보통신부에 보고해요.', '3일 이상 치료가 필요한 사고는 1개월 안에 사고 조사표를 내요.', '연구실 안전 예산은 연구과제 인건비 총액의 1% 이상 잡아야 해요.', '연구실책임자는 보호구를 갖추고 연구원이 착용하게 해야 해요.', '소화기: 안전핀 뽑기 → 노즐 조준 → 손잡이 누르기 → 골고루 분사.'],
      guide: { title: '예방의 실험동', line: '위험은 미리 보고, 보호구는 꼭 챙겨라.' },
      items: { shield: '보호구', heal: '응급키트', double: '2인 1조 실험', amplify: '안전교육 이수', calm: 'MSDS 확인', fuel: '통로 확보', tele: '비상대피로' },
      happen: { meteor: ['연구실 화재 발생', '3턴마다 불붙은 천장재가 떨어집니다 (붉은 원 = 낙하 지점)'], quake: ['시약장 흔들림', '4턴마다 땅이 흔들려 탱크가 밀려납니다'], tornado: ['배기 역류', '역류에 들어간 포탄은 엉뚱한 곳으로 튕깁니다'], pillar: ['인화성 증기', '불기둥을 통과한 포탄은 위력 1.5배'], sudden: '대피 경보! 매 턴 모두 체력 감소 · 바람 강화' }, meteorLook: { kind: 'debris' } },
    archive: { name: '신뢰의 집행실', tag: '국민이 맡긴 연구비, 투명하게', desc: '증빙 상자가 가득한 문서고. 영수증 롤 언덕, 연구비 카드 경사로, 가운데 계산기 고지.', W: 5200, H: 1500, theme: 'kird', special: 'KIRD 연구비관리',
      tips: ['연구비 집행·정산은 통합이지바로 또는 통합RCMS에서 해요.', 'gaia.go.kr은 통합이지바로로 들어가는 통합 홈페이지예요.', '과제 공고·신청·협약은 범부처통합연구지원시스템 IRIS에서 해요.', '직접비는 연구비카드나 계좌이체로 쓰는 게 원칙이에요. 현금은 예외예요.', '증빙자료는 과제가 끝난 뒤 5년 동안 보관해요.', '연구개발비 정산은 과제가 끝난 날부터 3개월 안에 해요.', '회의비로 술·유흥비는 쓸 수 없어요.', '학생인건비를 걷어 공동관리하는 것은 금지예요.', '새 비목 「연구혁신비」: 재료비·출장비·회의비를 비목 구분 없이 써요 (2027년 전면 시행).', '간접비는 인력지원비·연구지원비·성과활용지원비로 나뉘어요.', '용도 외 사용: 참여제한 최대 10년·제재부가금 최대 5배 (2027년 3월부터 20년·30배).', '환수 통보를 받으면 1개월 안에 반납해요.'],
      guide: { title: '신뢰의 집행실', line: '계획대로 쓰고, 증빙으로 버텨라.' },
      items: { shield: '증빙서류', heal: '정산 완료', double: '연구혁신비', amplify: '성과활용지원비', calm: '연구비 카드', fuel: '집행계획', tele: '출장 승인' },
      happen: { meteor: ['감사 지적', '3턴마다 빨간 「환수」 도장이 떨어집니다 (붉은 원 = 낙하 지점)'], quake: ['예산 삭감', '4턴마다 땅이 흔들려 탱크가 밀려납니다'], tornado: ['용도 외 사용', '회오리에 들어간 포탄은 엉뚱한 곳으로 튕깁니다'], pillar: ['집중 투자', '금빛 기둥을 통과한 포탄은 위력 1.5배'], sudden: '정산 마감! 매 턴 모두 체력 감소 · 바람 강화' }, meteorLook: { kind: 'stamp', word: '환수' } },
    temple: { name: '사막 신전', tag: '계단식 · 고지대 쟁탈', desc: '양끝이 높고 가운데가 파인 계단 지형. 높은 자리를 먼저 잡는 쪽이 유리합니다.', W: 5000, H: 1500, theme: 'desert' },
    valley: { name: '협곡 도시', tag: '얇은 지형 · 번지전', desc: '아주 얇은 골짜기 지형과 그 아래 한 겹 더. 발밑을 뚫어 떨어뜨리는 싸움이 핵심입니다.', W: 4800, H: 1500, theme: 'valley' },
    snow: { name: '설원 요새', tag: '성벽 · 엄폐전', desc: '눈 덮인 언덕 양쪽에 돌 성벽이 서 있습니다. 성벽 뒤에 숨거나 넘겨 쏘는 싸움.', W: 5200, H: 1500, theme: 'snow' },
    lava: { name: '화산 지대', tag: '용암 구덩이 · 고지대', desc: '가운데 화산과 용암 구덩이 두 개. 구덩이 위 떠 있는 바위를 차지하면 유리합니다.', W: 5000, H: 1500, theme: 'lava' },
    moon: { name: '달 기지', tag: '저중력 · 장거리', desc: '중력이 약해 포탄이 멀리, 오래 날아갑니다. 분화구와 평평한 고원.', W: 5600, H: 1600, theme: 'moon', gravity: 0.62 },
  },
};
