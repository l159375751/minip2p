import { getSampleItems, removeFromLibrary, saveToLibrary, subscribe } from '@/state/store';

function createCard(item, inLibrary) {
  const buttonLabel = inLibrary ? 'Remove from Library' : 'Save to Library';
  const buttonAction = inLibrary ? 'remove' : 'save';

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
          <dt>Magnet</dt>
          <dd title="${item.magnet}">${item.magnet.slice(0, 26)}...</dd>
        </div>
      </dl>
      <div class="library-card__actions">
        <button data-action="open" data-id="${item.id}" class="ghost">Open Preview</button>
        <button data-action="${buttonAction}" data-id="${item.id}">${buttonLabel}</button>
      </div>
    </article>
  `;
}

function renderShelf(container, state) {
  const fragment = [];
  const samples = getSampleItems(5);
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

  if (action === 'open') {
    window.alert(`Preview for ${id} coming soon. Rendering sample manifest only right now.`);
    return;
  }

  const sample = getSampleItems(5).find((item) => item.id === id);
  if (!sample) return;

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
