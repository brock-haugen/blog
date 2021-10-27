---
title: Project Paris
date: 2021-10-27
tags: Bridgetown Collective, projects, NFTs, blockchain
image: /images/drrt.jpeg
---

### tl;dr

#### Current State

- Working geth node in Digital Ocean
  - Hoping to replace it with a private node on a Raspberry PI soon
- Anything Firebase related is paused
- New `server` codebase in the works
  - Includes a `worker` for syncing
    - queues are implemented with Redis + Bull.js
  - Includes an `api` for checking sync status
  - Data is stored in `mongodb`

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
