> 2026-10-04 후속 승인 반영: 5슬롯/공통계산/공격·대상HUD 단계71domain·37browser통과. 이후 상점44품목(원문28+창작16),고유아트44개,원문1170참조도감과9이미지 비교 구현. [SHOP.md](SHOP.md), [SCREEN_COMPARISON.md](SCREEN_COMPARISON.md), [최신검증](VALIDATION.md)을 우선한다. 아래 최초감사는당시상태의역사기록이다.


## 후속 승인 단계의 재현 가능한 신규 발견

|우선순위|재현/근거|수정과 검증|
|---|---|---|
|P2|새 원정→거점→편성→보급품,1024×768/DPR2에서7종추가후돌아가기버튼하단잘림. [전](evidence/shop/items-before-fit.png)|`game/style.css:16` 카드높이/간격수정. `tests/game/tests/browser/shop.spec.ts:40` 버튼bottom<668 확인. [후](evidence/shop/items.png)|
|P2|새원정→첫거점,회전/skew된미리보기타일이오른쪽뷰포트를넘음. [전](evidence/shop/stage-before-fit.png)|`game/style.css:17` 최소화면폭/오른쪽여백수정. `shop.spec.ts:43`64타일전체경계검사. [후](evidence/shop/stage.png)|
|P3|생성아틀라스의불규칙행간때문에규칙크롭후반지/활에이웃조각이섞임|객체별영역/연결성분분리. [44개최종갤러리](evidence/shop/all-44-icons.png),모두고유영역/이름대조. 신규36프레임은픽셀해시서로다름·최소14px투명여백|

상점거래/저장실패/동시확인취소/패드해제/복원/실제전투장착의독립경계검증은 `tests/game/shop.test.ts`와 `tests/game/tests/browser/shop.spec.ts`에있다. 최종 실행 결과는 VALIDATION.md를 따른다. 최종아트변경중개발서버HMR로끊긴실행은제품결함으로집계하지않으며,이후파일고정후정상전체게이트를별도로남긴다.


# TacticsSD 독립 재검증 — 2026-10-04

## 판정

**기본 캠페인은 실행·완주 가능하지만, 원 요구 전체의 완료 판정은 보류한다.** 독립 세션에서 키보드 3전투, 엔딩, 저장 복원, 기존 리깅 회귀를 재실행했고, 모의패드도 3전투 전체로 검증 범위를 확장했다. 모두 통과했다. 그러나 기존 테스트 밖에서 **P1 2건과 P2 7건의 재현 가능한 결함**을 확인했다. 원본 레이아웃·콘텐츠·계산 기준에 비해 큰 설계 축소도 남아 있다. 테스트 통과와 요구 충족은 동일하지 않다.

- P0: 발견하지 못함. 저장 파괴나 전체 실행 불능은 재현하지 못했다.
- P1: 취소 버튼을 선택했는데 공격 실행, 패드 전용 설정 흐름 탈출 불가.
- P2: 재매핑 충돌, 포커스 복귀/연결해제 입력 재실행, 취소 후 무료 방어, 빗나감 TP 지급, 범위 회복 대상 반전, 리깅 파츠 교체 미반영, 전장 이름 가림.
- 별도 품질·설계 차이: 무기 동작 표현, 화면 자료 재현 수준, PSP 성장/학습/KO 등 생략, 자체 수치와 One Vision 공식 적용 범위.

게임 코드·에셋·기존 도구를 수정하지 않았다. CardGuild는 읽기만 했고 커밋·푸시·배포하지 않았다. 이 문서와 `evidence/revalidation/`만 감사 산출물이다. 기존 미커밋 사용자 변경을 보존했다.

## 범위·환경·재현 증거

프로젝트/상위 경로의 AGENTS.md와 프로젝트 .agents는 발견하지 못했다. `/home/deck/.agents/skills`를 확인했고 Pixi 접근성 스킬은 확인용으로 읽었다. 게임 렌더러가 Canvas2D이므로 Pixi 접근성 구현 지침을 억지로 적용하지 않았다. 게임 QA에는 `game-studio:game-playtest`의 화면 캡처·입력·회귀 검증 절차를 적용했다. 추가 PDF에는 Library·PDF 스킬의 파일 전송 및 시각 판독 절차를 적용했다.

