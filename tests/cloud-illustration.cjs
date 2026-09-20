const assert=require('node:assert/strict'),{main}=require('../cloudfunctions/natureAI2');
process.env.DASHSCOPE_API_KEY='test-only';
const api={getWXContext:()=>({OPENID:'u1'}),database:()=>({collection:()=>({where:()=>({get:async()=>({data:[]})})})})};
(async()=>{
 assert.equal((await main({action:'recognize'})).code,'use_baidu_recognition');
 assert.equal((await main({action:'species_info',confirmed:true},{cloud:api})).code,'consent_required');
 assert.equal((await main({action:'generate_submit',consent:true},{cloud:api})).code,'consent_required');
 assert.equal((await main({action:'generate_poll',consent:true,confirmed:true,taskId:'foreign',observationId:'o'},{cloud:api})).code,'forbidden');
 const r=await main({action:'species_info',consent:true,confirmed:true,name:'白鹭'},{cloud:api,request:async()=>({status:200,json:()=>({choices:[{message:{content:'{"knowledge":"参考资料","facts":[]}'}}]})})});
 assert.equal(r.reviewRequired,true);assert.equal(r.source,'bailian');
 assert.equal((await require('../cloudfunctions/generateIllustration').main({consent:true})).code,'use_authorized_natureAI2');
 console.log('PASS Bailian consent, confirmation, task ownership, AI reference label and retired endpoint');
})().catch(e=>{console.error(e);process.exitCode=1});
