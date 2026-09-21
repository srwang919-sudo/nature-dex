const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),{createRequire}=require('node:module');
const file=require.resolve('../native/components/collectible/index.js');let definition;const pending=[];
vm.runInNewContext(fs.readFileSync(file,'utf8'),{require:createRequire(file),Component:v=>definition=v,wx:{cloud:{getTempFileURL:()=>new Promise(resolve=>pending.push(resolve))}}});
(async()=>{
 const patches=[],instance={setData:p=>patches.push(p)};
 definition.methods.fixCloudUrls.call(instance,{front:{photo:'cloud://old'}});
 definition.methods.fixCloudUrls.call(instance,{front:{photo:'cloud://art'}});
 pending[1]({fileList:[{fileID:'cloud://art',tempFileURL:'https://art'}]});await Promise.resolve();
 pending[0]({fileList:[{fileID:'cloud://old',tempFileURL:'https://old'}]});await Promise.resolve();
 assert.equal(patches.length,1);assert.equal(patches[0]['presentation.front.photo'],'https://art');
 console.log('PASS stale resource resolution cannot overwrite artwork');
})().catch(e=>{console.error(e);process.exitCode=1});
