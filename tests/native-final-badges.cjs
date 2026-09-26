const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs');
// 2026-09-26 设计变更（用户确认）：12 枚勋章改用项目内生成的珐琅质感资产（assets/badges/*.webp，
// ImageGen 生成、圆形裁切去背），不再使用纯 CSS 几何图案；locked 仍为灰度 + 虚线轮廓。
test('twelve authored enamel badge assets back the immutable achievements',()=>{
 const {definitions}=require('../native/lib/badge-model');
 assert.equal(new Set(definitions.map(x=>x.motif)).size,12);
 const html=fs.readFileSync('native/components/nature-badge/index.wxml','utf8');
 const css=fs.readFileSync('native/components/nature-badge/index.wxss','utf8');
 assert.ok(html.includes('<image'),'badge renders an authored enamel asset');
 assert.ok(html.includes('/assets/badges/'));
 for(const b of definitions)assert.ok(fs.existsSync('assets/badges/'+b.motif+'.webp'),b.motif+'.webp must exist');
 assert.match(css,/grayscale/);
 assert.ok(!css.includes('animation:'));
});
