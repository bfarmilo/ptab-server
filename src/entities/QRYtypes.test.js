const redis = require('promise-redis')();
const client = redis.createClient();
const { getEntityData } = require('./QRYtypes.js');

// Check for patentowner entries, if not generate new ones
client.keys('patentowner*')
  .then(result => result.length)
  .then(length => {
    console.log('%d patentowner keys found', length)
    if (length === 0) {
      return getEntityData(client)
    }
    return Promise.resolve('done');
  })
  .catch(err => console.error(err));

