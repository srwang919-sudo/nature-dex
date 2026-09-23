const {createHash}=require('crypto');
const accountKey=owner=>createHash('sha256').update(owner).digest('hex');
async function assertActive(db,owner,lock=false){
 if(!owner)throw Error('unauthenticated');
 const doc=db.collection('accountPrivacy').doc(accountKey(owner));let row;
 try{row=(await doc.get()).data}catch(e){const message=e.message||e.errMsg||'';if(/collection/i.test(message)||!/not exist|not found|DATABASE_DOCUMENT_NOT_EXIST/i.test(message))throw e}
 if(row&&row.status!=='active')throw Error('account_erasing');
 if(lock)await doc.set({data:{owner,status:'active',generation:(row?.generation||0)+1}});
}
function guardDatabase(db,owner){
 const transaction=work=>db.runTransaction(async tx=>{await assertActive(tx,owner,true);return work(tx)});
 return {assertActive:()=>assertActive(db,owner),runTransaction:transaction,collection(name){
  const target=db.collection(name);
  return {where:filter=>target.where(filter),doc(id){const doc=target.doc(id);return {get:()=>doc.get(),set:data=>transaction(tx=>tx.collection(name).doc(id).set(data)),update:data=>transaction(tx=>tx.collection(name).doc(id).update(data)),remove:()=>transaction(tx=>tx.collection(name).doc(id).remove())}}};
 }};
}
module.exports={guardDatabase,assertActive,accountKey};
