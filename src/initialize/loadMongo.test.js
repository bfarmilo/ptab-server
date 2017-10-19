const { setStatus, fixDate, makeFWDStatus, getPatentOwners, mapPatentClaim } = require('./loadMongo');
const { connect } = require('../connect/mongoConnect');


let db, collection;

connect()
  .then(dbObject => {
    db = dbObject;
    collection = dbObject.collection('ptab');
    return;
  })
  .then(() => {
    // then main function goes here

    //return setStatus(collection);

    // return makeFWDStatus(collection, db.collection('FWDStatusTypes'));
    // return getPetitioners(collection, db.collection('Petitioners'));
    // return getPatentOwners(collection, db.collection('PatentOwners'));
    return mapPatentClaim(collection, db.collection('byClaims'));
  })
  .then(result => {
    console.log(result);
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

