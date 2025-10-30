
.PHONY: deploy fetch-gutenberg

deploy:
	git add index.html poc*/index.html poc*/GUTINDEX.ALL.new
	git diff --cached --quiet || git commit -m "Deploy updates"
	git push
	ssh 0x6du 'cd /var/www/minip2p && git pull'

fetch-gutenberg:
	@echo "Downloading Gutenberg complete text collection (10.9GB)..."
	wget -c -O gutenberg-txt-files.tar.zip https://www.gutenberg.org/cache/epub/feeds/txt-files.tar.zip
	@echo "Calculating SHA256 checksum..."
	sha256sum gutenberg-txt-files.tar.zip > gutenberg-txt-files.tar.zip.sha256
	@echo "Adding to .gitignore..."
	@grep -qxF "gutenberg-txt-files.tar.zip" .gitignore || echo "gutenberg-txt-files.tar.zip" >> .gitignore
	@echo "Done! File saved as gutenberg-txt-files.tar.zip"
	@echo "SHA256: $$(cat gutenberg-txt-files.tar.zip.sha256)"
