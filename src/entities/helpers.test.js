const { extractMultiples, extractTypes, getDistinct } = require('./helpers');
const { connect } = require('../connect/mongoConnect');


// Test getting entity data and splitting out npe etc.

console.log(
  extractMultiples('D & D Group Pty (company); A PTY (npe)')
  .map(item => extractTypes(item))
);


// Test the 'get distinct' helper function

let db;

connect()
  .then(database => {
    db = database;
    return getDistinct(db.collection('ptab'), 'PatentOwner.name');
  })
  .then(result => {
    console.log(result);
  })
  .then(() => db.close())
  .catch(err => {
    console.error(err);
    db.close();
  })