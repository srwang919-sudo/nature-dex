const {POLICY}=require('./v1-policy');
function membershipView(){const monthly=POLICY.monthlyFen/100,yearly=POLICY.annualFen/100,savingFen=POLICY.monthlyFen*12-POLICY.annualFen;return {availability:'unavailable',monthly,yearly,saving:savingFen/100,savingPercent:Math.round(savingFen/(POLICY.monthlyFen*12)*1000)/10}}
function socialView(){return {availability:'unavailable',friends:[]}}
module.exports={membershipView,socialView};
