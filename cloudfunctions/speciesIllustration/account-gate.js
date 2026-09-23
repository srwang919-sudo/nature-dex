const {createHash}=require('crypto');
const accountKey=owner=>createHash('sha256').update(owner).digest('hex');
async function assertActive(db,owner){
 if(!owner)throw Error('unauthenticated');
 let row;try{row=(await db.collection('accountPrivacy').doc(accountKey(owner)).get()).data}catch(e){const message=e.message||e.errMsg||'';if(!/collection/i.test(message)&&/not exist|not found|DATABASE_DOCUMENT_NOT_EXIST/i.test(message))return;throw e}
 if(row)throw Error('account_erasing');
}
function guardDatabase(db,owner){
 const transaction=work=>db.runTransaction(async tx=>{await assertActive(tx,owner);return work(tx)});
 return {assertActive:()=>assertActive(db,owner),runTransaction:transaction,collection(name){
  const target=db.collection(name);
  return {where:filter=>target.where(filter),doc(id){const doc=target.doc(id);return {get:()=>doc.get(),set:data=>transaction(tx=>tx.collection(name).doc(id).set(data)),update:data=>transaction(tx=>tx.collection(name).doc(id).update(data)),remove:()=>transaction(tx=>tx.collection(name).doc(id).remove())}}};
 }};
}
module.exports={guardDatabase,assertActive,accountKey};
