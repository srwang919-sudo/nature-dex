const KEY='nature.cloudCleanup.v1';
function entries(wx){const value=wx.getStorageSync(KEY);return Array.isArray(value)?value.filter(x=>typeof x==='string'&&/^[A-Za-z0-9_-]{1,100}$/.test(x)):[]}
function enqueue(wx,id){if(typeof id!=='string'||!/^[A-Za-z0-9_-]{1,100}$/.test(id))throw Error('invalid_observation');wx.setStorageSync(KEY,[...new Set(entries(wx).concat(id))])}
function forget(wx,ids){wx.setStorageSync(KEY,entries(wx).filter(id=>!ids.has(id)))}
async function drain(wx,protectedIds=new Set()){
 if(!wx.cloud)return entries(wx);
 for(const id of entries(wx)){
  if(protectedIds.has(id))continue;
  try{const result=await wx.cloud.callFunction({name:'cleanupObservationAssets',data:{observationId:id}});if(['cleaned','retained'].includes(result.result?.status))forget(wx,new Set([id]))}catch(e){}
 }
 return entries(wx);
}
module.exports={KEY,entries,enqueue,forget,drain};
