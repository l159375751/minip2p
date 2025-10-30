

deploy:
	git add poc1/index.html ; git commit -m "foo" ; git push
	git add poc2/index.html ; git commit -m "foo" ; git push
	git add poc3/index.html ; git commit -m "foo" ; git push
	git add poc4beta/index.html ; git commit -m "foo" ; git push
	ssh 0x6du 'cd /var/www/minip2p; git pull'
