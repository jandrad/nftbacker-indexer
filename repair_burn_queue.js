const { Pool } = require('pg');
const axios = require('axios');
const config = require('./config.json');
const { submitSetClaimableTxWithWharf } = require('./submit-tx-wharf')

const postgresPool = new Pool({
    user: config.postgres.user,
    host: config.postgres.host,  
    database: config.postgres.database, 
    password: config.postgres.password, 
    port: config.postgres.port,      
    max: config.postgres.max,      
});


const repair_burn_queue = async () => {
  let postgresClient = null;

  try {

    postgresClient = await postgresPool.connect();

    /*
    const queryText = `
      SELECT * FROM backed_nfts WHERE is_burned = 0;
    `;
    */

    const queryText = `
      SELECT * FROM backed_nfts;
    `;    
    
    const res = await postgresClient.query(queryText);
    
    if(res.rows.length !== 0){
      console.log(res.rows.length + " rows found")
      let confirmedMatches = await getOwnerMatches(res.rows, postgresClient);


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
  const batchSize = 500;
  const batchedAssetIds = [];

  // Split assetIds into batches of 500
  for (let i = 0; i < assetIds.length; i += batchSize) {
    batchedAssetIds.push(assetIds.slice(i, i + batchSize));
  }

  try {
    const responses = await Promise.all(batchedAssetIds.map((batch) => 
      Promise.race([
        axios.get(`${endpoint}/atomicassets/v1/assets?ids=${batch.join("%2C")}&page=1&limit=500&order=desc&sort=asset_id`),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
      ])
    ));

    // Combine the results from all batches without changing the original structure
    const combinedData = responses.reduce((acc, response) => {
      // Assuming response.data is the object returned, merge it appropriately
      acc.data = acc.data.concat(response.data.data); 
      return acc;
    }, { data: [] }); // Initialize with the same structure

    return combinedData;
  } catch (error) {
    console.error(`Error fetching data from ${endpoint}: ${error.message}`);
    return null;
  }
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const getOwnerMatches = async (rows, postgresClient) => {
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
        asset.asset_id === row.asset_id
      );

      if(!matchingAsset.owner && matchingAsset.burned_by_account && matchingAsset.burned_by_account.length > 0){
        console.log("Asset " + matchingAsset.asset_id + " was burned by " + matchingAsset.burned_by_account)

        const asset_id = matchingAsset.asset_id;
        const owner = matchingAsset.burned_by_account;
        const is_burned = 1;
        confirmedMatches.push({asset_id: asset_id, owner: owner})

        const fixQuery = `
          UPDATE backed_nfts SET owner = $1, is_burned = $2 WHERE asset_id = $3;
        `;
        const fixValues = [owner, is_burned, asset_id];
        const fixRes = await postgresClient.query(fixQuery, fixValues);

      }

    }
  }

  return confirmedMatches;
};

repair_burn_queue();

module.exports = {
  repair_burn_queue
}

