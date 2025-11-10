import { buildMagnetFromInfohash } from '@/config/app-config';
import { getSampleItems, removeFromLibrary, saveToLibrary, subscribe } from '@/state/store';

const featuredItems = () => getSampleItems(5);

function createCard(item, inLibrary) {
  const buttonLabel = inLibrary ? 'Remove from Library' : 'Save to Library';
  const buttonAction = inLibrary ? 'remove' : 'save';
  const infohash = item.infohash || '';
  const magnet = infohash ? buildMagnetFromInfohash(infohash) : '';
  const magnetPreview = magnet ? `${magnet.slice(0, 42)}...` : 'n/a';

  return `
    <article class="library-card" data-id="${item.id}">
      <div class="library-card__meta">
        <h3>${item.title}</h3>
        <p>${item.author}</p>
      </div>
      <p class="library-card__summary">${item.summary}</p>
      <dl class="library-card__details">
        <div>
          <dt>Size</dt>
          <dd>${item.size_kb} KB</dd>
        </div>
        <div>
          <dt>Infohash</dt>
          <dd class="monospace" title="${infohash || 'n/a'}">${infohash || 'n/a'}</dd>
        </div>
        <div>
          <dt>Magnet Preview</dt>
          <dd class="monospace" title="${magnetPreview}">${magnetPreview}</dd>
        </div>
      </dl>
      <div class="library-card__actions">
        <button data-action="open" data-id="${item.id}" class="ghost">Open Preview</button>
        <button data-action="copy-magnet" data-id="${item.id}" class="ghost" ${magnet ? '' : 'disabled'}>Copy Magnet</button>
        <button data-action="${buttonAction}" data-id="${item.id}">${buttonLabel}</button>
      </div>
    </article>
  `;
}

function renderShelf(container, state) {
  const fragment = [];
  const samples = featuredItems();
  fragment.push('<section>');
  fragment.push('<header><h2>Featured Shelf</h2><p>Boots offline using bundled manifest.</p></header>');
  fragment.push('<div class="library-grid">');
  fragment.push(
    samples
      .map((item) => {
        const inLibrary = state.library.some((entry) => entry.id === item.id);
        return createCard(item, inLibrary);
      })
      .join(''),
  );
  fragment.push('</div></section>');
  container.innerHTML = fragment.join('');
}

function handleShelfClick(event) {
  const action = event.target.dataset.action;
  if (!action) return;
  const { id } = event.target.dataset;
  const sample = featuredItems().find((item) => item.id === id);
  if (!sample) return;

  if (action === 'open') {
    window.alert(`Preview for ${id} coming soon. Rendering sample manifest only right now.`);
    return;
  }

  if (action === 'copy-magnet') {
    const magnet = buildMagnetFromInfohash(sample.infohash);
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
    saveToLibrary(sample);
  } else if (action === 'remove') {
    removeFromLibrary(id);
  }
}

export function mountLibraryShelf(container) {
  if (!container) {
    throw new Error('mountLibraryShelf requires a container element');
  }
  container.addEventListener('click', handleShelfClick);
  const unsubscribe = subscribe((state) => renderShelf(container, state));

  return () => {
    container.removeEventListener('click', handleShelfClick);
    unsubscribe();
  };
}
