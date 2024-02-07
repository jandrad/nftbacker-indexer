const createTransferObject = (asset_id, global_sequence, owner) => {

    const transfer_json = {asset_id: asset_id, owner: owner, global_sequence: global_sequence};

    return JSON.stringify(transfer_json);
}

const extractFirstPart = (inputString, delimiter) => {
  const parts = inputString.split(delimiter);

  return parts[0];
}

const extractSecondPart = (inputString, delimiter) => {
  const parts = inputString.split(delimiter);

  return parts[1];
}

const getPrecionFromAsset = (asset) => {
  let precision;
  if(extractFirstPart(asset, ' ').indexOf('.') == -1){
    precision = 0;
  } else {
    const quantity = extractFirstPart(asset, ' ');
    precision = quantity.substring(quantity.indexOf('.') + 1).length;
  }
  return precision;               
}

module.exports = {
    createTransferObject,
    extractFirstPart,
    extractSecondPart,
    getPrecionFromAsset
}