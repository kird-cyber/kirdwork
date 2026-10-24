// ================================================================ 탈출전 · 위조탱 역할 (내가 술래)
const CHASES = Object.assign(Object.create(CHASE), {
  name: '탈출전 · 위조탱', altLabel: '문 잠금', repT: 50, noAct: true, keys: '이동 WASD·방향키 · 부딪혀 잡기 · 문 잠금 Q · 지도 M',
  init() {
    Object.assign(STATE, { mode: 'chaseS', t: 0, clock: 0, pen: 0, over: false, fixed: 0, need: 5, open: false, left: 300, start: 8 });
    setupOpenWorld(); scatterProps(); this.locks = {}; this.lockCd = 0;
    this.terms = shuffle(TERMSPOTS.slice()).slice(0, 7).map(t => Object.assign({ p: 0, done: false, by: null }, t));
    Object.assign(PL, { x: CAGE.x, y: 75.5, a: -Math.PI / 2, col: 'fake', name: '위조탱(나)', speed: 5.0, disguise: null, paint: null, gone: false, caged: false, out: false, slow: 0, frozen: true, escaped: false });
    this.allies = ['blue', 'green', 'orange', 'purple'].map((c, k) => mkBot({ x: 60.5 + k * 1.6, y: 39.6, col: c, name: ['파랑', '초록', '주황', '보라'][k], st: 'task', ally: true, caged: false, cageT: 0, escaped: false, out: false, brave: rnd(0.4, 0.9) }));
    this.seeker = PL; PL.target = null; PL.st = 'player';
    ENTS = this.allies.slice(); INTER = []; CAM.x = PL.x * T; CAM.y = PL.y * T;
  },
  intro() { openModal(`<div class="win"><div class="key">👹</div><h3>위조탱이 되어라</h3><p>탱크 4대가 단말기 7곳 중 5곳을 복구하면 탈출구가 열린다. 그 전에 <b>몸으로 부딪혀</b> 잡아 격리실로 보내자. 격리실에서 45초가 지나면 탈락.</p><p><b>${COARSE ? '문 잠금 버튼' : 'Q 문 잠금'}</b>: 근처 문 3개를 9초 동안 잠근다(30초마다). 소품으로 변신해 숨은 탱크도 부딪히면 잡힌다. 단말기 오류 경보가 울리면 지도에 표시된다.</p><p>2대 이상 탈출하면 패배, 그 전에 모두 잡으면 승리.</p><div class="row"><button class="btn" data-close>사냥 시작</button></div></div>`); },
  buildInter() { INTER = []; },
  alt() {
    if (STATE.over || PL.frozen) return;
    if (this.lockCd > STATE.t) { toast(`문 잠금 재사용까지 ${Math.ceil(this.lockCd - STATE.t)}초`, 900); return; }
    const near = DOORLIST.filter(d => d.lock !== 'fusion').sort((a, b) => Math.hypot(a.x0 - PL.x, a.y0 - PL.y) - Math.hypot(b.x0 - PL.x, b.y0 - PL.y)).slice(0, 3);
    near.forEach(d => this.locks[d.k] = STATE.t + 9); this.lockCd = STATE.t + 30; sfx('alarm'); toast('근처 문 3개를 9초 동안 잠갔다!');
  },
  noise(x, y) { this.pings = (this.pings || []).concat([{ x, y, t: 0 }]); },
  update(dt) {
    const S = STATE; if (S.over) return; this.pings = (this.pings || []).filter(p => (p.t += dt) < 5);
    S.left -= dt; if (S.left <= 0) { this.finish(true); return; }
    if (S.start > 0) { S.start -= dt; if (S.start <= 0) { PL.frozen = false; sfx('alarm'); banner('사냥 시작!', '탱크 4대를 잡아라'); } }
    for (const a of this.allies) if (a.caged && !a.out) { a.cageT -= dt; if (a.cageT <= 0) { a.out = true; a.gone = true; toast(`${a.name} 탱크 탈락!`); } }
    // 잡기
    if (!PL.frozen) for (const a of this.allies) { if (a.caged || a.gone) continue; if (Math.hypot(a.x - PL.x, a.y - PL.y) < 1.1) { if (a.disguise) toast('소품인 척하던 녀석을 잡았다!'); this.catch(a); sfx('ok'); } }
    PL.target = null; PL.st = 'player';
    for (const a of this.allies) if (!a.caged && !a.gone) this.allyAI(a, dt);
    const esc = this.allies.filter(a => a.escaped).length, free = this.allies.filter(a => !a.caged && !a.gone).length;
    if (esc >= 2) { this.finish(false); return; }
    if (!free) { this.finish(true); return; }
  },
  catch(v) { v.disguise = null; v.caged = true; v.cageT = 45; v.st = 'task'; if (v.term) v.term.by = null; v.term = null; v.path = null; v.goal = null; const k = this.allies.filter(a => a.caged).length - 1; v.x = CAGE.x - 1.5 + (k % 4); v.y = CAGE.y + 0.1; SHAKE = .5; toast(`${v.name} 탱크를 잡았다! 격리실로`); },
  escape(v, ex) { v.escaped = true; v.gone = true; sfx('bad'); toast(`${v.name} 탱크가 ${ex.n}로 탈출했다!`); },
  finish(win) {
    const S = STATE; if (S.over) return; S.over = true; const esc = this.allies.filter(a => a.escaped).length, out = this.allies.filter(a => a.out || a.caged).length; sfx(win ? 'win' : 'bad');
    later(() => { openModal(`<div class="win"><div class="key">${win ? '👹' : '🚀'}</div><h3>${win ? '위조탱 승리!' : '탱크들이 탈출했다'}</h3><p>잡은 탱크 ${out}대 · 탈출 ${esc}대 · 복구된 단말기 ${S.fixed}곳</p>${kirdFact()}<div class="row"><button class="btn" id="again">다시 하기</button><button class="btn ghost" id="swap">생존자 쪽 해보기</button><button class="btn ghost" id="tomenu">모드 선택</button></div></div>`, { sticky: true }); $('#again').onclick = () => { closeModal(); startMode('chaseS'); }; $('#swap').onclick = () => { closeModal(); startMode('chase'); }; $('#tomenu').onclick = () => { closeModal(); showMenu(); }; }, 900);
  },
  showEnt(e) { if (e.gone) return false; if (e.caged) return true; return canSee(e.x, e.y) || Math.hypot(e.x - PL.x, e.y - PL.y) < 1.5; },
  drawTop() {
    for (const p of this.pings || []) { const k = (p.t % 1.2) / 1.2; ctx.strokeStyle = `rgba(255,80,60,${1 - k})`; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(p.x * T, p.y * T, (0.6 + k * 3) * T, 0, 7); ctx.stroke(); }
  },
  mapMarks(c, ox, oy, s) {
    for (const t of this.terms) { c.fillStyle = t.done ? '#7CFF8A' : '#4FC3F7'; c.fillRect(ox + t.x * s - 3, oy + t.y * s - 3, 6, 6); if (!t.done && t.p > 0) { c.strokeStyle = '#FFD24A'; c.lineWidth = 2; c.strokeRect(ox + t.x * s - 5, oy + t.y * s - 5, 10, 10); } }
    for (const ex of EXITS) { c.strokeStyle = STATE.open ? '#7CFF8A' : '#E0533F'; c.lineWidth = 2; c.strokeRect(ox + ex.x * s - 5, oy + ex.y * s - 5, 10, 10); }
    for (const p of this.pings || []) { c.strokeStyle = '#FF5A3A'; c.lineWidth = 2; c.beginPath(); c.arc(ox + p.x * s, oy + p.y * s, 4 + (p.t % 1.2) * 5, 0, 7); c.stroke(); }
  },
  mapLegend() { return '<span class="pill">■ 단말기 (노란 테 = 수리 중)</span><span class="pill">□ 탈출구</span><span class="pill" style="border-left:6px solid #E0533F">○ 경보</span>'; },
  hud() {
    const S = STATE; $('#ht').textContent = S.start > 0 ? fmtT(S.start) : fmtT(S.left); $('#hlab').textContent = S.start > 0 ? '출발 대기' : '남은 시간';
    const r = roomAt(PL.x, PL.y); $('#hloc').textContent = r ? `${r.s} · ${r.n}` : '복도';
    const st = a => a.escaped ? '탈출' : a.out ? '탈락' : a.caged ? `격리 ${Math.ceil(a.cageT)}초` : '???';
    const html = `<div class="tk-h"><b>위조탱</b><span>단말기 ${S.fixed}/${S.need}</span></div><div class="tk-bar"><i style="width:${Math.min(1, S.fixed / S.need) * 100}%;background:#E0533F"></i></div>${this.allies.map(a => `<div class="tk${a.caged || a.out ? ' ok' : ''}">${a.name} — ${st(a)}</div>`).join('')}<div class="tk lock">${S.open ? '탈출구가 열렸다! 막아라' : 'Q 문 잠금 · 부딪혀서 잡기'}</div>`;
    if (html !== this._h) { this._h = html; $('#tasks').innerHTML = html; }
    const cm = $('#centerMsg'); if (S.start > 0) { cm.hidden = false; cm.innerHTML = Math.ceil(S.start) + '<small>탱크들이 흩어지는 중…</small>'; } else cm.hidden = true;
  },
});
MODES.chaseS = CHASES;
