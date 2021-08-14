const { get } = require('courier.mente');
const { vow } = require('batboy.mente');
const cheerio = require('cheerio');
const fastify = require('fastify');
const PORT = process.env.PORT || 3000;
const apiOpts = {
    schema: {
        params: {
            type: 'object',
            properties: {
                ticker: { type: 'string' }
            }
        }
    },
    response: {
        '2xx': {
            type: 'object',
            properties: {
                ticker: { type: 'string' },
                value: { type: 'number' }
            }
        },
        '4xx': {
            type: 'object',
            properties: {
                error: { type: 'string' }
            }
        }
    }
}
const reqOpts = {
    headers: {
        'Content-Type': 'text/html'
    },
    responseType: 'html'
}

function main() {
    var app = fastify({ logger: false, trustProxy: true });

    app.get('/stock/:ticker', apiOpts, getTicker);
    app.get('/crypto/:ticker', apiOpts, getCrypto);

    return app;
}

function sendData(data, error, ticker, callback) {
    if (data) {
        return {
            value: callback(data),
            ticker
        }
    } else {
        switch (error?.code) {
            case 'ENOTFOUND':
                this.code(404).send({
                    error: 'URL Not Found'
                })
        }
    }
}

function scrapeStock(data) {
    let refinedPrice;
    let c = cheerio.load(data);
    let unrefinedPrice = c('.quoteData').find('.upDn').text();
    let priceCheck = /([0-9\.\,]+)/;

    refinedPrice = Number(unrefinedPrice.replace(priceCheck, '$1').replace(',', ''))
    return refinedPrice;
}

function scrapeCrypto(data) {
    let refinedPrice;
    let c = cheerio.load(data);
    let unrefinedPrice = c('#USDSummary').find('.price-value').text();
    let priceCheck = /\D?([0-9\.\,]+)/

    refinedPrice = Number(unrefinedPrice.replace(priceCheck, '$1').replace(',', ''));
    return refinedPrice;
}

async function getTicker(req, res) {
    const [data, dataError] = await vow(get(`https://ycharts.com/companies/${req.params.ticker.toUpperCase()}`, reqOpts));
    return sendData.apply(res, [data, dataError, req.params.ticker, scrapeStock]);
}

async function getCrypto(req, res) {
    const [data, dataError] = await vow(get(`https://cointelegraph.com/${req.params.ticker.toLowerCase()}-price-index`, reqOpts));
    return sendData.apply(res, [data, dataError, req.params.ticker, scrapeCrypto]);
}

async function startServer(app) {
    var [_, error] = await vow(app.listen(PORT));

    if (error) {
        app.log.error(error);
        process.exit(1);
    } else {
        console.log('listening....')
    }
}

startServer(main())
