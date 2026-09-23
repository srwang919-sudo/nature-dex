const test=require('node:test'),assert=require('node:assert/strict'),{createHash}=require('crypto');
const hash=x=>createHash('sha256').update(x).digest('hex');
test('finalize then local failure survives automatic cleanup and cold library recovery; explicit delete still removes',async()=>{
 const rows=new Map(),key=hash('me|obs');let deleted=0;
 function query(c,q){let limit=20;return {orderBy(){return this},limit(n){limit=n;return this},async get(){return {data:[...rows].filter(([k,v])=>k.startsWith(c+'/')&&Object.entries(q).every(([f,x])=>f==='_id'?k.split('/')[1]>x.gt:v[f]===x)).sort().slice(0,limit).map(([k,v])=>({...v,_id:k.split('/')[1]}))}}}}
 const db={command:{gt:x=>({gt:x})},collection:c=>({doc:id=>{const k=c+'/'+id;return {get:async()=>{if(!rows.has(k))throw Error('DATABASE_DOCUMENT_NOT_EXIST');return {data:structuredClone(rows.get(k))}},set:async({data})=>rows.set(k,structuredClone(data)),update:async({data})=>rows.set(k,{...rows.get(k),...data}),remove:async()=>rows.delete(k)}},where:q=>query(c,q)}),runTransaction:fn=>fn(db)};
 const api={getWXContext:()=>({OPENID:'me'}),database:()=>db,getTempFileURL:async()=>({fileList:[{tempFileURL:'https://safe.invalid/photo'}]}),deleteFile:async({fileList})=>{deleted+=fileList.length;return {fileList:fileList.map(()=>({status:0}))}}};
 rows.set('recognitionReceipts/'+key,{owner:'me',observationId:'obs',photoFileId:'cloud://env/observations/me/obs.jpg',status:'complete',result:{candidates:[{speciesId:'kingfisher',name:'普通翠鸟',confidence:.9}]}});
 rows.set('natureSpecies/'+hash('kingfisher'),{counterStatus:'initialized',baselineVersion:'migration-tested',lastDiscoveryNumber:9});
 rows.set('speciesArtworks/official',{speciesId:'kingfisher',status:'approved',is_official:true,assetFileId:'cloud://env/official-artworks/official.jpg'});
 rows.set('artOperations/'+hash('me|op'),{owner:'me',status:'ready',photoFileId:'cloud://env/observations/me/obs.jpg',speciesId:'kingfisher',artworkId:'official'});
 rows.set('assets/asset',{_openid:'me',observationId:'obs',purpose:'recognition',fileId:'cloud://env/observations/me/obs.jpg'});
 const receipt=await require('../cloudfunctions/createArtCard/discovery').finalizeObservation({db,owner:'me',operationId:'op'});assert.equal(receipt.discovery.number,10);
 // The process can terminate before any local card is written.
 assert.equal((await require('../cloudfunctions/cleanupObservationAssets').main({observationId:'obs'},{cloud:api})).status,'retained');assert.equal(deleted,0);
 let cards=[];const app={getDataEpoch:()=>0,getCards:()=>cards,getReadyCards:()=>[],getSpecies:()=>null,saveCards:x=>cards=x};const wx={cloud:{callFunction:async({data})=>({result:await require('../cloudfunctions/createArtCard').main(data,{cloud:api})})},getImageInfo:o=>o.success({path:'temp'}),saveFile:o=>o.success({savedFilePath:'local'}),removeSavedFile:()=>{}};
 await require('../native/lib/card-recovery').recoverCards(app,wx);await require('../native/lib/card-recovery').recoverCards(app,wx);assert.equal(cards.length,1);assert.equal(cards[0].discoveryNumber,10);assert.equal(rows.get('natureSpecies/'+hash('kingfisher')).lastDiscoveryNumber,10);assert.equal([...rows.keys()].filter(k=>k.startsWith('creationReservations/')).length,0);
 assert.equal((await require('../cloudfunctions/deleteObservationAssets').main({observationId:'obs'},{cloud:api})).status,'deleted');assert.equal(deleted,1);assert.ok(rows.has('speciesArtworks/official'));
 await require('../native/lib/card-recovery').recoverCards(app,wx);assert.equal(cards.length,0);
});
