const { getBin } = require('./survivalBin');
const timeRange = [
  '2012_Q4',
  '2013_Q1',
  '2013_Q2',
  '2013_Q3',
  '2013_Q4',
  '2014_Q1',
  '2014_Q2',
  '2014_Q3',
  '2014_Q4',
  '2015_Q1',
  '2015_Q2',
  '2015_Q3',
  '2015_Q4',
  '2016_Q1',
  '2016_Q2',
  '2016_Q3',
  '2016_Q4',
  '2017_Q1',
  '2017_Q2',
  '2017_Q3'
];


/** survivalArea runs a query and returns an object used to make a line chart
 * @param client:mongodb -> mongo database
 * @param query:{field, Array<value>} -> an object with a field and an array of values
 * @param chartType: string -> 'area' for survival area, 'line' for institution line 
 * @returns returnData: {
 *   chartType: string -> 'area' or 'line'
 *   title: string,
 *   countTotal: number,
 *   survivalTotal: Array {type: string, score: number, data: Array {bin: string, count: number}}
 * }
 **/

const survivalArea = (db, query, chartType) => {
  // generate the array of Totals
  let collection = db.collection('ptab');
  let totalQuery = {};
  const bySurvival = chartType === 'area'; //true for survival analysis, false for institution analysis
  const returnData = { chartType, title: `${query.field === 'all' ? 'all' : `${query.field}:${query.value}`}` };
  // parse the query {field, value}
  if (query.field !== 'all') {
    totalQuery.$or = query.value.map(item =>
      Object.assign({
        [query.field]: item === 'true' ? true : item
      }));
  }
  console.log(typeof (totalQuery[query.field]));
  // general plan of attack:
  // 1. Assign a 'bin date' to each element. bin date is the first day of the quarter
  // 2. Group by survival status, push the bin date and count
  const groupField = bySurvival ? "survivalStatus" : "PatentOwner.type";
  const groupID = bySurvival ? "$survivalStatus.level" : "$PatentOwner.type";
  const groupSort = bySurvival ? 'bin' : '_id';
  return collection.aggregate([
    { $match: totalQuery },
    {
      $project: {
        [groupField]: 1,
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
        "year": { $substr: [{ $year: "$DateFiled" }, 0, -1] }
      }
    },
    { $sort: { year: 1, quarter: 1 } },
    {
      $group: {
        _id: groupID,
        bin: { $push: { $concat: ['$year', '_', '$quarter'] } }
      }
    },
    { $sort: { _id: -1, [groupSort]: 1 } }
  ]).toArray()
    .then(survivalTable => {
      returnData.survivalTotal = survivalTable.map(item => {
        const dataObject = item.bin.reduce((acc, curr) => {
          if (typeof (acc[curr]) == 'undefined') {
            acc[curr] = 1;
          }
          else {
            acc[curr] += 1;
          }
          return acc;
        }, {});
        // console.log(dataObject);
        // merge it with the time range object to get one value per date, including zeros
        const allTimes = timeRange.map(item => {
          if (typeof (dataObject[item]) != 'undefined') {
            return ({
              [item]: dataObject[item]
            });
          }
          else {
            return ({
              [item]: 0
            });
          }
        });
        return {
          type: bySurvival ? [getBin(item._id).result] : item._id,
          score: bySurvival ? getBin(item._id).level : 0,
          data: allTimes.map(elem => {
            const yearQuarter = Object.keys(elem)[0].split('_');
            const start = `${yearQuarter[0]}-${parseInt(yearQuarter[1].split('Q')[1], 10) * 3 - 2}-01`;
            return ({ bin: Object.keys(elem)[0], count: elem[Object.keys(elem)[0]], start })
          })
        };
      });
    })
    .then(result => {
      console.log(returnData);
      return Promise.resolve(returnData);
    })
    .catch(err => Promise.reject(err));

};


