# Three.js 전장과 8클래스 스탠디

2026-10-07 · 기준 체크아웃 97732a1 · 미커밋 작업

## 10월 7일 수정

8클래스 모두 실제 ImageGen으로 직선 정면/후면을 다시 생성했다. 원본 16장, 분리 이미지 96개, 앞뒤 면을 가진 강체 파츠 48개를 교체했다. 앞선 3/4 그림은 각 클래스의 `previous-2026-10-06/`에 보존하고 런타임에서 사용하지 않는다.

- 해부학적 머리 높이 H=400, 두개골 정수리 -1000, 턱 -600, 발바닥 0으로 **2.5H** 계약을 적용한다. 모자·땋은 머리·장식은 키 계산에서 제외한다. 가려진 두개골/후면 턱 위치는 작가의 추정치이며 Wizard는 약 ±25px 불확실성이 있다.
- 이전 150/165px 강제 축소를 제거했다. 원본 크롭 픽셀을 그대로 정확한 16:9 투명 아틀라스에 배치한다. 리그 변환으로 표시 크기를 맞추며 확대를 새 세부 생성으로 취급하지 않는다. 필터는 Linear / LinearMipmapLinear를 유지한다.
- 몸통과 다리의 배치상 겹침은 93.33 rig units, 다리 높이의 25%다. 어깨·목은 생성된 연결 여유와 기록된 관절 좌표로 겹친다. 실제 불투명 접합면의 모든 자세를 자동 판정하지 않았다.
- 파츠 두께 4(±2), Z scale 1은 유지하고 레이어 간격을 8에서 1.5로 줄였다. 다리를 통째로 Z 이동시키는 대신 골반 피벗에서 회전한다. 앞뒤 PNG 정렬에는 부모 뼈의 누적 XY 배율을 포함한다.
- 등각 캐릭터 기준 높이를 1.5→1.8, Top은 .79→.88로 조정하고 카메라 여백을 줄였다. Top 기울임·제자리 걷기·공격 구간에만 무기 표시 정책은 유지한다.
- PNG 전용 수동 캡처로 변경했다. 이번 작업에서 영상/GIF를 생성하거나 업로드하지 않았다.

## 신규 지형 아트

8종 상단 + 8종 긴 측면, 8종 소품을 세 전장에 적용했다. 기존 규칙/캐릭터/저장은 유지한다. 측면은 이웃 높이까지 실제 3D 면을 만들고 네이티브 비율로 위에서 잘라 사용한다. [상세 기록과 제한](TERRAIN_PAINTED.md), PNG는 `evidence/terrain-painted/`에 있다.

## 실행

```sh
cd /home/deck/Documents/TacticsSD
npm run game
```

- 게임: http://127.0.0.1:5173/game/
- 수동 캡처: http://127.0.0.1:5173/game/?capture=1
- 제작 도구: http://127.0.0.1:5173/tools/characterRig/
- 기존 서버가 5173을 쓰면 그 서버를 이용한다. 런처의 strictPort 정책은 유지한다.

## 렌더링 구조

`game/render.ts`의 전장은 하나의 Three.js Scene / OrthographicCamera / WebGLRenderer / depth buffer를 사용한다. 기존 Canvas2D 전장과 ElfSprites 호출은 제거했다. 지형 높이 기둥, 신규 terrain-painted 상단/긴 측면 텍스처, 6파츠 캐릭터, 무기, 커서·이동범위·대상범위가 동일 장면에 존재한다. 지형은 불투명하며 캐릭터를 보이게 하는 투명 마스크를 사용하지 않는다. 이름/HP와 기존 메뉴·상점·인벤토리는 DOM UI다. 메뉴 초상화만 동일 신규 파츠의 Canvas2D 정적 조립이다. 3D를 2D로 합성하는 경로는 없다.

기존 좌표 `(x,y)`는 Three `(x,z)`로, 타일 높이는 `h × 0.32`로 매핑한다. 선택은 동일 카메라의 Raycaster가 지형 메시를 판정한다. 키보드/게임패드 입력, 이동 경로, 방향, 턴/RT, 전투 계산, 아이템 매핑은 기존 게임 데이터를 사용한다.

