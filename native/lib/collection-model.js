const {normalizeLocation}=require('./location-privacy');
const invalid=new Set(['failed','cancelled','processing','generating','fallback']);
function realCards(cards){const ids=new Set();return (Array.isArray(cards)?cards:[]).filter(c=>{if(!c||!c.id||c.sample||c.kind==='example'||invalid.has(c.status)||invalid.has(c.artStatus)||invalid.has(c.recognition?.status)||ids.has(c.id))return false;ids.add(c.id);return true})}
function footprints(cards){const places=new Map();for(const card of realCards(cards)){const raw=card.location;if(!raw||raw.visibility!=='private')continue;const location=normalizeLocation(raw,raw.consentAt);if(!location)continue;const prev=places.get(location.placeId);places.set(location.placeId,{placeId:location.placeId,label:location.label,count:prev?prev.count+1:1})}return [...places.values()]}
function locationFreeCard(card){if(!card)return card;const copy=Object.assign({},card);delete copy.location;return copy}
module.exports={realCards,footprints,locationFreeCard};
