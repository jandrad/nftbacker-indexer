const config = require('./config.json');
const { createTransferObject } = require('./helpers');

/** @handle_nft_transfer
 *  in order to keep operations atomic and prevent conflicts in redis cache,
 *  we use the `NX` and `EX` parameters to make sure this function only runs 
 *  if the `process_pending` function is not currently using the redis key
 */

const handle_nft_transfer = async (message, client) => {
	while (true) {
		try {
			const first_receiver = JSON.parse(message).receiver;
			if (first_receiver !== "atomicassets") return;

			const isBusy = await client.set(config.redis.busy_flag_key, 'true', {NX: true, EX: 5});

			if (isBusy === 0) {			
				await new Promise(resolve => setTimeout(resolve, 1000));
				continue;
			}

			try {
				let asset_ids = JSON.parse(message).data.asset_ids;
				let global_sequence = JSON.parse(message).receipt.global_sequence;
				let owner = JSON.parse(message).data.to;

				for (const nft of asset_ids) {
					try {
						await client.rPush(config.redis.transfers_key, createTransferObject(nft, global_sequence, owner));
					} catch (e) {
						console.log("error with redis push: " + e);
					}
				}
			} finally {
				await client.del(config.redis.busy_flag_key);
			}
			break;
		} catch (e) {
			console.log('error handling nft transfer: ' + e);			
			break;
		}
	}
}

module.exports = {
	handle_nft_transfer
}
