const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const root=path.join(__dirname,'..');
const dirs=['recognizeObservation','speciesIllustration','createArtCard'];
const digest=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');

test('the cost config module stays byte-identical across every cloud function that bills AI',()=>{
 const hashes=dirs.map(d=>digest(path.join(root,'cloudfunctions',d,'cost-config.js')));
 assert.equal(new Set(hashes).size,1,'cost-config must not drift between functions');
 const source=fs.readFileSync(path.join(root,'cloudfunctions/recognizeObservation/cost-config.js'),'utf8');
 assert.match(source,/baiduPlant:0\.0029/);
 assert.match(source,/baiduAnimal:0\.001/);
 assert.match(source,/hunyuan:0\.20/);
 assert.doesNotMatch(source,/console\.log/);
});

test('cost precedence is defaults < environment < aiCostConfig document, with honest fallbacks',async()=>{
 const {loadCostConfig,envCostConfig,normalize,resetCostCache,DEFAULTS}=require('../cloudfunctions/recognizeObservation/cost-config');
 delete process.env.NATURE_BAIDU_PLANT_COST;delete process.env.NATURE_BAIDU_ANIMAL_COST;delete process.env.NATURE_HUNYUAN_COST;resetCostCache();
 assert.deepEqual(envCostConfig(),{baiduPlant:0.0029,baiduAnimal:0.001,hunyuan:0.20});
 assert.deepEqual(DEFAULTS,{baiduPlant:0.0029,baiduAnimal:0.001,hunyuan:0.20});

 process.env.NATURE_HUNYUAN_COST='0.35';resetCostCache();
 assert.equal(envCostConfig().hunyuan,0.35);
 const db={collection:()=>({doc:()=>({get:async()=>({data:{costs:{hunyuan:0.5,baiduPlant:-1,baiduAnimal:'nope'}}})})})};
 const merged=await loadCostConfig(db,1);
 assert.equal(merged.hunyuan,0.5,'admin document wins over env');
 assert.equal(merged.baiduPlant,0.0029,'invalid remote value falls back instead of becoming negative');
 assert.equal(merged.baiduAnimal,0.001);

 const broken={collection:()=>({doc:()=>({get:async()=>{throw Error('collection not exists')}})})};
 resetCostCache();
 const fallback=await loadCostConfig(broken,2);
 assert.equal(fallback.hunyuan,0.35,'unreadable document keeps the environment value');
 assert.equal(normalize(null,{...DEFAULTS}).hunyuan,0.20);
 delete process.env.NATURE_HUNYUAN_COST;resetCostCache();
});

test('the transaction-safe getter never awaits and never returns undefined',()=>{
 delete process.env.NATURE_HUNYUAN_COST;
 const {cachedCostConfig,resetCostCache}=require('../cloudfunctions/speciesIllustration/cost-config');
 resetCostCache();
 const value=cachedCostConfig();
 assert.equal(typeof value,'object');
 assert.equal(value.hunyuan,0.20);
 assert.equal(Number.isFinite(value.baiduPlant),true);
});

test('recognition ledger bills the configured price and never blocks the pipeline',async()=>{
 const {recordRecognition,baiduCost,modelOf}=require('../cloudfunctions/recognizeObservation/usage-ledger');
 const {resetCostCache}=require('../cloudfunctions/recognizeObservation/cost-config');
 delete process.env.NATURE_BAIDU_PLANT_COST;delete process.env.NATURE_BAIDU_ANIMAL_COST;resetCostCache();
 assert.equal(baiduCost('plant'),0.0029);
 assert.equal(baiduCost('animal'),0.001);
 assert.equal(baiduCost('general'),(0.0029+0.001)/2);
 assert.equal(modelOf('plant'),'image-classify-plant');
 assert.equal(modelOf('unknown'),'image-classify-general');

 const written=[];
 const db={collection:()=>({doc:id=>({set:async({data})=>written.push({id,data})})}),};
 resetCostCache();
 const row=await recordRecognition(db,{owner:'u1',operationId:'obs1',kind:'plant',status:'success',durationMs:1234,now:5});
 assert.equal(row.cost,0.0029);
 assert.equal(row.provider,'baidu');
 assert.equal(row.model,'image-classify-plant');
 assert.equal(row.durationMs,1234);
 assert.equal(written[0].data.cost,0.0029);
 assert.equal(crypto.createHash('sha256').update('u1|obs1|baidu|1').digest('hex'),written[0].id);

 const failing={collection:()=>({doc:()=>({set:async()=>{throw Error('write failed')}})})};
 const survived=await recordRecognition(failing,{owner:'u1',operationId:'obs2',kind:'animal',status:'error',error:'timeout',now:6});
 assert.equal(survived.cost,0.001);
 assert.equal(survived.error,'timeout');
});

test('creation wallet bills hunyuan from the shared config at commit time, zero at reserve',async()=>{
 process.env.NATURE_HUNYUAN_COST='0.42';
 const {resetCostCache}=require('../cloudfunctions/createArtCard/cost-config');
 resetCostCache();
 const {reserveCreation,settleCreation}=require('../cloudfunctions/createArtCard/creation-wallet');
 const rows=new Map();
 const tx={collection:c=>({doc:id=>({async get(){if(!rows.has(c+'/'+id))throw Error('DATABASE_DOCUMENT_NOT_EXIST');return {data:structuredClone(rows.get(c+'/'+id))}},async set({data}){rows.set(c+'/'+id,structuredClone(data))}})})};
 const now=Date.UTC(2026,8,1),args={owner:'a',operationId:'op1',now};
 const row=await reserveCreation(tx,args);
 const reserved=rows.get('aiUsageEvents/'+require('crypto').createHash('sha256').update('a|op1').digest('hex')+'_'+row.attempt);
 assert.equal(reserved.cost,0,'a reservation must not bill');
 assert.equal(reserved.model,'HY-Image-3.0-Plus-4090-Tob-v1.0');
 await settleCreation(tx,{...args,attempt:row.attempt,outcome:'commit'});
 const settled=rows.get('aiUsageEvents/'+require('crypto').createHash('sha256').update('a|op1').digest('hex')+'_'+row.attempt);
 assert.equal(settled.cost,0.42,'commit bills the configured hunyuan price');
 assert.equal(settled.units,1);
 delete process.env.NATURE_HUNYUAN_COST;resetCostCache();
});
