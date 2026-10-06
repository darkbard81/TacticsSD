# 8종 클래스 스프라이트 · 최종 검증 · 2026-10-05

`/home/deck/Documents/TacticsSD` 원본에서 `npm run verify` 종료코드 0: TypeScript/lint/Vite build + **도메인 89/89, Chromium 브라우저 50/50** 통과. [전체 로그](evidence/classes/verify-final.log).

- 6개 병렬 작업자가 실제 ImageGen으로 8종 원화를 생성했다. 8×26 = **208포즈**, 클래스별 1792×1024 RGBA / 256px 셀. 전후면 의상·정체성, 무릎 앞으로 교차/뒤로 접는 보행 교대, 점프·쓰러짐·공통 공격 포즈를 시각 검수했다. 후속 실제 생성으로 잘못된 보행 교대를 고쳤으며 최종 포즈를 전체 이미지 변형으로 만들어내지 않았다.
- 8시트 모두 26고유셀, 2투명빈셀, 8px이상 여백, 손 소켓 알파 검사 통과. [감사 결과](evidence/classes/alpha-audit.json), [8종 연락시트](evidence/classes/TacticsSD-eight-class-contact.png), [전후면 보행 검수](evidence/classes/gait-phase-review.png). 생성 원본·프롬프트·실패 시도·클래스별 QA는 `game/assets/classes/`에 보존했다.
- 기존 6명/영속 ID/기능을 유지하고 Warrior·Spellblade·Terror Knight·Berserker 4명을 추가해 **10명 중 8종 아트**가 실제 사용된다. ranger→Archer, arcanist→Wizard, healer→Cleric이며 sentinel/sage는 Knight/Cleric 아트를 공유한다. [매핑/기본값](CLASS_SPRITES.md). 신규 스킬 트리 없이 기존 능력/장비 계열을 재사용한다.
- Idle은 **5fps 제자리 walk**, 실제 이동은 9fps. 두 뷰에서 픽셀은 변하지만 Battle/좌표/RT/경로 큐가 바뀌지 않는 것을 검사했다. 구 v1/v2 저장, 유한 재고의 신규 대원 기본 장비 보충·재로드 중복 없음, 커스텀 리그 가져오기/교체/리로드/기본 복원 통과.
- 클래스·장비·앞뒤/거울·두 크기·공격 시점 **192렌더 샘플** 검증. 키보드 전체 캠페인 3전투/엔딩/저장 복원, 모의 Gamepad 전투/재연결/재매핑/5슬롯/상점 및 기존 편집기 회귀 통과.
- 실제 **1024×768 CSS / DPR2 / 2048×1536 backing**, pageerror 0: [편성](evidence/classes/party.png), [Iso](evidence/classes/battle-isometric.png), [Top](evidence/classes/battle-top.png), [런타임 수치](evidence/classes/runtime.json). [13초 실제 게임 녹화](evidence/classes/TacticsSD-class-idle-motion.mp4)는 키보드 편성→전투→Idle→이동→Top→일시정지/복귀를 담는다. Idle 중 상태 불변, 이동 입력 후 a0 좌표 (1,2)→(4,3)을 확인했다.
- 최종 통합 런타임/설정/테스트/시트 81파일 해시 일치: [manifest](evidence/classes/runtime-sha256.json). 기존 src/tools 보호대상 45파일 시작/종료 해시 동일: [보호 manifest](evidence/classes/protected-sha256.json). [적용 영수증](evidence/classes/integration.json). CardGuild 수정·커밋·푸시·배포 없음.

실행: `npm run game` → http://127.0.0.1:5173/game/ (이번 확인에서 직접 시작한 루프백 서버). 전체 게이트는 전용 4186 서버를 사용했다.

