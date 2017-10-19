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
  const returnData = {};
  // parse the scope field:value or 'all'
  // TODO: write a better parser !!
  const queryString = scope === 'all' ? {}
    : Object.assign({ [scope.split(':')[0]]: scope.split(':')[1] });
  console.log(queryString);
  return client.collections('ptab').find(queryString).toArray()
    .then(result => Promise.resolve(result)) //TODO: process result into ReturnData
    .catch(err => Promise.reject(err))
}

module.exports = {
  survivalAnalysis
}