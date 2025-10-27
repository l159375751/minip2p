.PHONY: serve

serve:
	@ip addr show | grep "inet " | head -n2
	cd .. && python3 -m http.server 8001
