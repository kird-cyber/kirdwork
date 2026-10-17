# 포격리스 개발 소스

- `src/` 게임 모듈 (config · core · mapgen · sim · controller · audio · render · mqtt · net · online · main), `template.html`
- `python3 build.py` → `dist/index.html` (GitHub Pages용), `dist/pogyeokjeon.html`
- 테스트: `node tests/sim.test.js`, `node tests/spec.test.js`, 브라우저 테스트(`e2e.js`, `m2.js`, `online.js`, `online2.js`)는 Playwright 필요
- 온라인 테스트용 로컬 중계 서버: Mosquitto + `tests/broker.js` (WebSocket 브리지)
- 밸런스 측정: `node tests/balance.js 60 normal && node tests/analyze.js normal`
