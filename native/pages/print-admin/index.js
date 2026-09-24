const {track}=require('../../lib/analytics')
const STATUS_LABEL={draft:'待受理',accepted:'待开印',in_production:'印制中',shipped:'已发货',cancelled:'已取消'}
const CARRIER_LABEL={SF:'顺丰',YTO:'圆通',ZTO:'中通',STO:'申通',YUNDA:'韵达',EMS:'EMS',JD:'京东',OTHER:'其他'}
const CARRIERS=Object.keys(CARRIER_LABEL)
const friendly=code=>({
 operator_required:'当前账号没有履约权限。请联系管理员把这个微信号加入运营名单。',
 order_unavailable:'这个订单不存在或已失效。',
 order_conflict:'订单数据不一致，已停止操作，请联系开发核对。',
 order_state_conflict:'订单状态已变化，请刷新后再操作。',
 tracking_required:'请先登记物流单号，再标记发货。',
 unauthenticated:'微信身份尚未确认，请重新进入小程序后重试。',
 fulfillment_service_unavailable:'履约服务暂时不可用，未做任何改动。'
})[code]||'操作未完成，请稍后重试。'
function decorate(row){
 return Object.assign({},row,{
  statusLabel:STATUS_LABEL[row.status]||row.status,
  carrierLabel:row.carrier?(CARRIER_LABEL[row.carrier]||row.carrier):'未登记',
  totalYuan:Number.isFinite(row.totalFen)?(row.totalFen/100).toFixed(2):'—',
  createdAtLabel:Number.isFinite(row.createdAt)?new Date(row.createdAt).toLocaleDateString():'日期未记录'
 })
}
Page({
 data:{rows:[],drafts:[],busy:false,error:'',nextCursor:'',pkgView:null,carrierLabels:CARRIERS.map(k=>CARRIER_LABEL[k])},
 onLoad(){this._tracking={};this._carrier={};this.load();this.loadDrafts()},
 // 后台走独立云函数；前端不直接读打印集合，权限判断在服务端。
 async call(data){
  const r=await wx.cloud.callFunction({name:'printAdmin',data});
  const body=r&&r.result;
  if(!body||body.status!=='ready')throw Object.assign(Error(friendly(body&&body.code)),{code:body&&body.code});
  return body;
 },
 async load(more){
  if(this.data.busy)return;
  this.setData({busy:true,error:''});
  try{
   const cursor=more&&this.data.nextCursor?Number(this.data.nextCursor):0;
   const body=await this.call({action:'list_orders',cursor});
   this.setData({rows:(more?this.data.rows:[]).concat((body.orders||[]).map(decorate)),nextCursor:body.nextCursor||'',busy:false});
  }catch(e){this.setData({busy:false,error:e.message||friendly(e.code)})}
 },
 more(){this.load(true)},
 async loadDrafts(){
  try{
   const body=await this.call({action:'list_drafts',cursor:0});
   this.setData({drafts:(body.drafts||[]).map(d=>({...d,totalYuan:Number.isFinite(d.totalFen)?(d.totalFen/100).toFixed(2):'—',createdAtLabel:Number.isFinite(d.createdAt)?new Date(d.createdAt).toLocaleDateString():'日期未记录'}))});
  }catch(e){if(e.code!=='operator_required')this.setData({error:e.message||friendly(e.code)})}
 },
 async pkg(e){
  const orderId=e.currentTarget.dataset.id;
  const row=this.data.rows.find(r=>r.orderId===orderId)||null;
  this.setData({pkgView:{order:row,files:null,manifestLines:0}});
  if(this.data.busy)return;
  this.setData({busy:true,error:''});
  try{
   const body=await this.call({action:'get_package',orderId});
   const files=body.package||{};
   this.setData({pkgView:{order:decorate(body.order),files,manifestLines:Math.max(0,String(files['manifest.csv']||'').trim().split('\n').length-1)},busy:false});
  }catch(e){this.setData({busy:false,error:e.message||friendly(e.code)})}
 },
 carrierChange(e){this._carrier[e.currentTarget.dataset.id]=CARRIERS[Number(e.detail.value)]||'SF'},
 trackingInput(e){this._tracking[e.currentTarget.dataset.id]=String(e.detail.value||'')},
 async run(data,ok){
  if(this.data.busy)return;
  this.setData({busy:true,error:''});
  try{
   const body=await this.call(data);
   if(body.order){const next=decorate(body.order);this.setData({rows:this.data.rows.map(row=>row.orderId===next.orderId?next:row)})}
   this.setData({busy:false});
   if(ok)ok(body);
  }catch(e){this.setData({busy:false,error:e.message||friendly(e.code)});return null}
  return true;
 },
 accept(e){const draftId=e.currentTarget.dataset.draft;return this.run({action:'accept_order',draftId},()=>wx.showToast({title:'已受理',icon:'none'}))},
 // 状态机由服务端决定：前端只点名动作，不自报起始状态。
 markProduced(e){return this.run({action:'mark_produced',orderId:e.currentTarget.dataset.id},()=>wx.showToast({title:'已记为印制中',icon:'none'}))},
 saveTracking(e){
  const orderId=e.currentTarget.dataset.id,carrier=this._carrier[orderId]||(this.data.rows.find(r=>r.orderId===orderId)||{}).carrier||'SF',trackingNo=String(this._tracking[orderId]||'').trim();
  return this.run({action:'set_tracking',orderId,carrier,trackingNo},()=>wx.showToast({title:'单号已保存',icon:'none'}));
 },
 async ship(e){
  const done=await this.run({action:'mark_shipped',orderId:e.currentTarget.dataset.id},()=>wx.showToast({title:'已标记发货',icon:'none'}));
  if(done)track('print_order_shipped',{cards:24});
 },
 copy(e){const key=e.currentTarget.dataset.key,text=this.data.pkgView&&this.data.pkgView.files&&this.data.pkgView.files[key];if(text)wx.setClipboardData({data:text})}
})
