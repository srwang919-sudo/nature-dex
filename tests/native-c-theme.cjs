const assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const css=fs.readFileSync(path.join(__dirname,'../app.wxss'),'utf8').toLowerCase();
// Master Plan §103 令牌：纸张白纸面、墨绿正文、品牌绿、奖励金。
const colors={paper:'#F5F2E9',surface:'#FCFAF3',ink:'#243028',muted:'#5C675C',moss:'#49634E',lake:'#64869A',orange:'#B88752',sun:'#C99B48',line:'#DDD8C6'};
for(const [key,value] of Object.entries(colors))assert.ok(css.includes('--'+key+':'+value.toLowerCase()),key);
// §103 类别色必须齐备：植物/鸟/昆虫/菌/水生
for(const key of ['c-plant','c-bird','c-insect','c-fungi','c-aqua'])assert.ok(css.includes('--'+key+':'),key);
function luminance(hex){return hex.slice(1).match(/../g).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4).reduce((s,x,i)=>s+x*[.2126,.7152,.0722][i],0)}
function contrast(a,b){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)}
for(const key of ['ink','muted','moss'])assert.ok(contrast(colors[key],colors.paper)>=4.5,key+' contrast');
// 主按钮文字对比度：纸白文字压在品牌绿上也要可读
assert.ok(contrast('#F7F5EC',colors.moss)>=4.5,'primary button contrast');
assert.ok(css.includes('min-height:88rpx'));
assert.ok(css.includes('prefers-reduced-motion'));
console.log('PASS museum palette tokens, text contrast and motion fallback');
