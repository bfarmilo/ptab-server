const { connect } = require('./connectMongo');

let db, collection;

connect()
  .then(dbObject => {
    db = dbObject.db;
    collection = dbObject.collection;
    return;
  })
  .then(() => {
    return collection.find({}).toArray();
  })
  .then(result => {
    let unique = new Set(result.map(item => `${item.Patent}:${item.Claim}`));
    console.log(unique.size);
    return;
  })
  .then(() => db.close())
  .catch(err => {
    console.error(err);
    db.close();
  })