- 실제 소스: `/home/deck/Documents/TacticsSD`. 읽기 전용 Vite 서버, 별도 캐시 `/tmp/tacticssd-audit`, 브라우저 주소 `http://127.0.0.1:4174/game/`. 4173 사용 중이어서 감사 서버는 4174를 사용했다.
- Chromium headless / 소프트웨어 렌더링. 기본 **1024×768 CSS px, DPR 2, 캔버스 2048×1536**. 1280×900 → backing 2560×1800, CDP로 실제 DPR 1 변경 → backing 1024×768 확인.
- `tacticsDiagnostics()`는 읽기만 사용. 실제 게임 진행은 키보드 또는 `navigator.getGamepads()` 모의입력. 별도 domain/renderer fixture만 메모리에서 구성했으며 게임 소스나 저장 파일을 변경하지 않았다.
- `npm run lint`: 성공(tsc + git diff --check). 원 Vite 설정을 runner 방식으로 읽고 `/tmp`에 빌드: 성공.
- 기존 도메인 **61/61**, 브라우저 **26/26** 성공. 기존 브라우저 테스트의 출력 폴더와 스크린샷 경로만 임시 디렉터리로 분리했다. 게임·도구 테스트 본문은 수정하지 않았다.
- 추가 **모의패드 3전투 → 엔딩 → 리로드 → 3/3 저장 복원** 성공(1/1, 3.4분). 기존 키보드 완주 시나리오의 입력 기본값을 모의패드로 바꾼 확장 검사다. 기존 검증은 모의패드 한 전투였다.
- 독립 계산 순서 경계 1,000건: floor/max/배율 순서 불일치 0. 이는 전체 원작 계산 구현 확인이 아니라 **현재 구현한 물리/집중 무기 계산의 순서 검사**다.
- 실행 중 확인된 pageerror 없음. 현재 기능의 기본 흐름과 정상 저장은 검증되었으나 실물 패드/Steam Input/하드웨어 GPU는 검증하지 못했다.

증거: [기존 브라우저 회귀 로그](evidence/revalidation/browser-regression.log), [도메인 회귀 로그](evidence/revalidation/domain-regression.log), [패드 완주 로그](evidence/revalidation/pad-full.log), [빌드 로그](evidence/revalidation/build.log), [입력 결과](evidence/revalidation/results.json), [포커스 결과](evidence/revalidation/focus-results.json), [도메인 경계 결과](evidence/revalidation/deep-results.json), [리깅 호환 결과](evidence/revalidation/rig-compat-results.json).

재현 스크립트는 같은 폴더의 `audit.mjs`, `focus.mjs`, `deep.mjs`, `rig-compat.mjs`, `full-pad.spec.ts` 및 설정 파일이다. 이들은 현재 프로젝트 절대경로와 4174를 사용한다. `/tmp/tacticssd-audit`를 준비하고 `server.mjs`로 서버를 시작한 후 Node로 각 mjs를 실행한다. 패드 완주/기존 회귀는 해당 Playwright config로 실행하며 작업 디렉터리에 읽기용 game/tools 링크와 쓰기용 docs/game/evidence를 마련한다. 모든 새 출력은 /tmp에 둔다. `source-sha256.txt`는 검증 대상 주요 소스의 해시다.

## 실제 재현된 결함

### F01 · P1 · “명령으로 돌아가기”에 포커스한 Enter가 공격을 확정

- 위치: `game/main.ts:509`의 target confirm 특례, `game/main.ts:518`의 일반 포커스 처리보다 먼저 실행. 버튼은 `game/main.ts:581`에서 제공한다.
- 재현: 새 원정 → 첫 전투 → E로 기사 선택 → 이동 → 오른쪽, 아래, 오른쪽, 오른쪽 → 확인(4,3의 내부좌표에 도착) → 무기 공격. Tab으로 **명령으로 돌아가기**에 포커스 → Enter.
- 실제: `focused=back-command`, mode `target → animating`, 잿빛 기사 HP **55 → 24**. 취소 의도로 선택한 UI에서 되돌릴 수 없는 행동/RT 슬롯이 소비된다. Esc 취소는 정상이라는 기존 테스트로 이 문제를 검출할 수 없다.
- 증거: [입력 직전](evidence/revalidation/focused-cancel-before.png), [입력 직후](evidence/revalidation/focused-cancel-after.png), `focus-results.json`.
- 최소 보완: target 모드에서도 실제 포커스 버튼의 의미를 존중하고, 전장 단축 확인과 DOM 버튼 활성화를 분리한다. Tab→취소 버튼→Enter, Tab→설정 버튼→Enter를 회귀에 추가한다.

