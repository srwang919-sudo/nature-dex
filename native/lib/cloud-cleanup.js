const KEY='nature.cloudCleanup.v1';
const DELETIONS='nature.deletedObservations.v1';
function unfinished(wx){const value=wx.getStorageSync(KEY);return Array.isArray(value)?value.filter(x=>typeof x==='string'&&/^[A-Za-z0-9_-]{1,100}$/.test(x)):[]}
function deletions(wx){const value=wx.getStorageSync(DELETIONS);return Array.isArray(value)?value.filter(x=>x&&typeof x.id==='string'):[]}
function entries(wx){return [...new Set(unfinished(wx).concat(deletions(wx).filter(x=>x.pending).map(x=>x.id)))]}
function enqueue(wx,id){if(typeof id!=='string'||!/^[A-Za-z0-9_-]{1,100}$/.test(id))throw Error('invalid_observation');wx.setStorageSync(KEY,[...new Set(unfinished(wx).concat(id))])}
function markDeleted(wx,id,pending=true){if(typeof id!=='string'||!/^[A-Za-z0-9_-]{1,100}$/.test(id))throw Error('invalid_observation');wx.setStorageSync(DELETIONS,deletions(wx).filter(x=>x.id!==id).concat([{id,pending}]))}
function isDeleted(wx,id){return deletions(wx).some(x=>x.id===id)}
function forget(wx,ids){wx.setStorageSync(KEY,unfinished(wx).filter(id=>!ids.has(id)))}
async function drain(wx,protectedIds=new Set()){
 if(!wx.cloud)return entries(wx);
 for(const id of entries(wx)){
  if(protectedIds.has(id))continue;
  try{const explicit=isDeleted(wx,id),result=await wx.cloud.callFunction({name:explicit?'deleteObservationAssets':'cleanupObservationAssets',data:{observationId:id}});if(explicit?result.result?.status==='deleted':['cleaned','retained'].includes(result.result?.status)){if(explicit)markDeleted(wx,id,false);forget(wx,new Set([id]))}}catch(e){}
 }
 return entries(wx);
}
module.exports={KEY,DELETIONS,entries,enqueue,forget,drain,markDeleted,isDeleted};
