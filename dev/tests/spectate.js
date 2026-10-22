// 관전자 모드 e2e: 실제 Mosquitto 중계 + 브라우저 여러 개
// needs: bash tests/serve.sh   run: NODE_PATH=/opt/npm-tools/node_modules node tests/spectate.js
const { chromium } = require('playwright');
const BASE = 'http://127.0.0.1:8765/index.html?broker=' + encodeURIComponent('ws://127.0.0.1:9001');
const SP = process.env.SP || '/tmp/claude-0/';
let pass = 0, fail = 0;
const ok = (c, s) => { console.log((c ? 'PASS ' : 'FAIL ') + s); c ? pass++ : fail++; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function until(fn, ms, step = 150) { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (await fn()) return true; } catch (e) {} await sleep(step); } return false; }
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'] }).catch(() => chromium.launch());
  const errors = [];
  async function open(url, nick, vp) {
    const ctx = await browser.newContext({ viewport: vp || { width: 1200, height: 760 } });
    const p = await ctx.newPage();
    p.on('pageerror', e => errors.push(nick + ': ' + e.message));
    p.on('dialog', d => d.accept());
    await p.goto(url); await p.waitForFunction(() => window.__pg && document.getElementById('nickIn'), null, { timeout: 15000 });
    await p.fill('#nickIn', nick); return p;
  }
  const R = p => p.evaluate(() => { const L = __pg.ON.link; return L && L.room ? { players: L.room.players.map(x => x.nick).join(','), watchers: (L.room.watchers || []).map(x => x.nick).join(','), state: L.room.state, screen: __pg.screen, spec: __pg.ON.spectator, host: L.isHost() } : null; });
  const A = await open(BASE, '방장');
  await A.click('#createBtn');
  await until(async () => (await R(A) || {}).screen === 'lobby', 8000);
  const code = await A.evaluate(() => __pg.ON.code);
  // B: 코드 + 「관전자로 입장」
  const B = await open(BASE, '중계석');
  await B.check('#watchChk');
  for (let i = 0; i < 5; i++) await B.locator('#codeCells .cc').nth(i).fill(code[i]);
  await B.click('#codeBtn');
  ok(await until(async () => (await R(A)).watchers === '중계석', 8000), '관전자로 입장 → 방장 화면 관전자 목록에 표시');
  ok((await R(A)).players === '방장', '관전자는 참가자 자리에 들어가지 않음');
  ok(await until(async () => (await R(B) || {}).screen === 'lobby', 5000), '관전자도 대기방 화면을 봄');
  ok(await B.evaluate(() => document.getElementById('myTankSec').hidden && document.getElementById('roleBtn').textContent === '참가자로 이동'), '관전자 대기방: 내 탱크 숨김 · 「참가자로 이동」 버튼');
  // C: 참가자로 입장 (초대 링크)
  const link = await A.inputValue('#shareLink');
  const C = await open(link.replace(/^[^#]*/, BASE), '참가자');
  await C.click('#joinBtn');
  ok(await until(async () => (await R(A)).players === '방장,참가자', 8000), '참가자 입장');
  // B: 대기방에서 참가자로 이동 → 다시 관전으로
  await B.click('#roleBtn');
  ok(await until(async () => { const r = await R(A); return r.players.includes('중계석') && !r.watchers; }, 6000), '대기방에서 관전자 → 참가자로 이동');
  await B.click('#roleBtn');
  ok(await until(async () => { const r = await R(A); return !r.players.includes('중계석') && r.watchers === '중계석'; }, 6000), '대기방에서 참가자 → 관전자로 이동');
  await A.screenshot({ path: SP + 'spec_lobby_host.png' }); await B.screenshot({ path: SP + 'spec_lobby_watch.png' });
  // 방장도 관전으로 이동 가능
  await A.click('#roleBtn');
  ok(await until(async () => { const r = await R(A); return r.watchers.includes('방장') && r.players === '참가자'; }, 6000), '방장도 관전으로 이동 (방장 권한 유지)');
  await A.click('#roleBtn');
  await until(async () => (await R(A)).players.includes('방장'), 6000);
  // 시작: 1대1 + 관전자
  await A.evaluate(() => { const L = __pg.ON.link; if (L.room.players.every(p => p.team === 'red')) L.moveOther(L.room.players.find(p => p.id !== L.myId).id, 'blue'); });
  await sleep(600);
  await A.click('#lobbyStart');
  ok(await until(async () => (await R(B)).screen === 'game', 8000), '게임 시작 → 관전자 화면도 게임으로');
  ok(await B.evaluate(() => __pg.ON.spectator === true), '관전자는 조작 없음 (spectator)');
  // 관전자 화면 = 같은 경기: 몇 턴 진행 후 해시 비교
  for (let k = 0; k < 3; k++) {
    const cur = await A.evaluate(() => __pg.match.tanks[__pg.match.cur].nick);
    const P = cur === '방장' ? A : C;
    await until(async () => P.evaluate(() => __pg.match.phase === 'aim'), 8000);
    await P.keyboard.press('p').catch(() => {});
    await sleep(2500);
  }
  const ta = await A.evaluate(() => __pg.match.turnNo), tb = await B.evaluate(() => __pg.match.turnNo);
  ok(ta > 1 && ta === tb, `관전자 화면이 경기와 같은 턴을 따라감 (방장 ${ta} · 관전 ${tb})`);
  const ha = await A.evaluate(t => __pg.match.hashes[t], ta), hb = await B.evaluate(t => __pg.match.hashes[t], ta);
  ok(ha && ha === hb, '관전자 화면의 경기 상태가 참가자와 동일 (상태 해시)');
  const fol = await B.evaluate(() => { const m = __pg.match, R = __pg.R; return R.follow && R.follow.idx === m.cur; });
  ok(fol, '턴이 바뀌면 관전자 카메라가 그 탱크로 이동');
  // 관전 채팅
  await B.evaluate(() => { document.getElementById('gameChatIn').value = '중계석 인사'; document.getElementById('gameChatForm').requestSubmit(); });
  ok(await until(async () => (await A.evaluate(() => document.getElementById('gameMsgs').textContent)).includes('중계석 인사'), 5000), '관전자 채팅이 참가자 화면에 표시');
  // D: 게임 중에 관전자로 들어오려 하면 → 진행 중인 게임은 볼 수 없음 (제3자 차단)
  const D = await open(BASE, '늦은관전');
  await D.check('#watchChk');
  for (let i = 0; i < 5; i++) await D.locator('#codeCells .cc').nth(i).fill(code[i]);
  await D.click('#codeBtn');
  await sleep(4000);
  ok((await D.evaluate(() => __pg.screen)) === 'home' && !(await D.evaluate(() => !!__pg.match && __pg.ON.active)), '게임 중에는 관전자로도 들어갈 수 없음 (처음 화면에 머묾)');
  ok((await D.evaluate(() => document.getElementById('homeMsg').textContent)).includes('게임 중'), '안내: 「지금 게임 중 · 대기방으로 돌아오면 자동 입장」');
  ok(!(await R(A)).watchers.includes('늦은관전'), '게임 중 시도한 사람은 관전자 목록에 추가되지 않음');
  // 판이 끝나 대기방으로 → 자동으로 관전자로 입장
  await A.evaluate(() => __pg.ON.link.backToLobby());
  ok(await until(async () => (await R(A)).watchers.includes('늦은관전') && (await R(D) || {}).screen === 'lobby', 8000), '대기방으로 돌아오면 기다리던 사람이 관전자로 자동 입장');
  // 관전자가 게임 중 새로고침해도(이미 방의 관전자) 다시 볼 수 있음
  await A.evaluate(() => { const L = __pg.ON.link; if (L.room.players.every(p => p.team === 'red')) L.moveOther(L.room.players.find(p => p.id !== L.myId).id, 'blue'); });
  await sleep(500); await A.click('#lobbyStart');
  ok(await until(async () => (await R(D) || {}).screen === 'game', 8000), '대기방부터 있던 관전자는 다음 판을 봄');
  await sleep(2500);
  await B.screenshot({ path: SP + 'spec_game_watch.png' });
  console.log(`\n${pass} passed, ${fail} failed`); if (errors.length) console.log('errors:', errors.slice(0, 6));
  await browser.close(); process.exit(fail ? 1 : 0);
})();
