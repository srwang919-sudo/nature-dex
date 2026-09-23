const finishKeys=Object.freeze({});
function getExampleCards(){return []}
function countOwnedSpecies(cards){return new Set((Array.isArray(cards)?cards:[]).filter(card=>card&&card.kind!=='example'&&card.sample!==true&&card.speciesId).map(card=>card.speciesId)).size}
module.exports={getExampleCards,countOwnedSpecies,finishKeys};
