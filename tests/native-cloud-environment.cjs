const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
let app,initialization;
const wx={cloud:{init:options=>initialization=options}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../app.js'),'utf8'),{App:value=>app=value,wx,console,require:require('node:module').createRequire(path.join(__dirname,'../app.js'))});
app.refreshAssetUrls=()=>{};
app.onLaunch();
assert.equal(initialization.env,'nature-prod-d0gufarx064489f0f','native launch must explicitly select production');
assert.equal(initialization.traceUser,false);
console.log('PASS native cloud initialization explicitly selects production without tracking');
