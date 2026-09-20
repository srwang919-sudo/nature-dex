// Only confirmed-species enrichment. No credential fallback and no recognition.
let cloud;try{cloud=require('wx-server-sdk');cloud.init({env:cloud.DYNAMIC_CURRENT_ENV})}catch(e){}
const https=require('https');
function request(url,{method='GET',headers={},body}={}){
 return new Promise((resolve,reject)=>{const req=https.request(url,{method,headers},res=>{const chunks=[];let size=0;res.on('data',c=>{size+=c.length;if(size>10*1024*1024)req.destroy(Error('too_large'));else chunks.push(c)});res.on('end',()=>{const bin=Buffer.concat(chunks);resolve({status:res.statusCode,json:()=>JSON.parse(bin.toString()),buffer:()=>bin,type:res.headers['content-type']})})});req.setTimeout(25000,()=>req.destroy(Error('timeout')));req.on('error',reject);if(body)req.write(body);req.end()});
}
async function main(event={},deps={}){
 const fail=code=>({status:'failed',code});
 if(event.action==='recognize')return fail('use_baidu_recognition');
 if(event.consent!==true||event.confirmed!==true)return fail('consent_required');
 const api=deps.cloud||cloud;if(!api)return fail('runtime_unavailable');
 const openid=api.getWXContext().OPENID;if(!openid)return fail('unauthenticated');
 const key=process.env.DASHSCOPE_API_KEY;if(!key)return fail('not_configured');
 const send=deps.request||request,host='https://dashscope.aliyuncs.com',headers={Authorization:'Bearer '+key,'content-type':'application/json'};
 try{
  if(event.action==='species_info'){
   if(!event.name||String(event.name).length>100)return fail('invalid_request');
   const res=await send(host+'/compatible-mode/v1/chat/completions',{method:'POST',headers,body:JSON.stringify({model:process.env.DASHSCOPE_TEXT_MODEL||'qwen-plus',temperature:.2,messages:[{role:'system',content:'为用户已确认的物种提供简短中文科普。仅返回JSON: {"knowledge":"描述","facts":[{"title":"要点","detail":"说明"}]}。不确定则说明待核实，不推断保护等级，不改变物种。'},{role:'user',content:JSON.stringify({name:event.name,latin:event.latin||''})}]})});
   if(res.status>=400)return fail('provider_error');const body=await res.json(),text=body.choices?.[0]?.message?.content||'',match=text.match(/\{[\s\S]*\}/);if(!match)return fail('parse_error');const info=JSON.parse(match[0]);return {status:'ready',info:{knowledge:String(info.knowledge||'').slice(0,500),facts:Array.isArray(info.facts)?info.facts.slice(0,3).map(x=>({title:String(x.title||'').slice(0,80),detail:String(x.detail||'').slice(0,300)})):[]},source:'bailian',reviewRequired:true};
  }
  if(event.action==='generate_submit'){
   if(!event.photoFileId||!event.observationId||!event.speciesId)return fail('invalid_request');
   if(!String(event.photoFileId).startsWith('cloud://')||!String(event.photoFileId).endsWith('/observations/'+openid+'/'+(event.photoObservationId||event.observationId)+'.jpg'))return fail('forbidden');
   const owned=await api.database().collection('assets').where({_openid:openid,fileId:event.photoFileId,observationId:event.photoObservationId||event.observationId}).get();
   if(!owned.data?.length)return fail('forbidden');
   const file=await api.downloadFile({fileID:event.photoFileId});if(!file.fileContent||file.fileContent.length>4*1024*1024)return fail('photo_unavailable');
   const res=await send(host+'/api/v1/services/aigc/image2image/image-synthesis',{method:'POST',headers:{...headers,'X-DashScope-Async':'enable'},body:JSON.stringify({model:process.env.DASHSCOPE_MODEL||'wanx2.1-imageedit',input:{function:'stylization_all',prompt:(event.style==='art_photo'?'保留照片物种真实形态、解剖结构、颜色和可辨识特征，提取主体，艺术摄影构图，柔和自然光，干净背景，不添加文字，不增加或改变物种。此图仅为艺术表达，不作鉴别依据。已确认物种：':'自然博物志手绘水彩，米白背景，不加文字。已确认物种：')+String(event.speciesId).slice(0,100),base_image_url:'data:image/jpeg;base64,'+file.fileContent.toString('base64')},parameters:{n:1}})});
   const body=await res.json(),taskId=body.output?.task_id;if(res.status>=400||!taskId)return fail('provider_error');
   await api.database().collection('aiTasks').add({data:{owner:openid,taskId,observationId:event.observationId,speciesId:event.speciesId,consent:true,createdAt:Date.now()}});
   return {status:'submitted',taskId};
  }
  if(event.action==='generate_poll'){
   if(!/^[a-zA-Z0-9_-]+$/.test(event.taskId||''))return fail('invalid_request');
   const own=await api.database().collection('aiTasks').where({owner:openid,taskId:event.taskId,observationId:event.observationId}).get();
   if(!own.data?.length)return fail('forbidden');
   const res=await send(host+'/api/v1/tasks/'+event.taskId,{headers});const body=await res.json(),out=body.output||{};
   if(res.status>=400)return fail('provider_error');
   if(out.task_status==='SUCCEEDED'){
    let url;try{url=new URL(out.results?.[0]?.url)}catch(e){return fail('invalid_result_url')}
    if(url.protocol!=='https:'||!/(^|\.)aliyuncs\.com$/.test(url.hostname))return fail('invalid_result_url');
    const image=await send(url.href);if(image.status>=400||!/^image\//.test(image.type||''))return fail('download_failed');
    const saved=await api.uploadFile({cloudPath:'generated/'+openid+'/'+event.taskId+'.png',fileContent:await image.buffer()});
    await api.database().collection('assets').add({data:{_openid:openid,fileId:saved.fileID,observationId:event.observationId,purpose:'illustration'}});
    return {status:'ready',assetFileId:saved.fileID};
   }
   return /FAIL|REJECT|CANCEL/.test(out.task_status||'')?fail('safety_rejected'):{status:'processing'};
  }
  return fail('unknown_action');
 }catch(e){return fail(/timeout/.test(e.message)?'timeout':'provider_error')}
}
module.exports={main};
