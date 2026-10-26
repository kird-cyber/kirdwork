// ================================================================ 따라하기 — 모드별 첫 판 단계 안내 (화살표 + 말풍선)
const KEYN = { E: () => COARSE ? '오른쪽 노란 「사용」 버튼' : '<kbd>E</kbd>', Q: () => COARSE ? '「변신」 버튼' : '<kbd>Q</kbd>', M: () => COARSE ? '오른쪽 위 「지도」 버튼' : '<kbd>M</kbd>', H: () => COARSE ? '오른쪽 위 「힌트」 버튼' : '<kbd>H</kbd>', MOVE: () => COARSE ? '왼쪽 아래 조이스틱을 끌어' : '<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd>(또는 방향키)로' };
const tutDist = p => p ? Math.hypot(p[0] - PL.x, p[1] - PL.y) : 99;
const moveStep = hold => ({ t: '움직여 보기', d: `${KEYN.MOVE()} 탱크를 움직여 보세요.`, hold, done: s => tutDist([s.bx, s.by]) > 2.5 });
const TUTS = {
  escape: () => [
    moveStep(false),
    { t: '할 일 목록', d: '왼쪽 위 <b>「임무」</b> 목록에 지금 할 수 있는 일이 나와요. 하나 풀면 다음 문이 열려요.', hi: '#tasks', btn: '알겠어요' },
    { t: '노란 화살표 따라가기', d: '첫 임무 장소로 안내할게요. 가까이 가면 노란 말풍선이 떠요.', at: () => curTask() && curTask().at, done: s => tutDist(s.at()) < 2.4 || !$('#modal').hidden },
    { t: '조사하기', d: `노란 말풍선이 뜬 물체 앞에서 ${KEYN.E()}를 눌러 보세요. 퍼즐이 열려요.`, hi: COARSE ? '#actBtn' : null, at: () => curTask() && curTask().at, done: s => !$('#modal').hidden || (curTask() && curTask().id) !== s.tk },
    { t: '지도 보기', d: `${KEYN.M()} — 연구단지 전체 지도. 노란 점선 원이 지금 목표예요.`, hi: '#mapBtn', done: () => MAPOPEN },
    { t: '막히면 힌트', d: `${KEYN.H()} — 지금 할 일과 방향 화살표. 더 자세한 힌트는 기록에 +60초.`, hi: '#hintBtn', btn: '탈출 시작!' },
  ],
  hide: () => [
    moveStep(true),
    { t: '소품으로 변신', d: `${KEYN.Q()}를 눌러 근처 소품으로 변신해 보세요.`, hi: '#altBtn', hold: true, done: () => !!PL.disguise },
    { t: '변신 풀고 위장 칠', d: `${KEYN.Q()}를 한 번 더 누르면 원래대로. 탱크 그대로 <b>가만히</b> 있으면 몸이 바닥색으로 물들어요.`, hi: '#altBtn', hold: true, done: () => !PL.disguise && PL.paintK > 0.6 },
    { t: '술래는 여기서 나와요', d: '가운데 무대 대기실(빨간 자물쇠 문)에서 술래 3대가 <b>35초 뒤</b> 출발해요. 멀리 떨어진 구역으로 가요.', at: () => { const d = DOORLIST.find(x => x.lock === 'hold' || x.lock === 'fusion'); return d ? [(d.x0 + d.x1 + 1) / 2, d.y0 - .5] : null; }, hold: true, btn: '알겠어요' },
    { t: '멀리 숨기 — 시간 시작!', d: '화살표 구역에 가서 <b>그 구역 소품</b>으로 변신하면 「어울림」. 다른 구역 소품은 「어색함」이라 금방 들켜요.', at: s => s.far, start: s => { const hold = ROOMS.find(r => r.hold); const h = hold ? roomCenter(hold.id) : [PL.x, PL.y]; const c = ROOMS.filter(r => !r.hold && !r.inner && ROOMPROPS[r.id] && r.id !== 'ring').map(r => roomCenter(r.id)).sort((a, b) => Math.hypot(b[0] - h[0], b[1] - h[1]) - Math.hypot(a[0] - h[0], a[1] - h[1])); s.far = c.slice(0, 4).sort((a, b) => tutDist(a) - tutDist(b))[0]; }, done: s => tutDist(s.far) < 5 || STATE.phase === 'seek' },
    { t: '의심도 조심', d: '술래의 붉은 부채꼴 시야에 들어가면 왼쪽 <b>의심도</b>가 올라요. 30초마다 내 자리에서 휘파람이 울리니 가끔 자리를 옮기세요.', hi: '#tasks', btn: '끝까지 버티자' },
  ],
  seek: () => [
    { t: '이번엔 내가 술래', d: '숨은 탱크 5대는 <b>진짜 소품과 똑같이</b> 생겼어요. 지금은 눈 감고 세는 중.', hold: true, btn: '다음' },
    { t: '조사하기', d: `수상한 소품 옆에 서면 「조사」 말풍선 → ${KEYN.E()}. 틀리면 <b>-8초</b>. 가까이 가면 놀라서 도망치는 녀석도 — 부딪히면 잡혀요.`, hold: true, btn: '다음' },
    { t: '휘파람 ♪ 따라가기', d: '숨은 탱크들이 휘파람을 불면 노란 원과 화면 가장자리 ♪ 표시가 떠요. 지도에도 찍혀요.', hi: '#mapBtn', hold: true, btn: '찾으러 가자' },
    { t: '첫 조사', d: `아무 소품에나 다가가 ${KEYN.E()}로 조사해 보세요.`, done: () => STATE.wrong > 0 || STATE.found > 0 },
  ],
  chase: () => [
    moveStep(true),
    { t: '단말기로 가기', d: '파란 <b>「단말기」</b>로 가요. 7곳 중 <b>5곳</b>을 고치면 탈출구가 열려요.', hold: true, at: () => { const t = MODE.terms && MODE.terms.filter(t => !t.done).sort((a, b) => tutDist([a.x, a.y]) - tutDist([b.x, b.y]))[0]; return t ? [t.x, t.y] : null; }, done: s => tutDist(s.at()) < 1.7 },
    { t: '고치기', d: `${KEYN.E()} — 짧은 미니게임(배선·코드 외우기·타이밍)을 풀면 복구돼요. 실패하면 경보가 울려 위조탱이 와요.`, hi: COARSE ? '#actBtn' : null, hold: true, at: () => { const t = MODE.terms && MODE.terms.filter(t => !t.done).sort((a, b) => tutDist([a.x, a.y]) - tutDist([b.x, b.y]))[0]; return t ? [t.x, t.y] : null; }, done: () => STATE.fixed > 0 || (MODAL && MODAL.live) },
    { t: '위조탱을 조심', d: `까만 <b>위조탱</b>이 붉은 시야로 순찰해요. 보이면 도망치거나 ${KEYN.Q()}로 소품 변신(움직이면 풀림).`, hi: '#altBtn', hold: true, btn: '다음' },
    { t: '구출하고 탈출', d: `동료가 잡히면 <b>격리실</b>에 가서 열어 줘요. 단말기 5곳이 끝나면 탈출구(${chaseCfg().exitText})로!`, hi: '#mapBtn', btn: '작전 개시' },
  ],
  chaseS: () => [
    { t: '내가 위조탱', d: '탱크 4대가 흩어져 단말기를 고쳐요. <b>몸으로 부딪히면</b> 잡혀서 격리실로 가요.', hold: true, btn: '다음' },
    { t: '경보 추적', d: `단말기 수리·오류 경보가 울리면 빨간 원이 퍼져요. ${KEYN.M()}로 지도를 열면 노란 테 = 수리 중.`, hi: '#mapBtn', hold: true, btn: '다음' },
    { t: '문 잠금', d: `${KEYN.Q()} — 근처 문 3개를 9초 동안 잠가요(30초마다). 도망 길을 끊어요.`, hi: '#altBtn', btn: '사냥 시작' },
  ],
};
const TUT = {
  on: false, mode: null, steps: [], i: 0, s: null, el: null, hiEl: null,
  seen(m) { try { return localStorage.getItem('kw_tut_' + m) === '1'; } catch (e) { return false; } },
  mark(m) { try { localStorage.setItem('kw_tut_' + m, '1'); } catch (e) { } },
  reset() { try { Object.keys(localStorage).filter(k => k.startsWith('kw_tut_')).forEach(k => localStorage.removeItem(k)); } catch (e) { } },
  ui() {
    if (this.el) return this.el; const el = document.createElement('div'); el.id = 'coach'; el.hidden = true; document.body.appendChild(el);
    el.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; ac(); if (b.dataset.k === 'next') this.next(); else if (b.dataset.k === 'skip') { this.mark(this.mode); this.stop(); toast('따라하기를 건너뛰었어요. 메뉴에서 다시 볼 수 있어요.', 2200); } });
    return this.el = el;
  },
  begin(mode, force) { this.stop(); if (!force && this.seen(mode)) return; const f = TUTS[mode]; if (!f) return; this.on = true; this.mode = mode; this.run = STATE.run; this.steps = f(); this.i = 0; this.enter(); document.body.classList.add('tut-on'); },
  enter() { const st = this.steps[this.i]; this.s = Object.assign({ bx: PL.x, by: PL.y, et: 0, tk: typeof curTask === 'function' && curTask() ? curTask().id : null }, st); st.start && st.start(this.s); STATE.tutHold = !!st.hold; this.render(); },
  render() {
    const st = this.s, el = this.ui(), n = this.steps.length;
    el.innerHTML = `<div class="ct"><span class="cb">따라하기 ${this.i + 1}/${n}</span><b>${st.t}</b></div><p>${st.d}</p><div class="cr">${st.btn ? `<button data-k="next" class="cn">${st.btn}</button>` : `<span class="cw">${st.at ? '노란 화살표를 따라가요' : '해 보면 다음으로 넘어가요'}</span>`}<button data-k="skip" class="cs">건너뛰기</button></div><div class="cd">${this.steps.map((_, k) => `<i class="${k < this.i ? 'ok' : k === this.i ? 'on' : ''}"></i>`).join('')}</div>`;
    if (this.hiEl) this.hiEl.classList.remove('tut-hi'); this.hiEl = st.hi ? $(st.hi) : null; if (this.hiEl) this.hiEl.classList.add('tut-hi');
  },
  next() { if (!this.on) return; this.i++; if (this.i >= this.steps.length) { this.finish(); return; } sfx('ok'); this.enter(); },
  finish() { const m = this.mode; this.mark(m); this.stop(); sfx('item'); banner('따라하기 끝!', '이제 마음껏 해 보세요'); },
  stop() { this.on = false; STATE.tutHold = false; if (this.el) this.el.hidden = true; if (this.hiEl) this.hiEl.classList.remove('tut-hi'); this.hiEl = null; document.body.classList.remove('tut-on'); },
  update(dt) {
    if (!this.on) return; if (STATE.mode === 'menu' || STATE.run !== this.run || STATE.over) { this.stop(); return; }
    const modalOpen = !$('#modal').hidden, st = this.s; this.el.hidden = modalOpen && !MAPOPEN;
    if (!modalOpen) st.et += dt;
    if (st.done && st.done(st)) this.next();
  },
  target() { if (!this.on || !this.s.at) return null; const p = typeof this.s.at === 'function' ? this.s.at(this.s) : this.s.at; return p || null; },
};
TUTDRAW = function () {
  const p = TUT.target(); if (!p) return; const t = STATE.t, X = p[0] * T, Y = p[1] * T;
  // 목표 위 통통 튀는 화살표 + 고리
  ctx.strokeStyle = `rgba(255,210,74,${.5 + .4 * Math.sin(t * 5)})`; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(X, Y, 30 + 6 * Math.sin(t * 5), 0, 7); ctx.stroke();
  const b = Math.abs(Math.sin(t * 5)) * 12; ctx.fillStyle = '#FFD24A'; ctx.strokeStyle = OL; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(X, Y - 40 - b); ctx.lineTo(X - 18, Y - 66 - b); ctx.lineTo(X - 7, Y - 66 - b); ctx.lineTo(X - 7, Y - 90 - b); ctx.lineTo(X + 7, Y - 90 - b); ctx.lineTo(X + 7, Y - 66 - b); ctx.lineTo(X + 18, Y - 66 - b); ctx.closePath(); ctx.fill(); ctx.stroke();
  // 화면 밖이면 가장자리 화살표
  const dx = X - CAM.x, dy = Y - CAM.y, hw = VW / SC / 2 - 40, hh = VH / SC / 2 - 40;
  if (Math.abs(dx) > hw || Math.abs(dy) > hh) { const k = Math.min(hw / Math.abs(dx || 1e-3), hh / Math.abs(dy || 1e-3)), ex = CAM.x + dx * k, ey = clamp(CAM.y + dy * k, CAM.y - hh + 190 / SC, CAM.y + hh - 90 / SC), a = Math.atan2(dy, dx);
    ctx.save(); ctx.translate(ex, ey); ctx.rotate(a); ctx.fillStyle = '#FFD24A'; ctx.strokeStyle = OL; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(26, 0); ctx.lineTo(-14, -20); ctx.lineTo(-6, 0); ctx.lineTo(-14, 20); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); }
  // 길 안내: 실제로 걸어갈 길(A*)을 따라 점선 + 방향
  if (!TUT.pth || STATE.t > TUT.pthT || TUT.pthFor !== p.join()) { TUT.pthT = STATE.t + .5; TUT.pthFor = p.join(); let path = null; for (const [ox, oy] of [[0, 0], [0, 1], [0, -1], [1, 0], [-1, 0], [0, 2], [1, 1], [-1, 1]]) { path = astar(PL.x, PL.y, p[0] + ox, p[1] + oy, 16000); if (path) break; } TUT.pth = path || []; }
  const pth = TUT.pth; if (pth.length > 2) { ctx.fillStyle = 'rgba(255,210,74,.85)'; for (let k = 1; k < Math.min(pth.length, 28); k += 2) { circ(pth[k][0] * T, pth[k][1] * T, 7 - k * .15, 'rgba(255,210,74,.85)', OL, 1); } }
  const aim = pth.length > 2 ? pth[Math.min(4, pth.length - 1)] : p;
  if (tutDist(p) > 3) { const a = Math.atan2(aim[1] - PL.y, aim[0] - PL.x), R = 74 + Math.sin(t * 6) * 6; ctx.save(); ctx.translate(PL.x * T + Math.cos(a) * R, PL.y * T + Math.sin(a) * R); ctx.rotate(a); ctx.fillStyle = '#FFD24A'; ctx.strokeStyle = OL; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(24, 0); ctx.lineTo(-12, -18); ctx.lineTo(-5, 0); ctx.lineTo(-12, 18); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); tag(`${Math.round(tutDist(p))}m`, PL.x * T + Math.cos(a) * (R + 40), PL.y * T + Math.sin(a) * (R + 40), '#FFD24A', OL, 12); }
};
(function tutLoop(prev) { requestAnimationFrame(now => { const dt = Math.min(.05, (now - (prev || now)) / 1000); TUT.update(dt); tutLoop(now); }); })();