### F02 · P1 · 패드만으로 키 재매핑 화면에 들어가면 탈출 불가

- 위치: `game/input.ts:177-190`, `game/main.ts:590`.
- 재현: 표준 모의패드로 입력 설정 → “위”의 **키보드 키** 버튼 선택 → B(패드1), Start(9), 방향키 입력.
- 실제: capture가 keys이면 패드 cancel/menu도 모두 무시한다. 설정 화면의 “키를 누르세요. Esc: 취소”에 머물러 키보드가 필요하다. 패드 버튼 캡처에서는 B를 누르면 취소 대신 B가 새 입력으로 저장되며, 원래 취소는 패드12로 교환된다.
- 증거: [탈출 불가 화면](evidence/revalidation/pad-capture-trap.png), `results.json`의 padKeyboardCapture/padCancelRebind.
- 최소 보완: 캡처 중에도 패드로 실행 가능한 명시적 취소 동작(예: 별도 고정 조합/길게 누르기)을 제공하고 안내한다. 키/버튼 캡처 각각에서 패드만으로 진입·취소·복원이 가능해야 한다.

### F03 · P2 · 저장 가능한 키와 실행 가능한 키가 다름 — Tab/Space

- 위치: `game/input.ts:111-120`은 임의 키를 저장, `133-134`는 Tab을 무조건 제외, `197-198`은 Space에 항상 confirm 추가.
- 재현 A: 위 이동을 Tab으로 재매핑 → 전투 이동 모드에서 Tab. 저장값은 `Tab`이지만 cursor는 **(1,2) → (1,2)**로 불변이다.
- 재현 B: 시점을 Space로 재매핑 → 전투 명령의 이동 버튼에 포커스 → Space. 시점만 바꾸려 했지만 **top=false→true와 mode=command→move**가 함께 발생한다. 다른 포커스에서는 행동 확정으로 이어질 수 있다.
- 증거: `results.json`의 tabBinding/tabBefore/tabAfter/spaceBefore/spaceAfter, [Space 이중동작](evidence/revalidation/space-double-action.png).
- 최소 보완: 예약키를 캡처 단계에서 거부하거나 재매핑 후 일관되게 처리한다. Space 보조 확인은 다른 action에 배정되어 있지 않을 때만 활성화한다.

### F04 · P2 · 창 복귀·패드 연결해제 시 기존 확인 입력이 다시 실행

- 위치: `game/input.ts:142-143`, `158-163`, `193-200`.
- 재현 A: 전투에서 패드 A를 누른 채 창 blur → focus. 실제 UI는 pause로 들어갔다가 A를 떼지 않았는데 즉시 닫힌다.
- 재현 B: Enter를 계속 누른 상태에서 모의패드를 disconnected로 변경. 연결해제 메시지가 일시정지를 열지만 동일 키가 새 edge로 재실행되어 즉시 닫힌다.
- 실제: `blurred=pause`, `focusedModal=null`, `disconnectModal=null`. 창 복귀 검사에는 브라우저 이벤트를 직접 발생시켰고 패드 연결해제는 모의 API를 사용했다. 실물 장치/OS 전환 결과라고 주장하지 않는다.
- 최소 보완: blur/focus 및 장치 전환 후 모든 입력에 neutral/release 대기 적용. 중단 시점에 누르던 입력으로 모달을 자동 해제하지 않도록 한다.

### F05 · P2 · AT 종료를 취소해도 무료 방어 +8 유지

- 위치: `game/main.ts:360-363`, `385-387`; 방어 적용은 `game/domain.ts:142`.
- 재현: 첫 전투 기사(TP0) 선택 → AT 종료/방향 → Esc로 취소 → 다시 공격·이동 가능.
- 실제: `guard=false→true`, `tp=0`, `skillUsed=false`, `skillRT=0`, AT 진행 없음. 결의의 TP8·추가 RT15를 지불하지 않고 방어 효과를 유지한다. “대기하면 방어” 설계가 의도되어도 **취소된 대기의 효과가 남는 것**은 별도 오류다.
- 증거: `results.json`의 beforeWait/afterCancelWait, [명령 복귀 화면](evidence/revalidation/free-guard.png).
- 최소 보완: 확정한 대기에만 효과를 적용하거나 취소 시 임시 guard 상태를 복구한다. 취소 후 공격한 경우에도 보너스가 남지 않는지 검증한다.

