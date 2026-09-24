const missing=/^(资料尚未补充|资料暂缺|暂无评估资料|资料未提供|未知)$/;
const clean=v=>typeof v==='string'&&!missing.test(v.trim())?v.trim():'';
function scienceView(card={}){
 const snapshot=card.scienceSnapshot||{},summary=clean(snapshot.summary),facts=(Array.isArray(card.facts)?card.facts:[]).map(f=>({title:clean(f?.title),detail:clean(f?.detail)})).filter(f=>f.title&&f.detail);
 const rows=[['分类',card.family],['栖息环境',card.habitat],['可见季节',card.season],['IUCN 评估',card.iucn],['中国保护信息',card.protection]].map(([label,value])=>({label,value:clean(value)})).filter(r=>r.value);
 const knowledge=clean(card.knowledge||card.know)===summary?'':clean(card.knowledge||card.know),stats=(Array.isArray(card.stats)?card.stats:[]).map(s=>({label:clean(s?.label),value:clean(s?.value)})).filter(s=>s.label&&s.value);
 const available=!!(summary||knowledge||facts.length||rows.length||stats.length),baidu=snapshot.source?.provider==='baidu';
 const sourceUrl=baidu&&/^https:\/\/baike\.baidu\.com\/item\/[^\s?#@\\<>]+$/u.test(snapshot.source.url||'')?snapshot.source.url:'';
 return {available,summary,knowledge,facts,rows,stats,sourceLabel:available?(baidu?'百度百科摘要 · 仅供参考':'项目物种资料 · 仅供参考'):'',sourceUrl};
}
module.exports={scienceView};
