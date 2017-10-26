const {connect} = require('../connect/mongoConnect');
const {updateStatus} = require('./updateNew');


let db;

const testQuery = [
  {IPR: 'IPR2016-00045',
    Status: 'FWD Entered'
  },
  {IPR: 'IPR2017-00477',
    Status: 'instituted'
  },
  {IPR: 'CBM2016-00032',
    Status: 'FWD Entered'
  },
  {IPR: 'IPR2017-02102',
    Status: 'Notice OF Filing Date Accorded'
  }]

connect()
  .then(database => {
    db = database;
    return updateStatus(db, testQuery);
    })
  .then(result => {
    console.log(result);
  })
  .then(() => db.close())
  .catch(err => {
    console.error(err);
    db.close();
  })