### F06 · P2 · 빗나간 공격에도 가해/피격 TP 지급

- 위치: `game/domain.ts:178-191`.
- 별도 fixture 재현: 첫 전투 기사와 인접 적, 적 NW, RNG seed3 → 무기 공격.
- 실제: 로그는 “빗나감”, 적 HP **55→55**인데 공격자 TP **+6**, 피해자 TP **+4**. 피해 판정에서 continue 후, victims 전체에 자원 지급한다.
- 근거: 공식 PSP 매뉴얼 인쇄 p38는 TP가 시간 및 실제 가해/피해와 함께 축적됨을 설명한다. 자체 UI도 “피격 시 TP4”로 설명한다. 고정 획득량 자체는 자체 밸런스이나 **명중하지 않은 피해자에게 피격 보상 지급**은 구현/설명 불일치다.
- 증거: `deep-results.json`의 miss. 최소 보완: 성공하여 실제 피해를 받은 대상에만 피격 TP를 지급하고, 공격자의 획득도 명중 여부/정책에 맞춰 분리한다.

### F07 · P2 · 데이터로 추가한 범위 회복이 아군 대신 적을 회복

- 위치: `game/content.ts:5`는 heal+radius>0 허용. `game/domain.ts:177`은 범위 대상이면 무조건 다른 팀만 선택.
- 별도 fixture 재현: 기존 회복 능력 복사, id `audit-group-heal`, radius1, wounded-ally 유지 → validateContent 통과 → HP10 아군을 선택하고 인접 적 HP10 배치 → 발동.
- 실제: 미리보기 아군 회복44, 아군 HP **10 그대로**, 적 HP **10→54**, MP10 소비. 현재 출하된 회복 능력은 radius0이므로 기본 캠페인에서 바로 발생하는 오류는 아니다. **허용된 확장 경로의 검증된 오류**다.
- 증거: `deep-results.json`의 aoeHeal. 최소 보완: 효과 범위의 팀 필터도 ability.target에서 파생하고, 미리보기/실행이 공통 affectedTargets를 쓰도록 한다.
- 추가 한계: 새 효과 enum+EFFECTS만 늘려도 damage()는 heal 외 모두 피해 계산, guard는 별도 하드코딩이다. 상태·RT 변화·혼합 효과를 데이터만 추가해 구현할 수 있는 구조는 아직 아니다.

### F08 · P2 · 리깅 도구의 파츠 이미지 교체가 게임에서 무시됨

- 위치: `game/render.ts:214`와 `260`은 항상 dawn sheet/tinted sheet 사용. 대조: `tools/characterRig/runtime/renderer.ts:62-67`는 part.replacement를 실제로 선택한다.
- 재현: 기존 도구로 dawn-rig.json 로드 → dawn-parts.png 연결 → armR의 이미지 교체에 weapons.png 선택(검증용으로 눈에 띄는 기존 파일 사용) → JSON 저장. 저장 JSON에는 replacement의 id/name/1254×1254가 존재. 이 수정본을 별도 게임 Renderer.setRig로 연결.
- 실제: 게임 drawImage 기록은 원본 몸체 tint 5회 + 장착 무기 1회 + 원본 머리 1회다. 교체된 armR 이미지를 별도로 그리지 않는다. 에디터에서는 교체 결과가 보인다. Front/Back에 별도 이미지를 연결하는 일반 저장 형식도 게임은 단일 sheet로 제한한다.
- 증거: [에디터 교체 화면](evidence/revalidation/rig-replacement-editor.png), `edited-rig.json`, `rig-compat-results.json`, `rig-compat.mjs`.
- 최소 보완: JSON의 view.image와 part.replacement를 해석하는 공유 asset resolver를 사용하거나 지원하지 않는 저장 형태를 명시적으로 거부한다. “도구 호환”을 crop/pivot/pose 수정만 지원하는 것으로 조용히 축소하지 않는다.

### F09 · P2 · 전장 이름 텍스트가 다음 지형 타일에 잘림

