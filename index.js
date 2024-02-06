const redis = require('redis');
const { transfersKey } = require('./variables');
const { handle_nft_transfer } = require('./handle_nft_transfer')
const { process_pending } = require('./process_pending');
const { handle_back_nft } = require('./handle_back_nft');
const { handle_logburnasset } = require('./handle_logburnasset');
const { process_burn_queue } = require('./process_burn_queue');
const { handle_setclaimable } = require('./handle_setclaimable');
const { handle_logremaining } = require('./handle_logremaining');

const runApp = async () => {
    const client = redis.createClient({host: 'localhost', port: 6379});
    await client.connect();

	const subscriber = client.duplicate();
	await subscriber.connect();

	console.log("All connections established")

	await subscriber.subscribe('ship::wax::heartbeat', async (message) => {
		let blocknum = JSON.parse(message).blocknum;
	})	

	await subscriber.subscribe('ship::wax::actions/contract/atomicassets/name/transfer', async (message) => {
		await handle_nft_transfer(message, client);
	})	

	await subscriber.subscribe('ship::wax::actions/contract/atomicassets/name/logburnasset', async (message) => {
		await handle_logburnasset(message);
	})		

	await subscriber.subscribe('ship::wax::actions/contract/waxdaobacker/name/backnft', async (message) => {
		await handle_back_nft(message);
	})

	await subscriber.subscribe('ship::wax::actions/contract/waxdaobacker/name/setclaimable', async (message) => {
		await handle_setclaimable(message);
	})	

	await subscriber.subscribe('ship::wax::actions/contract/waxdaobacker/name/logremaining', async (message) => {
		await handle_logremaining(message);
	})							      

	/** @process_pending
	 *  every 10 seconds, take the list of transfers from redis cache and push them into
	 *  the postgres table
	 */
	setInterval(() => process_pending(client), 10000);

	/** @process_burn_queue
	 *  every 15 seconds, check the list of queued assets that need to be pushed to the
	 *  blockchain. If any exist, submit the transaction.
	 */
	setInterval(() => process_burn_queue(), 15000);

    process.on('SIGINT', () => {
        client.quit();
        subscriber.quit();
        process.exit();
    });	
	
};

runApp();