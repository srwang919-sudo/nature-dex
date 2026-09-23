let cloud;try{cloud=require('./sdk');cloud.init({env:cloud.DYNAMIC_CURRENT_ENV})}catch(e){}
const {createPrivacyService}=require('./core');
async function main(event={},deps={}){
 const api=deps.cloud||cloud;if(!api)return {status:'failed',code:'runtime_unavailable'};
 const deleteForOwner=(owner,observationId)=>require('./delete-observation').main({observationId},{cloud:{database:()=>api.database(),getWXContext:()=>({OPENID:owner}),deleteFile:args=>api.deleteFile(args)}});
 if(event.action==='sweepExpired')return require('./retention').sweepExpired(event,{db:api.database(),token:(deps.env||process.env).NATURE_RETENTION_JOB_TOKEN,deleteObservation:deleteForOwner});
 const owner=api.getWXContext().OPENID;if(!owner)return {status:'failed',code:'unauthenticated'};
 return createPrivacyService({
  db:api.database(),
  deleteObservation:async(trustedOwner,observationId)=>{
   if(trustedOwner!==owner)throw Error('forbidden');
   return deleteForOwner(owner,observationId);
  },
  deletePrivateArt:async fileId=>{
   const result=await api.deleteFile({fileList:[fileId]});
   return result.fileList?.length===1&&result.fileList[0].status===0;
  }
 }).execute(owner,event);
}
module.exports={main};
