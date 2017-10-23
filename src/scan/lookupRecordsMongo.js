const config = require('../../config/config.json');

/* lookUp is a simple brute-force search of the ptab collection
  // db -> the mongo db instance
  // query -> 2-element array of {field, value} objects used to compose the query
  // cursor -> the last cursor for the scan
  // target -> the name of the table to search or 'all' TODO: use this to cache the results
  // returns {cursor: the next cursor, count: num records returned, totalCount: total num of matching records, data:the table data}
*/

const lookUp = (db, query, cursor, target = 'all') => {
  let totalCount = 0;
    // simple query at this point -- just convert value into a regex and hence match anywhere
  const queryMongo = {
    '$and': query.map(item => {
      if (item.value === 'true') return {[item.field]: true}
      if (item.value === 'false') return {[item.field]: false}
    return {[item.field]: {$regex: new RegExp(item.value, 'g')}}
  })
  }
  console.log ('querying database with', queryMongo);
  // quickly count the matches
  return db.collection('ptab').find(queryMongo).count()
  .then(numRecords => {
    totalCount = numRecords;
    return db.collection('ptab')
    .find(queryMongo)
    .sort({DateFiled:-1, claimIdx:1})
    .skip(cursor)
    .limit(config.database.maxRecords)
    .toArray()
  })
    .then(result => {
      cursor = cursor+config.database.maxRecords > totalCount ? 0 : cursor + config.database.maxRecords;
      console.log('returning cursor:%d, count:%d, totalCount:%d', cursor, result.length, totalCount);
      return Promise.resolve({ cursor, count: result.length, totalCount, data: result });
    })
    .catch(err => Promise.reject(err));
}

module.exports = {
  lookUp
}