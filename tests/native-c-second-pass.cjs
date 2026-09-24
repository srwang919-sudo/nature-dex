const assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),{buildProfile}=require('../native/lib/profile-model');
assert.equal(buildProfile([{id:'a',speciesId:'kingfisher'},{id:'b',speciesId:'kingfisher'},{speciesId:'ibis',sample:true}]).stats.repeat,1);
assert.equal(buildProfile([]).stats.repeat,0);
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const profile=read('native/pages/profile/index.wxml');
for(const label of ['物种','记录','观察','勋章','笔记'])assert.ok(profile.includes(label));
assert.ok(profile.includes('avatar-picker'));
assert.ok(read('native/pages/library/index.wxml').includes('collection-card'));
assert.ok(!read('native/pages/library/index.wxml').includes('card-caption'));
assert.ok(read('native/pages/home/index.wxml').includes('world-canvas'));
// 手绘分层场景（§32）：十件可复用水彩元素按层拼合，替代纯 CSS 色块场景。
for(const asset of ['sun','cloud','hills-back','tree-lush','tree-autumn','tree-winter','grass-bank','rocks','reeds','mushroom'])assert.ok(read('native/pages/home/index.wxml').includes('/assets/scene/'+asset+'.webp'),'hand-drawn decor missing '+asset);
assert.ok(read('native/pages/home/index.wxml').includes('zone-{{item.worldZone}}'),'specimens must still be placed by authored ecosystem zones');
assert.ok(read('native/pages/home/index.wxml').includes('world-empty-copy'));
assert.ok(!read('native/pages/home/index.wxml').includes('exploration-hero.jpg'));
console.log('PASS Master real repeat statistics, authored world zones and honest empty canvas');
