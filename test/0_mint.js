const nft = artifacts.require("ROTL");
const mint = artifacts.require("ROTLMint");

const assert = require("assert");
const keccak256 = require("keccak256");
const { default: MerkleTree } = require("merkletreejs");
const tassert = require("truffle-assertions");

const Web3 = require('web3');
const web3 = new Web3('https://rinkeby.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161');

let rounds = [
  {
    price: 7,
    maxCount: 3,
    onceMaxCount: 2,
    addressMaxCount: 2,
    startBlock: 0,
    merkleRoot: '0x0000000000000000000000000000000000000000000000000000000000000000',
    merkleTree: null
  },
  {
    price: 8,
    maxCount: 10, // 3 + 7 = 10
    onceMaxCount: 3,
    addressMaxCount: 3,
    startBlock: 0,
    merkleRoot: '0x0000000000000000000000000000000000000000000000000000000000000000',
    merkleTree: null
  },
  {
    price: 10,
    maxCount: 15, // 3 + 7 + 5 = 15
    onceMaxCount: 3,
    addressMaxCount: 3,
    startBlock: 0,
    merkleRoot: '0x0000000000000000000000000000000000000000000000000000000000000000'
  }
]

let nftContract;
let mintContract;

contract("Mint", function (accounts) {
  console.log(accounts);
  let whitelist = [];
  const admin = accounts[0];
  console.log(`admin: ${admin}`);

  // add whitelist. 1~3 account
  whitelist.push(accounts[1]);
  whitelist.push(accounts[2]);

  let leafs = whitelist.map(addr => keccak256(addr));
  rounds[0].merkleTree = new MerkleTree(leafs, keccak256, { sortPairs: true });
  rounds[0].merkleRoot = rounds[0].merkleTree.getRoot();
  console.log(`round 1: merkleTree: ${rounds[0].merkleTree}`);
  console.log(`round 1: rootHash: ${rounds[0].merkleRoot.toString('hex')}\n\n`);

  whitelist.push(accounts[3]);
  whitelist.push(accounts[4]);

  leafs = whitelist.map(addr => keccak256(addr));
  rounds[1].merkleTree = new MerkleTree(leafs, keccak256, { sortPairs: true });
  rounds[1].merkleRoot = rounds[1].merkleTree.getRoot();
  console.log(`round 2: merkleTree: ${rounds[1].merkleTree}`);
  console.log(`round 2: rootHash: ${rounds[1].merkleRoot.toString('hex')}\n\n`);


  it("deploy", async () => {
    nftContract = await nft.deployed();
    mintContract = await mint.deployed();
  });

  it("setURI", async () => {
    await nftContract.setBaseTokenURI(
      `https://nft.rotl.io/info/`
    );
  });

  it("addMinter", async () => {
    await nftContract.grantRole(keccak256("MINTER_ROLE"), mintContract.address.toLowerCase());
  });

  it("setAddress", async () => {
    await mintContract.setAddress(
      nftContract.address.toLowerCase()
    );
  });

  it("setRoundInfo", async () => {
    for (let i = 0; i < rounds.length; ++i) {
      await mintContract.setRoundInfo(
        i + 1,
        rounds[i].price,
        rounds[i].maxCount,
        rounds[i].onceMaxCount,
        rounds[i].addressMaxCount,
        rounds[i].startBlock,
        rounds[i].merkleRoot
      );
    }
  });

  it("setRound 1", async () => {
    await mintContract.setRound(1);
  });

  it("check remain", async () => {
    const remain = await mintContract.getRemainCount();
    console.log(`remain : ${remain.toString()}`);
    assert(remain.toString() == rounds[0].maxCount);
  });

  it("mint round 1 => fails. has not whitelist", async () => {
    await tassert.fails(
      mintContract.mint(1, 1, rounds[0].merkleTree.getHexProof(keccak256(whitelist[3])), {
        from: whitelist[3],
        value: rounds[0].price,
      })
    );
  });

  it("mint round 1 => success. wl[0] has whitelist", async () => {
    await mintContract.mint(1, 1, rounds[0].merkleTree.getHexProof(keccak256(whitelist[0])), {
      from: whitelist[0],
      value: rounds[0].price,
    });
  });

  it("mint round 1 => success. wl[1] has whitelist", async () => {
    await mintContract.mint(1, 1, rounds[0].merkleTree.getHexProof(keccak256(whitelist[1])), {
      from: whitelist[1],
      value: rounds[0].price,
    });
  });

  it("check remain", async () => {
    const remain = await mintContract.getRemainCount();
    console.log(`remain : ${remain.toString()}`);
    assert(remain.toString() == rounds[0].maxCount - 2);
  });

  it("mint round 1 => fail. wl[2] has not whitelist", async () => {
    await tassert.fails(
      mintContract.mint(1, 1, rounds[0].merkleTree.getHexProof(keccak256(whitelist[2])), {
        from: whitelist[2],
        value: rounds[0].price,
      })
    );
  });

  it("mint round 1 => fail. wl[2] has not whitelist & use wl[1] proof", async () => {
    await tassert.fails(
      mintContract.mint(1, 1, rounds[0].merkleTree.getHexProof(keccak256(whitelist[1])), {
        from: whitelist[2],
        value: rounds[0].price,
      })
    );
  });

  it("mint round 1 => fail. wl[1] more than remain", async () => {
    await tassert.fails(
      mintContract.mint(1, 2, rounds[0].merkleTree.getHexProof(keccak256(whitelist[1])), {
        from: whitelist[1],
        value: rounds[0].price * 2,
      })
    );
  });

  it("mint round 1 => success. wl[1] has whitelist", async () => {
    await mintContract.mint(1, 1, rounds[0].merkleTree.getHexProof(keccak256(whitelist[1])), {
      from: whitelist[1],
      value: rounds[0].price,
    });
  });

  it("check remain", async () => {
    const remain = await mintContract.getRemainCount();
    console.log(`remain : ${remain.toString()}`);
    assert(remain.toString() == 0);
  });

  it("setRound 2", async () => {
    await mintContract.setRound(2);
  });

  it("check remain", async () => {
    const remain = await mintContract.getRemainCount();
    console.log(`remain : ${remain.toString()}`);
    assert(remain.toString() == rounds[1].maxCount - rounds[0].maxCount);
  });

  it("mint round 2 => success. wl[3] has not whitelist", async () => {
    await mintContract.mint(2, 1, rounds[1].merkleTree.getHexProof(keccak256(whitelist[3])), {
      from: whitelist[3],
      value: rounds[1].price,
    });
  });

  it("mint round 2 => fail. wl[43] more than address max count", async () => {
    await tassert.fails(
      mintContract.mint(2, rounds[1].onceMaxCount + 1, rounds[1].merkleTree.getHexProof(keccak256(whitelist[3])), {
        from: whitelist[3],
        value: rounds[1].price * rounds[1].onceMaxCount + 1,
      }));
  });

  it("mint round 2 => success. wl[3] address max count", async () => {
    await mintContract.mint(2, rounds[1].addressMaxCount - 1, rounds[1].merkleTree.getHexProof(keccak256(whitelist[3])), {
      from: whitelist[3],
      value: rounds[1].price * (rounds[1].addressMaxCount - 1),
    });
  });

  it("check remain", async () => {
    const remain = await mintContract.getRemainCount();
    console.log(`remain : ${remain.toString()}`);
    assert(remain.toString() == rounds[1].maxCount - rounds[0].maxCount - rounds[1].addressMaxCount);
  });

  it("mint round 2 => fail. wl[1] more than once max count", async () => {
    await tassert.fails(
      mintContract.mint(2, rounds[1].onceMaxCount + 1, rounds[1].merkleTree.getHexProof(keccak256(whitelist[1])), {
        from: whitelist[1],
        value: rounds[1].price * (rounds[1].onceMaxCount + 1),
      }));
  });

  it("mint round 2 => fail. wl[1] less than price", async () => {
    await tassert.fails(
      mintContract.mint(2, 1, rounds[1].merkleTree.getHexProof(keccak256(whitelist[1])), {
        from: whitelist[1],
        value: rounds[0].price,
      }));
  });

  it("mint round 2 => success. wl[1] address max count", async () => {
    await mintContract.mint(2, rounds[1].addressMaxCount, rounds[1].merkleTree.getHexProof(keccak256(whitelist[1])), {
      from: whitelist[1],
      value: rounds[1].price * (rounds[1].addressMaxCount),
    });
  });

  it("check remain", async () => {
    const remain = await mintContract.getRemainCount();
    console.log(`remain : ${remain.toString()}`);
    assert(remain.toString() == rounds[1].maxCount - rounds[0].maxCount - (rounds[1].addressMaxCount * 2));
  });

  it("mint round 2 => fail. wl[2] more than remain", async () => {
    await tassert.fails(
      mintContract.mint(2, rounds[1].addressMaxCount, rounds[1].merkleTree.getHexProof(keccak256(whitelist[2])), {
        from: whitelist[2],
        value: rounds[1].price * (rounds[1].addressMaxCount),
      })
    );
  });

  it("mint round 2 => success. wl[2] remain", async () => {
    await mintContract.mint(2, 1, rounds[1].merkleTree.getHexProof(keccak256(whitelist[2])), {
      from: whitelist[2],
      value: rounds[1].price,
    });
  });

  it("check sold out", async () => {
    const remain = await mintContract.getRemainCount();
    console.log(`remain : ${remain.toString()}`);
    assert(remain.toString() == 0);
  });

  it("mint round 2 => fail. wl[2] sold out", async () => {
    await tassert.fails(
      mintContract.mint(2, 1, rounds[1].merkleTree.getHexProof(keccak256(whitelist[2])), {
        from: whitelist[2],
        value: rounds[1].price,
      })
    );
  });

  it("removeMinter", async () => {
    await nftContract.revokeRole(keccak256("MINTER_ROLE"), mintContract.address.toLowerCase());
  });

  it("withdraw => fail. is not admin", async () => {
    const before = await caver.klay.getBalance(mintContract.address);
    console.log(`mint contract before balance: ${before}`);
    await tassert.fails(
      mintContract.withdraw(admin, before, {
        from: whitelist[2]
      })
    );
  });

  it("withdraw => success. is admin", async () => {
    const before = await caver.klay.getBalance(mintContract.address);
    console.log(`mint contract before balance: ${before}`);
    await mintContract.withdraw(admin, before, {
      from: admin
    });
    const after = await caver.klay.getBalance(mintContract.address);
    console.log(`mint contract after balance: ${after}`);
  });

  it("change default admin", async () => {
    // test account
    await nftContract.grantRole('0x00', '0x0000000000000000000000000000000000000001');
    await nftContract.revokeRole('0x00', admin);
  });

  it("call admin function", async () => {
    await tassert.fails(
      nftContract.addMinter('0x0000000000000000000000000000000000000001')
    );
  });
});
