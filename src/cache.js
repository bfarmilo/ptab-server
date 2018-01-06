const redis = require('promise-redis')();
const config = require('../config/config.json');

let client; // the redis client, need this global for the other functions to re-use
let clientActive = false;
let localMode = false;

/** Redis Cache
 * 
 */
const startClient = (userID) => {
    let startclient;
    if (localMode) {
      startclient = redis.createClient();
    } else {
      startclient = redis.createClient(
        config.database.redis.port
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
  
        if (data !== null) {
          res.json(JSON.parse(data));
        } else {
          next();
        }
      });
    } else if (req.method === 'POST') {
      const request = JSON.parse(req.body);
      if (!clientActive) client = startClient(request.user);
      const title = `${request.query.value[0] === '' ? `${req.path}:${request.query.field}` : `${req.path}:${request.query.field}:${request.query.value}`}`;
      console.info('looking for cache entry for %s', title);
      client.get(title, function (err, data) {
        if (err) throw err;
        if (data !== null) {
          console.info('cache entry found');
          res.json(JSON.parse(data));
        } else {
          console.info('cache miss, data returned', data);
          next();
        }
      })
    }
  }
  
  const setCache = (user, table, value) => {
    if (!clientActive) client = startClient(user);
    return client.set(decodeURIComponent(table), JSON.stringify(value), 'EX', config.database.redis.expiry);
  }
  
  /** end REDIS cache */

  module.exports = {
      cache,
      setCache
  }