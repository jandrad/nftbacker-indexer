const config = require('./config.json');

const handle_logburnasset = async (message, postgresPool) => {
	let postgresClient = null;

	try{
		const first_receiver = JSON.parse(message).receiver;
		if(first_receiver != "atomicassets") return;

		postgresClient = await postgresPool.connect();

		let asset_id = JSON.parse(message).data.asset_id;
		let global_sequence = JSON.parse(message).receipt.global_sequence;
		let owner = JSON.parse(message).data.asset_owner;

		if(config.contract_ignore_list.includes(owner)) return;

		console.log(`${owner} burned asset ${asset_id}`)

		try{
			const query = `
				UPDATE backed_nfts 
					SET owner = $1, last_updated_global_sequence = $2, is_burned = $3
					WHERE asset_id = $4
					RETURNING asset_id
			`; 				

		    const values = [owner, global_sequence, 1, asset_id];

		    try {
		        const result = await postgresClient.query(query, values);
		        if(result.rows.length !== 0){
		        	console.log('updated burned asset ' + asset_id);

					try {
						const insertQuery = `
						  INSERT INTO burn_queue(asset_id, owner, processed_state, time_submitted)
						  VALUES ($1, $2, $3, $4)
						`;
						const insertValues = [asset_id, owner, 0, new Date()];
						const insertResult = await postgresClient.query(insertQuery, insertValues);
						//console.log(res.rows[0]);
					} catch (error) {
						console.log(`error inserting into burn_queue: ${error}`);
					}		        	

		        }
		    } catch (err) {
		        console.error(`Error executing UPDATE query: ${err}`);
		    }

		} catch (e) {
			console.log("error with logburn: " + e);
		}
	
	} catch (e) {
		console.log('error handling logburnasset: ' + e);
	} finally {
        if (postgresClient) {
            postgresClient.release();
        }
    }
}

module.exports = {
	handle_logburnasset
}