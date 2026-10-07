# TacticsSD

TacticsSD의 제작 도구 모음입니다. 메인 화면에서 도구를 선택해 전용 작업 화면으로 이동합니다.

## 실행

Node.js **24 이상**과 npm을 사용합니다. 저장소 루트에서 실행하세요.

```sh
npm ci
npm run tool
```

`http://localhost:5173`에서 메인 화면이 열립니다. **캐릭터 리깅 열기** 버튼을 누르면 리깅 에디터로 이동하고, 에디터의 **메인으로** 버튼으로 돌아옵니다.

- 메인 화면: `/`
- 캐릭터 리깅: `/tools/characterRig/` — 직접 접속과 새로고침도 지원합니다.
- 기존 `npm run dev`는 `npm run tool`의 별칭입니다.

```sh
npm run build
npm run preview
```

프로덕션 미리보기는 `http://localhost:4173`입니다. 메인과 각 툴의 HTML을 개별 빌드하므로 정적 호스팅에는 `dist/` 전체를 배치하세요.

![메인 도구 선택 화면](docs/main.png)

## 도구

| 도구 | 내용 | 위치 |
| --- | --- | --- |
| Character Rig | 몸통·소켓 기반 6파츠 리깅, Idle/Walk, 등각 4방향, JSON 저장·복원 | [tools/characterRig](tools/characterRig/README.md) |

캐릭터 리깅은 제공된 엘프 **파츠 시트 1장**을 기본으로 사용합니다. 투명 배경 파생 이미지와 앞·뒤 조립 프리셋이 포함되어 바로 Rest / Idle / Walk를 확인할 수 있습니다. 후면 팔은 원본의 공용 팔을 재사용합니다. [자세한 사용법](tools/characterRig/README.md)과 [검증 기록](tools/characterRig/docs/validation.md)을 참고하세요.

## 구조

```text
src/                        메인 화면만 담당
  main.ts
  style.css
tools/
  registry.ts               메인 도구 목록과 빌드 진입점 등록
  characterRig/
    index.html              리깅 툴 전용 페이지
    main.ts / style.css     리깅 UI
    domain/                 리그 데이터, 좌표, 모션
    io/                     현재 형식의 파일 읽기·저장
    editor/ / runtime/      원본 편집과 Pixi 렌더러
    assets/                 샘플 이미지와 생성 원본
    tests/                  리깅 도메인·브라우저 검증
    docs/ / scripts/        리깅 문서·화면 기록
tests/browser/              메인 ↔ 도구 화면 이동 검증
```

새 도구는 `tools/<toolId>/index.html` 및 전용 코드를 만들고 `tools/registry.ts`에 등록합니다. 메인 목록과 프로덕션 빌드 진입점에 함께 반영됩니다. 메인 화면은 툴의 실행 코드나 Pixi 렌더러를 불러오지 않습니다. 도구 간 CSS도 각 페이지에서 독립적으로 로드합니다.

## 개발 중 파일 정책

현재 도구는 외부 배포 전 개발 단계입니다. **리그 JSON의 하위 호환성과 마이그레이션을 제공하지 않습니다.** 호환되지 않는 구조 변경 시 스키마 버전을 올리고 기존 리그 파일은 폐기합니다. 포함된 기본 리그는 현재 구조로 다시 생성합니다. 다른 버전 파일을 열면 오류를 안내하고 현재 편집 작업은 유지합니다.

## 검증

```sh
npm run verify
```

현재 `npm test` / `npm run test:rules`는 순수 게임 규칙과 입력 상태만 검사합니다. `npm run verify`는 타입/빌드와 이 규칙 검사만 실행하며 브라우저 자동 테스트를 실행하지 않습니다. 화면 검토는 `http://127.0.0.1:5173/game/?capture=1`의 수동 PNG/3초 영상 버튼을 사용하세요. 이전 Playwright 스위트와 과거 검증 기록은 보존했으며 실행 스크립트에서는 분리했습니다.


## 은빛 여명 게임

프로젝트 루트에서 바로 게임을 실행합니다.

```sh
cd /home/deck/Documents/TacticsSD
npm run game
```

**http://127.0.0.1:5173/game/** 을 기본 브라우저로 엽니다. 자동으로 열리지 않으면 이 URL에 직접 접속하세요. 로컬 루프백만 사용하며 5173이 점유되면 오류를 내고 종료합니다. 기존 서버를 종료하지 않고 다른 포트로 실행하려면 `npm run game -- --port 5174` 후 http://127.0.0.1:5174/game/ 을 사용하세요.

`npm run tool` 후 [게임](http://localhost:5173/game/)을 열거나 메인 화면의 **은빛 여명 · 게임 시작**을 선택하세요. 키보드와 브라우저 Gamepad API로 월드맵/편성/장비/대화/전투/승패/설정까지 진행합니다. 최소지원은1024×768 CSS픽셀, 필수검증 DPR2이며 런타임은 실제 브라우저 크기/DPR를 따릅니다.

- [실행·입력표·저장](docs/game/CONTROLS.md)
- [구현 기준과 후속 요구](docs/game/IMPLEMENTATION.md)
- [계산식과 콘텐츠 확장](docs/game/CALCULATION.md)
- [8종 클래스 스프라이트·제자리 걷기·저장 호환](docs/game/CLASS_SPRITES.md)
- [생성 아트·게임 리그의 에디터 재사용](docs/game/ART.md)
- [자료 대비 추적표](docs/game/TRACEABILITY.md)
- [PSP 기준과 자체 규칙 구분](docs/game/PSP_REFERENCE.md)
- [검증 기록과 재현](docs/game/VALIDATION.md)

새 게임 코드는 `game/`에 독립 배치되며 제작 도구 원본을 변경하지 않습니다. `npm run lint`는 TypeScript strict/noUnused 검사와 Git whitespace 검사입니다(별도 ESLint 설정은 없음). `npm run verify`는 lint → build → 순수 규칙 검사만 실행합니다.

현재 전장과 아트 구조: [Three.js 전장 통합](docs/game/THREE_BATTLEFIELD.md).
