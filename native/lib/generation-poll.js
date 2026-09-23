const safeCodes=new Set(['creation_quota_exhausted','discovery_baseline_unavailable','artwork_unavailable','generation_timeout','not_found','generation_failed','service_unavailable','invalid_species','invalid_request','forbidden','unauthenticated','confirmation_required','reference_unavailable','watercolor_model_quota','watercolor_model_permission','watercolor_model_parameter','watercolor_model_failed','watercolor_download_failed','watercolor_upload_failed']);
// A timed-out client request does not cancel the server operation. Status calls
// reuse its operation/species key and never submit a second generation.
async function pollGeneration({api,name,submit,status,isCurrent=()=>true,wait=ms=>new Promise(r=>setTimeout(r,ms)),now=Date.now}){
 const deadline=now()+175000;
 const cancelled=()=>({status:'cancelled',code:'generation_cancelled'});
 async function call(data){
  let timer;
  try{return (await Promise.race([Promise.resolve().then(()=>api.callFunction({name,data})),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('client_timeout')),Math.max(1,Math.min(15000,deadline-now())))})])).result}
  catch(e){return {status:'processing'}}finally{clearTimeout(timer)}
 }
 if(!isCurrent())return cancelled();
 let result=await call(submit);
 for(let i=0;i<35;i++){
  if(!isCurrent())return cancelled();
  if(result?.status==='ready')return result;
  if(result?.status==='missing'||result?.code==='not_found')return {status:'failed',code:'not_found'};
  if(result?.status==='failed')return {status:'failed',code:safeCodes.has(result.code)?result.code:'generation_failed'};
  if(!['processing','generating'].includes(result?.status))return {status:'failed',code:'generation_failed'};
  if(deadline-now()<=5000)break;
  await wait(5000);
  if(!isCurrent())return cancelled();
  if(now()>=deadline)break;
  result=await call(status);
 }
 if(!isCurrent())return cancelled();
 if(result?.status==='ready')return result;
 return {status:'processing',code:'generation_pending'};
}
module.exports={pollGeneration};
