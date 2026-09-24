const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const {buildRegionAtlas,seasonTags,seasonOfMonth,seasonalChecklist,ATLAS_LIMIT}=require('../native/lib/region-atlas');

const catalog={
 kingfisher:{id:'kingfisher',zh:'普通翠鸟',latin:'Alcedo atthis',habitat:'塘畔 · 溪流',season:'全年可见'},
 egret:{id:'egret',zh:'白鹭',latin:'Egretta garzetta',habitat:'滩涂 · 稻田',season:'春秋过境'},
 camellia:{id:'camellia',zh:'山茶',latin:'Camellia japonica',habitat:'山林 · 公园',season:'11–3 月花期'},
 moth:{id:'moth',zh:'绿尾大蚕蛾',latin:'Actias ningpoana',habitat:'阔叶林 · 灯火下',season:'5–9 月'},
 sparrow:{id:'sparrow',zh:'麻雀',latin:'Passer montanus',habitat:'屋檐 · 街巷',season:''}
};
// 2026-09-24 → 秋
const AUTUMN=new Date(2026,8,24,10).getTime();
const place={placeId:'west-lake',label:'西湖',visibility:'private',consentAt:1};

test('season parsing is strict and never invents a season',()=>{
 assert.deepEqual(seasonTags('全年可见'),['winter','spring','summer','autumn']);
 assert.deepEqual(seasonTags('留鸟'),['winter','spring','summer','autumn']);
 assert.deepEqual(seasonTags('春秋过境'),['spring','autumn']);
 assert.deepEqual(seasonTags('5–9 月'),['spring','summer','autumn']);
 assert.deepEqual(seasonTags('11–3 月花期'),['winter','spring','autumn'],'months 11–3 map to autumn/winter/spring in season order');
 assert.deepEqual(seasonTags(''),[]);
 assert.deepEqual(seasonTags(undefined),[]);
 assert.deepEqual(seasonTags('资料尚未补充'),[]);
 assert.equal(seasonOfMonth(1),'winter');
 assert.equal(seasonOfMonth(3),'spring');
 assert.equal(seasonOfMonth(6),'summer');
 assert.equal(seasonOfMonth(9),'autumn');
 assert.equal(seasonOfMonth(12),'winter');
});

test('seasonal checklist only keeps species that really are in season',()=>{
 const list=seasonalChecklist(catalog,'autumn');
 assert.deepEqual(list.map(i=>i.speciesId),['kingfisher','egret','camellia','moth']);
 assert.deepEqual(seasonalChecklist(catalog,'summer').map(i=>i.speciesId),['kingfisher','moth']);
 assert.equal(seasonalChecklist(catalog,'summer').some(i=>i.speciesId==='sparrow'),false,'an undated species is not claimed for any season');
 assert.ok(seasonalChecklist(Object.fromEntries(Array.from({length:40},(_,i)=>['s'+i,{id:'s'+i,zh:'x',season:'全年可见'}])),'autumn').length===ATLAS_LIMIT);
});

test('atlas progress counts only real cards the user actually recorded',()=>{
 const cards=[
  {id:'c1',speciesId:'kingfisher',status:'saved',createdAt:AUTUMN,location:{...place}},
  {id:'c2',speciesId:'egret',status:'saved',createdAt:AUTUMN,location:{...place}},
  {id:'c3',speciesId:'moth',status:'saved',createdAt:AUTUMN},
  {id:'sample',speciesId:'camellia',sample:true},
  {id:'ex',speciesId:'camellia',kind:'example'},
  {id:'failed',speciesId:'camellia',status:'failed'},
  {id:'gift',speciesId:'camellia',kind:'memorial_copy'}
 ];
 const atlas=buildRegionAtlas(cards,{catalog,now:AUTUMN});
 assert.equal(atlas.season,'autumn');
 assert.equal(atlas.seasonLabel,'秋');
 assert.equal(atlas.total,4);
 assert.equal(atlas.found,3);
 assert.equal(atlas.coverage,75);
 assert.deepEqual(atlas.items.filter(i=>i.found).map(i=>i.speciesId),['kingfisher','egret','moth']);
 assert.equal(atlas.items.find(i=>i.speciesId==='camellia').found,false,'samples and failed cards never claim progress');
 assert.equal(atlas.speciesCount,3);
});

test('place rows come from this device only and need explicit private consent',()=>{
 const cards=[
  {id:'c1',speciesId:'kingfisher',status:'saved',createdAt:AUTUMN,location:{...place}},
  {id:'c2',speciesId:'egret',status:'saved',createdAt:AUTUMN,location:{...place}},
  {id:'c3',speciesId:'moth',status:'saved',createdAt:AUTUMN,location:{placeId:'home',label:'家附近',visibility:'public',consentAt:1}},
  {id:'c4',speciesId:'camellia',status:'saved',createdAt:AUTUMN,location:{placeId:'x',label:'无同意',visibility:'private'}},
  {id:'c5',speciesId:'moth',status:'saved',createdAt:AUTUMN,location:{placeId:'y',label:'   ',visibility:'private',consentAt:1}}
 ];
 const atlas=buildRegionAtlas(cards,{catalog,now:AUTUMN});
 assert.equal(atlas.regions.length,1);
 assert.equal(atlas.regions[0].label,'西湖');
 assert.equal(atlas.regions[0].found,2);
 assert.equal(atlas.regions[0].total,4);
 const item=atlas.regions[0].items.find(i=>i.speciesId==='moth');
 assert.equal(item.here,false,'a species seen elsewhere is not credited to this place');
 assert.ok(!JSON.stringify(atlas).includes('latitude'));
 assert.ok(!JSON.stringify(atlas).includes('无同意'));
});

test('an empty device reports zero progress instead of a fabricated number',()=>{
 const atlas=buildRegionAtlas([],{catalog,now:AUTUMN});
 assert.equal(atlas.found,0);
 assert.equal(atlas.total,4);
 assert.equal(atlas.coverage,0);
 assert.deepEqual(atlas.regions,[]);
 const none=buildRegionAtlas([],{catalog:{},now:AUTUMN});
 assert.equal(none.total,0);
 assert.equal(none.coverage,0);
});

test('nearby page exposes the atlas without ever reading device location',()=>{
 const page=read('native/pages/nearby/index.js');
 assert.match(page,/buildRegionAtlas/);
 assert.doesNotMatch(page,/getLocation|chooseLocation/);
 const wxml=read('native/pages/nearby/index.wxml');
 assert.match(wxml,/季图鉴/);
 assert.match(wxml,/不含他人观察，不上传位置/);
 assert.match(wxml,/本机私密足迹/);
 const wxss=read('native/pages/nearby/index.wxss');
 assert.doesNotMatch(wxss,/animation[^;}]*infinite|backdrop-filter/);
});
