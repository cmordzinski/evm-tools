
# Token Sniffer 

Token Sniffer will listen for PairCreated events on EVM compatible blockchains and send notifications containing the pair created and corresponding transaction hash to a discord channel via webhook.

<br>

Usage: <p>
    ```./token_sniffer.py run --config /path/to/config```

# Info

When there is a new PairCreated event log the contract addresses of both tokens in the pair, along with thier symbols. Format this information and send to a discord channel using the webhook defined in the config file. The example bsc.json config file is set up for Binance Smart Chain, but this program will work on any EVM compatible blockhain as long as the config is properly updated. Logs to STDOUT, and syslog.


* Example Log:

<pre>
$./token_sniffer.py run --config bsc.json
[Thu, 04 Nov 2021 19:17:04] INFO [tokensniffer.log] Web3 successfully connected
[Thu, 04 Nov 2021 19:17:04] INFO [tokensniffer.log] Listening for new contracts                             
[Mon, 23 May 2022 14:37:49] INFO [tokensniffer.log] Found new token pair 0x6D7Ea6904fF1516E012Abc764902DF970946a324 - 0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c
[Mon, 23 May 2022 14:37:49] INFO [tokensniffer.log] Chain: BSC | Pair: CC30-WBNB
[Mon, 23 May 2022 14:38:24] INFO [tokensniffer.log] Found new token pair 0x1621bEFE3830E7f61D0f62826d2464ae586939e6 - 0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c
[Mon, 23 May 2022 14:38:24] INFO [tokensniffer.log] Chain: BSC | Pair: SleekInu-WBNB
[Mon, 23 May 2022 14:38:57] INFO [tokensniffer.log] Found new token pair 0x4ebb8510f622727a4a0138F22d04Eabe6AF21E28 - 0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c
[Mon, 23 May 2022 14:39:09] INFO [tokensniffer.log] Chain: BSC | Pair: DOGEZILLA2.0-WBNB
</pre>

