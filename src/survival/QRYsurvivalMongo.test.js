const { connect } = require('../connect/mongoConnect');
const { survivalArea, survivalAnalysis } = require('./QRYsurvivalMongo');


let db, collection;

connect()
    .then(database => {
        db = database;
        collection = db.collection('ptab')
        return;
    })
    //.then(() => survivalAnalysis(db, { field: 'all', value: '' }))
    //.then(result => console.log(result))
    .then(() => survivalAnalysis(db, { field: 'PatentOwner.type', value: 'npe' }))
    .then(result => console.log(result))
    .then(() => survivalArea(db, {field: 'all', value:'all'}))
    .then(result => console.log(JSON.stringify(result)))
    .then(() => db.close())
    .catch(err => {
        console.error(err);
        db.close();
    })
