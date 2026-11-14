/* Raafat customer contract PDF overlay.
 * The source Photoshop PDF remains intact: new PDF pages are COPIES of
 * customer-contract-template.pdf, with a transparent Arabic-text layer.
 * No original logos, layout, top header, or bottom footer are redrawn.
 * Plain browser script -> window.RaafatContractPdf.
 */
(function (scope) {
 'use strict';

 const TEMPLATE_URL = new URL('./customer-contract-template.pdf', document.baseURI).href;
 const SOURCES = [
  'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js'
 ];
 let loader = null;
 const PAGE = {width:595.2, height:841.92, top:119, bottom:779, left:47, right:548};
 const COLORS = {dark:'#232840',muted:'#576478',orange:'#f49b47',line:'#e3e5eb',text:'#292f41'};
 const FONT = 'Cairo, Tahoma, Arial, sans-serif';
 const SCALE = 3; // ~216 effective DPI on vector/image original, sharp Arabic text.

 function fail(message) { throw new Error(message); }
 function text(value) { return String(value ?? '').trim() || '—'; }
 function number(value) { return new Intl.NumberFormat('en-US',{maximumFractionDigits:2}).format(Number(value)||0); }
 function cash(value, currency) { return number(value)+' '+(currency==='IQD'?'د.ع':'$'); }
 function filename(value) { return String(value || 'RC-0000').replace(/[^a-zA-Z0-9_-]+/g,'-'); }

 function loadScript(src) {
  return new Promise((resolve,reject)=>{
   const script=document.createElement('script');
   script.src=src;
   script.async=true;
   script.crossOrigin='anonymous';
   script.onload=()=>scope.PDFLib?resolve(scope.PDFLib):reject(new Error('لم تُحمَّل مكتبة إنشاء PDF'));
   script.onerror=()=>{script.remove();reject(new Error('تعذّر تحميل مكتبة PDF من '+src))};
   document.head.appendChild(script);
  });
 }
 async function getPdfLib() {
  if(scope.PDFLib?.PDFDocument)return scope.PDFLib;
  if(!loader)loader=(async()=>{
   for(const source of SOURCES){
    try{return await loadScript(source)}catch(e){/* try next CDN */}
   }
   fail('تعذّر تشغيل مكتبة PDF. تأكد من اتصال الإنترنت وأعد المحاولة.');
  })().catch(err=>{loader=null;throw err});
  return loader;
 }
 async function getTemplateBytes() {
  const response=await fetch(TEMPLATE_URL,{cache:'no-store'});
  if(!response.ok)fail('تعذّر تحميل قالب العقد الأصلي من GitHub (HTTP '+response.status+')');
  const data=await response.arrayBuffer();
  if(data.byteLength<5000)fail('القالب الموجود على الخادم غير صالح أو ناقص');
  const header=new TextDecoder('ascii').decode(data.slice(0,5));
  if(header!=='%PDF-')fail('الملف المرفوع ليس PDF صحيحاً');
  return data;
 }
 async function fontReady(){
  if(!document.fonts)return;
  try{
   await Promise.race([
    document.fonts.load('600 13px Cairo'),
    new Promise((_,reject)=>setTimeout(()=>reject(new Error('font timeout')),5000))
   ]);
  }catch(e){/* installed Arabic fallback Tahoma/Arial still shapes Arabic */}
 }
 function canvasPage(size) {
  const canvas=document.createElement('canvas');
  canvas.width=Math.round(size.width*SCALE);
  canvas.height=Math.round(size.height*SCALE);
  const ctx=canvas.getContext('2d',{alpha:true});
  if(!ctx)fail('المتصفح لا يدعم Canvas لتنسيق النص العربي');
  ctx.scale(SCALE,SCALE);
  ctx.textAlign='right';
  ctx.textBaseline='alphabetic';
  ctx.direction='rtl';
  return {canvas,ctx};
 }
 function font(ctx,size=11,weight=600) {
  ctx.font=weight+' '+size+'px '+FONT;
  ctx.direction='rtl';
 }
 function breakLine(ctx,line,maxWidth) {
  const words=String(line).split(/\s+/).filter(Boolean),rows=[];
  let current='';
  for(const word of words){
   const attempt=current?current+' '+word:word;
   if(ctx.measureText(attempt).width<=maxWidth){current=attempt;continue}
   if(current){rows.push(current);current=''}
   // Extra-long tokens (URLs, uninterrupted numbers) are segmented safely.
   if(ctx.measureText(word).width>maxWidth){
    let segment='';
    for(const char of word){
     if(segment&&ctx.measureText(segment+char).width>maxWidth){rows.push(segment);segment=''}
     segment+=char;
    }
    current=segment;
   }else current=word;
  }
  if(current)rows.push(current);
  return rows.length?rows:[''];
 }
 function wrapped(ctx,value,maxWidth,size=11,weight=600){
  font(ctx,size,weight);
  return String(value??'').replace(/\r/g,'').split('\n')
   .flatMap(line=>breakLine(ctx,line.trim()||' ',maxWidth));
 }

 function pageWriter(ctx,size,pageNumber,data){
  const left=PAGE.left,right=Math.min(PAGE.right,size.width-47);
  let y=PAGE.top;
  const maxY=Math.min(PAGE.bottom,size.height-62);
  const width=right-left;
  const set=(value,x,yy,pt=11,weight=600,color=COLORS.text,align='right')=>{
   font(ctx,pt,weight);
   ctx.textAlign=align;
   ctx.fillStyle=color;
   ctx.fillText(text(value),x,yy);
   ctx.textAlign='right';
  };
  const separator=(yy)=>{
   ctx.strokeStyle=COLORS.line;ctx.lineWidth=0.65;ctx.beginPath();
   ctx.moveTo(left,yy);ctx.lineTo(right,yy);ctx.stroke();
  };
  function heading(){
   set(pageNumber===1?'عقد حجز وتأجير مساحات إعلانية':'تابع عقد المساحات الإعلانية',right,y+6,17,800,COLORS.dark);
   set('رقم العقد: '+text(data.number),left,y+4,9.5,700,COLORS.muted,'left');
   y+=18;separator(y+1);y+=13;
  }
  heading();
  function available(h){return y+h<=maxY}
  function jump(next){
   if(available(next))return false;
   return true;
  }
  function reserve(h){return jump(h)}
  function section(value){
   y+=6;
   set(value,right,y+7,12.5,800,COLORS.dark);
   ctx.fillStyle=COLORS.orange;ctx.fillRect(right-4,y+13,50,2.2);
   y+=26;
  }
  function line(label,value,opts={}){
   const x=right-9,max=width-20,size=opts.size||10.5;
   const rows=wrapped(ctx,(label?text(label)+'  ':'')+text(value),max,size,opts.bold?700:600);
   rows.forEach(row=>{set(row,x,y,size,opts.bold?700:600,opts.muted?COLORS.muted:COLORS.text);y+=15});
   y+=2;
  }
  function pair(l1,v1,l2,v2){
   const half=width/2-20,first=wrapped(ctx,text(l1)+'  '+text(v1),half,10.2,600);
   const second=l2?wrapped(ctx,text(l2)+'  '+text(v2),half,10.2,600):[];
   const count=Math.max(first.length,second.length,1);
   for(let i=0;i<count;i++){
    if(first[i])set(first[i],right-9,y+i*15,10.2);
    if(second[i])set(second[i],left+half+5,y+i*15,10.2);
   }
   y+=count*15+3;
  }
  function paragraph(value){
   const lines=wrapped(ctx,value,width-19,10.3,500);
   for(const line of lines){set(line,right-9,y,10.3,500);y+=15.5}
   y+=5;
  }
  function note(value){
   if(!value||!String(value).trim())return;
   paragraph(value);
  }
  function space(v=10){y+=v}
  function signature(){
   y+=8;separator(y);y+=18;
   set('توقيع ممثل الشركة',right-17,y,10.4,700,COLORS.dark);
   set('توقيع الزبون / ممثله',left+width/2-20,y,10.4,700,COLORS.dark);
   y+=25;
   set('____________________',right-18,y,11.5,600,COLORS.muted);
   set('____________________',left+width/2-25,y,11.5,600,COLORS.muted);
   y+=22;
  }
  function footer(){
   ctx.textAlign='left';font(ctx,8,500);ctx.fillStyle='#9096a4';
   ctx.fillText(''+pageNumber,left,maxY+11);
   ctx.textAlign='right';
  }
  return {get y(){return y},get maxY(){return maxY},available,reserve,section,line,pair,paragraph,note,space,signature,footer};
 }
 // No need to guess page count: content runs through an explicit flow function
 // that creates fresh overlay pages as required, all using the same PDF template.
 async function generate(payload){
  if(!payload||!payload.number)fail('لا يمكن إنشاء ملف PDF لعقد غير محفوظ');
  const [PDFLib,bytes]=await Promise.all([getPdfLib(),getTemplateBytes(),fontReady()]);
  const original=await PDFLib.PDFDocument.load(bytes,{updateMetadata:false});
  if(original.getPageCount()!==1)fail('القالب الحالي يجب أن يكون صفحة A4 واحدة');
  const template=original.getPage(0),size=template.getSize();
  if(Math.abs(size.width-595.2)>7||Math.abs(size.height-841.92)>7)
   fail('أبعاد القالب تغيّرت. تأكد من رفع قالب A4 الأصلي');
  const pdf=await PDFLib.PDFDocument.create();
  pdf.setTitle('عقد رأفت '+payload.number);
  pdf.setSubject('عقد حجز مساحة إعلانية — '+text(payload.customerName));
  pdf.setCreator('Raafat Sys');
  const overlays=[];
  let current;
  function start(){
   const {canvas,ctx}=canvasPage(size);
   const writer=pageWriter(ctx,size,overlays.length+1,payload);
   current={canvas,ctx,writer};
   overlays.push(current);
  }
  function next(need=25){
   if(!current)start();
   if(!current.writer.available(need))start();
  }
  function section(title,estimated=45){next(estimated);current.writer.section(title)}
  function one(label,value){
   const source=(label?text(label)+'  ':'')+text(value);
   const lines=wrapped(current.ctx,source,size.width-2*PAGE.left-20,10.5,600);
   for(const line of lines){
    next(21);
    current.writer.line('',line);
   }
  }
  function paired(a,b,c,d){
   next(60);current.writer.pair(a,b,c,d);
  }
  function paragraph(value){
   if(!value||!String(value).trim())return;
   // Wrapping delegated per paragraph to the page writer, so one long text
   // never disappears under the template's permanent bottom contact bar.
   const lines=String(value).replace(/\r/g,'').split('\n');
   for(const sub of lines){
    const ctx=current.ctx;
    const pieces=wrapped(ctx,sub||' ',size.width-2*PAGE.left-20,10.3,500);
    for(const line of pieces){
     next(25);
     current.writer.paragraph(line);
    }
   }
  }
  start();
  section('أطراف العقد',78);
  paired('الطرف الأول:','شركة رأفت للدعاية والإعلان والتجارة العامة','الطرف الثاني:',payload.customerName);
  paired('رقم هاتف الزبون:',payload.customerPhone,'رقم البطاقة الموحدة:',payload.customerNationalId);
  paired('ممثل الشركة:',payload.companyRepresentative,'ممثل الزبون:',payload.customerRepresentative);
  section('بيانات الحملة والإعلان',112);
  one('اسم الحملة:',payload.campaignTitle);
  paired('الباقة الإعلانية:',payload.packageName,'عدد القطع:',payload.quantity);
  paired('قياسات اللوحة:',payload.dimensions,'المساحة بالمتر المربع:',payload.area);
  paired('تاريخ البداية:',payload.startDate,'تاريخ النهاية:',payload.endDate);
  paired('مدة العقد:',payload.months+' أشهر','القيمة الإجمالية:',cash(payload.amount,payload.currency));
  section('القطع والمواقع المشمولة بالعقد',46);
  if(Array.isArray(payload.sites)&&payload.sites.length){
   for(const site of payload.sites){
    one('• '+text(site.code)+' — '+text(site.name),[site.governorate,site.address].filter(Boolean).join('، ')||'—',23);
   }
  }else one('المواقع الإعلانية:','لا توجد قطع مسجّلة بالرموز في العقد');
  if(payload.additionalLocations)paragraph('المواقع الإضافية: '+payload.additionalLocations);
  if(payload.specifications){
   section('مواصفات المساحة الإعلانية',40);
   paragraph(payload.specifications);
  }
  if(payload.campaignNotes){
   section('ملاحظات الحملة',40);
   paragraph(payload.campaignNotes);
  }
  section('الشروط المتفق عليها',45);
  paragraph(payload.terms||'لم تُسجّل شروط إضافية ضمن بيانات العقد.');
  if(payload.notes){
   section('ملاحظات العقد',40);
   paragraph(payload.notes);
  }
  next(90);
  current.writer.signature();

  // Preserve the original PDF design on EVERY page, including vector assets,
  // image resources, crop box, header/logo and contact footer.
  for(const item of overlays){
   item.writer.footer();
   const dataUri=item.canvas.toDataURL('image/png');
   const pngBytes=await fetch(dataUri).then(res=>res.arrayBuffer());
   const png=await pdf.embedPng(pngBytes);
   const [originalPage]=await pdf.copyPages(original,[0]);
   const output=pdf.addPage(originalPage);
   output.drawImage(png,{x:0,y:0,width:size.width,height:size.height});
  }
  return new Blob([await pdf.save({useObjectStreams:false})],{type:'application/pdf'});
 }
 function saveBlob(blob,name){
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;a.download=name;
  document.body.appendChild(a);a.click();a.remove();
  // Delay URL cleanup until the browser has consumed the file.
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
  // Popup blocked: a PDF download is still preferable to losing the document.
  saveBlob(blob,'Raafat-Contract-'+filename(payload.number)+'.pdf');
  return blob;
 }
 scope.RaafatContractPdf=Object.freeze({generate,download,preview,TEMPLATE_URL});
})(window);
