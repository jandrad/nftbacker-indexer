## Still under construction

This is a Node JS app that serves as an indexer, and an oracle for the [waxdaobacker](https://waxblock.io/account/waxdaobacker) contract.

I manage the app with pm2:

- pm2 start index.js --name "NftBacker-Indexer" && pm2 logs "NftBacker-Indexer"

But feel free to run it as a service instead if you like.

## Note

You need to set up a config.json file in the project root with your preferred settings. I've included a sample example.config.json file as a template.

## How It Works

The app reads **irreversible** data from a SHIP, using [Thalos](https://thalos.waxsweden.org/) (Thanks sweden)

When instant finality is available on WAX, this time period awaiting irreversibility will be much less of a burden in terms of UX.

We use a combination of Redis and Postgres to temporarily cache, and then index data related to transfers, burns, and NFT backing.

Every 15 seconds (you can adjust this if you want to run an oracle), the queue of burned assets will be queried from postgres.

If there are assets that need to be marked as 'claimable' on-chain, the app does the following:

* Use axios to fetch the relevant asset data from atomicassets API, just to double check that our postgres data matches what atomicassets has.

* For any assets where the match is confirmed, add these assets into an array.

* Submit the confirmed matches to the chain (using [wharfkit](https://wharfkit.com/)), and update their state in the postgres table

* Once the irreversible [setclaimable](https://waxblock.io/account/waxdaobacker?action=setclaimable#contract-actions) transaction comes into Thalos from our SHIP, we can then remove each asset_id from our queue.

Feel free to implement your own logic here if you'd like to add other checks, use other libraries etc.

The structure/setup of the postgres tables is available in the [postgres file](https://github.com/mdcryptonfts/nftbacker-indexer/blob/main/postgres.md)

If you have any questions or suggestions, you know where to find me.

If you'd like to make some code improvements, feel free to submit a PR.