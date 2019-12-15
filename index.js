var ws = require('ws');
const _ = require("lodash");
var LiveApi = require('binary-live-api').LiveApi;

var api = new LiveApi({ 
    websocket: ws, 
    appId: 0000//REPLACE_IT_WITH_YOURS
 });


async function candleDetails(candle) {


    const open = candle.open;
    const high = candle.high;
    const low = candle.log;
    const close = candle.close;

    // Avoid dojo candles
    if (open === close || high === low) {
        return;
    }

    let type = '';

    if (open > close) {
        type = "BEARISH";
    } else if (open < close) {
        type = "BULLISH";
    }

    let bodySize = Math.abs(open - close);
    let upperBodySize = open > close ? high - open : high - close;
    let lowerBodySize = open > close ? close - low : open - low;
    let candleSize = high - low;

    // Lets make this sensable 
    // Aditional Step for you
    let bodySizePer = bodySize * 100 / candleSize;
    let upperBodySizePer = upperBodySize * 100 / candleSize;
    let lowerBodySizePer = lowerBodySize * 100 / candleSize;

    return {
        "type": type,
        "bodySize": bodySize,
        "upperBodySize": upperBodySize,
        "lowerBodySize": lowerBodySize,
        "bodySizePer": bodySizePer,
        "upperBodySizePer": upperBodySizePer,
        "lowerBodySizePer": lowerBodySizePer,
    }
}

async function identifyCandlePatternBullishEngulfing(candles) {
    candles = _.sortBy(candles, (ca) => ca.epoch); // Sort Candle List using Lodash


    // Step 1
    // Are we on down trend
    let direction = candles[0].close - candles[candles.length - 1].close;
    if (direction > 0) {
        console.log("Trend is down");

        let firstCandle = candles[candles.length - 1];
        let secondCandle = candles[candles.length - 2];

        // Step 2
        // Second candle should be bearsh
        let secondCandleSummary = candleDetails(secondCandle);
        if (secondCandleSummary.type === "BEARISH") {

            let firstCandleSummary = candleDetails(firstCandle);
            // Step 3
            // Bullish Candle
            if (firstCandleSummary === "BULLISH") {
                // Step 4                  
                // Find engulfs               
                if (firstCandle.bodySize > secondCandle.bodySize) {
                    console.log("yeah we found it");
                    return true;
                }
            }
        }
        return false;
    }
}



async function main() {
    await api.authorize('REPLACE_IT_WITH_YOURS');

    api.subscribeToBalance();
    api.events.on("balance", (res) => {
        const balance = res.balance;
        console.log(balance);
    });

    // Read market data
    let candles = [];

    api.getTickHistory("R_50", { end: 'latest', count: 5, "style": "candles", "subscribe": 1 });

    api.events.on("candles", async (res) => {
        candles = res.candles;
        identifyCandlePatternBullishEngulfing(candles);
    });
    api.events.on("ohlc", async (res) => {
        let ohlc = res.ohlc;
        if (ohlc.epoch % 60 === 0) {
            // console.log(ohlc);
            // Append New Candle to list
            candles.push({
                epoch: ohlc.epoch,
                open: ohlc.open,
                high: ohlc.high,
                low: ohlc.low,
                close: ohlc.close,
            });

            // Remove Unwanted candles
            if (candles.length > 10) {
                candles.pop();
            }

            if (identifyCandlePatternBullishEngulfing(candles)) {
                // Place Order
                let param = {};
                param.amount = 1;
                param.basis = 'payout';
                param.contract_type = "CALL";
                param.currency = 'USD';
                param.duration = 2;
                param.duration_unit = 'm';
                param.symbol = symbol;
                let max = 1;

                this.api.buyContractParams(param, max)
                    .then(console.log)
                    .catch(console.error);

            }
        }
    });

    // Make Decision

    // Withdraw profit







}

main().then(console.log).catch(console.error);