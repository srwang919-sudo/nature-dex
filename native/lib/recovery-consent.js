const KEY='nature.cardRecoveryConsent.v1',REVOKE_KEY='nature.cardRecoveryRevocation.v1',blocked=new WeakSet(),tokens=new WeakMap();
function allowed(api){try{const r=api.getStorageSync(KEY);return !blocked.has(api)&&!api.getStorageSync(REVOKE_KEY)&&r?.version===1&&r.accepted===true&&r.pending!==true}catch(e){return false}}
function write(api,key,value){try{api.setStorageSync(key,value);return true}catch(e){return false}}
function remove(api,key){try{api.removeStorageSync(key);return !api.getStorageSync(key)}catch(e){return false}}
function revokeFailure(pending){return Object.assign(Error('revocation_unconfirmed'),{code:pending?'sync_revoke_pending':'sync_revoke_incomplete'})}
async function setRecoveryConsent(api,accepted){
 const token=(tokens.get(api)||0)+1;tokens.set(api,token);blocked.add(api);
 let pending=false;
 if(!accepted)pending=write(api,REVOKE_KEY,{version:1,pending:true,updatedAt:Date.now()});
 const denied=write(api,KEY,{version:1,accepted:false,pending:!accepted,updatedAt:Date.now()});
 if(!denied){if(accepted)throw Error('consent_storage_failed');remove(api,KEY)}else if(!accepted)pending=true;
 let result;
 try{result=(await api.cloud.callFunction({name:'createArtCard',data:{action:'set_sync_consent',version:1,accepted:!!accepted}})).result;
  if(tokens.get(api)!==token)throw Error('consent_changed');
  if(result?.status!=='ready'||result.accepted!==!!accepted||result.version!==1)throw Error('sync_consent_unavailable');
 }catch(e){if(!accepted)throw revokeFailure(pending);throw e}
 if(!accepted){const saved=write(api,KEY,{version:1,accepted:false,pending:false,updatedAt:result.updatedAt||Date.now()})||remove(api,KEY);if(saved)remove(api,REVOKE_KEY);else if(!api.getStorageSync(REVOKE_KEY))throw revokeFailure(false);return false}
 if(api.getStorageSync(REVOKE_KEY)&&!remove(api,REVOKE_KEY))throw Error('consent_storage_failed');
 if(!write(api,KEY,{version:1,accepted:true,pending:false,updatedAt:result.updatedAt||Date.now()}))throw Error('consent_storage_failed');
 blocked.delete(api);return true;
}
async function retryRevocation(api){const value=api.getStorageSync(KEY);if(api.getStorageSync(REVOKE_KEY)||value?.accepted===false&&value.pending===true)return setRecoveryConsent(api,false)}
module.exports={KEY,REVOKE_KEY,allowed,setRecoveryConsent,retryRevocation};
