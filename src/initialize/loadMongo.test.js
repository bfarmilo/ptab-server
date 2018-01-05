const {
  mergeNewRecords,
  loadNewCollection,
  setStatus,
  fixDate,
  makeFWDStatus,
  getPatentOwners,
  mapPatentClaim,
  importPTAB
  } = require('./loadMongo');
const { connect } = require('../connect/mongoConnect');
const trialList = require('../../config/byCase.json');
const ptabList = require('../../config/trials.json');

let db, collection;

const loadFirst = async (collectionName, data) => {
  try {
    db = await connect();
    console.log(await loadNewCollection(db, collectionName, data))
    db.close();
  } catch (err) {
    console.error(err)
    db.close();
  }
}

const testLoad = async (collectionName) => {
  try {
    db = await connect();
    console.log(`${collectionName} has ${await db.collection(collectionName).count()} records`);
    console.log(await db.collection(collectionName).find({}, {limit:1}).toArray());
    db.close();
  } catch (err) {
    console.error(err);
    db.close();
  }
}

const purge = async (collectionName) => {
  try {
    db = await connect();
    console.log(await db.collection(collectionName).drop());
    db.close();
  } catch (err) {
    console.error(err);
    db.close();
  }
}

const processData = async () => {
  try {
    db = await connect();
    collection = dbObject.collection('byTrial');
    // then main function goes here
    console.log(await setStatus(collection))
    db.close();

    // mergeNewRecords(db, 'byTrial', 'ptabRaw')
    // setStatus(collection);
    // makeFWDStatus(collection, db.collection('FWDStatusTypes'));
    // getPatentOwners(collection, db.collection('Petitioners'), 'Petitioner');
    // getPatentOwners(collection, db.collection('PatentOwners'));
    // mapPatentClaim(collection, db.collection('byClaims'));

  } catch (err) {
    console.error(err);
    db.close();
  }
}

//loadFirst('byTrial', trialList);
//loadFirst('ptabRaw', ptabList);
return Promise.all(['byTrial', 'ptabRaw'].map(testLoad));


