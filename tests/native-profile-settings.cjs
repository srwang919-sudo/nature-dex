const assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm'),path=require('path'),{createRequire}=require('module');
const root=path.join(__dirname,'..'),store=new Map([['nature.profile.v2',{avatarPath:'/old.jpg',nickname:'观察者'}]]);let app,profile,settings,saving,failStorage=false,removed=[],copies=[];
const wx={getStorageSync:k=>store.get(k),setStorageSync:(k,v)=>{if(failStorage)throw Error('quota');store.set(k,v)},getStorageInfoSync:()=>({keys:[...store.keys()]}),removeStorageSync:k=>store.delete(k),saveFile:o=>saving=o,removeSavedFile:o=>{removed.push(o.filePath);o.success?.()},showToast(){},setClipboardData:o=>copies.push(o.data)};
vm.runInNewContext(fs.readFileSync(path.join(root,'app.js'),'utf8'),{App:a=>app=a,wx,require:createRequire(path.join(root,'app.js')),Date,Math,Set});
function page(name){let p;const file=path.join(root,'native/pages',name,'index.js');vm.runInNewContext(fs.readFileSync(file,'utf8'),{Page:x=>p=x,getApp:()=>app,wx,require:createRequire(file),Date,Math});p.setData=function(v,cb){Object.assign(this.data,v);cb?.()};return p}
(async()=>{
 profile=page('profile');profile.refresh();assert.equal(saving,undefined,'no automatic avatar selection/save');assert.equal(profile.data.showLocation,false);assert.equal(profile.data.avatarPath,'/old.jpg');
 profile.chooseAvatar({detail:{}});assert.equal(saving,undefined,'cancel has no write');
 let result=app.saveAvatar('/temp.jpg');saving.fail({});await assert.rejects(result);assert.equal(store.get('nature.profile.v2').avatarPath,'/old.jpg');
 result=app.saveAvatar('/temp.jpg');failStorage=true;saving.success({savedFilePath:'/new-failed.jpg'});await assert.rejects(result);failStorage=false;assert.equal(store.get('nature.profile.v2').avatarPath,'/old.jpg');assert.ok(removed.includes('/new-failed.jpg'));assert.ok(!removed.includes('/old.jpg'));
 result=app.saveAvatar('/temp.jpg');saving.success({savedFilePath:'/new.jpg'});await result;assert.equal(store.get('nature.profile.v2').avatarPath,'/new.jpg');assert.equal(store.get('nature.profile.v2').nickname,'观察者');assert.ok(removed.includes('/old.jpg'));
 result=app.saveAvatar('/temp.jpg');await app.clearLocalData();saving.success({savedFilePath:'/late.jpg'});await assert.rejects(result);assert.equal(store.has('nature.profile.v2'),false);assert.ok(removed.includes('/new.jpg'));assert.ok(removed.includes('/late.jpg'));
 settings=page('settings');settings.onLoad({section:'help'});assert.equal(settings.data.section,'help');assert.equal(copies.length,0);settings.copyFeedback();assert.equal(copies.length,1);assert.ok(!copies[0].includes('photoPath'));settings.onLoad({section:'bad'});assert.equal(settings.data.section,'privacy');
 const markup=fs.readFileSync(path.join(root,'native/pages/profile/index.wxml'),'utf8');assert.match(markup,/open-type="chooseAvatar"/);assert.match(markup,/bindchooseavatar="chooseAvatar"/);
 const settingsMarkup=fs.readFileSync(path.join(root,'native/pages/settings/index.wxml'),'utf8');for(const label of ['隐私','帮助与反馈','关于','AI'])assert.ok(settingsMarkup.includes(label));assert.doesNotMatch(settingsMarkup,/草稿管理|未完成的观察/);assert.doesNotMatch(fs.readFileSync(path.join(root,'native/pages/settings/index.js'),'utf8'),/authenticated\s*:\s*true/);
 assert.equal(settings.data.version,require('../package.json').version);
 console.log('PASS explicit avatar, save/cancel/quota/clear race, privacy default and manual feedback');
})().catch(e=>{console.error(e);process.exitCode=1});
