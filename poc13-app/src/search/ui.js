import { buildMagnetFromInfohash } from '@/config/app-config';
import { copyText } from '@/utils/clipboard';
import { clearSearch, subscribeSearch, updateQuery } from './state';

function openUrlInNewTab(url) {
  if (!url) return false;
  const win = window.open('', '_blank', 'noopener');
  if (win) {
    win.location.href = url;
    return true;
  }
  return false;
}

function renderResult(item) {
  const infohash = item.infohash || '';
  const magnet = buildMagnetFromInfohash(infohash);
  const canCopy = Boolean(magnet || infohash || item.downloadUrl);
  const downloadAttr = item.downloadUrl ? `data-download="${encodeURIComponent(item.downloadUrl)}"` : '';
  return `
    <li class="search-result" data-id="${item.id}">
      <div>
        <strong>${item.title}</strong>
        <span>${item.author}</span>
        ${item.id ? `<span class="book-id">ID: ${item.id}</span>` : ''}
      </div>
      <div class="search-result__actions">
        <button data-action="get-book" data-infohash="${infohash}" ${downloadAttr} ${canCopy ? '' : 'disabled'}>Get Book</button>
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

  const onSubmit = (event) => {
    event.preventDefault();
    updateQuery(inputEl.value);
  };

  panelEl.addEventListener('submit', onSubmit);

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      inputEl.value = '';
      clearSearch();
    });
  }

  const onResultClick = async (event) => {
    const btn = event.target.closest('button[data-action="get-book"]');
    if (!btn) return;
    const infohash = btn.dataset.infohash;
    const downloadAttr = btn.dataset.download ? decodeURIComponent(btn.dataset.download) : '';
    const magnet = buildMagnetFromInfohash(infohash || '');
    const payload = magnet || infohash;
    if (downloadAttr) {
      if (!openUrlInNewTab(downloadAttr)) {
        window.alert(`Pop-up blocked. Open this link manually:\n${downloadAttr}`);
      }
      return;
    }
    if (!payload) {
      window.alert('This entry is missing sharing metadata.');
      return;
    }
    const label = magnet ? 'Magnet link' : 'Infohash';
    try {
      await copyText(payload);
      window.alert(`${label} copied to clipboard.`);
    } catch (_) {
      window.alert(`Unable to copy ${label.toLowerCase()}.`);
    }
  };
  resultsEl.addEventListener('click', onResultClick);

  return () => {
    unsubscribeSearch();
    panelEl.removeEventListener('submit', onSubmit);
    resultsEl.removeEventListener('click', onResultClick);
  };
}
