const { Pool } = require('pg');
const config = require('./config.json');
const redis = require('redis');
const { handle_nft_transfer } = require('./handle_nft_transfer')
const { process_pending } = require('./process_pending');
const { handle_back_nft } = require('./handle_back_nft');
const { handle_logburnasset } = require('./handle_logburnasset');
const { process_burn_queue } = require('./process_burn_queue');
const { handle_setclaimable } = require('./handle_setclaimable');
const { handle_logremaining } = require('./handle_logremaining');
const { handle_logbackasset } = require('./handle_logbackasset');

const postgresPool = new Pool({
    user: config.postgres.user,
    host: config.postgres.host,  
    database: config.postgres.database, 
    password: config.postgres.password, 
    port: config.postgres.port,      
    max: config.postgres.max,      
});

const runApp = async () => {
    const client = redis.createClient({host: config.redis.host, port: config.redis.port});
    await client.connect();

	const subscriber = client.duplicate();
	await subscriber.connect();

	console.log("All connections established")

	await subscriber.subscribe('ship::wax::actions/contract/atomicassets/name/transfer', async (message) => {
		await handle_nft_transfer(message, client);
	})	

	await subscriber.subscribe('ship::wax::actions/contract/atomicassets/name/logburnasset', async (message) => {
		await handle_logburnasset(message, postgresPool);
	})		

	await subscriber.subscribe('ship::wax::actions/contract/waxdaobacker/name/setclaimable', async (message) => {
		await handle_setclaimable(message, postgresPool);
	})	

	await subscriber.subscribe('ship::wax::actions/contract/waxdaobacker/name/logbackasset', async (message) => {
		await handle_logbackasset(message, postgresPool);
	})	

	await subscriber.subscribe('ship::wax::actions/contract/waxdaobacker/name/logremaining', async (message) => {
		await handle_logremaining(message, postgresPool);
	})							      

	/** @process_pending
	 *  every 10 seconds, take the list of transfers from redis cache and push them into
	 *  the postgres table
	 */
	setInterval(() => process_pending(client, postgresPool), 10000);

	/** @process_burn_queue
	 *  every 15 seconds, check the list of queued assets that need to be pushed to the
	 *  blockchain. If any exist, submit the transaction.
	 */
	setInterval(() => process_burn_queue(postgresPool), 15000);

	/** @postgres_details
	 *  for debugging purposes, remove for production
	 */

	/*
	setInterval(() => {
	    console.log(`Total clients: ${postgresPool.totalCount}`);
	    console.log(`Idle clients: ${postgresPool.idleCount}`);
	    console.log(`Waiting clients: ${postgresPool.waitingCount}`);
	}, 10000); 
	*/


    process.on('SIGINT', () => {
        client.quit();
        subscriber.quit();
        process.exit();
    });	
	
};

runApp();