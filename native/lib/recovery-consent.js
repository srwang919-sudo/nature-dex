const KEY='nature.cardRecoveryConsent.v1',blocked=new WeakSet(),tokens=new WeakMap();
function allowed(api){try{const r=api.getStorageSync(KEY);return !blocked.has(api)&&r?.version===1&&r.accepted===true&&r.pending!==true}catch(e){return false}}
async function setRecoveryConsent(api,accepted){const token=(tokens.get(api)||0)+1;tokens.set(api,token);blocked.add(api);let storageError;
 try{api.setStorageSync(KEY,{version:1,accepted:false,pending:!accepted,updatedAt:Date.now()})}catch(e){storageError=e;if(accepted)throw e}
 const result=(await api.cloud.callFunction({name:'createArtCard',data:{action:'set_sync_consent',version:1,accepted:!!accepted}})).result;
 if(tokens.get(api)!==token)throw Error('consent_changed');if(result?.status!=='ready'||result.accepted!==!!accepted||result.version!==1)throw Error('sync_consent_unavailable');
 api.setStorageSync(KEY,{version:1,accepted:!!accepted,pending:false,updatedAt:result.updatedAt||Date.now()});if(accepted)blocked.delete(api);if(storageError)throw storageError;return !!accepted;
}
async function retryRevocation(api){const value=api.getStorageSync(KEY);if(value?.accepted===false&&value.pending===true)return setRecoveryConsent(api,false)}
module.exports={KEY,allowed,setRecoveryConsent,retryRevocation};
