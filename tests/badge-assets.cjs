const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const {definitions}=require('../native/lib/badge-model');
assert.equal(definitions.length,12);assert.equal(new Set(definitions.map(b=>b.id)).size,12);
assert.equal(new Set(definitions.map(b=>b.motif)).size,12);
const bytes=fs.readFileSync(path.join(__dirname,'../assets/theme/share-safe-leaf.png'));
assert.equal(bytes.readUInt32BE(16),800);assert.equal(bytes.readUInt32BE(20),640);assert.ok(bytes.length<60000);
assert.ok(!fs.existsSync(path.join(__dirname,'../assets/badges/red-fox.png')));
console.log('PASS condition achievements use project-authored neutral leaf, not unverified animal badges');
