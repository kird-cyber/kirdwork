// 대회 흐름 테스트 (3:3 + 관전자 1명, 진짜 중계 서버 + 브라우저 7개):
//   3:3 시작 → 관전자 일시정지/재개 → 경기 종료 → 결과 이미지 → 참가자가 「대기방으로」 → 관전자가 맵 변경 → 같은 멤버로 다음 경기
// needs: NODE_PATH=... node tests/broker.js 9001  and  (cd dist && python3 -m http.server 8765)
// run:   NODE_PATH=/opt/npm-tools/node_modules node tests/tourney.js
const { chromium } = require('playwright');
const BASE = 'http://127.0.0.1:8765/index.html?broker=' + encodeURIComponent('ws://127.0.0.1:9001');
let pass = 0, fail = 0;
const ok = (c, s) => { console.log((c ? 'PASS ' : 'FAIL ') + s); c ? pass++ : fail++; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function until(fn, ms, step = 150) { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (await fn()) return true; } catch (e) {} await sleep(step); } return false; }
(async () => {
  const browser = await chromium.launch({ args: ['--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'] });
  const errors = [], pages = [];
  async function open(url, nick) {
    const p = await (await browser.newContext({ viewport: { width: 1200, height: 760 }, acceptDownloads: true })).newPage();
    p.on('pageerror', e => errors.push(nick + ': ' + e.message));
    await p.goto(url); await p.waitForFunction(() => window.__pg && document.getElementById('nickIn'), null, { timeout: 15000 });
    await p.fill('#nickIn', nick); p.nick = nick; return p;
  }
  const S = p => p.evaluate(() => { const L = __pg.ON.link, m = __pg.match, c = __pg.ctrl; return { screen: __pg.screen, state: L && L.room && L.room.state, map: L && L.room && L.room.map, players: L && L.room ? L.room.players.map(x => x.nick + ':' + x.team).sort().join(',') : '', watchers: L && L.room ? (L.room.watchers || []).map(x => x.nick).join(',') : '', phase: m && m.phase, turn: m && m.turnNo, mapId: m && m.mapId, paused: !!(c && c.paused), timeLeft: c ? c.timeLeft : 0, tick: m ? m.tick : 0, winner: m && m.winner, mine: !!(c && m && m.phase === 'aim' && c.activeLocal()) }; });
  const A = await open(BASE, '방장'); await A.click('#createBtn');
  await until(async () => (await S(A)).screen === 'lobby', 8000);
  const link = await A.inputValue('#shareLink'); pages.push(A);
  for (const n of ['민수', '지영', '철수', '영희', '동현']) { const P = await open(link, n); await P.click('#joinBtn'); await until(async () => (await S(P)).screen === 'lobby', 8000); pages.push(P); }
  const W = await open(link, '심판'); await W.check('#watchChk'); await W.click('#joinBtn'); await until(async () => (await S(W)).screen === 'lobby', 8000);
  const all = pages.concat([W]);
  ok(await until(async () => { const s = await S(A); return s.players.split(',').length === 6 && s.watchers === '심판' && s.players.split(':red').length === 4; }, 8000), '대기방: 참가자 6명(3:3) + 관전자 1명');
  await A.click(`#lobbyMaps .mapc:nth-child(${(await A.evaluate(() => Object.keys(__pg.CONFIG.maps).indexOf('valley'))) + 1})`);
  await until(async () => (await S(W)).map === 'valley', 4000);
  await A.click('#lobbyStart');
  ok(await until(async () => (await Promise.all(all.map(S))).every(s => s.screen === 'game' && s.phase === 'aim'), 20000), '3:3 시작 → 7대 모두 게임 화면');
  // ---- pause by the spectator
  ok(await W.isVisible('#pauseBtn') && !(await pages[1].isVisible('#pauseBtn')), '일시정지 버튼: 관전자에게 보이고 일반 참가자에겐 안 보임');
  await sleep(1500);
  await W.click('#pauseBtn');
  ok(await until(async () => (await Promise.all(all.map(S))).every(s => s.paused), 5000), '관전자가 일시정지 → 7대 모두 멈춤');
  ok(await pages[2].isVisible('#pauseOv'), '참가자 화면에 일시정지 안내 표시');
  const act = (await Promise.all(pages.map(S))).findIndex(s => s.mine), P0 = pages[act];
  const b0 = await S(P0), x0 = await P0.evaluate(() => __pg.match.tanks[__pg.match.cur].x);
  await P0.keyboard.down('ArrowRight'); await sleep(600); await P0.keyboard.up('ArrowRight'); await P0.keyboard.press('KeyP'); await sleep(2400);
  const b1 = await S(P0), x1 = await P0.evaluate(() => __pg.match.tanks[__pg.match.cur].x);
  ok(b1.timeLeft === b0.timeLeft && x1 === x0 && b1.turn === b0.turn, `멈춘 동안: 턴 시간 그대로(${Math.ceil(b0.timeLeft / 120)}초) · 이동·턴 넘기기 안 됨`);
  await W.click('#pauseBtn');
  ok(await until(async () => (await Promise.all(all.map(S))).every(s => !s.paused), 5000), '관전자가 「경기 계속」 → 7대 모두 재개');
  await sleep(1500); const b2 = await S(P0);
  ok(b2.timeLeft < b1.timeLeft && b2.timeLeft > b1.timeLeft - 120 * 4, `재개 뒤 턴 시간이 멈춘 곳에서 이어짐 (${Math.ceil(b1.timeLeft / 120)}초 → ${Math.ceil(b2.timeLeft / 120)}초)`);
  await P0.keyboard.press('KeyP');
  ok(await until(async () => (await Promise.all(all.map(S))).every(s => s.turn > b0.turn), 15000), '재개 뒤 턴 넘기기 → 모든 기기가 다음 턴으로');
  // ---- end the game (blue team forfeits through the host, the same path as a team that left)
  await until(async () => (await S(A)).phase === 'aim', 15000);
  await A.evaluate(() => { const m = __pg.match; __pg.ON.link.sendInput({ turnNo: m.turnNo, seat: m.tanks[m.cur].id, actions: JSON.parse(JSON.stringify(m.turn.actions)), forfeit: 'blue' }); });
  ok(await until(async () => (await Promise.all(all.map(S))).every(s => s.phase === 'over' && s.winner === 'red'), 20000), '경기 종료 → 7대 모두 같은 결과(레드 승)');
  await until(async () => pages[3].isVisible('#over'), 6000);
  ok(!(await W.isVisible('#pauseBtn')), '경기가 끝나면 일시정지 버튼 사라짐');
  // ---- result image
  const [dl] = await Promise.all([W.waitForEvent('download', { timeout: 8000 }), W.click('#saveResult')]);
  const size = await W.evaluate(() => { const c = __result.resultCanvas(); return c.width + 'x' + c.height; });
  ok(/^kyosae_result_\d{8}_\d{4}_valley\.png$/.test(dl.suggestedFilename()), `결과 이미지 저장: ${dl.suggestedFilename()} (${size})`);
  await dl.saveAs(process.env.OUT || '/tmp/kyosae_result.png');
  // ---- back to the lobby by a non-host player, map by the spectator, next game with the same members
  ok(await pages[3].isVisible('#toLobby') && await W.isVisible('#toLobby'), '「대기방으로」: 참가자와 관전자 모두에게 보임');
  const before = await S(A);
  await pages[3].click('#toLobby');
  ok(await until(async () => (await Promise.all(all.map(S))).every(s => s.screen === 'lobby' && s.state === 'lobby'), 10000), '참가자(방장 아님)가 「대기방으로」 → 7대 모두 대기방');
  const after = await S(A);
  ok(after.players === before.players && after.watchers === '심판', '멤버·팀 그대로 (참가자 6 + 관전자 1)');
  await W.click(`#lobbyMaps .mapc:nth-child(${(await W.evaluate(() => Object.keys(__pg.CONFIG.maps).indexOf('ridge'))) + 1})`);
  ok(await until(async () => (await Promise.all(all.map(S))).every(s => s.map === 'ridge'), 5000), '관전자가 맵 변경(혁신의 능선) → 모두에게 반영');
  await until(async () => A.isEnabled('#lobbyStart'), 4000); await A.click('#lobbyStart');
  ok(await until(async () => (await Promise.all(all.map(S))).every(s => s.screen === 'game' && s.mapId === 'ridge' && s.phase === 'aim'), 25000), '다음 경기: 같은 멤버 · 새 맵으로 7대 모두 시작');
  const h = await Promise.all(all.map(p => p.evaluate(() => __pg.match.hashes[__pg.match.turnNo])));
  ok(new Set(h).size === 1, '다음 경기 첫 턴 상태가 7대 모두 같음');
  ok(errors.length === 0, '페이지 오류 없음' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  console.log(`${pass} passed, ${fail} failed`); await browser.close(); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
