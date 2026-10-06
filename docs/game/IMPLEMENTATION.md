> 초기 구현 계획의 기록이다. 2026-10-04 재감사 보완으로 아래의 4대원·240AT 제한·성장 미구현 등은 변경됐다. 현재 구현과 남은 차이는 [REMEDIATION.md](REMEDIATION.md), 계산은 [CALCULATION.md](CALCULATION.md)를 우선한다.

# TacticsSD · 은빛 여명 구현 기준

작성 2026-10-04. 사용자 위임 지시가 최우선. docs에는 상세 기획 텍스트 대신 UI 참고 이미지 9장과 URL 7개가 있다. 아래 규칙·서사·수치는 구현을 위한 추천 결정이며 원작 완전 복제 요구로 해석하지 않는다.

## 조사 및 보존
- `git status/diff` 확인: characterRig README, default-rig.json, validation.md, rig.ts, main.ts, hierarchy.test.ts와 방향 테스트는 기존 사용자/타 세션 변경. 모두 그대로 보존한다.
- TacticsSD 상위 AGENTS.md 없음. ~/.agents/skills의 Pixi 라우팅 확인. game-studio/foundations/UI/playtest 및 ImageGen 스킬 사용.
- docs 이미지 전부 실제 픽셀 확인. main.png는 기존 제작 도구 화면; 게임은 `/game/` 별도 진입점, 루트 제작 도구 보존.
- CardGuild read-only 확인: `BoardViewConfig.ts` 45° 회전과 Y 0.5, `BoardProjection.ts`, `ActorRenderer.ts`, `DepthOrder.ts`, `TerrainRenderer.ts`, `TerrainSideTexture.ts`, 가림 모듈. 타 프로젝트 코드를 수정/복사하지 않고 수학·렌더 순서만 적용.
- TacticsSD의 `evaluateWorldRig`는 몸통 C 보정을 이미 자식에 상속한다. 게임 Canvas2D에서 해당 행렬 재사용, 보드 행렬을 배우에 다시 곱하지 않는다. 원래 Pixi 에디터·저장 형식은 변경하지 않는다.

## 참고 자료 대응
|자료|화면/규칙에 반영|
|---|---|
|world_map.jpg|양피지 지도, 거점/깃발, 안내 바, 자금과 진행도|
|stage_map.jpg|3개 연결 거점, 선행 승리 후 다음 거점 해금|
|party_select.jpeg|출전 3인, 후보 4인, 직업·능력 비교|
|equipment.jpg / item_select.jpg|목록+설명/능력 패널, 무기·방어구 교체|
|event_dialog.jpg|초상화와 대화, 2개 선택지, 전투 전후 서사|
|battle_isometric.jpg|높이 있는 등각 보드, 왼쪽 명령, HP/MP, 하단 행동순서|
|battle_topview.png|전술 탑뷰 전환, 이동/사거리/대상 표시, 확정 전 피해 미리보기|

URL 원문은 웹 도구로 7개 모두 열었으며 JS 표 내용은 브라우저에서 확인했다. https://ogre-db.github.io/one-vision/ 의 weapons(ATK/RT/무게/사거리), armor(DEF/저항/무게), sundries(회복/소모품), classes(이동/점프/RT), skills(패시브/액티브), abilities(MP/사거리/AoE), calculator(공격-방어 및 보정) 구조를 참고한다. 원문 수치를 대량 복제하지 않고 작은 보드에 맞는 자체 수치로 구현. 저작권 에셋/초상화/원작 스크린샷을 런타임 재배포하지 않는다.