남은 한계: 실물 Steam Deck 패드/Steam Input/물리 GPU 성능은 미검증이며 Chromium/SwiftShader와 모의 패드 결과다. 장비는 기존 단일 손 소켓/공통 공격 방식을 유지하고 양손 IK는 추가하지 않았다. Library 준비 업로드는 사용 불가였으나 공식 호스트 업로드 fallback으로 연락시트와 MP4 모두 저장 완료했다. 반환된 Library ID·버전을 원본 로컬 파일에도 반영했다. [Library 저장 결과](evidence/classes/library-status.json).

---

# 정규화 26포즈 적용 검증 · 2026-10-05

실제 `npm run verify` **종료코드 0**, lint/TypeScript/Vite build + **도메인 87/87, Chromium 브라우저 49/49 통과(7.3분)**. [전체 로그](evidence/normalized26/verify-final.log). 게이트 동안/이후 런타임·설정·테스트·아틀라스 해시 동일: [해시](evidence/normalized26/source-sha256.json). 기존 에디터 주요 3파일은 이전 검증의 protected-sha256.json과도 동일하다.

실행: `/home/deck/Documents/TacticsSD`에서 **`npm run game`** → **http://127.0.0.1:5173/game/**. 이 명령 자체로 서버를 띄워 HTTP 200, 키보드 새 원정→편성→전투→Top 전환을 확인했다. 기본 브라우저 자동 열기를 요청하며 열리지 않으면 URL로 직접 접속한다. 루프백 주소만 사용한다. 중복 실행은 `Port 5173 is already in use`와 종료코드 1로 끝나 기존 프로세스를 건드리지 않는다. [실행 확인](evidence/normalized26/launch-check.json). 다른 로컬 포트는 `npm run game -- --port 5174`.

- 단일 1792×1024 RGBA 시트, 26개 고유 셀, 2개 빈 셀, 8px 이상 투명 여백, 실제 장갑 픽셀과 손 소켓 일치. 5공통 공격 포즈를 검/찌르기/활/마법/치유에서 공유한다.
- 아이템 idle→jump3→jump2→idle의 실제 Renderer 아틀라스 좌표를 검사. 사용자 리그 적용, 기본 복원 및 시트 미로드 fallback도 검사한다.
- 장비 8선택 × 앞뒤/거울 × 두 크기 × 공격 시점: 128개 렌더 샘플. 기존 신규활 구입/장착/저장/실전, 5슬롯, 사용자 교체PNG/리그 가져오기와 리로드, 편집기 전체 회귀 통과.
- 키보드 전체 캠페인/저장 복원, 모의 표준 패드 전투/재연결/재매핑/상점 검증. 실물 패드 결과가 아니다.
- 1024×768 CSS / DPR2 / backing 2048×1536: [등각 실게임](evidence/normalized26/battle-isometric.png), [Top 실게임](evidence/normalized26/battle-top.png), [편성](evidence/normalized26/party.png). 1280×900 CSS / DPR2 변경 및 실제 DPR1.5의 두 뷰포트 변경도 통과. [실행 수치](evidence/normalized26/runtime.json), pageerror 0.
- 확대 검수: [앞 공격](evidence/normalized26/actions-SE.png), [뒤 공격](evidence/normalized26/actions-NE.png), [아이템 네 방향](evidence/normalized26/items.png). 확대 이미지는 실제 ElfSprites.draw 샘플이며 게임플레이 녹화가 아니다. 점프/뒤 걷기의 손 좌표 네 곳을 픽셀 검사로 보정했다. 원본 시트/frames.json은 변경하지 않았다.

테스트는 기존 4173 서버를 재사용하지 않고 전용 4186 루프백 서버를 사용한다. 점유 시 `TACTICSSD_TEST_PORT=4187 npm run verify`로 지정한다. 첫 집중 테스트의 손 소켓 4개 실패를 수정 후 3/3 확인했고 최종 전체 게이트는 처음 실행에서 49/49 통과했다.

