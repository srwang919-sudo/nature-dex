const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const {printAdmin,isOperator,manifestCsv,CARRIERS}=require('../cloudfunctions/printAdmin/core');
const hash=v=>crypto.createHash('sha256').update(v).digest('hex');

function fixture({conflicts=0}={}){
 const rows=new Map();let pending=conflicts;
 const builder=name=>{
  const state={cond:null,field:null,dir:'asc',offset:0,limit:20};
  const api={
   where(cond){state.cond=cond;return api},
   orderBy(field,dir){state.field=field;state.dir=dir;return api},
   skip(n){state.offset=n;return api},
   limit(n){state.limit=n;return api},
   async get(){
    let list=[...rows.entries()].filter(([k])=>k.startsWith(name+'/')).map(([k,v])=>({_id:k.slice(name.length+1),...structuredClone(v)}));
    if(state.cond)list=list.filter(row=>Object.keys(state.cond).every(k=>row[k]===state.cond[k]));
    if(state.field)list.sort((a,b)=>{const x=a[state.field],y=b[state.field];const r=x<y?-1:x>y?1:0;return state.dir==='desc'?-r:r});
    return {data:list.slice(state.offset,state.offset+state.limit)};
   }
  };
  return api;
 };
 const collection=name=>({
  ...builder(name),
  doc:id=>({
   async get(){if(!rows.has(name+'/'+id))throw Error('DATABASE_DOCUMENT_NOT_EXIST');return {data:structuredClone(rows.get(name+'/'+id))}},
   async set({data}){rows.set(name+'/'+id,structuredClone(data))}
  })
 });
 const db={
  collection,
  rows,
  async runTransaction(fn){
   const value=await fn({collection});
   if(pending>0){pending--;throw Object.assign(Error('DATABASE_TRANSACTION_CONFLICT'),{code:'DATABASE_TRANSACTION_CONFLICT'})}
   return value;
  }
 };
 return db;
}
const DRAFT_ID=hash('draft|u1|1');
function seedDraft(db,items=24){
 db.rows.set('printOrderDrafts/'+DRAFT_ID,{owner:'u1',status:'draft',paymentStatus:'not_configured',productionStatus:'not_submitted',sku:{id:'nature-24-v1',currency:'CNY',totalFen:5990},quoteHash:hash('quote'),createdAt:1000,items:Array.from({length:items},(_,i)=>({cardId:hash('c'+i),position:i+1,speciesId:'sp'+i,name:'物种, "'+i+'"',number:i+1,kind:'original_observation',originalDiscoverer:'观察者',giftedFrom:'',frontAsset:'cloud://env/art/'+i+'.png',backAsset:'cloud://env/observations/u1/'+i+'.jpg',speciesName:'x'}))});
}
const ORDER_ID=hash('print-order|'+DRAFT_ID);

test('fulfilment is denied by default and only an allowlisted operator gets through',async()=>{
 delete process.env.NATURE_ADMIN_OPENIDS;
 assert.equal(isOperator('u1'),false);
 await assert.rejects(printAdmin({db:fixture(),owner:'u1',event:{action:'list_orders'}}),/operator_required/);
 process.env.NATURE_ADMIN_OPENIDS=' ops-a , ops-b ';
 assert.equal(isOperator('ops-a'),true);
 assert.equal(isOperator('ops-b'),true);
 assert.equal(isOperator('u1'),false);
 assert.equal(isOperator(''),false);
 assert.equal(isOperator(null),false);
 await assert.rejects(printAdmin({db:fixture(),owner:'u1',event:{action:'list_orders'}}),/operator_required/);
 delete process.env.NATURE_ADMIN_OPENIDS;
});

test('only the documented fields of each admin action are accepted',async()=>{
 process.env.NATURE_ADMIN_OPENIDS='ops-a';
 const db=fixture();
 await assert.rejects(printAdmin({db,owner:'ops-a',event:{action:'drop_everything'}}),/invalid_request/);
 await assert.rejects(printAdmin({db,owner:'ops-a',event:{action:'list_orders',owner:'u1'}}),/invalid_request/);
 await assert.rejects(printAdmin({db,owner:'ops-a',event:{action:'get_package',orderId:'x',extra:1}}),/invalid_request/);
 await assert.rejects(printAdmin({db,owner:'ops-a',event:{}}),/invalid_request/);
 await assert.rejects(printAdmin({db,owner:'ops-a',event:{action:'get_package',orderId:'not-a-hash'}}),/invalid_request/);
 delete process.env.NATURE_ADMIN_OPENIDS;
});

