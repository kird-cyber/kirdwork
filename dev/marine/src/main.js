// ============================================================== UI + MAIN LOOP
const $ = id => document.getElementById(id);
const cv = $('cv'), mini = $('mini');
const R = createRenderer(cv, mini);
const AU = createAudio();
let freezeUntil = 0, lastSecs = -1;
try { const v = localStorage.getItem('bm.shake'); R.reduceMotion = v === null ? matchMedia('(prefers-reduced-motion: reduce)').matches : v === '0'; } catch (e) {}
R.onSfx = (n, p) => AU.play(n, p);
R.onHitstop = ms => { if (!R.reduceMotion) freezeUntil = performance.now() + ms; };
R.onEngine = on => AU.setEngine(on);
let match = null, ctrl = null;
const SUB_KEYS = Object.keys(CONFIG.subs), ITEM_KEYS = Object.keys(CONFIG.items);
const PICK_KEYS = SUB_KEYS.filter(k => !CONFIG.subs[k].hidden), HIDDEN_KEYS = SUB_KEYS.filter(k => CONFIG.subs[k].hidden);
// "?" = random: one of the pickable subs, or with randomSub.chance the hidden company sub
function rollRandomSub(rnd) { const RS = CONFIG.randomSub; return rnd() < RS.chance ? RS.id : PICK_KEYS[Math.floor(rnd() * PICK_KEYS.length)]; }
function tankLabel(k) { return k === 'random' ? '랜덤' : CONFIG.subs[k] ? CONFIG.subs[k].name : ''; }
function randomThumb(w, h) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
  x.fillStyle = '#FFD24A'; x.font = `900 ${Math.round(h * 0.72)}px "Black Han Sans", "Noto Sans KR", sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.lineWidth = 6; x.strokeStyle = '#3A2A00'; x.strokeText('?', w / 2, h * 0.54); x.fillText('?', w / 2, h * 0.54);
  return c;
}
// sub picker (practice setup + lobby): pickable subs, "?" random, then the hidden sub in full colour (shown, not pickable)
function buildPicks(box, current, onPick, label, onInfo) {
  for (const k of [...PICK_KEYS, 'random', ...HIDDEN_KEYS]) {
    const hidden = HIDDEN_KEYS.includes(k);
    const b = document.createElement('button'); b.type = 'button';
    b.className = 'pick' + (current === k ? ' sel' : '') + (hidden ? ' locked' : '') + (k === 'random' ? ' rnd' : '');
    b.append(cloneCanvas(thumbs[k]));
    const sp = document.createElement('span'); sp.textContent = tankLabel(k); b.append(sp);
    if (hidden) { const bd = document.createElement('small'); bd.className = 'rndonly'; bd.textContent = '? 랜덤 전용'; b.append(bd); }
    b.setAttribute('aria-label', (label ? label + ': ' : '') + (hidden ? `${CONFIG.subs[k].name} (랜덤으로만 나옴)` : tankLabel(k)));
    if (hidden) { b.setAttribute('aria-disabled', 'true'); b.title = `히든 잠수함 "${CONFIG.subs[k].name}" — 고를 수 없어요. "?" 랜덤을 고르면 1/${Math.round(1 / CONFIG.randomSub.chance)} 확률로 나옵니다`; b.onclick = () => onInfo && onInfo(k); }
    else { b.setAttribute('aria-pressed', String(current === k)); b.onclick = () => onPick(k); }
    if (onInfo) b.onmouseenter = () => onInfo(k);
    box.append(b);
  }
}

// ---------------------------------------------------------------- sub info card (under the picker: stats + weapon 1/2)
const WEAPON_DESC = {
  std: '둥글게 터지는 기본 어뢰. 곡선과 게이지 감을 익히기 좋습니다.',
  wolf: '두 발이 위아래 30px 간격으로 나란히 갑니다. 한 발이 바위에 막혀도 다른 발은 틈으로 빠져나갑니다.',
  cheonji: '가로와 세로로 동시에 길게 터지는 십자 폭발. 처마 아래와 바닥 쪽을 한 번에 노립니다.',
  singijeon: '폭발 지점 위에서 불화살 5발이 나란히 쏟아집니다. 위가 뚫린 자리에 숨은 적에게 좋습니다.',
  heavy: '느리고 무겁지만 가장 센 기본 어뢰.',
  vls: '폭발 지점에서 잠깐 멈춘 뒤 수직으로 내려꽂혀, 바위나 적에 닿으면 크게 터집니다.',
  drill: '바위에 닿아도 바로 터지지 않고 120px까지 뚫고 들어갑니다. 얇은 바위 뒤의 적을 노립니다.',
  maelstrom: '터진 자리 220px 안의 적을 100px 끌어당긴 뒤 폭발합니다. 숨은 적을 끌어냅니다.',
  volt: '맞으면 3턴 동안 매 턴 45씩 감전되고 이동력이 30% 줄어듭니다.',
  chain: '터진 자리에서 400px 안 가장 가까운 다른 적에게 번개가 튀고, 거기서 한 번 더 튑니다. 벽을 무시합니다.',
  claw: '단단하고 센 기본 어뢰.',
  drone: '바위에 닿으면 붙어서 표면을 따라 기어간 뒤 터집니다(최대 300px, 남은 곡선 길이만큼). 처마 밑면을 타고 들어갑니다.',
  hunt: '곡선 끝부분에서 가까운 적이 있으면 최대 40°까지 휘어 따라갑니다.',
  frenzy: '터진 자리에서 8방향으로 작은 파편탄이 120px씩 뻗어 각각 터집니다. 모퉁이 뒤를 감싸 칩니다.',
  direct: '적을 뚫고 지나가지 않고 닿는 순간 터집니다. 게이지 실수에 관대합니다.',
  tail: '범고래가 꼬리로 물살을 치듯 가로로 길게 터집니다. 바닥에 붙은 적을 쓸어냅니다.',
  sonar: '세로로 길게 터집니다. 처마 위나 아래에 숨은 적에게 닿습니다.',
  blow: '0.5초 동안 크게 부풀었다가 넓게 폭발하고, 지형을 크게 파냅니다.',
  kmagnet: '터지는 순간 50px(잠수함 한 척 길이쯤) 안에 적이 있으면 폭발이 그 적에게 끌려가 정확히 터집니다. 게이지가 살짝 빗나가도 봐줍니다.',
  ksplit: '폭발 지점에서 위아래 45°로 파랑·연두 두 갈래로 갈라져, 각각 90px 더 가서 터집니다.',
};
function shapeText(w) {
  if (w.thin) return `십자 ${w.rx * 2}×${w.thin * 2}`;
  return w.rx === w.ry ? `반경 ${w.rx}` : w.rx > w.ry ? `가로 ${w.rx * 2}×${w.ry * 2}` : `세로 ${w.rx * 2}×${w.ry * 2}`;
}
function weaponChips(w) {
  const c = [`피해 ${w.dmg}${w.kind === 'octo8' ? ' ×9' : w.kind === 'twin' ? ' ×2' : w.kind === 'rain' ? ' ×5' : w.kind === 'split' ? ' ×2' : ''}`, shapeText(w)];
  if (w.cooldownTurns) c.push(`재충전 ${w.cooldownTurns}턴`);
  c.push(w.extraDelay ? `딜레이 +${w.extraDelay}` : '딜레이 없음');
  return c;
}
const esc = s => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]);
function tankCardHTML(k) {
  if (k === 'random' || !CONFIG.subs[k]) {
    const h = CONFIG.subs[CONFIG.randomSub.id];
    return `<div class="tc-head"><b>? 랜덤</b><span class="tc-era">운에 맡기기</span></div>
      <p class="tc-desc">전투가 시작될 때 ${PICK_KEYS.length}척 중 하나로 정해집니다. <b>1/${Math.round(1 / CONFIG.randomSub.chance)} 확률</b>로 히든 잠수함 <b>${esc(h.name)}</b>가 나와요.</p>
      <p class="tc-desc">${esc(h.name)} 무기: 1번 ${esc(h.weapons[0].name)} · 2번 ${esc(h.weapons[1].name)}</p>`;
  }
  const d = CONFIG.subs[k], all = SUB_KEYS.map(x => CONFIG.subs[x]);
  const mx = f => Math.max(...all.map(f)), mn = f => Math.min(...all.map(f));
  const bar = (label, v, lo, hi, txt) => { const r = hi > lo ? 0.2 + 0.8 * (v - lo) / (hi - lo) : 1; return `<div class="tc-stat"><span>${label}</span><i><em style="width:${Math.round(r * 100)}%"></em></i><b>${txt}</b></div>`; };
  const delay = CONFIG.turn.baseDelay[d.speedClass];
  const stats = bar('체력', d.hp, mn(t => t.hp), mx(t => t.hp), d.hp)
    + bar('선체', d.hull, 1, 5, `${d.hull}/5` + (d.ramMul ? ` · 박치기 ×${d.ramMul}` : ''))
    + bar('이동력', d.movePx, mn(t => t.movePx), mx(t => t.movePx), d.movePx)
    + bar('사거리', d.range, mn(t => t.range), mx(t => t.range), d.range)
    + bar('회전각', d.turn, mn(t => t.turn), mx(t => t.turn), d.turn + '°')
    + bar('속도', -delay, -mx(t => CONFIG.turn.baseDelay[t.speedClass]), -mn(t => CONFIG.turn.baseDelay[t.speedClass]), `딜레이 ${delay}`);
  const wep = (w, i) => `<div class="tc-wep"><div class="tc-wn"><kbd>${i + 1}</kbd>${esc(w.name)}</div><p>${esc(WEAPON_DESC[w.id] || '')}</p><div class="tc-chips">${weaponChips(w).map(x => `<span>${esc(x)}</span>`).join('')}</div></div>`;
  return `<div class="tc-head"><b>${esc(d.name)}</b><span class="tc-era">${esc(d.model)}</span>${d.hidden ? '<span class="tc-lock">? 랜덤 전용 히든 잠수함</span>' : ''}</div>
    <div class="tc-body"><div class="tc-stats">${stats}</div>
    <div class="tc-weps">${d.weapons.map(wep).join('')}</div></div>`;
}
function renderTankCard(el, k) { if (el) { el.innerHTML = tankCardHTML(k); el.dataset.tank = k; } }

// ---------------------------------------------------------------- banner / over
let bannerTimer = 0;
function banner(s, team, turnin) { const b = $('banner'); b.textContent = s; if (team && turnin) { const sm = document.createElement('small'); sm.textContent = team === 'red' ? '레드 팀' : '블루 팀'; b.appendChild(sm); } b.style.color = team === 'red' ? '#FFB4A4' : team === 'blue' ? '#A9D0FF' : ''; b.classList.remove('turnin'); void b.offsetWidth; if (turnin) b.classList.add('turnin'); b.classList.add('show'); clearTimeout(bannerTimer); bannerTimer = setTimeout(() => b.classList.remove('show'), 1500); }
R.onBanner = banner;
function matchAwards(m) {
  const T = m.subs, out = {}, add = (t, label, cls) => (out[t.idx] = out[t.idx] || []).push({ label, cls });
  const best = (f, min) => { let b = null; for (const t of T) { const v = f(t); if (v > min && (!b || v > f(b))) b = t; } return b; };
  const mvp = best(t => t.st.dealt + 150 * t.st.kills - t.st.friendly, 0);
  if (mvp) add(mvp, '👑 MVP', 'mvp');
  const sn = best(t => (t.st.shots >= 3 ? t.st.hitTurns / t.st.shots : 0), 0.5); if (sn) add(sn, '🎯 저격수', '');
  const dl = best(t => t.st.dealt, 0); if (dl && dl !== mvp) add(dl, '💥 화력왕', '');
  const ok = best(t => t.st.outs, 0); if (ok) add(ok, '🌊 밀어내기 장인', '');
  const kl = best(t => t.st.kills, 1); if (kl) add(kl, '⚔️ 마무리 장인', '');
  const ff = best(t => t.st.friendly, 49); if (ff) add(ff, '🤦 팀킬왕', 'bad');
  const tk = best(t => (t.alive ? t.st.taken : 0), 0); if (tk && tk.st.taken >= tk.maxhp * 0.6) add(tk, '🛡️ 불사신', '');
  for (const t of T) if (t.st.dealt === 0 && t.st.shots >= 3) add(t, '🕊️ 평화주의자', 'bad');
  return { mvp, out };
}
R.onOver = (winner, forfeit) => {
  const t = $('overTitle'), teamName = w => w === 'red' ? '레드 팀' : '블루 팀';
  const me = ON.active ? match.subs.find(x => x.id === ON.myId) : null;
  let title, cls;
  if (winner === 'draw') { title = '무승부'; cls = 'draw'; }
  else if (me) { title = me.team === winner ? '승리!' : '패배'; cls = me.team === winner ? 'win' : 'lose'; }
  else { title = teamName(winner) + ' 승리'; cls = winner; }
  t.textContent = title; t.className = 'ot ' + cls;
  $('overSub').textContent = (winner === 'draw' ? '' : teamName(winner) + ' 승리 · ') + `${match.turnNo}턴 · ${CONFIG.maps[match.mapId].name}` + (forfeit ? ` · ${teamName(forfeit)}이 모두 나가 기권` : '');
  const aw = matchAwards(match), mv = aw.mvp;
  $('overMvp').hidden = !mv;
  if (mv) { $('overMvp').innerHTML = `<span class="mk">MVP</span><b></b><span class="ms">피해 ${mv.st.dealt} · 격침 ${mv.st.kills}${mv.st.outs ? ` (밀어내기 ${mv.st.outs})` : ''}</span>`; const b = $('overMvp').querySelector('b'); b.className = mv.team === 'blue' ? 'blue' : 'red'; b.textContent = mv.nick; }
  const ros = $('overRoster'); ros.innerHTML = '';
  for (const team of ['red', 'blue']) {
    const col = document.createElement('div'); col.className = 'orcol ' + team + (team === winner ? ' won' : '');
    const h = document.createElement('div'); h.className = 'orh'; h.textContent = teamName(team) + (team === winner ? ' · 승리' : ''); col.append(h);
    for (const x of match.subs.filter(k => k.team === team)) {
      const r = document.createElement('div'); r.className = 'orr' + (x.alive ? '' : ' dead') + (me && x.id === me.id ? ' me' : '');
      const nm = document.createElement('b'); nm.textContent = x.nick + (me && x.id === me.id ? ' (나)' : '');
      const sub = document.createElement('span'); sub.textContent = `${CONFIG.subs[x.subId].name} · ${forfeit === team ? '나감' : x.alive ? '생존 ' + x.hp : x.deathCause === 'out' ? '장외' : '격침'}`;
      const st = document.createElement('span'); st.className = 'ost';
      st.textContent = `피해 ${x.st.dealt} · 격침 ${x.st.kills} · 명중 ${x.st.hitTurns}/${x.st.shots}` + (x.st.friendly ? ` · 팀킬 ${x.st.friendly}` : '');
      const bd = document.createElement('div'); bd.className = 'obd';
      for (const a of aw.out[x.idx] || []) { const c = document.createElement('span'); c.className = 'badge ' + a.cls; c.textContent = a.label; bd.append(c); }
      if (aw.mvp === x) r.classList.add('mvp');
      r.append(nm, sub, st); if (bd.children.length) r.append(bd); col.append(r);
    }
    ros.append(col);
  }
  if (cls === 'win') AU.play('pickup');
  if (me && ON.game) noteResult(ON.game.gid, winner === 'draw' ? 'd' : me.team === winner ? 'w' : 'l');
  const online = ON.active;
  $('again').hidden = online; $('toSetup').hidden = online; $('toLobby').hidden = true; $('leaveGame').hidden = true; $('overWait').hidden = true;
  if (online) onlineOver();
  setTimeout(() => { if (screen === 'game' && match && match.phase === 'over') $('over').hidden = false; }, forfeit ? 300 : 1100);
};

// ---------------------------------------------------------------- HUD
const hudCache = {};
const setTxt = (id, s) => { if (hudCache[id] !== s) { hudCache[id] = s; $(id).textContent = s; } };
function buildWindBar() { const b = $('windBar'); b.innerHTML = ''; for (let i = 0; i < 10; i++) { if (i === 5) b.appendChild(document.createElement('b')); b.appendChild(document.createElement('i')); } }
// online: the bottom panel always shows MY sub
function hudSub(m) {
  if (ON.active && !ON.spectator) { const mine = m.subs.find(x => x.id === ON.myId); if (mine) return mine; }
  const cur = m.cur >= 0 ? m.subs[m.cur] : null;
  if (!ON.active && cur && PRACTICE.bots[cur.id]) { const humans = m.subs.filter(x => !PRACTICE.bots[x.id]); return humans.find(x => x.alive) || humans[0] || cur; }
  return cur;
}
// ---------------------------------------------------------------- aiming panel (조준판)
// The curve exists only here: a scaled-down grid centred on my sub (one cell = 250, bold line = 1000).
// The map never shows the curve or where it will burst, so range has to be judged by eye.
const PAD = { zooms: [0.75, 1, 1.5, 2, 3], zi: 1, drag: -1, hover: -1, sel: 2, span: 2400, used: false }; // span = world px from the centre to the side edge at ×1
const pad = $('aimPad'), pctx = pad.getContext('2d');
function padSize() {
  const r = pad.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1), w = Math.round(r.width * dpr), h = Math.round(r.height * dpr);
  if (w && h && (pad.width !== w || pad.height !== h)) { pad.width = w; pad.height = h; }
  return { w: r.width, h: r.height, dpr };
}
const padScale = S => (S.w / 2) / (PAD.span / PAD.zooms[PAD.zi]); // css px per world px
function padSub() { return match && ctrl && ctrl.activeLocal() ? match.subs[match.cur] : null; }
function padPts(t, S) { const s = padScale(S); return ctrl.worldPts(t).map(p => [S.w / 2 + (p[0] - t.x) * s, S.h / 2 + (p[1] - t.y) * s]); }
function drawPad() {
  const S = padSize(); if (!S.w) return;
  const x = pctx, W = S.w, H = S.h, cx = W / 2, cy = H / 2, s = padScale(S);
  x.setTransform(S.dpr, 0, 0, S.dpr, 0, 0);
  x.fillStyle = '#061A2B'; x.fillRect(0, 0, W, H);
  for (const [step, col] of [[250, 'rgba(120,200,255,0.10)'], [1000, 'rgba(120,200,255,0.30)']]) {
    x.strokeStyle = col; x.lineWidth = 1; x.beginPath();
    for (let i = -Math.ceil(cx / (step * s)); i <= Math.ceil(cx / (step * s)); i++) { const X = Math.round(cx + i * step * s) + 0.5; x.moveTo(X, 0); x.lineTo(X, H); }
    for (let i = -Math.ceil(cy / (step * s)); i <= Math.ceil(cy / (step * s)); i++) { const Y = Math.round(cy + i * step * s) + 0.5; x.moveTo(0, Y); x.lineTo(W, Y); }
    x.stroke();
  }
  x.fillStyle = 'rgba(150,210,255,0.55)'; x.font = '600 9px "IBM Plex Mono", monospace'; x.textAlign = 'center'; x.textBaseline = 'top';
  for (let i = 1; i * 1000 * s < cx; i++) { x.fillText(String(i), cx + i * 1000 * s, 3); x.fillText(String(i), cx - i * 1000 * s, 3); }
  x.textBaseline = 'alphabetic';
  const t = padSub(), me = match && hudSub(match);
  if (me) drawSubAt(x, me.subId, cx, cy, 0.32, 0, TEAMC[me.team], t ? buildPath(t, ctrl.worldPts(t)).face : (me.idx % 2 ? -1 : 1));
  x.font = '700 11px "Noto Sans KR", sans-serif';
  if (!t) {
    x.fillStyle = 'rgba(200,225,255,0.6)'; x.textAlign = 'center';
    x.fillText(match && match.phase === 'aim' ? '내 차례에 조준합니다' : '', cx, H - 10);
    return;
  }
  const d = CONFIG.subs[t.subId], path = buildPath(t, ctrl.worldPts(t)), P = padPts(t, S);
  // range ring
  x.strokeStyle = 'rgba(255,210,74,0.25)'; x.setLineDash([3, 4]); x.beginPath(); x.arc(cx, cy, d.range * s, 0, 7); x.stroke(); x.setLineDash([]);
  // refused part of the control polygon (bend too sharp)
  if (path.used < 3) {
    x.strokeStyle = 'rgba(255,90,74,0.85)'; x.lineWidth = 1.5; x.setLineDash([4, 4]); x.beginPath();
    const a = path.used === 0 ? [cx + (path.xs[0] - t.x) * s, cy + (path.ys[0] - t.y) * s] : P[path.used - 1];
    x.moveTo(a[0], a[1]); for (let i = path.used; i < 3; i++) x.lineTo(P[i][0], P[i][1]); x.stroke(); x.setLineDash([]);
  }
  x.strokeStyle = '#FFD24A'; x.lineWidth = 2; x.lineCap = 'round'; x.lineJoin = 'round'; x.beginPath();
  for (let i = 0; i < path.xs.length; i++) { const X = cx + (path.xs[i] - t.x) * s, Y = cy + (path.ys[i] - t.y) * s; i ? x.lineTo(X, Y) : x.moveTo(X, Y); }
  x.stroke();
  if (ctrl.charging) {
    const q = pathAt(path, burstDistance(path, Math.round(ctrl.gauge))), X = cx + (q.x - t.x) * s, Y = cy + (q.y - t.y) * s;
    x.fillStyle = '#FFF6C8'; x.beginPath(); x.arc(X, Y, 4, 0, 7); x.fill();
  }
  P.forEach((q, i) => {
    const bad = i >= path.used, hot = PAD.hover === i || PAD.drag === i, r = hot ? 9 : 8;
    x.fillStyle = bad ? '#FF7A59' : hot ? '#FFF0A8' : '#FFD24A'; x.strokeStyle = PAD.sel === i ? '#FFFFFF' : '#3A2A00'; x.lineWidth = PAD.sel === i ? 2 : 1.5;
    x.beginPath(); x.arc(q[0], q[1], r, 0, 7); x.fill(); x.stroke();
    x.fillStyle = '#2A1A00'; x.font = '800 10px "IBM Plex Mono", monospace'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(String(i + 1), q[0], q[1] + 0.5); x.textBaseline = 'alphabetic';
  });
  x.font = '700 10px "IBM Plex Mono", monospace'; x.textAlign = 'left'; x.fillStyle = 'rgba(220,235,255,0.8)';
  x.fillText(`곡선 ${Math.round(path.L)} / ${d.range}` + (path.used < 3 ? `  꺾임 초과(${d.turn}°)` : `  꺾임 ${d.turn}°`), 6, H - 6);
  x.textAlign = 'right'; x.fillText(`×${PAD.zooms[PAD.zi]}`, W - 6, H - 6);
}
// the hint line and the tutorial box sit just above the bottom panel, whatever its height
try { const hb = document.querySelector('.hud-bottom'); new ResizeObserver(() => document.documentElement.style.setProperty('--hudh', hb.offsetHeight + 'px')).observe(hb); } catch (e) {}
function padLocal(e) { const r = pad.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
function padNearest(t, px, py, S, maxR) { let best = -1, bd = maxR * maxR; padPts(t, S).forEach((q, i) => { const dd = (q[0] - px) ** 2 + (q[1] - py) ** 2; if (dd < bd) { bd = dd; best = i; } }); return best; }
function padSet(t, i, px, py, S) { const s = padScale(S); ctrl.setPoint(i, t.x + (px - S.w / 2) / s, t.y + (py - S.h / 2) / s); PAD.used = true; }
pad.addEventListener('pointerdown', e => {
  const t = padSub(); if (!t || ctrl.charging) return;
  const S = padSize(), [px, py] = padLocal(e);
  // grab the handle under the pointer; on empty grid the nearest handle jumps there
  let i = padNearest(t, px, py, S, 14); if (i < 0) i = padNearest(t, px, py, S, 1e6);
  PAD.drag = PAD.sel = i; pad.setPointerCapture(e.pointerId); padSet(t, i, px, py, S);
});
pad.addEventListener('pointermove', e => {
  const t = padSub(), S = padSize(), [px, py] = padLocal(e);
  if (PAD.drag >= 0) { if (t && !ctrl.charging) padSet(t, PAD.drag, px, py, S); else PAD.drag = -1; return; }
  PAD.hover = t ? padNearest(t, px, py, S, 14) : -1;
});
pad.addEventListener('pointerup', () => { PAD.drag = -1; });
pad.addEventListener('pointercancel', () => { PAD.drag = -1; });
pad.addEventListener('lostpointercapture', () => { PAD.drag = -1; });
pad.addEventListener('pointerleave', () => { PAD.hover = -1; });
pad.addEventListener('wheel', e => { e.preventDefault(); PAD.zi = clampN(PAD.zi + (e.deltaY < 0 ? 1 : -1), 0, PAD.zooms.length - 1); }, { passive: false });
// keyboard fine-tuning of the selected handle: Tab picks, Shift+arrows nudge by 10
function padNudge(dx, dy) { const t = padSub(); if (!t || ctrl.charging) return; const p = ctrl.worldPts(t)[PAD.sel]; ctrl.setPoint(PAD.sel, p[0] + dx, p[1] + dy); PAD.used = true; }
function updateHud() {
  const m = match, t = hudSub(m), cur = m.cur >= 0 ? m.subs[m.cur] : null; if (!t || !cur) return;
  const mineNow = ctrl.activeLocal();
  const d = CONFIG.subs[t.subId];
  setTxt('whoName', t.nick + ' · ' + d.name);
  setTxt('whoHp', t.alive ? `체력 ${t.hp} / ${t.maxhp}` + (t.shock ? ' · 감전' : '') + (t.shield ? ' · 실드' : '') + (m.turn && m.cur === t.idx && m.phase === 'aim' ? (m.turn.double ? ' · 2연발 준비' : m.turn.tele ? ' · 순간이동 준비' : m.turn.amp ? ' · 증폭 준비' : '') : '') : (t.deathCause === 'out' ? '장외' : '격침됨') + ' · 관전 중');
  $('hpBar').style.width = (100 * t.hp / t.maxhp) + '%'; $('hpBar').style.background = t.team === 'red' ? '#F0583E' : '#3E94F0';
  $('fuelBar').style.width = (100 * Math.min(1, t.fuel / d.movePx)) + '%';
  const pw = ctrl.charging && mineNow ? ctrl.gauge / 1000 : 0;
  $('gauge').classList.toggle('charging', ctrl.charging && mineNow);
  $('pw').style.width = (pw * 100) + '%';
  setTxt('pwTxt', Math.round(pw * 100) + '%');
  const lp = $('pwLast'); lp.hidden = t.lastGauge < 0; if (t.lastGauge >= 0) lp.style.left = `calc(${t.lastGauge / 10}% - 1px)`;
  for (let i = 0; i < 2; i++) {
    const b = $('w' + i), w = d.weapons[i];
    const label = `${i + 1}  ${w.name}` + (i === 1 && t.cd > 0 ? ` (${t.cd}턴 후)` : '');
    if (hudCache['w' + i] !== label) { hudCache['w' + i] = label; b.textContent = label; }
    b.classList.toggle('sel', ctrl.weapon === i && (mineNow || !ON.active)); b.disabled = (i === 1 && t.cd > 0) || (ON.active && !mineNow);
  }
  const secs = Math.max(0, Math.ceil(ctrl.timeLeft / CONFIG.physics.tickRate));
  setTxt('timer', m.phase === 'aim' ? secs + '' : '–');
  $('timer').classList.toggle('low', m.phase === 'aim' && secs <= 10);
  const cd = Math.abs(m.current), cmax = CONFIG.turn.currentMax;
  setTxt('windLbl', '해류');
  setTxt('mapRule', '★ ' + (CONFIG.maps[m.mapId].rule || ''));
  setTxt('windTxt', (m.sudden ? '서든데스 · ' : '') + (m.current === 0 ? '없음' : (m.current < 0 ? '← ' : '') + cd + (m.current > 0 ? ' →' : '')) + (m.rules.currentMul && m.current ? ` (×${m.rules.currentMul})` : '') + (m.turn && m.turn.calm ? ' (정류탄)' : ''));
  $('windBar').querySelectorAll('i').forEach((el, i) => { const n = Math.ceil(cd * 5 / cmax); const on = m.current < 0 ? (i < 5 && i >= 5 - n) : (i >= 5 && i < 5 + n); el.classList.toggle('on', on); });
  const used = m.turn && m.turn.itemUsed;
  const key = t.items.join(',') + '|' + used + '|' + mineNow + '|' + m.turnNo;
  if (hudCache.items !== key) {
    hudCache.items = key; const box = $('items'); box.innerHTML = '';
    for (let i = 0; i < CONFIG.turn.inventoryMax; i++) {
      const it = t.items[i], b = document.createElement('button'); b.type = 'button'; b.className = 'item' + (it ? '' : ' empty');
      if (it) {
        const meta = CONFIG.items[it]; b.style.background = meta.bg; b.style.borderColor = meta.color;
        b.innerHTML = `<span class="key">${i + 3}</span><span class="ic" style="color:${meta.color}">${meta.label}</span><span class="t">${meta.name}</span>`;
        b.title = meta.name + ' — ' + meta.desc; b.disabled = used || !mineNow; if (used || !mineNow) b.style.opacity = 0.45;
        b.onclick = () => useItemSlot(i);
      } else { b.disabled = true; b.setAttribute('aria-label', '빈 칸'); }
      box.appendChild(b);
    }
  }
  updateStatus(m, cur);
  const mood = R.moodOf(t), crit = mood === 2;
  if (hudCache.portrait !== t.subId + t.team + mood + (crit ? Math.floor(R.t * 2) % 2 : '')) {
    hudCache.portrait = t.subId + t.team + mood + (crit ? Math.floor(R.t * 2) % 2 : ''); const p = $('portrait').getContext('2d'); p.clearRect(0, 0, 172, 128);
    drawSubAt(p, t.subId, 86, 66, 1.05, crit ? R.t : 0.3, TEAMC[t.team], 1, mood);
  }
  const gone = ON.active && ON.goneTeam && m.phase !== 'over' ? `${ON.goneTeam.team === 'red' ? '레드' : '블루'} 팀이 모두 나갔습니다 · ${ON.goneTeam.left}초 뒤 기권 처리` : '';
  const botTurn = !ON.active && m.phase === 'aim' && PRACTICE.bots[cur.id] ? `${cur.nick} 생각 중…` : '';
  const waitTxt = gone ? gone : botTurn ? botTurn : ON.active && m.phase === 'aim' && !mineNow ? (ON.syncing ? '진행 중인 게임에 맞추는 중…' : ON.spectator || !t.alive ? `관전 중 · ${cur.nick}의 차례` : `${cur.nick}의 차례 — 기다리는 중`) : '';
  if (hudCache.wait !== waitTxt) { hudCache.wait = waitTxt; $('waitTag').textContent = waitTxt; $('waitTag').hidden = !waitTxt; }
}
function updateStatus(m, cur) {
  const box = $('status');
  if (hudCache.statusFor !== m) {
    hudCache.statusFor = m; box.innerHTML = '';
    for (const team of ['red', 'blue']) {
      const row = document.createElement('div'); row.className = 'srow ' + team;
      for (const x of m.subs.filter(k => k.team === team)) {
        const c = document.createElement('div'); c.className = 'sc ' + team; c.dataset.idx = x.idx;
        const no = document.createElement('span'); no.className = 'no';
        const th = cloneCanvas(thumbs[x.subId]); th.className = 'sth';
        const sm = document.createElement('div'); sm.className = 'sm';
        const nm = document.createElement('b'); nm.textContent = x.nick + (ON.active && x.id === ON.myId ? ' (나)' : '');
        const hp = document.createElement('i'); hp.className = 'hp'; const hf = document.createElement('i'); hp.append(hf);
        const st = document.createElement('span'); st.className = 'st';
        sm.append(nm, hp, st); c.append(no, th, sm); c.title = `${x.nick} · ${CONFIG.subs[x.subId].name}`;
        row.append(c);
      }
      box.append(row);
    }
  }
  const order = [cur, ...m.subs.filter(x => x.alive && x !== cur).sort((a, b) => a.delay - b.delay || a.idx - b.idx)];
  const L = ON.active ? ON.link : null;
  for (const c of box.querySelectorAll('.sc')) {
    const x = m.subs[+c.dataset.idx], pos = order.indexOf(x), off = L && !L.online(x.id) && x.id !== ON.myId;
    const key = [x.hp, x.alive, pos, off, x.shock ? 1 : 0, x.shield ? 1 : 0].join(',');
    if (c.dataset.k === key) continue; c.dataset.k = key;
    c.classList.toggle('now', x === cur && x.alive); c.classList.toggle('dead', !x.alive); c.classList.toggle('off', !!off);
    c.classList.toggle('me', !!(ON.active && x.id === ON.myId));
    c.querySelector('.no').textContent = !x.alive ? '✕' : pos === 0 ? '▶' : String(pos + 1);
    c.querySelector('.hp > i').style.width = (100 * Math.max(0, x.hp) / x.maxhp) + '%';
    c.querySelector('.st').textContent = !x.alive ? (x.deathCause === 'out' ? '장외' : '격침') : off ? '연결 끊김' : `${x.hp}` + (x.shock ? ' · 감전' : '') + (x.shield ? ' · 실드' : '');
  }
}
function useItemSlot(i) {
  if (!ctrl || !ctrl.activeLocal() || match.turn.itemUsed) return;
  AU.play('ui'); ctrl.useItem(i);
}

// ---------------------------------------------------------------- input
const KEYMAP = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', Space: 'fire' };
const camKeys = {};
function inGame() { return !!match && screen === 'game'; }
window.addEventListener('pointerdown', () => AU.unlock(), { capture: true });
window.addEventListener('keydown', e => {
  if (e.ctrlKey || e.metaKey || e.altKey) return; // browser shortcuts (Ctrl+R, Cmd+1 …) are not game keys
  AU.unlock();
  if (!inGame() || e.target.tagName === 'INPUT') return;
  if (e.shiftKey && e.code.startsWith('Arrow')) { e.preventDefault(); const k = { ArrowLeft: [-10, 0], ArrowRight: [10, 0], ArrowUp: [0, -10], ArrowDown: [0, 10] }[e.code]; padNudge(k[0], k[1]); return; }
  if (e.code === 'Tab') { e.preventDefault(); PAD.sel = (PAD.sel + (e.shiftKey ? 2 : 1)) % 3; return; }
  if (KEYMAP[e.code]) { e.preventDefault(); if (!e.repeat) { ctrl.keys[KEYMAP[e.code]] = true; if (e.code !== 'Space') R.free = false; } }
  if (['KeyA', 'KeyD', 'KeyW', 'KeyS'].includes(e.code)) camKeys[e.code] = true;
  if (e.code === 'Digit1') ctrl.selectWeapon(0);
  if (e.code === 'Digit2') ctrl.selectWeapon(1);
  if (['Digit3', 'Digit4', 'Digit5', 'Digit6'].includes(e.code)) useItemSlot(+e.code.slice(5) - 3);
  if (e.code === 'KeyF') recenter();
  if (e.code === 'KeyR' && ctrl.activeLocal()) ctrl.resetCurve();
});
window.addEventListener('keyup', e => { if (KEYMAP[e.code] && ctrl) ctrl.keys[KEYMAP[e.code]] = false; camKeys[e.code] = false; });
window.addEventListener('blur', () => { if (ctrl) for (const k in ctrl.keys) ctrl.keys[k] = false; for (const k in camKeys) camKeys[k] = false; });
// pointer: grab a curve handle (my turn) or pan the camera
let drag = null;
cv.addEventListener('pointerdown', e => {
  if (!inGame()) return;
  drag = { x: e.clientX, y: e.clientY, cx: R.cam.x, cy: R.cam.y, moved: false }; cv.setPointerCapture(e.pointerId);
});
cv.addEventListener('pointermove', e => {
  if (!drag) return;
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
  if (Math.abs(dx) + Math.abs(dy) > 6) { drag.moved = true; cv.classList.add('dragging'); R.free = true; }
  if (drag.moved) { R.cam.x = drag.cx - dx / R.cam.zoom; R.cam.y = drag.cy - dy / R.cam.zoom; }
});
cv.addEventListener('pointerup', () => { drag = null; cv.classList.remove('dragging'); });
cv.addEventListener('pointercancel', () => { drag = null; cv.classList.remove('dragging'); });
mini.addEventListener('pointerdown', e => { const r = mini.getBoundingClientRect(); R.cam.x = (e.clientX - r.left) / r.width * match.W; R.cam.y = (e.clientY - r.top) / r.height * match.H; R.free = true; });
function syncSettings() {
  const sb = $('sndBtn'), kb = $('shakeBtn');
  sb.textContent = AU.muted ? '소리 꺼짐' : '소리 켜짐'; sb.setAttribute('aria-pressed', String(!AU.muted));
  kb.textContent = R.reduceMotion ? '흔들림 끔' : '흔들림'; kb.setAttribute('aria-pressed', String(!R.reduceMotion));
  for (const id of ['musicBtn', 'musicBtn2']) { const b = $(id); if (b) { b.textContent = AU.musicOn ? '음악 켜짐' : '음악 꺼짐'; b.setAttribute('aria-pressed', String(AU.musicOn)); } }
}
for (const id of ['musicBtn', 'musicBtn2']) $(id).addEventListener('click', () => { AU.unlock(); AU.setMusic(!AU.musicOn); syncSettings(); });
$('sndBtn').addEventListener('click', () => { AU.unlock(); AU.setMuted(!AU.muted); syncSettings(); });
$('shakeBtn').addEventListener('click', () => { R.reduceMotion = !R.reduceMotion; if (R.reduceMotion) R.shake = 0; try { localStorage.setItem('bm.shake', R.reduceMotion ? '0' : '1'); } catch (e) {} syncSettings(); });
syncSettings();
function recenter() {
  if (!match) return;
  const mine = ON.active && match.subs.find(t => t.id === ON.myId && t.alive);
  if (mine) R.camTo(mine); else if (match.cur >= 0) R.camTo(match.subs[match.cur]);
}
$('recenter').addEventListener('click', recenter);
$('w0').addEventListener('click', () => ctrl && ctrl.selectWeapon(0));
$('w1').addEventListener('click', () => ctrl && ctrl.selectWeapon(1));
document.querySelectorAll('[data-k]').forEach(b => {
  const k = KEYMAP[b.dataset.k];
  const down = e => { e.preventDefault(); AU.unlock(); if (ctrl) { ctrl.keys[k] = true; R.free = false; } };
  const up = e => { e.preventDefault(); if (ctrl) ctrl.keys[k] = false; };
  b.addEventListener('pointerdown', down); b.addEventListener('pointerup', up); b.addEventListener('pointerleave', up); b.addEventListener('pointercancel', up);
});
window.addEventListener('resize', () => R.resize());

// ---------------------------------------------------------------- setup
const setup = { map: 'atlantic', red: 2, blue: 2, slots: { red: [], blue: [] } };
let thumbs = {};
function slotDefault(team, i) { return { nick: (team === 'red' ? '레드' : '블루') + ' ' + (i + 1), tank: PICK_KEYS[(team === 'red' ? i * 2 : i * 2 + 5) % PICK_KEYS.length], ctl: team === 'red' ? 'human' : 'easy' }; }
const CTL = [['human', '사람'], ['easy', '봇 · 쉬움'], ['normal', '봇 · 보통'], ['hard', '봇 · 어려움']];
for (const team of ['red', 'blue']) for (let i = 0; i < 4; i++) setup.slots[team].push(slotDefault(team, i));
try { const sv = JSON.parse(localStorage.getItem('bm.setup') || 'null'); if (sv && sv.slots && CONFIG.maps[sv.map]) Object.assign(setup, sv); } catch (e) {}
function saveSetup() { try { localStorage.setItem('bm.setup', JSON.stringify(setup)); } catch (e) {} }
function cloneCanvas(c) { const n = document.createElement('canvas'); n.width = c.width; n.height = c.height; n.getContext('2d').drawImage(c, 0, 0); return n; }
const previews = {};
function renderSetup() {
  const maps = $('maps'); maps.innerHTML = '';
  for (const [k, meta] of Object.entries(CONFIG.maps)) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'mapc' + (setup.map === k ? ' sel' : '');
    b.append((() => { const c = document.createElement('canvas'); previewInto(c, k); return c; })());
    const inner = document.createElement('div'); inner.className = 'in';
    inner.innerHTML = `<span class="t">${meta.name}</span><span class="g">${meta.en} · ${meta.tag}</span><span class="d">${meta.desc}</span><span class="r">★ ${meta.rule}</span>`;
    b.append(inner); b.onclick = () => { setup.map = k; saveSetup(); renderSetup(); };
    maps.appendChild(b);
  }
  document.querySelectorAll('.seg[data-team]').forEach(s => s.classList.toggle('sel', +s.dataset.n === setup[s.dataset.team]));
  const slots = $('slots'); slots.innerHTML = '';
  for (const team of ['red', 'blue']) for (let i = 0; i < setup[team]; i++) {
    const sl = setup.slots[team][i], row = document.createElement('div'); row.className = 'slot';
    const tag = document.createElement('label'); tag.className = 'tag ' + team;
    const sp = document.createElement('span'); sp.textContent = (team === 'red' ? '레드 ' : '블루 ') + (i + 1);
    const inp = document.createElement('input'); inp.id = `nick-${team}-${i}`; inp.maxLength = 8; inp.value = sl.nick; inp.placeholder = '닉네임';
    inp.oninput = () => { sl.nick = inp.value; saveSetup(); };
    const sel = document.createElement('select'); sel.className = 'ctl'; sel.setAttribute('aria-label', `${sp.textContent} 조작`);
    for (const [v, lb] of CTL) { const o = document.createElement('option'); o.value = v; o.textContent = lb; sel.append(o); }
    if (!sl.ctl) sl.ctl = team === 'red' ? 'human' : 'easy';
    sel.value = sl.ctl; sel.onchange = () => { sl.ctl = sel.value; saveSetup(); };
    tag.append(sp, inp, sel); row.append(tag);
    const picks = document.createElement('div'); picks.className = 'picks';
    if (!CONFIG.subs[sl.tank] && sl.tank !== 'random') sl.tank = PICK_KEYS[0];
    if (CONFIG.subs[sl.tank] && CONFIG.subs[sl.tank].hidden) sl.tank = 'random';
    buildPicks(picks, sl.tank, k => { sl.tank = k; setupInfo = k; saveSetup(); renderSetup(); }, sp.textContent, k => renderTankCard($('setupTankInfo'), k));
    picks.onmouseleave = () => renderTankCard($('setupTankInfo'), setupInfo);
    row.appendChild(picks); slots.appendChild(row);
  }
  if (!setupInfo) setupInfo = setup.slots.red[0].tank;
  renderTankCard($('setupTankInfo'), setupInfo);
}
let setupInfo = null;
document.querySelectorAll('.seg[data-team]').forEach(s => s.onclick = () => { setup[s.dataset.team] = +s.dataset.n; saveSetup(); renderSetup(); });
$('rand').onclick = () => { for (const team of ['red', 'blue']) for (const sl of setup.slots[team]) sl.tank = 'random'; saveSetup(); renderSetup(); };
$('start').onclick = startGame;
$('again').onclick = () => { $('over').hidden = true; startGame(); };
$('toSetup').onclick = () => { $('over').hidden = true; showScreen('setup'); };
// ---------------------------------------------------------------- tutorial (1:1 against an easy bot)
const TUT = { on: false, step: 0 };
const TUT_STEPS = [
  { text: '방향키로 잠수함을 움직여 보세요. 위아래로도 갈 수 있고, 이동할수록 이동력 막대가 줄어듭니다.', done: (m, t) => Math.abs(t.x - TUT.x0) + Math.abs(t.y - TUT.y0) > 40 },
  { text: '아래 조준판의 노란 점 1·2·3을 끌어 어뢰가 갈 곡선을 그리세요. 조준판 가운데가 내 잠수함, 한 칸 = 250, 굵은 줄 = 1000입니다. 맵에는 곡선이 보이지 않으니 적까지 거리를 눈으로 재세요. (휠 = 확대, Tab·Shift+방향키 = 미세 조정)', done: () => TUT.dragged },
  { text: '스페이스를 누르고 있으면 게이지가 찹니다. 게이지 = 곡선 처음→끝 중 터질 곳. 조준판의 흰 점이 그 위치예요. 떼면 발사!', done: m => m.phase !== 'aim' },
  { text: '어뢰는 해류에 옆으로 밀립니다. 위쪽 해류 세기를 보고, 밀리는 만큼 곡선 끝을 반대쪽으로 옮겨 보세요.', done: m => m.phase === 'aim' && m.turnNo > TUT.turn0 },
  { text: '적이 바위 뒤에 숨으면 곡선을 휘어 돌아 들어가거나, 세로·십자로 터지는 무기로 바위 너머를 노리세요. 적을 밀어 바위에 박아도 피해!', done: (m, t, sec) => m.phase === 'aim' && !PRACTICE.bots[m.subs[m.cur].id] && sec > 5 },
  { text: '1·2 키로 무기를 바꾸고(2번은 특수 무기, 재충전 있음), 3~6 키로 보급품을 씁니다. 이제 상대를 격침해 보세요!', done: (m, t, sec) => sec > 9 },
];
function startTutorial() {
  TUT.on = true; TUT.step = 0; TUT.since = performance.now(); TUT.dragged = false; PAD.used = false;
  const players = [{ id: 'r0', nick: ON.nick || savedNick() || '나', team: 'red', subId: 'uboat' }, { id: 'b0', nick: '연습 상대·봇', team: 'blue', subId: 'sona', bot: 'easy' }];
  ON.active = false;
  // fixed tutorial layout (아틀란틱, seed 3)
  beginMatch({ seed: 3, mapId: 'atlantic', players }, practiceOpts({ b0: 'easy' })); // fixed: I move first, open water, clear line ~1250px
  showScreen('game'); showCoach();
}
function showCoach() {
  const c = $('coach'); c.hidden = !TUT.on; if (!TUT.on) return;
  $('coachStep').textContent = `튜토리얼 ${Math.min(TUT.step + 1, TUT_STEPS.length)} / ${TUT_STEPS.length}`;
  $('coachText').textContent = TUT_STEPS[TUT.step].text;
}
function tutorialFrame() {
  if (!TUT.on || !match) return;
  const m = match, t = m.subs[0], st = TUT_STEPS[TUT.step];
  if (PAD.used) TUT.dragged = true;
  if (TUT.x0 === undefined || TUT.at !== TUT.step) { TUT.at = TUT.step; TUT.x0 = t.x; TUT.y0 = t.y; TUT.since = performance.now(); TUT.turn0 = m.turnNo; }
  if (st.done(m, t, (performance.now() - TUT.since) / 1000)) {
    TUT.step++; AU.play('pickup');
    if (TUT.step >= TUT_STEPS.length) { TUT.on = false; banner('튜토리얼 완료!'); }
    showCoach();
  }
}
// practice bots: think, bend the curve into place, run the gauge, fire — visible like a person
const PRACTICE = { bots: {} };
const BOTVIEW = { pts: null, charging: false, gauge: 0 };
function practiceOpts(bots) {
  PRACTICE.bots = bots;
  const B = { turn: -1, mem: {} };
  return {
    isLocal: idx => !bots[match.subs[idx].id],
    remote: (m, t) => {
      const lv = bots[t.id]; if (!lv) return;
      if (B.turn !== m.turnNo) { B.turn = m.turnNo; B.stage = 'think'; B.wait = 60 + Math.floor(Math.random() * 60); B.plan = null; BOTVIEW.pts = null; BOTVIEW.charging = false; }
      if (ctrl.timeLeft > 0) ctrl.timeLeft--;
      if (B.stage === 'think') {
        if (--B.wait > 0) return;
        B.plan = botPlan(m, lv, Math.random, B.mem[t.id] || (B.mem[t.id] = {}));
        if (m.phase !== 'aim') return;
        if (!B.plan) { cmdTimeout(m); return; }
        const f = B.plan.pts[2]; B.from = [[t.x + (f[0] - t.x) / 3, t.y + (f[1] - t.y) / 3], [t.x + (f[0] - t.x) * 2 / 3, t.y + (f[1] - t.y) * 2 / 3], [f[0], f[1]]];
        B.stage = 'aim'; B.k = 0; return;
      }
      if (B.stage === 'aim') {
        B.k = Math.min(1, B.k + TICK / 0.9);
        const e = B.k * B.k * (3 - 2 * B.k);
        BOTVIEW.pts = B.plan.pts.map((p, i) => [Math.round(lerp(B.from[i][0], p[0], e)), Math.round(lerp(B.from[i][1], p[1], e))]);
        if (B.k >= 1) { B.stage = 'charge'; B.wait = 20; BOTVIEW.gauge = 0; }
        return;
      }
      if (B.stage === 'charge') {
        if (--B.wait > 0) return;
        BOTVIEW.charging = true;
        BOTVIEW.gauge = Math.min(B.plan.gauge, BOTVIEW.gauge + 1000 / CONFIG.aim.gaugeTicks);
        if (BOTVIEW.gauge >= B.plan.gauge) { BOTVIEW.charging = false; BOTVIEW.pts = null; B.stage = 'done'; cmdFire(m, B.plan.pts, B.plan.gauge, B.plan.weapon, CONFIG.turn.timeLimitTicks - ctrl.timeLeft); }
      }
    },
  };
}
function installMatch(m, opts) {
  match = m;
  ctrl = createController(match, opts || {});
  for (const k in hudCache) delete hudCache[k];
  R.setMatch(match); R.resize(); buildWindBar();
  R.isMine = t => ON.active && t.id === ON.myId;
  window.__pg.match = match; window.__pg.ctrl = ctrl;
}
function beginMatch(cfg, opts) {
  installMatch(createMatch(cfg), opts);
  $('over').hidden = true; $('loading').hidden = true;
}
function announceHappening() {
  const kd = match && match.subs.filter(t => CONFIG.subs[t.subId].hidden);
  if (kd && kd.length) setTimeout(() => { if (match && match.subs.includes(kd[0])) banner(`히든 잠수함 등장! ${kd.map(t => t.nick).join(', ')} — ${CONFIG.subs[kd[0].subId].name}`); }, 4000);
}
function startGame() {
  ON.active = false; TUT.on = false; showCoach();
  $('loading').hidden = false;
  setTimeout(() => {
    const players = [];
    for (const team of ['red', 'blue']) for (let i = 0; i < setup[team]; i++) {
      const sl = setup.slots[team][i];
      const ctl = sl.ctl || (team === 'red' ? 'human' : 'easy');
      players.push({ id: team[0] + i, nick: ((sl.nick || '').trim().slice(0, 8) || (team === 'red' ? '레드 ' : '블루 ') + (i + 1)) + (ctl === 'human' ? '' : '·봇'), team, subId: sl.tank === 'random' || !CONFIG.subs[sl.tank] ? rollRandomSub(Math.random) : sl.tank, bot: ctl === 'human' ? null : ctl });
    }
    const seed = (Math.random() * 4294967296) >>> 0;
    const bots = {}; for (const p of players) if (p.bot) bots[p.id] = p.bot;
    beginMatch({ seed, mapId: setup.map, players }, practiceOpts(bots));
    showScreen('game');
    banner(CONFIG.maps[setup.map].name);
    announceHappening();
  }, 30);
}

// ---------------------------------------------------------------- loop
let last = performance.now();
function loop(now) {
  // one bad frame (e.g. a corrupt packet) must never stop the game loop for good
  try { loopBody(now); } catch (e) { console.error('frame error', e); }
  requestAnimationFrame(loop);
}
function loopBody(now) {
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  if (inGame()) {
    const frozen = now < freezeUntil;
    if (match.phase !== 'over' && !frozen) ctrl.frame(dt);
    const active = match.phase === 'aim' && ctrl.activeLocal();
    AU.setCharge(active && ctrl.charging, ctrl.gauge / 1000);
    AU.setEngine(active && ctrl.moveDir() >= 0 && match.subs[match.cur].fuel > 0);
    const secs = Math.ceil(ctrl.timeLeft / CONFIG.physics.tickRate);
    if (active && secs <= 10 && secs !== lastSecs && secs > 0) AU.play('tick', { last: secs <= 3 });
    lastSecs = active ? secs : -1;
    const sp = 900 * dt;
    if (camKeys.KeyA) { R.cam.x -= sp; R.free = true; }
    if (camKeys.KeyD) { R.cam.x += sp; R.free = true; }
    if (camKeys.KeyW) { R.cam.y -= sp; R.free = true; }
    if (camKeys.KeyS) { R.cam.y += sp; R.free = true; }
    if (ON.active) onlineFrame(now); else tutorialFrame();
    R.frame(frozen ? dt * 0.08 : dt, null);
    updateHud(); drawPad();
  }
}
window.__pg = { CONFIG, R, AU, createMatch, stateHash, ON, TUT, get screen() { return screen; } };
(() => {
  document.title = GAME_NAME.full;
  R.resize();
  for (const k of SUB_KEYS) thumbs[k] = subThumb(k, 132, 98);
  thumbs.random = randomThumb(132, 98);
  routeStart();
  // the turn clock keeps running while this tab is hidden or frozen (requestAnimationFrame stops there)
  setInterval(() => { try { if (inGame() && ctrl && match && match.phase === 'aim') ctrl.checkTime(); } catch (e) {} }, 500);
  requestAnimationFrame(loop);
})();
