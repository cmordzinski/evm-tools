import os
import requests
import math
import time
from datetime import datetime
from eth_account.signers.local import LocalAccount
from eth_account.account import Account
from web3 import Web3, HTTPProvider, exceptions
from web3.types import TxParams
from utils.web3_flashbots.flashbots import flashbot

from utils.utils import configure_logger


class FlashbotTools:
    def __init__(self, rpc=None, pkey=None, use_goerli=True):
        self.logger = configure_logger("evm-tools")
        self.user_account = Account.from_key(pkey)
        self.w3 = self.connect_to_rpc(rpc, use_goerli)
        self.chain_id = 1 if not use_goerli else 5

    def connect_to_rpc(self, rpc, use_goerli):
        """Connect to RPC.

        Args:
            rpc (str): URL of the RPC to connect to
            use_goerli (bool): Use Goerli testnet?

        Returns:
            web3.Web3: web3 object
        """
        flashbots_signature = Account.create()
        w3 = Web3(HTTPProvider(rpc))

        if use_goerli:
            flashbot(w3, flashbots_signature, "https://relay-goerli.flashbots.net")
        else:
            flashbot(w3, flashbots_signature)

        self.logger.info(f"CONNECTED TO RPC: {rpc}")
        self.logger.info(f"USER ACCOUNT: {self.user_account.address}")
        self.logger.info(f"BALANCE: {w3.eth.get_balance(self.user_account.address)} wei")

        return w3

    def get_gas_price(self):
        """Estimate gas needed for tx bundle to succeed, in wei.

        Returns:
            float: estimated gas needed

        Gas must be high enough to make all the transactions in the bundle have
        a competitive effective gas price. See more about this here:
        https://docs.flashbots.net/flashbots-core/searchers/advanced/bundle-pricing/
        """
        gas_api = "https://ethgasstation.info/json/ethgasAPI.json"
        response = requests.get(gas_api).json()
        gas_multiplier = 3
        gas_price_gwei = math.floor(response["fastest"] / 10 * gas_multiplier)
        gas_price = self.w3.toWei(gas_price_gwei, "gwei")
        return gas_price

    def create_accounts(self, num):
        """Create LocalAccount account objects.

        Args:
            num (int): number of accounts to create

        Returns:
            lst: list of LocalAccount objects
        """
        self.logger.info(f"Creating {num} LocalAccount objects")
        accounts = []
        for i in range(num):
            accounts.append(self.w3.eth.account.create())

        return accounts

    def simple_mint(self, contract, mint_fn, mint_price, num_to_mint=1):
        """Mint NFT(s) from a single account.

        Args:
            contract (str): contract to mint from
            mint_fn (str): mint function to call
            mint_price (float): price per mint in ETH
            num_to_mint (int): number of NFTs to attempt to mint
            mint_time (datetime.datetime) datetime when the mint is live

        Returns:
            str: Tx Hash
        """
        self.logger.info(f"contract: {contract} mint price: {mint_price} num to mint: {num_to_mint}")
        gas_price = self.get_gas_price()
        tx: TxParams = {
            "chainId": self.chain_id,
            "data": mint_fn,
            "from": self.user_account.address,
            "maxFeePerGas": gas_price,
            "maxPriorityFeePerGas": self.w3.toWei(50, "gwei"),
            "nonce": self.w3.eth.get_transaction_count(self.user_account.address),
            "to": self.w3.toChecksumAddress(contract),
            "type": 2,
            "value": self.w3.toWei(mint_price, "ether"),
        }
        gas_estimate = math.floor(self.w3.eth.estimate_gas(tx))
        tx["gas"] = gas_estimate

        gas_in_gwei = int(gas_price / 10**9)
        self.logger.info(f"Estimated Gas: {gas_estimate}")
        self.logger.info(f"Gas Price: {gas_in_gwei} Gwei")

        signed_tx = self.user_account.sign_transaction(tx)

        # create a flashbots bundle.
        # bundles will be dropped / filtered in production if
        # 1. your bundle uses < 42k gas total
        # 2. you have another tx with the same nonce in the mempool
        bundle = [
            {"signed_transaction": signed_tx.rawTransaction},
            # you can include other transactions in the bundle
            # in the order that you want them in the block
        ]

        # flashbots bundles target a specific block, so we target
        # any one of the next 3 blocks by emitting 3 bundles
        block_number = self.w3.eth.block_number

        # SIMULATE TX
        self.logger.info("SIMULATING TRANSACTION...")
        try:
            simulation = self.w3.flashbots.simulate(bundle, block_number + 1)
        except Exception as e:
            self.logger.error(f"General error in simulation: {e}")
            return

        self.logger.info("SIMULATION COMPLETE")
        self.logger.info(f'bundleHash: {simulation["bundleHash"]}')
        self.logger.info(f'coinbaseDiff: {simulation["coinbaseDiff"]}')
        self.logger.info(f'totalGasUsed: {simulation["totalGasUsed"]}')

        self.logger.info("SENDING BUNDLE TO FLASHBOTS")
        blocks_to_wait = 3 if self.chain_id == 1 else 10
        for i in range(1, blocks_to_wait):
            self.w3.flashbots.send_bundle(bundle, target_block_number=block_number + i)

        self.logger.info(f"broadcast started at block {block_number}")

        # target 3 future blocks, 10 if using goerli testnet
        # if we dont see confirmation in those blocks, assume the mint wasn't mined
        while True:
            try:
                self.w3.eth.wait_for_transaction_receipt(signed_tx.hash, timeout=1, poll_latency=0.1)
                break

            except exceptions.TimeExhausted:
                self.logger.info(f"Block: {self.w3.eth.block_number}")
                if self.w3.eth.block_number > (block_number + blocks_to_wait):
                    self.logger.error("transaction was not included in any of the targeted blocks")
                    return

        current_block = self.w3.eth.block_number
        self.logger.info(f"transaction confirmed at block {current_block}")
        return current_block
