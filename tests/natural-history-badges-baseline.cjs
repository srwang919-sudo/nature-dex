const fs=require('fs'),path=require('path'),assert=require('node:assert/strict'),crypto=require('crypto');
const root=path.join(__dirname,'..');
for(const dir of ['assets/images','assets/fonts','assets/illustrations']){
 if(fs.existsSync(path.join(root,dir)))assert.equal(fs.readdirSync(path.join(root,dir)).length,0,dir+' contains retired assets');
}
// assets/badges 由 tests/native-final-badges.cjs 校验：恰好 12 枚生成珐琅徽章
assert.equal(require('../native/lib/example-cards').getExampleCards().length,0);
assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'src/data/species.ts'))).digest('hex'),'90e28fb240ce6703d8ebb6e3a36471abbbb69973b7ff33d553d888c95600b4ac');
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');assert.ok(!app.includes('/assets/images/'));
const share=require('../native/lib/card-export').publicShare({speciesId:'egret',zh:'白鹭',photoPath:'cloud://private',location:{label:'private'}});
assert.equal(share.imageUrl,'/assets/theme/share-safe-leaf.png');assert.ok(!JSON.stringify(share).includes('cloud://private'));
console.log('PASS latest owner-authorized static asset withdrawal; private records and factual source untouched');
