const handle_logremaining = async (message, postgresPool) => {
	let postgresClient = null;

	try{
		const first_receiver = JSON.parse(message).receiver;
		if(first_receiver != "waxdaobacker") return;	
		
		postgresClient = await postgresPool.connect();

		let asset_id = JSON.parse(message).data.asset_id;	
		let remaining = JSON.parse(message).data.backed_tokens;	

		let global_sequence = JSON.parse(message).receipt.global_sequence;

		try{
			const query = 
				`UPDATE backed_nfts 
					SET backed_tokens = $1, 
						last_updated_global_sequence = $2 ,
						unique_tokens = $3
					WHERE asset_id = $4
					RETURNING asset_id;`

			const values = [JSON.stringify(remaining), global_sequence, remaining.length, asset_id]
			const res = await postgresClient.query(query, values);
			if(res.rows.length !== 0){
				console.log('remaining for ' + asset_id + ' updated')
			}
		} catch (e) {
			console.log(`error updating remaining: ${e}`)
		}
		

	} catch (e) {
		console.log(`error handling logremaining: ${e}`)
	} finally {
        if (postgresClient) {
            postgresClient.release();
        }
    }
}

module.exports = {
	handle_logremaining
}