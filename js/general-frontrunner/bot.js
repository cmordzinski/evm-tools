// CommonJS imports
require('dotenv').config();
var Web3 = require('web3');
var abiDecoder = require('abi-decoder');
var _ = require('lodash');
var BigNumber = require('big-number');

// Constants
const {
    LOGGER,
    PANCAKE_ROUTER_ADDRESS,
    PANCAKE_FACTORY_ADDRESS,
    PANCAKE_ROUTER_ABI,
    PANCAKE_FACTORY_ABI,
    PANCAKE_POOL_ABI,
    HTTP_PROVIDER_LINK,
    WEBSOCKET_PROVIDER_LINK,  
    MAX_AMOUNT,
    SLIPPAGE,
    GASPRICE,
    MINPROFIT,
    ONE_GWEI,
    INPUT_TOKEN_ADDRESS,
    OUTPUT_TOKEN_ADDRESSES,
    } = require('./constants.js');

// Vars
var pool_info = [];
let i;
var amount;
var web3;
var web3Ws;
var pancakeRouter;
var pancakeFactory;
var buyNonce;
var sellNonce
var subscription;
var attack_started = false;

// Define web3, web3Ws, pancakeRouter, pancakeFactory objects
web3 = new Web3(new Web3.providers.HttpProvider(HTTP_PROVIDER_LINK));
web3Ws = new Web3(new Web3.providers.WebsocketProvider(WEBSOCKET_PROVIDER_LINK));
pancakeRouter = new web3.eth.Contract(PANCAKE_ROUTER_ABI, PANCAKE_ROUTER_ADDRESS);
pancakeFactory = new web3.eth.Contract(PANCAKE_FACTORY_ABI, PANCAKE_FACTORY_ADDRESS);
abiDecoder.addABI(PANCAKE_ROUTER_ABI);

// Get a LocalAccount object from the WALLET_PRIVATE_KEY in the .env file
const user_wallet = web3.eth.accounts.privateKeyToAccount(process.env.WALLET_PRIVATE_KEY);


// Start
const start = async() => {
    LOGGER.info('gathering preliminary information')
    buyNonce =  await web3.eth.getTransactionCount(user_wallet.address);
    sellNonce = buyNonce + 1
    LOGGER.info(`buy nonce: ${buyNonce} - sell nonce: ${sellNonce}`);
    const len_wl_token_list = OUTPUT_TOKEN_ADDRESSES.length
    LOGGER.info(`${len_wl_token_list} tokens found in OUTPUT_TOKEN_ADDRESSES`);
    for(var index = 0; index < len_wl_token_list; index++) {
        LOGGER.info(`getting pool info for ${index+1}/${len_wl_token_list} tokens`);
        await getPoolInfo(INPUT_TOKEN_ADDRESS, OUTPUT_TOKEN_ADDRESSES, index);
     }
    LOGGER.info('getting pool info for tokens in OUTPUT_TOKEN_ADDRESSES complete');


}

async function main() { 
    try {   
        web3Ws.onopen = function(evt) {
            web3Ws.send(JSON.stringify({ method: "subscribe", topic: "transfers", address: user_wallet.address}));
            LOGGER.info('connected');
        }
        LOGGER.info('subscribing to pendingTransaction events');
        subscription = web3Ws.eth.subscribe('pendingTransactions', function (error, result) {
        }).on("data", async function (transactionHash) {
             let transaction = await web3.eth.getTransaction(transactionHash);
             if (transaction != null && transaction['to'] == PANCAKE_ROUTER_ADDRESS)
             {
                 await handleTransaction(transaction, OUTPUT_TOKEN_ADDRESSES, user_wallet);
             }
        })
    } catch (error) {
      LOGGER.error(`failed to fetch mempool data: ${error}`);
      process.exit();
    }
}

async function handleTransaction(transaction, out_token_addresses, user_wallet) {
    
    if (await triggersFrontRun(transaction, out_token_addresses)) {
        subscription.unsubscribe();
        let gasPrice = parseInt(transaction['gasPrice']);
        let newGasPrice = gasPrice + GASPRICE*ONE_GWEI;
        if(amount > MAX_AMOUNT){
            amount = MAX_AMOUNT
        }
        var estimatedInput = ((amount*0.999)*(10**18));
        var realInput = SLIPPAGE*(amount*(10**18));
        var gasLimit = (300000);
        var outputtoken = await getAmountOut(estimatedInput, pool_info[i].input_volumn, pool_info[i].output_volumn);
        swap(newGasPrice, gasLimit, outputtoken, realInput, 0, out_token_addresses[i], user_wallet, transaction);
        swap(gasPrice, gasLimit, outputtoken, 0, 1, out_token_addresses[i], user_wallet, transaction);
        LOGGER.info('attempted frontrun - txHash: '+ transaction['hash']);
        attack_started = false;
        return execute();
    }
}

