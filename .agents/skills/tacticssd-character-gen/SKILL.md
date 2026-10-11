---
name: tacticssd-character-gen
description: TacticsSD CharacterGen. 고정 프롬프트로 투명 배경 3등신 SD 엘프 여성 스티커 10장(Base·Left·Right·Hit·Downed의 정면·후면)을 imagegen으로 생성한다. 최초 Front Base에서 Class 변경과 특징 추가만 허용한다. 후속 동작은 같은 방향의 Base를 참조한다. 생성 오류·검증 실패 시 이미지별 최대 3회 재생성한다. Right는 Left와 손·발의 반대 보행을 평가한다.
---

# TacticsSD CharacterGen

[references/prompts.json](references/prompts.json)이 10개 프롬프트의 유일한 원문이며 사용자가 직접 편집할 수 있다. 매 실행 시 파일의 현재 내용을 읽어 그대로 사용한다. Codex는 생성 과정에서 원문을 임의로 요약·번역·재작성·정리하거나 추가 지시를 붙이지 않는다. Front Base에는 `3등신 SD캐릭터`를 명시한다. Right는 같은 방향의 Base를 참조해 imagegen으로 생성한다. Right 프롬프트는 해당 Left의 해부학적 LEFT/RIGHT 및 연결된 화면 방향을 교환해 작성했으며, Back의 `left-arm/right-leg`도 `right-arm/left-leg`로 교환했다. Hit·Downed도 같은 방향의 Base 한 장만 참조한다. 이 스킬 수정 자체는 이미지 재생성을 요구하지 않는다.

## 허용 입력

- Class: 기본값 `Babarian`. 최초 Front Base 프롬프트의 `barbarian class` 위치만 바꿀 수 있다. 기본값은 당시 실제 호출의 `barbarian`을 사용한다.
- 추가 특징: 사용자가 명시한 특징만 최초 Front Base 원문 끝에 한 줄씩 추가한다. 원문 속 고정 조건을 삭제하거나 덮어쓰는 특징은 허용하지 않는다.
- 저장 폴더와 파일 접두사: 산출물 경로 메타데이터이다. 프롬프트에 경로·파일명을 넣지 않는다.

현재 Front Base 원문은 여성 성인 엘프, 3등신 SD, massive bust, 무기 없음, 투명 배경, 1:1, 정면 차렷자세, 양손 가벼운 주먹, 스티커 표현을 사용한다. 후속 이미지는 해당 동작의 자세·표정만 변경하고 Base의 동일 캐릭터·의상·비율·스타일을 유지한다. 생성 호출의 Class/추가 특징 인수는 Front Base에만 적용하고, 후속 이미지에는 지정된 참조 이미지로 전달한다. **후속 원문에 있는 `barbarian` 같은 단어도 생성 중 임의로 치환하지 않는다.** 사용자의 직접 파일 편집과 명시적인 스킬·프롬프트 수정 요청은 허용한다.

이미지 생성은 설치된 `imagegen` 스킬의 내장 도구 모드를 사용한다. 일반적인 프롬프트 보강 규칙보다 이 스킬의 원문 고정 요구가 우선한다. CLI/API 생성으로 전환하지 않는다. 실제 이미지 결과의 픽셀 동일성을 보장하지는 않으며, 고정 대상은 입력 프롬프트·순서·Base 참조 관계·Right 평가 및 재생성 절차이다. Pillow/Sharp 등의 좌우 반전으로 Right를 만들지 않는다.

## 저장 위치와 준비

TacticsSD 프로젝트 루트의 `pixel-art` 아래 하위폴더에 요청된 PNG를 저장한다. 전체 생성은 10장이다. 기본 폴더는 `pixel-art/elf-barbarian-woman`, 접두사는 **`Babarian`**이다. 오타를 임의로 `Barbarian`으로 수정하지 않는다. 다른 Class는 해당 Class 접두사와 `elf-<class-slug>-woman` 폴더를 사용한다. 이미 파일이 존재하면 이번 요청이 교체를 허용한 경우에만 덮어쓰고, 그렇지 않으면 새 버전 폴더를 사용해 기존 파일을 보존한다.

