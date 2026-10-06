# 최종 검증 재현

프로젝트 루트 `/home/deck/Documents/TacticsSD`에서 `npm run verify`를 실행한다. Node24+, 저장소의 설치된 의존성과 Playwright Chromium이 필요하다. 테스트는 4173 개발 서버를 직접 관리한다. 전체 실행 중 game/ 소스·JSON·에셋을 수정하면 Vite HMR가 진행 중인 페이지를 재설정하므로 파일을 고정한다.

상점 전용: `npx playwright test tests/game/tests/browser/shop.spec.ts`.
출처·경제 전용: `npx vitest run tests/game/shop.test.ts`.

모의 패드 3전투 전체 검증은 `full-pad.spec.ts`의 기본 입력을 pad=true로 한 독립 확장이다. `pad.config.mjs`의 testDir 및 outputDir를 복사한 디렉터리로 바꾸고 4174에 게임 개발 서버를 띄운다. 테스트 디렉터리에는 `{"type":"module"}`인 package.json을 두고, 쓰기 가능한 작업 디렉터리에서 실행한다. Playwright helper는 현재 프로젝트를 절대 경로로 읽는다. 실제 패드 검증을 대체하지 않는다.

`capture-shop.mjs`는 1024×768 CSS / DPR2 실제 화면을 키보드로 탐색해 캡처한다. `compare-screens.mjs`는 원본9장을 같은 CSS프레임에 종횡비 보존으로 배치해 비교한다. `gallery.mjs`는 실제 runtime itemIcon 함수를 사용해 44개를 렌더한다. `shop-art-check.mjs`는 실제 Renderer/evaluateWorldRig에 신규 활3종의4방향·공격시점 fixture를 제공한다. 이 fixture는 게임 진행 테스트와 구분한다.

아트 정규화는 Pillow가 필요하다. 생성 원본 items-{a,b,c}-original.png를 /tmp/tacticssd-repair에 복사한 후 clean-pack-final.py를 실행하면 프로젝트 game/assets/items.png와 items.json을 재생성한다. 이것은 새 이미지 생성이 아니라 승인된 atlas 객체별 분리/투명 여백 정규화다. 새 원화를 만들려면 item-prompts.json의 프롬프트와 내장 ImageGen을 사용한다. build-shop-data.py는 최초 데이터/아트 초안 작성 기록이며 최종 자산 재생성에는 사용하지 않는다(초기 규칙 크롭에 이웃 조각이 있었다).

runtime-sha256.json은 정상 최종 게이트 대상으로 고정한 game/ 및 tests/game/ 파일 해시다. alpha-padding.json은 신규36개 프레임의 서로 다른 픽셀 해시와 최소14px alpha 여백을 기록한다. 최종 결과는 ../../VALIDATION.md를 참조한다.
