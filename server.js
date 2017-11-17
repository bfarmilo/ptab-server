const express = require('express');
const routes = require('./src/routes');
const config = require('./config/config.json');

const app = express();

const port = process.env.port || 8080;

const header = process.argv[2] === '-dev' ? config.test_url : config.app_url;
console.info('using mode %s, adding CORS to origin %s', process.argv[2], header);

app.use((req, res, next) => {
    // enable CORS from the app location
    let origin = req.headers.origin;
    if (config.app_url.indexOf(origin) >= 0) {
        res.header("Access-Control-Allow-Origin", origin);
    }
    next();
});

app.use('/', routes);

app.listen(port);
console.log('Listening on port: ', port);
