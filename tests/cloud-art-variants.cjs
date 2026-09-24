const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const digest=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const variants=require('../cloudfunctions/speciesIllustration/artwork-variants');
const {buildPublicSpeciesPrompt}=require('../cloudfunctions/speciesIllustration/prompt');

test('the variant module cannot drift between the two art functions',()=>{
 const hashes=['speciesIllustration','createArtCard'].map(d=>digest(path.join(root,'cloudfunctions',d,'artwork-variants.js')));
 assert.equal(new Set(hashes).size,1);
});

test('the default variant keeps the shipped prompt byte-identical',()=>{
 const plain=buildPublicSpeciesPrompt('kingfisher');
 assert.equal(buildPublicSpeciesPrompt('kingfisher',undefined),plain,'no variant argument is the legacy behaviour');
 assert.equal(buildPublicSpeciesPrompt('kingfisher','museum-plate'),plain);
 assert.equal(buildPublicSpeciesPrompt('kingfisher','not-a-variant'),plain,'an unknown variant never invents a new prompt');
 assert.equal(variants.normalizeVariant('nope'),'museum-plate');
 assert.equal(variants.isVariant('field-sketch'),true);
 assert.equal(variants.isVariant('Field-Sketch'),false);
});

test('a variant only inserts one presentation clause, and the style bans stay last',()=>{
 const base=buildPublicSpeciesPrompt('egret');
 for(const key of variants.VARIANT_KEYS){
  const prompt=buildPublicSpeciesPrompt('egret',key),clause=variants.VARIANTS[key].clause;
  if(key===variants.DEFAULT_VARIANT)assert.equal(prompt,base,'the default variant changes nothing');
  else assert.equal(prompt.replace(' '+clause,''),base,key+' differs from the base plate only by its own clause');
  assert.match(prompt,/No text, letters, numbers, labels, card frame, logo, signature, photographic look, fantasy traits, duplicated anatomy, invented markings, or another species\.$/,key+' must leave the negative constraints as the final sentence');
  assert.equal(prompt.split(clause).length-1,key===variants.DEFAULT_VARIANT?0:1,key+' must not repeat its clause');
 }
 assert.equal(new Set(variants.VARIANT_KEYS.map(k=>variants.VARIANTS[k].clause)).size,variants.VARIANT_KEYS.length,'every variant documents its own clause');
 assert.equal(Object.keys(variants.CATEGORY_VARIANT).every(k=>variants.VARIANT_KEYS.includes(variants.CATEGORY_VARIANT[k])),true,'category mapping may only point at real variants');
 assert.equal(variants.withVariant('no marker here','field-sketch'),'no marker here '+variants.VARIANTS['field-sketch'].clause,'a prompt without the ban marker still gets the clause');
});

test('variants are chosen server-side and stay stable per species',()=>{
 assert.equal(variants.variantForSpecies('egret','bird'),'field-sketch');
 assert.equal(variants.variantForSpecies('camellia','plant'),'specimen-study');
 assert.equal(variants.variantForSpecies('moth','insect'),'seasonal-plate');
 assert.equal(variants.variantForSpecies('pheasant','animal'),'field-sketch');
 assert.equal(variants.variantForSpecies('x','BIRD'),'field-sketch','category matching is normalised');
 const first=variants.variantForSpecies('egret');
 assert.equal(variants.variantForSpecies('egret'),first,'the same species never changes look between runs');
 assert.ok(variants.VARIANT_KEYS.includes(first));
 assert.equal(variants.variantForSpecies(''),'museum-plate','an unknown subject falls back to the default plate');
 const spread=new Set(['egret','kingfisher','ibis','moth','camellia','sparrow','pheasant'].map(id=>variants.variantForSpecies(id)));
 assert.ok(spread.size>1,'the atlas is not meant to be visually uniform');
 for(const id of ['egret','kingfisher','ibis','moth','camellia','sparrow','pheasant'])assert.notEqual(variants.variantForSpecies(id),'museum-plate');
});

test('generation uses the server-derived variant and records it on the artwork',()=>{
 const flow=read('cloudfunctions/speciesIllustration/artwork-flow.js');
 assert.match(flow,/const variant=variantForSpecies\(op\.speciesId\);/);
 assert.match(flow,/buildPublicSpeciesPrompt\(op\.speciesId,variant\)/);
 assert.match(flow,/variant:variantForSpecies\(op\.speciesId\)/);
 assert.doesNotMatch(flow,/event\.variant/,'a client-supplied variant would be forgeable');
 const prompt=read('cloudfunctions/speciesIllustration/prompt.js');
 assert.match(prompt,/withVariant\(BASE_PROMPT\(name\),normalizeVariant\(variant\)\)/);
});
