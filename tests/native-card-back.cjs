const fs=require('fs'),assert=require('node:assert/strict');
const markup=fs.readFileSync(require('path').join(__dirname,'../native/components/collectible/index.wxml'),'utf8'),back=markup.slice(markup.indexOf('<view wx:else class="back">'));
assert.ok(!back.includes('presentation.front.photo')&&!back.includes('card.photoPath'));
assert.ok(!back.includes('scroll-view'));assert.ok(back.includes('presentation.back.illustration'));
assert.ok(back.includes('presentation.back.no')&&back.includes('presentation.back.date'));
console.log('PASS current illustration card back is separate from observation photo and preserves provenance');
