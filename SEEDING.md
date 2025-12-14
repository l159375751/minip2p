# Multi-Torrent Seeding

Seed multiple torrents using Docker and WebTorrent.

## Quick Start

1. Edit `torrents.txt` (repo root) and add one magnet or 40‑char infohash per line (lines starting with `#` are comments).
2. Optionally create `trackers.txt` next to it with one tracker URL per line (otherwise the built‑in list is used).
3. Start the seeder:
   ```bash
   make seed
   ```
4. Watch logs / stop:
   ```bash
   make seed-logs
   make seed-stop
   ```

You can also point the seeder at a single infohash without editing `torrents.txt`:

```bash
make seed HASH=<infohash>
```

## Example Infohashes

- Full Gutenberg bundle: `38ea08e57e7fd054ed83165b7705bd57ca0250af`
- 10 MB mini archive: `a9b9e56d524c5541c54ccb2d8385e711953a4c21`

## Optional Helpers

Useful for regenerating sample payloads and torrents:

```bash
make mini-archive         # build ~10/100/1000 MB samplers under data/
make mini-torrents        # write .torrent files to ./data/
make main-torrent         # create torrent for full Gutenberg bundle (if present)
```
