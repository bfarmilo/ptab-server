const { getItems, getBoardDocuments } = require('./getNewTrials.js');

// get around certificate error with the PTAB API
require('ssl-root-cas/latest').inject().addFile(__dirname + '../../../config/intermediate.crt');

 getItems(0)
  .then(result => {
    console.log('returned offset %d', result.offset);
    console.log('returned total count %d', result.count);
    console.log('returned cases\n%j', result.data.map(item => item.trialNumber))
    return;
  })
  .then(() => getBoardDocuments(0))
  .then(result => {
    console.log(new Set(result.results.map(item => item.type)));
    console.log(result.results.filter(item => item.type === 'Institution Decision').map(item => item.title))
  })
  .catch(err => console.error(err));