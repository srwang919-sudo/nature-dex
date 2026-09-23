function exportFailure(stage,error={}){
 const area=['front','back','canvas','draw'].includes(stage)?stage:'canvas';
 const allowed=['cloud_download','getImageInfo','image_missing','canvas_export','sync_consent_required'];
 const code=allowed.includes(error.code)?error.code:/^ASSET_DECODE_(FAILED|TIMEOUT|STALE)$/.test(error.code||'')?'decode':area==='canvas'?'canvas':'draw';
 if(code==='sync_consent_required')return {code,stage:area,message:'此卡片尚无本机缓存，请先在隐私设置开启云端卡片恢复。 [导出码:sync_consent_required]'};
 const object=area==='back'?'卡背图片':'照片';
 const message=code==='cloud_download'?object+'云端下载失败，请检查网络后重试。':code==='getImageInfo'?object+'文件无法读取，请在原设备恢复，或重新选择照片。':code==='image_missing'?object+'资源缺失，请重试制卡。':code==='decode'?object+'解码失败，可能是格式异常，请重试或更换照片。':'图片绘制或输出失败，请重新导出；原卡片未受影响。';
 return {code,stage:area,message:message+' [导出码:'+code+' / 阶段:'+area+']'};
}
module.exports={exportFailure};
