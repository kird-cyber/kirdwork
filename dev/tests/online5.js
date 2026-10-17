// M5 online test: lobby chat, ready, in-game chat + emote bubble, rematch with the same teams.
const { chromium } = require('playwright');
const BASE = 'http://127.0.0.1:8765/index.html?broker=' + encodeURIComponent('ws://127.0.0.1:9001');
const SP = process.env.SP || '/tmp/claude-0/';
let pass = 0, fail = 0;
const ok = (c, s) => { console.log((c ? 'PASS ' : 'FAIL ') + s); c ? pass++ : fail++; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function until(fn, ms, step = 150) { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (await fn()) return true; } catch (e) {} await sleep(step); } return false; }
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const errors = [];
  const open = async (url, nick) => { const p = await (await browser.newContext({ viewport: { width: 1200, height: 760 } })).newPage(); p.on('pageerror', e => errors.push(nick + ': ' + e.message)); await p.goto(url); await p.waitForFunction(() => window.__pg && document.getElementById('nickIn')); await p.fill('#nickIn', nick); return p; };
  const A = await open(BASE, '방장'); await A.click('#createBtn'); await until(async () => A.evaluate(() => __pg.screen === 'lobby'), 8000);
  const B = await open(await A.inputValue('#shareLink'), '손님'); await B.click('#joinBtn');
  await until(async () => A.evaluate(() => __pg.ON.link.room.players.length === 2), 8000);
  // lobby chat
  await B.fill('#lobbyChatIn', '안녕하세요 반가워요'); await B.press('#lobbyChatIn', 'Enter');
  ok(await until(async () => (await A.textContent('#lobbyMsgs')).includes('안녕하세요 반가워요'), 4000), '대기방 채팅이 상대에게 보임');
  await A.click('#lobbyChat .emo:nth-child(1)');
  ok(await until(async () => (await B.textContent('#lobbyMsgs')).includes('나이스'), 4000), '대기방 이모티콘');
  // ready
  ok(await B.isVisible('#readyBtn') && !(await A.isVisible('#readyBtn')), '준비 버튼은 참가자에게만');
  await B.click('#readyBtn');
  ok(await until(async () => (await A.textContent('#startNote')).includes('모두 준비 완료'), 4000), '참가자 준비 → 방장에게 "모두 준비 완료"');
  ok(await until(async () => (await A.textContent('#blueList')).includes('준비 완료') || (await A.textContent('#redList')).includes('준비 완료'), 3000), '명단에 준비 완료 표시');
  await A.screenshot({ path: SP + 'm5_lobby_chat.png' });
  // game
  await A.click('#lobbyStart');
  await until(async () => B.evaluate(() => __pg.screen === 'game'), 8000); await sleep(1200);
  await B.keyboard.press('Enter'); await sleep(200);
  ok(await B.evaluate(() => document.activeElement && document.activeElement.id === 'gameChatIn'), 'Enter → 게임 중 채팅 입력창');
  await B.keyboard.type('조준 잘해봐'); await B.keyboard.press('Enter');
  ok(await until(async () => (await A.textContent('#gameMsgs')).includes('조준 잘해봐'), 4000), '게임 중 채팅이 상대 화면에');
  ok(await until(async () => A.evaluate(() => Object.values(__pg.R.bubbles).some(b => b.text.includes('조준'))), 3000), '보낸 사람 탱크 위에 말풍선');
  await A.click('#chatBtn'); await A.click('#gchat .emo:nth-child(2)');
  ok(await until(async () => B.evaluate(() => Object.values(__pg.R.bubbles).some(b => b.text.includes('ㅋㅋㅋ'))), 3000), '게임 중 이모티콘 말풍선');
  await sleep(300); await B.screenshot({ path: SP + 'm5_game_chat.png' });
  const seed1 = await A.evaluate(() => __pg.match.seed);
  // end the game identically on both, then rematch
  await until(async () => (await Promise.all([A, B].map(p => p.evaluate(() => __pg.match.phase)))).every(ph => ph === 'aim'), 20000, 50);
  await Promise.all([A, B].map(p => p.evaluate(() => { const m = __pg.match, cur = m.tanks[m.cur].team; for (const t of m.tanks) if (t.team !== cur) { t.hp = 0; t.alive = false; } })));
  const act = (await A.evaluate(() => __pg.ctrl.activeLocal())) ? A : B;
  await act.keyboard.down('Space'); await sleep(400); await act.keyboard.up('Space');
  ok(await until(async () => A.isVisible('#rematchBtn'), 20000), '결과 화면에 방장용 "바로 재대결"');
  ok(await B.isVisible('#overWait') && !(await B.isVisible('#rematchBtn')), '참가자에겐 대기 안내');
  await A.click('#rematchBtn');
  ok(await until(async () => (await Promise.all([A, B].map(p => p.evaluate(s => __pg.screen === 'game' && __pg.match.seed !== s && __pg.match.turnNo >= 1 && document.getElementById('over').hidden, seed1)))).every(Boolean), 8000), '재대결 → 둘 다 새 전장에서 바로 시작');
  const same = await Promise.all([A, B].map(p => p.evaluate(() => __pg.match.seed + ':' + __pg.match.tanks.map(t => t.nick + t.team + t.tankId).join())));
  ok(same[0] === same[1], '재대결 전장·팀이 두 기기에서 같음');
  ok(errors.length === 0, '페이지 오류 없음' + (errors.length ? ' — ' + errors.slice(0, 3).join(' | ') : ''));
  console.log(`\n${pass} passed, ${fail} failed`);
  await browser.close(); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
