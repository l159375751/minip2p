---

description: "Task list for Browser-Only Nostr Library Hub implementation"

---

# Tasks: Browser-Only Nostr Library Hub

**Input**: Design documents from `/specs/001-nostr-library-hub/`  
**Prerequisites**: plan.md (required), spec.md (required)

**Tests**: Automated vitest smoke tests are scoped where they add measurable value (store logic, deduping, resilience queues). Manual QA remains the source of truth for browser flows per plan.md §5.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, toolchain, and base assets needed before feature work.

- [ ] T001 Scaffold vanilla Vite application in `poc13/` (generates `poc13/package.json`, `poc13/src/main.js`, `poc13/index.html`)
- [ ] T002 [P] Add runtime dependencies (`nostr-tools`, `webtorrent`, `idb-keyval`, `pako`, `jszip`) and dev tools (`vitest`, `eslint`) in `poc13/package.json`
- [ ] T003 [P] Configure `poc13/vite.config.js` with `/minip2p/poc13/` base path, path aliases, and test globals

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Cross-cutting infrastructure required by every user story. ⚠️ Complete before story work.

- [ ] T004 Define global typography/layout tokens in `poc13/src/styles/base.css` and responsive grid utilities in `poc13/src/styles/layout.css`
- [ ] T005 Implement storage helpers with IndexedDB + localStorage fallback in `poc13/src/state/persistence.js`
- [ ] T006 [P] Create lightweight event-bus + telemetry dispatcher in `poc13/src/state/event-bus.js`
- [ ] T007 [P] Add relay + transport configuration constants (default relays, trackers, perf budgets) in `poc13/src/config/app-config.js`
- [ ] T008 [P] Establish Vitest configuration and jsdom setup file in `poc13/vitest.config.js` and `poc13/test/setup.js`

**Checkpoint**: Core styling, persistence, configuration, and testing hooks are ready—user stories can now execute independently.

---

## Phase 3: User Story 1 - Sample Library Onboarding (Priority: P1) 🎯 MVP

**Goal**: Deliver an offline-first shelf showing five curated Gutenberg items with working “Open” actions (FR-001).  
**Independent Test**: Clear browser storage, load `/poc13/`, confirm five cards render from `sample-manifest.json` and “Open” shows inline reader without network.

### Implementation

- [ ] T009 [P] [US1] Curate five starter items and save manifest metadata in `poc13/src/data/sample-manifest.json`
- [ ] T010 [US1] Implement core store in `poc13/src/state/store.js` to load manifest, expose selectors, and hydrate starter items
- [ ] T011 [P] [US1] Build shelf + library components in `poc13/src/library/ui.js` (cards, open button, empty states)
- [ ] T012 [US1] Wire `poc13/src/main.js` and `poc13/index.html` to mount shelf, register offline reader modal, and preload manifest
- [ ] T013 [P] [US1] Add vitest covering manifest load + store initialization in `poc13/src/state/__tests__/store.spec.js`

**Checkpoint**: Visitors see five featured items and can open them offline; this is the MVP slice.

---

## Phase 4: User Story 2 - Search & Discovery via Nostr (Priority: P1)

**Goal**: Let users search relays, consume/respond to Nostr events, dedupe results, and request peers (FR-002, FR-004, FR-012).  
**Independent Test**: Point app at seeded test relays, run a query, observe new cards streaming in with relay/peer info, and confirm search responses emit back onto Nostr.

### Implementation

- [ ] T014 [P] [US2] Implement `poc13/src/nostr/client.js` for relay rotation, key management (auto + BYO), and search request/response plumbing
- [ ] T015 [US2] Build deduping/result cache module in `poc13/src/search/result-store.js` (magnet/content hash tracking, local-cache preference)
- [ ] T016 [P] [US2] Create search panel UI + responder status chip in `poc13/src/search/ui.js`
- [ ] T017 [US2] Hook search pipeline into app shell (`poc13/src/main.js`) and emit responder analytics to `poc13/src/state/event-bus.js`
- [ ] T018 [P] [US2] Add vitest to verify deduping + responder tagging in `poc13/src/search/__tests__/result-store.spec.js`

**Checkpoint**: Search queries and responses flow purely over Nostr, and results show availability data without duplication.

---

## Phase 5: User Story 3 - Personal Library Save & Share (Priority: P2)

**Goal**: Persist “My Library,” allow saving/removing, and broadcast/import curated collections through Nostr (FR-005, FR-011).  
**Independent Test**: Save three titles, reload to confirm persistence, enable “Share my library” to publish under 25 KB, and import from a second browser session.

### Implementation

