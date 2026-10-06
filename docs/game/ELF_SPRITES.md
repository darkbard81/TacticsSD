> 최신 기본 아트는 [8종 클래스별 시트](CLASS_SPRITES.md)이며, 아래는 공통 26포즈 계약과 이전 단일 시트 적용 기록이다. 대기는 이제 5fps 제자리 걷기 시퀀스이다.

# 정규화 26포즈 런타임 · 2026-10-05

기본 캐릭터는 승인된 `game/assets/elf-sd-sheet-v2/elf-adult-26pose-sheet.png` 한 장을 사용한다. 1792×1024 RGBA, 256² 셀, 7열×4행, 실제 포즈 26개이며 아래 두 행의 마지막 셀은 비어 있다. 아틀라스와 `frames.json` 원본은 변경하지 않았다.

- 앞/뒤 각 idle, 오른발/왼발 걷기, hurt, jump1–3, collapse, attack1–5.
- 걷기: idle → 오른발 → idle → 왼발. 공격: idle → attack1–5 → idle. 검/활/마법/치유가 같은 몸 프레임을 사용한다.
- 아이템: idle → jump3 → jump2 → idle. 렌더러에서 item을 치유 마법과 구분한다.
- 공통 기준점 (128,230). 점프의 -20/-30px 높이는 원본 픽셀에 들어 있으므로 추가 변위를 중복 적용하지 않는다. 포즈별 크기 보정이나 몸 회전은 없다.
- 무기/의상색/그립/효과는 독립적이다. 26개 포즈의 손 좌표만 지정하며 앞뒤 및 SW/NW 반전을 장비가 함께 상속한다. 활은 공통 attack3에서 화살을 방출한다. 별도 활 몸동작이나 양손 IK는 없다.
- 대기와 걷기는 새 시트의 간단한 프레임 순서를 따른다. 뒤쪽 두 걸음의 차이는 미묘한 원화 그대로다. 새로운 원화/비행 유닛은 추가하지 않았다. `optional-flight-extension.json`은 사양만 존재하며 런타임에서 읽지 않는다.
- jump/collapse 셀은 선택기에서 지원하지만 기존 전투 이동/사망 규칙을 변경하거나 비행을 추가하지 않는다.
- 사용자 v2 리그/파츠 가져오기, IndexedDB 복원, 기본 복원, 장비 교체 및 리깅 에디터는 기존 경로를 유지한다. 시트 로딩 실패 시 기존 파츠 리그가 fallback이다.

실행: `/home/deck/Documents/TacticsSD`에서 `npm run game`; http://127.0.0.1:5173/game/ . 검증 서버는 별도 4186 루프백 포트, 기존 서버 재사용 없음. 검증 결과는 [VALIDATION.md](VALIDATION.md)를 참조한다.

---

아래는 이전 48프레임 판본의 보존 기록이며 현재 기본 런타임에는 사용하지 않는다.

# SD 엘프 기본 캐릭터 · 2026-10-04

승인된 캐릭터 교체를 적용했다. `1:1`은 정사각형 자산 셀로 해석했다. 새 캐릭터는 명확한 성인 엘프 여성, 짧은 SD 비율, 풍성한 흉부 실루엣과 목까지 덮는 아이보리·청록 갑옷을 사용한다. 새 기본 전장 캐릭터와 모든 편성/장비/대화/대상 초상화가 같은 원화를 쓴다.

## 아트와 애니메이션

- 내장 ImageGen 6회: 앞뒤 기준 원화, 앞면 24포즈, 뒷면 24포즈, 걷기 스트립 초안, 교대 발 걷기 수정 스트립, 뒤쪽 활 놓는 손 수정 스트립. 외부 유료 API/CLI 폴백은 사용하지 않았다.
- 실제 게임용은 **앞/뒤 × 6상태 × 4프레임 = 48프레임**. 상태는 idle, walk, melee, bow, cast, hurt. 검 베기/찌르기는 서로 다른 프레임 순서와 각도, 활은 당김/놓기, 마법/회복/아이템은 시전 포즈를 사용한다. 기존처럼 HP 0 유닛은 전장에서 제거하며 별도 사망 상태를 새로 만들지 않았다.
- `game/assets/elf-sd/front.png`, `back.png`: 각각 1024×1536 RGBA. 각 프레임 256×256, 공통 발 기준점 `(128,240)`. 원본 RGBA의 실제 연결된 캐릭터를 분리하므로 명목상 셀 경계를 넘어간 손과 윗행에 가까운 팔도 잘리지 않는다. 한 스트립 안에서는 같은 배율을 쓰고 매 프레임 크기 조절을 하지 않는다.
- 남동/남서는 앞면+수평 반전, 북동/북서는 뒷면+수평 반전. 캐릭터 루트에 지형 투영/찌그러짐을 적용하지 않는다. 등각 지형의 원래 깊이 정렬과 최종 이름/HP 패스를 유지한다. 지형을 지우는 투명 마스크는 없다.
- 여섯 클래스는 **한 성인 캐릭터의 의상 색 변형**이다. 새 독립 원화 6종이라고 표현하지 않는다. 은색 머리, 피부, 아이보리와 금장 등은 색변환에서 제외한다.

