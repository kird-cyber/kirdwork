# KIRD 나눔마켓 — 시안 J · 나눔 시세판

써 보기용 시안입니다. 지금은 **데모 모드**라 입찰이 각자 브라우저에만 저장돼요.

- 직원 화면: `index.html` · 관리자 화면: `admin.html` (비밀번호 `demo`)
- 체험 코드: `TEST-AAAA`, `TEST-BBBB`, `TEST-CCCC` · 입찰 기록이 있는 예시: `ZZXA-MP23`
- 실제로 쓰려면: `config.js` 의 `api` 에 Apps Script 웹 앱 주소를 넣고, 서버에는 이 폴더의 `apps-script/Code.gs` 를 새 버전으로 배포
- 고칠 때는 이 폴더를 직접 고치지 말고 `dev/market-v2/` 를 고친 뒤 `python3 dev/market-v2/build.py`
