const MongoClient = require('mongodb').MongoClient
const spawn = require('child_process').spawn;

// start powershell and event listeners
let url = 'false';

if (process.env.MODE === 'docker') {
  // initialize container connection parameters
  let container = 'cosmosdb';
  const child = spawn("powershell.exe", [`docker inspect --format '{{.NetworkSettings.Networks.nat.IPAddress}}' ${container}`]);
  child.stdout.on("data", data => {
    const containerIP = data.toString().split(/\n/g)[0];
    url = `mongodb://localhost:C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw==@${containerIP}:10255/admin?ssl=true`;
  });
  child.stderr.on("data", error => { throw (error) });
  child.stdin.end(); //end input
} else {
  url = require('../../config/config.json').database.mongoUrl;
}

const connect = async () => {

  const mongoConnect = () => {
    console.info('connecting to mongo instance at %s', url);
    return MongoClient.connect(url);
  }

  const delay = new Promise(resolve => setTimeout(resolve, 1000));

  try {
    // connection string syntax is mongodb://username:password@host:port/[database]?ssl=true
    // hack here to let powershell get the IP address before making the connection
    // console.log(url);
    if (url) {
      await delay;
      return mongoConnect();
    } else {
      return mongoConnect();
    }
  } catch (err) {
    return Promise.reject(err);
  }
}


module.exports = {
  connect
}

