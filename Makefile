.PHONY: deploy fetch-gutenberg convert-to-targz setup-docker build-docker create-torrent seed seed-stop seed-logs

# Gutenberg collection magnet link with working 2025 trackers
GUTENBERG_MAGNET := magnet:?xt=urn:btih:a7bb7a777b775c6f7205e90b57c44b014a4e5f0c&dn=gutenberg-txt-files.tar.gz&tr=wss%3A%2F%2Ftracker.openwebtorrent.com&tr=wss%3A%2F%2Ftracker.webtorrent.dev&tr=wss%3A%2F%2Ftracker.btorrent.xyz&tr=wss%3A%2F%2Ftracker.fastcast.nz&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337%2Fannounce&tr=udp%3A%2F%2Fopen.demonoid.ch%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.torrent.eu.org%3A451%2Fannounce&tr=udp%3A%2F%2Fexodus.desync.com%3A6969%2Fannounce

deploy:
	git add index.html poc*/index.html poc*/GUTINDEX.ALL.new seed-multi.js Dockerfile package.json Makefile
	git diff --cached --quiet || git commit -m "Deploy updates"
	git push
	ssh 0x6du 'cd /var/www/minip2p && git pull'

fetch-gutenberg:
	wget -c -O gutenberg-txt-files.tar.zip https://www.gutenberg.org/cache/epub/feeds/txt-files.tar.zip
	sha256sum gutenberg-txt-files.tar.zip > gutenberg-txt-files.tar.zip.sha256
	@grep -qxF "gutenberg-txt-files.tar.zip" .gitignore || echo "gutenberg-txt-files.tar.zip" >> .gitignore

convert-to-targz:
	@test -f gutenberg-txt-files.tar.zip || $(MAKE) fetch-gutenberg
	@if [ -f gutenberg-txt-files.tar.gz ]; then \
		echo "✅ gutenberg-txt-files.tar.gz already exists"; \
	else \
		echo "🔄 Converting tar.zip to tar.gz (this takes 5-10 minutes)"; \
		unzip -p gutenberg-txt-files.tar.zip | gzip -9 > gutenberg-txt-files.tar.gz; \
		ls -lh gutenberg-txt-files.tar.gz; \
		echo "✅ Conversion complete!"; \
	fi
	@grep -qxF "gutenberg-txt-files.tar.gz" .gitignore || echo "gutenberg-txt-files.tar.gz" >> .gitignore

setup-docker:
	@command -v docker >/dev/null 2>&1 || (curl -fsSL https://get.docker.com | sudo sh && sudo usermod -aG docker $$USER)
	$(MAKE) build-docker

build-docker:
	docker build -t webtorrent .

seed: build-docker
	@if [ ! -f torrents.txt ]; then \
		echo "❌ torrents.txt not found!"; \
		echo "Create torrents.txt with one magnet link or infohash per line."; \
		exit 1; \
	fi
	@if ! grep -q '^[^#]' torrents.txt; then \
		echo "❌ No torrents found in torrents.txt (all lines are comments or empty)"; \
		echo "Add magnet links or infohashes to torrents.txt, one per line."; \
		exit 1; \
	fi
	@echo "🌱 Starting seeder..."
	docker run -d --name webtorrent-seeder --restart unless-stopped \
		-v $$(pwd):/data:ro \
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