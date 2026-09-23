const test=require('node:test'),assert=require('node:assert/strict');
test('five destinations reserve center discovery without adding fictitious nearby data',()=>{
 const {navigationItems}=require('../native/lib/tab-model');assert.deepEqual(navigationItems.map(x=>x.label),['探索','图鉴','发现','旅程','我的']);assert.equal(navigationItems[2].url,'/native/pages/observe/index?source=camera');assert.equal(navigationItems[3].url,'/native/pages/journey/index');
});
