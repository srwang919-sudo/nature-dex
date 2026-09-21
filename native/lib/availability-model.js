function membershipView(){const monthly=18,yearly=180,saving=monthly*12-yearly;return {availability:'unavailable',monthly,yearly,saving,savingPercent:Math.round(saving/(monthly*12)*1000)/10}}
function socialView(){return {availability:'unavailable',friends:[]}}
module.exports={membershipView,socialView};