test('a draft becomes exactly one order, and accepting twice changes nothing',async()=>{
 process.env.NATURE_ADMIN_OPENIDS='ops-a';
 const db=fixture();seedDraft(db);
 const first=await printAdmin({db,owner:'ops-a',event:{action:'accept_order',draftId:DRAFT_ID},now:()=>2000});
 assert.equal(first.status,'ready');
 assert.equal(first.created,true);
 assert.equal(first.order.status,'accepted');
 assert.equal(first.order.productionStatus,'ready_to_print');
 assert.equal(first.order.cardCount,24);
 assert.equal(db.rows.get('printOrders/'+ORDER_ID).owner,'u1');
 assert.equal(db.rows.get('printOrderDrafts/'+DRAFT_ID).status,'accepted');
 const second=await printAdmin({db,owner:'ops-a',event:{action:'accept_order',draftId:DRAFT_ID},now:()=>3000});
 assert.equal(second.created,false);
 assert.equal(second.order.status,'accepted');
 assert.equal(db.rows.size,2,'no duplicate order is created');
 const drafts=await printAdmin({db,owner:'ops-a',event:{action:'list_drafts'}});
 assert.deepEqual(drafts.drafts,[],'an accepted draft leaves the pending queue');
 delete process.env.NATURE_ADMIN_OPENIDS;
});

test('accepting refuses an unknown or malformed draft',async()=>{
 process.env.NATURE_ADMIN_OPENIDS='ops-a';
 const db=fixture();seedDraft(db);
 await assert.rejects(printAdmin({db,owner:'ops-a',event:{action:'accept_order',draftId:hash('missing')}}),/order_unavailable/);
 db.rows.set('printOrderDrafts/'+hash('short'),{owner:'u1',status:'draft',items:Array.from({length:3},()=>({}))});
 await assert.rejects(printAdmin({db,owner:'ops-a',event:{action:'accept_order',draftId:hash('short')}}),/order_unavailable/);
 delete process.env.NATURE_ADMIN_OPENIDS;
});

test('the print package is printable, escaped and free of identities',async()=>{
 process.env.NATURE_ADMIN_OPENIDS='ops-a';
 const db=fixture();seedDraft(db);
 await printAdmin({db,owner:'ops-a',event:{action:'accept_order',draftId:DRAFT_ID},now:()=>2000});
 const pack=await printAdmin({db,owner:'ops-a',event:{action:'get_package',orderId:ORDER_ID}});
 assert.deepEqual(Object.keys(pack.package).sort(),['manifest.csv','order.json','shipping.json']);
 const lines=pack.package['manifest.csv'].trim().split('\n');
 assert.equal(lines.length,25,'header plus 24 card rows');
 assert.match(lines[0],/^position,speciesName,discoveryNumber,cardKind,originalDiscoverer,giftedFrom,assetRef$/);
 assert.match(lines[1],/^1,"物种, ""0""",1,original_observation,观察者,,a01$/);
 assert.equal(manifestCsv({items:[]}),'position,speciesName,discoveryNumber,cardKind,originalDiscoverer,giftedFrom,assetRef\n');
 const order=JSON.parse(pack.package['order.json']);
 assert.equal(order.cardCount,24);
 assert.equal(order.totalFen,5990);
 assert.equal(order.locationLabel,'地点未公开');
 assert.equal(/u1|ops-a/.test(pack.package['manifest.csv']+pack.package['order.json']+pack.package['shipping.json']),false,'the vendor-facing files carry no account identity or storage path');
 const shipping=JSON.parse(pack.package['shipping.json']);
 assert.equal(shipping.recipient,'支付后由持有人提供');
 assert.match(shipping.note,/地址只能由持有人填写/);
 assert.equal(pack.assets.length,24);
 assert.equal(pack.assets[0].frontAsset.startsWith('cloud://'),true,'the trusted operator still gets fetchable asset paths');
 assert.equal(pack.assets[0].assetRef,'a01','the printable manifest and the asset list share one reference scheme');
 assert.match(lines[1],/,a01$/);
 assert.match(lines[24],/,a24$/);
 delete process.env.NATURE_ADMIN_OPENIDS;
});

