const {createHash}=require('crypto');
const DEFAULTS={art:3,watercolor:3,recognition:20,upload:20};
async function reserveQuota(tx,owner,kind,now=Date.now()){
 const fallback=DEFAULTS[kind];if(!fallback||!owner)throw Error('quota_unavailable');
 const raw=Number(process.env['NATURE_'+kind.toUpperCase()+'_DAILY_LIMIT']);
 const limit=Number.isSafeInteger(raw)&&raw>=0&&raw<=100?raw:fallback;
 const day=new Date(now).toISOString().slice(0,10),key=createHash('sha256').update(owner+'|'+kind+'|'+day).digest('hex'),doc=tx.collection('usageQuotas').doc(key);
 let old;try{old=(await doc.get()).data}catch(e){if(!/not exist|not found|DATABASE_DOCUMENT_NOT_EXIST/i.test(e.message||e.errMsg||''))throw Error('quota_unavailable')}
 if((old?.count||0)>=limit)throw Error('daily_limit');
 await doc.set({data:{owner,kind,day,count:(old?.count||0)+1,updatedAt:now}});
}
module.exports={reserveQuota};
