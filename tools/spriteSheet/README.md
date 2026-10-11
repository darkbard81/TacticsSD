# 엘프 캐릭터 스프라이트 시트

`npm run tool` 실행 후 제작 도구 목록의 **스프라이트 시트**를 선택합니다.
직접 경로: `/tools/spriteSheet/`.

- 캐릭터 드롭다운에서 **엘프 사제**, **엘프 바바리안**, **엘프 도적**을 선택합니다. 앞·뒷면 미리보기, 병합 시트와 PNG/JSON 다운로드가 함께 전환됩니다.
- 사제 원본: `pixel-art/elf-cleric-woman/Cleric_{Front,Back}_{Base,Left,Right}.png`
- 바바리안 원본: `pixel-art/elf-barbarian-woman/Babarian_{Front,Back}_{Base,Left,Right}.png`
- 도적 원본: `pixel-art/elf-thief-woman/Thief_{Front,Back}_{Base,Left,Right}.png`
- 결과: `assets/elf-cleric-sheet.{png,json}`, `assets/elf-barbarian-sheet.{png,json}`, `assets/elf-thief-sheet.{png,json}` (각 시트 1024×512, 투명 PNG)
- 각 프레임: 256×256. 가로 순서 Base → Left → Base → Right, 세로 순서 Front → Back.
- 전체 원본에 동일한 축소 비율을 적용하고 아래쪽 중앙에 배치합니다. 원본 비율과 투명도를 유지하며, 부드러운 축소를 적용합니다.
- 앞·뒷면 동시 반복 재생, 1–12 FPS 속도 조절, 일시정지, 한 프레임 이동, PNG/JSON 다운로드를 지원합니다.
- **정면 GIF 다운로드**, **후면 GIF 다운로드**는 선택한 캐릭터의 256×256 애니메이션을 현재 재생 속도로 저장합니다. Base → Left → Base → Right를 무한 반복하며 투명 배경을 유지합니다. GIF 특성상 알파는 이진 투명도로, 프레임 시간은 10ms 단위로 변환됩니다.
- 동작 줄이기 설정에서는 처음에 일시정지합니다.

원본을 바꾼 뒤 다시 생성:

```sh
node tools/spriteSheet/scripts/build-sheet.mjs
# 바바리안만 다시 생성
node tools/spriteSheet/scripts/build-sheet.mjs elf-barbarian
# 도적만 다시 생성
node tools/spriteSheet/scripts/build-sheet.mjs elf-thief
```

빌더는 개발 의존성인 Playwright의 Chromium을 사용합니다. 설치되어 있지 않으면 `npx playwright install chromium`을 먼저 실행합니다.
