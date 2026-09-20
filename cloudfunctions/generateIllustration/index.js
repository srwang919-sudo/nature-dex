// Retired endpoint: prevents old clients bypassing the confirmed-species consent flow.
exports.main=async()=>({status:'failed',code:'use_authorized_natureAI2',fallback:'local_illustration'});
