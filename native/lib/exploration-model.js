function buildExploration(cards,targetIds,nowMs){
  const real=cards.filter(c=>c&&!c.sample&&c.kind!=='example');
  const targets=new Set(targetIds.filter(Boolean)),seen=new Set(real.map(c=>c.speciesId));
  const found=[...targets].filter(id=>seen.has(id)).length,total=targets.size;
  const day=new Date(nowMs).toDateString();
  const today=real.filter(c=>c.createdAt&&Number.isFinite(new Date(c.createdAt).getTime())&&new Date(c.createdAt).toDateString()===day).map((card,index)=>({card,index})).sort((a,b)=>new Date(b.card.createdAt)-new Date(a.card.createdAt)||b.index-a.index).map(x=>x.card);
  const kind=total===found?'complete':real.length?'next':'first';
  const title={first:'收录第一次遇见',next:'发现本章一种新物种',complete:'本章已完成，继续记录新的遇见'}[kind];
  return {found,total,today,task:{kind,title,current:kind==='first'?0:found,total:kind==='first'?1:total,complete:kind==='complete'}};
}
module.exports={buildExploration};
