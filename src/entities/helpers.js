/**
 * helpers.js is a collection of useful functions for manipulating JSON data
 * mostly in initializing the database or processing new records
 * @public
 */

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
 * if 'all' is queried, return an empty array
 * @param {mongodb collection} collection a mongodb collection to search
 * @param {string} field the field to scan for distinct values
 * @returns {Promise} Promise that resolves to a single object {field {string}: [distinct values]} 
 */
const getDistinct = (collection, field) => {
  if (field === 'all') return Promise.resolve({ 'all': [] });
  const typeList = new Set();
  return collection.distinct(field)
    .then((result) => Promise.resolve({
      [field]: result
    }))
    .catch(err => Promise.reject(err));
}

module.exports = {
  extractTypes,
  extractMultiples,
  flatten,
  getDistinct
}