- [ ] T019 [P] [US3] Extend `poc13/src/state/store.js` to persist library mutations via `poc13/src/state/persistence.js` and emit change events
- [ ] T020 [US3] Implement share composer + exporter in `poc13/src/library/share.js` (payload compression, metadata hashing)
- [ ] T021 [P] [US3] Build share/import controls in `poc13/src/library/panel.js` (save/remove buttons, share toggle, import feed)
- [ ] T022 [US3] Subscribe to incoming `library.share` events in `poc13/src/nostr/client.js` and reconcile into store without duplication
- [ ] T023 [P] [US3] Add vitest ensuring export payload size + schema compliance in `poc13/src/library/__tests__/share.spec.js`

**Checkpoint**: Libraries survive reloads and share/import seamlessly via Nostr events.

---

## Phase 6: User Story 4 - Offline & Low-Peer Resilience (Priority: P3)

**Goal**: Surface diagnostics, queue offline actions, and provide fallbacks when relays or peers go missing (FR-006, FR-007, FR-008, FR-003 telemetry aspects).  
**Independent Test**: Kill relay + peer connections, verify banners, queued searches, zero-peer warnings, and troubleshooting affordances all behave per spec.

### Implementation

- [ ] T024 [P] [US4] Implement network + relay monitor in `poc13/src/state/network-status.js` (latency sampling, retry/backoff, manual override hooks)
- [ ] T025 [US4] Render global status bar component in `poc13/src/components/status-bar.js` showing relay, peer, throughput, and responder metrics
- [ ] T026 [US4] Extend `poc13/src/peers/transfer.js` with zero-peer timeout handling, magnet copy helpers, and diagnostics logging
- [ ] T027 [US4] Add offline search queue + replay module in `poc13/src/nostr/offline-queue.js` integrated with search UI
- [ ] T028 [P] [US4] Add vitest covering queue replay + timeout messaging in `poc13/src/nostr/__tests__/offline-queue.spec.js`

**Checkpoint**: The app gracefully degrades and communicates state when connectivity falters.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Repository hardening, documentation, and performance validation across stories.

- [ ] T029 [P] Document manual QA matrix (Chromium + Firefox flows, relay simulator steps, download smoke) in `docs/manual-qa.md`
- [ ] T030 [P] Add bundle-size + Lighthouse scripts (`poc13/package.json` + `poc13/scripts/report-bundle-size.mjs`) and log SC-001/SC-002 readings
- [ ] T031 Update `poc13/README.md` with setup, relay management instructions, and transport troubleshooting tips
- [ ] T032 [P] Run WebTorrent + Nostr logging hardening (structured console + data attributes) in `poc13/src/state/event-bus.js` and `poc13/src/peers/transfer.js`

---

## Dependencies & Execution Order

1. **Phase 1 → Phase 2**: Complete Vite scaffold and dependency setup before creating shared infrastructure.  
2. **Phase 2 → User Stories**: Styling/persistence/config/testing (T004–T008) unblock all stories; do not start story tasks until these land.  
3. **Story Order**:  
   - **US1 (Phase 3)** establishes the base UI and store—MVP + prerequisite for downstream UX.  
   - **US2 (Phase 4)** depends on store + event bus but not on US3/US4 (can run after Phase 2 if mock store is stubbed, though aligning after US1 reduces rework).  
   - **US3 (Phase 5)** depends on US1 store functionality but not on US2 search logic.  
   - **US4 (Phase 6)** consumes telemetry hooks from Phase 2 and extends peers/search modules created in US2; schedule after US2 for minimal conflicts.  
4. **Polish (Phase 7)** runs after the desired user stories are complete to document and validate the integrated experience.

---

## Parallel Execution Examples

- **Setup**: T002 and T003 can run parallel while T001 scaffolds the repo.  
- **Foundational**: T005–T008 target different files (`styles`, `state`, `config`, `vitest`) and can be parallelized once T001 completes.  
- **US1**: T009 and T011 can proceed concurrently; T010 should finish before T012 (since it wires store). T013 can execute once T010 is in place.  
- **US2**: T014, T015, and T016 are largely independent; T017 depends on the prior trio, while T018 can run once T015 stabilizes.  
- **US3**: T019 + T020 are parallelizable; T021 depends on them for wiring; T022 follows T020; T023 can run after T020.  
- **US4**: T024 and T027 touch different modules; T025 depends on diagnostics data; T026 waits for T024; T028 executes after T027.  
- **Polish**: T029–T032 can largely run independently post-story completion.

---

## Implementation Strategy

1. **MVP First**: Ship Phase 3 (US1) immediately after foundational work to unblock demos and validate offline boot (meets SC-001 basics).  
2. **Incremental Enhancements**: Layer US2 (search/responder) next for core differentiation, followed by US3 (sharing) and US4 (resilience) as capacity allows.  
3. **Continuous Telemetry**: Instrument each feature via `event-bus` so diagnostics stay consistent and polishing later is additive, not corrective.  
4. **Validation Hooks**: Maintain Vitest coverage alongside implementation per story to keep regression surfaces small and ensure manual QA in Phase 7 is confirmatory, not exploratory.
