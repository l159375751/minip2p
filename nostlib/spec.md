# Feature Specification: Browser-Only Nostr Library Hub

**Feature Branch**: `[nostr-browser-library-hub]`  
**Created**: 2025-11-10  
**Status**: Draft  
**Input**: User description: "//speckit.specify Build an application that is a simple browser based html/js using no backend application that offeres useres a nostr backed book and media library. using p2p in browser tech to distribiute books and meta data. as also profiding a search and discovere. all this, just browser to browser, backed also with nostr. libs can be saved and shared. media too.     new users becomes a simple lib interfaces whre they see 5 sample books and can search and load more books. we have allready buils all this tech in ../poc* .. so you can se how we wanna do it all .."

## Clarifications

### Session 2025-11-10

- Q: What Nostr key management model should govern publishing search responses and shared libraries from the browser client? → A: Option C — start each user with an auto-generated key persisted locally, allow exporting the key material, and optionally let advanced users import their own key when they need consistency across browsers.
- Q: How should external webpages issue search requests to (and receive responses from) our app? → A: Option A — all inter-page search traffic flows strictly over Nostr events so other sites publish/subscribe using the same request/response schema without relying on widgets or HTTP endpoints.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Sample Library Onboarding (Priority: P1)

A first-time visitor loads the single-page app, sees five curated starter books/media items, and can open metadata/details without configuring relays or wallets.

**Why this priority**: This is the hello-world moment that proves value immediately and validates that the in-browser stack boots without backend help.

**Independent Test**: Clear browser storage, load `/poc12` successor, verify five cards render with cover/title/size plus a working “Open” action using only bundled data.

**Acceptance Scenarios**:

1. **Given** a fresh browser session, **When** the page loads, **Then** exactly five featured items render with title, author, and size metadata pulled from the embedded manifest.
2. **Given** an item card, **When** the user taps “Open,” **Then** the media fetches via the configured P2P transport (WebTorrent/WebRTC) and displays progress plus a link to read/download.

---

### User Story 2 - Search & Discovery via Nostr (Priority: P1)

Visitors can search Nostr relays for additional books/media, see deduplicated results, and request downloads directly from browser peers.

**Why this priority**: Search/discovery is the differentiator—without it the library feels static and can’t scale beyond the starter bundle.

**Independent Test**: Point the app at test relays populated from existing `poc10` events, execute keyword and tag queries, confirm new items stream in and can be fetched peer-to-peer.

**Acceptance Scenarios**:

1. **Given** a connected relay list, **When** the user enters a keyword and submits, **Then** the client publishes a Nostr search event and renders matching media cards with relay origin + seed availability indicators.
2. **Given** search results include items already cached locally, **When** they are displayed, **Then** duplicates are collapsed and marked “available offline” without re-downloading manifests.

---

### User Story 3 - Personal Library Save & Share (Priority: P2)

Users can bookmark items into a personal library, persist it locally, and broadcast their curated list so other browsers can subscribe.

**Why this priority**: Sharing curated libraries is the viral loop that turns each user into a mini catalog node, amplifying distribution without servers.

**Independent Test**: Add three items to “My Library,” reload the page (local persistence should restore), then push the collection as a signed Nostr event and confirm another browser session subscribes to it.

**Acceptance Scenarios**:

1. **Given** a media card, **When** the user clicks “Save to Library,” **Then** the item persists in IndexedDB/localStorage and rehydrates after a reload with consistent order.
2. **Given** the user toggles “Share my library,” **When** the share is enabled, **Then** the client publishes/syncs a Nostr event containing item metadata hashes so peers can pull referenced torrents without exposing private data.

---

### User Story 4 - Offline & Low-Peer Resilience (Priority: P3)

The app gracefully handles missing relays or peer scarcity by surfacing diagnostics and falling back to cached assets.

**Why this priority**: Reliability reinforces trust; users must know whether issues stem from connectivity or missing seeders.

**Independent Test**: Disconnect from relays and seeders in dev tools, reload, confirm offline banner, cached sample use, and actionable troubleshooting guidance.

**Acceptance Scenarios**:

1. **Given** no relay connection, **When** the user issues a search, **Then** the interface shows a non-blocking warning with last successful sync time and suggests retry/backoff options.
2. **Given** a download stalls due to zero peers, **When** the timeout passes, **Then** the app shows a “need peers” status plus a one-click copy of magnet/nostr event for requesting help elsewhere.

### Edge Cases

- What happens when no Nostr relays respond within 5 seconds? → App must retry with exponential backoff, cache the failure, and expose a manual relay selector.
- How does system handle corrupted or mismatched media metadata? → Validate manifest hashes before display; items failing validation are quarantined with a “needs reseed” flag.
- How to behave when local storage is full or disabled? → Provide a read-only mode warning and limit saves to ephemeral session storage.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST render five curated starter items (title, author, cover, size, torrent/Nostr pointers) without requiring network access.
- **FR-002**: System MUST allow users to search across configured Nostr relays using keyword/tag filters and stream incremental results.
- **FR-003**: Users MUST be able to request downloads directly from browser peers via WebTorrent/WebRTC, with progress + health indicators.
- **FR-004**: System MUST deduplicate results by magnet hash/content hash and prefer local/cached copies when available.
- **FR-005**: System MUST provide a persistent “My Library” collection backed by IndexedDB/localStorage and export/share it through signed Nostr events.
- **FR-006**: Users MUST be able to manage relay lists (add/remove/test) without leaving the page.
- **FR-007**: System MUST surface telemetry (relay connectivity, peer counts, transfer speed) for troubleshooting, per the observability principle.
- **FR-008**: System MUST implement graceful degradation when offline—starter items remain usable, and searches queue until connectivity resumes.
- **FR-009**: System MUST document manual verification steps (Chromium + Firefox) and bundle minimal scripts so QA can replay search/download flows.
- **FR-010**: System MUST keep bundle size under 300 KB gzip (excluding vendor WebTorrent assets) and initial render under 2.5 s on a 3G Fast profile.
- **FR-011**: System MUST auto-generate and persist a Nostr key pair per browser profile by default, expose export/import, and allow advanced users to replace the managed key with their own when they require cross-browser continuity.
- **FR-012**: System MUST expose the search responder exclusively via Nostr events so third-party webpages interact by publishing `search.request` events and subscribing to `search.response` events, maintaining the browser-only contract.

### Key Entities *(include if feature involves data)*

- **MediaItem**: Immutable descriptor combining Gutenberg metadata, magnet hash, cover asset pointer, and optional preview snippet.
- **LibraryCollection**: Ordered list of `MediaItem` references owned by a user session, including annotations and share status.
- **RelayConnection**: Configuration object capturing relay URL, authentication (if any), health, and recent latency stats.
- **PeerSession**: Runtime state describing active WebTorrent/WebRTC peers, piece availability, throughput measurements, and error history.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Cold-load of starter experience completes in ≤2.5 s (P95) on Fast 3G with 5 curated items visible.
- **SC-002**: Search requests return first Nostr-backed result in ≤1 s (P90) when at least one relay is reachable.
- **SC-003**: 90% of manual QA runs across Chromium + Firefox complete sample download + library share flows without errors.
- **SC-004**: Personal library exports stay under 25 KB per share event and replay cleanly on at least two independent browser sessions.
- **SC-005**: Peer-to-peer transfers sustain ≥400 KB/s aggregate throughput when at least two seeders exist, or else surface diagnostics within 3 s.
