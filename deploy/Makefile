.PHONY: caddy-reload caddy-validate caddy-status

caddy-validate:
	@echo "🔍 Validating Caddyfile..."
	caddy validate --config Caddyfile

caddy-reload: caddy-validate
	@echo "🔄 Reloading Caddy configuration..."
	sudo systemctl reload caddy
	@echo "✅ Caddy reloaded!"

caddy-status:
	@echo "📊 Caddy status:"
	sudo systemctl status caddy --no-pager
