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