- 위치: `game/render.ts:89-105`의 지형/유닛 혼합 depth 순서, `223-229`에서 유닛과 함께 HP/이름을 즉시 렌더.
- 재현: 기본 편성으로 첫 전투 시작, 카메라 초기화 상태에서 등각과 Top을 각각 관찰.
- 실제: 일부 이름 하단이 뒤이어 그려지는 지형에 가려진다. Top에서는 인접 행의 캐릭터·HP바·이름이 겹쳐 식별이 더 어렵다. DOM 버튼 경계 검사는 캔버스 텍스트 가림을 탐지하지 않는다.
- 증거: [등각](evidence/revalidation/battle-isometric.png), [Top](evidence/revalidation/battle-top.png). 기본 1024×768 DPR2 화면이며 확대/패닝으로 의도적으로 UI를 가린 결과가 아니다.
- 최소 보완: 지형/배우 깊이 정렬을 유지하고 이름·HP·선택 표시는 별도 overlay pass에서 렌더한다. Top의 셀 간격에 맞춰 표시 위치와 캐릭터 크기를 조정한다. 배우 투과 마스크를 추가할 필요는 없다.

## 육안 품질과 원본 자료 대비 설계 차이 — 위 결함과 구분

### 리그·무기

현재 모델은 앞/뒤 6파트, evaluateWorldRig 기반 Idle/Walk, 공격 중 팔 변환으로 **실제 파츠 애니메이션**을 수행한다. 정적 스탠디로 대체한 구현은 아니다. 8개 무기 프레임도 존재하고 오른팔 행렬을 상속한다. 4방향 반전과 투영 전환에서 좌표/논리 상태 유지가 확인되었다. 네 대원이 같은 리그의 색 변형인 점도 사실이다.

다만 [8무기×4방향 확대](evidence/revalidation/weapons-directions.png)와 [공격 4시점](evidence/revalidation/attack-phases.png)을 보면 활은 몸 옆에 낮게 매달려 있으며, 사격 중 반대팔·활시위의 당김/해제가 없다. 뒤쪽 시점에서 무기가 몸에 많이 가려져 장비 식별이 어렵다. `game/render.ts:196-203`은 오른팔 하나만 회전/이동하며 `attack.kind`는 애니메이션 선택에 사용하지 않는다. 그래서 무기/아이템/직업 행동의 표현도 상당 부분 공유한다. 코드에서 움직이는 것과 “손으로 잡아 쏘거나 휘두르는 동작이 명확하게 읽히는 것”은 별개다. **P2 수준의 시각 품질 보완 권고**이며 기본 애니메이션 기능 부재라고 판정하지 않는다. 활의 양팔 자세·그립·시위, 뒤쪽 z-order, 행동별 표현을 먼저 보완한다.

ImageGen 생성 이력은 ART.md의 기록과 자산 존재/픽셀을 확인했다. 이 독립 세션에는 최초 생성 도구 호출 원본이 없으므로 **생성 도구 provenance 자체를 독립 재인증한 것은 아니다**. 현재 실제 PNG/JSON과 런타임 사용은 검증했다.

### 원본 9장 대조

|원본|현재 구현에서 확인한 것|누락/축소와 판정|
|---|---|---|
|main.png|기존 도구 진입 화면과 별도 /game 링크|기존 제작 도구 유지 확인. 게임 진입 추가는 합리적 확장|
|world_map.jpg|지도·경로·거점·자금·완료표시|상단 지명 설명, 달력, 이동 중 캐릭터/지도 조작은 축소. 원본에 보이는 **Reborn Union Level은 PSP 규칙에 가져오면 안 됨**|
|stage_map.jpg|월드와 같은 배경의 거점 설명 패널|지역 내부 연결 거점·입체 장소 썸네일·대원 말판이 없다. 추적표의 “연결 거점”은 월드 SVG와 중복 대응|
|party_select.jpeg|4인 후보, 1~3인 선택, 능력 설명|전장 배치판/출전 위치 선택/부대 슬롯·게스트·목록 구조 없음. 카드 토글로 크게 재설계|
|equipment.jpg|직업별 2무기, 2갑옷, 능력 수치|다중 장비 슬롯, 조건/기본값vs최종값, AGI/AVD, SP/스킬 관리 없음. 장비 선택에는 무기별 이미지 썸네일도 없음|
|item_select.jpg|치유의 잎 설명과 전투 중 대상 선택|원본은 무기 분류 아이콘·재고 목록·능력 상세 선택 화면. 현재 보급품 도움말로 대응하므로 기능/레이아웃 일치가 낮음. **3종 소모품이 아니라 1종×3개**|
|event_dialog.jpg|대사·초상·선택 응답|현장 등각 장면, 인물 배치, 상/하 대화 배치 없음. 두 선택지는 notice 한 줄 뒤 같은 대사/같은 전투로 합류|
|battle_isometric.jpg|등각 높이·개별RT·명령·이동·행동·턴바|훨씬 작은 빈 8×8 보드, 지형/오브젝트/전투 규모 축소. 1·2전투는 타일 데이터가 완전히 동일, 3전투도 6타일 높이만 다름|
|battle_topview.png|동일 보드 Top 전환·대상·피해/명중|아군/적 초상과 하단 상세 HUD, 지형별 풍부한 시각 구조 부재. F09 가독성 결함 있음|

