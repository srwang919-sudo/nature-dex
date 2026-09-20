const assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm'),path=require('path');
const {imageForm,baiduErrorCode}=require('../cloudfunctions/recognizeObservation');
const bytes=Buffer.from([255,216,255,254,251,239,0,1]);
for(const input of [bytes,new Uint8Array(bytes),new Uint8Array(bytes).buffer]){
 const options=imageForm(input),params=new URLSearchParams(options.body);
 assert.deepEqual(Buffer.from(params.get('image'),'base64'),bytes);
 assert.equal(Number(options.headers['Content-Length']),Buffer.byteLength(options.body));
 assert.ok(options.body.includes('%2F'),'base64 slash must be URL encoded');
}
assert.throws(()=>imageForm(Buffer.alloc(0)));assert.throws(()=>imageForm({toString:()=>''}));
assert.equal(baiduErrorCode(216101),'provider_missing_parameter');
let options,payload;
const fakeHttps={request:(url,o,callback)=>{options=o;return {setTimeout(){},on(){},end(b){payload=b;const handlers={};callback({statusCode:200,headers:{},on:(event,fn)=>handlers[event]=fn});handlers.data(Buffer.from('{}'));handlers.end()},destroy(){}}}};
const sandbox={module:{exports:{}},require:n=>n==='https'?fakeHttps:n==='wx-server-sdk'?(()=>{throw Error('test')})():require(n),Buffer,URLSearchParams,ArrayBuffer};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../cloudfunctions/recognizeObservation/index.js'),'utf8'),sandbox);
(async()=>{await sandbox.module.exports.request('https://example.invalid',{method:'POST',body:imageForm(bytes).body});assert.ok(Buffer.isBuffer(payload));assert.equal(Number(options.headers['Content-Length']),payload.length);assert.deepEqual(Buffer.from(new URLSearchParams(payload.toString()).get('image'),'base64'),bytes);console.log('PASS encoded image survives Buffer/Uint8Array/ArrayBuffer and exact HTTP Content-Length')})().catch(e=>{console.error(e);process.exitCode=1});