프로젝트 루트를 확인하고 모든 참조·저장 경로를 절대경로로 해석한다. 채팅 첨부가 상대경로 오류를 표시해도 먼저 실제 파일을 확인한다. 참조 이미지마다 `view_image`로 읽고 도구에 정확한 로컬 절대경로를 전달한다. 파일을 찾지 못했을 때 유사 캐릭터로 대체하지 않는다.

`scripts/character_gen.py`의 `prompt`는 표준 라이브러리만 필요하다. `verify`는 Pillow로 파일 형식과 알파를 읽기 전용 검사한다. `from PIL import Image`가 가능한 인터프리터를 확인한다. 없으면 별도 도구용 가상환경에 Pillow를 설치한다. 이번 대화에서는 `/tmp/tacticssd-image-tools/bin/python`을 사용했지만 이후에도 존재한다고 가정하지 않는다. 시스템 Python이나 프로젝트 의존성 설정은 변경하지 않는다. 이미지 변환용 `mirror` 명령은 제거되었다.

## 고정 순서

전체 생성 요청이면 다음 10단계를 순차 실행한다. 특정 단계만 요청받으면 그 단계와 필요한 기존 참조만 사용한다. 기존 6장만 요청받으면 단계 1–6만 실행한다. 중간 승인을 새로 요구하지 않는다.

| 순서 | 파일 | 도구와 입력 | 참조 |
|---|---|---|---|
| 1 | `<Class>_Front_Base.png` | 내장 imagegen, `front-base` | 없음 |
| 2 | `<Class>_Front_Left.png` | 내장 imagegen, `front-left` 원문 | Front Base 1장 |
| 3 | `<Class>_Front_Right.png` | 내장 imagegen, `front-right` 원문 → 평가·필요 시 재생성 | **Front Base** 1장 |
| 4 | `<Class>_Back_Base.png` | 내장 imagegen, `back-base` 원문 | **Front Base** 1장 |
| 5 | `<Class>_Back_Left.png` | 내장 imagegen, `back-left` 원문 | **Back Base** 1장 |
| 6 | `<Class>_Back_Right.png` | 내장 imagegen, `back-right` 원문 → 평가·필요 시 재생성 | **Back Base** 1장 |
| 7 | `<Class>_Front_Hit.png` | 내장 imagegen, `front-hit` 원문 | **Front Base** 1장 |
| 8 | `<Class>_Back_Hit.png` | 내장 imagegen, `back-hit` 원문 | **Back Base** 1장 |
| 9 | `<Class>_Front_Downed.png` | 내장 imagegen, `front-downed` 원문 | **Front Base** 1장 |
| 10 | `<Class>_Back_Downed.png` | 내장 imagegen, `back-downed` 원문 | **Back Base** 1장 |

추가 동작의 조건:

- Front Hit: 두 손을 들고 눈을 크게 뜬 깜짝 놀라는 표정.
- Back Hit: 완전한 뒷모습으로 두 손을 든다. 얼굴이나 표정을 보여주려고 고개를 돌리지 않는다.
- Front/Back Downed: 고개를 숙이고 배를 아래로 향한 채 엎드린 자세. **1:1 캔버스의 하단 절반에만 전신을 배치하고, 상단 절반은 완전히 투명한 여백(모든 픽셀 알파 0)으로 남긴다.** 머리카락·귀·손·발까지 전부 하단 안에 포함하며, 좌우로 중앙 정렬한다. 하단에 맞도록 캐릭터 전체의 표시 크기를 균일하게 조절하되 신체 비율을 유지하고 신체 일부를 자르지 않는다. 같은 정면/후면의 방향 축을 유지하며, 옆모습·똑바로 누움·서서 인사하는 자세로 바꾸지 않는다. Front도 얼굴을 보여주려고 고개를 들지 않는다.

