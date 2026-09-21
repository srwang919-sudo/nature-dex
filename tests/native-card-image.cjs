const assert=require('node:assert/strict');
const {readableFront,frontSource}=require('../native/lib/card-image');
(async()=>{
 const downloads=[];const api={cloud:{downloadFile:async({fileID})=>{downloads.push(fileID);if(fileID==='cloud://bad')throw Error('gone');return {tempFilePath:'local-art'}}},getImageInfo:({src,success,fail})=>src==='expired'?fail(Error('gone')):success({path:src,width:800,height:900})};
 assert.equal((await readableFront(api,{photoPath:'expired',photoFileId:'cloud://original'})).path,'local-art');
 assert.equal((await readableFront(api,{photoPath:'original',artPhotoPath:'cloud://art'})).path,'local-art');
 await assert.rejects(readableFront(api,{photoPath:'original',photoFileId:'cloud://original',artPhotoPath:'cloud://bad'}));
 assert.equal(downloads.at(-1),'cloud://bad');
 assert.equal(frontSource({frontMode:'art',photoPath:'original'}),'');
 console.log('PASS local recovery, cloud artwork download, no original fallback');
})().catch(e=>{console.error(e);process.exitCode=1});
