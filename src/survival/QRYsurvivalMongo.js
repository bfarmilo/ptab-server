const { getBin } = require('./survivalBin');

/** survivalArea runs a query and returns an object used to make a line chart
 * @param client:mongodb -> mongo database
 * @param query:{field, value} -> an object with a field and a value
 * returns returnData: {
   title: string,
   countTotal: number,
   survivalTotal: Array {type: string, score: number, data: Array {bin: string, count: number}}
 }
 **/
const survivalArea = (db, query) => {
  // generate the array of Totals
  let collection = db.collection('ptab');
  let totalQuery;
  const returnData = { title: `${query.field === 'all' ? 'all' : `${query.field}:${query.value}`}` };
  // parse the query {field, value}
  totalQuery = query.field === 'all' ? {} :
    Object.assign({
      [query.field]: query.value
    });
  // general plan of attack:
  // 1. Assign a 'bin date' to each element. bin date is the first day of the quarter
  // 2. Group by survival status, push the bin date and count
  return collection.aggregate([
      { $match: totalQuery },
      { $project: {
          "survivalStatus": 1,
          "quarter": {
            $cond: [{ $lte: [{ $month: "$DateFiled" }, 3] }, "Q1",
              {
                $cond: [{ $lte: [{ $month: "$DateFiled" }, 6] }, "Q2",
                  {
                    $cond: [{ $lte: [{ $month: "$DateFiled" }, 9] }, "Q3",
                      "Q4"
                    ]
                  }
                ]
              }
            ]
          },
          "year": {$substr: [{$year: "$DateFiled"}, 0, -1]}
        }},
        { $group: {
          _id: "$survivalStatus.level",
          bin: {$push: {$concat : ['$year', '_', '$quarter']}}
        }},
        { $sort : {'_id':1}}
    ]).toArray()
    .then(survivalTable => {
      returnData.survivalTotal = survivalTable.map(item => {
        const dataObject = item.bin.reduce((acc, curr) => {
            if (typeof acc[curr] == 'undefined') {
              acc[curr] = 1;
            } else {
              acc[curr] += 1;
            }
            return acc;
          },{});
        return { 
          type: getBin(item._id).result,
          score: getBin(item._id).level,
          data: Object.keys(dataObject).map(elem => ({bin:elem, count:dataObject[elem]}))
        }
      })
    })
    .then(result => {
      return Promise.resolve(returnData)
    })
    .catch(err => Promise.reject(err))

}


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
  const returnData = { title: `${query.field === 'all' ? 'all' : `${query.field}:${query.value}`}` };
  // parse the query {field, value}
  totalQuery = query.field === 'all' ? {} :
    Object.assign({
      [query.field]: query.value
    });
  return collection.aggregate([
      { $match: totalQuery },
    ]).toArray()
    .then(result => {
      returnData.countTotal = result.length;
      // first - get the list of all claims (include duplicates)
      return collection.aggregate([
        { $match: totalQuery },
        {
          $group: {
            _id: '$survivalStatus',
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]).toArray()
    })
    .then(survivalTable => {
      returnData.survivalTotal = survivalTable.map(item => ({ type: item._id.result, score: item._id.level, count: item.count }))
      collection = db.collection('byClaims');
      uniqueQuery = query.field === 'all' ? {} : Object.assign({
        ['Petitions.'.concat(query.field)]: query.value
      });
      if (query.field.includes('PatentOwner')) uniqueQuery = Object.assign({
        ['_id.'.concat(query.field)]: query.value
      });
      console.info('running unique query with value %j', uniqueQuery);
      return collection.aggregate([
        { $match: uniqueQuery },
      ]).toArray()
    })
    .then(count => {
      returnData.countUnique = count.length;
      return collection.aggregate([
        { $match: uniqueQuery },
        {
          $group: {
            _id: '$worstStatus',
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]).toArray()
    })
    .then(uniqueTable => {
      returnData.survivalUnique = uniqueTable.map(item => ({ type: getBin(item._id).result, score: item._id, count: item.count }))
    })
    .then(result => {
      console.log(returnData);
      return Promise.resolve(returnData)
    })
    .catch(err => Promise.reject(err))
}

module.exports = {
  survivalAnalysis,
  survivalArea
}
