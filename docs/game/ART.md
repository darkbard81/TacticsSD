> 2026-10-07: 현재 8클래스 정면/후면 파츠·2.5H 리그·PNG 결과와 검사 정책은 [Three.js 전장 통합](THREE_BATTLEFIELD.md)을 참조하세요. 아래는 이전 작업 기록입니다.

> 2026-10-05: 현재 기본 캐릭터는 승인된 단일 **26포즈 아틀라스**이며 공통 공격 5포즈를 공유한다. [현재 런타임 설명](ELF_SPRITES.md). 아래 48프레임 및 6파트 기록은 이전 판본과 사용자 리그 호환 경로다.

> 2026-10-04 SD 캐릭터 교체: 새 기본 캐릭터는 ImageGen으로 제작한 앞뒤 48프레임 애니메이션이다. [현재 아트/장비/리그 보존 설명](ELF_SPRITES.md), [동작 미리보기](evidence/elf-sd/TacticsSD-SD-Elf-motion.gif). 아래 6파트 기본리그 설명은 이전 판본 및 사용자 리그 호환 경로의 기록이다.

> 후속상점단계에는 감사자가 내장ImageGen을 직접3회사용해36개고유아이콘을신규제작했다. 기존8무기와합쳐44품목. [갤러리](evidence/shop/all-44-icons.png), [프롬프트](evidence/shop/item-prompts.json), [품목별검수](SHOP.md). 아래 “새 원화 생성 없음”은이전9결함수정단계에만해당한다.

# 아트 출처와 리깅 재사용

아래 생성 경위와 프롬프트는 2026-10-04 초기 구현자의 ImageGen 사용 기록이다. 재감사/보완에서는 파일 규격·투명도·실제 리그 렌더를 확인했으며 ImageGen을 다시 실행하거나 원본 생성 호출 자체를 독립 재증명한 것은 아니다. 초기 기록상 내장 ImageGen 출력(data:image/png;base64)을 /tmp 조각 파일로 전달해 저장했으며 외부 유료 API 폴백은 사용하지 않았다.

|자산|실제 규격|용도/출처|
|---|---|---|
|game/assets/world-map.png|1536×1024 RGB|신규 ImageGen 양피지 섬 지도; 타이틀/월드/거점 배경 (대화는 실제 전장으로 보완)|
|game/assets/dawn-parts.png|1254×1254 RGBA|신규 ImageGen 성인 엘프 여성의 앞/뒤 각6파트|
|game/assets/dawn-rig.json|기존 v2 형식|실제 이미지 영역·pivot·몸통소켓·C방향보정을 사용하는 신규 게임 리그|
|game/assets/terrain.png|1254×1254 RGB|신규 ImageGen 잔디/석판/수면/긴 석벽 재질 4분면|
|game/assets/weapons.png|1254×1254 RGBA|신규 ImageGen 검2/활2/별지팡이2/성광지팡이2, 각각 독립 프레임|

처음 생성한 완성 스탠디 시트는 사용자가 리깅을 강조하기 전에 시작한 참고 시안이며 런타임에서 사용하지 않는다. 여섯 대원은 같은 신규 파츠 리그를 쓰는 제복 변형이다. 의상 색은 런타임 캐시에서 변경하고 얼굴 피부색은 보존한다. 별개의 6종 원화나 6개 독립 캐릭터 시트를 생성했다고 주장하지 않는다.

기존 tools/characterRig/assets/elf-parts-sheet.png는 사용자 제공 파츠 시트의 투명화 파생 이미지로, 이번 신규게임 아트가 아니다. 기존 리깅 저장파일과 사용자 변경은 보존한다. docs의 원작 스크린샷들은 레이아웃 참고이며 게임에 번들하지 않는다. 참고 이미지의 외부 재배포 라이선스는 확인되지 않았으므로 원본 게임 초상화·아이콘을 가져오지 않았다. UI 기호는 유니코드 및 직접 작성 SVG 경로다. CardGuild의 소스/에셋은 읽기 참조만 했다.

## 리깅 작업 경로
1. 제작 도구의 `/tools/characterRig/`를 열고 리그 열기로 `game/assets/dawn-rig.json`을 선택한다.
2. 이미지 연결에서 `game/assets/dawn-parts.png`를 연결한다. Front/Back은 같은 atlas를 사용하며 각6개의 독립 영역을 참조한다.
3. Rest/Idle/Walk와 SE/SW/NE/NW 비교에서 수정하고 JSON을 저장한다.
4. 게임 장비 화면→리그·파츠→불러오기에서 저장한 JSON과 참조하는 모든 PNG를 함께 선택한다. Front/Back의 image와 각 part.replacement를 실제 로드하며 크기를 검사한다. IndexedDB에 함께 저장하고 기본 복원도 제공한다. 기본 복원은 진행 중 편성을 유지한다. 소스 기본본을 교체하는 방법도 가능하나 사용자별 적용은 파일 가져오기를 권장한다. 게임은 같은 `evaluateWorldRig`와 v2 스키마를 읽는다.
5. `npm run verify`로 다시 검사한다. 게임 리그를 재생성하려면 `node game/scripts/create-dawn-rig.mjs`를 실행한다. 이 명령은 게임의 신규 리그만 덮어쓰며 에디터 기본 리그를 바꾸지 않는다.

무기는 기존 JSON 스키마를 바꾸지 않고 게임 콘텐츠의 armR 손 장착점을 사용한다. 각 무기 frame/grip/animation은 `content.ts`에 있으며 팔의 world matrix와 root 반전을 함께 상속한다. 검 베기와 강화검 찌르기, 활 시위 당김, 지팡이 들어올리기를 구분한다. Idle/Walk는 기존 평가기를, Attack은 짧게 복제한 리그의 팔 restTransform에 포즈를 더해 평가기를 사용한다. Hit는 짧은 화면 흔들림/밝기 반응이다. 실제 무기는 손 변환에 붙으며 독립 FX로 대체하지 않는다.

## ImageGen 프롬프트 기록
- 지도: antique parchment atlas of a small elven island; winding rivers, evergreen groves, mountains northeast, river gate lower left, ruined bridge center, luminous citadel upper right; ink/watercolor muted teal/olive/ivory/gold; landscape3:2; no text/UI/characters.
- 파츠: ONE clearly adult elven woman warrior age30, mature face, silver hair, closed high-collar ivory tunic under teal/gold armor, trousers/boots; twelve disconnected pieces; six columns two rows Front/Back head/body/armL/armR/legL/legR; transparent padding, overlapping joint ends, consistent scale; no weapons/text/sexualization. 요청한1536² 대신 도구 실제 출력1254²를 읽어 영역을 보정했다.
- 지형: four equal quadrants, flat top-down grass/old sandstone paving/teal water; orthographic continuous sandstone wall; hand-painted JRPG; no cubes/text.
- 무기: eight upright isolated weapons, four columns two rows; silver arming sword/gold longsword/wood recurve/elven recurve/blue crystal staff/violet crystal staff/ivory sun staff/gold sun staff; grip near lower quarter except bow center; true alpha; no hands/text/shadows.

보완 아트 검수: `evidence/remediation/weapons-directions.png`(8무기×4방향), `attack-phases.png`(4계열×4시점). 실제 그립은 armR 행렬을 상속한다. 활과 보조팔 포즈를 개선했으나 팔꿈치/손가락이 없는6파트 리그의 한계는 남는다. 이번 보완에서 새로운 ImageGen 원화를 생성한 것은 아니며 신규2대원도 색변형이다.
