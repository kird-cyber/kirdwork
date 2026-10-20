/* KIRD 나눔마켓 — 직원 입찰 화면 */
(function () {
  'use strict';
  const { api, $, $$, esc, won, num, now, fmtDate, left, clockLeft, ic, toast, ls, DEMO } = MK;
  const S = { info: null, items: [], tok: ls.get('mk_tok') || '', code: ls.get('mk_code') || '', filter: 'all', q: '', sort: 'no', open: 0, photo: 0, tops: {}, stage: 'form', afterLogin: 0, loaded: false, busy: false };
  const POLL = DEMO ? 4000 : (MK.cfg.poll || 12000);

  $$('[data-ic]').forEach(el => { el.innerHTML = ic(el.dataset.ic, Number(el.dataset.s) || 18); });
  $$('[data-close]').forEach(b => { b.innerHTML = ic('x', 18, 2.2); b.addEventListener('click', () => b.closest('dialog').close()); });
  $$('dialog.dlg').forEach(d => d.addEventListener('click', e => { if (e.target === d) d.close(); }));

  /* ── 데모 띠 ── */
  if (DEMO) {
    const bar = $('#demoBar'); bar.hidden = false;
    bar.innerHTML = '<div class="in"><b>데모 모드</b><span>입찰 내용은 이 브라우저에만 저장돼요.</span><span>체험 코드</span>' +
      ['TEST-AAAA', 'TEST-BBBB', 'TEST-CCCC'].map(c => '<code data-demo="' + c + '" title="눌러서 입력">' + c + '</code>').join('') +
      '<span>·</span><a href="admin.html">관리자 화면</a><span>(비밀번호 <code style="cursor:text">demo</code>)</span><span>·</span><a href="#" id="demoReset">데모 초기화</a></div>';
    bar.addEventListener('click', e => {
      const c = e.target.closest('[data-demo]'); if (c) { e.preventDefault(); if (S.tok) logout(true); openLogin(); fillCells(c.dataset.demo); }
      if (e.target.id === 'demoReset') { e.preventDefault(); if (confirm('데모 데이터를 처음 상태로 되돌릴까요?')) { MK.resetDemo(); location.hash = ''; location.reload(); } }
    });
  }

  /* ── 규칙 안내 ── */
  const rulesText = MK.rulesText;
  function renderHero() {
    const i = S.info; if (!i) return;
    document.title = i.title;
    const t = String(i.title || 'KIRD 나눔마켓'), sp = t.lastIndexOf(' ');
    $('#title').innerHTML = sp > 0 ? esc(t.slice(0, sp)) + ' <em>' + esc(t.slice(sp + 1)) + '</em>' : '<em>' + esc(t) + '</em>';
    $('#notice').textContent = i.notice || '';
    $('#steps').innerHTML = MK.stepsOf(i).map((t, k) => '<div class="step"><b>' + (k + 1) + '</b>' + esc(t) + '</div>').join('');
    const r = rulesText(i);
    $('#rules').innerHTML =
      '<div class="rule p"><div class="i">' + ic('shield', 22, 2) + '</div><div><h3>공통 규칙</h3><p>' + esc(r.p) + '</p></div></div>' +
      '<div class="rule c"><div class="i">' + ic('trend', 22, 2) + '</div><div><h3>경쟁입찰 <small>최소가 ' + won(i.competitive_min) + ' 이상</small></h3><p>' + esc(r.c) + '</p></div></div>' +
      '<div class="rule s"><div class="i">' + ic('lock', 22, 2) + '</div><div><h3>일반입찰 <small>최소가 ' + won(i.competitive_min) + ' 미만</small></h3><p>' + esc(r.s) + '</p></div></div>';
    $('#eyebrow').innerHTML = i.close_at ? ic('clock', 15, 2.2) + ' 마감 ' + esc(fmtDate(i.close_at)) : '직원 온라인 나눔 경매';
    const cn = $('#closedNote');
    if (i.phase === 'closed') cn.innerHTML = '<div class="notice-closed">' + ic('trophy', 20) + '<span>입찰이 모두 마감됐어요. ' + (i.results_public ? '「내 입찰」에서 낙찰 결과를 확인하세요.' : '낙찰 결과는 담당자가 따로 안내해 드려요.') + '</span></div>';
    else if (i.phase === 'ready') cn.innerHTML = '<div class="notice-closed" style="background:var(--kird-dd)">' + ic('clock', 20) + '<span>' + esc(fmtDate(i.open_at)) + '에 입찰이 시작돼요. 상품은 미리 둘러볼 수 있어요.</span></div>';
    else cn.innerHTML = '';
  }
  function renderPhase() {
    const i = S.info, el = $('#phase'); if (!i) return;
    const t = now(); let cls = i.phase, txt;
    if (i.phase === 'ready') txt = '시작까지 <span class="t">' + clockLeft(i.open_at - t) + '</span>';
    else if (i.phase === 'paused') txt = '<span class="lbl">담당자가</span> 잠시 멈춤';
    else if (i.phase === 'closed') txt = '입찰 마감';
    else if (i.close_at && i.close_at > t) txt = '<span class="lbl">입찰 진행 중 · </span>마감까지 <span class="t">' + clockLeft(i.close_at - t) + '</span>';
    else if (i.close_at) txt = '연장 입찰 진행 중';
    else txt = '입찰 진행 중';
    el.className = 'phase ' + cls;
    el.innerHTML = '<span class="dot' + (cls === 'open' ? ' live' : '') + '"></span>' + txt;
  }
  function renderMe() {
    const el = $('#me');
    if (!S.tok) { el.innerHTML = '<button class="btn primary" id="meIn">' + ic('key', 17, 2.1) + '참가 코드 입력</button>'; $('#meIn').onclick = () => openLogin(); return; }
    const n = S.items.filter(x => x.mine).length;
    const mask = S.code ? S.code.slice(0, 4) + '-••' + S.code.slice(-2) : '참가자';
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
  function mineLine(v) {
    const m = v.mine; if (!m) return '';
    if (m.result === 'win') return '<div class="mine win">' + ic('trophy', 16, 2.2) + '낙찰됐어요<span class="num">' + won(m.amount) + '</span></div>';
    if (m.result === 'lose') return '<div class="mine lose">' + ic('x', 16, 2.2) + '낙찰되지 않았어요<span class="num">' + won(m.amount) + '</span></div>';
    if (v.mode === 'comp' && m.leading === true) return '<div class="mine lead">' + ic('check', 16, 2.4) + '내가 최고가<span class="num">' + won(m.amount) + '</span></div>';
    if (v.mode === 'comp' && m.leading === false) return '<div class="mine out">' + ic('alert', 16, 2.2) + (v.closed ? '내 입찰' : '더 높은 입찰이 있어요') + '<span class="num">' + won(m.amount) + '</span></div>';
    return '<div class="mine seal">' + ic('check', 16, 2.4) + '내 입찰<span class="num">' + won(m.amount) + '</span></div>';
  }
  function cardHTML(v) {
    const ph = v.photos[0] ? '<img src="' + esc(v.photos[0]) + '" alt="" loading="lazy" referrerpolicy="no-referrer">' : '<div style="display:grid;place-items:center;height:100%;color:#B9C4D0">' + ic('image', 44, 1.4) + '</div>';
    const badge = v.mode === 'comp' ? '<span class="badge solid-comp">' + ic('trend', 14, 2.4) + '경쟁입찰</span>' : '<span class="badge solid-seal">' + ic('lock', 14, 2.4) + '일반입찰</span>';
    const price = v.mode === 'comp'
      ? '<div class="price"><div><div class="k">' + (v.top ? '현재 최고가' : '시작가') + '</div><div class="v comp" data-top="' + v.id + '">' + won(v.top || v.min_price) + '</div></div>' + (v.top ? '<div class="mn">최소가<b>' + won(v.min_price) + '</b></div>' : '') + '</div>'
      : '<div class="price"><div><div class="k">최소 입찰가</div><div class="v">' + won(v.min_price) + '</div></div><div class="mn"><span class="sealed-v">' + ic('eyeoff', 15, 2) + '금액 비공개</span></div></div>';
    const cnt = v.count !== undefined ? '<span class="count">' + ic('user', 13, 2.2) + v.count + '명 입찰</span>' : '';
    const close = v.closed ? '' : (v.close_at && S.info && v.close_at !== S.info.close_at ? '<span style="color:var(--comp-d);font-weight:700">' + ic('clock', 13, 2.2) + ' 연장 · ' + left(v.close_at - now()) + ' 남음</span>' : '<span>No.' + v.no + '</span>');
    return '<button class="card" data-id="' + v.id + '" aria-label="' + esc(v.name) + ' 자세히 보기"><div class="ph">' + ph + badge + '<span class="no">No.' + v.no + '</span>' + cnt + (v.closed ? '<div class="cl">입찰 마감</div>' : '') + '</div>' +
      '<div class="body"><h3>' + esc(v.name) + '</h3>' + price + mineLine(v) + '<div class="foot">' + close + '<span class="go">' + (v.closed ? '결과 보기' : v.mine ? '다시 입찰' : '입찰하기') + ic('chev', 14, 2.4) + '</span></div></div></button>';
  }
  function renderGrid() {
    const g = $('#grid'), a = visible();
    const counts = { all: S.items.length, comp: S.items.filter(x => x.mode === 'comp').length, sealed: S.items.filter(x => x.mode === 'sealed').length, mine: S.items.filter(x => x.mine).length };
    $$('[data-c]').forEach(el => el.textContent = counts[el.dataset.c] || (el.dataset.c === 'mine' && !S.tok ? '' : '0'));
    if (!a.length) {
      g.innerHTML = '<div class="empty" style="grid-column:1/-1">' + ic(S.filter === 'mine' ? 'gavel' : 'box', 48, 1.5) + '<div style="font-weight:700;color:var(--ink-2)">' + (S.filter === 'mine' ? (S.tok ? '아직 입찰한 상품이 없어요.' : '참가 코드를 넣으면 내 입찰을 볼 수 있어요.') : S.q ? '「' + esc(S.q) + '」에 맞는 상품이 없어요.' : '아직 올라온 상품이 없어요.') + '</div></div>';
      return;
    }
    g.innerHTML = a.map(cardHTML).join('');
  }
  function flashChanged(prev) {
    S.items.forEach(v => { if (v.mode === 'comp' && prev[v.id] !== undefined && v.top && prev[v.id] !== v.top) { $$('[data-top="' + v.id + '"]').forEach(el => { el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); }); } });
  }

  /* ── 상세 · 입찰 ── */
  const dlg = $('#detail');
  const cur = () => S.items.find(x => x.id === S.open);
  function openItem(id, keepStage) {
    S.open = id; if (!keepStage) { S.stage = 'form'; S.photo = 0; S.draft = ''; }
    renderDetail();
    if (!dlg.open) dlg.showModal();
    if (location.hash !== '#item-' + id) history.replaceState(null, '', '#item-' + id);
  }
  dlg.addEventListener('close', () => { S.open = 0; if (/^#item-/.test(location.hash)) history.replaceState(null, '', location.pathname + location.search); });
  function howText(v) {
    const i = S.info, r = rulesText(i);
    return v.mode === 'comp' ? '<div class="how c">' + ic('trend', 18, 2.2) + '<div><b>경쟁입찰</b> · ' + esc(r.c) + '</div></div>' : '<div class="how s">' + ic('lock', 18, 2.2) + '<div><b>일반입찰</b> · ' + esc(r.s) + '</div></div>';
  }
  function renderDetail() {
    const v = cur(); if (!v) { dlg.close(); return; }
    const i = S.info, ph = v.photos.length ? v.photos : [];
    const main = ph.length ? '<img src="' + esc(ph[S.photo] || ph[0]) + '" alt="' + esc(v.name) + ' 사진 ' + (S.photo + 1) + '" referrerpolicy="no-referrer">' : '<div style="color:#B9C4D0">' + ic('image', 64, 1.3) + '</div>';
    const thumbs = ph.length > 1 ? '<div class="thumbs">' + ph.map((u, k) => '<button data-ph="' + k + '" aria-current="' + (k === S.photo) + '" aria-label="사진 ' + (k + 1) + '"><img src="' + esc(u) + '" alt="" referrerpolicy="no-referrer"></button>').join('') + '</div>' : '';
    const navs = ph.length > 1 ? '<button class="nav l" data-step="-1" aria-label="이전 사진">' + ic('chevl', 20, 2.4) + '</button><button class="nav r" data-step="1" aria-label="다음 사진">' + ic('chev', 20, 2.4) + '</button>' : '';
    const badge = v.mode === 'comp' ? '<span class="badge comp">' + ic('trend', 14, 2.4) + '경쟁입찰</span>' : '<span class="badge seal">' + ic('lock', 14, 2.4) + '일반입찰</span>';
    const closeTxt = v.closed ? '<span class="badge mute">마감</span>' : v.close_at ? '<span>' + ic('clock', 14, 2.2) + ' 마감 ' + esc(fmtDate(v.close_at)) + ' · ' + left(v.close_at - now()) + ' 남음</span>' : '';
    const stat = v.mode === 'comp'
      ? '<div class="stat"><div><div class="k">' + (v.top ? '현재 최고가' : '아직 입찰 없음 · 시작가') + '</div><div class="v comp" data-top="' + v.id + '">' + won(v.top || v.min_price) + '</div>' + (v.count !== undefined ? '<div class="s">' + v.count + '명 입찰</div>' : '') + '</div><div><div class="k">최소 입찰가</div><div class="v">' + won(v.min_price) + '</div><div class="s">' + won(i.unit) + ' 단위</div></div></div>'
      : '<div class="stat"><div><div class="k">최소 입찰가</div><div class="v">' + won(v.min_price) + '</div><div class="s">' + won(i.unit) + ' 단위</div></div><div><div class="k">' + ic('eyeoff', 14, 2.2) + '다른 사람 금액</div><div class="v seal">비공개</div>' + (v.count !== undefined ? '<div class="s">' + v.count + '명 입찰</div>' : '<div class="s">최고가·인원 모두 비공개</div>') + '</div></div>';
    dlg.innerHTML = '<button class="dlg-x" data-x aria-label="닫기">' + ic('x', 18, 2.2) + '</button><div class="dt"><div class="gal"><div class="main">' + main + '</div>' + navs + thumbs + '</div>' +
      '<div class="info"><div class="meta">' + badge + '<span>No.' + v.no + '</span>' + closeTxt + '</div><h2 id="dName">' + esc(v.name) + '</h2>' + (v.descr ? '<p class="desc">' + esc(v.descr) + '</p>' : '') + stat + howText(v) + '<div class="bidbox" id="bidbox">' + bidBox(v) + '</div></div></div>';
    dlg.querySelector('[data-x]').onclick = () => dlg.close();
    $$('[data-ph]', dlg).forEach(b => b.onclick = () => { S.photo = Number(b.dataset.ph); renderDetail(); });
    $$('[data-step]', dlg).forEach(b => b.onclick = () => { S.photo = (S.photo + Number(b.dataset.step) + ph.length) % ph.length; renderDetail(); });
    wireBid(v);
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
      return '<div class="done"><div class="ck">' + ic('check', 32, 2.6) + '</div><h4>' + won(m ? m.amount : 0) + '으로 입찰했어요</h4><p>' + lead + (S.floored ? '<br><small style="color:var(--mute)">' + won(i.unit) + ' 미만은 버려서 접수됐어요.</small>' : '') + '</p></div>' +
        (once ? '' : '<button class="btn block" data-again>' + ic('edit', 16) + '금액 바꿔 다시 입찰</button>') + hist;
    }
    if (once) return '<div class="mine ' + (v.mode === 'comp' ? (m.leading ? 'lead' : 'out') : 'seal') + '" style="margin:0">' + ic('check', 16, 2.4) + '내 입찰<span class="num">' + won(m.amount) + '</span></div><p class="hint">이 상품은 한 번만 입찰할 수 있어요.</p>' + hist;
    if (S.stage === 'confirm') {
      const amt = S.pending;
      const notes = v.mode === 'comp'
        ? (i.comp_rebid === 'raise' ? '경쟁입찰은 취소할 수 없어요. 누가 더 높게 내면 다시 입찰할 수 있어요.' : '경쟁입찰은 취소할 수 없고, 한 번만 입찰할 수 있어요.')
        : ({ replace: '마감 전까지 금액을 다시 바꿀 수 있어요.', raise: '다시 입찰할 땐 이 금액보다 높게만 낼 수 있어요.', none: '한 번만 입찰할 수 있어 바꿀 수 없어요.' }[i.sealed_rebid]);
      return '<div class="confirm" role="alertdialog" aria-label="입찰 확인"><div class="big"><b>' + won(amt) + '</b>으로 입찰할까요?</div>' + (m ? '<div class="hint">이전 입찰 ' + won(m.amount) + ' → 새 금액으로 바뀌어요.</div>' : '') + '<div class="hint">' + esc(notes) + '</div><div class="row"><button class="btn lg" data-back>돌아가기</button><button class="btn lg ' + (v.mode === 'comp' ? 'comp' : 'seal') + '" data-go>' + ic('gavel', 18, 2) + '입찰 확정</button></div></div>';
    }
    const need = v.next_min;
    const unit = i.unit;
    const myLine = m ? '<div class="mine ' + (v.mode === 'comp' ? (m.leading ? 'lead' : 'out') : 'seal') + '" style="margin:0">' + ic(m.leading === false ? 'alert' : 'check', 16, 2.4) + (v.mode === 'comp' ? (m.leading ? '내가 최고가예요' : '더 높은 입찰이 있어요') : '내 입찰') + '<span class="num">' + won(m.amount) + '</span></div>' : '';
    const label = m ? (v.mode === 'comp' ? '더 높게 다시 입찰' : (i.sealed_rebid === 'raise' ? '더 높게 다시 입찰' : '금액 바꿔 다시 입찰')) : '입찰 금액';
    return myLine + '<label class="lbl" for="amt">' + label + '</label><div class="amt"><input class="inp" id="amt" inputmode="numeric" autocomplete="off" placeholder="직접 입력 (' + num(need) + ' 이상)" value="' + esc(S.draft || '') + '"><span>원</span></div>' +
      '<div class="hint" id="amtHint">' + (v.mode === 'comp' ? won(need) + ' 이상 · ' : '최소가 ' + won(need) + ' 이상 · ') + won(unit) + ' 단위로 접수돼요.</div>' +
      '<button class="btn lg block ' + (v.mode === 'comp' ? 'comp' : 'seal') + '" id="bidBtn" disabled>' + ic('gavel', 18, 2) + '<span>금액을 입력해 주세요</span></button>' +
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
        else { okv = true; if (raw !== fl) { msg = won(raw) + ' → <b>' + won(fl) + '</b>으로 접수돼요. (' + won(unit) + ' 미만 버림)'; cls = 'warn'; } else msg = '<b>' + won(fl) + '</b>으로 입찰해요.'; }
      }
      hint.className = 'hint ' + cls; hint.innerHTML = msg;
      btn.disabled = !okv; btn.querySelector('span').textContent = okv ? won(fl) + '으로 입찰하기' : raw ? '금액을 확인해 주세요' : '금액을 입력해 주세요';
      return okv ? fl : 0;
    };
    inp.addEventListener('input', upd);
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); btn.click(); } });
    btn.onclick = () => { const a = upd(); if (!a) return; S.pending = a; S.stage = 'confirm'; renderDetail(); setTimeout(() => { const g = $('[data-go]'); g && g.focus(); }, 30); };
    upd();
  }
  async function loadHist(v) {
    const el = $('#myhist'); if (!el || !S.tok || !v.mine) return;
    const r = await api('mybids', {}, S.tok); if (!r.ok || !$('#myhist')) return;
    const h = r.history.filter(x => x.item_id === v.id); if (h.length < 2 && S.stage !== 'done') return;
    $('#myhist').innerHTML = '<details class="myhist"' + (h.length > 1 ? '' : '') + '><summary>내 입찰 기록 ' + h.length + '건</summary><ol>' + h.map(x => '<li class="' + (x.active ? '' : 'old') + '"><b class="num">' + won(x.amount) + '</b> · ' + esc(fmtDate(x.at, 'sec')) + (x.active ? ' · 현재' : '') + '</li>').join('') + '</ol></details>';
  }
  async function submitBid(v, amount, btn) {
    if (S.busy) return; S.busy = true;
    btn.disabled = true; btn.innerHTML = '<span class="spin"></span>접수 중…';
    const r = await api('bid', { itemId: v.id, amount: amount }, S.tok);
    S.busy = false;
    if (r.ok) {
      const k = S.items.findIndex(x => x.id === v.id); if (k >= 0) S.items[k] = r.item;
      S.floored = r.floored; S.stage = 'done'; S.draft = '';
      renderDetail(); renderGrid(); renderMe();
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
  const ABC = /[A-HJ-NP-Z2-9]/i;
  function fillCells(s) { const t = String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8); cells.forEach((c, k) => { c.value = t[k] || ''; c.classList.toggle('filled', !!c.value); }); syncLg(); const n = Math.min(t.length, 7); cells[n].focus(); }
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
  function logout(silent) { S.tok = ''; S.code = ''; ls.set('mk_tok', null); ls.set('mk_code', null); S.items.forEach(x => delete x.mine); renderMe(); renderGrid(); if (!silent) { toast('나갔어요. 다시 입찰하려면 코드를 넣어 주세요.'); refresh(); } }

  /* ── 도구줄 ── */
  $$('#tabs .tab').forEach(t => t.onclick = () => { S.filter = t.dataset.f; $$('#tabs .tab').forEach(x => x.setAttribute('aria-selected', x === t)); renderGrid(); });
  $('#q').addEventListener('input', e => { S.q = e.target.value; renderGrid(); });
  $('#sort').addEventListener('change', e => { S.sort = e.target.value; renderGrid(); });
  $('#grid').addEventListener('click', e => { const c = e.target.closest('.card'); if (c) openItem(Number(c.dataset.id)); });

  /* ── 불러오기 ── */
  async function refresh() {
    const r = await api('items', {}, S.tok);
    if (!r.ok) { if (!S.loaded) $('#grid').innerHTML = '<div class="empty" style="grid-column:1/-1">' + ic('alert', 44, 1.6) + '<div style="font-weight:700;color:var(--ink-2)">' + esc(r.error) + '</div><button class="btn" style="margin-top:12px" onclick="location.reload()">' + ic('refresh', 16) + '다시 불러오기</button></div>'; return; }
    if (r.info && r.info.now) MK.setServerNow(r.info.now);
    if (S.tok && !r.me) { logout(true); toast('참가 코드를 다시 넣어 주세요.', 'bad'); }
    const prev = {}; S.items.forEach(x => prev[x.id] = x.top);
    S.info = r.info; S.items = r.items; S.loaded = true;
    renderHero(); renderPhase(); renderMe(); renderGrid(); flashChanged(prev);
    if (S.open) {
      const v = cur();
      if (!v) { dlg.close(); toast('이 상품은 지금 볼 수 없어요.'); }
      else if (S.stage === 'form') { const a = $('#amt'), had = a && document.activeElement === a; const pos = a ? a.selectionStart : 0; renderDetail(); if (had) { const b = $('#amt'); b.focus(); try { b.setSelectionRange(pos, pos); } catch (e) { } } }
      else if (S.stage === 'done') renderDetail();
      if (v && v.mode === 'comp' && prev[v.id] !== undefined && prev[v.id] !== v.top) flashChanged(prev);
    }
  }
  function startHash() { const m = /^#item-(\d+)/.exec(location.hash); if (m && S.items.some(x => x.id === Number(m[1]))) openItem(Number(m[1])); }
  setInterval(renderPhase, 1000);
  let timer = null;
  const loop = () => { clearTimeout(timer); timer = setTimeout(async () => { if (!document.hidden && !S.busy && S.stage !== 'confirm') await refresh(); loop(); }, POLL); };
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { refresh(); loop(); } });
  window.addEventListener('storage', e => { if (DEMO && e.key === MK.DEMO_KEY) refresh(); });
  window.addEventListener('hashchange', startHash);
  refresh().then(() => { startHash(); loop(); });
  window.__mk = S;
})();
