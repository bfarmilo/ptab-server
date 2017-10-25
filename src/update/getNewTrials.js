//const fse = require('fse');
const fetch = require('node-fetch');


const ptabUrl = 'https://ptabdata.uspto.gov/ptab-api';
const header = {credentials: 'include'};

const getItems = (offset) => {
  return fetch(`${ptabUrl}/trials?limit=100&sort=lastModifiedDatetime&lastModifiedDatetimeFrom=2017-07-01&offset=${offset}`, header)
    .then(response => response.json())
    .then(result => {
      offset = (result.metadata.count <= offset + 100) ? offset + 100 : result.metadata.count;
      return Promise.resolve({ offset, max: result.metadata.count, data: result.results });
    })
    .catch(err => Promise.reject(err));
}

const getBoardDocuments = (offset) => {
  return fetch(`${ptabUrl}/documents?filingDatetimeFrom=2017-07-01&filingParty=board&offset=${offset}
`, header)
    .then(res => res.json())
    .then(result => Promise.resolve(result))
    .catch(err => Promise.reject(err));
}

module.exports = {
  getItems,
  getBoardDocuments
}