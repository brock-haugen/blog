---
title: Moving to Web3
date: 2021-12-30
---

# This site is now hosted via web3 :rocket:

To accomplish this:

1. runninyeti.eth was registered via [ENS](https://ens.domains)
2. haugen.io was registered via [domains.google](https://domains.google)
3. [fleek](https://fleek.co) is leveraged for deployments to [IPFS](https://ipfs.io)
4. the IPNS hash for this site (`k51qzi5uqu5dlnimeccxdu14s7neocr0bdhkf8408x7ce69ppcohic94dzavt7`) was assigned as the content hash for runninyeti.eth
5. brock.haugen.io was assigned as a custom domain (via CNAME record) in fleek

## tl;dr

fleek deployments upload all built files to IPFS and [E/D]NS resolves to the related IPNS hash
