

deploy:
	git add poc2/index.html ; git commit -m "foo" ; git push
	ssh 0x6du 'cd /var/www/minip2p; git pull'
