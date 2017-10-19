const { getBin } = require('../entities/survivalBin');

/* survivalAnalysis runs a query and returns an object used to make a pie chart
@param client: mongodb - mongo database
@param scope: string - a particular search space (eg 'patentowner:npe'), or 'all'
@param chartID: number(1,2) - which chart set to update, currently the page displays 2 chart sets
@param userID: number - number of user requesting the chart - ie multiple users get different charts
returns returnData: {
  title: string, 
  countTotal: number,
  countUnique: number,
  survivalTotal: {type: string, count: number},
  survivalUnique: {type: string, count: number}
}
*/

const survivalAnalysis = (client, scope, chartID, userID) => {
  const db = client;
  let collection = db.collection('ptab');
  let queryString, newQuery;
  const returnData = {title: scope};
  // parse the scope field:value or 'all'
  // TODO: write a better parser !!
  queryString = scope === 'all' ? {}
    : Object.assign({ [scope.split(':')[0]]: scope.split(':')[1] });
  console.log(queryString);
  return collection.aggregate([
    { $match: queryString },
    ]).toArray()
  .then(result => {
    console.log(result.length);
    returnData.totalCount = result.length;
    // first - get the list of all claims (include duplicates)
    return collection.aggregate([
      { $match: queryString },
      { $group: {
        _id: '$survivalStatus',
        count: { $sum: 1}
      }}
      ]).toArray()
  })
  .then(survivalTable => {
    returnData.survivalTotal = survivalTable.map(item => ({type: item._id.result, score: item._id.level, count: item.count}))
    collection=db.collection('byClaims');
    newQuery = scope === 'all' ? {} : '$_id.'.concat(queryString);
    //TODO - better Query Parser ! for Petitioner type need different path !!
    return collection.aggregate([
      { $match: newQuery},
      ]).toArray()
  })
  .then(count => {
    returnData.totalUnique = count.length;
    return collection.aggregate([
      { $match: newQuery },
      { $group: {
        _id: '$worstStatus',
        count: { $sum: 1 }
      }}
      ]).toArray()
  })
  .then(uniqueTable => {
    returnData.survivalUnique = uniqueTable.map(item => ({type: getBin(item._id).result, score:item._id, count: item.count}))
  })
    .then(result => Promise.resolve(returnData))
    .catch(err => Promise.reject(err))
}

module.exports = {
  survivalAnalysis
}