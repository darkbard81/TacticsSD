import { parseRig, serializeRig } from './io/rig-file';
import './style.css';
import { createRig, makeView, rigSchema, updateGeometry, setGround, setParent, TEMPLATES, VIEWS, DIRECTIONS, MOTION_FIELDS, identity, type CharacterRigData, type ViewId, type DirectionId, type Mode, type ImageRef } from './domain/rig';
import { createDefaultRig, DEFAULT_SHEET_URL, resetEditorPlacement } from './domain/default-rig';
import { phaseAt } from './domain/animator';
import { RigAssets, type Asset } from './runtime/assets';
import { PixiRigRenderer } from './runtime/renderer';
import { SourceEditor } from './editor/source';

const root = document.querySelector<HTMLDivElement>('#app')!;
root.innerHTML = `
<header class="app-header"><div class="brand"><span class="brand-mark">◈</span><div><strong>TacticsSD</strong><span>CHARACTER RIG STUDIO</span></div></div><div class="project"><span class="status-dot"></span><span id="project-name">elf-parts-sheet</span><span class="tag">HUMANOID · 6 PARTS</span></div><nav aria-label="프로젝트"><button data-action="home">← 메인으로</button><button data-action="new">새 리그</button><button data-action="sample">기본 파츠 시트</button><label class="button">JSON 열기<input id="load-json" type="file" accept=".json,application/json" hidden></label><button class="primary" data-action="save">↓ 리그 저장</button></nav></header>
<div class="intro"><div><span class="eyebrow">WORKSPACE / 01</span><h1>캐릭터에 움직임을 더하세요<span>.</span></h1><p>영역을 나누고, 부착점을 맞추고, 같은 리그로 모든 방향을 확인하세요.</p></div><div class="steps"><b>01 <span>파츠 지정</span></b><i>―</i><b>02 <span>모션 보정</span></b><i>―</i><b>03 <span>리그 저장</span></b></div></div>
<div id="notice" role="status" aria-live="polite">에디터를 준비하고 있습니다.</div><div id="error" role="alert" hidden></div>
<main class="workspace">
<section class="panel source-panel" aria-labelledby="source-title"><div class="panel-title"><div><span class="eyebrow">SOURCE IMAGE</span><h2 id="source-title">원본 · 파츠 편집</h2></div><div class="segmented" id="view-tabs"><button data-view="Front">Front</button><button data-view="Back">Back</button></div></div><div class="source-toolbar"><label class="button small">이미지 불러오기<input id="load-image" type="file" accept="image/png,image/webp,image/jpeg" hidden></label><div class="tools"><button data-tool="select" title="영역 이동" aria-label="영역 이동">↖</button><button data-tool="draw" title="선택 파츠의 새 영역 그리기" aria-label="영역 그리기">▧</button><button data-tool="pan" title="화면 이동" aria-label="화면 이동">✥</button><button data-action="zoom-out" aria-label="축소">−</button><button data-action="zoom-in" aria-label="확대">+</button><button data-action="fit">맞춤</button></div></div><div id="source" class="checker viewport"><div id="source-empty" class="empty">앞면 또는 뒷면 이미지를 불러오세요.<small>PNG · WebP · JPG / 한쪽만 있어도 시작할 수 있어요.</small></div></div><div class="panel-footer"><span id="source-meta"></span><span>휠 확대 · Alt+드래그 이동</span></div><div id="parts" class="part-list" aria-label="파츠 선택"></div><p class="hint" id="side-hint"></p></section>
<section class="panel preview-panel" aria-labelledby="preview-title"><div class="panel-title"><div><span class="eyebrow">LIVE PREVIEW</span><h2 id="preview-title">움직임 미리보기</h2></div><span class="live-badge">● LIVE</span></div><div class="preview-toolbar"><label>방향 <select id="direction">${DIRECTIONS.map(d => `<option>${d}</option>`).join('')}</select></label><button data-action="compare" id="compare" aria-pressed="false">▦ 4방향 비교</button><label class="check"><input id="checker" type="checkbox" checked>체크무늬</label></div><div id="preview" class="checker viewport"><div id="direction-labels"></div></div><div class="panel-footer"><span id="preview-meta"></span><span>지면 기준 고정 · 제자리 걷기</span></div><p class="hint">등각은 2D 파츠 보정입니다. 반전 시 장비의 좌우도 바뀔 수 있습니다.</p></section>
<aside class="panel inspector"><div class="panel-title"><div><span class="eyebrow">PROPERTIES</span><h2>리그 설정</h2></div><span id="selected-tag" class="tag"></span></div><div id="inspector-content"></div></aside>
<section class="panel transport" aria-label="재생 컨트롤"><div class="transport-main"><div class="segmented" id="modes"><button data-mode="Rest">Rest</button><button data-mode="Idle">Idle</button><button data-mode="Walk">Walk</button></div><button id="play" data-action="play" class="primary">▶ 재생</button><button data-action="reset" title="Rest 자세와 0초로 초기화">↶ 처음으로</button><label>속도 <select id="speed"><option value="0.25">0.25×</option><option value="0.5">0.5×</option><option value="1" selected>1×</option><option value="1.5">1.5×</option><option value="2">2×</option></select></label></div><div class="scrub"><span>사이클</span><input id="phase" aria-label="사이클 위치" type="range" min="0" max="1" step="0.001" value="0"><output id="phase-output">0.000</output></div></section>
</main><section class="asset-panel panel"><div><h2>이미지 연결</h2><p>JSON에는 파일 식별자가 저장됩니다. 다른 세션에서 열면 원본 파일을 다시 연결하세요.</p></div><div id="asset-list"></div><label class="button" id="reconnect-label">누락 이미지 일괄 연결<input id="reconnect" type="file" accept="image/png,image/webp,image/jpeg" multiple hidden></label></section>
<footer class="app-footer"><span>TacticsSD · SD CharacterRig Editor</span><span>원본 픽셀 좌표 · PNG / WebP / JPG · JSON v2</span></footer>`;

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
let rig = createRig(), viewId: ViewId = 'Front', selected = 'head', direction: DirectionId = 'Front';
let compare = false, mode: Mode = 'Rest', playing = false, seconds = 0, speed = 1, solo: string | null = null, busy = false, disposed = false, dirty = false;
const assets = new RigAssets();
const controller = new AbortController();
const view = () => rig.views[viewId];
const part = () => view().parts.find(p => p.id === selected)!;
const notice = (message: string) => { $('notice').textContent = message; };
const clearError = () => { $('error').hidden = true; $('error').textContent = ''; };
const error = (e: unknown) => { $('error').textContent = e instanceof Error ? e.message : String(e); $('error').hidden = false; };
const source = new SourceEditor($('source'), finished => { dirty = true; refresh(finished); }, id => { selected = id; refresh(); });
const renderer = new PixiRigRenderer($('preview'), delta => {
  if (playing && !document.hidden) seconds += delta * speed;
  renderer.render(seconds, mode);
  const phase = phaseAt(seconds, rig.motion.duration);
  if (document.activeElement !== $('phase')) ($('phase') as HTMLInputElement).value = String(phase);
  $('phase-output').textContent = phase.toFixed(3);
});
const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]!));
const numberField = (label: string, path: string, value: number, step = 1, min = -100000, max = 100000) => `<label class="field"><span>${label}</span><input type="number" data-path="${path}" aria-label="${label}" value="${Number(value.toFixed(5))}" step="${step}" min="${min}" max="${max}"></label>`;
const fields = (prefix: string, values: Record<string, number>, labels: Record<string, string>, step = 1) => Object.entries(values).map(([k,v]) => numberField(labels[k] ?? k, `${prefix}.${k}`, v, step)).join('');
function inspector() {
  const open = new Set([...$('inspector-content').querySelectorAll<HTMLDetailsElement>('details[open]')].map(d => d.dataset.section));
  const first = !$('inspector-content').children.length;
  const details = (id: string, title: string, content: string, initial = false) => `<details data-section="${id}" ${open.has(id) || (first && initial) ? 'open' : ''}><summary>${title}</summary><div class="detail-body">${content}</div></details>`;
  const p = part(), v = view(), d = rig.directions[direction], c = d.parts[selected];
  $('inspector-content').innerHTML =
    `<div class="part-heading"><strong>${TEMPLATES[rig.rigType].find(p => p.id === selected)!.label}</strong><div><label class="check"><input id="visible" type="checkbox" ${p.visible ? 'checked' : ''}>표시</label><label class="check"><input id="solo" type="checkbox" ${solo === selected ? 'checked' : ''}>단독</label></div></div>` +
    details('rect', '01 · 영역과 부착점', `<div class="field-grid">${fields('rect', p.rect, { x:'영역 X', y:'영역 Y', width:'영역 너비', height:'영역 높이' })}</div><p class="hint">원본 이미지 픽셀 단위. 모서리 핸들로 크기를 조절하세요.</p><div class="field-grid">${fields('pivot', p.pivot, {x:'부착점 X', y:'부착점 Y'})}</div><p class="hint">금색 점 · 잘라낸 영역 내부 좌표</p>`, true) +
    details('attachment', '02 · 부모 연결과 소켓', `<label class="field">부모 파츠<select id="parent-part" ${p.id === 'body' ? 'disabled' : ''}><option value="" ${p.attachment.parentId === null ? 'selected' : ''}>지면 · 독립 배치</option>${p.id !== 'body' ? `<option value="body" ${p.attachment.parentId === 'body' ? 'selected' : ''}>몸통</option>` : ''}</select></label><p class="hint">${p.attachment.parentId ? '소켓은 몸통 이미지 내부 좌표입니다. 선택 파츠의 금색 pivot이 보라색 소켓에 연결됩니다.' : '소켓은 지면 기준 좌표입니다. 몸통을 부모로 선택하면 이동·회전·배율을 함께 따릅니다.'}</p><div class="field-grid">${fields('socket', p.attachment.socket, {x:'소켓 X',y:'소켓 Y'})}</div><p class="hint">부모 변경 시 방향 보정을 제외한 기준 자세를 유지합니다. 숨김·단독 보기와 그리기 순서는 연결과 독립적입니다.</p>`) +
    details('pose', '03 · 접합 보정과 순서', `<div class="field-grid">${fields('rest', p.restTransform, {x:'접합 보정 X',y:'접합 보정 Y',scaleX:'배치 배율 X',scaleY:'배치 배율 Y',rotation:'배치 회전 (rad)',skewX:'배치 skew X',skewY:'배치 skew Y'}, 0.01)}${numberField('그리기 순서', 'part.zIndex', p.zIndex)}</div><button data-action="reset-part">선택 파츠 배치 초기화</button><button data-action="reset-all">이 뷰의 전체 배치 초기화</button>`) +
    details('image', '04 · 파츠 이미지 교체', `<p class="hint">팔에 몸통 픽셀이 섞이면 외부에서 정리한 투명 파츠로 교체하세요. 교체 이미지는 선택 영역 크기에 맞춰 표시됩니다.</p><label class="button small">파츠 이미지<input id="replacement" type="file" accept="image/png,image/webp,image/jpeg" hidden></label><p class="filename">${esc(p.replacement?.name ?? '원본 사각형 사용 중')}</p><button data-action="remove-replacement" ${!p.replacement ? 'disabled' : ''}>원본 영역으로 복원</button>`) +
    details('view', `05 · ${viewId} 지면과 표시 크기`, `<div class="field-grid">${fields('ground', v.ground, {x:'지면 X',y:'지면 Y'})}${numberField('표시 배율', 'view.displayScale', v.displayScale, 0.01, 0.001, 100)}${numberField('기준 크기 (px)', 'view.referenceSize', v.referenceSize, 1, 1, 8192)}</div><p class="hint">기준 크기는 모션 단위와 원본 정규화에 쓰입니다. 표시 배율로 앞·뒤 크기를 맞추세요.</p><button data-action="copy-front" ${viewId === 'Front' ? 'disabled' : ''}>Front 설정을 Back에 복사</button><p class="hint">다른 원본의 크기에 비례하여 복사합니다. 뒷면 위치는 직접 확인하세요.</p>`) +
    details('motion', '06 · SD_Walk 모션', `<p class="hint">거리 값은 기준 크기에 대한 비율입니다. 한 사이클 = 왼발 한 번 + 오른발 한 번.</p><div class="field-grid">${Object.entries(MOTION_FIELDS).map(([key, opt]) => numberField(opt.label, `motion.${key}`, rig.motion[key as keyof typeof MOTION_FIELDS], opt.step, opt.min, opt.max)).join('')}</div>`) +
    details('direction', `07 · ${direction} 방향 보정`, `<label class="field">사용 이미지<select id="direction-view">${VIEWS.map(id => `<option ${d.view === id ? 'selected' : ''}>${id}</option>`).join('')}</select></label><label class="check"><input id="flip" type="checkbox" ${d.flip ? 'checked' : ''}>좌우 반전</label><label class="check"><input id="swap" type="checkbox" ${d.swapLimbs ? 'checked' : ''}>좌우 모션 매핑 교환</label><label class="check"><input id="sign" type="checkbox" ${d.motionSign === -1 ? 'checked' : ''}>팔 회전 부호 반전</label><div class="field-grid">${fields('vector', d.vector, {x:'보행 벡터 X',y:'보행 벡터 Y'}, 0.05)}</div><p class="hint">선택 파츠 ${esc(selected)} 보정 · 이동값은 기준 1254px 단위</p><div class="field-grid">${fields('correction', c, {x:'방향 이동 X',y:'방향 이동 Y',scaleX:'방향 배율 X',scaleY:'방향 배율 Y',rotation:'방향 회전 (rad)',skewX:'방향 skew X',skewY:'방향 skew Y',zOffset:'방향 순서 보정'}, 0.01)}</div><button data-action="reset-direction">선택 파츠 방향 보정 초기화</button>`);
}
function refresh(rebuildInspector = true) {
  $('project-name').textContent = `${rig.id}${dirty ? ' · 수정됨' : ''}`;
  $('selected-tag').textContent = selected;
  $('source-meta').textContent = `${viewId} · ${view().width} × ${view().height} px`;
  $('side-hint').textContent = `L/R = 캐릭터 자신의 좌우. ${viewId === 'Front' ? '정면의 왼팔은 화면 오른쪽입니다.' : '후면의 왼팔은 화면 왼쪽입니다.'} 방향키로 1px · Shift로 10px 이동.`;
  $('source-empty').hidden = !!assets.get(view().image?.id);
  $('preview-meta').textContent = `${compare ? 'SE / SW / NE / NW' : direction} · ${mode}`;
  $('parts').innerHTML = TEMPLATES[rig.rigType].map(p => `<button data-part="${p.id}" aria-pressed="${selected === p.id}"><span>${p.label}</span><small>${p.id}</small></button>`).join('');
  for (const b of root.querySelectorAll<HTMLElement>('[data-view]')) b.setAttribute('aria-pressed', String(b.dataset.view === viewId));
  for (const b of root.querySelectorAll<HTMLElement>('[data-mode]')) b.setAttribute('aria-pressed', String(b.dataset.mode === mode));
  for (const b of root.querySelectorAll<HTMLElement>('[data-tool]')) b.setAttribute('aria-pressed', String(b.dataset.tool === source.tool));
  ($('direction') as HTMLSelectElement).value = direction;
  $('compare').setAttribute('aria-pressed', String(compare));
  $('play').textContent = playing ? 'Ⅱ 일시정지' : '▶ 재생';
  const dirs: DirectionId[] = compare ? ['SE', 'SW', 'NE', 'NW'] : [direction];
  $('direction-labels').className = compare ? 'four-labels' : '';
  $('direction-labels').innerHTML = dirs.map(id => {
    const v = rig.views[rig.directions[id].view];
    const missing = !v.image || !assets.get(v.image.id);
    return `<span><b>${id}</b><small>${rig.directions[id].view}${missing ? ' · 원본 연결 필요' : ''}</small></span>`;
  }).join('');
  source.sync(view(), selected, assets.get(view().image?.id));
  renderer.sync(rig, assets, dirs, solo); renderer.render(seconds, mode);
  assets.prune(rig);
  if (rebuildInspector) inspector();
  const missing = assets.missing(rig);
  $('asset-list').innerHTML = missing.length ? missing.map(ref => `<label class="missing-file">연결 필요 · ${esc(ref.name)} <small>${ref.width}×${ref.height}</small><input type="file" data-relink="${esc(ref.id)}" accept="image/png,image/webp,image/jpeg" aria-label="${esc(ref.name)} 다시 연결"></label>`).join('') : `<span class="connected">${assets.count ? '● 모든 이미지가 연결되어 있습니다.' : '등록된 이미지가 없습니다.'}</span>`;
  $('reconnect-label').hidden = missing.length === 0;
  root.querySelectorAll<HTMLLabelElement>('label.button').forEach(label => { label.tabIndex = 0; label.setAttribute('role', 'button'); });
}
async function run(task: () => Promise<void>) {
  if (busy) return; busy = true; root.setAttribute('aria-busy', 'true'); clearError();
  try { await task(); if (!disposed) refresh(); } catch (e) { error(e); }
  finally { busy = false; root.setAttribute('aria-busy', 'false'); if (!disposed) refresh(false); }
}
async function sample() {
  const next = createDefaultRig();
  const ref = next.views.Front.image!;
  const asset = await assets.decode(DEFAULT_SHEET_URL, ref.name, ref.id);
  if (disposed) { assets.release(asset); return; }
  renderer.clear(); assets.destroy(); rig = next; assets.put(asset);
  viewId = 'Front'; direction = 'Front'; selected = 'head'; solo = null; mode = 'Rest'; seconds = 0; playing = false; dirty = false;
  source.fit(); notice('파츠 시트 기본 리그를 불러왔습니다. 후면 팔은 원본의 공용 팔을 재사용합니다.');
}
function download() {
  const invalid = root.querySelector<HTMLInputElement>('input[aria-invalid=true]');
  if (invalid) { invalid.focus(); throw new Error('잘못된 숫자 입력을 수정한 뒤 저장해 주세요. 현재 유효한 리그는 유지됩니다.'); }
  const url = URL.createObjectURL(new Blob([serializeRig(rig)], { type: 'application/json' }));
  const a = document.createElement('a'); a.href = url; a.download = `${rig.id.replace(/[^a-zA-Z0-9가-힣_-]/g, '_')}.rig.json`; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000); dirty = false; notice('리그 JSON을 저장했습니다. 원본 이미지 파일도 함께 보관하세요.');
}
function withCandidate(edit: (candidate: CharacterRigData) => void, rebuild = true) {
  const candidate = structuredClone(rig); edit(candidate);
  const result = rigSchema.safeParse(candidate);
  if (!result.success) throw new Error(`입력 오류: ${result.error.issues.map(i => i.message).slice(0, 2).join(' / ')}`);
  rig = result.data; dirty = true; clearError(); refresh(rebuild);
}
function numeric(input: HTMLInputElement) {
  if (!input.value.trim() || !Number.isFinite(input.valueAsNumber)) throw new Error('유효한 숫자를 입력해 주세요.');
  const [section, key] = input.dataset.path!.split('.'), value = input.valueAsNumber;
  withCandidate(candidate => {
    const v = candidate.views[viewId], p = v.parts.find(p => p.id === selected)!;
    if (section === 'rect' || section === 'pivot') {
      const rect = { ...p.rect }, pivot = { ...p.pivot };
      if (section === 'rect') (rect as unknown as Record<string, number>)[key] = value; else (pivot as Record<string, number>)[key] = value;
      updateGeometry(p, rect, pivot);
    } else if (section === 'ground') setGround(v, { ...v.ground, [key]: value });
    else {
      const targets: Record<string, object> = { rest: p.restTransform, socket: p.attachment.socket, part: p, view: v, motion: candidate.motion, vector: candidate.directions[direction].vector, correction: candidate.directions[direction].parts[selected] };
      (targets[section] as Record<string, number>)[key] = value;
    }
  }, false);
  input.removeAttribute('aria-invalid');
}
root.addEventListener('click', e => {
  const button = (e.target as HTMLElement).closest<HTMLButtonElement>('button'); if (!button || button.disabled || busy) return;
  clearError();
  try {
    if (button.dataset.part) { selected = button.dataset.part; refresh(); return; }
    if (button.dataset.view) { viewId = button.dataset.view as ViewId; direction = viewId; source.fit(); refresh(); return; }
    if (button.dataset.mode) { mode = button.dataset.mode as Mode; refresh(); return; }
    if (button.dataset.tool) { source.tool = button.dataset.tool; refresh(false); return; }
    switch (button.dataset.action) {
      case 'home': window.location.assign(import.meta.env.BASE_URL); return;
      case 'new': renderer.clear(); assets.destroy(); rig = createRig(); rig.id = 'untitled-rig'; viewId = 'Front'; direction = 'Front'; selected = 'head'; solo = null; seconds = 0; mode = 'Rest'; playing = false; dirty = false; notice('새 리그입니다. Front 또는 Back 이미지를 불러오세요.'); break;
      case 'sample': void run(sample); return;
      case 'save': download(); break;
      case 'compare': compare = !compare; break;
      case 'play': if (mode === 'Rest') mode = 'Walk'; playing = !playing; break;
      case 'reset': seconds = 0; mode = 'Rest'; playing = false; break;
      case 'fit': source.fit(); return;
      case 'zoom-in': source.zoomBy(1.25); return;
      case 'zoom-out': source.zoomBy(0.8); return;
      case 'reset-part': resetEditorPlacement(part(), view(), viewId); dirty = true; break;
      case 'reset-all': view().parts.forEach(p => resetEditorPlacement(p, view(), viewId)); dirty = true; break;
      case 'remove-replacement': delete part().replacement; dirty = true; break;
      case 'reset-direction': rig.directions[direction].parts[selected] = { ...identity(), zOffset: 0 }; dirty = true; break;
      case 'copy-front': {
        const from = rig.views.Front, target = rig.views.Back, sx = target.width / from.width, sy = target.height / from.height;
        target.parts = structuredClone(from.parts).map(p => { p.rect = { x:p.rect.x*sx,y:p.rect.y*sy,width:p.rect.width*sx,height:p.rect.height*sy }; p.pivot = { x:p.pivot.x*sx,y:p.pivot.y*sy }; p.restTransform.x *= sx; p.restTransform.y *= sy; p.attachment.socket.x *= sx; p.attachment.socket.y *= sy; return p; });
        target.ground = { x:from.ground.x*sx,y:from.ground.y*sy }; target.displayScale = from.displayScale; target.referenceSize = from.referenceSize*sy;
        dirty = true; notice('Front 설정을 비례 복사했습니다. Back의 좌우와 부착점을 확인하세요.'); break;
      }
    }
    refresh();
  } catch (e) { error(e); }
}, { signal: controller.signal });
root.addEventListener('keydown', e => {
  const target = e.target as HTMLElement;
  if (target.matches('label.button') && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); target.querySelector<HTMLInputElement>('input[type=file]')?.click(); }
}, { signal: controller.signal });
root.addEventListener('input', e => {
  const input = e.target as HTMLInputElement;
  try {
    if (input.dataset.path) numeric(input);
    if (input.id === 'phase') { playing = false; seconds = Number(input.value) * rig.motion.duration; renderer.render(seconds, mode); $('play').textContent = '▶ 재생'; $('phase-output').textContent = Number(input.value).toFixed(3); }
  } catch (e) { input.setAttribute('aria-invalid', 'true'); error(e); }
}, { signal: controller.signal });
async function relink(file: File, ref: ImageRef) {
  const asset = await assets.file(file, ref.id);
  if (disposed) { assets.release(asset); return; }
  if (asset.ref.width !== ref.width || asset.ref.height !== ref.height) { assets.release(asset); throw new Error(`${ref.name}: ${ref.width}×${ref.height}px 이미지가 필요합니다. 다른 크기라면 원본 이미지 불러오기를 사용하세요.`); }
  asset.ref = ref; renderer.clear(); assets.put(asset);
}
root.addEventListener('change', e => {
  const input = e.target as HTMLInputElement;
  if (input.type === 'file') {
    const files = [...(input.files ?? [])], targetView = viewId, targetPart = selected, relinkId = input.dataset.relink; input.value = '';
    if (!files.length) return;
    void run(async () => {
      if (input.id === 'load-json') {
        const next = parseRig(await files[0].text()); if (disposed) return;
        renderer.clear(); assets.destroy(); rig = next; viewId = 'Front'; direction = 'Front'; selected = 'head'; solo = null; seconds = 0; mode = 'Rest'; playing = false; dirty = false;
        notice('리그 설정을 복원했습니다. 아래 이미지 연결에서 누락 파일을 선택하세요.');
      } else if (input.id === 'reconnect') {
        const missing = assets.missing(rig); let connected = 0;
        for (const ref of missing) { const file = files.find(f => f.name === ref.name); if (file) { await relink(file, ref); connected++; } }
        notice(`${connected}개 이미지를 연결했습니다. 이름이 다른 파일은 개별 연결을 사용하세요.`);
      } else if (relinkId) { const ref = assets.missing(rig).find(r => r.id === relinkId); if (ref) await relink(files[0], ref); notice('이미지를 다시 연결했습니다.'); }
      else {
        const asset: Asset = await assets.file(files[0]); if (disposed) { assets.release(asset); return; }
        renderer.clear(); assets.put(asset);
        if (input.id === 'load-image') {
          const previous = rig.views[targetView];
          if (previous.width === asset.ref.width && previous.height === asset.ref.height) previous.image = asset.ref;
          else rig.views[targetView] = makeView(targetView, asset.ref);
          source.fit(); notice(`${targetView} 이미지를 불러왔습니다. 크기가 달라지면 해당 뷰의 영역을 초기화합니다.${files[0].type === 'image/jpeg' ? ' JPG 배경은 자동 제거되지 않습니다.' : ''}`);
        } else { rig.views[targetView].parts.find(p => p.id === targetPart)!.replacement = asset.ref; notice(`${targetPart} 교체 이미지를 적용했습니다.`); }
        dirty = true;
      }
    });
    return;
  }
  try {
    switch (input.id) {
      case 'parent-part': withCandidate(candidate => { const v = candidate.views[viewId]; setParent(v, v.parts.find(p=>p.id===selected)!, input.value === 'body' ? 'body' : null); }); return;
      case 'direction': direction = input.value as DirectionId; break;
      case 'speed': speed = Number(input.value); break;
      case 'checker': $('preview').classList.toggle('checker', input.checked); break;
      case 'visible': part().visible = input.checked; dirty = true; break;
      case 'solo': solo = input.checked ? selected : null; break;
      case 'direction-view': rig.directions[direction].view = input.value as ViewId; dirty = true; break;
      case 'flip': rig.directions[direction].flip = input.checked; dirty = true; break;
      case 'swap': rig.directions[direction].swapLimbs = input.checked; dirty = true; break;
      case 'sign': rig.directions[direction].motionSign = input.checked ? -1 : 1; dirty = true; break;
      default: return;
    }
    refresh();
  } catch (e) { error(e); }
}, { signal: controller.signal });
function destroy() { if (disposed) return; disposed = true; controller.abort(); source.destroy(); renderer.destroy(); assets.destroy(); }
window.addEventListener('pagehide', e => { if (!e.persisted) destroy(); }, { signal: controller.signal });
window.addEventListener('beforeunload', e => { if (dirty) e.preventDefault(); }, { signal: controller.signal });
// Diagnostics expose snapshots, never mutable editor internals; available only in development.
if (import.meta.env.DEV) Object.assign(window, { rigDiagnostics: () => ({ ...renderer.diagnostics(), rig: structuredClone(rig), seconds, mode, playing, missing: assets.missing(rig).length }) });
if (import.meta.hot) import.meta.hot.dispose(destroy);
try { await renderer.init(); if (!disposed) await run(sample); } catch (e) { error(e); notice('그래픽 초기화에 실패했습니다. WebGL을 지원하는 브라우저에서 다시 열어 주세요.'); }
