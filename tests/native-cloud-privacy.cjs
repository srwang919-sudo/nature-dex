const test=require('node:test'),assert=require('node:assert/strict'),{privacyAction}=require('../native/lib/cloud-privacy');
test('cloud erasure never substitutes local clear or treats partial failure as success',async()=>{
 const calls=[];let status='failed';const api={cloud:{callFunction:async args=>{calls.push(args);return {result:{status,code:'private_delete_failed'}}}}};
 assert.equal((await privacyAction('continueErasure',api)).status,'failed');assert.doesNotMatch((await privacyAction('status',api)).label,/已清除/);
 status='erased';assert.match((await privacyAction('status',api)).label,/已清除/);assert.deepEqual(calls[0],{name:'managePrivacy',data:{action:'continueErasure'}});
 await assert.rejects(privacyAction('deleteEverything',api),/invalid_action/);await assert.rejects(privacyAction('status',{}),/cloud_unavailable/);
});
test('settings requires two explicit confirmations before requesting remote erasure',()=>{
 const fs=require('fs'),vm=require('vm'),dialogs=[];let page,calls=0;
 vm.runInNewContext(fs.readFileSync(require('path').join(__dirname,'../native/pages/settings/index.js'),'utf8'),{getApp:()=>({}),Page:p=>page=p,require:()=>({}),wx:{showModal:args=>dialogs.push(args)}});
 const ctx={data:{},runCloudErasure:()=>calls++};page.requestCloudErasure.call(ctx);assert.equal(dialogs.length,1);assert.equal(calls,0);
 dialogs.shift().success({confirm:false});assert.equal(calls,0);
 page.requestCloudErasure.call(ctx);dialogs.shift().success({confirm:true});assert.equal(dialogs.length,1);assert.equal(calls,0);
 dialogs.shift().success({confirm:true});assert.equal(calls,1);
});
