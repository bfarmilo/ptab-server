const express = require('express');
const routes = require('./src/routes');

const app = express();

const port = process.env.port || 8080;

app.use('/', routes);

app.listen(port);
console.log('Listening on port: ', port);