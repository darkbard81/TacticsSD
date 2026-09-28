# 사용자 제공 파츠 시트

- `original.jpg`: 2026-09-28에 제공한 원본 JPG. 변경 없이 보관.
- `../../elf-parts-sheet.png`: 원본을 참조하여 내장 image_gen으로 외부 흰 배경을 투명 처리한 1254×1254 RGBA 사본. 의상 내부 흰색과 테두리를 보존하도록 요청. 생성 도구가 가장자리/디테일에 미세한 차이를 만들 수 있으며 원본과 픽셀 동일성을 주장하지 않습니다.
- `../../default-rig.json`: 이 사본의 10개 영역을 사용한 Front/Back v2 기본 리그. 몸통 소켓에 머리·팔·다리 pivot을 연결하고 접합 보정을 저장합니다. 팔 2개는 양쪽 뷰에서 공용으로 재사용합니다. 후면 팔 원화가 별도로 제공된 것은 아닙니다.
- 사각형은 시트의 원본 좌표, 소켓은 부모 그림 좌표(몸통은 지면 상대 좌표), restTransform은 접합 후 보정입니다. 시트에서 파츠를 이동한 값은 조립 위치와 별도로 관리합니다.

기본 리그 재생성: 저장소 루트에서 `node tools/characterRig/scripts/create-default-rig.mjs`.

## 사용한 이미지 편집 프롬프트

Use case: background-extraction. Edit target: the supplied square character parts sheet. Remove ONLY the white external background and make it truly transparent alpha, including the open background spaces between the locks of hair. Preserve ALL character parts, faces, painted white costume material, light hair highlights, white sticker outlines, colors, detail, exact shapes, sizes, layout, spacing and original orientation. This is a production rigging atlas: exact positional fidelity is essential. DO NOT assemble the character, do not add parts, do not remove parts, do not rearrange or resize any part, do not redraw or redesign. Output one square transparent PNG containing the same ten separate pieces in their current positions: front and back heads top, two arms left middle, front and back torsos right middle, two front legs lower left, two rear legs lower right. Keep the 1:1 source aspect and original canvas framing.
