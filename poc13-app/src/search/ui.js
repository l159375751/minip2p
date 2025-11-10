import { buildMagnetFromInfohash } from '@/config/app-config';
import { clearSearch, subscribeSearch, updateQuery } from './state';

function renderResult(item) {
  const infohash = item.infohash || '';
  const magnet = infohash ? buildMagnetFromInfohash(infohash) : '';
  return `
    <li class="search-result" data-id="${item.id}">
      <div>
        <strong>${item.title}</strong>
        <span>${item.author}</span>
      </div>
      <div class="search-result__actions">
        <button data-action="copy-magnet" data-infohash="${infohash}" ${magnet ? '' : 'disabled'}>Copy Link</button>
      </div>
    </li>
  `;
}

export function mountSearchPanel(panelEl, resultsEl, inputEl, clearBtn) {
  if (!panelEl || !resultsEl || !inputEl) return () => {};

  const unsubscribeSearch = subscribeSearch((snapshot) => {
    resultsEl.innerHTML = snapshot.results.length
      ? `<ul class="search-results">${snapshot.results.map(renderResult).join('')}</ul>`
      : '<p class="search-empty">No matches yet. Try title, author, or infohash.</p>';
  });

  const onInput = (event) => updateQuery(event.target.value);
  const onSubmit = (event) => {
    event.preventDefault();
    updateQuery(inputEl.value);
  };

  inputEl.addEventListener('input', onInput);
  panelEl.addEventListener('submit', onSubmit);

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      inputEl.value = '';
      clearSearch();
    });
  }

  const onResultClick = (event) => {
    const btn = event.target.closest('button[data-action="copy-magnet"]');
    if (!btn) return;
    const infohash = btn.dataset.infohash;
    if (!infohash) return;
    const magnet = buildMagnetFromInfohash(infohash);
    navigator.clipboard?.writeText(magnet);
  };
  resultsEl.addEventListener('click', onResultClick);

  return () => {
    unsubscribeSearch();
    inputEl.removeEventListener('input', onInput);
    panelEl.removeEventListener('submit', onSubmit);
    resultsEl.removeEventListener('click', onResultClick);
  };
}
