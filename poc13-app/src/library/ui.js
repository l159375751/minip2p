import { buildMagnetFromInfohash } from '@/config/app-config';
import { getState, removeFromLibrary, subscribe } from '@/state/store';

const featuredItems = (state) => state.manifest.slice(0, 5);
const libraryItems = (state) => (state.library.length ? state.library : featuredItems(state));

function createFeaturedCard(item) {
  const infohash = item.infohash || '';
  const magnet = infohash ? buildMagnetFromInfohash(infohash) : '';

  return `
    <article class="featured-card" data-id="${item.id}">
      <div>
        <strong>${item.title}</strong>
        <p>${item.author}</p>
      </div>
      <p>${item.summary}</p>
      <span class="monospace" title="${infohash || 'n/a'}">${infohash || 'n/a'}</span>
      <div class="featured-card__actions">
        <button data-action="open" data-id="${item.id}">Open</button>
        <button data-action="copy-magnet" data-id="${item.id}" ${magnet ? '' : 'disabled'}>Get Book</button>
      </div>
    </article>
  `;
}

function createRow(item, inLibrary) {
  const infohash = item.infohash || '';
  const magnet = infohash ? buildMagnetFromInfohash(infohash) : '';

  return `
    <li class="library-row" data-id="${item.id}">
      <div class="library-row__meta">
        <div>
          <strong>${item.title}</strong>
          <span>${item.author}</span>
        </div>
        <p>${item.summary}</p>
      </div>
      <div class="library-row__info monospace" title="${infohash || 'n/a'}">${infohash || 'n/a'}</div>
      <div class="library-row__actions">
        <button data-action="open" data-id="${item.id}" class="ghost">Open</button>
        <button data-action="copy-magnet" data-id="${item.id}" class="ghost" ${magnet ? '' : 'disabled'}>Get Book</button>
        <button
          data-action="remove"
          data-id="${item.id}"
          class="icon danger"
          title="Remove from library"
          ${inLibrary ? '' : 'disabled'}
          aria-label="Remove ${item.title}"
        >
          ✕
        </button>
      </div>
    </li>
  `;
}

function renderShelf(container, state) {
  const fragment = [];
  const shelves = libraryItems(state);
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

function bindActions(container, getCurrentState) {
  const handler = (event) => handleShelfClick(event, getCurrentState());
  container.addEventListener('click', handler);
  return () => container.removeEventListener('click', handler);
}

export function mountFeaturedShelf(container) {
  if (!container) return () => {};
  let latestState = getState();
  const unsubscribeStore = subscribe((state) => {
    latestState = state;
    const cards = featuredItems(state).map(createFeaturedCard).join('');
    container.innerHTML = `<div class="featured-grid">${cards}</div>`;
  });
  const unsubscribeActions = bindActions(container, () => latestState);
  return () => {
    unsubscribeStore();
    unsubscribeActions();
  };
}

export function mountLibraryList(container) {
  if (!container) return () => {};
  let latestState = getState();
  const unsubscribeStore = subscribe((state) => {
    latestState = state;
    renderShelf(container, state);
  });
  const unsubscribeActions = bindActions(container, () => latestState);
  return () => {
    unsubscribeStore();
    unsubscribeActions();
  };
}
