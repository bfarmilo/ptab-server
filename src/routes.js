const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');

const { lookUp } = require('./scan/lookupRecordsMongo');
const { survivalAnalysis, survivalArea } = require('./survival/QRYsurvivalMongo');
const { getEntityData } = require('./entities/QRYtypes');
const { getDistinct } = require('./entities/helpers');
const config = require('../config/config.json');

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




router.use(bodyParser.text());

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

// gets a list of fields for querying, ** cache disabled **
router.get('/fields', async (req, res, next) => {
  try {
    db = await connect();
    collection = db.collection('byTrial');
    const sample = await collection.findOne();
    console.log(sample);
    res.json(Object.keys(sample).map(item => (item.includes('Petitioner') || item.includes('PatentOwner'))
      ? Object.keys(sample[item][0]).map(subitem => `${item}.${subitem}`)
      : item)
      .reduce((a, b) => a.concat(b), []));
    //setCache(req.query.user, 'fields', result);
    console.info('OK');
  } catch (err) {
    console.error(err)
  }
});

// gets a list of tables for querying
router.get('/tables', async (req, res, next) => {
  // TODO: update this to handle general queries (field == value)
  // TODO: So given a field, return the list of allowable values for graphing
  // TODO: ie, FWDStatus: 
  // TODO: Call getEntityData to get a list of entity types (npe, etc)
  await res.json(searchableSet);
  // .catch(err => console.error(err));
});

// get a list of unique items for the selected table ** cache disabled
router.post('/chartvalues', (req, res, next) => {
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
      // setCache(request.user, `${req.path}:${request.query.field}`, result);
    })
    .catch(err => console.error(err))
})

// survival data used in graphs - ** cache disabled
router.post('/survival', function (req, res, next) {
  const request = JSON.parse(req.body);
  connect()
    .then(database => {
      db = database;
      return;
    })
    .then(() => {
      // pulls the count of claim survival statistics
      console.log('received request to update chart %d', request.chart);
      return survivalAnalysis(db, request.query);
    })
    .then(result => {
      res.json(result);
      console.log(result.title);
      return 'OK'; //setCache(request.user, `${req.path}:${result.title}`, result);
    })
    .then(status => console.info(status))
    .catch(err => console.error(err))
});

// survival data used in stacked area graphs - ** cache disabled
router.post('/survivalarea', function (req, res, next) {
  const request = JSON.parse(req.body);
  connect()
    .then(database => {
      db = database;
      return;
    })
    .then(() => {
      // pulls the count of claim survival statistics
      console.log('received request to update chart %d', request.chart);
      return survivalArea(db, request.query, request.chartType);
    })
    .then(result => {
      res.json(result);
      console.log(result.title);
      return 'OK'; //setCache(request.user, `${req.path}:${result.title}`, result);
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


module.exports = router;

// helper functions needed:
// 1: sort by (?sortBy=)
// 2: 