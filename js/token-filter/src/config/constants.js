const {ethers} = require('ethers');

const RPC_URL_WSS = "wss://ws-nd-654-414-664.p2pify.com/ae9f2cd14774753ae3150be26252ebbb";
const MIN_WBNB_RESERVES = 5; // minumum amount of WBNB returned when calling getReserves() for pair to be included in output
const MIN_BUSD_RESERVES = 1000; // minimum amount of BUSD returned when calling getReserves() for pair to be included in output
const UNISWAP_QUERY_START = 50000; // UniswapFlasQuery.sol returns pairs in the same order each time in order of creation. 
const UNISWAP_QUERY_END = 100000;   // There are too many pairs to get them all in one go, so we need to set the range we want to query

// V2 factory address, along with the addresses of the 2 tokens we want to filter against for pairs
// here, we are filtering for all XXX-WBNB and XXX-BUSD pairs
const PANCAKE_FACTORY_ADDRESS = '0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73';
const WBNB_ADDRESS = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c';
const BUSD_ADDRESS = '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56';

// Address and ABI of the UniswapFlashQuery.sol contract that we use to fetch all pairs from a certain exchange
const UNISWAP_QUERY_CONTRACT_ADDRESS = '0xAe197E1C310AEC1c254bCB7998cdFd64541c9eef'
const UNISWAP_QUERY_ABI = require("./abi/UniswapFlashQuery.json");

// Batch size to use when getting pairs
const UNISWAP_BATCH_SIZE = 500;

// Contract info for ToleranceCheck.sol that checks for tax/honeypot 
const TP_CONTRACT_ADDRESS = '0x1298E04B39C8B5D79109F2e90079122C382885Ff';
const toleranceCheckAbi = require("./abi/ToleranceCheck.json");
const TP_CONTRACT = new ethers.utils.Interface(toleranceCheckAbi);

// This is used when we simulate the tx to check for Honeypots/Tax. 
// Simulating tx just requires a "from" address with enough BNB, so we pass the burn address
const BNB_RESERVE_ADDRESS = '0x0000000000000000000000000000000000000000';

// ABI of the V2 pair contract so we can call getReserves() on token pair addresses
const PAIR_CONTRACT_ABI = require("./abi/PairContract.json");

module.exports = {
        RPC_URL_WSS,
        PANCAKE_FACTORY_ADDRESS,
        WBNB_ADDRESS,
        BUSD_ADDRESS,
        MIN_WBNB_RESERVES,
        MIN_BUSD_RESERVES,
        PAIR_CONTRACT_ABI,
        UNISWAP_QUERY_CONTRACT_ADDRESS,
        UNISWAP_QUERY_ABI,
	    UNISWAP_QUERY_START,
	    UNISWAP_QUERY_END,
        UNISWAP_BATCH_SIZE,
        TP_CONTRACT_ADDRESS,
        TP_CONTRACT,
        BNB_RESERVE_ADDRESS,
};
