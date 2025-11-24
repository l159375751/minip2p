.PHONY: deploy deploy-caddy fetch-gutenberg convert-to-targz setup-docker build-docker create-torrent seed seed-stop seed-logs mini-archive mini-archive-all mini-archive-sha test-data test-data-clean mini-torrents main-torrent all-torrents transmission-add transmission-status transmission-verify transmission-start transmission-stop check-tracker

SAMPLE ?= all

# Gutenberg collection magnet link with working 2025 trackers
GUTENBERG_MAGNET := magnet:?xt=urn:btih:38ea08e57e7fd054ed83165b7705bd57ca0250af&dn=gutenberg-txt-files.tar.gz&tr=wss%3A%2F%2Ftracker.openwebtorrent.com&tr=wss%3A%2F%2Ftracker.webtorrent.dev&tr=wss%3A%2F%2Ftracker.btorrent.xyz&tr=wss%3A%2F%2Ftracker.fastcast.nz&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337%2Fannounce&tr=udp%3A%2F%2Fopen.demonoid.ch%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.torrent.eu.org%3A451%2Fannounce&tr=udp%3A%2F%2Fexodus.desync.com%3A6969%2Fannounce

TEST_DATA_DIR := $(abspath data/test-data)
TEST_SAMPLES := 10mb 100mb 1000mb
TORRENT_DIR := $(abspath data)
TRACKERS_FILE := $(abspath trackers.txt)

deploy:
	@echo "📦 Staging all changes (poc*, helpers/, index.html, etc.)..."
	git add -A
	@if git diff --cached --quiet; then \
		echo "ℹ️ No staged changes to commit."; \
	else \
		git commit -m "Deploy updates"; \
	fi
	@if git push; then \
		ssh 0x6du 'cd /var/www/minip2p && git pull'; \
	else \
		echo "⚠️ Push rejected. Rebasing onto origin/main before retrying..."; \
		git pull --rebase origin main; \
		git push; \
		ssh 0x6du 'cd /var/www/minip2p && git pull'; \
	fi

deploy-caddy:
	@echo "🚀 Deploying Caddy configuration to 0x6d.net..."
	$(MAKE) deploy
	@echo "📡 Reloading Caddy on server..."
	ssh 0x6du 'cd /var/www/minip2p/deploy && make caddy-reload'
	@echo "✅ Caddy deployment complete!"

fetch-gutenberg:
	mkdir -p data
	wget -c -O data/gutenberg-txt-files.tar.zip https://www.gutenberg.org/cache/epub/feeds/txt-files.tar.zip
	sha256sum data/gutenberg-txt-files.tar.zip > data/gutenberg-txt-files.tar.zip.sha256

convert-to-targz:
	@test -f data/gutenberg-txt-files.tar.zip || $(MAKE) fetch-gutenberg
	@if [ -f data/gutenberg-txt-files.tar.gz ]; then \
		echo "✅ data/gutenberg-txt-files.tar.gz already exists"; \
	else \
		echo "🔄 Converting tar.zip to tar.gz (this takes 5-10 minutes)"; \
		unzip -p data/gutenberg-txt-files.tar.zip | gzip -9 > data/gutenberg-txt-files.tar.gz; \
		ls -lh data/gutenberg-txt-files.tar.gz; \
		echo "✅ Conversion complete!"; \
	fi

