const { connect, setStatus, fixDate, makeFWDStatus } = require('./connectMongo');

let db, collection;

connect()
  .then(dbObject => {
    db = dbObject;
    collection = dbObject.collection('ptab');
    return;
  })
  .then(() => {
    // then main function goes here
    return makeFWDStatus(collection);
    // return setStatus(collection);
  })
  .then(result => {
    console.log(result);
    return // db.collection('FWDStatusTypes').insertMany(result);
  })
  .then(result => {
    // checking the result
    return //collection.find().toArray()
/*     let unique = new Set(result.map(item => `${item.Patent}:${item.Claim}`));
    console.log(unique.size); */
  })
  .then(result => console.log(result))
  .then(() => db.close())
  .catch(err => {
    console.error(err);
    db.close();
  })

