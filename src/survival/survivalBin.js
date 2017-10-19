const { levelBins } = require('../../config/config.json');

const survivalStatus = (status, fwdStatus, instituted, invalid) => {
  if (status === 'Terminated-Adverse Judgment'
    || (status === 'FWD Entered' && invalid)
    || status === 'Waiver Filed'
    || fwdStatus === 'unpatentable') {
    // Terminated with Adverse Judgment (patent owner gives up, doesn't respond)
    // Decided and deemed invalid
    // PO Waives the claims
    // Patexia deems invalid
    return { level: 5, result: levelBins[5] };
  }
  if (status === 'Terminated-Settled' && instituted) {
    // Settled after Institution
    // Instituted
    return { level: 4, result: levelBins[4] };
  }
  if (status === 'Instituted') {
    // Instituted - no decision yet
    return { level: 3, result: levelBins[3] };
  }
  if ((status === 'FWD Entered' && !invalid)
    || status === 'Terminated-Denied') {
    // Decision - not invalid
    // Settled but not Instituted
    // IPR Denied
    return { level: 2, result: levelBins[2] };
  }
  // includes settled but not instituted
  // status === Notice OF Filing Date Accorded
  // status === Filing Date Accorded
  // status === Terminated-Other && fwdStatus !== unpatentable
  // status === Terminated-Dismissed && fwdStatus !== unpatentable 
  return { level: 1, result: levelBins[1] };
}

const getBin = level => ({level, result:levelBins[level]})

module.exports = { survivalStatus, getBin };