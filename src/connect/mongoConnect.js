const MongoClient = require('mongodb').MongoClient;
const url = require('../../config/config.json').database.mongoUrl;

const connect = () => MongoClient.connect(url)
  .then(database => {
    console.info("connected to server");
    return Promise.resolve(database);
  })
  .catch(err => {
    return Promise.reject(err);
  })


module.exports = {
    connect
}

