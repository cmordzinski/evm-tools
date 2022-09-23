#!venv/bin/python3
import os
import sys
import time
import argparse
from datetime import date, datetime
from dotenv import load_dotenv
from utils.flashbot_tools import FlashbotTools


def main():
    """main body."""
    load_dotenv()
    if not os.environ.get("WALLET_PRIVATE_KEY") or not os.environ.get("RPC") or not os.environ.get("TESTNET_RPC"):
        print("env variables WALLET_PRIVATE_KEY, RPC, and TESTNET_RPC are required.")
        exit(1)

    wallet_private_key = os.environ.get("WALLET_PRIVATE_KEY")
    rpc = os.environ.get("RPC")

    flash_bots = FlashbotTools(rpc=rpc, pkey=wallet_private_key, use_goerli=False)
    wallets = flash_bots.create_accounts(2)
    for wallet in wallets:
        print(wallet)
        print(wallet.address)
        print(wallet.privateKey)


if __name__ == "__main__":
    main()
