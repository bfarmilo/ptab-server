// query with a redis client, patent:claim type table, and a cursor value
// returns {cursor:next cursor, count: number of elements returned, totalCount: total number of members, data: array of ID's}

// patent:claim tables include 
/* 
chartX:{survivalStatus} 
chartX:{survivalStatus}_{lowersurvivalStatus}
uniqueClaims
unpatentable
all:survival:{survivalStatus}
*/

const zrangeScan = (client, table, cursor) => {
  let totalCount = 0;
  return client.zcard(table)
    .then(count => totalCount = count)
    .then(() => client.zscan(table, cursor, 'COUNT', 100))
    .then(scanResult => {
      return Promise.resolve({
        cursor: scanResult[0],
        count: scanResult[1].length,
        totalCount,
        data: scanResult[1].reduce((accum, item, index) => {
          if (index & 1) {

          } else {
            accum.push(item)
          }
          return accum;
        }, [])
      })
    })
    .catch(err => Promise.reject(err))
}
/*
getDetailTable takes a redis client, table (patent:claim type) and a cursor
returns {
  cursor:next cursor,
  count: number of elements returned in this pass,
  totalCount: total number of members in the set,
  data: array of IPR objects sorted by patent:claim
}
 */
const getDetailTable = (client, table, cursor) => {
  let returnValue = {};
  zrangeScan(client, table, cursor)
    // now go look up the duplicates for each
    .then(tempResults => {
      returnValue.cursor = tempResults.cursor;
      returnValue.count = tempResults.count;
      returnValue.totalCount = tempResults.totalCount;
      return tempResults.data.map(item => ['smembers', `patent:${item}`])
    })
    .then(cmdList => {
      // console.log('command list for getting duplicates %j', cmdList)
      return client.multi(cmdList).exec()
    })
    .then(result => {
      console.log('%d matching results found', result.length);
      return [].concat(...result).map(item => ['hgetall', item]);
    })
    // call client multi exec
    .then(cmdList => {
      //console.log('command list for hget operation %j', cmdList);
      return client.multi(cmdList).exec();
    })
    // return the result in JSON form
    .then(data => {
      return data.slice().sort((a, b) => a.Patent === b.Patent ?
        parseInt(a.Claim, 10) - parseInt(b.Claim, 10)
        : parseInt(a.Patent, 10) - parseInt(b.Patent, 10)
      );
    })
    .then(sortedData => {
      returnValue.data = sortedData;
      return Promise.resolve(returnValue);
    })
    .catch(err => console.error(err));
}



module.exports = {
  getDetailTable
}