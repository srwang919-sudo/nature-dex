const assert=require('node:assert/strict')
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm')
const root=path.join(__dirname,'..'),source=file=>fs.readFileSync(path.join(root,file),'utf8')
const destinations=[]
const wx={getStorageSync:()=>false,navigateTo:options=>destinations.push(options.url),reLaunch:options=>destinations.push(options.url)}
const app={
  getCards:()=>[{id:'real',speciesId:'kingfisher',photoPath:'wxfile://real.jpg'}],
  decorate:card=>Object.assign({},card)
}
let page
vm.runInNewContext(source('native/pages/home/index.js'),{Page:value=>page=value,getApp:()=>app,wx,Set,Object,Math,require:require('node:module').createRequire(path.join(root,'native/pages/home/index.js'))})
page.setData=function(value){Object.assign(this.data,value)}
page.refresh()
assert.equal(app.getCards().length,1,'home never injects example records')
assert.equal(page.data.found,1);assert.equal(page.data.total,7);assert.equal(page.data.task.kind,'next')
assert.equal(page.data.today.length,0,'undated record cannot pretend to be collected today')
app.getCards=()=>[{kind:'example',speciesId:'ibis'},{sample:true,speciesId:'moth'}];page.refresh()
assert.equal(page.data.found,0);assert.equal(page.data.task.kind,'first')
app.getCards=()=>[{id:'a',speciesId:'kingfisher'},{id:'b',speciesId:'kingfisher'}];page.refresh()
assert.equal(page.data.found,1)
page.nearby();page.observe();page.album()
assert.equal(JSON.stringify(destinations),JSON.stringify(['/native/pages/nearby/index','/native/pages/observe/index','/native/pages/observe/index?source=album']))
console.log('PASS truthful home progress, sample exclusion, duplicates and distinct routes')
