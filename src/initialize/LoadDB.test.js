const redis = require('promise-redis')();
const { initDB } = require('./PTABredis.js');
const config = require('./config.json');


const client = redis.createClient({
  host: config.database.server
});

client.on('error', err => {
  console.log(err);
  client.quit();
});

client.on('connect', () => {
  console.log('connected');
  client.flushdb()
    .then(() => initDB(client))
    .then(data => {
      console.log(data)
      client.quit();
    })
    .catch(err => console.error(err));
});