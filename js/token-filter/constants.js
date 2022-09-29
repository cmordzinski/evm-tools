const {ethers} = require('ethers')
const winston = require('winston');

// Logger
const logger = winston.createLogger({
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

//----- ABI of the UniswapFlashQuery.sol contract that we use to fetch all pairs from a certain exchange
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
const tpContactAddress = '0x1298E04B39C8B5D79109F2e90079122C382885Ff'
const tpContract = new ethers.utils.Interface([{
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
const bnbReserveAddress = '0x0000000000000000000000000000000000000000';
//-------------

module.exports = {
        logger,
        UNISWAP_QUERY_ABI,
        UNISWAP_BATCH_SIZE,
        tpContactAddress,
        tpContract,
        bnbReserveAddress,
};