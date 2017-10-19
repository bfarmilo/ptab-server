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
  // this returns an array without the ;
  // console.log(value.split(';'));
  return value.split(';');
}

const flatten = list => list.reduce(
    (a, b) => a.concat(Array.isArray(b) ? flatten(b) : b), []
);


module.exports = {
  extractTypes,
  extractMultiples,
  flatten
}