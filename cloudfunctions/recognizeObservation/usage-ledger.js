// AI 用量账本（Master Plan §8 / §47 / §111-112 补强）。
// 复用 aiUsageEvents 集合，为识别链路（baidu）补 provider/model/cost/durationMs/error 明细。
// 成本来自 cost-config（默认值 < 环境变量 < 后台 aiCostConfig/main）。
const {createHash}=require('crypto');
const {loadCostConfig,cachedCostConfig}=require('./cost-config');
const key=x=>createHash('sha256').update(x).digest('hex');
const MODEL=Object.freeze({plant:'image-classify-plant',animal:'image-classify-animal',general:'image-classify-general'});
function modelOf(kind){return MODEL[kind]||MODEL.general}
function baiduCost(kind,costs=cachedCostConfig()){
 if(kind==='plant')return costs.baiduPlant;
 if(kind==='animal')return costs.baiduAnimal;
 return (costs.baiduPlant+costs.baiduAnimal)/2; // generalOnly / 混合按均值估算
}
// 记录一次识别调用。attempt 用于同一 operationId 下多次尝试的幂等区分。
async function recordRecognition(db,{owner,operationId,attempt=1,kind,status,durationMs,error,now=Date.now()}){
 if(!owner||!operationId)return;
 const id=key(owner+'|'+operationId+'|baidu|'+attempt);
 let costs=cachedCostConfig();
 try{costs=await loadCostConfig(db,now)}catch(e){/* 配置读取失败沿用已知值 */}
 const row={owner,operationId,provider:'baidu',model:modelOf(kind),attempt,status,kind,cost:baiduCost(kind,costs),durationMs:Number.isFinite(durationMs)?durationMs:undefined,error:error?String(error).slice(0,120):undefined,createdAt:now};
 try{await db.collection('aiUsageEvents').doc(id).set({data:row})}catch(e){/* 账本失败不影响主流程 */}
 return row;
}
module.exports={recordRecognition,baiduCost,modelOf};