Hit·Downed는 모두 같은 방향의 Base를 직접 참조한다.

단계 1에서만 다음 명령의 stdout을 프롬프트로 사용한다. 기본 Class/추가 특징 없음이면 원문과 바이트 단위로 동일하다. `--features`는 반복 가능하며 사용자가 준 특징만 전달한다.

```bash
python <skill-dir>/scripts/character_gen.py prompt front-base --class-name Babarian
python <skill-dir>/scripts/character_gen.py prompt front-base --class-name Cleric --features '사용자가 명시한 추가 특징'
```

단계 2–10은 다음 명령 stdout을 **그대로** 사용한다. Class/특징 인수를 넣지 않는다. 프롬프트 문자열을 별도로 복사해 새 문장으로 작성하지 않는다. 쉘 stdout을 사용할 때도 줄바꿈·공백을 보존한다. 코드 모드에서는 명령 결과의 `output` 문자열을 도구 `prompt`에 직접 전달한다. 도구 결과에 붙은 상태 정보는 프롬프트에 포함하지 않는다.

```bash
python <skill-dir>/scripts/character_gen.py prompt front-left
python <skill-dir>/scripts/character_gen.py prompt front-right
python <skill-dir>/scripts/character_gen.py prompt back-base
python <skill-dir>/scripts/character_gen.py prompt back-left
python <skill-dir>/scripts/character_gen.py prompt back-right
python <skill-dir>/scripts/character_gen.py prompt front-hit
python <skill-dir>/scripts/character_gen.py prompt back-hit
python <skill-dir>/scripts/character_gen.py prompt front-downed
python <skill-dir>/scripts/character_gen.py prompt back-downed
```

각 imagegen 호출은 `transparent_background: true`를 사용한다. 단계 1은 `referenced_image_paths`와 `num_last_images_to_include` 모두 생략한다. 이후는 표의 지정 참조 1장만 `referenced_image_paths`에 전달하며 `num_last_images_to_include`는 생략한다. **Right의 생성·재생성 참조는 항상 같은 방향의 Base 한 장이다. Left나 실패한 Right를 생성 참조에 넣지 않는다.** Left는 생성 후 시각적 평가에만 사용한다. 생성 결과는 인라인 표시하고, 반환된 실제 파일을 후보로 검사한 뒤 통과한 후보만 지정 폴더의 최종 파일명으로 복사해 저장한다. 실패 후보로 기존 최종 파일을 덮어쓰지 않는다. 기본 도구 출력 디렉터리만 남겨두지 않는다. 다음 단계는 직전 저장과 검증이 끝난 후 실행한다.

단계 3·6은 [references/right-evaluation.md](references/right-evaluation.md)을 읽고 실행한다. Base·Left·새 Right를 `view_image`로 직접 확인하고 네 팔다리를 각각 평가한다. Right가 Left와 같거나 한 팔다리라도 잘못되거나 판별 불가이면, 아래 공통 규칙에 따라 같은 Base와 동일한 Right 고정 프롬프트로 재생성한 후 재평가한다. 원본 Base·Left는 보존한다.

## 생성 오류와 재생성

모든 이미지 단계에 **최초 생성 1회 + 재생성 최대 3회, 총 최대 4회 호출**을 적용한다. Right에도 동일한 상한을 적용한다. 도구 호출 오류·결과 미반환, PNG·정사각형·RGBA·투명 알파 검사 실패, Downed의 상단 투명 여백 실패, 캐릭터·방향·자세·표정·보행의 불일치 또는 판별 불가를 해당 시도의 실패로 기록한다.

실패하면 중간 승인을 새로 요구하지 않고, 그 단계에서 실제 사용한 **동일한 프롬프트·동일한 지정 참조·`transparent_background: true`**로 재생성한다. Front Base는 처음 적용한 Class/추가 특징까지 동일하게 유지하고 참조는 계속 생략한다. 실패 후보를 다음 시도의 참조로 쓰거나, 오류를 우회하려고 프롬프트·스타일·참조를 바꾸지 않는다. 안전 검사 거부에도 정책상 허용된 동일 요청 범위에서만 재시도한다.