양피지·색감·지도 분위기는 참고했지만, **“자료를 최대한 가깝게 활용”을 전체 충족했다고 보기 어렵다**. 표의 기능이 모두 원작 완전복제 요구라는 뜻은 아니다. 다만 단순화 범위는 사용자가 수락해야 하며 인계문에 “범위 밖”이라고 적는 것만으로 원 요구가 변경되지는 않는다.

### docs/URL.txt 7개 및 계산 기준

|자료|현재 실체|판정|
|---|---|---|
|weapons|4계열×2변형, variant bonus 0/5, frame/grip/animation|원본 아이템 ID/통계 테이블을 도입한 것이 아님. 무기별 RT·중량·속성·부가효과 없음|
|armor|gear.armor 0/1, DEF+4·move−1·resistance+5|원문 방어구 데이터·슬롯·능력 보정 구조 미도입|
|sundries|mend-leaf 한 종류, 전투마다3개|원본 재고/사용 조건/다양한 소모 효과 체계 없음|
|classes|자체 기사·궁수·마도사·치유사 4개|클래스 stable ID/Zod는 유용. 클래스 변경, 여러 명의 동일 클래스 공유 성장, 습득 목록은 없음|
|skills|weaponRank1 수련3개 + 하드코딩 결의|스킬 장착/학습/경험 성장·상태 효과 확장 모델은 없음|
|abilities|고정 직업 기술4개 + 아이템 회복1개|cost/range/radius/target/effect 데이터화는 확인. F07처럼 허용 조합이 실제 실행에서 깨짐|
|calculator|STR/DEX/focus 무기 계수 및 floor/max 순서|이 부분은 원문과 일치. **스탯/성장/장비 수치·마법·명중 전체가 원문 기준인 것은 아님**|

`game/calculation.ts:24`의 모든 기본 스탯 +10, `:27`의 damageBonus10, 자체 클래스 스탯/HP/MP/RT/장비는 실제 원문 테이블과 연결되지 않은 작성값이다. statsSchema에는 AGI/AVD가 없고 RES는 현재 damage()/accuracy() 결과에 사용되지 않는다. HP는 stage+1에 따라 일률 +6이고 경험치 성장/공유 클래스 레벨이 아니다. `makeBattle(stage,...)`가 레벨을 결정하므로 클리어한 뒤 첫 거점을 재방문하면 해당 스테이지 레벨로 다시 구성된다.

현재 물리/집중형 무기 계산 순서와 HUD/실제 피해의 공통 함수 사용은 확인했다. 첫 전투의 실제 단일 공격 예시는 미리보기31·실제 HP55→24로 일치했다. 명중은 정면90/측면95/후방100에서 초지3 차감이라는 자체 규칙이며, 스탯이 높아져도 변하지 않는다. MP/TP 초기0, 개별RT와 이동/행동/별도기술 allowance는 PSP 방향에 맞지만 수치들은 자체 규칙이다. 장비 중량별 RT, 다중 효과·상태, 클래스 학습은 현재 데이터 구조로 완성되어 있지 않다.

### 추가 참고 PDF: One Vision v1.11d

사용자 제공 `Readme v1.11d.pdf`를 Library 지원 경로로 이 SteamDeck에 직접 내려받아 **138페이지·1,956,283 bytes**를 확인했다. 로컬 원본은 `/home/deck/Documents/Codex/2026-10-04/task-3/reference/Readme v1.11d.pdf`, Library ID `libfile_0fda063aa13c8191956b0dfeb63c69ea`이다. 전체 텍스트를 검색하고 관련 페이지를 읽었으며 핵심 계산 페이지 7·8은 PNG로 렌더링해 시각 확인했다.

