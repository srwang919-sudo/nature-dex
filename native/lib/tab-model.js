// 五个主 tab，每个职责单一：探索（拍一张）· 图鉴（收藏）· 旅程（足迹轨迹）· 好友（关系与纪念卡）· 我的（身份与勋章）
// 中间的「发现」拍照 tab 已移除：它的拍照能力与探索页的「拍一张」重复。
const tabs=Object.freeze([
  {key:'discover',label:'探索',url:'/native/pages/home/index',icon:'leaf'},
  {key:'collection',label:'馆藏',url:'/native/pages/library/index',icon:'book'},
  {key:'journey',label:'旅程',url:'/native/pages/journey/index',icon:'trail'},
  {key:'friend',label:'好友',url:'/native/pages/friend/index',icon:'friends'},
  {key:'me',label:'我的',url:'/native/pages/profile/index',icon:'person'}
]);
const navigationItems=Object.freeze(tabs.map(tab=>Object.assign({},tab,{action:'tab'})));
module.exports={tabs,navigationItems};
