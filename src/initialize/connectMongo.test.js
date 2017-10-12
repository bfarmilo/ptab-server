const { connect, setStatus } = require('./connectMongo');

let db, collection;

connect()
  .then(dbObject => {
    db = dbObject.db;
    collection = dbObject.collection;
    return;
  })
  .then(() => {
    return setStatus(collection);
  })
  .then(result => {
    return collection.find().toArray()
/*     let unique = new Set(result.map(item => `${item.Patent}:${item.Claim}`));
    console.log(unique.size); */
  })
  .then(result => console.log(result))
  .then(() => db.close())
  .catch(err => {
    console.error(err);
    db.close();
  })