이 파일은 **raics의 PSP One Vision 모드 변경 이력**이며 공식 바닐라 PSP 매뉴얼이 아니다. 설치/ROM 패치 지시는 실행하지 않았다. 추가 제공을 전체 모드 콘텐츠 구현 승인으로 해석하지 않는다.

- PDF p1: balance mod로 명시. p3 FAQ: 기존 docs/URL의 One Vision 사이트와 클래스/장비/계산표 자료 연결.
- PDF p4, v1.11a: focus attack에 DEX 포함 및 강화/약화 영향 언급. 현재 집중형 무기 계수와 관련 있으나 이것이 **모든 마법을 동일 무기 공식으로 처리해도 된다는 근거는 아니다**.
- PDF **p7, v1.10a**: 마법 피해는 INT×1.2+MND×0.6에 대해 RES×1+MND×0.5로 방어하며 DEF 절반 무시, 물리 속성 저항의 절반 적용 등을 명시. 현재 게임은 집중형 공격 (DEX+INT+MND)×0.6 대 STR×0.5+VIT, DEF 전량 적용이므로 다르다.
- PDF **p8, v1.10**: 무기 명중 AGI×1.2+DEX×0.6, 회피 AVD×1.2+DEX×0.6, 무기 스킬 rank당8%, 방향별 하한 등의 규칙을 명시. 이후 p7이 일부 마법 계수를 다시 수정하므로 **오래된 패치 수치를 최신값으로 섞으면 안 된다**.
- PDF p58: 클래스 VIT/HP 성장 조정, p112의 누적 장비 설명: 무기별 중량·행동RT와 다양한 부가효과. 현재 게임의 동일 공격RT25와 변형 ATK+5로는 이러한 구조를 표현하지 않는다. p112 값을 개별 후속 패치 검토 없이 최신 확정값으로 가져오지는 않는다.

따라서 CALCULATION.md의 “계산기 화면이 Coming soon이므로 마법·명중을 자체 규칙으로 대체”라는 설명은 **추가 참고자료까지 검토한 현재에는 충분한 근거가 아니다**. 자료에 존재하는 규칙과 실제 채택한 자체 규칙을 항목별로 다시 대조해야 한다. 바닐라 PSP 구조를 유지하면서 어떤 One Vision 수치·계산만 따를지는 사용자 의도를 확인할 변경 범위다.

