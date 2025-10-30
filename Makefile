
.PHONY: deploy fetch-gutenberg setup-docker seed-gutenberg seed-from-file seed-stop seed-logs

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
	docker build -t webtorrent-hybrid webtorrent-hybrid-docker/

seed-gutenberg:
	@if [ -z "$(MAGNET)" ]; then \
		echo "Usage: make seed-gutenberg MAGNET='magnet:?xt=...'"; \
		exit 1; \
	fi
	docker run -d --name webtorrent-gutenberg --restart unless-stopped \
		-p 6881:6881 -p 6881:6881/udp \
		webtorrent-hybrid download "$(MAGNET)" --keep-seeding

seed-from-file:
	@test -f gutenberg-txt-files.tar.zip || $(MAKE) fetch-gutenberg
	docker run -d --name webtorrent-gutenberg --restart unless-stopped \
		-v $$(pwd):/data:ro -p 6881:6881 -p 6881:6881/udp \
		webtorrent-hybrid seed /data/gutenberg-txt-files.tar.zip

seed-stop:
	docker stop webtorrent-gutenberg && docker rm webtorrent-gutenberg

seed-logs:
	docker logs -f webtorrent-gutenberg
