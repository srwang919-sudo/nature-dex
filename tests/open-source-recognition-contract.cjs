const assert=require('node:assert/strict');
const {recognizeObservation,listFixtures}=require('../native/services/mock-recognition');
const {classifyRecognition}=require('../native/lib/recognition-result');

(async()=>{
  const required=['confirmed','candidate','unknown','non_biological','unavailable'];
  assert.deepEqual(listFixtures(),required);

  for(const fixture of required){
    const result=await recognizeObservation({fixture});
    assert.equal(typeof result.status,'string',fixture);
    assert.ok(Array.isArray(result.candidates),fixture);
    assert.equal(result.source,'mock-fixture',fixture);
    const classified=classifyRecognition(result,result.status!=='unavailable');
    assert.equal(classified.status,result.status,fixture);
  }

  const candidate=await recognizeObservation({fixture:'candidate'});
  assert.ok(candidate.candidates.every(item=>item.confidence>=0&&item.confidence<=1));
  assert.equal((await recognizeObservation({fixture:'unknown'})).candidates.length,0);
  assert.equal((await recognizeObservation({fixture:'missing'})).status,'failed');
  console.log('PASS: open-source recognition fixtures cover confirmation, uncertainty, unknown, and unavailable states');
})().catch(error=>{console.error(error);process.exitCode=1});
