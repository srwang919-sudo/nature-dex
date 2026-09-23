const test=require('node:test'),assert=require('node:assert/strict');
test('late art is durably retained for erasure retry before storage removal',async()=>{
 const {discardLateArt}=require('../cloudfunctions/createArtCard/late-art');let row={owner:'me',status:'processing'},deleted=0;
 const account={owner:'me',status:'erasing'};
 const db={runTransaction:fn=>fn({collection:name=>({doc:()=>({get:async()=>({data:name==='accountPrivacy'?account:row}),update:async({data})=>Object.assign(name==='accountPrivacy'?account:row,data)})})})};
 const api={database:()=>db,deleteFile:async()=>{deleted++;assert.equal(row.assetFileId,'cloud://private/art');return {fileList:[{status:-1}]}}};
 await discardLateArt(api,'op','me','cloud://private/art');assert.equal(row.status,'cancelled');assert.equal(row.assetFileId,'cloud://private/art');
 api.deleteFile=async()=>({fileList:[{status:0}]});await discardLateArt(api,'op','me','cloud://private/art');assert.equal(row.assetFileId,'');
 row.owner='other';await assert.rejects(discardLateArt(api,'op','me','cloud://private/art'),/forbidden/);assert.equal(deleted,1);
});
