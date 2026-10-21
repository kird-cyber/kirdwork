/* 시안 J · 나눔 시세판 — 증권 앱 문법. 최고가 흐름 그래프, 금액 사다리, 시세 지도(트리맵). 빨강 = 오름(국내 관례) */
window.THEME = (function () {
  const W = window;
  let sel = 0;
  const wide = () => W.matchMedia('(min-width: 1101px)').matches;
  const ns = 'http://www.w3.org/2000/svg';
  const kfmt = n => (Math.round(n / 100) * 100).toLocaleString('ko-KR');

  // 최고가 계단선 점들: [시각, 금액]
  function series(v, x) {
    const tr = x.trendOf(v.id), i = x.S.info, t0 = i.open_at || (tr && tr.pts[0] ? tr.pts[0][0] : x.now() - 864e5), t = x.now();
    const start = v.min_price, pts = [[t0, start]];
    (tr ? tr.pts : []).forEach(p => pts.push([Math.max(p[0], t0), p[1]]));
    const last = pts[pts.length - 1][1]; pts.push([t, last]);
    const close = i.close_at || t, view = Math.min(Math.max(close, t), t + Math.max((t - t0) * 0.35, 3600e3));
    return { pts, start, t0, t1: view, close, now: t, bids: tr ? tr.pts.length : 0 };
  }
  function spark(v, x, w, h) {
    w = w || 96; h = h || 34;
    if (v.mode !== 'comp') return '<svg class="spk" viewBox="0 0 ' + w + ' ' + h + '" aria-hidden="true"><path d="M2 ' + h / 2 + 'H' + (w - 2) + '" stroke="#C9C1EE" stroke-width="2" stroke-dasharray="3 4" fill="none"/></svg>';
    const s = series(v, x), lo = s.start * 0.985, hi = Math.max(...s.pts.map(p => p[1])) * 1.01 || 1;
    const X = tt => 2 + (tt - s.t0) / Math.max(1, s.now - s.t0) * (w - 6), Y = a => h - 4 - (a - lo) / Math.max(1, hi - lo) * (h - 8);
    let d = 'M' + X(s.pts[0][0]).toFixed(1) + ' ' + Y(s.pts[0][1]).toFixed(1);
    for (let k = 1; k < s.pts.length; k++) d += 'H' + X(s.pts[k][0]).toFixed(1) + 'V' + Y(s.pts[k][1]).toFixed(1);
    const c = s.bids ? '#E5383B' : '#94A1B4', L = s.pts[s.pts.length - 1];
    return '<svg class="spk" viewBox="0 0 ' + w + ' ' + h + '" aria-hidden="true"><path d="' + d + '" stroke="' + c + '" stroke-width="2" fill="none" stroke-linejoin="round"/><circle cx="' + X(L[0]).toFixed(1) + '" cy="' + Y(L[1]).toFixed(1) + '" r="2.6" fill="' + c + '"/></svg>';
  }
  function chart(v, x, W0, H0) {
    const s = series(v, x), cur = s.pts[s.pts.length - 1][1], mine = v.mine ? v.mine.amount : 0;
    const vals = s.pts.map(p => p[1]).concat(mine ? [mine] : []);
    let lo = Math.min(...vals), hi = Math.max(...vals); const pad = Math.max((hi - lo) * 0.25, s.start * 0.04, 1000); lo = Math.max(0, lo - pad); hi = hi + pad;
    const L = 64, R = 18, T = 18, B = 32, small = W0 < 520;
    const X = tt => L + (tt - s.t0) / Math.max(1, s.t1 - s.t0) * (W0 - L - R), Y = a => T + (hi - a) / (hi - lo) * (H0 - T - B);
    const span = hi - lo, step = [500, 1000, 2000, 5000, 10000, 20000, 50000].find(k => span / k <= 5) || 100000;
    let g = '';
    for (let a = Math.ceil(lo / step) * step; a < hi; a += step) g += '<line x1="' + L + '" x2="' + (W0 - R) + '" y1="' + Y(a).toFixed(1) + '" y2="' + Y(a).toFixed(1) + '" stroke="#E3E8EF"/><text x="' + (L - 8) + '" y="' + (Y(a) + 4).toFixed(1) + '" text-anchor="end" font-size="11.5" fill="#94A1B4" font-weight="600">' + kfmt(a) + '</text>';
    const day = tt => { const d = new Date(tt); return (d.getMonth() + 1) + '.' + d.getDate(); };
    const endLab = s.close > s.t1 ? '마감까지 ' + x.left(s.close - s.now) + ' →' : '마감';
    const ticks = small ? [[s.t0, day(s.t0) + ' 시작', 'start'], [s.t1, endLab, 'end']] : [[s.t0, day(s.t0) + ' 시작', 'start'], [s.t1, endLab, 'end']];
    ticks.forEach(k => { g += '<text x="' + X(k[0]).toFixed(1) + '" y="' + (H0 - 10) + '" text-anchor="' + k[2] + '" font-size="11.5" fill="#94A1B4" font-weight="600">' + k[1] + '</text>'; });
    let d = 'M' + X(s.pts[0][0]).toFixed(1) + ' ' + Y(s.pts[0][1]).toFixed(1);
    for (let k = 1; k < s.pts.length; k++) d += 'H' + X(s.pts[k][0]).toFixed(1) + 'V' + Y(s.pts[k][1]).toFixed(1);
    const area = d + 'V' + (H0 - B) + 'H' + X(s.pts[0][0]).toFixed(1) + 'Z';
    let o = '<svg class="chart" viewBox="0 0 ' + W0 + ' ' + H0 + '" role="img" aria-label="' + x.esc(v.name) + ' 최고가 흐름: 시작가 ' + x.won(s.start) + ', 지금 ' + x.won(cur) + '"><defs><linearGradient id="ga' + v.id + '" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#E5383B" stop-opacity=".16"/><stop offset="1" stop-color="#E5383B" stop-opacity="0"/></linearGradient></defs>' + g;
    o += '<rect x="' + X(s.now).toFixed(1) + '" y="' + T + '" width="' + Math.max(0, X(s.t1) - X(s.now)).toFixed(1) + '" height="' + (H0 - T - B) + '" fill="#F5F7FA"/><text x="' + (X(s.now) + 6).toFixed(1) + '" y="' + (T + 14) + '" font-size="11.5" fill="#94A1B4" font-weight="700">지금</text>';
    o += '<line x1="' + L + '" x2="' + (W0 - R) + '" y1="' + Y(s.start).toFixed(1) + '" y2="' + Y(s.start).toFixed(1) + '" stroke="#1E5EFF" stroke-dasharray="4 4"/><text x="' + (L + 6) + '" y="' + (Y(s.start) + 16).toFixed(1) + '" text-anchor="start" font-size="11.5" fill="#1E5EFF" font-weight="700">시작가 ' + kfmt(s.start) + '</text>';
    if (s.bids) o += '<path d="' + area + '" fill="url(#ga' + v.id + ')"/>';
    o += '<path d="' + d + '" stroke="' + (s.bids ? '#E5383B' : '#94A1B4') + '" stroke-width="2.5" fill="none"/>';
    if (mine && mine !== cur) o += '<line x1="' + L + '" x2="' + (W0 - R) + '" y1="' + Y(mine).toFixed(1) + '" y2="' + Y(mine).toFixed(1) + '" stroke="#FFB020" stroke-width="2"/><rect x="' + (W0 - R - 108) + '" y="' + (Y(mine) - 11).toFixed(1) + '" width="104" height="22" rx="6" fill="#FFB020"/><text x="' + (W0 - R - 56) + '" y="' + (Y(mine) + 4).toFixed(1) + '" text-anchor="middle" font-size="12" fill="#13294B" font-weight="800">내 입찰 ' + kfmt(mine) + '</text>';
    s.pts.slice(1, -1).forEach(p => { o += '<circle cx="' + X(p[0]).toFixed(1) + '" cy="' + Y(p[1]).toFixed(1) + '" r="4.5" fill="#fff" stroke="' + (mine === p[1] ? '#FFB020' : '#E5383B') + '" stroke-width="2.5"/>'; });
    o += '<circle cx="' + X(s.now).toFixed(1) + '" cy="' + Y(cur).toFixed(1) + '" r="11" fill="#E5383B" opacity=".16"/><circle cx="' + X(s.now).toFixed(1) + '" cy="' + Y(cur).toFixed(1) + '" r="5.5" fill="' + (s.bids ? '#E5383B' : '#94A1B4') + '"/></svg>';
    return o;
  }
  function chg(v, x) { if (v.mode !== 'comp' || !v.top) return ''; const d = v.top - v.min_price; return d > 0 ? '▲ ' + x.num(d) + ' (+' + (d / v.min_price * 100).toFixed(1) + '%)' : ''; }
  function evlist(v, x) {
    const tr = x.trendOf(v.id); if (!tr || !tr.pts.length) return '<div class="ev"><div class="h">최고가 기록<small>아직 입찰이 없어요</small></div></div>';
    const mineAmt = v.mine ? v.mine.amount : -1;
    return '<div class="ev"><div class="h">최고가 기록<small>누가 냈는지는 공개되지 않아요</small></div>' + tr.pts.slice().reverse().slice(0, 6).map(p => '<div class="evr' + (p[1] === mineAmt ? ' mine' : '') + '"><span class="num">' + x.esc(x.fmtDate(p[0])) + '</span><span class="who">' + (p[1] === mineAmt ? '내 입찰' : '최고가 갱신') + '</span><span class="num">' + x.won(p[1]) + '</span></div>').join('') + '</div>';
  }
  function tg(v) { return v.mode === 'comp' ? '<span class="tgJ c">경쟁</span>' : '<span class="tgJ s">일반</span>'; }
  function vault(v, x) { return '<div class="vault">' + x.ic('lock', 26, 2.2) + '<span>다른 사람 금액' + (v.count !== undefined ? '' : '·입찰 수') + ' 비공개</span><small>마감 ' + x.esc(x.fmtDate(v.close_at || x.S.info.close_at)) + '에 열려요</small></div>'; }

  function renderCenter(x) {
    const el = document.getElementById('jcenter'), side = document.getElementById('jside'); if (!el) return;
    const v = x.S.items.find(i => i.id === sel) || x.S.items.slice().sort((a, b) => a.no - b.no)[0]; if (!v) { el.innerHTML = ''; side.innerHTML = ''; return; }
    sel = v.id;
    const head = '<div class="t1"><span class="ph">' + x.thumb(v) + '</span><div class="tx"><div class="meta">' + tg(v) + '<span>No.' + v.no + (v.count !== undefined ? ' · ' + v.count + '명 입찰' : '') + '</span></div><h2>' + x.esc(v.name) + '</h2><div class="meta">' + (v.mode === 'comp' ? '시작가 ' + x.won(v.min_price) : '최소 입찰가 ' + x.won(v.min_price)) + ' · ' + x.won(x.S.info.unit) + ' 단위</div></div>' +
      '<div class="px">' + (v.mode === 'comp' ? '<b class="num ' + (v.top ? 'up' : '') + '" data-top="' + v.id + '">' + x.num(v.top || v.min_price) + '</b><small class="up">' + (chg(v, x) || '입찰 없음') + '</small>' : '<b class="num sl">봉인</b><small class="sl">마감까지 비공개</small>') + '</div></div>';
    const body = v.mode === 'comp'
      ? '<div class="legend"><span><i style="background:#E5383B"></i>최고가</span><span><i style="background:#FFB020"></i>내 입찰</span><span><i style="background:#1E5EFF"></i>시작가</span></div>' + chart(v, x, 600, 300) + evlist(v, x)
      : vault(v, x) + '<div class="hint2">' + x.ic('info', 15, 2) + '일반입찰은 금액을 봉투에 넣듯 숨겨요. 마감 때 가장 높은 금액이 낙찰돼요.</div>';
    el.innerHTML = head + body + '<button class="btn lg block go ' + (v.mode === 'comp' ? 'comp' : 'seal') + '" data-open="' + v.id + '">' + (v.closed ? '결과 보기' : v.mine ? '다시 입찰하기' : '입찰하기') + '</button>';
    // 오른쪽: 내 입찰 + 규칙
    const st = x.statusOf(v), r = x.rulesText(x.S.info);
    let pos = '';
    if (!x.S.tok) pos = '<div class="pos"><p class="mu">참가 코드를 넣으면 이 상품의 내 입찰이 여기 보여요.</p><button class="btn primary block" data-login>' + x.ic('key', 16, 2.1) + '참가 코드 입력</button></div>';
    else if (!v.mine) pos = '<div class="pos"><p class="mu">이 상품에는 아직 입찰하지 않았어요.</p><div class="r"><span>입찰 가능 금액</span><b class="num">' + x.won(v.next_min) + ' 이상</b></div></div>';
    else {
      const al = { out: '<div class="alert out">' + x.ic('alert', 17, 2.4) + '<span>더 높은 입찰이 있어요. 내 ' + x.won(v.mine.amount) + '보다 ' + x.won((v.top || 0) - v.mine.amount) + ' 높아요.</span></div>', lead: '<div class="alert lead">' + x.ic('check', 17, 2.6) + '<span>지금 내가 최고가예요.</span></div>', seal: '<div class="alert seal">' + x.ic('lock', 17, 2.4) + '<span>' + (v.mode === 'comp' ? '입찰했어요.' : '봉인해서 입찰했어요. 결과는 마감 후.') + '</span></div>', win: '<div class="alert lead">' + x.ic('trophy', 17, 2.4) + '<span>낙찰됐어요!</span></div>', lose: '<div class="alert seal">' + x.ic('info', 17, 2.2) + '<span>낙찰되지 않았어요.</span></div>' }[st] || '';
      pos = al + '<div class="pos"><div class="r"><span>내 입찰</span><b class="num">' + x.won(v.mine.amount) + '</b></div>' + (v.mode === 'comp' ? '<div class="r"><span>현재 최고가</span><b class="num up">' + x.won(v.top) + '</b></div>' : '') + (v.closed ? '' : '<div class="r"><span>다시 입찰하려면</span><b class="num">' + x.won(v.next_min) + ' 이상</b></div>') + '</div>';
    }
    side.innerHTML = '<div class="h">내 입찰 <span class="tag"><i class="mk"></i>No.' + v.no + '</span></div>' + pos +
      '<div class="rules2"><div><span class="ri c">' + x.ic('trend', 14, 2.4) + '</span><span><b>경쟁입찰 · 최소가 ' + x.won(x.S.info.competitive_min) + ' 이상</b>' + x.esc(r.c) + '</span></div><div><span class="ri s">' + x.ic('lock', 14, 2.4) + '</span><span><b>일반입찰 · 최소가 ' + x.won(x.S.info.competitive_min) + ' 미만</b>' + x.esc(r.s) + '</span></div><div><span class="ri">' + x.ic('check', 14, 2.4) + '</span><span><b>공통</b>' + x.esc(r.p) + '</span></div></div>';
  }

  // 정사각형에 가깝게 나누는 트리맵
  function squarify(items, x0, y0, w, h) {
    const out = [], total = items.reduce((a, b) => a + b.w, 0); if (!total) return out;
    const k = w * h / total; let rest = items.map(i => Object.assign({}, i, { a: i.w * k })).sort((p, q) => q.a - p.a);
    let X = x0, Y = y0, Wd = w, Hd = h;
    const worst = (row, s) => { const sum = row.reduce((a, b) => a + b.a, 0), mx = Math.max(...row.map(r => r.a)), mn = Math.min(...row.map(r => r.a)); return Math.max(s * s * mx / (sum * sum), sum * sum / (s * s * mn)); };
    while (rest.length) {
      const side = Math.min(Wd, Hd); let row = [rest[0]], k2 = 1;
      while (k2 < rest.length && worst(row.concat(rest[k2]), side) <= worst(row, side)) { row.push(rest[k2]); k2++; }
      rest = rest.slice(k2);
      const sum = row.reduce((a, b) => a + b.a, 0);
      if (Wd >= Hd) { const cw = sum / Hd; let yy = Y; row.forEach(r => { const ch = r.a / cw; out.push(Object.assign(r, { x: X, y: yy, w2: cw, h2: ch })); yy += ch; }); X += cw; Wd -= cw; }
      else { const ch = sum / Wd; let xx = X; row.forEach(r => { const cw = r.a / ch; out.push(Object.assign(r, { x: xx, y: Y, w2: cw, h2: ch })); xx += cw; }); Y += ch; Hd -= ch; }
    }
    return out;
  }
  function treemap(x, Wt, Ht) {
    const it = x.S.items.map(v => ({ v, w: v.mode === 'comp' ? (v.top || v.min_price) : v.min_price }));
    return squarify(it, 0, 0, Wt, Ht).map(c => {
      const v = c.v, st = x.statusOf(v);
      const cls = { lead: 'c-lead', win: 'c-lead', out: 'c-out', seal: v.mode === 'comp' ? 'c-none' : 'c-sealm', lose: 'c-none' }[st] || (v.mode === 'comp' ? (v.count ? 'c-hot' : 'c-none') : 'c-seal');
      const lab = { lead: '내가 최고가', win: '낙찰', out: '밀렸어요 · 내 ' + x.num(v.mine && v.mine.amount), seal: '내 입찰 ' + x.num(v.mine && v.mine.amount), lose: '미낙찰' }[st] || (v.mode === 'comp' ? (v.count ? v.count + '명 입찰' : '입찰 없음') : '최소 ' + x.num(v.min_price));
      const val = v.mode === 'comp' ? x.num(v.top || v.min_price) : '봉인';
      const big = c.w2 > 150 && c.h2 > 120, mid = c.w2 > 84 && c.h2 > 64;
      return '<button class="cell ' + cls + '" data-open="' + v.id + '" style="left:' + (c.x / Wt * 100).toFixed(3) + '%;top:' + (c.y / Ht * 100).toFixed(3) + '%;width:' + (c.w2 / Wt * 100).toFixed(3) + '%;height:' + (c.h2 / Ht * 100).toFixed(3) + '%" title="' + x.esc(v.name) + '"><span class="ct">' + (mid ? '<b>' + x.esc(v.name) + '</b><small>' + x.esc(lab) + '</small>' : '<b>No.' + v.no + '</b>') + '</span>' + (mid ? '<span class="v num">' + val + '</span>' : '') + (big && v.photos[0] ? '<img src="' + x.esc(v.photos[0]) + '" alt="" referrerpolicy="no-referrer">' : '') + '</button>';
    }).join('');
  }

  return {
    wantsTrend: true,
    title: t => MK.esc(t),
    step: (t, k) => '<span class="step"><b>' + (k + 1) + '</b>' + MK.esc(t) + '</span>',
    rules(i, r, x) {
      return '<div><b>경쟁입찰 <small>최소가 ' + x.won(i.competitive_min) + ' 이상</small></b><p>' + x.esc(r.c) + '</p></div><div><b>일반입찰 <small>최소가 ' + x.won(i.competitive_min) + ' 미만</small></b><p>' + x.esc(r.s) + '</p></div><div><b>공통</b><p>' + x.esc(r.p) + '</p></div>';
    },
    afterHero(x) {
      const i = x.S.info, items = x.S.items, t = x.now();
      const comp = items.filter(v => v.mode === 'comp'), sum = comp.reduce((a, v) => a + (v.top || 0), 0);
      let up3 = 0; comp.forEach(v => { const tr = x.trendOf(v.id); if (!tr || !tr.pts.length) return; const before = tr.pts.filter(p => p[0] <= t - 3 * 3600e3); const prev = before.length ? before[before.length - 1][1] : 0; up3 += (v.top || 0) - prev; });
      const p = x.phaseText();
      const live = comp.filter(v => v.count).length;
      document.getElementById('idx').innerHTML =
        '<div class="big"><span>경쟁입찰 최고가 합계</span><b class="num">' + x.won(sum) + '</b>' + (up3 > 0 ? '<em class="up">▲ ' + x.num(up3) + ' · 최근 3시간</em>' : '') + '</div>' +
        '<div><span>' + x.esc(p.lab) + '</span><b class="num">' + x.esc(p.big) + '</b></div>' +
        '<div><span>입찰 들어온 경쟁 상품</span><b class="num">' + live + ' / ' + comp.length + '</b></div>' +
        '<div><span>일반입찰</span><b class="num sl">봉인 ' + items.filter(v => v.mode === 'sealed').length + '</b></div>' +
        '<div><span>내 입찰</span><b class="num">' + (x.S.tok ? items.filter(v => v.mine).length + '개' : '–') + '</b></div>';
      const pb = document.getElementById('progBar');
      if (pb && i.open_at && i.close_at) pb.style.width = Math.max(2, Math.min(100, (t - i.open_at) / (i.close_at - i.open_at) * 100)) + '%';
    },
    list(a, x) {
      return '<div class="th"><span>상품</span><span>최고가</span><span>흐름</span></div>' + a.map(v => {
        const pr = v.mode === 'comp'
          ? '<b class="num" data-top="' + v.id + '">' + x.num(v.top || v.min_price) + '</b>' + (v.top > v.min_price ? '<small class="up">▲ ' + x.num(v.top - v.min_price) + '</small>' : '<small class="mu">입찰 없음</small>')
          : '<b class="num sl">봉인</b><small class="mu">최소 ' + x.num(v.min_price) + '</small>';
        const st = x.statusOf(v), mk = st ? '<i class="mk ' + st + '" title="내 입찰"></i>' : '';
        return '<div class="jrow' + (v.id === sel ? ' sel' : '') + '" data-id="' + v.id + '" role="button" tabindex="0" aria-label="' + x.esc(v.name) + '"><span class="nm"><span class="ph">' + x.thumb(v) + '</span><span class="tx"><b>' + x.esc(v.name) + '</b><small>No.' + v.no + ' ' + tg(v) + mk + (v.closed ? ' <em>마감</em>' : '') + '</small></span></span><span class="pr">' + pr + '</span>' + spark(v, x) + '</div>';
      }).join('');
    },
    afterGrid(x) {
      const g = document.getElementById('grid');
      if (!g.dataset.wired) {
        g.dataset.wired = 1;
        const pick = (e) => {
          const r = e.target.closest('.jrow'); if (!r) return; e.stopPropagation(); e.preventDefault();
          const id = Number(r.dataset.id);
          if (wide()) { sel = id; g.querySelectorAll('.jrow').forEach(z => z.classList.toggle('sel', Number(z.dataset.id) === id)); renderCenter(x); }
          else x.openItem(id);
        };
        g.addEventListener('click', pick, true);
        g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') pick(e); });
      }
      renderCenter(x);
    },
    detail(p, x) {
      const v = p.v;
      const top = '<div class="jd-top"><span class="ph">' + x.thumb(v) + '</span><div class="tx">' + p.meta + p.name + '</div><div class="px">' + (v.mode === 'comp' ? '<b class="num up" data-top="' + v.id + '">' + x.num(v.top || v.min_price) + '</b><small class="up">' + (chg(v, x) || '입찰 없음') + '</small>' : '<b class="num sl">봉인</b><small class="sl">금액 비공개</small>') + '</div></div>';
      const vis = v.mode === 'comp' ? '<div class="legend"><span><i style="background:#E5383B"></i>최고가</span><span><i style="background:#FFB020"></i>내 입찰</span><span><i style="background:#1E5EFF"></i>시작가</span></div>' + '<div class="cw">' + chart(v, x, 560, 260) + '</div><div class="cn">' + chart(v, x, 340, 230) + '</div>' + evlist(v, x) : vault(v, x);
      return '<div class="dt jdt"><div class="jd-l">' + top + p.desc + vis + '<div class="jd-gal">' + p.gallery + '</div></div><div class="info jd-r"><div class="h">입찰하기<span>금액 칸을 눌러 고르세요</span></div>' + p.bid + p.how + '</div></div>';
    },
    bidPicker(v, x) {
      if (v.closed) return '';
      const need = v.next_min, cur = v.mode === 'comp' ? v.top : 0, u = Math.max(x.S.info.unit, 1000);
      const base = Math.ceil(need / u) * u;
      const steps = [base + 2 * u, base + u, base].filter((a, k, arr) => arr.indexOf(a) === k && a >= need);
      let rows = steps.map(a => '<button type="button" class="rw" data-pick="' + a + '" aria-pressed="false"><b class="num">' + x.won(a) + '</b><small></small></button>').join('');
      if (base !== need) rows += '<button type="button" class="rw minr" data-pick="' + need + '" aria-pressed="false"><b class="num">' + x.won(need) + '</b><small>최소</small></button>';
      if (cur) rows += '<div class="rw cur' + (v.mine && v.mine.amount === cur ? ' mine2' : '') + '"><b class="num">' + x.won(cur) + '</b><small>현재 최고가</small></div>';
      else if (v.mode === 'sealed' && v.mine) rows += '<div class="rw cur mine2"><b class="num">' + x.won(v.mine.amount) + '</b><small>지금 내 입찰</small></div>';
      return '<div class="lad" role="group" aria-label="금액 고르기">' + rows + '</div>';
    },
    board(d, x) {
      const S = x.S;
      const hold = !S.tok ? '<div class="hcard"><p class="mu">참가 코드를 넣으면 내 입찰이 여기 모여요.</p><button class="btn primary block" data-login>' + x.ic('key', 16, 2.1) + '참가 코드 입력</button></div>'
        : d.mine.length ? d.mine.map(v => {
          const st = x.statusOf(v);
          const tagx = { out: '<span class="tgJ c">밀림</span>', lead: '<span class="tgJ k">최고가</span>', seal: '<span class="tgJ s">봉인</span>', win: '<span class="tgJ k">낙찰</span>', lose: '<span class="tgJ s">미낙찰</span>' }[st];
          let bar = '', lg;
          if (v.mode === 'comp' && v.top) { const hi = v.top, lo = v.min_price, pc = a => Math.max(0, Math.min(100, (a - lo) / Math.max(1, hi - lo) * 100)); bar = '<div class="g"><span class="f" style="width:100%;background:' + (st === 'out' ? 'var(--up)' : 'var(--ink)') + '"></span><i style="left:' + pc(v.mine.amount) + '%"></i></div>'; lg = '<span>내 ' + x.num(v.mine.amount) + '</span><span class="' + (st === 'out' ? 'up' : '') + '"><b>최고 ' + x.num(v.top) + '</b></span>'; }
          else { bar = '<div class="g"></div>'; lg = '<span>최소 ' + x.num(v.min_price) + '</span><span class="sl"><b>내 ' + x.num(v.mine.amount) + '</b> · 마감 후 공개</span>'; }
          return '<button class="hcard" data-open="' + v.id + '"><span class="t"><span>' + x.esc(v.name) + '</span>' + tagx + '</span>' + bar + '<span class="lg2">' + lg + '</span></button>';
        }).join('') + (d.out ? '<button class="btn lg block k" data-open="' + d.mine.find(v => x.statusOf(v) === 'out').id + '">밀린 상품 다시 입찰하기</button>' : '') : '<div class="hcard"><p class="mu">아직 입찰한 상품이 없어요.</p></div>';
      const res = S.info.phase === 'closed' && S.info.results_public ? x.resultCards(d) : '';
      return '<div class="bdJ"><section class="tmw"><div class="h"><div><h1>시세 지도</h1><p>칸 넓이는 현재 최고가(일반입찰은 최소가), 색은 내 상태예요. ' + Math.round(x.POLL / 1000) + '초마다 새로 고쳐져요.</p></div></div>' +
        '<div class="tm wide">' + treemap(x, 1000, 620) + '</div><div class="tm tall">' + treemap(x, 340, 520) + '</div><div class="tml"><span><i class="k1"></i>내가 최고가</span><span><i class="k2"></i>밀렸어요</span><span><i class="k5"></i>입찰 들어옴</span><span><i class="k3"></i>일반입찰 · 내가 입찰함</span><span><i class="k4"></i>일반입찰 · 봉인</span><span><i class="k6"></i>입찰 없음</span></div></section>' +
        '<section class="hold"><h2>내 입찰 ' + (S.tok ? d.mine.length : '') + '</h2>' + (S.tok ? '<div class="st4"><div><span>입찰</span><b>' + d.mine.length + '</b></div><div><span>최고가</span><b>' + d.lead + '</b></div><div><span class="up">밀림</span><b class="up">' + d.out + '</b></div></div>' : '') + hold + '</section></div>' + (res ? '<div class="resJ">' + res + '</div>' : '');
    }
  };
})();
