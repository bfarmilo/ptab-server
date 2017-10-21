const {connect} = require('../connect/mongoConnect');
const {lookUp} = require('./lookupRecordsMongo');


let db;

connect()
  .then(database => {
    db = database;
    return lookUp(db, 'Petitioner.name', 'Apple', 0, 'all');
  })
  .then(result => lookUp(db, 'Petitioner.name', 'Apple', result.cursor, 'all'))
  .then(result => {
    console.log(result.cursor, result.count, result.totalCount, result.data[result.count-1]);
  })
  .then(() => db.close())
  .catch(err => {
    console.error(err);
    db.close();
  })