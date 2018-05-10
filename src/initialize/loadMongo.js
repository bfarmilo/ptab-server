const { survivalStatus } = require('../survival/survivalBin');
const { extractMultiples, extractTypes, flatten, writeNextBatch } = require('../entities/helpers');
const config = require('../../config/config.json');

/**
 * loadNewCollecion inserts documents into a collection.
 * @param {mongodb} db 
 * @param {string} collectionName 
 * @param {Arraya<Object>} data
 * @returns {string} Status message indicating success
 */
const loadNewCollection = async (db, collectionName, data) => {
  try {
    await db.createCollection(collectionName);
    if (await writeNextBatch(db, collectionName, 0, data) === 'done') {
      return Promise.resolve(`${collectionName} collection created`);
    }
  } catch (err) {
    return Promise.reject(err);
  }
}

/** 
 * setStatus takes a byTrial-type collection and cleans it
 * converting AllJudges to an array
 * converting Petitioner and PatentOwner to {name, type} elements in an array
 * converting dates to ISODates
 * converting FWDStatus to all lowercase
 * @param coll: mongodb.collection
 * @param schema: 'ptab' or 'byTrial'
 * @returns 'OK' or error
 */

const setStatus = async (collection, schema, offset) => {
  /**
   * bulkWriteBatch breaks data into chunks and writes config.maxWriteRecords at a time
   * called recursively until the data array is spent
   * expects a valid bulkWrite command for each element of the data array
   * eg. { updateOne: {
          filter: { _id: item._id },
          update: { $set: setQuery },
          upsert: true
        }}
   * @param {mongodb collection} collection 
   * @param {number} cursor 
   * @param {Array<Documents>} data
   * @returns {Promise} a recursive call to itself or {string} 'done' 
   */
  const bulkWriteBatch = async (collection, cursor, data) => {
    if (cursor >= data.length) return Promise.resolve('done'); //return promise or value ?
    await collection.bulkWrite(data.slice(cursor, config.maxWriteRecords + cursor));
    return await bulkWriteBatch(collection, cursor + config.maxWriteRecords, data); //return promise or value ?
  }

  try {
    let result = await collection.find({}).toArray();
    let commandList = result.map(item => {
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
      } else {
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
    });
    if (await bulkWriteBatch(collection, 0, commandList) === 'done') return Promise.resolve(check);
  } catch (err) {
    return Promise.reject(err)
  }
}

/**
 * getEntities generates a new collection of the 'entity' (petitioners or patent owners)
 * RUN ONCE on creating the new collection
 * @param {mongoDB} db: mongodb collection -> the collection to scan
 * @param {string} entity: Petitioner or PatentOwner
 * @returns {Promise} resolves to {string} status message
 **/

const getEntities = async (db, entity) => {

  try {
    const total = await db.collection('byTrial').find({}).count();
    const entities = await db.collection('byTrial').find({}, { [entity]: 1 }).toArray();
    const uniqueEntities = flatten(entities.map(item => item[entity])).reduce((accum, item) => {
      const usedNames = accum.map(x => x.name);
      if (!usedNames.includes(item.name)) accum.push(item);
      return accum;
    }, [])
    if (await writeNextBatch(db, `${entity}s`, 0, uniqueEntities) === 'done') {
      return Promise.resolve(`${uniqueEntities.length} records added to ${entity}`);
    }
  } catch (err) {
    return Promise.reject(err)
  }
}

// TODO?: create a document of survivalStatus'

// TODO?: create index of survivalStatus

// TODO?: create document of searchable collections for dropdowns

// TODO?: create a document of Status types and an index

// TODO?: create a document of main classes and an index




/**
 * TODO: Update this function to work with byTrials collection
 * 1. group by patent number, project the three claims lists
 * 2. 
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
  getEntities,
  mapPatentClaim,
  loadNewCollection
};
