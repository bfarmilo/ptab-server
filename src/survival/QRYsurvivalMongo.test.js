const { connect } = require('../connect/mongoConnect');
const { survivalAnalysis } = require('./QRYsurvivalMongo');


let db, collection;

connect()
    .then(database => {
        db = database;
        collection = db.collection('ptab')
        return;
    })
    .then(() => survivalAnalysis(db, 'all', 1, 100))
    .then(result => console.log(result))
  .then(() => db.close())
  .catch(err => {
    console.error(err);
    db.close();
  })