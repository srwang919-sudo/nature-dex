const {createHash}=require('crypto');
const key=owner=>createHash('sha256').update(owner).digest('hex');
function accountGate(repo,owner){
 const check=async store=>{if(await store.get('accountPrivacy',key(owner))){const e=Error('account_erasing');e.code='account_erasing';throw e}};
 const visible=async(store,row)=>{if(!row)return row;const people=[row.owner,row.issuer,row.recipient,row.requester,row.sourceOwner,...(row.members||[])].filter(Boolean);for(const person of new Set(people))if(await store.get('accountPrivacy',key(person)))return undefined;return row};
 const facade=store=>({
  get:async(c,id)=>visible(store,await store.get(c,id)),
  query:async(c,q,n)=>{const rows=await store.query(c,q,n);return (await Promise.all(rows.map(row=>visible(store,row)))).filter(Boolean)},
  put:(...args)=>store.put(...args)
 });
 const transaction=work=>repo.runTransaction(async tx=>{await check(tx);return work(facade(tx))});
 return {...facade(repo),assertActive:()=>check(repo),runTransaction:transaction,put:(...args)=>transaction(tx=>tx.put(...args))};
}
module.exports={accountGate};
