# 24×32 Pixel Sprite Tool

Codex가 좌표별로 픽셀을 수정하고 중간 PNG를 확인하면서 스프라이트시트를 만드는 Python + Pillow 기본 도구입니다.

## 실행

Python 3.9 이상을 사용합니다. Python 3.12.14 / Pillow 12.3.0에서 검증했습니다.

```bash
python -m pip install -r requirements.txt
python pixel_tool.py render example.json --out output --scale 16 --columns 4
```

`example.json`에는 기능 확인용 보석 4프레임이 있습니다. 프레임당 정확히 24×32, 시트는 96×32입니다. 완성 캐릭터 디자인이 아니라 도구의 동작을 보여 주는 예제입니다.

`make_demo.py`는 같은 예제를 픽셀 좌표 목록으로 다시 만듭니다.

## Codex의 확인·수정 흐름

1. `new`, `paint`, `clone` 명령 또는 Python API로 원본 JSON을 만듭니다.
2. `render`를 실행하여 PNG를 만듭니다.
3. **실행이 끝난 뒤 Codex가 실제 이미지 읽기 도구로 PNG를 엽니다.** 현재 환경에서는 `view_image`에 반환된 절대 경로를 전달하는 방식입니다. 사용하는 Codex 환경에 따라 이미지 도구 이름은 다를 수 있습니다.
4. `contact.png`로 전체 프레임을 비교하고, 필요하면 해당 프레임의 `*_zoom.png`, `*_grid.png`를 엽니다.
5. 수정할 좌표와 팔레트 기호를 JSON 배열로 작성하여 `paint`에 전달합니다.
6. 다시 `render`하고 이미지를 확인합니다. 마무리된 `spritesheet.png`와 메타데이터를 게임에서 사용합니다.

Python 프로그램은 파일을 렌더링합니다. 이미지 생성만으로 Codex의 시각 검토가 실행되지는 않습니다. `Image.show()`로 사람용 뷰어를 띄우는 것만으로도 Codex에 이미지가 전달되지는 않습니다. 위의 이미지 읽기 단계를 별도로 수행해야 합니다.

한 픽셀마다 실행하지 않고 실루엣, 색 배치, 얼굴·장비, 애니메이션 프레임처럼 의미 있는 단계마다 여러 픽셀을 일괄 수정하고 확인하는 구성을 권장합니다.

## 명령

### 프로젝트 만들기

```bash
python pixel_tool.py new hero.json --frames idle_00
```

모든 픽셀이 투명한 24×32 프레임을 생성합니다. 기존 파일은 덮어쓰지 않습니다.

### 픽셀 일괄 수정

`edits.json`은 다음 형식입니다. 좌표 원점은 왼쪽 위 `(0, 0)`이고 오른쪽 아래는 `(23, 31)`입니다. x는 오른쪽, y는 아래로 증가합니다.

```json
[
  [10, 12, "W"],
  [11, 12, "L"],
  [12, 12, "T"]
]
```

```bash
python pixel_tool.py paint hero.json idle_00 edits.json
python pixel_tool.py render hero.json --out hero_output --scale 16
```

`[x, y, "."]`는 해당 픽셀을 지웁니다. 같은 좌표가 여러 번 나오면 마지막 값을 사용합니다. 알 수 없는 기호, 범위 밖 좌표, 정수가 아닌 좌표는 오류로 처리합니다. 배치 중 하나라도 잘못되면 프로젝트 파일을 변경하지 않습니다.

출력의 `changed_pixels`는 최종적으로 바뀐 팔레트 기호 수입니다. 서로 다른 기호에 같은 RGBA 색을 지정했다면 시각적으로 바뀐 픽셀 수와 다를 수 있습니다.

### 프레임 복제

```bash
python pixel_tool.py clone hero.json idle_00 idle_01
```

프레임을 독립적으로 복제하여 목록 끝에 추가합니다. 새 프레임을 수정해도 원본 프레임은 바뀌지 않습니다. 프레임 이름은 영문·숫자·밑줄·하이픈으로 구성한 1~64글자이며 중복을 허용하지 않습니다.

### 출력과 검증

```bash
python pixel_tool.py validate hero.json
python pixel_tool.py render hero.json --out hero_output --columns 4 --scale 16
```

`--columns`는 최대 열 수입니다. 프레임 수보다 크면 프레임 수로 줄입니다. `--scale`은 검토 이미지의 정수 확대 배율이며 실제 시트 크기는 바꾸지 않습니다. 좌표 격자 이미지는 픽셀을 가리지 않도록 최소 4배로 만듭니다.

| 출력 | 용도 |
| --- | --- |
| `frames/프레임명.png` | 정확한 24×32 RGBA 원본 프레임 |
| `review/프레임명_zoom.png` | 최근접 확대 + 투명 배경 확인용 체크무늬 |
| `review/프레임명_grid.png` | 확대 + 격자 + 4픽셀 간격의 좌표 눈금 |
| `contact.png` | 전체 프레임 비교용 미리보기 |
| `spritesheet.png` | 게임용 투명 RGBA 스프라이트시트 |
| `spritesheet.json` | 프레임 이름, 순서, x/y/w/h, duration_ms, 공통 anchor |

