// Retired endpoint: prevents old clients bypassing the confirmed-species consent flow.
exports.main=async()=>({status:'failed',code:'legacy_endpoint_retired'});
