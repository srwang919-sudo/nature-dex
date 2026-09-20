const assert=require('node:assert/strict');
const {recognitionError}=require('../native/lib/recognition-errors');
const {classifyRecognition}=require('../native/lib/recognition-result');
assert.equal(classifyRecognition({status:'failed',code:'not_configured'},true).code,'not_configured');
assert.ok(recognitionError({code:'not_configured'}).includes('BAIDU_API_KEY'));
assert.ok(recognitionError({code:'provider_quota',providerCode:17}).includes('17'));
assert.ok(!recognitionError({code:'bad-secret',message:'secret',providerCode:'secret'}).includes('secret'));
assert.ok(recognitionError({errCode:-501000}).includes('云函数'));
console.log('PASS safe allowlisted recognition codes survive classification without raw provider details');
