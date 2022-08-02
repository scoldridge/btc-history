const fs = require('fs');
const parse = require("csv-parse");
const _ = require('lodash');
const moment = require('moment');
const { exit } = require('process');
const path = require('path');

// Extended data
let daemonDeposits = [];
let daemonWithdrawals = [];
let databaseDeposits = [];
let databaseWithdrawals = [];

// Fast lookups
let daemonDepositHashes = [];
let daemonWithdrawalHashes = [];

let databaseDepositHashes = [];
let databaseWithdrawalHashes = [];

// Time discrepancies
let daemonTimeDepositHashes = [];
let daemonTimeWithdrawalHashes = [];

let databaseTimeDepositHashes = [];
let databaseTimeWithdrawalHashes = [];

let daemonMissedWithdrawalOmitted = 0;
let daemonMissedDepositOmitted = 0;

let databaseMissedWithdrawalOmitted = 0;
let databaseMissedDepositOmitted = 0;

let checked = 0;
const args = process.argv.slice(2);
const quarters = [
    1530403200, // 0
    1538352000,
    1546300800,
    1554076800,
    1561939200,
    1569888000,
    1577836800,
    1585699200, // 7
    1593561600,
    1601510400,
    1609459200,
    1617235200,
    1625097600,
    1633046400,
    1640995200, // 14
]

const startTime = Number(args[0]) > 0 ? quarters[Number(args[0])] : quarters[0];
const endTime = Number(args[1]) > 0 ? quarters[Number(args[1])] : quarters[1];

const currencies = ['btc', 'doge', 'ltc', 'bch'];