- 등각: 직립한 실제 스탠디가 보드 방향으로 회전한다.
- Top: 보드는 수직 내려보기다. 캐릭터 전체를 카메라 쪽으로 기울여 타일 안에 작게 놓는다. 얇은 옆면 때문에 사라지지 않으며, 바닥 삼각형이 실제 종료 방향을 나타낸다. 지형 깊이 판정은 계속 적용한다.
- 정면/후면 검토: 같은 게임 리그와 같은 Scene/Renderer에 8클래스 Rest 포즈를 나열한다. 후면은 실제 메시를 180도 회전해서 본다.

`tools/characterRig/runtime/standee.ts`는 기존 도구의 crop → 앞뒤 pivot 정렬/뒤면 mirror → alpha union → contour/holes → PNG caps + side-only extrusion을 추출한 공용 모듈이다. 모든 파츠의 총 두께는 4 rig units(±2), bone의 Z scale은 1, 옆면은 불투명 `#25232A`다. 머리도 PNG 윤곽 스탠디이며 구체·얼굴 복원·모핑은 없다. 한 파츠는 한 Bone을 따르고 몸통이 나머지 다섯 뼈의 부모다. 클래스 인스턴스는 불변 geometry/texture만 공유한다. 기존 제작 도구의 2D/3D 및 import/export 경로는 유지한다.

기본 Idle은 느린 제자리 걷기이며 게임 좌표와 RT를 변경하지 않는다. 이동·공격·아이템·피격·쓰러짐은 단순 강체 동작이다. 장비는 기존 무기/아이템 아틀라스와 grip 매핑에서 생성한 스탠디로 손뼈를 따른다. **무기/피해 스킬의 유효 공격 구간에만 표시**하며 대기·이동·아이템·피격·쓰러짐에서는 숨긴다. 공격 완료와 전장 초기화에서 상태를 정리한다.

## 아트 등록

실제 ImageGen을 Astra 하위 작업 4개에 두 클래스씩 분담했다. 기존 26포즈 시트는 참고 이미지로만 사용했다. 재사용한 클래스 파츠는 0개다.

| 클래스 | 앞면 파츠 | 뒷면 파츠 | 등록 위치 |
|---|---:|---:|---|
| Warrior | 6 | 6 | game/assets/class-parts/warrior |
| Archer | 6 | 6 | game/assets/class-parts/archer |
| Wizard | 6 | 6 | game/assets/class-parts/wizard |
| Cleric | 6 | 6 | game/assets/class-parts/cleric |
| Spellblade | 6 | 6 | game/assets/class-parts/spellblade |
| Knight | 6 | 6 | game/assets/class-parts/knight |
| Terror Knight | 6 | 6 | game/assets/class-parts/terror-knight |
| Berserker | 6 | 6 | game/assets/class-parts/berserker |

총 48개의 앞뒤 면을 가진 강체 파츠 / 96개 이미지 조각. 10명 로스터 중 Sentinel은 Knight, Sage는 Cleric 아트를 사용한다. 각 클래스에는 `front.png`, `back.png`, 생성 프롬프트, `source-landmarks.json`, 네이티브 `crops/`, `parts.png`, `rig.json`이 있다. `class-standees.ts`가 모든 클래스 리그와 시트를 로드한다.

| 클래스 | 런타임 아틀라스 |
|---|---|
| Warrior | 3104×1746 |
| Archer | 3168×1782 |
| Wizard | 3600×2025 |
| Cleric | 3248×1827 |
| Spellblade | 3072×1728 |
| Knight | 3152×1773 |
| Terror Knight | 3312×1863 |
| Berserker | 3072×1728 |

