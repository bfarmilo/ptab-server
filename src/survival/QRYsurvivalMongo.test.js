const { connect } = require('../connect/mongoConnect');
const { survivalAnalysis } = require('./QRYsurvivalMongo');


let db, collection;

connect()
    .then(database => {
        db = database;
        collection = db.collections('ptab')
        return;
    })
    .then(() => survivalAnalysis(collection, 'PatentOwner.type:npe', 1, 100))
    .then(result => console.log(result))
    .catch(err => console.error(err))