/** survivalAnalysis runs a query and returns an object used to make a pie chart
* @param {mongodb} client: mongodb - mongo database
* @param {field:string, Array<value:string>} query: an object with a field  (eg 'PatentOwner' or 'all') and an array of values(eg ['npe'])
* @returns {Promise} resolving to { returnData: {
*   chartType: {string} -> 'pie'
*   title: {string}, 
*   countTotal: {number},
*   countUnique: {number},
*   survivalTotal: {type: {string}, data: [{count: number}]},
*   survivalUnique: {type: {string}, data: [{count: number}]}
}}
*/

const survivalAnalysis = (db, query) => {
  let collection = db.collection('ptab');
  let totalQuery = {};
  let uniqueQuery = {};
  const returnData = { chartType: 'pie', title: `${query.field === 'all' ? 'all' : `${query.field}:${query.value}`}` };
  // parse the query {field, value}
  if (query.field !== 'all') {
    totalQuery.$or = query.value.map(item => {
      return Object.assign({
        [query.field]: item
      });
    })
  }
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
        { $sort: { _id: -1 } }
      ]).toArray();
    })
    .then(survivalTable => {
      returnData.survivalTotal = survivalTable.map(item => ({ type: [item._id.result], score: item._id.level, data: [{ count: item.count }] }));
      collection = db.collection('byClaims');
      if (query.field !== 'all') {
        query.field.includes('PatentOwner') ?
          uniqueQuery.$or = query.value.map(item => Object.assign({
            ['_id.'.concat(query.field)]: item
          })) :
          uniqueQuery.$or = query.value.map(item => Object.assign({
            ['Petitions.'.concat(query.field)]: item
          }))
      }
      console.info('running unique query with value %j', uniqueQuery);
      return collection.aggregate([
        { $match: uniqueQuery },
      ]).toArray();
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
        { $sort: { _id: -1 } }
      ]).toArray();
    })
    .then(uniqueTable => {
      returnData.survivalUnique = uniqueTable.map(item => ({ type: [getBin(item._id).result], score: item._id, data: [{ count: item.count }] }));
    })
    .then(result => {
      console.log(returnData);
      return Promise.resolve(returnData);
    })
    .catch(err => Promise.reject(err));
};

/**
 * 
 * @param {Object} record 
 * @param {string} record.IPR - "IPR2016-00634",
 * @param {Date} record.DateFiled
 * @param {string} record.Status
 * @param {[string]} record.FWDStatus
 * @param {[string[]]} record.AllJudges
 * @param {[string]} record.AuthorJudge
 * @param {Object[]} record.Petitioner
 *   @param {[string]} record.Petitioner[].type
 *   @param {string} record.Petitioner[].name
 * @param {string} record.patentNumber
 * @param {[string]} record.CaseLink
 * @param {[string]} record.MainUSPC
 * @param {[number[]]} record.ClaimsListed
 * @param {[number[]]} record.ClaimsInstituted
 * @param {[number[]]} record.ClaimsUnpatentable
 * @param {[Date]} record.InstitutionDate
 * @returns {Object}
 *   @returns {string[]} type
 *   @returns {Object} data
 *   @returns {number[]} data.count
 */
const binRecord = (record) => {
  let killed, impaired, weakened, unaffected;
  if (record.ClaimsListed) {
    //killed: the total number of unpatentable claims
    // TODO: deal with the waived claims, not many of those though
    killed = {
      type: ['killed'],
      data: [
        { count: record.ClaimsUnpatentable ? record.ClaimsUnpatentable.length : 0 }
      ]
    };
    //impaired: if Status = Settled, ClaimsInstituted
    impaired = {
      type: ['impaired'],
      data: [
        {
          count: record.Status === 'Terminated-Settled'
            ? (record.ClaimsInstituted ? record.ClaimsInstituted.length : 0)
            : 0
        }
      ]
    }
    //weakened: if Status = instituted, count of ClaimsInstituted
    weakened = {
      type: ['weakened'],
      data: [{
        count: record.Status === 'Instituted'
          ? (record.ClaimsInstituted ? record.ClaimsInstituted.length : 0)
          : 0
      }]
    }
    //unaffected: if Status = FWD Entered or Settled ->  Listed - Instuted
    // if Status = Denied -> Listed
    unaffected = {
      type: ['unaffected'],
      data: [{
        count: (
          (record.Status === 'FWD Entered' || record.Status === 'Terminated-Settled')
            ? record.ClaimsListed.length - (record.ClaimsInstituted ? record.ClaimsInstituted.length : 0)
            : 0)
          + (record.Status === 'Terminated-Denied' ? record.ClaimsListed.length : 0)
      }]
    }
  }
  return killed;
}

