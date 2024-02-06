const { transfersKey, busyFlagKey } = require('./variables');
const { postgresPool } = require('./environment');


const process_pending = async (redisClient) => {
	let postgresClient = null;

	while (true) {
		try {
			const isBusy = await redisClient.set(busyFlagKey, 'true', { NX: true, EX: 5 });

			if (isBusy === null) {
				await new Promise(resolve => setTimeout(resolve, 1000));
				continue;
			}

			try {

				let transferData = await redisClient.lRange(transfersKey, 0, -1);
				await redisClient.del(transfersKey);

				if( (transferData && transferData.length > 0) ){
					try{
					    postgresClient = await postgresPool.connect();
					} catch (e) {
						console.log(`error connecting to postgresPool: ${e}`)
					}
				} else {
					console.log("Nothing to do ")
					return;
				}

				const query = `
					UPDATE backed_nfts 
						SET owner = $1, last_updated_global_sequence = $2 
						WHERE asset_id = $3
						RETURNING asset_id
				`; 	

				transferData = filterTransfers(transferData);

				for(const t of transferData){
					const t_JSON = JSON.parse(t)

				    const values = [t_JSON.owner, t_JSON.global_sequence, t_JSON.asset_id];

				    try {
				        const result = await postgresClient.query(query, values);
				        if(result.rows.length !== 0){
				        	console.log('updated ' + t_JSON.asset_id);
				        }
				    } catch (err) {
				        console.error(`Error executing UPDATE query: ${err}`);
				    }
				}

			} finally {
				await redisClient.del(busyFlagKey);
			}
			break; 
		} catch (e) {
			console.log(`error processing pending: ${e}`);
			break;
		}
	}

	if (postgresClient) {
		postgresClient.release();
	}
}

const filterTransfers = (transferData) => {
    const highestSequenceTransfers = new Map();

    transferData.forEach(transferJSON => {
        const transfer = JSON.parse(transferJSON);
        const { asset_id, global_sequence } = transfer;
        
        if (!highestSequenceTransfers.has(asset_id) || highestSequenceTransfers.get(asset_id).global_sequence < global_sequence) {
            highestSequenceTransfers.set(asset_id, transfer);
        }
    });

    return Array.from(highestSequenceTransfers.values()).map(transfer => JSON.stringify(transfer));
}

module.exports = {
	process_pending
}