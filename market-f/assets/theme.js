/* 시안 F · 모노 마켓 — 흑백 리셀 마켓. 상품과 가격만 크게, 강조색은 빨강 하나 */
window.THEME = (function () {
  const tag = (v, ic) => v.mode === 'comp' ? '<span class="fb c">' + ic('trend', 13, 2.6) + '경쟁입찰</span>' : '<span class="fb s">' + ic('lock', 13, 2.4) + '일반입찰</span>';
  const pill = (v, x) => {
    const st = x.statusOf(v); if (!st) return '';
    const m = { win: ['ok', 'trophy', '낙찰'], lose: ['mu', 'x', '미낙찰'], lead: ['ok', 'check', '내가 최고가'], out: ['bad', 'alert', '더 높은 입찰 있음'], seal: ['mu', 'lock', '입찰함 · 내 ' + x.won(v.mine.amount)] }[st];
    return '<span class="fp mine ' + st + ' ' + m[0] + '">' + x.ic(m[1], 13, 2.4) + m[2] + '</span>';
  };
  return {
    title: t => MK.esc(t),
    step: (t, k) => '<div class="step"><b>' + (k + 1) + '</b>' + MK.esc(t) + '</div>',
    rules(i, r, x) {
      return '<div class="rule p"><h3>공통 규칙</h3><p>' + x.esc(r.p) + '</p></div>' +
        '<div class="rule c"><h3>경쟁입찰 <small>최소가 ' + x.won(i.competitive_min) + ' 이상</small></h3><p>' + x.esc(r.c) + '</p></div>' +
        '<div class="rule s"><h3>일반입찰 <small>최소가 ' + x.won(i.competitive_min) + ' 미만</small></h3><p>' + x.esc(r.s) + '</p></div>';
    },
    afterHero(x) {
      const i = x.S.info, el = document.querySelector('[data-hero-title]');
      if (el) el.textContent = { open: '지금 입찰 중', ready: '곧 시작해요', paused: '잠시 멈췄어요', closed: '입찰 마감' }[i.phase] || '지금 입찰 중';
      const d = document.querySelector('.fhow');
      if (d && !d.dataset.init) { d.dataset.init = 1; if (window.innerWidth < 900) d.removeAttribute('open'); }
    },
    card(v, x) {
      const ph = v.photos[0] ? '<img src="' + x.esc(v.photos[0]) + '" alt="" loading="lazy" referrerpolicy="no-referrer">' : '<span class="noimg">' + x.ic('image', 40, 1.4) + '</span>';
      const price = v.mode === 'comp'
        ? '<div class="pv"><b class="num" data-top="' + v.id + '">' + x.num(v.top || v.min_price) + '</b><small>원</small></div><div class="pk">' + (v.top ? '현재 최고가' : '시작가') + '</div>'
        : '<div class="pv"><b class="num">' + x.num(v.min_price) + '</b><small>원</small></div><div class="pk">최소 입찰가</div>';
      const cnt = v.count !== undefined ? '<span class="count">' + (v.count ? v.count + '명 입찰' : '아직 입찰 없음') + '</span>' : '<span class="sub">금액 비공개</span>';
      return '<button class="card" data-id="' + v.id + '" aria-label="' + x.esc(v.name) + ' 자세히 보기"><span class="ph">' + ph + '<span class="no">No.' + v.no + '</span>' + tag(v, x.ic) + (v.closed ? '<span class="cl">입찰 마감</span>' : '') + '</span>' +
        '<span class="body"><span class="nm">' + x.esc(v.name) + '</span>' + price + '<span class="ft">' + cnt + pill(v, x) + '</span>' + '</span></button>';
    },
    afterGrid(x) {
      const el = document.getElementById('rank'); if (!el) return;
      const a = x.S.items.slice().sort((p, q) => ((q.count || 0) - (p.count || 0)) || ((q.top || 0) - (p.top || 0)) || (p.no - q.no)).slice(0, 3);
      if (!a.length) { el.innerHTML = ''; return; }
      el.innerHTML = '<div class="rh"><h2>인기 입찰</h2><span>입찰이 많은 순</span></div><div class="rl">' + a.map((v, k) =>
        '<button class="ri" data-open="' + v.id + '"><span class="rk num">' + (k + 1) + '</span><span class="rt">' + x.thumb(v) + '</span><span class="rx"><b>' + x.esc(v.name) + '</b><small>' +
        (v.mode === 'comp' ? (v.top ? '최고가 ' + x.won(v.top) : '시작가 ' + x.won(v.min_price)) + (v.count !== undefined ? ' · ' + v.count + '명' : '') : '일반입찰 · 금액 비공개') + '</small></span></button>').join('') + '</div>';
    },
    detail(p, x) {
      const v = p.v, i = x.S.info;
      const big = v.mode === 'comp'
        ? '<div class="fstat"><div><span>현재 최고가</span><b class="num" data-top="' + v.id + '">' + x.won(v.top || v.min_price) + '</b></div><div><span>입찰</span><b>' + (v.count !== undefined ? v.count + '명' : '–') + '</b></div><div><span>마감까지</span><b class="num">' + (v.closed ? '마감' : x.left(v.close_at - x.now())) + '</b></div></div>'
        : '<div class="fstat"><div><span>최소 입찰가</span><b class="num">' + x.won(v.min_price) + '</b></div><div><span>다른 사람 금액</span><b>' + x.ic('lock', 16, 2.2) + ' 비공개</b></div><div><span>마감까지</span><b class="num">' + (v.closed ? '마감' : x.left(v.close_at - x.now())) + '</b></div></div>';
      return '<div class="dt">' + p.gallery + '<div class="info"><div class="meta">' + tag(v, x.ic) + '<span>No.' + v.no + '</span><span>·</span><span>' + (v.mode === 'comp' ? '최고가 공개' : '금액 비공개') + '</span></div>' + p.name + p.desc + big + '<div class="fpanel">' + p.bid + '</div>' + p.how + '</div></div>';
    }
  };
})();
