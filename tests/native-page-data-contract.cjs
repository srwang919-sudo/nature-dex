const fs=require('fs'),path=require('path'),assert=require('node:assert/strict'),root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
for(const p of JSON.parse(read('app.json')).pages)for(const x of ['.js','.wxml','.wxss'])assert.ok(fs.existsSync(path.join(root,p+x)));
const home=read('native/pages/home/index.wxml'),nearby=read('native/pages/nearby/index.js'),observe=read('native/pages/observe/index.js'),profile=read('native/pages/profile/index.wxml');
assert.ok(home.includes('去大自然里')&&home.includes('去拍摄')&&home.includes('探索任务')&&home.includes('今日收集'));
assert.ok(!nearby.includes('getLocation'));assert.ok(profile.includes('本地收藏')&&!profile.includes('nash'));
assert.ok(observe.includes("name:'recognizeObservation'")&&!observe.includes("action:'recognize'"));
assert.ok(observe.includes("c.createdAt&&new Date(c.createdAt).toDateString()===today"));
console.log('PASS registered native pages, location privacy, real profile and Baidu routing');
