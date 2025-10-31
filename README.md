# Mini P2P Prototype Lab

This repository grows a series of browser-based experiments for sharing the Project Gutenberg library via peer-to-peer transports (WebTorrent, WebRTC, Nostr relays, and more). Each proof-of-concept lives under its own `poc*` folder, with the latest deployments reachable at:

- https://0x6d.net/minip2p/
  - `/poc11/` – Progressive library builder with WebTorrent tar streaming
  - `/poc10/` – (earlier experimental builds; see directory listings for details)

Want to explore locally? Most prototypes are single HTML files you can open directly. For `poc0` and `poc1`, run `make serve` inside the directory to spin up a quick static server.
