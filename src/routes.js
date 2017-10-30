const express = require('express');
const router = express.Router();
const redis = require('promise-redis')();
const bodyParser = require('body-parser');

const { lookUp } = require('./scan/lookupRecordsMongo');
const { getDetailTable } = require('./survivaldetail/getDetailTable');
const { survivalAnalysis } = require('./survival/QRYsurvivalMongo');
const { initDB } = require('./initialize/LoadDB');
const { getEntityData } = require('./entities/QRYtypes');
const { getDistinct } = require('./entities/helpers');
const config = require('../config/config.json');

let client; // the redis client, need this global for the other functions to re-use
let clientActive = false;
let localMode = false;

const { connect } = require('./connect/mongoConnect');

let db, collection;

// these are namespaces that you can use to select a graph to view
const searchableSet = [
  'all',
  'MainUSPC',
  'PatentOwner.name',
  'PatentOwner.type',
  'Petitioner.name',
  'Petitioner.type',
  'AuthorJudge',
  'AllJudges',
  'Instituted',
  'DateFiled'
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
    if (req.method === 'GET') {
      if (!clientActive) client = startClient(req.query.user);
    const table = decodeURIComponent(req.query.table);
    if (table === undefined) next();
    client.get(table, function (err, data) {
        if (err) throw err;

        if (data != null) {
            res.json(JSON.parse(data));
        } else {
            next();
        }
    });
    } else if (req.method === 'POST') {
      const request = JSON.parse(req.body);
      if (!clientActive) client = startClient(request.user);
      const title = `${request.query.field === 'all' ? `${req.path}:all` : `${req.path}:${request.query.field}:${request.query.value}`}`;
      console.info('looking for cache entry for %s', title);
      client.get(title, function (err, data) {
        if (err) throw err;
        if (data != null) {
          console.info('cache entry found');
          res.json(JSON.parse(data));
        } else {
          console.info('cache miss');
          next();
        }
      })
    }
}

const setCache = (user, table, value) => {
if (!clientActive) client = startClient(user);
return client.set(decodeURIComponent(table), JSON.stringify(value), 'EX', config.database.redis.expiry);
}


router.use(bodyParser.text());


/* /Reset route currently only used for redis-only db, deprecated

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
*/

/* GET list of records by query */
router.post('/run', function (req, res, next) {
  console.info('post detected with values %j', JSON.parse(req.body));
  const request = JSON.parse(req.body);
  return connect()
  .then(database => {
    db = database;
    return lookUp(db, request.query, request.cursor)
    })
    .then(result => {
      console.log('%d results returned', result.count)
      res.json(result);
    })
    .catch(err => console.error(err));
});

// gets a list of fields for querying, cached
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
      return setCache(req.query.user, 'fields', result);
    })
    .then(status => console.info(status))
    .catch(err => console.error(err));
});

// gets a list of tables for querying
router.get('/tables', function (req, res, next) {
  // TODO: update this to handle general queries (field == value)
  // TODO: So given a field, return the list of allowable values for graphing
  // TODO: ie, FWDStatus: 
  // TODO: Call getEntityData to get a list of entity types (npe, etc)
    res.json(searchableSet)
    // .catch(err => console.error(err));
});

// get a list of unique items for the selected table
router.post('/chartvalues', cache, (req, res, next) => {
  const request = JSON.parse(req.body);
  console.log('received request for values in %j', request.query);
    connect()
    .then(database => {
        db = database;
        collection = db.collection('ptab')
        return;
    })
    .then(() => getDistinct(collection, request.query.field))
    .then(result => {
      res.json(result);
      setCache(request.user, `${req.path}:${request.query.field}`, result[request.query.field]);
    })
    .catch(err => console.error(err))
})

// survival data used in graphs - cached
router.post('/survival', cache, function (req, res, next) {
  const request=JSON.parse(req.body);
  connect()
    .then(database => {
        db = database;
        return;
    })
    .then(() => {
  // pulls the count of claim survival statistics
  console.log('received request to update chart %d', request.chart );
  return survivalAnalysis(db, request.query);
    })
    .then(result => {
      res.json(result);
      console.log(result.title);
      return setCache(request.user, `${req.path}:${result.title}`, result);
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