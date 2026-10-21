/* 시안 H · 물건 꼬리표 — 재단 매트 위 빨랫줄에 손글씨 가격 꼬리표. 경쟁입찰 = 파란 도장, 일반입찰 = 밀랍 봉인 */
window.THEME = (function () {
  const ROT = [-2.2, 1.4, -0.8, 2.0, 1.2, -1.8, 2.4, -1.0, 1.6, -1.4];
  const stamp = (v, ic) => v.mode === 'comp'
    ? '<span class="stp" title="경쟁입찰 · 최고가 공개">' + ic('trend', 13, 2.6) + '경쟁입찰</span>'
    : '<span class="wax" title="일반입찰 · 금액 비공개">' + ic('lock', 15, 2.4) + '<span class="sr">일반입찰</span></span>';
  const pen = (n, x) => '<span class="pen">' + x.num(n) + '<small>원</small></span>';
  function state(v, x) {
    const st = x.statusOf(v);
    if (st === 'lead') return '<div class="st lead">' + x.ic('check', 15, 2.6) + '<span>내가 최고가</span></div>';
    if (st === 'out') return '<div class="st out"><span>더 높은 입찰 있음</span></div>';
    if (st === 'win') return '<div class="st lead">' + x.ic('trophy', 15, 2.4) + '<span>낙찰!</span></div>';
    if (st === 'lose') return '<div class="st none">낙찰되지 않았어요</div>';
    if (st === 'seal') return '<div class="st seal"><span class="memo">내 ' + x.won(v.mine.amount) + ' 넣음</span></div>';
    if (v.mode === 'comp') return '<div class="st none">' + (v.count ? v.count + '명 입찰' : '아직 입찰 없음') + '</div>';
    return '<div class="st none">' + x.ic('lock', 13, 2.2) + '금액 비공개</div>';
  }
  return {
    wantsTrend: false,
    title: t => MK.esc(t),
    step: (t, k) => '<span class="step"><b>' + (k + 1) + '</b>' + MK.esc(t) + '</span>',
    rules(i, r, x) {
      return '<div class="icard r1"><h3>' + x.ic('trend', 17, 2.2) + '경쟁입찰 <small>최소가 ' + x.won(i.competitive_min) + ' 이상</small></h3><p>' + x.esc(r.c) + '</p></div>' +
        '<div class="icard r2"><h3>' + x.ic('lock', 17, 2.2) + '일반입찰 <small>최소가 ' + x.won(i.competitive_min) + ' 미만</small></h3><p>' + x.esc(r.s) + '</p></div>' +
        '<div class="icard r3"><h3>' + x.ic('check', 17, 2.4) + '공통</h3><p>' + x.esc(r.p) + '</p></div>';
    },
    card(v, x) {
      const k = (v.no - 1) % ROT.length, r = ROT[k];
      const ph = v.photos[0] ? '<img src="' + x.esc(v.photos[0]) + '" alt="" loading="lazy" referrerpolicy="no-referrer">' : '<span class="noimg">' + x.ic('image', 36, 1.4) + '</span>';
      const lab = v.mode === 'comp' ? (v.top ? '현재 최고가' : '시작가') : '최소 입찰가';
      const amt = v.mode === 'comp' ? (v.top || v.min_price) : v.min_price;
      return '<button class="card tagW" data-id="' + v.id + '" style="--r:' + r + 'deg" aria-label="' + x.esc(v.name) + ' 자세히 보기"><span class="str"></span><span class="tag"><span class="hole"></span><span class="mode">' + stamp(v, x.ic) + '</span>' +
        '<span class="pic"><span class="ph">' + ph + (v.closed ? '<span class="cl">입찰 마감</span>' : '') + '</span><span class="cap"><span>No.' + v.no + '</span><span>' + (v.mode === 'comp' ? '경쟁' : '일반') + '</span></span></span>' +
        '<span class="nm">' + x.esc(v.name) + '</span><span class="k">' + lab + '</span><span class="v" data-top="' + (v.mode === 'comp' ? v.id : '') + '">' + pen(amt, x) + '</span>' + state(v, x) + '</span></button>';
    },
    detail(p, x) {
      const v = p.v;
      return '<div class="dt"><div class="board">' + p.gallery + '</div><div class="info slip"><div class="slip-hd"><b>입찰 전표</b><span>No.' + v.no + ' · ' + (v.mode === 'comp' ? '경쟁입찰 · 최고가 공개' : '일반입찰 · 금액 비공개') + '</span></div>' +
        p.meta + p.name + p.desc + p.stat + p.bid + p.how + '</div></div>';
    },
    confirmMark(amt, v, x) {
      return '<div class="bigstamp ' + (v.mode === 'comp' ? 'c' : 's') + '"><small>KIRD 나눔마켓</small><b class="num">' + x.num(amt) + '</b><small>입찰 확정</small></div>';
    },
    afterDetail(v, x) {
      const g = document.querySelector('#detail .gal');
      if (g && !g.querySelector('.pcap')) g.insertAdjacentHTML('beforeend', '<span class="pcap"><span class="pen">No.' + v.no + ' ' + x.esc(v.name) + '</span></span>');
    },
    board(d, x) {
      const S = x.S, p = x.phaseText();
      let rc;
      if (!S.tok) rc = '<div class="rcpt"><div class="t1">내 입찰 영수증</div><hr><p class="rcmsg">참가 코드를 넣으면 내 입찰이 영수증으로 정리돼요.</p><button class="btn primary block" data-login>' + x.ic('key', 16, 2.1) + '참가 코드 입력</button></div>';
      else {
        const c = String(S.code || ''), mask = c ? c.slice(0, 4) + '-••' + c.slice(-2) : '';
        const lines = d.mine.length ? d.mine.map(v => {
          const st = x.statusOf(v);
          const s = { lead: '<span class="st lead"><span>내가 최고가</span></span>', out: '<span class="st out"><span>밀렸어요</span></span> 최고 ' + x.num(v.top), seal: v.mode === 'comp' ? '입찰함' : '봉인 · 결과는 마감 후', win: '<span class="st lead"><span>낙찰</span></span>', lose: '낙찰되지 않음' }[st];
          return '<button class="rl" data-open="' + v.id + '"><b>No.' + v.no + ' ' + x.esc(v.name) + '</b><span class="a num">' + x.num(v.mine.amount) + '</span><span class="s">' + s + '</span></button>';
        }).join('') : '<p class="rcmsg">아직 입찰한 상품이 없어요.</p>';
        const tot = d.mine.reduce((a, v) => a + v.mine.amount, 0);
        rc = '<div class="rcpt"><div class="t1">내 입찰 영수증</div><div class="t2 num">' + x.esc(mask) + ' · ' + x.esc(x.fmtDate(x.now())) + ' 기준</div><hr>' + lines + '<hr>' +
          '<div class="rt"><span>입찰한 상품</span><span>' + d.mine.length + '건</span></div><div class="rt"><span>내가 최고가</span><span>' + d.lead + '건</span></div><div class="rt"><span>밀린 상품</span><span class="' + (d.out ? 'red' : '') + '">' + d.out + '건</span></div><hr>' +
          '<div class="rt big"><span>지금 내 입찰 합계</span><span class="num">' + x.won(tot) + '</span></div><div class="bc"></div><div class="pen thx">고마워요! 모두 기부돼요</div></div>';
      }
      const rows = S.items.slice().sort((a, b) => a.no - b.no).map(v => {
        const st = x.statusOf(v);
        const val = v.mode === 'comp' ? (v.top ? '<span class="pen">' + x.num(v.top) + '</span>' : '<span class="mu">시작가 ' + x.num(v.min_price) + '</span>') : '<span class="sl">' + x.ic('lock', 13, 2.2) + ' 비공개</span>';
        const me = { out: '<span class="st out"><span>밀렸어요</span></span>', lead: '<span class="st lead"><span>내가 최고가</span></span>', seal: '<span class="memo">입찰함</span>', win: '<span class="st lead"><span>낙찰</span></span>', lose: '<span class="mu">미낙찰</span>' }[st] || '<span class="mu">–</span>';
        return '<tr data-open="' + v.id + '"><td class="no num">No.' + v.no + '</td><td><span class="nm">' + x.thumb(v) + '<span>' + x.esc(v.name) + '</span></span></td><td class="md">' + stamp(v, x.ic) + '</td><td class="r">' + val + '</td><td class="r cnt">' + (v.count !== undefined ? v.count + '명' : '<span class="mu">–</span>') + '</td><td>' + me + '</td></tr>';
      }).join('');
      const res = S.info.phase === 'closed' && S.info.results_public ? x.resultCards(d) : '<div class="resnote">' + x.ic('gift', 18, 2) + '<span>마감 후 ' + (S.info.results_public ? '낙찰 결과가 이 자리에 붙어요.' : '낙찰 결과는 담당자가 안내해 드려요.') + '</span></div>';
      return '<div class="bhead"><h1>현황판</h1><p>내 입찰과 전체 상품 상태를 한눈에. ' + Math.round(x.POLL / 1000) + '초마다 새로 고쳐져요. · ' + x.esc(p.lab) + ' <b class="num">' + x.esc(p.big) + '</b></p></div>' +
        '<div class="hboard"><div class="rcw">' + rc + '</div><div class="ledger"><h2>전체 상품 장부 <small>경쟁입찰은 최고가, 일반입찰은 마감까지 비공개</small></h2><div class="tblw"><table class="lg"><thead><tr><th>번호</th><th>상품</th><th class="md">방식</th><th class="r">현재 최고가</th><th class="r cnt">입찰</th><th>내 상태</th></tr></thead><tbody>' + rows + '</tbody></table></div></div></div>' + res;
    }
  };
})();
