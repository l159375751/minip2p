# Implementation Plan: Browser-Only Nostr Library Hub

## 1. Objectives & Constraints
- Ship a single-page Vite app that boots offline with five sample Gutenberg items, requires no custom backend, and relies on Nostr + browser-based P2P (WebTorrent/WebRTC) for discovery and delivery.
- Favor vanilla HTML/CSS/JS; only pull in unavoidable vendor libraries (WebTorrent client, Nostr helper) already vetted in `../poc*`.
- UI must feel sleek but essential: responsive layout, semantic structure, keyboard navigation, reduced ornamentation.
- App both consumes **and responds to** Nostr search events so other pages can discover our catalog via the same protocol.
- Must honor constitution principles: deterministic tests, performance transparency (≤2.5 s cold load, bundle ≤300 KB gzip), UX consistency (two-space indentation, kebab-case classes), and observable telemetry.

## 2. Target Architecture Overview
```
Vite (ESM build)
├── index.html          # semantic shell, minimal script tags
├── src/main.js         # bootstraps app, mounts UI
├── src/state/store.js  # sample manifest + library persistence (IndexedDB/localStorage)
├── src/nostr/client.js # relay mgmt, search request/response handlers
├── src/search/ui.js    # search form, results grid, responder status chip
├── src/library/ui.js   # “My Library” panel, share toggle
├── src/peers/transfer.js # WebTorrent/WebRTC glue reused from poc12
└── src/styles/*.css    # vanilla CSS modules (utility + components)
```
- **Data flow**: `main.js` seeds UI with sample manifest. Search requests dispatch via `nostr/client`. Responses hydrate `search/ui`. Selecting an item hands off to `peers/transfer` for download streams. Saved items persist through `state/store`. Outbound library share + search responses also travel via `nostr/client`.
- **Relay integration**: maintain relay list + health metrics; respond to `search.request` events by querying local manifest/cache and sending `search.response` events.
- **Diagnostics**: global status bar fed by `state/store` events: relay health, peer counts, transfer speed, last response served.

## 3. Implementation Phases

### Phase 1: Environment & Skeleton
1. Initialize Vite (vanilla JS) inside `nostlib/poc12-successor/` (or reuse existing `poc12` folder).
2. Configure Vite for relative asset base (`/minip2p/poc13/` style) and import existing vendor bundles (WebTorrent, nostr-tools) via `<script type="module">` or local copies.
3. Define `src/styles/base.css` (CSS reset, typography) and `src/styles/layout.css` (grid, panels) to establish the sleek/functional appearance.
4. Add `index.html` with semantic sections: `<header>`, `<section class="search-panel">`, `<section class="results-grid">`, `<aside class="library-panel">`, `<footer class="status-bar">`.

**Exit criteria**: Vite dev server runs, blank layout renders with placeholder content, bundle <100 KB before feature code.

### Phase 2: Sample Shelf & State Layer
1. Create `sample-manifest.json` (5 curated items pulled from Gutenberg dataset used in `poc12`).
2. Build `state/store.js` to:
   - Load sample manifest synchronously for offline boot.
   - Persist “My Library” entries via IndexedDB (with localStorage fallback).
   - Emit custom events for UI modules (observer pattern or simple event bus).
3. Wire `library/ui.js` to render starter items and allow “Save to Library,” “Remove,” and share toggles (UI updates only; network later).
4. Add accessibility hooks (focus outlines, ARIA labels) to keep UI usable.

**Exit criteria**: Fresh load shows five sample cards; library persistence survives reload; no network dependency yet.

### Phase 3: Nostr Search Consumer & Responder
1. Adapt existing nostr relay helpers from `../poc10` into `nostr/client.js`:
   - Manage relay list (default config + user-managed form).
   - Publish `search.request` events (kind/tag decided from POC) with query tokens.
   - Subscribe to matching `search.response` events and stream results to `search/ui`.
2. Implement deduping logic (by magnet hash/content hash) before pushing results downstream.
3. Build responder path:
   - Listen for external `search.request` events matching supported filters.
   - Query local sample manifest + cached search results.
   - Publish `search.response` events referencing magnet hash, metadata, torrent info.
   - Surface responder status (active/idle, requests served count) in UI.
4. Add relay health indicators (latency, last event timestamp) surfaced in header or status bar.

**Exit criteria**: App can search relays and receive responses; devtools shows outbound responses when another client issues queries (use simulator in `../poc10` or local script).

### Phase 4: Peer Transfer & Media Playback
1. Port WebTorrent/WebRTC glue from `../poc12/library-builder.js` into `src/peers/transfer.js`, stripping unused DOM dependencies.
2. Integrate with result cards:
   - “Open” triggers torrent fetch, shows progress ring/bar, handles errors (no peers, timeout).
   - Provide fallback “Copy magnet” and “Open in external client.”
3. Add instrumentation hooks (transfer speed, peer count) feeding the status bar and shareable debug log.
4. Ensure downloads respect bundle size constraints (lazy-load heavy libs after user intent via dynamic `import()`).

**Exit criteria**: User can download/read sample + searched items using browser P2P stack; diagnostics reflect peer/transfer state.

### Phase 5: Sharing, Telemetry & Polish
1. Finalize library sharing flow:
   - Compose `library.share` events with trimmed metadata (<25 KB).
   - Subscribe to other users’ share events and allow importing into local library.
2. Build unified search panel that can target:
   - Nostr relays (default).
   - Local library.
   - External webpage via copyable “search responder embed” instructions.
3. Complete UI polish:
   - CSS animations kept subtle (transitions ≤150 ms).
   - Responsive layout (mobile: stacked panels; desktop: three-column).
   - Keyboard shortcuts (`/` to focus search, `s` to save).
4. Document manual QA steps (Chromium + Firefox) per constitution; include scripts/logging hooks to help testers capture HAR/screenshots.

**Exit criteria**: All spec FRs satisfied; UI, telemetry, and documentation ready for review.

## 4. Risk & Mitigation
- **Relay latency/availability**: Provide multi-relay default list + backoff UI; supply offline search queue to replay when connected.
- **Bundle growth**: Lazy-load WebTorrent + nostr-tools; tree-shake vendor imports; monitor gzip size in CI (`npm run build && gzip -c dist/assets/index-*.js`).
- **Search responder abuse**: Rate-limit responses client-side; expose toggle to pause answering; consider simple allowlist for external queries during MVP.
- **IndexedDB failures**: Auto-fallback to in-memory session store, show warning banner about limited persistence.

## 5. Validation Plan
- **Automated**: Add vitest/jsdom smoke tests for store logic, deduping, manifest validation. Add lint check for bundle size threshold (custom script).
- **Manual**: Document steps for:
  1. Fresh-load sample shelf (Chromium + Firefox).
  2. Execute search against local relay simulator and confirm responses/dedupe.
  3. Respond to external search (use second browser window), verifying responder counter increments.
  4. Download via WebTorrent with network throttling + zero-peer scenario.
  5. Share/import library between two browsers.
- Capture performance metrics via Lighthouse (Fast 3G) and note readings in PR.

## 6. Deliverables
- `poc13/` (or updated `poc12/`) Vite project with documented scripts (`npm run dev/build/preview`).
- `docs/manual-qa.md` enumerating manual validation & expected outputs.
- Configurable relay list + responder toggle surfaced in UI + persisted locally.
- Evidence artifacts: screenshots, HAR/logs, bundle size report.
