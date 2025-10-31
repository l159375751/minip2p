
.PHONY: deploy fetch-gutenberg convert-to-targz setup-docker build-docker create-torrent seed-gutenberg seed-from-file seed-stop seed-logs seed-status seed-test

# Gutenberg collection magnet link with working 2025 trackers
GUTENBERG_MAGNET := magnet:?xt=urn:btih:6042fc88ad1609b64ac7d09154e89e23ceb81cd4&dn=gutenberg-txt-files.tar.zip&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337%2Fannounce&tr=udp%3A%2F%2Fopen.demonoid.ch%3A6969%2Fannounce&tr=udp%3A%2F%2Fopen.demonii.com%3A1337%2Fannounce&tr=udp%3A%2F%2Ftracker.torrent.eu.org%3A451%2Fannounce&tr=udp%3A%2F%2Fopen.stealth.si%3A80%2Fannounce&tr=udp%3A%2F%2Fexodus.desync.com%3A6969%2Fannounce&tr=wss%3A%2F%2Ftracker.openwebtorrent.com&tr=wss%3A%2F%2Ftracker.webtorrent.dev

deploy:
	git add index.html poc*/index.html poc*/GUTINDEX.ALL.new
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
		echo "🔄 Converting tar.zip to tar.gz (this takes 5-10 minutes)..."; \
		unzip -p gutenberg-txt-files.tar.zip | gzip -9 > gutenberg-txt-files.tar.gz; \
		ls -lh gutenberg-txt-files.tar.gz; \
		echo "✅ Conversion complete!"; \
	fi
	@grep -qxF "gutenberg-txt-files.tar.gz" .gitignore || echo "gutenberg-txt-files.tar.gz" >> .gitignore

setup-docker:
	@command -v docker >/dev/null 2>&1 || (curl -fsSL https://get.docker.com | sudo sh && sudo usermod -aG docker $$USER)
	$(MAKE) build-docker

build-docker:
	docker build -t webtorrent webtorrent-hybrid-docker/

seed-gutenberg: build-docker
	@if [ -z "$(MAGNET)" ]; then \
		echo "Usage: make seed-gutenberg MAGNET='magnet:?xt=...'"; \
		exit 1; \
	fi
	docker run -d --name webtorrent-gutenberg --restart unless-stopped \
		-p 6881:6881 -p 6881:6881/udp \
		webtorrent download "$(MAGNET)" --keep-seeding --verbose --torrent-port 6881

seed-from-file: build-docker
	@test -f gutenberg-txt-files.tar.zip || $(MAKE) fetch-gutenberg
	@if [ -f gutenberg-txt-files.tar.torrent ]; then \
		echo "✅ Using .torrent file (instant seeding, no rehashing!)"; \
		docker run -d --name webtorrent-gutenberg --restart unless-stopped \
			-v $$(pwd):/data:ro -p 6881:6881 -p 6881:6881/udp \
			-e DEBUG='webtorrent*,bittorrent-tracker*' \
			webtorrent seed /data/gutenberg-txt-files.tar.torrent --verbose --torrent-port 6881; \
	else \
		echo "⚠️  No .torrent file found, seeding raw ZIP (will take 10-30 min to hash)"; \
		echo "💡 Create .torrent via POC8 to enable instant seeding!"; \
		docker run -d --name webtorrent-gutenberg --restart unless-stopped \
			-v $$(pwd):/data:ro -p 6881:6881 -p 6881:6881/udp \
			-e DEBUG='webtorrent*,bittorrent-tracker*' \
			webtorrent seed /data/gutenberg-txt-files.tar.zip --verbose --torrent-port 6881; \
	fi

seed-stop:
	-docker stop webtorrent-gutenberg
	-docker rm webtorrent-gutenberg

seed-logs:
	docker logs -f webtorrent-gutenberg

seed-status:
	@echo "🌱 === WebTorrent Seeder Status ==="
	@docker ps --filter name=webtorrent-gutenberg --format "Status: {{.Status}}" 2>/dev/null || echo "❌ Container not running"
	@echo ""
	@if docker ps --filter name=webtorrent-gutenberg --format "{{.Names}}" 2>/dev/null | grep -q webtorrent-gutenberg; then \
		echo "📊 === Latest Stats ==="; \
		docker logs webtorrent-gutenberg --tail 100 2>&1 | grep -i "speed\|upload\|download\|peers\|progress" | tail -20 || echo "No stats yet"; \
		echo ""; \
		echo "📈 === Speed Summary ==="; \
		LAST_LOG=$$(docker logs webtorrent-gutenberg --tail 50 2>&1); \
		UP_SPEED=$$(echo "$$LAST_LOG" | grep -oP "(?<=⬆️|↑|Upload:?\s*)\K[\d.]+\s*[KMG]?B/s" | tail -1); \
		DOWN_SPEED=$$(echo "$$LAST_LOG" | grep -oP "(?<=⬇️|↓|Download:?\s*)\K[\d.]+\s*[KMG]?B/s" | tail -1); \
		PEERS=$$(echo "$$LAST_LOG" | grep -oP "\d+(?=\s*peers?)" | tail -1); \
		if [ -n "$$UP_SPEED" ]; then echo "⬆️  Upload: $$UP_SPEED"; else echo "⬆️  Upload: 0 B/s"; fi; \
		if [ -n "$$DOWN_SPEED" ]; then echo "⬇️  Download: $$DOWN_SPEED"; else echo "⬇️  Download: 0 B/s"; fi; \
		if [ -n "$$PEERS" ]; then echo "👥 Peers: $$PEERS"; else echo "👥 Peers: 0"; fi; \
	else \
		echo "ℹ️  Start seeding with: make seed-from-file"; \
	fi

seed-test: seed-stop build-docker
	docker run -d --name webtorrent-gutenberg --restart unless-stopped \
		-p 6881:6881 -p 6881:6881/udp \
		webtorrent download "$(GUTENBERG_MAGNET)" --keep-seeding --verbose --torrent-port 6881
	@echo "Container started! Showing logs (Ctrl+C to exit, container keeps running)..."
	@sleep 2
	docker logs -f webtorrent-gutenberg
