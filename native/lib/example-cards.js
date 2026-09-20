const ids=['ibis','kingfisher','pheasant','egret','sparrow','moth','camellia'];
const finishKeys=Object.freeze({ibis:'numbered',kingfisher:'alt',pheasant:'numbered',egret:'holo',sparrow:'standard',moth:'holo',camellia:'standard'});
const {resolve}=require('./asset-resolver');
const cards=ids.map(id=>Object.freeze({kind:'example',id,speciesId:id,finishKey:finishKeys[id],path:'/assets/images/'+id+'.jpg',sourceLabel:'示例卡 · 非本人拍摄',readOnly:true,sample:true}));
function getExampleCards(){return cards.map(c=>{const img=resolve(c.path);return Object.assign({},c,{photo:img,image:img})})}
function countOwnedSpecies(cards){return new Set(cards.filter(card=>card&&card.kind!=='example').map(card=>card.speciesId)).size}
module.exports={getExampleCards,countOwnedSpecies,finishKeys};
