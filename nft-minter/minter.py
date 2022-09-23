#!venv/bin/python3
import os
import sys
import time
import argparse
from datetime import date, datetime
from dotenv import load_dotenv
from utils.flashbot_tools import FlashbotTools


def parse_args():
    """Parse the arguments passed the the script.

    Returns:
        (argparse.Namespace): namespace of the parser object
    """
    parser = argparse.ArgumentParser(description="NFT Minter")
    parser.add_argument(
        "--mint-fn", dest="mint_fn", required=True, help="The hex code of the mint function in th contract."
    )
    parser.add_argument("--contract", dest="contract", required=True, help="The contract to mint from.")
    parser.add_argument(
        "--price", dest="price", required=True, help="The price of the mint, in ETH as a float. ex: 0.03"
    )
    parser.add_argument(
        "--mint-time",
        dest="mint_time",
        required=True,
        default=datetime.now().strftime("%Y-%m-%dT%H:%M:%D"),
        help="The time to try to mint the nft, as YYYY-MM-DDTHH:MM:SS. Defaults to current date/time",
    )
    parser.add_argument(
        "--num-to-mint", dest="num_to_mint", required=True, default=1, help="The number of NFTs to mint. Defaults to 1"
    )
    parser.add_argument(
        "--use-goerli",
        dest="use_goerli",
        action="store_true",
        help="Use the goerli testnet? If not set, mainnet will be used.",
    )
    parser.set_defaults(func=start_mint)

    if len(sys.argv) == 1:
        parser.print_help()
        sys.exit(0)

    return parser.parse_args()


def start_mint(args):
    """Attempt to mint a NFT using the passed args.

    Args:
        args (argparse.Namespace): namespace of the parser object
    """
    mint_fn = args.mint_fn
    mint_contract = args.contract
    mint_price = args.price
    mint_time = datetime.strptime(args.mint_time, "%Y-%m-%dT%H:%M:%S")
    rpc = os.environ.get("RPC") if not args.use_goerli else os.environ.get("TESTNET_RPC")
    wallet_private_key = os.environ.get("WALLET_PRIVATE_KEY")

    current_time = datetime.now()
    while mint_time > current_time:
        print(f"mint time {mint_time} < current time {current_time}, sleeping for 1 second")
        time.sleep(1)

    print(f"mint time {mint_time} > current time {current_time}!!")
    print(f"num_to_mint: {args.num_to_mint} contract: {args.contract} mint price: {args.price} ETH")

    flash_bots = FlashbotTools(rpc=rpc, pkey=wallet_private_key, use_goerli=args.use_goerli)
    status = flash_bots.simple_mint(
        contract=mint_contract, mint_fn=mint_fn, mint_price=mint_price, num_to_mint=args.num_to_mint
    )
    if status:
        print(f"Success: Minted NFT succesfully at block: {status}")
    else:
        print("Failed to Mint NFT.")


def main():
    """main body."""
    load_dotenv()
    if not os.environ.get("WALLET_PRIVATE_KEY") or not os.environ.get("RPC") or not os.environ.get("TESTNET_RPC"):
        print("env variables WALLET_PRIVATE_KEY, RPC, and TESTNET_RPC are required.")
        exit(1)

    args = parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
