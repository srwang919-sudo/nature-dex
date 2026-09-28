const {normalizeCard,buildScience,scienceForConfirmedCandidate}=require('./observation-card');
async function recoverCards(app,wx){
 const consent=require('./recovery-consent');if(!consent.allowed(wx))return {status:'disabled',code:'sync_consent_required'};
 const epoch=app.getDataEpoch(),current=()=>epoch===app.getDataEpoch()&&consent.allowed(wx),saved=[];
 const check=()=>{if(!current())throw Error('sync_cancelled')};
 const call=async data=>{check();const r=(await wx.cloud.callFunction({name:'createArtCard',data})).result;check();if(r?.status!=='ready')throw Error(r?.code||'card_sync_unavailable');return r};
 try{
  const rows=[],seen=new Set();let cursor='';
  do{const page=await call({action:'list_owned',...(cursor?{cursor}:{})});if(!Array.isArray(page.cards))throw Error('card_sync_unavailable');rows.push(...page.cards);cursor=page.nextCursor||'';if(cursor&&seen.has(cursor))throw Error('card_sync_pagination');seen.add(cursor);if(rows.length>10000)throw Error('card_sync_limit')}while(cursor);
  const known=app.getCards(),restored=[];
  for(const row of rows){if(require('./cloud-cleanup').isDeleted(wx,row.observationId)||known.some(c=>c.serverCardId===row.id))continue;
   const front=await call({action:'card_resource',cardId:row.id,side:'art'}),back=await call({action:'card_resource',cardId:row.id,side:'original'});
   const info=await Promise.all([front.url,back.url].map(src=>new Promise((resolve,reject)=>wx.getImageInfo({src,success:resolve,fail:()=>reject(Error('card_resource_unavailable'))}))));check();
   const local=await new Promise((resolve,reject)=>wx.saveFile({tempFilePath:info[1].path,success:resolve,fail:()=>reject(Error('card_local_storage'))}));saved.push(local.savedFilePath);check();
   const ready=app.getReadyCards().find(c=>c.serverCardId===row.id),species=app.getSpecies(row.speciesId)||{},scienceSnapshot=scienceForConfirmedCandidate({speciesId:row.speciesId,sourceScience:row.sourceScience},row.speciesId,buildScience(species));
   restored.push(normalizeCard({...ready,...scienceSnapshot.fields,id:ready?.id||'server_'+row.id,serverCardId:row.id,schemaVersion:2,speciesId:row.speciesId,zh:row.name||row.speciesId,latin:species.latin||'',category:row.category||'other',confirmed:true,recognitionSource:'service',photoObservationId:row.observationId,photoFileId:row.originalPhotoFileId,photoPath:local.savedFilePath,artworkId:row.artwork.id,artwork:row.artwork,artStatus:'ready',artPhotoPath:row.artwork.fileId,frontMode:'art',scienceSnapshot,discovery:row.discovery,discoveryNumber:row.discovery.number,isFirstDiscovery:row.isFirstDiscovery,createdAt:row.createdAt,observedAt:ready?.observedAt??null,finishKey:ready?.finishKey||'standard',revealed:true,recoveredFromCloud:true}));
  }
  check();const ids=new Set(rows.map(r=>r.id)),latest=app.getCards();app.saveCards(latest.filter(c=>!c.serverCardId||ids.has(c.serverCardId)).concat(restored.filter(c=>!latest.some(x=>x.serverCardId===c.serverCardId))));
  return {status:'ready',restored:restored.length,total:rows.length};
 }catch(e){for(const filePath of saved)wx.removeSavedFile({filePath,fail:()=>{}});throw e}
}
module.exports={recoverCards};
