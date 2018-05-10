/**
 * helpers.js is a collection of useful functions for manipulating JSON data
 * mostly in initializing the database or processing new records
 * @public
 */

const config = require('../../config/config.json');
/**
 * extractTypes takes a single party (Petitioner or Patent Owner) and returns the entity name
 * and entity type (npe, etc.). If type not included return 'unknown'
 * 
 * @param {string} entity a single entity, of the form 'company name (type)' 
 * @param {number} index DEPRECATED the index to add to the record
 * @param {string} party DEPRECATED the party type (Petitioner || PatentOwner) to add to the record
 * @returns {{name:string, type:string}} an object with name:the company name, type:the type of entity
 */
const extractTypes = (entity, index, party) => {
  const partyComponents = entity.match(/(.*)? \((\w+)\)/);
  return partyComponents ? {
    //party,
    name: partyComponents[1],
    type: partyComponents[2] //,
    //id: index
  } : {
      //party,
      name: entity,
      type: "unknown" // ,
      //id: index
    }
}



/**
 * extractMultiples takes fields of the form 'a; b; c'
 * and returns an array of ['a','b','c']
 * 
 * @param {string} value the string to separate
 * @returns {array: string} the array of strings with whitespace removed
 */
const extractMultiples = (value) => {
  // dataset often stores multiples separated by ;
  // this returns an array without the ; and trims white space

  return value.split(';').map(item => item.trim());
}

/**
 * flatten simply takes a nested array and returns a flattened array
 * 
 * @param {array} list the input array containing nested arrays
 * @returns {array} the flattened output array
 */
const flatten = list => list.reduce(
  (a, b) => a.concat(Array.isArray(b) ? flatten(b) : b), []
);


/**
 * getDistinct generates an array of distinct elements from a field
 * 
 * if 'all' is queried, return a one-element array ['all']
 * @param collection -> a mongodb collection to search
 * @param {string} field -> the field to scan for distinct values
 * @returns {Promise} Promise that resolves to a single object {field {string}: [distinct values]} 
 */
const getDistinct = (collection, field) => {
  if (field === 'all') return Promise.resolve({ 'all': ['all'] });
  let aggregation = [{ $project: { checkField: `$${field}` } }];
  if (field.includes('Petitioner') || field.includes('PatentOwner') || field.includes('AllJudges')) {
    // these return arrays, so we need an unwind step after the projection
    aggregation.push({ $unwind: '$checkField' })
  }
  return collection.aggregate(
    aggregation.concat([{
      $group: {
        _id: 'checkField',
        result: { $addToSet: '$checkField' }
      }
    },
    { $unwind: '$result' },
    { $sort: { result: 1 } }
    ])
  ).toArray()
    .then(result => Promise.resolve({
      [field]: result.map(item => item.result.toString())
    }))
    .catch(err => Promise.reject(err));
}

/** writeNextBatch is a helpful recursive function that writes 50 records at a time
 * @param {mongoDB} db - the mongodb instance
 * @param {string} collection - the collection to write to
 * @param {number} cursor - the start of the chunk of records to write
 * @param {Array<Object>} data - an array of documents
 */
const writeNextBatch = async (db, collection, cursor, data) => {
  try {
    if (cursor >= data.length) {
      return Promise.resolve('done');
    }
    console.log('adding records %d-%d', cursor, cursor + config.maxWriteRecords >= data.length ? data.length : cursor + config.maxWriteRecords);
    console.log('writing to collection %s', collection);
    console.log('writing data %j', data.slice(cursor, + cursor));
    await db.collection(collection).insert(data.slice(cursor, config.maxWriteRecords + cursor));
    return await writeNextBatch(db, collection, cursor + config.maxWriteRecords, data);
  } catch (err) {
    return Promise.reject(err)
  }
}

module.exports = {
  extractTypes,
  extractMultiples,
  flatten,
  getDistinct,
  writeNextBatch
}
