// M4 online test 4: forfeit. 1:1, the opponent closes the tab -> countdown -> victory screen.
const { chromium } = require('playwright');
const BASE = 'http://127.0.0.1:8765/index.html?broker=' + encodeURIComponent('ws://127.0.0.1:9001');
const SP = process.env.SP || '/tmp/claude-0/';
let pass = 0, fail = 0;
const ok = (c, s) => { console.log((c ? 'PASS ' : 'FAIL ') + s); c ? pass++ : fail++; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function until(fn, ms, step = 200) { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (await fn()) return true; } catch (e) {} await sleep(step); } return false; }
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const open = async (url, nick, vp) => { const p = await (await browser.newContext({ viewport: vp || { width: 1100, height: 700 } })).newPage(); await p.goto(url); await p.waitForFunction(() => window.__pg && document.getElementById('nickIn')); await p.fill('#nickIn', nick); return p; };
  const A = await open(BASE, '남는이'); await A.click('#createBtn'); await until(async () => A.evaluate(() => __pg.screen === 'lobby'), 8000);
  const B = await open(await A.inputValue('#shareLink'), '나가는이'); await B.click('#joinBtn');
  await until(async () => A.evaluate(() => __pg.ON.link.canStart()), 8000);
  await A.click('#lobbyStart'); await until(async () => B.evaluate(() => __pg.screen === 'game'), 8000);
  await sleep(1500);
  await B.context().close();
  ok(await until(async () => /기권/.test(await A.textContent('#waitTag')), 15000), '상대가 나가면 기권 카운트다운 표시: ' + (await A.textContent('#waitTag')));
  await A.screenshot({ path: SP + 'm4_forfeit_count.png' });
  ok(await until(async () => A.evaluate(() => __pg.match.phase === 'over' && __pg.match.winner === __pg.match.tanks.find(t => t.id === __pg.ON.myId).team), 60000), '30초 뒤 남은 팀 기권승');
  ok(await until(async () => A.isVisible('#over'), 5000), '결과 화면 표시');
  ok((await A.textContent('#overTitle')) === '승리!', '내 기준 "승리!" 표시');
  await A.screenshot({ path: SP + 'm4_win.png' });
  console.log(`\n${pass} passed, ${fail} failed`);
  await browser.close(); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
