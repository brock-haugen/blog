---
title: Project Paris
date: 2021-10-27
tags: Bridgetown Collective, projects, NFTs, blockchain
image: /images/drrt.jpg
---

### tl;dr

#### Current State (Nov 29th, 2021)

- ETH (geth) nodes
  - "Primary" one running on laptop in the office
  - "Secondary" one syncing on a $80/m Digital Ocean server (intended to be used for backfill)
  - Replacement for the laptop on its way as a powerful desktop (16 core, 64 GB RAM)
- 2 Raspberry Pis running workers to sync blocks, collections, and metadata in "realtime"
- 1 Heroku instance running the API / GraphQL setup
  - Also includes an image compression endpoint
  - GraphQL endpoints are protected by _really_ basic header auth
- All data stored in a hosted (Atlas) Mongodb instance
- Queuing via a hosted (Digital Ocean) Redis instance
- Base set of UI components exposed via npm - [@bridgetown-collective/paris](https://www.npmjs.com/package/@bridgetown-collective/paris)
  - Currently in use for a secret "Secret Santa" project
- Stood up ipfs.bridgetowncollective.com in anticipation of productionalizing the system
- Paris has a basic UI that can be reached at the paris.bridgetowncollective.com domain
  - e.g. [a lizard of mine](https://paris.bridgetowncollective.com/nfts/0x9048de699869385756939a7bb0a22b6d6cb63a83/743)

## Nov 29th, 2021

The laptop geth node has been notably stable (except when I tried to backfill ETH data and overloaded it...). That coupled with a single RPI instance seem to be easily capable of keeping up with incoming blocks / NFT transfers.

Of other note, there is now an official [NPM package](https://www.npmjs.com/package/@bridgetown-collective/paris) for Paris 🎉. This is a very early stage to this so breaking changes are expected. Currently can be used as follows:

```javascript
import { NFTCard } from "@bridgetown-collective/paris";

...

const Component = () => {
  ...
  return (
    ...
    <NFTCard contractAddress="0x9048de699869385756939a7bb0a22b6d6cb63a83" tokenId="743" />
    ...
  );
}
```

The above will handle loading the NFT data from Paris, auto refreshing the metadata if none is found, requesting the NFT iamge, and displaying all the information on screen.

## Nov 8th, 2021

The RPI geth node is still trying to sync, but is at least auto-restarting itself as needed. As a backup though, Ubuntu is now install on an old Dell XPS 13 (a fantastic development laptop) and a secondary geth node is fully synced there. Which means the local `worker` is also pointed at the XPS and I'm able to take my public geth node offline - we're fully private now 🤘

Side note, service worked great for turning off the laptop screen without putting the computer to sleep: [https://askubuntu.com/questions/1244358/ubuntu-20-04-server-turn-off-screen-until-i-press-a-key](https://askubuntu.com/questions/1244358/ubuntu-20-04-server-turn-off-screen-until-i-press-a-key).

## Nov 4th, 2021

I've added [`pm2`](https://pm2.keymetrics.io/) and [Sentry](https://sentry.io) to the worker and deployed it in "production" (aka on a local RPI server also running IPFS as a daemon service).

With this, we're now getting pretty clean error reporting and performance metrics (although only 5% of events are sampled for performance to stay within the free tier at Sentry 🤘).

![](/images/paris_sentry.png)

Separately, the geth service seems to have managed to take down the RPI that its running on. I'm continuing to fight geth memory management (I think?) and am not sure the next steps here.

## Oct 27th, 2021: Catching up

This is the first date that I actually added anything to this blog post, so everything previous is terribly succinct (and probably wouldn't have been followable anyhow).

Currently there's a small RPI cluster running my office: 1 RPI is attempting to sync a geth node and 1 is running a worker to index the Ethereum blockchain.

### Geth Syncing

I've been having trouble keeping geth alive - it would attempt to sync, run for a while, and then eventually the RPI would become completely unresponsive and require a reboot. Previously there had also been power supply issues to the external SSD, but I believe those are resolved now using a powered USB hub (still getting read/write speeds of > 200 mb/s when testing with `dd if=/dev/zero of=/mnt/ssd/deleteme.dat bs=32M count=64 oflag=direct` on the RPI).

So, I wiped the `chaindata` from the SSD and have started over. I followed some of the great suggestion in [this article](https://greg.jeanmart.me/2020/02/23/running-an-ethereum-full-node-on-a-raspberrypi-4-/) to optimize the server a bit, and now have geth running in a tmux window using this command:

```bash
$ geth --datadir=/mnt/ssd/ethereum --cache=256 --syncmode=fast
```

So far so good 🤷‍♀ . As of writing, the geth node is currently synced to block `1961019` after just a couple hours - which can be checked by running the following on the RPI:

```bash
$ geth --data-dir=/mnt/ssd/ethereum attach
> eth.syncing
{
  currentBlock: 1961019,
  highestBlock: 13500378,
  knownStates: 12076009,
  pulledStates: 11853929,
  startingBlock: 0
}
```

The plan is to leave that running in a `tmux` window for now and establish an `ngrok` tunnel to monitor this from afar overnight (e.g. via `ssh`).

(Side note - I need to figure out how to properly add :emojis: to these posts)

### Worker Setup

On the other RPI, an IPFS server is running (simply `ipfs daemon` in a `tmux` window for now) and the `worker` instance of Project Paris is running alongside it. This worker, is setup to do the following:

1. Listen for new block headers via a websocket connection to an ETH node (currently pointed at the fully synced Digital Ocean node)
2. Queue new block numbers for processing
3. Process those new blocks by doing the following:

   - Get the block timestamp via web3:

   ```typescript
   const timestamp = (await web3HTTP.eth.getBlock(blockNumber)).timestamp;
   ```

   - Get the block logs with the `Transfer` event signature:

   ```typescript
   const allTransferLogs = await web3HTTP.eth.getPastLogs({
     fromBlock: blockNumber,
     toBlock: blockNumber,
     topics: [
       web3HTTP.eth.abi.encodeEventSignature(
         "Transfer(address,address,uint256)",
       ),
     ],
   });
   ```

   - Filter those logs to only ERC 721 events - e.g. all 3 event parameters are indexed:

   ```typescript
   const filteredLogs = allTransferLogs.filter(
     (log) => log.topics.length === 4,
   );
   ```

   - Then decode those logs using:

   ```typescript
   const decodedLog = web3HTTP.eth.abi.decodeLog(
     [
       {
         indexed: true,
         internalType: "address",
         name: "from",
         type: "address",
       },
       {
         indexed: true,
         internalType: "address",
         name: "to",
         type: "address",
       },
       {
         indexed: true,
         internalType: "uint256",
         name: "tokenId",
         type: "uint256",
       },
     ],
     log.data,
     log.topics.slice(1),
   );
   ```

   - And finally put it altogether into defined types (collections, transfer events, transactions, blocks) that can be upserted into MongoDB - e.g. the block sync can be repeated and result in the same data being created / saved
   - Transfer events are then mapped to `contractAddress` + `tokenId` values which are finally placed in a metadata queue

4. The metadata queue then picks up NFT identifiers (`contractAddress` + `tokenId`) and tries loading in and storing the metadata for the NFT
   - lots of edge cases here around rate limiting, handling IPFS URIs, etc

All this seems to be working well so far and the 8gb RPI appears to have no problem keeping up with running and IPFS node while simultaneously syncing the latest ETH blocks. Since all of this data is ultimately stored in MongoDB, a separate `api` instance can be started which leads to the following being enabled:

```bash
$ curl localhost:3001/stats | python -m json.tool
  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
                                 Dload  Upload   Total   Spent    Left  Speed
100   163  100   163    0     0    408      0 --:--:-- --:--:-- --:--:--   408
{
    "counts": {
        "collections": 1477,
        "nft": 46159
    },
    "queues": {
        "blocks": 0,
        "metadata": 0
    },
    "syncStatus": {
        "firstBlock": 13490702,
        "lastBlock": 13501031,
        "latestWeb3Block": 13501062
    }
}
```

## Oct 23rd - Oct 26th, 2021

Firebase has proven to be unreliable... Google drops Firebase function calls if there's a significant spike in usage which means a large percentage of NFT metadata is never processed. Not to mention, the first pass at the actual business logic of fetching NFT data is rudimentary at best - a new refactor takes place to remove Firebase and instead run the code via "deployed" Node.js servers

## Oct 9th - 19th, 2021

Code is totally refactored (a few times), "devops" is put in place (i.e. automatic deployments to Firebase functions), a dedicated Ethereum node is established on a Digital Ocean droplet, and the first proper sync of the blockchain is kicked off. Still lots of code running on my laptop + new Digital Ocean droplets to backfill data.

## Oct 8th, 2021

Boredom strikes, money is ~~wasted~~ spent on NFTs, desire to track NFTs surfaces. The first code is written that begins syncing with the Ethereum blockchain and storing data in Firebase. Code at this point is not "deployed" and is instead running on my laptop pointing at an Infura ETH node.

Rate limiting very quickly ensues...

## Sometime earlier in 2021

A Raspberry PI cluster was purchased with the hopes of running a geth node and an IPFS (on separate RPIs):

Purchase links:

- [1 TB SSD](https://www.amazon.com/gp/product/B08V83JZH4/ref=ppx_yo_dt_b_asin_title_o00_s00?ie=UTF8&psc=1) - for IPFS
- [2 TB SDD](https://www.amazon.com/gp/product/B07MFZXR1B/ref=ppx_yo_dt_b_asin_title_o07_s00?ie=UTF8&psc=1) - for geth (slight overkill)
- [Ethernet Cables](https://www.amazon.com/gp/product/B001VPKKRQ/ref=ppx_yo_dt_b_asin_title_o08_s00?ie=UTF8&psc=1)
- [Micro SD Card](https://www.amazon.com/gp/product/B06XWN9Q99/ref=ppx_yo_dt_b_asin_title_o09_s00?ie=UTF8&psc=1) x2
- [Raspberry Pi 4 8gb](https://www.canakit.com/raspberry-pi-4-8gb.html) x2
- [RPI Cluster Case](https://www.amazon.com/gp/product/B07PV6T91Z/ref=ppx_yo_dt_b_asin_title_o00_s01?ie=UTF8&psc=1)
- [USB -> USB-C](https://www.amazon.com/gp/product/B096Z7ZP8X/ref=ppx_yo_dt_b_asin_title_o00_s01?ie=UTF8&psc=1) - for power
- [USB Power Hub](https://www.amazon.com/gp/product/B00YRYS4T4/ref=ppx_yo_dt_b_asin_title_o00_s00?ie=UTF8&psc=1)
- [USB-C -> NVMe](https://www.amazon.com/gp/product/B07N48N5GR/ref=ppx_yo_dt_b_asin_title_o07_s00?ie=UTF8&psc=1) x2

Total cluster cost: ~$800
