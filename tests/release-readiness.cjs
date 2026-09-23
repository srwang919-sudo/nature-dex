const assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8'),pkg=JSON.parse(read('package.json'));
assert.equal(pkg.scripts['experiment:taro'],undefined);assert.equal(pkg.scripts.clean,undefined);assert.equal(Object.keys(pkg.dependencies||{}).length,0);assert.equal(Object.keys(pkg.devDependencies||{}).length,0);
const css=read('native/components/collectible/index.wxss');assert.match(css,/\.name\{[^}]*font-size:28rpx/);assert.match(css,/\.latin\{[^}]*font-size:24rpx/);assert.match(css,/overflow-wrap:anywhere/);assert.match(css,/\.name-row\{[^}]*min-width:0/);assert.match(css,/\.front-context[^}]*flex-wrap:wrap/);
console.log('PASS native-only dependency manifest and readable bounded card metadata');
