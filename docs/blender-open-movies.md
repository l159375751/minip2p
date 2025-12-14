# Blender Studio Open Movies Notes

Blender Studio publishes a rich catalog of open movies that are ideal as **big, real‑world payloads** for experimenting with WebTorrent and other P2P flows:

- Films catalog: https://studio.blender.org/films/

Each title typically includes:

- High‑resolution video (often multiple encodes)
- Source assets (blend files, textures, rigs)
- Stills, trailers, and promo material

## Why this is interesting for minip2p

- **Legally shareable:** Content is explicitly released under permissive/open licenses, so seeding and mirroring are expected and encouraged.
- **Large but manageable:** Individual films can range from hundreds of megabytes to multiple gigabytes, providing a good stress test for:
  - Multi‑torrent seeding
  - Tracker reliability
  - Progressive download / streaming experiments
- **Diverse file layouts:** Some projects ship as a few large archives, others as many individual assets—useful for testing different torrent layouts (single big file vs. many small ones).

## How we might use this (sketch)

_This is a scratchpad for future experiments; nothing here is wired into the current build or deployment flow._

Ideas:

- Pick a small subset of films (e.g., 2–5 titles) and treat them as a “Blender bundle” analogous to the Gutenberg archives:
  - Download the official release files.
  - Package them as `.tar.gz` bundles (per film, or one combined bundle).
  - Use `utils/create_torrent.js` to generate `.torrent` files.
  - Seed via the existing Docker WebTorrent seeder (`make seed` / `seed-logs`).
- Use Blender films as:
  - A **media‑heavy** alternative to the text‑heavy Gutenberg dataset.
  - A testbed for P2P video delivery prototypes (e.g., partial file requests, stream‑then‑save flows).

## Notes / TODOs

- Before mirroring any assets, double‑check the exact license and attribution requirements per film on Blender Studio.
- Keep Blender payloads **out of git** (same philosophy as Gutenberg archives); only store:
  - Torrent metadata (`*.torrent`)
  - Small index files / manifests
  - Helper scripts and documentation.

