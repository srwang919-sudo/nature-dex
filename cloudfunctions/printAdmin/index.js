// printAdmin 云函数：打印履约后台（Master Plan §14）。
// 默认拒绝：只有部署环境变量 NATURE_ADMIN_OPENIDS 中列出的账号才能调用。
let cloud;try{cloud=require('./sdk');cloud.init({env:cloud.DYNAMIC_CURRENT_ENV,timeout:60000})}catch(e){}
const SAFE=new Set(['invalid_request','unauthenticated','operator_required','order_unavailable','order_conflict','order_state_conflict','tracking_required','runtime_unavailable']);
async function main(event={},deps={}){
 const api=deps.cloud||cloud,fail=code=>({status:'failed',code,retryable:false});
 if(!api)return fail('runtime_unavailable');
 const owner=api.getWXContext().OPENID;if(!owner)return fail('unauthenticated');
 try{return await require('./core').printAdmin({db:api.database(),owner,event})}
 catch(e){return fail(SAFE.has(e.message)?e.message:'fulfillment_service_unavailable')}
}
module.exports={main};
