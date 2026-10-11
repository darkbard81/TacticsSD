# 256×256 캐릭터 스프라이트 · 이전 베이크 기록과 신규 생성 대기

2026-10-11 사용자 정정: 요청한 결과는 기존 bone 베이크가 아니라 지정 스킬로 새로 생성한 이미지다. 아래 베이크 기록과 당시 테스트는 신규 이미지 생성 완료 증거가 아니다. 새 7종 베이크 시트는 `pixel-art/character-sprites-baked-v1/runtime-sheets-retired-2026-10-11/`로 보존 이동하고 런타임에서 제외했다. 현재 기본 런타임은 기존 7종 bone 캐릭터와 기존 Berserker 스프라이트다. 가져온 사용자 리그 우선 적용도 유지한다.

신규 생성은 원문 수정 결정 대기다. 고정 원문의 성적 신체 강조를 제거하고 완전 착의 비성적 디자인으로 만드는 검토안은 `evidence/character-sprites/prompts.proposed-nonsexual.json`이며 아직 승인하거나 적용하지 않았다. 실제 스킬 원문은 변경하지 않았다. [현재 결정·차단·파일 상태](evidence/character-sprites/new-generation-decision.json).

8종의 신규 Walk/Idle/Downed 이미지, 신규 시트 런타임 적용, 그 새 이미지의 실제 게임 화면 첨부는 모두 **미완료**다. 이전 거절 요청을 재호출하거나 다른 생성기로 우회하지 않았다. 아래 기존 동작 베이크와 imagegen 실행 실패를 구분한다.

## 외형 보존과 시트 계약

- 2048×512 RGBA, 8열×2행, 프레임당 256×256. 첫 행 Front, 둘째 행 Back.
- 각 행: Base → Left → Base → Right → Attack01 → Attack02 → Hit → Downed.
- Idle은 Walk와 같은 4프레임을 5fps로 제자리 재생한다. 실제 이동은 9fps다. 게임 좌표·RT·규칙을 변경하지 않는다.
- 새 7종은 `game/assets/class-parts/<class>/`의 실제 PNG와 bone 변환을 오프라인으로 베이크했다. 클래스별 머리색·헤어·의상·기존 신체 비율을 유지하며 새 캐릭터를 대신 등록하지 않는다. Walk는 기존 1사이클의 0.25/0.75 시점이다. 공격은 기존 오른팔 동작의 두 대표 각도, Hit는 기존 몸통 기울임을 보존한 대표 프레임이다.
- 현재 게임의 Front bone + 전체 180도 회전으로 후면 캡을 보는 규약을 사용한다. 카메라 기준 Front/Back·좌우 반전과 SE/SW/NE/NW를 유지한다. Top에서 중복되던 SE/SW 반전은 가상 카메라 방위의 오른쪽 벡터로 수정했다. Top에서는 발 기준 평면을 타일 중앙으로 옮겨 이웃 고지가 머리를 가리는 현상을 줄인다. 깊이 판정은 유지한다.
- 발 기준점 `(128,230)`과 클래스별 공통 축소 비율을 사용한다. `referenceSize` 메타데이터가 기존 전장 표시 크기를 보존한다. 기존 Berserker는 종전 기본값 224를 사용한다.
- 공격 프레임의 실제 오른손 bone 위치를 시트 좌표로 기록해 장비 소켓으로 사용한다. 무기는 기존 피해 공격 구간에만 표시된다.
- 새 7종 Downed는 기존 옆으로 쓰러짐을 보존한 단일 프레임이다. 베이크 단계에서 전신을 하단에 배치했다. **스킬의 고개를 숙인 belly-down prone 포즈를 생성한 결과가 아니다.** 기존 Berserker의 엎드림 프레임은 변경하지 않았다.
- HP가 0이 된 첫 렌더부터 Downed를 선택하며, 기존처럼 0.65초 후 배우를 숨긴다.

런타임은 불변 텍스처를 공유하고 각 배우의 PlaneGeometry UV와 시계를 분리한다. 같은 Three 장면의 depth test/write, 지형과 HUD, 저장·장비·입력·KO 규칙을 유지한다. 기존 리그 자료와 도구도 보존한다.

## 재현과 원본

아래 명령은 이전 베이크 작업을 재현하는 기록이다. 현재의 신규 이미지 생성 요청을 해결하는 데 사용하지 않는다.

기본 소스 PNG를 고치지 않고 투명 1024×1024 베이크 원본 14장씩을 `pixel-art/character-sprites-baked-v1/<class>/`에 저장했다. 합계 98장이다. 이 크기는 베이크 캔버스 규격이며 imagegen 출력 해상도에 관한 주장이 아니다.

```sh
npm run tool -- --host 127.0.0.1 --port 4187 --strictPort
# 다른 터미널: 없는 7종 시트를 생성한다. 기존 출력은 기본적으로 보호한다.
node game/scripts/bake-character-sprites.mjs
# 이번 베이크 7종만 의도적으로 교체할 때
TACTICSSD_REBAKE=1 node game/scripts/bake-character-sprites.mjs
# 포트를 바꾼 경우 TACTICSSD_BAKE_URL로 /tools/spriteSheet/ URL을 지정한다.
```

