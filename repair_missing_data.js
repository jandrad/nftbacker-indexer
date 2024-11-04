const { Pool } = require('pg');
const config = require('./config.json');
const axios = require('axios');
const { extractFirstPart, extractSecondPart, getPrecionFromAsset } = require('./helpers');

const postgresPool = new Pool({
    user: config.postgres.user,
    host: config.postgres.host,  
    database: config.postgres.database, 
    password: config.postgres.password, 
    port: config.postgres.port,      
    max: config.postgres.max,      
});


const processBackedAssets = async (backed_assets, atomic_data) => {
  console.log("backed length: " + backed_assets.length)
  console.log("atomic length: " + atomic_data.length)

  for(const nft of backed_assets){
    const asset_id = nft.asset_id;
    const backed_tokens = JSON.stringify(nft.backed_tokens);
    const unique_tokens = nft.backed_tokens.length;
    let collection_name;
    let schema_name;
    let template_id;
    const is_burned = 0;
    let owner;
    let last_updated_global_sequence;

    let atomicDataWasFound = false;
    for(const a of atomic_data){
      if(a.asset_id && a.asset_id == nft.asset_id){

        owner = a.owner && a.owner.length > 0 ? a.owner : a.burned_by_account;
        last_updated_global_sequence = a.updated_at_block ? a.updated_at_block : 1;
        collection_name = a.collection.collection_name ? a.collection.collection_name : '';
        schema_name = a.schema.schema_name ? a.schema.schema_name : '';
        template_id = a.template.template_id ? a.template.template_id : -1;

        atomicDataWasFound = true;
        break;
      }
    }
    if(!atomicDataWasFound){
      console.log("didnt find shit for " + nft.asset_id);
    }

    const insertQuery = `
      INSERT INTO backed_nfts 
        (asset_id, owner, backed_tokens, last_updated_global_sequence, is_burned, unique_tokens, 
          collection_name, schema_name, template_id) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (asset_id) DO UPDATE SET 
            backed_tokens = EXCLUDED.backed_tokens, 
            unique_tokens = EXCLUDED.unique_tokens,
            collection_name = EXCLUDED.collection_name, 
            schema_name = EXCLUDED.schema_name, 
            template_id = EXCLUDED.template_id
        RETURNING asset_id;
    `;     

    const values = [asset_id, owner, backed_tokens, last_updated_global_sequence, is_burned, unique_tokens,
      collection_name, schema_name, template_id];

    let postgresClient = null;
    try{
      postgresClient = await postgresPool.connect();
    } catch (e) {
      console.log(`could not connect to postgres: ${e}`)
      return;
    }

    try {
        const insertRes = await postgresClient.query(insertQuery, values);
        if (insertRes.rows.length > 0) {
            console.log("upserted asset " + asset_id);
        }
    } catch (e) {
        console.log('Error executing upsert query:', e);
    } finally {
        if (postgresClient) {
            postgresClient.release();
        }      
    }
  }
};



const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));


let lower_bound = null;
let backed_assets = [];
let atomic_data = [];

const fetchBackedAssets = async () => {
  let continueFetching = true;

  while (continueFetching) {
    let success = false;

    for (let endpoint of config.chain_api.endpoints) {
      try {
        console.log(`Making a call to ${endpoint}`);

        const res = await axios.post(`${endpoint}/v1/chain/get_table_rows`, {
          json: true,
          code: 'waxdaobacker',
          scope: 'waxdaobacker',
          table: 'backednfts',
          lower_bound: lower_bound,
          limit: 500,
        });

        if (res.data.rows && res.data.rows.length > 0) {
          backed_assets = backed_assets.concat(res.data.rows);
          atomic_data = await getAtomicData(res.data.rows, atomic_data);
          success = true;
        } else {
          console.log('No rows');
        }

        if (res.data.more) {
          console.log("more")
          lower_bound = res.data.next_key;
        } else {
          continueFetching = false;
        }

        if (success) {
          break;
        }
      } catch (e) {
        console.log('\nCaught exception: ' + e);
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

};

const getAssetInfo = async (endpoint, assetIds) => {
  try {
    const response = await Promise.race([
      axios.get(`${endpoint}/atomicassets/v1/assets?ids=${assetIds.join("%2C")}&page=1&limit=500&order=desc&sort=asset_id`),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
    ]);

    return response.data;
  } catch (error) {
    console.error(`Error fetching data from ${endpoint}: ${error.message}`);
    return null;
  }
};

const getAtomicData = async (nfts, atomic_data) => {
  const assetIds = nfts.map(nft => nft.asset_id);

  let result = null;

  for (const endpoint of config.atomicassets.endpoints) {
    try {
      result = await getAssetInfo(endpoint, assetIds);

      if (result && result.data && result.data.length > 0) {
        atomic_data = atomic_data.concat(result.data)
        break;
      }
    } catch (error) {
      console.error(`Error processing data from ${endpoint}: ${error.message}`);
      continue;
    }
  }

  return atomic_data;
};


(async () => {
  try {
    await fetchBackedAssets();
    console.log("fetched backed assets");
    await processBackedAssets(backed_assets, atomic_data);
    process.exit();
  } catch (error) {
    console.error('Error in script:', error);
  }
})();


