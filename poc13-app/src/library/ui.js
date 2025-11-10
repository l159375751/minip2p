import { buildMagnetFromInfohash } from '@/config/app-config';
import { getState, removeFromLibrary, subscribe } from '@/state/store';
import { copyText } from '@/utils/clipboard';

const featuredItems = (state) => state.manifest.slice(0, 5);
const libraryItems = (state) => (state.library.length ? state.library : featuredItems(state));

function createFeaturedCard(item) {
  const infohash = item.infohash || '';
  const magnet = buildMagnetFromInfohash(infohash);
  const canCopy = Boolean(magnet || infohash || item.downloadUrl);

  return `
    <article class="featured-card" data-id="${item.id}">
      <div class="featured-card__meta">
        <strong>${item.title}</strong>
        <p>${item.author}</p>
      </div>
      <p>${item.summary}</p>
      <span class="monospace" title="${infohash || 'n/a'}">${infohash || 'n/a'}</span>
      <div class="featured-card__actions">
        <button data-action="open" data-id="${item.id}">Open</button>
        <button data-action="get-book" data-id="${item.id}" ${canCopy ? '' : 'disabled'}>Get Book</button>
      </div>
    </article>
  `;
}

function createRow(item, inLibrary) {
  const infohash = item.infohash || '';
  const magnet = buildMagnetFromInfohash(infohash);
  const canCopy = Boolean(magnet || infohash || item.downloadUrl);

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
        <button data-action="get-book" data-id="${item.id}" class="ghost" ${canCopy ? '' : 'disabled'}>Get Book</button>
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
  fragment.push('<header><h2>My Books</h2><p>Your saved catalog in list form—open, copy, or prune entries without leaving the page.</p></header>');

  fragment.push('<ul class="library-list">');
  fragment.push(
    shelves
      .map((item) => {
        const inLibrary = state.library.some((entry) => entry.id === item.id);
        return createRow(item, inLibrary);
      })
      .join(''),
  );
  fragment.push('</ul>');
  fragment.push('</section>');
  container.innerHTML = fragment.join('');
}

function openBook(target) {
  if (target.downloadUrl) {
    const win = window.open(target.downloadUrl, '_blank', 'noopener');
    if (!win) {
      window.location.href = target.downloadUrl;
    }
    return;
  }

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
}

async function getBook(target) {
  if (target.downloadUrl) {
    const win = window.open(target.downloadUrl, '_blank', 'noopener');
    if (!win) {
      window.location.href = target.downloadUrl;
    }
    return;
  }
  const infohash = target.infohash || '';
  const magnet = buildMagnetFromInfohash(infohash);
  const payload = magnet || infohash;
  if (!payload) {
    window.alert('No download metadata for this entry yet.');
    return;
  }
  const label = magnet ? 'Magnet link' : 'Infohash';
  try {
    await copyText(payload);
    window.alert(`${label} copied to clipboard.`);
  } catch (_) {
    window.alert(`Unable to copy ${label.toLowerCase()}.`);
  }
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
    openBook(target);
    return;
  }

  if (action === 'get-book') {
    getBook(target);
    return;
  }

  if (action === 'remove') {
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
