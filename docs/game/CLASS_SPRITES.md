> 2026-10-07: 현재 8클래스 정면/후면 파츠·2.5H 리그·PNG 결과와 검사 정책은 [Three.js 전장 통합](THREE_BATTLEFIELD.md)을 참조하세요. 아래는 이전 작업 기록입니다.

# 클래스별 성인 SD 엘프 · 2026-10-05

8종 클래스 아트는 `game/assets/classes/<class>/sheet.png`에서 읽는다. 각 클래스는 별도 ImageGen 원화와 포즈 그룹을 갖는다. 의상 색상 회전은 기본 SD 경로에서 제거했다. 클래스별 정규화·시각 검수 결과는 각 폴더의 `qa.json`, 원본과 프롬프트는 `raw/`에 보존한다.

## 공통 계약

1792×1024 RGBA, 7열×4행, 256×256 셀, 앞뒤 13포즈씩 총 26포즈. 행1/2는 idle, walk_right, walk_left, hurt, jump1, jump2, jump3. 행3/4는 collapse, attack1–5, 마지막 셀 투명. 기존 `elf-sd-sheet-v2/frames.json`의 좌표와 단순 시퀀스를 재사용한다. 몸 무기는 그리지 않고 클래스별 손 소켓 위에 기존 교환 장비를 겹친다. 개별 프레임 크기 조절이나 몸 전체 회전으로 동작을 만들지 않는다.

제자리 대기는 idle → walk_right → idle → walk_left를 초당 5프레임(0.8초 주기)으로 반복한다. 실제 경로 이동은 기존 9fps. 피격과 공격/아이템 우선순위, pause 시각 시계 정지, RT/논리 좌표/턴/자원 계산은 유지한다. 아이템은 idle → jump3 → jump2 → idle, 모든 무기 계열은 공통 attack1–5 몸동작을 쓴다. 비행 기능/날개는 없다.

## 저장 호환 클래스 매핑

| 대원 | 영속 클래스 ID | 원화 |
|---|---|---|
| 에린 | knight | Knight |
| 로웬 | ranger | Archer |
| 세라 | arcanist | Wizard |
| 미엘 | healer | Cleric |
| 레나 | sentinel | Knight (기존 파수기사 기능 유지) |
| 이리스 | sage | Cleric (기존 현자 기능 유지) |
| 브리나 | warrior | Warrior |
| 엘리스 | spellblade | Spellblade |
| 니라 | terror-knight | Terror Knight |
| 카엘라 | berserker | Berserker |

기존 6개 ID와 인덱스, 대원 ID, 장비 계열, 능력, 레벨 및 수련 참조를 보존하고 새 4명을 뒤에 추가했다. 총 10명 중 최대 3명 출전은 동일하다. 신규 전사·광전사는 기존 여명 강타, 공포기사는 강타/수호의 진, 마법검사는 달빛 화살/강타를 재사용한다. 별도 스킬 트리는 없다. 마법검사도 기존 sword 장비 계열을 사용하며 주문은 기존 spell 공식을 따른다. 기존 병과 스탯은 바꾸지 않았다. 신규 병과는 기존 병과 데이터에서 HP/MP/공격/방어/RT 일부만 소규모 구분했다.

v1 인덱스 저장과 v2 ID 저장 모두 새 대원의 기본 장비를 채운다. 이미 유한 재고를 저장한 옛 파일에는 **새 대원이 실제 착용하는 기본 검/여행 갑옷만** 한 벌씩 더한다. 기존 아이템·골드·업그레이드를 재설정하지 않으며, 다시 저장/로드할 때 반복 지급하지 않는다.

가져온 사용자 v2 리그/교체 파츠는 `Renderer.setRig`에서 기존 리그 경로로 전환한다. IndexedDB와 기본 복원 흐름은 동일하며 모든 새 대원에도 작동한다. 기본 복원은 클래스 시트를 다시 사용한다. 초상화는 같은 몸 스프라이트를 사용한다.

## 검증

원본 `npm run verify` 종료코드 0: TypeScript/lint/build, 도메인 89/89, Chromium 브라우저 50/50 통과. 8시트×26포즈 고유성·투명 여백·소켓 검사와 192장비 렌더 샘플, 제자리 Idle 상태 불변, v1/v2 저장, 사용자 리그/편집기, 키보드/모의패드 회귀를 포함한다.

[전체 검증 기록](VALIDATION.md), [연락시트](evidence/classes/TacticsSD-eight-class-contact.png), [실게임 13초 영상](evidence/classes/TacticsSD-class-idle-motion.mp4). 실제 1024×768 CSS / DPR2 / 2048×1536 backing, pageerror 0. 물리 Steam Input/패드/GPU 성능은 미검증. Library 준비 업로드 경로는 사용 불가였으나 공식 호스트 업로드 fallback으로 연락시트와 MP4를 모두 저장했다. 파일별 Library ID·버전 및 로컬 메타데이터 반영 결과는 evidence/classes/library-status.json에 기록했다.
