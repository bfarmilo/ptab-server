const fse = require('fs-extra');
const { getTrials, getBoardDocuments } = require('./getNewTrials.js');

// get around certificate error with the PTAB API
require('ssl-root-cas/latest').inject().addFile(__dirname + '/../../config/intermediate.crt');


getTrials()
  .then(result => {
    console.log('returned total count %d', result.max);
    console.log('fields returned %j', Object.keys(result.data[1]));
    console.log('returned cases\n', result.data.map(item => ({ IPR: item.trialNumber, status: item.prosecutionStatus, patentOwner: item.patentOwnerName })).filter(item => item.IPR.indexOf('IPR') !== -1));
    return fse.writeJson('../../config/trials.json', result.data.filter(item => item.trialNumber.indexOf('IPR') !== -1))
  })
  .then(() => {
    console.log('success!')
  })
  .catch(err => {
    console.error(err)
  })
/* .then(() => getBoardDocuments())
.then(result => {
  console.log('returned total count %d', result.max);
  console.log(new Set(result.data.map(item => item.type)));
  //console.log(result.data.filter(item => item.type === 'Institution Decision').map(item => item.title))
}) 
*/
