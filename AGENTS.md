# Repository Guidelines

## Project Structure & Module Organization
The repository is organized around lightweight HTML prototypes. The root `index.html` is the shared entry point, while `poc0`, `poc1`, and `poc2` each contain standalone experiments. `poc0` bundles Gutenberg index data and helper pages, `poc1` ships curated text samples for quick demos, and `poc2/bad.html` is the current work-in-progress deployment target. Root-level `Makefile` provides a small deployment task; there are Makefiles in `poc0` and `poc1` for serving assets locally.

## Build, Test, and Development Commands
Use `make serve` inside `poc0` to launch a simple HTTP server (defaults to port 8000) for ad-hoc browsing; override the port with `PORT=9000 make serve` as needed. Run `make serve` in `poc1` to expose demos on port 8001 from the repository root. `make fetch_data` under `poc0` refreshes the Gutenberg datasets and should be run only when the remote endpoints are reachable. The root-level `make deploy` stages `poc2/index.html` and pushes it upstream; confirm the file exists before running it.

## Coding Style & Naming Conventions
HTML files prefer two-space indentation and lowercase element attributes. Keep IDs and class names kebab-cased (for example, `data-panel`) and favor semantic tags (`<section>`, `<article>`). When adding Make targets, group related rules and use phony guards (`.PHONY`) for script-like tasks. Large text assets belong in their respective `poc*` directories and should follow the existing lowercase naming pattern.

## Testing Guidelines
There is no automated test harness; rely on manual verification. Before pushing changes, load each updated HTML page in a modern browser and confirm embedded links, static assets, and network fetches succeed. When updating Gutenberg data, spot-check that expected titles appear in `combined.html` and that file sizes remain within repository limits. Document any manual QA steps in your pull request.

## Commit & Pull Request Guidelines
The current history uses placeholder messages (`"foo"`), but future commits should summarize the change and scope, e.g., `refine poc1 serve script`. Limit commits to coherent units and reference issue IDs when available. Pull requests should describe the motivation, outline the key changes, list manual validation steps (commands run, browsers tested), and attach screenshots for meaningful UI tweaks. Mention any dependencies or follow-up tasks so downstream contributors can plan accordingly.
