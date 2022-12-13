require('dotenv').config();

// Constants for interacting with PancakeSwapV2
const PANCAKE_ROUTER_ADDRESS = '0x10ED43C718714eb63d5aA57B78B54704E256024E';
const PANCAKE_FACTORY_ADDRESS = '0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73';  

const PANCAKE_ROUTER_ABI = require("./abi/PancakeSwapRouter.json");
const PANCAKE_FACTORY_ABI = require("./abi/PancakeSwapFactory");
const PANCAKE_POOL_ABI = require("./abi/PancakeSwapPool.json");

const ENV_VARS = [
    "WALLET_PRIVATE_KEY",
    "RPC_URL",
    "RPC_URL_WSS",
];

for (let i = 0; i < ENV_VARS.length; i++) {
    if (!process.env[ENV_VARS[i]]) {
        console.log(`Missing env var ${ENV_VARS[i]}`);
        process.exit(1);
    }
}

// Constants for pkey & RPC URLs
const WALLET_PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY;
const RPC_URL = process.env.RPC_URL;
const RPC_URL_WSS = process.env.RPC_URL_WSS;

// Constants for 'strategy' to use
const INPUT_TOKEN_ADDRESS = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c'; // main token being swapped against in the pool. Typically WETH, BUSD, etc
const OUTPUT_TOKEN_ADDRESSES = require("./whitelisted_tokens.json"); // json array of tokens we are willing to attempt to frontrun, use token-filter for this
const ONE_GWEI = 1e9;
const MAX_AMOUNT = 20; // Max about of INPUT_TOKEN_ADDRESS to use in one swap.
const SLIPPAGE = 1.04; // Adjust for volatility in the pool, how much slippage to allow. 
const GASPRICE = 30; // How much gwei more than the tx being frontran to use. Some frontrunners will use up to 120 gwei
const MINPROFIT = 0.01; // Minimum profit EXCLUDING gasCost and slippageCost required to send txns

//you can determine how to cnoose slippage, gasPrice, minprofit so that the tradeoff between risk and profit is balanced enough for you
//note that people will bid higher gas on very profitable trades

//You could also code this to be automatically determined by the bot, for example if the bot can make 2$ profit excluding gas, and slippage, what can
//can the bot afford to spend on gas and slippage.

module.exports = {
    PANCAKE_ROUTER_ABI,
    PANCAKE_FACTORY_ABI,
    PANCAKE_POOL_ABI,

    PANCAKE_ROUTER_ADDRESS,
    PANCAKE_FACTORY_ADDRESS,

    WALLET_PRIVATE_KEY,
    RPC_URL,
    RPC_URL_WSS,

    MAX_AMOUNT,
    SLIPPAGE,
    GASPRICE,
    MINPROFIT,
    ONE_GWEI,

    INPUT_TOKEN_ADDRESS,
    OUTPUT_TOKEN_ADDRESSES,
};
