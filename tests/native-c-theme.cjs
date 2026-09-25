const assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const css=fs.readFileSync(path.join(__dirname,'../app.wxss'),'utf8').toLowerCase();
// 温暖自然色系令牌（2026-09 重设计）：米白纸面、深炭正文、苔藓绿品牌、暖阳金奖励。
const colors={paper:'#FAF9F6',surface:'#FFFFFF',ink:'#2C3E35',muted:'#66756B',moss:'#4A7C59',lake:'#5B8BC7',orange:'#C98A5A',sun:'#D4A574',line:'#E5E3DA'};
for(const [key,value] of Object.entries(colors))assert.ok(css.includes('--'+key+':'+value.toLowerCase()),key);
// §103 类别色必须齐备：植物/鸟/昆虫/菌/水生
for(const key of ['c-plant','c-bird','c-insect','c-fungi','c-aqua'])assert.ok(css.includes('--'+key+':'),key);
// 语义层必须落在基础色之上，页面只消费语义层
for(const key of ['color-bg','color-surface-1','color-surface-2','color-surface-3','color-text','color-text-secondary','color-border','color-primary','color-primary-light','color-accent','color-danger','color-success','color-warning','color-info'])assert.ok(css.includes('--'+key+':'),key);
// 三级阴影与圆角/间距/字号体系
for(const key of ['shadow-sm','shadow-md','shadow-lg','radius-sm','radius-md','radius-lg','radius-xl','space-xs','space-sm','space-md','space-lg','space-xl','text-xs','text-sm','text-base','text-lg','text-xl'])assert.ok(css.includes('--'+key+':'),key);
// 页面不得再用旧硬编码回退值（var(--token, #旧色)）
const stale=/var\(--[a-z-]+,\s*#[0-9a-f]{3,8}\)/;
for(const file of ['../app.wxss','../native/pages/home/index.wxss','../native/pages/nearby/index.wxss','../native/pages/print-admin/index.wxss','../native/pages/profile/index.wxss'])assert.doesNotMatch(fs.readFileSync(path.join(__dirname,file),'utf8').toLowerCase(),stale,file);
function luminance(hex){return hex.slice(1).match(/../g).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4).reduce((s,x,i)=>s+x*[.2126,.7152,.0722][i],0)}
function contrast(a,b){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)}
for(const key of ['ink','muted','moss'])assert.ok(contrast(colors[key],colors.paper)>=4.5,key+' contrast');
// 主按钮文字对比度：白字压在品牌绿上也要可读
assert.ok(contrast('#FFFFFF',colors.moss)>=4.5,'primary button contrast');
// 触控区 ≥88rpx 且由令牌统一出口
assert.ok(css.includes('--tap-min:88rpx'));
assert.ok(css.includes('min-height:var(--tap-min)'));
assert.ok(css.includes('prefers-reduced-motion'));
console.log('PASS museum palette tokens, text contrast and motion fallback');
