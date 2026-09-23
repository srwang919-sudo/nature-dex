async function saveObservation({api,operationId,isCurrent=()=>true}){
 if(!api||typeof api.callFunction!=='function')throw Error('observation_service_unavailable');
 const response=await api.callFunction({name:'createArtCard',data:{action:'finalize',operationId}});
 if(!isCurrent())throw Error('stale');
 const receipt=response?.result;
 if(receipt?.code==='discovery_baseline_unavailable')throw Error('discovery_baseline_unavailable');
 if(receipt?.status!=='saved'||typeof receipt.cardId!=='string'||!receipt.cardId||typeof receipt.observationId!=='string'||receipt.discovery?.status!=='verified'||!Number.isSafeInteger(receipt.discovery.number)||receipt.discovery.number<1)throw Error('observation_save_failed');
 return receipt;
}
module.exports={saveObservation};
