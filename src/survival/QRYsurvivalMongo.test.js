const {connect} = require('../connect/mongoConnect');


let db, collection;

connect()
.then(database => {
    db = database,
    collection = db.collections('ptab')
    return;
})
