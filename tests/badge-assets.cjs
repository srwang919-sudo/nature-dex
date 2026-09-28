const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const {definitions}=require('../native/lib/badge-model');
assert.equal(definitions.length,12);assert.equal(new Set(definitions.map(b=>b.id)).size,12);
assert.equal(new Set(definitions.map(b=>b.motif)).size,12);
for(const {motif} of definitions){const file=path.join(__dirname,'../assets/badges',motif+'.webp'),bytes=fs.readFileSync(file);assert.ok(bytes.length>12,motif+' is nonempty');assert.equal(bytes.toString('ascii',0,4),'RIFF',motif+' RIFF header');assert.equal(bytes.toString('ascii',8,12),'WEBP',motif+' WebP format');}
assert.ok(!fs.existsSync(path.join(__dirname,'../assets/badges/red-fox.png')));
console.log('PASS all 12 configured badge WebP assets exist and have valid format headers; retired red-fox asset absent. This does not verify commercial rights.');
