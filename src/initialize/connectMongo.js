const MongoClient = require('mongodb').MongoClient;
const { survivalStatus } = require('./survivalBin');
const { extractMultiples, extractTypes } = require('../entities/helpers');
const url = require('../../config/config.json').database.mongoUrl;

const connect = () => MongoClient.connect(url)
  .then(database => {
    console.info("connected to server");
    return Promise.resolve(database);
  })
  .catch(err => {
    return Promise.reject(err);
  })

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
        // split any multiples into arrays
        const petitioners = item.Petitioner.find(';') ? extractMultiples(item.Petitioner) : [item.Petitioner];
        const patentowners = item.PatentOwner.find(';') ? extractMultiples(item.PatentOwner) : [item.PatentOwner];
        // change FWDStatus to lower case
        // convert petition date to ISO dates
        return {
          updateOne: {
            filter: { _id: item._id },
            update: {
              $set: {
                survivalStatus: health,
                FWDStatus: item.FWDStatus.toLowerCase(),
                DateFiled: new Date(item.DateFiled)
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
    .then(check => Promise.resolve('OK'))
    .catch(err => Promise.reject(err))
}

const fixDate = coll => {
  let collection = coll;
  return collection.find({}).toArray()
    .then(result => result.map(item => {
      return {
        updateOne: {
          filter: { _id: item._id },
          update: { $set: { DateFiled: new Date(item.DateFiled) } }
        }
      }
    })
    )
    .then(cmdList => collection.bulkWrite(cmdList))
    .then(check => Promise.resolve('OK'))
    .catch(err => Promise.reject(err))
}

// create document of fields (IPR, Status, etc.) ?

// create a document of survivalStatus'

// create index of survivalStatus

// create document of searchable collections for dropdowns

// create a document of Status types and an index

// create a document of FWDStatus Types (convert to lower case) and an index
// coll: collection - the collection to traverse (the main db)
// newcoll: collection - the collection to output to
const makeFWDStatus = (coll, newcoll) => {
  return coll.distinct({ FWDStatus }).toArray()
    .then(FWDList => newcoll.insert(FWDList))
    .then(status => Promise.resolve(status))
    .catch(err => Promise.reject(err))
}


// create a document of Petitioners with their types and an index (and update records with multiples ?)
const getPetitioners = (collection, newcoll) => {
  return collection.find({}).toArray()
    .then(result => new Set(...result.map(item => item.Petitioner)))
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
    .then(status => Promise.resolve(status))
    .catch(err => Promise.reject(err))
}

// create a document of PatentOwners with their types and an index (and update records with multiples ?)
const getPatentOwners = (collection, newcoll) => {
  return collection.find({}).toArray()
    .then(result => new Set(...result.map(item => item.PatentOwner)))
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

// TODO figure out how I'm going to deal with unique claims and binning ?

// TODO convert dates to ISO date formats
module.exports = {
  connect,
  setStatus,
  fixDate,
  makeFWDStatus,
  getPetitioners,
  getPatentOwners
}