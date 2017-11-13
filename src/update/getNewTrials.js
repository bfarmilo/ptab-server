const fetch = require('node-fetch');
const { flatten } = require('../entities/helpers');

const ptabUrl = 'https://ptabdata.uspto.gov/ptab-api';
const header = {credentials: 'include'};
const MAX_RETURN = 100;
const START_DATE = '2012-01-01';

/**
 * checkOffset returns the next offset, or maxCount if at the end of the collection
 * 
 * @param {Number} currentOffset the offset used for the last call
 * @param {Number} maxCount the maximum number of records
 * @returns {Number} the next offset 
 * @private
 */
const checkOffset = (currentOffset, maxCount) => {
   return (maxCount <= currentOffset + MAX_RETURN) ? maxCount : currentOffset + MAX_RETURN;
}

/** getAllData takes a query (url to PTAB collection) and a header and returns results until the cursor is exhausted
 * @param {string} query -> url to the PTAB collection to query
 * @param {string} header -> header for the fetch request, needed to connect properly
 * @returns {{max:number, data:Array{PTAB results}}}
**/

const getAllData = (query, header) => {
  return new Promise((resolve, reject) => {
    let returnArray = [];
    let offset = 0;
    const recurse = () => {
      return fetch(`${query}&offset=${offset}`, header)
      .then(response => response.json())
      .then(jsonResult => {
        returnArray.push(jsonResult.results);
        offset += MAX_RETURN;
        if (checkOffset(jsonResult.metadata.offset, jsonResult.metadata.count) !== jsonResult.metadata.count) {
          recurse();
        } else {
          resolve({ 
            max: jsonResult.metadata.count,
            data: flatten(returnArray) 
          })
        }
      })
      .catch(err => reject(err));
    }
    recurse();
  })
}

/**
 * getItems hits the PTAB 'trials' collection
 * 
 * @returns {Promise} a promise that resolves to {max:number, data:Array[string]}
 */
const getTrials = () => {
  return getAllData(`${ptabUrl}/trials?limit=100&sort=trialNumber&lastModifiedDatetimeFrom=${START_DATE}`, header)
  .then(result => Promise.resolve(result))
  .catch(err => Promise.reject(err))
}

/**
 * getBoardDocuments checks the PTAB 'documents' collection where the filingParty=board
 * 
 * @returns {Promise} a promise that resolves to {offset:number, max:number, data:Array[string]}
 * where the returned offset is the next offset to use, or max if there are no more records
 */
const getBoardDocuments = () => {
  console.info('Retrieving PTAB documents...');
  return getAllData(`${ptabUrl}/documents?filingDatetimeFrom=${START_DATE}&filingParty=board`, header)
    .then(result => Promise.resolve(result))
    .catch(err => Promise.reject(err));
}

/** module exports
 * @public
 */
module.exports = {
  getTrials,
  getBoardDocuments
}