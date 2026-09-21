function publicLocation(){return {label:'地点未公开'}}
function normalizeLocation(input,consentAt){
 if(!input||typeof consentAt!=='number'||!Number.isFinite(consentAt)||consentAt<=0)return null;
 if(typeof input.placeId!=='string'||!input.placeId.trim()||typeof input.label!=='string'||!input.label.trim())return null;
 const result={placeId:input.placeId.trim(),label:input.label.trim(),visibility:'private',consentAt};
 if(input.latitude!==undefined||input.longitude!==undefined){
  const {latitude,longitude}=input;
  if(typeof latitude!=='number'||typeof longitude!=='number'||!Number.isFinite(latitude)||!Number.isFinite(longitude)||Math.abs(latitude)>90||Math.abs(longitude)>180)return null;
  Object.assign(result,{latitude,longitude});
 }
 return result;
}
module.exports={publicLocation,normalizeLocation};
