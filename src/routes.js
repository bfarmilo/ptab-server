const express = require('express');
const router = express.Router();
const redis = require('promise-redis')();

const find = require('./scan/lookupRecords.js');
const { getDetailTable } = require('./survivaldetail/getDetailTable.js');
const { survivalAnalysis } = require('./survival/QRYsurvival.js');
const { initDB } = require('./initialize/LoadDB.js');
const { getEntityData } = require('./entities/QRYtypes.js');
const config = require('../config/config.json');

let client; // need this global for the other functions to re-use
let clientActive = false;
let localMode = true;

// these are namespaces that you can use to select a graph to view
const searchableSet = [
  'class',
  'FWDStatus',
  'status',
  'patentownertype',
  'petitionertype'
];

const startClient = () => {
  let client;
  if (localMode) {
    client = redis.createClient();
  } else {
    client = redis.createClient(
      6380,
      config.database.server,
      {
        password: config.database.keyPrime,
        tls: {
          servername: config.database.server
        }
      }
    )
  }
  setListener(client);
  return client;
};

const setListener = (connection) => {
  connection.on('end', () => {
    console.log('connection closed');
    clientActive = false;
  });
  connection.on('connect', () => {
    console.log('connection opened');
    clientActive = true;
  });
  connection.on('error', (err) => {
    console.error('connection error !', err)
  });
}

router.get('/connect', (req, res) => {
  try {
    if (req.query.db === 'azure') {
      localMode = false;
      if (clientActive) client.quit();
      client = startClient();
      res.send('connecting to azure redis instance');
    } else {
      localMode = true;
      if (clientActive) client.quit();
      client = startClient();
      res.send('connecting to local redis instance');
    }
  } catch (err) { res.send(err) }
})

// check redis DB, initialize if req'd
router.get('/reset', (req, res, next) => {
  if (!clientActive) client = startClient();
  client.flushdb()
    .then(() => initDB(client))
    .then(() => getEntityData(client))
    .then(ok => {
      return client.quit()
      console.log(ok)
    })
    .catch(err => console.error(err));
})


/* GET list of records by query */
router.get('/run', function (req, res, next) {
  if (!clientActive) client = startClient();
  find.setClient(client);
  console.log(req.query);
  find.lookUp(req.query.field, req.query.value, req.query.cursor, decodeURIComponent(req.query.table))
    .then(result => {
      console.log('%d results returned', result.count)
      res.json(result);
    })
    .then(() => client.quit())
    .catch(err => console.error(err));
});

// gets a list of fields for querying
router.get('/fields', function (req, res, next) {
  if (!clientActive) client = startClient();
  client.smembers('fieldList')
    .then((result) => {
      res.json(result)
    })
    .catch(err => console.error(err));
});

// gets a list of tables for querying
router.get('/tables', function (req, res, next) {
  if (!clientActive) client = startClient();
  client.multi(searchableSet.map(item => ['keys', `${item}:*`])).exec()
    .then(result => {
      res.json(['all'].concat(...result))
    })
    .catch(err => console.error(err));
});

// survival data
router.get('/survival', function (req, res, next) {
  if (!clientActive) client = startClient();
  // pulls the count of claim survival statistics
  console.log('received request to update chart %d - %s', req.query.chart, req.query.table);
  survivalAnalysis(client, decodeURIComponent(req.query.table), req.query.chart)
    .then(result => {
      res.json(result)
    })
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
  if (!clientActive) client = startClient();
  getDetailTable(client, decodeURIComponent(req.query.table), req.query.cursor)
    .then(patentList => {
      return res.json(patentList);
    })
    .catch(err => console.error(err))
});

module.exports = router;

// helper functions needed:
// 1: sort by (?sortBy=)
// 2: 