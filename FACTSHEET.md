# 0x6d.net Fact Sheet

One place to grab our canonical URLs, trackers, and deployment rituals.

## Domains & Reverse Proxies

| Hostname | Purpose | Backend |
| --- | --- | --- |
| `0x6d.net` | Public static site (e.g., `/minip2p/poc13/`) | `/var/www/minip2p` |
| `ip.0x6d.net` | Echo IP helper (reverse proxies the `echoip` service) | `127.0.0.1:18080` |
| `relay.0x6d.net` | Browser-friendly Nostr relay | `127.0.0.1:7000` |

Notes:
- `/minip2p` redirects to `/minip2p/` so subpaths behave as expected.
- The Caddy config lives in `deploy/Caddyfile`; use `make deploy-caddy` if you change it.

## Tracker & Infohash References

Default tracker list (`trackers.txt` and `poc13-app/src/config/app-config.js`):

```
wss://tracker.openwebtorrent.com
wss://tracker.webtorrent.dev
wss://tracker.btorrent.xyz
wss://tracker.fastcast.nz
udp://tracker.opentrackr.org:1337
udp://open.demonoid.ch:6969
udp://tracker.torrent.eu.org:451
udp://exodus.desync.com:6969
```

Primary Gutenberg infohash (sha1: `38ea08e57e7fd054ed83165b7705bd57ca0250af`). When a full magnet is needed, construct it ad hoc: `magnet:?xt=urn:btih:38ea08e5...&tr=<tracker>` using the list above.

## Build & Deploy Flow

1. **Work inside `poc13-app/`** (sources, tests, config).
2. `npm run test` (Vitest / jsdom) → `npm run build`.
3. Replace the public bundle: `rm -rf poc13/* && cp -R poc13-app/dist/* poc13/`.
4. Commit both `poc13-app/` and `poc13/`.
5. `make deploy` → commits, pushes, and triggers `ssh 0x6du 'cd /var/www/minip2p && git pull'`.

## Seeder & Relay Helpers

- `make seed` / `seed-stop` / `seed-logs`: spins up the Dockerized WebTorrent seeder.
- `make transmission-*`: bulk-add torrents to a local Transmission instance with the tracker list above.
- `nostr-relay/`: houses the relay service that Caddy exposes at `relay.0x6d.net`.

Keep this file updated whenever endpoints or workflows change so future deploys stay frictionless.
