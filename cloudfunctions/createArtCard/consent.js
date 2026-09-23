function validConsent(proof,event,now=Date.now()){
 return !!proof&&proof.version===1&&proof.provider==='tencent-hunyuan'&&proof.operationId===event.operationId&&proof.observationId===event.photoObservationId&&Number.isSafeInteger(proof.acceptedAt)&&proof.acceptedAt<=now+60000&&proof.acceptedAt>=now-30*60*1000;
}
module.exports={validConsent};