남은 한계: 후면 양발 걷기 차이는 승인 원화의 미묘한 차이 그대로다. 공통 공격에 장비를 붙이며 양손 IK나 활 전용 몸동작은 없다. jump/collapse 선택기는 존재하지만 기존 이동/사망 게임 규칙은 바꾸지 않았으며 비행 확장 사양은 런타임에 추가하지 않았다. 물리 컨트롤러/Steam Input/실기기 GPU 성능 및 OS 파일 선택기의 패드 조작은 미검증이다. CardGuild 수정, 커밋, 푸시, 배포는 하지 않았다.

---

# SD 프레임 캐릭터 최종 검증 · 2026-10-04

`npm run verify` 종료코드0: lint/TypeScript/Vite build, **도메인85/85 + 브라우저47/47 통과(7.3m)**. [최종 전체 로그](evidence/elf-sd/verify-final.log). 최종 실행 전후 game/와 tests/game/ 해시 일치: [manifest](evidence/elf-sd/runtime-sha256.json).

생산 빌드(`vite preview`, `http://localhost:4175/game/`)에서도 키보드 시작→배치→전투→Top 전환을 확인했다. 1024×768 CSS / DPR2, 앞뒤 해시 PNG 모두 HTTP200, pageerror0. [결과 JSON](evidence/elf-sd/production-smoke.json), [실제 화면](evidence/elf-sd/production-top.png). 로컬 미리보기이며 외부 배포는 하지 않았다.

별도 **mockpad만으로 3전투→엔딩→리로드→3/3 저장 복원 1/1 통과(3.8분)**: [로그](evidence/elf-sd/mockpad-full-final.log). 최종 코드·아트 동일. 실물 컨트롤러 검증이 아니다.

- 신규 도메인5: 네 방향/장비반전, 무기별 행동과 찌르기, 걷기/피격/대기 복귀, 48고유프레임·같은배율·기준점, 프레임별 손·활 뒷손·가림순서.
- 신규 브라우저3: 모든48프레임 투명여백과 실제 손픽셀, 128개 무기/방향/시점크기/공격단계 반전 샘플, 경로구간별 방향과 일시정지/시점변경의 애니메이션시계 보존.
- 기존80/44 포함: 키보드 전체캠페인, 모의패드/재매핑/상점44품목/5슬롯/저장, 사용자 v2리그·교체PNG 가져오기/리로드/기본복원, 에디터 전체 회귀.
- 실제1024×768 CSS/DPR2/2048×1536: [등각](evidence/elf-sd/battle-isometric.png), [Top](evidence/elf-sd/battle-top.png), [동작 검수 GIF](evidence/elf-sd/TacticsSD-SD-Elf-motion.gif), [앞뒤 무기](evidence/elf-sd/actions-NE.png), [상점 활3종](evidence/elf-sd/shop-bows.png). 캡처 pageerror0. GIF는 실제 Renderer의 시점별 저속 검수용 샘플이며 실제 게임 진행 녹화와 구분한다.
- 정규화 재빌드 front/back PNG와 frames.json 바이트일치. 에디터 보호3파일 시작/종료SHA256일치: [확인](evidence/elf-sd/protected-sha256.json). CardGuild/커밋/푸시/배포 없음.

첫 전체실행은46/47통과하고 패배테스트의 연속 적AT 대기가5초를 넘었다. 당시 화면은 정상적으로 다음 아군턴에 도달했고, 같은 전투planner에서 쓰는15초 제한으로 테스트 대기를 맞췄다. [이전 로그](evidence/elf-sd/verify-first-timeout.log), [문맥](evidence/elf-sd/elf-defeat-timeout-context.md)를 보존한다. 두번째실행의46/47결과에서는 별도IPC호출로 합성패드방향버튼이414ms유지되어340ms자동반복을 넘은것을trace에서확인했다. 테스트펄스를브라우저내한프레임으로바꾸어실제입력반복규칙을유지했다. [기록](evidence/elf-sd/verify-second-pad-pulse.log), [문맥](evidence/elf-sd/elf-pad-pulse-context.md). 최종47/47실행에는 다른 브라우저 작업을 병행하지 않았다. 전투 규칙이나 행동 시간을 변경하지 않았다.

