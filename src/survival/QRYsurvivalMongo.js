const { getBin } = require('./survivalBin');

/* survivalAnalysis runs a query and returns an object used to make a pie chart
@param client: mongodb - mongo database
@param query: {field, value} - an object with a field  (eg 'PatentOwner' or 'all') and value(eg 'npe')
returns returnData: {
  title: string, 
  countTotal: number,
  countUnique: number,
  survivalTotal: {type: string, count: number},
  survivalUnique: {type: string, count: number}
}
*/

const survivalAnalysis = (db, query) => {
  let collection = db.collection('ptab');
  let totalQuery, uniqueQuery;
  const returnData = {title: `${query.field === 'all' ? 'all' : `${query.field}:${query.value}`}`};
  // parse the query {field, value}
  totalQuery = query.field === 'all' ? {}
    : Object.assign({ [query.field]: query.value });
  return collection.aggregate([
    { $match: totalQuery },
    ]).toArray()
  .then(result => {
    returnData.countTotal = result.length;
    // first - get the list of all claims (include duplicates)
    return collection.aggregate([
      { $match: totalQuery },
      { $group: {
        _id: '$survivalStatus',
        count: { $sum: 1}
      }},
      { $sort: {_id:1}}
      ]).toArray()
  })
  .then(survivalTable => {
    returnData.survivalTotal = survivalTable.map(item => ({type: item._id.result, score: item._id.level, count: item.count}))
    collection=db.collection('byClaims');
    uniqueQuery = query.field === 'all' ? {} : Object.assign({ ['_id.'.concat(query.field)]: query.value });
    return collection.aggregate([
      { $match: uniqueQuery },
      ]).toArray()
  })
  .then(count => {
    returnData.countUnique = count.length;
    return collection.aggregate([
      { $match: uniqueQuery },
      { $group: {
        _id: '$worstStatus',
        count: { $sum: 1 }
      }},
      { $sort: { _id:1}}
      ]).toArray()
  })
  .then(uniqueTable => {
    returnData.survivalUnique = uniqueTable.map(item => ({type: getBin(item._id).result, score:item._id, count: item.count}))
  })
    .then(result => {
      console.log(returnData);
      return Promise.resolve(returnData)
      })
    .catch(err => Promise.reject(err))
}

module.exports = {
  survivalAnalysis
}