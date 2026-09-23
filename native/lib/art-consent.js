const VERSION=1,PROVIDER='tencent-hunyuan';
function requestArtConsent(wx,{operationId,observationId},now=Date.now){
 return new Promise(resolve=>wx.showModal({title:'创作物种插画？',content:'本次使用腾讯混元根据已确认的物种名称创作插画，成功消耗一次创作额度；不发送你的照片作为生图参考。原照片保留在腾讯云私有存储。插画审核前仅你可用，不作为鉴别依据。',confirmText:'同意并创作',cancelText:'暂不创作',success:r=>resolve(r.confirm?{version:VERSION,provider:PROVIDER,acceptedAt:now(),operationId,observationId}:null),fail:()=>resolve(null)}));
}
module.exports={requestArtConsent};
