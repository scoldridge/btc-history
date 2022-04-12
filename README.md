## Requirements

node.js 14+
npm

## Usage

node index.js [currency] [txcount]

- currency is one of [btc, doge, ltc, bch] - defaults to btc
- txcount can be ommitted and the script will figure out the first transaction number

## Example Output

Output from the script is JSON and prints the balance amount at each important block

```
{
    "block": "x",
    "timestamp": "date",
    "balances": {
        "send": 1.00000000
        "fee": 0.00001000
        "receive": 2.00000000
    }
}
```

## Core Commands

The core daemon software takes an input file (wallet.dat) with a list of addresses.

Note: dogecoin requires much more ram than the others, we have used theses values:
- Dogecoin: 16GB
- Litecoin: 8GB
- Bitcoin: 4GB

##### Starting the daemon

Note: bitcoin-cash uses the prefix `bitcoin` for all of its binaries.

`bitcoind -daemon -stopatheight=665000`
`litecoind -daemon -stopatheight=2000000`
BCH: `bitcoind -daemon -stopatheight=675000`

- Start the daemon in sync mode, and stop syncing at certain block height, note that doge does not support this option

`bitcoind -connect=0 -noconnect -daemon -walletdir=/home/ubuntu/wallet_dir -rpcuser=username -rpcpassword=password`
`litecoind -connect=0 -noconnect -daemon -walletdir=/home/ubuntu/wallet_dir -rpcuser=username -rpcpassword=password`
`dogecoind -connect=0 -noconnect -daemon -rpcuser=username -rpcpassword=password`

Note: dogecoin does not support the walletdir parameter, use the default location instead (~/.dogecoin)

- Start the daemon with no connection to the network, expose rpc 

`bitcoin-cli stop`
`litecoin-cli stop`

- Stop the daemon

##### Resyncing the daemon

`bitcoin-cli rescanblockchain start_block stop_block`
- Rescan for transactions between these blocks


##### Logging

`tail ~/.bitcoin/debug.log -f`
- Follow the logs