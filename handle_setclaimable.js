const handle_setclaimable = async (message, postgresPool) => {
	let postgresClient = null;

	try{
		const first_receiver = JSON.parse(message).receiver;
		if(first_receiver != "waxdaobacker") return;	

		postgresClient = await postgresPool.connect();
		
		let assets_to_update = JSON.parse(message).data.assets_to_update;	

		for(const nft of assets_to_update){
			try{
				const query = 'DELETE FROM burn_queue WHERE asset_id = $1 RETURNING asset_id;'

				const res = await postgresClient.query(query, [nft.asset_id]);

				if(res.rows.length !== 0){
					console.log(res.rows[0].asset_id + ' deleted')
				}
			} catch (e) {
				console.log(`error removing from burn_queue: ${e}`)
			}
		}

	} catch (e) {
		console.log(`error handling setclaimable: ${e}`)
	} finally {
        if (postgresClient) {
            postgresClient.release();
        }
    }
}

module.exports = {
	handle_setclaimable
}