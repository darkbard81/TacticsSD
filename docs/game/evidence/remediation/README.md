# 보완 검증 증거

2026-10-04. 수정 전 감사는 ../revalidation/ 에 보존. 이 폴더는 승인 후 보완 증거.

- red-domain.log + red-browser.log: 감사9결함을 변경 전 재현(2+7 실패).
- green-*stage1.log: 최초9결함 수정 후2+7통과.
- verify-final.log: 실제 npm run verify exit0,70 domain/36 browser. 기존 제작도구 포함.
- full-pad-final.log / full-pad.spec.ts: 모의패드만으로3전투→엔딩→복원. 1passed,3.8분. 실제 기기 검증이 아님.
- pad-expansion.mjs/.json/.log: 패드만으로 새대원/편성순서/학습/지원/보급/가방. MP0→12,재고1→0,오류0.
- protected-check.log: 기존 characterRig 주요3파일 SHA256 일치.
- approved-changes.patch: 보완 직전 game/tests와 최종 텍스트파일 차이. 사용자 기존 리깅 파일은 포함하지 않음.
- party/training/equipment/stage/dialogue/battle/top.png: 1024×768 CSS,DPR2 실스크린샷(2048×1536).
- weapons-directions.png:8무기×4방향. attack-phases.png:4계열×4공격시간. 직접 게임 Renderer/evaluator 호출한 시각 검수 자료,플레이 진행 영상 아님.
- pad-bag/item-preview/item-used.png, mockpad-ending/victory.png: 실제 모의패드 진행 화면.

표준 재현: 저장소에서 `npm run verify`. 별도 스크립트는 이 세션의 로컬서버4174와 /home/deck/Documents/TacticsSD 경로를 쓴다. `npm run tool -- --port 4174` 후 node로 screens.mjs/pad-expansion.mjs 실행 가능(출력 경로 /tmp/tacticssd-repair 유지). full-pad.spec.ts는 함께 제공된 config의 testDir/testMatch를 이 파일 위치로 맞추고 Playwright CLI로 실행한다. 운영체제 파일선택은 setInputFiles 자동화이며 실물패드 조작 검증이 아님.
