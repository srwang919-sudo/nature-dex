// Artwork Variants（Master Plan §5）：同一物种的可复用「呈现方式」变体。
// 变体只描述画幅与呈现，不改变物种身份、解剖准确性与风格禁令；
// 默认变体等价于此前的单一提示词，保证既有生成结果不受影响。
const DEFAULT_VARIANT='museum-plate';
const VARIANTS=Object.freeze({
 'museum-plate':{label:'博物馆图版',clause:'Present it as a restrained museum plate: one centred subject on warm paper with generous even margins and a plain habitat hint at the base.'},
 'field-sketch':{label:'野外速写',clause:'Present it as a field-notebook sketch: lighter wash, a few visible pencil construction lines, and the loose energy of a drawing made on site.'},
 'seasonal-plate':{label:'季节图版',clause:'Present it in its own season: let the surrounding foliage or water carry that season, while the subject stays fully readable.'},
 'specimen-study':{label:'标本细部',clause:'Present it as a specimen study: the whole body plus one small inset of a diagnostic detail such as a wing pattern, beak, or leaf vein.'}
});
const VARIANT_KEYS=Object.freeze(Object.keys(VARIANTS));
function isVariant(value){return typeof value==='string'&&Object.prototype.hasOwnProperty.call(VARIANTS,value)}
function normalizeVariant(value){return isVariant(value)?value:DEFAULT_VARIANT}
// 把变体子句插进基础提示词，且必须留在禁令之前 —— 负面约束放在末尾最有效。
// 默认变体不加任何子句，保持与旧版本逐字节一致。
const BAN_MARKER=' No text';
function withVariant(prompt,variant){
 const key=normalizeVariant(variant);
 if(key===DEFAULT_VARIANT)return prompt;
 const text=String(prompt),clause=VARIANTS[key].clause,at=text.indexOf(BAN_MARKER);
 return at<0?text+' '+clause:text.slice(0,at)+' '+clause+text.slice(at);
}
function variantLabel(value){return VARIANTS[normalizeVariant(value)].label}
// 服务端选变体：让图鉴整体不至于千篇一律，同时不给客户端增加可伪造的入参。
// 规则按「类群 → 呈现方式」固定映射，同物种结果稳定；无法判定时用默认变体。
const CATEGORY_VARIANT=Object.freeze({bird:'field-sketch',insect:'seasonal-plate',animal:'field-sketch',plant:'specimen-study'});
function stableIndex(value,modulo){
 let sum=0;const text=String(value==null?'':value);
 for(let i=0;i<text.length;i++)sum=(sum*31+text.charCodeAt(i))>>>0;
 return sum%modulo;
}
function variantForSpecies(speciesId,category){
 const key=String(category==null?'':category).normalize('NFKC').trim().toLowerCase();
 if(Object.prototype.hasOwnProperty.call(CATEGORY_VARIANT,key))return CATEGORY_VARIANT[key];
 // 没有类群时，用物种 id 稳定地散列到一个非默认变体，保证同一物种每次一致。
 const pool=VARIANT_KEYS.filter(name=>name!==DEFAULT_VARIANT);
 return speciesId?pool[stableIndex(speciesId,pool.length)]:DEFAULT_VARIANT;
}
module.exports={DEFAULT_VARIANT,VARIANTS,VARIANT_KEYS,CATEGORY_VARIANT,isVariant,normalizeVariant,withVariant,variantLabel,variantForSpecies,stableIndex};
