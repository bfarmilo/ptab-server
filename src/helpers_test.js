const { extractMultiples, extractTypes, zrangeScan } = require('./helpers.js');



// Test getting entity data and splitting out npe etc.

console.log(
  extractMultiples('D & D Group Pty (company); A PTY (npe)')
  .map(item => extractTypes(item))
);
