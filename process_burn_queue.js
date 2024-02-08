const axios = require('axios');
const config = require('./config.json');
const { submitSetClaimableTx } = require('./submit-setclaimable-tx');
const { submitSetClaimableTxWithWharf } = require('./submit-tx-wharf')

const process_burn_queue = async (postgresPool) => {
  let postgresClient = null;

  try {

    postgresClient = await postgresPool.connect();

    const queryText = `
      SELECT asset_id, owner FROM burn_queue
      WHERE processed_state = 0
        OR (processed_state = 1 AND time_submitted <= (NOW() - INTERVAL '4 minutes'))
      LIMIT 100;
    `;
    const res = await postgresClient.query(queryText);
  	
    if(res.rows.length !== 0){
    	let confirmedMatches = await getOwnerMatches(res.rows);

    	if(confirmedMatches.length > 0){
    		try{
    			let formattedData = [];
    			for(const m of confirmedMatches){
    				formattedData.push({claimer: m.owner, asset_id: m.asset_id})
    			}

        //give the tx 5 seconds before considering it failed
				const timeoutLength = 5000;
				const txResult = await submitSetClaimableTxWithWharf(formattedData, timeoutLength);

				if(txResult){
					for(const match of confirmedMatches){
						try{
						    const txQueryText = `
						      UPDATE burn_queue
						      	SET processed_state = $1, time_submitted = $2
						      	WHERE asset_id = $3
						    `;
						    const txValues = [1, new Date(), match.asset_id]
						    const txRes = await postgresClient.query(txQueryText, txValues);
						} catch (e) {
							console.log(`error updating processed_state: ${e}`)
						}
					}
          console.log(`submitted a tx for ${confirmedMatches.length} assets`)
				}	
    		} catch (e) {
    			console.log(`error trying txResult: ${e}`)
    		}
    	}
    }

  } catch (error) {
    console.log(`error with burn_queue: ${error}`);
  } finally {
        if (postgresClient) {
            postgresClient.release();
        }
    }	
}

const getAssetInfo = async (endpoint, assetIds) => {
  try {
    const response = await Promise.race([
      axios.get(`${endpoint}/atomicassets/v1/assets?ids=${assetIds.join("%2C")}&page=1&limit=100&order=desc&sort=asset_id`),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
    ]);

    return response.data;
  } catch (error) {
    console.error(`Error fetching data from ${endpoint}: ${error.message}`);
    return null;
  }
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const getOwnerMatches = async (rows) => {
  const assetIds = rows.map(row => row.asset_id);
  const confirmedMatches = [];

  let result = null;

  for (const endpoint of config.atomicassets.endpoints) {
    try {
      result = await getAssetInfo(endpoint, assetIds);

      if (result && result.data && result.data.length > 0) {
        break;
      }
    } catch (error) {
      console.error(`Error processing data from ${endpoint}: ${error.message}`);
      continue;
    }
  }

  if (result && result.data && result.data.length > 0) {
    const assets = result.data;

    for (const row of rows) {
      const matchingAsset = assets.find(asset =>
        asset.burned_by_account === row.owner && asset.asset_id.toString() === row.asset_id
      );

      if (matchingAsset) {
        confirmedMatches.push(row);
      }
    }
  }

  console.log("confirmedMatches:")
  console.log(confirmedMatches)
  return confirmedMatches;
};

module.exports = {
	process_burn_queue
}

