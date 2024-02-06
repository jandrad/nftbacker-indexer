const config = require('./config.json');
const { Api, JsonRpc } = require('eosjs');
const { JsSignatureProvider } = require('eosjs/dist/eosjs-jssig');
const fetch = require('node-fetch');
const { TextDecoder, TextEncoder } = require('util');


const signatureProvider = new JsSignatureProvider([config.permission.private_key]);

const submitSetClaimableTx = async (data, timeout) => {
  let success = false;

  for (let endpoint of config.chain_api.endpoints) {
    try {
      const rpc = new JsonRpc(endpoint, { fetch });
      const api = new Api({ rpc, signatureProvider, textDecoder: new TextDecoder(), textEncoder: new TextEncoder() });

      const apiCallPromise = api.transact({
        actions: [{
          account: 'waxdaobacker',
          name: 'setclaimable',
          authorization: [{
            actor: config.permission.wallet,
            permission: config.permission.permission_name,
          }],
          data: {
            authorizer: config.permission.wallet,
            assets_to_update: data,
          }
        }]
      }, {
        blocksBehind: 3,
        expireSeconds: 90,
      });

      const result = await Promise.race([apiCallPromise, new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout))]);

      console.log("\n\nsetclaimable submission successful");
      success = true;
      return success;
    } catch (e) {
      console.log(`error submitting setclaimable: ${e}`);
    }
  }

  return success;
};

module.exports = {
  submitSetClaimableTx
};
