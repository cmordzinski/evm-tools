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

// The contract called here is the UniswapFlashQuery contract
const getPairs = async () => {   
    let allPoolInfo = [];
    let allTokens = [];
    let output = [];
    const provider = new ethers.providers.WebSocketProvider(RPC_URL_WSS);
    logger.info("connected to RPC")
    const uniswapQuery = new ethers.Contract(UNISWAP_QUERY_CONTRACT_ADDRESS, UNISWAP_QUERY_ABI, provider);
    logger.info("connected to contract")
    // this will get the first 10 000 pairs in batches of 500
    for (let i = UNISWAP_QUERY_START; i < UNISWAP_QUERY_END; i += UNISWAP_BATCH_SIZE) {
        const pairs = (await uniswapQuery.functions.getPairsByIndexRange(PANCAKE_FACTORY_ADDRESS, i, i + UNISWAP_BATCH_SIZE))[0];
        // each pair item is formatted as: [token1,token2,pairAddress]
        // for each pair in pairs we check whether token2 is busd or weth
        const L = allTokens.length //will be 0 in first run then 500, then 1000...
        for (let pairIndex = 0; pairIndex < pairs.length; pairIndex++) {
            const pair = pairs[pairIndex];
            // token1 is always the main token being swapped, token2 is what people use to trade the token. BUSD, WBNB, WETH etc...
            let tokenAddress = pair[0]; //main token
            let pairAddr;

            // we check whether token2 (i.e pair[1]) is busd or weth because we are only focusing on pairs that contain either of these
            if (pair[1] === WBNB_ADDRESS) { // if token2 is WBNB...
                pairAddr = pair[2];
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
                pairAddr = pair[2];
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
            logger.info("breaking...")
            break
        }
    }
    logger.info(`totalPairs fetched: ${allTokens.length}`);
    
    allTokens = allTokens.filter(function(value, index, arr) {
        return value != null;
    });

    allPoolInfo = allPoolInfo.filter(function(value, index, arr) {
        return value != null;
    });

    logger.info('filtering out honeypots, tokens with high buy/sell tax, tokens with low reserves in the pair pool');

    const ethIn = ethers.utils.parseUnits("1", "ether");
    
    for (let i = 0; i < allTokens.length; i++) {
        logger.info(`processing token [${allTokens[i]}]`);
        var processedData = TP_CONTRACT.encodeFunctionData( //we have a 1% (0.01) fee tolerance because we're accounting for the dex Fee
            'tokenToleranceCheck', [allTokens[i], ethIn, ethers.utils.parseUnits("0.01", "ether")]
        );
        var checkTxn = {
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
            logger.error('error calling tokenToleranceCheck(), honeypot or high tax');
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
                logger.error(`low WBNB reserves: ${allPoolInfo[i].tokenAddress}`);
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
                logger.error(`low BUSD reserves: ${allPoolInfo[i].tokenAddress}`);
            }
        }

    };

    const writeStream = fs.createWriteStream('../output/whitelisted_tokens.json');
    const pathName = writeStream.path;
    
    //writeStream.write("[\n");
    output.forEach(value => writeStream.write(value+'\n'));
    writeStream.on('finish', () => {
        logger.info(`wrote all the array data to file ${pathName}`);
    });
    //writeStream.write("]\n");
    writeStream.on('error', (err) => {
        logger.error(`There is an error writing the file ${pathName} => ${err}`)
    });
    writeStream.end();
    logger.info(allTokens.length);
    }

getPairs();