/* Floating poster viewer: Poster buttons with a data-preview image open in a modal instead of downloading the PDF. */
(() => {
  const links = document.querySelectorAll('a.poster-link[data-preview]');
  if (!links.length || typeof HTMLDialogElement !== 'function') return;

  const dialog = document.createElement('dialog');
  dialog.className = 'poster-viewer';
  dialog.innerHTML = `
    <div class="poster-bar">
      <h3 id="poster-title"></h3>
      <span class="poster-hint">Click to zoom</span>
      <a class="button" id="poster-pdf" target="_blank" rel="noopener noreferrer">PDF ↗</a>
      <button type="button" class="button" id="poster-close" aria-label="Close poster">Close ✕</button>
    </div>
    <div class="poster-stage" id="poster-stage"><img id="poster-img" alt=""></div>`;
  dialog.setAttribute('aria-labelledby', 'poster-title');
  document.body.appendChild(dialog);

  const title = dialog.querySelector('#poster-title');
  const pdf = dialog.querySelector('#poster-pdf');
  const stage = dialog.querySelector('#poster-stage');
  const img = dialog.querySelector('#poster-img');

  const close = () => dialog.close();
  dialog.querySelector('#poster-close').addEventListener('click', close);
  // a click on the dimmed backdrop closes the viewer
  dialog.addEventListener('click', (e) => { if (e.target === dialog) close(); });
  dialog.addEventListener('close', () => { document.body.style.overflow = ''; });

  // click toggles between fit-to-window and full size, keeping the clicked spot in view
  img.addEventListener('click', (e) => {
    const r = img.getBoundingClientRect();
    const fx = (e.clientX - r.left) / r.width, fy = (e.clientY - r.top) / r.height;
    stage.classList.toggle('zoomed');
    if (stage.classList.contains('zoomed')) {
      stage.scrollLeft = fx * img.scrollWidth - stage.clientWidth / 2;
      stage.scrollTop = fy * img.scrollHeight - stage.clientHeight / 2;
    }
  });

  links.forEach((link) => link.addEventListener('click', (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey) return; // let modified clicks open the PDF
    e.preventDefault();
    title.textContent = link.dataset.title || 'Poster';
    pdf.href = link.href;
    stage.classList.remove('zoomed');
    img.src = link.dataset.preview;
    img.alt = `Poster: ${link.dataset.title || ''}`;
    document.body.style.overflow = 'hidden';
    dialog.showModal();
    stage.scrollTo(0, 0);
  }));
})();
