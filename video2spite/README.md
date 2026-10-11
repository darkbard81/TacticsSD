# Cleric 영상 기반 스프라이트

정면/후면 원화를 Grok Build의 `image_to_video`로 각각 걷기, 대기, 공격 영상으로 변환한 결과입니다.

정면 걷기·대기·공격, 후면 걷기·대기·공격 여섯 동작이 생성되었습니다. 후면 공격은 첫 두 시도에서 콘텐츠 검토로 거절되었으나, 사용자가 요청한 동일 원화·동일 프롬프트의 추가 재시도에서 성공했습니다. 이전 오류와 재시도 결과는 생성 기록에 보존되어 있습니다.

공격은 새로운 무기나 광원 효과 없이 한쪽 팔과 손을 움직이는 성직자 시전 동작입니다. 정면은 카메라를 바라보고, 후면은 카메라를 등지는 시점을 유지하도록 요청했습니다.

## 바로 사용할 파일

최상위 PNG 여섯 장은 각 동작의 24프레임 격자 시트입니다. 셀 128×128px, 8열×3행, 시트 1024×384px입니다. 프레임은 왼쪽에서 오른쪽, 위에서 아래 순서입니다. PNG는 RGBA 투명 배경입니다.

| 시점 | 걷기 | 대기 | 공격/시전 |
|---|---|---|---|
| 정면 | [시트](Cleric_Front_Walk.png) · [GIF](Cleric_Front_Walk_Preview.gif) | [시트](Cleric_Front_Idle.png) · [GIF](Cleric_Front_Idle_Preview.gif) | [시트](Cleric_Front_Attack.png) · [GIF](Cleric_Front_Attack_Preview.gif) |
| 후면 | [시트](Cleric_Back_Walk.png) · [GIF](Cleric_Back_Walk_Preview.gif) | [시트](Cleric_Back_Idle.png) · [GIF](Cleric_Back_Idle_Preview.gif) | [시트](Cleric_Back_Attack.png) · [GIF](Cleric_Back_Attack_Preview.gif) |

[동작 전체 보기](animation-overview.png)

## 동작별 폴더

`front-walk`, `front-idle`, `front-attack`, `back-walk`, `back-idle`, `back-attack`에 각각 다음 결과가 있습니다.

- `base/`: 원화를 자홍색 배경에 합성한 영상 입력 이미지.
- `video/`: 생성된 약 6초 MP4 영상.
- `frames-raw/`: 영상에서 추출한 전체 프레임.
- `frames-clean/`: 배경 제거 후 RGBA 프레임.
- `sprite/`: 8·16·24·48프레임 PNG 가로 스트립, 격자 시트, GIF 및 개별 셀.
- `prompt-used.txt`: 실제 사용한 동작 프롬프트.
- `pipeline-meta.json`: 추출/샘플링/정규화 설정과 결과 경로.

정규화된 첫 프레임 캐릭터의 높이는 약 100px이며, 첫 프레임 발 기준선은 셀의 y=118입니다. 클립 전체에 같은 배율과 같은 좌표 변환을 적용합니다. 프레임별 외곽 영역의 중앙이나 높이로 재정렬하지 않으므로, 머리카락과 옷자락이 움직여도 몸의 위치가 인위적으로 바뀌지 않습니다. 원화의 흰 스티커 외곽선은 보존됩니다. GIF는 어두운 배경의 비교용 미리보기입니다.

프레임은 6초 전체 영상에서 균등 추출했습니다. 모든 프레임 수의 GIF 재생 시간은 원본 영상과 같은 약 6.04초입니다. 영상에 여러 동작 주기가 들어 있을 수 있습니다. 게임에서 한 주기만 반복하려면 `frames-clean/`에서 원하는 구간을 선택해야 합니다. 영상 생성으로 인한 세부 외형 변화와 가장자리 잔여 색은 결과에서 확인해야 합니다.

## 재처리 및 검증

처리 스크립트는 `/home/deck/.codex/skills/video2dsprite/scripts/video2dsprite.py`를 사용합니다. Python 의존성은 `/home/deck/.cache/video2dsprite/venv`에 설치했습니다.

```bash
/home/deck/.cache/video2dsprite/venv/bin/python video2spite/postprocess.py
/home/deck/.cache/video2dsprite/venv/bin/python video2spite/postprocess.py --rebuild-exports
/home/deck/.cache/video2dsprite/venv/bin/python video2spite/verify_outputs.py
```

`verification.json`에 영상 정보, 시트 크기, GIF 프레임 수, 투명 배경 검증 결과가 기록됩니다. `generation-manifest.json`에 Grok의 생성 결과 경로가 기록됩니다.
