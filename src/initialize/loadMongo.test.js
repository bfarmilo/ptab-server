const { loadNewCollection, setStatus, fixDate, makeFWDStatus, getPatentOwners, mapPatentClaim, importPTAB } = require('./loadMongo');
const { connect } = require('../connect/mongoConnect');
const trialList = require ('../../config/byCase.json');
const ptabList = require('../../config/trials.json');

let db, collection;

connect()
  .then(dbObject => {
    db = dbObject;
    collection = dbObject.collection('byTrial');
    return;
  })
  .then(() => {
    // then main function goes here
    return importPTAB(db, 'ptabRaw', ptabList);
    
    // return setStatus(collection);
    // return makeFWDStatus(collection, db.collection('FWDStatusTypes'));
    // return getPatentOwners(collection, db.collection('Petitioners'), 'Petitioner');
    // return getPatentOwners(collection, db.collection('PatentOwners'));
    // return mapPatentClaim(collection, db.collection('byClaims'));
  })
  .then(result => {
    console.log(result);
  })
  .then(result => {
    // checking the result
    return //collection.find().toArray()
    /*     let unique = new Set(result.map(item => `${item.Patent}:${item.Claim}`));
        console.log(unique.size); */
  })
  .then(result => console.log(result))
  .then(() => db.close())
  .catch(err => {
    console.error(err);
    db.close();
  })

