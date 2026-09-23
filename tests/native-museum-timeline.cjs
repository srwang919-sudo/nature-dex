const test=require('node:test'),assert=require('node:assert/strict');
test('timeline uses real dated records and honest past memories only',()=>{
 const {buildMuseumTimeline}=require('../native/lib/museum-timeline'),now=new Date(2026,8,23,12).getTime(),card=(id,y,m,d)=>({id,speciesId:'bird',createdAt:new Date(y,m-1,d,10).getTime()});
 const result=buildMuseumTimeline([card('today',2026,9,23),card('recent',2026,9,20),card('old',2025,9,23),{...card('fake',2025,9,23),sample:true},{...card('fail',2026,9,23),status:'failed'},card('future',2027,9,23)],now);
 assert.deepEqual(result.today.map(c=>c.id),['today']);assert.equal(result.memory.id,'old');assert.deepEqual(result.recent.map(c=>c.id),['recent','old']);assert.equal(buildMuseumTimeline([],now).memory,null);assert.equal(buildMuseumTimeline([{id:'undated'}],now).groups.length,0);
});
