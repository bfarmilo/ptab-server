const zrangeScan = require('./zrangeScan.js');
const redis = require('promise-redis')();
const client = redis.createClient();

// query with a client, patent:claim type table, and a cursor value

// patent:claim tables include 
/* 
chartX:{survivalStatus} 
chartX:{survivalStatus}_{lowersurvivalStatus}
uniqueClaims
unpatentable
all:survival:{survivalStatus}
*/
zrangeScan(client, '', 0)