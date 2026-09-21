const assert=require("node:assert/strict");
const {buildAchievements,firstUnlockedBadge}=require("../native/lib/badge-model");
const sample=[{id:"s",speciesId:"ibis",sample:true},{id:"e",speciesId:"pheasant",kind:"example"}];
assert.equal(buildAchievements(sample).filter(b=>b.earned).length,0);
assert.equal(buildAchievements([{id:'failed',speciesId:'kingfisher',artStatus:'failed'},{id:'pending',speciesId:'ibis',artStatus:'processing'},{id:'failed2',speciesId:'panda',status:'failed'}]).filter(b=>b.earned).length,0);
const real={id:"a",speciesId:"kingfisher"};
assert.equal(buildAchievements(sample.concat(real)).length,12);
assert.equal(firstUnlockedBadge(sample,sample.concat(real)).id,"first");
assert.equal(firstUnlockedBadge([real],[real,{id:"b",speciesId:"kingfisher"}]),null);
assert.equal(buildAchievements([{id:"c",speciesId:"赤狐"}]).find(b=>b.id==="first").earned,true);
console.log("PASS twelve badges, examples excluded, aliases and first unlock");
const fs=require('fs'),vm=require('vm'),path=require('path'),{createRequire}=require('module');
const file=path.join(__dirname,'../native/pages/reveal/index.js');
function reveal(before,card,fail=false){let page,vibrations=0,nav=0;const cards=before.slice(),app={getCards:()=>cards,findCard:()=>card,addCard:c=>{if(fail)throw Error('storage');cards.push(c)},clearFiledDraft(){}};
 vm.runInNewContext(fs.readFileSync(file,'utf8'),{getApp:()=>app,Page:p=>page=p,require:createRequire(file),wx:{showToast(){},reLaunch(){nav++},vibrateShort(){vibrations++}}});
 page.data={opened:true,intro:false,reduce:true};page.setData=p=>Object.assign(page.data,p);page.id=card.id;page.collect();return {page,vibrations,nav};
}
const first=reveal([],real);assert.equal(first.page.data.unlockedBadge.id,'first');assert.equal(first.page.data.badgeRevealed,true);assert.equal(first.vibrations,0);assert.equal(first.nav,0);
assert.equal(reveal([real],{id:'b',speciesId:'kingfisher'}).page.data.unlockedBadge,null);
assert.equal(reveal([],sample[0]).page.data.unlockedBadge,undefined);
assert.equal(reveal([],real,true).page.data.badgeRevealed,undefined);
for(const name of ['profile']){const markup=fs.readFileSync(path.join(__dirname,'../native/pages/'+name+'/index.wxml'),'utf8');assert.ok(markup.includes('item.asset')&&markup.includes('item.earned')&&markup.includes('badgeError'));}
assert.ok(!fs.readFileSync(path.join(__dirname,'../native/pages/library/index.wxml'),'utf8').includes('species-badge'),'library no longer contains achievement modules');
console.log('PASS successful first collection only, duplicate/sample/failure and reduced motion');
let profilePage;const profileFile=path.join(__dirname,'../native/pages/profile/index.js');
vm.runInNewContext(fs.readFileSync(profileFile,'utf8'),{Page:p=>profilePage=p,getApp:()=>({getCards:()=>[],decorate:c=>c,getBadges:()=>({badges:[{earned:true},{earned:false}],speciesBadges:[{earned:true},{earned:true},{earned:false}]})}),wx:{getStorageSync:()=>null},require:createRequire(profileFile)});
profilePage.setData=p=>Object.assign(profilePage.data,p);profilePage.refresh();assert.equal(profilePage.data.profile.stats.badges,1);
console.log('PASS profile badge count only uses unified achievements');
