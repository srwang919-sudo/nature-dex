const assert=require('node:assert/strict');
const {createRequire}=require('node:module');
const path=require('node:path');
const functions=['recognizeObservation','createArtCard','speciesIllustration','deleteObservationAssets','cleanupObservationAssets','initCollections'];
(async()=>{for(const name of functions){
 const requireCloud=createRequire(path.resolve(__dirname,'../cloudfunctions',name,'package.json'));
 const cloud=requireCloud('./sdk');
 const requireDatabase=createRequire(requireCloud.resolve('@cloudbase/database'));
 const set=requireDatabase('lodash.set'),unset=requireDatabase('lodash.unset');
 const object={};set(object,'birds[0].name','ibis');assert.equal(object.birds[0].name,'ibis');assert.equal(unset(object,['birds','0','name']),true);assert.equal(object.birds[0].name,undefined);
 for(const unsafe of ['__proto__.naturePolluted',['__proto__','naturePolluted'],'constructor.prototype.naturePolluted',['constructor','prototype','naturePolluted']]){
  try{set({},unsafe,'unsafe');assert.equal({}.naturePolluted,undefined,'prototype mutation blocked: '+name)}finally{delete Object.prototype.naturePolluted}
 }
 const sentinel='keep';Object.prototype.natureSentinel=sentinel;
 try{unset({},['constructor','prototype','natureSentinel']);assert.equal(Object.prototype.natureSentinel,sentinel)}finally{delete Object.prototype.natureSentinel}
 assert.equal(typeof set.default,'function');assert.equal(typeof unset.default,'function');
 cloud.init({env:'local-contract-test'});
 const db=cloud.database();assert.equal(typeof db.runTransaction,'function');assert.equal(typeof db.collection('assets').doc('contract').get,'function');assert.equal(typeof db.collection('assets').where({_openid:'fixture'}).limit(1).get,'function');
 const {Db}=requireCloud('@cloudbase/database'),originalRequest=Db.reqClass,actions=[];
 Db.reqClass=class {async send(action){actions.push(action);return {transactionId:'offline-transaction'}}};
 try{
  const result=await db.runTransaction(async tx=>{assert.equal(typeof tx.collection('assets').doc('id').set,'function');return 'committed-offline'});
  assert.equal(result,'committed-offline');assert.deepEqual(actions,['database.startTransaction','database.commitTransaction']);
  actions.length=0;await assert.rejects(db.runTransaction(async()=>{throw Error('offline abort')},0),/offline abort/);assert.ok(actions.includes('database.abortTransaction'));
 }finally{Db.reqClass=originalRequest}
 assert.equal(requireCloud('axios/package.json').version,'0.33.0');
 console.log('PASS safe lodash mutation and CloudBase API construction:',name);
}
console.log('Only an injected offline transaction transport was used; no provider/network/database request.');
})().catch(e=>{console.error(e);process.exitCode=1});