Berserker는 이 빌더의 대상이 아니다. 기존 원본 14장·소켓·당시 평가 기록은 `pixel-art/character-sprites-v1/elf-berserker-woman/`에 보존했다.

## 지정 스킬과 생성 차단

실제 `.agents/skills/tacticssd-character-gen/SKILL.md`, `references/prompts.json`, Right 평가 지침을 읽었다. `tools/spriteSheet/assets/elf-{cleric,barbarian,thief}-sheet.png`의 실제 픽셀과 기존 클래스 파츠·시트도 시각적으로 확인했다.

이번 imagegen 실행은 **9번 Front Downed 한 단계, 한 번**이다. 기존 Berserker Front Base를 view_image로 확인하고 그 한 장만 절대경로 참조로 사용했다. `character_gen.py prompt front-downed`의 stdout을 수정 없이 전달하고 `transparent_background: true`를 설정했다. Class 치환·추가 특징은 적용하지 않았다. 새 Base/Left/Right/Hit 및 Back Downed는 생성하지 않았고, Right 재생성·팔다리 통과 평가도 이번에 수행하지 않았다.

내장 도구가 출력 단계에서 `moderation_blocked` / `sexual`로 거절했다. request ID: `1d9cb2b1-5986-44ab-a157-3557da6cfb51`. 생성 이미지 파일은 반환되지 않았다. 스킬의 “내장 도구 실패 시 다른 생성 수단으로 자동 전환하지 않는다” 지침에 따라 생성 중단, 프롬프트 수정·CLI/API 전환 없이 유지했다. 기존 애니메이션의 오프라인 베이크는 AI 대체 생성이나 스킬 통과 결과로 표현하지 않는다. 실행 입력과 오류 기록은 `evidence/character-sprites/generation-attempt.json`에 있다.

신규 베이크 Downed 14장에는 alpha-0 상단 절반이 있지만 자세는 옆으로 쓰러짐이다. 기존 Berserker Front/Back Downed는 최신 `--empty-top-half` 검사에서 둘 다 실패한다. 원본을 이동·크롭해 스킬 통과로 만들지 않았다. 완전한 스킬 기반 엎드림 Downed 교체가 남은 과제다.

## 검증과 화면 증거

이 절의 8종 테스트와 화면은 **런타임에서 제외한 이전 베이크 결과**를 대상으로 한다. 테스트 파일도 `evidence/character-sprites/previous-baked-character-sprites.spec.ts`로 보존 이동했다. 신규 생성 결과의 검증이나 최종 첨부로 사용하지 않는다.

사용자의 Steam Deck에 설치된 Playwright Chromium에서 검증했다. 기본 샌드박스의 프로세스·로컬 서버 차단은 승인된 실행으로 해소했다. X 디스플레이 인증에 의존하던 SwiftShader는 `DISPLAY=`의 headless 환경에서 작동했다. 실제 GPU 하드웨어·사용자 평소 브라우저 세션의 검증은 아니다.

- `npm run build`: TypeScript와 Vite 전체 빌드 통과. 기존 standee 공용 청크 500kB 안내는 남는다.
- `npm run lint`: TypeScript와 git diff 공백 검사 통과.
- `npm run test:rules`: 38개 통과, 프로젝트 명령에서 기존 generated rig 3개 제외.
- `DISPLAY= npx playwright test tests/game/tests/browser/character-sprites.spec.ts`: 4개 통과. 8개 서로 다른 시트의 모든 셀·여백·소켓, 공유 텍스처와 독립 UV/시계, 실제 Three의 Idle/Walk/Downed·pause·4방향·Top·KO 첫 프레임·숨김, 전투 규칙 불변, 실제 게임 UI 새 원정→전투→Top→pause를 검증했다. UI에서 pageerror가 없었다.
- 지정 스킬 검사 함수와 Pillow로 베이크 원본 98장의 정사각형 RGBA·실제 투명/불투명 알파, Downed 14장의 상단 alpha 0을 확인했다. 이 검사는 엎드림 자세나 스킬 Right 보행 평가를 대신하지 않는다.

화면 증거:

- [실제 게임·등각](evidence/character-sprites/game-iso.png), [실제 게임·Top](evidence/character-sprites/game-top.png)
- [8종 Idle](evidence/character-sprites/idle.png), [Walk](evidence/character-sprites/walk.png), [Downed](evidence/character-sprites/downed.png), [Top](evidence/character-sprites/top.png)
- [런타임 상태·검증 결과](evidence/character-sprites/runtime.json)

전체 캠페인 완주·실제 Steam Deck GPU/게임패드·성능 측정·기존 전체 브라우저 스위트는 실행하지 않았다. 오래된 elf-sprites 브라우저 테스트는 현재 제거된 Canvas2D/renderer.elf 경로를 대상으로 하므로 이번 Three 검증으로 보고하지 않는다. 관련 없는 기존 변경, 원본 및 저장 자료를 보존했으며 원격 push·배포는 하지 않았다.
