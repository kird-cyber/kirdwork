// 나눔마켓 브라우저 테스트 (데모 모드)   node dev/market/e2e.js [baseURL] [shotDir]
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const BASE = process.argv[2] || 'http://127.0.0.1:8790/market/';
const SHOT = process.argv[3] || '';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0; const ok = (c, s) => { console.log((c ? 'PASS ' : 'FAIL ') + s); c ? pass++ : fail++; };
async function until(fn, ms) { const t = Date.now(); while (Date.now() - t < (ms || 6000)) { try { if (await fn()) return true; } catch (e) { } await sleep(150); } return false; }
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await b.newContext({ viewport: { width: 1360, height: 900 }, deviceScaleFactor: 1 });
  await ctx.route(/cdn\.jsdelivr\.net/, r => r.abort());
  const errs = []; const shot = async (p, n, o) => { if (SHOT) await p.screenshot(Object.assign({ path: SHOT + n + '.png' }, o || {})); };
  const P = await ctx.newPage(); P.on('pageerror', e => errs.push('bidder: ' + e.message)); P.on('dialog', d => d.accept());
  await P.goto(BASE + 'index.html');
  ok(await until(() => P.evaluate(() => document.querySelectorAll('.card').length === 8)), '데모 상품 8개 보임');
  ok(await P.isVisible('#demoBar'), '데모 띠');
  ok((await P.textContent('#rules')).includes('경쟁입찰') && (await P.textContent('#rules')).includes('5만'.replace('5만', '50,000원')), '규칙 안내: 경쟁입찰 기준 50,000원');
  ok(await P.evaluate(() => document.querySelector('.card[data-id="1"] [data-top]').textContent === '92,000원'), '로봇청소기 현재 최고가 92,000원');
  ok(await P.evaluate(() => !document.querySelector('.card[data-id="4"] [data-top]') && document.querySelector('.card[data-id="4"]').textContent.includes('금액 비공개') && document.querySelector('.card[data-id="4"] .count')), '키보드(3만) 일반입찰 — 금액 비공개, 입찰 수는 보임');
  await shot(P, '01_home', { fullPage: false });
  await P.screenshot({ path: '/dev/null' }).catch(() => { });
  // 코드 없이 상세
  await P.click('.card[data-id="1"]');
  ok(await until(() => P.isVisible('#detail [data-login]')), '코드 없으면 상세에 「참가 코드 입력」');
  await P.click('#detail [data-login]');
  ok(await until(() => P.isVisible('#login')), '코드 입력 창');
  await P.click('#cells input >> nth=0'); await P.keyboard.type('testaaaz');
  await P.click('#lgBtn'); ok(await until(async () => (await P.textContent('#lgErr')).includes('맞지 않는')), '틀린 코드 안내');
  await P.evaluate(() => document.querySelectorAll('#cells input').forEach(c => c.value = ''));
  await P.click('#cells input >> nth=0'); await P.keyboard.type('TEST-AAAA');
  ok(await P.evaluate(() => [...document.querySelectorAll('#cells input')].map(c => c.value).join('') === 'TESTAAAA'), '대시 섞어 붙여도 8칸에 채움');
  await shot(P, '02_login', { clip: await (await P.$('#login')).boundingBox() });
  await P.click('#lgBtn');
  ok(await until(() => P.isVisible('#detail #amt')), '로그인 후 보던 상품으로 돌아와 금액 칸');
  // 낮은 금액
  await P.fill('#amt', '90000');
  ok((await P.textContent('#amtHint')).includes('92,100원 이상'), '경쟁: 92,100원 이상 안내 (최고가+100)');
  ok(await P.isDisabled('#bidBtn'), '부족하면 버튼 꺼짐');
  await P.fill('#amt', '95750');
  ok((await P.textContent('#amtHint')).includes('95,700원으로 접수'), '95,750 → 95,700 절사 미리보기');
  await shot(P, '03_detail_form');
  await P.click('#bidBtn'); ok(await until(() => P.isVisible('[data-go]')), '확인 단계');
  await shot(P, '04_confirm');
  await P.click('[data-go]'); ok(await until(() => P.isVisible('#detail .done')), '입찰 완료 화면');
  ok((await P.textContent('#detail .done')).includes('95,700원'), '95,700원 접수');
  await shot(P, '05_done');
  await P.keyboard.press('Escape');
  ok(await until(() => P.evaluate(() => document.querySelector('.card[data-id="1"] .mine.lead') !== null)), '카드에 「내가 최고가」');
  // 다른 탭에서 B가 추월
  const Q = await ctx.newPage(); Q.on('pageerror', e => errs.push('bidder2: ' + e.message)); Q.on('dialog', d => d.accept());
  await Q.goto(BASE + 'index.html#item-1');
  await until(() => Q.isVisible('#detail'));
  await Q.evaluate(() => { localStorage.removeItem('mk_tok'); localStorage.removeItem('mk_code'); });
  await Q.reload(); await until(() => Q.isVisible('#detail [data-login]'));
  await Q.click('#detail [data-login]'); await Q.click('#cells input >> nth=0'); await Q.keyboard.type('TESTBBBB'); await Q.click('#lgBtn');
  await until(() => Q.isVisible('#detail #amt'));
  ok(!(await Q.$('.quick')), '빠른 금액 버튼 없음 — 직접 입력');
  await Q.fill('#amt', '101000'); ok((await Q.inputValue('#amt')) === '101,000', '직접 입력 101,000 (쉼표 자동)');
  await Q.click('#bidBtn'); await Q.click('[data-go]'); await until(() => Q.isVisible('#detail .done'));
  // P 탭은 storage 이벤트로 갱신 — P 쪽 토큰은 지워졌으므로 다시 로그인
  // 데모는 한 브라우저 안에서 탭끼리 저장소를 나눠 쓰므로, A 탭은 다시 A 코드로 들어온다
  await P.evaluate(() => { localStorage.removeItem('mk_tok'); localStorage.removeItem('mk_code'); });
  await P.reload(); await until(() => P.isVisible('#meIn'));
  await P.click('#meIn'); await P.click('#cells input >> nth=0'); await P.keyboard.type('TESTAAAA'); await P.click('#lgBtn');
  await until(() => P.evaluate(() => !!document.querySelector('.chip-me')));
  ok(await until(() => P.evaluate(() => { const c = document.querySelector('.card[data-id="1"]'); return c.querySelector('.mine.out') && c.querySelector('[data-top]').textContent === '101,000원'; })), 'A 화면: 추월됨 + 최고가 101,000원');
  // 일반입찰 재입찰(교체, 낮춤)
  await P.click('.card[data-id="5"]'); await until(() => P.isVisible('#amt'));
  await P.fill('#amt', '15000'); await P.click('#bidBtn'); await P.click('[data-go]'); await until(() => P.isVisible('#detail .done'));
  await P.click('[data-again]'); await P.fill('#amt', '11000'); await P.click('#bidBtn'); await P.click('[data-go]');
  ok(await until(async () => (await P.textContent('#detail .done')).includes('11,000원')), '일반입찰: 낮춰서 교체 (15,000 → 11,000)');
  await P.keyboard.press('Escape');
  await P.click('.tab[data-f="mine"]'); ok(await P.evaluate(() => document.querySelectorAll('.card').length === 2), '「내 입찰」 탭 2개');
  await shot(P, '06_mine');
  await P.click('.tab[data-f="all"]');
  await P.fill('#q', '텀블러'); ok(await P.evaluate(() => document.querySelectorAll('.card').length === 1), '검색');
  await P.fill('#q', '');

  // ── 관리자 ──
  const A = await ctx.newPage(); A.on('pageerror', e => errs.push('admin: ' + e.message)); A.on('dialog', d => d.accept());
  await A.goto(BASE + 'admin.html');
  await A.fill('#pw', 'nope'); await A.click('#gateBtn'); ok(await until(async () => (await A.textContent('#gateErr')).includes('맞지')), '관리자: 틀린 비밀번호');
  await A.fill('#pw', 'demo'); await A.click('#gateBtn');
  ok(await until(() => A.isVisible('.tiles')), '관리자 대시보드');
  ok(await until(async () => (await A.textContent('.tiles')).includes('명')), '타일 집계');
  await shot(A, '10_admin_dash', { fullPage: true });
  // 상품 등록 + 사진
  await A.click('[data-p="items"]'); await until(() => A.isVisible('#addItem'));
  await shot(A, '11_admin_items', { fullPage: true });
  await A.click('#addItem'); await until(() => A.isVisible('#fName')); await sleep(150);
  await A.fill('#fName', '무선 이어폰 (새것)'); await A.fill('#fMin', '45000'); await A.fill('#fDescr', '선물 받고 미개봉.');
  ok((await A.textContent('#modeNote')).includes('일반입찰'), '4.5만 → 일반입찰 안내');
  await A.fill('#fMin', '55000'); ok((await A.textContent('#modeNote')).includes('경쟁입찰'), '5.5만 → 경쟁입찰 안내');
  const png = require('fs').readFileSync(__dirname + '/sample.jpg'); const _x = ('iVBORw0KGgoAAAANSUhEUgAAAEAAAAAwCAIAAADMxQCMAAAAQ0lEQVR42u3OMQEAAAgDoK1/6WngDhRAbiZERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERHxsGcZgH0BLz1ZbgAAAABJRU5ErkJggg==', 'base64');
  await A.setInputFiles('#fFile', { name: 'earbuds.jpg', mimeType: 'image/jpeg', buffer: png });
  ok(await until(() => A.evaluate(() => document.querySelectorAll('#phs .p img').length === 1)), '사진 올림 (줄여서 저장)');
  await shot(A, '12_admin_edit');
  await A.click('#edSave'); ok(await until(async () => (await A.textContent('#content')).includes('무선 이어폰')), '새 상품 목록에');
  // 숨김
  await A.click('[data-vis="9"]', { force: true }).catch(async () => { await A.evaluate(() => document.querySelector('[data-vis="9"]').click()); });
  ok(await until(() => A.evaluate(() => document.querySelector('[data-vis="9"]') && !document.querySelector('[data-vis="9"]').checked)), '새 상품 숨김');
  await P.reload(); await until(() => P.evaluate(() => document.querySelectorAll('.card').length > 0));
  ok(await P.evaluate(() => document.querySelectorAll('.card').length === 8), '숨긴 상품은 직원 화면에 없음');
  await A.evaluate(() => document.querySelector('[data-vis="9"]').click());
  await until(() => A.evaluate(() => document.querySelector('[data-vis="9"]').checked));
  await P.reload(); ok(await until(() => P.evaluate(() => document.querySelectorAll('.card').length === 9)), '공개하면 다시 보임');
  // 코드 발급
  await A.click('[data-p="codes"]'); await until(() => A.isVisible('#mkCodes'));
  await A.click('[data-ct="names"]'); await A.fill('#cNames', '인재개발팀 홍길동\n연구윤리팀 김연구\n안전팀 이안전');
  await A.click('#mkCodes'); ok(await until(() => A.isVisible('#codesDlg .codev')), '이름 목록으로 코드 3개');
  const newCode = await A.evaluate(() => document.querySelector('#codesDlg .codev').textContent);
  ok(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(newCode), '코드 형식 ' + newCode);
  await shot(A, '13_admin_codes_new');
  const dl = A.waitForEvent('download'); await A.click('#cdCsv'); const d = await dl; ok(/^kird-market_codes_.*\.csv$/.test(d.suggestedFilename()), 'CSV 내려받기 ' + d.suggestedFilename());
  await A.click('#cdClose'); await until(async () => !(await A.isVisible('#codesDlg')));
  await shot(A, '14_admin_codes', { fullPage: true });
  // 새 코드로 입찰
  const R = await ctx.newPage(); R.on('pageerror', e => errs.push('bidder3: ' + e.message));
  await R.goto(BASE + 'index.html'); await R.evaluate(() => { localStorage.removeItem('mk_tok'); }); await R.reload();
  await until(() => R.isVisible('#meIn')); await R.click('#meIn'); await R.click('#cells input >> nth=0'); await R.keyboard.type(newCode); await R.click('#lgBtn');
  ok(await until(() => R.evaluate(() => !!document.querySelector('.chip-me'))), '새로 만든 코드로 로그인');
  await R.close();
  await P.evaluate(() => { localStorage.removeItem('mk_tok'); }); await P.reload(); await until(() => P.isVisible('#meIn'));
  await P.click('#meIn'); await P.click('#cells input >> nth=0'); await P.keyboard.type('TESTAAAA'); await P.click('#lgBtn'); await until(() => P.evaluate(() => !!document.querySelector('.chip-me')));
  // 설정: 일반입찰 한 번만
  await A.click('[data-p="settings"]'); await until(() => A.isVisible('#prev'));
  await A.click('input[name="sealed_rebid"][value="none"]', { force: true });
  ok(await until(() => A.isVisible('.savebar')), '바꾸면 저장 막대');
  ok((await A.textContent('#prev')).includes('한 번만'), '미리보기 문장 바뀜');
  await A.selectOption('#sExt', '5');
  await shot(A, '15_admin_settings', { fullPage: true });
  await A.click('#save'); ok(await until(async () => !(await A.isVisible('.savebar'))), '설정 저장');
  await P.reload(); await until(() => P.evaluate(() => document.querySelectorAll('.card').length > 0));
  ok((await P.textContent('#rules')).includes('한 사람당 한 번만'), '직원 화면 규칙 문구 반영');
  await P.click('.card[data-id="5"]'); ok(await until(async () => (await P.textContent('#bidbox')).includes('한 번만 입찰')), '일반입찰 한 번만 → 재입찰 막힘');
  await P.keyboard.press('Escape');
  // 결과
  await A.click('[data-p="results"]'); await until(() => A.isVisible('#csvRes'));
  ok(await A.evaluate(() => [...document.querySelectorAll('#content tr')].some(r => r.textContent.includes('로봇청소기') && r.textContent.includes('101,000원') && r.textContent.includes('체험 직원 B'))), '결과: 로봇청소기 1위 101,000원 체험 직원 B');
  await shot(A, '16_admin_results', { fullPage: true });
  await A.click('tr[data-bids="1"]'); ok(await until(() => A.evaluate(() => document.querySelectorAll('#bdList tbody tr').length >= 4)), '상품별 입찰 기록');
  await shot(A, '17_admin_bids');
  await A.keyboard.press('Escape');
  // 일시정지
  await A.click('#pauseBtn'); ok(await until(async () => (await A.textContent('#pill')).includes('일시')), '잠시 멈춤');
  await P.reload(); ok(await until(async () => (await P.textContent('#phase')).includes('멈춤')), '직원 화면 「잠시 멈춤」');
  await A.click('#pauseBtn'); await until(async () => (await A.textContent('#pill')).includes('진행'));
  // 전체 마감 + 결과 공개
  await A.click('[data-p="settings"]'); await until(() => A.isVisible('#endNow')); await A.click('#endNow');
  ok(await until(() => A.isVisible('#unEnd')), '전체 마감');
  await A.click('[data-p="results"]'); await until(() => A.isVisible('#pubRes')); await A.evaluate(() => document.querySelector('#pubRes').click());
  await sleep(600);
  await P.reload(); ok(await until(() => P.evaluate(() => !!document.querySelector('.notice-closed'))), '직원 화면: 마감 안내');
  ok(await until(() => P.evaluate(() => !!document.querySelector('.card[data-id="5"] .mine.win') && !!document.querySelector('.card[data-id="1"] .mine.lose'))), '결과 공개: 5번 낙찰, 1번 미낙찰');
  await shot(P, '07_closed', { fullPage: false });
  await A.click('[data-p="logs"]'); ok(await until(() => A.evaluate(() => document.querySelectorAll('#content tbody tr').length > 10)), '기록 화면');
  // 휴대폰 폭
  const M = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 }); M.on('pageerror', e => errs.push('mobile: ' + e.message));
  await M.goto(BASE + 'index.html'); await until(() => M.evaluate(() => document.querySelectorAll('.card').length > 0));
  ok(await M.evaluate(() => document.documentElement.scrollWidth <= 391), '휴대폰 폭: 가로 스크롤 없음');
  await shot(M, '08_mobile');
  ok(errs.length === 0, '페이지 오류 없음 ' + errs.slice(0, 3).join(' | '));
  console.log(pass + ' pass, ' + fail + ' fail');
  await b.close(); process.exit(fail ? 1 : 0);
})();
