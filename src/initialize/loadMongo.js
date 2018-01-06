const { survivalStatus } = require('../survival/survivalBin');
const { extractMultiples, extractTypes, flatten } = require('../entities/helpers');



const loadNewCollection = async (db, collectionName, data) => {
  try {
    await db.createCollection(collectionName);
    await Promise.all(
      data.map(async (item) => await db.collection(collectionName).insert(item))
    );
    return `${collectionName} collection created`;
  } catch (err) {
    return err;
  }
}


/** 
 * setStatus takes a collection and assigns a 'survivalStatus' to each element
 * @param coll: mongodb.collection
 * @param schema: 'ptab' or 'byTrial'
 * @returns 'OK' or error
 */

const setStatus = (coll, schema, offset) => {
  const scaling = 10;
  let collection = coll;
  return collection.find({}).skip(offset*scaling).limit(scaling).toArray()
    .then(result => {
      console.log(offset*scaling);
      return result.map(item => {
        // split any multiples into arrays (unless they already are arrays)
        const petitioners = Array.isArray(item.Petitioner) ? item.Petitioner : extractMultiples(item.Petitioner).map(entity => extractTypes(entity, 0, "Petitioner"));
        const patentowners = Array.isArray(item.PatentOwner) ? item.PatentOwner : extractMultiples(item.PatentOwner).map(entity => extractTypes(entity, 0, "PatentOwner"));
        let judges = Array.isArray(item.AllJudges) ? flatten(item.AllJudges) : extractMultiples(item.AllJudges);
        // now Build a set query
        // change FWDStatus to lower case
        // convert petition date to ISO dates
        // add AllJudges, petitioners and patentOwners in array form
        const setQuery = {
          FWDStatus: item.FWDStatus.toLowerCase(),
          DateFiled: new Date(item.DateFiled),
          AllJudges: judges,
          Petitioner: petitioners.map(item => ({ name: item.name.trim(), type: item.type })),
          PatentOwner: patentowners.map(item => ({ name: item.name.trim(), type: item.type }))
        };
        if (schema === 'ptab') {
          // upsert survival Status (ptab collection only)
          // add a claimIdx value for future de-duplication
          const health = survivalStatus(item.Status, item.FWDStatus.toLowerCase(), item.Instituted, item.Invalid);
          setQuery.survivalStatus = health; //ptab collection
          setQuery.claimIdx = `${item.Patent}-${item.Claim}`; //ptab collection
        }
        else {
          // for the byTrials collection, add an institution date in ISO form (if defined)
          if (item.InstitutionDate != 'undefined') setQuery.InstitutionDate = new Date(item.InstitutionDate);
        }
        return {
          updateOne: {
            filter: { _id: item._id },
            update: {
              $set: setQuery
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

const getPatentOwners = (collection, newcoll, entity) => {
  return collection.distinct(entity, {})
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

/** ImportPTAB takes a collection from the Ptab trials format and maps it to the byTrials collection format
 * input schema {
 *   applicationNumber,
 *   patentNumber,
 *   patentOwnerName,
 *   prosecutionStatus,
 *   filingDate,
 *   petitionerPartyName,
 *   lastModifiedDatetime,
 *   accordedFilingDate,
 *   institutionDecisionDate,
 *   trialNumber,
 *   inventorName,
 *   links: [
 *     {rel, href}
 *   ]
 * }
 * 
 * output schema {
 *   IPR -> trialNumber,
 *   DateFiled -> ISODate(filingDate),
 *   Status -> prosecutionStatus,
 *   FWDStatus,
 *   AllJudges,
 *   AuthorJudge,
 *   Petitioner: [
 *     {type, name -> petitionerPartyName}
 *   ],
 *   PatentOwner: [
 *     {type, name -> patentOwnerName}
 *   ],
 *   PatentNumber -> patentNumber,
 *   CaseLink,
 *   MainUSPC,
 *   ClaimsListed: [],
 *   ClaimsInstituted: [],
 *   ClaimsUnpatentable: [],
 *   InstitutionDate -> ISODate(institutionDecisionDate)
 * }
 * 
 * 
 **/

const importPTAB = (db, newcoll, data) => {
  /* return inputCollection.find({}).toArray()
    .then(result => { */
  return db.collection(newcoll).insert(data.map(record => {
    const newRecord = {
      IPR: record.trialNumber,
      DateFiled: new Date(record.filingDate),
      Status: record.prosecutionStatus,
      Petitioner: [].concat({ name: record.petitionerPartyName }),
      PatentOwner: [].concat({ name: record.patentOwnerName }),
      PatentNumber: record.patentNumber,
      CaseLink: record.links.filter(item => item.rel === 'self')[0].href
    };
    if (record.InstitutionDate != 'undefined') newRecord.InstitutionDate = new Date(record.institutionDecisionDate);
    return newRecord;
  })) /*;})
    .then(resultCollection => db.collection(newcoll).insert(resultCollection)) */
    .then(result => Promise.resolve(result))
    .catch(err => Promise.reject(err));
};

// TODO fix this function, not working and needs a re-think
const updatePTAB = (db, inputCollection) => {
  // lookup the PatentOwner and Petitioner types
  // searching for 7 letters seems to be pretty reliable
  return inputCollection.find({}).toArray()
    .then(result => result.map(record => {
      return db.collection('Petitioners').find({ name: record.Petitioners[0].name })
        .then(match => {
          console.log(match);
          if (match.length !== 0) {
            record.Petitioners[0].type = match.type;
          } else {
            record.Petitioners[0].type = 'unknown';
          }
          return;
        })
    }))
    .then(newTable => inputCollection.update())
    .then(result => Promise.resolve(result))
    .catch(err => Promise.reject(err));
}

/**
 * mergeNewRecords compares two collections and returns a list of IPR case numbers
 * that are in the new list but not in the old list.
 * 
 * @param {Object: mongoDB} db 
 * @param {string} inputCollection 
 * @param {string} mainCollection
 * @returns {Promise -> Array<{ IPR:{string} }>}
 */
const mergeNewRecords = (db, inputCollection, mainCollection) => {
  const writeStatus = {};
  return db.collection(inputCollection).find({}).toArray()
    .then(firstResult => db.collection('merge').insert(firstResult.map(item => {
      item.source = 'old';
      return item;
    })))
    .then(() => db.collection(mainCollection).find({}).toArray())
    .then(newResult => db.collection('merge').insert(newResult.map(item => {
      item.source = 'new';
      return item;
    })))
    .then(() => db.collection('merge').aggregate([
      { $project: { IPR: 1, source: 1 } },
      { $group: { _id: "$IPR", matches: { $sum: 1 } } },
      { $match: { matches: 1 } },
      { $project: { IPR: "$_id", _id: 0 } },
      {
        $lookup: {
          from: "ptabRaw",
          localField: "IPR",
          foreignField: "IPR",
          as: "newRecord"
        }
      },
      { $project: { "newRecord._id": 0 } }
    ]).toArray())
    .then(result => {
      writeStatus.added = result.filter(item => item.newRecord.length !== 0).length;
      if (writeStatus.added > 0) {
        return db.collection('byTrial').insert(
          result.filter(item => item.newRecord.length !== 0).map(item => item.newRecord[0])
        )
      }
      return;
    })
    .then(() => db.collection('merge').drop())
    .then(result => Promise.resolve(writeStatus))
    .catch(err => Promise.reject(err));
}

module.exports = {
  setStatus,
  getPetitioners,
  getPatentOwners,
  mapPatentClaim,
  importPTAB,
  updatePTAB,
  loadNewCollection,
  mergeNewRecords
};
