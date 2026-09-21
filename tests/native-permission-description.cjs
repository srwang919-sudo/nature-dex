const assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const config=JSON.parse(fs.readFileSync(path.join(__dirname,'../app.json'),'utf8'));
const desc=config.permission['scope.userLocation'].desc;
assert.ok(desc.trim().length>0&&Array.from(desc).length<=30,'location purpose must contain 1–30 characters');
assert.deepEqual(config.requiredPrivateInfos,['chooseLocation']);
console.log('PASS location permission description length and explicit-only location API');
