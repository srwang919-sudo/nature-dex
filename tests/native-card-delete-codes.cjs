const assert=require('node:assert/strict'),{classify,messageFor,CODES}=require('../native/lib/card-delete');
require('node:test')('deletion outcomes map to readable reasons',async t=>{
 await t.test('confirmed removal has no code',()=>{
  assert.equal(classify({result:{status:'deleted'}}),null);
  assert.equal(classify({result:{status:'deleted',mode:'no_cloud_asset'}}),null);
 });
 await t.test('cloud replies keep their own code',()=>{
  assert.equal(classify({result:{status:'failed',code:'asset_registry_missing'}}),'asset_registry_missing');
  assert.equal(classify({result:{status:'failed',code:'deletion_pending'}}),'deletion_pending');
  assert.equal(classify({result:{status:'failed'}}),'cloud_delete_failed');
  assert.equal(classify({result:{status:'failed',code:'unknown_code'}}),'cloud_delete_failed');
  assert.equal(classify({result:{status:'retained'}}),'observation_saved');
 });
 await t.test('transport problems are classified separately',()=>{
  assert.equal(classify({result:null}),'cloud_unreachable');
  assert.equal(classify({error:Error('FunctionName parameter could not be found')}),'function_not_found');
  assert.equal(classify({error:{errMsg:'cloud.callFunction:fail invalid_request'}}),'invalid_request');
  assert.equal(classify({error:Error('runtime_unavailable')}),'runtime_unavailable');
  assert.equal(classify({error:Error('network down')}),'cloud_unreachable');
 });
 await t.test('every code has a message and unknown codes fall back',()=>{
  Object.keys(CODES).forEach(code=>assert.match(messageFor(code),/[一-龥]/));
  assert.match(messageFor('something_else'),/[一-龥]/);
 });
});
