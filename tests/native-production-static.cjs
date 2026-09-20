const fs=require('fs'),path=require('path'),assert=require('node:assert/strict'),root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8'),config=JSON.parse(read('project.config.json'));
assert.equal(config.miniprogramRoot,'./');assert.equal(config.setting.minified,true);
for(const value of ['src','dist','node_modules','tests','cloudfunctions'])assert.ok(config.packOptions.ignore.some(x=>x.value===value));
assert.deepEqual(require('../native/lib/tab-model').tabs.map(t=>t.key),['discover','collection','me']);
const card=read('native/pages/card/index.js');assert.equal((card.match(/exportImage\(mode\)/g)||[]).length,1);
assert.ok(card.includes('示例卡不可导出为我的卡')&&card.includes('openPhotoSettings'));
assert.ok(!card.includes("name:'natureAI2'"),'local science and official backs never request generation');
assert.ok(read('native/lib/art-card.js').includes('consent:true'),'AI art has a separate explicit-choice request');
console.log('PASS native-only source, production excludes, export and privacy permission gates');
