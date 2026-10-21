/* KIRD 나눔마켓 v2 — 직원 입찰 화면 공용 동작 (시안별 모양은 assets/theme.js 의 THEME 이 그림)
 *  - 화면: 상품(목록) · 현황판 두 가지, 휴대폰은 아래 탭 막대
 *  - 규칙·서버 연결은 v1 과 같음 (core.js · client.js)
 */
(function () {
  'use strict';
  const { api, $, $$, esc, won, num, now, fmtDate, left, clockLeft, ic, toast, ls, DEMO } = MK;
  const T = window.THEME || {};
  const S = { info: null, items: [], tok: ls.get('mk_tok') || '', code: ls.get('mk_code') || '', view: 'list', filter: 'all', q: '', sort: 'no', open: 0, photo: 0, stage: 'form', afterLogin: 0, loaded: false, busy: false, trend: null };
  const POLL = DEMO ? 4000 : (MK.cfg.poll || 12000);
  const rulesText = MK.rulesText;
  const ctx = { S, MK, ic, esc, won, num, now, fmtDate, left, clockLeft, rulesText, mineLine, statusOf, trendOf, myAmount };

  $$('[data-ic]').forEach(el => { el.innerHTML = ic(el.dataset.ic, Number(el.dataset.s) || 18, Number(el.dataset.w) || undefined); });
  $$('[data-close]').forEach(b => { b.innerHTML = ic('x', 18, 2.2); b.addEventListener('click', () => b.closest('dialog').close()); });
  $$('dialog.dlg').forEach(d => d.addEventListener('click', e => { if (e.target === d) d.close(); }));

  /* ── 데모 띠 ── */
  if (DEMO) {
    const bar = $('#demoBar'); bar.hidden = false;
    bar.innerHTML = '<div class="in"><b>데모 모드</b><span class="msg">입찰은 이 브라우저에만 저장돼요.</span><span>체험 코드</span>' +
      ['TEST-AAAA', 'TEST-BBBB', 'TEST-CCCC'].map(c => '<code data-demo="' + c + '" title="눌러서 입력">' + c + '</code>').join('') +
      '<span class="hide-s">·</span><a href="admin.html">관리자 화면</a><span class="hide-s">(비밀번호 <code style="cursor:text">demo</code>)</span><span class="hide-s">·</span><a href="#" id="demoReset">데모 초기화</a></div>';
    bar.addEventListener('click', e => {
      const c = e.target.closest('[data-demo]'); if (c) { e.preventDefault(); if (S.tok) logout(true); openLogin(); fillCells(c.dataset.demo); }
      if (e.target.id === 'demoReset') { e.preventDefault(); if (confirm('데모 데이터를 처음 상태로 되돌릴까요?')) { MK.resetDemo(); location.hash = ''; location.reload(); } }
    });
  }

  /* ── 상태 도우미 ── */
  function statusOf(v) {
    const m = v.mine; if (!m) return '';
    if (m.result === 'win') return 'win'; if (m.result === 'lose') return 'lose';
    if (v.mode === 'comp') return m.leading === true ? 'lead' : m.leading === false ? 'out' : 'seal';
    return 'seal';
  }
  function myAmount(v) { return v.mine ? v.mine.amount : 0; }
  function mineLine(v) {
    const m = v.mine; if (!m) return '';
    const st = statusOf(v);
    const txt = { win: '낙찰됐어요', lose: '낙찰되지 않았어요', lead: '내가 최고가', out: v.closed ? '내 입찰' : '더 높은 입찰 있음', seal: '내 입찰' }[st];
    const i = { win: 'trophy', lose: 'x', lead: 'check', out: 'alert', seal: 'check' }[st];
    return '<div class="mine ' + st + '">' + ic(i, 15, 2.3) + '<span class="t">' + txt + '</span><span class="num">' + won(m.amount) + '</span></div>';
  }
  function trendOf(id) { return S.trend && S.trend[id] || null; }

  /* ── 머리 ── */
  function renderHero() {
    const i = S.info; if (!i) return;
    document.title = i.title;
    const t = String(i.title || 'KIRD 나눔마켓'), sp = t.lastIndexOf(' ');
    const tt = $('#title'); if (tt) tt.innerHTML = T.title ? T.title(t) : (sp > 0 ? esc(t.slice(0, sp)) + ' <em>' + esc(t.slice(sp + 1)) + '</em>' : '<em>' + esc(t) + '</em>');
    const nt = $('#notice'); if (nt) nt.textContent = i.notice || '';
    const st = $('#steps'); if (st) st.innerHTML = MK.stepsOf(i).map((x, k) => T.step ? T.step(x, k) : '<div class="step"><b>' + (k + 1) + '</b>' + esc(x) + '</div>').join('');
    const r = rulesText(i), ru = $('#rules');
    if (ru) ru.innerHTML = T.rules ? T.rules(i, r, ctx) :
      '<div class="rule p"><div class="i">' + ic('shield', 22, 2) + '</div><div><h3>공통 규칙</h3><p>' + esc(r.p) + '</p></div></div>' +
      '<div class="rule c"><div class="i">' + ic('trend', 22, 2) + '</div><div><h3>경쟁입찰 <small>최소가 ' + won(i.competitive_min) + ' 이상</small></h3><p>' + esc(r.c) + '</p></div></div>' +
      '<div class="rule s"><div class="i">' + ic('lock', 22, 2) + '</div><div><h3>일반입찰 <small>최소가 ' + won(i.competitive_min) + ' 미만</small></h3><p>' + esc(r.s) + '</p></div></div>';
    const eb = $('#eyebrow'); if (eb) eb.innerHTML = i.close_at ? ic('clock', 15, 2.2) + ' 마감 ' + esc(fmtDate(i.close_at)) : '직원 온라인 나눔 경매';
    const cn = $('#closedNote');
    if (cn) {
      if (i.phase === 'closed') cn.innerHTML = '<div class="notice-closed">' + ic('trophy', 20) + '<span>입찰이 모두 마감됐어요. ' + (i.results_public ? '「현황판」에서 낙찰 결과를 확인하세요.' : '낙찰 결과는 담당자가 따로 안내해 드려요.') + '</span></div>';
      else if (i.phase === 'ready') cn.innerHTML = '<div class="notice-closed ready">' + ic('clock', 20) + '<span>' + esc(fmtDate(i.open_at)) + '에 입찰이 시작돼요. 상품은 미리 둘러볼 수 있어요.</span></div>';
      else cn.innerHTML = '';
    }
    if (T.afterHero) T.afterHero(ctx);
  }
  function phaseText(compact) {
    const i = S.info, t = now();
    if (i.phase === 'ready') return { cls: 'ready', txt: '시작까지 <span class="t">' + clockLeft(i.open_at - t) + '</span>', big: clockLeft(i.open_at - t), lab: '시작까지' };
    if (i.phase === 'paused') return { cls: 'paused', txt: '잠시 멈춤', big: '잠시 멈춤', lab: '담당자가 멈췄어요' };
    if (i.phase === 'closed') return { cls: 'closed', txt: '입찰 마감', big: '마감', lab: '입찰이 끝났어요' };
    if (i.close_at && i.close_at > t) return { cls: 'open', txt: '<span class="lbl">입찰 진행 중 · </span>마감까지 <span class="t">' + clockLeft(i.close_at - t) + '</span>', big: clockLeft(i.close_at - t), lab: '전체 마감까지' };
    if (i.close_at) return { cls: 'open', txt: '연장 입찰 진행 중', big: '연장 중', lab: '마감 직전 연장' };
    return { cls: 'open', txt: '입찰 진행 중', big: '진행 중', lab: '마감 시각 미정' };
  }
  function renderPhase() {
    if (!S.info) return;
    const p = phaseText();
    $$('.phase').forEach(el => { el.className = 'phase ' + p.cls; el.innerHTML = '<span class="dot' + (p.cls === 'open' ? ' live' : '') + '"></span>' + p.txt; });
    $$('[data-clock]').forEach(el => { el.textContent = p.big; });
    $$('[data-clock-lab]').forEach(el => { el.textContent = p.lab; });
  }
  function renderMe() {
    const el = $('#me');
    const n = S.items.filter(x => x.mine).length;
    $$('[data-mine-n]').forEach(e => { e.textContent = S.tok ? n : ''; });
    if (!S.tok) { el.innerHTML = '<button class="btn primary" id="meIn">' + ic('key', 17, 2.1) + '<span>참가 코드 입력</span></button>'; $('#meIn').onclick = () => openLogin(); return; }
    const c = String(S.code || ''), mask = c ? c.slice(0, 4) + '-••' + c.slice(-2) : '참가자';
    el.innerHTML = '<span class="chip-me">' + ic('user', 16, 2) + '<span class="code">' + esc(mask) + '</span><span class="n" title="내가 입찰한 상품">' + n + '</span><button class="btn ghost sm" id="meOut" title="나가기">' + ic('logout', 16) + '<span class="sr">나가기</span></button></span>';
    $('#meOut').onclick = () => logout();
  }

  /* ── 목록 ── */
  function visible() {
    let a = S.items.slice();
    if (S.filter === 'comp') a = a.filter(x => x.mode === 'comp');
    else if (S.filter === 'sealed') a = a.filter(x => x.mode === 'sealed');
    else if (S.filter === 'mine') a = a.filter(x => x.mine);
    const q = S.q.trim().toLowerCase(); if (q) a = a.filter(x => (x.name + ' ' + x.descr + ' ' + x.no).toLowerCase().includes(q));
    const by = { no: (x, y) => x.no - y.no, low: (x, y) => x.min_price - y.min_price, high: (x, y) => y.min_price - x.min_price, hot: (x, y) => (y.count || 0) - (x.count || 0) || (y.top || 0) - (x.top || 0) }[S.sort];
    return a.sort(by);
  }
  function emptyHTML() {
    return '<div class="empty">' + ic(S.filter === 'mine' ? 'gavel' : 'box', 48, 1.5) + '<div class="em">' + (S.filter === 'mine' ? (S.tok ? '아직 입찰한 상품이 없어요.' : '참가 코드를 넣으면 내 입찰을 볼 수 있어요.') : S.q ? '「' + esc(S.q) + '」에 맞는 상품이 없어요.' : '아직 올라온 상품이 없어요.') + '</div></div>';
  }
  function renderGrid() {
    const g = $('#grid'), a = visible();
    const counts = { all: S.items.length, comp: S.items.filter(x => x.mode === 'comp').length, sealed: S.items.filter(x => x.mode === 'sealed').length, mine: S.items.filter(x => x.mine).length };
    $$('[data-c]').forEach(el => el.textContent = counts[el.dataset.c] || (el.dataset.c === 'mine' && !S.tok ? '' : '0'));
    if (!a.length) { g.innerHTML = emptyHTML(); return; }
    g.innerHTML = T.list ? T.list(a, ctx) : a.map(v => T.card(v, ctx)).join('');
    if (T.afterGrid) T.afterGrid(ctx, a);
  }
  function flashChanged(prev) {
    S.items.forEach(v => { if (v.mode === 'comp' && prev[v.id] !== undefined && v.top && prev[v.id] !== v.top) { $$('[data-top="' + v.id + '"]').forEach(el => { el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); }); } });
  }

  /* ── 현황판 ── */
  function boardData() {
    const mine = S.items.filter(x => x.mine);
    return { mine, lead: mine.filter(x => statusOf(x) === 'lead' || statusOf(x) === 'win').length, out: mine.filter(x => statusOf(x) === 'out').length, wait: mine.filter(x => statusOf(x) === 'seal').length };
  }
  function renderBoard() {
    const el = $('#board'); if (!el || S.view !== 'board') return;
    el.innerHTML = T.board ? T.board(boardData(), ctx) : defaultBoard(boardData());
    if (T.afterBoard) T.afterBoard(ctx);
  }
  function defaultBoard(d) {
    const p = phaseText();
    const stats = '<div class="bstats"><div><span>내 입찰</span><b>' + d.mine.length + '</b></div><div class="hl"><span>내가 최고가</span><b>' + d.lead + '</b></div><div><span>더 높은 입찰 있음</span><b>' + d.out + '</b></div><div><span>' + esc(p.lab) + '</span><b class="num">' + esc(p.big) + '</b></div></div>';
    const mine = !S.tok ? '<div class="empty sm">' + ic('key', 36, 1.6) + '<div class="em">참가 코드를 넣으면 내 입찰을 한눈에 볼 수 있어요.</div><button class="btn primary" data-login>' + ic('key', 16, 2.1) + '참가 코드 입력</button></div>'
      : d.mine.length ? '<div class="mylist">' + d.mine.map(v => {
        const st = statusOf(v);
        const lab = { win: '낙찰됐어요', lose: '낙찰되지 않았어요', lead: '내가 최고가', out: '더 높은 입찰 있음', seal: v.mode === 'comp' ? '입찰함' : '입찰함 · 결과는 마감 후' }[st];
        const sub = '내 ' + won(v.mine.amount) + (v.mode === 'comp' && v.top ? ' · 최고 ' + won(v.top) : '');
        const act = v.closed ? '결과 보기' : st === 'out' ? '다시 입찰' : st === 'lead' ? '더 올리기' : '금액 바꾸기';
        return '<button class="myrow ' + st + '" data-open="' + v.id + '"><span class="th">' + thumb(v) + '</span><span class="tx"><em>' + lab + '</em><b>' + esc(v.name) + '</b><small class="num">' + sub + '</small></span><span class="act">' + act + '</span></button>';
      }).join('') + '</div>' : '<div class="empty sm">' + ic('gavel', 36, 1.6) + '<div class="em">아직 입찰한 상품이 없어요.</div></div>';
    const rows = S.items.slice().sort((a, b) => a.no - b.no).map(v => {
      const st = statusOf(v);
      const price = v.mode === 'comp' ? (v.top ? '<b class="num">' + won(v.top) + '</b>' : '<span class="mu">시작가 ' + won(v.min_price) + '</span>') : '<span class="sl">' + ic('lock', 13, 2.2) + ' 비공개</span> <span class="mu">(최소 ' + won(v.min_price) + ')</span>';
      const cnt = v.count !== undefined ? v.count + '명' : '<span class="mu">비공개</span>';
      const me = st ? '<span class="pill ' + st + '">' + { win: '낙찰', lose: '미낙찰', lead: '내가 최고가', out: '밀렸어요', seal: '입찰함' }[st] + '</span>' : '<span class="mu">–</span>';
      return '<tr data-open="' + v.id + '"><td class="mu num">No.' + v.no + '</td><td><span class="nm">' + thumb(v) + esc(v.name) + '</span></td><td>' + (v.mode === 'comp' ? '<span class="badge comp">경쟁</span>' : '<span class="badge seal">일반</span>') + '</td><td class="r">' + price + '</td><td class="r num">' + cnt + '</td><td>' + me + '</td></tr>';
    }).join('');
    const res = S.info.phase === 'closed' && S.info.results_public ? resultCards(d) : '<div class="resinfo">' + ic('trophy', 18, 2) + '<span>마감 후 ' + (S.info.results_public ? '이곳에 낙찰 결과가 표시돼요.' : '낙찰 결과는 담당자가 안내해 드려요.') + '</span></div>';
    return '<div class="bhead"><h1>현황판</h1><p>내 입찰과 전체 상품 상태를 한눈에. ' + Math.round(POLL / 1000) + '초마다 새로 고쳐져요.</p></div>' + stats +
      '<section class="bsec"><h2>내 입찰</h2>' + mine + '</section>' +
      '<section class="bsec"><h2>전체 상품 현황</h2><div class="tblw"><table class="tbl btbl"><thead><tr><th>번호</th><th>상품</th><th>방식</th><th class="r">현재 최고가</th><th class="r">입찰</th><th>내 상태</th></tr></thead><tbody>' + rows + '</tbody></table></div></section>' +
      '<section class="bsec"><h2>마감 후 결과</h2>' + res + '</section>';
  }
  function resultCards(d) {
    const w = d.mine.filter(v => statusOf(v) === 'win'), l = d.mine.filter(v => statusOf(v) === 'lose');
    if (!w.length && !l.length) return '<div class="resinfo">' + ic('info', 18, 2) + '<span>입찰한 상품이 없어요.</span></div>';
    return '<div class="rescards">' + w.map(v => '<div class="rc win">' + ic('trophy', 24, 2) + '<div><b>축하해요, 낙찰됐어요!</b><span>' + esc(v.name) + ' · ' + won(v.mine.amount) + ' · 받는 방법은 담당자가 안내해 드려요.</span></div></div>').join('') +
      l.map(v => '<div class="rc lose">' + ic('heart', 24, 2) + '<div><b>아쉽게도 낙찰되지 않았어요</b><span>' + esc(v.name) + ' · 내 입찰 ' + won(v.mine.amount) + ' · 참여해 주셔서 고마워요.</span></div></div>').join('') + '</div>';
  }
  function thumb(v) { return v.photos[0] ? '<img src="' + esc(v.photos[0]) + '" alt="" loading="lazy" referrerpolicy="no-referrer">' : ic('image', 18, 1.6); }
  ctx.openItem = id => openItem(id); ctx.thumb = thumb; ctx.defaultBoard = defaultBoard; ctx.resultCards = resultCards; ctx.phaseText = phaseText; ctx.POLL = POLL;

  /* ── 화면 전환 (상품 ↔ 현황판) ── */
  function setView(v, keepScroll) {
    S.view = v;
    document.body.dataset.screen = v;
    $$('[data-view]').forEach(b => b.setAttribute('aria-current', b.dataset.view === v ? 'page' : 'false'));
    $$('[data-mnav]').forEach(b => b.setAttribute('aria-current', b.dataset.mnav === (v === 'board' ? 'board' : S.filter === 'mine' ? 'mine' : 'home') ? 'page' : 'false'));
    $('#listView').hidden = v !== 'list'; $('#boardView').hidden = v !== 'board';
    if (v === 'board') renderBoard();
    if (!keepScroll) window.scrollTo(0, 0);
  }
  function setFilter(f) {
    S.filter = f; $$('#tabs .tab').forEach(x => x.setAttribute('aria-selected', x.dataset.f === f)); renderGrid();
  }
  document.addEventListener('click', e => {
    const vb = e.target.closest('a[data-view],button[data-view]'); if (vb) { e.preventDefault(); setView(vb.dataset.view); return; }
    const mb = e.target.closest('[data-mnav]');
    if (mb) {
      e.preventDefault(); const k = mb.dataset.mnav;
      if (k === 'home') { setFilter('all'); setView('list'); }
      else if (k === 'mine') { setFilter('mine'); setView('list'); const bar = $('.bar'); if (bar) window.scrollTo({ top: Math.max(0, bar.getBoundingClientRect().top + window.scrollY - 60) }); }
      else if (k === 'board') setView('board');
      else if (k === 'code') { if (S.tok) { toast('이미 들어와 있어요. 다른 코드로 바꾸려면 위쪽 나가기를 눌러 주세요.'); } else openLogin(); }
      setView(S.view, true);
      return;
    }
    const ob = e.target.closest('[data-open]'); if (ob && !e.target.closest('dialog')) { openItem(Number(ob.dataset.open)); return; }
    const lb = e.target.closest('[data-login]'); if (lb && !e.target.closest('dialog')) { openLogin(); }
  });

  /* ── 상세 · 입찰 ── */
  const dlg = $('#detail');
  const cur = () => S.items.find(x => x.id === S.open);
  function openItem(id, keepStage) {
    S.open = id; if (!keepStage) { S.stage = 'form'; S.photo = 0; S.draft = ''; }
    renderDetail();
    if (!dlg.open) { dlg.showModal(); dlg.scrollTop = 0; const sc = dlg.querySelector('.info'); if (sc) sc.scrollTop = 0; }
    if (location.hash !== '#item-' + id) history.replaceState(null, '', '#item-' + id);
  }
  dlg.addEventListener('close', () => { S.open = 0; if (/^#item-/.test(location.hash)) history.replaceState(null, '', location.pathname + location.search); });
  function howText(v) {
    const r = rulesText(S.info);
    return v.mode === 'comp' ? '<div class="how c">' + ic('trend', 18, 2.2) + '<div><b>경쟁입찰</b> · ' + esc(r.c) + '</div></div>' : '<div class="how s">' + ic('lock', 18, 2.2) + '<div><b>일반입찰</b> · ' + esc(r.s) + '</div></div>';
  }
  function renderDetail() {
    const v = cur(); if (!v) { dlg.close(); return; }
    const i = S.info, ph = v.photos.length ? v.photos : [];
    const main = ph.length ? '<img src="' + esc(ph[S.photo] || ph[0]) + '" alt="' + esc(v.name) + ' 사진 ' + (S.photo + 1) + '" referrerpolicy="no-referrer">' : '<div class="noimg">' + ic('image', 64, 1.3) + '</div>';
    const thumbs = ph.length > 1 ? '<div class="thumbs">' + ph.map((u, k) => '<button data-ph="' + k + '" aria-current="' + (k === S.photo) + '" aria-label="사진 ' + (k + 1) + '"><img src="' + esc(u) + '" alt="" referrerpolicy="no-referrer"></button>').join('') + '</div>' : '';
    const navs = ph.length > 1 ? '<button class="nav l" data-step="-1" aria-label="이전 사진">' + ic('chevl', 20, 2.4) + '</button><button class="nav r" data-step="1" aria-label="다음 사진">' + ic('chev', 20, 2.4) + '</button><span class="cnt num">' + (S.photo + 1) + ' / ' + ph.length + '</span>' : '';
    const badge = v.mode === 'comp' ? '<span class="badge comp">' + ic('trend', 14, 2.4) + '경쟁입찰</span>' : '<span class="badge seal">' + ic('lock', 14, 2.4) + '일반입찰</span>';
    const closeTxt = v.closed ? '<span class="badge mute">마감</span>' : v.close_at ? '<span class="cl">' + ic('clock', 14, 2.2) + ' 마감 ' + esc(fmtDate(v.close_at)) + ' · ' + left(v.close_at - now()) + ' 남음</span>' : '';
    const stat = v.mode === 'comp'
      ? '<div class="stat"><div><div class="k">' + (v.top ? '현재 최고가' : '아직 입찰 없음 · 시작가') + '</div><div class="v comp" data-top="' + v.id + '">' + won(v.top || v.min_price) + '</div>' + (v.count !== undefined ? '<div class="s">' + v.count + '명 입찰</div>' : '') + '</div><div><div class="k">최소 입찰가</div><div class="v">' + won(v.min_price) + '</div><div class="s">' + won(i.unit) + ' 단위</div></div></div>'
      : '<div class="stat"><div><div class="k">최소 입찰가</div><div class="v">' + won(v.min_price) + '</div><div class="s">' + won(i.unit) + ' 단위</div></div><div><div class="k">' + ic('eyeoff', 14, 2.2) + '다른 사람 금액</div><div class="v seal">비공개</div>' + (v.count !== undefined ? '<div class="s">' + v.count + '명 입찰</div>' : '<div class="s">최고가·인원 모두 비공개</div>') + '</div></div>';
    const parts = {
      v, gallery: '<div class="gal"><div class="main">' + main + '</div>' + navs + thumbs + '</div>',
      meta: '<div class="meta">' + badge + '<span>No.' + v.no + '</span>' + closeTxt + '</div>',
      name: '<h2 id="dName">' + esc(v.name) + '</h2>', desc: v.descr ? '<p class="desc">' + esc(v.descr) + '</p>' : '',
      stat, how: howText(v), extra: T.detailExtra ? T.detailExtra(v, ctx) : '', bid: '<div class="bidbox" id="bidbox">' + bidBox(v) + '</div>'
    };
    const body = T.detail ? T.detail(parts, ctx) : '<div class="dt">' + parts.gallery + '<div class="info">' + parts.meta + parts.name + parts.desc + parts.stat + parts.extra + parts.how + parts.bid + '</div></div>';
    const showCta = !v.closed && i.phase === 'open' && S.stage === 'form' && !!S.tok;
    const cta = '<div class="dcta" ' + (showCta ? '' : 'hidden') + '><div><small>' + (v.mine ? '다시 입찰' : '입찰 금액') + '</small><b class="num">' + num(v.next_min) + '원~</b></div><button class="btn lg ' + (v.mode === 'comp' ? 'comp' : 'seal') + '" data-tobid>입찰하기</button></div>';
    dlg.innerHTML = '<button class="dlg-x" data-x aria-label="닫기">' + ic('x', 18, 2.2) + '</button>' + body + cta;
    dlg.dataset.mode = v.mode;
    dlg.querySelector('[data-x]').onclick = () => dlg.close();
    $$('[data-ph]', dlg).forEach(b => b.onclick = () => { S.photo = Number(b.dataset.ph); renderDetail(); });
    $$('[data-step]', dlg).forEach(b => b.onclick = () => { S.photo = (S.photo + Number(b.dataset.step) + ph.length) % ph.length; renderDetail(); });
    const tb = $('[data-tobid]', dlg); if (tb) tb.onclick = () => { const a = $('#amt'); if (a) { a.scrollIntoView({ block: 'center', behavior: 'smooth' }); setTimeout(() => a.focus(), 250); } };
    wireBid(v);
    watchCta();
    if (T.afterDetail) T.afterDetail(v, ctx);
  }
  // 휴대폰: 입찰 칸이 화면에 보이면 아래 「입찰하기」 막대를 숨김 (겹침 방지)
  let ctaObs = null;
  function watchCta() {
    if (ctaObs) { ctaObs.disconnect(); ctaObs = null; }
    const bar = $('.dcta', dlg), box = $('#bidbox', dlg); if (!bar || bar.hidden || !box || !('IntersectionObserver' in window)) return;
    ctaObs = new IntersectionObserver(es => { es.forEach(e => bar.classList.toggle('away', e.isIntersecting)); }, { root: null, threshold: 0.15 });
    ctaObs.observe(box);
  }
  function bidBox(v) {
    const i = S.info, m = v.mine;
    if (v.closed || i.phase === 'closed') {
      if (m && m.result === 'win') return '<div class="done"><div class="ck">' + ic('trophy', 30, 2.2) + '</div><h4>축하해요, 낙찰됐어요!</h4><p>' + won(m.amount) + ' · 받는 방법은 담당자가 안내해 드려요.</p></div>';
      if (m && m.result === 'lose') return '<div class="lockbox">' + ic('info', 26, 1.8) + '<p>아쉽게도 낙찰되지 않았어요. (내 입찰 ' + won(m.amount) + ')</p></div>';
      return '<div class="lockbox">' + ic('clock', 26, 1.8) + '<p>이 상품은 입찰이 마감됐어요.' + (m ? ' 내 입찰 ' + won(m.amount) + '.' : '') + '<br>' + (i.results_public ? '' : '낙찰 결과는 담당자가 안내해 드려요.') + '</p></div>';
    }
    if (i.phase === 'ready') return '<div class="lockbox">' + ic('clock', 26, 1.8) + '<p>' + esc(fmtDate(i.open_at)) + '에 입찰이 시작돼요.</p></div>';
    if (i.phase === 'paused') return '<div class="lockbox">' + ic('pause', 26, 1.8) + '<p>담당자가 입찰을 잠시 멈췄어요. 잠시 후 다시 확인해 주세요.</p></div>';
    if (!S.tok) return '<div class="lockbox">' + ic('key', 26, 1.8) + '<p>입찰하려면 담당자에게 받은 <b>참가 코드</b>를 넣어 주세요.</p><button class="btn primary lg" data-login>' + ic('key', 18, 2.1) + '참가 코드 입력</button></div>';
    const once = m && ((v.mode === 'comp' && i.comp_rebid === 'none') || (v.mode === 'sealed' && i.sealed_rebid === 'none'));
    const hist = '<div id="myhist"></div>';
    if (S.stage === 'done') {
      const lead = v.mode === 'comp' ? (m && m.leading ? '지금 <b>최고가</b>예요. 더 높은 입찰이 들어오면 카드에 표시돼요.' : '') : '마감 전까지 다른 사람에게 금액은 보이지 않아요.';
      return '<div class="done"><div class="ck">' + ic('check', 32, 2.6) + '</div><h4>' + won(m ? m.amount : 0) + '으로 입찰했어요</h4><p>' + lead + (S.floored ? '<br><small>' + won(i.unit) + ' 미만은 버려서 접수됐어요.</small>' : '') + '</p></div>' +
        (once ? '' : '<button class="btn block" data-again>' + ic('edit', 16) + '금액 바꿔 다시 입찰</button>') + hist;
    }
    if (once) return '<div class="mine ' + statusOf(v) + '" style="margin:0">' + ic('check', 16, 2.4) + '<span class="t">내 입찰</span><span class="num">' + won(m.amount) + '</span></div><p class="hint">이 상품은 한 번만 입찰할 수 있어요.</p>' + hist;
    if (S.stage === 'confirm') {
      const amt = S.pending;
      const notes = v.mode === 'comp'
        ? (i.comp_rebid === 'raise' ? '경쟁입찰은 취소할 수 없어요. 누가 더 높게 내면 다시 입찰할 수 있어요.' : '경쟁입찰은 취소할 수 없고, 한 번만 입찰할 수 있어요.')
        : ({ replace: '마감 전까지 금액을 다시 바꿀 수 있어요.', raise: '다시 입찰할 땐 이 금액보다 높게만 낼 수 있어요.', none: '한 번만 입찰할 수 있어 바꿀 수 없어요.' }[i.sealed_rebid]);
      const diff = v.mode === 'comp' && v.top ? '<div class="hint">현재 최고가 ' + won(v.top) + '보다 ' + won(amt - v.top) + ' 높아요.</div>' : '';
      return '<div class="confirm" role="alertdialog" aria-label="입찰 확인">' + (T.confirmMark ? T.confirmMark(amt, v, ctx) : '') + '<div class="big"><b>' + won(amt) + '</b>으로 입찰할까요?</div>' + diff + (m ? '<div class="hint">이전 입찰 ' + won(m.amount) + ' → 새 금액으로 바뀌어요.</div>' : '') + '<div class="hint">' + esc(notes) + '</div><div class="row"><button class="btn lg" data-back>돌아가기</button><button class="btn lg ' + (v.mode === 'comp' ? 'comp' : 'seal') + '" data-go>' + ic('gavel', 18, 2) + '입찰 확정</button></div></div>';
    }
    const need = v.next_min, unit = i.unit;
    const st = statusOf(v);
    const myLine = m ? '<div class="mine ' + st + '" style="margin:0">' + ic(st === 'out' ? 'alert' : 'check', 16, 2.4) + '<span class="t">' + (v.mode === 'comp' ? (st === 'lead' ? '내가 최고가예요' : '더 높은 입찰이 있어요') : '내 입찰') + '</span><span class="num">' + won(m.amount) + '</span></div>' : '';
    const label = m ? (v.mode === 'comp' ? '더 높게 다시 입찰' : (i.sealed_rebid === 'raise' ? '더 높게 다시 입찰' : '금액 바꿔 다시 입찰')) : '입찰 금액';
    const steps = [unit, 1000, 5000, 10000].filter((x, k, a) => x >= unit && a.indexOf(x) === k);
    const qk = '<div class="qk" role="group" aria-label="금액 더하기">' + steps.map(x => '<button type="button" data-add="' + x + '">+' + num(x) + '</button>').join('') + '</div>';
    return myLine + (T.bidPicker ? T.bidPicker(v, ctx) : '') + '<label class="lbl" for="amt">' + label + '</label><div class="amt"><input class="inp" id="amt" inputmode="numeric" enterkeyhint="done" autocomplete="off" placeholder="직접 입력 (' + num(need) + ' 이상)" value="' + esc(S.draft || '') + '"><span>원</span></div>' + qk +
      '<div class="hint" id="amtHint">' + (v.mode === 'comp' ? won(need) + ' 이상 · ' : '최소가 ' + won(need) + ' 이상 · ') + won(unit) + ' 단위로 접수돼요.</div>' +
      '<button class="btn lg block ' + (v.mode === 'comp' ? 'comp' : 'seal') + '" id="bidBtn" disabled>' + ic('gavel', 18, 2) + '<span>금액을 입력해 주세요</span></button>' +
      '<p class="fine">' + ic('shield', 14, 2) + '누가 얼마를 냈는지는 다른 직원에게 보이지 않아요.</p>' +
      (m && v.mode === 'sealed' && i.allow_cancel ? '<button class="btn ghost danger sm" data-cancel style="align-self:center">입찰 취소하기</button>' : '') + hist;
  }
  function parseAmt(s) { const n = Number(String(s || '').replace(/[^\d]/g, '')); return isFinite(n) ? n : 0; }
  function wireBid(v) {
    const box = $('#bidbox'), i = S.info; if (!box) return;
    const lg = $('[data-login]', box); if (lg) lg.onclick = () => { S.afterLogin = v.id; dlg.close(); openLogin(); };
    const again = $('[data-again]', box); if (again) again.onclick = () => { S.stage = 'form'; S.draft = ''; renderDetail(); setTimeout(() => $('#amt') && $('#amt').focus(), 30); };
    const back = $('[data-back]', box); if (back) back.onclick = () => { S.stage = 'form'; renderDetail(); };
    const go = $('[data-go]', box); if (go) go.onclick = () => submitBid(v, S.pending, go);
    const cancel = $('[data-cancel]', box); if (cancel) cancel.onclick = async () => {
      if (!confirm('이 상품 입찰을 취소할까요?')) return;
      const r = await api('cancel', { itemId: v.id }, S.tok);
      if (r.ok) { toast('입찰을 취소했어요.', 'ok'); await refresh(); } else toast(r.error, 'bad');
    };
    loadHist(v);
    const inp = $('#amt', box); if (!inp) return;
    const btn = $('#bidBtn'), hint = $('#amtHint');
    const upd = () => {
      const raw = parseAmt(inp.value), unit = i.unit, fl = Math.floor(raw / unit) * unit;
      S.draft = raw ? num(raw) : '';
      if (inp.value !== S.draft) { inp.value = S.draft; }
      let msg = (v.mode === 'comp' ? won(v.next_min) + ' 이상 · ' : '최소가 ' + won(v.next_min) + ' 이상 · ') + won(unit) + ' 단위로 접수돼요.', cls = '', okv = false;
      if (raw) {
        if (fl < v.next_min) { msg = won(v.next_min) + ' 이상으로 입력해 주세요.' + (raw !== fl ? ' (' + won(unit) + ' 미만은 버려져 ' + won(fl) + ')' : ''); cls = 'bad'; }
        else if (v.mine && v.mode === 'sealed' && fl === v.mine.amount) { msg = '지금 입찰한 금액과 같아요.'; cls = 'warn'; }
        else { okv = true; if (raw !== fl) { msg = won(raw) + ' → <b>' + won(fl) + '</b>으로 접수돼요. (' + won(unit) + ' 미만 버림)'; cls = 'warn'; } else msg = '<b>' + won(fl) + '</b>으로 입찰해요.' + (v.mode === 'comp' && v.top ? ' 최고가보다 ' + won(fl - v.top) + ' 높아요.' : ''); }
      }
      hint.className = 'hint ' + cls; hint.innerHTML = msg;
      btn.disabled = !okv; btn.querySelector('span').textContent = okv ? won(fl) + '으로 입찰하기' : raw ? '금액을 확인해 주세요' : '금액을 입력해 주세요';
      $$('[data-pick]', box).forEach(p => p.setAttribute('aria-pressed', Number(p.dataset.pick) === fl));
      if (T.onAmount) T.onAmount(okv ? fl : 0, v, ctx);
      return okv ? fl : 0;
    };
    inp.addEventListener('input', upd);
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); btn.click(); } });
    $$('[data-add]', box).forEach(b => b.onclick = () => { const base = parseAmt(inp.value) || (v.mode === 'comp' && v.top ? v.top : 0) || v.next_min - Number(b.dataset.add); inp.value = num(Math.max(base + Number(b.dataset.add), 0)); upd(); });
    $$('[data-pick]', box).forEach(b => b.onclick = () => { inp.value = num(Number(b.dataset.pick)); upd(); });
    btn.onclick = () => { const a = upd(); if (!a) return; S.pending = a; S.stage = 'confirm'; renderDetail(); setTimeout(() => { const g = $('[data-go]'); if (g) { g.focus(); g.scrollIntoView({ block: 'center' }); } }, 30); };
    upd();
  }
  async function loadHist(v) {
    const el = $('#myhist'); if (!el || !S.tok || !v.mine) return;
    const r = await api('mybids', {}, S.tok); if (!r.ok || !$('#myhist')) return;
    const h = r.history.filter(x => x.item_id === v.id); if (h.length < 2 && S.stage !== 'done') return;
    $('#myhist').innerHTML = '<details class="myhist"><summary>내 입찰 기록 ' + h.length + '건</summary><ol>' + h.map(x => '<li class="' + (x.active ? '' : 'old') + '"><b class="num">' + won(x.amount) + '</b> · ' + esc(fmtDate(x.at, 'sec')) + (x.active ? ' · 현재' : '') + '</li>').join('') + '</ol></details>';
  }
  async function submitBid(v, amount, btn) {
    if (S.busy) return; S.busy = true;
    btn.disabled = true; btn.innerHTML = '<span class="spin"></span>접수 중…';
    const r = await api('bid', { itemId: v.id, amount: amount }, S.tok);
    S.busy = false;
    if (r.ok) {
      const k = S.items.findIndex(x => x.id === v.id); if (k >= 0) S.items[k] = r.item;
      S.floored = r.floored; S.stage = 'done'; S.draft = '';
      renderDetail(); renderGrid(); renderMe(); renderBoard();
      toast(won(r.amount) + ' 입찰 완료', 'ok');
      refresh();
      return;
    }
    if (r.code === 'auth') { logout(true); toast(r.error, 'bad'); dlg.close(); openLogin(); return; }
    S.stage = 'form';
    await refresh();
    if (S.open) {
      renderDetail();
      const inp = $('#amt'); if (inp && r.need) { inp.value = num(r.need); inp.dispatchEvent(new Event('input')); }
      const h = $('#amtHint'); if (h) { h.className = 'hint bad'; h.innerHTML = esc(r.error) + (r.need ? ' — 금액을 ' + won(r.need) + '으로 맞췄어요.' : ''); }
    }
    toast(r.error, 'bad', 4200);
  }

  /* ── 참가 코드 ── */
  const lgDlg = $('#login'), cells = $$('#cells input');
  function fillCells(s) { const t = String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8); cells.forEach((c, k) => { c.value = t[k] || ''; c.classList.toggle('filled', !!c.value); }); syncLg(); const n = Math.min(t.length, 7); if (lgDlg.open) cells[n].focus(); }
  const codeVal = () => cells.map(c => c.value).join('');
  function syncLg() { $('#lgBtn').disabled = codeVal().length !== 8; }
  cells.forEach((c, k) => {
    c.addEventListener('input', () => {
      const t = c.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (t.length > 1) { fillCells(codeVal().slice(0, k) + t); return; }
      c.value = t; c.classList.toggle('filled', !!t); $('#lgErr').textContent = '';
      if (t && k < 7) cells[k + 1].focus();
      syncLg();
      if (codeVal().length === 8 && k === 7) $('#lgBtn').focus();
    });
    c.addEventListener('keydown', e => {
      if (e.key === 'Backspace' && !c.value && k > 0) { cells[k - 1].value = ''; cells[k - 1].classList.remove('filled'); cells[k - 1].focus(); syncLg(); e.preventDefault(); }
      if (e.key === 'ArrowLeft' && k > 0) cells[k - 1].focus();
      if (e.key === 'ArrowRight' && k < 7) cells[k + 1].focus();
    });
    c.addEventListener('paste', e => { e.preventDefault(); fillCells(codeVal().slice(0, k) + (e.clipboardData || window.clipboardData).getData('text')); });
    c.addEventListener('focus', () => c.select());
  });
  function openLogin() { $('#lgErr').textContent = ''; if (!lgDlg.open) lgDlg.showModal(); setTimeout(() => { const e = cells.findIndex(c => !c.value); cells[e < 0 ? 7 : e].focus(); }, 30); }
  $('#lgForm').addEventListener('submit', async e => {
    e.preventDefault(); const b = $('#lgBtn'); if (b.disabled) return;
    b.disabled = true; b.innerHTML = '<span class="spin"></span>확인 중…';
    const r = await api('login', { code: codeVal() });
    b.innerHTML = '들어가기';
    if (!r.ok) { b.disabled = false; $('#lgErr').textContent = r.error; const cc = $('#cells'); cc.classList.remove('shake'); void cc.offsetWidth; cc.classList.add('shake'); return; }
    S.tok = r.token; S.code = r.code; ls.set('mk_tok', r.token); ls.set('mk_code', r.code);
    lgDlg.close(); fillCells(''); toast('들어왔어요. 마음에 드는 상품에 입찰해 보세요!', 'ok');
    await refresh();
    if (S.afterLogin) { const id = S.afterLogin; S.afterLogin = 0; openItem(id); setTimeout(() => $('#amt') && $('#amt').focus(), 60); }
  });
  function logout(silent) { S.tok = ''; S.code = ''; ls.set('mk_tok', null); ls.set('mk_code', null); S.items.forEach(x => delete x.mine); renderMe(); renderGrid(); renderBoard(); if (!silent) { toast('나갔어요. 다시 입찰하려면 코드를 넣어 주세요.'); refresh(); } }

  /* ── 도구줄 ── */
  $$('#tabs .tab').forEach(t => t.onclick = () => { setFilter(t.dataset.f); setView('list', true); });
  $('#q').addEventListener('input', e => { S.q = e.target.value; renderGrid(); });
  $('#sort').addEventListener('change', e => { S.sort = e.target.value; renderGrid(); });
  $('#grid').addEventListener('click', e => { const c = e.target.closest('.card,[data-card]'); if (c) openItem(Number(c.dataset.id)); });

  /* ── 불러오기 ── */
  async function loadTrend() {
    if (!T.wantsTrend) return;
    const r = await api('trend', {}, S.tok); if (!r || !r.ok) return;
    const m = {}; (r.items || []).forEach(x => { m[x.id] = x; }); S.trend = m;
  }
  async function refresh() {
    const r = await api('items', {}, S.tok);
    if (!r.ok) { if (!S.loaded) $('#grid').innerHTML = '<div class="empty">' + ic('alert', 44, 1.6) + '<div class="em">' + esc(r.error) + '</div><button class="btn" onclick="location.reload()">' + ic('refresh', 16) + '다시 불러오기</button></div>'; return; }
    if (r.info && r.info.now) MK.setServerNow(r.info.now);
    if (S.tok && !r.me) { logout(true); toast('참가 코드를 다시 넣어 주세요.', 'bad'); }
    await loadTrend();
    const prev = {}; S.items.forEach(x => prev[x.id] = x.top);
    S.info = r.info; S.items = r.items; S.loaded = true;
    renderHero(); renderPhase(); renderMe(); renderGrid(); renderBoard(); flashChanged(prev);
    if (S.open) {
      const v = cur();
      if (!v) { dlg.close(); toast('이 상품은 지금 볼 수 없어요.'); }
      else if (S.stage === 'form') { const a = $('#amt'), had = a && document.activeElement === a; const pos = a ? a.selectionStart : 0; const sc = dlg.querySelector('.info'), top = sc ? sc.scrollTop : 0, dtop = dlg.scrollTop; renderDetail(); const sc2 = dlg.querySelector('.info'); if (sc2) sc2.scrollTop = top; dlg.scrollTop = dtop; if (had) { const b = $('#amt'); b.focus({ preventScroll: true }); try { b.setSelectionRange(pos, pos); } catch (e) { } } }
      else if (S.stage === 'done') renderDetail();
      if (v && v.mode === 'comp' && prev[v.id] !== undefined && prev[v.id] !== v.top) flashChanged(prev);
    }
  }
  function startHash() {
    if (location.hash === '#board') { setView('board'); return; }
    const m = /^#item-(\d+)/.exec(location.hash); if (m && S.items.some(x => x.id === Number(m[1]))) openItem(Number(m[1]));
  }
  setInterval(renderPhase, 1000);
  let timer = null;
  const loop = () => { clearTimeout(timer); timer = setTimeout(async () => { if (!document.hidden && !S.busy && S.stage !== 'confirm') await refresh(); loop(); }, POLL); };
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { refresh(); loop(); } });
  window.addEventListener('storage', e => { if (DEMO && e.key === MK.DEMO_KEY) refresh(); });
  window.addEventListener('hashchange', startHash);
  // 인쇄 카드의 QR: ?c=코드 로 열리면 코드를 채워 들어가고, 주소창에서 코드를 지운다
  const qc = new URLSearchParams(location.search).get('c');
  if (qc) history.replaceState(null, '', location.pathname + location.hash);
  const qrLogin = () => {
    const norm = String(qc || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (norm.length !== 8 || (S.tok && String(S.code || '').toUpperCase().replace(/[^A-Z0-9]/g, '') === norm)) return;
    if (S.tok) logout(true);
    fillCells(norm); openLogin(); setTimeout(() => { const b = $('#lgBtn'); if (b && !b.disabled) $('#lgForm').requestSubmit(); }, 60);
  };
  setView('list', true);
  refresh().then(() => { startHash(); loop(); if (qc) qrLogin(); });
  window.__mk = S;
})();
