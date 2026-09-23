const test=require('node:test'),assert=require('node:assert/strict');
test('durable observation cleanup survives cloud failure and preserves retained cards',async()=>{
 const {enqueue,drain}=require('../native/lib/cloud-cleanup');let store=[],failed=true,calls=0;
 const wx={getStorageSync:()=>store,setStorageSync:(k,v)=>store=v,cloud:{callFunction:async({data})=>{calls++;assert.equal(Object.keys(data).join(','),'observationId');return {result:{status:failed?'failed':'cleaned'}}}}};
 enqueue(wx,'obs');assert.equal(store.length,1);await drain(wx,new Set());assert.equal(store.length,1);
 failed=false;await drain(wx,new Set(['obs']));assert.equal(calls,1);assert.equal(store.length,1);
 await drain(wx,new Set());assert.equal(store.length,0);assert.equal(calls,2);
 assert.throws(()=>enqueue({...wx,setStorageSync:()=>{throw Error('quota')}},'new'),/quota/);
});
