const MongoClient = require('mongodb').MongoClient;
const { survivalStatus } = require('./survivalBin');
const url = require('../../config/config.json').database.mongoUrl;

const connect = () => MongoClient.connect(url)
  .then(database => {
    console.info("connected to server");
    return Promise.resolve({ db: database, collection: database.collection('ptab') });
  })
  .catch(err => {
    return Promise.reject(err);
  })

const setStatus = coll => {
  let collection = coll;
  return collection.find({}).toArray()
    .then(result => {
      return result.map(item => {
        const health = survivalStatus(item.Status, item.FWDStatus, item.Instituted, item.Invalid);
        return { updateOne: {
          filter: { _id: item._id }, 
          update: { $set: { survivalStatus: health } }, 
          upsert:true 
        } }  
      })
    })
    .then(commandList => {
      return collection.bulkWrite(commandList)
      })
    .then(check => Promise.resolve('OK'))
    .catch(err => Promise.reject(err))
}

module.exports = {
  connect,
  setStatus
}