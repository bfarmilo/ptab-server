const { levelBins } = require('../../config/config.json');

// need a version of this where 'instituted' and 'invalid' are an array of numbers
// and returns an object { level, result, Array[claimnumbers]}

// for killed -- looks like you can just count 'Unpatentable'
// except Waiver Filed need to move all calims to 'Unpatentable'
// for impaired -- just count 'ClaimsInstituted' where Terminated-Settled
// for weakened -- also ClaimsInstituted
// make a list of 'Survived'

const survivalStatus = (status, fwdStatus, instituted, invalid) => {
  if (status === 'Terminated-Adverse Judgment'
    || (status === 'FWD Entered' && invalid)
    || status === 'Waiver Filed'
    || fwdStatus === 'unpatentable') {
    // *killed*
    // Terminated with Adverse Judgment (patent owner gives up, doesn't respond)
    // Decided and deemed invalid
    // PO Waives the claims
    // Patexia deems invalid
    return { level: 5, result: levelBins[5] };
  }
  if (status === 'Terminated-Settled' && instituted) {
    // *impaired*
    // Settled after Institution
    // Instituted
    return { level: 4, result: levelBins[4] };
  }
  if (status === 'Instituted') {
    // *weakened*
    // Instituted - no decision yet
    return { level: 3, result: levelBins[3] };
  }
  if ((status === 'FWD Entered' && !invalid)
    || status === 'Terminated-Denied') {
    // *unaffected*
    // Decision - not invalid
    // Settled but not Instituted
    // IPR Denied
    return { level: 2, result: levelBins[2] };
  }
  // *unbinned*
  // status === Notice OF Filing Date Accorded
  // status === Filing Date Accorded
  // status === Terminated-Other && fwdStatus !== unpatentable
  // status === Terminated-Dismissed && fwdStatus !== unpatentable 
  return { level: 1, result: levelBins[1] };
}

const getBin = level => ({level, result:levelBins[level]})

module.exports = { survivalStatus, getBin };