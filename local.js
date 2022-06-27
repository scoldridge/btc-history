const fs = require('fs');
const moment = require('moment');

const directory = "./data/";
let quarters = [];

const start = () => {
    fs.readdirSync(directory).forEach(file => {
        const json = JSON.parse(fs.readFileSync(`${directory}${file}`));
        json.map((transaction) => {
            // Find the quarter the transaction belongs to
            const transactionTime = transaction.time;

            if (transaction.confirmations > 0) {

                const index = quarters.findIndex(q => (transactionTime * 1000 >= q.from && transactionTime * 1000 < q.to));

                if (index === -1) {
                    quarters.push(createQuarter(transaction));
                } else {
                    // console.log(`Found index: ${index}`);
                    quarters[index].transactions++;

                    const receive = (!transaction.fee) ? transaction.amount : 0;
                    const send = (transaction.fee) ? Math.abs(transaction.amount) : 0;
                    const sendFee = (transaction.fee) ? Math.abs(transaction.fee) : 0;

                    quarters[index].send += send;
                    quarters[index].sendFee += sendFee;
                    quarters[index].receive += receive;
                }
            }
        });
    });

   const niceQuarters = quarters.map((q) => {
       return {
           from: moment.unix(q.from / 1000).format('DD/MM/YYYY'),
           to: moment.unix(q.to / 1000).format('DD/MM/YYYY'),
           send: q.send,
           sendFee: q.sendFee,
           receive: q.receive,
           transactions: q.transactions
       }
   });

   console.log(JSON.stringify(niceQuarters));
}

const createQuarter = (tx) => {
    const current = moment(tx.time * 1000);
    const receive = (!tx.fee) ? tx.amount : 0;
    const send = (tx.fee) ? Math.abs(tx.amount) : 0;
    const sendFee = (tx.fee) ? Math.abs(tx.fee) : 0;

    return {
        from: moment(current).startOf('quarter').valueOf(),
        to: moment(current).endOf('quarter').valueOf(),
        send,
        sendFee,
        receive,
        transactions: 1,
    }
}

start();