/** Tool metadata only: the main page must not import an editor or its renderer. */
export const TOOLS = [
  {
    id: 'spriteSheet',
    title: '스프라이트 시트',
    subtitle: 'Elf Character Sprite Preview',
    description: '엘프 사제, 바바리안, 도적을 선택해 앞·뒷면을 Base → Left → Base → Right 순서로 재생하세요.',
    features: ['캐릭터 선택', '256×256 프레임', '재생 속도 조절', 'PNG·GIF 다운로드'],
    path: 'tools/spriteSheet/',
  },
  {
    id: 'characterRig',
    title: '캐릭터 리깅',
    subtitle: 'Character Rig Studio',
    description: '앞·뒷면 이미지의 파츠를 지정하고, 걷기와 등각 4방향을 확인하세요.',
    features: ['6파츠 편집', '걷기 미리보기', '리그 저장'],
    path: 'tools/characterRig/',
  },
] as const;
