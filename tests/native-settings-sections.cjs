const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
// 设置页按「设置 / 会员与用量 / 隐私 / 帮助与反馈 / 关于」分区：
// 本机记录不再单独成区（与我的、图鉴重复），备份与清除收在设置区。
test('settings routes present a single preferences, membership, privacy, help and about split',()=>{
 const source=fs.readFileSync(path.join(__dirname,'../native/pages/settings/index.wxml'),'utf8');
 assert.match(source,/data-section="settings"/);
 assert.match(source,/<view wx:if="\{\{section==='settings'\}\}" class="panel spaced"><view class="section">本地备份与清除/);
 assert.match(source,/data-section="privacy"/);
 assert.match(source,/data-section="membership"/);
 assert.doesNotMatch(source,/data-section="local"/);
});
