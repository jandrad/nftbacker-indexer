const config = require('./config.json');
const { Session } = require('@wharfkit/session');
const { WalletPluginPrivateKey } = require('@wharfkit/wallet-plugin-privatekey')

const submitSetClaimableTxWithWharf = async (data, timeout) => {
  let success = false;

  for (let endpoint of config.chain_api.endpoints) {
    try {

      const WAX_CHAIN = { id: config.chain_api.chain_id, 
                          url: endpoint }  

      const session = new Session({
          actor: config.permission.wallet,
          permission: config.permission.permission_name,
          chain: WAX_CHAIN,
          walletPlugin: new WalletPluginPrivateKey(config.permission.private_key)
      })                          

      const apiCallPromise = session.transact({
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
  submitSetClaimableTxWithWharf
};
