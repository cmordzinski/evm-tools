# NFT Minter

Mint NFTs from a contract on the ETH mainnet or goerli testnet.
Before attempting to run the script, make sure you have a .env file properly populated.

 - The example below will mint one NFT on the ETH goerli testnet from the FAKE_ART_MINTER contract

<pre>
Usage:
  ./minter.py --mint-fn 0x1249c58b \
              --contract 0x20EE855E43A7af19E407E39E5110c2C1Ee41F64D \
              --price 0.03 \
              --mint-time 2022-09-20T10:10:10 \
              --num-to-mint 1 \
              --use-goerli

Required Arguments:
--mint-fn: HEX code of the mint function to call
--contract: contract to attempt to mint from
--price: mint price in ETH as a float

Optional Arguments:
--mint-time: defaults to current date/time, must be formatted as YYYY-MM-DDTH:M:S
--num-to-mint: defaults to 1
--use-goerli: should the ETH mainnet or goerli testnet be used
</pre>

Example:
<pre>
redacted@redacted nft-minter % ./minter.py --mint-fn 0x1249c58b --contract 0x20EE855E43A7af19E407E39E5110c2C1Ee41F64D --price 0.03 --mint-time 2022-09-20T10:10:10 --use-goerli --num-to-mint 2
mint time 2022-09-20 10:10:10 > current time 2022-09-23 15:27:06.256812!!
num_to_mint: 2 contract: 0x20EE855E43A7af19E407E39E5110c2C1Ee41F64D mint price: 0.03 ETH
[Fri, 23 Sep 2022 15:27:06] INFO [evm-tools] CONNECTED TO RPC: https://goerli.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161
[Fri, 23 Sep 2022 15:27:06] INFO [evm-tools] USER ACCOUNT: 0x7F95B31BEDaAAA3a6A98c4dBAe39A756D1E8C330
[Fri, 23 Sep 2022 15:27:06] INFO [evm-tools] BALANCE: 387657999997345000 wei
[Fri, 23 Sep 2022 15:27:06] INFO [evm-tools] contract: 0x20EE855E43A7af19E407E39E5110c2C1Ee41F64D mint price: 0.03 num to mint: 2
[Fri, 23 Sep 2022 15:27:06] INFO [evm-tools] Estimated Gas: 78623
[Fri, 23 Sep 2022 15:27:06] INFO [evm-tools] Gas Price: 159 Gwei
[Fri, 23 Sep 2022 15:27:07] INFO [evm-tools] SIMULATING TRANSACTION...
[Fri, 23 Sep 2022 15:27:07] INFO [evm-tools] SIMULATION COMPLETE
[Fri, 23 Sep 2022 15:27:07] INFO [evm-tools] bundleHash: 0x8e55677b6402c675059585f30076c3eeb469e1c96f355544c04838c199377b87
[Fri, 23 Sep 2022 15:27:07] INFO [evm-tools] coinbaseDiff: 3818500000000000
[Fri, 23 Sep 2022 15:27:07] INFO [evm-tools] totalGasUsed: 76370
[Fri, 23 Sep 2022 15:27:07] INFO [evm-tools] SENDING BUNDLE TO FLASHBOTS
[Fri, 23 Sep 2022 15:27:09] INFO [evm-tools] broadcast started at block 7647171
[Fri, 23 Sep 2022 15:27:10] INFO [evm-tools] Block: 7647171
[Fri, 23 Sep 2022 15:27:11] INFO [evm-tools] Block: 7647171
[Fri, 23 Sep 2022 15:27:12] INFO [evm-tools] Block: 7647171
[Fri, 23 Sep 2022 15:27:13] INFO [evm-tools] Block: 7647172
[Fri, 23 Sep 2022 15:27:15] INFO [evm-tools] Block: 7647172
[Fri, 23 Sep 2022 15:27:16] INFO [evm-tools] Success: Minted NFT succesfully at block: 7647172
</pre>
