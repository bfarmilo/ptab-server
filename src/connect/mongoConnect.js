const MongoClient = require('mongodb').MongoClient

// connection string syntax is mongodb://username:password@host:port/[database]?ssl=true
// note MONGOIP comes with single quotes around the IP address so we need to strip those off

let url = process.env.MONGOIP
  ? `mongodb://localhost:C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw==@${process.env.MONGOIP.replace(/'/g, '')}:10255/admin?ssl=true`
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

