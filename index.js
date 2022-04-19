const axios = require('axios');
const { 
    bitcoinImportantBlocks, 
    bitcoinCashImportantBlocks,
    litecoinImportantBlocks,
    dogecoinImportantBlocks,
    testnetImportantBlocks
} = require('./blocks');

// - Counters and constants
let sendAmount = 0;
let sendFeeAmount = 0;
let receiveAmount = 0;

const BATCH_TX_COUNT = 5000; // Process this many transactions at once
const JUMP_TX_COUNT = 7500; // Move this many transactions forward
const balances = [];

let blocks = 0; // This is required for coins that don't store blockheight

// - Defaults
let currency = "btc";
let importantBlocks = bitcoinImportantBlocks;

// - External RPC calls to bitcoin-core
const rpc = async (method, params) => {
    const port = 
        currency === "ltc" ? 9332 :
        currency === "doge" ? 22555 : 
        currency === "tbtc" ? 18332 : 8332
    const url = `http://username:password@127.0.0.1:${port}/`;
    const { data } = await axios.post(url, { jsonrpc: "1.0", method, params} );
    return data.result;
}

// - The daemon returns an estimated number of transactions, so we need to find the first one
const getFirstTransaction = async (start) => {
    let lowerBoundary = start;
    let upperBoundary = start + JUMP_TX_COUNT;

    while (lowerBoundary != upperBoundary) {
        console.log(`Check between ${lowerBoundary}..${upperBoundary}`);
        const check = Math.floor((lowerBoundary + upperBoundary) / 2);
        const result = await rpc("listtransactions", ["*", 1, check]);

        if (result.length === 0) {
            upperBoundary = check;
        } else {
            lowerBoundary = check;
        }

        if (upperBoundary - lowerBoundary == 1) {
            //upperBoundary is non-existent, so return lowerBoundary
            upperBoundary = lowerBoundary;
        }
    }
    return lowerBoundary;
}

// - Input an array of transactions and calculate their balance
const processTransactions = (transactions, prevBlock, prevTime) => {
    transactions.map((tx) => {
        prevBlock = ["ltc", "doge"].includes(currency) ? blocks - tx.confirmations : tx.blockheight;
        if (importantBlocks.length === 0) return;

        if (prevBlock >= importantBlocks[0]) {
            let snapshotBlock = importantBlocks.shift();
            let timestamp = new Date(prevTime * 1000).toISOString();

            balances.push({
                block: snapshotBlock,
                time: timestamp,
                balances: {
                    send: sendAmount,
                    fee: sendFeeAmount,
                    receive: receiveAmount,
                }
            });
        }

        if (Number(tx.confirmations) > 1) {
            if (!tx.fee) receiveAmount += Math.abs(tx.amount);
            else {
                sendAmount += Math.abs(tx.amount);
                sendFeeAmount += Math.abs(tx.fee);
            }
        }
        prevTime = tx.blocktime;
    });

    return { prevBlock, prevTime }
}

const start = async () => {
    const args = process.argv.slice(2);
    currency = args[0] ? args[0] : currency;

    importantBlocks = (currency === 'bch') ? bitcoinCashImportantBlocks
        : (currency === 'ltc') ? litecoinImportantBlocks
        : (currency === 'doge') ? dogecoinImportantBlocks
        : (currency === 'tbtc') ? testnetImportantBlocks
        : bitcoinImportantBlocks;

    const alive = await rpc("getwalletinfo", []);
    const liveCount = args[1] ? args[1] : await getFirstTransaction(alive.txcount);

    if (currency === "ltc" || currency === "doge") {
        console.log("Getting highest block height");
        const blockinfo = await rpc("getblockchaininfo", []);
        blocks = blockinfo.blocks;
    };

    console.log(`Found first transaction at ${liveCount}`);

    let startAtTx = liveCount - BATCH_TX_COUNT;
    let prevBlock = 0;
    let prevTime = 1522544400; // 2018-04-01

    while (startAtTx >= 0 || prevBlock > importantBlocks[importantBlocks.length - 1]) {
        const next = processTransactions(
            await rpc("listtransactions", ["*", BATCH_TX_COUNT, startAtTx]), 
            prevBlock, 
            prevTime
        );
        prevBlock = next.prevBlock;
        prevTime = next.prevTime;
        startAtTx -= BATCH_TX_COUNT;
    }
    console.log(JSON.stringify(balances));
}

start();