setup-docker:
	@command -v docker >/dev/null 2>&1 || (curl -fsSL https://get.docker.com | sudo sh && sudo usermod -aG docker $$USER)
	$(MAKE) build-docker

build-docker:
	docker build -t webtorrent .

seed: build-docker
	@echo "🌱 Starting seeder..."
	@echo "   Will seed .torrent files from data/ directory"
	@if [ -f torrents.txt ] && grep -q '^[^#]' torrents.txt; then \
		echo "   Also reading magnet links from torrents.txt"; \
	fi
	docker run -d --name webtorrent-seeder --restart unless-stopped \
		-v $$(pwd)/data:/data \
		-p 6881:6881 -p 6881:6881/udp \
		webtorrent
	@echo "✅ Seeder started!"
	@echo "📋 Check logs: make seed-logs"
	@echo "🛑 Stop: make seed-stop"

seed-stop:
	-docker stop webtorrent-seeder
	-docker rm webtorrent-seeder
	@echo "✅ Seeder stopped"

seed-logs:
	docker logs -f webtorrent-seeder

mini-archive:
	OUTPUT_DIR=$(abspath data) SAMPLE=$(SAMPLE) python3 utils/create_mini_archive.py

mini-archive-all:
	OUTPUT_DIR=$(abspath data) python3 utils/create_mini_archive.py

mini-archive-sha:
	OUTPUT_DIR=$(abspath data) SAMPLE=sha python3 utils/create_mini_archive.py

test-data-clean:
	@echo "🧹 Removing old test data artifacts..."
	@rm -rf $(TEST_DATA_DIR)
	@[ -d data ] && find data -maxdepth 1 -type d -name 'mini-gutenberg-*' -exec rm -rf {} + 2>/dev/null || true

test-data: test-data-clean
	@mkdir -p $(TEST_DATA_DIR)
	@for sample in $(TEST_SAMPLES); do \
		echo "==> Building $${sample} sampler"; \
		OUTPUT_DIR=$(TEST_DATA_DIR) SAMPLE=$${sample} python3 utils/create_mini_archive.py; \
	done
	@echo "✅ Test data ready under $(TEST_DATA_DIR)"

mini-torrents:
	@mkdir -p $(TORRENT_DIR)
	@for sample in $(TEST_SAMPLES); do \
		archive=$(abspath data)/mini-gutenberg-$${sample}.tar.gz; \
		if [ -f "$${archive}" ]; then \
			echo "🎯 Building torrent for $${archive}"; \
			node utils/create_torrent.js "$${archive}" $(TORRENT_DIR) $(TRACKERS_FILE); \
		else \
			echo "⚠️ Missing $${archive}, skipping"; \
		fi; \
	done

main-torrent:
	@mkdir -p $(TORRENT_DIR)
	@if [ -f $(abspath data)/gutenberg-txt-files.tar.gz ]; then \
		echo "🎯 Building torrent for gutenberg-txt-files.tar.gz"; \
		node utils/create_torrent.js $(abspath data)/gutenberg-txt-files.tar.gz $(TORRENT_DIR) $(TRACKERS_FILE); \
	else \
		echo "⚠️ Missing data/gutenberg-txt-files.tar.gz, skipping main torrent"; \
	fi

all-torrents: mini-torrents main-torrent

transmission-add:
	@echo "📡 Adding torrents to transmission (paused)..."
	@for torrent in $(TORRENT_DIR)/*.torrent; do \
		echo "➕ Adding $$(basename $$torrent)"; \
		transmission-remote -a "$$torrent" -w "$(TORRENT_DIR)" --start-paused; \
	done
	@echo ""
	@echo "🔗 Adding UDP trackers to all torrents..."
	@grep '^udp://' $(TRACKERS_FILE) | while read -r tracker; do \
		echo "  Adding tracker: $$tracker/announce"; \
		transmission-remote -t 0 -td "$$tracker/announce"; \
	done
	@echo ""
	@echo "📋 Current torrents:"
	@transmission-remote -l
	@echo ""
	@echo "⏳ Next steps (for each torrent ID):"
	@echo "   1. Verify: make transmission-verify ID=<torrent-id>"
	@echo "   2. Check:  make transmission-status"
	@echo "   3. Start:  make transmission-start ID=<torrent-id>"

transmission-status:
	@transmission-remote -l

transmission-verify:
	@if [ -z "$(ID)" ]; then \
		echo "❌ Error: ID required"; \
		echo "Usage: make transmission-verify ID=<torrent-id>"; \
		exit 1; \
	fi
	@echo "🔍 Verifying torrent $(ID)..."
	@transmission-remote -t $(ID) --verify

transmission-start:
	@if [ -z "$(ID)" ]; then \
		echo "❌ Error: ID required"; \
		echo "Usage: make transmission-start ID=<torrent-id>"; \
		exit 1; \
	fi
	@echo "▶️  Starting torrent $(ID)..."
	@transmission-remote -t $(ID) --start
	@transmission-remote -t $(ID) -i

transmission-stop:
	@if [ -z "$(ID)" ]; then \
		echo "❌ Error: ID required"; \
		echo "Usage: make transmission-stop ID=<torrent-id>"; \
		exit 1; \
	fi
	@echo "⏸️  Stopping torrent $(ID)..."
	@transmission-remote -t $(ID) --stop
	@transmission-remote -t $(ID) -i

check-tracker:
	@if [ -z "$(HASH)" ]; then \
		echo "❌ Error: HASH required"; \
		echo "Usage: make check-tracker HASH=<infohash|torrent-file>"; \
		echo ""; \
		echo "Examples:"; \
		echo "  make check-tracker HASH=bbd456a15950aef60ab28e786ae291d00e5fa934"; \
		echo "  make check-tracker HASH=data/mini-gutenberg-10mb.tar.gz.torrent"; \
		exit 1; \
	fi
	node check-tracker.js $(HASH)
