const { connect } = require('../connect/mongoConnect');
const { updateStatus, lookupEntity, importPTAB } = require('./updateNew');
const ptabList = require('../../config/trials.json');

let db;

const testQuery = [
  {
    IPR: 'IPR2016-00045',
    Status: 'FWD Entered',
    SomeData: 'added'
  },
  {
    IPR: 'IPR2017-00477',
    Status: 'instituted',
    SomeData: 'added'
  },
  {
    IPR: 'CBM2016-00032',
    Status: 'FWD Entered',
    SomeData: 'added'
  },
  {
    IPR: 'IPR2017-02102',
    Status: 'Notice OF Filing Date Accorded',
    SomeData: 'added'
  }]

const testUpdate = async (query) => {
  try {
    db = await connect();
    console.log(await updateStatus(db, query));
    console.log(await db.close());
  }
  catch (err) {
    console.error(err)
  }
}

const testLookup = async (collection, match) => {
  try {
  db = await connect();
    console.log(await Promise.all(match.map(async item => await lookupEntity(db, collection, item))));
  } catch (err) {
    console.error(err)
  }
  await db.close();
}

const testImport = async (data) => {
  db = await connect();
  try {
    console.log(await Promise.all(data.map(async item => await importPTAB(db, 'newTrials', item))));
  } catch (err) {
    console.error(err);
  }
  await db.close();
}
//testUpdate (testQuery);
//testImport(ptabList.slice(0,5));
testLookup('PatentOwner', ['HARVEY ', 'New York']);