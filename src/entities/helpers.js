const extractTypes = (entity, index, party) => {
  // takes a single party (Petitioner or Patent Owner) and returns the entity name
  // and entity type (npe, etc.). If type not included return 'unknown'
  const partyComponents = entity.match(/(.*)? \((\w+)\)/);
  return partyComponents ? {
    //party,
    name: partyComponents[1],
    type: partyComponents[2] //,
    //id: index
  } : {
      //party,
      name: entity,
      type: "unknown"// ,
      //id: index
    }
}



const extractMultiples = (value) => {
  // dataset often stores multiples separated by ;
  // this returns an array without the ; and trims white space

  return value.split(';').map(item => item.trim());
}

const flatten = list => list.reduce(
    (a, b) => a.concat(Array.isArray(b) ? flatten(b) : b), []
);

/* getDistinct generates an array of distinct elements from a field
@param collection: mongodb collection
@param field: the field to search
returns a promise resolving to an {[field]: Array<string> of distinct values}
*/

const getDistinct = (collection, field)  => {
  const typeList = new Set();
  return collection.distinct(field)
  .then((result) => Promise.resolve({[field]:result}))
  .catch(err => Promise.reject(err));
}

module.exports = {
  extractTypes,
  extractMultiples,
  flatten,
  getDistinct
}