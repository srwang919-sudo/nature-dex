const assert=require('node:assert/strict'),{exportFailure}=require('../native/lib/export-error');
for(const code of ['cloud_download','getImageInfo','image_missing','canvas_export'])assert.equal(exportFailure('back',{code}).code,code);
assert.equal(exportFailure('front',{code:'ASSET_DECODE_FAILED'}).code,'decode');
assert.equal(exportFailure('canvas').code,'canvas');
assert.equal(exportFailure('draw').code,'draw');
assert.ok(!JSON.stringify(exportFailure('private/photo',{code:'secret',message:'token=private https://private'})).includes('private'));
console.log('PASS safe cloud download/image info/decode/canvas and front/back export diagnostics');
