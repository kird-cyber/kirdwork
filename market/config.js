/* KIRD 나눔마켓 설정
 * api: Apps Script 웹 앱 주소 (…/exec). 비워 두면 「데모 모드」 — 입찰이 각자 브라우저에만 저장됩니다.
 * poll: 목록을 새로 불러오는 간격(밀리초). 사람이 많으면 15000~20000 으로 늘리세요.
 * bidUrl: (선택) 참가 코드 QR·인쇄 카드가 여는 직원용 입찰 사이트 주소. 비워 두면 관리자 페이지와 같은 폴더의 입찰 화면.
 */
window.MARKET_CONFIG = {
  api: 'https://script.google.com/macros/s/AKfycbz1T3M1ls99_s2oRKw5kPy8gvnTiCYpJhkkTyfb3RD21j4YY8w5nvw-xw1bx7uixW17/exec',
  poll: 12000
};
