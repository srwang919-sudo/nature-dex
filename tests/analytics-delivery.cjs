const test=require('node:test'),assert=require('node:assert/strict'),vm=require('vm'),fs=require('fs'),path=require('path');
test('bounded analytics queue accepts client IDs, preserves unacknowledged/concurrent events and isolates owners',async()=>{
 let stored=[],ack=0,release;const api={getStorageSync:()=>stored,setStorageSync:(_,v)=>{stored=v},cloud:{callFunction:async()=>({result:{status:'ok',accepted:ack}})}};
 const sandbox={module:{exports:{}},setTimeout:()=>1,clearTimeout:()=>{},Date,Math};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../native/lib/analytics.js'),'utf8'),sandbox);const tracker=sandbox.module.exports;tracker.setApi(api);
 for(let i=0;i<205;i++)assert.equal(tracker.track('photo_captured',{source:'camera'}),true);
 assert.equal(stored.length,200);await tracker.flush();assert.equal(stored.length,200);
 stored=stored.slice(-1);api.cloud.callFunction=()=>new Promise(r=>{release=r});const pending=tracker.flush();tracker.track('recognition_started',{});release({result:{status:'ok',accepted:1}});await pending;assert.equal(stored.length,1);assert.equal(stored[0].event,'recognition_started');
 const rows=new Map(),event=stored[0],main=require('../cloudfunctions/analytics').main;
 let erased=false;const db={collection:name=>({doc:id=>({get:async()=>({data:name==='accountPrivacy'&&erased?{status:'erased'}:null}),set:async({data})=>{if(name==='analyticsEvents')rows.set(id,data)}})}),runTransaction:async fn=>fn(db)};
 for(const owner of ['a','b']){const result=await main({events:[event]},{cloud:{getWXContext:()=>({OPENID:owner}),database:()=>db}});assert.equal(result.accepted,1)}
  assert.equal(rows.size,2);assert.deepEqual([...rows.values()].map(x=>x.owner),['a','b']);
 erased=true;const rejected=await main({events:[event]},{cloud:{getWXContext:()=>({OPENID:'c'}),database:()=>db}});assert.equal(rejected.status,'failed');assert.equal(rows.size,2);
});
