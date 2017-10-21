const config = require('../../config/config.json');

/* lookUp is a simple brute-force search of the ptab collection
  // db -> the mongo db instance
  // field -> the field to search
  // value -> the value to match
  // cursor -> the last cursor for the scan
  // target -> the name of the table to search or 'all' TODO: use this to cache the results
  // returns {cursor: the next cursor, count: num records returned, totalCount: total num of matching records, data:the table data}
*/

const lookUp = (db, field, value, cursor, target = 'all') => {
  let totalCount = 0;
  
  // simple query at this point -- just convert value into a regex and hence match anywhere
  const regExValue = new RegExp(value, 'g');
  console.log(field, regExValue);
  // quickly count the matches
  return db.collection('ptab').find({[field]:{$regex:regExValue}}).count()
  .then(numRecords => {
    totalCount = numRecords;
    return db.collection('ptab')
    .find({[field]:{ $regex: regExValue}})
    .sort({DateFiled:-1, claimIdx:1})
    .skip(cursor)
    .limit(config.database.maxRecords)
    .toArray()
  })
    .then(result => {
      cursor = cursor+config.database.maxRecords > totalCount ? 0 : cursor + config.database.maxRecords;
      console.log('returning cursor:%d, count:%d, totalCount:%d', cursor, result.length, totalCount);
      console.log(result[0]._id);
      return Promise.resolve({ cursor, count: result.length, totalCount, data: result });
    })
    .catch(err => Promise.reject(err));
}

module.exports = {
  lookUp
}