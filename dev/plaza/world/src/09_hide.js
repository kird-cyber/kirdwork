// ================================================================ 모드 2: 숨바꼭질 (숨는 쪽 · 찾는 쪽)
const FLOORC = { corr: '#C5CDDA', pad: '#9AA3B2', stars: '#1B1846', lab: '#EEF2F7', raised: '#2A3346', teal: '#B6E2E4', stone: '#A88E6E', power: '#4A5160', marble: '#E8ECF2', metal: '#585074', matrix: '#0F2A1C', soil: '#8CBF5A', deck: '#C3965E', epoxy: '#99D4CE', steel: '#9AA6B8', factory: '#8A919E', gravel: '#B7AFA2', carpetN: '#23365C' };
function mixC(a, b, k) { const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16); const r = (pa >> 16) * (1 - k) + (pb >> 16) * k, g = ((pa >> 8) & 255) * (1 - k) + ((pb >> 8) & 255) * k, bl = (pa & 255) * (1 - k) + (pb & 255) * k; return '#' + ((1 << 24) + (Math.round(r) << 16) + (Math.round(g) << 8) + Math.round(bl)).toString(16).slice(1); }
function floorColAt(x, y) { return FLOORC[roomFloor(Math.floor(x), Math.floor(y))] || '#C5CDDA'; }
const HIDE = {
  name: '숨바꼭질', tasksUI: true, altLabel: '변신', keys: '이동 WASD·방향키 · 변신 Q · 지도 M',
  doorOK(d) { return !((d.lock === 'fusion' || d.lock === 'hold') && STATE.phase === 'hide'); },
  lockColor(d) { return d.lock === 'fusion' || d.lock === 'hold' ? '#E0533F' : '#8A97AA'; },
  visR() { return 7.5; },
  init() {
    Object.assign(STATE, { mode: 'hide', t: 0, clock: 0, pen: 0, over: false, phase: 'hide', phaseT: 35, left: 150, whistleT: 30, maxSus: 0, whistles: 0 });
    setupOpenWorld(); scatterProps();
    const H = MAP.hide || { pl: [64.5, 38.6], seekers: [[61.5, 28.6], [64.5, 28.6], [67.5, 28.6]] };
    Object.assign(PL, { x: H.pl[0], y: H.pl[1], a: -Math.PI / 2, col: 'blue', name: '나', speed: 4.4, disguise: null, paint: null, paintK: 0, gone: false, slow: 0, frozen: false });
    ENTS = H.seekers.map((p, k) => mkBot({ x: p[0], y: p[1], col: 'red', name: '술래 ' + (k + 1), sus: 0, st: 'wait', look: 0, a: Math.PI / 2 }));
    this.cd = 0; INTER = []; CAM.x = PL.x * T; CAM.y = PL.y * T;
  },
  intro() {
    openModal(`<div class="win"><div class="key">🫥</div><h3>숨는 쪽</h3><p>무대: <b>${MAP.name}</b>. 술래 봇 3대가 <b>35초</b> 뒤 ${MAP.hide ? MAP.hide.hold : '관제실'}에서 풀려난다. 그 전에 멀리 숨자.</p><p><b>${COARSE ? '변신 버튼' : 'Q(변신)'}</b> — 지금 있는 방에 어울리는 소품으로 변신. 다른 방 소품 모양으로 옮겨 다니면 눈에 띈다.<br><b>가만히 있기</b> — 탱크가 점점 바닥색으로 물든다(위장).<br>술래 시야(붉은 부채꼴)에 들어가면 의심도가 오른다. 30초마다 내 자리에서 휘파람이 울린다.</p><p>150초 버티면 승리.</p><div class="row"><button class="btn" data-close>숨기 시작</button></div></div>`);
  },
  alt() {
    if (STATE.over) return;
    if (PL.disguise) { PL.disguise = null; this.cd = Math.max(this.cd, 0.6); sfx('click'); toast('변신 해제', 900); return; }
    if (this.cd > 0) { toast(`변신 준비 중… ${Math.ceil(this.cd)}초`, 700); return; }
    const k = pick(propsHere(PL.x, PL.y)); const r = roomAt(PL.x, PL.y);
    PL.disguise = { k, room: r ? r.id : 'corr' }; this.cd = 2.5; sfx('vent'); fxBurst(PL.x, PL.y, '#fff', 12); toast(`「${PROPN[k]}」로 변신!`, 1200);
    for (const e of ENTS) if (sees(e, PL.x, PL.y, 1.6, 7)) { e.sus = 1; toast('앗, 변신하는 걸 들켰다!'); }
  },
  drawDisguise(e) { drawProp(e.disguise.k, e.x * T, e.y * T); if (e === PL) { ctx.globalAlpha = .9; tag('나', e.x * T, e.y * T - 34, '#FFD24A', OL, 11); ctx.globalAlpha = 1; } },
  disguiseGood() { const d = PL.disguise; if (!d) return false; const r = roomAt(PL.x, PL.y); return (ROOMPROPS[r ? r.id : 'corr'] || []).includes(d.k); },
  update(dt) {
    const S = STATE; if (S.over) return; this.cd = Math.max(0, this.cd - dt);
    PL.speed = PL.disguise ? 2.6 : 4.4;
    // 위장 페인트
    if (!PL.disguise && !PL.moving) PL.paintK = Math.min(1, PL.paintK + dt * 0.55); else PL.paintK = Math.max(0, PL.paintK - dt * 1.6);
    PL.paint = PL.paintK > 0.05 ? mixC(PAL.blue.body, floorColAt(PL.x, PL.y), PL.paintK * 0.92) : null;
    PL.name = PL.paintK > 0.6 ? '' : '나';
    if (S.phase === 'hide') { if (!S.tutHold) S.phaseT -= dt; if (S.phaseT <= 0) { S.phase = 'seek'; sfx('alarm'); banner('술래 출발!', MAP.hide ? MAP.hide.open : '관제실 문이 열렸다'); ENTS.forEach(e => { e.st = 'patrol'; e.goal = null; }); } return; }
    S.left -= dt; S.whistleT -= dt;
    if (S.whistleT <= 0) { S.whistleT = 30; S.whistles++; sfx('whistle'); ring(PL.x, PL.y, '#FFD24A'); toast('삐익— 내 자리에서 휘파람이 울렸다!', 1500);
      ENTS.slice().sort((a, b) => Math.hypot(a.x - PL.x, a.y - PL.y) - Math.hypot(b.x - PL.x, b.y - PL.y)).slice(0, 2).forEach(e => { if (e.st !== 'chase') { e.st = 'listen'; botGo(e, PL.x + rnd(-3, 3), PL.y + rnd(-3, 3)); } }); }
    if (S.left <= 0) { this.end(true); return; }
    let maxS = 0;
    for (const e of ENTS) {
      const d = Math.hypot(e.x - PL.x, e.y - PL.y), see = sees(e, PL.x, PL.y, 1.5, 7.5);
      if (see) { const k = 1.15 - d / 7.5 * 0.7; let rate;
        if (PL.disguise) rate = this.disguiseGood() ? (PL.moving ? 1.4 : (d < 2.2 ? 0.9 : 0.42)) : (PL.moving ? 1.9 : 0.85); else rate = PL.moving ? 2.6 : 1.7 * (1 - PL.paintK * 0.75);
        e.sus = Math.min(1.2, e.sus + rate * k * dt); if (e.sus > 0.45) { e.last = [PL.x, PL.y]; } }
      else e.sus = Math.max(0, e.sus - dt * (e.st === 'chase' ? 0.18 : 0.3));
      maxS = Math.max(maxS, e.sus);
      // 상태
      if (e.sus >= 0.45 && e.last) { if (e.st !== 'chase') { e.st = 'chase'; e.pathT = 0; sfx('alarm'); } }
      if (e.st === 'chase') { e.pathT -= dt; if (e.pathT <= 0) { e.pathT = 0.5; botGo(e, e.last[0], e.last[1]); } const done = botStep(e, dt, e.sus >= 1 ? 4.6 : 3.8); if (see && d < 2) e.a = Math.atan2(PL.y - e.y, PL.x - e.x); if (done && !see) { e.look += dt; e.a += dt * 2.5; } if (e.sus < 0.2) { e.st = 'patrol'; e.goal = null; }
        if (d < 0.85 && e.sus >= 0.75) { this.caught(e); return; } }
      else if (e.st === 'listen') { if (botStep(e, dt, 3.8)) { e.st = 'look'; e.look = 2; } }
      else if (e.st === 'look') { e.look -= dt; e.a += dt * 2.2; if (e.look <= 0) { e.st = 'patrol'; e.goal = null; } }
      else if (e.st === 'patrol') { if (!e.goal || !e.path) { const rid = pick(ROOMS.filter(r => !r.hold)).id; const [x, y] = randFloor(rid); botGo(e, x, y); if (!e.path) e.goal = null; } else if (botStep(e, dt, 3.3)) { e.st = 'look'; e.look = 1.6; } }
    }
    S.maxSus = Math.max(S.maxSus, maxS); this.sus = maxS;
  },
  caught(e) { const S = STATE; S.over = true; sfx('bad'); SHAKE = 1; PL.disguise = null; e.a = Math.atan2(PL.y - e.y, PL.x - e.x); banner('발견!', `${e.name}에게 들켰다`); later(() => this.result(false), 1400); },
  end(win) { STATE.over = true; sfx('win'); banner('끝까지 숨었다!', '150초 생존'); later(() => this.result(true), 1400); },
  result(win) {
    const S = STATE, surv = Math.round(150 - Math.max(0, S.left));
    openModal(`<div class="win"><div class="key">${win ? '🏆' : '👀'}</div><h3>${win ? '숨기 성공!' : '발견됐다'}</h3><p>${S.phase === 'seek' ? `술래 출발 후 <b>${surv}초</b> 버팀` : '술래가 나오기도 전에…'} · 가장 아찔했던 순간 의심도 ${Math.round(Math.min(1, S.maxSus) * 100)}%</p>${kirdFact()}<div class="row"><button class="btn" id="again">다시 하기</button><button class="btn ghost" id="swap">찾는 쪽 해보기</button><button class="btn ghost" id="tomenu">모드 선택</button></div></div>`, { sticky: true });
    $('#again').onclick = () => { closeModal(); startMode('hide'); }; $('#swap').onclick = () => { closeModal(); startMode('seek'); }; $('#tomenu').onclick = () => { closeModal(); showMenu(); };
  },
  showEnt(e) { return canSee(e.x, e.y) || Math.hypot(e.x - PL.x, e.y - PL.y) < 1.5; },
  drawMid() { drawProps(); for (const e of ENTS) if (this.showEnt(e) && STATE.phase === 'seek') drawCone(e, 1.5, 7.5, e.st === 'chase' ? 'rgba(255,60,40,.22)' : 'rgba(255,120,80,.12)'); },
  drawTop() { for (const e of ENTS) if (this.showEnt(e) && e.sus > 0.05) { const X = e.x * T, Y = e.y * T - 52; rr(X - 22, Y - 5, 44, 10, 5, 'rgba(14,34,56,.8)'); rr(X - 21, Y - 4, 42 * Math.min(1, e.sus), 8, 4, e.sus >= .75 ? '#E0533F' : '#FFD24A'); txt(e.sus >= .45 ? '!' : '?', X + 30, Y, 18, e.sus >= .45 ? '#E0533F' : '#FFD24A', 900); } },
  fogColor() { return MAP.fog || 'rgba(5,7,16,.92)'; },
  mapMarks(c, ox, oy, s) { if (STATE.phase === 'hide') { c.fillStyle = '#E0533F'; for (const e of ENTS) { c.beginPath(); c.arc(ox + e.x * s, oy + e.y * s, 3, 0, 7); c.fill(); } } },
  hud(dt) {
    const S = STATE; $('#ht').textContent = S.phase === 'hide' ? fmtT(S.phaseT) : fmtT(S.left); $('#hlab').textContent = S.phase === 'hide' ? '숨는 시간' : '남은 시간';
    const r = roomAt(PL.x, PL.y); $('#hloc').textContent = r ? `${r.s} · ${r.n}` : MAP.corrName || '복도';
    const dz = PL.disguise ? `${PROPN[PL.disguise.k]} ${this.disguiseGood() ? '(어울림)' : '(어색함!)'}` : PL.paintK > .6 ? '바닥색 위장 중' : '탱크 그대로';
    const html = `<div class="tk-h"><b>숨바꼭질</b><span>${S.phase === 'hide' ? '숨는 중' : '술래 수색 중'}</span></div><div class="tk-bar"><i style="width:${Math.min(1, this.sus || 0) * 100}%;background:${(this.sus || 0) > .45 ? '#E0533F' : '#FFD24A'}"></i></div><div class="tk">의심도 <b>${Math.round(Math.min(1, this.sus || 0) * 100)}%</b></div><div class="tk">내 모습: ${dz}</div><div class="tk">휘파람까지 ${S.phase === 'seek' ? Math.ceil(S.whistleT) + '초' : '—'}</div><div class="tk lock">Q 변신 · 가만히 있으면 위장</div>`;
    if (html !== this._h) { this._h = html; $('#tasks').innerHTML = html; }
    const cm = $('#centerMsg'); if (S.phase === 'hide' && S.phaseT < 5.5 && S.phaseT > 0) { cm.hidden = false; cm.innerHTML = Math.ceil(S.phaseT) + '<small>술래가 곧 나온다</small>'; } else cm.hidden = true;
  },
};
// ---------------------------------------------------------------- 찾는 쪽
const SEEK = {
  name: '숨바꼭질 · 술래', tasksUI: true, keys: '이동 WASD·방향키 · 조사 E · 지도 M',
  doorOK(d) { return !((d.lock === 'fusion' || d.lock === 'hold') && STATE.phase === 'wait'); },
  lockColor(d) { return d.lock === 'fusion' || d.lock === 'hold' ? '#E0533F' : '#8A97AA'; },
  visR() { return STATE.phase === 'wait' ? 2.5 : 7.5; },
  init() {
    Object.assign(STATE, { mode: 'seek', t: 0, clock: 0, pen: 0, over: false, phase: 'wait', phaseT: 8, left: 180, whistleT: 10, found: 0, wrong: 0 });
    setupOpenWorld(); scatterProps();
    const SK = MAP.seek || { pl: [64.5, 30.5], skip: ['ctrl', 'lobby'] };
    Object.assign(PL, { x: SK.pl[0], y: SK.pl[1], a: Math.PI / 2, col: 'red', name: '술래(나)', speed: 4.5, disguise: null, paint: null, paintK: 0, gone: false, slow: 0 });
    const rooms = shuffle(ROOMS.filter(r => !r.hold && !SK.skip.includes(r.id) && ROOMPROPS[r.id]).map(r => r.id)).slice(0, 5);
    ENTS = rooms.map((rid, k) => { const [x, y] = randFloor(rid); return mkBot({ x, y, col: ['blue', 'green', 'orange', 'purple', 'gray'][k], name: ['파랑', '초록', '주황', '보라', '회색'][k], disguise: { k: pick(ROOMPROPS[rid]) }, st: 'hide', nerve: rnd(0.2, 0.6) }); });
    this.pings = []; CAM.x = PL.x * T; CAM.y = PL.y * T; INTER = [];
  },
  intro() { openModal(`<div class="win"><div class="key">🔎</div><h3>찾는 쪽 (술래)</h3><p>무대: <b>${MAP.name}</b>. 탱크 5대가 곳곳에서 <b>소품으로 변신</b>해 숨었다. 진짜 소품과 섞여 있다.</p><p>의심 가는 소품 옆에서 <b>${COARSE ? '사용 버튼(조사)' : 'E(조사)'}</b>. 틀리면 <b>-8초</b>. 너무 가까이 가면 도망치는 녀석도 있다 — 쫓아가 부딪히면 잡힌다.<br>10초 뒤 첫 휘파람, 그 뒤 25초마다 숨은 탱크들이 휘파람을 분다(지도와 화면에 표시).</p><p>180초 안에 5대를 모두 찾자.</p><div class="row"><button class="btn" data-close>눈 감고 8초 세기</button></div></div>`); },
  showEnt(e) { return !e.gone && (canSee(e.x, e.y) || Math.hypot(e.x - PL.x, e.y - PL.y) < 1.5); },
  drawDisguise(e) { drawProp(e.disguise.k, e.x * T, e.y * T); },
  update(dt) {
    const S = STATE; if (S.over) return;
    if (S.phase === 'wait') { if (!S.tutHold) S.phaseT -= dt; PL.frozen = true; if (S.phaseT <= 0) { S.phase = 'seek'; PL.frozen = false; sfx('alarm'); banner('찾아라!', '숨은 탱크 5대'); } return; }
    S.left -= dt; S.whistleT -= dt;
    if (S.whistleT <= 0) { S.whistleT = 25; sfx('whistle'); for (const e of ENTS) if (!e.gone) this.pings.push({ x: e.x + rnd(-2.5, 2.5), y: e.y + rnd(-2.5, 2.5), t: 0 }); toast('삐익— 휘파람 소리! (지도에 표시)', 1500); }
    this.pings = this.pings.filter(p => (p.t += dt) < 6);
    if (S.left <= 0) { this.end(false); return; }
    // 조사 대상 목록
    INTER = []; const me = this;
    const cand = PROPS.filter(p => Math.hypot(p.x - PL.x, p.y - PL.y) < 2.2).map(p => ({ x: p.x, y: p.y, r: 1.6, label: '조사', act: () => me.check(null, p) }));
    for (const e of ENTS) if (!e.gone && e.disguise && Math.hypot(e.x - PL.x, e.y - PL.y) < 2.2) cand.push({ x: e.x, y: e.y, r: 1.6, label: '조사', act: () => me.check(e) });
    INTER = cand;
    for (const e of ENTS) { if (e.gone) continue; const d = Math.hypot(e.x - PL.x, e.y - PL.y);
      if (e.st === 'hide') { if (d < 2.6 && sees(PL, e.x, e.y, 1.4, 3) && Math.random() < e.nerve * dt * 1.6) { e.st = 'run'; e.disguise = null; sfx('alarm'); toast(`${e.name} 탱크가 튀어나와 도망친다! 부딪혀서 잡자`); const far = ROOMS.filter(r => !r.hold).sort((a, b) => { const [ax, ay] = roomCenter(a.id), [bx, by] = roomCenter(b.id); return Math.hypot(bx - PL.x, by - PL.y) - Math.hypot(ax - PL.x, ay - PL.y); })[rndi(3)]; const [x, y] = randFloor(far.id); botGo(e, x, y); e.dest = far.id; }
        // 안 보일 때 가끔 자리 옮김
        else if (!canSee(e.x, e.y) && Math.random() < dt / 40) { const [x, y] = randFloor(roomAt(e.x, e.y) ? roomAt(e.x, e.y).id : null); if (!canSee(x, y)) { e.x = x; e.y = y; } } }
      else if (e.st === 'run') { const done = botStep(e, dt, 4.0); if (d < 0.9) { this.found(e); continue; } if (done) { e.st = 'hide'; e.disguise = { k: pick(ROOMPROPS[e.dest] || ROOMPROPS.corr) }; e.nerve *= 0.7; } } }
  },
  check(e, p) {
    if (e) { this.found(e); return; }
    STATE.left -= 8; STATE.wrong++; sfx('bad'); fxText(p.x, p.y, '-8초', '#FF8A7A'); toast(`그냥 ${PROPN[p.k]}였다. (-8초)`, 1200); PROPS.splice(PROPS.indexOf(p), 1); PROPS.push(Object.assign({}, p, { checked: 1 }));
  },
  found(e) { e.gone = true; STATE.found++; sfx('ok'); fxBurst(e.x, e.y, '#FFD24A', 24); banner(`${e.name} 탱크 발견!`, `${STATE.found} / 5`); if (STATE.found >= 5) this.end(true); },
  end(win) { const S = STATE; S.over = true; sfx(win ? 'win' : 'bad'); later(() => { openModal(`<div class="win"><div class="key">${win ? '🏆' : '⌛'}</div><h3>${win ? '모두 찾았다!' : '시간 종료'}</h3><p>찾은 탱크 <b>${S.found} / 5</b> · 헛짚기 ${S.wrong}번${win ? ` · 남은 시간 ${fmtT(S.left)}` : ''}</p>${kirdFact()}<div class="row"><button class="btn" id="again">다시 하기</button><button class="btn ghost" id="swap">숨는 쪽 해보기</button><button class="btn ghost" id="tomenu">모드 선택</button></div></div>`, { sticky: true }); $('#again').onclick = () => { closeModal(); startMode('seek'); }; $('#swap').onclick = () => { closeModal(); startMode('hide'); }; $('#tomenu').onclick = () => { closeModal(); showMenu(); }; }, 900); },
  drawMid() { drawProps(); for (const p of PROPS) if (p.checked) { ctx.globalAlpha = .7; txt('✓', p.x * T + 14, p.y * T - 14, 14, '#2FA84F', 900); ctx.globalAlpha = 1; } },
  drawTop() { for (const p of this.pings) { const k = (p.t % 1.5) / 1.5; ctx.strokeStyle = `rgba(255,210,74,${1 - k})`; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(p.x * T, p.y * T, (0.6 + k * 3) * T, 0, 7); ctx.stroke(); }
    // 화면 밖 핑 방향
    for (const p of this.pings) { const dx = p.x * T - CAM.x, dy = p.y * T - CAM.y, hw = VW / SC / 2 - 30, hh = VH / SC / 2 - 30; if (Math.abs(dx) < hw && Math.abs(dy) < hh) continue; const s = Math.min(hw / Math.abs(dx || 1e-3), hh / Math.abs(dy || 1e-3)); const X = CAM.x + dx * s, Y = clamp(CAM.y + dy * s, CAM.y - hh + 60 / SC, CAM.y + hh - 70 / SC); circ(X, Y, 12, '#FFD24A', OL, 2); txt('♪', X, Y, 14, OL, 900); } },
  fogColor() { return STATE.phase === 'wait' ? 'rgba(2,3,9,.98)' : MAP.fog || 'rgba(6,9,20,.88)'; },
  mapMarks(c, ox, oy, s) { for (const p of this.pings) { c.strokeStyle = '#FFD24A'; c.lineWidth = 2; c.beginPath(); c.arc(ox + p.x * s, oy + p.y * s, 4 + (p.t % 1.5) * 4, 0, 7); c.stroke(); } },
  hud() {
    const S = STATE; $('#ht').textContent = S.phase === 'wait' ? fmtT(S.phaseT) : fmtT(S.left); $('#hlab').textContent = S.phase === 'wait' ? '눈 감는 중' : '남은 시간';
    const r = roomAt(PL.x, PL.y); $('#hloc').textContent = r ? `${r.s} · ${r.n}` : MAP.corrName || '복도';
    const html = `<div class="tk-h"><b>술래</b><span>${S.found}/5</span></div><div class="tk-bar"><i style="width:${S.found / 5 * 100}%"></i></div>${ENTS.map(e => `<div class="tk${e.gone ? ' ok' : ''}">${e.name} 탱크 ${e.gone ? '발견' : e.st === 'run' ? '도주 중!' : '숨음'}</div>`).join('')}<div class="tk">휘파람까지 ${Math.ceil(S.whistleT)}초</div><div class="tk lock">수상한 소품 옆에서 E · 틀리면 -8초</div>`;
    if (html !== this._h) { this._h = html; $('#tasks').innerHTML = html; }
    const cm = $('#centerMsg'); if (S.phase === 'wait') { cm.hidden = false; cm.innerHTML = Math.ceil(S.phaseT) + '<small>눈 감고 세는 중…</small>'; } else cm.hidden = true;
  },
};
MODES.hide = HIDE; MODES.seek = SEEK;
