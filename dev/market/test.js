// 나눔마켓 테스트: 규칙(데모 저장소) + Apps Script 백엔드(흉내 환경)   node dev/market/test.js
const path = require('path');
const C = require('../../market/assets/core.js');
const { loadGas } = require('./gasmock.js');
let pass = 0, fail = 0;
const ok = (c, s) => { if (c) pass++; else { fail++; console.log('FAIL', s); } };

function memStorage() { const m = new Map(); return { getItem: k => m.has(k) ? m.get(k) : null, setItem: (k, v) => m.set(k, v), removeItem: k => m.delete(k) }; }

function scenario(name, mk) {
  // mk() → { call(action,payload,token), setNow(t) }
  const M = mk();
  const T0 = Date.UTC(2026, 10, 3, 0, 0, 0);
  M.setNow(T0);
  const A = M.call('adminLogin', { password: 'pw-123' }).token;
  ok(!!A, name + ': 관리자 로그인');
  const inf = M.call('info'); ok(inf.unit === 100 && inf.show_count === 'all' && inf.sealed_rebid === 'replace' && inf.comp_rebid === 'raise', name + ': 기본값 — 100원 단위, 입찰 수 모두 표시, 일반 교체, 경쟁 올리기');
  M.call('admin.saveSettings', { settings: { unit: 1000, comp_step: 1000, show_count: 'comp' } }, A);
  ok(!M.call('adminLogin', { password: 'nope' }).ok, name + ': 틀린 비밀번호 거절');
  ok(!M.call('admin.state', {}, 'garbage').ok, name + ': 토큰 없이 관리자 요청 거절');
  // 상품
  const i1 = M.call('admin.saveItem', { item: { name: '로봇청소기', min_price: 80000, descr: '1년 사용' } }, A).id;
  const i2 = M.call('admin.saveItem', { item: { name: '텀블러', min_price: 5000 } }, A).id;
  const i3 = M.call('admin.saveItem', { item: { name: '책 세트', min_price: 60000, mode: 'sealed' } }, A).id;
  const i4 = M.call('admin.saveItem', { item: { name: '=수식 공격', min_price: 3000, descr: '+1 @x' } }, A).id;
  ok(i1 && i2 && i3 && i4, name + ': 상품 4개 등록');
  ok(!M.call('admin.saveItem', { item: { name: '', min_price: 100 } }, A).ok, name + ': 이름 없는 상품 거절');
  // 코드
  const made = M.call('admin.createCodes', { labels: ['홍길동', '김연구', '이과학'] }, A).codes;
  ok(made.length === 3 && /^[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(made[0].code), name + ': 코드 3개 발급 (XXXX-XXXX)');
  const lg = c => M.call('login', { code: c }).token;
  const [a, b, c] = made.map(x => lg(x.code.toLowerCase().replace('-', ' ')));
  ok(a && b && c, name + ': 소문자·띄어쓰기 섞어도 로그인');
  ok(!M.call('login', { code: 'ZZZZ-ZZZZ' }).ok, name + ': 없는 코드 거절');
  ok(M.call('admin.codes', {}, A).codes.every(x => !('hash' in x)), name + ': 관리자 목록에도 해시 안 나감');
  // 진행 전/후
  M.call('admin.saveSettings', { settings: { open_at: T0 + 3600e3, close_at: T0 + 48 * 3600e3 } }, A);
  ok(M.call('bid', { itemId: i2, amount: 6000 }, a).code === 'rule', name + ': 시작 전 입찰 거절');
  M.setNow(T0 + 2 * 3600e3);
  ok(M.call('info').phase === 'open', name + ': 시작 후 open');
  // 경쟁입찰 (8만 이상 → comp)
  let r = M.call('bid', { itemId: i1, amount: 79000 }, a); ok(!r.ok, name + ': 최소가 미만 거절');
  r = M.call('bid', { itemId: i1, amount: 80500 }, a); ok(r.ok && r.amount === 80000 && r.floored, name + ': 80,500 → 80,000 절사 접수');
  r = M.call('bid', { itemId: i1, amount: 80000 }, b); ok(!r.ok && r.need === 81000, name + ': 경쟁 — 최고가 이하 거절, 필요 81,000');
  M.setNow(T0 + 2 * 3600e3 + 1000);
  r = M.call('bid', { itemId: i1, amount: 90000 }, b); ok(r.ok && r.item.top === 90000 && r.item.mine.leading === true, name + ': B 9만 최고');
  let v = M.call('items', {}, a).items.find(x => x.id === i1);
  ok(v.top === 90000 && v.mine.amount === 80000 && v.mine.leading === false && v.count === 2, name + ': A 화면 — 최고가 9만, 내 8만, 추월됨, 2명');
  ok(!('code_id' in v) && JSON.stringify(v).indexOf('홍길동') < 0, name + ': 직원 화면에 누가 입찰했는지 없음');
  r = M.call('bid', { itemId: i1, amount: 91000 }, a); ok(r.ok && r.rebid, name + ': A 재입찰 9.1만');
  // 일반입찰 (5천 → sealed)
  r = M.call('bid', { itemId: i2, amount: 7300 }, a); ok(r.ok && r.amount === 7000, name + ': 일반 7,300 → 7,000');
  r = M.call('bid', { itemId: i2, amount: 6000 }, b); ok(r.ok, name + ': 일반 — 남보다 낮아도 접수');
  v = M.call('items', {}, b).items.find(x => x.id === i2);
  ok(v.top === undefined && v.count === undefined && v.mine.amount === 6000 && v.mine.leading === undefined, name + ': 일반 — 최고가·인원·순위 숨김');
  r = M.call('bid', { itemId: i2, amount: 5000 }, a); ok(r.ok, name + ': 일반 replace — 낮춰서 교체 가능');
  ok(!M.call('bid', { itemId: i2, amount: 5000 }, a).ok, name + ': 같은 금액 다시 거절');
  // 관리자 옵션: 일반 올리기만
  M.call('admin.saveSettings', { settings: { sealed_rebid: 'raise' } }, A);
  ok(!M.call('bid', { itemId: i2, amount: 4000 + 1000 }, a).ok, name + ': raise — 같거나 낮게 거절');
  ok(M.call('bid', { itemId: i2, amount: 8000 }, a).ok, name + ': raise — 높게 접수');
  // 한 번만
  M.call('admin.saveSettings', { settings: { sealed_rebid: 'none', comp_rebid: 'none' } }, A);
  ok(!M.call('bid', { itemId: i2, amount: 9000 }, a).ok, name + ': 일반 none — 재입찰 거절');
  ok(!M.call('bid', { itemId: i1, amount: 120000 }, b).ok, name + ': 경쟁 none — 재입찰 거절');
  ok(M.call('bid', { itemId: i1, amount: 100000 }, c).ok, name + ': 경쟁 none — 첫 입찰은 OK');
  M.call('admin.saveSettings', { settings: { sealed_rebid: 'replace', comp_rebid: 'raise', allow_cancel: true } }, A);
  // 강제 sealed (6만이지만 일반)
  r = M.call('bid', { itemId: i3, amount: 60000 }, a); ok(r.ok && r.item.mode === 'sealed' && r.item.top === undefined, name + ': 관리자가 지정한 일반입찰');
  ok(M.call('cancel', { itemId: i3 }, a).ok, name + ': 일반 입찰 취소(옵션 켬)');
  ok(!M.call('cancel', { itemId: i1 }, a).ok, name + ': 경쟁 입찰은 취소 불가');
  // 단위 변경
  M.call('admin.saveSettings', { settings: { unit: 100 } }, A);
  r = M.call('bid', { itemId: i4, amount: 3456 }, a); ok(r.ok && r.amount === 3400, name + ': 단위 100원 — 3,456 → 3,400');
  M.call('admin.saveSettings', { settings: { unit: 1000 } }, A);
  // 숨김
  M.call('admin.setHidden', { id: i4, hidden: true }, A);
  ok(!M.call('items', {}, a).items.some(x => x.id === i4), name + ': 숨긴 상품 안 보임');
  ok(!M.call('bid', { itemId: i4, amount: 5000 }, a).ok, name + ': 숨긴 상품 입찰 거절');
  ok(!M.call('admin.deleteItem', { id: i4 }, A).ok, name + ': 입찰 있는 상품 삭제 거절');
  const i5 = M.call('admin.saveItem', { item: { name: '지울 상품', min_price: 1000 } }, A).id;
  ok(M.call('admin.deleteItem', { id: i5 }, A).ok && !M.call('admin.state', {}, A).items.some(x => x.id === i5), name + ': 입찰 없는 상품 삭제');
  // 일시정지
  M.call('admin.saveSettings', { settings: { paused: true } }, A);
  ok(M.call('bid', { itemId: i2, amount: 9000 }, b).code === 'rule', name + ': 일시정지 중 거절');
  M.call('admin.saveSettings', { settings: { paused: false } }, A);
  // 코드 중지·재발급
  const codes = M.call('admin.codes', {}, A).codes;
  M.call('admin.updateCode', { id: codes[2].id, active: false }, A);
  ok(M.call('bid', { itemId: i2, amount: 9000 }, c).code === 'auth', name + ': 중지된 코드 입찰 거절');
  const re = M.call('admin.reissueCode', { id: codes[1].id }, A);
  ok(M.call('bid', { itemId: i2, amount: 9000 }, b).code === 'auth', name + ': 재발급하면 옛 로그인 끊김');
  const b2 = lg(re.code); ok(!!b2 && M.call('items', {}, b2).items.find(x => x.id === i2).mine.amount === 6000, name + ': 새 코드로 기존 입찰 그대로');
  ok(!M.call('login', { code: made[1].code }).ok, name + ': 옛 코드 로그인 거절');
  // 연장
  M.call('admin.saveSettings', { settings: { extend_min: 5 } }, A);
  const relogin = () => M.call('adminLogin', { password: 'pw-123' }).token;
  M.setNow(T0 + 48 * 3600e3 - 60e3);
  r = M.call('bid', { itemId: i1, amount: 150000 }, b2);
  ok(r.ok && r.item.close_at === T0 + 48 * 3600e3 - 60e3 + 5 * 60e3, name + ': 마감 1분 전 경쟁입찰 → 5분 연장');
  M.setNow(T0 + 48 * 3600e3 + 60e3);
  ok(M.call('info').phase === 'open', name + ': 연장 중이면 전체는 아직 진행');
  ok(!M.call('bid', { itemId: i2, amount: 12000 }, a).ok, name + ': 연장 안 된 일반입찰은 마감');
  ok(M.call('bid', { itemId: i1, amount: 160000 }, a).ok, name + ': 연장된 경쟁입찰은 입찰 가능');
  M.setNow(T0 + 49 * 3600e3);
  ok(M.call('info').phase === 'closed', name + ': 연장도 끝나면 마감');
  // 결과
  ok(!M.call('admin.state', {}, A).ok, name + ': 관리자 토큰 12시간 지나면 만료');
  const A2 = relogin();
  let st = M.call('admin.state', {}, A2); const it1 = st.items.find(x => x.id === i1);
  ok(it1.top.amount === 160000 && it1.top.label === '홍길동' && it1.second.amount === 150000, name + ': 관리자 결과 — 1위 홍길동 16만, 2위 15만');
  ok(st.totals.bids >= 5, name + ': 집계');
  ok(M.call('items', {}, a).items.find(x => x.id === i1).mine.result === undefined, name + ': 결과 공개 전엔 낙찰 여부 숨김');
  M.call('admin.saveSettings', { settings: { results_public: true } }, A2);
  ok(M.call('items', {}, a).items.find(x => x.id === i1).mine.result === 'win' && M.call('items', {}, b2).items.find(x => x.id === i1).mine.result === 'lose', name + ': 결과 공개 — 낙찰/미낙찰');
  // 동점: 먼저 낸 사람
  const bl = M.call('admin.bids', { itemId: i2 }, A2).bids; ok(bl.some(x => !x.active) && bl.filter(x => x.rank === 1).length === 1, name + ': 입찰 기록(교체 이력 포함)');
  ok(M.call('mybids', {}, a).history.length >= 5, name + ': 내 입찰 기록');
  ok(M.call('admin.logs', {}, A2).logs.length > 10, name + ': 감사 기록');
  const dump = M.call('admin.dump', {}, A2); ok(!JSON.stringify(dump).includes('_secret') && !JSON.stringify(dump.codes).includes('hash'), name + ': 백업에 비밀키·해시 없음');
  return M;
}

// 1) 데모 저장소
{
  let now = 0; const storage = memStorage();
  scenario('데모', () => {
    const mk = () => C.createMarket(C.LocalStore('t', storage), { adminPassword: 'pw-123', now: () => now });
    return { call: (a, p, t) => mk().call(a, p, t), setNow: t => now = t };
  });
}
// 1-b) 담당자 기본 규칙 그대로 (100원 단위 · 입찰 수 공개 · 일반 깜깜이 수정 · 경쟁 최고가여도 더 올리기)
{
  let now = Date.UTC(2026, 10, 3); const M = C.createMarket(C.LocalStore('d', memStorage()), { adminPassword: 'pw', now: () => now });
  const A = M.call('adminLogin', { password: 'pw' }).token;
  const comp = M.call('admin.saveItem', { item: { name: '모니터', min_price: 50000 } }, A).id;
  const seal = M.call('admin.saveItem', { item: { name: '머그컵', min_price: 3000 } }, A).id;
  const cs = M.call('admin.createCodes', { count: 2 }, A).codes.map(x => M.call('login', { code: x.code }).token);
  let r = M.call('bid', { itemId: comp, amount: 50070 }, cs[0]); ok(r.ok && r.amount === 50000, '기본: 50,070 → 50,000 (십원 단위 절사)');
  r = M.call('bid', { itemId: comp, amount: 50199 }, cs[0]); ok(r.ok && r.amount === 50100 && r.item.mine.leading, '기본: 내가 최고가여도 100원 더 올리기');
  r = M.call('bid', { itemId: comp, amount: 50150 }, cs[1]); ok(!r.ok && r.need === 50200, '기본: 남은 최고가+100 이상');
  r = M.call('bid', { itemId: seal, amount: 4250 }, cs[0]); ok(r.ok && r.amount === 4200, '기본: 일반 4,250 → 4,200');
  M.call('bid', { itemId: seal, amount: 3500 }, cs[1]);
  r = M.call('bid', { itemId: seal, amount: 3900 }, cs[0]); ok(r.ok, '기본: 일반 금액 낮춰 수정');
  const v = M.call('items', {}, cs[1]).items.find(x => x.id === seal);
  ok(v.count === 2 && v.top === undefined && v.mine.leading === undefined, '기본: 일반 — 입찰 수 2만 보이고 최고가·순위는 비공개');
  const w = M.call('items', {}, cs[1]).items.find(x => x.id === comp); ok(w.count === 1 && w.top === 50100, '기본: 경쟁 — 최고가·입찰 수 공개');
}
// 2) Apps Script (Code.gs 그대로)
{
  const g = loadGas(path.join(__dirname, '../../market/apps-script/Code.gs'));
  const pw = g.ctx.setup();
  ok(g.ctx._logs.some(l => l.includes(pw)), 'GAS: setup 이 관리자 비밀번호 출력');
  ok(['설정', '상품', '참가코드', '입찰', '기록'].every(n => g.sheets.has(n)) && !g.sheets.has('시트1'), 'GAS: 시트 5개 생성, 빈 시트1 삭제');
  g.props.set('ADMIN_PASSWORD', 'pw-123');
  let now = 0; const RealDate = g.ctx.Date;
  g.ctx.Date = class extends RealDate { static now() { return now || RealDate.now(); } };
  const M = scenario('GAS', () => ({ call: (a, p, t) => g.post(a, p, t), setNow: t => now = t }));
  const items = g.sheets.get('상품')._d;
  ok(items.some(r => r[2] === '=수식 공격'), 'GAS: = 로 시작하는 이름이 수식이 아닌 글자로 저장');
  // 시트를 손으로 고치면 캐시 만료 후 반영
  const row = items.findIndex(r => r[2] === '텀블러'); items[row][2] = '텀블러(수정)';
  ok(g.post('items', {}).items.some(x => x.name === '텀블러'), 'GAS: 캐시 유효하면 이전 값');
  g.cache.clear();
  ok(g.post('items', {}).items.some(x => x.name === '텀블러(수정)'), 'GAS: 캐시 만료 → 시트 값 반영');
  // 읽기 요청은 시트를 매번 읽지 않는다
  const before = g.calls.getValues; for (let i = 0; i < 20; i++) g.post('items', {}); ok(g.calls.getValues === before, 'GAS: 읽기 20번에 시트 읽기 0번 (캐시)');
  // 사진
  const A = g.post('adminLogin', { password: 'pw-123' }).token;
  const up = g.post('admin.uploadPhoto', { dataUrl: 'data:image/jpeg;base64,' + Buffer.from('abc').toString('base64'), name: '청소기' }, A);
  ok(up.ok && /drive\.google\.com\/thumbnail\?id=F1/.test(up.url) && g.drive[0].sharing === 'link', 'GAS: 사진 → 드라이브, 링크 공개, 썸네일 주소');
  ok(!g.post('admin.uploadPhoto', { dataUrl: 'data:text/html;base64,AAAA' }, A).ok, 'GAS: 이미지 아닌 파일 거절');
  // 대량: 상품 150개·코드 400개·입찰 3000건 → 캐시 조각 나눔
  for (let i = 0; i < 150; i++) g.post('admin.saveItem', { item: { name: '대량 상품 ' + i + ' 설명이 조금 긴 이름', descr: '가'.repeat(300), min_price: 3000 + i * 1000 } }, A);
  const cs = g.post('admin.createCodes', { count: 400 }, A).codes; ok(cs.length === 400, 'GAS: 코드 400개 한 번에');
  g.post('admin.saveSettings', { settings: { ended: false, close_at: 0, extend_min: 0 } }, A);
  const toks = cs.slice(0, 60).map(x => g.post('login', { code: x.code }).token);
  const st = g.post('admin.state', {}, A); const ids = st.items.filter(x => !x.hidden && x.id !== 1).map(x => x.id); // 1번은 연장 마감됨
  let okc = 0, t0 = Date.now();
  for (let k = 0; k < 3000; k++) { const it = ids[k % ids.length]; const r = g.post('bid', { itemId: it, amount: 200000 + k * 1000 }, toks[k % toks.length]); if (r.ok) okc++; }
  ok(okc === 3000, 'GAS: 입찰 3000건 모두 처리 (' + okc + ', ' + (Date.now() - t0) + 'ms)');
  ok(Number(g.cache.get('mk_snap_v1')) > 1, 'GAS: 스냅샷이 여러 조각으로 캐시 (' + g.cache.get('mk_snap_v1') + '조각)');
  const fresh = g.post('items', {}, toks[0]); ok(fresh.ok && fresh.items.length > 150, 'GAS: 큰 스냅샷 읽기');
  ok(g.sheets.get('입찰')._d.length - 1 === g.post('admin.dump', {}, A).bids.length, 'GAS: 시트 입찰 줄 수 = 백업 입찰 수');
  ok(g.ctx._errors.length === 0, 'GAS: 서버 오류 없음 ' + g.ctx._errors.slice(0, 2).join(' | '));
}
console.log(pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);
