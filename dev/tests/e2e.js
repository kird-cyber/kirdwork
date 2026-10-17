// Browser checks for M1 (run: NODE_PATH=/opt/npm-tools/node_modules node tests/e2e.js)
const { chromium } = require('playwright');
const fs = require('fs');
const SP = '/tmp/claude-0/-home-claude/3d72a4ac-67b3-5258-9678-3a944320e7db/scratchpad/';
const html = fs.readFileSync(__dirname + '/../dist/pogyeokjeon.html', 'utf8');
const wrap = '<!doctype html><html><head><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"></head><body>' + html + '</body></html>';
const results = []; const ok = (c, m) => { results.push((c ? 'PASS ' : 'FAIL ') + m); };
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/fonts|ERR_TUNNEL|net::/.test(m.text())) errs.push(m.text()); });
  await p.setContent(wrap); await p.waitForTimeout(1500); await p.click('#practiceBtn');
  ok(await p.locator('.mapc').count() === 4, '맵 4종 표시');
  // 4 v 4
  await p.click('.seg[data-team="red"][data-n="4"]'); await p.click('.seg[data-team="blue"][data-n="4"]');
  ok(await p.locator('.slot').count() === 8, '4:4 슬롯 8개');
  await p.fill('#nick-red-0', '민수');
  await p.screenshot({ path: SP + 'm1_setup.png' });
  await p.click('#start'); await p.waitForTimeout(2500);
  let st = await p.evaluate(() => ({ phase: __pg.match.phase, n: __pg.match.tanks.length, nick: __pg.match.tanks[0].nick, cur: __pg.match.cur }));
  ok(st.n === 8 && st.nick === '민수', '탱크 8대 + 닉네임 반영');
  ok(st.phase === 'aim', '첫 턴 조준 단계');
  await p.screenshot({ path: SP + 'm1_turn1.png' });
  // movement, angle, fire
  const before = await p.evaluate(() => { const t = __pg.match.tanks[__pg.match.cur]; return { x: t.x, aim: t.aim, turn: __pg.match.turnNo }; });
  await p.keyboard.down('ArrowRight'); await p.waitForTimeout(500); await p.keyboard.up('ArrowRight');
  await p.evaluate(() => { const t = __pg.match.tanks[__pg.match.cur], d = __pg.CONFIG.tanks[t.tankId]; __pg.ctrl.aimF = d.angleMin; t.aim = d.angleMin; });
  await p.keyboard.down('ArrowUp'); await p.waitForTimeout(300); await p.keyboard.up('ArrowUp');
  const mid = await p.evaluate(() => { const t = __pg.match.tanks[__pg.match.cur]; return { x: t.x, aim: t.aim }; });
  ok(mid.x !== before.x, '← → 이동');
  ok(await p.evaluate(() => { const t = __pg.match.tanks[__pg.match.cur]; return t.aim > __pg.CONFIG.tanks[t.tankId].angleMin; }), '↑ 각도 올리기');
  await p.keyboard.press('Digit2');
  ok(await p.evaluate(() => __pg.ctrl.weapon) === 1, '2번 무기 선택');
  await p.keyboard.down('Space'); await p.waitForTimeout(1100); await p.keyboard.up('Space');
  await p.waitForTimeout(500); await p.screenshot({ path: SP + 'm1_flight.png' });
  await p.waitForFunction(t => __pg.match.turnNo > t && __pg.match.phase === 'aim', before.turn, { timeout: 20000 });
  ok(true, '발사 후 다음 턴으로 진행');
  await p.screenshot({ path: SP + 'm1_after.png' });
  // items: give current tank heal + teleport
  await p.evaluate(() => { const t = __pg.match.tanks[__pg.match.cur]; t.items = ['heal', 'tele']; t.hp = 300; });
  await p.waitForTimeout(100);
  await p.keyboard.press('Digit3');
  const hp = await p.evaluate(() => __pg.match.tanks[__pg.match.cur].hp);
  ok(hp > 300, '아이템(회복) 사용');
  // camera drag & recenter
  const cam0 = await p.evaluate(() => __pg.R.cam.x);
  await p.mouse.move(700, 400); await p.mouse.down(); await p.mouse.move(300, 400, { steps: 8 }); await p.mouse.up();
  const cam1 = await p.evaluate(() => __pg.R.cam.x);
  ok(Math.abs(cam1 - cam0) > 100, '드래그로 맵 둘러보기');
  await p.keyboard.press('KeyF'); await p.waitForTimeout(1500);
  const cam2 = await p.evaluate(() => { const t = __pg.match.tanks[__pg.match.cur], v = __pg.R.viewSize(), W = __pg.match.W; const ex = Math.max(v.w / 2, Math.min(W - v.w / 2, t.x)); return Math.abs(__pg.R.cam.x - ex); });
  ok(cam2 < 400, 'F로 내 탱크 복귀');
  ok(await p.locator('#mini').isVisible(), '미니맵 표시');
  // in-browser replay determinism
  await p.evaluate(() => { __pg.ctrl.keys.fire = true; });
  await p.waitForTimeout(800); await p.evaluate(() => { __pg.ctrl.keys.fire = false; });
  await p.waitForTimeout(6000);
  const rep = await p.evaluate(() => {
    const m = __pg.match, log = __pg.ctrl.log;
    return { seed: m.seed, mapId: m.mapId, players: m.tanks.map(t => ({ id: t.id, nick: t.nick, team: t.team, tankId: t.tankId })), log, hashes: m.hashes };
  });
  fs.writeFileSync(SP + 'm1_browser_log.json', JSON.stringify(rep));
  // performance: force big explosions near tanks while measuring frame times
  const perf = await p.evaluate(async () => {
    const m = __pg.match; const times = []; let last = performance.now(), n = 0;
    return await new Promise(res => {
      function f(now) { times.push(now - last); last = now; n++;
        if (n % 20 === 0) { const t = m.tanks[(n / 20) % m.tanks.length | 0]; m.events.push({ type: 'boom', x: t.x, y: t.y - 10, r: 60, color: '#FFB040' }); }
        if (n < 240) requestAnimationFrame(f); else { times.sort((a, b) => a - b); res({ median: times[120], p95: times[228], max: times[239] }); } }
      requestAnimationFrame(f);
    });
  });
  ok(true, `프레임 시간(헤드리스, 폭발 연출 중): 중앙값 ${perf.median.toFixed(1)}ms, 95% ${perf.p95.toFixed(1)}ms`);
  // all maps boot
  for (const id of ['valley', 'clouds', 'bridge']) {
    await p.evaluate(id => { __pg.match = null; }, id);
    await p.evaluate(() => { document.getElementById('setup').hidden = false; });
    await p.click('.mapc >> nth=' + ['temple', 'valley', 'clouds', 'bridge'].indexOf(id));
    await p.click('#start'); await p.waitForTimeout(2500);
    const ph = await p.evaluate(() => __pg.match.phase);
    ok(ph === 'aim', id + ' 맵 시작');
    await p.screenshot({ path: SP + `m1_${id}.png` });
  }
  ok(errs.length === 0, '페이지 오류 없음' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  // clean session for the cross-engine check: 6 turns driven only by the keyboard
  {
    const q = await b.newPage({ viewport: { width: 1280, height: 800 } });
    await q.setContent(wrap); await q.waitForTimeout(1200); await q.click('#practiceBtn');
    await q.click('.mapc >> nth=1'); await q.click('#start'); await q.waitForTimeout(2500);
    for (let i = 0; i < 6; i++) {
      await q.waitForFunction(() => __pg.match.phase === 'aim' || __pg.match.phase === 'over', null, { timeout: 30000 });
      if (await q.evaluate(() => __pg.match.phase) === 'over') break;
      const k = i % 2 ? 'ArrowLeft' : 'ArrowRight';
      await q.keyboard.down(k); await q.waitForTimeout(200 + i * 90); await q.keyboard.up(k);
      await q.keyboard.down('ArrowUp'); await q.waitForTimeout(150); await q.keyboard.up('ArrowUp');
      if (i === 3) await q.keyboard.press('Digit2');
      await q.keyboard.down('Space'); await q.waitForTimeout(700 + i * 120); await q.keyboard.up('Space');
      await q.waitForTimeout(600);
    }
    await q.waitForTimeout(5000);
    const rec = await q.evaluate(() => { const m = __pg.match; return { seed: m.seed, mapId: m.mapId, players: m.tanks.map(t => ({ id: t.id, nick: t.nick, team: t.team, tankId: t.tankId })), log: __pg.ctrl.log, hashes: m.hashes }; });
    fs.writeFileSync(SP + 'm1_clean_log.json', JSON.stringify(rec));
    ok(rec.log.length >= 5, `깨끗한 기록 세션 ${rec.log.length}턴`);
    await q.close();
  }
  // phone
  const ph = await b.newPage({ viewport: { width: 390, height: 780 }, hasTouch: true, isMobile: true });
  await ph.setContent(wrap); await ph.waitForTimeout(1200); await ph.click('#practiceBtn');
  await ph.screenshot({ path: SP + 'm1_phone_setup.png', fullPage: false });
  await ph.click('#start'); await ph.waitForTimeout(2500);
  await ph.screenshot({ path: SP + 'm1_phone.png' });
  ok(await ph.locator('.fire').isVisible(), '휴대폰 터치 버튼 표시');
  await b.close();
  console.log(results.join('\n'));
})();
