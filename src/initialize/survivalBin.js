const survivalStatus = (status, fwdStatus, instituted, invalid) => {
  if (status === 'Terminated-Adverse Judgment'
    || (status === 'FWD Entered' && invalid)
    || status === 'Waiver Filed'
    || fwdStatus === 'unpatentable') {
    // Terminated with Adverse Judgment (patent owner gives up, doesn't respond)
    // Decided and deemed invalid
    // PO Waives the claims
    // Patexia deems invalid
    return '5_killed';
  }
  if (status === 'Terminated-Settled' && instituted) {
    // Settled after Institution
    // Instituted
    return '4_impaired';
  }
  if (status === 'Instituted') {
    // Instituted - no decision yet
    return '3_weakened';
  }
  if ((status === 'FWD Entered' && !invalid)
    || status === 'Terminated-Denied') {
    // Decision - not invalid
    // Settled but not Instituted
    // IPR Denied
    return '2_unaffected';
  }
  // includes settled but not instituted
  // status === Notice OF Filing Date Accorded
  // status === Filing Date Accorded
  // status === Terminated-Other && fwdStatus !== unpatentable
  // status === Terminated-Dismissed && fwdStatus !== unpatentable 
  return '6_unbinned';
}

module.exports = {survivalStatus};