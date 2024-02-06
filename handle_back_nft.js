const { extractFirstPart, extractSecondPart } = require('./helpers');
const { postgresPool } = require('./environment');

const handle_back_nft = async (message) => {
	console.log("nft was backed");
	let postgresClient = null;
	
	try{
		const first_receiver = JSON.parse(message).receiver;
		if(first_receiver != "waxdaobacker") return;	

		const postgresClient = await postgresPool.connect();

		let data = JSON.parse(message).data;

		const tokens_to_back = data.tokens_to_back;
		const unique_tokens = data.tokens_to_back.length;
		const asset_id = data.asset_id;
		const owner = data.asset_owner;
		const global_sequence = JSON.parse(message).receipt.global_sequence;

		const insertQuery = `
			INSERT INTO backed_nfts 
				(asset_id, owner, backed_tokens, last_updated_global_sequence, is_burned, unique_tokens) 
				VALUES ($1, $2, $3, $4, $5, $6)
			ON CONFLICT (asset_id) DO NOTHING
			RETURNING asset_id;
		`; 		

		const insertResult = await postgresClient.query(insertQuery, [asset_id, owner, JSON.stringify(tokens_to_back), global_sequence, 0, unique_tokens]);

		if (insertResult.rows.length === 0) {
			console.log("insert failed, selecting and updating")
		    const selectQuery = `SELECT backed_tokens, last_updated_global_sequence FROM backed_nfts WHERE asset_id = $1;`;
		    const selectResult = await postgresClient.query(selectQuery, [asset_id]);		
		    
			if (selectResult.rows.length > 0) {
			    let currentTokens = selectResult.rows[0].backed_tokens;

			    const tokenMap = new Map(currentTokens.map(token => [`${token.token_contract}_${extractSecondPart(token.quantity, ' ')}`, token]));

			    for (const t of tokens_to_back) {
			        const tokenKey = `${t.token_contract}_${extractSecondPart(t.quantity, ' ')}`;
			        const existingToken = tokenMap.get(tokenKey);

			        if (existingToken) {
			            const currentAmount = parseFloat(extractFirstPart(existingToken.quantity, ' '));
			            const amountToAdd = parseFloat(extractFirstPart(t.quantity, ' '));
			            existingToken.quantity = `${currentAmount + amountToAdd} ${extractSecondPart(existingToken.quantity, ' ')}`;
			        } else {
			            currentTokens.push(t);
			            tokenMap.set(tokenKey, t);
			        }
			    }

			    const updateQuery = `UPDATE backed_nfts SET backed_tokens = $2, unique_tokens = $3 WHERE asset_id = $1;`;
			    await postgresClient.query(updateQuery, [asset_id, JSON.stringify(currentTokens), currentTokens.length]);
			}		    	
		} else {
			console.log("insert worked")
		}

	} catch (e) {
		console.log('error handling nft backing: ' + e);
	} finally {
        if (postgresClient) {
            postgresClient.release();
        }
    }
}

module.exports = {
	handle_back_nft
}