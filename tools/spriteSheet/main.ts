import './style.css';
import clericSheetUrl from './assets/elf-cleric-sheet.png';
import clericMetadataUrl from './assets/elf-cleric-sheet.json?url';
import barbarianSheetUrl from './assets/elf-barbarian-sheet.png';
import barbarianMetadataUrl from './assets/elf-barbarian-sheet.json?url';
import thiefSheetUrl from './assets/elf-thief-sheet.png';
import thiefMetadataUrl from './assets/elf-thief-sheet.json?url';

const characters = [
  { id: 'elf-cleric', label: '엘프 사제', sheetUrl: clericSheetUrl, metadataUrl: clericMetadataUrl },
  { id: 'elf-barbarian', label: '엘프 바바리안', sheetUrl: barbarianSheetUrl, metadataUrl: barbarianMetadataUrl },
  { id: 'elf-thief', label: '엘프 도적', sheetUrl: thiefSheetUrl, metadataUrl: thiefMetadataUrl },
];

const poses = ['Base', 'Left', 'Base', 'Right'] as const;
document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <main>
    <a href="${import.meta.env.BASE_URL}">← 제작 도구 목록</a>
    <h1 id="title">엘프 사제 스프라이트 시트</h1>
    <p>256×256 프레임 · Base → Left → Base → Right 반복 재생</p>
    <div class="controls">
      <div class="character-picker"><label for="character">캐릭터</label><select id="character">${characters.map(character => `<option value="${character.id}">${character.label}</option>`).join('')}</select></div>
      <button id="play" disabled>일시정지</button>
      <button id="step" disabled>다음 프레임</button>
      <label>재생 속도 <input id="speed" type="range" min="1" max="12" value="4"/><output id="fps">4 FPS</output></label>
    </div>
    <p id="status" role="status">이미지를 불러오는 중…</p>
    <section class="previews" aria-label="애니메이션 미리보기">
      <figure><figcaption>앞면 · Front</figcaption><canvas id="front" width="256" height="256" aria-label="앞면 애니메이션"></canvas><button id="download-front-gif" class="gif-download" disabled>정면 GIF 다운로드</button></figure>
      <figure><figcaption>뒷면 · Back</figcaption><canvas id="back" width="256" height="256" aria-label="뒷면 애니메이션"></canvas><button id="download-back-gif" class="gif-download" disabled>후면 GIF 다운로드</button></figure>
    </section>
    <p>GIF는 투명 배경과 현재 재생 속도로 반복 저장됩니다.</p>
    <p id="gif-status" role="status"></p>
    <ol class="sequence" aria-label="프레임 순서">${poses.map((pose, i) => `<li data-frame="${i}">${i + 1}. ${pose}</li>`).join('')}</ol>
    <section><h2>병합된 시트 <small>1024×512</small></h2>
      <p>첫 번째 행: Front · 두 번째 행: Back</p>
      <div class="downloads" hidden><a id="download-png">PNG 다운로드</a><a id="download-json">프레임 정보 다운로드</a></div>
      <img class="sheet" hidden alt="앞·뒷면 각각 Base, Left, Base, Right의 4개 프레임으로 구성된 스프라이트 시트"/>
    </section>
  </main>`;

const play = document.querySelector<HTMLButtonElement>('#play')!;
const step = document.querySelector<HTMLButtonElement>('#step')!;
const speed = document.querySelector<HTMLInputElement>('#speed')!;
const status = document.querySelector<HTMLParagraphElement>('#status')!;
const characterSelect = document.querySelector<HTMLSelectElement>('#character')!;
const sheet = document.querySelector<HTMLImageElement>('.sheet')!;
const downloads = document.querySelector<HTMLDivElement>('.downloads')!;
const downloadPng = document.querySelector<HTMLAnchorElement>('#download-png')!;
const downloadJson = document.querySelector<HTMLAnchorElement>('#download-json')!;
const gifButtons = ['front', 'back'].map(direction => document.querySelector<HTMLButtonElement>(`#download-${direction}-gif`)!);
const gifStatus = document.querySelector<HTMLParagraphElement>('#gif-status')!;
const contexts = ['front', 'back'].map(id => document.querySelector<HTMLCanvasElement>(`#${id}`)!.getContext('2d')!);
let image = new Image();
let frame = 0;
let playing = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let lastTime = 0;
let ready = false;
let exportingGif = false;
function updateGifButtons() { gifButtons.forEach(button => { button.disabled = !ready || exportingGif; }); }
async function downloadGif(row: 0 | 1) {
  if (!ready || exportingGif) return;
  const exportImage = image;
  const character = characters.find(character => character.id === characterSelect.value)!;
  const fps = Number(speed.value);
  const direction = row === 0 ? 'Front' : 'Back';
  const label = row === 0 ? '정면' : '후면';
  exportingGif = true; updateGifButtons();
  gifStatus.textContent = `${character.label} ${label} GIF를 만드는 중…`;
  try {
    const { createAnimationGif } = await import('./gif-export');
    const blob = createAnimationGif(exportImage, row, fps);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = `${character.id}-${direction}-${fps}fps.gif`;
    document.body.append(anchor); anchor.click(); anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    gifStatus.textContent = `${character.label} ${label} GIF 다운로드를 시작했습니다. (${fps} FPS)`;
  } catch {
    gifStatus.textContent = 'GIF를 만들지 못했습니다. 다시 다운로드해 주세요.';
  } finally {
    exportingGif = false; updateGifButtons();
  }
}
gifButtons[0].addEventListener('click', () => { void downloadGif(0); });
gifButtons[1].addEventListener('click', () => { void downloadGif(1); });
function render() {
  contexts.forEach((context, row) => {
    context.clearRect(0, 0, 256, 256);
    context.imageSmoothingEnabled = false;
    context.drawImage(image, frame * 256, row * 256, 256, 256, 0, 0, 256, 256);
  });
  document.querySelectorAll<HTMLElement>('[data-frame]').forEach(element => {
    if (Number(element.dataset.frame) === frame) element.setAttribute('aria-current', 'step');
    else element.removeAttribute('aria-current');
  });
}
function updatePlay() { play.textContent = playing ? '일시정지' : '재생'; }
function tick(time: number) {
  if (ready && playing && !document.hidden) {
    if (!lastTime) lastTime = time;
    if (time - lastTime >= 1000 / Number(speed.value)) {
      frame = (frame + 1) % poses.length; lastTime = time; render();
    }
  } else lastTime = 0;
  requestAnimationFrame(tick);
}
play.addEventListener('click', () => { playing = !playing; lastTime = 0; updatePlay(); });
step.addEventListener('click', () => { playing = false; frame = (frame + 1) % poses.length; lastTime = 0; updatePlay(); render(); });
speed.addEventListener('input', () => { document.querySelector<HTMLOutputElement>('#fps')!.value = `${speed.value} FPS`; lastTime = 0; });
document.addEventListener('visibilitychange', () => { lastTime = 0; });
function loadCharacter() {
  const character = characters.find(character => character.id === characterSelect.value)!;
  ready = false; frame = 0; lastTime = 0;
  updateGifButtons(); gifStatus.textContent = '';
  play.disabled = true; step.disabled = true;
  sheet.hidden = true; downloads.hidden = true;
  contexts.forEach(context => context.clearRect(0, 0, 256, 256));
  document.querySelectorAll('[data-frame]').forEach(element => element.removeAttribute('aria-current'));
  document.querySelector<HTMLHeadingElement>('#title')!.textContent = `${character.label} 스프라이트 시트`;
  status.textContent = `${character.label} 이미지를 불러오는 중…`;
  const loadingImage = new Image();
  image = loadingImage;
  loadingImage.onload = () => {
    if (image !== loadingImage) return;
    if (image.naturalWidth !== 1024 || image.naturalHeight !== 512) { status.textContent = '시트 크기가 올바르지 않습니다. 시트를 다시 생성하세요.'; return; }
    ready = true; play.disabled = false; step.disabled = false;
    updateGifButtons();
    downloadPng.href = character.sheetUrl; downloadPng.download = `${character.id}-sheet.png`;
    downloadJson.href = character.metadataUrl; downloadJson.download = `${character.id}-sheet.json`;
    sheet.src = character.sheetUrl; sheet.alt = `${character.label} 앞·뒷면 각각 Base, Left, Base, Right의 4개 프레임으로 구성된 스프라이트 시트`;
    sheet.hidden = false; downloads.hidden = false;
    status.textContent = `${character.label} 앞·뒷면을 같은 순서로 재생합니다.`; updatePlay(); render();
  };
  loadingImage.onerror = () => {
    if (image !== loadingImage) return;
    status.textContent = '이미지를 불러오지 못했습니다. 다른 캐릭터를 선택하거나 페이지를 새로고침해 주세요.';
  };
  loadingImage.src = character.sheetUrl;
}
characterSelect.addEventListener('change', loadCharacter);
loadCharacter();
requestAnimationFrame(tick);
