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
    crateRate: [3, 4],      // 3 crates every 4 turns (was 1 every 2: x1.5)
    crateNear: [60],        // a crate lands 60 px ~ (movePx x crateNearMove) sideways from one tank: reachable this turn
    crateNearMove: 0.9,
    crateNearDy: 120,       // at most this far above/below that tank
    crateShotPad: 18,       // a blast this much wider than its crater still takes a crate (shooter gets the item)
    // start positions: with this many players or fewer the outer spawnTrim of the width is left out; nearest enemy kept spawnEnemy px away
    spawnTrimMaxPlayers: 4, spawnTrim: 0.2, spawnEnemy: [600, 1600],
    crateMax: 8,            // most crates lying around at once (no new drop past this)
    crateLifeRounds: 4,     // a crate nobody took is gone after every tank had about this many own turns (turns = this x players)
    windMax: 10,
    windDrift: { step: 3, gust: 0.1 }, // 바람: 지난 턴에서 ±3까지만 변함, 10% 확률로 돌풍(새 바람)
    maxPlayers: 8,
    maxWatchers: 20,       // 관전자 (게임에 참여하지 않고 보기·채팅)
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
    // random-only tanks in company colours (logo blue #2E86D6 · lime #8CC63F). Never pickable; "?" gives one of them with randomTank.chance.
    kblue: {
      name: 'K-블루', era: 'modern', hidden: true, hp: 1050, dmgTaken: 0.95, movePx: 187, speedClass: 3, angleMin: 20, angleMax: 88, powerMul: 1,
      traits: {},
      sprite: { pivot: [150, 77], baseAngle: 0, dir: -1, muzzleLen: 86, behind: true },
      weapons: [
        { id: 'kbounce', name: 'K-바운스탄', dmg: 230, radius: 34, crater: [1.2, 0.85], windMul: 1, gravityMul: 1, pattern: { kind: 'bounce', keep: 0.55 }, look: { shape: 'kball', color: '#2E86D6', size: 1, glow: '#8CC8FF' } },
        { id: 'ksplit', name: 'K-분열탄', dmg: 174, radius: 30, windMul: 1, gravityMul: 1, pattern: { kind: 'split', spread: 100 }, extraDelay: 110, look: { shape: 'ksplit', color: '#8CC63F', size: 1.1, glow: '#D8F59A' } },
      ],
    },
    kgreen: {
      name: 'K-그린', era: 'modern', hidden: true, hp: 1050, dmgTaken: 0.95, movePx: 187, speedClass: 3, angleMin: 20, angleMax: 88, powerMul: 1,
      traits: {},
      sprite: { pivot: [150, 77], baseAngle: 0, dir: -1, muzzleLen: 62, behind: true },
      weapons: [
        // 성장탄: the longer it flies, the bigger it grows (x0.75 at the muzzle → x1.4 after 3.2 s; radius grows with the square root)
        { id: 'kgrow', name: '성장탄', dmg: 205, radius: 32, windMul: 1, gravityMul: 1, pattern: { kind: 'grow', min: 0.75, max: 1.4, secs: 3.2 }, look: { shape: 'seed', color: '#8CC63F', size: 1, glow: '#D8F59A' } },
        // 뿌리탄: a small blast, then roots run along the ground the way it flew and burst up twice
        { id: 'kroot', name: '뿌리탄', dmg: 150, radius: 28, crater: [1.1, 0.9], windMul: 1, gravityMul: 1, pattern: { kind: 'root', steps: [75, 150], dmg: 95, radius: 28, ticks: 22 }, extraDelay: 110, look: { shape: 'rootseed', color: '#6AA22E', size: 1, glow: '#D8F59A' } },
      ],
    },
  },
  randomTank: { ids: ['kblue', 'kgreen'], chance: 1 / 9 }, // the chance is shared: 1/9 a hidden tank, then either one

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
    shield: { name: '실드', label: '실드', effect: 'shield', rounds: 2, dropWeight: 1, color: '#C8B4FF', bg: '#241E44' , desc: '피해 1번을 완전히 막고 깨짐 · 적 공격 2바퀴 뒤 사라짐 · 서든데스는 못 막음' },
    amplify: { name: '증폭', label: '증폭', effect: 'amplify', mul: 1.5, dropWeight: 1, color: '#FF9A86', bg: '#3A1A16' , desc: '이번 발사 피해 1.5배' },
    fuel: { name: '연료', label: '연료', effect: 'fuel', dropWeight: 1, color: '#FFE08A', bg: '#3A3212' , desc: '이번 턴 한 번 더 이동' },
    calm: { name: '무풍탄', label: '무풍', effect: 'calm', dropWeight: 1, color: '#B8F0FF', bg: '#123038' , desc: '이번 발사 바람 무시' },
  },

  // Map shapes are generated in pure JS (mapgen.js) so every device builds the same mask.
  maps: {
    campus: { name: 'KIRD 캠퍼스', tag: '두 건물 · 구름다리', desc: '본관과 5층 생활관이 마주 선 캠퍼스. 두 건물을 잇는 유리 구름다리와 가운데 잔디 마당.', W: 5600, H: 1500, theme: 'kird', special: 'KIRD 기관 전용' },
    songdae: { name: '송대제', tag: '호숫가 · 낙수 주의', desc: '본관 앞 송대제 호수. 왼쪽 언덕엔 본관, 가운데 호수엔 나무 데크와 작은 섬, 오른쪽은 숲 산책로.', W: 5400, H: 1500, theme: 'lake', special: 'KIRD 기관 전용' },
    ridge: { name: '혁신의 능선', tag: '평가는 관문, 수행은 골짜기', desc: '국가연구개발과제의 일생을 걷는 능선. 선정평가관 · 단계평가 게이트 · 최종평가 단상 세 봉우리와 1·2단계 수행 골짜기, 끝에는 성과 공개·활용.', W: 5200, H: 1500, theme: 'kird', special: 'KIRD 국가연구개발혁신법',
      tipPool: 'common', tipMix: ['ethics', 'notebook', 'safety', 'budget'],
      guide: { title: '혁신의 능선', line: '절차를 지키면 연구가 자유로워진다.' },
      items: { shield: '협약서', heal: '이의신청', double: '공동연구개발기관', amplify: '우수 평가', calm: 'IRIS 통합관리', fuel: '협약 변경', tele: '단계 전환' },
      happen: { meteor: ['제재 도장', '3턴마다 빨간 「제재」 도장이 떨어집니다 (붉은 원 = 낙하 지점)'], quake: ['특별평가', '4턴마다 땅이 흔들려 탱크가 밀려납니다'], tornado: ['3책5공 초과', '회오리에 들어간 포탄은 엉뚱한 곳으로 튕깁니다'], pillar: ['성과 활용', '빛기둥을 통과한 포탄은 위력 1.5배'], sudden: '최종보고 마감! 매 턴 모두 체력 감소 · 바람 강화' }, meteorLook: { kind: 'stamp', word: '제재' } },
    scale: { name: '진실의 전당', tag: '믿을 수 있는 연구가 되려면', desc: '연구윤리 실험실. 벽엔 위조·변조·표절 예방 포스터, 바닥엔 원본 데이터 보관함·출처 표기 서가·논문 원고 두루마리, 가운데는 밑으로 지나다니는 연구노트 서명대.', W: 5200, H: 1500, theme: 'kird', special: 'KIRD 연구윤리',
      tipPool: 'ethics',
      guide: { title: '진실의 전당', line: '기록하고, 밝히고, 함께 검증하라.' }, items: { shield: '연구노트', heal: '데이터 원본 보관', double: '공동연구', amplify: '동료 검증', calm: '출처 표기', fuel: 'IRB 승인', tele: '학회 발표' }, happen: { meteor: ['표절 적발', '3턴마다 빨간 「표절」 도장이 떨어집니다 (붉은 원 = 낙하 지점)'], quake: ['데이터 변조', '4턴마다 땅이 흔들려 탱크가 밀려납니다'], tornado: ['위조 회오리', '회오리에 들어간 포탄은 엉뚱한 곳으로 튕깁니다'], pillar: ['검증의 빛', '빛기둥을 통과한 포탄은 위력 1.5배'], sudden: '논문 철회 카운트다운! 매 턴 모두 체력 감소 · 바람 강화' }, meteorLook: { kind: 'stamp', word: '표절' } },
    notebook: { name: '증명의 노트', tag: '내 연구를 지켜 주는 가장 강력한 기록', desc: '책상 위에 펼친 거대한 연구노트. 두 쪽은 언덕, 가운데 제본선은 골짜기, 만년필이 다리.', W: 5200, H: 1500, theme: 'kird', special: 'KIRD 연구노트',
      tipPool: 'notebook',
      guide: { title: '증명의 노트', line: '쓰고, 서명하고, 남겨라.' }, items: { shield: '확인자 서명', heal: '원본 데이터 첨부', double: '공동 기록', amplify: '재현 가능 기록', calm: '제본 노트', fuel: '그날 기록', tele: '전자노트' }, happen: { meteor: ['서명 누락 적발', '3턴마다 빨간 「누락」 도장이 떨어집니다 (붉은 원 = 낙하 지점)'], quake: ['노트 분실', '4턴마다 땅이 흔들려 탱크가 밀려납니다'], tornado: ['수정액 회오리', '회오리에 들어간 포탄은 엉뚱한 곳으로 튕깁니다'], pillar: ['확인의 빛', '빛기둥을 통과한 포탄은 위력 1.5배'], sudden: '연구노트 제출 마감! 매 턴 모두 체력 감소 · 바람 강화' }, meteorLook: { kind: 'stamp', word: '누락' } },
    lab: { name: '예방의 실험동', tag: '사고는 실험 전에 막는다', desc: '실험동 두 채와 시약 창고 마당. 창고 위 소화기가 맵의 꼭대기. 3턴마다 연구실 화재로 불붙은 천장재가 떨어집니다.', W: 5200, H: 1500, theme: 'kird', special: 'KIRD 연구실안전', happening: 'meteor',
      tipPool: 'safety',
      guide: { title: '예방의 실험동', line: '위험은 미리 보고, 보호구는 꼭 챙겨라.' },
      items: { shield: '보호구', heal: '응급키트', double: '2인 1조 실험', amplify: '안전교육 이수', calm: 'MSDS 확인', fuel: '통로 확보', tele: '비상대피로' },
      happen: { meteor: ['연구실 화재 발생', '3턴마다 불붙은 천장재가 떨어집니다 (붉은 원 = 낙하 지점)'], quake: ['시약장 흔들림', '4턴마다 땅이 흔들려 탱크가 밀려납니다'], tornado: ['배기 역류', '역류에 들어간 포탄은 엉뚱한 곳으로 튕깁니다'], pillar: ['인화성 증기', '불기둥을 통과한 포탄은 위력 1.5배'], sudden: '대피 경보! 매 턴 모두 체력 감소 · 바람 강화' }, meteorLook: { kind: 'debris' } },
    archive: { name: '신뢰의 집행실', tag: '국민이 맡긴 연구비, 투명하게', desc: '증빙 상자가 가득한 문서고. 영수증 롤 언덕, 연구비 카드 경사로, 가운데 계산기 고지.', W: 5200, H: 1500, theme: 'kird', special: 'KIRD 연구비관리',
      tipPool: 'budget',
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
