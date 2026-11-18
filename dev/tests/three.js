// 3팀전 온라인 흐름 테스트 (2:2:2 + 관전자 1명, 중계 서버 + 브라우저 7개):
//   대기방 세 팀 슬롯 → 그린 팀으로 이동 → 3팀전 시작 → 한 팀이 나가도 계속 → 한 팀만 남으면 종료(순위) → 결과 화면·이미지 → 대기방 → 다시 2팀전
// needs: NODE_PATH=... node tests/broker.js 9001  and  (cd dist && python3 -m http.server 8765)   (tests/serve.sh)
// run:   NODE_PATH=/opt/npm-tools/node_modules node tests/three.js
const { chromium } = require('playwright');
const BASE = 'http://127.0.0.1:8765/index.html?broker=' + encodeURIComponent('ws://127.0.0.1:9001');
const SHOTS = process.env.SHOTS || '';
let pass = 0, fail = 0;
const ok = (c, s) => { console.log((c ? 'PASS ' : 'FAIL ') + s); c ? pass++ : fail++; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function until(fn, ms, step = 150) { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (await fn()) return true; } catch (e) {} await sleep(step); } return false; }
(async () => {
  const browser = await chromium.launch({ args: ['--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'] });
  const errors = [], pages = [];
  async function open(url, nick) {
    const p = await (await browser.newContext({ viewport: { width: 1280, height: 800 }, acceptDownloads: true })).newPage();
    p.on('pageerror', e => errors.push(nick + ': ' + e.message));
    await p.goto(url); await p.waitForFunction(() => window.__pg && document.getElementById('nickIn'), null, { timeout: 15000 });
    await p.fill('#nickIn', nick); p.nick = nick; return p;
  }
  const shot = async (p, name) => { if (SHOTS) await p.screenshot({ path: `${SHOTS}/${name}.png` }); };
  const S = p => p.evaluate(() => { const L = __pg.ON.link, m = __pg.match; return { screen: __pg.screen, state: L && L.room && L.room.state,
    teams: L && L.room ? ['red', 'blue', 'green'].map(k => L.room.players.filter(x => x.team === k).length).join(':') : '', note: document.getElementById('startNote').textContent,
    phase: m && m.phase, turn: m && m.turnNo, winner: m && m.winner, mteams: m ? m.teams.join() : '', rank: m && m.rank ? m.rank.join() : '',
    alive: m ? ['red', 'blue', 'green'].map(k => m.tanks.filter(t => t.team === k && t.alive).length).join(':') : '', hash: m ? m.hashes[m.turnNo] : 0 }; });
  const A = await open(BASE, '방장'); await A.click('#createBtn');
  await until(async () => (await S(A)).screen === 'lobby', 8000);
  const link = await A.inputValue('#shareLink'); pages.push(A);
  for (const n of ['민수', '지영', '철수', '영희', '동현']) { const P = await open(link, n); await P.click('#joinBtn'); await until(async () => (await S(P)).screen === 'lobby', 8000); pages.push(P); }
  const W = await open(link, '심판'); await W.check('#watchChk'); await W.click('#joinBtn'); await until(async () => (await S(W)).screen === 'lobby', 8000);
  const all = pages.concat([W]);
  // ---- lobby: three team slots; newcomers only fill red and blue
  ok(await until(async () => (await S(A)).teams === '3:3:0', 8000), '대기방: 들어오는 사람은 레드·블루로만 배정 (3:3:0)');
  ok(await A.isVisible('#greenList') && (await A.textContent('#greenN')).trim() === '0 / 4', '대기방에 그린 팀 슬롯이 보임 (0 / 4)');
  ok(/3 대 3/.test((await S(A)).note) && !/3팀전/.test((await S(A)).note) && await A.isEnabled('#lobbyStart'), '두 팀만 채우면 평소처럼 2팀전: ' + (await S(A)).note);
  await shot(A, '1_lobby_two');
  // a player moves himself to green, the host moves another one
  const mover = pages[5]; // 동현 (blue)
  await mover.click('#blueList .pc.me .mini.tm.green');
  ok(await until(async () => (await S(A)).teams === '3:2:1', 5000), '참가자가 직접 「그린으로」 → 3:2:1');
  await A.click('#redList .pc:not(.me) .mini.tm.green');
  ok(await until(async () => (await Promise.all(all.map(S))).every(s => s.teams === '2:2:2'), 5000), '방장이 다른 사람을 그린으로 → 7대 모두 2:2:2');
  ok(/2 대 2 대 2/.test((await S(A)).note) && /3팀전/.test((await S(A)).note), '시작 안내에 3팀전 표시: ' + (await S(A)).note);
  await shot(A, '2_lobby_three');
  await A.click('#lobbyStart');
  ok(await until(async () => (await Promise.all(all.map(S))).every(s => s.screen === 'game' && s.phase === 'aim' && s.mteams === 'red,blue,green'), 25000), '3팀전 시작 → 7대 모두 게임 화면 (레드·블루·그린)');
  ok(await A.evaluate(() => document.querySelectorAll('#status .srow').length === 3 && document.querySelectorAll('#status .sc.green').length === 2), '상태창: 팀별 3줄, 그린 2명');
  await sleep(10500); await shot(W, '3_game_three');
  // ---- one turn played for real (pass), then green leaves: the match goes on with two teams
  const act = (await Promise.all(pages.map(p => p.evaluate(() => __pg.ctrl.activeLocal())))).findIndex(Boolean), t0 = (await S(A)).turn;
  await pages[act].keyboard.press('KeyP');
  ok(await until(async () => (await Promise.all(all.map(S))).every(s => s.turn > t0 && s.phase === 'aim'), 20000), '한 턴 진행 (턴 넘기기) → 7대 모두 다음 턴');
  await A.evaluate(() => { const m = __pg.match; __pg.ON.link.sendInput({ turnNo: m.turnNo, seat: m.tanks[m.cur].id, actions: JSON.parse(JSON.stringify(m.turn.actions)), forfeit: 'green' }); });
  ok(await until(async () => (await Promise.all(all.map(S))).every(s => s.alive === '2:2:0' && s.phase === 'aim'), 20000), '그린 팀 기권 → 그린 탱크만 빠지고 경기는 계속 (7대 모두 2:2:0, 진행 중)');
  const hs = (await Promise.all(all.map(S))).map(s => s.turn + ':' + s.hash);
  ok(new Set(hs).size === 1, '그 뒤 상태가 7대 모두 같음');
  ok(await A.evaluate(() => [...document.querySelectorAll('#status .sc.green .st')].every(e => e.textContent === '나감')), '상태창에 그린 팀 「나감」 표시');
  await shot(W, '4_game_after_out');
  // ---- blue leaves too: one team left -> over, red wins, standing red > blue > green
  await until(async () => (await S(A)).phase === 'aim', 15000);
  await A.evaluate(() => { const m = __pg.match; __pg.ON.link.sendInput({ turnNo: m.turnNo, seat: m.tanks[m.cur].id, actions: JSON.parse(JSON.stringify(m.turn.actions)), forfeit: 'blue' }); });
  ok(await until(async () => (await Promise.all(all.map(S))).every(s => s.phase === 'over' && s.winner === 'red' && s.rank === 'red,blue,green'), 20000), '한 팀만 남음 → 종료 · 7대 모두 레드 승 · 순위 레드>블루>그린');
  await until(async () => W.isVisible('#over'), 6000);
  const cols = await W.evaluate(() => [...document.querySelectorAll('#overRoster .orcol .orh')].map(e => e.textContent));
  ok(cols.length === 3 && /1위.*승리/.test(cols[0]) && /2위/.test(cols[1]) && /3위/.test(cols[2]), '결과 화면: 세 팀 · 순위 표시 → ' + cols.join(' | '));
  const redP = pages[(await Promise.all(pages.map(p => p.evaluate(() => (__pg.ON.link.me() || {}).team)))).indexOf('red')];
  ok((await redP.textContent('#overTitle')) === '승리!' && (await mover.textContent('#overTitle')) === '패배', '이긴 팀은 「승리!」, 진 팀은 「패배」');
  await shot(W, '5_result_three');
  const [dl] = await Promise.all([W.waitForEvent('download', { timeout: 8000 }), W.click('#saveResult')]);
  const size = await W.evaluate(() => { const c = __result.resultCanvas(); return c.width + 'x' + c.height; });
  ok(/^1770x/.test(size), `결과 이미지: 세 팀이 나란히 (${size})`);
  if (SHOTS) await dl.saveAs(`${SHOTS}/6_result_image.png`);
  // ---- back to the lobby: teams kept; empty the green team -> a normal two-team game again
  await W.click('#toLobby');
  ok(await until(async () => (await Promise.all(all.map(S))).every(s => s.screen === 'lobby' && s.teams === '2:2:2'), 10000), '「대기방으로」 → 팀 구성 그대로 (2:2:2)');
  await A.click('#greenList .pc:nth-child(1) .mini.tm.red'); await until(async () => (await S(A)).teams === '3:2:1', 5000);
  await A.click('#greenList .pc:nth-child(1) .mini.tm.blue');
  ok(await until(async () => (await S(A)).teams === '3:3:0', 5000), '그린 팀을 비우면 다시 3:3');
  await until(async () => A.isEnabled('#lobbyStart'), 4000); await A.click('#lobbyStart');
  ok(await until(async () => (await Promise.all(all.map(S))).every(s => s.screen === 'game' && s.phase === 'aim' && s.mteams === 'red,blue'), 25000), '다음 경기는 평소처럼 2팀전 (레드·블루)');
  ok(errors.length === 0, '페이지 오류 없음' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  console.log(`${pass} passed, ${fail} failed`); await browser.close(); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
