---
title: Moving to Web3
date: 2021-12-30
---

# This site is now hosted via web3 :rocket:

To accomplish this:

1. haugen.io is registered via Cloudflare
2. The CNAME record for brock.haugen.io is set to cloudflare-ipfs.com
3. The TXT record for \_dnslink.brock.haugen.io is set to the current IPFS hash of this blog
4. Deployments happen locally via [ipfs-deploy](https://github.com/ipfs-shipyard/ipfs-deploy) which pins data to Pinata and adjusts the Cloudflare record for 3 accordingly

See more from Cloudflare [here](https://developers.cloudflare.com/distributed-web/ipfs-gateway/connecting-website)
