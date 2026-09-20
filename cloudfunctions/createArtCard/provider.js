const https=require('https'),dns=require('dns').promises,net=require('net');
const MODEL='HY-Image-v3.0-I2I-ToB-v1.0.1';
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
async function generate(cloud,{reference,prompt,path},deps={}){
 const bytes=imageBytes(reference);
 if(!isImage(bytes))throw Error('image_invalid');
 const response=await cloud.ai().createImageModel('hunyuan-image').generateImage({model:MODEL,images:[bytes.toString('base64')],prompt,size:'720x1280',revise:{value:true}});
 const url=response&&response.data&&response.data[0]&&response.data[0].url;if(!url)throw Error('invalid_result');
 const output=await (deps.download||download)(url);if(!isImage(output))throw Error('invalid_result');
 const saved=await cloud.uploadFile({cloudPath:path,fileContent:output});if(!saved.fileID)throw Error('upload_failed');
 return saved.fileID;
}
module.exports={MODEL,generate,isImage};
