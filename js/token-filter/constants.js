const {ethers} = require('ethers')
const winston = require('winston');

// Logger
const LOGGER = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
    ),
    transports: [
        new winston.transports.File({filename: 'logs/token-filter.log'}),
		new winston.transports.Console({format: winston.format.cli()}),
    ],
});

const RPC_URL_WSS = "wss://ws-nd-654-414-664.p2pify.com/ae9f2cd14774753ae3150be26252ebbb";

const WBNB_ADDRESS = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c';
const BUSD_ADDRESS = '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56';

const PAIR_CONTRACT_ABI = [
    'function getReserves() public view returns (uint112 _reserve0, uint112 _reserve1, uint32 _blockTimestampLast)',
];

const PANCAKE_FACTORY_ADDRESS = '0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73';

//----- Address and ABI of the UniswapFlashQuery.sol contract that we use to fetch all pairs from a certain exchange
const UNISWAP_QUERY_CONTRACT_ADDRESS = '0xAe197E1C310AEC1c254bCB7998cdFd64541c9eef'
const UNISWAP_QUERY_ABI = [{
    "inputs": [{
        "internalType": "contract UniswapV2Factory",
        "name": "_uniswapFactory",
        "type": "address"
    }, {
        "internalType": "uint256",
        "name": "_start",
        "type": "uint256"
    }, {
        "internalType": "uint256",
        "name": "_stop",
        "type": "uint256"
    }],
    "name": "getPairsByIndexRange",
    "outputs": [{
        "internalType": "address[3][]",
        "name": "",
        "type": "address[3][]"
    }],
    "stateMutability": "view",
    "type": "function"
}];
// Batch size to use when processing pairs pulled down
const UNISWAP_BATCH_SIZE = 500;
//-----

//----- Contract info for toleranceCheck.sol that checks for tax/honeypot 
const TP_CONTRACT_ADDRESS = '0x1298E04B39C8B5D79109F2e90079122C382885Ff';
const TP_CONTRACT = new ethers.utils.Interface([{
        "inputs": [],
        "stateMutability": "nonpayable",
        "type": "constructor"
    },
    {
        "anonymous": false,
        "inputs": [{
            "indexed": false,
            "internalType": "address",
            "name": "adr",
            "type": "address"
        }],
        "name": "Authorized",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [{
                "indexed": false,
                "internalType": "address",
                "name": "sender",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "amount",
                "type": "uint256"
            }
        ],
        "name": "Received",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [{
            "indexed": false,
            "internalType": "address",
            "name": "adr",
            "type": "address"
        }],
        "name": "Unauthorized",
        "type": "event"
    },
    {
        "inputs": [{
            "internalType": "address",
            "name": "tokenAddress",
            "type": "address"
        }],
        "name": "approve",
        "outputs": [],
        "stateMutability": "payable",
        "type": "function"
    },
    {
        "inputs": [{
                "internalType": "address",
                "name": "tokenAddress",
                "type": "address"
            },
            {
                "internalType": "uint256",
                "name": "ethIn",
                "type": "uint256"
            }
        ],
        "name": "checkInternalFee",
        "outputs": [{
            "internalType": "uint256",
            "name": "fee",
            "type": "uint256"
        }],
        "stateMutability": "payable",
        "type": "function"
    },
    {
        "inputs": [{
            "internalType": "address",
            "name": "adr",
            "type": "address"
        }],
        "name": "isAuthorized",
        "outputs": [{
            "internalType": "bool",
            "name": "",
            "type": "bool"
        }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{
                "internalType": "address",
                "name": "tokenAddress",
                "type": "address"
            },
            {
                "internalType": "uint256",
                "name": "tokenAmount",
                "type": "uint256"
            }
        ],
        "name": "sellSomeTokens",
        "outputs": [{
            "internalType": "uint256",
            "name": "ethOut",
            "type": "uint256"
        }],
        "stateMutability": "payable",
        "type": "function"
    },
    {
        "inputs": [{
                "internalType": "address",
                "name": "tokenAddress",
                "type": "address"
            },
            {
                "internalType": "uint256",
                "name": "ethIn",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "tolerance",
                "type": "uint256"
            }
        ],
        "name": "tokenToleranceCheck",
        "outputs": [],
        "stateMutability": "payable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "withdraw",
        "outputs": [],
        "stateMutability": "payable",
        "type": "function"
    },
    {
        "inputs": [{
                "internalType": "address",
                "name": "tokenAddress",
                "type": "address"
            },
            {
                "internalType": "address",
                "name": "to",
                "type": "address"
            }
        ],
        "name": "withdrawToken",
        "outputs": [{
            "internalType": "bool",
            "name": "res",
            "type": "bool"
        }],
        "stateMutability": "payable",
        "type": "function"
    },
    {
        "stateMutability": "payable",
        "type": "receive"
    }
]);
// This is used when we simulate the tx to check for Honeypots/Tax. Simulating tx requires a "from" address with enough BNB, but doesnt
// actually cost anything, so we just pass the BNB burn address
const BNB_RESERVE_ADDRESS = '0x0000000000000000000000000000000000000000';
//-------------

module.exports = {
        LOGGER,
        RPC_URL_WSS,
        WBNB_ADDRESS,
        BUSD_ADDRESS,
        PAIR_CONTRACT_ABI,
        PANCAKE_FACTORY_ADDRESS,
        UNISWAP_QUERY_CONTRACT_ADDRESS,
        UNISWAP_QUERY_ABI,
        UNISWAP_BATCH_SIZE,
        TP_CONTRACT_ADDRESS,
        TP_CONTRACT,
        BNB_RESERVE_ADDRESS,
};