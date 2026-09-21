const fs=require('fs'),assert=require('node:assert/strict'),path=require('path');
const html=fs.readFileSync(path.join(__dirname,'../native/pages/home/index.wxml'),'utf8');
assert.ok(html.includes('拍一张')&&html.includes('home-record'));
assert.ok(!html.includes('task-paper')&&!html.includes('habitat-entry'));
assert.equal((html.match(/bindtap="observe"/g)||[]).length,1);
assert.ok(html.includes('bindtap="album"'));
console.log('PASS single prominent home capture action and album entry');
