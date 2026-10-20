/* KIRD 나눔마켓 — 관리자 화면 */
(function () {
  'use strict';
  const { api, $, $$, esc, won, num, now, fmtDate, left, clockLeft, ago, toDT, fromDT, ic, toast, ls, DEMO } = MK;
  const S = { tok: ls.get('mk_admin') || '', page: 'dash', st: null, codes: null, logs: null, draft: null, dirty: {}, codeTab: 'count', codeQ: '', itemQ: '', resQ: '', resF: 'all' };
  const PAGES = {
    dash: ['한눈에 보기', '입찰 진행 상황을 확인해요'],
    items: ['상품 관리', '사진·이름·최소 입찰가를 등록하고, 숨기거나 공개해요'],
    codes: ['참가 코드', '직원에게 나눠 줄 8자리 코드를 만들고 관리해요'],
    results: ['입찰 현황·결과', '상품별 1위·2위와 전체 입찰 기록 (관리자만 볼 수 있어요)'],
    settings: ['입찰 규칙·설정', '재입찰 허용 여부, 입찰 단위, 일정 등을 정해요'],
    logs: ['기록', '누가 언제 무엇을 했는지 남아요 (참가자는 번호로만 표시)']
  };
  const fill = root => $$('[data-ic]', root).forEach(el => { if (!el.firstChild) el.innerHTML = ic(el.dataset.ic, Number(el.dataset.s) || 18); });
  fill(document);
  $$('dialog.dlg').forEach(d => d.addEventListener('click', e => { if (e.target === d) d.close(); }));

  async function call(action, payload) {
    const r = await api(action, payload, S.tok);
    if (!r.ok && r.code === 'auth') { S.tok = ''; ls.set('mk_admin', null); showGate(r.error); }
    return r;
  }

  /* ── 로그인 ── */
  function showGate(msg) { $('#app').hidden = true; $('#gate').hidden = false; $('#gateErr').textContent = msg || ''; setTimeout(() => $('#pw').focus(), 30); }
  if (DEMO) { $('#pw').placeholder = '데모 비밀번호: demo'; $('#sideDemo').hidden = false; }
  $('#gateForm').addEventListener('submit', async e => {
    e.preventDefault(); const b = $('#gateBtn'); b.disabled = true; b.innerHTML = '<span class="spin"></span>확인 중…';
    const r = await api('adminLogin', { password: $('#pw').value });
    b.disabled = false; b.textContent = '들어가기';
    if (!r.ok) { $('#gateErr').textContent = r.error; $('#pw').select(); return; }
    S.tok = r.token; ls.set('mk_admin', r.token); $('#pw').value = ''; start();
  });
  $('#logout').onclick = () => { S.tok = ''; ls.set('mk_admin', null); showGate(); };

  /* ── 틀 ── */
  function go(p) {
    if (S.page === 'settings' && Object.keys(S.dirty).length && p !== 'settings' && !confirm('저장하지 않은 설정이 있어요. 버리고 이동할까요?')) return;
    if (p !== 'settings') S.dirty = {};
    S.page = p; $$('#nav button').forEach(b => b.setAttribute('aria-current', b.dataset.p === p ? 'page' : 'false'));
    $('#pTitle').textContent = PAGES[p][0]; $('#pSub').textContent = PAGES[p][1];
    if (location.hash !== '#' + p) history.replaceState(null, '', '#' + p);
    render(); load(p);
  }
  $$('#nav button').forEach(b => b.onclick = () => go(b.dataset.p));
  $('#reload').onclick = () => load(S.page, true);
  async function load(p, loud) {
    const tasks = [call('admin.state')];
    if (p === 'codes' || p === 'dash') tasks.push(call('admin.codes'));
    if (p === 'logs' || p === 'dash') tasks.push(call('admin.logs'));
    const rs = await Promise.all(tasks);
    if (!rs[0].ok) { if (rs[0].code !== 'auth') toast(rs[0].error, 'bad'); return; }
    S.st = rs[0]; MK.setServerNow(rs[0].info.now);
    rs.slice(1).forEach(r => { if (r.ok && r.codes) S.codes = r.codes; if (r.ok && r.logs) S.logs = r.logs; });
    if (p === S.page) render();
    if (S.scrollTo && p === S.page) { const el = document.getElementById(S.scrollTo); S.scrollTo = ''; if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); el.style.transition = 'background .6s'; el.style.background = 'var(--kird-50)'; setTimeout(() => { el.style.background = ''; }, 1400); } }
    if (loud) toast('새로 불러왔어요.');
  }
  function head() {
    const st = S.st; if (!st) return;
    const i = st.info, pill = $('#pill'), t = now();
    const txt = { ready: '시작 전 · ' + clockLeft(i.open_at - t), open: i.close_at ? (i.close_at > t ? '진행 중 · 마감까지 ' + clockLeft(i.close_at - t) : '연장 입찰 진행 중') : '진행 중 · 마감 시각 미정', paused: '일시 정지됨', closed: '마감됨' }[i.phase];
    pill.className = 'pill ' + i.phase; pill.innerHTML = '<span class="dot' + (i.phase === 'open' ? ' live' : '') + '"></span>' + esc(txt);
    const pb = $('#pauseBtn');
    pb.hidden = i.phase === 'closed' || i.phase === 'ready';
    pb.innerHTML = st.settings.paused ? ic('play', 15, 2.2) + '입찰 다시 열기' : ic('pause', 15, 2.2) + '잠시 멈춤';
    pb.onclick = async () => {
      if (!st.settings.paused && !confirm('입찰을 잠시 멈출까요? 직원 화면에 「잠시 멈춤」이 보이고, 입찰이 막혀요.')) return;
      const r = await call('admin.saveSettings', { settings: { paused: !st.settings.paused } });
      if (r.ok) { toast(st.settings.paused ? '입찰을 다시 열었어요.' : '입찰을 멈췄어요.', 'ok'); load(S.page); } else toast(r.error, 'bad');
    };
    $('[data-n="items"]').textContent = st.totals.items + st.totals.hidden;
    $('[data-n="codes"]').textContent = st.totals.codes;
  }
  setInterval(() => { if (S.st && !$('#app').hidden) head(); }, 1000);
  setInterval(() => { if (!document.hidden && !$('#app').hidden && (S.page === 'dash' || S.page === 'results') && !$$('dialog[open]').length) load(S.page); }, DEMO ? 5000 : 20000);

  function render() {
    head();
    const c = $('#content');
    if (!S.st) { c.innerHTML = '<div class="tiles">' + '<div class="skel" style="height:118px"></div>'.repeat(4) + '</div><div class="skel" style="height:320px"></div>'; return; }
    // 새로 그려도 입력 중이던 칸의 커서는 그대로
    const ae = document.activeElement, fid = ae && ae.id && c.contains(ae) ? ae.id : '';
    let sel = null; try { sel = fid ? [ae.selectionStart, ae.selectionEnd] : null; } catch (e) { }
    ({ dash: rDash, items: rItems, codes: rCodes, results: rResults, settings: rSettings, logs: rLogs })[S.page](c);
    fill(c);
    if (fid) { const el = document.getElementById(fid); if (el) { el.focus(); try { if (sel && sel[0] != null) el.setSelectionRange(sel[0], sel[1]); } catch (e) { } } }
  }
  const modeBadge = (m, forced) => (m === 'comp' ? '<span class="badge comp">' + ic('trend', 13, 2.4) + '경쟁</span>' : '<span class="badge seal">' + ic('lock', 13, 2.4) + '일반</span>') + (forced ? ' <span class="badge mute" title="관리자가 지정">지정</span>' : '');
  const thumb = it => it.photo_urls && it.photo_urls[0] ? '<img class="thumb" src="' + esc(it.photo_urls[0]) + '" alt="" loading="lazy" referrerpolicy="no-referrer">' : '<span class="thumb">' + ic('image', 18, 1.6) + '</span>';
  const who = x => x ? '<span class="who">' + (x.label ? esc(x.label) : '이름 없음') + ' <small>#' + x.code_id + '</small></span>' : '<span style="color:var(--faint)">-</span>';

  /* ── 한눈에 보기 ── */
  function rDash(c) {
    const st = S.st, T = st.totals, i = st.info, t = now();
    const items = st.items.filter(x => !x.hidden);
    const hot = items.slice().sort((a, b) => b.count - a.count || (b.top ? b.top.amount : 0) - (a.top ? a.top.amount : 0)).slice(0, 6);
    const noBid = items.filter(x => !x.count).length;
    const sum = items.reduce((s, x) => s + (x.top ? x.top.amount : 0), 0);
    const tile = (icn, col, k, v, s) => '<div class="tile"><div class="k"><i style="background:' + col[0] + ';color:' + col[1] + '">' + ic(icn, 17, 2.1) + '</i>' + k + '</div><div class="v">' + v + '</div><div class="s">' + s + '</div></div>';
    const r = MK.rulesText(i);
    c.innerHTML = '<div class="tiles">' +
      tile('box', ['var(--kird-50)', 'var(--kird)'], '공개 상품', T.items, '숨김 ' + T.hidden + '개 · 입찰 없는 상품 ' + noBid + '개') +
      tile('gavel', ['var(--comp-50)', 'var(--comp)'], '현재 입찰', num(T.bids) + '건', '금액 바꾼 이력 ' + num(T.rebids) + '건') +
      tile('user', ['var(--leaf-50)', 'var(--leaf-d)'], '참여 인원', T.bidders + '명', '발급 코드 ' + T.codes + '개 (사용 중 ' + T.codes_active + ')') +
      tile('heart', ['var(--seal-50)', 'var(--seal)'], '예상 모금액', won(sum), '상품별 현재 1위 금액 합계') + '</div>' +
      '<div class="two"><div class="panel"><div class="ph"><h2>입찰이 많은 상품</h2><div class="x"><button class="btn sm" data-go="results">전체 보기' + ic('chev', 14, 2.4) + '</button></div></div><div class="scroll">' +
      (hot.length ? '<table class="tbl"><thead><tr><th></th><th>상품</th><th>방식</th><th class="r">입찰</th><th class="r">현재 1위</th></tr></thead><tbody>' + hot.map(x => '<tr class="click" data-bids="' + x.id + '"><td style="width:64px">' + thumb(x) + '</td><td><div class="nm">' + esc(x.name) + '<small>No.' + x.no + ' · 최소 ' + won(x.min_price) + '</small></div></td><td>' + modeBadge(x.mode_resolved) + '</td><td class="r num">' + x.count + '</td><td class="r num lead-c">' + (x.top ? won(x.top.amount) : '-') + '</td></tr>').join('') + '</tbody></table>' : '<div class="empty">' + ic('box', 40, 1.5) + '<div>아직 상품이 없어요. <a href="#items" data-go="items">상품을 등록</a>해 보세요.</div></div>') +
      '</div></div><div style="display:flex;flex-direction:column;gap:20px"><div class="panel"><div class="ph"><h2>지금 적용 중인 규칙</h2><div class="x"><button class="btn sm" data-go="settings" data-scroll="guideSet">문구·규칙 고치기</button></div></div><div class="pb"><div class="preview" style="border-style:solid;background:#fff"><p><b>공통</b> — ' + esc(r.p).replace(/\n/g, '<br>') + '</p><p><b>경쟁입찰</b> (최소가 ' + won(i.competitive_min) + ' 이상) — ' + esc(r.c).replace(/\n/g, '<br>') + '</p><p><b>일반입찰</b> — ' + esc(r.s).replace(/\n/g, '<br>') + '</p></div>' +
      '<div style="display:flex;gap:16px;margin-top:12px;font-size:13px;color:var(--mute);flex-wrap:wrap"><span>' + ic('clock', 14, 2) + ' 시작 ' + (i.open_at ? esc(fmtDate(i.open_at)) : '바로') + '</span><span>마감 ' + (i.close_at ? esc(fmtDate(i.close_at)) : '미정') + '</span></div></div></div>' +
      '<div class="panel"><div class="ph"><h2>최근 기록</h2><div class="x"><button class="btn sm" data-go="logs">전체</button></div></div><div class="pb" style="padding:8px 20px 14px">' + ((S.logs || []).slice(0, 7).map(l => '<div style="display:flex;gap:10px;padding:8px 0;border-bottom:1px solid var(--line-2);font-size:13.5px"><span style="color:var(--mute);width:62px;flex:none">' + esc(ago(l.at)) + '</span><span><b>' + esc(l.action) + '</b> <span class="log-d">' + esc(logDetail(l)) + '</span></span></div>').join('') || '<div class="empty" style="padding:20px">기록이 없어요.</div>') + '</div></div></div></div>';
    $$('[data-go]', c).forEach(b => b.onclick = e => { e.preventDefault(); S.scrollTo = b.dataset.scroll || ''; go(b.dataset.go); });
    $$('[data-bids]', c).forEach(b => b.onclick = () => openBids(Number(b.dataset.bids)));
  }
  function logDetail(l) {
    let d = l.detail; try { const o = JSON.parse(d); if (o && typeof o === 'object') d = [o.item, o.amount ? won(o.amount) : '', o.prev ? '(이전 ' + won(o.prev) + ')' : ''].filter(Boolean).join(' · '); else d = String(o || ''); } catch (e) { }
    return (l.actor && l.actor !== '관리자' ? '참가자 ' + l.actor + ' · ' : '') + (d || '');
  }

  /* ── 상품 ── */
  function rItems(c) {
    const st = S.st, q = S.itemQ.trim().toLowerCase();
    const list = st.items.filter(x => !q || (x.name + ' ' + x.no + ' ' + x.descr).toLowerCase().includes(q));
    c.innerHTML = '<div class="panel"><div class="ph"><h2>상품 ' + st.items.length + '개</h2><span class="badge mute">공개 ' + st.totals.items + ' · 숨김 ' + st.totals.hidden + '</span><div class="x"><input class="inp" id="itemQ" placeholder="이름·번호로 찾기" value="' + esc(S.itemQ) + '" style="height:38px;width:200px"><button class="btn primary" id="addItem">' + ic('plus', 16, 2.4) + '상품 등록</button></div></div><div class="scroll">' +
      (list.length ? '<table class="tbl"><thead><tr><th></th><th>No.</th><th>상품</th><th class="r">최소 입찰가</th><th>방식</th><th class="r">입찰</th><th class="r">현재 1위</th><th>공개</th><th></th></tr></thead><tbody>' +
        list.map(x => '<tr class="' + (x.hidden ? 'hid' : '') + '"><td style="width:64px">' + thumb(x) + '</td><td class="num">' + x.no + '</td><td><div class="nm">' + esc(x.name) + '<small>' + esc(x.descr || '') + '</small></div></td><td class="r num">' + won(x.min_price) + '</td><td>' + modeBadge(x.mode_resolved, x.mode !== 'auto') + '</td><td class="r num">' + x.count + '</td><td class="r num">' + (x.top ? (x.mode_resolved === 'comp' ? '<span class="lead-c">' + won(x.top.amount) + '</span>' : won(x.top.amount)) : '-') + '</td>' +
          '<td><label class="sw" title="직원 화면에 보이기"><input type="checkbox" data-vis="' + x.id + '"' + (x.hidden ? '' : ' checked') + '><span class="tr"></span></label></td><td style="white-space:nowrap"><button class="btn sm" data-edit="' + x.id + '">' + ic('edit', 15) + '편집</button> <button class="btn sm ghost" data-bids="' + x.id + '" title="입찰 기록">' + ic('history', 15) + '</button></td></tr>').join('') + '</tbody></table>'
        : '<div class="empty">' + ic('box', 44, 1.4) + '<div style="font-weight:700;color:var(--ink-2)">' + (q ? '찾는 상품이 없어요.' : '첫 상품을 등록해 보세요.') + '</div><div style="margin-top:4px">사진 · 상품명 · 최소 입찰가만 있으면 돼요.</div></div>') + '</div></div>';
    $('#addItem').onclick = () => openItem(null);
    $('#itemQ').oninput = e => { S.itemQ = e.target.value; const pos = e.target.selectionStart; rItems(c); fill(c); const n = $('#itemQ'); n.focus(); n.setSelectionRange(pos, pos); };
    $$('[data-edit]', c).forEach(b => b.onclick = () => openItem(st.items.find(x => x.id === Number(b.dataset.edit))));
    $$('[data-bids]', c).forEach(b => b.onclick = () => openBids(Number(b.dataset.bids)));
    $$('[data-vis]', c).forEach(cb => cb.onchange = async () => {
      const r = await call('admin.setHidden', { id: Number(cb.dataset.vis), hidden: !cb.checked });
      if (r.ok) { toast(cb.checked ? '직원 화면에 공개했어요.' : '숨겼어요. 직원 화면에서 안 보여요.', 'ok'); load('items'); } else { cb.checked = !cb.checked; toast(r.error, 'bad'); }
    });
  }
  const itemDlg = $('#itemDlg');
  function openItem(it) {
    const st = S.st;
    const nextNo = st.items.reduce((m, x) => Math.max(m, Number(x.no) || 0), 0) + 1;
    S.draft = it ? { id: it.id, no: it.no, name: it.name, descr: it.descr, min_price: it.min_price, mode: it.mode || 'auto', hidden: !!it.hidden, close_at: it.close_at || 0, photos: (it.photos || []).map((ref, k) => ({ ref: ref, url: it.photo_urls[k] })), count: it.count }
      : { id: 0, no: nextNo, name: '', descr: '', min_price: '', mode: 'auto', hidden: false, close_at: 0, photos: [], count: 0 };
    const d = S.draft;
    itemDlg.innerHTML = '<button class="dlg-x" data-x aria-label="닫기">' + ic('x', 18, 2.2) + '</button><form id="edForm" novalidate><div class="ed"><div class="l"><h2 id="edT">' + (d.id ? '상품 편집' : '새 상품 등록') + '</h2>' +
      '<div class="row2" style="grid-template-columns:110px 1fr"><div class="field"><label for="fNo">번호</label><input class="inp num" id="fNo" inputmode="numeric" value="' + esc(d.no) + '"></div><div class="field"><label for="fName">상품명 <span style="color:var(--bad)">*</span></label><input class="inp" id="fName" maxlength="80" placeholder="예: 로봇청소기 (물걸레 겸용)" value="' + esc(d.name) + '"></div></div>' +
      '<div class="field"><label for="fDescr">설명</label><textarea class="inp" id="fDescr" maxlength="2000" placeholder="상태, 구성품, 사용 기간, 받는 방법 등">' + esc(d.descr) + '</textarea></div>' +
      '<div class="row2"><div class="field"><label for="fMin">최소 입찰가 <span style="color:var(--bad)">*</span></label><div class="amt" style="position:relative"><input class="inp num" id="fMin" inputmode="numeric" placeholder="예: 30,000" value="' + (d.min_price ? num(d.min_price) : '') + '" style="padding-right:40px;text-align:right;font-weight:700"><span style="position:absolute;right:14px;top:50%;transform:translateY(-50%);color:var(--mute);font-weight:600">원</span></div>' + (d.count ? '<span class="help">입찰이 ' + d.count + '건 있어 기존 입찰보다 높게는 못 올려요.</span>' : '') + '</div>' +
      '<div class="field"><label for="fMode">입찰 방식</label><select class="inp" id="fMode"><option value="auto">자동 (' + won(st.settings.competitive_min) + ' 기준)</option><option value="comp">경쟁입찰로 지정</option><option value="sealed">일반입찰로 지정</option></select></div></div>' +
      '<div class="modeNote" id="modeNote"></div>' +
      '<div class="row2"><div class="field"><label for="fClose">이 상품만 마감 시각 따로 <span style="font-weight:500;color:var(--mute)">(선택)</span></label><input class="inp" id="fClose" type="datetime-local" value="' + esc(toDT(d.close_at)) + '"><span class="help">비우면 전체 마감 시각(' + (st.settings.close_at ? esc(fmtDate(st.settings.close_at)) : '미정') + ')을 따라요.</span></div>' +
      '<div class="field"><span class="lbl">직원 화면에 보이기</span><div class="swrow"><div><b>' + (d.hidden ? '숨김' : '공개') + '</b><span class="d">끄면 숨김 — 입찰 기록은 남아요</span></div><label class="sw"><input type="checkbox" id="fVis"' + (d.hidden ? '' : ' checked') + '><span class="tr"></span><span class="sr">공개</span></label></div></div></div>' +
      '</div><div class="r"><div class="lbl">사진 <span style="font-weight:500;color:var(--mute)">최대 8장 · 첫 장이 대표</span></div><label class="drop" id="drop">' + ic('upload', 26, 1.8) + '<b>사진을 끌어다 놓거나 눌러서 고르기</b>JPG·PNG · 자동으로 줄여서 올려요<input type="file" id="fFile" accept="image/*" multiple hidden></label><div class="phs" id="phs"></div></div></div>' +
      '<div class="foot">' + (d.id && !d.count ? '<button type="button" class="btn danger" id="edDel" style="margin-right:auto">' + ic('trash', 16) + '삭제</button>' : '') + '<button type="button" class="btn" data-x>취소</button><button type="submit" class="btn primary" id="edSave">' + ic('check', 16, 2.4) + (d.id ? '저장' : '등록') + '</button></div></form>';
    $('#fMode').value = d.mode;
    $$('[data-x]', itemDlg).forEach(b => b.onclick = () => itemDlg.close());
    const modeNote = () => {
      const min = Number(String($('#fMin').value).replace(/[^\d]/g, '')) || 0, m = $('#fMode').value;
      const r = m === 'auto' ? (min >= st.settings.competitive_min ? 'comp' : 'sealed') : m;
      const el = $('#modeNote'); el.className = 'modeNote ' + r;
      el.innerHTML = r === 'comp' ? ic('trend', 15, 2.2) + ' <b>경쟁입찰</b>로 올라가요 — 현재 최고가가 직원들에게 공개돼요.' : ic('lock', 15, 2.2) + ' <b>일반입찰</b>로 올라가요 — 다른 사람 금액은 보이지 않아요.';
    };
    $('#fMin').addEventListener('input', e => { const n = String(e.target.value).replace(/[^\d]/g, ''); e.target.value = n ? num(n) : ''; modeNote(); });
    $('#fMode').onchange = modeNote; modeNote();
    $('#fVis').onchange = e => { e.target.closest('.swrow').querySelector('b').textContent = e.target.checked ? '공개' : '숨김'; };
    drawPhotos();
    const drop = $('#drop'), file = $('#fFile');
    file.onchange = () => { addFiles(file.files); file.value = ''; };
    ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('on'); }));
    ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('on'); }));
    drop.addEventListener('drop', e => addFiles(e.dataTransfer.files));
    $('#edForm').onsubmit = saveItem;
    const del = $('#edDel'); if (del) del.onclick = async () => {
      if (!confirm('「' + d.name + '」을(를) 지울까요? 되돌릴 수 없어요.')) return;
      const r = await call('admin.deleteItem', { id: d.id }); if (r.ok) { itemDlg.close(); toast('지웠어요.', 'ok'); load('items'); } else toast(r.error, 'bad');
    };
    itemDlg.showModal(); setTimeout(() => $(d.id ? '#fName' : '#fName').focus(), 40);
  }
  function drawPhotos() {
    const d = S.draft, el = $('#phs'); if (!el) return;
    el.innerHTML = d.photos.map((p, k) => p.up ? '<div class="p up"><span class="spin dark"></span></div>' : '<div class="p"><img src="' + esc(p.url) + '" alt="" referrerpolicy="no-referrer">' + (k === 0 ? '<span class="cv">대표</span>' : '') + '<div class="tools">' + (k > 0 ? '<button type="button" data-first="' + k + '" title="대표로">' + ic('chevl', 14, 2.4) + '</button>' : '') + '<button type="button" data-rm="' + k + '" title="빼기">' + ic('x', 14, 2.4) + '</button></div></div>').join('');
    $$('[data-rm]', el).forEach(b => b.onclick = () => { d.photos.splice(Number(b.dataset.rm), 1); drawPhotos(); });
    $$('[data-first]', el).forEach(b => b.onclick = () => { const k = Number(b.dataset.first); const [p] = d.photos.splice(k, 1); d.photos.splice(k - 1, 0, p); drawPhotos(); });
  }
  async function addFiles(files) {
    const d = S.draft; const list = Array.from(files || []).slice(0, 8 - d.photos.length);
    if (!list.length) { if ((files || []).length) toast('사진은 8장까지예요.', 'bad'); return; }
    for (const f of list) {
      const slot = { up: true }; d.photos.push(slot); drawPhotos();
      try {
        const url = await MK.shrinkImage(f, MK.PHOTO_MAX[0], MK.PHOTO_MAX[1]);
        const r = await call('admin.uploadPhoto', { dataUrl: url, name: (S.draft.name || 'item') + '_' + (d.photos.length) });
        if (!r.ok) throw new Error(r.error);
        Object.assign(slot, { up: false, ref: r.ref, url: r.url });
      } catch (e) { d.photos.splice(d.photos.indexOf(slot), 1); toast(e.message, 'bad'); }
      drawPhotos();
    }
  }
  async function saveItem(e) {
    e.preventDefault(); const d = S.draft;
    if (d.photos.some(p => p.up)) { toast('사진을 올리는 중이에요. 잠시만요.'); return; }
    const item = { id: d.id, no: Number($('#fNo').value) || d.no, name: $('#fName').value.trim(), descr: $('#fDescr').value, min_price: Number(String($('#fMin').value).replace(/[^\d]/g, '')), mode: $('#fMode').value, hidden: !$('#fVis').checked, close_at: fromDT($('#fClose').value), photos: d.photos.map(p => p.ref) };
    if (!item.name) { toast('상품명을 입력해 주세요.', 'bad'); $('#fName').focus(); return; }
    if (!item.min_price) { toast('최소 입찰가를 입력해 주세요.', 'bad'); $('#fMin').focus(); return; }
    if (!item.photos.length && !confirm('사진 없이 등록할까요?')) return;
    const b = $('#edSave'); b.disabled = true; b.innerHTML = '<span class="spin"></span>저장 중…';
    const r = await call('admin.saveItem', { item: item });
    b.disabled = false; b.innerHTML = ic('check', 16, 2.4) + (d.id ? '저장' : '등록');
    if (!r.ok) { toast(r.error, 'bad'); return; }
    itemDlg.close(); toast(d.id ? '저장했어요.' : '「' + item.name + '」을(를) 등록했어요.', 'ok'); load('items');
  }

  /* ── 참가 코드 ── */
  function rCodes(c) {
    const list = S.codes || [], q = S.codeQ.trim().toLowerCase();
    const shown = list.filter(x => !q || (x.label + ' #' + x.id).toLowerCase().includes(q));
    c.innerHTML = '<div class="panel"><div class="ph"><h2>코드 발급</h2><div class="seg" role="group"><button data-ct="count" aria-pressed="' + (S.codeTab === 'count') + '">개수로</button><button data-ct="names" aria-pressed="' + (S.codeTab === 'names') + '">이름 목록으로</button></div></div><div class="pb">' +
      (S.codeTab === 'count'
        ? '<div style="display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap"><div class="field" style="width:160px"><label for="cN">몇 개 만들까요?</label><input class="inp num" id="cN" type="number" min="1" max="1000" value="' + esc(S.codeN || 10) + '"></div><button class="btn primary" id="mkCodes">' + ic('ticket', 16, 2) + '코드 만들기</button><span class="help" style="color:var(--mute);font-size:13px;padding-bottom:12px">이름 없이 번호로만 관리돼요. 나눠 줄 때 이름을 적어 두면 편해요.</span></div>'
        : '<div class="field"><label for="cNames">한 줄에 한 명씩 (이름, 사번, 부서 등 관리자만 보는 메모)</label><textarea class="inp" id="cNames" rows="5" placeholder="인재개발팀 홍길동\n연구윤리팀 김연구\n…">' + esc(S.codeNames || '') + '</textarea></div><div style="display:flex;gap:10px;align-items:center;margin-top:10px"><button class="btn primary" id="mkCodes">' + ic('ticket', 16, 2) + '줄 수만큼 코드 만들기</button><span style="font-size:13px;color:var(--mute)" id="cCount">0명</span></div>') +
      '<div style="margin-top:14px;display:flex;gap:10px;padding:12px 14px;border-radius:12px;background:var(--kird-50);color:var(--kird-dd);font-size:13px;line-height:1.55">' + ic('shield', 17, 2) + '<span>만든 코드는 아래 목록에서 <b>언제든 다시 볼 수 있어요</b> (관리자만). 「목록 CSV」나 「카드 인쇄」로 나눠 주세요. 코드가 새어 나갔다면 「재발급」하면 옛 코드는 바로 막히고, 그 사람의 기존 입찰은 그대로 남아요.</span></div></div></div>' +
      '<div class="panel"><div class="ph"><h2>발급한 코드 ' + list.length + '개</h2><span class="badge ok">사용 중 ' + list.filter(x => x.active).length + '</span><div class="x"><input class="inp" id="codeQ" placeholder="이름·번호로 찾기" value="' + esc(S.codeQ) + '" style="height:38px;width:200px"><button class="btn sm" id="codeCsv">' + ic('download', 15) + '목록 CSV</button><button class="btn sm" id="codePrint">' + ic('print', 15) + '카드 인쇄</button><button class="btn sm danger" id="codeDel" disabled>' + ic('trash', 15) + '선택 삭제</button></div></div><div class="scroll">' +
      (shown.length ? '<table class="tbl"><thead><tr><th style="width:36px"><input type="checkbox" id="codeAll" aria-label="전체 선택" style="width:17px;height:17px;accent-color:var(--kird)"></th><th>번호</th><th>이름 · 메모 <span style="font-weight:500">(눌러서 고치기)</span></th><th>코드</th><th>발급</th><th>마지막 접속</th><th class="r">입찰 중</th><th>사용</th><th></th></tr></thead><tbody>' +
        shown.map(x => '<tr' + (x.active ? '' : ' class="hid"') + '><td><input type="checkbox" data-pick="' + x.id + '"' + (S.pick && S.pick[x.id] ? ' checked' : '') + ' aria-label="#' + x.id + ' 선택" style="width:17px;height:17px;accent-color:var(--kird)"></td><td class="num">#' + x.id + '</td><td><input class="inl" data-label="' + x.id + '" value="' + esc(x.label) + '" placeholder="메모 없음" maxlength="60"></td><td style="white-space:nowrap">' + (x.code ? '<span class="codev">' + esc(x.code) + '</span> <button class="btn sm ghost" data-copy="' + esc(x.code) + '" title="복사">' + ic('copy', 14) + '<span class="sr">복사</span></button>' : '<span style="color:var(--faint);font-size:12.5px" title="이 기능 전에 만든 코드라 원래 코드가 저장돼 있지 않아요">확인 불가 · 재발급 필요</span>') + '</td><td>' + esc(fmtDate(x.created_at)) + '</td><td>' + (x.last_at ? esc(ago(x.last_at)) : '<span style="color:var(--faint)">아직</span>') + '</td><td class="r num">' + x.bids + '</td><td><label class="sw"><input type="checkbox" data-act="' + x.id + '"' + (x.active ? ' checked' : '') + '><span class="tr"></span><span class="sr">사용</span></label></td><td><button class="btn sm" data-re="' + x.id + '">' + ic('refresh', 14) + '재발급</button></td></tr>').join('') + '</tbody></table>'
        : '<div class="empty">' + ic('ticket', 44, 1.4) + '<div>' + (q ? '찾는 코드가 없어요.' : '아직 발급한 코드가 없어요.') + '</div></div>') + '</div></div>';
    $$('[data-ct]', c).forEach(b => b.onclick = () => { S.codeTab = b.dataset.ct; rCodes(c); fill(c); });
    const names = $('#cNames'), cnt = () => { $('#cCount').textContent = names.value.split('\n').filter(s => s.trim()).length + '명'; };
    if (names) { names.oninput = () => { S.codeNames = names.value; cnt(); }; cnt(); }
    const cN = $('#cN'); if (cN) cN.oninput = () => { S.codeN = cN.value; };
    $('#mkCodes').onclick = async () => {
      const payload = S.codeTab === 'count' ? { count: Number($('#cN').value) } : { labels: $('#cNames').value.split('\n').map(s => s.trim()).filter(Boolean) };
      if (S.codeTab === 'names' && !payload.labels.length) { toast('이름을 한 줄에 하나씩 적어 주세요.', 'bad'); return; }
      const b = $('#mkCodes'); b.disabled = true; b.innerHTML = '<span class="spin"></span>만드는 중…';
      const r = await call('admin.createCodes', payload);
      b.disabled = false; b.innerHTML = ic('ticket', 16, 2) + '코드 만들기';
      if (!r.ok) { toast(r.error, 'bad'); return; }
      S.codeNames = ''; showNewCodes(r.codes, '새 코드 ' + r.codes.length + '개'); load('codes');
    };
    $('#codeQ').oninput = e => { S.codeQ = e.target.value; const p = e.target.selectionStart; rCodes(c); fill(c); const n = $('#codeQ'); n.focus(); n.setSelectionRange(p, p); };
    const url = location.href.replace(/admin\.html.*$/, '').replace(/#.*$/, '');
    $('#codeCsv').onclick = () => MK.downloadCSV('kird-market_codes_list.csv', [['번호', '이름·메모', '참가 코드', '사용', '발급', '마지막 접속', '입찰 중', '입찰 주소']].concat(list.map(x => ['#' + x.id, x.label, x.code || '(재발급 필요)', x.active ? '사용' : '중지', fmtDate(x.created_at), x.last_at ? fmtDate(x.last_at) : '', x.bids, url])));
    $('#codePrint').onclick = () => { const a = shown.filter(x => x.active && x.code); if (!a.length) { toast('인쇄할 코드가 없어요.', 'bad'); return; } printCards(a, url); };
    // 선택 삭제 (입찰한 적 없는 코드만 지워짐)
    S.pick = S.pick || {};
    const syncPick = () => { const n = Object.keys(S.pick).filter(k => S.pick[k]).length; const b = $('#codeDel'); if (b) { b.disabled = !n; b.innerHTML = ic('trash', 15) + '선택 삭제' + (n ? ' (' + n + ')' : ''); } const all = $('#codeAll'); if (all) all.checked = shown.length > 0 && shown.every(x => S.pick[x.id]); };
    $$('[data-pick]', c).forEach(cb => cb.onchange = () => { S.pick[cb.dataset.pick] = cb.checked; syncPick(); });
    const all = $('#codeAll'); if (all) all.onchange = () => { shown.forEach(x => S.pick[x.id] = all.checked); $$('[data-pick]', c).forEach(cb => cb.checked = all.checked); syncPick(); };
    syncPick();
    $('#codeDel').onclick = async () => {
      const ids = Object.keys(S.pick).filter(k => S.pick[k]).map(Number);
      const usedN = ids.filter(id => { const x = list.find(y => y.id === id); return x && x.bids; }).length;
      if (!confirm('코드 ' + ids.length + '개를 지울까요? 되돌릴 수 없어요.' + (usedN ? '\n입찰 기록이 있는 ' + usedN + '개는 결과를 지키기 위해 지우지 않아요 (「사용」을 끄면 막혀요).' : ''))) return;
      const b = $('#codeDel'); b.disabled = true; b.innerHTML = '<span class="spin dark"></span>지우는 중…';
      const r = await call('admin.deleteCodes', { ids: ids });
      if (!r.ok) { toast(r.error, 'bad'); syncPick(); return; }
      S.pick = {}; toast(r.deleted.length + '개 지웠어요.' + (r.kept.length ? ' 입찰 기록이 있는 ' + r.kept.length + '개는 남겼어요.' : ''), 'ok'); load('codes');
    };
    $$('[data-copy]', c).forEach(b => b.onclick = async () => { try { await navigator.clipboard.writeText(b.dataset.copy); toast(b.dataset.copy + ' 복사했어요.', 'ok'); } catch (e) { toast('복사하지 못했어요.', 'bad'); } });
    $$('[data-label]', c).forEach(inp => {
      inp.onchange = async () => { const r = await call('admin.updateCode', { id: Number(inp.dataset.label), label: inp.value }); if (r.ok) { toast('메모를 고쳤어요.', 'ok'); const x = list.find(y => y.id === Number(inp.dataset.label)); if (x) x.label = inp.value; } else toast(r.error, 'bad'); };
      inp.onkeydown = e => { if (e.key === 'Enter') inp.blur(); };
    });
    $$('[data-act]', c).forEach(cb => cb.onchange = async () => {
      if (!cb.checked && !confirm('이 코드를 중지할까요? 그 사람은 더 이상 들어오거나 입찰할 수 없어요. (이미 낸 입찰은 남아요)')) { cb.checked = true; return; }
      const r = await call('admin.updateCode', { id: Number(cb.dataset.act), active: cb.checked });
      if (r.ok) { toast(cb.checked ? '다시 쓸 수 있게 했어요.' : '코드를 중지했어요.', 'ok'); load('codes'); } else { cb.checked = !cb.checked; toast(r.error, 'bad'); }
    });
    $$('[data-re]', c).forEach(b => b.onclick = async () => {
      const x = list.find(y => y.id === Number(b.dataset.re));
      if (!confirm('#' + x.id + (x.label ? ' ' + x.label : '') + ' 코드를 새로 만들까요?\n옛 코드는 바로 못 쓰게 되고, 기존 입찰은 새 코드로 이어져요.')) return;
      const r = await call('admin.reissueCode', { id: x.id });
      if (r.ok) { showNewCodes([r], '재발급한 코드'); load('codes'); } else toast(r.error, 'bad');
    });
  }
  const codesDlg = $('#codesDlg');
  function showNewCodes(codes, title) {
    const url = location.href.replace(/admin\.html.*$/, '').replace(/#.*$/, '');
    codesDlg.innerHTML = '<div class="cd"><h2 id="cdT">' + esc(title) + '</h2><div class="warn">' + ic('alert', 18, 2.2) + '<span>코드는 「참가 코드」 목록에서 언제든 다시 볼 수 있어요. 바로 나눠 줄 거라면 지금 <b>CSV로 받거나 인쇄</b>하세요.</span></div>' +
      '<div class="list"><table class="tbl"><thead><tr><th>번호</th><th>이름 · 메모</th><th>참가 코드</th></tr></thead><tbody>' + codes.map(x => '<tr><td class="num">#' + x.id + '</td><td>' + esc(x.label || '-') + '</td><td class="codev">' + esc(x.code) + '</td></tr>').join('') + '</tbody></table></div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn primary" id="cdCsv">' + ic('download', 16) + 'CSV 내려받기</button><button class="btn" id="cdPrint">' + ic('print', 16) + '나눠 줄 카드 인쇄</button><button class="btn" id="cdCopy">' + ic('copy', 16) + '모두 복사</button><button class="btn ghost" id="cdClose" style="margin-left:auto">닫기</button></div></div>';
    $('#cdCsv').onclick = () => { MK.downloadCSV('kird-market_codes_' + new Date().toISOString().slice(0, 10) + '.csv', [['번호', '이름·메모', '참가 코드', '입찰 주소']].concat(codes.map(x => ['#' + x.id, x.label, x.code, url]))); codesDlg.dataset.saved = 1; };
    $('#cdCopy').onclick = async () => { try { await navigator.clipboard.writeText(codes.map(x => (x.label ? x.label + '\t' : '') + x.code).join('\n')); toast('복사했어요.', 'ok'); codesDlg.dataset.saved = 1; } catch (e) { toast('복사하지 못했어요. CSV를 써 주세요.', 'bad'); } };
    $('#cdPrint').onclick = () => { printCards(codes, url); codesDlg.dataset.saved = 1; };
    $('#cdClose').onclick = () => codesDlg.close();
    codesDlg.dataset.saved = ''; codesDlg.showModal();
    codesDlg.oncancel = null;
  }
  function printCards(codes, url) {
    const title = S.st ? S.st.settings.title : 'KIRD 나눔마켓';
    const w = window.open('', '_blank'); if (!w) { toast('팝업이 막혔어요. 팝업을 허용해 주세요.', 'bad'); return; }
    const k = new URL('assets/kmark.png', location.href).href;
    w.document.write('<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>참가 코드 카드</title><style>@page{size:A4;margin:10mm}body{margin:0;font-family:"Pretendard Variable",Pretendard,"Malgun Gothic",sans-serif;color:#15202B}.g{display:grid;grid-template-columns:repeat(2,1fr);gap:6mm}.c{border:1.2px dashed #9AA8B8;border-radius:4mm;padding:6mm 7mm;break-inside:avoid;display:flex;flex-direction:column;gap:2.5mm;height:58mm;box-sizing:border-box}.h{display:flex;align-items:center;gap:2.5mm;font-weight:800;font-size:12pt}.h img{width:8mm}.h span{color:#2F84C5}.n{font-size:9.5pt;color:#66768A}.code{font:800 22pt ui-monospace,Menlo,Consolas,monospace;letter-spacing:1.5mm;color:#164E7D;margin:1mm 0}.s{font-size:8.6pt;color:#3A4757;line-height:1.5}.u{font-size:8.4pt;color:#1F6AA6;word-break:break-all;margin-top:auto}</style></head><body><div class="g">' +
      codes.map(x => '<div class="c"><div class="h"><img src="' + k + '">' + esc(title) + '</div><div class="n">' + esc(x.label || '참가자 #' + x.id) + ' · 본인만 쓰세요</div><div class="code">' + esc(x.code) + '</div><div class="s">① 아래 주소로 들어가요 ② 「참가 코드 입력」에 이 코드를 넣어요 ③ 마음에 드는 상품에 입찰해요<br>누가 얼마를 냈는지는 다른 직원에게 보이지 않아요.</div><div class="u">' + esc(url) + '</div></div>').join('') +
      '</div><script>window.onload=function(){setTimeout(function(){window.print()},300)}<\/script></body></html>');
    w.document.close();
  }

  /* ── 결과 ── */
  function rResults(c) {
    const st = S.st, i = st.info, q = S.resQ.trim().toLowerCase();
    let list = st.items.filter(x => !q || (x.name + ' ' + x.no).toLowerCase().includes(q));
    if (S.resF === 'comp') list = list.filter(x => x.mode_resolved === 'comp'); else if (S.resF === 'sealed') list = list.filter(x => x.mode_resolved === 'sealed'); else if (S.resF === 'none') list = list.filter(x => !x.count);
    const t = now();
    c.innerHTML = '<div class="panel"><div class="ph"><h2>' + (i.phase === 'closed' ? '최종 결과' : '실시간 현황') + '</h2>' + (i.phase === 'closed' ? '<span class="badge ok">마감</span>' : '<span class="badge warn">진행 중 — 순위가 바뀔 수 있어요</span>') +
      '<div class="x"><div class="seg">' + [['all', '전체'], ['comp', '경쟁'], ['sealed', '일반'], ['none', '입찰 없음']].map(([k, n]) => '<button data-rf="' + k + '" aria-pressed="' + (S.resF === k) + '">' + n + '</button>').join('') + '</div><input class="inp" id="resQ" placeholder="상품 찾기" value="' + esc(S.resQ) + '" style="height:38px;width:160px"><button class="btn sm" id="csvRes">' + ic('download', 15) + '결과 CSV</button><button class="btn sm" id="csvAll">' + ic('download', 15) + '전체 입찰 기록 CSV</button></div></div>' +
      '<div class="pb" style="padding:14px 20px;border-bottom:1px solid var(--line-2);display:flex;gap:16px;align-items:center;flex-wrap:wrap"><div class="swrow" style="flex:1;min-width:280px;border:0;padding:0"><div><b>직원에게 낙찰 여부 보여 주기</b><span class="d">켜면 마감된 상품에서 각자 「낙찰 / 미낙찰」만 보여요. 다른 사람 정보는 계속 비공개예요.</span></div><label class="sw"><input type="checkbox" id="pubRes"' + (st.settings.results_public ? ' checked' : '') + '><span class="tr"></span><span class="sr">결과 공개</span></label></div></div><div class="scroll">' +
      (list.length ? '<table class="tbl"><thead><tr><th>No.</th><th>상품</th><th>방식</th><th class="r">최소가</th><th class="r">입찰</th><th class="r">1위 금액</th><th>1위 (관리자만)</th><th class="r">2위 금액</th><th>상태</th><th></th></tr></thead><tbody>' +
        list.map(x => {
          const closed = i.phase === 'closed' || (x.close_eff && t >= x.close_eff);
          return '<tr class="click' + (x.hidden ? ' hid' : '') + '" data-bids="' + x.id + '"><td class="num">' + x.no + '</td><td><div class="nm">' + esc(x.name) + (x.hidden ? '<small>숨김</small>' : '') + '</div></td><td>' + modeBadge(x.mode_resolved) + '</td><td class="r num">' + won(x.min_price) + '</td><td class="r num">' + x.count + '</td><td class="r num lead-c">' + (x.top ? won(x.top.amount) : '-') + '</td><td>' + who(x.top) + '</td><td class="r num">' + (x.second ? won(x.second.amount) : '-') + '</td><td>' + (closed ? (x.top ? '<span class="badge ok">낙찰</span>' : '<span class="badge mute">유찰</span>') : '<span class="badge warn">진행</span>') + '</td><td>' + ic('chev', 16, 2) + '</td></tr>';
        }).join('') + '</tbody></table>' : '<div class="empty">' + ic('trophy', 44, 1.4) + '<div>해당하는 상품이 없어요.</div></div>') + '</div></div>';
    $$('[data-rf]', c).forEach(b => b.onclick = () => { S.resF = b.dataset.rf; rResults(c); fill(c); });
    $('#resQ').oninput = e => { S.resQ = e.target.value; const p = e.target.selectionStart; rResults(c); fill(c); const n = $('#resQ'); n.focus(); n.setSelectionRange(p, p); };
    $$('[data-bids]', c).forEach(b => b.onclick = () => openBids(Number(b.dataset.bids)));
    $('#pubRes').onchange = async e => {
      const r = await call('admin.saveSettings', { settings: { results_public: e.target.checked } });
      if (r.ok) { toast(e.target.checked ? '마감된 상품의 낙찰 여부가 각자에게 보여요.' : '낙찰 여부를 다시 숨겼어요.', 'ok'); load('results'); } else { e.target.checked = !e.target.checked; toast(r.error, 'bad'); }
    };
    $('#csvRes').onclick = () => MK.downloadCSV('kird-market_results_' + new Date().toISOString().slice(0, 10) + '.csv', [['번호', '상품', '방식', '최소가', '입찰 수', '1위 금액', '1위 참가자', '1위 참가자 번호', '1위 입찰 시각', '2위 금액', '2위 참가자', '공개']].concat(st.items.map(x => [x.no, x.name, x.mode_resolved === 'comp' ? '경쟁' : '일반', x.min_price, x.count, x.top ? x.top.amount : '', x.top ? x.top.label : '', x.top ? '#' + x.top.code_id : '', x.top ? fmtDate(x.top.at, 'sec') : '', x.second ? x.second.amount : '', x.second ? x.second.label : '', x.hidden ? '숨김' : '공개'])));
    $('#csvAll').onclick = async () => {
      const r = await call('admin.dump'); if (!r.ok) { toast(r.error, 'bad'); return; }
      const items = {}; r.items.forEach(x => items[x.id] = x); const labels = {}; r.codes.forEach(x => labels[x.id] = x.label);
      MK.downloadCSV('kird-market_all-bids_' + new Date().toISOString().slice(0, 10) + '.csv', [['상품 번호', '상품', '참가자 번호', '참가자', '금액', '입찰 시각', '상태']].concat(r.bids.sort((a, b) => a.created_at - b.created_at).map(b => [items[b.item_id] ? items[b.item_id].no : '', items[b.item_id] ? items[b.item_id].name : '', '#' + b.code_id, labels[b.code_id] || '', b.amount, fmtDate(b.created_at, 'sec'), b.active ? '현재' : '바뀜/취소'])));
    };
  }
  const bidsDlg = $('#bidsDlg');
  async function openBids(id) {
    const it = S.st.items.find(x => x.id === id); if (!it) return;
    bidsDlg.innerHTML = '<button class="dlg-x" data-x aria-label="닫기">' + ic('x', 18, 2.2) + '</button><div class="cd"><h2 id="bdT">No.' + it.no + ' ' + esc(it.name) + '</h2><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">' + modeBadge(it.mode_resolved, it.mode !== 'auto') + '<span style="color:var(--mute);font-size:13.5px">최소 ' + won(it.min_price) + ' · 입찰 ' + it.count + '명</span></div><div class="list" id="bdList"><div class="empty"><span class="spin dark" style="margin:0 auto"></span></div></div><p style="margin:0;font-size:12.5px;color:var(--mute)">같은 금액이면 먼저 낸 사람이 앞서요. 흐린 줄은 금액을 바꾸기 전 기록이에요.</p></div>';
    bidsDlg.querySelector('[data-x]').onclick = () => bidsDlg.close();
    bidsDlg.showModal();
    const r = await call('admin.bids', { itemId: id });
    if (!r.ok) { $('#bdList').innerHTML = '<div class="empty">' + esc(r.error) + '</div>'; return; }
    $('#bdList').innerHTML = r.bids.length ? '<table class="tbl"><thead><tr><th>순위</th><th>참가자</th><th class="r">금액</th><th>시각</th></tr></thead><tbody>' + r.bids.sort((a, b) => (b.active - a.active) || (a.rank - b.rank) || (b.at - a.at)).map(b => '<tr' + (b.active ? '' : ' class="hid"') + '><td>' + (b.active ? (b.rank === 1 ? '<span class="badge ok">' + ic('trophy', 12, 2.4) + '1위</span>' : b.rank + '위') : '<span style="font-size:12px">이전</span>') + '</td><td>' + who(b) + '</td><td class="r num' + (b.rank === 1 ? ' lead-c' : '') + '">' + won(b.amount) + '</td><td>' + esc(fmtDate(b.at, 'sec')) + '</td></tr>').join('') + '</tbody></table>' : '<div class="empty">아직 입찰이 없어요.</div>';
  }

  /* ── 설정 ── */
  function guideSection(s) {
    const box = (k, id, label, rows) => '<div class="field"><div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap"><label for="' + id + '" class="lbl">' + label + '</label><span data-tag="' + k + '" style="display:inline-flex;gap:6px;align-items:center"></span></div><textarea class="inp" id="' + id + '" data-k="' + k + '" data-guide="' + k + '" rows="' + rows + '" maxlength="2000">' + esc(s[k] || '') + '</textarea></div>';
    return '<div class="set" id="guideSet"><div class="t"><h3>직원 화면 안내 문구</h3><p>직원 첫 화면의 「참여 방법」과 규칙 설명을 직접 고칠 수 있어요. 줄을 바꾸면 화면에서도 줄이 바뀌어요.<br><br>손대지 않은 칸은 위 설정(단위·재입찰 등)에 맞춰 <b>자동으로</b> 만들어져요. 고친 칸은 쓴 그대로 보여요.</p></div><div class="f">' +
      box('steps', 'gSteps', '참여 방법 <span style="font-weight:500;color:var(--mute)">(한 줄에 한 단계)</span>', 4) +
      box('rules_common', 'gCommon', '공통 규칙', 3) +
      box('rules_comp', 'gComp', '경쟁입찰 설명 <span style="font-weight:500;color:var(--mute)">(최소가 ' + won(s.competitive_min) + ' 이상)</span>', 3) +
      box('rules_sealed', 'gSealed', '일반입찰 설명 <span style="font-weight:500;color:var(--mute)">(최소가 ' + won(s.competitive_min) + ' 미만)</span>', 3) +
      '<div class="preview" id="prev"></div></div></div>';
  }
  function rSettings(c) {
    const s = Object.assign({}, S.st.settings, S.dirty);
    const radio = (k, opts) => '<div class="opts">' + opts.map(([v, b, d]) => '<label class="opt"><input type="radio" name="' + k + '" value="' + v + '"' + (String(s[k]) === String(v) ? ' checked' : '') + '><b>' + b + '</b><span>' + d + '</span></label>').join('') + '</div>';
    const sw = (k, b, d) => '<div class="swrow"><div><b>' + b + '</b><span class="d">' + d + '</span></div><label class="sw"><input type="checkbox" data-k="' + k + '"' + (s[k] ? ' checked' : '') + '><span class="tr"></span><span class="sr">' + b + '</span></label></div>';
    const n = Object.keys(S.dirty).length;
    c.innerHTML = '<div class="panel">' +
      '<div class="set"><div class="t"><h3>행사 정보</h3><p>직원 화면 맨 위에 보여요.</p></div><div class="f"><div class="field"><label for="sTitle">행사 이름</label><input class="inp" id="sTitle" data-k="title" maxlength="60" value="' + esc(s.title) + '"></div><div class="field"><label for="sNotice">안내 문구</label><textarea class="inp" id="sNotice" data-k="notice" rows="3" maxlength="600">' + esc(s.notice) + '</textarea><span class="help">수익금 사용처, 물건 받는 방법·장소 등을 적어 주세요.</span></div></div></div>' +
      '<div class="set"><div class="t"><h3>일정</h3><p>시작 전에는 상품만 둘러볼 수 있고, 마감 시각이 지나면 입찰이 자동으로 막혀요.</p></div><div class="f"><div class="row2"><div class="field"><label for="sOpen">입찰 시작</label><input class="inp" id="sOpen" type="datetime-local" data-k="open_at" data-dt value="' + esc(toDT(s.open_at)) + '"><span class="help">비우면 바로 시작</span></div><div class="field"><label for="sClose">입찰 마감</label><input class="inp" id="sClose" type="datetime-local" data-k="close_at" data-dt value="' + esc(toDT(s.close_at)) + '"><span class="help">비우면 「지금 마감」을 누를 때까지 계속</span></div></div>' +
      '<div class="danger-zone">' + (S.st.settings.ended ? '<button class="btn" id="unEnd">' + ic('play', 15, 2.2) + '마감 해제 (다시 열기)</button><span class="badge mute" style="align-self:center">지금 마감 상태예요</span>' : '<button class="btn danger" id="endNow">' + ic('clock', 15, 2.2) + '지금 전체 마감</button>') + '</div></div></div>' +
      '<div class="set"><div class="t"><h3>입찰 방식 기준</h3><p>최소가가 기준 금액 이상이면 경쟁입찰, 미만이면 일반입찰이에요. 상품마다 따로 지정할 수도 있어요.</p></div><div class="f"><div class="row2"><div class="field"><label for="sCm">경쟁입찰 기준 (최소가)</label><input class="inp num" id="sCm" data-k="competitive_min" data-num inputmode="numeric" value="' + num(s.competitive_min) + '"><span class="help">이 금액 이상 → 경쟁입찰</span></div><div class="field"><label for="sUnit">입찰 단위</label><select class="inp" id="sUnit" data-k="unit" data-num>' + [100, 500, 1000, 5000, 10000].map(u => '<option value="' + u + '"' + (Number(s.unit) === u ? ' selected' : '') + '>' + won(u) + ' 단위' + (u === 100 ? ' (십원 단위 절사)' : u === 1000 ? ' (백원 단위 절사)' : '') + '</option>').join('') + '</select><span class="help">이 단위 미만은 버리고 접수돼요</span></div></div></div></div>' +
      '<div class="set"><div class="t"><h3>경쟁입찰 규칙</h3><p>현재 최고가가 공개되는 상품이에요.</p></div><div class="f"><div><div class="lbl" style="margin-bottom:8px">재입찰</div>' + radio('comp_rebid', [['raise', '최고가보다 높게 계속 가능', '누가 더 높게 내면 다시 올려 낼 수 있어요 (보통 경매)'], ['none', '한 번만', '한 사람당 한 번만 입찰할 수 있어요']]) + '</div>' +
      '<div class="row2"><div class="field"><label for="sStep">최고가보다 최소 얼마 더</label><input class="inp num" id="sStep" data-k="comp_step" data-num inputmode="numeric" value="' + num(s.comp_step) + '"><span class="help">입찰 단위보다 작으면 입찰 단위로 계산</span></div><div class="field"><label for="sExt">마감 직전 자동 연장</label><select class="inp" id="sExt" data-k="extend_min" data-num>' + [[0, '안 함'], [3, '3분'], [5, '5분'], [10, '10분']].map(([v, t]) => '<option value="' + v + '"' + (Number(s.extend_min) === v ? ' selected' : '') + '>' + t + '</option>').join('') + '</select><span class="help">마감 N분 전 입찰이 들어오면 그 상품만 N분 연장 (막판 눈치싸움 방지)</span></div></div>' +
      sw('show_leading', '「내가 최고가」 표시', '입찰한 사람에게 지금 1위인지 알려 줘요 (누가 1위인지는 안 보여요)') + '</div></div>' +
      '<div class="set"><div class="t"><h3>일반입찰 규칙</h3><p>다른 사람 금액이 보이지 않는 상품이에요.</p></div><div class="f"><div><div class="lbl" style="margin-bottom:8px">재입찰</div>' + radio('sealed_rebid', [['replace', '금액 바꾸기 (낮춰도 됨)', '마감 전까지 새 금액으로 교체 — 담당자 설명 기준'], ['raise', '올리기만', '다시 낼 땐 내 이전 금액보다 높게만'], ['none', '한 번만', '한 번 내면 못 바꿔요']]) + '</div>' +
      sw('allow_cancel', '입찰 취소 허용', '마감 전에 자기 입찰을 취소할 수 있어요') + '</div></div>' +
      '<div class="set"><div class="t"><h3>직원 화면 표시</h3><p>누가 입찰했는지는 어떤 설정에서도 공개되지 않아요.</p></div><div class="f"><div><div class="lbl" style="margin-bottom:8px">입찰 인원 표시</div>' + radio('show_count', [['none', '안 보여 줌', '몇 명이 입찰했는지 숨겨요'], ['comp', '경쟁입찰만', '경쟁입찰 상품에만 「n명 입찰」'], ['all', '모두', '일반입찰도 입찰 수는 보여요 — 금액은 비공개']]) + '</div>' +
      sw('results_public', '마감 후 낙찰 여부 보여 주기', '각자 자기 결과(낙찰/미낙찰)만 봐요') + '</div></div>' +
      guideSection(s) +
      '<div class="set"><div class="t"><h3>백업</h3><p>상품·참가 코드·입찰 전부를 파일로 받아요 (참가 코드가 들어 있으니 잘 보관하세요). 행사 끝나면 꼭 받아 두세요.</p></div><div class="f"><div class="danger-zone"><button class="btn" id="dump">' + ic('download', 16) + '전체 백업 (JSON)</button>' + (DEMO ? '<button class="btn danger" id="demoReset">' + ic('refresh', 16) + '데모 초기화</button>' : '') + '</div></div></div>' +
      '</div>' + (n ? '<div class="savebar"><span>' + ic('edit', 16) + ' 바꾼 설정 ' + n + '개</span><button class="btn ghost" id="undo" style="color:#fff;margin-left:auto">되돌리기</button><button class="btn primary" id="save" style="margin-left:0">' + ic('check', 16, 2.4) + '저장</button></div>' : '');
    const prev = () => {
      const x = Object.assign({}, S.st.info, S.st.settings, S.dirty), r = MK.rulesText(x), auto = MK.rulesText(x, true);
      $('#prev').innerHTML = '<span class="h">직원 화면에 이렇게 보여요</span><p><b>참여 방법</b> — ' + MK.stepsOf(x).map((t, k) => (k + 1) + ' ' + esc(t)).join(' · ') + '</p><p><b>공통 규칙</b><br>' + esc(r.p).replace(/\n/g, '<br>') + '</p><p><b>경쟁입찰</b> (최소가 ' + won(x.competitive_min) + ' 이상)<br>' + esc(r.c).replace(/\n/g, '<br>') + '</p><p><b>일반입찰</b> (최소가 ' + won(x.competitive_min) + ' 미만)<br>' + esc(r.s).replace(/\n/g, '<br>') + '</p>';
      // 비어 있는 칸은 지금 설정으로 만든 자동 문장을 보여 준다
      [['rules_common', auto.p], ['rules_comp', auto.c], ['rules_sealed', auto.s], ['steps', MK.STEPS.join('\n')]].forEach(([k, a]) => {
        const el = document.querySelector('[data-guide="' + k + '"]'); if (!el) return;
        const own = String(x[k] || '').trim(); if (!own && document.activeElement !== el) el.value = a;
        el.dataset.auto = a;
        const tag = document.querySelector('[data-tag="' + k + '"]'); if (tag) tag.innerHTML = own ? '<span class="badge comp">직접 쓴 문장</span> <button type="button" class="btn sm ghost" data-reset="' + k + '">' + ic('refresh', 13) + '자동 문장으로</button>' : '<span class="badge mute">자동 — 위 설정을 바꾸면 따라 바뀜</span>';
      });
      $$('[data-reset]', c).forEach(b => b.onclick = () => { const el = document.querySelector('[data-guide="' + b.dataset.reset + '"]'); el.value = ''; mark(b.dataset.reset, ''); });
    };
    prev();
    const mark = (k, v) => {
      if (String(S.st.settings[k]) === String(v)) delete S.dirty[k]; else S.dirty[k] = v; const had = !!$('.savebar');
      if (had !== !!Object.keys(S.dirty).length) { // 저장 막대가 생기거나 사라질 때 다시 그리되, 쓰던 칸의 커서는 그대로
        const ae = document.activeElement, fid = ae && ae.id; let sel = null; try { sel = [ae.selectionStart, ae.selectionEnd]; } catch (e) { }
        const y = window.scrollY; rSettings(c); fill(c); window.scrollTo(0, y);
        if (fid) { const el = document.getElementById(fid); if (el) { el.focus({ preventScroll: true }); try { el.setSelectionRange(sel[0], sel[1]); } catch (e) { } } }
        return;
      } const bar = $('.savebar span'); if (bar) bar.innerHTML = ic('edit', 16) + ' 바꾼 설정 ' + Object.keys(S.dirty).length + '개'; prev(); };
    $$('[data-k]', c).forEach(el => {
      const k = el.dataset.k;
      const val = () => el.hasAttribute('data-guide') ? (el.value.trim() === String(el.dataset.auto || '').trim() ? '' : el.value) : el.type === 'checkbox' ? el.checked : el.hasAttribute('data-dt') ? fromDT(el.value) : el.hasAttribute('data-num') ? Number(String(el.value).replace(/[^\d]/g, '')) || 0 : el.value;
      el.addEventListener(el.tagName === 'SELECT' || el.type === 'checkbox' || el.type === 'datetime-local' ? 'change' : 'input', () => { if (el.hasAttribute('data-num') && el.tagName === 'INPUT') { const v = String(el.value).replace(/[^\d]/g, ''); el.value = v ? num(v) : ''; } mark(k, val()); });
    });
    $$('input[type=radio]', c).forEach(el => el.onchange = () => mark(el.name, el.value));
    const save = $('#save'); if (save) save.onclick = async () => {
      if ('close_at' in S.dirty && S.dirty.close_at && S.dirty.close_at < now() && !confirm('마감 시각이 이미 지났어요. 저장하면 바로 마감돼요. 계속할까요?')) return;
      save.disabled = true; save.innerHTML = '<span class="spin"></span>저장 중…';
      const r = await call('admin.saveSettings', { settings: S.dirty });
      if (!r.ok) { save.disabled = false; save.innerHTML = '저장'; toast(r.error, 'bad'); return; }
      S.dirty = {}; toast('저장했어요. 직원 화면에 바로 적용돼요.', 'ok'); load('settings');
    };
    const undo = $('#undo'); if (undo) undo.onclick = () => { S.dirty = {}; rSettings(c); fill(c); };
    const end = $('#endNow'); if (end) end.onclick = async () => {
      if (!confirm('지금 전체 입찰을 마감할까요? 직원들은 더 이상 입찰할 수 없어요. (마감 해제로 되돌릴 수 있어요)')) return;
      const r = await call('admin.saveSettings', { settings: { ended: true } }); if (r.ok) { toast('전체 마감했어요.', 'ok'); load('settings'); } else toast(r.error, 'bad');
    };
    const un = $('#unEnd'); if (un) un.onclick = async () => { const r = await call('admin.saveSettings', { settings: { ended: false } }); if (r.ok) { toast('다시 열었어요. 마감 시각을 확인해 주세요.', 'ok'); load('settings'); } else toast(r.error, 'bad'); };
    $('#dump').onclick = async () => { const r = await call('admin.dump'); if (r.ok) { delete r.ok; MK.downloadJSON('kird-market_backup_' + new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-') + '.json', r); toast('백업 파일을 받았어요.', 'ok'); } else toast(r.error, 'bad'); };
    const dr = $('#demoReset'); if (dr) dr.onclick = () => { if (confirm('데모 데이터를 처음 상태로 되돌릴까요?')) { MK.resetDemo(); location.reload(); } };
  }

  /* ── 기록 ── */
  function rLogs(c) {
    const L = S.logs || [];
    c.innerHTML = '<div class="panel"><div class="ph"><h2>최근 기록 ' + L.length + '건</h2><div class="x"><button class="btn sm" id="logCsv">' + ic('download', 15) + 'CSV</button></div></div><div class="scroll">' + (L.length ? '<table class="tbl"><thead><tr><th>시각</th><th>누가</th><th>무엇을</th><th>내용</th></tr></thead><tbody>' + L.map(l => '<tr><td style="white-space:nowrap">' + esc(fmtDate(l.at, 'sec')) + '</td><td>' + (l.actor === '관리자' ? '<span class="badge mute">관리자</span>' : '<span class="who">참가자 <small>' + esc(l.actor) + '</small></span>') + '</td><td><b>' + esc(l.action) + '</b></td><td class="log-d">' + esc(logDetail(Object.assign({}, l, { actor: '관리자' }))) + '</td></tr>').join('') + '</tbody></table>' : '<div class="empty">기록이 없어요.</div>') + '</div></div>';
    $('#logCsv').onclick = () => MK.downloadCSV('kird-market_log.csv', [['시각', '누가', '무엇을', '내용']].concat(L.map(l => [fmtDate(l.at, 'sec'), l.actor, l.action, logDetail(Object.assign({}, l, { actor: '관리자' }))])));
  }

  /* ── 시작 ── */
  function start() { $('#gate').hidden = true; $('#app').hidden = false; const h = location.hash.slice(1); go(PAGES[h] ? h : 'dash'); }
  window.addEventListener('beforeunload', e => { if (Object.keys(S.dirty).length) { e.preventDefault(); e.returnValue = ''; } });
  if (S.tok) start(); else showGate();
  window.__mka = S;
})();