도구 오류로 이미지가 반환되지 않은 호출도 상한에 포함한다. 도구 오류와 검증 실패의 횟수를 합산하며, 실패 유형이 바뀌어도 횟수를 초기화하지 않는다. 이미지별로 최초 시도와 재생성 1/3·2/3·3/3, 오류 또는 검증 근거를 기록한다. 파일 경로·참조 누락·검사 도구 미설치 같은 준비 문제는 먼저 해결하며, 생성으로 해결할 수 없는 문제에 호출을 반복하지 않는다.

후보가 모든 검사를 통과하면 즉시 최종 파일로 저장하고 다음 단계로 진행한다. 총 4회 모두 실패하면 해당 단계에서 멈추고 횟수·마지막 오류 또는 평가 근거·미실행 단계를 보고한다. 이미 통과한 파일은 보존하고 실패 후보를 최종 파일로 채택하지 않는다. CLI/API나 다른 생성 수단으로 자동 전환하지 않는다.

## 검사와 완료

각 생성 파일은 `verify <absolute-png-path>`로 정사각형·RGBA·실제 투명 알파를 확인한다. 모델이 출력한 해상도를 그대로 유지한다. 이번 예제는 1254×1254였지만 크기를 맞추려고 리사이즈·크롭·배경 제거를 하지 않는다.

Front/Back Downed는 `verify <absolute-png-path> --empty-top-half`로 상단 절반의 모든 픽셀이 알파 0인지 추가 검사한다. 홀수 높이는 중앙 행까지 상단 여백으로 검사한다. 전신의 하단 배치는 생성 프롬프트에서 지정하며, 생성 후 이미지를 옮기거나 리사이즈·크롭해서 맞추지 않는다.

시각적으로 동일 캐릭터·의상·비율·스타일, 전신, 해당 정면/후면의 방향, 양손 주먹과 단계별 자세를 확인한다. Base는 차렷, Left/Right는 걷기, Hit는 양손 들기와 Front의 놀란 표정, Downed는 고개를 숙인 엎드림인지 확인한다. Downed는 고개를 숙여 얼굴이 가려져도 되며, 전신 포함은 모든 신체 부위가 캔버스 안에 있다는 뜻이다. 자연스러운 신체·머리카락의 겹침은 허용한다.

Left 걷기는 캐릭터 기준 왼손·오른발 전진, 오른손·왼발 후진이다. Right 걷기는 **오른손·왼발 전진, 왼손·오른발 후진**이다. 정면은 캐릭터의 왼쪽이 화면 오른쪽이고, 후면은 캐릭터의 왼쪽이 화면 왼쪽이다. 후면 전진은 관찰자로부터 멀어지는 방향이다. 캐릭터 전체를 통째로 반사시키지 않고 보행 자세만 바꾼다.

어느 단계든 결과가 요구를 충족하지 못하면 공통 재생성 규칙을 적용하고, Right는 추가로 네 팔다리의 반대 보행 평가를 수행한다. 임의 수정 프롬프트·추가 참조·스타일 변경으로 보정하지 않는다.

완료 시 저장된 파일의 절대경로 링크, 사용한 Class/추가 특징, 실행한 imagegen 단계(전체 요청은 10단계), 이미지별 최초 생성·재생성 횟수와 발생한 오류를 보고한다. Right를 실행했다면 방향별 손·발 평가 결과를 보고한다. Hit·Downed를 실행했다면 각 자세·표정 평가도 보고하며, Downed의 하단 전신 배치와 상단 투명 여백 검사 결과를 포함한다. 프롬프트 원문은 `references/prompts.json` 링크로 제공하고, Front Base를 변경했다면 적용한 Class 치환과 추가 특징을 함께 명시한다. 수행하지 않은 단계나 평가하지 않은 결과는 완료·통과했다고 보고하지 않는다.
