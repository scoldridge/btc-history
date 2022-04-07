const axios = require('axios');
const { bitcoinImportantBlocks } = require('./blocks');

// - Counters and constants
let sendAmount = 0;
let sendFeeAmount = 0;
let receiveAmount = 0;

const BATCH_TX_COUNT = 5000; // Process this many transactions at once
const JUMP_TX_COUNT = 5000; // Move this many transactions forward
const balances = [];

// - External RPC calls to bitcoin-core
const rpc = async (method, params) => {
    const url = "http://username:password@127.0.0.1:8332/";
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
            upperBoundary = check - 1;
        } else {
            lowerBoundary = check;
        }
    }
    console.log(`Found first transaction at ${lowerBoundary}`)
    return lowerBoundary;
}

// - Input an array of transactions and calculate their balance
const processTransactions = (transactions, prevBlock, prevTime) => {
    transactions.map((tx) => {
        prevBlock = tx.blockheight;
        if (bitcoinImportantBlocks.length === 0) return;

        if (prevBlock >= bitcoinImportantBlocks[0]) {
            let snapshotBlock = bitcoinImportantBlocks.shift();
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
    const alive = await rpc("getwalletinfo", []);
    const liveCount = await getFirstTransaction(alive.txcount);

    let startAtTx = liveCount - BATCH_TX_COUNT;
    let prevBlock = 0;
    let prevTime = 1522544400; // 2018-04-01

    while (startAtTx >= 0 || prevBlock > bitcoinImportantBlocks[bitcoinImportantBlocks.length - 1]) {
        const next = processTransactions(
            await rpc("listtransactions", ["*", BATCH_TX_COUNT, startAtTx]), 
            prevBlock, 
            prevTime
        );
        prevBlock = next.prevBlock;
        prevTime = next.prevTime;
        startAtTx -= BATCH_TX_COUNT;
    }
    console.log(balances.toString());
}

start();