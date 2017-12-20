const MongoClient = require('mongodb').MongoClient;

let url = process.env.MONGOIP
  ? `mongodb://${process.env.MONGOIP.replace(/'/g, '')}:27017/local`
  : require('../../config/config.json').database.mongoUrl;

console.info('connecting to mongo instance at %s', url);

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

