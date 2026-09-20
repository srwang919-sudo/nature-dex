function claim(gifts,{giftId,idempotencyKey,recipientId}){const gift=gifts.get(giftId);if(!gift)return {status:'rejected'};if(gift.status==='claimed')return gift.idempotencyKey===idempotencyKey?{status:'created'}:{status:'claimed'};if(gift.status!=='open')return {status:gift.status==='expired'?'expired':'rejected'};gift.status='claimed';gift.idempotencyKey=idempotencyKey;gift.recipientId=recipientId;gifts.set(giftId,gift);return {status:'created'}}
async function main(){return {status:'rejected',code:'not_configured'}}
module.exports={main,claim};
