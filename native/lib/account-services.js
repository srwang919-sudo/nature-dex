const {POLICY}=require('./v1-policy');
const messages={merchant_config_missing:'商户支付尚未配置，当前不能付款。',merchant_config_invalid:'商户配置未通过校验，当前不能付款。',unauthenticated:'微信身份尚未确认，请重新进入小程序后重试。',account_erasing:'账号正在清除，暂不能使用会员或好友服务。',expired:'邀请码已过期，请对方重新生成。',self_invite:'不能添加自己。',invite_used:'邀请码已使用，请重新获取。',not_verified:'这条观察尚未通过云端核验，不能分享。',attestation_invalid:'观察凭证暂不可用，未分享。',request_pending:'已有待批准的请求。',already_copied:'已经获得这份纪念副本。',relationship_blocked:'当前好友关系不可用。'};
function safeError(code){return Object.assign(Error(messages[code]||'服务暂不可用，请稍后重试；没有产生开通或分享成功状态。'),{code:messages[code]?code:'service_unavailable'})}
async function call(api,name,data){let r;try{r=(await api.cloud.callFunction({name,data})).result}catch(e){throw safeError('service_unavailable')}if(r?.status!=='ready')throw safeError(r?.code);return r}
function requestKey(api,key){let saved=api.getStorageSync(key);if(!/^[a-zA-Z0-9_-]{16,64}$/.test(saved||'')){saved='request_'+Date.now()+'_'+Math.random().toString(36).slice(2,12);api.setStorageSync(key,saved)}return saved}
function retirePaid(api,pending,order){if(order?.status!=='PAID'||api.getStorageSync('nature.pendingPayment.v1')?.orderId!==pending.orderId)return;const plan=order.planId||pending.planId;if(['monthly','annual'].includes(plan)){const key='nature.paymentRequest.'+plan;if(!pending.requestKey||api.getStorageSync(key)===pending.requestKey)api.removeStorageSync(key)}api.removeStorageSync('nature.pendingPayment.v1')}
function membershipClient(api){return {
 async status(){const r=await call(api,'natureMembership',{action:'getMembership'});if(!['ACTIVE','INACTIVE','EXPIRED'].includes(r.membership?.status))throw safeError('service_unavailable');return r.membership},
 async purchase(planId){if(!['monthly','annual'].includes(planId))throw Error('invalid_client_request');const key='nature.paymentRequest.'+planId,r=await call(api,'natureMembership',{action:'createPayment',planId,idempotencyKey:requestKey(api,key)}),order=r.order;
  if(!order?.orderId||order.planId!==planId||order.currency!=='CNY'||order.total!==(planId==='monthly'?POLICY.monthlyFen:POLICY.annualFen))throw safeError('service_unavailable');
  const pending={orderId:order.orderId,planId,requestKey:api.getStorageSync(key)};api.setStorageSync('nature.pendingPayment.v1',pending);
  if(r.requestPayment){const p=r.requestPayment;if(p.signType!=='RSA'||!p.package?.startsWith('prepay_id='))throw safeError('service_unavailable');await new Promise(resolve=>api.requestPayment({timeStamp:p.timeStamp,nonceStr:p.nonceStr,package:p.package,signType:p.signType,paySign:p.paySign,success:resolve,fail:resolve}))}
  const confirmed=await call(api,'natureMembership',{action:'queryOrder',orderId:order.orderId}),membership=await this.status();
  retirePaid(api,pending,{...confirmed.order,planId});
  return {membership,orderStatus:confirmed.order?.status||'UNKNOWN',existingOrder:!r.requestPayment||order.status==='PAID'};
 },
 async reconcile(){const pending=api.getStorageSync('nature.pendingPayment.v1');let orderStatus='';if(pending?.orderId){const result=await call(api,'natureMembership',{action:'queryOrder',orderId:pending.orderId});orderStatus=result.order?.status||'UNKNOWN';retirePaid(api,pending,result.order)}return {membership:await this.status(),orderStatus}}
}}
const socialFields={listFriends:[],listSharedSpecies:[],listCopyRequests:[],listMemorialCopies:[],createInvite:[],acceptInvite:['inviteCode','idempotencyKey'],registerVerifiedSpecies:['observationId'],setSpeciesPublic:['relationshipId','speciesCardId','shared'],revokeSpeciesShare:['shareId'],requestCopy:['shareId','idempotencyKey'],approveCopy:['copyRequestId','idempotencyKey'],rejectCopy:['copyRequestId','idempotencyKey'],revokeFriend:['relationshipId'],blockFriend:['relationshipId']};
async function socialCall(api,action,data={}){const fields=socialFields[action];if(!fields||Object.keys(data).some(k=>!fields.includes(k)))throw Error('invalid_client_request');return call(api,'natureSocial',{action,...data})}
module.exports={membershipClient,socialCall,requestKey};
