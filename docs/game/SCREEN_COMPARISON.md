# 원본9장과 실제 화면 대조

2026-10-04. [나란히 비교 HTML](evidence/shop/comparison.html). 실제 게임은1024×768 CSS/DPR2에서2048×1536픽셀로 캡처했다. 원본은 동일 CSS프레임에종횡비 보존으로넣었다. 원본 해상도/검은여백을 숨기거나 원본과같은 픽셀결과라고 주장하지 않는다.

|원본 / 비교|확인한 구성|이번 실제 보완|남은 차이와 판정|
|---|---|---|---|
|[main.png](evidence/shop/compare-editor-main.png)|도구 카드/제목/리깅진입|기존 리깅툴 보존 및 회귀검사|게임링크가 추가되고 최소화면 여백이달라짐. 기존 도구문맥 유지|
|[world_map.jpg](evidence/shop/compare-world.png)|지도 위 노드/연결선/자금|자금이 실제 상점과 연동,보급소 진입|원본의 대규모지역·달력·다수메뉴를 복제하지 않은3거점 캠페인. Reborn UnionLevel은PSP요구에따라미도입|
|[stage_map.jpg](evidence/shop/compare-stage.png)|지역지도·전장미리보기·설명|최소화면에서 회전타일 오른쪽끝 잘림 수정,64타일경계검사 추가|원본의 다수입구/디오라마대신 실제8×8전장1개 프리뷰. 디자인상 축소|
|[party_select.jpeg](evidence/shop/compare-party.png)|대원초상/능력/출전대원/후보|6후보·3출전·순서보드와조작버튼 최소화면 확인|원본의 입체격자배치·Guest·다수부대·종족필터없음. 별도확장범위|
|[equipment.jpg](evidence/shop/compare-equipment.png)|5슬롯/아이콘/BaseStats와합산Stats/SP|2슬롯→5슬롯,8능력 기초+직업+장비 분해,방어구·장신구 고유아이콘,실제능력반영|조건/상태이상·소속·원작전체장비/전직 미구현. 새무기/몸장비는보급소에서대원선택장착|
|[item_select.jpg](evidence/shop/compare-shop.png)|분류/목록/보유수/품목상세|44품목 분류목록/아이콘/보유·장착·판매가능/실제효과/가격·원문구분. 구매·판매는사용자가추가승인한확장|원본은장비선택화면이며상점스크린샷이아님. 원문1170중1142는참조전용,전무기군·제작·모든원작조건미지원|
|[event_dialog.jpg](evidence/shop/compare-dialogue.png)|전장배경/화자초상/선택지|실제전장배경과리그초상 유지|원본 도시건물/다수인물/두화자말풍선보다단순. 두선택지는응답차이이며분기캠페인아님|
|[battle_isometric.jpg](evidence/shop/compare-battle.png)|고저차/유닛/명령/상태/RT순서|기존RT·이름표가림수정·실제리깅을확인|원본의 큰전장/복잡건축물/다종유닛보다단순. 확대시UI에일부겹칠수있고기본시점은분리|
|[battle_topview.png](evidence/shop/compare-target-top.png)|Top격자/공격자·대상/피해와확률|공격자와대상리그초상·HP동시표시,실제공통damage/accuracy사용|원본의하단대형초상/풀스크린전장과배치는다름. 적과아군이같은제복리그여서다양성은낮음|

## 육안에서 실제 발견해 수정한 결함

- **P2 보급품 돌아가기 버튼 잘림:** 보급품7종 상태에서 최소화면 진입 시 마지막버튼이 패널밖으로나갔다. [수정전](evidence/shop/items-before-fit.png) → [수정후](evidence/shop/items.png). `game/style.css`의items카드높이·간격을줄이고본문설명은유지. `shop.spec.ts`의 expanded seven-item test가 버튼bottom<668을검증한다.
- **P2 지역 미리보기 오른쪽끝 잘림:** 새원정→첫거점에서 CSSrotate/skew로끝타일이뷰포트를넘었다. [수정전](evidence/shop/stage-before-fit.png) → [수정후](evidence/shop/stage.png). 최소viewport에서width30%/right9%로조정. 모든64타일의rectangle경계를검증한다.
- **P3 생성아틀라스 이웃조각:** 규칙격자만잘라서는반지·활에이웃아이콘일부가섞였다. 실제44품목갤러리에서찾아객체별크롭/연결성분분리후재검수했다. [최종갤러리](evidence/shop/all-44-icons.png). 신규활은전체손렌더4방향/공격시점도검수했다.

## 남은 우선순위

현재증거에서 미수정P0/P1 입력·거래·저장결함을 확인하지 못했다는 뜻이지 모든환경 무결함 보장은아니다. P3아트개선으로양손활시위접촉·유닛실루엣다양성·원본배경밀도를높일수있다. 현재 리그는 원본 화면의 짧고 둥근 SD 비율보다 팔다리가 긴 스타일이며, 성인 여성형과 작은 전장 캐릭터라는 방향은 충족하지만 원본 SD 데포르메와 동일하지 않다. 전투기본마스크/좌표/손무기애니메이션은실제구현이다. 원본전체콘텐츠/제작/전직·Chariot/KO/날씨는구현을주장하지않는다. 전체카탈로그이식이나6독립원화/새리그구조는추가범위결정후진행한다. 실물패드·SteamInput·기기GPU는장비가없어미검증이다.
