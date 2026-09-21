const tabs=Object.freeze([
  {key:'discover',label:'首页',url:'/native/pages/home/index',icon:'leaf'},
  {key:'collection',label:'图鉴',url:'/native/pages/library/index',icon:'book'},
  {key:'me',label:'我的',url:'/native/pages/profile/index',icon:'person'}
]);
const navigationItems=Object.freeze(tabs.map(tab=>Object.assign({},tab,{action:'tab'})));
module.exports={tabs,navigationItems};
