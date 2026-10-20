// ============================================================== SOLO: 연구부정 소탕전 (혼자 하기, no DOM)
// Me against three foes named after research misconduct. Turns alternate me -> foe -> me -> next foe ...
// Everybody gets the same map, foes, spawns and wind on the same day (seed from the date, KST).
// The bots draw their random numbers from (seed, turn), so a run is fully reproducible from my inputs alone:
// the leaderboard stores them and a record can be replayed to check it (soloReplay).
const SOLO = {
  mapId: 'notebook',              // 연구노트 (연구윤리) — open rolling pages; 정의의 저울's towers made 1 vs 3 a slog
  botLevel: 'normal',             // foes hit me about 30% of their shots: I take hits but rarely go down
  meHp: 4, foeHp: 0.5,            // with the 10-min clock, stand-in players (24 runs each): easy clear 33% / out 8% · normal 67% / 0% · hard 83% / 0%
  botUsed: 240,                   // a bot's turn counts as 2 s of thinking (delay only; not part of my score)
  shotSec: 3,                     // every shot of mine takes 3 s off my clock (no spam firing)
  clockSec: 600,                  // chess clock: 10 min of MY time (foe turns and shells in flight don't count)
  boardUrl: 'https://script.google.com/macros/s/AKfycbzWnAeQJ357XRtcj-zDrepRXFCKaH_dHRVpwfIB4IEoUDpjj1Fb-oejDx6dbcDBZF7H/exec', // Google Apps Script web app (dev/leaderboard/SETUP.md). Empty = this device only
  // the three most serious forms of research misconduct (위조·변조·표절, "FFP")
  foes: [
    { id: 'f0', nick: '위조탱', word: '위조', line: '존재하지 않는 데이터나 연구 결과를 만들어 내는 것' },
    { id: 'f1', nick: '변조탱', word: '변조', line: '연구 재료·과정을 조작하거나 데이터를 임의로 바꾸고 빼는 것' },
    { id: 'f2', nick: '표절탱', word: '표절', line: '남의 아이디어·글·결과를 출처 없이 내 것처럼 쓰는 것' },
  ],
};
// today in Korea (YYYY-MM-DD)
function soloDay(now) { return new Date((now || Date.now()) + 9 * 3600e3).toISOString().slice(0, 10); }
function soloSeed(day) { return fnvStr(fnvInit(), 'kyosae-solo-' + day) >>> 0; }
// the day's foe tanks: three different pickable tanks, chosen by the day's seed
function soloFoeTanks(day) {
  const keys = Object.keys(CONFIG.tanks).filter(k => !CONFIG.tanks[k].hidden), r = makeRng(soloSeed(day) ^ 0x9e3779b9), out = [];
  while (out.length < SOLO.foes.length) { const k = keys[Math.floor(rngNext(r) * keys.length)]; if (out.indexOf(k) < 0) out.push(k); }
  return out;
}
function soloPlayers(day, tankId, nick) {
  const ft = soloFoeTanks(day);
  return [{ id: 'me', nick: nick || '나', team: 'red', tankId }].concat(SOLO.foes.map((f, i) => ({ id: f.id, nick: f.nick, team: 'blue', tankId: ft[i] })));
}
function soloMatch(day, tankId, nick) {
  const m = createMatch({ seed: soloSeed(day), mapId: SOLO.mapId, players: soloPlayers(day, tankId, nick), solo: true });
  for (const t of m.tanks) { const k = t.team === 'red' ? SOLO.meHp : SOLO.foeHp; t.maxhp = Math.round(t.maxhp * k); t.hp = t.maxhp; }
  m.suddenOn = false; // no sudden death: slow play already costs time on the record
  return m;
}
// a bot's random numbers for this turn: fixed by (seed, turn) so replays match
function soloBotRnd(m) { const r = makeRng((m.seed ^ Math.imul(m.turnNo + 1, 0x85ebca6b)) >>> 0); return () => rngNext(r); }
// one bot turn (same code live and in replays): plan, then fire or time out
function soloBotTurn(m, mem) {
  const t = curTank(m);
  const plan = botPlan(m, SOLO.botLevel, soloBotRnd(m), mem[t.id] || (mem[t.id] = {}));
  if (m.phase !== 'aim') return null;
  if (!plan) { cmdTimeout(m); return null; }
  return plan;
}
// who plays next (status bar order): the current tank, then me and the foes in rotation
function soloUpcoming(m) {
  const me = m.tanks[0], n = m.tanks.length, alive = m.tanks.filter(t => t.alive);
  let prev = m.cur >= 0 ? m.tanks[m.cur] : me, last = prev.team === me.team ? m.soloLast : prev.idx;
  const out = [prev];
  for (let g = 0; out.length < alive.length && g < 4 * n; g++) {
    let nx = null;
    if (prev.team !== me.team && me.alive) nx = me;
    else for (let s2 = 1; s2 <= n; s2++) { const c = m.tanks[(Math.max(0, last) + s2) % n]; if (c.alive && c.team !== me.team) { nx = c; last = c.idx; break; } }
    if (!nx) break;
    if (out.indexOf(nx) < 0) out.push(nx);
    prev = nx;
  }
  return out;
}
// clock used = my thinking time (sum of `used` of my turns) + 3 s per shot
function soloScore(inputs) {
  let used = 0, shots = 0;
  for (const x of inputs) {
    used += x.timeout ? CONFIG.turn.timeLimitTicks : (x.used || 0);
    if (!x.timeout && !x.pass && !x.forfeit && !x.ended) shots++;
  }
  return { time: Math.round((used / CONFIG.physics.tickRate + shots * SOLO.shotSec) * 100) / 100, shots };
}
// the clock is spent: the run ends at the next aim (before a foe moves). Same rule live and in replays.
function soloClockOut(m, inputs) {
  if (m.phase !== 'aim' || soloScore(inputs).time < SOLO.clockSec) return false;
  m.phase = 'over'; m.winner = 'timeup'; m.events.push({ type: 'over', winner: 'timeup' });
  return true;
}
// kind: clear (all three down; rank by clock used) · timeup (10 min spent; rank by foe HP left) · out (I was destroyed; not ranked)
function soloResult(m, inputs) {
  const me = m.tanks[0], foes = m.tanks.slice(1), sc = soloScore(inputs);
  const kind = m.phase !== 'over' ? '' : m.winner === 'red' ? 'clear' : m.winner === 'timeup' ? 'timeup' : 'out';
  return { kind, clear: kind === 'clear', over: m.phase === 'over', time: Math.min(sc.time, kind === 'timeup' ? SOLO.clockSec : 1e9), shots: sc.shots,
    hp: me.alive ? me.hp : 0, left: foes.reduce((a, f) => a + (f.alive ? f.hp : 0), 0),
    kills: foes.filter(f => !f.alive).length, dealt: me.st.dealt, turns: m.turnNo };
}
// rebuild a run from my inputs (bots replay themselves). Used to check leaderboard records.
function soloReplay(day, tankId, inputs) {
  const m = soloMatch(day, tankId), mem = {};
  let k = 0, guard = 0, bad = '';
  while (m.phase !== 'over' && guard++ < 4e6) {
    if (m.phase === 'aim') {
      if (soloClockOut(m, inputs.slice(0, k))) break;
      const t = curTank(m);
      if (t.team === 'red') {
        const inp = inputs[k++];
        if (!inp) break;
        if (!applyTurnInput(m, Object.assign({}, inp, { turnNo: m.turnNo, seat: t.id }))) { bad = 'input ' + (k - 1); break; }
      } else {
        const plan = soloBotTurn(m, mem);
        if (plan) cmdFire(m, plan.angle, plan.power, plan.weapon, SOLO.botUsed);
      }
    } else step(m);
  }
  return Object.assign(soloResult(m, inputs.slice(0, k)), { bad, used: k, hash: stateHash(m) });
}
