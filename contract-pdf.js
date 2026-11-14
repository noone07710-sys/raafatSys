/* Raafat Sys — official customer contract PDF.
 * The uploaded Photoshop-designed PDF is copied unchanged as every page's
 * background. Only transparent, correctly shaped Arabic writing is overlaid
 * inside the white area. No customer identity-card numbers are exported.
 */
(function (scope) {
 'use strict';

 const TEMPLATE_URL=new URL('./customer-contract-template.pdf',document.baseURI).href;
 const SOURCES=[
  'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js'
 ];
 const COLOR={
  navy:'#272b43',ink:'#273449',muted:'#687487',orange:'#f49c4b',
  subtle:'#f4f5f8',subtleAlt:'#fafafb',line:'#dce0e8',white:'#ffffff'
 };
 const FONT='Cairo, Tahoma, Arial, sans-serif';
 const AREA={left:42,right:552,top:132,bottom:763};
 const SCALE=3;
 let loader=null;

 function label(value,fallback='—'){
  const s=String(value??'').trim();return s||fallback;
 }
 function number(value){return new Intl.NumberFormat('en-US',{maximumFractionDigits:2}).format(Number(value)||0)}
 function amount(value,currency){return number(value)+' '+(currency==='IQD'?'د.ع':'$')}
 function filename(value){return String(value||'RC-0000').replace(/[^a-zA-Z0-9_-]+/g,'-')}
 function loadScript(src){
  return new Promise((resolve,reject)=>{
   const script=document.createElement('script');
   script.src=src;script.async=true;script.crossOrigin='anonymous';
   script.onload=()=>scope.PDFLib?resolve(scope.PDFLib):reject(Error('مكتبة PDF غير متاحة'));
   script.onerror=()=>{script.remove();reject(Error('تعذّر تحميل '+src))};
   document.head.appendChild(script);
  });
 }
 async function pdfLibrary(){
  if(scope.PDFLib?.PDFDocument)return scope.PDFLib;
  if(!loader)loader=(async()=>{
   for(const src of SOURCES){try{return await loadScript(src)}catch(e){/* alternative CDN */}}
   throw Error('تعذّر تحميل مكتبة PDF. تحقق من اتصال الإنترنت.');
  })().catch(e=>{loader=null;throw e});
  return loader;
 }
 async function templateBytes(){
  const res=await fetch(TEMPLATE_URL,{cache:'no-store'});
  if(!res.ok)throw Error('تعذّر قراءة قالب رأفت الأصلي (HTTP '+res.status+')');
  const bytes=await res.arrayBuffer();
  if(bytes.byteLength<5000||
     new TextDecoder('ascii').decode(bytes.slice(0,5))!=='%PDF-')
   throw Error('ملف القالب ليس PDF صالحاً');
  return bytes;
 }
 async function readyFont(){
  if(!document.fonts)return;
  try{await Promise.race([
   document.fonts.load('700 12px Cairo'),
   new Promise((_,reject)=>setTimeout(()=>reject(Error('Font timeout')),5500))
  ])}catch(e){/* Arial/Tahoma Arabic fallback */}
 }
 function pageCanvas(size){
  const canvas=document.createElement('canvas');
  canvas.width=Math.round(size.width*SCALE);
  canvas.height=Math.round(size.height*SCALE);
  const ctx=canvas.getContext('2d',{alpha:true});
  if(!ctx)throw Error('تعذّر إنشاء مساحة الكتابة العربية');
  ctx.scale(SCALE,SCALE);ctx.direction='rtl';ctx.textBaseline='alphabetic';ctx.textAlign='right';
  return {canvas,ctx};
 }
 function setFont(ctx,size=10.8,weight=600){
  ctx.font=weight+' '+size+'px '+FONT;
  ctx.direction='rtl';
 }
 function measureLines(ctx,input,maxWidth,size=10.8,weight=600){
  setFont(ctx,size,weight);
  const out=[];
  for(const line of String(input??'').replace(/\r/g,'').split('\n')){
   const words=line.trim().split(/\s+/).filter(Boolean);
   if(!words.length){out.push('');continue}
   let current='';
   for(const word of words){
    const proposed=current?current+' '+word:word;
    if(ctx.measureText(proposed).width<=maxWidth){current=proposed;continue}
    if(current){out.push(current);current=''}
    if(ctx.measureText(word).width<=maxWidth){current=word;continue}
    let part='';
    for(const char of word){
     if(part&&ctx.measureText(part+char).width>maxWidth){
      out.push(part);part='';
     }
     part+=char;
    }
    current=part;
   }
   if(current)out.push(current);
  }
  return out.length?out:[''];
 }
 function createPainter(size,makePage,payload){
  let page=null;
  const w=AREA.right-AREA.left;
  const safeBottom=Math.min(AREA.bottom,size.height-70);
  const print=(ctx,value,x,y,pt=11,weight=600,color=COLOR.ink,align='right')=>{
   setFont(ctx,pt,weight);ctx.textAlign=align;ctx.fillStyle=color;
   ctx.fillText(String(value??''),x,y);
   ctx.textAlign='right';
  };
  const rect=(ctx,x,y,width,height,fill)=>{
   ctx.fillStyle=fill;ctx.fillRect(x,y,width,height);
  };
  const rule=(ctx,y,color=COLOR.line)=>{
   ctx.strokeStyle=color;ctx.lineWidth=.75;
   ctx.beginPath();ctx.moveTo(AREA.left,y);ctx.lineTo(AREA.right,y);ctx.stroke();
  };
  function begin(){
   page=makePage();
   page.y=AREA.top;
   const {ctx}=page;
   const onFirst=page.pageNumber===1;
   print(ctx,onFirst?'عقد حجز مساحات إعلانية':'تابع عقد حجز المساحات الإعلانية',
    AREA.right,page.y+15,onFirst?17:15,800,COLOR.navy);
   print(ctx,label(payload.number),AREA.left+10,page.y+15,11,800,COLOR.navy,'left');
   print(ctx,'رقم العقد',AREA.left+10,page.y-1,9,600,COLOR.muted,'left');
   rule(ctx,page.y+25);
   page.y+=43;
  }
  function keep(height){
   if(!page)begin();
   if(page.y+height>safeBottom){
    begin();
   }
  }
  function section(title){
   keep(41);
   const {ctx}=page;
   page.y+=4;
   rect(ctx,AREA.right-4,page.y-1,4,21,COLOR.orange);
   print(ctx,title,AREA.right-16,page.y+15,12.3,800,COLOR.navy);
   page.y+=32;
  }
  // Cards are clean and compact, with labels above values and a gutter
  // separating RTL columns. Long entries are flowed rather than truncated.
  function fields(entries){
   const items=entries.filter(Boolean);
   const gap=9,cellWidth=(w-gap)/2;
   const prepared=items.map(({name,value})=>({
    name,lines:measureLines(page.ctx,label(value),cellWidth-24,10.6,700)
   }));
   // Exceptionally long values get their own flow block, never clipped.
   if(prepared.some(row=>row.lines.length>5)){
    for(const item of prepared)block(item.name,item.lines.join(' '));
    return;
   }
   const maxRows=Math.max(...prepared.map(x=>x.lines.length),1);
   const height=Math.max(52,27+maxRows*15);
   keep(height+7);
   const {ctx}=page,top=page.y;
   for(let i=0;i<prepared.length;i++){
    const item=prepared[i];
    const x=i===0?AREA.right-cellWidth:AREA.left;
    rect(ctx,x,top,cellWidth,height,COLOR.subtle);
    rect(ctx,x+cellWidth-3,top+10,2,12,COLOR.orange);
    print(ctx,item.name,x+cellWidth-14,top+15,8.8,600,COLOR.muted);
    let y=top+33;
    item.lines.forEach(line=>{print(ctx,line,x+cellWidth-14,y,10.6,700,COLOR.ink);y+=15});
   }
   page.y+=height+7;
  }
  function field(name,value){
   // A single entry spans the full page width and keeps long names readable.
   const lines=measureLines(page.ctx,label(value),w-28,10.7,700);
   if(lines.length>6){block(name,value);return}
   const height=Math.max(47,27+lines.length*15);
   keep(height+7);
   rect(page.ctx,AREA.left,page.y,w,height,COLOR.subtle);
   rect(page.ctx,AREA.right-3,page.y+10,2,12,COLOR.orange);
   print(page.ctx,name,AREA.right-14,page.y+15,8.8,600,COLOR.muted);
   let baseline=page.y+33;
   for(const line of lines){print(page.ctx,line,AREA.right-14,baseline,10.7,700);baseline+=15}
   page.y+=height+7;
  }
  function block(title,value){
   if(!String(value??'').trim())return;
   keep(43);
   const {ctx}=page;
   print(ctx,title,AREA.right-5,page.y+13,10,800,COLOR.navy);
   page.y+=26;
   const raw=String(value).replace(/\r/g,'');
   const lines=measureLines(ctx,raw,w-20,10.4,500);
   for(const line of lines){
    keep(22);
    print(page.ctx,line,AREA.right-10,page.y+10,10.4,500,COLOR.ink);
    page.y+=17.5;
   }
   page.y+=6;
  }
  function site(site,index){
   const code=label(site.code,'—'),name=label(site.name,'موقع إعلاني');
   const address=[site.governorate,site.address].map(v=>String(v||'').trim()).filter(Boolean).join('، ');
   const titleLines=measureLines(page.ctx,name,w-117,10.7,700);
   const addressLines=address?measureLines(page.ctx,address,w-117,9.6,500):[];
   // Break pathological addresses into a flow block rather than overflow the page.
   if(titleLines.length+addressLines.length>8){
    block('القطعة '+code,name+(address?' — '+address:''));return;
   }
   const height=Math.max(43,18+titleLines.length*15+addressLines.length*13);
   keep(height+5);
   const {ctx}=page,x=AREA.left,y=page.y;
   rect(ctx,x,y,w,height,index%2===0?COLOR.subtle:COLOR.subtleAlt);
   rect(ctx,AREA.right-75,y+9,60,20,COLOR.navy);
   print(ctx,code,AREA.right-45,y+23,10,800,COLOR.white,'center');
   let pos=y+16;
   for(const line of titleLines){print(ctx,line,AREA.right-91,pos,10.7,700,COLOR.ink);pos+=15}
   for(const line of addressLines){print(ctx,line,AREA.right-91,pos,9.6,500,COLOR.muted);pos+=13}
   page.y+=height+5;
  }
  function signature(){
   keep(105);
   page.y+=12;rule(page.ctx,page.y);page.y+=17;
   const half=(w-10)/2;
   const sides=[
    {x:AREA.right-8,text:'توقيع ممثل الشركة'},
    {x:AREA.left+half,text:'توقيع الزبون / ممثله'}
   ];
   for(const side of sides){
    print(page.ctx,side.text,side.x,page.y+4,11,700,COLOR.navy);
    print(page.ctx,'____________________',side.x,page.y+45,10,600,COLOR.muted);
   }
   page.y+=74;
  }
  function end(){
   if(!page)begin();
   print(page.ctx,'صفحة '+page.pageNumber,AREA.left+7,safeBottom+11,8.3,500,COLOR.muted,'left');
  }
  return {begin,section,fields,field,block,site,signature,end,get current(){return page}};
 }

 async function generate(payload){
  if(!payload?.number)throw Error('احفظ عقد الزبون أولاً حتى تولّد PDF');
  const [PDFLib,bytes]=await Promise.all([pdfLibrary(),templateBytes(),readyFont()]);
  const original=await PDFLib.PDFDocument.load(bytes,{updateMetadata:false});
  if(original.getPageCount()!==1)throw Error('قالب العقد الأصلي لازم يكون صفحة واحدة');
  const size=original.getPage(0).getSize();
  if(Math.abs(size.width-595.2)>7||Math.abs(size.height-841.92)>7)
   throw Error('أبعاد القالب اختلفت عن A4 الأصلي');
  const out=await PDFLib.PDFDocument.create();
  out.setTitle('عقد رأفت '+payload.number);
  out.setSubject('عقد إعلان — '+label(payload.customerName));
  out.setCreator('Raafat Sys');
  const pages=[];
  const painter=createPainter(size,()=>{
   const p=pageCanvas(size);
   p.pageNumber=pages.length+1;
   pages.push(p);
   return p;
  },payload);
  painter.begin();

  painter.section('أطراف العقد');
  painter.fields([{name:'الشركة — الطرف الأول',value:'شركة رأفت للدعاية والإعلان والتجارة العامة'},
   {name:'الزبون — الطرف الثاني',value:payload.customerName}]);
  painter.fields([{name:'هاتف الزبون',value:payload.customerPhone},
   {name:'ممثل الشركة',value:payload.companyRepresentative}]);
  painter.field('ممثل الزبون',payload.customerRepresentative);

  painter.section('بيانات الحملة');
  painter.field('اسم الحملة',payload.campaignTitle);
  painter.fields([{name:'الباقة الإعلانية',value:payload.packageName},
   {name:'عدد القطع الإعلانية',value:payload.quantity}]);
  painter.fields([{name:'تاريخ البداية',value:payload.startDate},
   {name:'تاريخ النهاية',value:payload.endDate}]);
  painter.fields([{name:'مدة العقد',value:label(payload.months)+' أشهر'},
   {name:'قياسات الإعلان',value:payload.dimensions}]);
  if(String(payload.area??'').trim()&&payload.area!=='—')
   painter.field('المساحة الإعلانية',label(payload.area)+' م²');
  painter.field('القيمة الإجمالية المتفق عليها',amount(payload.amount,payload.currency));

  painter.section('القطع والمواقع الإعلانية');
  if(Array.isArray(payload.sites)&&payload.sites.length){
   payload.sites.forEach((site,i)=>painter.site(site,i));
  }else{
   painter.block('المواقع المحددة','لا توجد قطع محددة بالرموز ضمن سجل العقد.');
  }
  if(payload.additionalLocations)
   painter.block('مواقع إضافية',payload.additionalLocations);

  if(payload.specifications){
   painter.section('مواصفات الإعلان');
   painter.block('المواصفات المسجلة',payload.specifications);
  }
  if(payload.campaignNotes){
   painter.section('ملاحظات الحملة');
   painter.block('ملاحظات الحملة المسجلة',payload.campaignNotes);
  }
  painter.section('الشروط المتفق عليها');
  painter.block('الشروط المسجلة في العقد',payload.terms||'لم تُسجّل شروط إضافية ضمن العقد.');
  if(payload.notes){
   painter.section('ملاحظات إضافية');
   painter.block('ملاحظات العقد',payload.notes);
  }
  painter.signature();
  painter.end();

  // The original PDF is copied on every page, never replaced by an image.
  // Only a transparent layer of Arabic typography sits in the safe white area.
  for(const p of pages){
   const pngUri=p.canvas.toDataURL('image/png');
   const pngData=await fetch(pngUri).then(res=>res.arrayBuffer());
   const image=await out.embedPng(pngData);
   const [background]=await out.copyPages(original,[0]);
   out.addPage(background).drawImage(image,{x:0,y:0,width:size.width,height:size.height});
  }
  return new Blob([await out.save({useObjectStreams:false})],{type:'application/pdf'});
 }
 function saveBlob(blob,file){
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;a.download=file;document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),120000);
 }
 async function download(payload){
  const blob=await generate(payload);
  saveBlob(blob,'Raafat-Contract-'+filename(payload.number)+'.pdf');
  return blob;
 }
 async function preview(payload,win){
  const blob=await generate(payload);
  const url=URL.createObjectURL(blob);
  if(win&&!win.closed){win.location.replace(url);return blob}
  saveBlob(blob,'Raafat-Contract-'+filename(payload.number)+'.pdf');
  return blob;
 }
 scope.RaafatContractPdf=Object.freeze({generate,download,preview,TEMPLATE_URL});
})(window);
