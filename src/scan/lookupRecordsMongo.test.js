const {connect} = require('../connect/mongoConnect');
const {lookUp} = require('./lookupRecordsMongo');


let db;

const testQuery = [
  {field: 'Petitioner.name',
    value: 'Apple'
  },
  {field: 'FWDStatus',
    value: 'unpatentable'
  }]

connect()
  .then(database => {
    db = database;
    return lookUp(db, testQuery, 0, 'all');
  })
  .then(result => lookUp(db, testQuery, result.cursor, 'all'))
  .then(result => {
    console.log(result.cursor, result.count, result.totalCount, result.data[result.count-1]);
  })
  .then(() => db.close())
  .catch(err => {
    console.error(err);
    db.close();
  })