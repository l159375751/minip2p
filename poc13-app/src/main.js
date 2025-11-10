import './styles/base.css';
import './styles/layout.css';
import { initStore } from '@/state/store';
import { mountFeaturedShelf, mountLibraryList } from '@/library/ui';
import { mountSearchPanel } from '@/search/ui';

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
    </header>
    <section id="featured-row"></section>
    <section id="library-list"></section>
    <section id="search-panel" class="search-panel">
      <header>
        <h2>Search Collections</h2>
        <p>Relay-powered discovery across browsers (local filter for now).</p>
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
    <section class="placeholder-panel">
      <p>
        Telemetry, search, and responder diagnostics will appear here once Nostr wiring lands.
      </p>
      <div class="status-cluster">
        <span class="status-pill">
          <strong>Relays</strong>
          <span>Pending wiring</span>
        </span>
        <span class="status-pill">
          <strong>Library</strong>
          <span>Sample manifest live</span>
        </span>
        <span class="status-pill">
          <strong>Transfers</strong>
          <span>WebRTC/WebTorrent adapters upcoming</span>
        </span>
      </div>
    </section>
  </main>
`;

const featuredMount = document.querySelector('#featured-row');
const listMount = document.querySelector('#library-list');
const searchPanel = document.querySelector('#search-form');
const searchInput = document.querySelector('#search-input');
const searchClear = document.querySelector('#search-clear');
const searchResults = document.querySelector('#search-results');

(async () => {
  await initStore();
  mountFeaturedShelf(featuredMount);
  mountLibraryList(listMount);
  mountSearchPanel(searchPanel, searchResults, searchInput, searchClear);
})();
