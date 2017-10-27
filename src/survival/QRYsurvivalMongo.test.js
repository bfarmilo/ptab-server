const { connect } = require('../connect/mongoConnect');
const { survivalAnalysis } = require('./QRYsurvivalMongo');


let db, collection;

connect()
    .then(database => {
        db = database;
        collection = db.collection('ptab')
        return;
    })
    .then(() => survivalAnalysis(db, {field:'all', value:''}, 100))
    .then(result => console.log(result))
    .then(() => survivalAnalysis(db, {field:'PatentOwner.type', value:'npe'}, 100))
    .then(result => console.log(result))
  .then(() => db.close())
  .catch(err => {
    console.error(err);
    db.close();
  })