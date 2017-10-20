const express = require('express');
const router = express.Router();
const redis = require('promise-redis')();

const find = require('./scan/lookupRecords.js');
const { getDetailTable } = require('./survivaldetail/getDetailTable');
const { survivalAnalysis } = require('./survival/QRYsurvivalMongo');
const { initDB } = require('./initialize/LoadDB.js');
const { getEntityData } = require('./entities/QRYtypes.js');
const config = require('../config/config.json');

let client; // need this global for the other functions to re-use
let clientActive = false;
let localMode = false;

const { connect } = require('./connect/mongoConnect');

let db, collection;

// these are namespaces that you can use to select a graph to view
const searchableSet = [
  'class',
  'FWDStatus',
  'status',
  'patentownertype',
  'petitionertype'
];

const startClient = (userID) => {
  let startclient;
  if (localMode) {
    startclient = redis.createClient();
  } else {
    startclient = redis.createClient(
      config.database.redis.port,
      config.database.redis.server /*,
      {
        password: config.database.keyPrime,
        tls: {
          servername: config.database.server
        }
      } */
    )
  }
  setListener(startclient, userID);
  return startclient;
};

const setListener = (connection, userID) => {
  connection.on('end', () => {
    console.log('connection closed');
    clientActive = false;
  });
  connection.on('connect', () => {
    console.log('connection opened');
    clientActive = true;
    client.multi([['client', 'setname', `user${userID}`], ['client', 'list']]).exec()
      .then(result => console.log('new user added:%s\nconnected users:\n %s', userID, result[1].match(/name=\w+/g).join('\n')))
      .catch(err => console.error(err));
  });
  connection.on('error', (err) => {
    console.error('connection error !', err)
  });
}

const cache = (req, res, next) => {
  if (!clientActive) client = startClient(req.query.user);
    const table = decodeURIComponent(req.query.table);
    client.get(table, function (err, data) {
        if (err) throw err;

        if (data != null) {
            res.json(JSON.parse(data));
        } else {
            next();
        }
    });
}

const setCache = (user, table, value) => {
if (!clientActive) client = startClient(user);
return client.set(decodeURIComponent(table), JSON.stringify(value), 'EX', config.redis.expiry);
}

router.use((req, res, next) => {
  // enable CORS from the app location. Configure in config.json
  res.setHeader('Access-Control-Allow-Origin', config.app_url);
  next();
})

router.get('/connect', (req, res) => {
  try {
    if (req.query.db === 'azure') {
      localMode = false;
      client = startClient(req.query.user);
      client.info()
        .then(result => res.send(result))
    } else {
      localMode = true;
      client = startClient(req.query.user);
      res.send('connecting to local redis instance');
    }
  } catch (err) { res.send(err) }
})

// check redis DB, initialize if req'd
router.get('/reset', (req, res, next) => {
  if (!clientActive) client = startClient(req.query.user);
  client.flushdb()
    .then(() => initDB(client))
    .then(() => getEntityData(client))
    .then(ok => {
      console.log(ok)
    })
    .catch(err => console.error(err));
})


/* GET list of records by query */
router.get('/run', function (req, res, next) {
  if (!clientActive) client = startClient(req.query.user);
  find.setClient(client);
  find.lookUp(req.query.field, req.query.value, req.query.cursor, decodeURIComponent(req.query.table))
    .then(result => {
      console.log('%d results returned', result.count)
      res.json(result);
    })
    .catch(err => console.error(err));
});

// gets a list of fields for querying
router.get('/fields', cache, function (req, res, next) {
  return connect()
  .then(database => {
    db = database;
    collection = db.collection('ptab');
    return collection.findOne();
  })
  .then(sample => Object.keys(sample).map(item => Array.isArray(sample[item]) 
  ? Object.keys(sample[item][0]).map(subitem => `${item}.${subitem}`) 
  : item)
  .reduce((a, b) => a.concat(b), []))
    .then(result => {
      res.json(result);
      return setCache(req.query.user, req.query.table, result);
    })
    .then(status => console.info(status))
    .catch(err => console.error(err));
});

// gets a list of tables for querying
router.get('/tables', function (req, res, next) {
  if (!clientActive) client = startClient(req.query.user);
  // TODO: update this to handle general queries (field == value)
  // TODO: So given a field, return the list of allowable values for graphing
  // TODO: ie, FWDStatus: 
  // TODO: Call getEntityData to get a list of entity types (npe, etc)
  client.multi(searchableSet.map(item => ['keys', `${item}:*`])).exec()
    .then(result => {
      res.json(['all'].concat(...result))
    })
    .catch(err => console.error(err));
});

// survival data
router.get('/survival', cache, function (req, res, next) {
  connect()
    .then(database => {
        db = database;
        collection = db.collection('ptab')
        return;
    })
    .then(() => {
  // pulls the count of claim survival statistics
  console.log('received request to update chart %d - %s', req.query.chart, req.query.table);
  return survivalAnalysis(db, decodeURIComponent(req.query.table), req.query.chart, req.query.user);
    })
    .then(result => {
      res.json(result);
      return setCache(req.query.user, req.query.table, result);
    })
    .then(status => console.info(status))
    .catch(err => console.error(err))
});

router.post('/multiedit', function (req, res, next) {
  // applies a change to the existing recordset
  // request should contain a list of ID's
  // field to change
  // new value
  console.log(req.body);
  // pass the json request body as the first argument,
  // the field as second argument
  // the newValue as third argument
});

router.get('/survivaldetail', (req, res, next) => {
  if (!clientActive) client = startClient(req.query.user);
  getDetailTable(client, decodeURIComponent(req.query.table), req.query.cursor, req.query.user)
    .then(patentList => {
      return res.json(patentList);
    })
    .catch(err => console.error(err))
});

module.exports = router;

// helper functions needed:
// 1: sort by (?sortBy=)
// 2: 