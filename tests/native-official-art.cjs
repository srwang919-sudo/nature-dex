const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const {presentCard}=require('../native/lib/card-presentation'),{localIllustrationFor}=require('../native/lib/species-illustration');
for(const id of ['kingfisher','egret','ibis','pheasant','sparrow','moth','camellia','unknown']){
 const fallback=localIllustrationFor(id);assert.ok(fs.existsSync(path.join(__dirname,'..',fallback)));
 const card=presentCard({speciesId:id,illustrationUrl:'cloud://private-old-task',photoPath:'original',artPhotoPath:'cloud://art'});
 assert.notEqual(card.back.illustration,'cloud://private-old-task');assert.equal(card.front.photo,'cloud://art');
}
const page=fs.readFileSync(path.join(__dirname,'../native/pages/card/index.js'),'utf8');
assert.ok(!page.includes("name:'natureAI2'"),'science and back do not depend on cloud generation');
const reveal=fs.readFileSync(path.join(__dirname,'../native/pages/reveal/index.js'),'utf8');
assert.ok(reveal.includes('!this.data.reduce&&wx.vibrateShort'));
assert.ok(reveal.indexOf('app.updateCard(raw)')<reveal.indexOf('this.machine().start()'),'persist before animation');
console.log('PASS official species assets exist, old private back ignored, AI provenance independent, reveal persistence');
