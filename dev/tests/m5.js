// M5 local test: tutorial steps, practice bot plays its turns, new maps start, sudden death banner, music toggle.
const { chromium } = require('playwright');
const SP = process.env.SP || '/tmp/claude-0/';
let pass = 0, fail = 0;
const ok = (c, s) => { console.log((c ? 'PASS ' : 'FAIL ') + s); c ? pass++ : fail++; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function until(fn, ms, step = 150) { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (await fn()) return true; } catch (e) {} await sleep(step); } return false; }
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await (await b.newContext({ viewport: { width: 1280, height: 760 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8765/index.html'); await p.waitForTimeout(600);
  await p.fill('#nickIn', '연습생');
  await p.click('#tutorialBtn'); await sleep(1500);
  ok(await p.isVisible('#coach'), '튜토리얼 시작 → 안내 창');
  const step = () => p.evaluate(() => document.getElementById('coachStep').textContent);
  // wait until it is our turn (tutorial: red first? if bot first, wait)
  await until(async () => p.evaluate(() => __pg.ctrl.activeLocal()), 20000);
  await p.keyboard.down('ArrowRight'); await sleep(900); await p.keyboard.up('ArrowRight');
  ok(await until(async () => (await step()).startsWith('튜토리얼 2'), 3000), '1단계(이동) 완료 → 2단계');
  await p.keyboard.down('ArrowUp'); await sleep(500); await p.keyboard.up('ArrowUp');
  ok(await until(async () => (await step()).startsWith('튜토리얼 3'), 3000), '2단계(각도) 완료 → 3단계');
  await p.screenshot({ path: SP + 'm5_tutorial.png' });
  await p.keyboard.down('Space'); await sleep(900); await p.keyboard.up('Space');
  ok(await until(async () => (await step()).startsWith('튜토리얼 4'), 3000), '3단계(발사) 완료');
  const s5 = await until(async () => (await step()).startsWith('튜토리얼 5'), 30000); if (!s5) console.log('DBG', await step(), JSON.stringify(await p.evaluate(() => ({ turn: __pg.match.turnNo, phase: __pg.match.phase, cur: __pg.match.cur, hap: __pg.match.happening, tut: document.getElementById('coachText').textContent })))); ok(s5, '봇 차례로 넘어감 → 5단계');
  await sleep(1200); await p.screenshot({ path: SP + 'm5_bot_turn.png' });
  ok(await until(async () => (await step()).startsWith('튜토리얼 6'), 30000), '봇이 스스로 조준·발사하고 내 차례로 돌아옴 → 6단계');
  ok(await until(async () => p.isHidden('#coach'), 15000), '튜토리얼 완료');
  // practice: 1 human vs hard bot on each new map
  for (const map of ['snow', 'lava', 'moon', 'islands']) {
    await p.evaluate(map => { localStorage.setItem('pg.setup', JSON.stringify({ map, red: 1, blue: 1, slots: { red: [{ nick: '나', tank: 'rookie', ctl: 'hard' }, {}, {}, {}], blue: [{ nick: '봇', tank: 'swarm', ctl: 'hard' }, {}, {}, {}] } })); }, map);
    await p.reload(); await p.waitForTimeout(500); await p.click('#practiceBtn'); await p.click('#start');
    const t0 = await until(async () => p.evaluate(() => __pg.match && __pg.match.turnNo >= 4), 60000);
    ok(t0, `${map}: 봇끼리 4턴 이상 진행 (오류 없이)`);
  }
  // sudden death: jump the turn counter close to it on a bot game
  await p.evaluate(() => { const m = __pg.match; m.turnNo = 16; });
  ok(await until(async () => p.evaluate(() => __pg.match.sudden === true), 60000), '서든데스 발동');
  ok((await p.textContent('#windTxt')).includes('서든데스'), '바람 표시에 서든데스 안내');
  // music toggle
  await p.click('#musicBtn'); ok((await p.textContent('#musicBtn')).includes('꺼짐'), '음악 끄기 버튼');
  await p.click('#musicBtn'); ok((await p.textContent('#musicBtn')).includes('켜짐'), '음악 켜기 버튼');
  ok(errs.length === 0, '페이지 오류 없음' + (errs.length ? ' — ' + errs.slice(0, 3).join(' | ') : ''));
  console.log(`\n${pass} passed, ${fail} failed`);
  await b.close(); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
