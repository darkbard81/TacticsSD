import './style.css';
import { TOOLS } from '../tools/registry';

const root = document.querySelector<HTMLDivElement>('#app')!;
root.innerHTML = `
  <header class="main-header">
    <a class="brand" href="${import.meta.env.BASE_URL}" aria-label="TacticsSD 메인">
      <span class="brand-mark" aria-hidden="true">◈</span>
      <span><strong>TacticsSD</strong><small>CREATION WORKSPACE</small></span>
    </a>
    <span class="header-label">제작 도구</span>
  </header>
  <main class="tool-home">
    <div class="home-intro">
      <span class="eyebrow">TACTICSSD / TOOLS</span>
      <h1>작업에 필요한 도구를 선택하세요<span>.</span></h1>
      <p>각 도구의 전용 작업 공간에서 에셋을 만들고 다듬으세요.</p>
    </div>
    <section class="tool-grid" aria-label="도구 목록">
      ${TOOLS.map(tool => `
        <article class="tool-card" aria-labelledby="title-${tool.id}">
          <div class="tool-symbol" aria-hidden="true">◈</div>
          <span class="eyebrow">${tool.subtitle}</span>
          <h2 id="title-${tool.id}">${tool.title}</h2>
          <p>${tool.description}</p>
          <ul>${tool.features.map(feature => `<li>${feature}</li>`).join('')}</ul>
          <button type="button" data-tool="${tool.id}">${tool.title} 열기 <span aria-hidden="true">↗</span></button>
        </article>
      `).join('')}
    </section>
  </main>
  <footer class="main-footer">TacticsSD · 제작 도구 모음</footer>
`;
root.addEventListener('click', event => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button[data-tool]');
  const tool = TOOLS.find(tool => tool.id === button?.dataset.tool);
  if (tool) window.location.assign(`${import.meta.env.BASE_URL}${tool.path}`);
});