test('tracking numbers are validated, idempotent and audited with a hashed operator',async()=>{
 process.env.NATURE_ADMIN_OPENIDS='ops-a';
 const db=fixture();seedDraft(db);
 await printAdmin({db,owner:'ops-a',event:{action:'accept_order',draftId:DRAFT_ID},now:()=>2000});
 await assert.rejects(printAdmin({db,owner:'ops-a',event:{action:'set_tracking',orderId:ORDER_ID,carrier:'FAKE',trackingNo:'SF123456789'}}),/invalid_request/);
 await assert.rejects(printAdmin({db,owner:'ops-a',event:{action:'set_tracking',orderId:ORDER_ID,carrier:'SF',trackingNo:'123'}}),/invalid_request/);
 await assert.rejects(printAdmin({db,owner:'ops-a',event:{action:'set_tracking',orderId:ORDER_ID,carrier:'SF',trackingNo:'SF 12 34'}}),/invalid_request/);
 assert.ok(CARRIERS.includes('SF')&&CARRIERS.includes('JD'));
 const saved=await printAdmin({db,owner:'ops-a',event:{action:'set_tracking',orderId:ORDER_ID,carrier:'SF',trackingNo:'SF1234567890'},now:()=>4000});
 assert.equal(saved.changed,true);
 assert.equal(saved.order.carrier,'SF');
 assert.equal(saved.order.trackingNo,'SF1234567890');
 const again=await printAdmin({db,owner:'ops-a',event:{action:'set_tracking',orderId:ORDER_ID,carrier:'SF',trackingNo:'SF1234567890'},now:()=>5000});
 assert.equal(again.changed,false);
 const stored=db.rows.get('printOrders/'+ORDER_ID);
 assert.equal(stored.events.length,2,'accepted plus one tracking event');
 assert.equal(stored.events[1].action,'tracking_recorded');
 assert.equal(stored.events[1].by,hash('ops-a').slice(0,16),'the audit trail stores a hash, not the operator openid');
 assert.equal(stored.events[1].detail.endsWith('7890'),true,'audit keeps only the last four digits');
 delete process.env.NATURE_ADMIN_OPENIDS;
});

test('production only moves forward and shipping requires a tracking number',async()=>{
 process.env.NATURE_ADMIN_OPENIDS='ops-a';
 const db=fixture();seedDraft(db);
 await printAdmin({db,owner:'ops-a',event:{action:'accept_order',draftId:DRAFT_ID},now:()=>2000});
 await assert.rejects(printAdmin({db,owner:'ops-a',event:{action:'mark_shipped',orderId:ORDER_ID}}),/order_state_conflict/,'a fresh order cannot jump to shipped');
 await assert.rejects(printAdmin({db,owner:'ops-a',event:{action:'mark_produced',orderId:ORDER_ID,from:'accepted'}}),/invalid_request/,'the client cannot name its own starting state');
 const produced=await printAdmin({db,owner:'ops-a',event:{action:'mark_produced',orderId:ORDER_ID},now:()=>3000});
 assert.equal(produced.order.status,'in_production');
 const again=await printAdmin({db,owner:'ops-a',event:{action:'mark_produced',orderId:ORDER_ID},now:()=>3500});
 assert.equal(again.changed,false,'a repeated production mark is idempotent, not a second transition');
 assert.equal(again.order.status,'in_production');
 const blocked=await printAdmin({db,owner:'ops-a',event:{action:'mark_shipped',orderId:ORDER_ID},now:()=>4000}).catch(e=>e);
 assert.equal(blocked.message,'tracking_required');
 await printAdmin({db,owner:'ops-a',event:{action:'set_tracking',orderId:ORDER_ID,carrier:'YTO',trackingNo:'YTO-88990011'},now:()=>5000});
 const shipped=await printAdmin({db,owner:'ops-a',event:{action:'mark_shipped',orderId:ORDER_ID},now:()=>6000});
 assert.equal(shipped.order.status,'shipped');
 assert.equal(shipped.order.productionStatus,'shipped');
 // 已发货订单允许更正录错的单号，但状态不回退，且必须留下审计记录。
 const corrected=await printAdmin({db,owner:'ops-a',event:{action:'set_tracking',orderId:ORDER_ID,carrier:'SF',trackingNo:'SF000011112222'},now:()=>7000});
 assert.equal(corrected.order.status,'shipped','correcting a tracking number never moves the order backwards');
 assert.equal(corrected.order.trackingNo,'SF000011112222');
 assert.equal(db.rows.get('printOrders/'+ORDER_ID).events.at(-1).action,'tracking_recorded');
 db.rows.set('printOrders/'+hash('cancelled'),{...db.rows.get('printOrders/'+ORDER_ID),status:'cancelled'});
 await assert.rejects(printAdmin({db,owner:'ops-a',event:{action:'set_tracking',orderId:hash('cancelled'),carrier:'SF',trackingNo:'SF1234567890'}}),/order_state_conflict/,'a cancelled order stays untouched');
 delete process.env.NATURE_ADMIN_OPENIDS;
});

