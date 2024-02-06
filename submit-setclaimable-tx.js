const { Api, JsonRpc } = require('eosjs');
const { JsSignatureProvider } = require('eosjs/dist/eosjs-jssig');
const fetch = require('node-fetch');
const { TextDecoder, TextEncoder } = require('util');
const { signingKey } = require('./environment');

const rpcEndpoints = ["http://localhost:8888", "https://api.waxdaobp.io", "https://api.hivebp.io", "https://wax.eosusa.io"];

const signatureProvider = new JsSignatureProvider([signingKey]);

const authorizer = "waxdaobacker";

const submitSetClaimableTx = async (data, timeout) => {
  let success = false;

  for (let endpoint of rpcEndpoints) {
    try {
      const rpc = new JsonRpc(endpoint, { fetch });
      const api = new Api({ rpc, signatureProvider, textDecoder: new TextDecoder(), textEncoder: new TextEncoder() });

      const apiCallPromise = api.transact({
        actions: [{
          account: 'waxdaobacker',
          name: 'setclaimable',
          authorization: [{
            actor: 'waxdaobacker',
            permission: 'setclaimable',
          }],
          data: {
            authorizer: authorizer,
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
