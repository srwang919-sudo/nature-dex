// 统一埋点管线（Master Plan §111–112）。
// 目标：前端事件本地缓冲 + 批量上报到 analytics 云函数，写入 analytics_events 集合。
// 原则：绝不阻塞主流程、永不 throw、静默失败、含幂等 event_id、不采集照片与精确位置。
const KEY='nature.analyticsQueue.v1';
const BATCH=12;                 // 攒够条数才上报
const FLUSH_MS=20*1000;         // 定时兜底上报
const MAX_QUEUE=200;            // 本地缓冲上限，超出丢弃最旧
const KNOWN_EVENTS=new Set([
 'photo_captured','recognition_started','recognition_success','recognition_failed',
 'species_confirmed','observation_created','species_first_discovered','discovery_number_assigned',
 'official_artwork_reused','official_artwork_missing','artwork_generation_started','artwork_candidate_created',
 'artwork_approved','custom_artwork_started','custom_artwork_success','generation_regenerated',
 'card_created','card_saved','nature_world_species_added','nature_world_species_tapped',
 'friend_like','card_requested','card_gifted','subscription_page_viewed','subscription_started','subscription_success',
 'print_flow_started','print_card_selected','print_preview_viewed','print_order_created','print_payment_success','print_order_shipped'
]);

function sanitizeProps(props){
 if(!props||typeof props!=='object')return {};
 const out={};
 for(const k of Object.keys(props)){
  const v=props[k];
  if(v===undefined||v===null)continue;
  if(typeof v==='string'){if(v.length>120)continue;out[k]=v}
  else if(typeof v==='number'&&Number.isFinite(v)){out[k]=v}
  else if(typeof v==='boolean'){out[k]=v}
 }
 return out;
}

function loadQueue(){const a=host();if(!a)return[];try{const q=a.getStorageSync(KEY);return Array.isArray(q)?q.filter(e=>e&&e.event&&e.eventId):[]}catch(e){return[]}}

let api=null;         // 注入的 wx-like api，便于测试
function setApi(a){api=a;return tracker}
// 运行宿主探测：小程序里是全局 wx；测试/Node 里可能完全没有 wx。
// 绝不直接引用裸 wx —— 否则定时器回调里会抛 ReferenceError，把宿主进程带崩。
function host(){if(api)return api;try{return typeof wx!=='undefined'?wx:null}catch(e){return null}}

const tracker={
 // 记录一条事件。事件名必须在白名单内；props 会被净化。
 track(event,props){
  if(!KNOWN_EVENTS.has(event))return false;
  const a=host();
  if(!a)return false;              // 没有宿主就没有缓冲，如实返回未记录
  const q=loadQueue();
  const entry={event,props:sanitizeProps(props),eventId:'ev_'+Date.now()+'_'+Math.random().toString(36).slice(2,10),ts:Date.now()};
  q.push(entry);
  if(q.length>MAX_QUEUE)q=q.slice(q.length-MAX_QUEUE);
  try{a.setStorageSync(KEY,q)}catch(e){}
  scheduleFlush();
  if(q.length>=BATCH)flush();
  return true;
 },
 flush,
 _loadQueue:loadQueue,
 _KNOWN_EVENTS:KNOWN_EVENTS
};

let timer=null;
function scheduleFlush(){
 if(timer||!host())return;
 timer=setTimeout(()=>{timer=null;flush()},FLUSH_MS);
}

async function flush(){
 const a=host();
 if(timer){clearTimeout(timer);timer=null}
 if(!a)return;
 let q;
 try{q=loadQueue()}catch(e){return}
 if(!q.length)return;
 // 先摘取前 BATCH 条，成功后移除，失败保留待下次重试
 const sending=q.slice(0,BATCH);
 try{
  if(a.cloud&&a.cloud.callFunction){
   const r=await a.cloud.callFunction({name:'analytics',data:{events:sending}});
   if(!r||!r.result||r.result.status!=='ok')return;   // 失败保留队列
  } else {
   return; // 无云能力（例如 devtools 基础库过低），不丢队列也不上报
  }
  // 成功：移除已发送的（按 eventId 精确匹配）
  const sent=new Set(sending.map(e=>e.eventId));
  const rest=q.filter(e=>!sent.has(e.eventId));
  try{a.setStorageSync(KEY,rest)}catch(e){}
  if(rest.length>=BATCH)scheduleFlush();
 }catch(e){/* 静默：网络失败保留队列 */}
}

module.exports={track:tracker.track.bind(tracker),flush,scheduleFlush,setApi,_KNOWN_EVENTS:KNOWN_EVENTS};
