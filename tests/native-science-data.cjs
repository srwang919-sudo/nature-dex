const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.join(__dirname,'..'),source=fs.readFileSync(path.join(root,'src/data/species.ts'),'utf8');let app;
vm.runInNewContext(fs.readFileSync(path.join(root,'app.js'),'utf8'),{App:a=>app=a,wx:{}});
assert.equal(Object.keys(app.globalData.species).length,7);
for(const[id,species]of Object.entries(app.globalData.species)){const block=source.split('\n  '+id+': {')[1].split('\n  },')[0];for(const[field,original]of [['family','family'],['season','season'],['factTitle','t'],['factDetail','d'],['knowledge','know']]){const match=block.match(new RegExp('\\b'+original+":\\s*'([^']*)'"));assert.ok(match,'source field '+id+'.'+original);assert.equal(species[field],match[1],id+'.'+field+' matches source')}}
const back=fs.readFileSync(path.join(root,'native/components/collectible/index.wxml'),'utf8'),detail=fs.readFileSync(path.join(root,'native/pages/card/index.wxml'),'utf8');
assert.ok(back.includes('presentation.back.illustration')&&back.includes('presentation.back.no')&&!back.includes('scroll-view'));
for(const label of ['分类','识别与行为','你知道吗','可见季节'])assert.ok(detail.includes(label),label);
console.log('PASS: seven species facts remain source-aligned; concise back defers full science to detail');
