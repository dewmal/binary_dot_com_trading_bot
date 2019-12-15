var ws = require('ws');
const _ = require("lodash");
var LiveApi = require('binary-live-api').LiveApi;
var api = new LiveApi({ websocket: ws, appId: 0000 });// Replace APP ID with your app id
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
    return {
        "type": type,
        "bodySize": bodySize,
        "upperBodySize": upperBodySize,
        "lowerBodySize": lowerBodySize
    }
}
async function identifyCandlePatternBullishEngulfing(candles) {
    candles = _.sortBy(candles, (ca) => ca.epoch); // Sort Candle List using Lodash
    let direction = candles[0].close - candles[candles.length - 1].close;
    if (direction > 0) {
        let firstCandle = candles[candles.length - 1];
        let secondCandle = candles[candles.length - 2];
        let secondCandleSummary = candleDetails(secondCandle);
        if (secondCandleSummary.type === "BEARISH") {
            let firstCandleSummary = candleDetails(firstCandle);
            if (firstCandleSummary === "BULLISH") {
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
    await api.authorize('YOUR_API_KEY');
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
                param.symbol = "R_50";
                let max = 1;
                this.api.buyContractParams(param, max)
                    .then(console.log)
                    .catch(console.error);

            }
        }
    });
}
main().then(console.log).catch(console.error);