#!/usr/bin/env python3
"""market/assets/core.js + market/apps-script/gas.js → market/apps-script/Code.gs (담당자가 통째로 붙여 넣는 한 파일)"""
import pathlib
root = pathlib.Path(__file__).resolve().parents[2] / 'market'
core = (root / 'assets/core.js').read_text(encoding='utf-8')
gas = (root / 'apps-script/gas.js').read_text(encoding='utf-8')
head = ('/* KIRD 나눔마켓 — Google Apps Script 백엔드 (자동 생성 파일: 직접 고치지 말고 market/assets/core.js · market/apps-script/gas.js 를 고친 뒤\n'
        ' *   python3 dev/market/build_gas.py 로 다시 만드세요)\n'
        ' * 사용법: 구글 시트 → 확장 프로그램 → Apps Script → Code.gs 내용을 이 파일로 바꾸고 저장 → setup 실행 → 웹 앱으로 배포 */\n\n')
(root / 'apps-script/Code.gs').write_text(head + core + '\n\n' + gas, encoding='utf-8')
print('Code.gs', len(head + core + gas), 'bytes')
