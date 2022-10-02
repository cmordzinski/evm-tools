const _ = require('lodash');
const fs = require('fs');
const {ethers} = require('ethers');
const logger = require("./utils/logger.js");

const {
    RPC_URL_WSS,
    WBNB_ADDRESS,
    BUSD_ADDRESS,
    MIN_WBNB_RESERVES,
    MIN_BUSD_RESERVES,
    PANCAKE_FACTORY_ADDRESS,
    UNISWAP_QUERY_CONTRACT_ADDRESS,
    UNISWAP_QUERY_ABI,
    UNISWAP_BATCH_SIZE,
    UNISWAP_QUERY_START,
    UNISWAP_QUERY_END,
    TP_CONTRACT_ADDRESS,
    TP_CONTRACT,
    BNB_RESERVE_ADDRESS,
    PAIR_CONTRACT_ABI,
} = require('./config/constants.js');

const provider = new ethers.providers.WebSocketProvider(RPC_URL_WSS);

async function getPairs() {   
    let allPoolInfo = [];
    let allTokens = [];
    logger.info("connected to RPC")
    const uniswapQuery = new ethers.Contract(UNISWAP_QUERY_CONTRACT_ADDRESS, UNISWAP_QUERY_ABI, provider);
    logger.info("connected to contract")
    // this will get all pairs pairs from QUERY_START to QUERY_END in batches of 500
    for (let i = UNISWAP_QUERY_START; i < UNISWAP_QUERY_END; i += UNISWAP_BATCH_SIZE) {
        const pairs = (await uniswapQuery.functions.getPairsByIndexRange(PANCAKE_FACTORY_ADDRESS, i, i + UNISWAP_BATCH_SIZE))[0];
        const L = allTokens.length // will be 0 in first run then 500, then 1000...
        // each pair item is formatted as: [token1,token2,pairAddress]
        for (let pairIndex = 0; pairIndex < pairs.length; pairIndex++) {
            const pair = pairs[pairIndex];
            let tokenAddress = pair[0]; //main token
            let pairAddr = pair[2];
            // token1 is always the main token being swapped, token2 is what people use to trade the token. BUSD, WBNB, WETH etc...
            if (pair[1] === WBNB_ADDRESS) { // if token2 is WBNB...
                // if token has never been seen before we add it to allTokens and create a new allPoolInfo item
                if (!allTokens.includes(tokenAddress)) {
                    allTokens[L + pairIndex] = tokenAddress;
                    allPoolInfo[L + pairIndex] = {
                        'tokenAddress': tokenAddress,
                        'busdPair': '',
                        'wethPair': pairAddr
                    }
                } else { //else if token has been seen before
                    let n = _.indexOf(allTokens, tokenAddress)
                    allPoolInfo[n].busdPair = pairAddr;
                }
            } else if (pair[1] === BUSD_ADDRESS) { //if token2 is BUSD...
                if (!allTokens.includes(tokenAddress)) {
                    allTokens[L + pairIndex] = tokenAddress
                    allPoolInfo[L + pairIndex] = {
                        'tokenAddress': tokenAddress,
                        'busdPair': pairAddr,
                        'wethPair': ''
                    }
                } else {
                    let n = _.indexOf(allTokens, tokenAddress)
                    allPoolInfo[n].wethPair = pairAddr;
                }
            } else {

                continue;
            }
        }
        if (pairs.length < UNISWAP_BATCH_SIZE) {
            logger.info("that was the last breaking...")
            break
        }
    }
    logger.info(`total pairs fetched: ${allTokens.length}`);
    
    // filter out any null entries that exist due to a token pair existing, but not being paired to WBNB or BUSD
    allTokens = allTokens.filter(function(value, index, arr) {
        return value != null;
    });
    allPoolInfo = allPoolInfo.filter(function(value, index, arr) {
        return value != null;
    });
    logger.info(`pairs with WBNB or BUSD pair: ${allTokens.length}`);

    filterPairs(allTokens, allPoolInfo);
};

async function filterPairs(allTokens, allPoolInfo) {   
    let output = [];
    const ethIn = ethers.utils.parseUnits("1", "ether");
    // 1% (0.01) fee tolerance to account for the dex fee
    const feeTolerance = ethers.utils.parseUnits("0.01", "ether");
    logger.info('filtering out honeypots, tokens with high buy/sell tax, tokens with low reserves in the pair pool');
    for (let i = 0; i < allTokens.length; i++) {
        logger.info(`processing token [${allTokens[i]}]: ${i}/${allTokens.length}`);
        const processedData = TP_CONTRACT.encodeFunctionData( 
            'tokenToleranceCheck', [allTokens[i], ethIn, feeTolerance]
        );
        const checkTxn = {
            from: BNB_RESERVE_ADDRESS,
            to: TP_CONTRACT_ADDRESS,
            data: processedData,
            value: ethIn,
            gasPrice: ethers.BigNumber.from(13),
            gasLimit: ethers.BigNumber.from(6500000),
        }
        // .call() only simulates a tx and we pretend to send from an address that has enough bnb (BNB_RESERVE_ADDRESS)
        // if the token has a tax > tolerance, or is honeypot this will throw an error
        try {
            await provider.call(checkTxn)
        } catch (error) { 
            logger.info('detected honeypot or high tax, skipping');
            continue;
        }
        // If there is a WBNB pair, get its reserves
        if (allPoolInfo[i].wethPair !== "") {
            const wethPairContract = new ethers.Contract(allPoolInfo[i].wethPair, PAIR_CONTRACT_ABI, provider);
            let wethReserves = await wethPairContract.getReserves(); //if this doesnt throw an error we proceed to check minimum reserves amount
            if (wethReserves._reserve1 / (10 ** 18) > MIN_WBNB_RESERVES) {
                //output[i] = [allPoolInfo[i].tokenAddress, allPoolInfo[i].busdPair, allPoolInfo[i].wethPair]; //if enough reserves we create a output item with [token, busdPair, wethPair] addresses
                output[i] = ['"'+allPoolInfo[i].tokenAddress+'"'+",",];
            } else {
                logger.info('low WBNB reserves, skipping');
            }
        }
        // If there is a BUSD pair, get its reserves
        if (allPoolInfo[i].busdPair !== "") {
            const busdPairContract = new ethers.Contract(allPoolInfo[i].busdPair, PAIR_CONTRACT_ABI, provider);
            let busdReserves = await busdPairContract.getReserves(); //if this doesnt throw an error we proceed to check minimum reserves amount
            if (busdReserves._reserve1 / (10 ** 18) > MIN_BUSD_RESERVES) {
                //output[i] = [allPoolInfo[i].tokenAddress, allPoolInfo[i].busdPair, allPoolInfo[i].wethPair]; //if enough reserves we create a output item with [token, busdPair, wethPair] addresses
                output[i] = ['"'+allPoolInfo[i].tokenAddress+'"'+",",];
            } else {
                logger.info('low BUSD reserves, skipping');
            }
        }

    };

    const writeStream = fs.createWriteStream('../output/whitelisted_tokens.json');
    const pathName = writeStream.path;
    
    //writeStream.write("[\n");
    output.forEach(value => writeStream.write(value+'\n'));
    writeStream.on('finish', () => {
        logger.info(`wrote all filtered pairs to file ${pathName}`);
    });
    //writeStream.write("]\n");
    writeStream.on('error', (err) => {
        logger.error(`there is an error writing the file ${pathName} => ${err}`)
    });
    writeStream.end();
    logger.info(allTokens.length);
    };

getPairs();