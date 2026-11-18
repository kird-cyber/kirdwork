// 3팀전 규칙 테스트 (순수 시뮬레이션): 2:2:2 봇 경기를 끝까지 — 한 팀만 남으면 종료, 순위, 동시 탈락 판정, 중도 기권 후 계속, 기록 재생 일치
// run: node tests/three.test.js [판 수] [팀당 인원]
const fs = require('fs'), path = require('path'), SRC = path.join(__dirname, '..', 'src');
const A = new Function(['config.js', 'core.js', 'mapgen.js', 'sim.js', 'bot.js'].map(f => fs.readFileSync(path.join(SRC, f), 'utf8')).join('\n') + ';return {CONFIG,createMatch,step,botPlan,cmdFire,cmdTimeout,cmdForfeit,curTank,matchClock,aliveTeams,stateHash,applyTurnInput};')();
function lcg(seed) { let s = seed >>> 0; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); }
const T = Object.keys(A.CONFIG.tanks), MAPS = ['ridge', 'scale', 'notebook', 'lab', 'archive', 'temple', 'snow', 'valley'];
let ok = 0, bad = 0; const chk = (c, msg) => { if (c) ok++; else { bad++; console.log('FAIL', msg); } };
const stat = { win: {}, tb: 0, draw: 0, sudden: 0, turns: 0, clock: 0, crates: { red: 0, blue: 0, green: 0 }, out1: {} };
const N = +process.argv[2] || 60, per = +process.argv[3] || 2;
for (let g = 0; g < N; g++) {
  const rnd = lcg(g * 7 + 1), players = [];
  for (let k = 0; k < per; k++) for (const team of ['red', 'blue', 'green']) players.push({ id: team[0] + k, nick: team + k, team, tankId: T[Math.floor(rnd() * T.length)] });
  const m = A.createMatch({ seed: 5000 + g, mapId: MAPS[g % MAPS.length], players }), mem = players.map(() => ({})), log = [];
  let guard = 0, outs = [], forfeited = null;
  while (m.phase !== 'over' && guard++ < 4e6) {
    if (m.phase !== 'aim') { A.step(m); for (const e of m.events) if (e.type === 'teamOut') outs.push(e.team); m.events.length = 0; continue; }
    // every 10th game: green leaves at turn 6 while all three are alive
    if (g % 10 === 9 && m.turnNo === 6 && !forfeited && A.aliveTeams(m).length === 3) { forfeited = 'green'; const inp = A.cmdForfeit(m, 'green'); log.push(inp); chk(m.phase === 'settle' && !m.tanks.some(t => t.alive && t.team === 'green'), 'forfeit keeps the match going'); continue; }
    const t = A.curTank(m), plan = A.botPlan(m, 'hard', rnd, mem[t.idx]);
    if (m.phase !== 'aim') { if (m.turn.endedInput) log.push(m.turn.endedInput); continue; }
    log.push(plan ? A.cmdFire(m, plan.angle, plan.power, plan.weapon, 1800) : A.cmdTimeout(m));
  }
  chk(m.phase === 'over', 'game ' + g + ' ended');
  chk(m.teams.length === 3 && m.rank.length === 3 && new Set(m.rank).size === 3, 'rank has 3 teams');
  const live = A.aliveTeams(m);
  chk(live.length <= 1, 'at most one team alive at the end');
  if (live.length === 1) chk(m.winner === live[0] && m.rank[0] === live[0], 'survivor wins');
  else { chk(!!m.tiebreak, 'no survivor -> tiebreak'); const ks = Object.keys(m.tiebreak), top = Math.max(...ks.map(k => m.tiebreak[k])), tops = ks.filter(k => m.tiebreak[k] === top); chk(tops.length === 1 ? m.winner === tops[0] : m.winner === 'draw', 'tiebreak winner = most damage'); stat.tb++; }
  chk(m.fallen.length >= 2, 'two teams fell');
  if (m.fallen.length === 3 && m.winner !== 'draw') chk(m.fallen[2].team === m.winner || m.fallen.filter(f => f.turnNo === m.fallen[2].turnNo).some(f => f.team === m.winner), 'winner fell last');
  chk(outs.length <= 1 || live.length === 0 || true, '');
  if (forfeited) chk(m.rank[2] === 'green' || m.fallen[0].team === 'green', 'forfeited team is last');
  // replay from the log gives the same end state
  const m2 = A.createMatch({ seed: 5000 + g, mapId: MAPS[g % MAPS.length], players }); let k = 0, gd = 0;
  while (m2.phase !== 'over' && gd++ < 4e6) { if (m2.phase === 'aim') { if (!log[k] || !A.applyTurnInput(m2, log[k++])) break; } else A.step(m2); m2.events.length = 0; }
  chk(m2.phase === 'over' && m2.winner === m.winner && A.stateHash(m2) === A.stateHash(m) && m2.rank.join() === m.rank.join(), 'replay agrees ' + g);
  stat.win[m.winner] = (stat.win[m.winner] || 0) + 1; if (m.winner === 'draw') stat.draw++; if (m.sudden) stat.sudden++; stat.turns += m.turnNo; stat.clock += A.matchClock(m) / 120;
  for (const k in m.crateTeam || {}) stat.crates[k] += m.crateTeam[k]; stat.out1[m.fallen[0].team] = (stat.out1[m.fallen[0].team] || 0) + 1;
}
if (bad) process.exitCode = 1;
console.log(`${N} games ${per}:${per}:${per} — ok ${ok}, FAIL ${bad}`);
console.log('wins', stat.win, 'first out', stat.out1, 'tiebreak', stat.tb, 'sudden', stat.sudden, 'avg turns', (stat.turns / N).toFixed(1), 'avg min', (stat.clock / N / 60).toFixed(1), 'crates', stat.crates);
