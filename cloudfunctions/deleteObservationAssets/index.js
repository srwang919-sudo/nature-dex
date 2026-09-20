async function main(event={}){return event.observationId?{status:'queued',observationId:event.observationId}:{status:'rejected',code:'invalid_request'}}
module.exports={main};
