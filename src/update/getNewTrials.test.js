const { getItems, getBoardDocuments } = require('./getNewTrials.js');

// get around certificate error with the PTAB API
require('ssl-root-cas/latest').inject().addFile(__dirname + '../../../config/intermediate.crt');


getItems()
  .then(result => {
    console.log('returned total count %d', result.max);
    console.log('returned cases\n%j', result.data.map(item => item.trialNumber))
    return;
  })
  .then(() => getBoardDocuments())
  .then(result => {
    console.log('returned total count %d', result.max);
    console.log(new Set(result.data.map(item => item.type)));
    //console.log(result.data.filter(item => item.type === 'Institution Decision').map(item => item.title))
  })
  .catch(err => console.error(err));