const assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const css=fs.readFileSync(path.join(__dirname,'../app.wxss'),'utf8').toLowerCase();
const colors={paper:'#FFF8E8',surface:'#FFFCF4',ink:'#183F36',muted:'#52635A',moss:'#647B42',lake:'#3C7F92',orange:'#B8492A',sun:'#F2CF70',line:'#DED8C6'};
for(const [key,value] of Object.entries(colors))assert.ok(css.includes('--'+key+':'+value.toLowerCase()),key);
function luminance(hex){return hex.slice(1).match(/../g).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4).reduce((s,x,i)=>s+x*[.2126,.7152,.0722][i],0)}
function contrast(a,b){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)}
for(const key of ['ink','muted','orange'])assert.ok(contrast(colors[key],colors.paper)>=4.5,key+' contrast');
assert.ok(css.includes('min-height:88rpx'));
assert.ok(css.includes('prefers-reduced-motion'));
console.log('PASS C theme tokens, text contrast and motion fallback');
