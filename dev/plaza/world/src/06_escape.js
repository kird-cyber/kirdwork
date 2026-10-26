// ================================================================ 모드 1: 방탈출 — 잠금 사슬 · 방 안 퍼즐
const LOCKC = { power: '#F5C542', blue: '#2E86D6', green: '#2FA84F', red: '#E0533F', laser: '#FF4A9A', fusion: '#C084FC' };
const ITEMS = {
  driver: { n: '드라이버', i: '🪛', d: '나사로 잠긴 환풍구·퓨즈함을 연다' }, blue: { n: '블루 카드', i: '🟦', d: '파란 문 통과' }, green: { n: '그린 카드', i: '🟩', d: '초록 문 통과' }, red: { n: '레드 카드', i: '🟥', d: '빨간 문 통과' },
  uv: { n: 'UV 손전등', i: '🔦', d: '보이지 않는 글씨를 비춘다' }, handle: { n: '밸브 핸들', i: '☸️', d: '배관 밸브에 꽂는다' }, fuse: { n: '고압 퓨즈', i: '🧯', d: '핵융합 점화 장치에 꽂는다' }, order: { n: '순서표', i: '📜', d: '조각 기호의 입력 순서' },
};
const FRAGS = { star: { i: '★', n: '별 조각', room: 'kasi' }, atom: { i: '⚛', n: '원자 조각', room: 'kaeri' }, rocket: { i: '🚀', n: '로켓 조각', room: 'kari' }, train: { i: '🚂', n: '기차 조각', room: 'krri' } };
const SHAPES = {
  '케이 자리': [[0, 0], [0, 1], [0, 2], [0, 3], [1, 1.5], [2, 0.4], [2, 2.8]],
  '탱크 자리': [[0, 2], [1, 1.2], [2, 1.2], [3, 2], [1.5, 0.4], [3.4, 0.4], [2.6, 0.4]],
  '국자 자리': [[0, 0], [1, 0.3], [2, 0.2], [3, 0.8], [3.4, 1.8], [4.6, 1.9], [4.4, 0.9]],
};
const ESC = {
  name: '방탈출', vents: true, keys: '이동 WASD·방향키 · 사용 E · 지도 M · 힌트 H',
  init() {
    const S = STATE; Object.assign(S, { mode: 'escape', t: 0, clock: 0, pen: 0, hints: 0, over: false, win: false, items: {}, frag: {}, power: false, laserOK: false, drained: false, drainT: -1, pipesOK: false, valveSet: false, fusion: false, codeSeen: false, starSeen: false, trainRun: false, simonLit: -1, orderSeen: false });
    S.splits = {}; S.paid = {};
    S.digits = { star: 1 + rndi(9), atom: 1 + rndi(9), rocket: 1 + rndi(9), train: 1 + rndi(9) };
    S.order = shuffle(['star', 'atom', 'rocket', 'train']);
    S.uvCode = String(1000 + rndi(9000)); S.shape = pick(Object.keys(SHAPES));
    PL.x = 64.5; PL.y = 38.6; PL.a = -Math.PI / 2; PL.col = 'blue'; PL.name = '나'; PL.speed = 4.4; PL.gone = false; PL.disguise = null; PL.paint = null; ENTS = [];
    // 소코반
    HOLES.clear(); FILLED.length = 0; for (const [x, y] of [[8, 34], [8, 35], [8, 36]]) HOLES.add(gi(x, y));
    this.resetBoulders(true);
    PUSH.push({ x: 9, y: 56, kind: 'planter' }, { x: 10, y: 60, kind: 'planter' });
    const gd = decorById('gdoor'); gd.off = false; decorById('toolbox').off = false; bakeSolids();
    Object.entries({ m1: 0, m2: 2, m3: 1, m4: 1, m5: 0 }).forEach(([id, v]) => decorById(id).st = v);
    for (let i = 0; i < 3; i++) decorById('lev' + i).st = 0;
    // 김치독
    const days = shuffle(Array.from({ length: 40 }, (_, k) => k + 7)).slice(0, 12); DEC.filter(d => d.t === 'jar').forEach((d, k) => { d.days = days[k]; d.open = false; });
    this.makeJarRule();
    this.train = null; this.beam = []; DOORLIST.forEach(d => d.amt = 0);
    this.buildInter(); this.drainProg = 0;
    PL.slow = 0; CAM.x = PL.x * T; CAM.y = PL.y * T;
  },
  resetBoulders(first) {
    PUSH = PUSH.filter(p => p.kind !== 'boulder');
    for (let i = FILLED.length - 1; i >= 0; i--) if (FILLED[i].kind === 'boulder') FILLED.splice(i, 1);
    for (const [x, y] of [[8, 34], [8, 35], [8, 36]]) HOLES.add(gi(x, y));
    for (const [x, y] of BOULDERS) PUSH.push({ x, y, kind: 'boulder' });
    if (!first && Math.floor(PL.x) >= 4 && Math.floor(PL.x) <= 22 && PL.y > 24 && PL.y < 41) { for (const [x, y] of BOULDERS) if (Math.floor(PL.x) === x && Math.floor(PL.y) === y) { PL.x = 21.5; PL.y = 32.5; } }
  },
  save() {
    const S = STATE; if (S.mode !== 'escape' || S.win) return;
    const keys = ['clock', 'pen', 'hints', 'items', 'frag', 'power', 'laserOK', 'drained', 'pipesOK', 'valveSet', 'fusion', 'codeSeen', 'starSeen', 'digits', 'order', 'uvCode', 'shape', 'jarRule', 'jarAns', 'splits', 'paid'];
    const o = {}; keys.forEach(k => o[k] = S[k]); o.pl = [PL.x, PL.y]; o.push = PUSH.map(p => [p.x, p.y, p.kind]); o.holes = [...HOLES]; o.filled = FILLED.map(f => [f.x, f.y, f.kind]);
    o.dec = DEC.filter(d => d.id || d.t === 'jar').map(d => [DEC.indexOf(d), d.st || 0, d.off ? 1 : 0, d.open ? 1 : 0, d.days || 0]);
    try { localStorage.setItem('kw_save_escape', JSON.stringify(o)); } catch (e) { }
  },
  load() {
    let o = null; try { o = JSON.parse(localStorage.getItem('kw_save_escape')); } catch (e) { } if (!o) return false;
    Object.assign(STATE, o); delete STATE.pl; delete STATE.push; delete STATE.holes; delete STATE.filled; delete STATE.dec; if (STATE.valveSet) STATE.drained = true;
    PL.x = o.pl[0]; PL.y = o.pl[1]; PUSH = o.push.map(([x, y, kind]) => ({ x, y, kind })); HOLES.clear(); o.holes.forEach(i => HOLES.add(i)); FILLED.length = 0; o.filled.forEach(([x, y, kind]) => FILLED.push({ x, y, kind }));
    o.dec.forEach(([i, st, off, open, days]) => { const d = DEC[i]; d.st = st; d.off = !!off; d.open = !!open; if (days) d.days = days; }); bakeSolids(); this.buildInter(); CAM.x = PL.x * T; CAM.y = PL.y * T; return true;
  },
  makeJarRule() {
    const J = DEC.filter(d => d.t === 'jar'); const byRC = (r, c) => J.find(d => d.jr === r && d.jc === c);
    const rules = [
      () => { const m = J.reduce((a, b) => a.days > b.days ? a : b); return ['가장 오래 익은 독', m]; },
      () => { const m = J.reduce((a, b) => a.days < b.days ? a : b); const r = byRC(m.jr, m.jc + 1) || byRC(m.jr, m.jc - 1); return [`가장 덜 익은 독의 ${byRC(m.jr, m.jc + 1) ? '바로 오른쪽' : '바로 왼쪽'} 독`, r]; },
      () => { const ev = J.filter(d => d.days % 2 === 0); if (!ev.length) return null; const m = ev.reduce((a, b) => a.days > b.days ? a : b); return ['숙성 일수가 짝수인 독 중 가장 오래된 것', m]; },
      () => { const row = rndi(3); const R = J.filter(d => d.jr === row); const m = R.reduce((a, b) => a.days < b.days ? a : b); return [`${['맨 윗', '가운데', '맨 아랫'][row]}줄에서 가장 덜 익은 독`, m]; },
    ];
    let res = null; while (!res) res = pick(rules)();
    STATE.jarRule = res[0]; STATE.jarAns = res[1].id;
  },
  doorOK(d) {
    const S = STATE, l = d.lock; if (!l) return true;
    if (l === 'power') return S.power; if (l === 'laser') return S.laserOK; if (l === 'fusion') return S.fusion;
    return !!S.items[l];
  },
  lockColor(d) { return LOCKC[d.lock] || '#8A97AA'; },
  litRoom(r) { if (STATE.power) return true; return r && ['lobby', 'keri', 'ctrl', 'kigam', 'etri'].includes(r.id); },
  visR() { const r = roomAt(PL.x, PL.y); if (this.litRoom(r)) return 8.5; return STATE.power ? 7.5 : r ? 3.6 : 5; },
  fogColor() { return STATE.power ? 'rgba(6,9,20,.86)' : 'rgba(2,3,9,.96)'; },
  // ------------------------------------------------------------ 상호작용 목록
  buildInter() {
    const S = STATE, IT = S.items, me = this; INTER = [];
    const add = (x, y, label, act, o) => INTER.push(Object.assign({ x, y, label, act }, o || {}));
    add(35.5, 25.4, '주 차단기 조사', () => S.power ? toast('전력은 이미 복구됐다. 테슬라 코일이 윙윙거린다.') : rotGrid({ title: '주 차단기 · 회로 복구', kind: '전력 제어실 · KERI', w: 6, h: 4, theme: 'power', onSolve: () => me.powerOn() }));
    add(21.5, 33.2, '바위 원위치', () => { if (!HOLES.has(gi(8, 36)) && !HOLES.has(gi(8, 34))) { toast('구덩이는 이미 메웠다.'); return; } me.resetBoulders(false); toast('바위를 처음 자리로 되돌렸다.'); }, { show: () => !IT.driver });
    add(6, 37.2, '공구함 열기', () => { if (IT.driver) return; me.give('driver'); decorById('toolbox').off = true; }, { r: 1.7, show: () => !IT.driver });
    add(111.5, 13.4, '안테나 제어판', () => IT.blue ? toast('신호 정렬 완료. 블루 카드는 이미 챙겼다.') : simon(() => me.give('blue')));
    for (const id of ['m1', 'm2', 'm3', 'm4', 'm5']) { const d = decorById(id); add(d.x + .5, d.y + .5, '거울 돌리기', () => { d.st = (d.st + 1) % 3; sfx('click'); }, { r: 1.3, show: () => S.power && !S.laserOK }); }
    add(46.5, 14.6, '성도(星圖) 보기', () => { S.starSeen = true; showShape(); });
    add(39.5, 13.6, '관측 돔 망원경', () => { if (S.frag.star) { toast(`이미 촬영했다. ★ = ${S.digits.star}`); return; } if (!S.starSeen) { toast('어떤 별자리를 찾아야 하지? 오른쪽 아래 <b>성도</b>부터 보자.'); return; } telescope(() => me.giveFrag('star')); }, { r: 1.8 });
    add(19.5, 58.5, 'UV 손전등 줍기', () => me.give('uv'), { show: () => !IT.uv && decorById('gdoor').off });
    add(89.5, 5.4, '슈퍼컴 콘솔 접속', () => { if (IT.green) { toast('접속 완료 상태. 그린 카드 발급됨.'); return; } keypad({ title: '슈퍼컴퓨터 원격 접속', kind: 'KISTI · 슈퍼컴퓨터실', prompt: '접속번호 4자리', len: 4, theme: 'term', check: c => c === S.uvCode, onOK: () => me.give('green'), fail: '접속 거부. 번호가 틀렸다. 어딘가 <b>보이지 않는 글씨</b>로 적혀 있다던데…' }); }, { r: 1.7 });
    add(31.5, 49.4, '숙성 일지 읽기', () => openModal(`<div class="mh"><div><div class="mk">WiKim · 김치 발효고</div><h3>숙성 일지</h3></div><button class="x" data-close>✕</button></div><p class="q">"오늘 밸브 핸들을 <b>${S.jarRule}</b>에 숨겨 뒀음. 다른 독 열면 냄새 주의!"</p><p class="note">독 뚜껑 숫자 = 숙성 일수. 독 3줄 × 4개.</p><button class="btn" data-close>확인</button>`));
    for (const d of DEC.filter(d => d.t === 'jar')) add(d.x + d.w / 2, d.y + d.h / 2, '독 뚜껑 열기', () => {
      if (d.open) return; d.open = true;
      if (d.id === S.jarAns) { me.give('handle'); } else { sfx('bad'); PL.slow = 6; S.pen += 10; SHAKE = 0.4; toast('으악, 시큼해! 눈이 매워 6초간 느려진다 (+10초)'); fxText(d.x + .7, d.y, '+10초', '#FF8A7A'); }
    }, { r: 2.1, show: () => !IT.handle && !d.open });
    add(62.5, 57.4, '배관 제어판', () => S.pipesOK ? toast('물길 연결 완료. 이제 밸브.') : rotGrid({ title: '배관 연결', kind: 'KRICT · 화학 플랜트', w: 6, h: 5, theme: 'water', onSolve: () => { S.pipesOK = true; sfx('ok'); toast('물길이 이어졌다! 오른쪽 <b>밸브</b>에 핸들을 꽂자.'); } }));
    add(66.5, 57.4, '배수 밸브', () => { if (S.valveSet) return; if (!S.pipesOK) { toast('밸브가 헛돈다. 배관부터 이어야 한다.'); return; } if (!IT.handle) { toast('밸브 손잡이가 빠져 있다. <b>밸브 핸들</b>이 필요하다.'); return; } S.valveSet = true; S.drainT = 0; sfx('ok'); banner('배수 시작', '연구로 수조(KAERI)의 물이 빠지고 있다'); }, { show: () => !S.valveSet });
    add(89.5, 55.5, '연구로 노심', () => { if (IT.red) return; me.give('red'); me.giveFrag('atom'); }, { r: 1.7, show: () => S.drained && !IT.red });
    add(16.5, 12.5, '사격대', () => S.frag.rocket ? toast(`표적 완파. 🚀 = ${S.digits.rocket}`) : artillery(() => me.giveFrag('rocket')), { r: 1.7 });
    for (let i = 0; i < 3; i++) { const d = decorById('lev' + i); add(d.x + .5, d.y + .5, '분기 레버', () => { if (me.train) return; d.st ^= 1; sfx('click'); }, { r: 1.3, show: () => !S.frag.train }); }
    add(8, 71.6, '출발 신호 당기기', () => { if (me.train) return; me.startTrain(); }, { r: 1.6, show: () => !S.frag.train });
    add(12, 78.4, '운행 안내', () => openModal(`<div class="mh"><div><div class="mk">KRRI · 철도 시험선</div><h3>운행 안내</h3></div><button class="x" data-close>✕</button></div><div class="q">화물열차는 <b>위 선로 서쪽</b>에서 출발해 <b>위 선로 동쪽 끝 화물역</b>에 서야 한다.<br>분기 레버를 <b>교차</b>로 두면 그 지점에서 다른 선로로 옮겨 탄다.<br>노란 <b>선로 보수 중</b> 구간은 지나갈 수 없다.</div><canvas id="trk" width="900" height="150" style="width:100%;border-radius:10px;border:2px solid var(--ink)"></canvas><button class="btn" data-close>확인</button>`, { onopen: drawTrackDiagram }), { r: 1.6 });
    add(117.5, 61.6, '퓨즈함', () => { if (IT.fuse) return; if (!IT.driver) { toast('나사 4개로 단단히 잠겨 있다. <b>드라이버</b>가 필요하다.'); return; } me.give('fuse'); }, { r: 1.5, show: () => !IT.fuse });
    add(83, 38.5, '점화 장치', () => { if (S.fusion) return; if (!IT.fuse) { toast('퓨즈 소켓이 비어 있다. <b>고압 퓨즈</b>를 구해 오자.'); return; } ignition(() => me.fusionOn()); }, { r: 1.8, show: () => !S.fusion });
    add(106.3, 24.6, '보안 금고', () => { if (!IT.order) me.give('order'); showOrder(); }, { r: 1.6 });
    add(64.5, 28.4, '탈출 코드 입력', () => finalPanel(), { r: 1.8 });
    VENTS.forEach(v => { add(v[0], v[1], '환풍구', () => me.vent(v[2], v[3]), { r: 1.2 }); add(v[2], v[3], '환풍구', () => me.vent(v[0], v[1]), { r: 1.2 }); });
  },
  camTarget() { const tr = this.train; if (tr && (tr.state === 'run' || tr.t < 1.6)) return [tr.x, tr.y]; return null; },
  vent(x, y) { if (!STATE.items.driver) { toast('나사로 잠긴 환풍구. <b>드라이버</b>가 있으면 열 수 있다.'); return; } sfx('vent'); fxBurst(PL.x, PL.y, '#9AA6B8', 10); PL.x = x; PL.y = y + 0.9; CAM.x = PL.x * T; CAM.y = PL.y * T; fxBurst(PL.x, PL.y, '#9AA6B8', 10); toast('환풍구로 이동!', 1200); },
  give(k) { STATE.items[k] = true; sfx('item'); const I = ITEMS[k]; banner(`${I.i} ${I.n} 획득`, I.d); fxBurst(PL.x, PL.y, '#FFD24A', 22); },
  giveFrag(k) { STATE.frag[k] = true; const F = FRAGS[k]; later(() => { sfx('win'); banner(`${F.i} ${F.n} = ${STATE.digits[k]}`, '탈출 코드 숫자 하나를 찾았다'); }, STATE.items.red && k === 'atom' ? 2300 : 0); },
  powerOn() { STATE.power = true; SHAKE = 0.8; sfx('zap'); banner('⚡ 전력 복구!', '불이 켜지고 전력 잠금 문(노란 문)이 열린다'); },
  fusionOn() { STATE.fusion = true; SHAKE = 1; sfx('win'); banner('KSTAR 점화 성공', '통합 관제실(로비 가운데) 문이 열렸다'); },
  // ------------------------------------------------------------ 갱신
  update(dt, hit) {
    const S = STATE; this.saveT = (this.saveT || 0) + dt; if (this.saveT > 4) { this.saveT = 0; this.save(); }
    // 레이저
    this.beam = S.power ? traceBeam() : []; if (S.power && !S.laserOK && this.beamHit) { S.laserOK = true; sfx('ok'); banner('레이저 정렬 완료', '천문 관측실(KASI) 분홍 문이 열렸다'); }
    // 압력판
    if (!decorById('gdoor').off && PLATES.every(([x, y]) => PUSH.some(p => p.x === x && p.y === y))) { decorById('gdoor').off = true; bakeSolids(); sfx('ok'); toast('딸깍! 압력판 2개가 눌려 유리문이 열렸다.'); }
    // 배수
    if (S.drainT >= 0 && !S.drained) { S.drainT += dt; if (S.drainT > 3) { S.drained = true; toast('연구로 수조의 물이 다 빠졌다. 가운데 단상으로 갈 수 있다!'); } }
    // UV
    if (S.items.uv && !S.codeSeen && Math.hypot(PL.x - 71.5, PL.y - 27) < 3.5) { S.codeSeen = true; sfx('ok'); toast(`UV 빛에 숨은 글씨가 떠올랐다: <b>접속번호 ${S.uvCode}</b>`, 4000); }
    // 컨베이어 압착
    const ci = gi(Math.floor(PL.x), Math.floor(PL.y));
    if (G[ci] === TL.CONV && hit.x && (wallAt(hit.x[0], hit.x[1]) || SOLID[gi(hit.x[0], hit.x[1])])) { sfx('bad'); SHAKE = .5; PL.x = 111.5; PL.y = 48.7; S.pen += 5; toast(wallAt(hit.x[0], hit.x[1]) ? '압착기에 밀려 입구로 튕겨났다! (+5초)' : '로봇 팔에 부딪혀 튕겨났다! (+5초)'); }
    // 보안 레이저
    for (const g of GATES) if (gateActive(g) && Math.abs(PL.x - (g.x + .5)) < .5 + PL.r - .12 && PL.y > g.y0 - .2 && PL.y < g.y1 + 1.2) { this.zap(); break; }
    for (const w of SWEEPS) { const x = sweepX(w); if (x !== null && Math.abs(PL.x - x) < PL.r + .1 && PL.y > w.y0 && PL.y < w.y1 + 1) { this.zap(); break; } }
    // 열차
    if (this.train) this.stepTrain(dt); PL.frozen = !!this.camTarget();
    // 승리 체크 X (finalPanel)
  },
  zap() { if (STATE.t < (this.zapT || 0)) return; this.zapT = STATE.t + 1.5; sfx('zap'); SHAKE = .6; const y = PL.y; const cp = y >= 36.5 ? [105.6, 38.5] : y >= 31.5 ? [117.5, 34] : y >= 26.5 ? [105.5, 31.5] : [117.6, 26.5]; PL.x = cp[0]; PL.y = cp[1]; STATE.pen += 3; toast('보안 레이저 감지! 구역 입구로 송환 (+3초)', 1600); },
  startTrain() { const tr = { x: 6, tr: 'up', y: TRACK.up + .5, sw: -1, state: 'run', t: 0 }; this.train = tr; STATE.trainRun = true; sfx('whistle'); toast('뿌우— 화물열차 출발!'); },
  stepTrain(dt) {
    const tr = this.train; tr.t += dt;
    if (tr.state === 'crash' || tr.state === 'end') { if (tr.t > 1.6) { this.train = null; STATE.trainRun = false; } return; }
    if (tr.state === 'done') return;
    tr.x += dt * 8;
    // 분기
    TRACK.sw.forEach((sx, i) => { if (tr.x >= sx && tr.sw < i) { tr.sw = i; if (decorById('lev' + i).st) { tr.from = tr.tr; tr.tr = tr.tr === 'up' ? 'lo' : 'up'; tr.cx = sx; } } });
    const ty = TRACK[tr.tr] + .5; if (tr.cx !== undefined && tr.x < tr.cx + 3) { const k = (tr.x - tr.cx) / 3; tr.y = TRACK[tr.from] + .5 + (ty - TRACK[tr.from] - .5) * k; } else tr.y = ty;
    for (const b of TRACK.block) if (b.tr === tr.tr && tr.x + 2 >= b.x0 && tr.x < b.x1 && !(tr.cx !== undefined && tr.x < tr.cx + 3)) { tr.state = 'crash'; tr.t = 0; SHAKE = .8; sfx('thud'); toast('끼익! 선로 보수 구간에 막혔다. 분기 레버를 다시 맞추자.'); return; }
    if (tr.tr === 'up' && tr.x >= 108) { tr.state = 'done'; tr.t = 0; sfx('ok'); this.giveFrag('train'); return; }
    if (tr.x >= TRACK.x1 - 3) { tr.state = 'end'; tr.t = 0; toast('아래 선로 끝에 섰다. 화물역은 <b>위 선로</b>에 있다.'); }
  },
  // ------------------------------------------------------------ 그리기
  drawUnder() {
    // 압력판
    for (const [x, y] of PLATES) { const on = PUSH.some(p => p.x === x && p.y === y); rr(x * T + 4, y * T + 4, T - 8, T - 8, 6, on ? '#7CFF8A' : '#2FA84F', OL, 2.5); txt(on ? '✓' : '▼', x * T + T / 2, y * T + T / 2, 16, OL, 900); }
    // 선로
    // 배수 중 물 줄어듦 효과
    if (STATE.drainT >= 0 && !STATE.drained) { ctx.fillStyle = `rgba(255,255,255,${0.15 * Math.sin(STATE.t * 10) + 0.15})`; ctx.fillRect(83 * T, 51 * T, 13 * T, 9 * T); }
  },
  drawMid() {
    const S = STATE;
    // 레이저 빔
    if (this.beam.length > 1) { ctx.save(); ctx.shadowColor = '#FF2A6A'; ctx.shadowBlur = 14; ctx.strokeStyle = '#FF4A7A'; ctx.lineWidth = 5; ctx.beginPath(); this.beam.forEach(([x, y], k) => k ? ctx.lineTo(x * T, y * T) : ctx.moveTo(x * T, y * T)); ctx.stroke(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore(); }
    // 김치독 숫자
    for (const d of DEC) if (d.t === 'jar' && Math.hypot(PL.x - d.x, PL.y - d.y) < 13) tag(d.days + '일', (d.x + d.w / 2) * T, (d.y + d.h / 2) * T, d.open ? '#E0533F' : '#FFF4C2', d.open ? '#fff' : OL, 13);
    // 바닥 아이템
    if (!S.items.uv && decorById('gdoor')) { const b = Math.sin(S.t * 4) * 3; circ(19.5 * T, 58.5 * T + b, 16, 'rgba(192,132,252,.35)'); txt('🔦', 19.5 * T, 58.5 * T + b, 22, OL, 900); }
    if (S.drained && !S.items.red) { const b = Math.sin(S.t * 4) * 3; tag('🟥 ⚛', 89.5 * T, 54.6 * T + b, '#E0533F', '#fff', 14); }
    // 열차
    const tr = this.train; if (tr) drawTrain(tr);
    else if (!S.frag.train) drawTrain({ x: 6, y: TRACK.up + .5 });
    // UV 비춤
    if (S.items.uv) { const d = Math.hypot(PL.x - 71.5, PL.y - 27); if (d < 6) { ctx.globalAlpha = clamp(1 - d / 6, 0, 1); circ(71.5 * T, 27.3 * T, 70, 'rgba(192,132,252,.28)'); ctx.globalAlpha = 1; } }
  },
  drawTop() {
    for (const w of SWEEPS) { const sx = sweepX(w); if (sx === null) { const per = w.mv + w.off, p = ((STATE.t + w.ph * per) % per); if (p > per - .6 && Math.sin(STATE.t * 30) > 0) { ctx.setLineDash([6, 8]); line(w.x0 * T, w.y0 * T, w.x0 * T, (w.y1 + 1) * T, 'rgba(255,90,70,.8)', 3); ctx.setLineDash([]); } continue; } const X = sx * T; ctx.save(); ctx.shadowColor = '#FF2A2A'; ctx.shadowBlur = 18; line(X, w.y0 * T + 4, X, (w.y1 + 1) * T - 4, '#FF4A3A', 5); ctx.restore(); circ(X, w.y0 * T + 4, 6, '#2B2B3A', OL, 2); circ(X, (w.y1 + 1) * T - 4, 6, '#2B2B3A', OL, 2); }
    // 정전 중 비상등 (복도 따라 깜박이는 붉은 등 — 어둠 속 길잡이)
    if (!STATE.power) { const on = Math.sin(STATE.t * 3) > -0.3; for (const c of CORR) { const hor = c[2] - c[0] > c[3] - c[1]; for (let k = 0; ; k += 6) { const x = hor ? c[0] + k + .5 : c[0] + .2, y = hor ? c[1] + .2 : c[1] + k + .5; if ((hor ? x : y) > (hor ? c[2] : c[3])) break; if (Math.hypot(x - PL.x, y - PL.y) > 14) continue; ctx.globalAlpha = on ? .9 : .35; circ(x * T, y * T, 5, '#FF4A3A'); ctx.globalAlpha = on ? .25 : .08; circ(x * T, y * T, 18, '#FF4A3A'); ctx.globalAlpha = 1; } } }
    // 목표 방 화살표 (힌트 사용 후)
    if (this.arrowTo && STATE.clock - this.arrowT < 12) { const [tx, ty] = this.arrowTo; const a = Math.atan2(ty - PL.y, tx - PL.x), d = Math.hypot(tx - PL.x, ty - PL.y); if (d > 3) { const X = PL.x * T + Math.cos(a) * 70, Y = PL.y * T + Math.sin(a) * 70; ctx.save(); ctx.translate(X, Y); ctx.rotate(a); ctx.fillStyle = '#FFD24A'; ctx.strokeStyle = OL; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(-10, -12); ctx.lineTo(-4, 0); ctx.lineTo(-10, 12); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); } }
  },
  fogHoles(f) {
    // 전력 복구 전: 밝은 방은 시야 폴리곤 밖이어도 어둡지 않게(벽 너머는 보이지 않음)
  },
  mapMarks(c, ox, oy, s, opt) {
    const tk = curTask(); if (tk) { const [x, y] = tk.at; c.strokeStyle = '#FFD24A'; c.lineWidth = 3; c.setLineDash([5, 4]); c.beginPath(); c.arc(ox + x * s, oy + y * s, Math.max(6, s * 2.6), 0, 7); c.stroke(); c.setLineDash([]); }
    if (opt && opt.big) { for (const b of TRACK.block) { c.fillStyle = 'rgba(245,197,66,.8)'; c.fillRect(ox + b.x0 * s, oy + (TRACK[b.tr] - .3) * s, (b.x1 - b.x0) * s, s * 1.6); } c.fillStyle = '#C9D1DE'; for (const v of VENTS) { c.fillRect(ox + v[0] * s - 3, oy + v[1] * s - 3, 6, 6); c.fillRect(ox + v[2] * s - 3, oy + v[3] * s - 3, 6, 6); } }
  },
  mapLegend() { return Object.entries(LOCKC).map(([k, c]) => `<span class="pill" style="border-left:6px solid ${c}">${{ power: '전력', blue: '블루 카드', green: '그린 카드', red: '레드 카드', laser: '레이저', fusion: '핵융합' }[k]} 잠금</span>`).join('') + '<span class="pill">▪ 환풍구(드라이버)</span><span class="pill">◌ 지금 목표</span>'; },
  hint() {
    const tk = curTask(); if (!tk) return; const me = this; const R = ROOMS[RID[tk.room]]; const paid = (STATE.paid = STATE.paid || {})[tk.id];
    openModal(`<div class="mh"><div><div class="mk">힌트</div><h3>지금 할 일</h3></div><button class="x" data-close>✕</button></div><p class="q"><b>${R.s} · ${R.n}</b>에서 「${tk.t}」. 지도(M)에 노란 점선 원으로 표시돼 있다. <small class="note">여기까지는 무료.</small></p><div id="hdeep">${paid ? `<p class="q" style="background:#FFF4C2;border-radius:10px;padding:10px">${tk.h}</p>` : ''}</div><div class="row">${paid ? '<button class="btn ghost" id="harrow">화살표 다시 보기</button>' : '<button class="btn ghost" id="hmore">자세한 풀이 + 방향 화살표 (+60초)</button>'}<button class="btn" data-close>혼자 해 볼게</button></div>`, { nofocus: true, hint: true });
    if (paid) { $('#harrow').onclick = () => { me.arrowTo = tk.at; me.arrowT = STATE.clock; closeModal(); }; return; }
    $('#hmore').onclick = () => { STATE.paid[tk.id] = 1; STATE.hints++; STATE.pen += 60; me.arrowTo = tk.at; me.arrowT = STATE.clock; $('#hdeep').innerHTML = `<p class="q" style="background:#FFF4C2;border-radius:10px;padding:10px">${tk.h}</p><p class="note">노란 화살표가 12초 동안 방향을 가리킨다.</p>`; $('#hmore').remove(); };
  },
  hud() {
    const S = STATE; $('#ht').textContent = fmtT(S.clock + S.pen); $('#hlab').innerHTML = S.pen ? `시간 <span style="color:#FF8A7A">+${S.pen}초</span>` : '시간';
    const r = roomAt(PL.x, PL.y); $('#hloc').textContent = r ? `${r.s} · ${r.n}` : MAP.corrName || '복도';
    const key = TASKS.map(t => (t.done() ? 1 : t.need() ? 2 : 0)).join('') + Object.keys(S.items).join() + Object.keys(S.frag).join();
    if (key !== this._hk) { this._hk = key; S.splits = S.splits || {}; for (const t of TASKS) if (t.done() && S.splits[t.id] === undefined) S.splits[t.id] = Math.floor(S.clock + S.pen); renderTasks(); renderInv(); }
  },
  actLabel() { return '사용'; },
};
// 보안 미로 이동식 레이저 (좌우로 쓸고 지나감)
// 한 방향으로 쓸고 지나간 뒤 잠깐 꺼짐 → 빔 뒤를 따라가면 통과
const SWEEPS = [{ y0: 27, y1: 30, x0: 107, x1: 117.6, mv: 2.2, off: 2.6, ph: 0 }, { y0: 24, y1: 25, x0: 118.6, x1: 108.4, mv: 2.0, off: 2.4, ph: .5 }];
function sweepX(w) { const per = w.mv + w.off, p = ((STATE.t + w.ph * per) % per); return p < w.mv ? w.x0 + (w.x1 - w.x0) * p / w.mv : null; }
// 보울더 시작 위치 (soko.py로 풀이 검증)
let BOULDERS = [[4, 30], [7, 29], [10, 30], [8, 32]];  // 4개 중 3개만 필요 · 순서를 잘못 고르면 막힘
// ---------------------------------------------------------------- 임무 목록
const TASKS = [
  { id: 'power', room: 'keri', t: '주 차단기 회로 복구', at: [35.5, 25], need: () => true, done: () => STATE.power, h: '전력 제어실(KERI) 북쪽 벽 <b>주 차단기</b>를 조사하자. 타일을 눌러 돌려서 왼쪽 전원과 오른쪽 출력을 이으면 된다.' },
  { id: 'driver', room: 'kigam', t: '바위를 밀어 공구함 꺼내기', at: [8, 34], need: () => true, done: () => !!STATE.items.driver, h: '지질 표본창고(KIGAM) 바위 울타리 안 바위 4개 중 3개를 공구함 앞 구덩이 3칸(세로)에 밀어 넣자. 구덩이 바로 위 칸에서 아래로 밀어야 한다. 바위 쪽으로 계속 걸으면 밀린다. 순서를 잘못 고르면 막히니 꼬이면 오른쪽 <b>원위치</b> 버튼. 팁: 구덩이 바로 위를 막고 있는 바위부터.' },
  { id: 'blue', room: 'etri', t: '안테나 신호 따라 하기', at: [111.5, 13], need: () => true, done: () => !!STATE.items.blue, h: '통신 안테나실(ETRI) <b>안테나 제어</b>판. 접시 안테나가 깜박인 색 순서를 그대로 누르자. 3라운드.' },
  { id: 'laser', room: 'kriss', t: '거울로 레이저 정렬', at: [64, 9], need: () => STATE.power, done: () => STATE.laserOK, h: '표준 측정실(KRISS) 거울 5개는 조사할 때마다 / → \\ → 통과(○) 순으로 바뀐다. 빔이 가는 길을 막는 거울은 통과로 두고, 빔을 센서(오른쪽 아래)까지 세 번 꺾어 보내자.' },
  { id: 'star', room: 'kasi', t: '망원경으로 별자리 찾기', at: [40, 12], need: () => STATE.laserOK, done: () => !!STATE.frag.star, h: '천문 관측실(KASI) 오른쪽 아래 <b>성도</b>로 목표 별자리 모양을 확인 → <b>관측 돔</b>에서 하늘을 끌어 그 별자리를 가운데 원에 넣고 촬영.' },
  { id: 'uv', room: 'kribb', t: '화분 밀어 압력판 누르기', at: [9, 58], need: () => !!STATE.items.blue, done: () => !!STATE.items.uv, h: '바이오 온실(KRIBB) 화분 2개를 초록 압력판 2곳에 올리면 유리 온실 문이 열린다. 안에 UV 손전등.' },
  { id: 'code', room: 'lobby', t: 'UV로 숨은 글씨 찾기', at: [71.5, 27], need: () => !!STATE.items.uv, done: () => STATE.codeSeen, h: 'UV 손전등을 들고 <b>중앙 로비 오른쪽 위 안내판</b> 가까이 가 보자.' },
  { id: 'green', room: 'kisti', t: '슈퍼컴 접속 → 그린 카드', at: [89.5, 5], need: () => STATE.power, done: () => !!STATE.items.green, h: '슈퍼컴퓨터실(KISTI) 맨 위 <b>콘솔</b>에 4자리 접속번호를 넣자. 번호는 UV로만 보이는 곳에 있다.' },
  { id: 'handle', room: 'wikim', t: '숙성 일지대로 독 열기', at: [39, 55], need: () => !!STATE.items.green, done: () => !!STATE.items.handle, h: '김치 발효고(WiKim) 왼쪽 위 <b>숙성 일지</b>를 읽고 조건에 맞는 독을 열자. 독 위 숫자가 숙성 일수. 틀리면 느려지고 +10초.' },
  { id: 'pipes', room: 'krict', t: '배관 잇고 배수 밸브 열기', at: [64, 57], need: () => !!STATE.items.blue, done: () => STATE.valveSet, h: '화학 플랜트(KRICT) <b>배관 제어</b>로 물길을 잇고, 오른쪽 <b>밸브</b>에 밸브 핸들(김치 발효고)을 꽂자.' },
  { id: 'red', room: 'kaeri', t: '연구로 노심에서 카드 회수', at: [89.5, 55], need: () => !!STATE.items.green, done: () => !!STATE.items.red, h: '연구로 수조(KAERI)는 물이 빠져야 가운데 단상에 갈 수 있다. 배수는 화학 플랜트에서.' },
  { id: 'rocket', room: 'kari', t: '포격으로 표적 3개 맞히기', at: [16.5, 11], need: () => !!STATE.items.red, done: () => !!STATE.frag.rocket, h: '발사 시험장(KARI) <b>사격대</b>. 각도·세기를 맞추고 바람(화살표)만큼 보정하자.' },
  { id: 'train', room: 'krri', t: '분기 맞춰 화물열차 보내기', at: [8, 71], need: () => !!STATE.items.red, done: () => !!STATE.frag.train, h: '철도 시험선(KRRI) <b>운행 안내</b>를 보고 레버 3개를 맞춘 뒤 서쪽 끝 <b>출발 신호</b>. 보수 구간을 피해 위 선로 동쪽 화물역으로.' },
  { id: 'fuse', room: 'kimm', t: '컨베이어 건너 퓨즈 꺼내기', at: [117.5, 61], need: () => STATE.power, done: () => !!STATE.items.fuse, h: '로봇 공장(KIMM) 컨베이어는 두 줄씩 방향이 반대. 벨트에 실려 벽이나 로봇 팔에 부딪히면 입구로 튕겨난다. 벨트 사이 안전 줄에서 쉬며 길을 고르자. 오른쪽 아래 퓨즈함은 <b>드라이버</b>로 연다.' },
  { id: 'fusion', room: 'kfe', t: '퓨즈 꽂고 플라즈마 점화', at: [83, 38], need: () => STATE.power, done: () => STATE.fusion, h: '핵융합 실험동(KFE) 왼쪽 아래 <b>점화 장치</b>. 퓨즈를 꽂고 바늘이 초록 구간에 있을 때 3번 연속 점화.' },
  { id: 'order', room: 'nsr', t: '보안 레이저 미로 통과', at: [106, 25], need: () => !!STATE.items.green, done: () => !!STATE.items.order, h: '보안 미로(NSR)는 지그재그로 위로 올라간다. 빨간 레이저 벽은 꺼진 순간(점선 깜박임 뒤) 지나가고, 위쪽 두 구역은 좌우로 쓸고 다니는 레이저를 피해 지나가자. 닿으면 그 구역 입구로 돌아간다. 맨 위 왼쪽 금고에 순서표.' },
  { id: 'final', room: 'ctrl', t: '관제실에서 탈출 코드 입력', at: [64.5, 28], need: () => STATE.fusion, done: () => STATE.win, h: '조각 4개(★⚛🚀🚂)의 숫자를 <b>순서표</b>의 기호 순서대로 관제실 모니터 벽에 입력하자.' },
];
function curTask() { return TASKS.find(t => t.need() && !t.done()); }
function renderTasks() {
  const av = TASKS.filter(t => t.need() || t.done()), lock = TASKS.length - av.length, done = TASKS.filter(t => t.done()).length;
  $('#tasks').innerHTML = `<div class="tk-h"><b>임무</b><span>${done}/${TASKS.length}</span></div><div class="tk-bar"><i style="width:${done / TASKS.length * 100}%"></i></div>` + av.map(t => `<div class="tk${t.done() ? ' ok' : ''}"><em>${ROOMS[RID[t.room]].s}</em>${t.t}</div>`).join('') + (lock ? `<div class="tk lock">🔒 잠긴 임무 ${lock}개</div>` : '');
}
function renderInv() {
  const S = STATE; let h = '';
  for (const k in ITEMS) if (S.items[k]) h += `<span class="iv" title="${ITEMS[k].n} — ${ITEMS[k].d}">${ITEMS[k].i}<small>${ITEMS[k].n}</small></span>`;
  for (const k in FRAGS) h += `<span class="iv fr${S.frag[k] ? '' : ' no'}" title="${FRAGS[k].n}">${FRAGS[k].i}<b>${S.frag[k] ? S.digits[k] : '?'}</b></span>`;
  $('#inv').innerHTML = h;
}
// ---------------------------------------------------------------- 레이저 추적
function traceBeam() {
  let x = 56, y = 11, dx = 1, dy = 0; const pts = [[55.9, 11.5]]; ESC.beamHit = false;
  for (let n = 0; n < 80; n++) {
    const t = G[gi(x, y)]; if (t === TL.WALL || t === TL.DOOR || GR[gi(x, y)] !== RID.kriss) { pts.push([x + .5 - dx * .5, y + .5 - dy * .5]); break; }
    const m = DEC.find(d => d.t === 'mirror' && d.x === x && d.y === y);
    if (m && m.st !== 2) { pts.push([x + .5, y + .5]); if (m.st) {[dx, dy] = [-dy, -dx]; } else {[dx, dy] = [dy, dx]; } }
    else if (x === 68 && y === 15) { pts.push([x + .5, y + .5]); ESC.beamHit = true; break; }
    else if (SOLID[gi(x, y)] && !m) { pts.push([x + .5 - dx * .5, y + .5 - dy * .5]); break; }
    x += dx; y += dy;
  }
  return pts;
}
// ---------------------------------------------------------------- 열차
function drawTrain(tr) {
  const X = tr.x * T, Y = tr.y * T; const sh = tr.state === 'crash' ? Math.sin(STATE.t * 60) * 3 : 0;
  for (let k = 2; k >= 0; k--) { const cx = X - k * 70 + sh; rr(cx - 32, Y - 20, 64, 40, 8, k ? '#BE123C' : '#13294B', OL, 3); if (!k) { rr(cx + 10, Y - 14, 18, 28, 4, '#7FD3FF', OL, 2); circ(cx + 34, Y, 6, '#FFD24A', OL, 2); } else { rr(cx - 24, Y - 12, 48, 24, 4, '#F2A23A', OL, 2); txt('화물', cx, Y, 12, OL, 900); } }
  if (tr.state === 'run' || tr.state === undefined) { const p = (STATE.t * 2) % 1; circ(X - 10 - p * 30, Y - 30 - p * 20, 8 + p * 10, `rgba(255,255,255,${0.5 - p * 0.5})`); }
}
function drawTrackDiagram() {
  const c = $('#trk'); if (!c) return; const x2 = c.getContext('2d'), s = 900 / 120; x2.fillStyle = '#F4F7FB'; x2.fillRect(0, 0, 900, 150);
  const Y = { up: 45, lo: 105 }; x2.lineWidth = 6; x2.strokeStyle = '#5B6B82'; for (const k of ['up', 'lo']) { x2.beginPath(); x2.moveTo(TRACK.x0 * s, Y[k]); x2.lineTo(TRACK.x1 * s, Y[k]); x2.stroke(); }
  for (const b of TRACK.block) { x2.fillStyle = 'rgba(245,197,66,.9)'; x2.fillRect(b.x0 * s, Y[b.tr] - 14, (b.x1 - b.x0) * s, 28); x2.fillStyle = OL; x2.font = `900 20px ${FONT}`; x2.textAlign = 'center'; x2.fillText('보수 중', (b.x0 + b.x1) / 2 * s, Y[b.tr] + 5); }
  TRACK.sw.forEach((sx, i) => { x2.strokeStyle = 'rgba(14,34,56,.35)'; x2.lineWidth = 3; x2.setLineDash([6, 5]); x2.beginPath(); x2.moveTo(sx * s, Y.up); x2.lineTo((sx + 3) * s, Y.lo); x2.moveTo(sx * s, Y.lo); x2.lineTo((sx + 3) * s, Y.up); x2.stroke(); x2.setLineDash([]); x2.fillStyle = OL; x2.font = `900 20px ${FONT}`; x2.textAlign = 'center'; x2.fillText(`분기${i + 1}`, (sx + 1.5) * s, 75); });
  x2.fillStyle = '#13294B'; x2.fillRect(TRACK.x0 * s - 4, Y.up - 20, 40, 40); x2.fillStyle = '#fff'; x2.font = `900 16px ${FONT}`; x2.fillText('출발', TRACK.x0 * s + 16, Y.up + 4);
  x2.fillStyle = '#2FA84F'; x2.fillRect(108 * s, Y.up - 20, 60, 40); x2.fillStyle = '#fff'; x2.fillText('화물역', 108 * s + 30, Y.up + 4);
}