모두 정확한 16:9이며 Front 6개 윗줄 / Back 6개 아랫줄이다. 파츠 순서는 head, body, armL, armR, legL, legR. 입력 원본은 주로 1672×941, Spellblade/Knight는 1659×948이고 원본은 변경하지 않았다. 크롭은 소유한 alpha 연결 성분의 가장자리 4px를 보존하고 이웃 파츠 혼입만 제거했다. 후면 팔 이름은 셀 순서가 아니라 해부학적 좌우로 등록한다. 상세 네이티브 파츠 크기와 리그 좌표는 `game/assets/class-parts/manifest.json`에 기록한다.

재정규화(별도 출력 디렉터리, Pillow 필요):

```sh
python game/scripts/prepare-class-parts.py game/assets/class-parts /tmp/repacked-class-parts
```

## 저장과 검사 정책

저장은 기존 stable-ID version 2 형식을 유지한다. 구 version 1 및 일부 로스터 장비가 누락된 과거 version 2는 거부한다. 자동 마이그레이션/장비 증가 코드는 제거했다. 브라우저 저장소 삭제 코드는 실행하지 않았다.

10월 6일 실행 기록(이번 미술/렌더 수정에서 규칙 검사는 다시 실행하지 않음):

- `npm run check`: 통과.
- `npm run test:rules`: 5파일, **38 통과 / 기존 비규칙 리그 검사 3 제외**. 전투 계산·이동·턴·상점·현재 저장 roundtrip/구형 거부·공격 중 무기 표시의 순수 상태 규칙 포함.
- `npm run build`: 통과. Three 공용 chunk가 500 kB를 넘는 Vite 안내가 있다.
- `git diff --check`: 통과.
- Playwright/UI/GPU/픽셀 자동 검사, 캠페인 재생: 실행하지 않음.

`npm test`, `test:all`, `verify`에서 브라우저 자동 검사 실행을 분리했고 `test:browser` 스크립트는 제거했다. 이전 Playwright 테스트 소스·설정·의존성과 과거 증거는 보존했다. 해당 파일의 완전 삭제는 이번 변경 범위에 포함하지 않았다. 수동 캡처 도구는 테스트 runner와 별개다.

## 10월 7일 검토용 PNG

첫 전투 AT 1 / RT 0에 수동 진입한 뒤 제공된 PNG 버튼을 사용했다. 캠페인 자동 재생이나 시각 pass/fail 판정은 없다.

- `evidence/three-v2/classes-front.png`: 실제 등록된 8클래스 메시 정면.
- `evidence/three-v2/classes-back.png`: 동일 메시 후면.
- `evidence/three-v2/battle-iso.png`: 실제 첫 전장 등각.
- `evidence/three-v2/battle-top.png`: 동일 전장 Top.

각 PNG는 **3840×2160**이다. 사용자 브라우저 창은 변경하지 않았으며 캡처 당시 CSS는 **806×932**, device DPR=1, 대화형 renderer DPR=1이다. PNG는 별도 논리 출력 영역 **1280×720**, export renderer DPR=3으로 같은 장면을 새로 렌더링한다. Game zoom=1이며 브라우저 visualViewport scale=1이다. 파일별 동명 JSON에 실제 CSS/backing 크기, 출력 영역, DPR, 줌, 카메라와 시각을 기록한다. 저해상도 PNG를 사후 확대하지 않았다. PNG에는 WebGL 장면과 검토용 클래스 이름만 포함하며 DOM 전투 HUD는 제외한다.

같은 origin POST와 정해진 PNG/JSON 파일명만 개발 서버에 저장할 수 있고 32 MiB로 제한한다. 프로덕션에서는 다운로드한다. 이전 `evidence/three/`는 역사 자료로 보존한다.

이번 수정의 컴파일 확인은 `npm run check`, `npm run build`다. 공용 Three chunk의 500 kB 안내가 남는다. 게임 규칙은 수정하지 않았고 규칙 검사 재실행, Playwright/UI/GPU/픽셀 자동 검사, 캠페인 재생은 하지 않았다. 하드웨어 패드 및 모든 공격/아이템 자세의 통합 검사는 수행하지 않았다. 시각 품질은 PNG를 통해 사용자가 판단한다. 커밋/푸시·브라우저 데이터 삭제는 하지 않았다.
