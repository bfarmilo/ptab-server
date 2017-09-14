const { extractMultiples, extractTypes } = require('./helpers.js');

const getEntityData = (client) => {
  let idList = [];
  // goes through the main database and collects tables of entities and types.
  // first - get a list of all elements that we will iterate through
  console.log('getting list of claimIDs');
  return client.keys('claimID:*')
    .then(elementList => {
      //map to a massive list of hget commands
      idList = elementList;
      console.log('%d elements returned.\n Generating list of patent owners and petitioners', elementList.length);
      return client.multi(elementList.map(element => ['hmget', element, 'PatentOwner', 'Petitioner'])).exec()
    })
    .then(results => {
      // take the result array of [[PatentOwner, Petitioner]], add in the claimID and expand multiples
      console.log('%d results returned.\n Generating mapping of entities', results.length);
      return [].concat(...results.map((item, index) => {
        const petitioners = extractMultiples(item[1]).map(petitioner => extractTypes(petitioner, idList[index], 'petitioner'));
        const patentowners = extractMultiples(item[0]).map(owner => extractTypes(owner, idList[index], 'patentowner'));
        return [].concat(...petitioners).concat(...patentowners)
      }))
    })
    .then(entityArray => {
      // now add the name to the entity:names set and type to entity:types set
      console.log('entity Array generated, creating new tables');
      const names = entityArray.map(item => item.name);
      const types = entityArray.map(item => item.type);
      const cmdList = [['sadd', 'entity:names', names], ['sadd', 'entity:types', types]]
        .concat(entityArray.map(item => ['sadd', `${item.party}:${item.name}`, item.id]))
        .concat(entityArray.map(item => ['sadd', `${item.party}type:${item.type}`, item.id]))
      return client.multi(cmdList).exec()
    })
    .then(() => Promise.resolve('done'))
    .catch(err => Promise.reject(err))
}

module.exports = {
  getEntityData
}