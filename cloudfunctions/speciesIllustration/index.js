let cloud;try{cloud=require('./sdk');cloud.init({env:cloud.DYNAMIC_CURRENT_ENV,timeout:150000})}catch(e){}
const safe=new Set(['invalid_request','unauthenticated','account_erasing','candidate_unverified','cancelled','discovery_baseline_unavailable','creation_quota_exhausted','art_consent_required','review_forbidden','artwork_invalid','artwork_forbidden','artwork_resource_unavailable','operator_required','sync_consent_required']);
async function main(event={},deps={}){
 const api=deps.cloud||cloud;if(!api)return {status:'failed',code:'runtime_unavailable'};
 try{
  if(event.action==='ensure')return {status:'failed',code:'legacy_generation_disabled'};
  if(event.action==='review')return await require('./review-service').reviewService(api,event,deps);
  if(event.action==='reconcile')return await require('./reconcile').reconcile(api,event,deps);
  return await require('./artwork-flow').artworkFlow(api,event,deps);
 }catch(e){return {status:'failed',code:safe.has(e.message)?e.message:'service_unavailable'}}
}
module.exports={main};