아트·제약은 [ELF_SPRITES.md](ELF_SPRITES.md). 한 캐릭터의6의상색,4키프레임 스타일이고 연속IK·독립6원화가 아니다. 기존 리그 편집기와 사용자 리그는 그대로 지원한다. 물리패드/SteamInput/물리GPU 프레임률은 미검증이며 Chromium/SwiftShader 결과만 보고한다.

---

# 최종 검증 · 2026-10-04 상점/원본 화면 보완

**고정된 최종 코드·아트로 `npm run verify` 정상 완주: lint/type/build + 도메인80/80 + 브라우저44/44 통과(브라우저7.4분).** [전체 로그](evidence/shop/shop-verify-final.log).

최종 production 빌드4173의새원정→상점→원문품목도별도통과. 실제DPR2/페이지오류0,번들아틀라스와소스해시동일. [결과](evidence/shop/production-smoke.json).

추가 독립 **mockpad 전용3전투→엔딩→리로드→3/3저장 복원 1/1 통과(3.1분)**. [로그](evidence/shop/shop-full-pad.log). 기본 전체게이트의 키보드3전투·mockpad1전투와 별도다.

- 경제/출처9개 테스트:44고유품목·원본28행 실제동일성·1170참조분리·36신규고유영역, 수량/자금/재고경계,장착중판매금지,구버전저장,구입장비실제스탯,URL회복공식.
- 상점7개 브라우저 테스트:키보드/mockpad 구매·판매·취소·복원,신규활구입/궁수장착/실전,저장실패시무변경,동시확인취소·중복확인·연결해제,도감구매불가,최소화면 품목별레이아웃,7종보급품버튼·64미리보기타일경계.
- 최초감사9결함의회귀,5슬롯능력분해/저장,실제리그파츠교체/재진입/호환,툴계층/소켓/회전/픽셀정합검사 포함.
- 1024×768 CSS / DPR2 실제캡처2048×1536. [원본9장 비교](evidence/shop/comparison.html), [44개 런타임 아이콘](evidence/shop/all-44-icons.png), [신규활4방향](evidence/shop/new-bows-directions.png), [공격시점](evidence/shop/new-bows-attack.png).
- 신규36아이콘은모두다른픽셀해시·2048²RGBA·각256²영역·최소14px투명여백. [검사](evidence/shop/alpha-padding.json). 아트판정은 [SHOP.md](SHOP.md), 미비점/한계는 [SCREEN_COMPARISON.md](SCREEN_COMPARISON.md).
- [최종 런타임/테스트 해시](evidence/shop/runtime-sha256.json)와게이트후해시일치. 기존리깅툴main.ts/domain/rig.ts/assets/default-rig.json 3개는감사시작해시와동일. CardGuild수정/커밋/푸시/배포없음.

개발중전체검사는레이아웃수정때명시적으로중단했고,아트JSON변경중Vite HMR가페이지를새로고침해실패한실행도있었다. 이들은보존하되최종정상44/44결과와구분한다. 최종실행동안game/및tests/game/파일변경없음을확인했다. [재현방법](evidence/shop/REPRODUCE.md).

실물컨트롤러·SteamInput·실기기GPU·OS파일선택기의패드조작은미검증이다. 소프트웨어렌더링Chromium과모의Gamepad검증을실물검증으로표현하지않는다. 최초감사문서의P1/P2는당시발견이며이후수정·회귀검증되었다. 전원문1170개완성/원작PSP또는OV완전재현/정밀양손IK완료를주장하지않는다.

---

# 2026-10-04 원본 장비/HUD 보완 단계

`npm run verify` 정상 완주: lint/type/build + domain **71** + browser **37** 통과. [전체 로그](evidence/source-close/verify-scope-retry.log). 이전 실행은 외부4173서버 종료(ERR_CONNECTION_REFUSED)로 중단되어 [인프라 실패 로그](evidence/source-close/verify-scope-final.log)를 보존했다.
5슬롯 저장왕복·장비합산·실제damage·mockpad 장착과 복원, 2인대상초상화 추가 검증 포함. 이후 승인된 상점 단계는 별도 재검증한다.

