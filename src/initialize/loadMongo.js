const { survivalStatus } = require('../survival/survivalBin');
const { extractMultiples, extractTypes, flatten } = require('../entities/helpers');

/* 
setStatus takes a collection and assigns a 'survivalStatus' to each element
coll: mongodb.collection
returns 'OK' or error
*/

const setStatus = coll => {
  let collection = coll;
  return collection.find({}).toArray()
    .then(result => {
      return result.map(item => {
        // upsert survival Status
        const health = survivalStatus(item.Status, item.FWDStatus.toLowerCase(), item.Instituted, item.Invalid);
        // split any multiples into arrays (unless they already are arrays)
        const petitioners = Array.isArray(item.Petitioner) ? item.Petitioner : extractMultiples(item.Petitioner).map(entity => extractTypes(entity, 0, "Petitioner"));
        const patentowners = Array.isArray(item.PatentOwner) ? item.PatentOwner : extractMultiples(item.PatentOwner).map(entity => extractTypes(entity, 0, "PatentOwner"));
        let judges = Array.isArray(item.AllJudges) ? flatten(item.AllJudges) : extractMultiples(item.AllJudges);
        // change FWDStatus to lower case
        // convert petition date to ISO dates
        return {
          updateOne: {
            filter: { _id: item._id },
            update: {
              $set: {
                survivalStatus: health,
                FWDStatus: item.FWDStatus.toLowerCase(),
                DateFiled: new Date(item.DateFiled),
                AllJudges: judges,
                Petitioner: petitioners.map(item => ({name: item.name.trim(), type: item.type})),
                PatentOwner: patentowners.map(item => ({name: item.name.trim(), type: item.type})),
                claimIdx: `${item.Patent}-${item.Claim}`
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

// create a document of Petitioners with their types and an index (and update records with multiples ?)
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

// create a document of PatentOwners with their types and an index (and update records with multiples ?)
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

// TODO: Map to a patents and claims table
/* 
  _id=PatentClaim
  Patent: string
  Claim: number
  Status: string
  PatentOwner: Array<patentOwnerIDs>
  Petitions: Array<{IPR:string, DateFiled:Date, FWDStatus:string, Petitioner:Array<petitionerID>}>
*/
// finally based on worst outcome, assign a status to the overall claim

const mapPatentClaim = (collection, newcoll) => {
  return collection.aggregate([
    {
      $group: {
        _id: {claimIdx: '$claimIdx', PatentOwner: '$PatentOwner'},
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
    }
  ]).toArray()
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