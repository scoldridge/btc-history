## Requirements

node.js 14+
npm
bitcoin, litecoin, dogecoin or bitcoin-cash (bitcoin-abc) daemon software
EG: https://medium.com/coinmonks/how-to-compile-bitcoin-core-from-source-5539ff9fbce5

## Usage

`node index.js [currency] [txcount]`

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

## Core Setup

The core daemon software takes an input file (wallet.dat) with a list of addresses.

Note: dogecoin requires much more ram than the others, we have used theses values:
- Dogecoin: 16GB
- Litecoin: 8GB
- Bitcoin: 4GB

## Start the daemon (testnet use)

Testnet mode will allow us to verify the outputs of the script from any node.
We will choose a random list of publicly available addresses on blockchain.info and run the script with the snapshot every 10000 blocks.

`bitcoind -daemon -stopatheight=1640000 -testnet`
- Let the bitcoin testnet sync until `<block>`

`bitcoind -connect=0 -noconnect -daemon -testnet -rpcuser=username -rpcpassword=password`

- Start daemon with rpcuser/pass and do not connect to network

`bitcoin-cli -rpcport=18332 -rpcuser=username -rpcpassword=password -named createwallet wallet_name="testnet" descriptors=false`

- Create a wallet as we are not importing one here

`bitcoin-cli importaddress <address> false`

- Import an address in watchonly mode, and do not run a rescan

`bitcoin-cli -rpcuser=username -rpcpassword=password -rpcport=18332 importaddress 2N2ihWD7peTiHpLf9Ly2MmJWT6NMDGTdCLN "" false`

`bitcoin-cli -rpcuser=username -rpcpassword=password -rpcport=18332 importaddress tb1qf5scd68pjy6funqdlg6mx6v6hgqulgfmll490f "" false`

`bitcoin-cli -rpcuser=username -rpcpassword=password -rpcport=18332 importaddress 2MwsfKaVymNgMQcBEKNnaiTKJvuJKhZPrtP "" false`

`bitcoin-cli -rpcuser=username -rpcpassword=password -rpcport=18332 importaddress mkoPnqvwZJwhj2Jc7XA3MZuiv8VFUM1X52 "" false`

`bitcoin-cli -rpcuser=username -rpcpassword=password -rpcport=18332 rescanblockchain 1540000 1640000`

- Rescan for transactions between `<start_block>` and `<end_block>`, run this after importing all of the desred addresses and the daemon will rescan the blockchain and pick up any transaction that matches our address set.

`bitcoin-cli -rpcuser=username -rpcpassword=password listtransactions "*" 1 1`

- Verify that there are transactions reported from the daemon

## Starting the daemon (production use)

Note: bitcoin-cash uses the prefix `bitcoin` for all of its binaries.

`bitcoind -daemon -stopatheight=665000`

`litecoind -daemon -stopatheight=2000000`

BCH: `bitcoind -daemon -stopatheight=675000`

`dogecoind -daemon`

- Start the daemon in sync mode, and stop syncing at certain block height, note that doge does not support this option and will instead need to be stopped manually, or allowed to sync all blocks.

`bitcoind -connect=0 -noconnect -daemon -walletdir=/home/ubuntu/wallet_dir -rpcuser=username -rpcpassword=password`

`litecoind -connect=0 -noconnect -daemon -walletdir=/home/ubuntu/wallet_dir -rpcuser=username -rpcpassword=password`

`dogecoind -connect=0 -noconnect -daemon -rpcuser=username -rpcpassword=password`

Note: dogecoin does not support the walletdir parameter, use the default location instead (~/.dogecoin)

- Start the daemon with no connection to the network, expose rpc 

`bitcoin-cli stop`

`litecoin-cli stop`

`dogecoin-cli stop`

- Stop the daemon

##### Logging

`tail ~/.bitcoin/debug.log -f`
- Follow the logs