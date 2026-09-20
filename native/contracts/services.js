// Adapters are implemented; available means callable, not proof of cloud deployment.
module.exports={
 recognition:{provider:'baidu',available:true,request:['requestId','observationId','photoFileId','idempotencyKey'],statuses:['recognized','needs_confirmation','unknown','failed'],candidate:['speciesId','confidence','source'],failureCodes:['blurred','multiple_subjects','no_match','timeout','offline']},
 illustration:{available:true,request:['observationId','speciesId','consent'],statuses:['ready','failed'],note:'百炼万相需确认物种与显式同意；部署失败保留本地卡背'},
 gift:{available:false,request:['cardId','recipientId','idempotencyKey'],requires:['authenticatedOwner','recipientConsent','atomicOwnershipChange','auditEvent'],note:'赠送服务尚未开放；不生成假的成功记录'}
};