# 최종 보완 검증 · 2026-10-04

## 결과

**실제 `npm run verify` 종료코드0.** lint(타입/whitespace), TypeScript, Vite production build, **Vitest7파일70개**, **Playwright36개** 모두 통과. 브라우저7.0분. [전체 로그](evidence/remediation/verify-final.log).

기존 도구/네비게이션 브라우저20개 + 기존 게임6개 + 감사 회귀8개 + 확장/리그 가져오기2개. 순수 테스트는 기존61개에 감사2개와 확장7개를 추가했다. `lint`는 ESLint가 아니라 TypeScript strict/noUnused + git diff --check이다.

## 독립 추가 실행

- [모의패드 전체캠페인](evidence/remediation/full-pad-final.log): **1통과,3.8분**. 키보드/마우스 없이 메뉴·장비·대화·3전투·엔딩·새로고침 저장복원. 실제기기아님.
- [모의패드 새기능](evidence/remediation/pad-expansion.json): 출전대원[세라,레나,에린], 달빛화살 SP학습, 이동+1 지원, 전투가방 마력의물 사용. 실제 MP0→12, 재고1→0, pageerror0. 이 스크립트는 진단정보를 읽지만 전투상태를 직접 고치지 않는다.
- [보호 파일](evidence/remediation/protected-check.log): characterRig main.ts/domain/rig.ts/default-rig.json의 보완 전후 SHA256 일치.
- 변경 전9결함이 red(도메인2/브라우저7)였고 수정후 green. 최종 게이트에 모두 포함. 종료방향 Tab초점 추가 경계도 통과.

## 실제 검증 범위

키보드3전투→엔딩→저장복원, 패배/재시작, 설정 재매핑/기본값/취소/중복, Tab/Space, 패드 capture 취소, held-input 분리/복귀 중립, 모달 초점, 동시 이동확정/시점 전환. 최소1024×768 CSS DPR2 backing2048×1536과1280×900 크기 변경. 편성/육성 주요 버튼의 화면 내 좌표도 단정했다.

기존 리깅 도구의 전체 회귀, 게임 리그 도구 열기/수정/JSON 저장, v2 serializer로 만든 교체PNG 참조의 실제 게임 픽셀/새로고침 지속성/누락이미지 거절, 기본리그 복원 시 진행 보존. 실제 view.image/part.replacement 로드를 확인했다.

계산/도메인: OV 물리 floor/max 순서, 정정된 마법계수와 RES/반DEF, 명중 AGI/AVD/방향하한, HUD·실제피해 공유, 빗나감TP0, area heal/guard 팀필터, HP/MP/TP상한·재고, 새클래스/학습/지원/공유레벨 저장·재방문, 오래된4대원 저장이행·잘못된학습거절.

## 실화면과 한계

[evidence/remediation/](evidence/remediation/README.md)의 편성/육성/장비/거점/대화/등각/Top은 최종2048×1536 실캡처. 8무기×4방향 및 공격4구간은 실제 Renderer/evaluateWorldRig의 격자 검수다. 정적 스탠디 교체는 사용하지 않았다.

Chromium/SwiftShader 소프트웨어 렌더링. 물리패드/Steam Input/SDL/물리GPU 프레임률 미검증. OS파일선택 대화상자는 setInputFiles로 자동화했으므로 패드만으로 OS 파일선택까지 확인한 것은 아니다. 모든 테스트가 통과해도 전체 PSP/OV/원본자료 재현이나 완벽한 아트 품질을 뜻하지 않는다. 남은 기능/계산/시각 차이는 [REMEDIATION.md](REMEDIATION.md), [TRACEABILITY.md](TRACEABILITY.md).

초기61/26통과 기록은 evidence/verify.log, 독립 감사 기록은 evidence/revalidation에 보존되어 있다. 최신판은 이 문서와 remediation 로그다.
