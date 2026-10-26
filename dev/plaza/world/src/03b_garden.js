// ================================================================ 맵 2: 과학 정원 & 원형극장 (숨바꼭질) — 원·타원·마름모·팔각형 구역이 둘레길로 이어진 공원
MAPS.garden = {
  name: '과학 정원 & 원형극장', short: '과학 정원', tiled: true, corrName: '산책로', wallTop: '#22381F', corrWall: '#4A5A3A', fog: 'rgba(8,12,24,.9)', corrFl: 'path', corrCol: '#6B5A3E', corrProps: 40,
  // 숨바꼭질: 술래는 원형극장 한가운데 무대 뒤 대기실에서 출발
  hide: { pl: [61.5, 52.5], seekers: [[60.5, 42.5], [61.5, 43.5], [62.5, 42.5]], hold: '원형극장 한가운데 무대 뒤 대기실', open: '무대 문이 열렸다' },
  seek: { pl: [61.5, 42.5], skip: ['stage', 'amphi'] },
  build() {
    const C = [61.5, 42.5];
    setRooms([
      { id: 'amphi', n: '원형극장', inst: '과학 정원', s: '원형극장', r: [48, 29, 74, 55], ctr: [61.5, 36], lab: [61.5, 31.2], fl: 'amphi', c: '#B5701A', nprops: 10, wallTop: '#6E4B22' },
      { id: 'stage', n: '무대 뒤 대기실', inst: '과학 정원', s: '무대', r: [59, 40, 63, 44], ctr: [61.5, 42.5], fl: 'stageF', c: '#13294B', inner: 'amphi', hold: true },
      { id: 'ring', n: '둘레길', inst: '과학 정원', s: '둘레길', r: [43, 24, 80, 61], ctr: [61.5, 25.6], lab: [70, 25.8], fl: 'gravelP', c: '#8C7A5B', nprops: 14 },
      { id: 'dome', n: '플라네타리움', inst: '별빛 돔', s: '돔', r: [9, 5, 30, 26], ctr: [19.5, 15.5], lab: [19.5, 6.6], fl: 'stars', c: '#3A2E7A', nprops: 9, wallTop: '#2E2A60' },
      { id: 'maze', n: '미로 정원', inst: '산울타리 미로', s: '미로', r: [44, 2, 78, 15], ctr: [61, 8.5], lab: [61, 3], fl: 'grass', c: '#2F7D32', nprops: 12, wallTop: '#3E8A36' },
      { id: 'glass', n: '유리 온실', inst: '타원형 온실', s: '온실', r: [87, 5, 118, 26], ctr: [102.5, 15.5], lab: [102.5, 6.6], fl: 'soil', c: '#2FA84F', nprops: 10 },
      { id: 'bamboo', n: '대나무 숲', inst: '바람 소리 숲', s: '대숲', r: [3, 30, 20, 56], ctr: [11.5, 43], lab: [11.5, 31.2], fl: 'grassD', c: '#3C6E2B', nprops: 12, wallTop: '#6B6F62' },
      { id: 'pond', n: '연못 정원', inst: '나무 데크 연못', s: '연못', r: [95, 34, 118, 57], ctr: [106.5, 45.5], lab: [106.5, 34.8], fl: 'deck', c: '#1F6FB2', nprops: 9 },
      { id: 'sculpt', n: '조각 공원', inst: '팔각 광장', s: '조각', r: [13, 59, 36, 82], ctr: [24.5, 70.5], lab: [24.5, 59.8], fl: 'stoneP', c: '#7A8BA8', nprops: 10 },
      { id: 'lawn', n: '잔디 공연장', inst: '반원 잔디밭', s: '잔디', r: [48, 68, 75, 80], ctr: [61.5, 75], lab: [61.5, 69.2], fl: 'grass', c: '#5E9A22', nprops: 10 },
      { id: 'camp', n: '캠핑장', inst: '마름모 숲속 캠프', s: '캠핑', r: [82, 63, 115, 82], ctr: [98.5, 72.5], lab: [98.5, 64.4], fl: 'grassL', c: '#C2652A', nprops: 10 },
    ]);
    Object.assign(FLAVOR, { amphi: '계단식 객석이 빙 둘러싼 원형 무대', stage: '술래가 숫자를 세는 곳', ring: '원형극장을 감싸는 자갈 산책로', dome: '둥근 지붕 아래 별이 도는 곳', maze: '키 큰 산울타리 사이 갈림길', glass: '타원형 유리 지붕 아래 화단', bamboo: '빽빽한 대나무와 돌담', pond: '연못을 가로지르는 나무 다리', sculpt: '팔각 광장에 늘어선 조각상', lawn: '반원형 잔디밭과 야외 무대', camp: '마름모꼴 숲속 텐트촌' });
    const R = RID;
    // 1) 산책로(복도) 먼저 — 방이 위에 덮인다
    const P = (x0, y0, x1, y1) => carve(x0, y0, x1, y1, TL.FLOOR, -2);
    P(60, 14, 62, 25); P(19, 41, 44, 43); P(79, 41, 96, 43); P(60, 59, 62, 69);
    carveLine(50, 31, 25, 20, 3, TL.FLOOR, -2); carveLine(73, 31, 95, 19, 3, TL.FLOOR, -2); carveLine(73, 54, 91, 68, 3, TL.FLOOR, -2); carveLine(50, 54, 31, 65, 3, TL.FLOOR, -2);
    P(26, 8, 45, 10); P(77, 8, 89, 10); P(10, 20, 12, 31); P(13, 56, 15, 62); P(105, 24, 107, 35); P(105, 56, 107, 65); P(34, 74, 49, 76); P(74, 74, 85, 76);
    // 2) 구역
    carveRing(C[0], C[1], 14.5, 18.5, TL.FLOOR, R.ring);
    carveDisc(C[0], C[1], 12.5, TL.FLOOR, R.amphi);
    for (const [x0, y0, x1, y1] of [[60, 28, 62, 30], [60, 55, 62, 57], [47, 41, 49, 43], [74, 41, 76, 43]]) carve(x0, y0, x1, y1, TL.FLOOR, R.amphi);
    carveDisc(19.5, 15.5, 10.5, TL.FLOOR, R.dome);
    carveRing(19.5, 15.5, 5, 6.2, TL.WALL, R.dome); carve(13, 14, 14, 16, TL.FLOOR, R.dome); carve(25, 14, 26, 16, TL.FLOOR, R.dome); carve(18, 21, 20, 22, TL.FLOOR, R.dome);
    carve(44, 2, 78, 15, TL.FLOOR, R.maze);
    for (const [x0, y0, x1, y1] of [[47, 4, 47, 12], [48, 12, 52, 12], [51, 4, 51, 9], [55, 5, 55, 12], [56, 5, 59, 5], [58, 8, 58, 10], [59, 10, 63, 10], [64, 4, 64, 8], [67, 5, 71, 5], [67, 8, 67, 13], [68, 13, 72, 13], [71, 8, 71, 10], [75, 4, 75, 12]]) carve(x0, y0, x1, y1, TL.WALL, R.maze);
    carveEll(102.5, 15.5, 16, 11, TL.FLOOR, R.glass);
    carve(3, 30, 20, 56, TL.FLOOR, R.bamboo);
    for (const [x0, y0, x1, y1] of [[6, 34, 9, 34], [14, 36, 14, 39], [5, 46, 8, 46], [15, 48, 18, 48], [9, 51, 9, 54], [16, 31, 18, 31]]) carve(x0, y0, x1, y1, TL.WALL, R.bamboo);
    carveEll(106.5, 45.5, 12, 12, TL.FLOOR, R.pond);
    carveEll(106.5, 45.5, 6, 7, TL.WATER, R.pond); carve(106, 38, 107, 53, TL.FLOOR, R.pond);
    carveIf(12, 58, 37, 83, (x, y) => { const dx = Math.abs(x - 24.5), dy = Math.abs(y - 70.5); return dx <= 12 && dy <= 12 && dx + dy <= 18; }, TL.FLOOR, R.sculpt);
    carveIf(46, 66, 77, 80, (x, y) => (x - 61.5) ** 2 + (y - 82) ** 2 <= 14.2 * 14.2 && y <= 80.6, TL.FLOOR, R.lawn);
    carveIf(80, 61, 117, 83, (x, y) => Math.abs(x - 98.5) / 17.5 + Math.abs(y - 72.5) / 10.5 <= 1, TL.FLOOR, R.camp);
    // 무대 뒤 대기실 (술래 출발점) — 벽으로 둘러싸고 북쪽 문 하나
    for (let y = 39; y <= 45; y++) for (let x = 58; x <= 64; x++) { G[gi(x, y)] = TL.WALL; GR[gi(x, y)] = R.amphi; }
    carve(59, 40, 63, 44, TL.FLOOR, R.stage);
    addDoors([['stage', 60, 39, 62, 39, 'hold']]);
    calcVert();
    // 3) 꾸밈
    D('amphiTiers', C[0] - 12.5, C[1] - 12.5, 25, 25, false);
    D('spot', 57, 38, 9, 9, false);
    for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2 + Math.PI / 8, x = C[0] + Math.cos(a) * 16.5, y = C[1] + Math.sin(a) * 16.5; D('lamppost', Math.floor(x), Math.floor(y), 1, 1, true); }
    D('projector', 18, 14, 3, 3, true); D('domeSeats', 9, 5, 21, 21, false);
    D('hedgeGate', 59, 15, 5, 1, false, { label: '미로 입구' });
    for (const [x, y] of [[90, 10], [104, 10], [92, 19], [104, 19]]) D('bed', x, y, 8, 1, true);
    D('fountain', 100, 14, 4, 3, true);
    for (const [x, y] of [[5, 32], [11, 33], [17, 34], [4, 40], [10, 41], [17, 42], [6, 49], [12, 47], [18, 51], [4, 54], [14, 54], [12, 38]]) D('bambooC', x, y, 2, 2, true);
    D('bridge', 105, 37, 4, 18, false); for (const [x, y] of [[101, 42], [111, 47], [102, 50], [110, 40]]) D('lily', x, y, 1, 1, false);
    for (const [x, y, k] of [[20, 64, 0], [27, 64, 1], [16, 70, 2], [31, 70, 3], [20, 76, 4], [27, 76, 5]]) D('statue', x, y, 2, 2, true, { k });
    D('obelisk', 23, 69, 3, 3, true);
    D('shell', 54, 78, 15, 3, true);
    for (const [x, y] of [[52, 72], [70, 72], [57, 70], [65, 70]]) D('tree', x, y, 2, 2, true);
    for (const [x, y] of [[90, 69], [104, 69], [97, 75], [91, 76], [104, 74]]) D('tent', x, y, 3, 3, true, { c: ['#E0533F', '#2E86D6', '#F2A23A', '#2FA84F', '#7C5CE0'][(x + y) % 5] });
    D('campfire', 97, 70, 2, 2, true);
    for (const [x, y] of [[85, 72], [110, 72], [98, 65], [98, 78]]) D('tree', x, y, 2, 2, true);
    Object.assign(ROOMPROPS, { amphi: ['cushion', 'lantern', 'chair'], stage: ['chair'], ring: ['lantern', 'bin', 'bush'], dome: ['scope', 'chair', 'cushion'], maze: ['bush', 'lantern', 'bust'], glass: ['plant', 'flask', 'bush'], bamboo: ['bush', 'stump', 'lantern'], pond: ['duck', 'lantern', 'stump'], sculpt: ['bust', 'bin', 'plant'], lawn: ['cushion', 'bin', 'stump'], camp: ['stump', 'lantern', 'crate', 'tire'], corr: ['bush', 'lantern', 'bin'] });
  },
};
