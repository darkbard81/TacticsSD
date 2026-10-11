# 여성 아마조네스 · 2등신

ImageGen 원화 한 장을 픽셀화한 후 `pixel_sprite_tool`의 `paint`, `save`, `render` API로 Base와 걷기를 제작했다. 원화의 갈색 단발, 청동 머리띠·견갑, 올리브 갑옷, 가죽 치마·부츠를 공통 디자인으로 사용한다.

- 원화: `base-imagegen.png` (내장 ImageGen 사용), 프롬프트: `imagegen-prompt.txt`
- 편집 원본: `amazon.json`, 초기 축소본: `amazon-quantized.json`
- 기준 프레임: `base.png`, 확대: `base-preview.png`
- 최종 시트: `sprite-sheet/spritesheet.png`, 좌표와 시간: `sprite-sheet/spritesheet.json`
- 프레임: 24×32, 시트: 120×32, RGBA, 16색 + 투명, anchor `[12,30]`
- 방향: 화면 오른쪽을 조금 바라보는 정면 3/4뷰
- 순서: Base → 왼발 접지 → 오른발 통과 → 오른발 접지 → 왼발 통과
- 걷기는 Base를 제외한 4장만 반복한다. 재생 시간은 160/120/160/120ms, 합계 560ms다. 그룹 정보는 `animations.json`에 있다.
- 머리는 Base의 y=1..15, 몸과 다리는 y=16..30이다. 통과 자세에서 상체가 1픽셀 올라가며 발 기준선은 y=30으로 유지한다.

`walk-preview.gif`는 10배 최근접 확대 미리보기다. 밝은 배경은 GIF 검수용이며 원본 PNG 시트는 투명하다. `preview.html`은 이 폴더를 로컬 HTTP 서버로 열면 원본 크기와 확대 크기로 반복 재생한다.

원화, 픽셀 Base의 원본 크기, 전체 프레임 확대, 단색 실루엣을 열어 확인했다. 시트와 개별 프레임의 RGBA 바이트, 팔레트, 투명도, 순서, 시간, GIF 반복 설정을 검증했다. 상세 결과는 `validation.json`에 있다. 연결 가능한 브라우저가 없어 실시간 재생을 통한 움직임 검수는 수행하지 못했다.

재현 순서는 `build_base.py` → `refine_base.py` → `animate.py`다. 저장소의 `tools/pixel_sprite_tool/.venv/bin/python`으로 실행한다. 실행하면 이 디렉터리의 제작 결과를 다시 쓰므로 수동으로 수정한 JSON이 있다면 먼저 별도로 보존한다. 픽셀 편집 배치는 각 `*-edits.json`에 저장했다.
