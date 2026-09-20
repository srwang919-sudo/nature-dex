const fixtures=Object.freeze({
  confirmed:{status:'recognized',candidates:[{speciesId:'ibis',confidence:.94,source:'mock-fixture'}],source:'mock-fixture'},
  candidate:{status:'needs_confirmation',candidates:[{speciesId:'kingfisher',confidence:.58,source:'mock-fixture'},{speciesId:'egret',confidence:.31,source:'mock-fixture'}],source:'mock-fixture'},
  unknown:{status:'unknown',candidates:[],source:'mock-fixture'},
  non_biological:{status:'unknown',candidates:[],source:'mock-fixture',code:'no_match'},
  unavailable:{status:'unavailable',candidates:[],source:'mock-fixture',code:'not_configured'}
});

function recognizeObservation(input={}){
  const fixture=fixtures[input.fixture||'confirmed'];
  return Promise.resolve(fixture?JSON.parse(JSON.stringify(fixture)):{status:'failed',candidates:[],source:'mock-fixture',code:'invalid_request'});
}

function listFixtures(){return Object.keys(fixtures)}

module.exports={recognizeObservation,listFixtures};
