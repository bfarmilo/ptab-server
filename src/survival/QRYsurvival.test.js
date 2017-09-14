const { survivalAnalysis, binClaims, deDup, allClaims } = require('./QRYsurvival.js');
const { survivalStatus } = require('./config.json');
const redis = require('promise-redis')();
const client = redis.createClient();

// testing the binclaims function
binClaims(client, 'patentownertype:person', "99")
  .then(result => console.log(result.length))
  .then(() => client.quit())
  .then(() => {
    // Test generating a custom ZLIST for survival analysis
    return survivalAnalysis(client, 'all', 5)
  })
  .then(result => {
    console.log(result);
    return client.quit()
  })
  .catch(err => console.error(err));