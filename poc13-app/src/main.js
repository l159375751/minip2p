import './styles/base.css';
import './styles/layout.css';
import { initStore } from '@/state/store';
import { mountLibraryList } from '@/library/ui';
import { subscribeSharing, toggleSharing } from '@/state/sharing.js';

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
    </header>
    <section id="library-list"></section>
  </main>
`;

const listMount = document.querySelector('#library-list');
const shareToggle = document.querySelector('#share-toggle');
const shareNote = document.querySelector('#share-note');

(async () => {
  await initStore();
  mountLibraryList(listMount);

  subscribeSharing(({ enabled }) => {
    if (shareToggle) {
      shareToggle.textContent = enabled ? 'Stop Sharing' : 'Start Sharing';
      shareToggle.classList.toggle('active', enabled);
    }
    if (shareNote) {
      shareNote.textContent = enabled ? 'Sharing with relays' : 'Sharing paused';
    }
  });

  if (shareToggle) {
    shareToggle.addEventListener('click', () => {
      toggleSharing();
    });
  }
})();
