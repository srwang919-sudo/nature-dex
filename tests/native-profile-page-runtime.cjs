const assert=require('node:assert/strict'),{buildProfile,checkIn}=require('../native/lib/profile-model'),fs=require('fs'),path=require('path');
const empty=buildProfile([]);assert.deepEqual(empty.stats,{species:0,count:0,days:0,badges:0});assert.equal(empty.name,'本地收藏');assert.equal(empty.isDemo,false);
assert.equal(buildProfile([{sample:true,speciesId:'ibis'},{id:'r',speciesId:'egret',createdAt:1}]).stats.count,1);
assert.equal(checkIn({},'today').pointsAdded,0);
const html=fs.readFileSync(path.join(__dirname,'../native/pages/profile/index.wxml'),'utf8');
assert.ok(html.includes('我的笔记')&&html.includes('本地收藏'));assert.ok(!html.includes('￥18')&&!html.includes('免费版每天 1 次识别'));
console.log('PASS zero and real profile statistics without fake subscription or rewards');
