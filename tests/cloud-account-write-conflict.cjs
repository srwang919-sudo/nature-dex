const test=require('node:test'),assert=require('node:assert/strict');
// Snapshot reads do not conflict: only keys in both transactions' write sets do.
function database(){const rows=new Map(),versions=new Map();const store=(snapshot,writes)=>({collection:c=>({doc:id=>{const k=c+'/'+id;return {get:async()=>{if(!snapshot.has(k))throw Error('not found');return {data:snapshot.get(k)}},set:async({data})=>writes.set(k,data)}}})});const db=store(rows,new Map());db.runTransaction=async fn=>{const snapshot=new Map(rows),base=new Map(versions),writes=new Map();const result=await fn(store(snapshot,writes));for(const k of writes.keys())if((versions.get(k)||0)!==(base.get(k)||0))throw Error('transaction_conflict');for(const [k,v]of writes){rows.set(k,v);versions.set(k,(versions.get(k)||0)+1)}return result};return {db,rows};}
test('writer then erasure conflicts on shared guard; retry and reverse order reject',async()=>{
 for(const name of ['recognizeObservation','createArtCard','speciesIllustration']){
  const {db,rows}=database(),{guardDatabase,accountKey}=require('../cloudfunctions/'+name+'/account-gate'),guard=guardDatabase(db,'me');
  let enter,release;const started=new Promise(r=>enter=r),wait=new Promise(r=>release=r);
  const writing=guard.runTransaction(async tx=>{enter();await wait;await tx.collection('private').doc('row').set({data:{owner:'me'}})});
  await started;await db.runTransaction(tx=>tx.collection('accountPrivacy').doc(accountKey('me')).set({data:{owner:'me',status:'erasing'}}));release();
  await assert.rejects(writing,/transaction_conflict/);assert.equal(rows.has('private/row'),false);
  await assert.rejects(guard.runTransaction(tx=>tx.collection('private').doc('row').set({data:{}})),/account_erasing/);
 }
});
function repository(db){const facade=store=>({get:async(c,id)=>{try{return (await store.collection(c).doc(id).get()).data}catch(e){if(/not found/.test(e.message))return;throw e}},put:(c,id,data)=>store.collection(c).doc(id).set({data}),query:async()=>[]});return {...facade(db),runTransaction:work=>db.runTransaction(tx=>work(facade(tx)))};}
test('social transaction writes both identity guards before sharing',async()=>{
 const {db,rows}=database(),{accountGate}=require('../cloudfunctions/natureSocial/account-gate'),{accountKey}=require('../cloudfunctions/createArtCard/account-gate');
 rows.set('relations/r',{members:['alice','bob']});const guarded=accountGate(repository(db),'alice');let enter,release;const started=new Promise(r=>enter=r),wait=new Promise(r=>release=r);
 const writer=guarded.runTransaction(async tx=>{await tx.get('relations','r');enter();await wait;await tx.put('shares','s',{owner:'alice',recipient:'bob'})});
 await started;await db.runTransaction(tx=>tx.collection('accountPrivacy').doc(accountKey('bob')).set({data:{owner:'bob',status:'erasing'}}));release();
 await assert.rejects(writer,/transaction_conflict/);assert.equal(rows.has('shares/s'),false);
 assert.equal(await guarded.get('relations','r'),undefined);
});
test('membership reservation conflicts with erasure before any provider payment request',async()=>{
 const {db,rows}=database(),{accountKey}=require('../cloudfunctions/createArtCard/account-gate');const repo=repository(db);let enter,release,calls=0;const started=new Promise(r=>enter=r),wait=new Promise(r=>release=r),transaction=repo.runTransaction;
 repo.runTransaction=work=>transaction(async tx=>{const result=await work(tx);enter();await wait;return result});
 const service=require('../cloudfunctions/natureMembership/lib/core').createMembershipService({repo,config:{},gateway:{createJsapiOrder:async()=>calls++}});
 const writer=service.createPayment('me',{action:'createPayment',planId:'monthly',idempotencyKey:'checkout-once'});
 await started;await db.runTransaction(tx=>tx.collection('accountPrivacy').doc(accountKey('me')).set({data:{owner:'me',status:'erasing'}}));release();await assert.rejects(writer,/transaction_conflict/);
 assert.equal(calls,0);assert.equal([...rows.keys()].some(k=>k.startsWith('membershipOrders/')),false);
});
