# speckit Constitution

## Core Principles

### I. Code Quality Integrity (NON-NEGOTIABLE)
Every artifact embraces small, purposeful modules, descriptive naming, and accessible semantics; reviewers block any change that introduces duplication, unclear ownership, or untyped data boundaries, and no feature ships with unresolved TODOs in production paths.

### II. Testing Fidelity
All behavior changes start with executable tests—unit, contract, or fixture-backed HTML checks—that fail before the implementation; green builds require deterministic, automated verification plus documented manual smoke steps for browser-facing work.

### III. User Experience Consistency
Interfaces follow the active PoC style guide (two-space HTML indentation, kebab-case selectors, semantic tags) and preserve prior affordances; visual or interaction updates must document deltas, highlight fallback behaviors, and validate across at least one desktop Chromium and one Firefox build.

### IV. Performance Transparency
Features budget their cost up front—call out critical-path latency, DOM weight, and seeding impact—then instrument or measure before merge; any regression over 5% in render time, bundle size, or torrent throughput requires mitigation or explicit sign-off.

### V. Progressive Observability
Every new workflow exposes actionable diagnostics (structured logs, DOM data attributes, or seeding stats) so failures can be replayed; missing insight is treated as a blocker equal to broken functionality.

## Quality & Performance Standards
- Document baseline metrics (TTFB, render complete, bundle KB, seeding bandwidth) in specs; store snapshots alongside the relevant `poc*/` artifact.
- Require reproducible steps for manual UX validation, including data prerequisites and expected DOM anchors.
- Prefer lightweight, dependency-free tooling; when heavier tooling is required, justify its performance impact and provide a rollback plan.
- Archive test artifacts (logs, screenshots, HAR files) for any change touching performance-sensitive code paths.

## Development Workflow & Review Gates
- PRs cite which principles they satisfy and link to evidence (test output, metrics sheet, UX notes).
- Code reviews enforce “no orphaned behavior”: every feature references a spec section, test, and UX acceptance note before approval.
- Deployment via `make deploy` only occurs after local verification and recorded performance deltas; any skipped step must be called out in the PR description.

## Governance
This constitution supersedes ad-hoc preferences; amendments demand a documented proposal, impact analysis, and consensus from maintainers plus UX and performance stewards. Reviews must explicitly acknowledge compliance, and unresolved violations block merge and deployment.

**Version**: 1.0.0 | **Ratified**: 2025-11-10 | **Last Amended**: 2025-11-10
