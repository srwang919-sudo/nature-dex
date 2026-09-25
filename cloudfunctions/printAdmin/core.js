// 打印履约后台（Master Plan §14）：让运营侧能取打印包、登记物流、推进生产状态。
// 安全边界：
//  1) 默认拒绝 —— 未配置 NATURE_ADMIN_OPENIDS 时没有任何人是操作员；
//  2) 只返回订单快照与可打印清单，不返回原照片内容，也不暴露持有人 openid；
//  3) 地址不在这里补全 —— 由持有人在支付流程中提供，运营侧只能读取；
//  4) 所有状态推进都写审计事件，重复调用幂等。
const {createHash}=require('crypto');
const {isOperator:dbIsOperator}=require('./operator');
const hash=value=>createHash('sha256').update(value).digest('hex');
const CARRIERS=Object.freeze(['SF','YTO','ZTO','STO','YUNDA','EMS','JD','OTHER']);
function envOperators(){return String(process.env.NATURE_ADMIN_OPENIDS||'').split(',').map(v=>v.trim()).filter(Boolean)}
// 向后兼容：单参数调用 isOperator(owner) 为同步 env 判断；双参数 isOperator(db,owner) 为异步数据库+env 判断。
function isOperator(db,openid){if(arguments.length<2){const list=envOperators();return typeof db==='string'&&db.length>0&&list.includes(db)}return dbIsOperator(db,openid)}
// 状态机固定在服务端：客户端只能点名动作，不能自己声明从哪个状态出发。
const TRANSITIONS=Object.freeze({mark_produced:{from:'accepted',to:'in_production',production:'in_production'},mark_shipped:{from:'in_production',to:'shipped',production:'shipped'}});
const MAX_ROWS=20,MAX_EVENTS=50;
const read=async doc=>{try{return (await doc.get()).data}catch(e){if(/not found|not exist|DATABASE_DOCUMENT_NOT_EXIST|collection/i.test(e.message||'')&&!/already/i.test(e.message||''))return null;throw e}};
function csvCell(value){const text=String(value==null?'':value);return /[",\n\r]/.test(text)?'"'+text.replace(/"/g,'""')+'"':text}
// 交给印刷方的是匿名清单：正反面资源用 assetRef 指代，不带账号标识与存储路径。
const assetRef=position=>'a'+String(position).padStart(2,'0');
function manifestCsv(order){
 const header=['position','speciesName','discoveryNumber','cardKind','originalDiscoverer','giftedFrom','assetRef'];
 const rows=(order.items||[]).map(item=>[item.position,item.name,item.number,item.kind,item.originalDiscoverer,item.giftedFrom,assetRef(item.position)].map(csvCell).join(','));
 return [header.join(','),...rows].join('\n')+'\n';
}
function orderJson(order,now){
 return JSON.stringify({orderId:order.id,skuId:order.sku&&order.sku.id,cardCount:(order.items||[]).length,currency:order.sku&&order.sku.currency,totalFen:order.sku&&order.sku.totalFen,quoteHash:order.quoteHash,status:order.status,paymentStatus:order.paymentStatus,productionStatus:order.productionStatus,createdAt:order.createdAt,packedAt:now,locationLabel:'地点未公开'},null,2);
}
function shippingJson(order){
 return JSON.stringify({orderId:order.id,carrier:order.carrier||'',trackingNo:order.trackingNo||'',recipient:'支付后由持有人提供',note:'地址只能由持有人填写；后台不得自行补全或修改。',updatedAt:order.updatedAt||order.createdAt},null,2);
}
function publicOrder(row){
 return {orderId:row.id,draftId:row.draftId,status:row.status,productionStatus:row.productionStatus,paymentStatus:row.paymentStatus,cardCount:(row.items||[]).length,totalFen:row.sku&&row.sku.totalFen,currency:row.sku&&row.sku.currency,quoteHash:row.quoteHash,carrier:row.carrier||'',trackingNo:row.trackingNo||'',createdAt:row.createdAt,updatedAt:row.updatedAt,events:(row.events||[]).slice(-5)};
}
function audit(row,action,by,detail,now){
 const events=(row.events||[]).concat([{action,by:hash(by||'unknown').slice(0,16),detail:String(detail||'').slice(0,80),at:now}]);
 return events.slice(-MAX_EVENTS);
}
const validId=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const validOrderId=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);

async function listOrders(db,event){
 const limit=Number.isSafeInteger(event.limit)&&event.limit>0&&event.limit<=MAX_ROWS?event.limit:MAX_ROWS;
 const offset=Number.isSafeInteger(event.cursor)&&event.cursor>=0?event.cursor:0;
 let query=db.collection('printOrders');
 if(typeof event.status==='string'&&['draft','accepted','in_production','shipped','cancelled'].includes(event.status))query=query.where({status:event.status});
 const res=await query.orderBy('createdAt','desc').skip(offset).limit(limit+1).get();
 const rows=(res&&res.data)||[];
 return {status:'ready',orders:rows.slice(0,limit).map(publicOrder),nextCursor:rows.length>limit?String(offset+limit):''};
}
function publicDraft(row){return {draftId:String(row._id||row.id||''),status:row.status,cardCount:(row.items||[]).length,totalFen:row.sku&&row.sku.totalFen,currency:row.sku&&row.sku.currency,createdAt:row.createdAt,acceptedAt:row.acceptedAt||0}}
async function listDrafts(db,event){
 const limit=Number.isSafeInteger(event.limit)&&event.limit>0&&event.limit<=MAX_ROWS?event.limit:MAX_ROWS;
 const offset=Number.isSafeInteger(event.cursor)&&event.cursor>=0?event.cursor:0;
 const res=await db.collection('printOrderDrafts').where({status:'draft'}).orderBy('createdAt','desc').skip(offset).limit(limit+1).get();
 const rows=(res&&res.data)||[];
 return {status:'ready',drafts:rows.slice(0,limit).map(publicDraft),nextCursor:rows.length>limit?String(offset+limit):''};
}
async function acceptOrder(db,event,owner,now){
 const draftId=event.draftId;
 if(!validId(draftId))throw Error('invalid_request');
 const orderId=hash('print-order|'+draftId);
 for(let attempt=0;;attempt++)try{
  return await db.runTransaction(async tx=>{
   // 幂等优先：已受理过的订单直接回读，不再要求草稿仍是 draft。
   const doc=tx.collection('printOrders').doc(orderId),existing=await read(doc);
   if(existing&&existing.status!=='draft'){
    if(existing.draftId!==draftId)throw Error('order_conflict');
    return {status:'ready',order:publicOrder(existing),created:false};
   }
   const draftDoc=tx.collection('printOrderDrafts').doc(draftId),draft=await read(draftDoc);
   if(!draft||!Array.isArray(draft.items)||draft.items.length!==24||!['draft','accepted'].includes(draft.status))throw Error('order_unavailable');
   if(existing){
    if(existing.draftId!==draftId)throw Error('order_conflict');
    const next={...existing,status:'accepted',productionStatus:'ready_to_print',updatedAt:now(),events:audit(existing,'accepted',owner,'',now())};
    await doc.set({data:next});
    return {status:'ready',order:publicOrder(next),created:false};
   }
   const row={owner:draft.owner,draftId,quoteHash:draft.quoteHash,sku:draft.sku,items:draft.items,status:'accepted',paymentStatus:draft.paymentStatus||'not_configured',productionStatus:'ready_to_print',carrier:'',trackingNo:'',createdAt:now(),updatedAt:now(),events:audit({},'accepted',owner,'from_draft',now())};
   await doc.set({data:row});
   await draftDoc.set({data:{...draft,status:'accepted',acceptedAt:now()}});
   return {status:'ready',order:publicOrder(row),created:true};
  });
 }catch(e){if(attempt>=3||![e.code,e.errCode,e.message].includes('DATABASE_TRANSACTION_CONFLICT'))throw e}
}
async function advance(db,event,owner,now){
 const orderId=event.orderId;
 if(!validOrderId(orderId))throw Error('invalid_request');
 const action=event.action,step=TRANSITIONS[action];
 if(!step)throw Error('invalid_request');
 for(let attempt=0;;attempt++)try{
  return await db.runTransaction(async tx=>{
   const doc=tx.collection('printOrders').doc(orderId),row=await read(doc);
   if(!row)throw Error('order_unavailable');
   if(row.status===step.to)return {status:'ready',order:publicOrder(row),changed:false};
   if(row.status!==step.from)throw Error('order_state_conflict');
   if(step.to==='shipped'&&!(typeof row.trackingNo==='string'&&row.trackingNo.length>=6))throw Error('tracking_required');
   const next={...row,status:step.to,productionStatus:step.production,updatedAt:now(),events:audit(row,action,owner,'',now())};
   await doc.set({data:next});
   return {status:'ready',order:publicOrder(next),changed:true};
  });
 }catch(e){if(attempt>=3||![e.code,e.errCode,e.message].includes('DATABASE_TRANSACTION_CONFLICT'))throw e}
}
async function setTracking(db,event,owner,now){
 const orderId=event.orderId,carrier=event.carrier,trackingNo=String(event.trackingNo||'').trim();
 if(!validOrderId(orderId)||typeof carrier!=='string'||!CARRIERS.includes(carrier)||!/^[A-Za-z0-9-]{6,40}$/.test(trackingNo))throw Error('invalid_request');
 for(let attempt=0;;attempt++)try{
  return await db.runTransaction(async tx=>{
   const doc=tx.collection('printOrders').doc(orderId),row=await read(doc);
   if(!row)throw Error('order_unavailable');
   if(row.status==='cancelled')throw Error('order_state_conflict');
   if(row.carrier===carrier&&row.trackingNo===trackingNo)return {status:'ready',order:publicOrder(row),changed:false};
   const next={...row,carrier,trackingNo,updatedAt:now(),events:audit(row,'tracking_recorded',owner,carrier+' '+trackingNo.slice(-4),now())};
   await doc.set({data:next});
   return {status:'ready',order:publicOrder(next),changed:true};
  });
 }catch(e){if(attempt>=3||![e.code,e.errCode,e.message].includes('DATABASE_TRANSACTION_CONFLICT'))throw e}
}
async function getPackage(db,event){
 const orderId=event.orderId;
 if(!validOrderId(orderId))throw Error('invalid_request');
 const row=await read(db.collection('printOrders').doc(orderId));
 if(!row)throw Error('order_unavailable');
 if(!Array.isArray(row.items)||row.items.length!==24)throw Error('order_unavailable');
 const now=Date.now();
 return {status:'ready',order:publicOrder(row),package:{'order.json':orderJson(row,now),'shipping.json':shippingJson(row),'manifest.csv':manifestCsv(row)},assets:row.items.map(item=>({position:item.position,assetRef:assetRef(item.position),speciesId:item.speciesId,frontAsset:item.frontAsset,backAsset:item.backAsset}))};
}

async function printAdmin({db,owner,event={},now=Date.now}={}){
 if(!db)throw Error('runtime_unavailable');
 if(!event||typeof event!=='object'||typeof event.action!=='string')throw Error('invalid_request');
 const allowed={
  list_orders:['action','cursor','limit','status'],
  list_drafts:['action','cursor','limit'],
  accept_order:['action','draftId'],
  mark_produced:['action','orderId'],
  mark_shipped:['action','orderId'],
  set_tracking:['action','orderId','carrier','trackingNo'],
  get_package:['action','orderId']
 };
 // claim_operator 不需要既有运营权限，否则新用户无法自助激活。
 if(event.action==='claim_operator')return await require('./operator').claimOperator({db,openid:owner,code:event.code,now});
 const fields=allowed[event.action];
 if(!fields||Object.keys(event).some(k=>!fields.includes(k)))throw Error('invalid_request');
 if(!(await isOperator(db,owner)))throw Error('operator_required');
 if(event.action==='list_orders')return await listOrders(db,event);
 if(event.action==='list_drafts')return await listDrafts(db,event);
 if(event.action==='accept_order')return await acceptOrder(db,event,owner,now);
 if(event.action==='set_tracking')return await setTracking(db,event,owner,now);
 if(event.action==='get_package')return await getPackage(db,event);
 return await advance(db,event,owner,now);
}
module.exports={printAdmin,isOperator,manifestCsv,orderJson,shippingJson,publicOrder,publicDraft,listDrafts,assetRef,CARRIERS};
