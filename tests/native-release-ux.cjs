const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
test('footprints are hidden until explicit local visibility opt-in',()=>{
 let page,visible=false;
 vm.runInNewContext(fs.readFileSync(path.join(root,'native/pages/journey/index.js'),'utf8'),{getApp:()=>({getCards:()=>[{id:'one',speciesId:'bird'}],decorate:x=>x}),Page:x=>page=x,require:()=>({realCards:x=>x,footprints:()=>[{label:'private-place'}],locationFreeCard:x=>x,normalizeCollectionPreference:()=>({layout:'neat'}),recordShelfUse:()=>({})}),wx:{getStorageSync:k=>k==='nature.showLocation'?visible:{},setStorageSync(){}}});
 page.setData=p=>Object.assign(page.data,p);page.onShow();assert.equal(page.data.places.length,0);
 visible=true;page.onShow();assert.equal(page.data.places.length,1);
});
test('actual original back, intentional feedback, accessible capture controls',()=>{
 const read=f=>fs.readFileSync(path.join(root,f),'utf8');
 assert.match(read('native/pages/card/index.wxml'),/看实拍原照/);
 assert.match(read('native/pages/settings/index.wxml'),/open-type="feedback"/);
 const observe=read('native/pages/observe/index.wxml');assert.match(observe,/aria-label="打开相机"/);assert.match(observe,/aria-label="从相册选择照片"/);assert.match(observe,/aria-label="选择候选/);
 assert.match(read('native/pages/observe/index.wxss'),/capture-actions[^}]*flex-wrap:wrap/);
});