확대 이미지에는 라벨과 여백이 있어 전체 파일 크기가 `24×배율`, `32×배율`보다 큽니다. 스프라이트 영역만 해당 배율이며, 실제 프레임과 시트에는 라벨·격자·체크무늬를 넣지 않습니다.

출력은 원본 JSON에서 다시 만드는 결과물입니다. 같은 출력 폴더로 렌더링하면 같은 이름의 결과 파일을 갱신합니다. 프레임을 직접 삭제하거나 이름을 변경한 뒤에는 새 출력 폴더를 사용하면 이전 프레임 PNG와 혼동하지 않을 수 있습니다.

## 원본 데이터와 수정 이력

- 프레임 크기: 24×32 고정.
- 팔레트: 한 글자 기호 → `[R, G, B, A]`. `.`은 `[0, 0, 0, 0]`으로 고정합니다.
- 픽셀 데이터: 프레임마다 24글자 문자열 32행.
- 프레임 순서: `frames` 배열에 적힌 순서.
- 재생 시간: 프레임별 `duration_ms`.
- 공통 기준점: `anchor`에 프레임 내부 픽셀 좌표를 저장합니다. 기본값은 `[12, 31]`입니다.

CLI의 `paint`와 `clone`, Python API의 `save`로 기존 프로젝트를 저장할 때는 수정 전 바이트를 `프로젝트명_history/`에 보존합니다. 실패한 입력은 먼저 거부하고, 정상 결과는 임시 파일을 거쳐 원본 파일에 교체합니다. 이 도구는 한 번에 한 작성자가 프로젝트를 수정하는 워크플로를 전제로 합니다.

이전 버전으로 돌아가려면 원하는 이력 JSON을 다른 이름으로 복사하여 렌더링할 수 있습니다. JSON을 외부 편집기로 직접 덮어쓸 때에는 이 도구의 백업 기능이 실행되지 않습니다.

팔레트 변경은 해당 기호를 사용하는 모든 프레임에 적용됩니다. 원본의 `frames` 배열을 재배치하면 내보내는 순서도 바뀝니다. 수정 뒤 `validate`를 실행하세요.

## Python에서 사용하기

```python
from pixel_tool import load, paint, save, render

project = load("hero.json")
project = paint(project, "idle_00", [
    [10, 12, "W"],
    [11, 12, "L"],
    [12, 12, "T"],
])
save("hero.json", project)
paths = render(project, "hero_output", columns=4, scale=16)
print(paths["contact"])
# 이 실행이 끝나면 Codex가 위 이미지 경로를 실제 이미지 읽기 도구로 연다.
```

직선·사각형·영역 채우기 등은 좌표 목록을 생성하는 함수로 확장할 수 있습니다. 현재 기본 버전은 좌표 일괄 수정과 프레임 복제에 집중합니다. 마우스 편집 GUI, 레이어, 실시간 애니메이션 플레이어는 포함하지 않습니다.

## 스프라이트시트 규칙

프레임 여백 자르기, 자동 가운데 정렬, 보간, 크기 변경을 하지 않습니다. 프레임 사이 여백은 0이며 왼쪽에서 오른쪽, 위에서 아래 순서로 배치합니다.

`x = (프레임 번호 % 열 수) × 24`, `y = (프레임 번호 // 열 수) × 32`입니다. 배열 번호는 0부터 시작합니다.

최종 PNG는 원본 프레임의 RGBA 값을 그대로 복사합니다. 공통 anchor는 메타데이터로 전달하며 픽셀을 강제로 이동시키지 않습니다. 캐릭터 애니메이션에서는 원본을 그릴 때 발바닥 기준선과 몸 중심을 의도적으로 유지해야 합니다.

메타데이터는 이 도구의 간단한 자체 형식입니다. 사용 중인 게임 엔진의 로더에서 x/y/w/h와 재생 시간을 읽도록 연결하세요. 애니메이션의 속도와 움직임은 게임이나 별도 재생기에서도 확인해야 합니다.

## 확인한 사항

- 예제 네 프레임이 96×32 시트로 출력됨.
- 프레임과 시트의 RGBA 바이트 일치, 투명도와 빈 시트 칸 보존.
- 프레임 순서, 좌표, 재생 시간 메타데이터 일치.
- 범위 밖 좌표와 잘못된 기호 거부, 실패 배치에서 원본 파일 보존.
- 수정 전 파일의 정확한 백업, 복제 프레임의 독립성.
- 실제 확대 PNG와 좌표 격자를 열어 확인한 뒤 예제의 두 번째 프레임에서 반짝임 8픽셀을 수정하고 재출력함.

## 참고 문서

- [Pillow PixelAccess](https://pillow.readthedocs.io/en/stable/reference/PixelAccess.html)
- [Pillow Image API](https://pillow.readthedocs.io/en/stable/reference/Image.html)
- [Playwright 소개](https://playwright.dev/docs/intro)

Pillow는 픽셀 읽기·쓰기와 이미지 출력을 담당합니다. Playwright는 웹 앱을 브라우저에서 조작·검사할 때 쓰며, 이 파일 기반 제작 흐름에는 필요하지 않습니다.
