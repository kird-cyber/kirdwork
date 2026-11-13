// 주제 맵 글자·표지판 배치 점검 (브라우저): 글자가 잘리거나, 땅에 가려지거나, 서로 겹치지 않는지.
// 맵마다 TMAP_ART.layout(id)가 돌려주는 모든 표지판·명판·조형물의 사각형을 본다:
//  ① 맵 안에 다 들어옴  ② 배경 표지판은 그 아래 땅의 가장 높은 곳보다 위 (땅에 안 가려짐)
//  ③ 구조물에 새긴 명판은 전부 땅 안 (윗선에 잘리지 않음)  ④ 같은 층끼리 겹치지 않음  ⑤ 명판 글자 크기 16px 이상
// run: NODE_PATH=/opt/npm-tools/node_modules node tests/layout_check.js [dist/index.html]
const { chromium } = require('playwright'); const path = require('path');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  await p.goto('file://' + path.resolve(process.argv[2] || path.join(__dirname, '../dist/index.html'))); await p.waitForTimeout(1500);
  const out = await p.evaluate(() => {
    const res = [], W = 5200, H = 1500;
    for (const id of Object.keys(__tmap.F)) {
      const top = __tmap.TOP[id], L = __tmap.ART.layout(id), bad = [];
      const range = (r, fn) => { let v = fn === Math.min ? 1e9 : -1e9; for (let px = Math.max(0, r.a); px <= Math.min(W, r.a + r.w); px += 4) v = fn(v, top(px)); return v; };
      for (const r of L) {
        if (r.a < 4 || r.a + r.w > W - 4 || r.t < 90 || r.t + r.h > H) bad.push(`맵 밖: ${r.name}`);
        if (r.layer === 'back' && r.t + r.h > range(r, Math.min) + 2) bad.push(`땅에 가려짐: ${r.name} (아래 ${r.t + r.h} > 땅 ${range(r, Math.min) | 0})`);
        if (r.layer === 'solid' && r.t < range(r, Math.max) + 6) bad.push(`윗선에 잘림: ${r.name} (위 ${r.t} < 땅 ${range(r, Math.max) | 0})`);
        if (r.layer === 'solid' && r.size < 16) bad.push(`글자 작음: ${r.name} (${r.size}px)`);
      }
      for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) { const p = L[i], q = L[j]; if (p.layer !== q.layer) continue;
        if (p.a < q.a + q.w + 8 && q.a < p.a + p.w + 8 && p.t < q.t + q.h + 8 && q.t < p.t + p.h + 8) bad.push(`겹침: ${p.name} × ${q.name}`); }
      res.push({ id, n: L.length, bad });
    }
    return res;
  });
  let fail = 0; for (const r of out) { console.log(`${r.bad.length ? 'FAIL' : 'PASS'} ${r.id}: 표지판·명판 ${r.n}개` + (r.bad.length ? '\n  ' + r.bad.join('\n  ') : '')); fail += r.bad.length; }
  await b.close(); process.exit(fail ? 1 : 0);
})();
