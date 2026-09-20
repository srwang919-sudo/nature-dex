const {presentCard}=require('./card-presentation');
const {lineArtFor}=require('./species-line-art');
const {illustrationFor}=require('./species-illustration');
const PRINT_SPEC=Object.freeze({width:821,height:1121,trimWidth:750,trimHeight:1050,bleedMm:3,dpi:300});
function publicShare(card){const id=card.speciesId||card.id;return {title:'去大自然里 · '+card.zh+'的自然档案',path:'/native/pages/card/index?id=sample_'+encodeURIComponent(id),imageUrl:'https://nature-card-app.app.workbuddy.host/assets/images/'+id+'.jpg'};}
function exportPlan(card,mode){const backs=mode==='share'&&!!card.protection;return {mode,width:821,height:backs?2282:1121,backs,print:mode.indexOf('print')===0};}
const COLORS={standard:'#FFFFFF',holo:'#DEF0FC',alt:'#FCE3DE',numbered:'#FFF3D6'};
function printQuality(image,mode){
 if(mode==='printBack')return {qualified:true,effectiveDpi:null,message:'卡背为文字绘制，按目标 300dpi 像素规格导出'};
 const dpi=Math.floor(Math.min(Number(image.width)/821,Number(image.height)/855)*300);
 const qualified=Number.isFinite(dpi)&&dpi>=300;
 return {qualified,effectiveDpi:Number.isFinite(dpi)?dpi:0,message:qualified?'照片有效分辨率约 '+dpi+'dpi，达到目标 300dpi':'清晰度提醒：照片有效分辨率约 '+(Number.isFinite(dpi)?dpi:0)+'dpi，低于目标 300dpi；导出像素不能补回细节'};
}
function text(ctx,value,x,y,width,size,lineHeight,maxLines,color){
 if(!value)return y;ctx.setFillStyle(color||'#26352E');ctx.setFontSize(size);
 const chars=Array.from(String(value)),lines=[];let line='';
 for(const ch of chars){if(ctx.measureText(line+ch).width>width&&line){lines.push(line);line=ch}else line+=ch}if(line)lines.push(line);
 const visible=lines.slice(0,maxLines);if(lines.length>maxLines&&visible.length)visible[visible.length-1]=visible[visible.length-1].slice(0,-1)+'…';
 visible.forEach((l,i)=>ctx.fillText(l,x,y+i*lineHeight));return y+visible.length*lineHeight;
}
function front(ctx,card,offset,image){
 ctx.setFillStyle(COLORS[card.finishKey]||'#fff');ctx.fillRect(0,offset,821,1121);
 const h=855,w=821;const ratio=Math.max(w/image.width,h/image.height),dw=image.width*ratio,dh=image.height*ratio;
 ctx.save();ctx.beginPath();ctx.rect(0,offset,w,h);ctx.clip();ctx.drawImage(image.path||image.src,(w-dw)/2,offset+(h-dh)/2,dw,dh);ctx.restore();
 ctx.setFillStyle('#FFFBF2');ctx.fillRect(71,offset+71,170,48);text(ctx,card.no,83,offset+104,146,23,28,1);
 ctx.setFillStyle('#FFFBF2');ctx.fillRect(540,offset+71,210,48);text(ctx,card.finish,552,offset+104,186,26,30,1);
 text(ctx,card.zh,71,offset+927,679,49,59,1);text(ctx,card.latin,71,offset+974,679,27,35,1);
 text(ctx,presentCard(card).starText,620,offset+927,130,21,27,1,'#997921');
 text(ctx,card.sample?'参考资料卡':card.date,71,offset+1040,679,25,30,1,'#58655D');
}
function back(ctx,card,offset,illustration){
 ctx.setFillStyle('#FFFBF2');ctx.fillRect(0,offset,821,1121);
 text(ctx,'去大自然里 · 自然博物志',71,offset+100,679,27,35,1);
 ctx.setStrokeStyle('#D9D7C9');ctx.beginPath();ctx.moveTo(71,offset+125);ctx.lineTo(750,offset+125);ctx.stroke();
 let y=text(ctx,card.zh,71,offset+185,679,48,58,2);y=text(ctx,card.latin,71,y+9,679,26,33,2,'#58655D')+15;
 if(illustration)ctx.drawImage(illustration.path||illustration.src,610,offset+142,120,120);else drawLineArt(ctx,card.speciesId||card.id,620,offset+145,1.1);
 const field=(label,value,max=2)=>{const available=Math.min(max,Math.floor((offset+800-y-51)/35));if(value&&available>0){y=text(ctx,label,71,y+18,679,22,28,1,'#58655D');y=text(ctx,value,71,y+5,679,27,35,available)}};
 field('分类',card.family,1);field('IUCN 评估',card.iucn,1);field('观察札记',card.tagline,2);field('识别与行为',card.factTitle,2);field('栖息环境 / 可见季节',[card.habitat,card.season].filter(Boolean).join(' · '),2);
 // Protection uses its own reserved area; long science never overwrites it.
 if(card.protection){text(ctx,'中国保护信息',71,offset+850,679,22,28,1,'#58655D');text(ctx,card.protection,71,offset+893,679,28,38,3);}
 text(ctx,[card.no,!card.sample&&card.createdAt?card.date:''].filter(Boolean).join(' · '),71,offset+1042,679,24,30,1,'#58655D');
}
function drawLineArt(ctx,id,x,y,scale){const commands=lineArtFor(id);if(!commands.length)return;ctx.setStrokeStyle('#58655D');ctx.setLineWidth(1.3);ctx.beginPath();commands.forEach(({op,points:p})=>{if(op==='M')ctx.moveTo(x+p[0]*scale,y+p[1]*scale);else if(op==='L')ctx.lineTo(x+p[0]*scale,y+p[1]*scale);else if(op==='Q'&&ctx.quadraticCurveTo)ctx.quadraticCurveTo(x+p[0]*scale,y+p[1]*scale,x+p[2]*scale,y+p[3]*scale);else if(op==='C'&&ctx.bezierCurveTo)ctx.bezierCurveTo(x+p[0]*scale,y+p[1]*scale,x+p[2]*scale,y+p[3]*scale,x+p[4]*scale,y+p[5]*scale)});ctx.stroke();}
function cropMarks(ctx,offset){const x=(821-750)/2,y=offset+(1121-1050)/2;ctx.setStrokeStyle('#58655D');ctx.setLineWidth(1);for(const [cx,cy,sx,sy]of [[x,y,-1,-1],[x+750,y,1,-1],[x,y+1050,-1,1],[x+750,y+1050,1,1]]){ctx.beginPath();ctx.moveTo(cx+sx*8,cy);ctx.lineTo(cx+sx*25,cy);ctx.moveTo(cx,cy+sy*8);ctx.lineTo(cx,cy+sy*25);ctx.stroke();}}
function adapt2d(ctx){if(!ctx.setFillStyle)ctx.setFillStyle=v=>{ctx.fillStyle=v};if(!ctx.setStrokeStyle)ctx.setStrokeStyle=v=>{ctx.strokeStyle=v};if(!ctx.setFontSize)ctx.setFontSize=v=>{ctx.font=v+'px sans-serif'};if(!ctx.setLineWidth)ctx.setLineWidth=v=>{ctx.lineWidth=v};if(!ctx.setTextBaseline)ctx.setTextBaseline=v=>{ctx.textBaseline=v};return ctx;}
function render(ctx,card,plan,image,illustration){ctx=adapt2d(ctx);ctx.setTextBaseline('alphabetic');if(plan.mode==='printBack')back(ctx,card,0,illustration);else front(ctx,card,0,image);if(plan.backs)back(ctx,card,1161,illustration);if(plan.print)cropMarks(ctx,0);}
module.exports={PRINT_SPEC,publicShare,exportPlan,printQuality,render,drawLineArt,illustrationFor};
