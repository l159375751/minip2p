import './styles/base.css';
import './styles/layout.css';
import { initStore } from '@/state/store';
import { mountLibraryList } from '@/library/ui';
import { mountSearchPanel } from '@/search/ui';
import { mountDiagnosticsPanel } from '@/diagnostics/ui';
import { subscribeSharing, toggleSharing } from '@/state/sharing.js';
import { subscribeDiagnostics } from '@/state/diagnostics';
import { toggleSearchResponder } from '@/nostr/client';

const appRoot = document.querySelector('#app');

if (!appRoot) {
  throw new Error('Root element #app was not found. Ensure index.html contains <div id="app"></div>.');
}

appRoot.innerHTML = `
  <main class="app-shell">
    <header class="app-header">
      <span class="badge">browser based p2p</span>
      <h1>browser based p2p libraries & collections</h1>
      <p>
        Sleek, no-backend HTML/JS experience for sharing books, media, and manifests over
        Nostr + WebRTC/WebTorrent.
      </p>
      <div class="share-cta">
        <button id="share-toggle" class="share-button">Start Sharing</button>
        <span id="share-note" class="share-note">Sharing paused</span>
      </div>
      <div class="share-cta">
        <button id="daemon-toggle" class="share-button secondary">Pause Search Daemon</button>
        <span id="daemon-note" class="share-note">Responder live</span>
      </div>
    </header>
    <section id="library-list"></section>
    <section id="search-panel" class="search-panel">
      <header>
        <h2>Search Collections</h2>
        <p>Relay-backed discovery to mirror the classic POC10 nostr search flow.</p>
      </header>
      <form id="search-form">
        <input id="search-input" type="text" placeholder="Search by title, author, or infohash" />
        <div class="search-actions">
          <button type="submit">Search</button>
          <button type="button" id="search-clear">Clear</button>
        </div>
      </form>
      <div id="search-results" class="search-results-wrapper"></div>
    </section>
    <section id="diagnostics-panel" class="diagnostics-panel"></section>
  </main>
`;

const listMount = document.querySelector('#library-list');
const searchPanel = document.querySelector('#search-form');
const searchInput = document.querySelector('#search-input');
const searchClear = document.querySelector('#search-clear');
const searchResults = document.querySelector('#search-results');
const shareToggle = document.querySelector('#share-toggle');
const shareNote = document.querySelector('#share-note');
const daemonToggle = document.querySelector('#daemon-toggle');
const daemonNote = document.querySelector('#daemon-note');
const diagnosticsMount = document.querySelector('#diagnostics-panel');

(async () => {
  await initStore();
  mountLibraryList(listMount);
  mountSearchPanel(searchPanel, searchResults, searchInput, searchClear);
  mountDiagnosticsPanel(diagnosticsMount);

  subscribeSharing(({ enabled }) => {
    if (shareToggle) {
      shareToggle.textContent = enabled ? 'Stop Sharing' : 'Start Sharing';
      shareToggle.classList.toggle('active', enabled);
    }
    if (shareNote) {
      shareNote.textContent = enabled ? 'Sharing with relays' : 'Sharing paused';
    }
  });

  subscribeDiagnostics(({ responder }) => {
    if (daemonToggle) {
      daemonToggle.textContent = responder.enabled ? 'Pause Search Daemon' : 'Resume Search Daemon';
      daemonToggle.classList.toggle('active', responder.enabled);
    }
    if (daemonNote) {
      daemonNote.textContent = responder.enabled
        ? `Responder active · ${responder.served} sent`
        : 'Responder paused';
    }
  });

  if (shareToggle) {
    shareToggle.addEventListener('click', () => {
      toggleSharing();
    });
  }

  if (daemonToggle) {
    daemonToggle.addEventListener('click', () => {
      toggleSearchResponder();
    });
  }
})();
