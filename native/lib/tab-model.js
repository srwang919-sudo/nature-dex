const tabs=Object.freeze([
  {key:'discover',label:'探索',url:'/native/pages/home/index',icon:'leaf'},
  {key:'collection',label:'图鉴',url:'/native/pages/library/index',icon:'book'},
  {key:'capture',label:'发现',url:'/native/pages/observe/index?source=camera',icon:'camera'},
  {key:'journey',label:'旅程',url:'/native/pages/journey/index',icon:'trail'},
  {key:'me',label:'我的',url:'/native/pages/profile/index',icon:'person'}
]);
const navigationItems=Object.freeze(tabs.map(tab=>Object.assign({},tab,{action:'tab'})));
module.exports={tabs,navigationItems};
