// ================================================================ 방 안 퍼즐 모달
function mhead(kind, title) { return `<div class="mh"><div><div class="mk">${kind}</div><h3>${title}</h3></div><button class="x" data-close aria-label="닫기">✕</button></div>`; }
// ---------------------------------------------------------------- 회전 타일 (회로 · 배관)
const N_ = 1, E_ = 2, S_ = 4, W_ = 8;
const rotM = m => ((m << 1) | (m >> 3)) & 15;
function rotGrid(o) {
  const w = o.w, h = o.h; let g, sr, er;
  for (let tries = 0; tries < 200; tries++) {
    sr = rndi(h); g = Array.from({ length: h }, () => Array(w).fill(0));
    const path = [[0, sr]], seen = new Set(['0,' + sr]);
    const dfs = (x, y) => { if (x === w - 1 && path.length >= w + 2) return true; const dirs = shuffle([[1, 0], [0, 1], [0, -1], [1, 0], [-1, 0]]); for (const [dx, dy] of dirs) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= h || seen.has(nx + ',' + ny)) continue; seen.add(nx + ',' + ny); path.push([nx, ny]); if (dfs(nx, ny)) return true; path.pop(); } return false; };
    if (!dfs(0, sr)) continue; er = path[path.length - 1][1];
    for (let k = 0; k < path.length; k++) { const [x, y] = path[k]; let m = 0; const pr = k ? path[k - 1] : [x - 1, y], nx = k < path.length - 1 ? path[k + 1] : [x + 1, y];
      for (const [px, py] of [pr, nx]) { if (px < x) m |= W_; if (px > x) m |= E_; if (py < y) m |= N_; if (py > y) m |= S_; } g[y][x] = m; }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (!g[y][x]) g[y][x] = pick([5, 3, 3, 7, 5, 11]);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let r = rndi(4); for (let k = 0; k < r; k++) g[y][x] = rotM(g[y][x]); }
    if (!flow().ok) break;
  }
  function flow() { const L = new Set(); if (!(g[sr][0] & W_)) return { L, ok: false }; const q = [[0, sr]]; L.add('0,' + sr); let ok = false;
    while (q.length) { const [x, y] = q.pop(); const m = g[y][x]; if (x === w - 1 && y === er && (m & E_)) ok = true;
      for (const [b, dx, dy, ob] of [[N_, 0, -1, S_], [E_, 1, 0, W_], [S_, 0, 1, N_], [W_, -1, 0, E_]]) { if (!(m & b)) continue; const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue; if (!(g[ny][nx] & ob) || L.has(nx + ',' + ny)) continue; L.add(nx + ',' + ny); q.push([nx, ny]); } }
    return { L, ok }; }
  const water = o.theme === 'water', on = water ? '#4FC3F7' : '#FFD24A', off = water ? '#9AA6B8' : '#5B6B82';
  const b = openModal(mhead(o.kind, o.title) + `<p class="q">${water ? '파이프를 눌러 돌려 <b>왼쪽 저수조</b>와 <b>오른쪽 배수구</b>를 잇자.' : '타일을 눌러 돌려 <b>왼쪽 전원</b>과 <b>오른쪽 출력</b>을 잇자. 불이 들어온 선이 연결된 길.'}</p><div class="rg" style="--w:${w};--bg:${water ? '#0E3A4A' : '#1E2638'}"><div class="rg-end l" style="grid-row:${sr + 1}">${water ? '💧' : '⚡'}</div><div class="rg-grid"></div><div class="rg-end r" style="grid-row:${er + 1}">${water ? '⤵' : '💡'}</div></div><div class="feed" id="rgf"></div>`, { wide: false, live: o.live });
  const grid = b.querySelector('.rg-grid'); grid.style.gridTemplateColumns = `repeat(${w},1fr)`;
  b.querySelector('.rg').style.gridTemplateRows = `repeat(${h},auto)`;
  const cells = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const c = document.createElement('button'); c.className = 'rgc'; c.setAttribute('aria-label', `타일 ${y + 1}행 ${x + 1}열`); c.onclick = () => { if (done) return; g[y][x] = rotM(g[y][x]); sfx('click'); paint(); }; grid.appendChild(c); cells.push([c, x, y]); }
  let done = false;
  function svg(m, c) { const L = (b, d) => m & b ? `<path d="${d}" stroke="${c}" stroke-width="16" stroke-linecap="round"/>` : ''; return `<svg viewBox="0 0 60 60">${L(N_, 'M30 30V0')}${L(E_, 'M30 30H60')}${L(S_, 'M30 30V60')}${L(W_, 'M30 30H0')}<circle cx="30" cy="30" r="9" fill="${c}"/></svg>`; }
  function paint() { const f = flow(); for (const [c, x, y] of cells) c.innerHTML = svg(g[y][x], f.L.has(x + ',' + y) ? on : off);
    if (f.ok && !done) { done = true; sfx('ok'); b.querySelector('#rgf').textContent = water ? '물이 흐른다!' : '회로 연결!'; modalLater(() => { closeModal(); o.onSolve(); }, 700); } }
  paint();
}
// ---------------------------------------------------------------- 안테나 시몬
function simon(onWin) {
  const C = ['#FF6A5A', '#FFD24A', '#7CFF8A', '#4FC3F7', '#C8B4FF'], NM = ['빨강', '노랑', '초록', '파랑', '보라'];
  const seq = Array.from({ length: 7 }, () => rndi(5)); const lens = [4, 5, 7]; let round = 0, pos = 0, busy = true;
  const b = openModal(mhead('ETRI · 통신 안테나실', '안테나 신호 따라 하기') + `<p class="q">접시 안테나가 깜박이는 순서를 기억했다가 그대로 누르자. <b id="sr">1</b> / 3 라운드</p><div class="simon">${C.map((c, i) => `<button class="smn" data-i="${i}" style="--c:${c}" aria-label="${NM[i]}"><span>${NM[i]}</span></button>`).join('')}</div><div class="feed" id="sf">잘 봐…</div>`, { onclose: () => { STATE.simonLit = -1; }, nofocus: true });
  const btns = [...b.querySelectorAll('.smn')];
  const flash = (i, ms) => { btns[i].classList.add('on'); STATE.simonLit = i; beep(330 + i * 110, ms / 1000 * .9, 'square', .05); modalLater(() => { btns[i].classList.remove('on'); STATE.simonLit = -1; }, ms); };
  function play() { busy = true; pos = 0; b.querySelector('#sr').textContent = round + 1; b.querySelector('#sf').textContent = '잘 봐…'; const n = lens[round], sp = 560 - round * 90; for (let k = 0; k < n; k++) modalLater(() => flash(seq[k], sp * 0.65), 600 + k * sp); modalLater(() => { busy = false; b.querySelector('#sf').textContent = '이제 눌러!'; }, 600 + n * sp); }
  btns.forEach(bt => bt.onclick = () => { if (busy) return; const i = +bt.dataset.i; flash(i, 200);
    if (i !== seq[pos]) { busy = true; sfx('bad'); b.querySelector('#sf').textContent = '틀렸다! 같은 라운드를 다시 보여 준다.'; b.querySelector('#sf').className = 'feed bad'; modalLater(() => { b.querySelector('#sf').className = 'feed'; play(); }, 1100); return; }
    pos++; if (pos >= lens[round]) { round++; busy = true; if (round >= 3) { sfx('ok'); b.querySelector('#sf').textContent = '신호 정렬 완료!'; modalLater(() => { closeModal(); onWin(); }, 700); } else { sfx('ok'); b.querySelector('#sf').textContent = '좋아! 다음 라운드'; modalLater(play, 900); } } });
  play();
}
// ---------------------------------------------------------------- 별자리
function shapeSVG(name, sz) { const p = SHAPES[name]; const xs = p.map(q => q[0]), ys = p.map(q => q[1]); const mx = Math.max(...xs), my = Math.max(...ys); const sc = (sz - 30) / Math.max(mx, my, 1);
  const P = p.map(([x, y]) => [15 + x * sc, 15 + y * sc]); let lines = ''; for (let k = 0; k < P.length - 1; k++) lines += `<line x1="${P[k][0]}" y1="${P[k][1]}" x2="${P[k + 1][0]}" y2="${P[k + 1][1]}" stroke="#FFE07A" stroke-width="2" stroke-dasharray="4 4"/>`;
  return `<svg viewBox="0 0 ${sz} ${sz}" width="${sz}" height="${sz}" style="background:#13294B;border-radius:12px">${lines}${P.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5" fill="#fff"/>`).join('')}</svg>`; }
function showShape() { openModal(mhead('KASI · 천문 관측실', '성도(星圖) — 오늘의 관측 목표') + `<div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap"><div>${shapeSVG(STATE.shape, 180)}</div><p class="q" style="flex:1;min-width:200px">관측 목표는 <b>${STATE.shape}</b>. 별 7개짜리 모양이다. 관측 돔 망원경으로 하늘에서 이 모양을 찾아 가운데 원에 넣고 촬영하자.<br><small class="note">비슷한 모양의 다른 별자리도 있으니 주의.</small></p></div><button class="btn" data-close>기억했다</button>`); }
function telescope(onWin) {
  const SW = 2400, SH = 1500, VWd = 640, VHd = 400; const r = Math.random; const stars = []; for (let k = 0; k < 520; k++) stars.push([r() * SW, r() * SH, r() < .1 ? 2 : 1]);
  const names = Object.keys(SHAPES); const cons = names.map(n => ({ n, x: 300 + r() * (SW - 700), y: 250 + r() * (SH - 600), s: 44 + r() * 8, rot: (r() - .5) * 0.5 }));
  // 겹치지 않게
  for (let i = 0; i < cons.length; i++) for (let j = 0; j < i; j++) if (Math.hypot(cons[i].x - cons[j].x, cons[i].y - cons[j].y) < 500) { cons[i].x = (cons[j].x + 900) % (SW - 600) + 300; }
  let vx = SW / 2 - VWd / 2, vy = SH / 2 - VHd / 2;
  const b = openModal(mhead('KASI · 관측 돔', '망원경 — ' + STATE.shape + ' 찾기') + `<div class="mini"><canvas id="tc" width="${VWd}" height="${VHd}"></canvas><div class="mhud"><span>끌어서 하늘 이동 · 방향키</span><span id="tco">목표: ${STATE.shape}</span></div></div><div class="ctrl"><button class="btn" id="tshot">📷 촬영</button><div style="flex:1">${shapeSVG(STATE.shape, 70)}</div></div><div class="feed" id="tf"></div>`, { wide: true });
  const c = b.querySelector('#tc'), x2 = c.getContext('2d'); let drag = null, done = false;
  function conPts(o) { const p = SHAPES[o.n]; return p.map(([x, y]) => { const ca = Math.cos(o.rot), sa = Math.sin(o.rot); return [o.x + (x * ca - y * sa) * o.s, o.y + (x * sa + y * ca) * o.s]; }); }
  function draw() { x2.fillStyle = '#070B1E'; x2.fillRect(0, 0, VWd, VHd); const g = x2.createRadialGradient(VWd / 2, VHd / 2, 50, VWd / 2, VHd / 2, 420); g.addColorStop(0, 'rgba(60,40,120,.35)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x2.fillStyle = g; x2.fillRect(0, 0, VWd, VHd);
    for (const [x, y, s] of stars) { const X = x - vx, Y = y - vy; if (X < -4 || Y < -4 || X > VWd + 4 || Y > VHd + 4) continue; x2.fillStyle = 'rgba(255,255,255,.55)'; x2.fillRect(X, Y, s, s); }
    for (const o of cons) for (const [x, y] of conPts(o)) { const X = x - vx, Y = y - vy; x2.fillStyle = '#fff'; x2.beginPath(); x2.arc(X, Y, 3.4, 0, 7); x2.fill(); x2.fillStyle = 'rgba(255,255,255,.18)'; x2.beginPath(); x2.arc(X, Y, 8, 0, 7); x2.fill(); }
    x2.strokeStyle = 'rgba(255,224,122,.9)'; x2.lineWidth = 2; x2.beginPath(); x2.arc(VWd / 2, VHd / 2, 150, 0, 7); x2.stroke(); x2.beginPath(); x2.moveTo(VWd / 2 - 14, VHd / 2); x2.lineTo(VWd / 2 + 14, VHd / 2); x2.moveTo(VWd / 2, VHd / 2 - 14); x2.lineTo(VWd / 2, VHd / 2 + 14); x2.stroke();
    // 신호 세기 (목표 별자리에 가까울수록)
    { const o = cons.find(c => c.n === STATE.shape), P = conPts(o); const mx = P.reduce((a, p) => a + p[0], 0) / P.length, my = P.reduce((a, p) => a + p[1], 0) / P.length; const d = Math.hypot(mx - vx - VWd / 2, my - vy - VHd / 2); const lv = d < 90 ? 5 : d < 220 ? 4 : d < 420 ? 3 : d < 700 ? 2 : 1; x2.fillStyle = 'rgba(14,20,38,.8)'; x2.fillRect(10, VHd - 40, 150, 30); x2.fillStyle = '#FFE07A'; x2.font = `800 13px ${FONT}`; x2.textAlign = 'left'; x2.fillText('신호', 18, VHd - 20); for (let k = 0; k < 5; k++) { x2.fillStyle = k < lv ? (lv >= 5 ? '#7CFF8A' : '#FFD24A') : '#3A4458'; x2.fillRect(56 + k * 18, VHd - 16 - k * 3, 12, 6 + k * 3); } }
    // 미니 위치
    x2.fillStyle = 'rgba(255,255,255,.15)'; x2.fillRect(VWd - 110, VHd - 74, 100, 64); x2.strokeStyle = '#FFE07A'; x2.strokeRect(VWd - 110 + vx / SW * 100, VHd - 74 + vy / SH * 64, VWd / SW * 100, VHd / SH * 64); }
  const pos = e => { const bb = c.getBoundingClientRect(); return [(e.clientX - bb.left) * VWd / bb.width, (e.clientY - bb.top) * VHd / bb.height]; };
  c.addEventListener('pointerdown', e => { drag = pos(e); c.setPointerCapture(e.pointerId); });
  c.addEventListener('pointermove', e => { if (!drag) return; const p = pos(e); vx = clamp(vx - (p[0] - drag[0]), 0, SW - VWd); vy = clamp(vy - (p[1] - drag[1]), 0, SH - VHd); drag = p; draw(); });
  c.addEventListener('pointerup', () => drag = null);
  modalKey(e => { const k = e.key; const d = 40; if (k === 'ArrowLeft') vx -= d; if (k === 'ArrowRight') vx += d; if (k === 'ArrowUp') vy -= d; if (k === 'ArrowDown') vy += d; vx = clamp(vx, 0, SW - VWd); vy = clamp(vy, 0, SH - VHd); draw(); });
  b.querySelector('#tshot').onclick = () => { if (done) return; const cx = vx + VWd / 2, cy = vy + VHd / 2; let hit = null;
    for (const o of cons) { const P = conPts(o); const mx = P.reduce((a, p) => a + p[0], 0) / P.length, my = P.reduce((a, p) => a + p[1], 0) / P.length; if (P.every(([x, y]) => Math.hypot(x - cx, y - cy) < 158) && Math.hypot(mx - cx, my - cy) < 90) hit = o; }
    const f = b.querySelector('#tf');
    if (!hit) { sfx('bad'); f.className = 'feed bad'; f.textContent = '원 안에 별자리가 다 들어오지 않았다.'; return; }
    if (hit.n !== STATE.shape) { sfx('bad'); f.className = 'feed bad'; f.textContent = `이건 「${hit.n}」. 목표는 「${STATE.shape}」.`; return; }
    done = true; sfx('ok'); f.className = 'feed'; f.innerHTML = `찰칵! 사진 귀퉁이에 숫자 <b class="mono">★ ${STATE.digits.star}</b>`; modalLater(() => { closeModal(); onWin(); }, 1400); };
  draw();
}
// ---------------------------------------------------------------- 키패드
function keypad(o) {
  let v = ''; let lock = 0, ok = false;
  const b = openModal(mhead(o.kind, o.title) + `<p class="q">${o.prompt}${o.extra || ''}</p><div class="kp-disp ${o.theme || ''}" id="kd">${'_'.repeat(o.len)}</div><div class="kp">${[1, 2, 3, 4, 5, 6, 7, 8, 9, '⌫', 0, '확인'].map(k => `<button class="kpb${k === '확인' ? ' go' : ''}" data-k="${k}">${k}</button>`).join('')}</div><div class="feed" id="kf"></div>`, { live: o.live });
  const disp = () => b.querySelector('#kd').textContent = (v + '_'.repeat(o.len)).slice(0, o.len).split('').join(' ');
  const press = k => { if (Date.now() < lock) return; sfx('click'); if (k === '⌫') v = v.slice(0, -1); else if (k === '확인') submit(); else if (v.length < o.len) v += k; disp(); };
  const submit = () => { const f = b.querySelector('#kf'); if (v.length < o.len) { f.className = 'feed bad'; f.textContent = `${o.len}자리를 다 넣자.`; return; } if (o.check(v)) { if (ok) return; ok = true; sfx('ok'); f.className = 'feed'; f.textContent = '승인!'; modalLater(() => { closeModal(); o.onOK(); }, 500); } else { sfx('bad'); f.className = 'feed bad'; f.innerHTML = o.fail + ' (3초 잠김)'; v = ''; lock = Date.now() + 3000; STATE.pen += o.penalty || 0; o.onFail && o.onFail(); } };
  b.querySelectorAll('.kpb').forEach(x => x.onclick = () => press(x.dataset.k));
  modalKey(e => { if (/^[0-9]$/.test(e.key)) press(e.key); if (e.key === 'Backspace') press('⌫'); if (e.key === 'Enter') { e.preventDefault(); press('확인'); } }); disp();
}
// ---------------------------------------------------------------- 포격 (옆에서 본 화면)
function artillery(onWin) {
  const W = 720, H = 340; const ground = x => 280 - Math.sin(x / 90) * 18 - (x > 360 ? (x - 360) * 0.12 : 0);
  let targets = [0, 1, 2].map(k => ({ x: 420 + k * 95 + rnd(-20, 20), alive: true })); targets.forEach(t => t.y = ground(t.x));
  const wall = { x: 330, h: 120 };
  let wind = rnd(-1, 1) * 2.2, ang = 45, pow = 62, shot = null, trail = [], shots = 0;
  const b = openModal(mhead('KARI · 발사 시험장 사격대', '표적 3개 맞히기') + `<div class="mini"><canvas id="ac" width="${W}" height="${H}"></canvas><div class="mhud"><span id="aw"></span><span id="as">남은 표적 3</span></div></div><div class="ctrl"><label>각도 <b id="aav">45°</b><span class="stp"><button class="btn sm ghost" data-d="aa:-1">−</button><input id="aa" type="range" min="10" max="80" value="45"><button class="btn sm ghost" data-d="aa:1">+</button></span></label><label>세기 <b id="apv">62</b><span class="stp"><button class="btn sm ghost" data-d="ap:-1">−</button><input id="ap" type="range" min="25" max="100" value="62"><button class="btn sm ghost" data-d="ap:1">+</button></span></label><button class="btn" id="afire">발사</button></div><p class="note">가운데 방호벽을 넘겨야 한다. 바람은 쏠 때마다 조금씩 바뀐다.</p>`, { wide: true });
  const c = b.querySelector('#ac'), x2 = c.getContext('2d');
  b.querySelector('#aa').oninput = e => { ang = +e.target.value; b.querySelector('#aav').textContent = ang + '°'; draw(); };
  b.querySelector('#ap').oninput = e => { pow = +e.target.value; b.querySelector('#apv').textContent = pow; draw(); };
  b.querySelectorAll('[data-d]').forEach(x => x.onclick = () => { const [id, d] = x.dataset.d.split(':'); const inp = b.querySelector('#' + id); inp.value = +inp.value + +d; inp.oninput({ target: inp }); });
  b.querySelector('#afire').onclick = () => { if (shot) return; const a = ang * Math.PI / 180, v = pow * 0.115; shot = { x: 60, y: ground(60) - 22, vx: Math.cos(a) * v, vy: -Math.sin(a) * v }; trail = []; shots++; beep(140, .25, 'sawtooth', .06, 60); loop(); };
  function draw() {
    if (!b.querySelector('#ac')) return;
    const sky = x2.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#7FC4F0'); sky.addColorStop(1, '#D6EEFA'); x2.fillStyle = sky; x2.fillRect(0, 0, W, H);
    x2.fillStyle = '#8CBF5A'; x2.beginPath(); x2.moveTo(0, H); for (let x = 0; x <= W; x += 6) x2.lineTo(x, ground(x)); x2.lineTo(W, H); x2.closePath(); x2.fill(); x2.strokeStyle = OL; x2.lineWidth = 2; x2.stroke();
    x2.fillStyle = '#6B7486'; x2.fillRect(wall.x - 10, ground(wall.x) - wall.h, 20, wall.h); x2.strokeRect(wall.x - 10, ground(wall.x) - wall.h, 20, wall.h);
    for (const t of targets) { if (!t.alive) { x2.fillStyle = 'rgba(14,34,56,.3)'; x2.fillRect(t.x - 14, t.y - 6, 28, 6); continue; } x2.fillStyle = '#fff'; x2.beginPath(); x2.arc(t.x, t.y - 20, 16, 0, 7); x2.fill(); x2.stroke(); x2.fillStyle = '#E0533F'; x2.beginPath(); x2.arc(t.x, t.y - 20, 10, 0, 7); x2.fill(); x2.fillStyle = '#fff'; x2.beginPath(); x2.arc(t.x, t.y - 20, 4, 0, 7); x2.fill(); x2.fillStyle = OL; x2.fillRect(t.x - 2, t.y - 4, 4, 4); }
    // 탱크
    const gx = 60, gy = ground(60); x2.fillStyle = '#2E86D6'; x2.fillRect(gx - 22, gy - 16, 44, 14); x2.strokeRect(gx - 22, gy - 16, 44, 14); x2.save(); x2.translate(gx, gy - 18); x2.rotate(-ang * Math.PI / 180); x2.fillStyle = '#1B5EA0'; x2.fillRect(0, -3, 30, 6); x2.restore(); x2.fillStyle = '#8CC8FF'; x2.beginPath(); x2.arc(gx, gy - 18, 9, 0, 7); x2.fill(); x2.stroke();
    // 조준선 (짧게)
    if (!shot) { x2.setLineDash([4, 6]); x2.strokeStyle = 'rgba(14,34,56,.5)'; x2.beginPath(); let px = 60, py = gy - 22, vx = Math.cos(ang * Math.PI / 180) * pow * 0.115, vy = -Math.sin(ang * Math.PI / 180) * pow * 0.115; x2.moveTo(px, py); for (let k = 0; k < 30; k++) { px += vx; py += vy; vy += 0.08; x2.lineTo(px, py); } x2.stroke(); x2.setLineDash([]); }
    x2.strokeStyle = 'rgba(224,83,63,.6)'; x2.lineWidth = 2; x2.beginPath(); trail.forEach(([x, y], k) => k ? x2.lineTo(x, y) : x2.moveTo(x, y)); x2.stroke();
    if (shot) { x2.fillStyle = OL; x2.beginPath(); x2.arc(shot.x, shot.y, 5, 0, 7); x2.fill(); }
    if (!b.querySelector('#aw')) return; b.querySelector('#aw').textContent = `바람 ${wind > 0 ? '→' : '←'} ${Math.abs(wind).toFixed(1)}`; b.querySelector('#as').textContent = `남은 표적 ${targets.filter(t => t.alive).length}`;
  }
  function loop() {
    if (!shot || $('#modal').hidden) return;
    for (let k = 0; k < 2; k++) { shot.vx += wind * 0.0016; shot.vy += 0.08; shot.x += shot.vx; shot.y += shot.vy; trail.push([shot.x, shot.y]);
      let boom = false; if (shot.x > wall.x - 10 && shot.x < wall.x + 10 && shot.y > ground(wall.x) - wall.h) boom = true;
      if (shot.y >= ground(shot.x) || shot.x > W + 20 || shot.x < -20) boom = true;
      for (const t of targets) if (t.alive && Math.hypot(shot.x - t.x, shot.y - (t.y - 20)) < 26) { t.alive = false; boom = true; sfx('ok'); }
      if (boom) { beep(80, .3, 'triangle', .12, 40); shot = null; wind = clamp(wind + rnd(-.8, .8), -2.6, 2.6); draw(); if (targets.every(t => !t.alive)) { modalLater(() => { closeModal(); toast(`표적 완파! (${shots}발) 표적판 뒷면에 숫자 <b>🚀 ${STATE.digits.rocket}</b>`, 3500); onWin(); }, 600); } return; } }
    draw(); requestAnimationFrame(loop);
  }
  draw();
}
// ---------------------------------------------------------------- 점화 타이밍
function ignition(onWin, o) {
  o = o || {}; const NEED = o.need || 3;
  let streak = 0, zone = [0.55, 0.22], t0 = performance.now(), spd = 1.6, done = false;
  const b = openModal(mhead(o.kind || 'KFE · 핵융합 실험동', o.title || '플라즈마 점화') + `<p class="q">바늘이 <b style="color:#2FA84F">초록 구간</b>에 들어왔을 때 점화! ${NEED}번 연속 성공${o.kind ? '' : '하면 KSTAR가 켜진다'}.</p><canvas id="ig" width="640" height="120" style="width:100%;border-radius:12px;border:2px solid var(--ink)"></canvas><div class="row" style="margin-top:10px"><button class="btn" id="igb">🔥 점화${COARSE ? '' : ' (Space)'}</button></div><div class="feed" id="igf">연속 0 / ${NEED}</div>`, { onclose: () => { done = true; }, live: o.live });
  const c = b.querySelector('#ig'), x2 = c.getContext('2d');
  const needle = () => (Math.sin((performance.now() - t0) / 1000 * spd * Math.PI) + 1) / 2;
  function draw() { if (done) return; x2.fillStyle = '#1E1838'; x2.fillRect(0, 0, 640, 120); x2.fillStyle = '#2FA84F'; x2.fillRect(20 + (zone[0] - zone[1] / 2) * 600, 30, zone[1] * 600, 60); x2.strokeStyle = '#fff'; x2.lineWidth = 2; x2.strokeRect(20, 30, 600, 60); for (let k = 0; k < 3; k++) { x2.fillStyle = k < streak ? '#FFB4F0' : '#3A3358'; x2.beginPath(); x2.arc(560 + k * 24, 14, 8, 0, 7); x2.fill(); } const n = needle(); x2.fillStyle = '#FFD24A'; x2.fillRect(20 + n * 600 - 3, 22, 6, 76); requestAnimationFrame(draw); }
  const fire = () => { if (done) return; const n = needle(), f = b.querySelector('#igf'); if (Math.abs(n - zone[0]) < zone[1] / 2) { streak++; sfx('ok'); if (streak >= NEED) { done = true; f.textContent = '점화 성공!'; modalLater(() => { closeModal(); onWin(); }, 600); return; } zone = [rnd(0.2, 0.8), zone[1] * 0.72]; spd *= 1.25; f.className = 'feed'; f.textContent = `연속 ${streak} / ${NEED} — 구간이 좁아진다`; } else { streak = 0; sfx('bad'); zone = [rnd(0.2, 0.8), 0.22]; spd = 1.6; f.className = 'feed bad'; f.textContent = `실패! 처음부터. 연속 0 / ${NEED}`; o.onFail && o.onFail(); } };
  b.querySelector('#igb').addEventListener('pointerdown', e => { e.preventDefault(); fire(); });
  modalKey(e => { if (e.key === ' ') { e.preventDefault(); fire(); } });
  draw();
}
// ---------------------------------------------------------------- 순서표 · 최종
function showOrder() { const S = STATE; openModal(mhead('NSR · 보안 금고', '📜 순서표') + `<p class="q">관제실 탈출 코드는 아래 <b>기호 순서</b>로 조각 숫자를 이어 붙인 것.</p><div class="ord">${S.order.map((k, i) => `<div><small>${i + 1}</small><b>${FRAGS[k].i}</b><span>${FRAGS[k].n}</span></div>`).join('')}</div><button class="btn" data-close>확인</button>`); }
function finalPanel() {
  const S = STATE; if (S.win) return;
  const have = Object.keys(S.frag).length;
  const fr = Object.keys(FRAGS).map(k => `<span class="pill${S.frag[k] ? ' ok' : ''}">${FRAGS[k].i} ${S.frag[k] ? S.digits[k] : '?'}</span>`).join('');
  const ord = S.items.order ? S.order.map(k => FRAGS[k].i).join(' → ') : '??? (순서표 필요)';
  keypad({ title: '탈출 코드 입력', kind: 'NST · 통합 관제실', prompt: `모은 조각 ${have}/4`, extra: `<div style="margin-top:8px">${fr}</div><div style="margin-top:6px;font-size:14px">입력 순서: <b>${ord}</b></div>`, len: 4, theme: 'term', penalty: 15,
    check: c => c === S.order.map(k => S.digits[k]).join(''), fail: '코드 불일치! (+15초)', onOK: () => escWin() });
}
function escWin() {
  const S = STATE; S.win = true; S.over = true; sfx('win'); try { localStorage.removeItem('kw_save_escape'); } catch (e) { } const tot = S.clock + S.pen;
  let best = null; try { best = +localStorage.getItem('kw_best_escape') || null; if (!best || tot < best) localStorage.setItem('kw_best_escape', String(Math.round(tot))); } catch (e) { }
  const star = tot < 900 ? 3 : tot < 1500 ? 2 : 1;
  later(() => openModal(`<div class="win"><div class="key">🏆</div><h3>탈출 성공!</h3><div class="sub">케이요새 연구단지 — 통합 관제실 재가동</div><p>기록 <b class="mono">${fmtT(tot)}</b> <br><small>플레이 ${fmtT(S.clock)} · 벌점 +${S.pen}초 · 힌트 ${S.hints}회</small></p><div style="font-size:38px">${'★'.repeat(star)}${'☆'.repeat(3 - star)}</div>${(() => { const sp = Object.entries(S.splits || {}).sort((a, b) => a[1] - b[1]); let prev = 0; return sp.length ? `<details style="text-align:left;margin:8px auto;max-width:420px"><summary style="cursor:pointer;font-weight:800">구간 기록 보기</summary><table style="width:100%;font-size:13px;border-collapse:collapse">${sp.map(([id, t]) => { const tk = TASKS.find(x => x.id === id); const r = `<tr><td style="padding:3px 0">${ROOMS[RID[tk.room]].s} · ${tk.t}</td><td style="text-align:right;font-variant-numeric:tabular-nums">${fmtT(t)} <small style="color:#7A889C">(+${fmtT(t - prev)})</small></td></tr>`; prev = t; return r; }).join('')}</table></details>` : ''; })()}${best && best < tot ? `<p class="note">최고 기록 ${fmtT(best)}</p>` : '<p class="note">새 최고 기록!</p>'}${kirdFact()}<div class="row"><button class="btn" id="again">다시 하기</button><button class="btn ghost" id="tomenu">모드 선택</button></div></div>`, { sticky: true }), 600);
  later(() => { const a = $('#again'), m = $('#tomenu'); a && (a.onclick = () => { closeModal(); startMode('escape'); }); m && (m.onclick = () => { closeModal(); showMenu(); }); }, 700);
}
