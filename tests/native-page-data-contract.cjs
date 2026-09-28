const fs=require('fs'),path=require('path'),assert=require('node:assert/strict'),root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
for(const p of JSON.parse(read('app.json')).pages)for(const x of ['.js','.wxml','.wxss'])assert.ok(fs.existsSync(path.join(root,p+x)));
const home=read('native/pages/home/index.wxml'),friend=read('native/pages/friend/index.js'),observe=read('native/pages/observe/index.js'),profile=read('native/pages/profile/index.wxml');
assert.ok(home.includes('去大自然里')&&home.includes('拍一张')&&!home.includes('探索任务')&&!home.includes('今天的遇见'));
assert.ok(!friend.includes('getLocation'));assert.ok(profile.includes('我的观察档案')&&!profile.includes('nash'));
assert.ok(observe.includes("name:'recognizeObservation'")&&!observe.includes("action:'recognize'"));
assert.ok(observe.includes("c.createdAt&&new Date(c.createdAt).toDateString()===today"));
console.log('PASS registered native pages, location privacy, real profile and Baidu routing');
