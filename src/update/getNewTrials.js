//const fse = require('fse');
const fetch = require('node-fetch');
const { flatten } = require('../entities/helpers');

const ptabUrl = 'https://ptabdata.uspto.gov/ptab-api';
const header = {credentials: 'include'};
const MAX_RETURN = 100;

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
const getItems = () => {
  return getAllData(`${ptabUrl}/trials?limit=100&sort=lastModifiedDatetime&lastModifiedDatetimeFrom=2017-07-01`, header)
  .then(result => Promise.resolve(result))
  .catch(err => Promise.reject(err))
}

/**
 * getBoardDocuments checks the PTAB 'documents' collection where the filingParty=board
 * 
 * @returns {Promise} a promise that resolves to {offset:number, max:number, data:Array[string]}
 * where the returned offset is the next offset to use, or max if there are no more records
 */
const getBoardDocuments = (offset) => {
  return getAllData(`${ptabUrl}/documents?filingDatetimeFrom=2017-07-01&filingParty=board`, header)
    .then(result => Promise.resolve(result))
    .catch(err => Promise.reject(err));
}

/** module exports
 * @public
 */
module.exports = {
  getItems,
  getBoardDocuments
}