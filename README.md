# Mini P2P Prototype Lab

This repository grows a series of browser-based experiments for sharing the Project Gutenberg library via peer-to-peer transports (WebTorrent, WebRTC, Nostr relays, and more). Each proof-of-concept lives under its own `poc*` folder, with the latest deployments reachable at:

- https://0x6d.net/minip2p/ and https://l159375751.github.io/minip2p/
  - `/poc10/` working nostr browser books sharing demo
  - `/poc12/` working webtorrent browser only p2p book backend CDN

Want to explore locally? Most prototypes are single HTML files you can open directly. For `poc0` and `poc1`, run `make serve` inside the directory to spin up a quick static server.

If you run the local WebSocket tracker (Aquatic), the public metrics UI lives at:

- https://metrics.tracker.0x6d.net/
