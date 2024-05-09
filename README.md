# Contract address has been deployed:
## 1. zksync testnet
1. melonTokenContract: 0xDf77D063Cf7BdBf2D8167B18e511c82b6cE6d1DD
2. Implementation contract was deployed to 0xb8fdBf6d11789825F2DB6B13BA90E9477aBec2c9
3. UUPS proxy was deployed to 0xd9CBa65D921b7919Bb765FE4E79cA567A86Fb0e9
4. proposalAddr: 0xd9CBa65D921b7919Bb765FE4E79cA567A86Fb0e9
5. melonNft: 0x027da933c821D112A1b97EB1e5cE653cfb28768F
6. assessor: 0xD5F5aBbafdC0c31F0747A50Df3F05F30494eFb0C
7. juryNftSwap: 0xB7e4a92BE506A89d8E3Ef11d1F71472372f2c257

# Architecture diagram
![alt text](image-2.png)

# Test contract
`npx hardhat test ${path} --network hardhat`

# Steps for deploying ZkSync test network
> `npx  hardhat deploy-zksync --script index.js --network zkSyncTestnet` （Error reporting： `Error in plugin @matterlabs/hardhat-zksync-deploy: Deploy function does not exist or exported invalidly.`，Temporarily abandoned）
1. First initialization `npx hardhat run deploy/index.js` 

2. [view contract](https://sepolia.explorer.zksync.io/)
3. [verify](https://docs.zksync.io/build/tooling/hardhat/hardhat-zksync-verify.html#commands)
`npx  hardhat verify --network zkSyncTestnet  ${Contract address}  ${Construction parameters}`
# Replace logical contract
[Subsequent replacement of logical contracts](https://docs.zksync.io/build/tooling/hardhat/hardhat-zksync-upgradable.html#upgradable-examples)



# Sample Hardhat Project
This project demonstrates a basic Hardhat use case. It comes with a sample contract, a test for that contract, and a Hardhat Ignition module that deploys that contract.

Try running some of the following tasks:

```shell
npx hardhat help
npx hardhat test
REPORT_GAS=true npx hardhat test
npx hardhat node
npx hardhat ignition deploy ./ignition/modules/Lock.js
```
