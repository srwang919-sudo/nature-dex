const allowed=new Set(['recognized','needs_confirmation','unknown','failed']);
const percent=value=>Math.round(Number(value)*100)+'%';
// 置信度要真的显示出来：候选与 top1 都带上百分比文本，确认要求跟随服务端判定。
function classifyRecognition(result,available){
 if(!available)return {status:'unavailable',candidates:[]};
 const status=result&&allowed.has(result.status)?result.status:'failed';
 const ranked=Array.isArray(result&&result.candidates)?result.candidates.filter(item=>item&&item.speciesId&&Number.isFinite(item.confidence)&&item.confidence>=0&&item.confidence<=1).slice().sort((a,b)=>b.confidence-a.confidence):[];
 const candidates=ranked.map(item=>Object.assign({},item,{confidenceText:percent(item.confidence)}));
 const top=candidates[0];
 const safe=require('./recognition-errors');
 return {status,candidates,requiresConfirmation:status==='needs_confirmation',
  ...(top?{confidence:top.confidence,confidenceText:top.confidenceText}:{}),
  ...(status==='failed'?{code:safe.safeCode(result),providerCode:Number.isInteger(result&&result.providerCode)?result.providerCode:undefined}:{})};
}
module.exports={classifyRecognition};
