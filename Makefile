
.PHONY: deploy

deploy:
	# git add poc1/index.html poc2/index.html poc3/index.html poc4beta/index.html
	git add poc5/index.html
	git diff --cached --quiet || git commit -m "Deploy updates"
	git push
	ssh 0x6du 'cd /var/www/minip2p && git pull'
