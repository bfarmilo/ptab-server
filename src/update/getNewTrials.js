//const fse = require('fse');
const fetch = require('node-fetch');

const ptabUrl = 'https://ptabdata.uspto.gov/ptab-api/trials';

const getItems = (offset) => {
  return fetch(`${ptabUrl}?limit=100&sort=lastModifiedDatetime&lastModifiedDatetimeFrom=2017-07-01&offset=${offset}`, {
    credentials: 'include'
  })
    .then(response => response.json())
    .then(result => {
      offset = (result.metadata.count <= offset + 100) ? offset + 100 : result.metadata.count;
      return Promise.resolve({ offset, max: result.metadata.count, data: result.results });
    })
    .catch(err => Promise.reject(err));
}
module.exports = {
  getItems
}