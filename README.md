# 포격리스

그 시절 그 포격전, 링크 하나로 친구들과 다시. 설치·가입 없이 최대 4 대 4.

- 플레이: https://kird-cyber.github.io/kirdwork/
- 방 만들기 → 초대 링크 복사 → 친구가 링크를 열고 닉네임 입력 → 방장이 시작
- 탱크 8종 · 맵 8개 · 해프닝(운석·지진·토네이도·불기둥) · 채팅/이모티콘 · 튜토리얼 · 봇 연습
- 온라인 중계는 무료 공개 MQTT 서버를 씁니다 (게임 입력만 오가며 저장되지 않습니다).
- 개발 소스: `dev/`

## 케이요새 광장 (둘러보기)

메인 화면 오른쪽 「케이요새 광장」 서랍에서 들어갑니다. 넓은 화면에서는 늘 펼쳐져 있습니다.

- KIRD 홍보관: https://kird-cyber.github.io/kirdwork/hall/ — 2026 새 단장, 8개 전시실(미래비전 2050·2025 도전성과·홍보 스튜디오), 스탬프 랠리·수료증·배지 지갑
- 알파 마블 (게임관 맨 위): https://kird-cyber.github.io/kirdwork/marble/ — 세계 과학기술 도시 24곳·국가 연구시설 4곳 44칸 부루마불형 보드게임, 주사위 예보, KIRD 캐릭터 10인 AI 대전, 알파 키(연구윤리·연구실 안전) 퀴즈. 소스 `dev/plaza/marble/` (`python3 dev/plaza/marble/build.py`)
- 알파 유니버스 (게임관 알파 마블 아래): https://kird-cyber.github.io/kirdwork/universe/ — 명왕성→태양 11개 천체 합치기(수박게임 규격), 콤보·알파 에너지·블랙홀 피버 점수, 과학기술인 등급 7단계, 그릇 3종(KIRD·과학계·우주계) 테마별 소식 25초 간격. 소스 `dev/plaza/universe/` (`python3 dev/plaza/universe/build.py`)
- 케이요새 월드 (게임관): 방탈출 `world/?m=escape`(연구단지 맵) · 숨바꼭질 `world/?m=hide`(과학 정원 맵) · 탈출전 `world/?m=chase`(야간 도심 맵) — 봇과 함께하는 1인용, 첫 판 따라하기 안내
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

