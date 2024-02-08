const { extractFirstPart, extractSecondPart, getPrecionFromAsset } = require('./helpers');

const handle_logbackasset = async (message, postgresPool) => {
	let postgresClient = null;
	
	try{
		const first_receiver = JSON.parse(message).receiver;
		if(first_receiver != "waxdaobacker") return;	

		try{
			postgresClient = await postgresPool.connect();
		} catch (e) {
			console.log(`could not connect to postgres: ${e}`)
		}
		
		let data = JSON.parse(message).data;

		let tokens_to_back = data.tokens_to_back;
		const unique_tokens = data.tokens_to_back.length;
		const asset_id = data.asset_id;
		const backer = data.backer;
		const owner = data.asset_owner;
		const collection_name = data.collection_name;
		const schema_name = data.schema_name;
		const template_id = data.template_id;
		const global_sequence = JSON.parse(message).receipt.global_sequence;
		console.log(backer + " is backing asset " + asset_id + ", owned by " + owner);

		for(const t of tokens_to_back){
            t.decimals = getPrecionFromAsset(t.quantity);		
		}

		const upsertQuery = `
			INSERT INTO backed_nfts 
				(asset_id, owner, backed_tokens, last_updated_global_sequence, is_burned, unique_tokens, 
					collection_name, schema_name, template_id) 
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		    ON CONFLICT (asset_id) DO UPDATE SET 
		        backed_tokens = EXCLUDED.backed_tokens, 
		        last_updated_global_sequence = EXCLUDED.last_updated_global_sequence, 
		        unique_tokens = EXCLUDED.unique_tokens,
		        collection_name = EXCLUDED.collection_name, 
		        schema_name = EXCLUDED.schema_name, 
		        template_id = EXCLUDED.template_id
		    RETURNING asset_id;
		`; 		

		const values = [asset_id, owner, JSON.stringify(tokens_to_back), global_sequence, 0, unique_tokens, collection_name, schema_name, template_id];

		try {
		    const result = await postgresClient.query(upsertQuery, values);
		    if (result.rows.length > 0) {
		        console.log("upsert worked for asset " + asset_id);
		    } else {
		        console.log("upsert didn't work for asset " + asset_id);
		    }
		} catch (e) {
		    console.log('Error executing upsert query:', e);
		}

	} catch (e) {
		console.log('error handling logbackasset: ' + e);
	} finally {
        if (postgresClient) {
            postgresClient.release();
        }
    }
}

module.exports = {
	handle_logbackasset
}