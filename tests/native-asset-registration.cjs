const assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.join(__dirname,'..'),calls=[];let page;
const wx={getStorageSync:()=>({version:1,provider:'baidu',acceptedAt:1}),cloud:{
 database(){throw Error('client database must never be used')},
 callFunction:async({name,data})=>{assert.equal(name,'recognizeObservation');calls.push(data);return {result:data.action==='upload_ticket'?{status:'ready',contractVersion:2,cloudPath:'observations/u1/d1.jpg'}:{status:'registered',contractVersion:2}}},
 uploadFile:async({cloudPath})=>({fileID:'cloud://env.bucket/'+cloudPath})
}};
vm.runInNewContext(fs.readFileSync(path.join(root,'native/pages/observe/index.js'),'utf8'),{Page:p=>page=p,getApp:()=>({finishes:[]}),wx,require:require('module').createRequire(path.join(root,'native/pages/observe/index.js'))});
(async()=>{
 const fileId=await page.uploadPhoto({id:'d1'},'wxfile://local');assert.equal(fileId,'cloud://env.bucket/observations/u1/d1.jpg');
 assert.deepEqual(calls.map(x=>x.action),['upload_ticket','register_asset']);
 assert.equal(calls[1].purpose,'recognition');assert.equal(calls[1].cloudPath,'observations/u1/d1.jpg');
 assert.ok(!('owner'in calls[1])&&!('_openid'in calls[1]));
 console.log('PASS uploaded assets register through cloud function without client DB or owner fields');
})().catch(e=>{console.error(e);process.exitCode=1});
