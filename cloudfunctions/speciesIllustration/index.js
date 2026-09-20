let cloud;try{cloud=require('wx-server-sdk');cloud.init({env:cloud.DYNAMIC_CURRENT_ENV,timeout:150000})}catch(e){}
const {generate}=require('./provider'),{createHash}=require('crypto');
const known={kingfisher:'普通翠鸟',egret:'白鹭',ibis:'朱鹮',pheasant:'红腹锦鸡',sparrow:'麻雀',moth:'绿尾大蚕蛾',camellia:'山茶'};
async function main(event={},deps={}){
 const api=deps.cloud||cloud,fail=code=>({status:'failed',code});
 if(!api)return fail('runtime_unavailable');
 if(!api.getWXContext().OPENID)return fail('unauthenticated');
 if(event.confirmed!==true)return fail('confirmation_required');
 if(typeof event.speciesId!=='string'||event.speciesId!==event.speciesId.normalize('NFKC').trim()||!/^[\p{L}][\p{L} _-]{0,79}$/u.test(event.speciesId)||['photoFileId','image','images','image_urls','prompt','owner','reference'].some(k=>Object.prototype.hasOwnProperty.call(event,k)))return fail('invalid_request');
 const name=known[event.speciesId]||event.name;
 if(typeof name!=='string'||!/^[\p{L}][\p{L} ·-]{0,79}$/u.test(name)||/^(unknown|未知|无法识别|植物|动物|鸟类|昆虫|other)$/i.test(name)||(!known[event.speciesId]&&event.speciesId!==name))return fail('invalid_species');
 const styleVersion='watercolor-t2i-v1',cacheKey=createHash('sha256').update(styleVersion+'|'+event.speciesId).digest('hex'),db=api.database(),doc=db.collection('speciesWatercolors').doc(cacheKey);
 try{
  let cache;try{cache=(await doc.get()).data}catch(e){if(!/not exist|not found|DATABASE_DOCUMENT_NOT_EXIST/i.test(e.message||e.errMsg||''))throw e}
  if(cache?.status==='ready')return {status:'ready',cacheKey,assetFileId:cache.assetFileId,styleVersion};
  if(event.action==='status')return {status:cache?.status||'missing',cacheKey,code:cache?.code||''};
  if(event.action!=='ensure')return fail('invalid_request');
  const leaseExpiresAt=Date.now()+180000;
  const claimed=await db.runTransaction(async tx=>{
   const entry=tx.collection('speciesWatercolors').doc(cacheKey);let old;try{old=(await entry.get()).data}catch(e){if(!/not exist|not found|DATABASE_DOCUMENT_NOT_EXIST/i.test(e.message||e.errMsg||''))throw e}
   if(old&&(old.status==='ready'||old.status==='generating'&&old.leaseExpiresAt>Date.now()))return false;
   await entry.set({data:{speciesId:event.speciesId,styleVersion,status:'generating',leaseExpiresAt,name,model:'HY-Image-3.0-Plus-4090-Tob-v1.0'}});return true;
  });
  if(!claimed)return {status:'processing',cacheKey};
  try{
   const assetFileId=await (deps.generate||generate)(api,{path:'public-species-watercolors/'+cacheKey+'.jpg',prompt:'自然博物学全幅水彩手绘插画，物种：'+name+'。忠实保留物种结构和辨识特征，完整主体，细腻颜料与纸纹，自然生境，丰富层次，无文字无卡框，不是照片。'});
   await doc.update({data:{status:'ready',assetFileId,leaseExpiresAt:0,updatedAt:Date.now()}});return {status:'ready',cacheKey,assetFileId,styleVersion};
  }catch(e){
   const safeCodes=['watercolor_sdk_unavailable','watercolor_model_quota','watercolor_model_permission','watercolor_model_parameter','watercolor_model_failed','watercolor_response_invalid','watercolor_download_failed','watercolor_image_invalid','watercolor_upload_failed'];
   const code=safeCodes.includes(e.message)?e.message:'watercolor_cache_finalize_failed';
   try{await doc.update({data:{status:'failed',code,leaseExpiresAt:0}})}catch(ignore){return fail('watercolor_cache_write_failed')}
   return fail(code)
  }
 }catch(e){return fail('service_unavailable')}
}
module.exports={main};