async function triggersFrontRun(transaction, out_token_addresses) { 
    if(attack_started)
        return false;
    if(parseInt(transaction['gasPrice']) / 10**9 > 10 || parseInt(transaction['gasPrice'])/10**9 < 3 ){
        return false;
    }
    LOGGER.info('txHash: '+ transaction['hash']);
    LOGGER.info('gasPrice: '+ transaction['gasPrice']/10**9);
    let data = parseTx(transaction['input']);
    let method = data[0];
    let params = data[1];
    if(method != 'swapExactETHForTokens' && method != 'swapExactTokensForTokens')
    {
        LOGGER.info('method called is not swapExactEthForTokens or swapExactTokensForTokens, ignoring.');
        return false;
    }
    else if(method == 'swapExactETHForTokens')
    {
        LOGGER.info('method:' + method);
        let path = params[1].value;
        let in_token_addr = path[0];
        let out_token_addr = path[path.length-1];
        let recept_addr = params[2].value;
        let deadline = params[3].value;
        if(_.includes(out_token_addresses, out_token_addr))
        {
            i = _.indexOf(out_token_addresses, out_token_addr)
        }
        else
        {
            LOGGER.error('token not whitelisted in OUTPUT_TOKEN_ADDRESSES, ignoring.');
            LOGGER.error('token address: '+ out_token_addr);
            return false;
        }
        //reserves have to be divided by decimals
        let in_amount = transaction.value; 
        let b = transaction.value/10**18;
        let out = params[0].value/10**18;
        await updatePoolInfo(i);
        const x = pool_info[i].output_volumn/10**18;
        const K = (pool_info[i].input_volumn/10**18)*(pool_info[i].output_volumn/10**18)
        const y = (pool_info[i].input_volumn/10**18)
        const a = (1/2)*(Math.sqrt((b/1.0025)*((b/1.0025)+4*(K/out)))-(b/1.0025)-2*y) //optimal amount for you to purchase
        const firstnewX = K/(y+a);
        const tokensReceived = x - firstnewX;
        const secondnewX = K/(y+a+(b/1.0025))
        const secondtokensReceived = firstnewX -  secondnewX 
        const afterSellY = K/(secondnewX+tokensReceived);
        const ethReceived = (y+a+(b/1.0025) - afterSellY);
        const profit = (ethReceived-a)-(0.0025)*(ethReceived+a)
        LOGGER.info(`estimated profit is: ${profit}`);
        if(profit>MINPROFIT && a>0) 
        {
            amount = a;
            attack_started = true;
            LOGGER.info("would have frontran")
            return false;
        }
        else
        {
            LOGGER.info('estimated profit too low, ignoring.');
            return false;
        }
    }
    else if(method == 'swapExactTokensForTokens')
    {
        LOGGER.info('method:' + method);
        let path = params[2].value;
        let in_token_addr = path[path.length-2];
        let out_token_addr = path[path.length-1];
        let recept_addr = params[3].value;
        let dead_line = params[4].value;
        if(_.includes(out_token_addresses, out_token_addr))
        {
            i = _.indexOf(out_token_addresses, out_token_addr)
        }
        else{
            LOGGER.error('token not whitelisted in OUTPUT_TOKEN_ADDRESSES, ignoring.');
            LOGGER.error('token address: '+ out_token_addr);
            return false;
        }
        if(in_token_addr != INPUT_TOKEN_ADDRESS)
        {
            LOGGER.info('token paired to swap is not INPUT_TOKEN_ADDRESS, ignoring.');
            return false;
        } 
        let b = params[0].value/10**18;
        let out_min = params[1].value; 
        let out = params[1].value/10**18;
        await updatePoolInfo(i);
        const x = pool_info[i].output_volumn/10**18;
        const K = (pool_info[i].input_volumn/10**18)*(pool_info[i].output_volumn/10**18)
        const y = (pool_info[i].input_volumn/10**18)
        const a = (1/2)*(Math.sqrt((b/1.0025)*((b/1.0025)+4*(K/out)))-(b/1.0025)-2*y)
        const firstnewX = K/(y+a);
        const tokensReceived = x - firstnewX;
        const secondnewX = K/(y+a+(b/1.0025))
        const secondtokensReceived = firstnewX -  secondnewX 
        const afterSellY = K/(secondnewX+tokensReceived);
        const ethReceived = (y+a+(b/1.0025) - afterSellY);
        const profit = (ethReceived-a)-(0.0025)*(ethReceived+a)
        LOGGER.info(`estimated profit is: ${profit}`);
        if(profit>MINPROFIT && a>0) 
        {
            amount = a;
            attack_started = true;
            LOGGER.info("would have frontran")
            return false;
        }
        else
        {           
            LOGGER.info('estimated profit too low, skipping.');
            return false;
        }
    }
    LOGGER.info('skipping due to implicit ignore')
    return false;
}

