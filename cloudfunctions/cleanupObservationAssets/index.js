// Deployment-local copy of the owner-derived deletion boundary; never treat -1 as absent.
const {main:remove}=require('./delete-observation');
async function main(event={},deps={}){const result=await remove(event,{...deps,requireUnfinished:true});return result.status==='deleted'?{status:'cleaned'}:result}
module.exports={main};
