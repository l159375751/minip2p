
.PHONY: deploy

deploy:
	git add index.html poc*/index.html poc*/GUTINDEX.ALL.new
	git diff --cached --quiet || git commit -m "Deploy updates"
	git push
	ssh 0x6du 'cd /var/www/minip2p && git pull'
