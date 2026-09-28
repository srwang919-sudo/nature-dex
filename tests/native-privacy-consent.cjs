const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.join(__dirname,'..');
test('privacy gate resolves concurrent requests only after a real platform agree event; hide/detach cancel',()=>{
 let definition;vm.runInNewContext(fs.readFileSync(path.join(root,'native/components/privacy-consent/index.js'),'utf8'),{Component:x=>definition=x,wx:{getPrivacySetting:o=>o.success({privacyContractName:'指引'})}});
 const c={...definition.methods,data:{},setData(v){Object.assign(this.data,v)}},answers=[];
 c.request(r=>answers.push(r));c.request(r=>answers.push(r));assert.equal(answers.length,0);assert.equal(c.data.visible,true);
 c.agree();assert.deepEqual(JSON.parse(JSON.stringify(answers)),[{event:'agree',buttonId:'nature-privacy-agree'},{event:'agree',buttonId:'nature-privacy-agree'}]);c.agree();assert.equal(answers.length,2);
 c.request(r=>answers.push(r));definition.pageLifetimes.hide.call(c);assert.equal(answers.at(-1).event,'disagree');
 c.request(r=>answers.push(r));definition.lifetimes.detached.call(c);assert.equal(answers.at(-1).event,'disagree');
 const wxml=fs.readFileSync(path.join(root,'native/components/privacy-consent/index.wxml'),'utf8');assert.match(wxml,/open-type="agreePrivacyAuthorization" bindagreeprivacyauthorization="agree"/);assert.doesNotMatch(wxml,/bindtap="agree"/);
 const config=JSON.parse(fs.readFileSync(path.join(root,'app.json'),'utf8'));for(const page of config.pages)assert.match(fs.readFileSync(path.join(root,page+'.wxml'),'utf8'),/<privacy-consent id="nature-privacy"\/>/);
 const app=fs.readFileSync(path.join(root,'app.js'),'utf8');assert.match(app,/onNeedPrivacyAuthorization/);assert.doesNotMatch(app,/onNeedPrivacyAuthorize\(|requirePrivacyAuthorize\(/);
});
