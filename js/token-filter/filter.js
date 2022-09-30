const _ = require('lodash');
const fs = require('fs');
const {ethers} = require('ethers')

const {
    LOGGER,
    PAIR_CONTRACT_ABI,
    UNISWAP_QUERY_ABI,
    UNISWAP_BATCH_SIZE,
    TP_CONTRACT_ADDRESS,
    TP_CONTRACT,
    BNB_RESERVE_ADDRESS,
} = require('./constants.js');

// The contract called here is the UniswapFlashQuery contract
const getPairs = async () => {   
    let allPoolInfo = [];
    let allTokens = [];
    const provider = new ethers.providers.WebSocketProvider("wss://ws-nd-654-414-664.p2pify.com/ae9f2cd14774753ae3150be26252ebbb");
    LOGGER.info("connected to RPC")
    const uniswapQuery = new ethers.Contract("0xAe197E1C310AEC1c254bCB7998cdFd64541c9eef", UNISWAP_QUERY_ABI, provider);
    LOGGER.info("connected to contract")
    // this will get the first 50 000 pairs in batches of 500
    for (let i = 0; i < 50000; i += UNISWAP_BATCH_SIZE) {
        const pairs = (await uniswapQuery.functions.getPairsByIndexRange("0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73", i, i + UNISWAP_BATCH_SIZE))[0];
        // each pair item is formatted as: [token1,token2,pairAddress]
        // for each pair in pairs we check whether token2 is busd or weth
        const L = allTokens.length //will be 0 in first run then 500, then 1000...
        for (let pairIndex = 0; pairIndex < pairs.length; pairIndex++) {
            const pair = pairs[pairIndex];
            // token1 is always the main token being swapped, token2 is what people use to trade the token. BUSD, WBNB, WETH etc...
            let tokenAddress = pair[0]; //main token
            let pairAddr;

            // we check whether token2 (i.e pair[1]) is busd or weth because we are only focusing on pairs that contain either of these
            if (pair[1] === '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56') { // if token2 is BUSD...
                pairAddr = pair[2];
                // if token has never been seen before we add it to allTokens and create a new allPoolInfo item
                if (!allTokens.includes(tokenAddress)) {
                    allTokens[L + pairIndex] = tokenAddress;
                    allPoolInfo[L + pairIndex] = {
                        'tokenAddress': tokenAddress,
                        'busdPair': pairAddr,
                        'wethPair': ''
                    }
                } else { //else if token has been seen before
                    let n = _.indexOf(allTokens, tokenAddress)
                    allPoolInfo[n].busdPair = pairAddr;
                }

            } else if (pair[1] === '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c') { //if token2 is WBNB...
                pairAddr = pair[2];
                if (!allTokens.includes(tokenAddress)) {
                    allTokens[L + pairIndex] = tokenAddress
                    allPoolInfo[L + pairIndex] = {
                        'tokenAddress': tokenAddress,
                        'busdPair': '',
                        'wethPair': pairAddr
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
            LOGGER.info("breaking...")
            break
        }
    }

    LOGGER.info(`totalPairs fetched: ${allTokens.length}`)
    LOGGER.info('filtering honeypots, buy/sell tax, BUSD reserves < 1000')
    
    // this is an optional trick to ensure that there is both a busd and weth pair
    // if the token is missing a busd or weth pair we set the item to null so that we can eliminate it later
    //for (let i = 0; i < allPoolInfo.length; i++) {
    //    try {
    //        if (allPoolInfo[i].busdPair === '' || allPoolInfo[i].wethPair === '') { 
    //            allTokens[i] = null;
    //            allPoolInfo[i] = null;
    //        } else {
    //            continue;
    //        }
    //    } catch (err) {
    //        continue;
    //    }
    //}

    let poolInfo = [];
    let tokens = [];
    let output = [];

    //if value is null we remove it from array. Note that everything is done in parallel so that the first token in allTokens corresponds to the right output_info 
    //.filter create a new array (in this case tokens) that has been filtered
    tokens = allTokens.filter(function(value, index, arr) {
        return value != null;
    });

    poolInfo = allPoolInfo.filter(function(value, index, arr) {
        return value != null;
    });

    allPoolInfo.length = 0;
    allTokens.length = 0;

    // filter for tokens that have a TAX or HONEYPOT and then filter again if the busd reserve is less than 1000 busd
    LOGGER.info("testing pair [tokenToleranceCheck]");

    const ethIn = ethers.utils.parseUnits("1", "ether");

    for (let i = 0; i < tokens.length; i++) {
        LOGGER.info("processing token in tokens list at index: " + i);
        LOGGER.info(tokens[i]);
        var processedData = TP_CONTRACT.encodeFunctionData( //we have a 1% (0.01) fee tolerance because we're accounting for the dex Fee
            'tokenToleranceCheck', [tokens[i], ethIn, ethers.utils.parseUnits("0.01", "ether")] //token address
        );
        var checkTxn = {
            from: BNB_RESERVE_ADDRESS,
            to: TP_CONTRACT_ADDRESS,
            data: processedData,
            value: ethIn,
            gasPrice: ethers.BigNumber.from(13),
            gasLimit: ethers.BigNumber.from(6500000),
        }
        //we check token fee whithout using any gas: .call() only simulates a tx and we pretend to send from an address that has enough bnb (BNB_RESERVE_ADDRESS)
        try {
            await provider.call(checkTxn) //if the token has a tax or is honeypot this will throw an error
            const pairContract = new ethers.Contract(poolInfo[i].busdPair, PAIR_CONTRACT_ABI, provider);
            let reserves = await pairContract.getReserves(); //if this doesnt throw an error we proceed to check minimum reserves amount
            if (reserves._reserve1 / (10 ** 18) > 1000) {
                output[i] = [poolInfo[i].tokenAddress, poolInfo[i].busdPair, poolInfo[i].wethPair]; //if enough reserves we create a output item with [token, busdPair, wethPair] addresses
            } else {
                output[i] = "low_busd_reserves"; //else you will see a value indicating that we ignored this pair because of not enough reserves
            }
        } catch (error) { //if toleranceCheck fails you will see the value indicating that we ignored this pair because of tax/honeypot
            output[i] = "tax_or_honeypot";
        };

    }

    const writeStream = fs.createWriteStream('./output/output.txt');
    const pathName = writeStream.path;
    
    output.forEach(value => writeStream.write(`${JSON.stringify(value)}\n)`));
    writeStream.on('finish', () => {
        LOGGER.info(`wrote all the array data to file ${pathName}`);
    });
    writeStream.on('error', (err) => {
        LOGGER.error(`There is an error writing the file ${pathName} => ${err}`)
    });
    writeStream.end();
    LOGGER.info(tokens.length);

}
getPairs();
