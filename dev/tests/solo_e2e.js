// 연구부정 소탕전 in a real browser: home card, challenge screen, a full run (a hard bot plays my side through the controller),
// result screen with rank, the record reaching the Google-Sheets stand-in (tests/board_mock.js on :8790), 명예의 전당.
const { chromium } = require('playwright');
const SP = process.argv[2] || '/tmp/claude-0/';
const BASE = 'http://127.0.0.1:8765/index.html';
let pass = 0, fail = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); c ? pass++ : fail++; };
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 1280, height: 860 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/fonts|ERR_|404|WebSocket/.test(m.text())) errs.push(m.text()); });
  await p.goto(BASE); await p.evaluate(() => { localStorage.clear(); localStorage.setItem('kyosae.board', JSON.stringify('http://127.0.0.1:8790/exec')); });
  await p.reload(); await p.waitForFunction(() => window.__pg && document.getElementById('soloBtn'), null, { timeout: 15000 }); await p.waitForTimeout(1500);
  ok(await p.isVisible('#soloBtn') && await p.isVisible('#createBtn') && await p.isVisible('#codeBtn'), 'home has three ways: 방 만들기 · 코드로 참여 · 연구부정 소탕전');
  ok(/기록이 없어요|1위/.test(await p.textContent('#soTopHome')), 'home card shows today\'s #1 line: ' + (await p.textContent('#soTopHome')).trim());
  await p.screenshot({ path: SP + 'so_home.png', fullPage: true });
  await p.fill('#nickIn', '시험왕'); await p.click('#soloBtn'); await p.waitForTimeout(400);
  ok(await p.isVisible('#solo') && (await p.$$('#soFoes .foe')).length === 3, 'challenge screen: three foes');
  ok((await p.textContent('#soFoes')).includes('위조탱') && (await p.textContent('#soFoes')).includes('표절탱'), 'foes named 위조탱 · 변조탱 · 표절탱 with definitions');
  ok((await p.inputValue('#soNick')) === '시험왕', 'nickname carried over from the home screen');
  await p.click('#soPicks .pick:nth-child(4)'); // 루키
  await p.screenshot({ path: SP + 'so_setup.png', fullPage: true });
  await p.click('#soStart'); await p.waitForTimeout(200);
  ok((await p.textContent('#soMsg')).includes('PIN'), 'PIN is required');
  await p.fill('#soPin', '1234'); await p.click('#soStart');
  await p.waitForFunction(() => window.__pg.screen === 'game' && window.__pg.match && window.__pg.match.tanks.length === 4, null, { timeout: 15000 });
  ok(await p.evaluate(() => __pg.match.tanks.map(t => t.nick).join()) === '시험왕,위조탱,변조탱,표절탱', 'match: me vs 위조탱·변조탱·표절탱 (names over the tanks)');
  ok(await p.evaluate(() => __pg.match.mapId) === 'scale', 'map is 진실의 전당 (연구윤리)');
  // drive my turns with a hard bot through the controller (so the inputs are recorded like a person's)
  await p.evaluate(() => {
    const mem = {};
    window.__drive = setInterval(() => {
      const m = __pg.match, c = __pg.ctrl; if (!m || m.phase !== 'aim' || m.cur !== 0 || c.charging) return;
      if (c._turn === m.turnNo) return; c._turn = m.turnNo;
      setTimeout(() => { if (m.phase !== 'aim' || m.cur !== 0) return; const G = __pg, plan = G.botPlan(m, 'hard', Math.random, mem); if (m.phase !== 'aim') return;
        c.emit(plan ? G.cmdFire(m, plan.angle, plan.power, plan.weapon, G.CONFIG.turn.timeLimitTicks - c.timeLeft) : G.cmdPass(m, G.CONFIG.turn.timeLimitTicks - c.timeLeft)); }, 400);
    }, 100);
  });
  await p.waitForTimeout(4000);
  ok(await p.isVisible('#soloHud') && /남은 시간 [0-9]:[0-5][0-9]/.test(await p.textContent('#soloHud')), 'chess clock at the top: ' + (await p.textContent('#soloHud')));
  await p.screenshot({ path: SP + 'so_game.png' });
  const order = await p.evaluate(() => new Promise(res => { const seen = []; let last = -1; const iv = setInterval(() => { const m = __pg.match; if (m.phase === 'aim' && m.turnNo !== last) { last = m.turnNo; seen.push(m.tanks[m.cur].nick); } if (seen.length >= 6 || m.phase === 'over') { clearInterval(iv); res(seen); } }, 50); }));
  console.log('   turns:', order.join(' → '));
  ok(order.filter((x, i) => i % 2 === (order[0] === '시험왕' ? 0 : 1)).every(x => x === '시험왕') && new Set(order.filter(x => x !== '시험왕')).size >= 2, 'turns alternate me ↔ a different foe each time');
  // fast-forward the rest: pump the controller (bots think in ticks), my turns fired at once by the hard bot
  const ff = await p.evaluate(() => new Promise(res => {
    clearInterval(window.__drive); const mem = {}; let n = 0;
    const pump = () => {
      const m = __pg.match, c = __pg.ctrl;
      for (let i = 0; i < 4000 && m.phase !== 'over'; i++, n++) {
        if (m.phase === 'aim' && m.cur === 0 && !c.charging && c.lastTurnSeen === m.turnNo) {
          const G = __pg, plan = G.botPlan(m, 'hard', Math.random, mem);
          if (m.phase === 'aim') c.emit(plan ? G.cmdFire(m, plan.angle, plan.power, plan.weapon, 600) : G.cmdPass(m, 600));
        }
        c.tickOnce();
      }
      if (m.phase === 'over' || n > 3e6) res({ n, turns: m.turnNo, over: m.phase === 'over' }); else setTimeout(pump, 0);
    };
    pump();
  }));
  console.log('   fast-forward:', JSON.stringify(ff));
  await p.waitForFunction(() => __pg.match.phase === 'over', null, { timeout: 60000, polling: 500 });
  await p.waitForSelector('#soloOver:not([hidden])', { timeout: 5000 });
  await p.waitForFunction(() => !/확인하는 중/.test(document.getElementById('sooRank').textContent), null, { timeout: 15000 });
  const title = await p.textContent('#sooTitle'), rank = await p.textContent('#sooRank');
  console.log('   result:', title, '·', await p.textContent('#sooTime'), '·', await p.textContent('#sooSub'), '·', rank);
  await p.screenshot({ path: SP + 'so_over.png' });
  const cleared = title.includes('완료');
  ok(cleared ? /1위/.test(rank) : true, cleared ? 'first clear → 오늘 1위 등극' : 'run failed (hard bot lost) — result shown');
  const rows = await (await fetch('http://127.0.0.1:8790/exec?action=top&nick=시험왕')).json();
  ok(cleared ? rows.today.length >= 1 && rows.today[0].nick === '시험왕' : true, 'the record reached the sheet stand-in' + (cleared ? ` (${rows.today[0].time}s)` : ''));
  await p.click('#sooFame'); await p.waitForTimeout(800);
  ok(await p.isVisible('#fame'), '명예의 전당 opens');
  await p.screenshot({ path: SP + 'so_fame.png', fullPage: true });
  await p.click('.ftabs [data-tab="fame"]'); await p.waitForTimeout(200);
  await p.screenshot({ path: SP + 'so_fame2.png', fullPage: true });
  // second run: slow player. 11 passes of 50 s, then idle on my turn -> the clock runs out mid-turn -> 시간 종료
  await p.click('#fPlayBtn'); await p.waitForTimeout(300); await p.click('#soStart');
  await p.waitForTimeout(1500); console.log('   2nd:', await p.evaluate(() => [document.getElementById('soMsg').textContent, __pg.match.phase, __pg.match.turnNo, !document.getElementById('solo').hidden]));
  await p.waitForFunction(() => __pg.match && __pg.match.phase !== 'over', null, { timeout: 15000 });
  const tu = await p.evaluate(() => new Promise(res => {
    let n = 0, passes = 0, low = false;
    const pump = () => {
      const m = __pg.match, c = __pg.ctrl, G = __pg;
      for (let i = 0; i < 4000 && m.phase !== 'over'; i++, n++) {
        if (m.phase === 'aim' && m.cur === 0 && !c.charging && c.lastTurnSeen === m.turnNo && passes < 11) { c.emit(G.cmdPass(m, 6000)); passes++; }
        c.tickOnce();
        if (document.getElementById('soloHud').classList.contains('low')) low = true;
      }
      if (m.phase === 'over' || n > 3e6) res({ n, passes, winner: m.winner, low, hud: document.getElementById('soloHud').textContent }); else setTimeout(pump, 0);
    };
    pump();
  }));
  console.log('   timeup run:', JSON.stringify(tu));
  await p.waitForSelector('#soloOver:not([hidden])', { timeout: 5000 });
  await p.waitForFunction(() => !/확인하는 중/.test(document.getElementById('sooRank').textContent), null, { timeout: 15000 });
  const t2 = await p.textContent('#sooTitle'), tm2 = await p.textContent('#sooTime');
  console.log('   result:', t2, '·', tm2, '·', await p.textContent('#sooSub'), '·', await p.textContent('#sooRank'));
  ok(tu.winner === 'timeup' && t2 === '시간 종료' && /남은 적 체력 \d+/.test(tm2), 'clock ran out mid-turn → 시간 종료 with foe HP left');
  const dump = await (await fetch('http://127.0.0.1:8790/exec?action=dump')).json(), last = dump[dump.length - 1];
  ok(last[4] === '시간종료' && last[5] === 600 && last[12] > 0 && /^v4\/ok/.test(String(last[10])), `sheet row: ${last[4]} · ${last[5]}s · 남은 적 체력 ${last[12]} · ${last[10]}`);
  await p.screenshot({ path: SP + 'so_timeup.png' });
  ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  await b.close();
  console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