참조: [공식 PSP 설명서](https://support.na.square-enix.com/document/manual/1840/ogre.pdf), [One Vision calculator.js](https://ogre-db.github.io/one-vision/js/page/calculator.js), [formula.js](https://ogre-db.github.io/one-vision/js/formula.js), [클래스 페이지](https://ogre-db.github.io/one-vision/classes.html). 공개 JS 원문에서 반올림 순서와 무기/명중 계수를 직접 읽었다. calculation.ts 주석의 scaling IDs “1/2/5”도 현재 공개 formula.js의 해당 무기 그룹 “1/7/13”과 달라 문서성 보정이 필요하다(P3).

## PSP 판본·단순화의 수락 범위

공식 매뉴얼 인쇄 p34·36·37·38을 실제 페이지로 확인했다. RT0→AT, 고저차와 투사체 사거리, 행동 전 이동 재선택, MP/TP 초기0, 시간 및 피해에 따른 TP, 별도 스킬 메뉴의 방향성은 맞는다. SFC식 턴 계산이나 Reborn Union Level을 구현에 섞은 증거는 찾지 못했다. 원본 world/stage 이미지에 있는 Union Level은 시각 자료와 판본 규칙을 분리해야 한다.

공유 클래스 XP·SP 학습·스킬 장착·전직/클래스마크, KO카운트·영구사망, 날씨, Chariot, 상점/인벤토리/제작, 다채로운 전장 목표는 미구현이다. 일부는 작은 캠페인에서 합리적으로 축소할 수 있으나 **사용자가 실제 승인했다는 근거는 이 감사에 주어지지 않았다**. 전투는 각 유닛 HP0 즉시 제외·전멸 조건이고 240 AT를 넘으면 강제 패배한다(`game/domain.ts:167`); 이 숨은 제한도 인계에 명확히 표시해야 한다.

대화 선택은 짧은 응답 표시 뒤 합류, 자금은 누적 표시만 있고 소비처 없음, 전투 중 저장은 스냅샷이 아니라 출전 전 체크포인트 복원이다. UI에 체크포인트 설명은 있다. 이들은 확인된 설계 단순화이며 저장 실패나 분기 버그로 분류하지 않는다.

CardGuild와의 대조에서는 `BoardViewConfig.ts:89-90`의 45도/Y0.5 투영, `BoardProjection.ts`의 정방격자 투영과 높이 구조를 읽었다. 게임의 .7/.35 좌표는 같은 2:1 등각 형태이며 논리 좌표와 뷰 전환을 분리한다. 캐릭터 주변 지형을 뚫는 투과 마스크는 게임 렌더러에서 발견하지 못했다. CardGuild의 에셋·파일 변경은 수행하지 않았다.

## 검증 한계

- 실물 컨트롤러, Steam Input/SDL, 실제 OS의 장치별 키 이름, 하드웨어 GPU, 여러 브라우저는 미검증. 모의패드/합성 focus 이벤트 결과와 분리했다.
- 파츠 crop/pivot/소켓/4방향 수정·JSON 저장/재로드 및 기존 리깅 테스트는 통과. 모든 가능한 replacement/다중 atlas 조합의 게임 호환을 통과한 것은 아니며 F08로 실패 경계를 확인했다.
- 공격의 hit 시 HUD/실제 피해 일치와 miss 경계는 확인. 모든 AI 배치·모든 RNG seed·모든 콘텐츠 조합을 완전 탐색하지 않았다.
- 9개 원본 이미지는 전부 실제로 열어 비교했다. 원본과의 유사도는 수치 점수로 꾸미지 않았으며, 관찰 가능한 구성·기능 차이로 기록했다.
- 새 PDF 138페이지 전체의 패치 우선순위를 완전 정규화하지 않았다. 이번 감사에는 관련 계산/성장/장비 부분만 사용했다. 최신 OV 전체 규칙을 구현했다고 선언할 근거가 아니다.

## 최소 보완 순서와 변경 승인 범위

1. **먼저 F01/F02**: 취소 의도가 공격이 되는 경로와 패드 설정 탈출을 해결. 두 재현을 회귀 테스트로 추가한다.
2. **F03/F04/F05/F06**: 입력 reserved-key/neutral 처리와 취소 상태·TP 판정 수정. 기본 완주 테스트보다 이 경계 회귀를 우선한다.
3. **F07/F08/F09와 무기 자세**: 확장 데이터의 대상 일관성, 도구 저장 형식 호환, 이름 overlay, 활/후면 그립 보정.
4. 자료 추적표를 실제 수준으로 수정: “3소모품”을 “치유의 잎 1종, 전투당 3개”로 명확화, 지역 거점 구조·장비/아이템 UI의 미구현, 수치 출처와 자체 규칙, 240 AT 제한을 명시한다.
5. PSP/One Vision/자체 콘텐츠 세 열로 계산·성장·장비·명중·RT 규칙표를 확정한 뒤 필요한 구조를 보완한다. “전부 복제”와 “현재 3전투 프로토타입 유지” 사이에서 임의로 범위를 확정하지 않는다.

이번 위임은 **읽기검토·테스트·감사문서만** 허용하므로 수정 코드는 작성하지 않았다. 다음 구현 요청이 필요하다. 재현된 결함의 최소 수정, 에디터 저장 호환, 가독성 수정은 목표가 명확하다. 별도 범위 합의가 필요한 것은 원작 성장/KO/Chariot 등의 도입 여부, One Vision 계산·수치 채택 범위, 콘텐츠 수량·UI 재구성 수준, 별도 캐릭터 원화 추가다. 실물패드/GPU 검증은 해당 장비 환경이 필요하다.


## 감사 이후 승인된 보완
이 문서와 증거는 수정 전 독립 감사 기록이다. 이후 승인된 수정·재검증·남은 차이는 [REMEDIATION.md](REMEDIATION.md), 최신 실행 결과는 [VALIDATION.md](VALIDATION.md)에 별도로 기록한다. 기존 발견을 소급 삭제하지 않았다.
