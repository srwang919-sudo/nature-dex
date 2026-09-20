const KEY='nature.recognitionConsent.v1';
function hasConsent(api){try{const value=api.getStorageSync(KEY);return !!(value&&value.version===1&&value.provider==='baidu'&&value.acceptedAt)}catch(e){return false}}
function setConsent(accepted,api){api.setStorageSync(KEY,accepted?{version:1,provider:'baidu',acceptedAt:Date.now()}:null)}
module.exports={hasConsent,setConsent};
