/** Tool metadata only: the main page must not import an editor or its renderer. */
export const TOOLS = [
  {
    id: 'characterRig',
    title: '캐릭터 리깅',
    subtitle: 'Character Rig Studio',
    description: '앞·뒷면 이미지의 파츠를 지정하고, 걷기와 등각 4방향을 확인하세요.',
    features: ['6파츠 편집', '걷기 미리보기', '리그 저장'],
    path: 'tools/characterRig/',
  },
] as const;