## 장비 연결과 리그 보존

`game/elf-sprites.ts`는 몸 프레임과 교환 장비를 별도로 그린다. `frames.json`에 모든 프레임의 손 소켓, 활 뒷손 소켓, 앞/뒤 장비 순서를 저장한다. 무기의 기존 grip 좌표를 손 소켓에 정렬하고 동작별 각도를 적용한다. 뒤쪽 대기/걷기/피격은 장비를 몸 뒤에 그린다. 전면 장비 위에는 손바닥 부분만 다시 그려 쥐는 모양을 보존한다. 활 시위는 뒷손으로 당겼다가 놓으며 화살은 발사 방향을 따른다. 상점의 3종 추가 활도 같은 장착 경로를 쓴다.

검/지팡이/활은 기존 콘텐츠와 아이콘을 재사용한다. 다섯 장비 슬롯, 여섯 클래스, 상점 44품목, 경제/저장/전투 계산은 변경하지 않았다. 방어구/보조손 등 슬롯의 외형을 별도 새 레이어로 만들었다고 주장하지 않는다.

`Renderer.setRig`는 가져온 v2 사용자 리그에 대해 기존 평가기로 전환한다. IndexedDB 저장/복원과 replacement PNG 처리도 그대로다. 기본 복원은 새 SD 프레임 캐릭터로 돌아오며 편성을 유지한다. 기존 `dawn-rig.json`과 파츠 아틀라스는 리그 편집과 사용자 파일 호환을 위해 보존한다. 새 프레임 시트 자체를 기존 6파트 리그 편집기로 편집하는 기능은 없다.

보호된 에디터 3파일은 작업 시작/종료 SHA256이 일치한다: `tools/characterRig/main.ts`, `domain/rig.ts`, `assets/default-rig.json`. CardGuild 수정, 커밋, 푸시, 배포 없음.

## 재현과 증거

원본/초안: `game/assets/elf-sd/source/`. 프롬프트: [prompts.json](evidence/elf-sd/prompts.json). 정규화: `game/scripts/normalize-elf.py` (Pillow+NumPy 필요). 소스에서 별도 디렉터리로 재빌드한 front/back PNG와 frames.json은 게임 자산과 바이트 단위로 일치했다.

- [실제 등각 전장](evidence/elf-sd/battle-isometric.png), [Top 전장](evidence/elf-sd/battle-top.png), [편성](evidence/elf-sd/party.png)
- [동작 GIF](evidence/elf-sd/TacticsSD-SD-Elf-motion.gif): 실제 Renderer를 48시점에서 저속 검수용으로 샘플링한 네 방향·6상태. 첫 행은 게임의 실제 크기, 나머지는 검수용 확대. 별도의 게임 진행 증거와 구분한다.
- [앞면 무기 동작](evidence/elf-sd/actions-SE.png), [뒷면 무기 동작](evidence/elf-sd/actions-NE.png), [상점 활](evidence/elf-sd/shop-bows.png)
- [48프레임 투명 여백·해시](evidence/elf-sd/alpha-audit.json), [실행 상태/페이지 오류](evidence/elf-sd/runtime.json), [Library 저장 결과](evidence/elf-sd/library-results.json)

최신 전체 검사 결과는 [VALIDATION.md](VALIDATION.md). 실제 1024×768 CSS / DPR2 / 2048×1536 캡처를 확인했다. 4키프레임으로 표현하는 스타일이며 연속 관절 IK나 독립 6인 원화는 아니다. 실물 패드·Steam Input·물리 GPU 프레임률은 미검증이다. Chromium/SwiftShader와 모의 Gamepad 결과를 실물 검증으로 표현하지 않는다.
