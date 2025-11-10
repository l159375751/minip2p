import { buildMagnetFromInfohash } from '@/config/app-config';
import { getState, removeFromLibrary, subscribe } from '@/state/store';

function createRow(item, inLibrary) {
  const infohash = item.infohash || '';
  const magnet = infohash ? buildMagnetFromInfohash(infohash) : '';
  const magnetPreview = magnet ? `${magnet.slice(0, 42)}...` : 'n/a';

  return `
    <li class="library-row" data-id="${item.id}">
      <div class="library-row__meta">
        <div>
          <strong>${item.title}</strong>
          <span>${item.author}</span>
        </div>
        <p>${item.summary}</p>
      </div>
      <div class="library-row__info monospace">
        <span title="${infohash || 'n/a'}">${infohash || 'n/a'}</span>
        <span title="${magnetPreview}">${magnetPreview}</span>
      </div>
      <div class="library-row__actions">
        <button data-action="open" data-id="${item.id}" class="ghost">Open</button>
        <button data-action="copy-magnet" data-id="${item.id}" class="ghost" ${magnet ? '' : 'disabled'}>Copy</button>
        <button data-action="remove" data-id="${item.id}" class="icon danger" ${inLibrary ? '' : 'disabled'}>&times;</button>
      </div>
    </li>
  `;
}

function renderShelf(container, state) {
  const fragment = [];
  const shelves = state.library.length ? state.library : state.manifest.slice(0, 5);
  fragment.push('<section>');
  fragment.push('<header><h2>Featured Shelves</h2><p>These are our own shared collections—trim them locally or open titles directly.</p></header>');
  fragment.push('<ul class="library-list">');
  fragment.push(
    shelves
      .map((item) => {
        const inLibrary = state.library.some((entry) => entry.id === item.id);
        return createRow(item, inLibrary);
      })
      .join(''),
  );
  fragment.push('</ul></section>');
  container.innerHTML = fragment.join('');
}

function handleShelfClick(event, state) {
  const action = event.target.dataset.action;
  if (!action) return;
  const { id } = event.target.dataset;
  const item = state.library.find((entry) => entry.id === id);
  const fallback = state.manifest.find((entry) => entry.id === id);
  const target = item || fallback;
  if (!target) return;

  if (action === 'open') {
    const preview = window.open('', '_blank', 'noopener');
    if (preview) {
      preview.document.write(`
        <main style="font-family: system-ui; padding: 2rem; max-width: 720px; margin: auto;">
          <h1>${target.title}</h1>
          <p><strong>Author:</strong> ${target.author}</p>
          <p>This is a lightweight preview placeholder. Download via your preferred client using the infohash below:</p>
          <pre style="background:#f3f4f6; padding:1rem; border-radius:0.5rem; overflow:auto;">${target.infohash || 'n/a'}</pre>
        </main>
      `);
      preview.document.close();
    } else {
      window.alert('Unable to open preview window (pop-up blocked).');
    }
    return;
  }

  if (action === 'copy-magnet') {
    const magnet = buildMagnetFromInfohash(target.infohash);
    if (!magnet) {
      window.alert('Missing infohash for this entry.');
      return;
    }
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(magnet);
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = magnet;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    window.alert('Magnet copied to clipboard.');
    return;
  }

  if (action === 'save') {
  } else if (action === 'remove') {
    removeFromLibrary(id);
  }
}

export function mountLibraryShelf(container) {
  if (!container) {
    throw new Error('mountLibraryShelf requires a container element');
  }
  let currentState = getState();
  const clickHandler = (event) => handleShelfClick(event, currentState);
  container.addEventListener('click', clickHandler);
  const unsubscribe = subscribe((state) => {
    currentState = state;
    renderShelf(container, state);
  });

  return () => {
    container.removeEventListener('click', clickHandler);
    unsubscribe();
  };
}
