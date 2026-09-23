const VERSION=1,PROVIDER='tencent-hunyuan';
function requestArtConsent(wx,{operationId,observationId},now=Date.now){
 return new Promise(resolve=>wx.showModal({title:'生成这张彩绘卡？',content:'本次照片将发送至腾讯云私有存储，并交由腾讯混元生成彩绘。AI 图像仅作艺术表达，不作为物种鉴别依据。',confirmText:'同意并生成',cancelText:'暂不生成',success:r=>resolve(r.confirm?{version:VERSION,provider:PROVIDER,acceptedAt:now(),operationId,observationId}:null),fail:()=>resolve(null)}));
}
module.exports={requestArtConsent};
