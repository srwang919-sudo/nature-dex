const assert=require('node:assert/strict'),{main}=require('../cloudfunctions/speciesIllustration');
(async()=>{let calls=0;const cloud={getWXContext:()=>({OPENID:'owner'}),database(){calls++;throw Error('old cache must not be read')}};
 for(const event of [{action:'ensure',speciesId:'ibis',confirmed:true},{action:'ensure',speciesId:'海芋',confirmed:true},{action:'ensure',photoFileId:'private'}])assert.equal((await main(event,{cloud})).code,'legacy_generation_disabled');
 assert.equal(calls,0);console.log('PASS old shared ensure is disabled, never reads ready cache or invokes provider');
})().catch(e=>{console.error(e);process.exitCode=1});
