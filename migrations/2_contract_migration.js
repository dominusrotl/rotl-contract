const nft = artifacts.require("ROTL");
const mint = artifacts.require("ROTLMint");
const fs = require("fs");

module.exports = function (deployer, network, accounts) {
  deployer
    .deploy(nft)
    .then(() => {
      writeABI(nft);
      return deployer.deploy(mint);
    })
    .then(() => {
      writeABI(mint);
    });
};

function writeABI(contract, addName = '') {
  if (contract._json) {
    fs.writeFile(
      "abi/" + addName + contract._json.contractName + "_abi",
      JSON.stringify(contract._json.abi, 2),
      (err) => {
        if (err) {
          console.error(err);
          throw err;
        }
      }
    );
  }

  fs.writeFile(
    "abi/" + addName + contract._json.contractName + "_address",
    contract.address.toLowerCase(),
    (err) => {
      if (err) {
        console.error(err);
        throw err;
      }
    }
  );

  /*
  fs.writeFile(
    "/home/ray_ubuntu/dev/blockchain/klaytn/abi/" + addName + contract._json.contractName + "_address",
    contract.address.toLowerCase(),
    (err) => {
      if (err) {
        console.error(err);
        throw err;
      }
    }
  );

  fs.writeFile(
    "/home/ray_ubuntu/ryoung_ho_nas/backup/abi/" + addName + contract._json.contractName + "_address",
    contract.address.toLowerCase(),
    (err) => {
      if (err) {
        console.error(err);
        throw err;
      }
    }
  );
  */
}
