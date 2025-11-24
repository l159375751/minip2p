import { buildMagnetFromInfohash } from '@/config/app-config';
import { copyText } from '@/utils/clipboard';
import { clearSearch, subscribeSearch, updateQuery } from './state';
import { requestBookTransport, subscribeToTransports, getAvailablePeers } from '@/transport/state';
import { requestBookFromPeer } from '@/transport/peerjs-client';

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
  const peers = getAvailablePeers(item.id);

  let actionsHtml = '';

  if (peers.length > 0) {
    // Show transport options from peers
    actionsHtml = peers.map(peer => {
      const transportLabel = peer.transports.length > 0 ? peer.transports.join(', ') : 'no transport';
      const peerLabel = peer.peerPubkey.slice(0, 8) + '...';
      return `<button data-action="download-from-peer" data-book-id="${item.id}" data-peer-pubkey="${peer.peerPubkey}" data-peer-id="${peer.peerId}" data-transports='${JSON.stringify(peer.transports)}'>${peerLabel} via ${transportLabel}</button>`;
    }).join('');
  } else {
    // Show default "Get Book" button
    actionsHtml = `<button data-action="get-book" data-book-id="${item.id}" data-infohash="${infohash}" ${downloadAttr} ${canCopy ? '' : 'disabled'}>Get Book</button>`;
  }

  return `
    <li class="search-result" data-id="${item.id}">
      <div>
        <strong>${item.title}</strong>
        <span>${item.author}</span>
        ${item.id ? `<span class="book-id">ID: ${item.id}</span>` : ''}
      </div>
      <div class="search-result__actions">
        ${actionsHtml}
      </div>
    </li>
  `;
}

export function mountSearchPanel(panelEl, resultsEl, inputEl, clearBtn) {
  if (!panelEl || !resultsEl || !inputEl) return () => {};

  let currentResults = [];

  const renderResults = () => {
    resultsEl.innerHTML = currentResults.length
      ? `<ul class="search-results">${currentResults.map(renderResult).join('')}</ul>`
      : '<p class="search-empty">No matches yet. Try title, author, or infohash.</p>';
  };

  const unsubscribeSearch = subscribeSearch((snapshot) => {
    currentResults = snapshot.results;
    renderResults();
  });

  const unsubscribeTransports = subscribeToTransports((transportSnapshot) => {
    // Re-render results when transport options change
    renderResults();
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
    const getBookBtn = event.target.closest('button[data-action="get-book"]');
    const downloadBtn = event.target.closest('button[data-action="download-from-peer"]');

    if (getBookBtn) {
      const bookId = getBookBtn.dataset.bookId;
      const infohash = getBookBtn.dataset.infohash;
      const downloadAttr = getBookBtn.dataset.download ? decodeURIComponent(getBookBtn.dataset.download) : '';

      // Request transports from network FIRST
      if (bookId) {
        requestBookTransport(bookId);
      }

      // Also provide fallback options
      if (downloadAttr) {
        if (!openUrlInNewTab(downloadAttr)) {
          window.alert(`Pop-up blocked. Open this link manually:\n${downloadAttr}`);
        }
        return;
      }

      const magnet = buildMagnetFromInfohash(infohash || '');
      const payload = magnet || infohash;

      if (payload) {
        // Copy to clipboard as fallback
        const label = magnet ? 'Magnet link' : 'Infohash';
        try {
          await copyText(payload);
          window.alert(`${label} copied to clipboard.`);
        } catch (_) {
          window.alert(`Unable to copy ${label.toLowerCase()}.`);
        }
      }

      return;
    }

    if (downloadBtn) {
      const bookId = downloadBtn.dataset.bookId;
      const peerPubkey = downloadBtn.dataset.peerPubkey;
      const peerId = downloadBtn.dataset.peerId;
      const transports = JSON.parse(downloadBtn.dataset.transports || '[]');

      if (transports.includes('peerjs') && peerId) {
        requestBookFromPeer(peerId, bookId);
      } else {
        window.alert(`Peer ${peerPubkey.slice(0, 8)}... doesn't support any compatible transports.\n\nAvailable: ${transports.join(', ') || 'none'}`);
      }
      return;
    }
  };
  resultsEl.addEventListener('click', onResultClick);

  return () => {
    unsubscribeSearch();
    unsubscribeTransports();
    panelEl.removeEventListener('submit', onSubmit);
    resultsEl.removeEventListener('click', onResultClick);
  };
}
