# Repository Guidelines

## Project Structure & Module Organization
The repository is organized around lightweight HTML prototypes (poc0-poc12). **poc12** is the current active development target. The `data/` directory contains torrent files and archives. Root-level `Makefile` provides deployment and seeding commands.

## Deployment
**Use `make deploy` to deploy changes to the web server** (0x6du host). It stages, commits, pushes, and SSHs to pull changes.

## Common Commands
- `make seed` / `make seed-stop` / `make seed-logs` - Docker seeder
- `make transmission-add` / `make transmission-status` - Transmission management
- `make check-tracker HASH=<infohash>` - Debug tracker connectivity

## Coding Style & Naming Conventions
HTML files prefer two-space indentation and lowercase element attributes. Keep IDs and class names kebab-cased (for example, `data-panel`) and favor semantic tags (`<section>`, `<article>`). When adding Make targets, group related rules and use phony guards (`.PHONY`) for script-like tasks. Large text assets belong in their respective `poc*` directories and should follow the existing lowercase naming pattern.

## Testing Guidelines
There is no automated test harness; rely on manual verification. Before pushing changes, load each updated HTML page in a modern browser and confirm embedded links, static assets, and network fetches succeed. When updating Gutenberg data, spot-check that expected titles appear in `combined.html` and that file sizes remain within repository limits. Document any manual QA steps in your pull request.

## Commit & Pull Request Guidelines
The current history uses placeholder messages (`"foo"`), but future commits should summarize the change and scope, e.g., `refine poc1 serve script`. Limit commits to coherent units and reference issue IDs when available. Pull requests should describe the motivation, outline the key changes, list manual validation steps (commands run, browsers tested), and attach screenshots for meaningful UI tweaks. Mention any dependencies or follow-up tasks so downstream contributors can plan accordingly.
