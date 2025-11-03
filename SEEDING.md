# Multi-Torrent Seeding Guide

Seed multiple torrents simultaneously using Docker and WebTorrent.

## Quick Start

### 1. Add torrents to seed

Edit `torrents.txt` and add one magnet link or infohash per line:

```bash
# torrents.txt
magnet:?xt=urn:btih:a7bb7a777b775c6f7205e90b57c44b014a4e5f0c&dn=gutenberg-txt-files.tar.gz
magnet:?xt=urn:btih:abc123...

# Or just infohashes (auto-converted to magnets):
a7bb7a777b775c6f7205e90b57c44b014a4e5f0c
def456...
```

Optionally, create `trackers.txt` alongside `torrents.txt` (or pass a custom path as the second CLI argument) to override the default tracker list. Add one WebTorrent-compatible tracker URL per line:

```bash
# trackers.txt
wss://tracker.openwebtorrent.com
wss://tracker.webtorrent.dev
udp://tracker.opentrackr.org:1337/announce
```

### 2. Start seeding

```bash
make seed-multi
```

### 3. Check status

```bash
make seed-multi-logs
```

### 4. Stop seeding

```bash
make seed-multi-stop
```

### Optional: Regenerate mini archives for testing

Need fresh sample payloads without touching production artifacts? Use the dedicated helpers:

```bash
make mini-archive         # builds ~10/100/1000 MB samplers under data/
make mini-archive SAMPLE=10mb
make mini-archive SAMPLE=100mb
make mini-archive SAMPLE=1000mb
make test-data            # same samplers under data/test-data/
make test-data-clean
make mini-torrents        # write .torrent files to ./torrents/
make main-torrent         # (optional) create torrent for full Gutenberg bundle
```

Archives themselves stay out of git (regardless of `OUTPUT_DIR`), while `checksums/mini-gutenberg-*.tar.gz.sha256` store one hash per archive so you can verify any copy you keep elsewhere.
Each torrent command prints the magnet URI—copy those straight into `torrents.txt` so the Docker seeder picks them up on the next run.

## Features

- ✅ Seed unlimited torrents from a single Docker container
- ✅ Auto-converts infohashes to magnet links
- ✅ Adds configurable tracker list (defaults to 7+ tried-and-true endpoints)
- ✅ Supports up to 200 peer connections
- ✅ Status updates every 30 seconds
- ✅ Auto-restart on failure

## Available Commands

| Command | Description |
|---------|-------------|
| `make seed-multi` | Start multi-torrent seeder |
| `make seed-multi-logs` | View live logs |
| `make seed-multi-stop` | Stop and remove container |
| `make seed-from-file` | Seed single torrent (Gutenberg) |
| `make seed-status` | Check single seeder status |

## Example: Seed Gutenberg Collection

Add this to `torrents.txt`:

```
a7bb7a777b775c6f7205e90b57c44b014a4e5f0c
```

Then run:

```bash
make seed-multi
make seed-multi-logs
```

## Quick Test Torrent (10 MB Mini Archive)

Need a faster smoke test? Use the 10-book sample archive:

```
a9b9e56d524c5541c54ccb2d8385e711953a4c21
```

This pairs with `mini-gutenberg-10mb.tar.gz` and is ideal for verifying progressive extraction or WebRTC connectivity before pulling the full 10 GB dataset.

## Troubleshooting

**No peers connecting?**
- Check if torrent has active seeders/leechers
- Verify port 6881 is accessible
- Check firewall settings

**Container won't start?**
- Ensure `torrents.txt` exists and has at least one non-comment line
- Run `make build-docker` to rebuild the image

**Want to add more torrents?**
1. Edit `torrents.txt` and add new lines
2. Run `make seed-multi-stop && make seed-multi`

## Mini Archive SHA-256

Keep the samplers in sync:

```
make mini-archive
make mini-archive-sha
# Example output: feb2fedcf0cd62b5da35e3bc2d9354d3930deb483645c3acbc2ae6fe3a0b6039  mini-gutenberg-10mb.tar.gz
```

Recreate the torrent via POC8, then restart the seeder:

```
make seed-stop
make seed
```
