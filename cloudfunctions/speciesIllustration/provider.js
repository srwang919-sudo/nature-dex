const https=require('https'),dns=require('dns').promises,net=require('net');
const MODEL='HY-Image-3.0-Plus-4090-Tob-v1.0';
function safeSummary(error={}){
 const redact=value=>String(value||'').replace(/https?:\/\/[^\s"'<>]+/gi,'[url]').replace(/(?:bearer\s+)[^\s"',;]+/gi,'[credential]').replace(/(?:api[_-]?key|secret(?:[_-]?key)?|access[_-]?token|token|authorization|password)\s*[:=]\s*["']?[^\s"',;}]+/gi,'[credential]').replace(/\b(?:sk-[A-Za-z0-9_-]+|eyJ[A-Za-z0-9_.-]+|[A-Za-z0-9_-]{40,})\b/g,'[redacted]').slice(0,200);
 return {code:redact(error.errCode||error.code),httpStatus:Number(error.statusCode||error.status||error.response?.status)||undefined,message:redact(error.message||error.errMsg)};
}
function imageBytes(value){const b=Buffer.from(value||[]);if(!b.length||b.length>10*1024*1024)throw Error('image_invalid');return b}
function isImage(b){return b.length>8&&(b[0]===255&&b[1]===216&&b[2]===255||b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))}
async function download(url){
 const u=new URL(url);if(u.protocol!=='https:'||u.username||u.password||u.port&&u.port!=='443'||net.isIP(u.hostname))throw Error('invalid_result');
 const addresses=await dns.resolve4(u.hostname);
 const forbidden=ip=>/^(0|10|127|169\.254|192\.168|172\.(1[6-9]|2\d|3[01])|224|240)\./.test(ip);
 if(!addresses.length||addresses.some(forbidden))throw Error('invalid_result');
 return new Promise((resolve,reject)=>{const request=https.get(u,{lookup:(host,opts,cb)=>cb(null,addresses[0],4)},response=>{
  if(response.statusCode!==200){response.resume();reject(Error('download_failed'));return}
  const chunks=[];let size=0;response.on('data',part=>{size+=part.length;if(size>10*1024*1024)request.destroy(Error('image_too_large'));else chunks.push(part)});
  response.on('error',reject);response.on('end',()=>{const b=Buffer.concat(chunks);if(!isImage(b))reject(Error('invalid_result'));else resolve(b)});
 });request.setTimeout(30000,()=>request.destroy(Error('timeout')));request.on('error',reject)});
}
async function generate(cloud,{prompt,path},deps={}){
 let response;
 if(typeof cloud.ai!=='function')throw Error('watercolor_sdk_unavailable');
 try{response=await cloud.ai().createImageModel('hunyuan-image').generateImage({model:MODEL,prompt,size:'720x1280',revise:{value:true}})}
 catch(e){
  console.error('WATERCOLOR_MODEL_DIAGNOSTIC',JSON.stringify(safeSummary(e)));
  const hint=String(e.code||e.errCode||'')+' '+String(e.message||'');
  const code=/quota|balance|insufficient|欠费|额度/i.test(hint)?'watercolor_model_quota':/permission|unauthoriz|access.denied|forbidden|权限/i.test(hint)?'watercolor_model_permission':/invalid.param|parameter|参数/i.test(hint)?'watercolor_model_parameter':'watercolor_model_failed';
  throw Error(code);
 }
 const url=response&&response.data&&response.data[0]&&response.data[0].url;if(!url)throw Error('watercolor_response_invalid');
 let output;try{output=await (deps.download||download)(url)}catch(e){throw Error('watercolor_download_failed')}
 if(!isImage(output))throw Error('watercolor_image_invalid');
 let saved;try{saved=await cloud.uploadFile({cloudPath:path,fileContent:output})}catch(e){throw Error('watercolor_upload_failed')}
 if(!saved.fileID)throw Error('watercolor_upload_failed');
 return saved.fileID;
}
module.exports={MODEL,generate,isImage,safeSummary};
