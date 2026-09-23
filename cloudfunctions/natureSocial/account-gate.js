const {createHash}=require('crypto');
const key=owner=>createHash('sha256').update(owner).digest('hex');
function accountGate(repo,owner){
 const touch=async(store,person,lock)=>{const row=await store.get('accountPrivacy',key(person));if(row&&row.status!=='active')return false;if(lock)await store.put('accountPrivacy',key(person),{owner:person,status:'active',generation:(row?.generation||0)+1});return true};
 const check=async(store,lock=false)=>{if(!await touch(store,owner,lock)){const e=Error('account_erasing');e.code='account_erasing';throw e}};
 const visible=async(store,row,lock)=>{if(!row)return row;const people=[row.owner,row.issuer,row.recipient,row.requester,row.sourceOwner,...(row.members||[])].filter(Boolean);for(const person of new Set(people))if(!await touch(store,person,lock))return undefined;return row};
 const facade=(store,lock=false)=>({
  get:async(c,id)=>visible(store,await store.get(c,id),lock),
  query:async(c,q,n)=>{const rows=await store.query(c,q,n);const result=[];for(const row of rows){const value=await visible(store,row,lock);if(value)result.push(value)}return result},
  put:(...args)=>store.put(...args)
 });
 const transaction=work=>repo.runTransaction(async tx=>{await check(tx,true);return work(facade(tx,true))});
 return {...facade(repo),assertActive:()=>check(repo),runTransaction:transaction,put:(...args)=>transaction(tx=>tx.put(...args))};
}
module.exports={accountGate};