const start = async () => {
    // console.log(`Loading daemon transactions..`)
    const fileDirectory = fs.readdirSync('./csv/');
    const files = fileDirectory.filter((f) => !currencies.includes(f));

    if (files.length === 0) {
        console.log(`Missing files under ./csv/`);
        exit;
    }

    files.map(async (file) => {
        fs.createReadStream(`./csv/${file}`).pipe(
            parse({ delimiter: ",", from_line: 2 }) // skip header
        )
        .on("data", (row) => {
            const type = row[0];
            const hash = row[4];

            if (row[3] >= startTime && row[3] < endTime) {
                const amount = row[1];
                const created = row[3];                

                if (type === "send") {
                    daemonWithdrawals.push({
                        amount: Math.abs(amount),
                        hash,
                        created,
                        fee: Math.abs(row[2]),
                    });

                    daemonWithdrawalHashes.push(hash);
                } else {
                    daemonDeposits.push({
                        amount,
                        hash,
                        created,
                    });
                    
                    daemonDepositHashes.push(hash);
                }

            } else {
                // Add these hashes to out-of-time lookups, as the bitcoin network can be slow to confirm transactions
                type === "send" ? daemonTimeWithdrawalHashes.push(hash) : daemonTimeDepositHashes.push(hash);
            }
        })
        .on("error", (err) => { console.log(err) })
        .on("end", () => {
            checked++;

            if (files.length === checked) {
                // console.log(`Loading database deposits`);

                // Read the deposit CSV
                fs.createReadStream(`./btc-dep.csv`).pipe(
                    parse({ delimiter: ",", from_line: 2 })
                )
                .on("data", (row) => {
                    const created = moment(`${row[2]}+00`).unix();
                    const amount = row[1];
                    const hash = row[0];
                    if (created >= startTime && created < endTime) {
                        databaseDeposits.push({
                            amount,
                            hash,
                            created
                        });

                        databaseDepositHashes.push(hash);
                    } else {
                        databaseTimeDepositHashes.push(hash);
                    }
                })
                .on("error", (err) => { console.log(err) })
                .on("end", () => {

                    // console.log(`Loading database withdrawals`);
                    fs.createReadStream(`./btc-wds.csv`).pipe(
                        parse({ delimiter: ",", from_line: 2 })
                    )
                    .on("data", (row) => {
                        const created = moment(`${row[2]}+00`).unix();
                        const amount = row[1];
                        const hash = row[0];
                        const fee = row[3];
                        if (created >= startTime && created < endTime) {
                            databaseWithdrawals.push({
                                amount,
                                hash,
                                created,
                                fee
                            });

                            databaseWithdrawalHashes.push(hash);
                        } else {
                            databaseTimeWithdrawalHashes.push(hash);
                        }
                    })
                    .on("error", (err) => { console.log(err) })
                    .on("end", () => {
                        
                        const withdrawalUnique = _.xor(daemonWithdrawalHashes, databaseWithdrawalHashes);
                        const depositUnique = _.xor(daemonDepositHashes, databaseDepositHashes);

                        let missedWdsDb = [];
                        let missedDepDb = [];

                        let missedWdsDaemon = [];
                        let missedDepDaemon = [];

                        withdrawalUnique.map((wu) => {
                            const missed = daemonWithdrawals.filter((dw) => dw.hash.toLowerCase() === wu.toLowerCase());
                            const missedDaemon = databaseWithdrawals.filter((dw) => dw.hash.toLowerCase() === wu.toLowerCase());

                            const missedDaemonTime = daemonTimeWithdrawalHashes.filter((dt) => dt.toLowerCase() === wu.toLowerCase());
                            const missedDatabaseTime = databaseTimeWithdrawalHashes.filter((dt) => dt.toLowerCase() === wu.toLowerCase());

                            if (missed.length > 0 && missedDatabaseTime.length === 0) {
                                for (const m of missed) {
                                    missedWdsDb.push({
                                        amount: Math.abs(m.amount),
                                        fee: Math.abs(m.fee),
                                        hash: m.hash,
                                        time: m.time,
                                    });
                                }
                            } else if (missed.length > 0 && missedDatabaseTime.length > 0) databaseMissedWithdrawalOmitted++;

                            // Log transactions missed by daemon, but not missed by time (ie diff quarter)
                            if (missedDaemon.length > 0 && missedDaemonTime.length === 0) {
                                for (const m of missedDaemon) {
                                    missedWdsDaemon.push({
                                        amount: m.amount,
                                        fee: m.fee,
                                        hash: m.hash,
                                        time: m.time,
                                    })
                                }
                            } else if (missedDaemon.length > 0 && missedDaemonTime.length > 0) daemonMissedWithdrawalOmitted++;
                        });

                        depositUnique.map((du) => {
                            const missed = daemonDeposits.filter((dw) => dw.hash.toLowerCase() === du.toLowerCase());
                            const missedDaemon = databaseDeposits.filter((dw) => dw.hash.toLowerCase() === du.toLowerCase());

                            const missedDatabaseTime = databaseTimeDepositHashes.filter((dt) => dt.toLowerCase() === du.toLowerCase());
                            const missedDaemonTime = daemonTimeDepositHashes.filter((dt) => dt.toLowerCase() === du.toLowerCase());

                            if (missed.length > 0 && missedDatabaseTime.length === 0) {
                                for (const m of missed) {
                                    missedDepDb.push({
                                        amount: m.amount,
                                        hash: m.hash,
                                        time: m.time,
                                    });
                                }
                            } else if (missed.length > 0 && missedDatabaseTime.length > 0) databaseMissedDepositOmitted++;

                            if (missedDaemon.length > 0 && missedDaemonTime.length === 0) {
                                for (const m of missedDaemon) {
                                    missedDepDaemon.push({
                                        amount: m.amount,
                                        hash: m.hash,
                                        time: m.time,
                                    })
                                }
                            } else if (missedDaemon.length > 0 && missedDaemonTime.length > 0) daemonMissedDepositOmitted++;
                        });

                        const daemonWd = _.sumBy(daemonWithdrawals, (dw) => Number(dw.amount));
                        const databaseWd = _.sumBy(databaseWithdrawals, (dw) => Number(dw.amount));
                        const databaseMissedWd = _.sumBy(missedWdsDb, (mw) => Number(mw.amount));
                        const daemonMissedWd = _.sumBy(missedWdsDaemon, (mw) => Number(mw.amount));

                        const daemonDep = _.sumBy(daemonDeposits, (dd) => Number(dd.amount));
                        const databaseDep = _.sumBy(databaseDeposits, (dd) => Number(dd.amount));
                        const databaseMissedDep = _.sumBy(missedDepDb, (md) => Number(md.amount));
                        const daemonMissedDep = _.sumBy(missedDepDaemon, (md) => Number(md.amount));

                        const daemonFee = _.sumBy(daemonWithdrawals, (dw) => Number(dw.fee));
                        const databaseFee = _.sumBy(databaseWithdrawals, (dw) => Number(dw.fee));
                        const databaseMissedFee = _.sumBy(missedWdsDb, (mw) => Number(mw.fee));
                        const daemonMissedFee = _.sumBy(missedWdsDaemon, (mw) => Number(mw.fee));

                        const dataset = {
                            balance: daemonDep - (daemonWd + daemonFee),
                            startTime,
                            endTime,
                            daemon: {
                                withdrawals: daemonWd,
                                withdrawalCount: daemonWithdrawalHashes.length,
                                fee: daemonFee,
                                deposits: daemonDep,
                                depositCount: daemonDepositHashes.length,
                            },
                            database: {
                                withdrawals: databaseWd,
                                withdrawalCount: databaseWithdrawals.length,
                                fee: databaseFee,
                                deposits: databaseDep,
                                depositCount: databaseDeposits.length,
                            },
                            missing: {
                                database: {
                                    withdrawals: {
                                        count: missedWdsDb.length,
                                        amount: databaseMissedWd,
                                        fee: databaseMissedFee,
                                        transactions: missedWdsDb,
                                    },
                                    deposits: {
                                        count: missedDepDb.length,
                                        amount: databaseMissedDep,
                                        transactions: missedDepDb,
                                    }
                                },
                                daemon: {
                                    withdrawals:
                                    {
                                        count: missedWdsDaemon.length,
                                        amount: daemonMissedWd,
                                        fee: daemonMissedFee,
                                        transactions: missedWdsDaemon,
                                    },
                                    deposits: {
                                        count: missedDepDaemon.length,
                                        amount: daemonMissedDep,
                                        transactions: missedDepDaemon,
                                    }
                                }
                            },
                            omitted: {
                                daemon: {
                                    withdrawals: daemonMissedWithdrawalOmitted,
                                    deposits: daemonMissedDepositOmitted,
                                },
                                database: {
                                    withdrawals: databaseMissedWithdrawalOmitted,
                                    deposits: databaseMissedDepositOmitted,
                                }
                            },
                            difference: {
                                withdrawal: daemonWd + daemonMissedWd - databaseWd - databaseMissedWd,
                                fee: daemonFee + daemonMissedFee - databaseFee - databaseMissedFee ,
                                deposit: daemonDep + daemonMissedDep - databaseDep - databaseMissedDep,
                            }                            
                        }

                        console.log(JSON.stringify(dataset));

                    });
                });
            }
        })
    });
}

start();