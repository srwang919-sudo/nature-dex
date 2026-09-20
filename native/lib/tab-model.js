const tabs=Object.freeze([
  {key:'discover',label:'发现',url:'/native/pages/home/index',icon:'leaf'},
  {key:'collection',label:'收藏',url:'/native/pages/library/index',icon:'book'},
  {key:'me',label:'我的',url:'/native/pages/profile/index',icon:'person'}
]);
const navigationItems=Object.freeze([
  Object.assign({},tabs[0],{action:'tab'}),
  Object.assign({},tabs[1],{label:'图鉴',action:'tab'}),
  {key:'capture',label:'拍摄',url:'/native/pages/observe/index',icon:'camera',action:'capture'},
  Object.assign({},tabs[2],{action:'tab'})
]);
module.exports={tabs,navigationItems};
