const test=require('node:test'),assert=require('node:assert/strict'),{createHash}=require('crypto');const hash=x=>createHash('sha256').update(x).digest('hex');
function fixture(){
 const rows=new Map(),command={lte:x=>({kind:'lte',x}),neq:x=>({kind:'neq',x}),in:x=>({kind:'in',x})};
 const match=(v,q)=>Object.entries(q).every(([k,x])=>!x||!x.kind?v[k]===x:x.kind==='lte'?v[k]<=x.x:x.kind==='neq'?v[k]!==x.x:x.x.includes(v[k]));
 const db={command,collection(c){return {
  doc(id){const k=c+'/'+id;return {
   async get(){if(!rows.has(k))throw Error('DATABASE_DOCUMENT_NOT_EXIST');return {data:structuredClone(rows.get(k))}},
   async set({data}){rows.set(k,structuredClone(data))},
   async update({data}){if(!rows.has(k))throw Error('not found');rows.set(k,{...rows.get(k),...data})}
  }},
  where(q){return {limit(n){return {async get(){return {data:[...rows].filter(([k,v])=>k.startsWith(c+'/')&&match(v,q)).slice(0,n).map(([k,v])=>({...v,_id:k.slice(c.length+1)}))}}}}}}
 }},async runTransaction(fn){const old=structuredClone(rows);try{return await fn(db)}catch(e){rows.clear();for(const [k,v]of old)rows.set(k,v);throw e}}};
 return {rows,db};
}
test('failed review publication leaves journal; network failure retries without deleting approved art',async()=>{
 const {rows,db}=fixture(),files=new Set();let failDelete=true;
 rows.set('speciesArtworks/c',{speciesId:'kingfisher',owner:'creator',observationId:'obs',status:'candidate',source:'user_first_unlock',styleVersion:'museum',assetFileId:'cloud://private'});rows.set('trustedObservations/'+hash('creator|obs'),{owner:'creator',observationId:'obs',status:'pending'});rows.set('artworkReviewers/'+hash('staff'),{active:true});
 const api={getWXContext:()=>({OPENID:'staff'}),database:()=>db,downloadFile:async()=>({fileContent:Buffer.from([255,216,255,224,0,0,0,0,0])}),uploadFile:async({cloudPath})=>{files.add('cloud://env/'+cloudPath);rows.set('artworkReviewers/'+hash('staff'),{active:false});return {fileID:'cloud://env/'+cloudPath}},deleteFile:async({fileList})=>{if(failDelete)throw Error('network');fileList.forEach(x=>files.delete(x));return {fileList:[{status:0}]}}};
 await assert.rejects(require('../cloudfunctions/speciesIllustration/review-service').reviewService(api,{action:'review',artworkId:'c',decision:'approve'},{metadata:async({cloudPath})=>({data:{fileId:'cloud://env/'+cloudPath}})}),/review_forbidden/);assert.equal(files.size,1);assert.equal(rows.get('artworkReviewJobs/c').status,'cleaning');assert.equal([...rows.keys()].some(k=>k.startsWith('officialSpeciesArtworks/')),false);
 const reconcile=()=>require('../cloudfunctions/speciesIllustration/reconcile').reconcile(api,{action:'reconcile',token:'test-operator'},{jobToken:'test-operator',now:()=>Date.now()+200000});assert.equal((await reconcile()).status,'partial');assert.equal(files.size,1);failDelete=false;assert.equal((await reconcile()).status,'ready');assert.equal(files.size,0);assert.equal(rows.get('artworkReviewJobs/c').status,'cleaned');
 rows.set('speciesArtworks/approved',{status:'approved',assetFileId:'cloud://env/official-artworks/approved.jpg'});rows.set('artworkReviewJobs/approved',{artworkId:'approved',status:'pending',expiresAt:1,assetFileId:'cloud://env/official-artworks/approved.jpg'});files.add('cloud://env/official-artworks/approved.jpg');await reconcile();assert.ok(files.has('cloud://env/official-artworks/approved.jpg'));
});
test('cancelled attempt deletion does not treat generic -1 as absent; missing candidate review job can be reclaimed',async()=>{
 const {rows,db}=fixture();let ok=false;rows.set('artOperations/attempt',{owner:'me',isAttempt:true,status:'cancelled',assetFileId:'cloud://env/private-art/me/attempt.jpg'});rows.set('artworkReviewJobs/gone',{artworkId:'gone',status:'pending',expiresAt:1,assetFileId:'cloud://env/official-artworks/gone.jpg'});const api={database:()=>db,deleteFile:async()=>({fileList:[{status:ok?0:-1}]})};const run=()=>require('../cloudfunctions/speciesIllustration/reconcile').reconcile(api,{token:'test',action:'reconcile'},{jobToken:'test',now:()=>100});assert.equal((await run()).failed,2);assert.ok(rows.get('artOperations/attempt').assetFileId);ok=true;assert.equal((await run()).failed,0);assert.equal(rows.get('artOperations/attempt').assetFileId,'');assert.equal(rows.get('artworkReviewJobs/gone').status,'cleaned');
});
