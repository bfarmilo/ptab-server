const sslRootCAs = require('ssl-root-cas/latest');
const {getItems} = require('./getNewTrials.js');

// get around certificate error with the PTAB API
sslRootCAs.inject();

getItems(0)
.then(result => {
  console.log('returned offset %d', result.offset);
  console.log('returned total count %d', result.count);
  console.log('returned cases\n%j', result.data.map(item => item.trialNumber))
})
.catch(err => console.error(err));

