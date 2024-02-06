## Still under construction

This is a Node JS app that serves as an indexer, and an oracle for the [waxdaobacker](https://waxblock.io/account/waxdaobacker) contract.

It reads **irreversible** data from a SHIP, using [Thalos](https://thalos.waxsweden.org/) (Thanks sweden)

When instant finality is available on WAX, this time period awaiting irreversibility will be much less of a burden in terms of UX.

The node app uses a combination of Redis and Postgres to temporarily cache, and then index data related to transfers, burns, and NFT backing.

Every 15 seconds (you can adjust this if you want to run an oracle), the queue of burned assets will be queried from postgres.

If there are assets that need to be marked as 'claimable' on-chain, a transaction will be submitted via eosjs.

As a secondary measure, I fetch the relevant asset data from atomicassets API, just to double check that my data matches what atomicassets has. 

This requires axios in my case.

Feel free to implement your own logic here if you'd like to add other checks, use other libraries etc.

The structure/setup of the postgres tables is available in the [postgres file](https://github.com/mdcryptonfts/nftbacker-indexer/blob/main/postgres.md)

If you have any questions or suggestions, you know where to find me.

If you'd like to make some code improvements, feel free to submit a PR.