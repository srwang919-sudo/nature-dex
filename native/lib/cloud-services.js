const {recognition,illustration,gift}=require('../contracts/services');
function unavailable(service){return Promise.resolve({status:'unavailable',code:'not_configured',service})}
function callRecognition(input){return recognition.available?wx.cloud.callFunction({name:'recognizeObservation',data:input}):unavailable('recognition')}
function requestIllustration(input){return illustration.available?wx.cloud.callFunction({name:'generateIllustration',data:input}):unavailable('illustration')}
function claimGift(input){return gift.available?wx.cloud.callFunction({name:'claimGift',data:input}):unavailable('gift')}
function classifyDeleteResult(result){return result&&result.deleted?'deleted':'queued'}
module.exports={callRecognition,requestIllustration,claimGift,classifyDeleteResult};
