const redis = require('promise-redis')();
const client = redis.createClient();
const find = require('./lookupRecords.js');

find.setClient(client);

//lookUp has two modes:

//1: Search all records mode: pass 'JSON key', 'value'
find.lookUp('Instituted', '1', 'all')
  .then(res => {
    console.log('PatentOwner===Personalized returns %d records', res.count);
    return res;
  })
  //2: Search a given Set: pass 'JSON key', 'value', 'Set to Search'
  .then(() => find.lookUp('PatentOwner', '(npe)', 'temp:killed'))
  .then(res => {
    console.log('temp:killed contains %d records where PatentOwner===Personalized', res.count);
  })
  .then(() => client.quit())
  .catch(err => console.error(err));

