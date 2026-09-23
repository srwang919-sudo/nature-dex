const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),cfg=JSON.parse(fs.readFileSync(path.join(root,'project.config.json'))),ignore=cfg.packOptions.ignore.map(i=>i.value),files=[];
function walk(dir=''){for(const e of fs.readdirSync(path.join(root,dir),{withFileTypes:true})){const p=path.join(dir,e.name);if(e.name.startsWith('.')||ignore.some(i=>p===i||p.startsWith(i+'/')))continue;if(e.isDirectory())walk(p);else files.push({path:p,size:fs.statSync(path.join(root,p)).size})}}
walk();const bytes=files.reduce((n,f)=>n+f.size,0);assert.ok(bytes<2*1024*1024,'uncompressed conservative main package '+bytes+' exceeds 2MiB');
assert.equal(files.filter(f=>f.path.startsWith('assets/badges/')).length,0);
console.log('PASS conservative uncompressed main package',bytes,'bytes,',files.length,'files');
