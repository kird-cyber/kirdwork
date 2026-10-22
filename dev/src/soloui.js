// ============================================================== SOLO UI: 연구부정 소탕전 화면 · 명예의 전당 · 기록 서버 연결
const SOLOPLAY = { active: false, day: '', tank: 'rookie', inputs: [], nick: '', key: '', tab: 'today', lastBoard: null };
const soStore = {
  get(k, d) { try { const v = localStorage.getItem('kyosae.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('kyosae.' + k, JSON.stringify(v)); } catch (e) {} },
};
const fmtSolo = t => { if (t == null || !isFinite(t)) return '–'; const m = Math.floor(t / 60), s = t - m * 60; return `${m}:${s < 10 ? '0' : ''}${s.toFixed(2)}`; };
function soDayText(day) { const [y, mo, d] = day.split('-').map(Number), w = '일월화수목금토'[new Date(Date.UTC(y, mo - 1, d)).getUTCDay()]; return `${mo}월 ${d}일 (${w})`; }

// ---------------------------------------------------------------- record server (Google Sheets web app) or this device
// The web app address: SOLO.boardUrl in solo.js, or ?board=… in the page address, or localStorage kyosae.board (for testing)
function soBoardUrl() {
  try { const q = new URLSearchParams(location.search).get('board'); if (q) return q; } catch (e) {}
  const s = soStore.get('board', ''); if (s) return s;
  return SOLO.boardUrl || '';
}
// a record as shown: clear = clock used, timeup = foe HP left
const fmtRec = r => !r ? '–' : r.kind === 'timeup' ? `적 체력 ${r.left} 남김` : fmtSolo(r.time);
// identical ranking rules to leaderboard/Code.gs, for the on-device fallback:
// every clear beats every timeup; clears by clock used, timeups by foe HP left; then my HP, then who was first
function soBetter(a, b) {
  const ga = a.kind === 'timeup' ? 1 : 0, gb = b.kind === 'timeup' ? 1 : 0;
  if (ga !== gb) return ga < gb;
  const ka = ga ? a.left : a.time, kb = gb ? b.left : b.time;
  return ka !== kb ? ka < kb : a.hp !== b.hp ? a.hp > b.hp : a.at < b.at;
}
function soBestPerNick(runs) {
  const m = {}; for (const r of runs) if (!m[r.nick] || soBetter(r, m[r.nick])) m[r.nick] = r;
  const out = Object.values(m).sort((a, b) => soBetter(a, b) ? -1 : soBetter(b, a) ? 1 : 0);
  out.forEach((r, i) => { r.rank = i + 1; }); return out;
}
function soLocalTop(day, nick) {
  const all = soStore.get('runs', []).filter(r => r.kind === 'clear' || r.kind === 'timeup').map(r => Object.assign({}, r));
  const today = soBestPerNick(all.filter(r => r.day === day)), ever = soBestPerNick(all.map(r => Object.assign({}, r)));
  const days = {}, fame = {}; for (const r of all) (days[r.day] = days[r.day] || []).push(Object.assign({}, r));
  for (const d in days) soBestPerNick(days[d]).slice(0, 10).forEach(r => { const f = fame[r.nick] = fame[r.nick] || { nick: r.nick, points: 0, firsts: 0, days: 0 }; f.points += 11 - r.rank; f.days++; if (r.rank === 1) f.firsts++; });
  const fl = Object.values(fame).sort((a, b) => b.points - a.points || b.firsts - a.firsts || (a.nick < b.nick ? -1 : 1)); fl.forEach((f, i) => { f.rank = i + 1; });
  const res = { ok: true, local: true, day, today: today.slice(0, 10), all: ever.slice(0, 10), fame: fl.slice(0, 10), players: today.length };
  if (nick) res.me = { today: today.find(r => r.nick === nick) || null, all: ever.find(r => r.nick === nick) || null, fame: fame[nick] || null };
  return res;
}
function soLocalSubmit(rec) {
  const users = soStore.get('users', {});
  if (users[rec.nick] && users[rec.nick] !== rec.key) return { ok: false, error: 'pin', local: true };
  users[rec.nick] = rec.key; soStore.set('users', users);
  const before = soLocalTop(rec.day, rec.nick), runs = soStore.get('runs', []);
  runs.push({ at: new Date().toISOString(), day: rec.day, nick: rec.nick, kind: rec.kind, time: rec.time, left: rec.left, hp: rec.hp, tank: rec.tank, shots: rec.shots });
  soStore.set('runs', runs.slice(-500));
  if (rec.kind !== 'clear' && rec.kind !== 'timeup') return { ok: true, local: true, ranked: false, me: before.me };
  const after = soLocalTop(rec.day, rec.nick), prev = before.me && before.me.today, cur = after.me.today;
  return { ok: true, local: true, ranked: true, best: !prev || soBetter(runs[runs.length - 1], prev), prevRank: prev ? prev.rank : null, rank: cur.rank, prev: prev || null, players: after.players, me: after.me };
}
async function soTop(day, nick) {
  const url = soBoardUrl();
  if (!url) return soLocalTop(day, nick);
  const q = new URLSearchParams({ action: 'top', day }); if (nick) q.set('nick', nick);
  const r = await fetch(url + (url.includes('?') ? '&' : '?') + q.toString(), { cache: 'no-store' });
  return r.json();
}
async function soSubmit(rec) {
  const url = soBoardUrl();
  if (!url) return soLocalSubmit(rec);
  // text/plain keeps it a "simple" request (no CORS preflight), which Apps Script web apps accept
  const r = await fetch(url, { method: 'POST', body: JSON.stringify(Object.assign({ action: 'submit' }, rec)) });
  return r.json();
}
async function soKey(nick, pin) {
  const data = new TextEncoder().encode(`kyosae|${nick}|${pin}`);
  if (!(window.crypto && crypto.subtle)) throw new Error('보안 연결(https)에서만 기록을 남길 수 있어요');
  const h = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, '0')).join('');
}

// ---------------------------------------------------------------- home card: today's #1
async function soloHomeRefresh() {
  const el = $('soTopHome'); if (!el) return;
  const day = soloDay();
  try {
    const t = await soTop(day);
    const f = t.today && t.today[0];
    el.innerHTML = f ? `오늘 1위 <b></b> · ${fmtRec(f)} · 도전자 ${t.players}명` : `오늘은 아직 기록이 없어요. 첫 1위에 도전하세요!`;
    if (f) el.querySelector('b').textContent = f.nick;
    if (t.local) el.innerHTML += ' <span class="note">(이 기기 기록)</span>';
  } catch (e) { el.textContent = '순위를 불러오지 못했어요 (기록 서버 연결 확인)'; }
}

// ---------------------------------------------------------------- challenge screen
function renderSolo() {
  const day = soloDay(); SOLOPLAY.day = day;
  $('soDay').textContent = `오늘의 도전 · ${soDayText(day)} · 맵 ${CONFIG.maps[SOLO.mapId].name}`;
  const ft = soloFoeTanks(day), box = $('soFoes'); box.innerHTML = '';
  SOLO.foes.forEach((f, i) => {
    const c = document.createElement('div'); c.className = 'foe';
    c.append(cloneCanvas(thumbs[ft[i]]));
    const tx = document.createElement('div');
    tx.innerHTML = `<div class="fn"></div><div class="fw"></div><div class="ft"></div>`;
    tx.querySelector('.fn').textContent = f.nick; tx.querySelector('.fw').textContent = `${f.word}: ${f.line}`; tx.querySelector('.ft').textContent = `탱크: ${CONFIG.tanks[ft[i]].name}`;
    c.append(tx); box.append(c);
  });
  if (!SOLOPLAY.tank) SOLOPLAY.tank = soStore.get('tank', 'rookie');
  const picks = $('soPicks'); picks.innerHTML = '';
  buildPicks(picks, SOLOPLAY.tank, k => { AU.play('ui'); SOLOPLAY.tank = k; soStore.set('tank', k); renderSolo(); }, '내 탱크', k => renderTankCard($('soTankInfo'), k));
  picks.onpointerleave = e => { if (e.pointerType === 'mouse') renderTankCard($('soTankInfo'), SOLOPLAY.tank); };
  renderTankCard($('soTankInfo'), SOLOPLAY.tank);
  const nk = $('soNick'); if (!nk.value) nk.value = soStore.get('nick', '') || savedNick() || '';
  $('soMsg').textContent = '';
  $('soServer').textContent = soBoardUrl() ? '기록 서버 연결됨 · 명예의 전당에 기록' : '기록 서버 연결 전 · 이 기기에만 기록';
}
async function startSolo() {
  AU.unlock();
  const nick = $('soNick').value.trim().slice(0, 8), pin = $('soPin').value.trim();
  if (!nick) { $('soMsg').textContent = '닉네임을 넣어 주세요'; $('soNick').focus(); return; }
  if (!/^\d{4}$/.test(pin)) { $('soMsg').textContent = 'PIN은 숫자 4자리예요'; $('soPin').focus(); return; }
  let key;
  try { key = await soKey(nick, pin); } catch (e) { $('soMsg').textContent = e.message; return; }
  SOLOPLAY.nick = nick; SOLOPLAY.key = key; soStore.set('nick', nick);
  const tank = SOLOPLAY.tank === 'random' || !CONFIG.tanks[SOLOPLAY.tank] ? rollRandomTank(Math.random) : SOLOPLAY.tank;
  ON.active = false; TUT.on = false; showCoach();
  $('loading').hidden = false;
  setTimeout(() => {
    SOLOPLAY.day = soloDay(); SOLOPLAY.inputs = []; SOLOPLAY.active = true; SOLOPLAY.tankUsed = tank;
    installMatch(soloMatch(SOLOPLAY.day, tank, nick), soloOpts());
    $('over').hidden = true; $('soloOver').hidden = true; $('loading').hidden = true;
    showScreen('game');
    banner('연구부정 소탕전 시작!');
    setTimeout(() => { if (SOLOPLAY.active) banner('위조탱 · 변조탱 · 표절탱을 소탕하세요'); }, 1700);
  }, 30);
}
// bots: same moves as the practice bots, but their plan comes from soloBotTurn (seeded per turn) so every run replays exactly
function soloOpts() {
  const bots = {}; for (const f of SOLO.foes) bots[f.id] = SOLO.botLevel;
  PRACTICE.bots = bots;
  const B = { turn: -1, mem: {} };
  return {
    isLocal: idx => match.tanks[idx].team === 'red',
    onInput: inp => { if (inp && SOLOPLAY.active && inp.seat === 'me') SOLOPLAY.inputs.push(JSON.parse(JSON.stringify(inp))); },
    // the 10-min clock: spent at an aim -> the run ends (same rule as soloReplay); runs out mid-turn -> my turn ends there
    preTick: (m, c) => {
      if (!SOLOPLAY.active) return false;
      if (soloClockOut(m, SOLOPLAY.inputs)) return true;
      if (m.tanks[m.cur].team !== 'red' || c.charging) return false;
      c.syncTime();
      const used = CONFIG.turn.timeLimitTicks - c.timeLeft, need = Math.ceil((SOLO.clockSec - soloScore(SOLOPLAY.inputs).time) * CONFIG.physics.tickRate);
      if (used >= need) { c.emit(cmdPass(m, Math.max(0, need))); return true; }
      return false;
    },
    remote: (m, t) => {
      if (!bots[t.id]) return;
      if (B.turn !== m.turnNo) { B.turn = m.turnNo; B.stage = 'think'; B.wait = 70 + Math.floor(Math.random() * 60); B.plan = null; }
      if (ctrl.timeLeft > 0) ctrl.timeLeft--;
      if (B.stage === 'think') {
        if (--B.wait > 0) return;
        B.plan = soloBotTurn(m, B.mem);
        if (m.phase !== 'aim' || !B.plan) return;
        B.aimF = t.aim; B.stage = 'aim'; return;
      }
      if (B.stage === 'aim') {
        const d = B.plan.angle - B.aimF, stp = 30 * TICK;
        if (Math.abs(d) <= stp) { t.aim = B.plan.angle; B.stage = 'charge'; ctrl.charging = true; ctrl.powerF = 0; ctrl.weapon = B.plan.weapon; B.wait = 20; }
        else { B.aimF += Math.sign(d) * stp; t.aim = Math.round(B.aimF); }
        return;
      }
      if (B.stage === 'charge') {
        if (--B.wait > 0) return;
        ctrl.powerF = Math.min(B.plan.power, ctrl.powerF + 500 * TICK);
        if (ctrl.powerF >= B.plan.power) { ctrl.charging = false; B.stage = 'done'; cmdFire(m, B.plan.angle, B.plan.power, B.plan.weapon, SOLO.botUsed); }
      }
    },
  };
}
// running record at the top of the screen
function soloHud() {
  const el = $('soloHud');
  if (!SOLOPLAY.active || !match || screen !== 'game') { if (!el.hidden) el.hidden = true; return; }
  el.hidden = false;
  const sc = soloScore(SOLOPLAY.inputs), mine = match.phase === 'aim' && match.cur === 0;
  const now = sc.time + (mine ? (CONFIG.turn.timeLimitTicks - ctrl.timeLeft) / CONFIG.physics.tickRate : 0);
  const rem = Math.max(0, SOLO.clockSec - now), clock = `${Math.floor(rem / 60)}:${String(Math.floor(rem % 60)).padStart(2, '0')}`;
  const left = match.tanks.filter(t => t.team === 'blue' && t.alive).map(t => t.nick);
  const s = `연구부정 소탕전 · 남은 시간 <b>${clock}</b> · 발사 ${sc.shots} · 남은 적 ${left.length ? left.join(' ') : '없음'}`;
  if (el.dataset.s !== s) { el.dataset.s = s; el.innerHTML = s; el.classList.toggle('low', rem < 60); }
}
// a foe goes down: name the misconduct and what it is
R.onDeath = t => {
  if (!SOLOPLAY.active || t.team !== 'blue') return;
  const f = SOLO.foes.find(x => x.id === t.id); if (!f) return;
  setTimeout(() => { if (SOLOPLAY.active || (match && match.phase === 'over')) banner(`${f.word} 소탕! ${f.line}`); }, 1500);
};

// ---------------------------------------------------------------- end of a run
async function soloOver(winner) {
  SOLOPLAY.active = false;
  const m = match, inputs = SOLOPLAY.inputs.slice(), res = soloResult(m, inputs);
  const foes = m.tanks.filter(t => t.team === 'blue');
  const ranked = res.kind === 'clear' || res.kind === 'timeup';
  $('sooTitle').textContent = res.kind === 'clear' ? '소탕 완료!' : res.kind === 'timeup' ? '시간 종료' : '탈락';
  $('sooTitle').className = res.kind === 'clear' ? '' : 'fail';
  $('sooTime').textContent = res.kind === 'clear' ? fmtSolo(res.time) : res.kind === 'timeup' ? `남은 적 체력 ${res.left}` : `${res.kills} / 3 소탕`;
  $('sooSub').textContent = res.kind === 'clear'
    ? `쓴 시간 ${fmtSolo(res.time)} (발사 ${res.shots}번 × 3초 포함) · 남은 체력 ${res.hp}`
    : res.kind === 'timeup' ? `10분을 다 썼어요 · ${res.kills} / 3 소탕 · 남은 적 체력이 적을수록 순위가 높아요 (소탕 완료 기록 다음)`
    : `내 탱크가 격파됐어요 · 준 피해 ${res.dealt} · 이번 도전은 순위에 오르지 않아요`;
  $('sooFoes').innerHTML = foes.map(t => `<span class="${t.alive ? '' : 'done'}">${t.alive ? '' : '✔ '}${esc(t.nick)}</span>`).join('');
  $('sooRank').innerHTML = ranked ? '기록을 확인하는 중…' : '';
  setTimeout(() => { if (screen === 'game') $('soloOver').hidden = false; }, 1100);
  if (res.kind === 'clear') AU.play('pickup');
  // check the run replays from its inputs, then save it
  let ver = 'v4'; // v4: 연구윤리 map (진실의 전당, redesigned) — v3: spawns near the enemy, crates within reach (2026-10-20)
  try { const rp = soloReplay(SOLOPLAY.day, SOLOPLAY.tankUsed, inputs); ver += rp.kind === res.kind && rp.time === res.time && rp.hp === res.hp && rp.left === res.left ? '/ok' : '/mismatch'; } catch (e) { ver += '/err'; }
  const rec = { day: SOLOPLAY.day, nick: SOLOPLAY.nick, key: SOLOPLAY.key, kind: res.kind, clear: res.clear, time: res.time, left: res.left, hp: res.hp, kills: res.kills, tank: SOLOPLAY.tankUsed, shots: res.shots, ver, log: JSON.stringify(inputs) };
  try {
    const r = await soSubmit(rec);
    const el = $('sooRank');
    if (!r.ok) { el.innerHTML = r.error === 'pin' ? '<span class="bad">이 닉네임은 다른 PIN으로 등록돼 있어요. 닉네임이나 PIN을 확인해 주세요 (이번 기록은 저장 안 됨)</span>' : r.error === 'day' ? '날짜가 바뀌어 이번 기록은 저장되지 않았어요' : '기록을 저장하지 못했어요'; return; }
    if (!ranked) { el.textContent = r.me && r.me.today ? `오늘 내 최고 기록 ${fmtRec(r.me.today)} · ${r.me.today.rank}위` : ''; return; }
    const where = r.local ? ' <span class="note">(이 기기 기록)</span>' : '';
    if (r.best && r.prevRank && r.prevRank !== r.rank) el.innerHTML = `<span class="nr">신기록! <span class="jump">${r.prevRank}위</span>→ ${r.rank}위</span>${where}`;
    else if (r.best && r.prevRank) el.innerHTML = `<span class="nr">신기록! ${r.rank}위 유지</span>${where}`;
    else if (r.best) el.innerHTML = `<span class="nr">오늘 ${r.rank}위 등극!</span> <span class="note">도전자 ${r.players}명</span>${where}`;
    else el.innerHTML = `오늘 ${r.rank}위 · 내 최고 기록 ${fmtRec(r.prev)}은 못 넘었어요${where}`;
    if (r.best && r.rank === 1) AU.play('pickup');
  } catch (e) { $('sooRank').textContent = '기록 서버에 연결하지 못했어요'; }
}

// ---------------------------------------------------------------- 명예의 전당
async function renderFame() {
  const day = soloDay(), nick = soStore.get('nick', '') || $('soNick').value.trim();
  $('fDay').textContent = `연구부정 소탕전 · 오늘 ${soDayText(day)}`;
  $('fTable').innerHTML = '<div class="note">불러오는 중…</div>';
  document.querySelectorAll('.ftabs button').forEach(b => { const on = b.dataset.tab === SOLOPLAY.tab; b.classList.toggle('on', on); b.setAttribute('aria-selected', String(on)); });
  let t;
  try { t = await soTop(day, nick); } catch (e) { $('fTable').innerHTML = '<div class="note bad">순위를 불러오지 못했어요. 인터넷이나 기록 서버 연결을 확인해 주세요.</div>'; return; }
  SOLOPLAY.lastBoard = t;
  const f = t.today && t.today[0];
  $('fTop1').innerHTML = f ? `<span class="k">오늘 1위</span><span class="nm"></span><span class="tm">${fmtRec(f)}</span><span class="sm">${esc(CONFIG.tanks[f.tank] ? CONFIG.tanks[f.tank].name : f.tank)} · 남은 체력 ${f.hp} · 도전자 ${t.players}명</span>`
    : `<span class="k">오늘 1위</span><span class="nm">비어 있음</span><span class="sm">첫 기록의 주인공이 되어 보세요</span>`;
  if (f) $('fTop1').querySelector('.nm').textContent = f.nick;
  const me = t.me;
  $('fMe').innerHTML = !nick ? `<span class="k">내 기록</span><span class="sm">도전 화면에서 닉네임을 넣으면 내 기록이 보여요</span>`
    : `<span class="k">내 기록 · ${esc(nick)}</span>` +
      `<span class="sm">오늘 최고 <b class="tm">${me && me.today ? fmtRec(me.today) : '–'}</b> ${me && me.today ? `· ${me.today.rank}위` : ''}</span>` +
      `<span class="sm">역대 최고 ${me && me.all ? `${fmtRec(me.all)} · ${me.all.rank}위` : '–'}</span>` +
      `<span class="sm">명예의 전당 ${me && me.fame ? `${me.fame.points}점 · 일간 1위 ${me.fame.firsts}회` : '–'}</span>`;
  drawFameTable(t, nick);
  $('fNote').textContent = (t.local ? '기록 서버 연결 전이라 이 기기에서 한 기록만 보여요. ' : '') + '순위: 소탕 완료(쓴 시간이 적은 순) → 시간 종료(남은 적 체력이 적은 순). 명예의 전당 점수: 매일 1위 10점 · 2위 9점 … 10위 1점.';
}
function drawFameTable(t, nick) {
  const tab = SOLOPLAY.tab, tb = $('fTable');
  const tankName = k => CONFIG.tanks[k] ? CONFIG.tanks[k].name : k || '';
  let head, rows;
  if (tab === 'fame') {
    head = '<div class="frow h"><span>순위</span><span>닉네임</span><span>점수</span><span>1위</span><span class="x">순위 든 날</span><span class="x"></span></div>';
    rows = (t.fame || []).map(f => `<div class="frow r${f.rank}${f.nick === nick ? ' me' : ''}"><span class="r">${f.rank}</span><b data-n></b><span class="t">${f.points}점</span><span>${f.firsts}회</span><span class="x">${f.days}일</span><span class="x"></span></div>`);
    tb.innerHTML = head + (rows.join('') || '<div class="note">아직 쌓인 점수가 없어요</div>');
    (t.fame || []).forEach((f, i) => { tb.querySelectorAll('[data-n]')[i].textContent = f.nick; });
    return;
  }
  const list = tab === 'all' ? t.all || [] : t.today || [];
  head = `<div class="frow h"><span>순위</span><span>닉네임</span><span>기록</span><span>남은 체력</span><span class="x">탱크</span><span class="x">${tab === 'all' ? '날짜' : '발사'}</span></div>`;
  rows = list.map(r => `<div class="frow r${r.rank}${r.nick === nick ? ' me' : ''}"><span class="r">${r.rank}</span><b data-n></b><span class="t">${fmtRec(r)}</span><span>${r.hp}</span><span class="x">${esc(tankName(r.tank))}</span><span class="x">${tab === 'all' ? esc(soDayText(String(r.day))) : (r.shots || '–') + '번'}</span></div>`);
  tb.innerHTML = head + (rows.join('') || `<div class="note">${tab === 'all' ? '아직 기록이 없어요' : '오늘은 아직 기록이 없어요. 첫 1위에 도전하세요!'}</div>`);
  list.forEach((r, i) => { tb.querySelectorAll('[data-n]')[i].textContent = r.nick; });
}

// ---------------------------------------------------------------- wiring
$('soloBtn').onclick = () => { AU.unlock(); const n = $('nickIn').value.trim(); if (n) $('soNick').value = n; showScreen('solo'); };
$('fameBtn').onclick = () => { AU.unlock(); showScreen('fame'); };
$('soFameBtn').onclick = () => showScreen('fame');
$('soHomeBtn').onclick = () => showScreen('home');
$('soStart').onclick = startSolo;
$('soPin').addEventListener('keydown', e => { if (e.key === 'Enter') startSolo(); });
$('fPlayBtn').onclick = () => showScreen('solo');
$('fHomeBtn').onclick = () => showScreen('home');
document.querySelectorAll('.ftabs button').forEach(b => b.onclick = () => { SOLOPLAY.tab = b.dataset.tab; document.querySelectorAll('.ftabs button').forEach(x => { const on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-selected', String(on)); }); if (SOLOPLAY.lastBoard) drawFameTable(SOLOPLAY.lastBoard, soStore.get('nick', '')); });
$('sooAgain').onclick = () => { $('soloOver').hidden = true; startSolo(); };
$('sooFame').onclick = () => { $('soloOver').hidden = true; showScreen('fame'); };
$('sooHome').onclick = () => { $('soloOver').hidden = true; showScreen('home'); };
