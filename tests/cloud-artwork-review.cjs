const test=require('node:test'),assert=require('node:assert/strict'),{createHash}=require('crypto');
const {officialArtwork,reviewArtwork}=require('../cloudfunctions/createArtCard/artwork-repository');
function fixture(){const rows=new Map();return {rows,tx:{collection:c=>({doc:id=>({async get(){if(!rows.has(c+'/'+id))throw Error('DATABASE_DOCUMENT_NOT_EXIST');return {data:structuredClone(rows.get(c+'/'+id))}},async set({data}){rows.set(c+'/'+id,structuredClone(data))}})})}}}
test('unreviewed and legacy artwork never official; authorized review controls immutable audit',async()=>{
 const {tx,rows}=fixture(),key=createHash('sha256').update('kingfisher').digest('hex');
 rows.set('speciesWatercolors/old',{status:'ready',assetFileId:'cloud://old'});assert.equal(await officialArtwork(tx,'kingfisher'),null);
 rows.set('speciesArtworks/a',{speciesId:'kingfisher',status:'candidate',is_official:false,assetFileId:'cloud://candidate',source:'platform_generated',styleVersion:'museum-v1',owner:'creator'});
 rows.set('officialSpeciesArtworks/'+key,{artworkId:'a'});assert.equal(await officialArtwork(tx,'kingfisher'),null);
 await assert.rejects(reviewArtwork(tx,{reviewer:'visitor',artworkId:'a',decision:'approve',now:1}),/review_forbidden/);
 rows.set('artworkReviewers/'+createHash('sha256').update('staff').digest('hex'),{active:true});
 await assert.rejects(reviewArtwork(tx,{reviewer:'staff',artworkId:'a',decision:'approve',now:1}),/published_derivative_required/);
 await reviewArtwork(tx,{reviewer:'staff',artworkId:'a',decision:'approve',publishedAssetFileId:'cloud://env/official-artworks/a.jpg',now:1});assert.equal((await officialArtwork(tx,'kingfisher')).assetFileId,'cloud://env/official-artworks/a.jpg');assert.equal(rows.get('speciesArtworks/a').owner,undefined);
 await reviewArtwork(tx,{reviewer:'staff',artworkId:'a',decision:'deprecate',now:2});assert.equal(await officialArtwork(tx,'kingfisher'),null);
 assert.equal([...rows.keys()].filter(k=>k.startsWith('artworkReviewEvents/')).length,2);
 const original=rows.get('speciesArtworks/a');
 rows.set('speciesArtworks/b',{...original,status:'candidate',owner:'creator',source:'user_first_unlock'});
 await reviewArtwork(tx,{reviewer:'staff',artworkId:'b',decision:'approve',publishedAssetFileId:'cloud://env/official-artworks/b.jpg',now:3});assert.equal(rows.get('speciesArtworks/b').source,'user_first_unlock');assert.equal(rows.get('speciesArtworks/b').owner,undefined);
 rows.set('speciesArtworks/custom',{...original,status:'candidate',owner:'creator',source:'custom_user_generated'});
 await assert.rejects(reviewArtwork(tx,{reviewer:'staff',artworkId:'custom',decision:'approve',publishedAssetFileId:'cloud://env/official-artworks/custom.jpg',now:4}),/artwork_invalid/);
});
