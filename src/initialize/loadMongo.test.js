const {
  mergeNewRecords,
  loadNewCollection,
  setStatus,
  fixDate,
  makeFWDStatus,
  getPatentOwners,
  mapPatentClaim,
  getEntities
  } = require('./loadMongo');
const { connect } = require('../connect/mongoConnect');
const trialList = require('../../config/byCase.json');


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

const testLoad = async (collectionName, query) => {
  try {
    db = await connect();
    console.log('querying');
    console.log(await db.collections(collectionName).findOne);
    console.log(`query to ${collectionName} has ${await db.collection(collectionName).find(query).count()} records`);
    // console.log(JSON.stringify(await db.collection(collectionName).find(query, { limit: 2 }).toArray(), null, 2));
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
    collection = db.collection('byTrial');
    // then main function goes here
    for (let i = 0; i < 10; i++) {
      console.log(await setStatus(collection, 'byTrial', i));
    };
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

const extractEntities = async (entity) => {
  db = await connect();
  try {
    console.log(await getEntities(db, 'PatentOwner'));
  } catch (err) { console.error(err) }
  await db.close()
}

const listCollections = async () => {
  db = await connect();
  try {
    console.log(await db.listCollections().toArray());
    await db.close();
  } catch (err) {
    console.error(err);
    await db.close();
  }
}


//loadFirst('byTrial', trialList);
//loadFirst('ptabRaw', ptabList);
//testLoad('byTrial', {});
//processData();
//extractEntities();
//testLoad('Petitioners', {});
//listCollections();
//testLoad('Petitioners', {});

