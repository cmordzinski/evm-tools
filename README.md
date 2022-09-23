# evm-tools

Collection of tools to interact with EVM compatible blockchains. The code in this repository primarily exists for learning/experimenting purposes.
<p>

Prerequisites:
 - You must be using a version of Python >= 3.9
 - You must create a venv in the main evm-tools directory and it must be named 'venv'
 - You must install all dependencies from requirements.txt into the venv

<pre>
cd evm-tools
python3.10 -m venv venv
. ./venv/bin/activate
pip3 install -r requirements.txt
</pre>

## utils 
Where python modules with utility methods exist. 
- utils.py: general utility methods commonly used in scripts. read_conf, configure_logger, etc.
- flashbot_tools.py: utility methods specific to using flashbots. Contains FlashbotTools class.

## nft-minter
Mint NFT's directly from a contract using flashbots.
 - For additional info, look at the README file in the nft-minter subdirectory.
 - The example below will mint one NFT on the ETH goerli testnet from the FAKE_ART_MINTER contract
<pre>
Usage:
  ./minter.py --mint-fn 0x1249c58b \
              --contract 0x20EE855E43A7af19E407E39E5110c2C1Ee41F64D \
              --price 0.03 \
              --mint-time 2022-09-20T10:10:10 \
              --num-to-mint 1 \
              --use-goerli
</pre>

## token-sniffer
Listen for PairCreated events and notify of pair and tx hash via discord webhook.
- For additional info, look at the README file in the token-sniffer subdirectory.
<pre>
Usage: 
  ./token-sniffer.py run --config /path/to/config.json
</pre>
