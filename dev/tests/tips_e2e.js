// 「알고 계셨나요?」 노출 규칙 (run: NODE_PATH=/opt/npm-tools/node_modules node tests/tips_e2e.js)
// 3턴마다 · 최소 간격 · 2번째 턴부터 · 결과 화면 복습. 시간 규칙은 TIP_RULE 값을 줄여서 확인
const { chromium } = require('playwright');
const fs = require('fs');
const html = fs.readFileSync(__dirname + '/../dist/pogyeokjeon.html', 'utf8');
const wrap = '<!doctype html><html><head><meta charset=utf-8></head><body>' + html + '</body></html>';
const res = []; const ok = (c, m) => res.push((c ? 'PASS ' : 'FAIL ') + m);
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.setContent(wrap); await p.waitForTimeout(1200); await p.click('#practiceBtn');
  await p.click('.mapc:has(.t:text-is("진실의 전당"))');
  await p.evaluate(() => document.querySelectorAll('select.ctl').forEach(s => { s.value = 'human'; s.dispatchEvent(new Event('change')); }));
  await p.evaluate(() => { __tips.TIP_RULE.minGapMs = 0; __tips.TIP_RULE.showMs = 300; });
  await p.click('#start'); await p.waitForTimeout(1500);
  // guide card shows a tip too; close it
  ok(await p.evaluate(() => /알고 계셨나요/.test(document.getElementById('mguide').textContent)), '시작 안내 카드에 문장');
  await p.evaluate(() => { const g = document.getElementById('mguide'); g.click(); g.hidden = true; });
  const log = [];
  await p.exposeFunction('logTip', (turn, text) => log.push([turn, text]));
  await p.evaluate(() => { const el = document.getElementById('tipToast'); new MutationObserver(() => { if (el.classList.contains('show')) logTip(__pg.match.turnNo, el.textContent); }).observe(el, { attributes: true }); });
  for (let i = 0; i < 13; i++) {
    const before = await p.evaluate(() => __pg.match.turnNo);
    await p.evaluate(() => __pg.cmdPass ? 0 : 0);
    await p.keyboard.press('p'); // 턴 넘기기
    for (let k = 0; k < 60; k++) { await p.waitForTimeout(100); if (await p.evaluate(t => __pg.match.turnNo > t && __pg.match.phase === 'aim', before)) break; }
    await p.waitForTimeout(150);
  }
  const turns = log.map(x => x[0]);
  ok(turns.length >= 3, '턴이 돌면 문장이 뜸 (' + turns.join(',') + ')');
  ok(turns[0] >= 2, '2번째 턴부터');
  ok(turns.every((t, i) => i === 0 || t - turns[i - 1] >= 3), '3턴 간격 이상');
  ok(new Set(log.map(x => x[1])).size === log.length, '한 판 안 중복 없음');
  const shown = await p.evaluate(() => __tips.TIPS.shown.length);
  ok(shown === turns.length + 1, '기록 수 = 안내 카드 1 + 턴 문장');
  // minimum gap: 2.5 s gap, turns pass quickly → fewer tips
  await p.evaluate(() => { __tips.TIP_RULE.minGapMs = 2500; __tips.TIPS.lastAt = performance.now(); });
  const n0 = log.length, t0 = Date.now();
  for (let i = 0; i < 6; i++) { const before = await p.evaluate(() => __pg.match.turnNo); await p.keyboard.press('p'); for (let k = 0; k < 60; k++) { await p.waitForTimeout(100); if (await p.evaluate(t => __pg.match.turnNo > t && __pg.match.phase === 'aim', before)) break; } }
  const secs = (Date.now() - t0) / 1000, got = log.length - n0;
  ok(got <= Math.floor(secs / 2.5) + 1, `최소 간격 지킴 (${got}개 / ${secs.toFixed(1)}초)`);
  // recap
  await p.evaluate(() => __tips.tipRecap('overTips'));
  const rc = await p.evaluate(() => [...document.querySelectorAll('#overTips li')].map(e => e.textContent));
  ok(rc.length === 3, '결과 화면 복습 3문장');
  const w = await p.evaluate(rc => rc.map(t => __tips.TIPS.shown.find(x => x[0] === t)[1]), rc);
  const best = await p.evaluate(() => __tips.TIPS.shown.map(t => t[1]).sort((a, b) => b - a).slice(0, 3));
  ok(JSON.stringify(w) === JSON.stringify(best), '복습은 중요도 높은 순');
  // a non-theme map has no tips
  ok(await p.evaluate(() => !__pg.CONFIG.maps.valley.tipPool), '일반 맵엔 문장 없음');
  ok(errs.length === 0, '페이지 오류 없음 ' + errs.slice(0, 2).join(' | '));
  console.log(res.join('\n')); console.log(res.filter(x => x.startsWith('PASS')).length + '/' + res.length);
  await b.close();
})();
