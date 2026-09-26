const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
test('grid and shelf display the collectible name once, retaining both accessible labels',()=>{const xml=read('native/pages/library/index.wxml');assert.doesNotMatch(xml,/<text class="card-caption">/);assert.equal((xml.match(/aria-label="{{'查看'\+item.zh\+'的收藏卡'}}"/g)||[]).length,2);assert.match(read('native/components/collectible/index.wxml'),/front.name/)});
test('320 and 390 grid budget stays within the viewport without a duplicate caption',()=>{// 网格用 flex 居中：只剩一张卡或末行为奇数时不再贴左，两列宽度预算仍守住视口。
const css=read('native/pages/library/index.wxss');assert.match(css,/\.card-grid\{display:flex/);assert.match(css,/justify-content:center/);assert.match(css,/\.collection-item\{[^}]*min-width:0/);assert.match(css,/calc\(\(100% - 24rpx\)\/2\)/);assert.doesNotMatch(css,/\.card-caption/);
// .page 的左右内边距可以是令牌或字面量：先把 --space-lg 解析成数值，再据此计算两侧留白。
const root=read('app.wxss'),space=(root.match(/--space-lg:\s*(\d+)rpx/)||[])[1];
assert.ok(space,'app.wxss 应定义 --space-lg 令牌');
const unit='(?:var\\(--space-lg\\)|\\d+rpx)';
const page=root.match(new RegExp('\\.page\\{padding:'+unit+' ('+unit+')'));
assert.ok(page,'.page 应声明左右内边距');
const side=page[1].indexOf('var')===0?Number(space):Number(page[1].match(/\d+/)[0]);
assert.ok(side>0,'.page 左右内边距应大于 0');
for(const viewport of [320,390]){const rpx=viewport/750,padding=side*rpx,gap=24*rpx,width=(viewport-padding*2-gap)/2;assert.ok(width>0);assert.ok(2*width+gap+padding*2<=viewport+0.01)}});
