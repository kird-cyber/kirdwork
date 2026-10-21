// 나눔마켓 v2 시안 3종 브라우저 테스트 (데모 모드)   node dev/market-v2/e2e.js [baseURL]
// 각 시안: PC·휴대폰(390/360)에서 로그인 → 경쟁입찰 → 밀림 표시 → 일반입찰 → 현황판 → 관리자 결과, 가로 넘침·페이지 오류 없음
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const BASE = process.argv[2] || 'http://127.0.0.1:8790/';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0; const ok = (c, s) => { console.log((c ? 'PASS ' : 'FAIL ') + s); c ? pass++ : fail++; };
async function until(fn, ms) { const t = Date.now(); while (Date.now() - t < (ms || 6000)) { try { if (await fn()) return true; } catch (e) { } await sleep(120); } return false; }

async function login(P, code) {
  await P.evaluate(() => { const b = document.querySelector('#meIn'); if (b) b.click(); });
  await P.waitForSelector('#login[open]');
  await P.click('#cells input >> nth=0'); await P.keyboard.type(code, { delay: 15 });
  await P.click('#lgBtn');
  return until(() => P.evaluate(() => !document.querySelector('#login').open && !!document.querySelector('.chip-me')));
}
async function openItem(P, v, id, wide) {
  if (v === 'j') {
    await P.click('.jrow[data-id="' + id + '"]');
    if (wide) { await until(() => P.isVisible('#jcenter .go')); await P.click('#jcenter .go'); }
  } else await P.click('.card[data-id="' + id + '"]');
  return until(() => P.isVisible('#detail[open] #bidbox'));
}
async function bid(P, amount) {
  await P.fill('#amt', String(amount));
  await until(() => P.isEnabled('#bidBtn'));
  await P.click('#bidBtn');
  await until(() => P.isVisible('[data-go]')); await P.click('[data-go]');
  return until(() => P.isVisible('#detail .done'));
}

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  for (const v of ['f', 'h', 'j']) {
    const URL = BASE + 'market-' + v + '/';
    for (const [name, w, h, mob] of [['PC', 1440, 900, false], ['폰390', 390, 844, true], ['폰360', 360, 740, true]]) {
      const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: mob, hasTouch: mob, deviceScaleFactor: 1 });
      await ctx.route(/(fonts\.googleapis|fonts\.gstatic|cdn\.jsdelivr)/, r => r.abort());
      const errs = []; const P = await ctx.newPage(); P.on('pageerror', e => errs.push(e.message)); P.on('dialog', d => d.accept());
      const T = s => v.toUpperCase() + ' ' + name + ': ' + s;
      await P.goto(URL); await P.evaluate(() => localStorage.clear()); await P.reload();
      ok(await until(() => P.evaluate(() => document.querySelectorAll('[data-id]').length >= 8)), T('상품 8개'));
      ok(await P.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), T('첫 화면 가로 넘침 없음'));
      ok(await login(P, 'TESTAAAA'), T('참가 코드로 들어가기'));
      // 경쟁입찰: 스피커(3) 최고가 61,000 → 62,000
      ok(await openItem(P, v, 3, !mob), T('상세 열림'));
      if (mob) { await sleep(450); const dm = await P.evaluate(() => { const d = document.querySelector('#detail'); const r = d.getBoundingClientRect(); return [r.width, innerWidth, d.scrollWidth, d.clientWidth]; }); ok(dm[0] >= dm[1] - 1 && dm[2] <= dm[3] + 1, T('상세 = 전체 화면, 가로 넘침 없음 ' + dm.join('/'))); }
      ok(await P.evaluate(() => document.querySelectorAll('#bidbox [data-add]').length === 4), T('금액 더하기 버튼 4개'));
      await P.click('[data-add="1000"]');
      ok((await P.inputValue('#amt')) === '62,000', T('+1,000 → 현재 최고가 기준 62,000'));
      ok(await bid(P, 62000), T('62,000원 입찰 완료'));
      await P.keyboard.press('Escape');
      // 다른 사람이 더 높게 → 밀림 표시
      await P.evaluate(async () => { const r = await MK.api('login', { code: 'TESTBBBB' }); await MK.api('bid', { itemId: 3, amount: 70000 }, r.token); });
      await P.evaluate(() => window.dispatchEvent(new Event('visibilitychange')));
      await P.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
      ok(await until(() => P.evaluate(v => v === 'j' ? !!document.querySelector('.jrow[data-id="3"] .mk.out') : !!document.querySelector('[data-id="3"] .out'), v), 8000), T('더 높은 입찰이 들어오면 내 상품에 「밀림」 표시'));
      // 일반입찰: 텀블러(6)
      ok(await openItem(P, v, 6, !mob), T('일반입찰 상세'));
      ok(await P.evaluate(() => document.querySelector('#detail').textContent.includes('비공개')), T('일반입찰 금액 비공개 안내'));
      ok(await bid(P, 9500), T('일반입찰 9,500원'));
      await P.keyboard.press('Escape');
      // 현황판
      await P.evaluate(() => { const a = document.querySelector('[data-view="board"]'); if (a && a.offsetParent) a.click(); else document.querySelector('[data-mnav="board"]').click(); });
      ok(await until(() => P.isVisible('#boardView')), T('현황판 열림'));
      ok(await P.evaluate(() => document.querySelector('#board').textContent.includes('스테인리스 텀블러')), T('현황판에 내 입찰'));
      ok(await P.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), T('현황판 가로 넘침 없음'));
      if (mob) {
        ok(await P.isVisible('.mnav'), T('휴대폰 아래 탭'));
        await P.click('[data-mnav="mine"]');
        ok(await until(() => P.evaluate(() => !document.querySelector('#listView').hidden && document.querySelectorAll('#grid [data-id]').length === 2)), T('아래 탭 「내 입찰」 → 2개'));
        ok(await P.evaluate(() => { const i = document.querySelector('#q'); return parseFloat(getComputedStyle(i).fontSize) >= 16; }), T('검색칸 16px (아이폰 확대 방지)'));
      }
      // 로그인 칸이 화면 안에
      await P.evaluate(() => document.querySelector('#meOut').click()); await sleep(300);
      await P.evaluate(() => document.querySelector('#meIn').click()); await P.waitForSelector('#login[open]');
      ok(await P.evaluate(() => { const c = [...document.querySelectorAll('#cells input')].map(e => e.getBoundingClientRect()); const d = document.querySelector('#login').getBoundingClientRect(); return c[0].left >= d.left && c[7].right <= d.right; }), T('코드 8칸이 창 안에'));
      ok(errs.length === 0, T('페이지 오류 없음 ' + errs.join(' | ')));
      await ctx.close();
    }
    // 관리자 화면 (PC) — 같은 시안 저장 공간을 씀
    const ctx = await b.newContext({ viewport: { width: 1360, height: 900 } }); await ctx.route(/(fonts\.googleapis|fonts\.gstatic|cdn\.jsdelivr)/, r => r.abort());
    const A = await ctx.newPage(); const aerr = []; A.on('pageerror', e => aerr.push(e.message));
    await A.goto(URL); await A.evaluate(() => localStorage.clear()); await A.reload(); await sleep(800);
    await A.goto(URL + 'admin.html'); await A.fill('#pw', 'demo'); await A.click('#gateBtn');
    ok(await until(() => A.isVisible('.tiles')), v.toUpperCase() + ' 관리자: 로그인');
    ok(aerr.length === 0, v.toUpperCase() + ' 관리자: 오류 없음 ' + aerr.join(' | '));
    // 시안끼리 데모 저장이 섞이지 않음
    ok(await A.evaluate(v => Object.keys(localStorage).every(k => !k.startsWith('kird-market-demo') || k === 'kird-market-demo-' + v), v), v.toUpperCase() + ': 데모 저장 공간 분리');
    const M = await b.newContext({ viewport: { width: 360, height: 740 }, isMobile: true }); const MP = await M.newPage();
    await MP.goto(URL + 'admin.html'); await MP.fill('#pw', 'demo'); await MP.click('#gateBtn'); await until(() => MP.isVisible('.tiles'));
    await MP.evaluate(() => { const b = [...document.querySelectorAll('.nav button')].find(x => x.textContent.includes('참가 코드')); b && b.click(); }); await sleep(600);
    ok(await MP.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), v.toUpperCase() + ' 관리자 360px: 가로 넘침 없음');
    await M.close(); await ctx.close();
  }
  // J: 그래프 자료 (누가 냈는지 없음)
  const C = await b.newContext(); const P = await C.newPage(); await P.goto(BASE + 'market-j/');
  const tr = await P.evaluate(async () => (await MK.api('trend', {}, '')));
  ok(tr.ok && tr.items.length === 3 && tr.items.every(i => i.pts.every(p => p.length === 2)), 'J trend: 경쟁입찰 3개, [시각, 금액] 만');
  ok(!JSON.stringify(tr).includes('code'), 'J trend: 참가자 정보 없음');
  await C.close(); await b.close();
  console.log(pass + ' pass, ' + fail + ' fail'); process.exit(fail ? 1 : 0);
})();
