# 포격리스

그 시절 그 포격전, 링크 하나로 친구들과 다시. 설치·가입 없이 최대 4 대 4.

- 플레이: https://kird-cyber.github.io/kirdwork/
- 방 만들기 → 초대 링크 복사 → 친구가 링크를 열고 닉네임 입력 → 방장이 시작
- 탱크 8종 · 맵 8개 · 해프닝(운석·지진·토네이도·불기둥) · 채팅/이모티콘 · 튜토리얼 · 봇 연습
- 온라인 중계는 무료 공개 MQTT 서버를 씁니다 (게임 입력만 오가며 저장되지 않습니다).
- 개발 소스: `dev/`

## 케이요새 광장 (둘러보기)

메인 화면 오른쪽 「케이요새 광장」 서랍에서 들어갑니다. 넓은 화면에서는 늘 펼쳐져 있습니다.

- KIRD 홍보관: https://kird-cyber.github.io/kirdwork/hall/ — 마스코트와 걷는 전시관, 스탬프 랠리·수료증·포토존·블록 쌓기
- 케이요새 월드 (게임관): 방탈출 `world/?m=escape` · 숨바꼭질 `world/?m=hide` · 탈출전 `world/?m=chase` — 봇과 함께하는 1인용
- 확장 전시관: https://kird-cyber.github.io/kirdwork/expo/ — 확장 맵·시나리오·전용 탱크·확장 게임 구상 이미지 110점
- 개발 소스: `dev/plaza/` (월드·홍보관 `world/`에서 `python3 build.py`, `python3 hall/build.py`; 전시관 `expo/build.py`)

## 로프 연습장 (웜즈식 게임 준비)

- 플레이: https://kird-cyber.github.io/kirdwork/rope/
- 닌자 로프 손맛 확인용 · 손맛 조절 패널 · 기록 유령 · 시범 보기
- 개발 소스: `dev/rope/`

## KIRD 나눔마켓 (직원 온라인 나눔 경매)

- 입찰 화면: https://kird-cyber.github.io/kirdwork/market/
- 관리자 화면: https://kird-cyber.github.io/kirdwork/market/admin.html
- 서버 연결 전에는 데모 모드 (체험 코드 TEST-AAAA, 관리자 비밀번호 demo)
- 경쟁입찰(최고가 공개)·일반입찰(비공개), 재입찰·단위·연장 등은 관리자가 설정
- 저장소: 구글 시트 + Apps Script — 설치는 `market/apps-script/설치안내.md`

### 나눔마켓 리뉴얼 시안 (써 보기용 · 데모 모드)

실제 행사용 `market/`은 그대로 두고, 같은 규칙으로 동작하는 화면 시안 3종을 따로 올렸습니다. PC·휴대폰 모두 대응, 체험 코드 TEST-AAAA · 관리자 비밀번호 demo.

| 시안 | 직원 화면 | 관리자 화면 |
| --- | --- | --- |
| F · 모노 마켓 | https://kird-cyber.github.io/kirdwork/market-f/ | https://kird-cyber.github.io/kirdwork/market-f/admin.html |
| H · 물건 꼬리표 | https://kird-cyber.github.io/kirdwork/market-h/ | https://kird-cyber.github.io/kirdwork/market-h/admin.html |
| J · 나눔 시세판 | https://kird-cyber.github.io/kirdwork/market-j/ | https://kird-cyber.github.io/kirdwork/market-j/admin.html |

- 시안마다 데모 저장 공간이 따로라 서로 섞이지 않습니다.
- 고를 시안이 정해지면 그 폴더의 `config.js`에 서버 주소를 넣고 `apps-script/Code.gs`를 새 버전으로 배포합니다.
- 개발 소스: `dev/market-v2/` (`python3 dev/market-v2/build.py`로 세 폴더를 다시 만듦, 테스트 `node dev/market-v2/e2e.js`)