/**
 * A helper function that takes a query and returns a mongoDB $or formatted object
 * @private
 * @param {Object} query 
 * @param {string} query.field - the field to search
 * @param {string[]} query[].value - an array of at least one value to 'AND' together
 * @returns {Object} $or
 *   @returns {Object[]} $or[]
 *     @returns {string} $or[].[field]
 */
const parseQuery = (query) => {
  // parse the totalQuery {field, [value]} -> {$or: {[[field]:value1, [field]:value2]}}
  if (query.field !== 'all') {
    return {}.$or = query.value.map(item => {
      return Object.assign({
        [query.field]: item
      });
    })
  } else {
    return {}
  }
}

/**
 * survivalQuery takes in incoming query and generates a survival analysis of all matching values
 * @async
 * @param {Object} db - a mongoDB object 
 * @param {Object} query
 * @param {string} query.field - the field to search
 * @param {string[]} query[].value - an array of at least one value to 'AND' together
 * @returns {Object} - returns an object containing
 * @returns {Object} returnData
 *   @returns {string} returnData.chartType - the type of chart, usually 'pie'
 *   @returns {string} returnData.title - the chart title
 *   @returns {number} returnData.countTotal - the count of all claims matching the query, including duplicates
 *   @returns {number} returnData.countUnique - the count of all claims matching the query without duplicates
 *   @returns {Object} returnData.survivalTotal - the breakdown of claims including duplicates
 *     @returns {string[]} returnData.survivalTotal.type - an array of survival category
 *     @returns {Object[]} returnData.survivalTotal.data - an array of count objects 
 *       @returns {number} returnData.survivalTotal.data.count - the number of claims in the category
 *   @returns {Object} returnData.survivalUnique - the breakdown of claims without duplicates
 *     @returns {string[]} returnData.survivalUnique.type - an array of survival category
 *     @returns {Object[]} returnData.survivalUnique.data - an array of count objects 
 *       @returns {number} returnData.survivalUnique.data.count - the number of claims in the category
 */
const survivalQuery = async (db, query) => {
  let collection = db.collection('byTrial');
  let uniqueQuery = {};
  // set up the basic return Data values
  const returnData = { chartType: 'pie', title: `${query.field === 'all' ? 'all' : `${query.field}:${query.value}`}` };
  let totalQuery = parseQuery(query);
  // get the list of matching documents
  let allMatches = await collection.aggregate([{ $match: totalQuery }]).toArray();
  // allMatches now holds an array of byTrial-type documents
  // to get total claim count, need to count all of the 'claimsListed' lengths
  returnData = allMatches.reduce((accum, current) => {
    // here get the type and accumulate the count for that type
    // for each element, get the lengths of ClaimsListed array and accumulate
    if (Object.keys(accum).includes(current)) { let currentBin = getBin(current); }
    let survivalTotal = {
      type: type, //do a type lookup above
      // for data - if not exists, push count=1
      // if exists, add to count
      data: accum.survivalTotal.data.push({ count: 1 }) /*need to accumulate by type !*/
    }
    return {
      countTotal: accum.countTotal + current.ClaimsListed.length,
      survivalTotal
    };
  });
  // killed claims - count of ClaimsUnpatentable
  // impaired claims - count of ClaimsInstituted
  // first - get the list of all claims (include duplicates)
  return collection.aggregate([
    { $match: totalQuery },
    {
      $group: {
        _id: '$survivalStatus',
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: -1 } }
  ]).toArray();

}

module.exports = {
  survivalAnalysis,
  survivalArea,
  survivalQuery,
  binRecord
};
