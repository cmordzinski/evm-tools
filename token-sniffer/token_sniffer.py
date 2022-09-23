#!venv/bin/python3

import sys
import os
import time
import asyncio
import argparse
from web3 import Web3

from utils.utils import configure_logger, read_json_conf, send_discord_message

LOGGER = configure_logger("tokensniffer.log")


def found_token(pair, web3, config):
    """Format and send a message to a discord server via webhook.

    Args:
        pair (dict): args.token1: address of token1 of the pair
                     args.token2: address of token2 of the pair
        web3 (web3.Web3): web3.Web3 object
        config (dict): "chain": "BSC",
                       "explorer":"https://bscscan.com/",
                       "discord_webhook" : "https://discord.com/api/webhooks/example",
                       "rpc_url": "https://bsc-dataseed.binance.org/",
                       "factory_address": "0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73",
                       "listeningABI": []
                       "tokenNameABI": []
    """
    token_a_info = web3.eth.contract(address=pair["args"]["token0"], abi=config["tokenNameABI"])
    token_b_info = web3.eth.contract(address=pair["args"]["token1"], abi=config["tokenNameABI"])

    token_a_symbol = token_a_info.functions.symbol().call()
    token_b_symbol = token_b_info.functions.symbol().call()

    LOGGER.info(f"Chain: {config['chain']} | Pair: {token_a_symbol}-{token_b_symbol}")

    msg = f":eye: **Chain:** {config['chain']} | **Pair:** {token_a_symbol}-{token_b_symbol}"
    embed = {
        "description": f"{config['explorer']}tx/{pair['transactionHash'].hex()}",
        "title": f"Transaction",
        "color": 15258703,
    }

    send_discord_message(msg, config["discord_webhook"], embed)


async def token_loop(event_filter, poll_interval, web3, config):
    """loop over newly created token pairs and call found_token() on the pair.

    Args:
        event_filter: web3.Web3.eth.contract.events.PairCreated.createFilter object
        poll_interval (int): Integer representing how long to sleep before checking for new pairs again
        web3 (web3.Web3): web3.Web3 object
        config (dict): "chain": "BSC",
                       "explorer":"https://bscscan.com/",
                       "discord_webhook" : "https://discord.com/api/webhooks/example",
                       "rpc_url": "https://bsc-dataseed.binance.org/",
                       "factory_address": "0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73",
                       "listeningABI": []
                       "tokenNameABI": []
    """
    while True:
        try:
            for pair in event_filter.get_new_entries():
                LOGGER.info(f"Found new token pair {pair['args']['token0']} - {pair['args']['token1']}")
                found_token(pair, web3, config)
            await asyncio.sleep(poll_interval)
        # Broad except for now so common errors can be discovered and handled accordingly
        except Exception as e:
            LOGGER.error(f"{e}")
            time.sleep(poll_interval)


def listen_for_tokens(config):
    """Set up event filter and loop to listen for new pairs and act on findings.

    Args:
        config (dict): "chain": "BSC",
                       "explorer":"https://bscscan.com/",
                       "discord_webhook" : "https://discord.com/api/webhooks/example",
                       "rpc_url": "https://bsc-dataseed.binance.org/",
                       "factory_address": "0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73",
                       "listeningABI": []
                       "tokenNameABI": []
    """
    web3 = Web3(Web3.HTTPProvider(config["rpc_url"]))
    assert web3.isConnected()
    LOGGER.info(f"Web3 successfully connected to {config['rpc_url']}")

    contract = web3.eth.contract(address=config["factory_address"], abi=config["listeningABI"])
    event_filter = contract.events.PairCreated.createFilter(fromBlock="latest")
    try:
        LOGGER.info("Listening for new contracts")
        asyncio.run(token_loop(event_filter, 1, web3, config))
    except KeyboardInterrupt:
        sys.exit(1)


def parse_args():
    """Get the parser object for this script.

    Returns:
        (argparse.Namespace):  The aruguents parser namespace instance
    """
    parser = argparse.ArgumentParser(description="Token Sniffer")

    subparsers = parser.add_subparsers(dest="subcommand")
    run = subparsers.add_parser("run", help="Run the Token Sniffer program")
    run.add_argument("--config", "-c", help="relative or full path to the config file", metavar="CONFIG", required=True)
    run.set_defaults(func=listen_for_tokens)

    if len(sys.argv) == 1:
        parser.print_help()
        sys.exit(0)

    return parser.parse_args()


def main():
    """Do all the things."""
    args = parse_args()
    args.func(read_json_conf(args.config))


if __name__ == "__main__":
    main()
