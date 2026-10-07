import type { Renderer } from './render';
/** Opt-in PNG export controls; no gameplay driver, recording, or visual assertions. */
export function installCapture(renderer: Renderer, setTop: (top: boolean) => void) {
  if (!new URLSearchParams(location.search).has('capture')) return;
  const panel = document.createElement('aside'); panel.className = 'manual-capture'; panel.setAttribute('aria-label', '검토용 PNG 캡처');
  panel.innerHTML = '<button data-capture="classes-front">8클래스 정면 PNG</button><button data-capture="classes-back">8클래스 후면 PNG</button><button data-capture="battle-iso">등각 PNG</button><button data-capture="battle-top">Top PNG</button><button data-capture="terrain-detail">지형 상세 PNG</button><button data-capture="water-detail">물 측면 PNG</button><output aria-live="polite"></output>';
  document.body.append(panel);
  panel.addEventListener('click', async event => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button[data-capture]'); if (!button) return;
    const kind = button.dataset.capture!, output = panel.querySelector('output')!;
    const buttons = panel.querySelectorAll('button'); buttons.forEach(b => b.disabled = true); output.textContent = '고해상도 PNG 저장 중…';
    try {
      renderer.setCaptureView(null);
      await renderer.setGallery(kind === 'classes-front' ? 'Front' : kind === 'classes-back' ? 'Back' : null);
      if (kind === 'terrain-detail' || kind === 'water-detail') setTop(false);
      if (kind.startsWith('battle-')) setTop(kind === 'battle-top');
      await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      const { blob, metadata } = await renderer.capture(kind === 'terrain-detail', kind === 'water-detail');
      const prefix = new URLSearchParams(location.search).has('terrainStage') ? 'terrain-' + new URLSearchParams(location.search).get('terrainStage') + '-' : '';
      const filename = prefix + kind;
      const files = [{ name: `${filename}.png`, blob }, { name: `${filename}.json`, blob: new Blob([JSON.stringify(metadata, null, 2) + '\n'], { type: 'application/json' }) }];
      for (const file of files) {
        if (import.meta.env.DEV) {
          const response = await fetch(`/__tactics_capture/${file.name}`, { method: 'POST', body: file.blob });
          if (!response.ok) throw Error(`${file.name} 저장 실패`);
        } else {
          const url = URL.createObjectURL(file.blob), a = document.createElement('a'); a.href = url; a.download = file.name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
        }
      }
      output.textContent = `${kind}.png · ${metadata.backing.width}×${metadata.backing.height} 저장 완료`;
    } catch (error) { output.textContent = String(error); }
    finally { buttons.forEach(b => b.disabled = false); }
  });
}
