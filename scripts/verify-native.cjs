const fs=require('fs'),cp=require('child_process'),path=require('path');
const root=path.join(__dirname,'..');process.chdir(root);
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
for(const f of walk('native').concat(['app.js','app.json','project.config.json','sitemap.json'])){
 if(f.endsWith('.js'))cp.execFileSync(process.execPath,['--check',f]);
 if(f.endsWith('.json'))JSON.parse(fs.readFileSync(f,'utf8'));
}
for(const p of JSON.parse(fs.readFileSync('app.json')).pages)for(const ext of ['.js','.wxml','.wxss'])if(!fs.existsSync(p+ext))throw Error('Missing native page '+p+ext);
const cfg=JSON.parse(fs.readFileSync('project.config.json'));if(cfg.miniprogramRoot!=='./')throw Error('Release source must be native root');
console.log('PASS native release source and syntax. Import this root in DevTools; no Taro dist or upload was produced.');
