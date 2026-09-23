let cloud;try{cloud=require('./sdk');cloud.init({env:cloud.DYNAMIC_CURRENT_ENV,timeout:150000})}catch(e){}
async function main(event={},deps={}){
 const api=deps.cloud||cloud,fail=code=>({status:'failed',code,retryable:false});
 if(!api)return fail('runtime_unavailable');
 const owner=api.getWXContext().OPENID;if(!owner)return fail('unauthenticated');
 if(['list_owned','card_resource'].includes(event.action)){try{return await require('./owned-cards').ownedCards(api,event)}catch(e){return fail(['invalid_request','account_erasing','card_unavailable','card_resource_unavailable'].includes(e.message)?e.message:'card_sync_unavailable')}}
 // Custom photo-derived generation is closed until its isolated attempt flow is available.
 if(event.action!=='finalize')return fail('custom_art_unavailable');
 if(typeof event.operationId!=='string'||!/^[a-zA-Z0-9_-]{1,100}$/.test(event.operationId)||Object.keys(event).some(k=>!['action','operationId'].includes(k)))return fail('invalid_request');
 try{return await require('./discovery').finalizeObservation({db:api.database(),owner,operationId:event.operationId})}
 catch(e){return fail(['account_erasing','cancelled','candidate_unverified','art_not_ready','observation_conflict','discovery_baseline_unavailable'].includes(e.message)?e.message:'observation_save_failed')}
}
module.exports={main};
