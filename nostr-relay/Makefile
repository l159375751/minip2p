.PHONY: setup build run stop clean

data:
	mkdir -p data

nostr-rs-relay:
	git clone git@github.com:scsibug/nostr-rs-relay.git

config.toml:
	wget https://raw.githubusercontent.com/scsibug/nostr-rs-relay/refs/heads/master/config.toml

index.html:
	echo "tbd" > index.html

build:
	cd nostr-rs-relay && docker build --pull -t nostr-rs-relay .

run: setup build
	docker run -d --name nostr-relay --restart unless-stopped \
		-p 7000:8080 \
		--mount src=$(PWD)/config.toml,target=/usr/src/app/config.toml,type=bind \
		--mount src=$(PWD)/data,target=/usr/src/app/db,type=bind \
		--mount src=$(PWD)/index.html,target=/usr/src/app/index.html,type=bind \
		nostr-rs-relay

stop:
	docker stop nostr-relay
	docker rm nostr-relay

logs:
	docker logs -f nostr-relay

setup: data nostr-rs-relay