test('order listing is bounded, filterable and never leaks card assets',async()=>{
 process.env.NATURE_ADMIN_OPENIDS='ops-a';
 const db=fixture();
 for(let i=0;i<25;i++){
  db.rows.set('printOrders/'+hash('o'+i),{owner:'u'+i,draftId:hash('d'+i),quoteHash:hash('q'+i),sku:{id:'nature-24-v1',currency:'CNY',totalFen:5990},items:Array.from({length:24},()=>({frontAsset:'cloud://env/art.png'})),status:i%2?'accepted':'shipped',paymentStatus:'not_configured',productionStatus:'x',carrier:'SF',trackingNo:'SF12345678',createdAt:i,updatedAt:i,events:[]});
 }
 const page=await printAdmin({db,owner:'ops-a',event:{action:'list_orders',limit:20}});
 assert.equal(page.orders.length,20);
 assert.equal(page.nextCursor,'20');
 const rest=await printAdmin({db,owner:'ops-a',event:{action:'list_orders',cursor:20,limit:20}});
 assert.equal(rest.orders.length,5);
 assert.equal(rest.nextCursor,'');
 assert.equal(JSON.stringify(page).includes('cloud://'),false,'listing never returns asset ids');
 assert.equal(JSON.stringify(page).includes('draftId'),true);
 const shipped=await printAdmin({db,owner:'ops-a',event:{action:'list_orders',status:'shipped',limit:20}});
 assert.equal(shipped.orders.every(o=>o.status==='shipped'),true);
 const huge=await printAdmin({db,owner:'ops-a',event:{action:'list_orders',limit:9999}});
 assert.equal(huge.orders.length,20,'a client cannot raise the page size past the cap');
 delete process.env.NATURE_ADMIN_OPENIDS;
});

test('the cloud function entry maps failures to safe codes and denies anonymous callers',async()=>{
 process.env.NATURE_ADMIN_OPENIDS='ops-a';
 const {main}=require('../cloudfunctions/printAdmin/index');
 const db=fixture();
 let reply=await main({action:'list_orders'},{cloud:{getWXContext:()=>({}),database:()=>db}});
 assert.equal(reply.code,'unauthenticated');
 reply=await main({action:'list_orders'},{cloud:{getWXContext:()=>({OPENID:'u1'}),database:()=>db}});
 assert.equal(reply.code,'operator_required');
 reply=await main({action:'get_package',orderId:hash('nope')},{cloud:{getWXContext:()=>({OPENID:'ops-a'}),database:()=>db}});
 assert.equal(reply.code,'order_unavailable');
 reply=await main({action:'list_orders'},{cloud:{getWXContext:()=>({OPENID:'ops-a'}),database:()=>({collection:()=>{throw Error('boom')}})}});
 assert.equal(reply.code,'fulfillment_service_unavailable');
 assert.equal(reply.retryable,false);
 reply=await main({action:'list_orders'},{cloud:null});
 assert.equal(reply.code,'runtime_unavailable');
 delete process.env.NATURE_ADMIN_OPENIDS;
});

test('the admin page is registered, server-gated and never touches card collections locally',()=>{
 const cfg=JSON.parse(read('app.json'));
 assert.ok(cfg.pages.includes('native/pages/print-admin/index'),'the fulfilment page ships with the release');
 const page=read('native/pages/print-admin/index.js');
 assert.match(page,/callFunction\(\{name:'printAdmin'/);
 assert.doesNotMatch(page,/collection\(|cloud\.database/);
 assert.match(read('native/pages/print-admin/index.wxml'),/地址只能由卡片持有人提供/);
 assert.match(read('native/pages/print-admin/index.wxss'),/\.admin-card/);
});