async function getAmountOut(aIn, reserveA, reserveB) {
    const aInWithFee = BigNumber(aIn).multiply(997); //0.3% fee that's right
    const numerator = BigNumber(aInWithFee).multiply(reserveB)
    const denominator = BigNumber(aInWithFee).add(BigNumber(reserveA).multiply(1000));
    const bOut = BigNumber(numerator).divide(denominator);
    return bOut
}

async function swap(gasPrice, gasLimit, outputtoken, outputeth, trade, out_token_address, user_wallet, transaction) {
    var from = user_wallet;
    var deadline;
    var swap;
    await web3.eth.getBlock('latest', (error, block) => {
        deadline = block.timestamp + 300; // transaction expires in 300 seconds (5 minutes)
    });
    deadline = web3.utils.toHex(deadline);
    if(trade == 0) { 
        swap = pancakeRouter.methods.swapETHForExactTokens(outputtoken.toString() , [INPUT_TOKEN_ADDRESS, out_token_address], from.address, deadline);
        var encodedABI = swap.encodeABI();
        var tx = {
            from: from.address,
            to: PANCAKE_ROUTER_ADDRESS,
            gas: gasLimit,
            gasPrice: gasPrice,
            nonce: buyNonce.toString(),
            data: encodedABI,
            value: outputeth
          };
    } else { 
        swap = pancakeRouter.methods.swapExactTokensForETH(outputtoken.toString(), '0', [out_token_address, INPUT_TOKEN_ADDRESS], from.address, deadline);
        var encodedABI = swap.encodeABI();
        var tx = {
            from: from.address,
            to: PANCAKE_ROUTER_ADDRESS,
            gas: gasLimit,
            gasPrice: gasPrice,
            nonce: sellNonce.toString(),
            data: encodedABI,
            value: 0*10**18
          };
    }
    var signedTx = await from.signTransaction(tx);
    if(trade == 0) {
        let is_pending = await isPending(transaction['hash']);
        if(!is_pending) {
            LOGGER.info("the transaction you want to attack has already been completed!!!");
            process.exit();
        }else{
        web3.eth.sendSignedTransaction(signedTx.rawTransaction)
        }
    }else{
        web3.eth.sendSignedTransaction(signedTx.rawTransaction)
    }
}

function parseTx(input) {
    if (input == '0x')
        return ['0x', []]
    let decodedData = abiDecoder.decodeMethod(input);
    let method = decodedData['name'];
    let params = decodedData['params'];

    return [method, params]
}

async function isPending(transactionHash) {
    return await web3.eth.getTransactionReceipt(transactionHash) == null;
}

async function getPoolInfo(input_token_address, out_token_addresses, index){

        var pool_address = await pancakeFactory.methods.getPair(input_token_address, out_token_addresses[index]).call();
        var pool_contract = new web3.eth.Contract(PANCAKE_POOL_ABI, pool_address);
        var reserves = await pool_contract.methods.getReserves().call();

        var token0_address = await pool_contract.methods.token0().call();

        if(token0_address == INPUT_TOKEN_ADDRESS) {
            var forward = true;
            var bnb_balance = reserves[0];
            var token_balance = reserves[1];
        } else {
            var forward = false;
            var bnb_balance = reserves[1];
            var token_balance = reserves[0];
        }

        pool_info[index] = {'contract': pool_contract, 'forward': forward, 'input_volumn': bnb_balance, 'output_volumn': token_balance}
       
    
}

async function updatePoolInfo(i) {
    try{
        LOGGER.info(`updating pool_info at index ${i}`);
        var reserves = await pool_info[i].contract.methods.getReserves().call();

        if(pool_info[i].forward) {
            var eth_balance = reserves[0];
            var token_balance = reserves[1];
        } else {
            var eth_balance = reserves[1];
            var token_balance = reserves[0];
        }

        pool_info[i].input_volumn = eth_balance;
        pool_info[i].output_volumn = token_balance;

    }catch (error) {
      
        LOGGER.error('failed fo get pair info');

        return false;
    }
}

//-----------------EXTRA FUNCTIONS getPairAddress of tokenA-tokenB pool offline.
//const getUniv2PairAddress = (tokenA, tokenB) => {
//    const [token0, token1] = sortTokens(tokenA, tokenB);
//  
//    const salt = ethers.utils.keccak256(token0 + token1.replace("0x", ""));
//    const address = ethers.utils.getCreate2Address(
//      "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f", // Factory address (contract creator)
//      salt,
//      "0x96e8ac4277198ff8b6f785478aa9a39f403cb768dd02cbee326c3e7da348845f" // init code hash
//    );
//  
//    return address;
//};
  
const execute = async() =>{
start().then(() => {
    LOGGER.info('starting ...');
    main()
});
}
execute();
