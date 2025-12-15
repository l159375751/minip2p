# Makefile

#COMPOSE ?= docker compose
#STACK   ?= docker-compose.yml
SVC     ?= stun

.PHONY: stun-up stun-down stun-restart stun-logs stun-ps

stun-up:
	echo $(COMPOSE) -f $(STACK) up -d $(SVC)
	docker run -d --name stun --restart unless-stopped \
		  --network host \
		    -v "$$PWD/turnserver.conf:/etc/coturn/turnserver.conf:ro" \
		      coturn/coturn:4.6.3 \
		        -n -S -c /etc/coturn/turnserver.conf -v

stun-down:
	$(COMPOSE) -f $(STACK) down

stun-restart:
	$(COMPOSE) -f $(STACK) restart $(SVC)

stun-logs:
	$(COMPOSE) -f $(STACK) logs -f --tail=200 $(SVC)

stun-ps:
	$(COMPOSE) -f $(STACK) ps

