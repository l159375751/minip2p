
IMAGE := aquatic-ws
NAME  := aquatic_ws

build:
	docker build -t $(IMAGE) .

run:
	docker run -d --name $(NAME) -p 3000:3000 -p 3001:3001 \
		--security-opt seccomp=unconfined \
		--ulimit memlock=-1:-1 --cap-add IPC_LOCK \
		-v "$$PWD/aquatic-ws-config.toml:/var/lib/aquatic/aquatic-ws-config.toml:ro" \
		-v "$$PWD/access-list.txt:/var/lib/aquatic/access-list.txt:ro" \
		$(IMAGE)



#--ulimit memlock=67108864:67108864 --cap-add IPC_LOCK \

rm:
	docker rm $(NAME)


stop:
	docker stop $(NAME)


restart: stop rm


	
