const fs=require('fs'),path=require('path'),zlib=require('zlib'),assert=require('node:assert/strict');
const {definitions}=require('../native/lib/badge-model');
const folder=path.join(__dirname,'../assets/badges');
assert.deepEqual(fs.readdirSync(folder).sort(),definitions.map(b=>path.basename(b.asset)).sort());
for(const badge of definitions){
 const bytes=fs.readFileSync(path.join(__dirname,'..',badge.asset));assert.ok(bytes.length<=60*1024);
 assert.equal(bytes.readUInt32BE(16),256);assert.equal(bytes.readUInt32BE(20),256);assert.equal(bytes[25],6);assert.equal(bytes[24],8);
 const chunks=[];for(let offset=8;offset<bytes.length;){const size=bytes.readUInt32BE(offset);if(bytes.toString('ascii',offset+4,offset+8)==='IDAT')chunks.push(bytes.subarray(offset+8,offset+8+size));offset+=size+12}
 const raw=zlib.inflateSync(Buffer.concat(chunks)),stride=256*4,rows=[];let cursor=0;
 const paeth=(a,b,c)=>{const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c};
 for(let y=0;y<256;y++){const filter=raw[cursor++],row=Buffer.alloc(stride),prior=rows[y-1];for(let x=0;x<stride;x++){const a=x>=4?row[x-4]:0,b=prior?prior[x]:0,c=prior&&x>=4?prior[x-4]:0;row[x]=(raw[cursor++]+[0,a,b,Math.floor((a+b)/2),paeth(a,b,c)][filter])&255}rows.push(row)}
 for(const [x,y]of [[0,0],[255,0],[0,255],[255,255]])assert.equal(rows[y][x*4+3],0,badge.key+' transparent corner');
 assert.ok(rows.some(row=>row.some((n,i)=>i%4===3&&n>0)),badge.key+' visible subject');
}
console.log('PASS twelve independent 256px RGBA PNGs, alpha corners and <=60KB each');
