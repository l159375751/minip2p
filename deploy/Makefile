.PHONY: caddy-reload caddy-validate caddy-status caddy-install

caddy-validate:
	@echo "🔍 Validating Caddyfile..."
	caddy validate --config Caddyfile

caddy-install:
	@echo "📋 Installing Caddyfile to /etc/caddy/Caddyfile..."
	sudo cp Caddyfile /etc/caddy/Caddyfile
	@echo "✅ Caddyfile installed!"

caddy-reload: caddy-validate caddy-install
	@echo "🔄 Reloading Caddy configuration..."
	sudo systemctl reload caddy
	@echo "✅ Caddy reloaded!"

caddy-status:
	@echo "📊 Caddy status:"
	sudo systemctl status caddy --no-pager
