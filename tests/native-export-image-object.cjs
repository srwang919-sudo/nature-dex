const assert=require('node:assert/strict');
const {render,exportPlan}=require('../native/lib/card-export');
const image={src:'wxfile://decoded',width:821,height:855};
const ctx=new Proxy({measureText:()=>({width:10}),drawImage:value=>assert.equal(value,image,'Canvas 2D must receive decoded Image, not its URL')},{get:(o,k)=>o[k]||(()=>{})});
render(ctx,{zh:'测试'},exportPlan({},'printFront'),image);
render(ctx,{zh:'测试'},exportPlan({},'printBack'),{},image);
console.log('PASS Canvas 2D decoded image identity');