## 완성 범위와 단계별 완료 기준
1. 조사: 자료 대응, 규칙, 아트 출처/규격 기록. 기존 변경 보존 확인.
2. 실행 게임: 8×8 높이/수면/장애물 보드, 아군 3 vs 적군 3~4, 이동 BFS, 이동 취소, 공격·직업 기술·아이템·대기, 적 AI, HP/MP, 승패. 3거점 캠페인/보상/엔딩/재도전.
3. 전체 흐름: 타이틀→월드맵→거점→편성→장비/아이템→대화→전투→결과→다음 거점. 저장/이어하기·설정·일시정지.
4. 입력: 의미 action에 키보드/Gamepad 어댑터 연결. 방향 repeat, edge confirm, deadzone, 재매핑/기본값/저장, 연결해제 시 일시정지, 포커스 복원, 카메라·탑뷰. 게임 흐름에서 마우스 필수 단계 없음.
5. 검증: 도메인·입력 및 자동화 keyboard/gamepad 전체 흐름, 실제 앱 스크린샷, typecheck/build/전체테스트, diff 체크. 실물 컨트롤러와 하드웨어 GPU 검증은 별도 미수행 표기.

## 규칙 결정
- 이동은 상하좌우 비용 1, 수면/점유/높이차>점프 통과 불가. 이동 한 번과 행동 한 번, 확정 전 이동 되돌리기 가능.
- 무기 공격은 맨해튼 사거리와 시선 검사, 높이는 투사체 사거리 확장, 방향은 명중률에 반영. 예상 피해와 실제 명중 피해는 같은 함수를 사용한다. 난수 seed가 저장된 전투 상태로 결과를 재현한다.
- 직업: 기사(근접/강타), 궁수(원거리/관통), 마도사(폭발 AoE), 치유사(회복). 전원 성인 여성.
- PSP 기반 개별 RT/AT. 이동 1회 + 일반 행동 1회 + 활성 기술 1회, 순서 자유, 종료 방향 확정. 행동 생략은 다음 RT를 단축. MP/TP는 0으로 시작해 전역 RT로 회복하고 공격·피격은 TP를 추가한다. 전멸 승패, 240 AT 안전 한계. 상세 적용/생략은 PSP_REFERENCE.md.
- 로컬 저장은 검증 가능한 캠페인 진행/편성/장비와 설정. 전투 중 저장은 현 거점 출전 전 체크포인트, 브라우저 복원 시 안내.
- Canvas2D 보드 + DOM UI 사용: 기존 도구의 순수 리그 평가 함수를 재사용하고 렌더러 객체와 게임 상태 분리. 추가 엔진 의존성 불필요.

## 아트 계획
ImageGen 실제 생성 완료: 지도1536×1024, 성인 SD 여성 앞뒤12분리파츠1254×1254 RGBA + v2JSON, 4지형 재질1254×1254, 독립무기8프레임1254×1254 RGBA. 4인 roster는 동일 성인 제복 리그의 색상 변형. 자세한 출처와 규격은 ART.md. 정적 스탠디를 게임 캐릭터로 사용하지 않는다.

## 후속 요구 누적
- 1024×768 CSSpx DPR2 최소 검증, 실제 브라우저 크기/DPR 추종.
- 캐릭터는 신규 성인 분리파츠 v2 리그와 실제 evaluator Idle/Walk/Attack/Hit를 사용.
- 무기8종 독립프레임/손그립/베기·찌르기·사격·시전.
- 등각↔Top view 공통좌표 전환; 캐릭터 마스크 지형투과 금지.
- 계산기 공개 공식/순수 계산모듈/콘텐츠 안정ID·스키마·효과레지스트리/추적표.
- 추가 요청: Tactics Ogre 전투방식 검색·판본별 대조. 기존 라운드 방식과 개별WT, 공격후이동, 종료방향선택 차이를 조사 결과에 따라 수정한다. 공식 PSP PDF 확인 후 개별 RT/AT, 공격 후 이동, 종료 방향, MP/TP 구분 적용 완료.
- 최종 판본 정정: **PSP Tactics Ogre: Let Us Cling Together / 운명의 수레바퀴** 기준. 앞서 읽은 SFC 매뉴얼은 판본 차이 비교자료이며 PSP 규칙의 직접 근거로 대체하지 않는다. Reborn 전투/자원 시스템을 섞지 않는다.
