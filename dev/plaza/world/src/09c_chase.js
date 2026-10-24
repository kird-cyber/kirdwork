// ================================================================ 모드 3: 탈출전 — 나+동료 봇 3 vs 위조탱
const TERMSPOTS = [
  { x: 32.5, y: 12.5, n: '관측 기록기', room: 'kasi' }, { x: 89.5, y: 5.6, n: '슈퍼컴 콘솔', room: 'kisti' }, { x: 111.5, y: 13.6, n: '안테나 제어', room: 'etri' },
  { x: 35.5, y: 25.6, n: '주 차단기', room: 'keri' }, { x: 62.5, y: 57.6, n: '배관 제어', room: 'krict' }, { x: 83, y: 38.6, n: '플라즈마 진단', room: 'kfe' },
  { x: 17.5, y: 29.5, n: '시추 분석기', room: 'kigam' }, { x: 31.5, y: 49.6, n: '숙성 기록기', room: 'wikim' }, { x: 66.5, y: 6.5, n: '정밀 저울', room: 'kriss' },
  { x: 92.5, y: 49.6, n: '방사선 계측', room: 'kaeri' }, { x: 9.5, y: 56.5, n: '생장 모니터', room: 'kribb' }, { x: 108.5, y: 49.5, n: '로봇 제어', room: 'kimm' },
];
const EXITS = [{ x: 8.5, y: 13.6, n: '발사대 탈출구', room: 'kari' }, { x: 112.5, y: 72.6, n: '화물열차 탈출구', room: 'krri' }];
const CAGE = { x: 60.5, y: 78.6 };
const CHASE = {
  name: '탈출전', tasksUI: true, altLabel: '변신', keys: '이동 WASD·방향키 · 사용 E · 변신 Q · 지도 M',
  doorOK(d) { return !(this.locks && this.locks[d.k] > STATE.t); },
  lockColor(d) { return this.locks && this.locks[d.k] > STATE.t ? '#E0533F' : '#8A97AA'; },
  visR() { return 7.5; },
  init() {
    Object.assign(STATE, { mode: 'chase', t: 0, clock: 0, pen: 0, over: false, fixed: 0, need: 5, open: false, left: 360, start: 6 });
    setupOpenWorld(); scatterProps(); this.locks = {}; this.sabT = 40;
    this.terms = shuffle(TERMSPOTS.slice()).slice(0, 7).map(t => Object.assign({ p: 0, done: false, by: null }, t));
    Object.assign(PL, { x: 64.5, y: 38.6, a: -Math.PI / 2, col: 'blue', name: '나', speed: 4.4, disguise: null, paint: null, gone: false, caged: false, out: false, slow: 0, frozen: false, escaped: false });
    this.allies = ['green', 'orange', 'purple'].map((c, k) => mkBot({ x: 61.5 + k * 3, y: 39.6, col: c, name: ['초록', '주황', '보라'][k], st: 'task', ally: true, caged: false, cageT: 0, escaped: false, out: false, brave: rnd(0.3, 0.8) }));
    this.seeker = mkBot({ x: CAGE.x, y: 75.5, col: 'fake', name: '위조탱', st: 'wait', seeker: true, a: -Math.PI / 2, target: null, pause: 0 });
    ENTS = this.allies.concat([this.seeker]); PL.cageT = 0;
    this.buildInter(); CAM.x = PL.x * T; CAM.y = PL.y * T;
  },
  intro() { openModal(`<div class="win"><div class="key">🏃</div><h3>탈출전</h3><p>정체불명의 <b>위조탱</b>이 연구단지에 숨어들었다. 동료 봇 3대와 함께 <b>단말기 7곳 중 5곳</b>을 복구하면 탈출구(발사대 · 화물열차)가 열린다.</p><p>단말기를 고치는 동안에도 시간은 흐른다. 위조탱에게 잡히면 철도 시험선 <b>격리실</b>로 — 45초 안에 동료가 구출해야 한다.<br><b>${COARSE ? '변신 버튼' : 'Q 변신'}</b>: 소품으로 변해 위조탱을 따돌리자(움직이면 풀림). 위조탱은 가끔 <b>문을 잠근다</b>.</p><div class="row"><button class="btn" data-close>작전 개시</button></div></div>`); },
  buildInter() {
    INTER = []; const me = this;
    for (const t of this.terms) INTER.push({ x: t.x, y: t.y, r: 1.6, label: `${t.n} 복구`, show: () => !t.done && !PL.caged && !PL.disguise, act: () => me.repair(t) });
    INTER.push({ x: CAGE.x, y: CAGE.y - 1.6, r: 2.2, label: '격리실 열기', show: () => !PL.caged && this.allies.some(a => a.caged), act: () => me.rescue(PL) });
    for (const ex of EXITS) INTER.push({ x: ex.x, y: ex.y, r: 1.8, label: ex.n, show: () => STATE.open && !PL.caged, act: () => me.escape(PL, ex) });
  },
  repair(t) {
    const S = STATE, me = this; const g = pick(['wire', 'code', 'timing']);
    const ok = () => { me.fixTerm(t, '나'); }; const fail = () => { sfx('alarm'); ring(t.x, t.y, '#E0533F'); me.noise(t.x, t.y); toast('삐— 오류 경보! 위조탱이 소리를 들었다'); };
    if (g === 'wire') rotGrid({ title: t.n + ' 배선', kind: '단말기 복구', w: 4, h: 3, theme: 'power', onSolve: ok, live: true });
    else if (g === 'code') { const code = String(1000 + rndi(9000)); keypad({ title: t.n + ' 인증', kind: '단말기 복구', prompt: `화면 코드 <b class="mono" id="memc">${code}</b> — 2초 뒤 사라진다, 외워서 입력`, len: 4, theme: 'term', check: c => c === code, onOK: ok, fail: '코드 오류!', onFail: fail, live: true }); modalLater(() => { const m = $('#memc'); if (m) m.textContent = '* * * *'; }, 2000); }
    else ignition(ok, { need: 2, kind: '단말기 복구', title: t.n + ' 재부팅', live: true, onFail: fail });
  },
  fixTerm(t, who) { if (t.done) return; t.done = true; t.p = 1; STATE.fixed++; sfx('ok'); fxBurst(t.x, t.y, '#7CFF8A', 18); toast(`${who === '나' ? '' : who + ' 탱크가 '}${t.n} 복구! (${STATE.fixed}/${STATE.need})`); this.noise(t.x, t.y, 0.4);
    if (STATE.fixed >= STATE.need && !STATE.open) { STATE.open = true; sfx('win'); banner('탈출구 개방!', '발사대(KARI) · 화물열차(KRRI)로 달려라'); } },
  noise(x, y, p) { const s = this.seeker; if (s.st === 'chase' && s.target && Math.random() > (p || 1) * .3) return; if (Math.random() < (p || 1)) { s.st = 'investigate'; botGo(s, x + rnd(-1, 1), y + rnd(-1, 1)); } },
  alt() {
    if (PL.caged || STATE.over) return;
    if (PL.disguise) { PL.disguise = null; return; }
    if ((this.dcd || 0) > STATE.t) { toast(`변신 재사용까지 ${Math.ceil(this.dcd - STATE.t)}초`, 900); return; }
    PL.disguise = { k: pick(propsHere(PL.x, PL.y)) }; this.dcd = STATE.t + 8; sfx('vent'); fxBurst(PL.x, PL.y, '#fff', 12);
    const s = this.seeker; if (sees(s, PL.x, PL.y, 1.7, 8)) { toast('변신하는 걸 들켰다!'); } else if (s.target === PL) { s.target = null; s.st = 'investigate'; botGo(s, PL.x + rnd(-2, 2), PL.y + rnd(-2, 2)); }
  },
  drawDisguise(e) { drawProp(e.disguise.k, e.x * T, e.y * T); if (e === PL) tag('나', e.x * T, e.y * T - 34, '#FFD24A', OL, 11); },
  catch(v) {
    const s = this.seeker; sfx('bad'); SHAKE = .8; v.disguise = null; v.caged = true; v.cageT = 45; v.path = null; v.goal = null; if (v.term) v.term.by = null; v.term = null; v.st = 'task'; const k = [PL].concat(this.allies).filter(a => a.caged).length - 1;
    v.x = CAGE.x - 1.5 + (k % 4); v.y = CAGE.y + 0.1; if (v === PL) { CAM.x = PL.x * T; CAM.y = PL.y * T; banner('잡혔다!', '격리실에서 동료를 기다리자 (45초)'); } else toast(`${v.name} 탱크가 잡혀 격리실로…`);
    s.target = null; s.st = 'pause'; s.pause = 2.2; s.guard = 4;
  },
  rescue(by) { const plWas = PL.caged; for (const a of [PL].concat(this.allies)) if (a.caged && !a.out) { a.caged = false; a.y = CAGE.y - 2.4; a.x += rnd(-.4, .4); a.path = null; a.goal = null; a.st = 'task'; a.term = null; } sfx('ok'); ring(CAGE.x, CAGE.y, '#7CFF8A'); toast(by === PL ? '격리실을 열었다! 다 같이 흩어지자' : `${by.name} 탱크가 격리실을 열었다!`); if (plWas && by !== PL) banner('구출됐다!', '다시 단말기로'); this.noise(CAGE.x, CAGE.y, 0.7); },
  escape(v, ex) { v.escaped = true; v.gone = true; sfx('win'); fxBurst(ex.x, ex.y, '#FFD24A', 26); if (v === PL) { PL.gone = true; this.finish(true); } else toast(`${v.name} 탱크 탈출!`); },
  finish(win) {
    const S = STATE; if (S.over) return; S.over = true; const esc = this.allies.filter(a => a.escaped).length;
    later(() => { openModal(`<div class="win"><div class="key">${win ? '🚀' : '🔒'}</div><h3>${win ? '탈출 성공!' : '위조탱 승리'}</h3><p>${win ? `동료 ${esc}대도 함께 탈출` : '모두 격리실에 갇혔다'} · 복구한 단말기 ${S.fixed}곳 · ${fmtT(S.clock)}</p>${kirdFact()}<div class="row"><button class="btn" id="again">다시 하기</button><button class="btn ghost" id="tomenu">모드 선택</button></div></div>`, { sticky: true }); $('#again').onclick = () => { closeModal(); startMode('chase'); }; $('#tomenu').onclick = () => { closeModal(); showMenu(); }; }, 1000);
  },
  update(dt) {
    const S = STATE; if (S.over) return; const s = this.seeker; const surv = [PL].concat(this.allies);
    if (PL.disguise && PL.moving) { PL.disguise = null; toast('움직여서 변신이 풀렸다', 900); }
    S.left -= dt; if (S.left <= 0) { this.finish(false); return; }
    // 격리 타이머
    for (const a of surv) if (a.caged && !a.out) { a.cageT -= dt; if (a.cageT <= 0) { a.out = true; a.gone = a !== PL; if (a === PL) { banner('탈락', '격리 시간이 끝났다'); this.finish(false); return; } toast(`${a.name} 탱크 탈락…`); } }
    if (surv.every(a => a.caged || a.out || a.escaped) && !PL.escaped) { if (PL.caged || PL.out) { this.finish(false); return; } }
    // 사보타주: 문 잠금
    this.sabT -= dt; if (this.sabT <= 0 && S.start <= 0) { this.sabT = 38 + rnd(0, 12); const near = DOORLIST.filter(d => d.lock !== 'fusion').sort((a, b) => Math.hypot(a.x0 - PL.x, a.y0 - PL.y) - Math.hypot(b.x0 - PL.x, b.y0 - PL.y)).slice(0, 6); shuffle(near).slice(0, 3).forEach(d => this.locks[d.k] = S.t + 9); sfx('alarm'); toast('⚠ 위조탱이 근처 문 3개를 9초 동안 잠갔다!'); }
    // 위조탱
    if (S.start > 0) { S.start -= dt; if (S.start <= 0) { s.st = 'patrol'; banner('위조탱 출현', '철도 시험선 쪽에서 움직이기 시작했다'); } }
    else this.seekerAI(dt, surv);
    // 동료
    for (const a of this.allies) if (!a.caged && !a.gone) this.allyAI(a, dt);
    // 플레이어 근처에서 동료 수리 진행 표시는 drawMid
  },
  seekerAI(dt, surv) {
    const s = this.seeker; if (s.st === 'pause') { s.pause -= dt; if (s.pause <= 0) { s.st = s.guard > 0 ? 'guard' : 'patrol'; s.goal = null; } return; }
    // 보이는 생존자
    let best = null, bd = 1e9; for (const v of surv) { if (v.caged || v.gone || v.out) continue; const d = Math.hypot(v.x - s.x, v.y - s.y); const dis = v.disguise && d > 1.4; if (dis) continue; if (sees(s, v.x, v.y, 1.7, 8.5) && d < bd) { bd = d; best = v; } }
    if (best) { if (s.target !== best) { s.target = best; if (best === PL) { sfx('alarm'); toast('위조탱이 나를 봤다! 도망쳐!', 1200); } } s.st = 'chase'; s.lastSeen = [best.x, best.y]; s.lostT = 0; }
    if (s.st === 'chase') {
      const v = s.target; s.pathT -= dt; if (s.pathT <= 0) { s.pathT = 0.35; botGo(s, s.lastSeen[0], s.lastSeen[1]); }
      const done = botStep(s, dt, 4.4); if (v && !v.caged && Math.hypot(v.x - s.x, v.y - s.y) < 0.8 && !(v.disguise)) { if (v === PL && MODAL) closeModal(); this.catch(v); return; }
      if (!best) { s.lostT = (s.lostT || 0) + dt; if (done) s.a += dt * 3; if (s.lostT > 3.5) { s.st = 'patrol'; s.target = null; s.goal = null; } }
      return;
    }
    if (s.st === 'investigate') { if (botStep(s, dt, 4.1)) { s.st = 'look'; s.look = 1.8; } return; }
    if (s.st === 'look') { s.look -= dt; s.a += dt * 2.6; if (s.look <= 0) { s.st = 'patrol'; s.goal = null; } return; }
    if (s.st === 'guard') { s.guard -= dt; if (!s.goal || botStep(s, dt, 3)) { botGo(s, CAGE.x + rnd(-6, 6), CAGE.y - 3 + rnd(-1, 1)); } if (s.guard <= 0) { s.st = 'patrol'; s.goal = null; } return; }
    // 순찰: 미복구 단말기 위주
    if (!s.goal || !s.path) { const caged = surv.some(v => v.caged); let tx, ty; if (caged && Math.random() < .3) { tx = CAGE.x + rnd(-4, 4); ty = CAGE.y - 3; } else { const open = this.terms.filter(t => !t.done); const t = open.length && Math.random() < .7 ? pick(open) : null; if (t) { tx = t.x; ty = t.y + 1; } else[tx, ty] = randFloor(pick(ROOMS).id); } botGo(s, tx, ty); if (!s.path) s.goal = null; }
    else if (botStep(s, dt, 3.6)) { s.st = 'look'; s.look = 1.2; }
  },
  allyAI(a, dt) {
    const s = this.seeker, S = STATE; const ds = Math.hypot(s.x - a.x, s.y - a.y); const seen = S.start <= 0 && (ds < 2.5 ? los(a.x, a.y, s.x, s.y) : sees(s, a.x, a.y, 1.9, 7));
    if (a.st === 'hidep') { a.hT -= dt; if (ds < 1.6 || a.hT <= 0) { a.disguise = null; a.st = 'task'; a.goal = null; } return; }
    if (seen && a.st !== 'flee') { // 도망 or 변신
      if (s.target !== a && Math.random() < 0.45 && ds > 3) { a.disguise = { k: pick(propsHere(a.x, a.y)) }; a.st = 'hidep'; a.hT = rnd(4, 8); a.path = null; return; }
      a.st = 'flee'; a.fT = 4; const away = ROOMS.filter(r => r.id !== 'ctrl').map(r => [r, roomCenter(r.id)]).sort((p, q) => Math.hypot(q[1][0] - s.x, q[1][1] - s.y) - Math.hypot(p[1][0] - s.x, p[1][1] - s.y)); const [x, y] = randFloor(away[rndi(4)][0].id); botGo(a, x, y); }
    if (a.st === 'flee') { a.fT -= dt; const done = botStep(a, dt, 4.2); if (done || (a.fT <= 0 && !seen)) { a.st = 'task'; a.goal = null; } return; }
    const cagedNow = [PL].concat(this.allies).filter(v => v.caged && !v.out);
    const freeAllies = this.allies.filter(v => !v.caged && !v.gone);
    // 탈출구가 열려도 갇힌 동료가 있으면 용감한 녀석(또는 마지막 하나)은 구하러 간다
    if (S.open && cagedNow.length && (a.st === 'rescue' || a.brave > 0.5 || freeAllies.length === 1) && ds > 6) { if (a.st !== 'rescue') { a.st = 'rescue'; botGo(a, CAGE.x, CAGE.y - 2.2); } if (botStep(a, dt, 4.2) || Math.hypot(a.x - CAGE.x, a.y - CAGE.y + 2.2) < 1) { this.rescue(a); a.st = 'task'; a.goal = null; } return; }
    if (S.open) { if (a.st !== 'exit') { a.st = 'exit'; const ex = EXITS.slice().sort((p, q) => Math.hypot(p.x - a.x, p.y - a.y) - Math.hypot(q.x - a.x, q.y - a.y))[0]; a.ex = ex; botGo(a, ex.x, ex.y); } if (botStep(a, dt, 4.2) || Math.hypot(a.x - a.ex.x, a.y - a.ex.y) < 1.2) this.escape(a, a.ex); return; }
    // 구출
    const caged = [PL].concat(this.allies).filter(v => v.caged && !v.out);
    if (caged.length && Math.hypot(s.x - CAGE.x, s.y - CAGE.y) > 12 && (a.st === 'rescue' || Math.random() < dt * a.brave * 0.5)) { if (a.st !== 'rescue') { a.st = 'rescue'; botGo(a, CAGE.x, CAGE.y - 2.2); } if (botStep(a, dt, 4.2) || Math.hypot(a.x - CAGE.x, a.y - CAGE.y + 2.2) < 1) { this.rescue(a); a.st = 'task'; a.goal = null; } return; }
    if (a.st === 'rescue' && !caged.length) { a.st = 'task'; a.goal = null; }
    // 단말기
    if (!a.term || a.term.done) { const open = this.terms.filter(t => !t.done && (!t.by || t.by === a)); if (!open.length) { a.term = null; return; } open.sort((p, q) => Math.hypot(p.x - a.x, p.y - a.y) - Math.hypot(q.x - a.x, q.y - a.y)); a.term = open[rndi(Math.min(2, open.length))]; a.term.by = a; botGo(a, a.term.x, a.term.y + .9); }
    if (Math.hypot(a.x - a.term.x, a.y - a.term.y) < 1.5) { a.term.p += dt / (this.repT || 30); a.a = Math.atan2(a.term.y - a.y, a.term.x - a.x); if (a.term.p >= 1) { this.fixTerm(a.term, a.name); a.term = null; } else if (Math.random() < dt * 0.012) { this.noise(a.term.x, a.term.y); } }
    else if (botStep(a, dt, 4.0)) { if (a.term && Math.hypot(a.x - a.term.x, a.y - a.term.y) >= 1.5) botGo(a, a.term.x, a.term.y + .9); }
  },
  showEnt(e) { if (e.gone) return false; if (e.ally) return true; return canSee(e.x, e.y) || Math.hypot(e.x - PL.x, e.y - PL.y) < 1.5; },
  drawMid() {
    drawProps();
    for (const t of this.terms) { const X = t.x * T, Y = t.y * T; rr(X - 18, Y - 26, 36, 28, 5, t.done ? '#1B3A2A' : '#0B1220', OL, 2.5); rr(X - 14, Y - 22, 28, 18, 3, t.done ? '#7CFF8A' : (Math.sin(STATE.t * 6) > 0 ? '#4FC3F7' : '#2E86D6')); if (!t.done && t.p > 0) { ctx.strokeStyle = '#7CFF8A'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(X, Y - 12, 26, -1.57, -1.57 + t.p * 6.28); ctx.stroke(); } if (!t.done) tag('단말기', X, Y + 12, '#2E86D6', '#fff', 11); }
    for (const ex of EXITS) { const X = ex.x * T, Y = ex.y * T; circ(X, Y, 30, STATE.open ? 'rgba(124,255,138,.35)' : 'rgba(224,83,63,.2)', STATE.open ? '#7CFF8A' : '#E0533F', 4); txt(STATE.open ? 'EXIT' : '🔒', X, Y, 14, '#fff', 900); }
    const s = this.seeker; if (s !== PL && this.showEnt(s) && STATE.start <= 0) drawCone(s, 1.7, 8.5, s.st === 'chase' ? 'rgba(255,40,40,.22)' : 'rgba(255,90,60,.12)');
    for (const a of [PL].concat(this.allies)) if (a.caged && !a.out) tag(`${Math.ceil(a.cageT)}초`, a.x * T, a.y * T + 34, '#E0533F', '#fff', 11);
  },
  drawTop() {
    // 동료 위치 화살표(화면 밖)
    for (const a of this.allies) { if (a.gone) continue; const dx = a.x * T - CAM.x, dy = a.y * T - CAM.y, hw = VW / SC / 2 - 26, hh = VH / SC / 2 - 26; if (Math.abs(dx) < hw && Math.abs(dy) < hh) continue; const k = Math.min(hw / Math.abs(dx || 1e-3), hh / Math.abs(dy || 1e-3)); circ(CAM.x + dx * k, CAM.y + dy * k, 10, PAL[a.col].body, OL, 2); if (a.caged) txt('!', CAM.x + dx * k, CAM.y + dy * k, 12, '#fff', 900); }
    // 위조탱 경고 테두리
    const s = this.seeker; if (s.target === PL && s.st === 'chase') { const a = .16 + .08 * Math.sin(STATE.t * 10); ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); const g = ctx.createRadialGradient(cv.width / 2, cv.height / 2, Math.min(cv.width, cv.height) * .35, cv.width / 2, cv.height / 2, Math.max(cv.width, cv.height) * .7); g.addColorStop(0, 'rgba(224,40,30,0)'); g.addColorStop(1, `rgba(224,40,30,${a})`); ctx.fillStyle = g; ctx.fillRect(0, 0, cv.width, cv.height); ctx.restore(); }
  },
  fogColor() { return 'rgba(5,7,16,.92)'; },
  mapMarks(c, ox, oy, s) {
    for (const t of this.terms) { c.fillStyle = t.done ? '#7CFF8A' : '#4FC3F7'; c.fillRect(ox + t.x * s - 3, oy + t.y * s - 3, 6, 6); }
    for (const ex of EXITS) { c.strokeStyle = STATE.open ? '#7CFF8A' : '#E0533F'; c.lineWidth = 2; c.strokeRect(ox + ex.x * s - 5, oy + ex.y * s - 5, 10, 10); }
    for (const a of this.allies) if (!a.gone) { c.fillStyle = PAL[a.col].body; c.beginPath(); c.arc(ox + a.x * s, oy + a.y * s, 3, 0, 7); c.fill(); }
    for (const k in this.locks) if (this.locks[k] > STATE.t) { const d = DOORLIST[k]; c.fillStyle = '#E0533F'; c.fillRect(ox + d.x0 * s - 2, oy + d.y0 * s - 2, 6, 6); }
  },
  mapLegend() { return '<span class="pill">■ 단말기 (초록=복구)</span><span class="pill">□ 탈출구</span><span class="pill">● 동료</span><span class="pill" style="border-left:6px solid #E0533F">잠긴 문</span>'; },
  hud() {
    const S = STATE; const dg = $('#danger'); if (MODAL && MODAL.live && !PL.caged) { const d = Math.hypot(this.seeker.x - PL.x, this.seeker.y - PL.y); const seen = this.seeker.target === PL; dg.hidden = false; dg.className = seen || d < 6 ? '' : d < 14 ? 'mid' : 'far'; dg.textContent = seen ? '⚠ 위조탱이 나를 보고 있다!' : `위조탱 거리 ${Math.round(d)}m`; } else dg.hidden = true;
    $('#ht').textContent = fmtT(S.left); $('#hlab').textContent = '남은 시간';
    const r = roomAt(PL.x, PL.y); $('#hloc').textContent = r ? `${r.s} · ${r.n}` : '복도';
    const st = a => a.escaped ? '탈출' : a.out ? '탈락' : a.caged ? `격리 ${Math.ceil(a.cageT)}초` : a.disguise ? '변신 중' : a.st === 'flee' ? '도망 중' : a.st === 'rescue' ? '구출하러' : a.term ? '단말기 수리' : '이동';
    const sk = this.seeker; const html = `<div class="tk-h"><b>탈출전</b><span>단말기 ${S.fixed}/${S.need}</span></div><div class="tk-bar"><i style="width:${Math.min(1, S.fixed / S.need) * 100}%"></i></div><div class="tk${PL.caged ? '' : ''}">나 — ${PL.caged ? `격리 ${Math.ceil(PL.cageT)}초` : PL.disguise ? '변신 중' : '활동'}</div>${this.allies.map(a => `<div class="tk${a.escaped ? ' ok' : ''}">${a.name} — ${st(a)}</div>`).join('')}<div class="tk" style="color:#FF8A7A">위조탱 — ${S.start > 0 ? '대기' : sk.st === 'chase' ? (sk.target === PL ? '나를 추격!' : '추격 중') : sk.st === 'guard' ? '격리실 감시' : '순찰'}</div><div class="tk lock">${S.open ? '탈출구 열림! 발사대·화물열차' : 'Q 변신 · 단말기 E'}</div>`;
    if (html !== this._h) { this._h = html; $('#tasks').innerHTML = html; }
  },
};
MODES.chase = CHASE;
