// ================================================================ 맵 3: 야간 도심 (탈출전) — 바둑판 도로 + 대각선 대로 + 원형 로터리, 건물마다 다른 속
MAPS.city = {
  name: '야간 도심 · 대각 대로', short: '야간 도심', tiled: true, corrName: '도로', wallTop: '#3A4156', corrWall: '#4A5468', fog: 'rgba(3,5,18,.93)', corrFl: 'asphalt', corrCol: '#2B3242', corrProps: 46,
  chase: {
    pl: [60.5, 17.5], allies: [[58.5, 16.5], [62.5, 16.5], [60.5, 20.5]], seeker: [45.5, 66.5],
    cage: { x: 45.5, y: 72.6 },
    exits: [{ x: 18.5, y: 13.6, n: '지하철 탈출구', room: 'subway' }, { x: 103.5, y: 16.6, n: '헬기 탈출구', room: 'heli' }],
    exitText: '지하철역(북서) · 헬기장(북동)', cageText: '검증 센터 격리실', seekerFrom: '남쪽 검증 센터',
    terms: [
      { x: 45.5, y: 20.6, n: '대출 단말기', room: 'library' }, { x: 70.5, y: 10.6, n: '로비 키오스크', room: 'tower' }, { x: 27.5, y: 48.6, n: '상인회 단말', room: 'market' },
      { x: 38.5, y: 34.6, n: '공원 관리 단말', room: 'park' }, { x: 85.5, y: 40.6, n: '주차 정산기', room: 'parking' }, { x: 110.5, y: 47.6, n: '서버 콘솔', room: 'dc' },
      { x: 10.5, y: 72.6, n: '현장 사무소 PC', room: 'site' }, { x: 68.5, y: 59.6, n: '안내 키오스크', room: 'mall' }, { x: 110.5, y: 59.6, n: '하역 제어반', room: 'port' },
      { x: 26.5, y: 22.6, n: '역무 단말', room: 'subway' }, { x: 95.5, y: 22.6, n: '관제 무전기', room: 'heli' }, { x: 66.5, y: 40.6, n: '분수 제어반', room: 'plaza' },
    ],
  },
  build() {
    setRooms([
      { id: 'subway', n: '지하철역', inst: '북서 블록', s: '지하철', r: [8, 8, 28, 24], fl: 'subway', c: '#2E86D6', nprops: 7 },
      { id: 'library', n: '도서관', inst: '북쪽 블록', s: '도서관', r: [35, 8, 55, 24], fl: 'wood', c: '#9C6B3C', nprops: 9 },
      { id: 'tower', n: '연구 타워', inst: 'ㄱ자 빌딩', s: '타워', r: [65, 8, 86, 24], fl: 'marble', c: '#7C5CE0', nprops: 7 },
      { id: 'heli', n: '헬기장 옥상', inst: '북동 옥상', s: '헬기장', r: [93, 8, 113, 24], fl: 'roof', c: '#E0533F', nprops: 7 },
      { id: 'market', n: '시장 골목', inst: '서쪽 블록', s: '시장', r: [8, 31, 28, 50], fl: 'market', c: '#F2A23A', nprops: 12, wallTop: '#7A4E26' },
      { id: 'park', n: '도심 공원', inst: '담장 없는 블록', s: '공원', r: [34, 30, 53, 51], fl: 'grass', c: '#2FA84F', nprops: 10 },
      { id: 'plaza', n: '분수 로터리', inst: '도시 한가운데', s: '로터리', r: [54, 34, 66, 46], ctr: [60.5, 40.5], lab: [60.5, 34.6], fl: 'plazaT', c: '#13294B', nprops: 5 },
      { id: 'parking', n: '주차 빌딩', inst: '동쪽 블록', s: '주차장', r: [70, 31, 86, 50], fl: 'concrete', c: '#5B6B82', nprops: 10 },
      { id: 'dc', n: '데이터센터', inst: '동쪽 끝 블록', s: '데이터', r: [93, 31, 113, 50], fl: 'raised', c: '#4C6FD8', nprops: 8 },
      { id: 'site', n: '공사장', inst: '남서 블록', s: '공사장', r: [8, 57, 28, 75], fl: 'gravel', c: '#C99A1E', nprops: 12, wallTop: '#8A6A20' },
      { id: 'verify', n: '검증 센터', inst: '위조탱 격리실', s: '검증', r: [35, 57, 55, 75], fl: 'lab', c: '#BE123C', nprops: 6 },
      { id: 'mall', n: '쇼핑몰', inst: '십자 통로 몰', s: '쇼핑몰', r: [65, 57, 86, 75], fl: 'marble', c: '#0EA5A4', nprops: 10, wallTop: '#0B6B6A' },
      { id: 'port', n: '항만 창고', inst: '남동 블록', s: '항만', r: [93, 57, 113, 75], fl: 'steel', c: '#0E7490', nprops: 9 },
    ]);
    Object.assign(FLAVOR, { subway: '막차가 서 있는 승강장 — 탈출구', library: '서가 사이 좁은 통로', tower: 'ㄱ자로 꺾인 고층 로비', heli: '불 켜진 착륙장 — 탈출구', market: '노점 사이 좁은 골목', park: '담 없이 탁 트인 공원', plaza: '분수를 도는 원형 교차로', parking: '기둥과 차가 늘어선 주차장', dc: '서버 랙이 줄지어 선 냉방실', site: '비계와 자재가 쌓인 공사장', verify: '붙잡히면 갇히는 격리실', mall: '십자 통로로 나뉜 상점가', port: '컨테이너가 쌓인 창고' });
    const R = RID, H = (x0, y0, x1, y1) => { carve(x0, y0, x1, y1, TL.FLOOR, -2); CORR.push([x0, y0, x1, y1]); };
    // 1) 도로 (바둑판) + 보도
    H(3, 3, 118, 6); H(3, 26, 118, 29); H(3, 52, 118, 55); H(3, 77, 118, 80);
    H(3, 3, 6, 80); H(30, 3, 33, 80); H(57, 3, 63, 80); H(88, 3, 91, 80); H(115, 3, 118, 80);
    H(64, 30, 68, 51);
    // 2) 건물 (벽 1칸 안쪽)
    const B = (id, x0, y0, x1, y1) => carve(x0, y0, x1, y1, TL.FLOOR, R[id]);
    B('subway', 8, 8, 28, 24); B('library', 35, 8, 55, 24); B('tower', 65, 8, 86, 24); B('heli', 93, 8, 113, 24);
    B('market', 8, 31, 28, 50); B('parking', 70, 31, 86, 50); B('dc', 93, 31, 113, 50);
    B('site', 8, 57, 28, 75); B('verify', 35, 57, 55, 75); B('mall', 65, 57, 86, 75); B('port', 93, 57, 113, 75);
    carve(34, 30, 56, 51, TL.FLOOR, R.park);
    carve(77, 8, 86, 15, TL.WALL, R.tower); // ㄱ자
    for (const y of [35, 40, 45]) { carve(10, y, 13, y, TL.WALL, R.market); carve(16, y, 20, y, TL.WALL, R.market); carve(23, y, 26, y, TL.WALL, R.market); } // 노점 줄
    carve(75, 57, 76, 62, TL.WALL, R.mall); carve(75, 70, 76, 75, TL.WALL, R.mall); carve(65, 65, 71, 66, TL.WALL, R.mall); carve(80, 65, 86, 66, TL.WALL, R.mall); // 십자 통로
    for (const [x0, y0, x1, y1] of [[12, 61, 12, 66], [12, 61, 17, 61], [22, 66, 26, 66], [19, 70, 19, 74]]) carve(x0, y0, x1, y1, TL.WALL, R.site); // 비계 벽
    // 3) 원형 로터리 · 대각 대로
    carveDisc(60.5, 40.5, 6.6, TL.FLOOR, R.plaza);
    carveLine(8, 76, 90, 24, 3.2, TL.FLOOR, -2);
    carveDisc(60.5, 40.5, 6.6, TL.FLOOR, R.plaza);
    // 4) 문
    addDoors([
      ['subway', 17, 25, 19, 25, null], ['subway', 29, 15, 29, 17, null],
      ['library', 34, 15, 34, 17, null], ['library', 56, 12, 56, 14, null], ['library', 44, 25, 46, 25, null],
      ['tower', 64, 18, 64, 20, null], ['tower', 70, 25, 72, 25, null], ['tower', 87, 18, 87, 20, null],
      ['heli', 92, 12, 92, 14, null], ['heli', 101, 25, 103, 25, null],
      ['market', 16, 30, 18, 30, null], ['market', 29, 39, 29, 41, null], ['market', 20, 51, 22, 51, null], ['market', 7, 40, 7, 42, null],
      ['parking', 69, 39, 69, 41, null], ['parking', 87, 35, 87, 37, null], ['parking', 76, 51, 78, 51, null], ['parking', 76, 30, 78, 30, null],
      ['dc', 92, 33, 92, 35, null], ['dc', 101, 30, 103, 30, null], ['dc', 96, 51, 98, 51, null], ['dc', 114, 44, 114, 46, null],
      ['site', 12, 56, 14, 56, null], ['site', 29, 66, 29, 68, null], ['site', 20, 76, 22, 76, null],
      ['verify', 44, 56, 46, 56, null], ['verify', 56, 64, 56, 66, null], ['verify', 34, 64, 34, 66, null],
      ['mall', 64, 68, 64, 70, null], ['mall', 79, 56, 81, 56, null], ['mall', 87, 68, 87, 70, null], ['mall', 79, 76, 81, 76, null],
      ['port', 101, 56, 103, 56, null], ['port', 92, 62, 92, 64, null], ['port', 104, 76, 106, 76, null],
    ]);
    calcVert();
    // 5) 꾸밈
    D('train', 10, 9, 18, 3, true); for (let x = 11; x <= 25; x += 3.5) D('gate2', x, 18, 1, 1, true); D('exitSign', 15, 13, 7, 1, false, { label: '지하철 탈출구' });
    for (let k = 0; k < 4; k++) { D('shelf', 37, 10 + k * 3, 7, 1, true); D('shelf', 47, 10 + k * 3, 7, 1, true); } D('readT', 38, 22, 4, 1, true); D('readT', 49, 22, 4, 1, true);
    D('recep', 67, 13, 6, 1, true); D('column', 68, 17, 1, 1, true); D('column', 74, 20, 1, 1, true); D('column', 80, 19, 1, 1, true);
    D('helipad', 98, 11, 11, 11, false); D('hvac', 94, 9, 2, 2, true); D('hvac', 111, 9, 2, 2, true); D('hvac', 111, 21, 2, 2, true);
    for (const y of [33, 38, 43, 48]) for (const x of [10, 17, 24]) D('stall', x, y, 2, 1, true, { c: ['#E0533F', '#F2A23A', '#2E86D6', '#2FA84F'][(x + y) % 4] });
    for (const [x, y] of [[36, 32], [42, 37], [36, 44], [47, 31], [49, 46], [41, 49]]) D('tree', x, y, 2, 2, true); D('pondS', 43, 41, 5, 3, true);
    D('fountain', 59, 39, 3, 3, true);
    for (const y of [32, 36, 44, 48]) for (const x of [72, 77, 82]) D('car', x, y, 3, 2, true, { c: ['#E0533F', '#2E86D6', '#FFD24A', '#8A97AA', '#2FA84F'][(x + y) % 5] });
    for (const [x, y] of [[71, 40], [80, 40]]) D('column', x, y, 1, 1, true);
    for (const y of [33, 37, 41, 45]) { D('racks', 95, y, 7, 1, true); D('racks', 105, y, 7, 1, true); } D('cooler', 93, 48, 2, 2, true);
    for (const [x, y] of [[9, 59], [15, 68], [23, 59], [24, 70]]) D('crates', x, y, 2, 1, true); D('crane', 16, 63, 3, 3, true);
    D('cage', 43, 73, 5, 1, false, { label: '격리실' }); D('labbench', 37, 59, 5, 1, true); D('labbench', 48, 59, 5, 1, true);
    for (const [x, y] of [[66, 58], [78, 58], [66, 70], [78, 71]]) D('shopfront', x, y, 7, 1, true, { c: ['#F08BB4', '#4FC3F7', '#FFD24A', '#8CC63F'][(x + y) % 4] });
    D('kiosk2', 72, 66, 2, 2, true);
    [[95, 59], [99, 59], [95, 66], [99, 70], [106, 64], [106, 69]].forEach(([x, y], k) => D('container', x, y, 3, 2, true, { c: ['#2E86D6', '#E0533F', '#F2A23A', '#2FA84F', '#7C5CE0'][k % 5] }));
    // 가로등 · 횡단보도
    for (const x of [18, 45, 76, 103]) for (const y of [4, 27, 53, 78]) D('streetlamp', x, y, 1, 1, true);
    for (const x of [31, 59, 89]) for (const y of [4, 27, 53, 78]) D('zebra', x, y, 3, 3, false);
    Object.assign(ROOMPROPS, { subway: ['bin', 'barrier'], library: ['book', 'chair', 'plant'], tower: ['plant', 'chair'], heli: ['cone', 'barrier', 'tire'], market: ['crate', 'barrel', 'bin'], park: ['bush', 'bin', 'stump'], plaza: ['bin', 'bike', 'plant'], parking: ['tire', 'cone', 'barrier'], dc: ['server', 'router'], site: ['cone', 'barrier', 'crate', 'tire'], verify: ['flask', 'chair'], mall: ['plant', 'mailbox', 'chair'], port: ['crate', 'barrel', 'tire'], corr: ['hydrant', 'bin', 'bike', 'mailbox', 'cone'] });
  },
};
