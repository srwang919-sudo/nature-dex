const labels={active:'尚未申请云端清除',processing:'云端清理进行中，可继续清理',failed:'云端清理未完成，请重试',erased:'云端非财务个人数据已清除'};
async function privacyAction(action,api=wx){
 if(!['requestErasure','continueErasure','status'].includes(action))throw Error('invalid_action');
 if(!api.cloud?.callFunction)throw Error('cloud_unavailable');
 const response=await api.cloud.callFunction({name:'managePrivacy',data:{action}}),result=response.result;
 if(!result||!labels[result.status])throw Error('privacy_unavailable');
 return {...result,label:labels[result.status]};
}
module.exports={privacyAction};
