let cloud;try{cloud=require('wx-server-sdk');cloud.init({env:cloud.DYNAMIC_CURRENT_ENV})}catch(e){}
const https=require('https');
const SPECIES={翠鸟:'kingfisher',普通翠鸟:'kingfisher',白鹭:'egret',朱鹮:'ibis',红腹锦鸡:'pheasant',锦鸡:'pheasant',麻雀:'sparrow',山茶:'camellia',绿尾大蚕蛾:'moth'};
function request(url,{method='GET',headers={},body}={}){
 const payload=body===undefined||body===null?null:Buffer.isBuffer(body)?body:Buffer.from(String(body),'utf8');
 if(payload)headers={...headers,'Content-Length':String(payload.length)};
 return new Promise((resolve,reject)=>{const req=https.request(url,{method,headers},res=>{const chunks=[];let n=0;res.on('data',c=>{n+=c.length;if(n>12*1024*1024)req.destroy(Error('too_large'));else chunks.push(c)});res.on('end',()=>{const bin=Buffer.concat(chunks);resolve({status:res.statusCode,headers:{get:k=>res.headers[k]},json:()=>JSON.parse(bin.toString()),buffer:async()=>bin})})});req.setTimeout(25000,()=>req.destroy(Error('timeout')));req.on('error',reject);req.end(payload)});
}
function imageForm(content){
 const image=Buffer.isBuffer(content)?content:ArrayBuffer.isView(content)?Buffer.from(content.buffer,content.byteOffset,content.byteLength):content instanceof ArrayBuffer?Buffer.from(content):null;
 if(!image||!image.length||image.length>4*1024*1024)throw Error('invalid image');
 const body=new URLSearchParams({image:image.toString('base64'),top_num:'5'}).toString();
 return {method:'POST',headers:{'content-type':'application/x-www-form-urlencoded','Content-Length':String(Buffer.byteLength(body,'utf8'))},body};
}
function normalizeRecognition(payload={}){
 const candidates=(payload.candidates||[]).map(x=>{const confidence=Number(x.confidence??x.score);if(!Number.isFinite(confidence)||confidence<0||confidence>1)throw Error('invalid confidence');const name=String(x.name||x.keyword||'').trim();return {speciesId:x.speciesId||SPECIES[name]||name,name,confidence,source:'baidu',category:x.category||'other'}}).filter(x=>x.speciesId&&!/非动物|非植物|无法识别|非生物/.test(x.name)).sort((a,b)=>b.confidence-a.confidence).slice(0,5);
 if(!candidates.length)return {status:'unknown',candidates:[]};
 return {status:candidates[0].confidence>=.86?'recognized':'needs_confirmation',candidates};
}
async function main(event={},deps={}){
 const fail=(code,providerCode)=>({status:'failed',code,candidates:[],contractVersion:2,...(Number.isInteger(providerCode)?{providerCode}:{})});
 if(event.consent!==true)return fail('consent_required');
 if(!/^[a-zA-Z0-9_-]{1,100}$/.test(event.observationId||''))return fail('invalid_request');
 const api=deps.cloud||cloud;if(!api)return fail('runtime_unavailable');
 let openid;try{openid=api.getWXContext().OPENID}catch(e){return fail('unauthenticated')}if(!openid)return fail('unauthenticated');
 if(!process.env.BAIDU_API_KEY||!process.env.BAIDU_SECRET_KEY)return fail('not_configured');
 const cloudPath='observations/'+openid+'/'+event.observationId+'.jpg';
 if(event.action==='upload_ticket')return {status:'ready',cloudPath,contractVersion:2};
 if(!event.photoFileId||!event.idempotencyKey)return fail('invalid_request');
 if(!String(event.photoFileId).startsWith('cloud://')||!String(event.photoFileId).endsWith('/'+cloudPath))return fail('forbidden');
 if(event.action==='register_asset'){
  if(event.cloudPath!==cloudPath||event.purpose!=='recognition'||Object.prototype.hasOwnProperty.call(event,'owner')||Object.prototype.hasOwnProperty.call(event,'_openid'))return fail('forbidden');
  let registrationStage='photo_download';
  try{
   const file=await api.downloadFile({fileID:event.photoFileId});
   if(!file.fileContent||file.fileContent.length>4*1024*1024)return fail('photo_unavailable');
   registrationStage='asset_registry';
   const id=require('crypto').createHash('sha256').update(openid+'\n'+event.photoFileId).digest('hex');
   await api.database().collection('assets').doc(id).set({data:{_openid:openid,fileId:event.photoFileId,cloudPath,observationId:event.observationId,purpose:'recognition',registeredAt:Date.now()}});
   return {status:'registered',contractVersion:2};
  }catch(e){return fail(registrationStage)}
 }
 let stage='asset_registry';
 try{
  const owner=await api.database().collection('assets').where({_openid:openid,fileId:event.photoFileId,observationId:event.observationId,purpose:'recognition'}).get();
  if(!owner.data||!owner.data.length)return fail('forbidden');
  stage='photo_download';const file=await api.downloadFile({fileID:event.photoFileId});
  if(!file.fileContent||file.fileContent.length>4*1024*1024)return fail('photo_unavailable');
  const send=deps.request||request;
  stage='provider_auth_failed';const auth=await send('https://aip.baidubce.com/oauth/2.0/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'client_credentials',client_id:process.env.BAIDU_API_KEY,client_secret:process.env.BAIDU_SECRET_KEY}).toString()});
  const token=await auth.json();if(auth.status>=400||!token.access_token)return fail('provider_auth_failed');
  const kinds=event.kind==='plant'?['plant']:event.kind==='animal'?['animal']:['animal','plant'];
  stage='provider_error';
  const responses=await Promise.all(kinds.map(async kind=>{try{
   const res=await send('https://aip.baidubce.com/rest/2.0/image-classify/v1/'+kind+'?access_token='+encodeURIComponent(token.access_token),imageForm(file.fileContent));
   const body=await res.json();if(res.status>=400||body.error_code){const n=Number(body.error_code);return {failure:fail(baiduErrorCode(n),n)}}
   if(!Array.isArray(body.result))return {failure:fail('provider_response')};
   return {rows:body.result.map(x=>({...x,category:kind==='plant'?'plant':'animal'}))};
  }catch(e){return {failure:fail(/timeout/i.test(e.message||'')?'timeout':'provider_response')}}}));
  const warnings=responses.filter(x=>x.failure).map(x=>x.failure),rows=responses.flatMap(x=>x.rows||[]);
  if(!rows.length&&warnings.length)return warnings[0];
  const result=normalizeRecognition({candidates:rows});
  if(warnings.length&&result.candidates.length)result.status='needs_confirmation';
  return {...result,contractVersion:2,...(warnings.length?{warnings}: {})};
 }catch(e){return fail(/timeout/i.test(e.message||'')?'timeout':stage)}
}
function baiduErrorCode(n){if(n===216101)return 'provider_missing_parameter';if(n===6)return 'provider_permission';if(n===17||n===19)return 'provider_quota';if(n===18)return 'provider_rate_limit';if(n===110||n===111)return 'provider_token';if([216200,216201,216202,216203].includes(n))return 'provider_image';return 'provider_error'}
module.exports={main,normalizeRecognition,request,baiduErrorCode,imageForm};
