> 후속상점단계:5슬롯의STR/VIT/DEX/AGI/AVD/INT/MND/RES·ATK·DEF·HP·MP·물리저항을공통derive에합산한다. 원문28품목의수치축소및회복공식은 [SHOP.md](SHOP.md)와game/source-items.json을우선한다. MendLeaf는현재URL50+최대HP10%로교체되었고기존38은과거값이다.

# 계산 출처와 적용 범위 · 보완판

2026-10-04. **PSP 전투 흐름, One Vision 계산 근거, TacticsSD 자체 수치를 분리한다.** One Vision은 PSP 원본 수치가 아니다. 원본 감사는 [REVALIDATION.md](REVALIDATION.md), 보완은 [REMEDIATION.md](REMEDIATION.md).

## 원문 대조

- docs/URL.txt의 [계산기](https://ogre-db.github.io/one-vision/calculator.html), [formula.js](https://ogre-db.github.io/one-vision/js/formula.js), [calculator.js](https://ogre-db.github.io/one-vision/js/page/calculator.js). 실제 소스와 1,000개 물리 계산 입력의 floor/max 순서를 대조했다. 힘/민첩/집중 스케일 ID는 **1/7/13**이다.
- 사용자가 추가한 **Readme v1.11d.pdf**, 138페이지. PDF p7의 v1.10a가 p8의 v1.10 마법 계수 일부를 덮어쓴다. PDF는 모드 설치나 ROM 변경 지시로 해석하지 않았다. 원본·발췌 대조는 감사 증거에 남았다.
- 공식 PSP 설명서는 RT/AT, 이동·행동, MP/TP, 방향, 성장의 구조 근거이며 이하 OV 수치의 근거로 혼용하지 않는다.

## 현재 함수

`game/calculation.ts`의 `derive()`를 편성/장비/전투 생성이 공유한다.

1. 능력치 = 기본10 + 클래스 초기치 + 클래스10레벨성장/10 × (클래스레벨−1) + 장착한 슬롯 장비의 능력치 합. `statBreakdown`으로 기초/직업성장/장비 항을 UI와 공유한다. 주무기/보조손/몸/팔/장신구5슬롯은 equipment.jpg와 calculator.js 슬롯 구조에 대응한다. 새 방패/완갑/반지의 수치는 추천 캠페인 값이며 원본 OV 레코드 복제는 아니다.
2. 물리 Offense: 힘형 STR×1.2 + DEX×0.6, 민첩형 STR×0.6 + DEX×1.2, 집중형 (DEX+INT+MND)×0.6. 무기 숙련×4를 더한다. Toughness = STR×0.5 + VIT.
3. Overhead = floor(max(Offense−Toughness,0)).
4. Modified = floor(max(Overhead×(100+DamageBonus−Resistance)/100,0)).
5. Total = floor(max(Modified+Attack−Defense,1)).
6. Final = Total이1이면1, 아니면 floor(Total×Multiplier). 런타임 배율은1이며 치명타 판정 시스템을 구현했다고 주장하지 않는다.

마법은 이제 집중형 **무기** 공격으로 대체하지 않는다. `calculateSpellDamage()`는 p7의 INT×1.2+MND×0.6 대 RES×1+MND×0.5, 대상 DEF 절반을 적용한다. 현재 주문은 중립속성으로 저항0, 주문 power는 자체 콘텐츠이다. 물리속성 마법의 물리저항 절반·원소/종족/장신구 보정은 아직 모델링하지 않았다. DamageBonus10도 캠페인 값이다. 회복은 ability power와 현재 자원 부족분 중 작은 값이다.

`calculateAccuracy()`:
- 무기 명중 계수 = AGI×1.2 + DEX×0.6 + 무기숙련×8. 회피 = AVD×1.2 + DEX×0.6. 방어측 무기숙련을 임의로 회피에 더하지 않는다.
- 투사체형 주문 = MND×1.2 + INT×0.6 + AGI×0.4. 회피 = AVD×1.2 + MND×0.6. AGI0.4는 p7 정정이다.
- p8에서 확인되는 최소 정면20/후방60을 적용한다. **측면40과 최종 `clamp(70 + 방향최소값 + 명중계수 − 회피계수, 방향최소값, 100)`의 +70 정규화는 자체 규칙**이다. 제공 문서는 완전한 최종 확률 식을 정의하지 않는다. 이전 정면90/측면95/후방100 고정값과 초지−3은 제거했다. 이 식을 정확한 OV/PSP 명중률이라고 부르면 안 된다.
- 각 피해 대상마다 같은 `accuracy()`로 seeded RNG를 판정한다. 빗나감은 HP/TP를 증가시키지 않는다. 성공 시에만 공격자TP6/피격자TP4(자체 상수)를 부여한다.

`domain.damage()`를 HUD와 실제 효과가 공유한다. HP/MP/TP 회복 상한, AoE의 아군/적군 선택도 동일한 effect/target 데이터로 실행한다. area heal/guard는 아군에게만 적용한다. AT 종료를 취소하면 방어 보너스를 얻지 않는다.

## 콘텐츠와 성장에서 자체 결정한 값

6직업의 기본/성장/HP/MP/ATK/DEF/RT, AGI=초기DEX·AVD=초기VIT, 무기8종/갑옷2종, 지원스킬3종, 능력10종과 비용/범위는 TacticsSD 값이다. 출전 직업은 새 거점 첫 승리마다 공유 클래스레벨+1, 출전 대원은 SP12, 새 기술은 SP8이며 시작SP8이다. 재방문에도 클래스레벨이 유지된다. 원본 PSP XP 배분/클래스마크/10슬롯 학습 전체를 완성한 것이 아니다.

## 실제 확장 경로

- `content.ts`: CLASSES/ROSTER/CLASS_ABILITIES에 안정 ID를 연결한다. 파수기사/현자, 수호의진/광역회복/달빛화살을 실제 추가해 경로를 사용했다.
- ABILITIES의 target/range/radius/resource/formula/effect가 일반 UI와 전투를 구동한다. EFFECTS는 damage/heal/guard/mp/tp를 실행한다. 새 효과 종류는 스키마 enum, 대상 유효성, 예상량 함수, EFFECTS를 함께 확장해야 하며 **데이터 한 줄만으로 모든 새 효과가 생기지 않는다**.
- SUPPORT_SKILLS는 무기숙련/이동/방어 지원1슬롯이며 derive에 반영된다.
- CONSUMABLES는 HP/MP/TP 세 품목의 재고와 아이템 선택 UI에 사용된다.
- 저장은 안정ID를 쓴다. 기존 v1/v2 4대원 저장에 새 대원 기본장비와 학습/레벨 기본값을 채우며 알려지지 않은 학습 참조는 거부한다.

검증: `tests/game/expansion.test.ts`, `regression.test.ts`, 기존 `domain.test.ts`. 주문 RES/DEF, AGI/AVD/방향 하한, 새 클래스 AoE, 자원 상한/소모, 저장/재방문, 빗나감TP, 아군 AoE를 검사한다.
