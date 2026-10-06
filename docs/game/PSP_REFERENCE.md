# PSP판 근거와 게임 적용

판본은 Tactics Ogre: Let Us Cling Together(PSP, 운명의 수레바퀴). SFC의 510−AGI, Reborn의 Union Level/개별 레벨/랜덤 버프카드/MP 전용 필살/스킬4슬롯을 혼합하지 않는다.

## 출처
- Square Enix [공식 PSP 영문 설명서](https://support.na.square-enix.com/document/manual/1840/ogre.pdf), 56 PDF페이지. 인쇄번호 기준 p18–23 편성/성장, p30–41 전투, p48 팁. 부모 연구자의 실제 페이지 판독과 이 세션 PDF 열람을 대조했다.
- Square Enix [Reborn 전투 디자인 비교](https://www.jp.square-enix.com/tor/battledesign/): PSP→Reborn 차이 확인용이며 PSP 규칙 대신 사용하지 않는다.
- [PSP mechanics 보조자료](https://gamecentergx.at-ninja.jp/tou/wt.html), [플레이어 실측](https://gamefaqs.gamespot.com/boards/999440-tactics-ogre-let-us-cling-together/60445147), [행동 슬롯 논의](https://gamefaqs.gamespot.com/boards/999440-tactics-ogre-let-us-cling-together/71068424): 부모 조사 전달. 비공식이며 회복 상수의 공식 근거로 취급하지 않는다.

|PSP 확인 사항|이번 게임의 적용 / 변환|
|---|---|
|RT 0인 유닛 AT, 이동거리·행동·스킬이 다음 RT에 가산(p34,48)|활성 유닛 하나, 남은 RT 정렬, 전역 clock. 클래스 baseRT 90/80/95/85/100/85, 이동칸4, 공격25/필살마법30/아이템20/활성기술15는 자체 수치|
|이동과 일반행동, 별도 활성스킬 슬롯(보조자료 교차확인)|moved/acted/skillUsed 분리. 이동→공격 및 공격→이동, 별도 결의 사용 가능. 결의 TP8 방어+8은 자체 능력|
|다른 행동 전 이동취소(p36), 종료방향과 후방명중(p39)|공격 전만 되돌리기, 종료시 4방향 선택. OV AGI/AVD 기반 계수와 앞20/뒤60 하한, 측면40/+70 자체 정규화(CALCULATION.md). 방향 피해배율 없음|
|MP 초기0 시간회복(p37), TP 초기0 시간/가해/피해회복(p38)|둘 다0. 전역RT20마다1, 실제 피해 공격TP6·피격TP4, TP상한100. 이는 자체 밸런스이며 회복 잔여RT 보존|
|고저차와 이동/투사체 사거리(p36)|BFS Move/Jump·수면/점유, 높이 우위만큼 활 사거리 확장. 피해 보너스로 바꾸지 않음|
|미리보기 피해/명중(p34)|damage/accuracy 공통 순수 함수. 성공시 피해와 미리보기 일치, 실패는 로그로 구분. seeded RNG로 재현|
|일반 공격/마법/아이템/필살은 일반행동, 활성기술 별도|현재 UI의 직업 기술은 필살 또는 마법(일반행동). 결의만 별도 활성기술; 두 슬롯을 혼동하지 않음|
|클래스 레벨 파티 공유(p21), SP학습/최대10스킬(p20)|6직업, 클래스ID별 공유레벨 저장, 첫 거점 승리+1, 대원SP12/학습8/지원1슬롯 추가. XP배분·클래스마크/전직·10슬롯은 여전히 미구현; 원본 전체 성장과 다름|
|KO부활 카운트/목숨, 시나리오별 승리|작은 캠페인은 HP0전투제외·전멸승패·전투후복구로 간소화. KO/영구사망/다양한 목표 미구현|
|날씨·아군 투사체 충돌·Chariot|미구현. 벽/고도 시선검사만 제공. 전체 PSP 복제 아님|

원본 수치와 모드 One Vision의 공개 계산기는 별도 근거다. 클래스/장비 콘텐츠는 안정 ID와 스키마로 확장 가능하며 계산기의 적용 항목은 CALCULATION.md를 참조한다.
