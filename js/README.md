# JavaScript

Collection of JavaScript tools to interact with EVM compatible blockchains. The code in this repository primarily exists for learning/experimenting purposes.
<p>

Prerequisites:
 - node v18.9.0
   - Note: These tools probably work with other versions of node as well, this is just what I have been using & know works.

## general-frontrunner
General frontrunner bot to attempt to frontrun transactions with large amounts of slippage.
 - For additional info, look at the README file in the general-frontrunner subdirectory.
 - This bot will only attempt to frontrun swaps of tokens in OUTPUT_TOKEN_ADDRESSES in constants.js
   - This is done because there are lots of honeypots, tokens with high buy/sell taxes, tokens with no liquidity, etc that we want to avoid
   - You will want to use the token-filter code to assist in generating a list of tokens
<pre>
cd general-frontrunner
npm install
node src/utils/approveTokens.js - this will approve all the tokens in OUTPUT_TOKEN_ADDRESSES for swaps, make sure you have enough gas
node src/app.js - this will run the bot to attempt to frontrun pending tx of tokens in OUTPUT_TOKEN_ADDRESSES when profitable
</pre>

## token-filter
Mass filter token pairs on an exchange
 - For additional info, look at the README file in the token-filter subdirectory.
<pre>
cd token-filter
npm install
node src/app.js
cat output/filter.txt - this is where filtered pairs that make the cut will be written to
</pre>
