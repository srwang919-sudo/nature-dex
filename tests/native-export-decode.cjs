const assert=require('node:assert/strict');
const {decodeAsset}=require('../native/lib/asset-decode');
(async()=>{
 let image;
 const canvas={createImage(){return image={}}};
 const pending=decodeAsset(canvas,'missing',()=>true,20);
 image.onerror(new Error('decode failed'));
 await assert.rejects(pending);
 await assert.rejects(decodeAsset(canvas,'slow',()=>true,1));
 let current=true;const stale=decodeAsset(canvas,'old',()=>current,20);current=false;image.onload();
 await assert.rejects(stale);
 console.log('PASS: decode failures, timeout, and stale exports never resolve');
})().catch(e=>{console.error(e);process.exitCode=1});
