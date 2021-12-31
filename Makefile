deploy:
	npm run build
	npm run export
	npx ipfs-deploy -u pinata -p infura -d cloudflare -t blog out
