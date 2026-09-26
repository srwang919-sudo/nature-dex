const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
for(const page of ['home','library','profile','observe','reveal','card']){
  assert.match(read(`native/pages/${page}/index.wxml`),/reduce-motion/);
}
for(const page of ['home','library','profile','observe','reveal','card','friend','settings','note']){
  assert.doesNotMatch(read(`native/pages/${page}/index.wxss`),/animation[^;}]*infinite|backdrop-filter/);
}
assert.match(read('native/components/navigation/index.wxml'),/aria-role="button"/);
assert.match(read('native/components/navigation/index.wxml'),/aria-label="{{currentKey===item.key\?item.label\+'，当前页面':item.label}}"/);
assert.match(read('native/pages/card/index.wxml'),/aria-label="关闭卡片查看"/);
assert.match(read('native/pages/card/index.wxss'),/\.close\{[^}]*min-width:88rpx[^}]*min-height:88rpx/);
assert.match(read('app.wxss'),/prefers-reduced-motion:reduce/);
function load(page,app,wx){let result;const file=path.join(root,`native/pages/${page}/index.js`);vm.runInNewContext(fs.readFileSync(file,'utf8'),{Page:p=>result=p,getApp:()=>app,wx,require:require('node:module').createRequire(file),setTimeout,clearTimeout,Date,Math});result.setData=function(p,done){Object.assign(this.data,p);if(done)done()};return result;}
let vibrates=0;const raw={id:'a',speciesId:'kingfisher'};
const reveal=load('reveal',{findCard:()=>raw,updateCard:()=>{}},{vibrateShort:()=>vibrates++,showToast:()=>{}});
reveal.id='a';reveal.data.reduce=true;reveal.open();assert.equal(vibrates,0);assert.equal(reveal.data.opened,true);assert.equal(reveal.data.revealStage,'settled');reveal.onUnload();
const card=load('card',{},{});card.data.reduce=true;card.start({touches:[{clientX:0,clientY:0}]});card.move({touches:[{clientX:60,clientY:30}]});assert.equal(card.data.rx,0);assert.equal(card.data.ry,0);card.cancel();card.flip();assert.equal(card.data.back,true);assert.equal(card.data.turn,0);assert.equal(card.data.flipping,false);
console.log('PASS Master accessibility: current tab label, touch target, reduced reveal/tilt');
