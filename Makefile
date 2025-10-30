
.PHONY: deploy fetch-gutenberg setup-docker build-docker seed-gutenberg seed-from-file seed-stop seed-logs seed-test

# Gutenberg collection magnet link for testing
GUTENBERG_MAGNET := magnet:?xt=urn:btih:6042fc88ad1609b64ac7d09154e89e23ceb81cd4&dn=gutenberg-txt-files.tar.zip&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337&tr=udp%3A%2F%2Fexplodie.org%3A6969&tr=udp%3A%2F%2Ftracker.empire-js.us%3A1337&tr=wss%3A%2F%2Ftracker.btorrent.xyz&tr=wss%3A%2F%2Ftracker.openwebtorrent.com&tr=wss%3A%2F%2Ftracker.webtorrent.dev

deploy:
	git add index.html poc*/index.html poc*/GUTINDEX.ALL.new
	git diff --cached --quiet || git commit -m "Deploy updates"
	git push
	ssh 0x6du 'cd /var/www/minip2p && git pull'

fetch-gutenberg:
	wget -c -O gutenberg-txt-files.tar.zip https://www.gutenberg.org/cache/epub/feeds/txt-files.tar.zip
	sha256sum gutenberg-txt-files.tar.zip > gutenberg-txt-files.tar.zip.sha256
	@grep -qxF "gutenberg-txt-files.tar.zip" .gitignore || echo "gutenberg-txt-files.tar.zip" >> .gitignore

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
		webtorrent download "$(MAGNET)" --keep-seeding --verbose

seed-from-file: build-docker
	@test -f gutenberg-txt-files.tar.zip || $(MAKE) fetch-gutenberg
	docker run -d --name webtorrent-gutenberg --restart unless-stopped \
		-v $$(pwd):/data:ro -p 6881:6881 -p 6881:6881/udp \
		webtorrent seed /data/gutenberg-txt-files.tar.zip --verbose

seed-stop:
	-docker stop webtorrent-gutenberg
	-docker rm webtorrent-gutenberg

seed-logs:
	docker logs -f webtorrent-gutenberg

seed-test: seed-stop build-docker
	docker run -d --name webtorrent-gutenberg --restart unless-stopped \
		-p 6881:6881 -p 6881:6881/udp \
		webtorrent download "$(GUTENBERG_MAGNET)" --keep-seeding --verbose
	@echo "Container started! Showing logs (Ctrl+C to exit, container keeps running)..."
	@sleep 2
	docker logs -f webtorrent-gutenberg
