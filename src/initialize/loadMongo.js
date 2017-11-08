const { survivalStatus } = require('../survival/survivalBin');
const { extractMultiples, extractTypes, flatten } = require('../entities/helpers');




/** 
* setStatus takes a collection and assigns a 'survivalStatus' to each element
* @param coll: mongodb.collection
* @param schema: 'ptab' or 'byTrial'
* @returns 'OK' or error
*/

const setStatus = (coll, schema) => {
  let collection = coll;
  return collection.find({}).toArray()
    .then(result => {
      return result.map(item => {
        // split any multiples into arrays (unless they already are arrays)
        const petitioners = Array.isArray(item.Petitioner) ? item.Petitioner : extractMultiples(item.Petitioner).map(entity => extractTypes(entity, 0, "Petitioner"));
        const patentowners = Array.isArray(item.PatentOwner) ? item.PatentOwner : extractMultiples(item.PatentOwner).map(entity => extractTypes(entity, 0, "PatentOwner"));
        let judges = Array.isArray(item.AllJudges) ? flatten(item.AllJudges) : extractMultiples(item.AllJudges);
        const setQuery = {
          FWDStatus: item.FWDStatus.toLowerCase(),
          DateFiled: new Date(item.DateFiled),
          AllJudges: judges,
          Petitioner: petitioners.map(item => ({ name: item.name.trim(), type: item.type })),
          PatentOwner: patentowners.map(item => ({ name: item.name.trim(), type: item.type }))
        };
        if (schema === 'ptab') {
          // upsert survival Status (ptab collection only)
          const health = survivalStatus(item.Status, item.FWDStatus.toLowerCase(), item.Instituted, item.Invalid);
          setQuery.survivalStatus = health; //ptab collection
          setQuery.claimIdx = `${item.Patent}-${item.Claim}`; //ptab collection
        }
        else {
          if (item.InstitutionDate != 'undefined') setQuery.InstitutionDate = new Date(item.InstitutionDate);
        }

        // change FWDStatus to lower case
        // convert petition date to ISO dates
        return {
          updateOne: {
            filter: { _id: item._id },
            update: {
              $set: {
                // survivalStatus: health, //ptab collection
                InstitutionDate: item.InstitutionDate != 'undefined' ? new Date(item.InstitutionDate) : '', //byTrial collection
                FWDStatus: item.FWDStatus.toLowerCase(),
                DateFiled: new Date(item.DateFiled),
                AllJudges: judges,
                Petitioner: petitioners.map(item => ({ name: item.name.trim(), type: item.type })),
                PatentOwner: patentowners.map(item => ({ name: item.name.trim(), type: item.type })),
                // claimIdx: `${item.Patent}-${item.Claim}` //ptab collection
              }
            },
            upsert: true
          }
        }
      })
    })
    .then(commandList => {
      return collection.bulkWrite(commandList)
    })
    .then(check => Promise.resolve(check))
    .catch(err => Promise.reject(err))
}

// create a document of survivalStatus'

// create index of survivalStatus

// create document of searchable collections for dropdowns

// create a document of Status types and an index

/**
* getPetitioners generates a new collection of petitioners
* @param collection: mongodb collection -> the collection to scan
* @param newcoll: mongodb collection -> the new collection to create, containing unique petitioners {name,type}
* @returns string status message
**/

const getPetitioners = (collection, newcoll) => {
  return collection.distinct('Petitioner', {})
    .then(result => result.map(item => item.trim()))
    .then(petitioners => petitioners.map(item => {
      const partyComponents = item.match(/(.*)? \((\w+)\)/);
      return partyComponents ? {
        name: partyComponents[1],
        type: partyComponents[2]
      } : {
        name: item,
        type: "unknown"
      }
    }))
    .then(petitionerCollection => newcoll.insert(petitionerCollection))
    .then(fullCollection => newcoll.distinct)
    .then(status => Promise.resolve(status))
    .catch(err => Promise.reject(err))
}

/**
* getPatentOwners generates a new collection of petitioners
* @param collection: mongodb collection -> the collection to scan
* @param newcoll: mongodb collection -> the new collection to create, containing unique petitioners {name,type}
* @returns string status message
* TODO: just merge with getPetitioners into one function, they are basically identical
**/

const getPatentOwners = (collection, newcoll) => {
  return collection.distinct('PatentOwner', {})
    .then(result => result.map(item => item.trim()))
    .then(patentowners => patentowners.map(item => {
      const partyComponents = item.match(/(.*)? \((\w+)\)/);
      return partyComponents ? {
        name: partyComponents[1],
        type: partyComponents[2]
      } : {
        name: item,
        type: "unknown"
      }
    }))
    .then(resultCollection => newcoll.insert(resultCollection))
    .then(status => Promise.resolve(status))
    .catch(err => Promise.reject(err))
}
// create a document of main classes and an index


/**
 * mapPatentClaim creates a new collection indexed by patents and claims, to accumulate duplicates
 * it also creates a new field 'worstStatus' which is the worst outcome of all of the challenges
 * @param collection: mongodb collection -> the collection to map
 * @param newcoll: mongodb collection -> the output collection to create
 * @returns status: string -> status message after collection creation or error
 * 
 * resulting documents are of the form:
 *   _id={claimIdx: string, PatentOwner: Array<{name:string, type:string}>}
 *   worstStatus: number
 *   Petitions: Array<{
 *     IPR:string, 
 *     DateFiled:Date, 
 *     FWDStatus:string,
 *     Petitioner:Array<{name:string, type:string}>}>
 *     survivalStatus: {level:number, result:string}
 *     id: mongodb id of the original record
 **/

const mapPatentClaim = (collection, newcoll) => {
  return collection.aggregate([{
      $group: {
        _id: { claimIdx: '$claimIdx', PatentOwner: '$PatentOwner' },
        worstStatus: { $max: '$survivalStatus.level' },
        Petitions: {
          $push: {
            IPR: '$IPR',
            DateFiled: '$DateFiled',
            FWDStatus: '$FWDStatus',
            Petitioner: '$Petitioner',
            survivalStatus: '$survivalStatus',
            id: '$_id'
          }
        }
      }
    }]).toArray()
    .then(result => newcoll.insert(result))
    .then(status => Promise.resolve(status))
    .catch(err => Promise.reject(err))
}

module.exports = {
  setStatus,
  getPetitioners,
  getPatentOwners,
  mapPatentClaim
}
