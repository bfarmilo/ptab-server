
const dataSet = require('../../config/1216-RP-10452 - claimdata.json').claimData;
const config = require('../../config/config.json');
const { survivalStatus } = require('./survivalBin.js');

const initDB = (client) => {
  // set client timeouts to 10 minutes of idleness
  return client.config('SET', 'timeout', '600')

    .then(() => client.multi()
      // push list of binValues
      .sadd(['binValues', ...config.survivalStatus])

      // push list of keys
      .sadd(['fieldList'].concat(Object.keys(dataSet[0])))

      //push list of searchable tables
      .sadd(['searchable', 'all', 'killed:300', 'killed:700', 'killed:electronics', 'temp:killed', 'temp:unpat', 'temp:unpat_claim'])

      .exec())
    .then(() => {
      const output = dataSet.map((item, index) => {
        const survivalValue = survivalStatus(item.Status, item.FWDStatus.toLowerCase(), item.Instituted, item.Invalid)
        let cmdList = [
          ['hmset', `claimID:${index}`,
            'ID', index,
            'IPR', item.IPR,
            'DateFiled', item.DateFiled,
            'Status', item.Status,
            'FWDStatus', item.FWDStatus.toLowerCase(),
            'Petitioner', item.Petitioner,
            'PatentOwner', item.PatentOwner,
            'Patent', item.Patent,
            'MainUSPC', item.MainUSPC,
            'Claim', item.Claim,
            'Instituted', (item.Instituted ? 1 : 0),
            'Invalid', (item.Invalid ? 1 : 0),
            'survivalStatus', survivalValue
          ],
          ['zadd', `all:survival:${survivalValue}`, index, `${item.Patent}:${item.Claim}`],
          ['sadd', `survivalList:${survivalValue}`, `claimID:${index}`],
          ['sadd', 'statusTypes', item.Status],
          ['sadd', 'FWDStatusTypes', item.FWDStatus.toLowerCase()],
          ['sadd', `FWDStatus:${item.FWDStatus.toLowerCase()}`, `claimID:${index}`],
          // ['sadd', `patent:${item.Patent}:${item.Claim}`, `claimID:${index}`]
        ];
        // a zset of killed claims - score is the ID
        if (item.FWDStatus.toLowerCase() === 'unpatentable') {
          // this one has only one entry per patent:claim
          cmdList.push(['zadd', 'unpatentable', index, `${item.Patent}:${item.Claim}`])
          // this one has multiple entries per patent:claim
          cmdList.push(['zadd', 'unpatentable_claim', index, `claimID:${index}`])
        }

        // create sets for all status except FWD entered
        switch (item.Status) {
          case 'Instituted':
            cmdList.push(['sadd', 'status:instituted', `claimID:${index}`]);
            break;
          case 'Notice OF Filing Date Accorded': case 'Filing Date Accorded':
            cmdList.push(['sadd', 'status:filed', `claimID:${index}`]);
            break;
          case 'Terminated-Dismissed':
            cmdList.push(['sadd', 'status:dismissed', `claimID:${index}`]);
            break;
          case 'Terminated-Denied':
            cmdList.push(['sadd', 'status:denied', `claimID:${index}`]);
            break;
          case 'Terminated-Other':
            cmdList.push(['sadd', 'status:other', `claimID:${index}`]);
            break;
          case 'Waiver Filed':
            cmdList.push(['sadd', 'status:waived', `claimID:${index}`]);
            break;
          case 'Terminated-Settled':
            cmdList.push(['sadd', 'status:settled', `claimID:${index}`]);
            break;
          case 'Terminated-Adverse Judgment':
            cmdList.push(['sadd', 'status:lostCase', `claimID:${index}`]);
            break;
          case 'FWD Entered':
            cmdList.push(['sadd', 'status:decided', `claimID:${index}`]);
            break;
          default:
        }
        // create a list based on the first number of the USPC
        let mainClass = item.MainUSPC.split('/')[0]
        hundreds = mainClass.length > 2 ? mainClass.match(/(\d)\d{2}/) : [0, 0];
        if (hundreds !== null) {
          cmdList.push(['sadd', `class:${hundreds[1]}00`, `claimID:${index}`]);
          if (hundreds[1] === '5'
            || hundreds[1] === '6'
            || mainClass === '424'
            || mainClass === '430'
            || mainClass === '435'
            || mainClass === '436') cmdList.push(['sadd', `class:Pharma`, `claimID:${index}`]);
          if (hundreds[1] === '3'
            || hundreds[1] === '7'
            || mainClass === '439'
            || mainClass === '455') cmdList.push(['sadd', `class:Electronics`, `claimID:${index}`]);
        } else {
          cmdList.push(['sadd', 'class:unknown', `claimID:${index}`])
        }
        // creates a set of patent-claim, useful for unique claims
        cmdList.push(['zadd', 'uniqueClaims', index, `${item.Patent}:${item.Claim}`]);
        cmdList.push(['lpush', 'allClaims', `${item.Patent}:${item.Claim}`]);
        // done, now return the list of commands for this item
        return cmdList;
      });
      return client.multi([].concat(...output)).exec()
    })
    .then(() => Promise.resolve('database initialized'))
    .catch(err => Promise.reject(err))
}

module.exports = {
  initDB
}