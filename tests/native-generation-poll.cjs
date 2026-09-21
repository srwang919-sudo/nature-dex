const assert=require('node:assert/strict'),{pollGeneration}=require('../native/lib/generation-poll');
(async()=>{
 let time=0,calls=0,active=true;
 const options={api:{callFunction:async()=>({result:++calls===1?{status:'processing'}:calls<31?{status:'generating'}:{status:'ready',assetFileId:'cloud://new'}})},name:'speciesIllustration',submit:{action:'ensure'},status:{action:'status'},wait:async ms=>{time+=ms},now:()=>time,isCurrent:()=>active};
 const result=await pollGeneration(options);assert.equal(result.status,'ready');assert.ok(time>36000&&time<=175000);assert.equal(calls,31);
 calls=0;time=0;const waiting=await pollGeneration({...options,api:{callFunction:async()=>({result:{status:'processing'}})}});assert.equal(waiting.status,'processing');assert.equal(waiting.code,'generation_pending');assert.ok(time<=175000);
 const missing=await pollGeneration({...options,api:{callFunction:async()=>({result:{status:'missing'}})}});assert.equal(missing.code,'not_found');
 const failed=await pollGeneration({...options,api:{callFunction:async()=>({result:{status:'failed',code:'private URL secret'}})}});assert.equal(failed.status,'failed');assert.equal(failed.code,'generation_failed');
 calls=0;active=true;const cancelled=await pollGeneration({...options,wait:async()=>{active=false},api:{callFunction:async()=>{calls++;return {result:{status:'processing'}}}}});assert.equal(cancelled.status,'cancelled');assert.equal(calls,1);
 console.log('PASS generation polling beyond36s,175s ceiling,concurrency,missing,failure,cancellation');
})().catch(e=>{console.error(e);process.exitCode=1});
